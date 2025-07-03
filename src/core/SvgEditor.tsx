import React, { useEffect, useRef } from 'react';
import { enableGlobalTouchToMouse } from '../utils/touch-to-mouse-global';
import { useEditorStore } from '../store/editorStore';
import { pluginManager } from './PluginSystem';
import { getSafeTransform } from '../utils/transform-utils';
import { usePanelModeStore } from '../plugins/panelmode/PanelManager';
import { initializePlugins } from './PluginInitializer';
import { useCombinedCursor } from '../hooks/useCombinedCursor';
import { useGlobalKeyboard } from '../hooks/useGlobalKeyboard';
import { useGlobalMouseEvents } from '../hooks/useGlobalMouseEvents';
import { useEditorStyles } from '../hooks/useEditorStyles';
import { PluginUIRenderer } from '../components/PluginUIRenderer';
import { AccordionToggleButton } from '../components/AccordionToggleButton';
import { useTouchGestures } from '../hooks/useTouchGestures';
import { useMobileDetection } from '../hooks/useMobileDetection';

// Register plugins immediately during module loading
enableGlobalTouchToMouse(); // Sistema global simple: touch→mouse

// Initialize plugins during module load
initializePlugins();

export const SvgEditor: React.FC = () => {
  const editorStore = useEditorStore();
  const { isFullscreen, viewport, setZoom, setPan } = editorStore;
  const svgRef = useRef<SVGSVGElement>(null);
  const { isTouchDevice } = useMobileDetection();
  
  // Para suavizar el zoom, usamos un acumulador
  const zoomAccumulator = useRef<number>(0);
  const lastZoomTime = useRef<number>(0);
  
  // Get panel mode from store
  const { mode: panelMode, accordionVisible, toggleAccordionVisible } = usePanelModeStore();
  
  // Use custom hooks for cleaner separation of concerns
  const { getCursor } = useCombinedCursor();
  const { editorStyle, svgStyle } = useEditorStyles({ isFullscreen, panelMode, accordionVisible });
  
  // Initialize global event handlers
  useGlobalKeyboard();
  useGlobalMouseEvents();

  // Touch gestures for mobile devices
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
        console.log('📱 SvgEditor: Pan gesture detected', { delta, gestureType });
        // Invertir la dirección del pan para que sea más natural
        const newPan = {
          x: viewport.pan.x + delta.x, // Cambiado de - a +
          y: viewport.pan.y + delta.y, // Cambiado de - a +
        };
        setPan(newPan);
      }
    },
    onZoom: (scale, center) => {
      if (gestureType === 'zoom' || gestureType === 'pan-zoom') {
        console.log('📱 SvgEditor: Zoom gesture detected', { scale, center, gestureType });
        const currentZoom = viewport.zoom;
        const zoomDelta = scale - 1;
        
        // Sistema de suavizado con acumulador y throttling
        const now = Date.now();
        const timeDelta = now - lastZoomTime.current;
        
        // Solo aplicar zoom si ha pasado suficiente tiempo (throttling)
        if (timeDelta > 16) { // ~60fps
          // Acumular cambios pequeños
          zoomAccumulator.current += zoomDelta * 0.01; // Muy pequeño factor
          
          // Solo aplicar si el acumulador supera un threshold
          if (Math.abs(zoomAccumulator.current) > 0.05) {
            const newZoom = Math.max(0.1, Math.min(10, currentZoom * (1 + zoomAccumulator.current)));
            setZoom(newZoom, { x: center.x, y: center.y });
            zoomAccumulator.current = 0; // Reset acumulador
          }
          
          lastZoomTime.current = now;
        }
      }
    },
    onGestureStart: () => {
      console.log('📱 SvgEditor: Gesture started');
    },
    onGestureEnd: () => {
      console.log('📱 SvgEditor: Gesture ended');
      // Reset zoom accumulator cuando termine el gesto
      zoomAccumulator.current = 0;
    },
    enablePan: true,
    enableZoom: true,
    enableRotate: false,
    minScale: 0.1,
    maxScale: 10,
  });

  // Initialize plugins with editor store and SVG ref
  useEffect(() => {
    // Set up editor store and SVG ref for plugin manager
    pluginManager.setEditorStore(editorStore);
    pluginManager.setSVGRef(svgRef);
    
    // Initialize plugins with editor store (plugins are already registered)
    pluginManager.getEnabledPlugins().forEach(plugin => {
      plugin.initialize?.(editorStore);
    });
  }, [editorStore]);

  // Add mobile-specific styles
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

  // Handle mouse events through plugin system (React events)
  const handleMouseDown = (e: React.MouseEvent<SVGElement>) => {
    console.log('📱 SvgEditor: handleMouseDown called');
    const target = e.target as SVGElement;
    const commandId = target.getAttribute('data-command-id') || undefined;
    const controlPoint = target.getAttribute('data-control-point') as 'x1y1' | 'x2y2' | undefined;
    pluginManager.handleMouseEvent('mouseDown', e, commandId, controlPoint);
  };
  
  const handleMouseMove = (e: React.MouseEvent<SVGElement>) => {
    console.log('📱 SvgEditor: handleMouseMove called');
    pluginManager.handleMouseEvent('mouseMove', e);
  };
  
  const handleMouseUp = (e: React.MouseEvent<SVGElement>) => {
    console.log('📱 SvgEditor: handleMouseUp called');
    pluginManager.handleMouseEvent('mouseUp', e);
  };
  
  const handleWheel = (e: React.WheelEvent<SVGElement>) => {
    pluginManager.handleMouseEvent('wheel', e);
  };

  // Touch event handlers for multi-touch gestures
  const handleTouchStart = (e: React.TouchEvent<SVGElement>) => {
    if (isTouchDevice && e.touches.length >= 2) {
      console.log('📱 SvgEditor: Multi-touch start', e.touches.length, 'touches');
      e.preventDefault();
      onTouchStart(e.nativeEvent as TouchEvent);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<SVGElement>) => {
    if (isTouchDevice && e.touches.length >= 2) {
      console.log('📱 SvgEditor: Multi-touch move', e.touches.length, 'touches');
      e.preventDefault();
      onTouchMove(e.nativeEvent as TouchEvent);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<SVGElement>) => {
    if (isTouchDevice) {
      console.log('📱 SvgEditor: Multi-touch end', e.touches.length, 'touches remaining');
      e.preventDefault();
      onTouchEnd(e.nativeEvent as TouchEvent);
    }
  };

  const handleTouchCancel = (e: React.TouchEvent<SVGElement>) => {
    if (isTouchDevice) {
      console.log('📱 SvgEditor: Multi-touch cancel');
      e.preventDefault();
      onTouchCancel(e.nativeEvent as TouchEvent);
    }
  };

  return (
    <div className="svg-editor" style={editorStyle}>
      {/* Render toolbar plugins */}
      <PluginUIRenderer position="toolbar" />
      
      {/* Main SVG canvas */}
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{ 
          cursor: getCursor(),
          ...svgStyle
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
      >
        <g transform={getSafeTransform(editorStore.viewport)}>
          {/* Render SVG content through plugins */}
          <PluginUIRenderer position="svg-content" />
        </g>
      </svg>
      
      {/* Render sidebar plugins */}
      <PluginUIRenderer position="sidebar" />

      {/* Accordion toggle button - only show in accordion mode */}
      {panelMode === 'accordion' && (
        <AccordionToggleButton
          accordionVisible={accordionVisible}
          toggleAccordionVisible={toggleAccordionVisible}
          isFullscreen={isFullscreen}
        />
      )}
    </div>
  );
};
