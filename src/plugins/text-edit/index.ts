import { Plugin, PointerEventHandler, PointerEventContext } from '../../core/PluginSystem';
import { textEditManager } from '../../managers/TextEditManager';
import { toolModeManager } from '../../managers/ToolModeManager';
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
        console.log('📝 TextEditPlugin: Enter key pressed');
        console.log('📝 TextEditPlugin: Tool mode active:', toolModeManager.getActiveMode());
        console.log('📝 TextEditPlugin: Text edit mode active:', toolModeManager.isActive('text-edit'));
        
        // Check if we're in text edit mode first
        if (toolModeManager.isActive('text-edit')) {
          // For single-line text, Enter confirms editing
          const editingText = textEditManager.getEditingText();
          console.log('📝 TextEditPlugin: Editing text:', editingText?.type);
          if (editingText && editingText.type === 'text') {
            console.log('📝 TextEditPlugin: Stopping text edit (Enter confirm)');
            textEditManager.stopTextEdit(true); // Save editing
          }
        } else {
          // If not editing, check if text is selected and start editing
          console.log('📝 TextEditPlugin: Not in text edit mode, trying to start editing selected text');
          textEditManager.startEditingSelectedText();
        }
      },
      description: 'Start text editing (selected text) or confirm editing (single-line)'
    },
    {
      key: 'F2',
      action: () => {
        console.log('📝 TextEditPlugin: F2 key pressed');
        console.log('📝 TextEditPlugin: Text edit mode active:', toolModeManager.isActive('text-edit'));
        
        // F2 is the standard key for inline editing in many applications
        if (!toolModeManager.isActive('text-edit')) {
          console.log('📝 TextEditPlugin: F2 - Starting editing selected text');
          textEditManager.startEditingSelectedText();
        } else {
          console.log('📝 TextEditPlugin: F2 - Already in text edit mode, ignoring');
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
                           target.dataset?.elementType === 'text' || 
                           target.dataset?.elementType === 'multiline-text' ||
                           (target.tagName === 'rect' && target.dataset?.elementId); // Include rect with element ID
      
      // Log when it's relevant (double-click detection or text elements)
      if (context.isDoubleClick || isTextElement || e.ctrlKey || e.metaKey) {
        console.log('📝 TextEditPlugin: onPointerDown called', {
          isDoubleClick: context.isDoubleClick,
          clickCount: context.clickCount,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
          target: target.tagName,
          targetId: (target as any).id,
          dataElementType: target.dataset?.elementType,
          dataElementId: target.dataset?.elementId,
          isTextElement,
          priority: 'text-edit plugin called'
        });
      }
      
      // Handle double-click on text elements OR Ctrl+Click as alternative
      const isEditTrigger = context.isDoubleClick || (e.ctrlKey || e.metaKey);
      
      if (isEditTrigger && isTextElement) {
        console.log('📝 TextEditPlugin: Processing edit trigger...', { 
          trigger: context.isDoubleClick ? 'Double-click' : 'Ctrl/Cmd+Click',
          isDoubleClick: context.isDoubleClick, 
          ctrlKey: e.ctrlKey, 
          metaKey: e.metaKey 
        });
        
        // Check if we clicked on a text element or its parts
        let textElementId: string | null = null;
        
        console.log('📝 TextEditPlugin: Analyzing target element:', {
          tagName: target.tagName,
          elementType: target.dataset.elementType,
          elementId: target.dataset.elementId,
          id: target.id
        });
        
        // Method 1: Direct SVG text element by tag
        if (target.tagName === 'text') {
          textElementId = target.id || target.dataset.elementId || null;
          console.log('📝 TextEditPlugin: Found text via tagName:', textElementId);
        }
        // Method 2: Text span (tspan) - get parent text element
        else if (target.tagName === 'tspan') {
          const parentText = target.parentElement;
          if (parentText && parentText.tagName === 'text') {
            textElementId = parentText.id || parentText.dataset.elementId || null;
            console.log('📝 TextEditPlugin: Found text via tspan parent:', textElementId);
          }
        }
        // Method 3: Direct text element by data attributes
        else if (target.dataset.elementType === 'text' || target.dataset.elementType === 'multiline-text') {
          textElementId = target.dataset.elementId || null;
          console.log('📝 TextEditPlugin: Found text via data attributes:', textElementId);
        }
        // Method 4: Selection border or other text-related elements
        else if (target.getAttribute('data-element-type') === 'text' || target.getAttribute('data-element-type') === 'multiline-text') {
          textElementId = target.getAttribute('data-element-id') || null;
          console.log('📝 TextEditPlugin: Found text via getAttribute:', textElementId);
        }
        // Method 5: Selection border rect with text element ID in data-element-id
        else if (target.tagName === 'rect' && target.dataset.elementId) {
          // This handles clicks on selection borders around text elements
          const potentialTextId = target.dataset.elementId;
          // Verify this is actually a text element by checking the store
          const store = textEditManager.getEditorStore();
          if (store && store.texts.find((t: any) => t.id === potentialTextId)) {
            textElementId = potentialTextId;
            console.log('📝 TextEditPlugin: Found text via selection rect data-element-id:', textElementId);
          }
        }
        
        if (textElementId) {
          console.log('📝 TextEditPlugin: Double-click detected on text element:', textElementId);
          
          // Start text editing
          const success = textEditManager.startTextEdit(textElementId);
          
          console.log('📝 TextEditPlugin: Text editing started:', success);
          
          if (success) {
            // Prevent other plugins from handling this event
            return true;
          }
        } else {
          console.log('📝 TextEditPlugin: No text element found for double-click');
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