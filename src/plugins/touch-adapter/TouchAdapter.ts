import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';

interface TouchState {
  activeTouches: Map<number, Touch>;
  lastTouchTime: number;
  isPinching: boolean;
  initialPinchDistance: number;
  initialZoom: number;
  isPanning: boolean;
  panStartPoint: { x: number; y: number } | null;
  initialPan: { x: number; y: number } | null;
  lastCenter: { x: number; y: number } | null;
}

const touchState: TouchState = {
  activeTouches: new Map(),
  lastTouchTime: 0,
  isPinching: false,
  initialPinchDistance: 0,
  initialZoom: 1,
  isPanning: false,
  panStartPoint: null,
  initialPan: null,
  lastCenter: null
};

// Track if we have active synthetic mouse events
let syntheticMouseActive = false;

export const TouchAdapterPlugin: Plugin = {
  id: 'touch-adapter',
  name: 'Touch Support',
  version: '1.0.0',
  enabled: true,
  
  initialize: (editor) => {
    const svgElement = document.querySelector('svg');
    if (!svgElement) return;
    
    // Prevenir comportamiento por defecto en móviles
    svgElement.style.touchAction = 'none';
    
    // Event listeners - captura en fase de captura para interceptar antes
    document.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: false, capture: true });
    document.addEventListener('touchcancel', handleTouchCancel, { passive: false, capture: true });
  },
  
  destroy: () => {
    document.removeEventListener('touchstart', handleTouchStart, { capture: true });
    document.removeEventListener('touchmove', handleTouchMove, { capture: true });
    document.removeEventListener('touchend', handleTouchEnd, { capture: true });
    document.removeEventListener('touchcancel', handleTouchCancel, { capture: true });
  }
};

// Convierte coordenadas de touch a coordenadas del SVG
function getTouchPoint(touch: Touch, svgElement: SVGSVGElement): DOMPoint {
  const pt = svgElement.createSVGPoint();
  pt.x = touch.clientX;
  pt.y = touch.clientY;
  return pt.matrixTransform(svgElement.getScreenCTM()?.inverse());
}

function handleTouchStart(e: TouchEvent) {
  // Solo procesar si el target está dentro de un SVG
  const svgElement = (e.target as Element).closest('svg');
  if (!svgElement) return;
  
  e.preventDefault();
  e.stopPropagation();

  // Detectar double tap para zoom
  const currentTime = Date.now();
  if (currentTime - touchState.lastTouchTime < 300 && e.touches.length === 1) {
    handleDoubleTap(e.touches[0], svgElement as SVGSVGElement);
    return;
  }
  touchState.lastTouchTime = currentTime;

  if (e.touches.length === 2) {
    // Iniciar gesto con dos dedos
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    const centerX = (touch1.clientX + touch2.clientX) / 2;
    const centerY = (touch1.clientY + touch2.clientY) / 2;
    
    // Guardar estado inicial
    touchState.panStartPoint = { x: centerX, y: centerY };
    touchState.lastCenter = { x: centerX, y: centerY };
    touchState.initialPan = { ...useEditorStore.getState().viewport.pan };
    touchState.initialPinchDistance = Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY
    );
    touchState.initialZoom = useEditorStore.getState().viewport.zoom;
    touchState.isPanning = true;
    touchState.isPinching = false;
    return;
  }

  // Single touch - convertir a mousedown
  if (e.touches.length === 1) {
    const touch = e.touches[0];
    touchState.activeTouches.set(touch.identifier, touch);
    syntheticMouseActive = true;
    
    // Crear y despachar evento mousedown sintético
    const mouseEvent = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      view: window,
      detail: 1,
      screenX: touch.screenX,
      screenY: touch.screenY,
      clientX: touch.clientX,
      clientY: touch.clientY,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      metaKey: false,
      button: 0,
      buttons: 1,
      relatedTarget: null
    });
    
    // Despachar en el target original
    if (e.target) {
      e.target.dispatchEvent(mouseEvent);
    }
  }
}

