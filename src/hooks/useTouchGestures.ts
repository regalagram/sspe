import { useState, useEffect, useCallback } from 'react';

interface TouchPoint {
  x: number;
  y: number;
  identifier: number;
}

interface TouchGestureState {
  touches: TouchPoint[];
  scale: number;
  rotation: number;
  panDelta: { x: number; y: number };
  isGesturing: boolean;
  gestureType: 'none' | 'pan' | 'zoom' | 'rotate' | 'pan-zoom';
}

interface TouchEventHandlers {
  onTouchStart: (e: TouchEvent) => void;
  onTouchMove: (e: TouchEvent) => void;
  onTouchEnd: (e: TouchEvent) => void;
  onTouchCancel: (e: TouchEvent) => void;
}

interface UseTouchGesturesOptions {
  onPan?: (delta: { x: number; y: number }) => void;
  onZoom?: (scale: number, center: { x: number; y: number }) => void;
  onRotate?: (rotation: number, center: { x: number; y: number }) => void;
  onGestureStart?: () => void;
  onGestureEnd?: () => void;
  enablePan?: boolean;
  enableZoom?: boolean;
  enableRotate?: boolean;
  minScale?: number;
  maxScale?: number;
}

export const useTouchGestures = (
  options: UseTouchGesturesOptions = {}
): TouchGestureState & TouchEventHandlers => {
  const {
    onPan,
    onZoom,
    onRotate,
    onGestureStart,
    onGestureEnd,
    enablePan = true,
    enableZoom = true,
    enableRotate = false,
    minScale = 0.1,
    maxScale = 10,
  } = options;

  const [state, setState] = useState<TouchGestureState>({
    touches: [],
    scale: 1,
    rotation: 0,
    panDelta: { x: 0, y: 0 },
    isGesturing: false,
    gestureType: 'none',
  });

  const [lastTouches, setLastTouches] = useState<TouchPoint[]>([]);
  const [initialDistance, setInitialDistance] = useState<number>(0);
  const [initialAngle, setInitialAngle] = useState<number>(0);
  const [initialCenter, setInitialCenter] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const getTouchPoint = (touch: Touch): TouchPoint => ({
    x: touch.clientX,
    y: touch.clientY,
    identifier: touch.identifier,
  });

  const getDistance = (touch1: TouchPoint, touch2: TouchPoint): number => {
    const dx = touch2.x - touch1.x;
    const dy = touch2.y - touch1.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getAngle = (touch1: TouchPoint, touch2: TouchPoint): number => {
    return Math.atan2(touch2.y - touch1.y, touch2.x - touch1.x);
  };

  const getCenter = (touch1: TouchPoint, touch2: TouchPoint): { x: number; y: number } => ({
    x: (touch1.x + touch2.x) / 2,
    y: (touch1.y + touch2.y) / 2,
  });

  const onTouchStart = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const touches = Array.from(e.touches).map(getTouchPoint);
    
    setLastTouches(touches);
    setState(prev => ({ ...prev, touches, isGesturing: true }));
    
    if (touches.length === 2) {
      const distance = getDistance(touches[0], touches[1]);
      const angle = getAngle(touches[0], touches[1]);
      const center = getCenter(touches[0], touches[1]);
      
      setInitialDistance(distance);
      setInitialAngle(angle);
      setInitialCenter(center);
    }
    
    onGestureStart?.();
  }, [onGestureStart]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const touches = Array.from(e.touches).map(getTouchPoint);
    
    if (touches.length === 1 && lastTouches.length === 1 && enablePan) {
      // Pan gesture
      const delta = {
        x: touches[0].x - lastTouches[0].x,
        y: touches[0].y - lastTouches[0].y,
      };
      
      setState(prev => ({
        ...prev,
        touches,
        panDelta: delta,
        gestureType: 'pan',
      }));
      
      onPan?.(delta);
    } else if (touches.length === 2 && lastTouches.length === 2) {
      // Multi-touch gestures
      const currentDistance = getDistance(touches[0], touches[1]);
      const currentAngle = getAngle(touches[0], touches[1]);
      const currentCenter = getCenter(touches[0], touches[1]);
      
      if (enableZoom && initialDistance > 0) {
        const scale = Math.max(minScale, Math.min(maxScale, currentDistance / initialDistance));
        
        setState(prev => ({
          ...prev,
          touches,
          scale,
          gestureType: enableRotate ? 'pan-zoom' : 'zoom',
        }));
        
        onZoom?.(scale, currentCenter);
      }
      
      if (enableRotate) {
        const rotation = currentAngle - initialAngle;
        
        setState(prev => ({
          ...prev,
          touches,
          rotation,
          gestureType: 'rotate',
        }));
        
        onRotate?.(rotation, currentCenter);
      }
    }
    
    setLastTouches(touches);
  }, [lastTouches, enablePan, enableZoom, enableRotate, initialDistance, initialAngle, minScale, maxScale, onPan, onZoom, onRotate]);

  const onTouchEnd = useCallback((e: TouchEvent) => {
    const touches = Array.from(e.touches).map(getTouchPoint);
    
    if (touches.length === 0) {
      setState(prev => ({
        ...prev,
        touches: [],
        isGesturing: false,
        gestureType: 'none',
        panDelta: { x: 0, y: 0 },
      }));
      
      setLastTouches([]);
      setInitialDistance(0);
      setInitialAngle(0);
      onGestureEnd?.();
    } else {
      setState(prev => ({ ...prev, touches }));
      setLastTouches(touches);
    }
  }, [onGestureEnd]);

  const onTouchCancel = useCallback((e: TouchEvent) => {
    setState(prev => ({
      ...prev,
      touches: [],
      isGesturing: false,
      gestureType: 'none',
      panDelta: { x: 0, y: 0 },
    }));
    
    setLastTouches([]);
    setInitialDistance(0);
    setInitialAngle(0);
    onGestureEnd?.();
  }, [onGestureEnd]);

  return {
    ...state,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel,
  };
};

