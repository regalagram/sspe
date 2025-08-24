/**
 * Modular Floating Actions System
 * 
 * This file replaces the large FloatingSelectionActions.ts with a modular approach.
 * Each type of action is split into its own file for better maintainability.
 */

import { useEditorStore } from '../../store/editorStore';

// Export all actions
export { singleElementActions } from './actions/singleElementActions';
export { multipleSelectionActions } from './actions/multipleSelectionActions';
export { groupActions } from './actions/groupActions';
export { subPathActions } from './actions/subPathActions';
export { imageActions } from './actions/imageActions';
export { useActions, symbolActions } from './actions/useActions';
export { textActions } from './actions/textActions';
export { mixedSelectionActions } from './actions/mixedSelectionActions';

// Export all floating action definitions
export {
  singleElementFloatingActionDefinition,
  multipleSelectionFloatingActionDefinition,
  groupFloatingActionDefinition,
  subPathFloatingActionDefinition,
  pathFloatingActionDefinition,
  imageFloatingActionDefinition,
  symbolFloatingActionDefinition,
  textFloatingActionDefinition,
  mixedSelectionFloatingActionDefinition,
  allFloatingActionDefinitions
} from './actions/floatingActionDefinitions';

// Export common utilities
export {
  duplicateSelected,
  deleteSelected,
  getSelectedElementsBounds,
  createDuplicateAction,
  createDeleteAction
} from './actions/commonActions';

// Export the recursive lock function that other parts of the system might need
export { recursivelyLockGroup } from './actions/groupActions';

// For backwards compatibility, export some functions that might be imported elsewhere
export const recursivelyLockPath = (pathId: string, shouldLock: boolean) => {
  const store = useEditorStore.getState();
  
  // Find the path and update both the path and all its subpaths
  const pathIndex = store.paths.findIndex((path: any) => path.id === pathId);
  
  if (pathIndex !== -1) {
    const path = store.paths[pathIndex];
    
    // Lock/unlock all subpaths recursively
    const updatedSubPaths = path.subPaths.map((sp: any) => ({ 
      ...sp, 
      locked: shouldLock 
    }));
    
    // Update the path with locked state and updated subpaths
    useEditorStore.setState((state: any) => ({
      paths: state.paths.map((p: any, index: number) => 
        index === pathIndex ? { 
          ...p, 
          locked: shouldLock,
          subPaths: updatedSubPaths 
        } : p
      )
    }));
  }
};

export const recursivelyLockSubPath = (subPathId: string, shouldLock: boolean) => {
  const store = useEditorStore.getState();
  
  // Find parent path and update the subpath
  const pathIndex = store.paths.findIndex((path: any) => 
    path.subPaths.some((sp: any) => sp.id === subPathId)
  );
  
  if (pathIndex !== -1) {
    const path = store.paths[pathIndex];
    const updatedSubPaths = path.subPaths.map((sp: any) => 
      sp.id === subPathId ? { ...sp, locked: shouldLock } : sp
    );
    
    useEditorStore.setState((state: any) => ({
      paths: state.paths.map((p: any, index: number) => 
        index === pathIndex ? { ...p, subPaths: updatedSubPaths } : p
      )
    }));
  }
};