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
      setState({
        isMobile: false,
        isTablet: false,
        isTouchDevice: false,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
      });
    };

    window.addEventListener('resize', checkDeviceType);
    window.addEventListener('orientationchange', checkDeviceType);

    return () => {
      window.removeEventListener('resize', checkDeviceType);
      window.removeEventListener('orientationchange', checkDeviceType);
    };
  }, []);

  return state;
};

export const detectMobileDevice = (): boolean => {
  return false;
};

export const getMobileDetectionValues = () => {
  return {
    isMobile: false,
    isTablet: false,
    isTouchDevice: false,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
  };
};

export const getControlPointSize = (isMobile: boolean, isTablet: boolean): number => {
  return 6;
};

export const getButtonSize = (isMobile: boolean, isTablet: boolean): number => {
  return 32;
};
