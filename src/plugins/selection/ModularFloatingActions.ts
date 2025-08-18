/**
 * Modular Floating Actions System
 * 
 * This file replaces the large FloatingSelectionActions.ts with a modular approach.
 * Each type of action is split into its own file for better maintainability.
 */

// Export all actions
export { singleElementActions } from './actions/singleElementActions';
export { multipleSelectionActions } from './actions/multipleSelectionActions';
export { groupActions } from './actions/groupActions';
export { subPathActions } from './actions/subPathActions';
export { imageActions } from './actions/imageActions';
export { useActions, symbolActions } from './actions/useActions';
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
  // This function was originally in FloatingSelectionActions
  // Implementation would go here if needed by other parts of the system
  console.warn('recursivelyLockPath not implemented in modular system yet');
};

export const recursivelyLockSubPath = (subPathId: string, shouldLock: boolean) => {
  // This function was originally in FloatingSelectionActions  
  // Implementation would go here if needed by other parts of the system
  console.warn('recursivelyLockSubPath not implemented in modular system yet');
};