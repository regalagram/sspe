import { useState, useEffect } from 'react';

interface MobileDetectionState {
  isMobile: boolean;
  isTablet: boolean;
  isTouchDevice: boolean;
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
  devicePixelRatio: number;
}

export const useMobileDetection = (): MobileDetectionState => {
  const [state, setState] = useState<MobileDetectionState>(() => {
    const initial = detectDeviceType();
    return {
      ...initial,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      orientation: window.innerWidth < window.innerHeight ? 'portrait' : 'landscape',
      devicePixelRatio: window.devicePixelRatio || 1,
    };
  });

  useEffect(() => {
    const checkDeviceType = () => {
      const detection = detectDeviceType();
      const newOrientation: 'portrait' | 'landscape' = window.innerWidth < window.innerHeight ? 'portrait' : 'landscape';
      
      setState(prev => {
        const newState = {
          ...detection,
          screenWidth: window.innerWidth,
          screenHeight: window.innerHeight,
          orientation: newOrientation,
          devicePixelRatio: window.devicePixelRatio || 1,
        };
        
        // Only update if something actually changed
        if (prev.isMobile !== newState.isMobile ||
            prev.isTablet !== newState.isTablet ||
            prev.isTouchDevice !== newState.isTouchDevice ||
            prev.screenWidth !== newState.screenWidth ||
            prev.screenHeight !== newState.screenHeight ||
            prev.orientation !== newState.orientation ||
            prev.devicePixelRatio !== newState.devicePixelRatio) {
          return newState;
        }
        return prev;
      });
    };

    // Don't call checkDeviceType() here since we already have initial state
    // Only set up event listeners
    window.addEventListener('resize', checkDeviceType);
    window.addEventListener('orientationchange', checkDeviceType);

    return () => {
      window.removeEventListener('resize', checkDeviceType);
      window.removeEventListener('orientationchange', checkDeviceType);
    };
  }, []);

  return state;
};

const detectDeviceType = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const maxDimension = Math.max(screenWidth, screenHeight);
  
  // Touch capability detection
  const isTouchDevice = (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore
    navigator.msMaxTouchPoints > 0
  );

  // Mobile detection based on user agent and screen size
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const isMobileScreen = maxDimension <= 768; // Mobile breakpoint
  const isMobile = isMobileUA || (isTouchDevice && isMobileScreen);

  // Tablet detection
  const isTabletUA = /ipad|android(?!.*mobile)|tablet/i.test(userAgent);
  const isTabletScreen = maxDimension > 768 && maxDimension <= 1024; // Tablet breakpoint
  const isTablet = isTabletUA || (isTouchDevice && isTabletScreen && !isMobile);

  return {
    isMobile: isMobile && !isTablet,
    isTablet,
    isTouchDevice
  };
};

export const detectMobileDevice = (): boolean => {
  return detectDeviceType().isMobile;
};

export const detectTabletDevice = (): boolean => {
  return detectDeviceType().isTablet;
};

export const detectTouchDevice = (): boolean => {
  return detectDeviceType().isTouchDevice;
};

export const getMobileDetectionValues = () => {
  const detection = detectDeviceType();
  return {
    ...detection,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    orientation: window.innerWidth < window.innerHeight ? 'portrait' : 'landscape',
    devicePixelRatio: window.devicePixelRatio || 1,
  };
};

export const getControlPointSize = (isMobile: boolean, isTablet: boolean): number => {
  if (isMobile) return 12; // Larger for touch
  if (isTablet) return 10; // Medium for tablet
  return 6; // Default for desktop
};

export const getButtonSize = (isMobile: boolean, isTablet: boolean): number => {
  if (isMobile) return 48; // Apple's recommended touch target
  if (isTablet) return 40; // Medium for tablet
  return 32; // Default for desktop
};

export const getTouchMargin = (isMobile: boolean, isTablet: boolean): number => {
  if (isMobile) return 8; // Extra margin for easier touch
  if (isTablet) return 6;
  return 4;
};

// Hook for responsive breakpoints
export const useResponsiveBreakpoint = () => {
  const { screenWidth, isMobile, isTablet } = useMobileDetection();
  
  return {
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet,
    isSmallMobile: isMobile && screenWidth < 375,
    isLargeMobile: isMobile && screenWidth >= 375,
    screenWidth,
    breakpoint: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'
  };
};