function handleTouchMove(e: TouchEvent) {
  // Solo procesar si el target está dentro de un SVG
  const svgElement = (e.target as Element).closest('svg');
  if (!svgElement) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  const store = useEditorStore.getState();

  if (e.touches.length === 2 && touchState.initialPan && touchState.lastCenter) {
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    const currentCenterX = (touch1.clientX + touch2.clientX) / 2;
    const currentCenterY = (touch1.clientY + touch2.clientY) / 2;
    const currentDistance = Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY
    );

    // Detectar si es pinch basándose en el cambio de distancia
    const distanceChange = Math.abs(currentDistance - touchState.initialPinchDistance);
    const centerMovement = Math.hypot(
      currentCenterX - touchState.panStartPoint!.x,
      currentCenterY - touchState.panStartPoint!.y
    );

    // LOG: movimiento del centro y cambio de distancia
    console.log('[TouchMove] centerMovement:', centerMovement, 'distanceChange:', distanceChange, 'dx:', currentCenterX - touchState.lastCenter.x, 'dy:', currentCenterY - touchState.lastCenter.y);

    // Si la distancia entre dedos cambia más que el movimiento del centro, es pinch
    if (distanceChange > 20 && distanceChange > centerMovement * 0.5) {
      touchState.isPinching = true;
    }

    if (touchState.isPinching) {
      // Pinch-to-zoom
      const scale = currentDistance / touchState.initialPinchDistance;
      const newZoom = Math.max(0.1, Math.min(10, touchState.initialZoom * scale));

      // Zoom centrado en el punto medio entre los dedos
      const rect = svgElement.getBoundingClientRect();
      const zoomPoint = {
        x: currentCenterX - rect.left,
        y: currentCenterY - rect.top
      };

      // Calcular nuevo pan para mantener el punto de zoom fijo
      const scaleDiff = newZoom / store.viewport.zoom;
      const newPan = {
        x: zoomPoint.x - (zoomPoint.x - store.viewport.pan.x) * scaleDiff,
        y: zoomPoint.y - (zoomPoint.y - store.viewport.pan.y) * scaleDiff
      };

      store.setZoom(newZoom);
      store.setPan(newPan);
    } else if (touchState.isPanning) {
      // Pan - usar el movimiento incremental desde el último frame
      const dx = currentCenterX - touchState.lastCenter.x;
      const dy = currentCenterY - touchState.lastCenter.y;

      // LOG: movimiento incremental
      console.log('[TouchMove] Pan dx:', dx, 'dy:', dy);

      // Aplicar el desplazamiento
      store.setPan({
        x: store.viewport.pan.x + dx,
        y: store.viewport.pan.y + dy
      });

      // Actualizar última posición
      touchState.lastCenter = { x: currentCenterX, y: currentCenterY };
    }
    return;
  }

  // Single touch - convertir a mousemove
  if (e.touches.length === 1 && syntheticMouseActive) {
    const touch = e.touches[0];
    touchState.activeTouches.set(touch.identifier, touch);

    // LOG: touchmove single
    console.log('[TOUCH-DEBUG] Single touchmove', {
      clientX: touch.clientX,
      clientY: touch.clientY,
      screenX: touch.screenX,
      screenY: touch.screenY,
      identifier: touch.identifier
    });

    // Crear evento mousemove sintético
    const mouseEvent = new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      view: window,
      detail: 1,
      screenX: touch.screenX,
      screenY: touch.screenY,
      clientX: touch.clientX,
      clientY: touch.clientY,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      metaKey: false,
      button: 0,
      buttons: 1,
      relatedTarget: null
    });

    // Despachar en el documento para que sea capturado por listeners globales
    document.dispatchEvent(mouseEvent);
  }
}

function handleTouchEnd(e: TouchEvent) {
  // Solo procesar si el target está dentro de un SVG
  const svgElement = (e.target as Element).closest('svg');
  if (!svgElement) return;
  
  e.preventDefault();
  e.stopPropagation();

  // Terminar pinch y pan
  if (e.touches.length < 2) {
    touchState.isPinching = false;
    touchState.isPanning = false;
    touchState.panStartPoint = null;
    touchState.initialPan = null;
    touchState.lastCenter = null;
  }

  // Procesar cada touch que terminó
  for (let i = 0; i < e.changedTouches.length; i++) {
    const touch = e.changedTouches[i];
    const lastTouch = touchState.activeTouches.get(touch.identifier);
    
    if (lastTouch && syntheticMouseActive) {
      // Crear evento mouseup sintético
      const mouseEvent = new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true,
        view: window,
        detail: 1,
        screenX: touch.screenX,
        screenY: touch.screenY,
        clientX: touch.clientX,
        clientY: touch.clientY,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        button: 0,
        buttons: 0,
        relatedTarget: null
      });
      
      // Despachar en el documento
      document.dispatchEvent(mouseEvent);
      
      // Si no hubo movimiento significativo, generar click
      const moved = Math.hypot(
        touch.clientX - lastTouch.clientX,
        touch.clientY - lastTouch.clientY
      );
      if (moved < 10) {
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        if (target) {
          const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window,
            detail: 1,
            screenX: touch.screenX,
            screenY: touch.screenY,
            clientX: touch.clientX,
            clientY: touch.clientY,
            ctrlKey: false,
            altKey: false,
            shiftKey: false,
            metaKey: false,
            button: 0,
            buttons: 0
          });
          target.dispatchEvent(clickEvent);
        }
      }
    }
    
    touchState.activeTouches.delete(touch.identifier);
  }

  // Limpiar estado si no quedan touches
  if (e.touches.length === 0) {
    syntheticMouseActive = false;
  }
}

function handleTouchCancel(e: TouchEvent) {
  e.preventDefault();
  e.stopPropagation();
  
  // Limpiar estado
  touchState.activeTouches.clear();
  touchState.isPinching = false;
  touchState.isPanning = false;
  touchState.panStartPoint = null;
  touchState.initialPan = null;
  touchState.lastCenter = null;
  syntheticMouseActive = false;
}

function handleDoubleTap(touch: Touch, svgElement: SVGSVGElement) {
  const store = useEditorStore.getState();
  const rect = svgElement.getBoundingClientRect();
  const point = {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top
  };
  
  // Zoom in 2x en el punto tocado
  const currentZoom = store.viewport.zoom;
  const newZoom = Math.min(currentZoom * 2, 10);
  
  // Calcular nuevo pan para mantener el punto tocado fijo
  const scaleDiff = newZoom / currentZoom;
  const newPan = {
    x: point.x - (point.x - store.viewport.pan.x) * scaleDiff,
    y: point.y - (point.y - store.viewport.pan.y) * scaleDiff
  };
  
  store.setZoom(newZoom);
  store.setPan(newPan);
}