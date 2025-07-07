// touch-to-mouse-global.ts
// Sistema mejorado de mapeo touch→mouse para drag continuo en controles

// Global deduplication system
let currentTouchEventId: string | null = null;
let processedElements = new Set<Element>();

// Global flag to indicate we're in the context of processing a touch event
let isProcessingTouchEvent = false;
let currentTouchEventType: string = '';

const generateTouchEventId = (touchEvent: TouchEvent, eventType: string): string => {
  const touch = touchEvent.touches[0] || touchEvent.changedTouches[0];
  if (!touch) return '';
  return `${eventType}_${touch.identifier}_${touchEvent.timeStamp}`;
};

// Export function to check if we're currently processing a touch event
export function isCurrentlyProcessingTouch(): boolean {
  return isProcessingTouchEvent;
}

export function getCurrentTouchEventId(): string | null {
  return currentTouchEventId;
}

export function getCurrentTouchEventType(): string {
  return currentTouchEventType;
}

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
  
  // Agregar ID del evento touch actual para deduplicación
  Object.defineProperty(mouseEvent, 'touchEventId', {
    value: currentTouchEventId,
    writable: false
  });
  
  return mouseEvent;
};

// State para tracking del drag
let isDragging = false;
let dragStartElement: Element | null = null;
let dragStartTouch: Touch | null = null;
let activeTouchSession = false; // Para prevenir touchstart duplicados durante una sesión activa
let lastTouchStartTime = 0; // Para detectar touchstart duplicados muy rápidos
let lastTouchStartPosition = { x: 0, y: 0 }; // Para detectar touchstart duplicados por posición

