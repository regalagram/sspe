import { Plugin, PointerEventContext } from '../../core/PluginSystem';
import { textEditManager } from '../../core/TextEditManager';
import { toolModeManager } from '../../core/ToolModeManager';
import { PointerEvent } from 'react';

/**
 * Text Edit Plugin - Handles double-click detection and text editing coordination
 */
export const TextEditPlugin: Plugin = {
  id: 'text-edit',
  name: 'Text Edit',
  version: '1.0.0',
  enabled: true,
  
  initialize: (editorStore: any) => {
    textEditManager.setEditorStore(editorStore);
  },
  
  shortcuts: [
    {
      key: 'Escape',
      action: () => {
        // Exit text edit mode when Escape is pressed
        if (toolModeManager.isActive('text-edit')) {
          textEditManager.stopTextEdit(false); // Cancel editing
        }
      },
      description: 'Cancel text editing'
    },
    {
      key: 'Enter',
      action: () => {
                                
        // Check if we're in text edit mode first
        if (toolModeManager.isActive('text-edit')) {
          // For single-line text, Enter confirms editing
          const editingText = textEditManager.getEditingText();
                    if (editingText && editingText.type === 'text') {
                        textEditManager.stopTextEdit(true); // Save editing
          }
        } else {
          // If not editing, check if text is selected and start editing
                    textEditManager.startEditingSelectedText();
        }
      },
      description: 'Start text editing (selected text) or confirm editing (single-line)'
    },
    {
      key: 'F2',
      action: () => {
                        
        // F2 is the standard key for inline editing in many applications
        if (!toolModeManager.isActive('text-edit')) {
                    textEditManager.startEditingSelectedText();
        } else {
                  }
      },
      description: 'Start inline text editing (F2 standard)'
    },
    {
      key: 'Tab',
      action: () => {
        // Tab confirms editing and could move to next text
        if (toolModeManager.isActive('text-edit')) {
          textEditManager.stopTextEdit(true); // Save editing
        }
      },
      description: 'Confirm text editing and move to next'
    }
  ],
  
  pointerHandlers: {
    onPointerDown: (e: PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
      const target = e.target as SVGElement;
      const isTextElement = target.tagName === 'text' || target.tagName === 'tspan' || 
                           target.tagName === 'textPath' || // Add textPath SVG element
                           target.dataset?.elementType === 'text' || 
                           target.dataset?.elementType === 'multiline-text' ||
                           target.dataset?.elementType === 'textPath' ||
                           (target.tagName === 'rect' && target.dataset?.elementId); // Include rect with element ID
      
      // Handle double-click on text elements OR Ctrl+Click as alternative
      const isEditTrigger = context.isDoubleClick || (e.ctrlKey || e.metaKey);
      
      if (isEditTrigger && isTextElement) {
        // Check if we clicked on a text element or its parts
        let textElementId: string | null = null;
        
                
        // Method 1: Direct SVG text element by tag
        if (target.tagName === 'text') {
          textElementId = target.id || target.dataset.elementId || null;
                  }
        // Method 2: Text span (tspan) - get parent text element
        else if (target.tagName === 'tspan') {
          const parentText = target.parentElement;
          if (parentText && parentText.tagName === 'text') {
            textElementId = parentText.id || parentText.dataset.elementId || null;
          }
        }
        // Method 2.5: TextPath element - get parent text element
        else if (target.tagName === 'textPath') {
          const parentText = target.parentElement;
          if (parentText && parentText.tagName === 'text') {
            textElementId = parentText.id || parentText.dataset.elementId || null;
          }
        }
        // Method 3: Direct text element by data attributes (including textPath)
        else if (target.dataset.elementType === 'text' || 
                 target.dataset.elementType === 'multiline-text' ||
                 target.dataset.elementType === 'textPath') {
          textElementId = target.dataset.elementId || null;
                  }
        // Method 4: Selection border or other text-related elements (including textPath)
        else if (target.getAttribute('data-element-type') === 'text' || 
                 target.getAttribute('data-element-type') === 'multiline-text' ||
                 target.getAttribute('data-element-type') === 'textPath') {
          textElementId = target.getAttribute('data-element-id') || null;
        }
        // Method 5: Selection border rect with text element ID in data-element-id
        else if (target.tagName === 'rect' && target.dataset.elementId) {
          // This handles clicks on selection borders around text elements
          const potentialTextId = target.dataset.elementId;
          // Verify this is actually a text element by checking the store
          const store = textEditManager.getEditorStore();
          if (store && (store.texts.find((t: any) => t.id === potentialTextId) || 
                       store.textPaths.find((tp: any) => tp.id === potentialTextId))) {
            textElementId = potentialTextId;
          }
        }
        
        if (textElementId) {
          // Start text editing
          const success = textEditManager.startTextEdit(textElementId);
          
                    
          if (success) {
            // Prevent other plugins from handling this event
            return true;
          }
        } else {
                  }
      }
      
      // If we're currently editing and click outside, finish editing
      if (textEditManager.isEditing()) {
        const target = e.target as SVGElement;
        const editingTextId = textEditManager.getState().editingTextId;
        
        // Check if we clicked on the currently editing text or its overlay
        const clickedOnEditingText = 
          target.dataset.elementId === editingTextId ||
          target.id === editingTextId ||
          (target.tagName === 'tspan' && target.parentElement?.id === editingTextId);
        
        if (!clickedOnEditingText) {
          // Clicked outside - finish editing
          textEditManager.stopTextEdit(true);
          return false; // Allow other plugins to handle the new click
        }
      }
      
      return false;
    },
    
    onPointerMove: (e: PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
      // Don't interfere with pointer moves during text editing
      return false;
    },
    
    onPointerUp: (e: PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
      // Don't interfere with pointer up events
      return false;
    }
  },
  
  // Handle global keyboard events for text editing
  handleKeyDown: (e: KeyboardEvent): boolean => {
    return textEditManager.handleKeyDown(e);
  }
};