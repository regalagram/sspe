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

/**
 * Calcula el tamaño aproximado de un objeto en bytes
 */
const calculateObjectSize = (obj: any): number => {
  const str = JSON.stringify(obj);
  return new Blob([str]).size;
};

/**
 * Formatea bytes en una unidad legible
 */
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Hook para debug - permite inspeccionar el estado temporal
 */
export const useHistoryDebug = () => {
  const temporal = useStore(useEditorStore.temporal);
  const currentState = useEditorStore.getState();
  
  // Calcular tamaños de memoria
  const pastStatesSize = temporal.pastStates.length > 0 ? 
    temporal.pastStates.reduce((total, state) => total + calculateObjectSize(state), 0) : 0;
  
  const futureStatesSize = temporal.futureStates.length > 0 ? 
    temporal.futureStates.reduce((total, state) => total + calculateObjectSize(state), 0) : 0;
  
  const currentStateSize = calculateObjectSize(currentState);
  const totalHistorySize = pastStatesSize + futureStatesSize + currentStateSize;
  
  // Calcular tamaño promedio por estado
  const totalStates = temporal.pastStates.length + temporal.futureStates.length + 1;
  const avgStateSize = totalHistorySize / totalStates;
  
  // Estimar memoria máxima con límite de 50 estados
  const maxPossibleSize = avgStateSize * 50; // límite actual
  const memoryUsagePercentage = (totalHistorySize / maxPossibleSize) * 100;
  
  return {
    pastStatesCount: temporal.pastStates.length,
    futureStatesCount: temporal.futureStates.length,
    isTracking: temporal.isTracking,
    pastStates: temporal.pastStates,
    futureStates: temporal.futureStates,
    // Métricas de memoria
    memory: {
      pastStatesSize,
      futureStatesSize,
      currentStateSize,
      totalHistorySize,
      avgStateSize,
      maxPossibleSize,
      memoryUsagePercentage: Math.min(memoryUsagePercentage, 100),
      formatted: {
        pastStatesSize: formatBytes(pastStatesSize),
        futureStatesSize: formatBytes(futureStatesSize),
        currentStateSize: formatBytes(currentStateSize),
        totalHistorySize: formatBytes(totalHistorySize),
        avgStateSize: formatBytes(avgStateSize),
        maxPossibleSize: formatBytes(maxPossibleSize)
      }
    }
  };
};
