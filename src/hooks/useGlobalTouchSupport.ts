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

        // Check if this is a clickable UI element (button, accordion header, etc.)
        const isClickableUI = element && (
          element.tagName.toLowerCase() === 'button' ||
          element.closest('button') ||
          element.hasAttribute('data-clickable') ||
          (element as HTMLElement).style?.cursor === 'pointer' ||
          element.getAttribute('role') === 'button'
        );

        // Check if this is within an accordion panel or scrollable area
        const isWithinAccordion = element && (
          element.closest('.accordion-sidebar') ||
          element.closest('.accordion-panel-content') ||
          element.closest('.draggable-panel') ||
          element.closest('[data-mobile-scrollable="true"]') ||
          element.hasAttribute('data-mobile-scrollable')
        );

        // Check if this is an input element or within an input-containing area
        const isInputElement = element && (
          element.tagName.toLowerCase() === 'input' ||
          element.tagName.toLowerCase() === 'textarea' ||
          element.tagName.toLowerCase() === 'select' ||
          element.tagName.toLowerCase() === 'button' ||
          element.closest('input') ||
          element.closest('textarea') ||
          element.closest('select') ||
          element.closest('button') ||
          element.closest('.control-group') ||
          element.closest('label') ||
          // Específico para controles de formulario
          element.getAttribute('type') === 'color' ||
          element.getAttribute('type') === 'range' ||
          element.getAttribute('type') === 'number' ||
          element.getAttribute('type') === 'text' ||
          element.getAttribute('type') === 'checkbox'
        );

        // Para elementos de formulario o acordeón, NO interferir - dejar que iOS/Android maneje nativamente
        if (isWithinAccordion || isInputElement) {
          console.log('📱 TouchSupport: Skipping synthetic events for form/accordion element');
          return; // No crear eventos sintéticos
        }

        // Para elementos no-UI (SVG, canvas), crear eventos de mouse sintéticos
        if (!isClickableUI && !isWithinAccordion && !isInputElement) {
          // Create and dispatch mousedown for non-UI elements
          const mouseEvent = createMouseEvent(e, 'mousedown', touch);
          if (element) {
            element.dispatchEvent(mouseEvent);
          }
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
          
          // Check if we're within an accordion or scrollable area
          const element = document.elementFromPoint(touch.clientX, touch.clientY);
          const isWithinAccordion = element && (
            element.closest('.accordion-sidebar') ||
            element.closest('.accordion-panel-content') ||
            element.closest('.draggable-panel') ||
            element.closest('[data-mobile-scrollable="true"]') ||
            element.hasAttribute('data-mobile-scrollable')
          );

          // If within accordion and moving vertically, don't interfere (allow scroll)
          if (isWithinAccordion && deltaY > deltaX) {
            return; // Let native scroll handling work
          }
          
          // Marcar como dragging si se supera el threshold (only for SVG/canvas areas)
          if (!isDragging && totalDelta > dragThreshold && !isWithinAccordion) {
            isDragging = true;
          }

          // Only create synthetic mouse events for non-accordion areas
          if (!isWithinAccordion) {
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
      }
    };

    const handleGlobalTouchEnd = (e: TouchEvent) => {
      // Procesar toques que terminan
      for (const touch of Array.from(e.changedTouches)) {
        const touchData = activeTouches.get(touch.identifier);
        
        if (touchData) {
          // Check if this is a clickable UI element
          const isClickableUI = touchData.element && (
            touchData.element.tagName.toLowerCase() === 'button' ||
            touchData.element.closest('button') ||
            touchData.element.hasAttribute('data-clickable') ||
            (touchData.element as HTMLElement).style?.cursor === 'pointer' ||
            touchData.element.getAttribute('role') === 'button'
          );

          // Check if this is within an accordion panel or input area
          const isWithinAccordion = touchData.element && (
            touchData.element.closest('.accordion-sidebar') ||
            touchData.element.closest('.accordion-panel-content') ||
            touchData.element.closest('.draggable-panel') ||
            touchData.element.closest('[data-mobile-scrollable="true"]') ||
            touchData.element.hasAttribute('data-mobile-scrollable')
          );

          const isInputElement = touchData.element && (
            touchData.element.tagName.toLowerCase() === 'input' ||
            touchData.element.tagName.toLowerCase() === 'textarea' ||
            touchData.element.tagName.toLowerCase() === 'select' ||
            touchData.element.tagName.toLowerCase() === 'button' ||
            touchData.element.closest('input') ||
            touchData.element.closest('textarea') ||
            touchData.element.closest('select') ||
            touchData.element.closest('button') ||
            touchData.element.closest('.control-group') ||
            touchData.element.closest('label') ||
            // Específico para controles de formulario
            touchData.element.getAttribute('type') === 'color' ||
            touchData.element.getAttribute('type') === 'range' ||
            touchData.element.getAttribute('type') === 'number' ||
            touchData.element.getAttribute('type') === 'text' ||
            touchData.element.getAttribute('type') === 'checkbox'
          );

          // For accordion panels or input elements, let native touch handling work
          if (!isClickableUI || isWithinAccordion || isInputElement) {
            // Don't create synthetic events - let native behavior work
          } else {
            // Create and dispatch mouseup for non-UI elements
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
