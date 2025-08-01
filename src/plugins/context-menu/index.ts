import { Plugin } from '../../core/PluginSystem';
import { ContextMenuComponent } from '../../components/ContextMenuComponent';
import { useContextMenuStore } from '../../store/contextMenuStore';
import { useEditorStore } from '../../store/editorStore';

// Long press state for mobile context menu
let longPressTimer: number | null = null;
let longPressStartPosition: { x: number; y: number } | null = null;
let longPressStartTime: number = 0;
let longPressTargetElement: SVGElement | null = null;
const LONG_PRESS_DURATION = 600; // 600ms for long press
const LONG_PRESS_TOLERANCE = 10; // 10px movement tolerance

// Global event listeners for long press (bypasses plugin system)
let globalPointerMoveListener: ((e: PointerEvent) => void) | null = null;
let globalPointerUpListener: ((e: PointerEvent) => void) | null = null;


// Helper functions for long press
const clearLongPressTimer = () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
  longPressStartPosition = null;
  longPressStartTime = 0;
  longPressTargetElement = null;
  
  // Remove global listeners
  if (globalPointerMoveListener) {
    document.removeEventListener('pointermove', globalPointerMoveListener);
    globalPointerMoveListener = null;
  }
  if (globalPointerUpListener) {
    document.removeEventListener('pointerup', globalPointerUpListener);
    globalPointerUpListener = null;
  }
  
};

const showContextMenuAtPosition = (x: number, y: number, targetElement: SVGElement) => {
  const { showContextMenu } = useContextMenuStore.getState();
  const editorState = useEditorStore.getState();
  const { selection } = editorState;
  
  const elementType = targetElement.getAttribute('data-element-type');
  const elementId = targetElement.getAttribute('data-element-id');
  const commandId = targetElement.getAttribute('data-command-id');
  
  
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

const startLongPressTimer = (e: React.PointerEvent<SVGElement>, targetElement: SVGElement) => {
  // Only start long press for touch/pen inputs (not mouse)
  if (e.pointerType === 'mouse') return;
  
  // Always start long press timer - it will be cancelled if user moves finger (enabling drag)
  longPressStartPosition = { x: e.clientX, y: e.clientY };
  longPressStartTime = Date.now();
  longPressTargetElement = targetElement;
  
  // Create global listeners to detect movement/up events (bypasses plugin system)
  globalPointerMoveListener = (e: PointerEvent) => {
    if (longPressStartPosition) {
      const deltaX = Math.abs(e.clientX - longPressStartPosition.x);
      const deltaY = Math.abs(e.clientY - longPressStartPosition.y);
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (distance > LONG_PRESS_TOLERANCE) {
        clearLongPressTimer();
      }
    }
  };
  
  globalPointerUpListener = (e: PointerEvent) => {
    if (longPressTimer) {
      clearLongPressTimer();
    }
  };
  
  // Add global listeners with passive option for better performance
  document.addEventListener('pointermove', globalPointerMoveListener, { passive: true });
  document.addEventListener('pointerup', globalPointerUpListener, { passive: true });
  
  longPressTimer = window.setTimeout(() => {
    if (longPressStartPosition && longPressTargetElement) {
      // Add haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      
      showContextMenuAtPosition(longPressStartPosition.x, longPressStartPosition.y, longPressTargetElement);
      clearLongPressTimer();
    }
  }, LONG_PRESS_DURATION);
};

// Long press movement detection is now handled by global listeners in startLongPressTimer

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
    
    // Cleanup long press timer
    clearLongPressTimer();
  },

  pointerHandlers: {
    onPointerDown: (e, context) => {
      // Start long press timer for mobile devices (touch/pen only)
      if (e.pointerType !== 'mouse' && e.button === 0) {
        const targetElement = e.target as SVGElement;
        
        // Debug: Log what element we're touching
        const elementType = targetElement.getAttribute('data-element-type');
        const elementId = targetElement.getAttribute('data-element-id');
        const commandId = targetElement.getAttribute('data-command-id');
        
        startLongPressTimer(e, targetElement);
      }
      
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
          return true; // Consume the event to prevent selection clearing
        } else {
          // Only hide if clicking outside the menu
          hideContextMenu();
        }
      }
      return false; // Don't consume the event
    },
    
    onPointerMove: (e, context) => {
      // Long press movement detection is now handled by global listeners
      // This allows drag functionality to work without interference
      return false; // Don't consume the event - let drag handlers work
    },
    
    onPointerUp: (e, context) => {
      // Long press cancellation is now handled by global listeners
      // This allows normal click/tap functionality to work
      return false; // Don't consume the event
    }
  }
};