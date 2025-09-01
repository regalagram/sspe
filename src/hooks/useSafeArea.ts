import { useState, useEffect, useMemo, useRef } from 'react';
import { SafeAreaManager, SafeAreaInsets, SafeAreaConfig } from '../core/SafeAreaManager';

/**
 * React hook for iOS safe area management
 * 
 * Provides real-time safe area insets and utilities for iOS devices
 * with automatic updates on orientation changes and viewport changes.
 */
export const useSafeArea = (config?: Partial<SafeAreaConfig>) => {
  const [safeAreaInsets, setSafeAreaInsets] = useState<SafeAreaInsets>({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  });
  
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Use refs to prevent re-creating manager on every render
  const managerRef = useRef<SafeAreaManager | null>(null);
  const configRef = useRef<Partial<SafeAreaConfig> | undefined>(config);
  
  // Only create manager once or when config actually changes
  if (!managerRef.current || configRef.current !== config) {
    if (managerRef.current) {
      managerRef.current.dispose();
    }
    managerRef.current = new SafeAreaManager(config);
    configRef.current = config;
  }
  
  // Subscribe to safe area changes
  useEffect(() => {
    const manager = managerRef.current;
    if (!manager) return;
    
    const unsubscribe = manager.subscribe((insets) => {
      setSafeAreaInsets(insets);
      setIsInitialized(true);
    });
    
    return () => {
      unsubscribe();
    };
  }, []); // Empty dependency array since manager is stable
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (managerRef.current) {
        managerRef.current.dispose();
        managerRef.current = null;
      }
    };
  }, []);
  
  // Memoized computed values that depend on safeAreaInsets
  const computed = useMemo(() => {
    const manager = managerRef.current;
    if (!manager) {
      return {
        hasSafeAreas: false,
        hasNotch: false,
        hasHomeIndicator: false,
        safeViewportDimensions: { width: window.innerWidth, height: window.innerHeight },
        toolbarInsets: { top: 0, right: 0, bottom: 0, left: 0 },
        bottomSheetInsets: { top: 0, right: 0, bottom: 0, left: 0 },
        floatingActionsInsets: { top: 0, right: 0, bottom: 0, left: 0 },
        canvasInsets: { top: 0, right: 0, bottom: 0, left: 0 },
        generateCSS: () => '',
        generateCSSProperties: () => '',
      };
    }
    
    return {
      hasSafeAreas: manager.hasSafeAreas(),
      hasNotch: manager.hasNotch(),
      hasHomeIndicator: manager.hasHomeIndicator(),
      safeViewportDimensions: manager.getSafeViewportDimensions(),
      
      // Component-specific insets
      toolbarInsets: manager.getComponentInsets('toolbar'),
      bottomSheetInsets: manager.getComponentInsets('bottomSheet'),
      floatingActionsInsets: manager.getComponentInsets('floatingActions'),
      canvasInsets: manager.getComponentInsets('canvas'),
      
      // CSS generation utilities
      generateCSS: (component?: 'toolbar' | 'bottomSheet' | 'floatingActions' | 'canvas') => 
        manager.generateCSS(component),
      generateCSSProperties: () => manager.generateCSSProperties(),
    };
  }, [safeAreaInsets]); // Only depend on safeAreaInsets changes
  
  return {
    // Current safe area values
    safeAreaInsets,
    isInitialized,
    
    // Computed properties
    ...computed,
    
    // Utility functions
    updateConfig: (newConfig: Partial<SafeAreaConfig>) => {
      if (managerRef.current) {
        managerRef.current.updateConfig(newConfig);
      }
    },
    
    // CSS style objects for React components
    styles: {
      safeArea: {
        paddingTop: safeAreaInsets.top,
        paddingRight: safeAreaInsets.right,
        paddingBottom: safeAreaInsets.bottom,
        paddingLeft: safeAreaInsets.left,
      },
      
      toolbar: {
        paddingTop: computed.toolbarInsets.top,
        paddingRight: computed.toolbarInsets.right,
        paddingBottom: computed.toolbarInsets.bottom,
        paddingLeft: computed.toolbarInsets.left,
      },
      
      bottomSheet: {
        paddingTop: computed.bottomSheetInsets.top,
        paddingRight: computed.bottomSheetInsets.right,
        paddingBottom: computed.bottomSheetInsets.bottom,
        paddingLeft: computed.bottomSheetInsets.left,
      },
      
      floatingActions: {
        paddingTop: computed.floatingActionsInsets.top,
        paddingRight: computed.floatingActionsInsets.right,
        paddingBottom: computed.floatingActionsInsets.bottom,
        paddingLeft: computed.floatingActionsInsets.left,
      },
      
      canvas: {
        paddingTop: computed.canvasInsets.top,
        paddingRight: computed.canvasInsets.right,
        paddingBottom: computed.canvasInsets.bottom,
        paddingLeft: computed.canvasInsets.left,
      },
    }
  };
};

