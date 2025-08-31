import { StateCreator } from 'zustand';
import { EditorState } from '../types';
import { getAllSubPathsAtPoint } from '../utils/path-utils';
import { CONFIG } from '../config/constants';

export interface DeepSelectionActions {
  // Deep selection for overlapping subpaths within a path
  handleDeepSubPathSelection: (path: any, point: { x: number; y: number }, tolerance?: number) => string | null;
  clearDeepSelectionState: () => void;
  
  // New methods for movement-based cycling
  startCyclingDetection: (path: any, point: { x: number; y: number }, tolerance?: number) => { shouldWaitForMovement: boolean; selectedSubPathId: string | null };
  checkMovementAndResolveCycling: (currentPoint: { x: number; y: number }) => { shouldCycle: boolean; shouldStartDrag: boolean; selectedSubPathId: string | null };
  finalizeCycling: () => string | null;
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
    
    // Check if this is a consecutive click at the same location (within timeout and 20px tolerance)
    const isConsecutiveClick = currentDeepSelection?.lastClickTime &&
      currentDeepSelection?.lastClickPoint &&
      (currentTime - currentDeepSelection.lastClickTime) < CONFIG.PERFORMANCE.DEBOUNCE_DELAY &&
      Math.abs(currentDeepSelection.lastClickPoint.x - point.x) < 20 &&
      Math.abs(currentDeepSelection.lastClickPoint.y - point.y) < 20;
    
    let selectedSubPathId: string;
    let newIndex: number;
    
    // Check if any of the available subpaths is currently selected
    const currentlySelectedSubPaths = state.selection.selectedSubPaths;
    const selectedSubPathInThisArea = availableSubPaths.find(sp => 
      currentlySelectedSubPaths.includes(sp.id)
    );
    
    // If multiple subpaths are selected, disable cycling to allow direct drag
    if (currentlySelectedSubPaths.length > 1 && selectedSubPathInThisArea) {
      // Return the currently selected subpath in this area to allow direct drag
      set({
        deepSelection: undefined // Clear deep selection state to avoid cycling
      });
      return selectedSubPathInThisArea.id;
    }
    
