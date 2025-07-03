// touch-to-mouse-global.ts
// Sistema mejorado de mapeo touch→mouse para drag continuo en controles

const mapTouchToMouseEvent = (touchEvent: TouchEvent, mouseEventType: string, touch?: Touch) => {
  const targetTouch = touch || touchEvent.touches[0] || touchEvent.changedTouches[0];
  if (!targetTouch) return null;
  
  const mouseEvent = new MouseEvent(mouseEventType, {
    clientX: targetTouch.clientX,
    clientY: targetTouch.clientY,
    screenX: targetTouch.screenX,
    screenY: targetTouch.screenY,
    button: 0,
    buttons: mouseEventType === 'mouseup' ? 0 : 1,
    bubbles: true,
    cancelable: true,
    view: window,
    detail: mouseEventType === 'click' ? 1 : 0,
  });
  
  // Marcar que es un evento de touch para identificación posterior
  Object.defineProperty(mouseEvent, 'fromTouch', {
    value: true,
    writable: false
  });
  
  return mouseEvent;
};

// State para tracking del drag
let isDragging = false;
let dragStartElement: Element | null = null;
let dragStartTouch: Touch | null = null;

export function enableGlobalTouchToMouse() {
  // Solo instalar una vez
  if ((window as any)._touchToMouseInstalled) return;
  (window as any)._touchToMouseInstalled = true;

  // Solo para dispositivos touch
  if (!('ontouchstart' in window || navigator.maxTouchPoints > 0)) return;

  // Mapeo de eventos
  document.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    e.preventDefault(); // Prevenir scroll/zoom nativo
    
    const touch = e.touches[0];
    dragStartElement = e.target as Element;
    dragStartTouch = touch;
    isDragging = false;
    
    const mouseEvent = mapTouchToMouseEvent(e, 'mousedown', touch);
    if (mouseEvent && dragStartElement) {
      // Asegurar que el target sea el elemento original
      Object.defineProperty(mouseEvent, 'target', {
        value: dragStartElement,
        writable: false
      });
      Object.defineProperty(mouseEvent, 'currentTarget', {
        value: dragStartElement,
        writable: false
      });
      
      // Dispatch al elemento específico
      dragStartElement.dispatchEvent(mouseEvent);
      
      // Si es un SVG element, también dispatch al SVG parent para React handlers
      const svgElement = dragStartElement.closest('svg');
      if (svgElement && svgElement !== dragStartElement) {
        const svgMouseEvent = new MouseEvent('mousedown', {
          clientX: touch.clientX,
          clientY: touch.clientY,
          screenX: touch.screenX,
          screenY: touch.screenY,
          button: 0,
          buttons: 1,
          bubbles: true,
          cancelable: true,
          view: window,
          detail: 0,
        });
        Object.defineProperty(svgMouseEvent, 'target', {
          value: dragStartElement,
          writable: false
        });
        Object.defineProperty(svgMouseEvent, 'fromTouch', {
          value: true,
          writable: false
        });
        svgElement.dispatchEvent(svgMouseEvent);
      }
    }
  }, { passive: false });

  document.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 1) return;
    e.preventDefault(); // Prevenir scroll/zoom nativo
    
    const touch = e.touches[0];
    if (!dragStartElement || !dragStartTouch) return;
    
    // Marcar como dragging si se ha movido más de 5px
    if (!isDragging) {
      const deltaX = Math.abs(touch.clientX - dragStartTouch.clientX);
      const deltaY = Math.abs(touch.clientY - dragStartTouch.clientY);
      if (deltaX > 5 || deltaY > 5) {
        isDragging = true;
      }
    }
    
    const mouseEvent = mapTouchToMouseEvent(e, 'mousemove', touch);
    if (mouseEvent) {
      // Asegurar que el target sea el elemento original
      Object.defineProperty(mouseEvent, 'target', {
        value: dragStartElement,
        writable: false
      });
      Object.defineProperty(mouseEvent, 'currentTarget', {
        value: dragStartElement,
        writable: false
      });
      
      // Durante el drag, enviar a elemento original Y a document para captures globales
      dragStartElement.dispatchEvent(mouseEvent);
      document.dispatchEvent(mouseEvent);
      
      // También enviar al SVG parent para React handlers
      const svgElement = dragStartElement.closest('svg');
      if (svgElement && svgElement !== dragStartElement) {
        const svgMouseEvent = new MouseEvent('mousemove', {
          clientX: touch.clientX,
          clientY: touch.clientY,
          screenX: touch.screenX,
          screenY: touch.screenY,
          button: 0,
          buttons: 1,
          bubbles: true,
          cancelable: true,
          view: window,
          detail: 0,
        });
        Object.defineProperty(svgMouseEvent, 'target', {
          value: dragStartElement,
          writable: false
        });
        Object.defineProperty(svgMouseEvent, 'fromTouch', {
          value: true,
          writable: false
        });
        svgElement.dispatchEvent(svgMouseEvent);
      }
    }
  }, { passive: false });

  document.addEventListener('touchend', (e) => {
    e.preventDefault(); // Prevenir scroll/zoom nativo
    
    const touch = e.changedTouches[0];
    if (!touch || !dragStartElement) return;
    
    const mouseEvent = mapTouchToMouseEvent(e, 'mouseup', touch);
    if (mouseEvent) {
      // Asegurar que el target sea el elemento original
      Object.defineProperty(mouseEvent, 'target', {
        value: dragStartElement,
        writable: false
      });
      Object.defineProperty(mouseEvent, 'currentTarget', {
        value: dragStartElement,
        writable: false
      });
      
      dragStartElement.dispatchEvent(mouseEvent);
      document.dispatchEvent(mouseEvent);
      
      // También enviar al SVG parent para React handlers
      const svgElement = dragStartElement.closest('svg');
      if (svgElement && svgElement !== dragStartElement) {
        const svgMouseEvent = new MouseEvent('mouseup', {
          clientX: touch.clientX,
          clientY: touch.clientY,
          screenX: touch.screenX,
          screenY: touch.screenY,
          button: 0,
          buttons: 0,
          bubbles: true,
          cancelable: true,
          view: window,
          detail: 0,
        });
        Object.defineProperty(svgMouseEvent, 'target', {
          value: dragStartElement,
          writable: false
        });
        Object.defineProperty(svgMouseEvent, 'fromTouch', {
          value: true,
          writable: false
        });
        svgElement.dispatchEvent(svgMouseEvent);
      }
    }
    
    // Solo disparar click si NO fue un drag
    if (!isDragging) {
      setTimeout(() => {
        const clickEvent = mapTouchToMouseEvent(e, 'click', touch);
        if (clickEvent && dragStartElement) {
          // Asegurar que el target sea el elemento original
          Object.defineProperty(clickEvent, 'target', {
            value: dragStartElement,
            writable: false
          });
          Object.defineProperty(clickEvent, 'currentTarget', {
            value: dragStartElement,
            writable: false
          });
          
          dragStartElement.dispatchEvent(clickEvent);
        }
      }, 10);
    }
    
    // Reset state
    isDragging = false;
    dragStartElement = null;
    dragStartTouch = null;
  }, { passive: false });

  document.addEventListener('touchcancel', (e) => {
    e.preventDefault();
    
    // Reset state en cancelación
    isDragging = false;
    dragStartElement = null;
    dragStartTouch = null;
  }, { passive: false });
}
