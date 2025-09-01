import React, { useEffect } from 'react';
import { useSafeArea } from '../hooks/useSafeArea';
import { safeAreaUtils } from '../hooks/useSafeArea';

/**
 * Safe Area Provider Component
 * 
 * Automatically applies safe area styles to the document root
 * and provides safe area awareness throughout the application.
 */
interface SafeAreaProviderProps {
  children: React.ReactNode;
  enableAutoStyles?: boolean;
  debugMode?: boolean;
}

export const SafeAreaProvider: React.FC<SafeAreaProviderProps> = ({
  children,
  enableAutoStyles = true,
  debugMode = false
}) => {
  const safeArea = useSafeArea({
    // Default configuration for the editor
    additionalBottom: 8,
    toolbar: {
      top: 0,
      bottom: 8
    },
    bottomSheet: {
      bottom: 16
    },
    floatingActions: {
      right: 24,
      bottom: 24
    }
  });
  
  // Apply CSS variables to document root
  useEffect(() => {
    if (!enableAutoStyles) return;
    
    const root = document.documentElement;
    const variables = safeAreaUtils.generateCSSVariables(safeArea.safeAreaInsets);
    
    // Apply CSS variables
    Object.entries(variables).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
    
    // Apply safe area class names
    const classNames = safeAreaUtils.generateClassNames(
      safeArea.hasNotch,
      safeArea.hasHomeIndicator
    );
    
    classNames.forEach(className => {
      document.body.classList.add(className);
    });
    
    // Debug mode: add visual indicators
    if (debugMode) {
      root.style.setProperty('--debug-safe-area-top', `${safeArea.safeAreaInsets.top}px`);
      root.style.setProperty('--debug-safe-area-right', `${safeArea.safeAreaInsets.right}px`);
      root.style.setProperty('--debug-safe-area-bottom', `${safeArea.safeAreaInsets.bottom}px`);
      root.style.setProperty('--debug-safe-area-left', `${safeArea.safeAreaInsets.left}px`);
      document.body.classList.add('safe-area-debug');
    }
    
    // Cleanup function
    return () => {
      classNames.forEach(className => {
        document.body.classList.remove(className);
      });
      
      if (debugMode) {
        document.body.classList.remove('safe-area-debug');
      }
    };
  }, [safeArea.safeAreaInsets, safeArea.hasNotch, safeArea.hasHomeIndicator, enableAutoStyles, debugMode]);
  
  return <>{children}</>;
};

/**
 * Safe Area Boundary Component
 * 
 * Renders a container that respects safe areas for a specific component type.
 */
interface SafeAreaBoundaryProps {
  children: React.ReactNode;
  component?: 'toolbar' | 'bottomSheet' | 'floatingActions' | 'canvas';
  className?: string;
  style?: React.CSSProperties;
  as?: 'div' | 'section' | 'main' | 'header' | 'footer' | 'nav';
}

export const SafeAreaBoundary: React.FC<SafeAreaBoundaryProps> = ({
  children,
  component,
  className = '',
  style = {},
  as = 'div'
}) => {
  const safeArea = useSafeArea();
  
  const safeAreaStyles = component 
    ? safeArea.styles[component]
    : safeArea.styles.safeArea;
  
  const combinedStyles = {
    ...safeAreaStyles,
    ...style
  };
  
  const combinedClassName = [
    'safe-area-boundary',
    component && `safe-area-${component}`,
    className
  ].filter(Boolean).join(' ');
  
  const Element = as;
  
  return (
    <Element 
      className={combinedClassName}
      style={combinedStyles}
      data-safe-area-component={component}
    >
      {children}
    </Element>
  );
};

/**
 * Safe Area Hook for Manual Integration
 * 
 * Provides safe area values and utilities for components
 * that need manual safe area handling.
 */
export const SafeAreaInsets: React.FC<{
  children: (safeArea: ReturnType<typeof useSafeArea>) => React.ReactNode;
}> = ({ children }) => {
  const safeArea = useSafeArea();
  return <>{children(safeArea)}</>;
};

/**
 * Mobile Safe Area Container
 * 
 * Optimized container for mobile applications with safe area support.
 */
interface MobileSafeAreaContainerProps {
  children: React.ReactNode;
  className?: string;
  fullscreen?: boolean;
  hideInLandscape?: boolean;
}

export const MobileSafeAreaContainer: React.FC<MobileSafeAreaContainerProps> = ({
  children,
  className = '',
  fullscreen = false,
  hideInLandscape = false
}) => {
  const safeArea = useSafeArea();
  const isLandscape = window.innerWidth > window.innerHeight;
  
  const containerStyles: React.CSSProperties = {
    ...safeArea.styles.safeArea,
    minHeight: '100dvh', // Dynamic viewport height
    position: fullscreen ? 'fixed' : 'relative',
    top: fullscreen ? 0 : undefined,
    left: fullscreen ? 0 : undefined,
    right: fullscreen ? 0 : undefined,
    bottom: fullscreen ? 0 : undefined,
    zIndex: fullscreen ? 9999 : undefined,
    display: hideInLandscape && isLandscape ? 'none' : undefined
  };
  
  const combinedClassName = [
    'mobile-safe-area-container',
    fullscreen && 'mobile-fullscreen',
    safeArea.hasNotch && 'has-notch',
    safeArea.hasHomeIndicator && 'has-home-indicator',
    isLandscape && 'landscape',
    className
  ].filter(Boolean).join(' ');
  
  return (
    <div 
      className={combinedClassName}
      style={containerStyles}
      data-safe-area-insets={JSON.stringify(safeArea.safeAreaInsets)}
    >
      {children}
    </div>
  );
};

/**
 * Debug Component for Safe Areas
 * 
 * Renders visual overlays showing safe area boundaries.
 */
export const SafeAreaDebug: React.FC<{
  enabled?: boolean;
  opacity?: number;
}> = ({ enabled = true, opacity = 0.3 }) => {
  const safeArea = useSafeArea();
  
  if (!enabled || !safeArea.hasSafeAreas) {
    return null;
  }
  
  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 9999,
    opacity
  };
  
  const safeAreaStyle = (side: 'top' | 'right' | 'bottom' | 'left'): React.CSSProperties => {
    const insets = safeArea.safeAreaInsets;
    const base: React.CSSProperties = {
      position: 'absolute',
      backgroundColor: 'red',
      borderColor: 'darkred',
      borderStyle: 'solid'
    };
    
    switch (side) {
      case 'top':
        return {
          ...base,
          top: 0,
          left: 0,
          right: 0,
          height: insets.top,
          borderBottomWidth: 1
        };
      case 'right':
        return {
          ...base,
          top: 0,
          right: 0,
          bottom: 0,
          width: insets.right,
          borderLeftWidth: 1
        };
      case 'bottom':
        return {
          ...base,
          bottom: 0,
          left: 0,
          right: 0,
          height: insets.bottom,
          borderTopWidth: 1
        };
      case 'left':
        return {
          ...base,
          top: 0,
          left: 0,
          bottom: 0,
          width: insets.left,
          borderRightWidth: 1
        };
      default:
        return base;
    }
  };
  
  return (
    <div style={overlayStyle}>
      {safeArea.safeAreaInsets.top > 0 && <div style={safeAreaStyle('top')} />}
      {safeArea.safeAreaInsets.right > 0 && <div style={safeAreaStyle('right')} />}
      {safeArea.safeAreaInsets.bottom > 0 && <div style={safeAreaStyle('bottom')} />}
      {safeArea.safeAreaInsets.left > 0 && <div style={safeAreaStyle('left')} />}
    </div>
  );
};
