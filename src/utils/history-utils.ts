import { EditorState } from '../types';

/**
 * Safely clones a value handling edge cases for JSON serialization
 * 
 * Handles specific issues like:
 * - undefined values (which JSON.stringify returns as undefined, not "undefined")
 * - Functions and other non-serializable content
 * - Circular references
 * 
 * This fixes the issue where deepSelection: undefined caused JSON.parse(undefined) to fail
 */
export function safeClone(value: any): any {
  // Explicitly handle undefined - this is the main fix for deepSelection
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  
  try {
    const stringified = JSON.stringify(value);
    // JSON.stringify can return undefined for some values (like functions, symbols)
    if (stringified === undefined) {
      return null; // Use null as safe fallback
    }
    return JSON.parse(stringified);
  } catch (error) {
    // If serialization fails (circular references, etc.), return null as safe fallback
    return null;
  }
}

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
      const clonedValue = safeClone(value);
      if (clonedValue === null && value !== null) {
        console.warn(`Failed to clone state property ${key}: using null as fallback`);
      }
      cleanState[key] = clonedValue;
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
