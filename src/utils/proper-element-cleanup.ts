/**
 * PROPER ELEMENT CLEANUP - Prevents Detached Elements
 * 
 * This addresses the root cause of detached elements: improper cleanup
 * that leaves event listeners and references attached when removing elements.
 */

// Store references to track all managed elements
const managedElements = new WeakMap<Element, ElementCleanupInfo>();
const elementEventListeners = new WeakMap<Element, Array<{
  type: string;
  listener: EventListenerOrEventListenerObject;
  options?: boolean | AddEventListenerOptions;
}>>();

interface ElementCleanupInfo {
  id?: string;
  type: 'floating-toolbar' | 'selection-rect' | 'overflow-menu' | 'submenu' | 'generic';
  parentComponent?: string;
  reactFiberKey?: string;
  createdAt: number;
}

/**
 * Register an element for proper cleanup tracking
 */
export const registerElementForCleanup = (
  element: Element,
  info: Omit<ElementCleanupInfo, 'createdAt'>
): void => {
  const cleanupInfo: ElementCleanupInfo = {
    ...info,
    createdAt: Date.now()
  };
  
  managedElements.set(element, cleanupInfo);
  console.log(`[Proper Cleanup] Registered ${info.type} element:`, element);
};

/**
 * Track event listeners added to elements
 */
export const trackEventListener = (
  element: Element,
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions
): void => {
  if (!elementEventListeners.has(element)) {
    elementEventListeners.set(element, []);
  }
  
  elementEventListeners.get(element)!.push({ type, listener, options });
  console.log(`[Proper Cleanup] Tracked event listener ${type} on:`, element);
};

/**
 * Enhanced addEventListener that automatically tracks listeners
 */
export const addTrackedEventListener = (
  element: Element,
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions
): void => {
  element.addEventListener(type, listener, options);
  trackEventListener(element, type, listener, options);
};

/**
 * Clean up all references and event listeners for an element
 */
const cleanupElementReferences = (element: Element): void => {
  // 1. Remove all tracked event listeners
  const listeners = elementEventListeners.get(element);
  if (listeners) {
    listeners.forEach(({ type, listener, options }) => {
      try {
        element.removeEventListener(type, listener, options);
      } catch (e) {
        // Ignore removal errors
      }
    });
    elementEventListeners.delete(element);
    console.log(`[Proper Cleanup] Removed ${listeners.length} event listeners from element`);
  }

  // 2. Clear React fiber references if they exist
  const reactFiberKey = Object.keys(element).find(key => 
    key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance')
  );
  
  if (reactFiberKey) {
    try {
      delete (element as any)[reactFiberKey];
      console.log('[Proper Cleanup] Cleared React fiber reference');
    } catch (e) {
      // Ignore if can't delete
    }
  }

  // 3. Clear React props references
  const reactPropsKey = Object.keys(element).find(key => 
    key.startsWith('__reactProps')
  );
  
  if (reactPropsKey) {
    try {
      delete (element as any)[reactPropsKey];
      console.log('[Proper Cleanup] Cleared React props reference');
    } catch (e) {
      // Ignore if can't delete
    }
  }

  // 4. Clear any custom properties that might hold references
  const customProps = ['_reactListening', '_valueTracker', '__reactInternalMemoizedMaskedChildContext'];
  customProps.forEach(prop => {
    if ((element as any)[prop]) {
      try {
        delete (element as any)[prop];
      } catch (e) {
        // Ignore if can't delete
      }
    }
  });

  // 5. Clear data attributes that might hold references
  if (element instanceof HTMLElement || element instanceof SVGElement) {
    // Clear any data-* attributes that might hold object references
    const dataAttrs = Array.from(element.attributes).filter(attr => 
      attr.name.startsWith('data-') && 
      (attr.value.includes('{') || attr.value.includes('['))
    );
    
    dataAttrs.forEach(attr => {
      try {
        element.removeAttribute(attr.name);
      } catch (e) {
        // Ignore removal errors
      }
    });
  }

  // 6. Clear any onXXX properties (event handlers set as properties)
  const eventProps = Object.getOwnPropertyNames(element).filter(prop => 
    prop.startsWith('on') && typeof (element as any)[prop] === 'function'
  );
  
  eventProps.forEach(prop => {
    try {
      (element as any)[prop] = null;
    } catch (e) {
      // Ignore if can't set
    }
  });

  // 7. Remove from managed elements tracking
  managedElements.delete(element);
};

/**
 * Properly remove an element from the DOM with complete cleanup
 */
