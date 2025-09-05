import { useEditorStore } from '../store/editorStore';
import { globalUndoRedo } from '../store/simpleUndoRedo';
import { useCallback, useEffect, useState } from 'react';

/**
 * Simple hook that replaces useEditorHistory from Zundo
 * Provides undo/redo functionality using our custom system
 * Maintains compatibility with the original API
 */
export function useSimpleEditorHistory() {
  const [historyState, setHistoryState] = useState(globalUndoRedo.getState());
  
  // Set up automatic state capture
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout | null = null;
    let isInternalChange = false;
    
    // Subscribe to all state changes
    const unsubscribe = useEditorStore.subscribe(
      (state) => {
        // Skip if this is an internal change (undo/redo)
        if (isInternalChange) return;
        
        // Debounce to avoid capturing every tiny change
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        
        debounceTimer = setTimeout(() => {
          try {
            // Partialize the state (remove non-essential fields)
            const { 
              history, 
              renderVersion, 
              floatingToolbarUpdateTimestamp,
              deepSelection,
              isSpecialPointSeparationAnimating,
              ...historicalState 
            } = state;
            
            globalUndoRedo.pushState(historicalState);
            
            // Update our local state to trigger re-renders
            setHistoryState(globalUndoRedo.getState());
          } catch (error) {
            console.error('Error capturing state for history:', error);
          }
          
          debounceTimer = null;
        }, 150);
      }
    );
    
    return () => {
      unsubscribe();
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, []);

  const undo = useCallback(() => {
    const currentState = useEditorStore.getState();
    const undoState = globalUndoRedo.undo(currentState);
    
    if (undoState) {
      console.log('🔄 Applying undo state');
      // Use Zustand's setState method directly
      useEditorStore.setState(undoState, true); // true = replace entire state
      setHistoryState(globalUndoRedo.getState());
    } else {
      console.log('⚠️ No undo state available');
    }
  }, []);

  const redo = useCallback(() => {
    const currentState = useEditorStore.getState();
    const redoState = globalUndoRedo.redo(currentState);
    
    if (redoState) {
      console.log('🔄 Applying redo state');
      // Use Zustand's setState method directly
      useEditorStore.setState(redoState, true); // true = replace entire state
      setHistoryState(globalUndoRedo.getState());
    } else {
      console.log('⚠️ No redo state available');
    }
  }, []);

  const clear = useCallback(() => {
    globalUndoRedo.clear();
    setHistoryState(globalUndoRedo.getState());
  }, []);

  // Get current editor state for present
  const present = useEditorStore(state => state);

  return {
    // Main API (compatible with original)
    canUndo: historyState.canUndo,
    canRedo: historyState.canRedo,
    undo,
    redo,
    clear,
    
    // Backward compatibility fields
    past: [], // We don't expose the actual past states array for security
    future: [], // We don't expose the actual future states array for security
    present,
    
    // Additional state for compatibility with Zundo API
    isTracking: true, // Our system is always tracking
    pause: () => {}, // Not implemented in our simple system
    resume: () => {}, // Not implemented in our simple system
    
    // Additional info
    pastStates: historyState.pastCount,
    futureStates: historyState.futureCount
  };
}
