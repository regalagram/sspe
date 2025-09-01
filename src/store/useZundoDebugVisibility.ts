import { useState } from 'react';

// Estado global para controlar la visibilidad del panel de debug
let isZundoDebugVisible = false;
let setVisibilityCallback: ((visible: boolean) => void) | null = null;

/**
 * Hook para controlar la visibilidad del panel de debug de Zundo
 */
export const useZundoDebugVisibility = () => {
  const [visible, setVisible] = useState(isZundoDebugVisible);
  
  // Registrar el callback para cambios externos
  setVisibilityCallback = (newVisible: boolean) => {
    isZundoDebugVisible = newVisible;
    setVisible(newVisible);
  };
  
  const toggleVisibility = () => {
    const newVisible = !isZundoDebugVisible;
    isZundoDebugVisible = newVisible;
    setVisible(newVisible);
    if (setVisibilityCallback) {
      setVisibilityCallback(newVisible);
    }
  };
  
  const setVisibility = (newVisible: boolean) => {
    isZundoDebugVisible = newVisible;
    setVisible(newVisible);
    if (setVisibilityCallback) {
      setVisibilityCallback(newVisible);
    }
  };
  
  return {
    visible,
    toggleVisibility,
    setVisibility
  };
};

/**
 * Función para toggle externo del panel
 */
export const toggleZundoDebugPanel = () => {
  const newVisible = !isZundoDebugVisible;
  isZundoDebugVisible = newVisible;
  if (setVisibilityCallback) {
    setVisibilityCallback(newVisible);
  }
};