// Hook para mapear eventos táctiles a eventos de mouse
export const useTouchToMouseMapping = (options?: { preventDefault?: boolean }) => {
  const preventDefault = options?.preventDefault !== false;
  const mapTouchToMouseEvent = useCallback((touchEvent: TouchEvent, mouseEventType: string) => {
    if (touchEvent.touches.length === 0 && touchEvent.changedTouches.length === 0) return null;
    
    const touch = touchEvent.touches[0] || touchEvent.changedTouches[0];
    
    // Crear un evento de mouse sintético con todas las propiedades necesarias
    const mouseEvent = new MouseEvent(mouseEventType, {
      clientX: touch.clientX,
      clientY: touch.clientY,
      screenX: touch.screenX,
      screenY: touch.screenY,
      button: 0, // Botón izquierdo
      buttons: mouseEventType === 'mouseup' ? 0 : 1, // Botones presionados
      bubbles: true,
      cancelable: true,
      view: window,
      detail: mouseEventType === 'click' ? 1 : 0,
      // Propiedades adicionales para compatibilidad
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      metaKey: false,
    });
    
    // Agregar propiedades personalizadas para indicar que es un evento táctil
    Object.defineProperty(mouseEvent, 'fromTouch', {
      value: true,
      writable: false
    });
    
    return mouseEvent;
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Solo mapear si es un solo dedo
    if (e.touches.length !== 1) return;
    if (preventDefault) e.preventDefault();
    const mouseEvent = mapTouchToMouseEvent(e, 'mousedown');
    if (mouseEvent && e.target) {
      // Disparar el evento en el elemento específico
      const element = e.target as Element;
      element.dispatchEvent(mouseEvent);
    }
  }, [mapTouchToMouseEvent, preventDefault]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    // Solo mapear si es un solo dedo
    if (e.touches.length !== 1) return;
    if (preventDefault) e.preventDefault();
    const mouseEvent = mapTouchToMouseEvent(e, 'mousemove');
    if (mouseEvent && e.target) {
      // Para mousemove, también disparar en document para asegurar propagación durante drag
      const element = e.target as Element;
      element.dispatchEvent(mouseEvent);
      // También disparar en document para operaciones de drag que pueden salir del elemento original
      document.dispatchEvent(mouseEvent);
    }
  }, [mapTouchToMouseEvent, preventDefault]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (preventDefault) e.preventDefault();
    const mouseEvent = mapTouchToMouseEvent(e, 'mouseup');
    if (mouseEvent && e.target) {
      const element = e.target as Element;
      element.dispatchEvent(mouseEvent);
      // También disparar en document para asegurar que se captura el mouseup
      document.dispatchEvent(mouseEvent);
    }
    // Después de un pequeño delay, disparar un evento click si no hubo movimiento significativo
    setTimeout(() => {
      const clickEvent = mapTouchToMouseEvent(e, 'click');
      if (clickEvent && e.target) {
        (e.target as Element).dispatchEvent(clickEvent);
      }
    }, 10);
  }, [mapTouchToMouseEvent, preventDefault]);

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
};
