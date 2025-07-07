import { useState, useEffect } from 'react';

interface MobileDetectionState {
  isMobile: boolean;
  isTablet: boolean;
  isTouchDevice: boolean;
  screenWidth: number;
  screenHeight: number;
}

/**
 * Hook simplificado para detección de dispositivos móviles
 * Siempre retorna false para móviles y tablets (sin soporte touch)
 */
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
      setState({
        isMobile: false,
        isTablet: false,
        isTouchDevice: false,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
      });
    };

    // Escuchar cambios de tamaño
    window.addEventListener('resize', checkDeviceType);
    window.addEventListener('orientationchange', checkDeviceType);

    return () => {
      window.removeEventListener('resize', checkDeviceType);
      window.removeEventListener('orientationchange', checkDeviceType);
    };
  }, []);

  return state;
};

// Función utilitaria para detectar dispositivos móviles (sin React)
// Siempre retorna false ya que no hay soporte móvil
export const detectMobileDevice = (): boolean => {
  return false;
};

// Función utilitaria para obtener valores de dispositivo móvil (sin React)
// Siempre retorna valores de desktop ya que no hay soporte móvil
export const getMobileDetectionValues = () => {
  return {
    isMobile: false,
    isTablet: false,
    isTouchDevice: false,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
  };
};

// Funciones utilitarias para compatibilidad con código existente
export const getControlPointSize = (isMobile: boolean, isTablet: boolean): number => {
  // Siempre retorna tamaño desktop ya que no hay soporte móvil
  return 6;
};

export const getButtonSize = (isMobile: boolean, isTablet: boolean): number => {
  // Siempre retorna tamaño desktop ya que no hay soporte móvil
  return 32;
};
