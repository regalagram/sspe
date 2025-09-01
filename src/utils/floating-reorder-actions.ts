import { Layers, ArrowUp, ArrowDown, ChevronUp, ChevronDown } from 'lucide-react';
import { ToolbarAction } from '../types/floatingToolbar';
import { useEditorStore } from '../store/editorStore';
import { reorderManager } from '../plugins/reorder/ReorderManager';
import { globalBringToFront, globalSendToBack, globalSendForward, globalSendBackward, initializeZIndexes } from './z-index-manager';
import { handleMixedSelectionReorder } from './mixed-selection-reorder';

// Create reorder actions for different element types
export const createReorderActions = (
  elementType: string,
  getSelectionCount: () => number,
  reorderActions: {
    bringToFront: () => void;
    sendToBack: () => void;
    sendForward: () => void;
    sendBackward: () => void;
  }
): ToolbarAction[] => {
  return [
    {
      id: `${elementType}-reorder`,
      icon: Layers,
      label: 'Reorder',
      type: 'dropdown',
      dropdown: {
        options: [
          {
            id: `${elementType}-bring-front`,
            label: 'Bring to Front',
            icon: ArrowUp,
            action: reorderActions.bringToFront,
          },
          {
            id: `${elementType}-send-forward`,
            label: 'Send Forward',
            icon: ChevronUp,
            action: reorderActions.sendForward,
          },
          {
            id: `${elementType}-send-backward`,
            label: 'Send Backward',
            icon: ChevronDown,
            action: reorderActions.sendBackward,
          },
          {
            id: `${elementType}-send-back`,
            label: 'Send to Back',
            icon: ArrowDown,
            action: reorderActions.sendToBack,
          },
        ],
      },
      priority: 930,
      tooltip: 'Reorder elements',
    } as ToolbarAction,
  ];
};

// Generic reorder functions for different element types
export const createElementReorderFunctions = (elementType: 'text' | 'image' | 'use' | 'subpath' | 'mixed') => {
  const bringToFront = () => {
    // Initialize z-indexes if needed
    initializeZIndexes();
    
    if (elementType === 'mixed') {
      // For mixed selections, use the mixed selection reorder system
      handleMixedSelectionReorder('toFront');
    } else if (elementType === 'subpath') {
      // For subpaths, use the existing ReorderManager
      const store = useEditorStore.getState();
      reorderManager.setEditorStore(store);
      reorderManager.bringToFront();
    } else {
      // For all other elements, use the new global z-index system
      globalBringToFront();
    }
  };

  const sendToBack = () => {
    // Initialize z-indexes if needed
    initializeZIndexes();
    
    if (elementType === 'mixed') {
      // For mixed selections, use the mixed selection reorder system
      handleMixedSelectionReorder('toBack');
    } else if (elementType === 'subpath') {
      // For subpaths, use the existing ReorderManager
      const store = useEditorStore.getState();
      reorderManager.setEditorStore(store);
      reorderManager.sendToBack();
    } else {
      // For all other elements, use the new global z-index system
      globalSendToBack();
    }
  };

  const sendForward = () => {
    // Initialize z-indexes if needed
    initializeZIndexes();
    
    if (elementType === 'mixed') {
      // For mixed selections, use the mixed selection reorder system
      handleMixedSelectionReorder('forward');
    } else if (elementType === 'subpath') {
      // For subpaths, use the existing ReorderManager
      const store = useEditorStore.getState();
      reorderManager.setEditorStore(store);
      reorderManager.bringForward();
    } else {
      // For all other elements, use the new global z-index system
      globalSendForward();
    }
  };

  const sendBackward = () => {
    // Initialize z-indexes if needed
    initializeZIndexes();
    
    if (elementType === 'mixed') {
      // For mixed selections, use the mixed selection reorder system
      handleMixedSelectionReorder('backward');
    } else if (elementType === 'subpath') {
      // For subpaths, use the existing ReorderManager
      const store = useEditorStore.getState();
      reorderManager.setEditorStore(store);
      reorderManager.sendBackward();
    } else {
      // For all other elements, use the new global z-index system
      globalSendBackward();
    }
  };

  return { bringToFront, sendToBack, sendForward, sendBackward };
};