export const removeElementProperly = (element: Element): boolean => {
  if (!element || !element.parentNode) {
    return false;
  }

  const info = managedElements.get(element);
  console.log(`[Proper Cleanup] Starting proper removal of ${info?.type || 'unknown'} element:`, element);

  try {
    // 1. Clean up all child elements recursively
    const allChildren = element.querySelectorAll('*');
    allChildren.forEach(child => {
      cleanupElementReferences(child);
    });

    // 2. Clean up the element itself
    cleanupElementReferences(element);

    // 3. Remove from DOM
    element.parentNode.removeChild(element);

    // 4. Clear any remaining references
    setTimeout(() => {
      // Force garbage collection if available (development only)
      if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && (window as any).gc) {
        (window as any).gc();
      }
    }, 100);

    console.log(`[Proper Cleanup] Successfully removed ${info?.type || 'unknown'} element`);
    return true;
  } catch (error) {
    console.error('[Proper Cleanup] Error during proper removal:', error);
    return false;
  }
};

/**
 * Batch remove multiple elements with proper cleanup
 */
export const removeElementsProperly = (elements: Element[]): number => {
  let removedCount = 0;
  
  elements.forEach(element => {
    if (removeElementProperly(element)) {
      removedCount++;
    }
  });

  console.log(`[Proper Cleanup] Batch removed ${removedCount}/${elements.length} elements`);
  return removedCount;
};

/**
 * Clean up all floating toolbar elements with proper reference cleanup
 */
export const cleanupFloatingToolbarsProperly = (): number => {
  console.log('[Proper Cleanup] Starting comprehensive floating toolbar cleanup...');
  
  const elementsToRemove: Element[] = [];

  // 1. Main floating toolbar elements
  const floatingToolbars = Array.from(document.querySelectorAll('.floating-toolbar-content'));
  elementsToRemove.push(...floatingToolbars);

  // 2. Portal containers
  const portals = Array.from(document.querySelectorAll('[data-floating-toolbar-portal="true"]'));
  elementsToRemove.push(...portals);

  // 3. Overflow menus
  const overflowMenus = Array.from(document.querySelectorAll('div[style*="position: absolute"][style*="background: white"][style*="box-shadow"]')).filter(menu => {
    const isToolbarOverflow = menu.parentElement?.classList.contains('floating-toolbar-content') ||
                             menu.closest('.floating-toolbar-content') ||
                             (menu as HTMLElement).style.zIndex === '41';
    return isToolbarOverflow;
  });
  elementsToRemove.push(...overflowMenus);

  // 4. Any elements with floating toolbar z-index
  const floatingElements = Array.from(document.querySelectorAll('[style*="z-index: 40"], [style*="z-index: 41"]')).filter(element => {
    const isFloatingToolbar = element.classList.contains('floating-toolbar-content') ||
                             element.hasAttribute('data-floating-toolbar-portal') ||
                             element.closest('.floating-toolbar-content');
    return isFloatingToolbar;
  });
  elementsToRemove.push(...floatingElements);

  // Remove duplicates
  const uniqueElements = Array.from(new Set(elementsToRemove));
  
  return removeElementsProperly(uniqueElements);
};

/**
 * Clean up selection rectangles with proper reference cleanup
 */
export const cleanupSelectionRectsProperly = (): number => {
  console.log('[Proper Cleanup] Starting selection rectangle cleanup...');
  
  // Find selection rectangles - they're usually rect elements with specific attributes
  const selectionRects = Array.from(document.querySelectorAll('rect[data-selection-rect], rect[stroke-dasharray]')).filter(rect => {
    // Additional checks to ensure it's a selection rect
    const hasSelectionClass = rect.classList.contains('selection-rect') || 
                             rect.getAttribute('data-element-type') === 'selection-rect';
    const hasSelectionStyling = rect.getAttribute('stroke-dasharray') && 
                               rect.getAttribute('fill') === 'none';
    return hasSelectionClass || hasSelectionStyling;
  });

  return removeElementsProperly(selectionRects);
};

/**
 * Global cleanup function for all managed elements
 */
export const performProperCleanup = (): number => {
  console.log('[Proper Cleanup] Performing comprehensive cleanup...');
  
  let totalRemoved = 0;
  
  totalRemoved += cleanupFloatingToolbarsProperly();
  totalRemoved += cleanupSelectionRectsProperly();
  
  console.log(`[Proper Cleanup] Total elements properly removed: ${totalRemoved}`);
  return totalRemoved;
};

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).removeElementProperly = removeElementProperly;
  (window as any).performProperCleanup = performProperCleanup;
  (window as any).cleanupFloatingToolbarsProperly = cleanupFloatingToolbarsProperly;
  (window as any).cleanupSelectionRectsProperly = cleanupSelectionRectsProperly;
  
  console.log('[Proper Cleanup] Global cleanup functions available:');
  console.log('- removeElementProperly(element)');
  console.log('- performProperCleanup()');
  console.log('- cleanupFloatingToolbarsProperly()');
  console.log('- cleanupSelectionRectsProperly()');
}