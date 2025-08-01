import { Plugin } from '../../core/PluginSystem';
import { ContextMenuComponent } from '../../components/ContextMenuComponent';
import { useContextMenuStore } from '../../store/contextMenuStore';
import { useEditorStore } from '../../store/editorStore';

export const ContextMenuPlugin: Plugin = {
  id: 'context-menu',
  name: 'Context Menu',
  version: '1.0.0',
  enabled: true,
  
  ui: [
    {
      id: 'context-menu',
      component: ContextMenuComponent,
      position: 'svg-content', // Must be svg-content to render within SVG context
      order: 100 // High order to render on top
    }
  ],
  
  initialize: () => {
    // Add contextmenu event listener for macOS trackpad support
    const handleContextMenu = (e: MouseEvent) => {
      // Only handle SVG elements
      const target = e.target as Element;
      if (!target.closest('svg')) return;
      
      // Aggressively prevent default browser context menu
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      const { showContextMenu } = useContextMenuStore.getState();
      const editorState = useEditorStore.getState();
      const { selection } = editorState;
      
      // Get click position in viewport coordinates
      const x = e.clientX;
      const y = e.clientY;
      
      // Check if we clicked on a selected element
      // Use elementFromPoint to get the actual element under the cursor
      let actualTarget = target as SVGElement;
      
      // If we got the SVG container, find the actual element under the cursor
      if (actualTarget.tagName === 'svg') {
        const pointElement = document.elementFromPoint(e.clientX, e.clientY) as SVGElement;
        if (pointElement && pointElement !== actualTarget) {
          actualTarget = pointElement;
        }
      }
      
      const elementType = actualTarget.getAttribute('data-element-type');
      const elementId = actualTarget.getAttribute('data-element-id');
      const commandId = actualTarget.getAttribute('data-command-id');
      
      console.log('🐛 ContextMenu via contextmenu event:', {
        originalTargetTag: (target as SVGElement).tagName,
        actualTargetTag: actualTarget.tagName,
        elementType,
        elementId,
        commandId,
        hasDataType: actualTarget.hasAttribute('data-element-type'),
        hasDataId: actualTarget.hasAttribute('data-element-id'),
        allAttributes: Array.from(actualTarget.attributes).map(attr => `${attr.name}="${attr.value}"`),
        selectedSubPaths: selection.selectedSubPaths,
        selectedPaths: selection.selectedPaths
      });
      
      // Determine if we clicked on a selected element
      let clickedOnSelection = false;
      
      if (commandId && selection.selectedCommands.includes(commandId)) {
        clickedOnSelection = true;
      } else if (elementType === 'path' && elementId && selection.selectedPaths.includes(elementId)) {
        clickedOnSelection = true;
      } else if (elementType === 'subpath' && elementId && selection.selectedSubPaths.includes(elementId)) {
        clickedOnSelection = true;
      } else if (elementType === 'text' && elementId && selection.selectedTexts.includes(elementId)) {
        clickedOnSelection = true;
      } else if (elementType === 'group' && elementId && selection.selectedGroups.includes(elementId)) {
        clickedOnSelection = true;
      } else if (elementType === 'image' && elementId && selection.selectedImages.includes(elementId)) {
        clickedOnSelection = true;
      }
      
      // 🚨 TEMPORARY TEST: Always show selection menu if we have any element with data attributes
      const hasElementData = elementType && elementId;
      
      const contextType = (clickedOnSelection || hasElementData) ? 'selection' : 'canvas';
      
      console.log('🚨 TEMP TEST via contextmenu - contextType:', contextType, 'hasElementData:', hasElementData, 'clickedOnSelection:', clickedOnSelection);
      
      const selectedItems = {
        paths: selection.selectedPaths,
        subPaths: selection.selectedSubPaths,
        commands: selection.selectedCommands,
        texts: selection.selectedTexts,
        groups: selection.selectedGroups,
        images: selection.selectedImages,
        animations: selection.selectedAnimations
      };
      
      showContextMenu({ x, y }, contextType, selectedItems);
    };
    
    // Use capture phase to ensure we handle the event before other handlers
    document.addEventListener('contextmenu', handleContextMenu, true);
    
    // Store cleanup function
    (ContextMenuPlugin as any)._contextMenuCleanup = () => {
      document.removeEventListener('contextmenu', handleContextMenu, true);
    };
  },
  
  destroy: () => {
    // Cleanup contextmenu event listener
    if ((ContextMenuPlugin as any)._contextMenuCleanup) {
      (ContextMenuPlugin as any)._contextMenuCleanup();
      delete (ContextMenuPlugin as any)._contextMenuCleanup;
    }
  },

  pointerHandlers: {
    onPointerDown: (e, context) => {
      // Handle right-click (button === 2) to show context menu - fallback for non-macOS
      if (e.button === 2) {
        e.preventDefault();
        e.stopPropagation();
        
        const { showContextMenu } = useContextMenuStore.getState();
        const editorState = useEditorStore.getState();
        const { selection } = editorState;
        
        // Get click position in viewport coordinates
        const x = e.clientX;
        const y = e.clientY;
        
        // Check if we clicked on a selected element
        // Use elementFromPoint to get the actual element under the cursor
        let actualTarget = e.target as SVGElement;
        
        // If we got the SVG container, find the actual element under the cursor
        if (actualTarget.tagName === 'svg') {
          const pointElement = document.elementFromPoint(e.clientX, e.clientY) as SVGElement;
          if (pointElement && pointElement !== actualTarget) {
            actualTarget = pointElement;
          }
        }
        
        const elementType = actualTarget.getAttribute('data-element-type');
        const elementId = actualTarget.getAttribute('data-element-id');
        const commandId = actualTarget.getAttribute('data-command-id');
        
        // Temporary debug log
        console.log('🐛 ContextMenu Debug:', {
          originalTargetTag: (e.target as SVGElement).tagName,
          actualTargetTag: actualTarget.tagName,
          elementType,
          elementId,
          commandId,
          hasDataType: actualTarget.hasAttribute('data-element-type'),
          hasDataId: actualTarget.hasAttribute('data-element-id'),
          allAttributes: Array.from(actualTarget.attributes).map(attr => `${attr.name}="${attr.value}"`),
          selectedSubPaths: selection.selectedSubPaths,
          selectedPaths: selection.selectedPaths
        });
        
        // Determine if we clicked on a selected element
        let clickedOnSelection = false;
        
        if (commandId && selection.selectedCommands.includes(commandId)) {
          clickedOnSelection = true;
        } else if (elementType === 'path' && elementId && selection.selectedPaths.includes(elementId)) {
          clickedOnSelection = true;
        } else if (elementType === 'subpath' && elementId && selection.selectedSubPaths.includes(elementId)) {
          clickedOnSelection = true;
        } else if (elementType === 'text' && elementId && selection.selectedTexts.includes(elementId)) {
          clickedOnSelection = true;
        } else if (elementType === 'group' && elementId && selection.selectedGroups.includes(elementId)) {
          clickedOnSelection = true;
        } else if (elementType === 'image' && elementId && selection.selectedImages.includes(elementId)) {
          clickedOnSelection = true;
        }
        
        // 🚨 TEMPORARY TEST: Always show selection menu if we have any element with data attributes
        const hasElementData = elementType && elementId;
        
        // Show selection menu only if we clicked on a selected element OR (temporary) any element with data
        // Show canvas menu if we clicked outside selection or on empty space
        const contextType = (clickedOnSelection || hasElementData) ? 'selection' : 'canvas';
        
        console.log('🚨 TEMP TEST - contextType:', contextType, 'hasElementData:', hasElementData, 'clickedOnSelection:', clickedOnSelection);
        
        const selectedItems = {
          paths: selection.selectedPaths,
          subPaths: selection.selectedSubPaths,
          commands: selection.selectedCommands,
          texts: selection.selectedTexts,
          groups: selection.selectedGroups,
          images: selection.selectedImages,
          animations: selection.selectedAnimations
        };
        
        showContextMenu({ x, y }, contextType, selectedItems);
        return true; // Consume the event
      }
      
      // Close context menu on any other pointer down if it's open, but only if clicking outside menu
      const { isVisible, hideContextMenu } = useContextMenuStore.getState();
      if (isVisible) {
        // Check if we clicked inside the context menu
        const target = e.target as Element;
        const contextMenu = target.closest('.context-menu');
        
        if (contextMenu) {
          // If clicking inside the menu, consume the event to prevent other handlers from clearing selection
          console.log('🛡️ Context menu click consumed to preserve selection');
          return true; // Consume the event to prevent selection clearing
        } else {
          // Only hide if clicking outside the menu
          hideContextMenu();
        }
      }
      return false; // Don't consume the event
    }
  }
};