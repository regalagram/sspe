/**
 * DEEP EVENT CLEANUP UTILITY
 * 
 * This utility provides safe event and reference cleanup for React components
 * to prevent memory leaks and detached DOM elements without interfering with
 * React's unmounting process.
 * 
 * CRITICAL: This approach ONLY cleans events and references, never touches
 * the DOM structure, allowing React to unmount components normally.
 */

/**
 * Performs deep event listener cleanup on an element and all its children
 * This removes event listeners and references that cause memory leaks 
 * without interfering with React's unmounting process
 * 
 * @param rootElement - The root element to clean (usually a container)
 * @param options - Cleanup options
 */
export const performDeepEventCleanup = (
  rootElement: HTMLElement,
  options: {
    logProgress?: boolean;
    includeRootElement?: boolean;
  } = {}
) => {
  const { logProgress = true, includeRootElement = false } = options;
  
  if (logProgress) {
    console.log('[Deep Event Cleanup] Starting event-only cleanup - preserving DOM structure');
  }
  
  // Get ALL child elements (and optionally root element)
  const selector = includeRootElement ? '*' : ':scope > *';
  const elementsToClean = includeRootElement 
    ? [rootElement, ...rootElement.querySelectorAll('*')]
    : [...rootElement.querySelectorAll('*')];
  
  if (logProgress) {
    console.log(`[Deep Event Cleanup] Found ${elementsToClean.length} elements for event cleanup`);
  }
  
  // Clean only events and references, never touch DOM structure
  elementsToClean.forEach((element, index) => {
    try {
      if (logProgress && elementsToClean.length > 10 && index % 10 === 0) {
        console.log(`[Deep Event Cleanup] Processing element ${index + 1}/${elementsToClean.length}`);
      }
      
      cleanElementEvents(element);
      
    } catch (error) {
      if (logProgress) {
        console.warn(`[Deep Event Cleanup] Error cleaning events on element ${index}:`, error);
      }
    }
  });
  
  if (logProgress) {
    console.log('[Deep Event Cleanup] Completed event cleanup - DOM structure fully preserved for React');
  }
};

/**
 * Clean events and references from a single element
 * @param element - The element to clean
 */
const cleanElementEvents = (element: Element) => {
  // Clear all possible event handler properties (these don't affect DOM structure)
  const eventProps = [
    // Pointer events (modern)
    'onpointerdown', 'onpointerup', 'onpointermove', 'onpointerenter', 'onpointerleave', 'onpointerover', 'onpointerout', 'onpointercancel',
    
    // Mouse events (legacy)
    'onmousedown', 'onmouseup', 'onmousemove', 'onmouseenter', 'onmouseleave', 'onmouseover', 'onmouseout', 'onclick', 'ondblclick', 'oncontextmenu',
    
    // Touch events (mobile)
    'ontouchstart', 'ontouchend', 'ontouchmove', 'ontouchcancel',
    
    // Form events
    'onchange', 'oninput', 'onsubmit', 'onfocus', 'onblur', 'onselect', 'onreset',
    
    // Keyboard events
    'onkeydown', 'onkeyup', 'onkeypress',
    
    // UI events
    'onwheel', 'onscroll', 'onresize', 'onload', 'onerror', 'onabort',
    
    // Drag events
    'ondrag', 'ondragstart', 'ondragend', 'ondragover', 'ondragenter', 'ondragleave', 'ondrop',
    
    // Media events
    'onplay', 'onpause', 'onended', 'onvolumechange', 'ontimeupdate'
  ];
  
  eventProps.forEach(prop => {
    if (prop in element) {
      try {
        (element as any)[prop] = null;
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });
  
  // Clear React fiber references (these are just properties, don't affect DOM)
  const elementKeys = Object.getOwnPropertyNames(element);
  elementKeys.forEach(key => {
    if (key.startsWith('__react') || key.startsWith('_react') || key.includes('fiber') || key.includes('Fiber')) {
      try {
        delete (element as any)[key];
      } catch (e) {
        try {
          (element as any)[key] = null;
        } catch (e2) {
          // Ignore cleanup errors
        }
      }
    }
  });
  
  // Clear custom event/handler properties (not DOM related)
  try {
    if ('_handlers' in element) delete (element as any)._handlers;
    if ('_listeners' in element) delete (element as any)._listeners;
    if ('_events' in element) delete (element as any)._events;
    if ('_reactInternalFiber' in element) delete (element as any)._reactInternalFiber;
    if ('_reactInternalInstance' in element) delete (element as any)._reactInternalInstance;
    if ('__reactEventHandlers' in element) delete (element as any).__reactEventHandlers;
  } catch (e) {
    // Ignore cleanup errors
  }
  
  // Remove React data attributes (these are safe to remove)
  try {
    const attributes = [...element.attributes];
    attributes.forEach(attr => {
      if (attr.name.startsWith('data-react') || attr.name.includes('fiber') || attr.name.includes('Fiber')) {
        element.removeAttribute(attr.name);
      }
    });
  } catch (e) {
    // Ignore cleanup errors
  }
};

/**
 * Create a cleanup function that can be called in React useEffect cleanup
 * @param elementRef - Ref to the element to clean
 * @param options - Cleanup options
 * @returns Cleanup function for useEffect
 */
export const createEventCleanupFunction = (
  elementRef: React.RefObject<HTMLElement> | (() => HTMLElement | null),
  options?: Parameters<typeof performDeepEventCleanup>[1]
) => {
  return () => {
    const element = typeof elementRef === 'function' ? elementRef() : elementRef.current;
    if (element) {
      performDeepEventCleanup(element, options);
    }
  };
};

/**
 * Hook for automatic event cleanup on component unmount
 * @param elementRef - Ref to the element to clean
 * @param options - Cleanup options
 */
export const useEventCleanup = (
  elementRef: React.RefObject<HTMLElement> | (() => HTMLElement | null),
  options?: Parameters<typeof performDeepEventCleanup>[1]
) => {
  React.useEffect(() => {
    return createEventCleanupFunction(elementRef, options);
  }, []);
};

// Re-export for backward compatibility
export { performDeepEventCleanup as performDeepPreUnmountCleaning };