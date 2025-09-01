import { useEditorStore } from '../store/editorStore';
import { TextElementType, TextElement, MultilineTextElement, SVGTextPath } from '../types';
import { toolModeManager } from './ToolModeManager';

export interface TextEditState {
  isEditing: boolean;
  editingTextId: string | null;
  editingType: 'single' | 'multiline' | 'textPath' | null;
  cursorPosition: number;
  selectionRange: [number, number] | null;
  originalContent: string | string[]; // Backup for escape functionality
}

export class TextEditManager {
  private state: TextEditState = {
    isEditing: false,
    editingTextId: null,
    editingType: null,
    cursorPosition: 0,
    selectionRange: null,
    originalContent: ''
  };

  private listeners: Array<(state: TextEditState) => void> = [];
  private editorStore: any = null;

  constructor() {
    // Register this manager with ToolModeManager
    toolModeManager.setTextEditManager?.(this);
  }

  setEditorStore(store: any) {
    this.editorStore = store;
  }

  /**
   * Start editing a text element
   */
  startTextEdit(textId: string): boolean {
    // Always get fresh state from the store
    const store = useEditorStore.getState();
    
    // First try to find in regular texts
    let textElement: TextElementType | SVGTextPath | undefined = store.texts.find((t: TextElementType) => t.id === textId);
    let isTextPath = false;
    
    // If not found in texts, try textpaths
    if (!textElement) {
      textElement = store.textPaths.find((tp: any) => tp.id === textId);
      isTextPath = true;
    }
    
    if (!textElement) {
      return false;
    }
    
    if (textElement.locked === true) {
      return false;
    }
    
    // Stop any current editing
    if (this.state.isEditing) {
      this.stopTextEdit(false); // Don't save current edit
    }

    // Determine text type and backup content
    let editingType: 'single' | 'multiline' | 'textPath';
    let originalContent: string | string[];
    
    if (isTextPath) {
      editingType = 'textPath';
      originalContent = (textElement as any).content;
    } else {
      const isMultiline = textElement.type === 'multiline-text';
      editingType = isMultiline ? 'multiline' : 'single';
      originalContent = isMultiline 
        ? (textElement as MultilineTextElement).spans.map(span => span.content)
        : (textElement as TextElement).content;
    }
    
    this.state = {
      isEditing: true,
      editingTextId: textId,
      editingType,
      cursorPosition: 0,
      selectionRange: null,
      originalContent
    };
    
    // Switch to text-edit mode
    toolModeManager.setMode('text-edit', { editingTextId: textId });
    
    // Ensure the element is selected
    if (isTextPath) {
      store.selectTextPath(textId);
    } else {
      store.selectText(textId);
    }
    
    this.notifyListeners();
    return true;
  }

  /**
   * Stop text editing
   */
  stopTextEdit(save: boolean = true, finalContent?: string): void {
    if (!this.state.isEditing) {
      return;
    }

    const store = this.editorStore || useEditorStore.getState();

    // If saving and we have final content, apply it directly
    if (save && finalContent && this.state.editingTextId) {
      if (this.state.editingType === 'textPath') {
        store.updateTextPathContent(this.state.editingTextId, finalContent);
      } else if (this.state.editingType === 'single') {
        store.updateTextContent(this.state.editingTextId, finalContent);
      }
    }

    // Clear any pending timeout
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = null;
    }
    
    // If not saving, restore original content
    if (!save && this.state.editingTextId) {
      if (this.state.editingType === 'single') {
        store.updateTextContent(this.state.editingTextId, this.state.originalContent as string);
      } else if (this.state.editingType === 'multiline') {
        const textElement = store.texts.find((t: TextElementType) => t.id === this.state.editingTextId);
        if (textElement && textElement.type === 'multiline-text') {
          const originalSpans = this.state.originalContent as string[];
          // Update each span with original content
          originalSpans.forEach((content, index) => {
            if (textElement.spans[index]) {
              store.updateTextSpan(this.state.editingTextId, textElement.spans[index].id, { content });
            }
          });
        }
      } else if (this.state.editingType === 'textPath') {
        store.updateTextPathContent(this.state.editingTextId, this.state.originalContent as string);
      }
    }

