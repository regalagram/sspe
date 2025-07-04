import React, { useEffect, useRef } from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { useTouchGestures } from '../../hooks/useTouchGestures';
import { useEditorStore } from '../../store/editorStore';

/**
 * Touch/Mobile Plugin
 * Handles all touch gestures and mobile-specific behaviors
 * Following the principle: "All functionality must be implemented as an independent plugin"
 */
export const TouchMobilePlugin: React.FC = () => {
  const { viewport, setZoom, setPan } = useEditorStore();
  const { isTouchDevice } = useMobileDetection();
  
  // Zoom accumulator for smooth zooming
  const zoomAccumulator = useRef<number>(0);
  const lastZoomTime = useRef<number>(0);
  
  // Touch gestures configuration
  const {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel,
    gestureType,
  } = useTouchGestures({
    onPan: (delta) => {
      if (gestureType === 'pan') {
        console.log('📱 TouchMobile: Pan gesture detected', { delta, gestureType });
        const newPan = {
          x: viewport.pan.x + delta.x,
          y: viewport.pan.y + delta.y,
        };
        setPan(newPan);
      }
    },
    onZoom: (scale, center) => {
      if (gestureType === 'zoom' || gestureType === 'pan-zoom') {
        console.log('📱 TouchMobile: Zoom gesture detected', { scale, center, gestureType });
        const currentZoom = viewport.zoom;
        const zoomDelta = scale - 1;
        
        // Smooth zoom system with accumulator and throttling
        const now = Date.now();
        const timeDelta = now - lastZoomTime.current;
        
        if (timeDelta > 16) { // ~60fps
          zoomAccumulator.current += zoomDelta * 0.01;
          
          if (Math.abs(zoomAccumulator.current) > 0.05) {
            const newZoom = Math.max(0.1, Math.min(10, currentZoom * (1 + zoomAccumulator.current)));
            setZoom(newZoom, { x: center.x, y: center.y });
            zoomAccumulator.current = 0;
          }
          
          lastZoomTime.current = now;
        }
      }
    },
    onGestureStart: () => {
      console.log('📱 TouchMobile: Gesture started');
    },
    onGestureEnd: () => {
      console.log('📱 TouchMobile: Gesture ended');
      zoomAccumulator.current = 0;
    },
    enablePan: true,
    enableZoom: true,
    enableRotate: false,
    minScale: 0.1,
    maxScale: 10,
  });

  // Inject mobile-specific styles
  useEffect(() => {
    if (!isTouchDevice) return;

    const style = document.createElement('style');
    style.id = 'mobile-touch-styles';
    style.textContent = `
      .svg-editor {
        touch-action: none !important;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        -webkit-touch-callout: none;
        -webkit-tap-highlight-color: transparent;
      }

      .svg-editor svg {
        touch-action: none !important;
      }

      /* Allow native touch for UI elements */
      .accordion-sidebar,
      .accordion-panel-content,
      .draggable-panel,
      input,
      textarea,
      select,
      button {
        touch-action: auto !important;
      }
    `;
    
    document.head.appendChild(style);

    // Prevent browser gestures
    const preventGestures = (e: Event) => e.preventDefault();
    document.addEventListener('gesturestart', preventGestures, { passive: false });
    document.addEventListener('gesturechange', preventGestures, { passive: false });
    document.addEventListener('gestureend', preventGestures, { passive: false });

    // Prevent default zoom behavior on double tap
    let lastTouchEnd = 0;
    const preventDoubleTapZoom = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    };
    document.addEventListener('touchend', preventDoubleTapZoom, { passive: false });

    return () => {
      const existingStyle = document.getElementById('mobile-touch-styles');
      if (existingStyle) {
        document.head.removeChild(existingStyle);
      }
      document.removeEventListener('gesturestart', preventGestures);
      document.removeEventListener('gesturechange', preventGestures);
      document.removeEventListener('gestureend', preventGestures);
      document.removeEventListener('touchend', preventDoubleTapZoom);
    };
  }, [isTouchDevice]);

  // Return touch event handlers to be used by the SVG element
  return null; // This plugin doesn't render anything, just provides functionality
};

// Touch event handlers for export
export const useTouchEventHandlers = () => {
  const { isTouchDevice } = useMobileDetection();
  const { viewport, setZoom, setPan } = useEditorStore();
  
  const zoomAccumulator = useRef<number>(0);
  const lastZoomTime = useRef<number>(0);
  
  const {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel,
    gestureType,
  } = useTouchGestures({
    onPan: (delta) => {
      if (gestureType === 'pan') {
        const newPan = {
          x: viewport.pan.x + delta.x,
          y: viewport.pan.y + delta.y,
        };
        setPan(newPan);
      }
    },
    onZoom: (scale, center) => {
      if (gestureType === 'zoom' || gestureType === 'pan-zoom') {
        const currentZoom = viewport.zoom;
        const zoomDelta = scale - 1;
        
        const now = Date.now();
        const timeDelta = now - lastZoomTime.current;
        
        if (timeDelta > 16) {
          zoomAccumulator.current += zoomDelta * 0.01;
          
          if (Math.abs(zoomAccumulator.current) > 0.05) {
            const newZoom = Math.max(0.1, Math.min(10, currentZoom * (1 + zoomAccumulator.current)));
            setZoom(newZoom, { x: center.x, y: center.y });
            zoomAccumulator.current = 0;
          }
          
          lastZoomTime.current = now;
        }
      }
    },
    onGestureEnd: () => {
      zoomAccumulator.current = 0;
    },
    enablePan: true,
    enableZoom: true,
    enableRotate: false,
    minScale: 0.1,
    maxScale: 10,
  });

  const handleTouchStart = (e: React.TouchEvent<SVGElement>) => {
    if (isTouchDevice && e.touches.length >= 2) {
      console.log('📱 TouchMobile: Multi-touch start', e.touches.length, 'touches');
      e.preventDefault();
      onTouchStart(e.nativeEvent as TouchEvent);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<SVGElement>) => {
    if (isTouchDevice && e.touches.length >= 2) {
      console.log('📱 TouchMobile: Multi-touch move', e.touches.length, 'touches');
      e.preventDefault();
      onTouchMove(e.nativeEvent as TouchEvent);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<SVGElement>) => {
    if (isTouchDevice) {
      console.log('📱 TouchMobile: Multi-touch end', e.touches.length, 'touches remaining');
      e.preventDefault();
      onTouchEnd(e.nativeEvent as TouchEvent);
    }
  };

  const handleTouchCancel = (e: React.TouchEvent<SVGElement>) => {
    if (isTouchDevice) {
      console.log('📱 TouchMobile: Multi-touch cancel');
      e.preventDefault();
      onTouchCancel(e.nativeEvent as TouchEvent);
    }
  };

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
  };
};

// Plugin definition following the architectural guidelines
export const TouchMobilePluginDefinition: Plugin = {
  id: 'touch-mobile',
  name: 'Touch & Mobile Support',
  version: '1.0.0',
  enabled: true,
  ui: [
    {
      id: 'touch-mobile-handler',
      component: TouchMobilePlugin,
      position: 'svg-content',
      order: -1, // Load early
    },
  ],
  initialize: (editor: any) => {
    console.log('🔌 TouchMobile plugin initialized');
  },
  destroy: () => {
    console.log('🔌 TouchMobile plugin destroyed');
  },
};
