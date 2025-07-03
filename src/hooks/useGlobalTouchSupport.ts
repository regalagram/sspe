import { useEffect } from 'react';
import { useMobileDetection } from './useMobileDetection';

/**
 * Hook que configura el mapeo global de eventos táctiles a eventos de mouse
 * para asegurar que las interacciones táctiles funcionen con el sistema existente
 */
export const useGlobalTouchSupport = () => {
  const { isTouchDevice } = useMobileDetection();

  useEffect(() => {
    if (!isTouchDevice) return;

    // Variables para rastrear el estado global del touch
    let activeTouches = new Map<number, { startX: number; startY: number; element: Element | null }>();
    let isDragging = false;
    let dragThreshold = 10;

    const createMouseEvent = (touchEvent: TouchEvent, type: string, touch: Touch): MouseEvent => {
      return new MouseEvent(type, {
        clientX: touch.clientX,
        clientY: touch.clientY,
        screenX: touch.screenX,
        screenY: touch.screenY,
        button: 0,
        buttons: type === 'mouseup' ? 0 : 1,
        bubbles: true,
        cancelable: true,
        view: window,
        detail: type === 'click' ? 1 : 0,
        ctrlKey: touchEvent.ctrlKey || false,
        shiftKey: touchEvent.shiftKey || false,
        altKey: touchEvent.altKey || false,
        metaKey: touchEvent.metaKey || false,
      });
    };

    const handleGlobalTouchStart = (e: TouchEvent) => {
      // Solo procesar toques simples para drag & drop
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        
        activeTouches.set(touch.identifier, {
          startX: touch.clientX,
          startY: touch.clientY,
          element: element
        });

        // Crear y disparar mousedown
        const mouseEvent = createMouseEvent(e, 'mousedown', touch);
        if (element) {
          element.dispatchEvent(mouseEvent);
        }
      }
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      // Solo procesar si hay un solo toque activo
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const touchData = activeTouches.get(touch.identifier);
        
        if (touchData) {
          const deltaX = Math.abs(touch.clientX - touchData.startX);
          const deltaY = Math.abs(touch.clientY - touchData.startY);
          const totalDelta = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
          
          // Marcar como dragging si se supera el threshold
          if (!isDragging && totalDelta > dragThreshold) {
            isDragging = true;
          }

          // Crear y disparar mousemove
          const mouseEvent = createMouseEvent(e, 'mousemove', touch);
          
          // Disparar en el elemento original si existe
          if (touchData.element) {
            touchData.element.dispatchEvent(mouseEvent);
          }
          
          // También disparar en document para asegurar propagación global
          document.dispatchEvent(mouseEvent);
          
          // Prevenir comportamiento por defecto durante drag
          if (isDragging) {
            e.preventDefault();
          }
        }
      }
    };

    const handleGlobalTouchEnd = (e: TouchEvent) => {
      // Procesar toques que terminan
      for (const touch of Array.from(e.changedTouches)) {
        const touchData = activeTouches.get(touch.identifier);
        
        if (touchData) {
          // Crear y disparar mouseup
          const mouseEvent = createMouseEvent(e, 'mouseup', touch);
          
          if (touchData.element) {
            touchData.element.dispatchEvent(mouseEvent);
          }
          
          // También disparar en document para asegurar que se captura
          document.dispatchEvent(mouseEvent);
          
          // Si no fue un drag, disparar click después de un pequeño delay
          if (!isDragging) {
            setTimeout(() => {
              const clickEvent = createMouseEvent(e, 'click', touch);
              if (touchData.element) {
                touchData.element.dispatchEvent(clickEvent);
              }
            }, 10);
          }
          
          // Limpiar el toque
          activeTouches.delete(touch.identifier);
        }
      }
      
      // Si no quedan toques activos, resetear el estado de drag
      if (e.touches.length === 0) {
        isDragging = false;
      }
    };

    const handleGlobalTouchCancel = (e: TouchEvent) => {
      // Limpiar todos los toques en caso de cancelación
      activeTouches.clear();
      isDragging = false;
    };

    // Agregar listeners globales con capture para interceptar todos los eventos
    document.addEventListener('touchstart', handleGlobalTouchStart, { passive: false, capture: true });
    document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false, capture: true });
    document.addEventListener('touchend', handleGlobalTouchEnd, { passive: false, capture: true });
    document.addEventListener('touchcancel', handleGlobalTouchCancel, { passive: false, capture: true });

    // Prevenir gestos del navegador que interfieren
    const preventGestures = (e: Event) => e.preventDefault();
    document.addEventListener('gesturestart', preventGestures);
    document.addEventListener('gesturechange', preventGestures);
    document.addEventListener('gestureend', preventGestures);

    return () => {
      document.removeEventListener('touchstart', handleGlobalTouchStart, { capture: true } as any);
      document.removeEventListener('touchmove', handleGlobalTouchMove, { capture: true } as any);
      document.removeEventListener('touchend', handleGlobalTouchEnd, { capture: true } as any);
      document.removeEventListener('touchcancel', handleGlobalTouchCancel, { capture: true } as any);
      document.removeEventListener('gesturestart', preventGestures);
      document.removeEventListener('gesturechange', preventGestures);
      document.removeEventListener('gestureend', preventGestures);
    };
  }, [isTouchDevice]);
};
