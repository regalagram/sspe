import { StateCreator } from 'zustand';
import { EditorState } from '../types';

export interface HistoryActions {
  undo: () => void;
  redo: () => void;
  pushToHistory: () => void;
  // Zundo compatibility properties
  canUndo: boolean;
  canRedo: boolean;
}

export const createHistoryActions: StateCreator<
  EditorState & HistoryActions,
  [],
  [],
  HistoryActions
> = (set, get, store) => ({
  // Zundo integration - delegate to temporal store
  undo: () => {
    const temporal = (store as any).temporal;
    if (temporal) {
      temporal.getState().undo();
    }
  },

  redo: () => {
    const temporal = (store as any).temporal;
    if (temporal) {
      temporal.getState().redo();
    }
  },

  // Keep pushToHistory for gradual migration - will be no-op with Zundo
  pushToHistory: () => {
    // No-op with Zundo - history is tracked automatically
    // This is kept for backward compatibility during migration
  },

  // Computed properties that delegate to temporal store
  get canUndo() {
    const temporal = (store as any).temporal;
    return temporal ? temporal.getState().pastStates.length > 0 : false;
  },

  get canRedo() {
    const temporal = (store as any).temporal;
    return temporal ? temporal.getState().futureStates.length > 0 : false;
  },
});