import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';

interface TouchState {
  activeTouches: Map<number, Touch>;
  lastTouchTime: number;
  isPinching: boolean;
  initialPinchDistance: number;
  initialZoom: number;
}

const touchState: TouchState = {
  activeTouches: new Map(),
  lastTouchTime: 0,
  isPinching: false,
  initialPinchDistance: 0,
  initialZoom: 1
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
  const point = getTouchPoint(touch, svgElement);
  
  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: touch.clientX,
    clientY: touch.clientY,
    screenX: touch.screenX,
    screenY: touch.screenY,
    button: 0,
    buttons: 1,
    relatedTarget: null,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false
  });
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
  
  // Manejar pinch-to-zoom
  if (e.touches.length === 2) {
    touchState.isPinching = true;
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    touchState.initialPinchDistance = Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY
    );
    touchState.initialZoom = useEditorStore.getState().viewport.zoom;
    return;
  }
  
  // Single touch - simular mousedown
  if (e.touches.length === 1) {
    const touch = e.touches[0];
    touchState.activeTouches.set(touch.identifier, touch);
    
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (target) {
      const mouseEvent = createMouseEvent('mousedown', touch, target, svgElement);
      target.dispatchEvent(mouseEvent);
    }
  }
}

function handleTouchMove(e: TouchEvent) {
  e.preventDefault();
  const svgElement = e.currentTarget as SVGSVGElement;
  
  // Manejar pinch-to-zoom
  if (touchState.isPinching && e.touches.length === 2) {
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    const currentDistance = Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY
    );
    
    const scale = currentDistance / touchState.initialPinchDistance;
    const newZoom = Math.max(0.1, Math.min(10, touchState.initialZoom * scale));
    
    // Calcular punto central del pinch
    const centerX = (touch1.clientX + touch2.clientX) / 2;
    const centerY = (touch1.clientY + touch2.clientY) / 2;
    
    const store = useEditorStore.getState();
    store.setZoom(newZoom, { x: centerX, y: centerY });
    return;
  }
  
  // Single touch - simular mousemove
  if (e.touches.length === 1) {
    const touch = e.touches[0];
    touchState.activeTouches.set(touch.identifier, touch);
    
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (target) {
      const mouseEvent = createMouseEvent('mousemove', touch, target, svgElement);
      target.dispatchEvent(mouseEvent);
    }
  }
}

function handleTouchEnd(e: TouchEvent) {
  e.preventDefault();
  const svgElement = e.currentTarget as SVGSVGElement;
  
  // Terminar pinch
  if (e.touches.length < 2) {
    touchState.isPinching = false;
  }
  
  // Procesar cada touch que terminó
  for (let i = 0; i < e.changedTouches.length; i++) {
    const touch = e.changedTouches[i];
    const lastTouch = touchState.activeTouches.get(touch.identifier);
    
    if (lastTouch) {
      const target = document.elementFromPoint(lastTouch.clientX, lastTouch.clientY);
      if (target) {
        // Simular mouseup
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
      
      touchState.activeTouches.delete(touch.identifier);
    }
  }
}

function handleTouchCancel(e: TouchEvent) {
  // Limpiar estado
  touchState.activeTouches.clear();
  touchState.isPinching = false;
}

function handleDoubleTap(touch: Touch, svgElement: SVGSVGElement) {
  const store = useEditorStore.getState();
  const point = getTouchPoint(touch, svgElement);
  
  // Zoom in 2x en el punto tocado
  const currentZoom = store.viewport.zoom;
  const newZoom = Math.min(currentZoom * 2, 10);
  
  store.setZoom(newZoom, { x: touch.clientX, y: touch.clientY });
}