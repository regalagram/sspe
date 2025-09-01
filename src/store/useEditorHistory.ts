import { useEditorStore } from './editorStore';
import { useStore } from 'zustand';
import { useCallback } from 'react';

/**
 * Hook de compatibilidad que expone las propiedades de historia 
 * de manera compatible con el API anterior
 */
export const useEditorHistory = () => {
  const store = useEditorStore;
  
  // Hook reactivo para el estado temporal
  const temporal = useStore(store.temporal);
  
  // Callbacks memoizados para mejor performance
  const undo = useCallback(() => {
    temporal.undo();
  }, [temporal]);
  
  const redo = useCallback(() => {
    temporal.redo();
  }, [temporal]);
  
  const clear = useCallback(() => {
    temporal.clear();
  }, [temporal]);
  
  return {
    canUndo: temporal.pastStates.length > 0,
    canRedo: temporal.futureStates.length > 0,
    undo,
    redo,
    clear,
    // Backward compatibility - estos campos se mantienen para componentes que los usen
    past: temporal.pastStates,
    future: temporal.futureStates,
    present: useEditorStore.getState(),
    // Estado adicional de Zundo
    isTracking: temporal.isTracking,
    pause: temporal.pause,
    resume: temporal.resume
  };
};

/**
 * Hook reactivo para temporal store - se suscribe a cambios en el estado temporal
 */
export const useTemporalStore = () => {
  return useStore(useEditorStore.temporal);
};
