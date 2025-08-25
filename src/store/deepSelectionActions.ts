import { StateCreator } from 'zustand';
import { EditorState } from '../types';
import { getAllSubPathsAtPoint } from '../utils/path-utils';

export interface DeepSelectionActions {
  // Deep selection for overlapping subpaths within a path
  handleDeepSubPathSelection: (path: any, point: { x: number; y: number }, tolerance?: number) => string | null;
  clearDeepSelectionState: () => void;
}

export const createDeepSelectionActions: StateCreator<
  EditorState & DeepSelectionActions,
  [],
  [],
  DeepSelectionActions
> = (set, get, api) => ({
  handleDeepSubPathSelection: (path: any, point: { x: number; y: number }, tolerance: number = 15) => {
    const state = get();
    
    if (!path) {
      return null;
    }
    
    // Get all subpaths at this point sorted by priority
    const availableSubPaths = getAllSubPathsAtPoint(path, point, tolerance);
    
    if (availableSubPaths.length === 0) {
      return null;
    }
    
    // If only one subpath, select it directly
    if (availableSubPaths.length === 1) {
      set({
        deepSelection: undefined // Clear deep selection state
      });
      return availableSubPaths[0].id;
    }
    
    const currentTime = Date.now();
    const currentDeepSelection = state.deepSelection;
    
    // Check if this is a consecutive click at the same location (within 1000ms and 20px tolerance)
    const isConsecutiveClick = currentDeepSelection &&
      currentDeepSelection.lastClickTime &&
      currentDeepSelection.lastClickPoint &&
      (currentTime - currentDeepSelection.lastClickTime) < 1000 &&
      Math.abs(currentDeepSelection.lastClickPoint.x - point.x) < 20 &&
      Math.abs(currentDeepSelection.lastClickPoint.y - point.y) < 20;
    
    let selectedSubPathId: string;
    let newIndex: number;
    
    // Check if any of the available subpaths is currently selected
    const currentlySelectedSubPaths = state.selection.selectedSubPaths;
    const selectedSubPathInThisArea = availableSubPaths.find(sp => 
      currentlySelectedSubPaths.includes(sp.id)
    );
    
    if (isConsecutiveClick && currentDeepSelection.availableSubPaths) {
      // Consecutive click - cycle to next subpath
      const currentIndex = currentDeepSelection.currentIndex || 0;
      newIndex = (currentIndex + 1) % availableSubPaths.length;
      selectedSubPathId = availableSubPaths[newIndex].id;
    } else if (selectedSubPathInThisArea) {
      // A subpath in this area is already selected - rotate to the next one
      const currentIndex = availableSubPaths.findIndex(sp => sp.id === selectedSubPathInThisArea.id);
      newIndex = (currentIndex + 1) % availableSubPaths.length;
      selectedSubPathId = availableSubPaths[newIndex].id;
    } else {
      // First click or different location - select the first (highest priority) subpath
      newIndex = 0;
      selectedSubPathId = availableSubPaths[0].id;
    }
    
    // Update deep selection state
    const newDeepSelection = {
      lastClickPoint: point,
      lastClickTime: currentTime,
      availableSubPaths: availableSubPaths.map(sp => sp.id),
      currentIndex: newIndex
    };
    
    set({
      deepSelection: newDeepSelection
    });
    
    return selectedSubPathId;
  },

  clearDeepSelectionState: () => {
    set({
      deepSelection: undefined
    });
  }
});