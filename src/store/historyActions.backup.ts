import { StateCreator } from 'zustand';
import { EditorState } from '../types';

export interface HistoryActions {
  undo: () => void;
  redo: () => void;
  pushToHistory: () => void;
}

export const createHistoryActions: StateCreator<
  EditorState & HistoryActions,
  [],
  [],
  HistoryActions
> = (set, get) => ({
  undo: () =>
    set((state) => {
      if (state.history.past.length === 0) return state;
      const previous = state.history.past[state.history.past.length - 1];
      const newPast = state.history.past.slice(0, state.history.past.length - 1);
      return {
        ...previous,
        history: {
          past: newPast,
          present: state,
          future: [state, ...state.history.future],
          canUndo: newPast.length > 0,
          canRedo: true,
        },
      };
    }),

  redo: () =>
    set((state) => {
      if (state.history.future.length === 0) return state;
      const next = state.history.future[0];
      const newFuture = state.history.future.slice(1);
      return {
        ...next,
        history: {
          past: [...state.history.past, state],
          present: next,
          future: newFuture,
          canUndo: true,
          canRedo: newFuture.length > 0,
        },
      };
    }),

  pushToHistory: () =>
    set((state) => ({
      history: {
        past: [...state.history.past, state].slice(-50),
        present: state,
        future: [],
        canUndo: true,
        canRedo: false,
      },
    })),
});
