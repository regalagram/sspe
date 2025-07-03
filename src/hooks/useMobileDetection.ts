import { useState, useEffect } from 'react';

interface MobileDetectionState {
  isMobile: boolean;
  isTablet: boolean;
  isTouchDevice: boolean;
  screenWidth: number;
  screenHeight: number;
}

export const useMobileDetection = (): MobileDetectionState => {
  const [state, setState] = useState<MobileDetectionState>({
    isMobile: false,
    isTablet: false,
    isTouchDevice: false,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
  });

  useEffect(() => {
    const checkDeviceType = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Breakpoints comunes para dispositivos móviles y tablets
      const isMobile = width <= 768 && isTouchDevice;
      const isTablet = width > 768 && width <= 1024 && isTouchDevice;

      setState({
        isMobile,
        isTablet,
        isTouchDevice,
        screenWidth: width,
        screenHeight: height,
      });
    };

    // Verificar al cargar
    checkDeviceType();

    // Verificar en cambios de tamaño
    window.addEventListener('resize', checkDeviceType);
    window.addEventListener('orientationchange', checkDeviceType);

    return () => {
      window.removeEventListener('resize', checkDeviceType);
      window.removeEventListener('orientationchange', checkDeviceType);
    };
  }, []);

  return state;
};

// Función utilitaria para obtener el tamaño de los puntos de control en móviles
export const getControlPointSize = (isMobile: boolean, isTablet: boolean): number => {
  if (isMobile) return 10; // Puntos más grandes en móviles (reducido 50%)
  if (isTablet) return 8; // Tamaño intermedio en tablets (reducido 50%)
  return 6; // Tamaño normal en desktop (reducido 50%)
};

// Función utilitaria para obtener el tamaño de los botones en móviles
export const getButtonSize = (isMobile: boolean, isTablet: boolean): number => {
  if (isMobile) return 48; // Mínimo recomendado para touch targets
  if (isTablet) return 40; // Tamaño intermedio
  return 32; // Tamaño normal en desktop
};
