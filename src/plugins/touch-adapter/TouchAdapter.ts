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
  isDragging: boolean;
  dragTarget: Element | null;
  lastDragPoint: { x: number; y: number } | null;
  hasFiredMouseDown: boolean;
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
  lastCenter: null,
  isDragging: false,
  dragTarget: null,
  lastDragPoint: null,
  hasFiredMouseDown: false
};

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
    
    // Event listeners
    svgElement.addEventListener('touchstart', handleTouchStart, { passive: false });
    svgElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    svgElement.addEventListener('touchend', handleTouchEnd, { passive: false });
    svgElement.addEventListener('touchcancel', handleTouchCancel, { passive: false });
  },
  
  destroy: () => {
    const svgElement = document.querySelector('svg');
    if (!svgElement) return;
    
    svgElement.removeEventListener('touchstart', handleTouchStart);
    svgElement.removeEventListener('touchmove', handleTouchMove);
    svgElement.removeEventListener('touchend', handleTouchEnd);
    svgElement.removeEventListener('touchcancel', handleTouchCancel);
  }
};

// Convierte coordenadas de touch a coordenadas del SVG
function getTouchPoint(touch: Touch, svgElement: SVGSVGElement): DOMPoint {
  const pt = svgElement.createSVGPoint();
  pt.x = touch.clientX;
  pt.y = touch.clientY;
  return pt.matrixTransform(svgElement.getScreenCTM()?.inverse());
}

// Crea un evento mouse sintético desde un touch
function createMouseEvent(
  type: string, 
  touch: Touch, 
  target: Element,
  svgElement: SVGSVGElement
): MouseEvent {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: touch.clientX,
    clientY: touch.clientY,
    screenX: touch.screenX,
    screenY: touch.screenY,
    button: 0,
    buttons: type === 'mouseup' ? 0 : 1,
    relatedTarget: null,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false
  });
  
  return event;
}

function handleTouchStart(e: TouchEvent) {
  e.preventDefault();
  const svgElement = e.currentTarget as SVGSVGElement;

  // Detectar double tap para zoom
  const currentTime = Date.now();
  if (currentTime - touchState.lastTouchTime < 300 && e.touches.length === 1) {
    handleDoubleTap(e.touches[0], svgElement);
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

  // Single touch - simular mousedown
  if (e.touches.length === 1) {
    const touch = e.touches[0];
    touchState.activeTouches.set(touch.identifier, touch);
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (target) {
      // Iniciar estado de arrastre
      touchState.isDragging = true;
      touchState.dragTarget = target;
      touchState.lastDragPoint = { x: touch.clientX, y: touch.clientY };
      touchState.hasFiredMouseDown = true;
      
      const mouseEvent = createMouseEvent('mousedown', touch, target, svgElement);
      target.dispatchEvent(mouseEvent);
    }
  }
}

function handleTouchMove(e: TouchEvent) {
  e.preventDefault();
  const svgElement = e.currentTarget as SVGSVGElement;
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
      
      // Aplicar el desplazamiento considerando el zoom actual
      store.setPan({
        x: store.viewport.pan.x + dx,
        y: store.viewport.pan.y + dy
      });
      
      // Actualizar última posición
      touchState.lastCenter = { x: currentCenterX, y: currentCenterY };
    }
    return;
  }

  // Single touch - simular mousemove
  if (e.touches.length === 1) {
    const touch = e.touches[0];
    touchState.activeTouches.set(touch.identifier, touch);
    
    // Si estamos arrastrando y ya se disparó el mousedown
    if (touchState.isDragging && touchState.hasFiredMouseDown && touchState.dragTarget) {
      // Solo emitir el evento global si realmente nos movimos
      if (touchState.lastDragPoint) {
        const dx = touch.clientX - touchState.lastDragPoint.x;
        const dy = touch.clientY - touchState.lastDragPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0.5) {
          // Crear un evento mousemove global
          // IMPORTANTE: No establecer target ni currentTarget aquí
          const globalMouseEvent = new MouseEvent('mousemove', {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: touch.clientX,
            clientY: touch.clientY,
            screenX: touch.screenX,
            screenY: touch.screenY,
            button: 0,
            buttons: 1
          });
          
          // Disparar en el documento para los listeners globales
          document.dispatchEvent(globalMouseEvent);
          
          touchState.lastDragPoint = { x: touch.clientX, y: touch.clientY };
        }
      }
    } else if (!touchState.isDragging) {
      // Si no estamos arrastrando, comportamiento normal
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      if (target) {
        const mouseEvent = createMouseEvent('mousemove', touch, target, svgElement);
        target.dispatchEvent(mouseEvent);
      }
    }
  }
}

function handleTouchEnd(e: TouchEvent) {
  e.preventDefault();
  const svgElement = e.currentTarget as SVGSVGElement;

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
    if (lastTouch) {
      // Si estábamos arrastrando y se disparó mousedown
      if (touchState.isDragging && touchState.hasFiredMouseDown) {
        // Emitir mouseup global
        const globalMouseUpEvent = new MouseEvent('mouseup', {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: touch.clientX,
          clientY: touch.clientY,
          screenX: touch.screenX,
          screenY: touch.screenY,
          button: 0,
          buttons: 0
        });
        
        document.dispatchEvent(globalMouseUpEvent);
      } else {
        // Si no estábamos arrastrando, emitir eventos normales
        const target = document.elementFromPoint(lastTouch.clientX, lastTouch.clientY);
        if (target) {
          const mouseUpEvent = createMouseEvent('mouseup', lastTouch, target, svgElement);
          target.dispatchEvent(mouseUpEvent);
          
          // Simular click si no hubo movimiento significativo
          const moved = Math.hypot(
            touch.clientX - lastTouch.clientX,
            touch.clientY - lastTouch.clientY
          );
          if (moved < 10) {
            const clickEvent = createMouseEvent('click', lastTouch, target, svgElement);
            target.dispatchEvent(clickEvent);
          }
        }
      }
      
      touchState.activeTouches.delete(touch.identifier);
    }
  }

  // Limpiar estado de arrastre si no quedan touches
  if (e.touches.length === 0) {
    touchState.isDragging = false;
    touchState.dragTarget = null;
    touchState.lastDragPoint = null;
    touchState.hasFiredMouseDown = false;
  }
}

function handleTouchCancel(e: TouchEvent) {
  // Limpiar estado
  touchState.activeTouches.clear();
  touchState.isPinching = false;
  touchState.isPanning = false;
  touchState.panStartPoint = null;
  touchState.initialPan = null;
  touchState.lastCenter = null;
  touchState.isDragging = false;
  touchState.dragTarget = null;
  touchState.lastDragPoint = null;
  touchState.hasFiredMouseDown = false;
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