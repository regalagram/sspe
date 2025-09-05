import { StateCreator } from 'zustand';
import { EditorState } from '../types';
import { cleanStateForHistory, mergeCleanStateIntoCurrentState } from '../utils/history-utils';

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
      
      // Handle timestamps
      const pastTimestamps = state.history.timestamps?.past || [];
      const newPastTimestamps = pastTimestamps.slice(0, pastTimestamps.length - 1);
      const currentTimestamp = state.history.timestamps?.present || Date.now();
      const futureTimestamps = state.history.timestamps?.future || [];
      
      // Clean the current state before adding to future
      const cleanedCurrentState = cleanStateForHistory(state);
      
      // Merge the clean previous state with current functions/history
      const restoredState = mergeCleanStateIntoCurrentState(state, previous);
      
      return {
        ...restoredState,
        history: {
          past: newPast,
          present: cleanedCurrentState,
          future: [cleanedCurrentState, ...state.history.future],
          canUndo: newPast.length > 0,
          canRedo: true,
          timestamps: {
            past: newPastTimestamps,
            present: pastTimestamps[pastTimestamps.length - 1] || Date.now(),
            future: [currentTimestamp, ...futureTimestamps]
          }
        },
      };
    }),

  redo: () =>
    set((state) => {
      if (state.history.future.length === 0) return state;
      const next = state.history.future[0];
      const newFuture = state.history.future.slice(1);
      
      // Handle timestamps
      const pastTimestamps = state.history.timestamps?.past || [];
      const currentTimestamp = state.history.timestamps?.present || Date.now();
      const futureTimestamps = state.history.timestamps?.future || [];
      const newFutureTimestamps = futureTimestamps.slice(1);
      
      // Clean the current state before adding to past
      const cleanedCurrentState = cleanStateForHistory(state);
      
      // Merge the clean next state with current functions/history
      const restoredState = mergeCleanStateIntoCurrentState(state, next);
      
      return {
        ...restoredState,
        history: {
          past: [...state.history.past, cleanedCurrentState],
          present: next,
          future: newFuture,
          canUndo: true,
          canRedo: newFuture.length > 0,
          timestamps: {
            past: [...pastTimestamps, currentTimestamp],
            present: futureTimestamps[0] || Date.now(),
            future: newFutureTimestamps
          }
        },
      };
    }),

  pushToHistory: () =>
    set((state) => {
      const currentTimestamp = Date.now();
      const pastTimestamps = state.history.timestamps?.past || [];
      const presentTimestamp = state.history.timestamps?.present || currentTimestamp;
      
      // Clean the current state before saving to history
      const cleanedState = cleanStateForHistory(state);
      
      return {
        history: {
          past: [...state.history.past, cleanedState].slice(-50),
          present: cleanedState,
          future: [],
          canUndo: true,
          canRedo: false,
          timestamps: {
            past: [...pastTimestamps, presentTimestamp].slice(-50),
            present: currentTimestamp,
            future: []
          }
        },
      };
    }),
});