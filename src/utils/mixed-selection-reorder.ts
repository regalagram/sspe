import { useEditorStore } from '../store/editorStore';
import { reorderManager } from '../plugins/reorder/ReorderManager';
import { bringElementsToFront, sendElementsToBack, sendElementsForward, sendElementsBackward, initializeZIndexes } from './z-index-manager';
import { bringGroupsToFront, sendGroupsToBack, sendGroupsForward, sendGroupsBackward } from './group-reorder-manager';

/**
 * Handle mixed selection reordering including subpaths
 * This function handles the complexity of mixed selections by calling
 * the appropriate reorder system for each type of selected element
 */
export const handleMixedSelectionReorder = (type: 'toFront' | 'forward' | 'backward' | 'toBack') => {
  const store = useEditorStore.getState();
  const selection = store.selection;
  
  // Capture individual element IDs at the beginning to avoid losing them
  const individualElementIds = [
    ...selection.selectedPaths,
    ...selection.selectedTexts,
    ...selection.selectedImages,
    ...selection.selectedUses,
  ];
  
  // Initialize z-indexes if needed
  initializeZIndexes();
  
  // Handle subpaths using ReorderManager if any are selected
  // Note: ReorderManager pushes to history internally
  if (selection.selectedSubPaths.length > 0) {
    reorderManager.setEditorStore(store);
    
    switch (type) {
      case 'toFront':
        reorderManager.bringToFront();
        break;
      case 'forward':
        reorderManager.bringForward();
        break;
      case 'backward':
        reorderManager.sendBackward();
        break;
      case 'toBack':
        reorderManager.sendToBack();
        break;
    }
  }
  
  // Handle groups if any are selected
  // Note: Group functions expect caller to push to history
  if (selection.selectedGroups.length > 0) {
    store.pushToHistory();
    
    switch (type) {
      case 'toFront':
        bringGroupsToFront();
        break;
      case 'forward':
        sendGroupsForward();
        break;
      case 'backward':
        sendGroupsBackward();
        break;
      case 'toBack':
        sendGroupsToBack();
        break;
    }
  }
  
  // Handle individual elements if any are selected
  // Note: Global functions push to history internally
  const hasIndividualElements = selection.selectedPaths.length > 0 ||
                               selection.selectedTexts.length > 0 ||
                               selection.selectedImages.length > 0 ||
                               selection.selectedUses.length > 0;
  
  if (hasIndividualElements && individualElementIds.length > 0) {
    // Use the captured IDs directly instead of calling global functions
    // which would re-query the store (and potentially find empty selection)
    switch (type) {
      case 'toFront':
        bringElementsToFront(individualElementIds);
        break;
      case 'forward':
        sendElementsForward(individualElementIds);
        break;
      case 'backward':
        sendElementsBackward(individualElementIds);
        break;
      case 'toBack':
        sendElementsToBack(individualElementIds);
        break;
    }
  }
};

/**
 * Check if current selection is mixed (contains multiple types of elements)
 */
export const hasMixedSelection = (): boolean => {
  const store = useEditorStore.getState();
  const selection = store.selection;
  
  const selectionTypes = [
    selection.selectedGroups.length > 0,
    selection.selectedSubPaths.length > 0,
    selection.selectedPaths.length > 0 || 
    selection.selectedTexts.length > 0 || 
    selection.selectedImages.length > 0 || 
    selection.selectedUses.length > 0
  ];
  
  // Count how many types are selected
  const selectedTypeCount = selectionTypes.filter(Boolean).length;
  
  return selectedTypeCount > 1;
};
