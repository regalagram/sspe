import { useEditorStore } from '../store/editorStore';
import { TextElementType, TextElement, MultilineTextElement } from '../types';
import { toolModeManager } from './ToolModeManager';

export interface TextEditState {
  isEditing: boolean;
  editingTextId: string | null;
  editingType: 'single' | 'multiline' | null;
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
    console.log('📝 TextEditManager: startTextEdit called with textId:', textId);
    
    const store = this.editorStore || useEditorStore.getState();
    const textElement = store.texts.find((t: TextElementType) => t.id === textId);
    
    console.log('📝 TextEditManager: Found text element:', !!textElement);
    console.log('📝 TextEditManager: Text element locked:', textElement?.locked);
    console.log('📝 TextEditManager: Text element details:', textElement ? { id: textElement.id, type: textElement.type, locked: textElement.locked } : 'null');
    
    if (!textElement) {
      console.log('📝 TextEditManager: Cannot start text edit - element not found');
      return false;
    }
    
    if (textElement.locked === true) {
      console.log('📝 TextEditManager: Cannot start text edit - element is locked');
      return false;
    }
    
    console.log('📝 TextEditManager: Proceeding with text edit setup...');

    // Stop any current editing
    if (this.state.isEditing) {
      console.log('📝 TextEditManager: Stopping current editing first...');
      this.stopTextEdit(false); // Don't save current edit
    }

    // Determine text type and backup content
    const isMultiline = textElement.type === 'multiline-text';
    console.log('📝 TextEditManager: Text element type:', textElement.type, 'isMultiline:', isMultiline);
    
    const originalContent = isMultiline 
      ? (textElement as MultilineTextElement).spans.map(span => span.content)
      : (textElement as TextElement).content;
    console.log('📝 TextEditManager: Original content:', originalContent);

    this.state = {
      isEditing: true,
      editingTextId: textId,
      editingType: isMultiline ? 'multiline' : 'single',
      cursorPosition: 0,
      selectionRange: null,
      originalContent
    };
    console.log('📝 TextEditManager: State updated:', this.state);

    // Switch to text-edit mode
    console.log('📝 TextEditManager: Switching to text-edit mode...');
    toolModeManager.setMode('text-edit', { editingTextId: textId });
    
    // Ensure the text is selected
    console.log('📝 TextEditManager: Selecting text in store...');
    store.selectText(textId);
    
    console.log('📝 TextEditManager: Notifying listeners...');
    this.notifyListeners();
    console.log('📝 TextEditManager: Text edit started successfully!');
    return true;
  }

  /**
   * Stop editing and optionally save changes
   */
  stopTextEdit(saveChanges: boolean = true): boolean {
    console.log('📝 TextEditManager: stopTextEdit called with saveChanges:', saveChanges);
    console.log('📝 TextEditManager: Current state before stop:', this.state);
    
    if (!this.state.isEditing) {
      console.log('📝 TextEditManager: Not currently editing, ignoring stopTextEdit');
      return false;
    }

    const store = this.editorStore || useEditorStore.getState();
    
    // If not saving, restore original content
    if (!saveChanges && this.state.editingTextId) {
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
    return true;
  }

  private updateTimeout: NodeJS.Timeout | null = null;

  /**
   * Update text content during editing (live updates)
   */
  updateTextContent(content: string | string[]): void {
    console.log('📝 TextEditManager: updateTextContent called with:', content);
    console.log('📝 TextEditManager: Current editing state:', { isEditing: this.state.isEditing, editingTextId: this.state.editingTextId });
    
    if (!this.state.isEditing || !this.state.editingTextId) {
      console.log('📝 TextEditManager: Not editing or no editingTextId, ignoring update');
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
    console.log('📝 TextEditManager: Performing debounced content update');
    
    if (this.state.editingType === 'single' && typeof content === 'string') {
      store.updateTextContent(this.state.editingTextId, content);
    } else if (this.state.editingType === 'multiline' && Array.isArray(content)) {
      const textElement = store.texts.find((t: TextElementType) => t.id === this.state.editingTextId);
      if (textElement && textElement.type === 'multiline-text') {
        console.log('📝 TextEditManager: Updating multiline content:', { 
          contentLines: content.length, 
          existingSpans: textElement.spans.length,
          content: content 
        });
        
        // Handle edge case: if all content is empty, ensure at least one span exists
        const filteredContent = content.length === 0 ? [''] : content;
        
        // Create a safe copy of spans to avoid modification during iteration
        const currentSpans = [...textElement.spans];
        
        // Update existing spans or create new ones
        filteredContent.forEach((line, index) => {
          // Handle empty lines explicitly to avoid rendering issues
          const lineContent = line || '';
          
          if (currentSpans[index]) {
            console.log('📝 TextEditManager: Updating existing span', index, 'with:', lineContent);
            store.updateTextSpan(this.state.editingTextId, currentSpans[index].id, { content: lineContent });
          } else {
            console.log('📝 TextEditManager: Creating new span', index, 'with:', lineContent);
            store.addTextSpan(this.state.editingTextId, lineContent);
          }
        });
        
        // Remove extra spans if content has fewer lines
        // Process in reverse order to avoid index shifting issues
        if (currentSpans.length > filteredContent.length) {
          console.log('📝 TextEditManager: Removing extra spans:', currentSpans.length - filteredContent.length);
          for (let i = currentSpans.length - 1; i >= filteredContent.length; i--) {
            const spanToDelete = currentSpans[i];
            console.log('📝 TextEditManager: Deleting span', i, 'with id:', spanToDelete.id);
            store.deleteTextSpan(this.state.editingTextId, spanToDelete.id);
          }
        }
        
        console.log('📝 TextEditManager: Multiline update complete');
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
  getEditingText(): TextElementType | null {
    if (!this.state.isEditing || !this.state.editingTextId) {
      return null;
    }

    const store = this.editorStore || useEditorStore.getState();
    return store.texts.find((t: TextElementType) => t.id === this.state.editingTextId) || null;
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
      console.log('📝 TextEditManager: Starting edit for selected text:', firstSelectedText);
      return this.startTextEdit(firstSelectedText);
    }
    console.log('📝 TextEditManager: No selected texts to edit');
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
    console.log('📝 TextEditManager: Notifying listeners, current state:', this.getState());
    console.log('📝 TextEditManager: Number of listeners:', this.listeners.length);
    this.listeners.forEach((listener, index) => {
      try {
        listener(this.getState());
        console.log('📝 TextEditManager: Notified listener', index);
      } catch (error) {
        console.error('📝 TextEditManager: Error in listener', index, ':', error);
      }
    });
  }
}

export const textEditManager = new TextEditManager();