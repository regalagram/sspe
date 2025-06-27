import { useState, useEffect } from 'react';

interface WindowSize {
  width: number;
  height: number;
}

export const useWindowSize = (): WindowSize => {
  const [windowSize, setWindowSize] = useState<WindowSize>({
    width: 1200, // valor por defecto
    height: 800, // valor por defecto
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Establecer el tamaño inicial
    handleResize();

    // Agregar event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
};

// Función utilitaria para calcular posiciones alineadas a la derecha
export const getRightAlignedPosition = (index: number, windowWidth: number = 1200) => {
  const panelWidth = 200;
  const margin = 20;
  const headerHeight = 40; // altura aproximada del header colapsado
  
  return {
    x: windowWidth - panelWidth - margin,
    y: margin + (index * headerHeight)
  };
};
