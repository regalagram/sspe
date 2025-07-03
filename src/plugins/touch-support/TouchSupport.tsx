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
      if (gestureType === 'pan') {
        // Aplicar pan usando la función setPan del store
        const newPan = {
          x: viewport.pan.x - delta.x,
          y: viewport.pan.y - delta.y,
        };
        setPan(newPan);
      }
    },
    onZoom: (scale, center) => {
      if (gestureType === 'zoom' || gestureType === 'pan-zoom') {
        // Calcular nuevo zoom
        const currentZoom = viewport.zoom;
        const newZoom = Math.max(0.1, Math.min(10, currentZoom * scale));
        
        // Usar la función setZoom del store que ya maneja el centrado
        setZoom(newZoom, { x: center.x, y: center.y });
      }
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
        onTouchStart(touchEvent);
      }
    };

    const handleMultiTouchMove = (e: Event) => {
      const touchEvent = e as TouchEvent;
      // Solo procesar si hay múltiples dedos
      if (touchEvent.touches.length >= 2) {
        onTouchMove(touchEvent);
      }
    };

    const handleMultiTouchEnd = (e: Event) => {
      const touchEvent = e as TouchEvent;
      // Siempre procesar touchend para limpiar estado de gestos
      onTouchEnd(touchEvent);
    };

    const handleMultiTouchCancel = (e: Event) => {
      const touchEvent = e as TouchEvent;
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

      /* Mejorar respuesta táctil */
      .svg-editor-container * {
        touch-action: none;
      }

      /* Hacer que los elementos interactivos sean más grandes en móviles */
      ${isMobile ? `
        .command-point {
          r: 6px !important;
        }
        
        .control-point {
          r: 5px !important;
        }
        
        .transform-handle {
          width: 20px !important;
          height: 20px !important;
        }
      ` : ''}

      ${isTablet ? `
        .command-point {
          r: 5px !important;
        }
        
        .control-point {
          r: 4px !important;
        }
        
        .transform-handle {
          width: 16px !important;
          height: 16px !important;
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
