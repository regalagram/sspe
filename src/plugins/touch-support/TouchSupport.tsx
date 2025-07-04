import React, { useEffect, useRef } from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { useTouchGestures, useTouchToMouseMapping } from '../../hooks/useTouchGestures';
import { useMobileDetection } from '../../hooks/useMobileDetection';

interface TouchSupportProps {
  svgRef?: React.RefObject<SVGSVGElement>;
}

const TouchSupport: React.FC<TouchSupportProps> = ({ svgRef }) => {
  const { isMobile, isTablet, isTouchDevice } = useMobileDetection();
  const { viewport, setZoom, pan, setPan } = useEditorStore();
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Hook para gestos táctiles avanzados (solo multi-touch)
  const {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel,
    gestureType,
    isGesturing,
  } = useTouchGestures({
    onPan: (delta) => {
      // Handle both single-finger and two-finger pan
      if (gestureType === 'pan') {
        console.log('📱 TouchSupport: Pan gesture detected', { delta, gestureType });
        // Apply pan using the setPan function from store
        const newPan = {
          x: viewport.pan.x - delta.x,
          y: viewport.pan.y - delta.y,
        };
        setPan(newPan);
      }
    },
    onZoom: (scale, center) => {
      if (gestureType === 'zoom' || gestureType === 'pan-zoom') {
        console.log('📱 TouchSupport: Zoom gesture detected', { scale, center, gestureType });
        // Calculate new zoom level using the scale factor
        const currentZoom = viewport.zoom;
        const zoomDelta = scale - 1; // Convert to delta from 1
        const newZoom = Math.max(0.1, Math.min(10, currentZoom * (1 + zoomDelta * 0.5))); // Dampen zoom speed
        
        // Use the setZoom function from store that handles centering
        setZoom(newZoom, { x: center.x, y: center.y });
      }
    },
    onGestureStart: () => {
      console.log('📱 TouchSupport: Gesture started');
    },
    onGestureEnd: () => {
      console.log('📱 TouchSupport: Gesture ended');
    },
    enablePan: true,
    enableZoom: true,
    enableRotate: false,
    minScale: 0.1,
    maxScale: 10,
  });

  useEffect(() => {
    if (!isTouchDevice) return;

    const container = containerRef.current;
    const svgElement = svgRef?.current;
    
    if (!container && !svgElement) return;

    const targetElement = svgElement || container;
    if (!targetElement) return;

    // Solo manejar gestos multi-touch aquí (el soporte global maneja single-touch)
    const handleMultiTouchStart = (e: Event) => {
      const touchEvent = e as TouchEvent;
      // Solo procesar si hay múltiples dedos
      if (touchEvent.touches.length >= 2) {
        console.log('📱 TouchSupport: Multi-touch start', touchEvent.touches.length, 'touches');
        // Prevent default to avoid browser zoom/pan gestures
        e.preventDefault();
        onTouchStart(touchEvent);
      }
    };

    const handleMultiTouchMove = (e: Event) => {
      const touchEvent = e as TouchEvent;
      // Solo procesar si hay múltiples dedos
      if (touchEvent.touches.length >= 2) {
        console.log('📱 TouchSupport: Multi-touch move', touchEvent.touches.length, 'touches');
        // Prevent default to avoid browser zoom/pan gestures
        e.preventDefault();
        onTouchMove(touchEvent);
      }
    };

    const handleMultiTouchEnd = (e: Event) => {
      const touchEvent = e as TouchEvent;
      console.log('📱 TouchSupport: Multi-touch end', touchEvent.touches.length, 'touches remaining');
      // Prevent default to avoid browser gestures
      e.preventDefault();
      // Siempre procesar touchend para limpiar estado de gestos
      onTouchEnd(touchEvent);
    };

    const handleMultiTouchCancel = (e: Event) => {
      const touchEvent = e as TouchEvent;
      console.log('📱 TouchSupport: Multi-touch cancel');
      e.preventDefault();
      onTouchCancel(touchEvent);
    };

    // Agregar event listeners solo para gestos multi-touch
    targetElement.addEventListener('touchstart', handleMultiTouchStart, { passive: false });
    targetElement.addEventListener('touchmove', handleMultiTouchMove, { passive: false });
    targetElement.addEventListener('touchend', handleMultiTouchEnd, { passive: false });
    targetElement.addEventListener('touchcancel', handleMultiTouchCancel, { passive: false });

    return () => {
      targetElement.removeEventListener('touchstart', handleMultiTouchStart);
      targetElement.removeEventListener('touchmove', handleMultiTouchMove);
      targetElement.removeEventListener('touchend', handleMultiTouchEnd);
      targetElement.removeEventListener('touchcancel', handleMultiTouchCancel);
    };
  }, [
    isTouchDevice,
    svgRef,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel,
  ]);

  // Añadir estilos CSS específicos para móviles
  useEffect(() => {
    if (!isTouchDevice) return;

    const style = document.createElement('style');
    style.textContent = `
      /* Prevenir selección de texto en móviles */
      .svg-editor-container {
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        -webkit-touch-callout: none;
        -webkit-tap-highlight-color: transparent;
      }

      /* Control total de gestos táctiles en el SVG */
      .svg-editor svg {
        touch-action: none !important;
      }

      /* Permitir gestos nativos solo en elementos específicos */
      .accordion-sidebar,
      .accordion-panel-content,
      .draggable-panel,
      input,
      textarea,
      select,
      button {
        touch-action: auto !important;
      }

      /* Hacer que los elementos interactivos sean más grandes en móviles */
      ${isMobile ? `
        .command-point {
          r: 8px !important;
        }
        
        .control-point {
          r: 7px !important;
        }
        
        .transform-handle {
          width: 32px !important;
          height: 32px !important;
        }
      ` : ''}

      ${isTablet ? `
        .command-point {
          r: 6px !important;
        }
        
        .control-point {
          r: 5px !important;
        }
        
        .transform-handle {
          width: 24px !important;
          height: 24px !important;
        }
      ` : ''}
    `;
    
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, [isTouchDevice, isMobile, isTablet]);

  if (!isTouchDevice) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="touch-support-overlay"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none', // No interferir con otros elementos
        zIndex: 1000,
      }}
    />
  );
};

export const TouchSupportPlugin: Plugin = {
  id: 'touch-support',
  name: 'Touch Support',
  version: '1.0.0',
  enabled: true,
  
  initialize: (editor) => {
    // Configuración inicial si es necesaria
  },

  ui: [
    {
      id: 'touch-support-overlay',
      component: TouchSupport,
      position: 'svg-content',
      order: 1000, // Renderizar encima de otros elementos
    }
  ]
};