/**
 * Hook specifically for mobile detection with safe area awareness
 */
export const useMobileSafeArea = () => {
  const safeArea = useSafeArea({
    // Mobile-optimized configuration
    additionalBottom: 8, // Extra space for mobile interactions
    floatingActions: {
      right: 20,
      bottom: 20, // Clear home indicator with extra space
    },
    bottomSheet: {
      bottom: 16, // Comfortable space above home indicator
    }
  });
  
  // Memoize these values to prevent recalculation on every render
  const deviceInfo = useMemo(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isLandscape = window.innerWidth > window.innerHeight;
    
    return { isMobile, isIOS, isLandscape };
  }, []);
  
  return {
    ...safeArea,
    ...deviceInfo,
    
    // Mobile-specific utilities
    mobileStyles: {
      container: {
        ...safeArea.styles.safeArea,
        minHeight: '100dvh', // Dynamic viewport height for mobile
      },
      
      fullscreenModal: {
        top: safeArea.safeAreaInsets.top,
        right: safeArea.safeAreaInsets.right,
        bottom: safeArea.safeAreaInsets.bottom,
        left: safeArea.safeAreaInsets.left,
        position: 'fixed' as const,
        width: `calc(100vw - ${safeArea.safeAreaInsets.left + safeArea.safeAreaInsets.right}px)`,
        height: `calc(100vh - ${safeArea.safeAreaInsets.top + safeArea.safeAreaInsets.bottom}px)`,
      },
      
      mobileToolbar: {
        ...safeArea.styles.toolbar,
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
      },
      
      mobileBottomSheet: {
        ...safeArea.styles.bottomSheet,
        position: 'fixed' as const,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 999,
      }
    }
  };
};

/**
 * Utility type for safe area styles
 */
export type SafeAreaStyleObject = {
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  position?: string;
  width?: string;
  height?: string;
  minHeight?: string;
  zIndex?: number;
};

/**
 * CSS utilities for safe area integration
 */
export const safeAreaUtils = {
  /**
   * Generate CSS variables for safe area insets
   */
  generateCSSVariables: (insets: SafeAreaInsets): Record<string, string> => ({
    '--safe-area-inset-top': `${insets.top}px`,
    '--safe-area-inset-right': `${insets.right}px`,
    '--safe-area-inset-bottom': `${insets.bottom}px`,
    '--safe-area-inset-left': `${insets.left}px`,
  }),
  
  /**
   * Generate CSS class names for safe area components
   */
  generateClassNames: (hasNotch: boolean, hasHomeIndicator: boolean): string[] => {
    const classes = ['safe-area-aware'];
    if (hasNotch) classes.push('has-notch');
    if (hasHomeIndicator) classes.push('has-home-indicator');
    return classes;
  },
  
  /**
   * Apply safe area to element style
   */
  applyToElement: (element: HTMLElement, insets: SafeAreaInsets, component?: string): void => {
    element.style.paddingTop = `${insets.top}px`;
    element.style.paddingRight = `${insets.right}px`;
    element.style.paddingBottom = `${insets.bottom}px`;
    element.style.paddingLeft = `${insets.left}px`;
    
    if (component) {
      element.setAttribute('data-safe-area-component', component);
    }
  }
};
