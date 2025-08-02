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
      position: 'svg-content',
      order: 100
    }
  ],
  
  initialize: () => {
    // Add contextmenu event listener for desktop right-click
    const handleContextMenu = (e: MouseEvent) => {
      // Only handle SVG elements
      const target = e.target as Element;
      if (!target.closest('svg')) return;
      
      // Prevent default browser context menu
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      const { showContextMenu } = useContextMenuStore.getState();
      const editorState = useEditorStore.getState();
      const { selection } = editorState;
      
      // Get click position in viewport coordinates
      const x = e.clientX;
      const y = e.clientY;
      
      // Use elementFromPoint to get the actual element under the cursor
      let actualTarget = target as SVGElement;
      
      if (actualTarget.tagName === 'svg') {
        const pointElement = document.elementFromPoint(e.clientX, e.clientY) as SVGElement;
        if (pointElement && pointElement !== actualTarget) {
          actualTarget = pointElement;
        }
      }
      
      const elementType = actualTarget.getAttribute('data-element-type');
      const elementId = actualTarget.getAttribute('data-element-id');
      const commandId = actualTarget.getAttribute('data-command-id');
      
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
      
      const hasElementData = elementType && elementId;
      const contextType = (clickedOnSelection || hasElementData) ? 'selection' : 'canvas';
      
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
        
        const x = e.clientX;
        const y = e.clientY;
        
        let actualTarget = e.target as SVGElement;
        
        if (actualTarget.tagName === 'svg') {
          const pointElement = document.elementFromPoint(e.clientX, e.clientY) as SVGElement;
          if (pointElement && pointElement !== actualTarget) {
            actualTarget = pointElement;
          }
        }
        
        const elementType = actualTarget.getAttribute('data-element-type');
        const elementId = actualTarget.getAttribute('data-element-id');
        const commandId = actualTarget.getAttribute('data-command-id');
        
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
        
        const hasElementData = elementType && elementId;
        const contextType = (clickedOnSelection || hasElementData) ? 'selection' : 'canvas';
        
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
      
      // Close context menu on any other pointer down if it's open
      const { isVisible, hideContextMenu } = useContextMenuStore.getState();
      if (isVisible) {
        const target = e.target as Element;
        const contextMenu = target.closest('.context-menu');
        
        if (contextMenu) {
          return true; // Consume the event to prevent selection clearing
        } else {
          hideContextMenu();
        }
      }
      return false;
    },
    
    onPointerMove: (e, context) => {
      return false;
    },
    
    onPointerUp: (e, context) => {
      return false;
    }
  }
};