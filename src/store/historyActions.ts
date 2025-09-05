import { StateCreator } from 'zustand';
import { EditorState } from '../types';
import { globalUndoRedo } from './simpleUndoRedo';

export interface HistoryActions {
  undo: () => void;
  redo: () => void;
  pushToHistory: () => void;
  // Compatibility properties
  canUndo: boolean;
  canRedo: boolean;
}

export const createHistoryActions: StateCreator<
  EditorState & HistoryActions,
  [],
  [],
  HistoryActions
> = (set, get, store) => ({
  // Delegate to our simple undo/redo system
  undo: () => {
    const currentState = get();
    const undoState = globalUndoRedo.undo(currentState);
    if (undoState) {
      console.log('🔄 Manual undo operation from historyActions');
      set(undoState, true);
    }
  },

  redo: () => {
    const currentState = get();
    const redoState = globalUndoRedo.redo(currentState);
    if (redoState) {
      console.log('🔄 Manual redo operation from historyActions');
      set(redoState, true);
    }
  },

  // Manual history tracking - optimized for explicit calls
  pushToHistory: () => {
    const currentState = get();
    console.log('📚 Manual pushToHistory called');
    
    // Extract only the historical state (remove UI-only fields)
    const { 
      history, 
      renderVersion, 
      floatingToolbarUpdateTimestamp,
      deepSelection,
      isSpecialPointSeparationAnimating,
      ...historicalState 
    } = currentState;
    
    globalUndoRedo.pushState(historicalState);
  },

  // Computed properties that delegate to our simple undo/redo system
  get canUndo() {
    return globalUndoRedo.getState().canUndo;
  },

  get canRedo() {
    return globalUndoRedo.getState().canRedo;
  },
});