    // Clear any pending updates
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = null;
    }

    // Clear state
    this.state = {
      isEditing: false,
      editingTextId: null,
      editingType: null,
      cursorPosition: 0,
      selectionRange: null,
      originalContent: ''
    };

    // Return to select mode
    toolModeManager.setMode('select');
    
    this.notifyListeners();
  }

  private updateTimeout: NodeJS.Timeout | null = null;

  /**
   * Update text content during editing (live updates)
   */
  updateTextContent(content: string | string[]): void {
            
    if (!this.state.isEditing || !this.state.editingTextId) {
            return;
    }

    // Debounce updates to prevent instability during rapid changes
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    this.updateTimeout = setTimeout(() => {
      this.performContentUpdate(content);
    }, 50); // 50ms debounce
  }

  /**
   * Perform the actual content update (debounced)
   */
  private performContentUpdate(content: string | string[]): void {
    const store = this.editorStore || useEditorStore.getState();
        
    if (this.state.editingType === 'single' && typeof content === 'string') {
      store.updateTextContent(this.state.editingTextId, content);
    } else if (this.state.editingType === 'textPath' && typeof content === 'string') {
      store.updateTextPathContent(this.state.editingTextId, content);
    } else if (this.state.editingType === 'multiline' && Array.isArray(content)) {
      const textElement = store.texts.find((t: TextElementType) => t.id === this.state.editingTextId);
      if (textElement && textElement.type === 'multiline-text') {
                
        // Handle edge case: if all content is empty, ensure at least one span exists
        const filteredContent = content.length === 0 ? [''] : content;
        
        // Create a safe copy of spans to avoid modification during iteration
        const currentSpans = [...textElement.spans];
        
        // Update existing spans or create new ones
        filteredContent.forEach((line, index) => {
          // Handle empty lines explicitly to avoid rendering issues
          const lineContent = line || '';
          
          if (currentSpans[index]) {
                        store.updateTextSpan(this.state.editingTextId, currentSpans[index].id, { content: lineContent });
          } else {
                        store.addTextSpan(this.state.editingTextId, lineContent);
          }
        });
        
        // Remove extra spans if content has fewer lines
        // Process in reverse order to avoid index shifting issues
        if (currentSpans.length > filteredContent.length) {
                    for (let i = currentSpans.length - 1; i >= filteredContent.length; i--) {
            const spanToDelete = currentSpans[i];
                        store.deleteTextSpan(this.state.editingTextId, spanToDelete.id);
          }
        }
        
              }
    }
  }

  /**
   * Update cursor position
   */
  setCursorPosition(position: number): void {
    if (this.state.isEditing) {
      this.state.cursorPosition = position;
      this.notifyListeners();
    }
  }

  /**
   * Update selection range
   */
  setSelectionRange(range: [number, number] | null): void {
    if (this.state.isEditing) {
      this.state.selectionRange = range;
      this.notifyListeners();
    }
  }

  /**
   * Get current state
   */
  getState(): TextEditState {
    return { ...this.state };
  }

  /**
   * Check if a specific text is being edited
   */
  isTextBeingEdited(textId: string): boolean {
    return this.state.isEditing && this.state.editingTextId === textId;
  }

  /**
   * Check if any text is being edited
   */
  isEditing(): boolean {
    return this.state.isEditing;
  }

  /**
   * Get the currently editing text element
   */
  getEditingText(): TextElementType | any | null {
    if (!this.state.isEditing || !this.state.editingTextId) {
      return null;
    }

    const store = this.editorStore || useEditorStore.getState();
    
    if (this.state.editingType === 'textPath') {
      return store.textPaths.find((tp: any) => tp.id === this.state.editingTextId) || null;
    } else {
      return store.texts.find((t: TextElementType) => t.id === this.state.editingTextId) || null;
    }
  }

  /**
   * Get the current editor store
   */
  getEditorStore() {
    return this.editorStore || useEditorStore.getState();
  }

  /**
   * Start editing the first selected text element
   */
  startEditingSelectedText(): boolean {
    const store = this.getEditorStore();
    if (store && store.selection.selectedTexts.length > 0) {
      const firstSelectedText = store.selection.selectedTexts[0];
            return this.startTextEdit(firstSelectedText);
    }
        return false;
  }

  /**
   * Handle keyboard shortcuts
   */
  handleKeyDown(e: KeyboardEvent): boolean {
    if (!this.state.isEditing) {
      return false;
    }

    switch (e.key) {
      case 'Escape':
        this.stopTextEdit(false); // Cancel editing
        return true;
      case 'Enter':
        if (this.state.editingType === 'single' && !e.shiftKey) {
          this.stopTextEdit(true); // Save editing for single line
          return true;
        }
        // For multiline, Enter adds new line (handled by textarea)
        return false;
      case 'Tab':
        if (!e.shiftKey) {
          this.stopTextEdit(true); // Save and move to next
          return true;
        }
        return false;
    }

    return false;
  }

  /**
   * Method for external deactivation by ToolModeManager
   */
  deactivateExternally = () => {
    this.stopTextEdit(true); // Save changes when deactivated externally
  };

  /**
   * Add state change listener
   */
  addListener(listener: (state: TextEditState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
            this.listeners.forEach((listener, index) => {
      try {
        listener(this.getState());
              } catch (error) {
        console.error('📝 TextEditManager: Error in listener', index, ':', error);
      }
    });
  }
}

export const textEditManager = new TextEditManager();