export function enableGlobalTouchToMouse() {
  // Solo instalar una vez
  if ((window as any)._touchToMouseInstalled) return;
  (window as any)._touchToMouseInstalled = true;
  
  // console.log('Enabling global touch-to-mouse system');

  // Solo para dispositivos touch
  if (!('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
    // console.log('No touch support detected, skipping touch-to-mouse setup');
    return;
  }
  
  // console.log('Touch support detected, setting up touch-to-mouse listeners');

  // Mapeo de eventos
  document.addEventListener('touchstart', (e) => {
    // console.log('Touch start detected:', e.touches.length, 'touches');
    if (e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    const element = e.target as Element;
    const currentTime = e.timeStamp || Date.now();
    
    // Si ya tenemos una sesión de touch activa, ignorar nuevos touchstart
    if (activeTouchSession) {
      console.log('Ignoring touchstart - session already active');
      return;
    }
    
    // Protección mejorada: ignorar touchstart duplicados por tiempo Y posición
    const timeDiff = currentTime - lastTouchStartTime;
    const positionDiff = Math.abs(touch.clientX - lastTouchStartPosition.x) + Math.abs(touch.clientY - lastTouchStartPosition.y);
    
    if (timeDiff < 100 && positionDiff < 5) {
      console.log('Ignoring duplicate touchstart - same position and time:', {
        timeDiff: timeDiff + 'ms',
        positionDiff: positionDiff + 'px'
      });
      return;
    }
    
    // Iniciar nueva sesión de touch
    activeTouchSession = true;
    dragStartElement = element;
    dragStartTouch = touch;
    isDragging = false;
    lastTouchStartTime = currentTime;
    lastTouchStartPosition = { x: touch.clientX, y: touch.clientY };
    
    console.log('Processing touchstart:', {
      target: dragStartElement.tagName,
      className: dragStartElement.className,
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    
    // Check if this is a UI element that should handle its own touch events
    const isUIElement = dragStartElement.tagName.toLowerCase() === 'button' ||
                       dragStartElement.closest('button') ||
                       dragStartElement.hasAttribute('data-accordion-panel-header') ||
                       dragStartElement.hasAttribute('data-accordion-toggle') ||
                       dragStartElement.hasAttribute('data-clickable') ||
                       (dragStartElement as HTMLElement).style?.cursor === 'pointer';
    
    if (isUIElement) {
      console.log('UI element detected, letting native events handle it');
      // For UI elements, don't prevent default and let native touch handling work
      return;
    }
    
    // Only prevent default for non-UI elements (SVG, canvas, etc.)
    e.preventDefault();
    
    // Set up deduplication for this touch event
    currentTouchEventId = generateTouchEventId(e, 'mousedown');
    currentTouchEventType = 'mousedown';
    processedElements.clear();
    
    // Find the SVG element to dispatch the event to (where React listeners are)
    const svgElement = dragStartElement.closest('svg');
    if (svgElement) {
      const mouseEvent = mapTouchToMouseEvent(e, 'mousedown', touch);
      if (mouseEvent) {
        // Keep the original target for React handlers to know what was actually touched
        Object.defineProperty(mouseEvent, 'target', {
          value: dragStartElement,
          writable: false
        });
        Object.defineProperty(mouseEvent, 'currentTarget', {
          value: svgElement,
          writable: false
        });
        
        console.log('Dispatching synthetic mousedown to SVG with target:', dragStartElement.tagName);
        
        // Set global flag to indicate we're processing a touch event
        isProcessingTouchEvent = true;
        
        // Dispatch to the SVG where React has its listeners
        svgElement.dispatchEvent(mouseEvent);
        processedElements.add(svgElement);
        
        // Reset flag after a short timeout to handle async React processing
        setTimeout(() => {
          isProcessingTouchEvent = false;
        }, 0);
      }
    }
  }, { passive: false });

  document.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    if (!dragStartElement || !dragStartTouch) return;
    
    // Check if this is a UI element that should handle its own touch events
    const isUIElement = dragStartElement.tagName.toLowerCase() === 'button' ||
                       dragStartElement.closest('button') ||
                       dragStartElement.hasAttribute('data-accordion-panel-header') ||
                       dragStartElement.hasAttribute('data-accordion-toggle') ||
                       dragStartElement.hasAttribute('data-clickable') ||
                       (dragStartElement as HTMLElement).style?.cursor === 'pointer';
    
    if (isUIElement) {
      // For UI elements, don't prevent default and let native touch handling work
      return;
    }
    
    e.preventDefault(); // Prevenir scroll/zoom nativo
    
    // Marcar como dragging si se ha movido más de 5px
    if (!isDragging) {
      const deltaX = Math.abs(touch.clientX - dragStartTouch.clientX);
      const deltaY = Math.abs(touch.clientY - dragStartTouch.clientY);
      if (deltaX > 5 || deltaY > 5) {
        isDragging = true;
        console.log('Started dragging');
      }
    }
    
    // Set up deduplication for this touch event
    currentTouchEventId = generateTouchEventId(e, 'mousemove');
    currentTouchEventType = 'mousemove';
    processedElements.clear();
    
    // Find the SVG element to dispatch the event to (where React listeners are)
    const svgElement = dragStartElement.closest('svg');
    if (svgElement) {
      const mouseEvent = mapTouchToMouseEvent(e, 'mousemove', touch);
      if (mouseEvent) {
        // Keep the original target for React handlers to know what was actually touched
        Object.defineProperty(mouseEvent, 'target', {
          value: dragStartElement,
          writable: false
        });
        Object.defineProperty(mouseEvent, 'currentTarget', {
          value: svgElement,
          writable: false
        });
        
        console.log('Dispatching synthetic mousemove to SVG');
        
        // Set global flag to indicate we're processing a touch event
        isProcessingTouchEvent = true;
        
        // Dispatch to the SVG where React has its listeners
        svgElement.dispatchEvent(mouseEvent);
        processedElements.add(svgElement);
        
        // Reset flag after a short timeout to handle async React processing
        setTimeout(() => {
          isProcessingTouchEvent = false;
        }, 0);
      }
    }
  }, { passive: false });

  document.addEventListener('touchend', (e) => {
    const touch = e.changedTouches[0];
    console.log('🔥 Global touchend received:', { 
      changedTouches: e.changedTouches.length, 
      touches: e.touches.length,
      hasDragStartElement: !!dragStartElement,
      activeTouchSession
    });
    
    if (!touch || !dragStartElement) {
      console.log('🔥 Early return from touchend - no touch or dragStartElement');
      return;
    }
    
    console.log('Touch end detected');
    
    // Check if this is a UI element that should handle its own touch events
    const isUIElement = dragStartElement.tagName.toLowerCase() === 'button' ||
                       dragStartElement.closest('button') ||
                       dragStartElement.hasAttribute('data-accordion-panel-header') ||
                       dragStartElement.hasAttribute('data-accordion-toggle') ||
                       dragStartElement.hasAttribute('data-clickable') ||
                       (dragStartElement as HTMLElement).style?.cursor === 'pointer';
    
    if (isUIElement) {
      console.log('UI element touchend, letting native events handle it');
      // For UI elements, don't prevent default and let native touch handling work
      // Reset state but don't interfere with native handling
      isDragging = false;
      dragStartElement = null;
      dragStartTouch = null;
      currentTouchEventId = null;
      processedElements.clear();
      activeTouchSession = false; // Cerrar sesión de touch
      lastTouchStartTime = 0; // Reset timing
      lastTouchStartPosition = { x: 0, y: 0 }; // Reset position
      return;
    }
    
    e.preventDefault(); // Prevenir scroll/zoom nativo
    
    // Set up deduplication for this touch event
    currentTouchEventId = generateTouchEventId(e, 'mouseup');
    currentTouchEventType = 'mouseup';
    processedElements.clear();
    
    // Find the SVG element to dispatch the event to (where React listeners are)
    const svgElement = dragStartElement.closest('svg');
    if (svgElement) {
      const mouseEvent = mapTouchToMouseEvent(e, 'mouseup', touch);
      if (mouseEvent) {
        // Keep the original target for React handlers to know what was actually touched
        Object.defineProperty(mouseEvent, 'target', {
          value: dragStartElement,
          writable: false
        });
        Object.defineProperty(mouseEvent, 'currentTarget', {
          value: svgElement,
          writable: false
        });
        
        console.log('Dispatching synthetic mouseup to SVG');
        
        // Set global flag to indicate we're processing a touch event
        isProcessingTouchEvent = true;
        
        // Dispatch to the SVG where React has its listeners
        svgElement.dispatchEvent(mouseEvent);
        processedElements.add(svgElement);
        
        // Reset flag after a short timeout to handle async React processing
        setTimeout(() => {
          isProcessingTouchEvent = false;
        }, 0);
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
    console.log('🔥 Resetting state after touchend');
    isDragging = false;
    dragStartElement = null;
    dragStartTouch = null;
    currentTouchEventId = null;
    processedElements.clear();
    activeTouchSession = false; // Cerrar sesión de touch
    lastTouchStartTime = 0; // Reset timing
    lastTouchStartPosition = { x: 0, y: 0 }; // Reset position
  }, { passive: false });

  document.addEventListener('touchcancel', (e) => {
    console.log('Touch cancel detected');
    
    // Reset state en cancelación
    isDragging = false;
    dragStartElement = null;
    dragStartTouch = null;
    currentTouchEventId = null;
    processedElements.clear();
    activeTouchSession = false; // Cerrar sesión de touch
    lastTouchStartTime = 0; // Reset timing
    lastTouchStartPosition = { x: 0, y: 0 }; // Reset position
  }, { passive: false });
}
