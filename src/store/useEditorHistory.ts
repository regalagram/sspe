import { useEditorStore } from './editorStore';
import { globalUndoRedo, setUndoRedoFlag } from './simpleUndoRedo';
import { useCallback, useEffect, useState } from 'react';

// Flag to track when we're applying undo/redo operations
let isApplyingUndoRedo = false;

/**
 * Hook de compatibilidad que expone las propiedades de historia 
 * de manera compatible con el API anterior - ahora usando manual pushToHistory
 */
export const useEditorHistory = () => {
  const [historyState, setHistoryState] = useState(globalUndoRedo.getState());
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // Initialize history with current state only once
  useEffect(() => {
    if (!hasInitialized) {
      const currentState = useEditorStore.getState();
      console.log('🎯 Initializing history with current editor state');
      globalUndoRedo.pushState(currentState);
      setHistoryState(globalUndoRedo.getState());
      setHasInitialized(true);
    }
  }, [hasInitialized]);
  
  // No more automatic state capture - only manual via pushToHistory
  useEffect(() => {
    // Update our local state periodically to reflect changes from manual pushToHistory calls
    const interval = setInterval(() => {
      setHistoryState(globalUndoRedo.getState());
    }, 200); // Check every 200ms for updates
    
    return () => clearInterval(interval);
  }, []);

  const undo = useCallback(() => {
    const currentState = useEditorStore.getState();
    const undoState = globalUndoRedo.undo(currentState);
    
    if (undoState) {
      console.log('🔄 Applying undo state');
      isApplyingUndoRedo = true;
      setUndoRedoFlag(true);
      
      useEditorStore.setState(undoState, true);
      setHistoryState(globalUndoRedo.getState());
      
      // Reset flag after a small delay to ensure the state change is processed
      setTimeout(() => {
        isApplyingUndoRedo = false;
        setUndoRedoFlag(false);
        console.log('✅ Undo operation completed');
      }, 100);
    } else {
      console.log('⚠️ No undo state available');
    }
  }, []);

  const redo = useCallback(() => {
    const currentState = useEditorStore.getState();
    const redoState = globalUndoRedo.redo(currentState);
    
    if (redoState) {
      console.log('🔄 Applying redo state');
      isApplyingUndoRedo = true;
      setUndoRedoFlag(true);
      
      useEditorStore.setState(redoState, true);
      setHistoryState(globalUndoRedo.getState());
      
      // Reset flag after a small delay to ensure the state change is processed
      setTimeout(() => {
        isApplyingUndoRedo = false;
        setUndoRedoFlag(false);
        console.log('✅ Redo operation completed');
      }, 100);
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
    canUndo: historyState.canUndo,
    canRedo: historyState.canRedo,
    undo,
    redo,
    clear,
    // Backward compatibility - estos campos se mantienen para componentes que los usen
    past: [], // We don't expose the actual past states array for security
    future: [], // We don't expose the actual future states array for security
    present,
    // Estado adicional compatible con Zundo API
    isTracking: true, // Our system is always tracking
    pause: () => {}, // Not implemented in our simple system
    resume: () => {}, // Not implemented in our simple system
    pastStates: historyState.pastCount,
    futureStates: historyState.futureCount
  };
};

/**
 * Hook reactivo para temporal store - se suscribe a cambios en el estado temporal
 * Ahora usa nuestro sistema simple
 */
export const useTemporalStore = () => {
  const [historyState, setHistoryState] = useState(globalUndoRedo.getState());
  
  // Update history state when it changes
  useEffect(() => {
    const interval = setInterval(() => {
      setHistoryState(globalUndoRedo.getState());
    }, 100); // Check every 100ms for updates
    
    return () => clearInterval(interval);
  }, []);

  return {
    pastStates: historyState.pastCount > 0 ? new Array(historyState.pastCount).fill(null) : [],
    futureStates: historyState.futureCount > 0 ? new Array(historyState.futureCount).fill(null) : [],
    isTracking: true,
    pause: () => {},
    resume: () => {},
    undo: () => {
      const currentState = useEditorStore.getState();
      const undoState = globalUndoRedo.undo(currentState);
      if (undoState) {
        isApplyingUndoRedo = true;
        setUndoRedoFlag(true);
        useEditorStore.setState(undoState, true);
        setHistoryState(globalUndoRedo.getState());
        setTimeout(() => {
          isApplyingUndoRedo = false;
          setUndoRedoFlag(false);
        }, 100);
      }
    },
    redo: () => {
      const currentState = useEditorStore.getState();
      const redoState = globalUndoRedo.redo(currentState);
      if (redoState) {
        isApplyingUndoRedo = true;
        setUndoRedoFlag(true);
        useEditorStore.setState(redoState, true);
        setHistoryState(globalUndoRedo.getState());
        setTimeout(() => {
          isApplyingUndoRedo = false;
          setUndoRedoFlag(false);
        }, 100);
      }
    },
    clear: () => {
      globalUndoRedo.clear();
      setHistoryState(globalUndoRedo.getState());
    }
  };
};
