import { EditorState } from '../types';

/**
 * Creates a clean copy of the editor state for history storage
 * Excludes functions, history, and other non-serializable data
 */
export function cleanStateForHistory(state: any): any {
  // Create a deep copy and exclude problematic properties
  const cleanState: any = {};

  // Exclude function properties and history from serialization
  const excludedKeys = new Set([
    'history',
    'undo',
    'redo', 
    'pushToHistory',
    'addPath',
    'updatePath',
    'deletePath',
    'selectPath',
    'clearSelection',
    'addText',
    'updateText',
    'deleteText',
    'selectText',
    'addGroup',
    'updateGroup',
    'deleteGroup',
    'selectGroup',
    // Add any other function names that exist in the state
  ]);

  // Copy all properties except excluded ones
  for (const [key, value] of Object.entries(state)) {
    if (!excludedKeys.has(key) && typeof value !== 'function') {
      try {
        // Deep clone to avoid reference issues
        cleanState[key] = JSON.parse(JSON.stringify(value));
      } catch (error) {
        console.warn(`Failed to clone state property ${key}:`, error);
        // Skip this property if it can't be serialized
      }
    }
  }

  return cleanState;
}

/**
 * Merges a clean state back into the current state
 * Preserves functions and non-serializable data from current state
 */
export function mergeCleanStateIntoCurrentState(
  currentState: any, 
  cleanState: any
): any {
  // Since the store combines EditorState with action functions,
  // we merge the clean state into the current state while preserving
  // all the function properties that exist in currentState
  return {
    ...currentState,
    ...cleanState,
    // Always preserve the current history
    history: currentState.history,
  };
}
