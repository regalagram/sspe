import { StateCreator } from 'zustand';
import { calculateStateDiff, sanitizeState, getCurrentDiffConfig } from './diffConfig';

/**
 * Custom Undo/Redo implementation optimized for our diff system
 * Replaces Zundo with a cleaner, more compatible approach
 */

export interface UndoRedoState {
  pastStates: any[];
  futureStates: any[];
  canUndo: boolean;
  canRedo: boolean;
}

export interface UndoRedoActions {
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  pushToHistory: (state: any) => void;
}

interface CustomUndoConfig {
  limit?: number;
  enabled?: boolean;
  partialize?: (state: any) => any;
  equality?: (a: any, b: any) => boolean;
}

/**
 * Creates our custom undo/redo middleware
 */
export function customUndo<T>(
  config: StateCreator<T, [], [], T>,
  options: CustomUndoConfig = {}
) {
  const {
    limit = 50,
    enabled = true,
    partialize = (state: any) => state,
    equality = Object.is
  } = options;

  return (set: any, get: any, api: any) => {
    // Initialize the base state
    const baseState = config(
      (partial, replace) => {
        const currentState = get();
        
        // Apply the state change first
        const newState = typeof partial === 'function' 
          ? (partial as (state: any) => any)(currentState) 
          : partial;
        const nextState = replace ? newState : { ...currentState, ...newState };
        
        // Set the new state
        set(nextState, replace);
        
        // Add to history if enabled and state actually changed
        if (enabled) {
          const partializedPrevious = partialize(currentState);
          const partializedNext = partialize(nextState);
          
          if (!equality(partializedPrevious, partializedNext)) {
            addToHistory(partializedPrevious);
          }
        }
      },
      get,
      api
    );

    // History management state
    let pastStates: any[] = [];
    let futureStates: any[] = [];
    let isUndoRedo = false; // Flag to prevent history recording during undo/redo

    const addToHistory = (state: any) => {
      if (isUndoRedo) return; // Don't record history during undo/redo operations
      
      try {
        const diffConfig = getCurrentDiffConfig();
        let stateToStore = state;
        
        if (diffConfig.enabled && pastStates.length > 0) {
          // Try to create a structural diff for optimization
          const lastState = pastStates[pastStates.length - 1];
          const diff = calculateStateDiff(state, lastState);
          
          if (diff && (diff as any).__diffMetadata?.type === 'structural') {
            // Successfully created optimized diff
            stateToStore = diff;
            console.log('📦 Custom undo: stored structural diff');
          } else {
            // Fallback to full state
            stateToStore = sanitizeState(state);
            console.log('📋 Custom undo: stored full state');
          }
        } else {
          // First state or diff disabled - store full state
          stateToStore = sanitizeState(state);
        }

        // Add to history
        pastStates.push(stateToStore);
        
        // Clear future states (new branch in history)
        futureStates = [];
        
        // Enforce limit
        if (pastStates.length > limit) {
          pastStates.shift();
        }
        
        // Update undo/redo flags
        updateHistoryFlags();
        
      } catch (error) {
        console.error('Error adding to history:', error);
        // Fallback to sanitized full state
        pastStates.push(sanitizeState(state));
        futureStates = [];
        updateHistoryFlags();
      }
    };

    const reconstructState = (storedState: any): any => {
      try {
        // Check if it's a structural diff
        if (storedState.__diffMetadata?.type === 'structural') {
          console.log('🔧 Reconstructing state from structural diff');
          
          // Get current state as base
          const currentState = partialize(get());
          
          // Apply the structural diff changes
          const reconstructed = applyStructuralDiff(currentState, storedState);
          return sanitizeState(reconstructed);
        } else {
          // It's a full state, return sanitized version
          return sanitizeState(storedState);
        }
      } catch (error) {
        console.error('Error reconstructing state:', error);
        // Fallback to sanitized stored state
        return sanitizeState(storedState);
      }
    };

    const applyStructuralDiff = (baseState: any, diff: any): any => {
      const result = { ...baseState };
      
      if (!diff.changes || !Array.isArray(diff.changes)) {
        return result;
      }
      
      // Apply each change from the structural diff
      diff.changes.forEach((change: any) => {
        try {
          const path = change.path;
          const value = change.value;
          const type = change.type;
          
          if (type === 'CREATE' || type === 'CHANGE') {
            setNestedValue(result, path, value);
          } else if (type === 'REMOVE') {
            removeNestedValue(result, path);
          }
        } catch (error) {
          console.error('Error applying change:', change, error);
        }
      });
      
      return result;
    };

    const setNestedValue = (obj: any, path: string, value: any) => {
      const keys = path.split('.');
      let current = obj;
      
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!(key in current) || typeof current[key] !== 'object') {
          current[key] = {};
        }
        current = current[key];
      }
      
      current[keys[keys.length - 1]] = value;
    };

    const removeNestedValue = (obj: any, path: string) => {
      const keys = path.split('.');
      let current = obj;
      
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!(key in current)) return;
        current = current[key];
      }
      
      delete current[keys[keys.length - 1]];
    };

    const updateHistoryFlags = () => {
      // Update the state with new history flags
      const currentState = get();
      set({
        ...currentState,
        canUndo: pastStates.length > 0,
        canRedo: futureStates.length > 0
      }, false);
    };

    const undo = () => {
      if (pastStates.length === 0) return;
      
      console.log('↶ Custom undo operation');
      isUndoRedo = true;
      
      try {
        // Get current state and save to future
        const currentState = partialize(get());
        futureStates.push(sanitizeState(currentState));
        
        // Get and apply previous state
        const previousState = pastStates.pop()!;
        const reconstructedState = reconstructState(previousState);
        
        // Apply the reconstructed state
        set(reconstructedState, true);
        
        updateHistoryFlags();
        
      } catch (error) {
        console.error('Error during undo:', error);
      } finally {
        isUndoRedo = false;
      }
    };

    const redo = () => {
      if (futureStates.length === 0) return;
      
      console.log('↷ Custom redo operation');
      isUndoRedo = true;
      
      try {
        // Get current state and save to past
        const currentState = partialize(get());
        pastStates.push(sanitizeState(currentState));
        
        // Get and apply future state
        const futureState = futureStates.pop()!;
        const reconstructedState = reconstructState(futureState);
        
        // Apply the reconstructed state
        set(reconstructedState, true);
        
        updateHistoryFlags();
        
      } catch (error) {
        console.error('Error during redo:', error);
      } finally {
        isUndoRedo = false;
      }
    };

    const clearHistory = () => {
      pastStates = [];
      futureStates = [];
      updateHistoryFlags();
      console.log('🗑️ History cleared');
    };

    const pushToHistory = (state: any) => {
      addToHistory(state);
    };

    // Return the enhanced state with undo/redo functionality
    return {
      ...baseState,
      // History state
      canUndo: false,
      canRedo: false,
      // History actions
      undo,
      redo,
      clearHistory,
      pushToHistory
    };
  };
}