    if (isConsecutiveClick && currentDeepSelection?.availableSubPaths) {
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

  startCyclingDetection: (path: any, point: { x: number; y: number }, tolerance: number = 15) => {
    const state = get();
    
    if (!path) {
      return { shouldWaitForMovement: false, selectedSubPathId: null };
    }
    
    // Get all subpaths at this point sorted by priority
    const availableSubPaths = getAllSubPathsAtPoint(path, point, tolerance);
    
    if (availableSubPaths.length === 0) {
      return { shouldWaitForMovement: false, selectedSubPathId: null };
    }
    
    // Check if any of these subpaths are already selected
    const selectedSubPaths = state.selection.selectedSubPaths;
    const alreadySelectedSubPath = availableSubPaths.find(sp => selectedSubPaths.includes(sp.id));
    
    // If a subpath is already selected at this point
    if (alreadySelectedSubPath) {
      // If there are multiple subpaths (cycling scenario), wait for movement to determine action
      if (availableSubPaths.length > 1) {
        // Store cycling state for movement detection
        const currentTime = Date.now();
        set({
          deepSelection: {
            lastClickPoint: point,
            lastClickTime: currentTime,
            availableSubPaths: availableSubPaths.map(sp => sp.id),
            currentIndex: availableSubPaths.findIndex(sp => sp.id === alreadySelectedSubPath.id),
            pendingCycling: true,
            pendingMovementThreshold: 3 // Small threshold for cycling vs drag
          }
        });
        return { shouldWaitForMovement: true, selectedSubPathId: alreadySelectedSubPath.id };
      } else {
        // Only one subpath and it's already selected - start drag immediately
        return { shouldWaitForMovement: false, selectedSubPathId: alreadySelectedSubPath.id };
      }
    }
    
    // If only one subpath and it's not selected, select it directly - no need to wait
    if (availableSubPaths.length === 1) {
      set({
        deepSelection: undefined // Clear deep selection state
      });
      return { shouldWaitForMovement: false, selectedSubPathId: availableSubPaths[0].id };
    }
    
    // Check if any of the available subpaths is currently selected
    const currentlySelectedSubPaths = state.selection.selectedSubPaths;
    const selectedSubPathInThisArea = availableSubPaths.find(sp => 
      currentlySelectedSubPaths.includes(sp.id)
    );
    
    // If multiple subpaths are selected, disable cycling to allow direct drag
    if (currentlySelectedSubPaths.length > 1 && selectedSubPathInThisArea) {
      set({
        deepSelection: undefined // Clear deep selection state to avoid cycling
      });
      return { shouldWaitForMovement: false, selectedSubPathId: selectedSubPathInThisArea.id };
    }
    
    // If there's a selected subpath in this area, we need to wait for movement to decide
    if (selectedSubPathInThisArea) {
      // Set up pending cycling state
      const pendingDeepSelection = {
        lastClickPoint: point,
        lastClickTime: Date.now(),
        availableSubPaths: availableSubPaths.map(sp => sp.id),
        currentIndex: availableSubPaths.findIndex(sp => sp.id === selectedSubPathInThisArea.id),
        pendingCycling: true,
        pendingMovementThreshold: 3 // SVG units
      };
      
      set({
        deepSelection: pendingDeepSelection
      });
      
      return { shouldWaitForMovement: true, selectedSubPathId: selectedSubPathInThisArea.id };
    }
    
    // No selected subpath in this area - select the first one
    const selectedSubPathId = availableSubPaths[0].id;
    const newDeepSelection = {
      lastClickPoint: point,
      lastClickTime: Date.now(),
      availableSubPaths: availableSubPaths.map(sp => sp.id),
      currentIndex: 0
    };
    
    set({
      deepSelection: newDeepSelection
    });
    
    return { shouldWaitForMovement: false, selectedSubPathId };
  },

  checkMovementAndResolveCycling: (currentPoint: { x: number; y: number }) => {
    const state = get();
    const currentDeepSelection = state.deepSelection;
    
    if (!currentDeepSelection?.pendingCycling || !currentDeepSelection?.lastClickPoint) {
      return { shouldCycle: false, shouldStartDrag: false, selectedSubPathId: null };
    }
    
    // Calculate distance from initial point
    const distance = Math.sqrt(
      Math.pow(currentPoint.x - currentDeepSelection.lastClickPoint.x, 2) + 
      Math.pow(currentPoint.y - currentDeepSelection.lastClickPoint.y, 2)
    );
    
    const threshold = currentDeepSelection.pendingMovementThreshold || 3;
    
    // If movement detected, start drag
    if (distance > threshold) {
      // Clear pending state
      set({
        deepSelection: {
          ...currentDeepSelection,
          pendingCycling: false
        }
      });
      
      const currentIndex = currentDeepSelection.currentIndex || 0;
      const selectedSubPathId = currentDeepSelection.availableSubPaths?.[currentIndex] || null;
      
      return { shouldCycle: false, shouldStartDrag: true, selectedSubPathId };
    }
    
    // Not enough movement yet
    return { shouldCycle: false, shouldStartDrag: false, selectedSubPathId: null };
  },

  finalizeCycling: () => {
    const state = get();
    const currentDeepSelection = state.deepSelection;
    
    if (!currentDeepSelection?.pendingCycling || !currentDeepSelection?.availableSubPaths) {
      return null;
    }
    
    // Perform cycling - move to next subpath
    const currentIndex = currentDeepSelection.currentIndex || 0;
    const newIndex = (currentIndex + 1) % currentDeepSelection.availableSubPaths.length;
    const selectedSubPathId = currentDeepSelection.availableSubPaths[newIndex];
    
    // Update deep selection state with the new index
    const newDeepSelection = {
      ...currentDeepSelection,
      currentIndex: newIndex,
      pendingCycling: false,
      lastClickTime: Date.now() // Update click time for future consecutive clicks
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