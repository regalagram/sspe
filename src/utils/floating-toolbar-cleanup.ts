/**
 * COMPREHENSIVE FLOATING TOOLBAR CLEANUP
 * Handles cleanup of floating toolbars with all their complex components:
 * - Main toolbar content
 * - Overflow menus
 * - Submenus and dropdowns
 * - Complex references (colors, gradients, patterns, opacity)
 * - Event listeners and React references
 */

// Track all toolbar-related elements for proper cleanup
interface ToolbarElementTracker {
  mainToolbars: Set<Element>;
  overflowMenus: Set<Element>;
  submenus: Set<Element>;
  dropdowns: Set<Element>;
  colorPickers: Set<Element>;
  gradientSelectors: Set<Element>;
  patternSelectors: Set<Element>;
  opacitySliders: Set<Element>;
  portalContainers: Set<Element>;
  eventListeners: Map<Element, Array<{type: string, handler: EventListener}>>;
}

const toolbarTracker: ToolbarElementTracker = {
  mainToolbars: new Set(),
  overflowMenus: new Set(),
  submenus: new Set(),
  dropdowns: new Set(),
  colorPickers: new Set(),
  gradientSelectors: new Set(),
  patternSelectors: new Set(),
  opacitySliders: new Set(),
  portalContainers: new Set(),
  eventListeners: new Map()
};

// Enhanced element removal that handles complex references
const removeElementWithReferences = (element: Element): void => {
  try {
    // 1. Remove all tracked event listeners
    const listeners = toolbarTracker.eventListeners.get(element);
    if (listeners) {
      listeners.forEach(({type, handler}) => {
        try {
          element.removeEventListener(type, handler);
        } catch (e) {
          // Ignore cleanup errors
        }
      });
      toolbarTracker.eventListeners.delete(element);
    }

    // 2. Clean up React references
    if ((element as any)._reactInternalInstance) {
      (element as any)._reactInternalInstance = null;
    }
    if ((element as any).__reactInternalInstance) {
      (element as any).__reactInternalInstance = null;
    }
    if ((element as any)._reactInternalFiber) {
      (element as any)._reactInternalFiber = null;
    }

    // 3. Clear custom properties that might hold references
    const customProps = [
      'onPointerDown', 'onPointerMove', 'onPointerUp', 'onPointerEnter', 'onPointerLeave',
      'onClick', 'onMouseDown', 'onMouseMove', 'onMouseUp', 'onMouseEnter', 'onMouseLeave',
      'onTouchStart', 'onTouchMove', 'onTouchEnd',
      'onFocus', 'onBlur', 'onChange', 'onInput'
    ];
    
    customProps.forEach(prop => {
      if ((element as any)[prop]) {
        (element as any)[prop] = null;
      }
    });

    // 4. Clear data attributes that might hold references
    const dataAttributes = [
      'data-toolbar-action', 'data-submenu-id', 'data-dropdown-id',
      'data-color-value', 'data-gradient-id', 'data-pattern-id', 'data-opacity-value'
    ];
    
    dataAttributes.forEach(attr => {
      if (element.hasAttribute(attr)) {
        element.removeAttribute(attr);
      }
    });

    // 5. Remove from DOM
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }

    console.log('[FloatingToolbar Cleanup] Properly removed element with references:', element);
  } catch (error) {
    console.error('[FloatingToolbar Cleanup] Error removing element:', error);
  }
};

// Find and catalog all floating toolbar related elements
export const catalogFloatingToolbarElements = (): void => {
  console.log('[FloatingToolbar Cleanup] Cataloging all toolbar elements...');

  // Clear existing tracking
  Object.values(toolbarTracker).forEach(set => {
    if (set instanceof Set) {
      set.clear();
    } else if (set instanceof Map) {
      set.clear();
    }
  });

  try {
    // Main floating toolbar content
    document.querySelectorAll('.floating-toolbar-content').forEach(el => {
      toolbarTracker.mainToolbars.add(el);
    });

    // Portal containers
    document.querySelectorAll('[data-floating-toolbar-portal="true"]').forEach(el => {
      toolbarTracker.portalContainers.add(el);
    });

    // Overflow menus (positioned absolute with specific styles)
    document.querySelectorAll('div[style*="position: absolute"][style*="background: white"][style*="box-shadow"]').forEach(el => {
      // Check if it's inside a floating toolbar
      if (el.closest('.floating-toolbar-content')) {
        toolbarTracker.overflowMenus.add(el);
      }
    });

    // Submenus and dropdowns
    document.querySelectorAll('[data-submenu="true"], [data-dropdown="true"]').forEach(el => {
      toolbarTracker.submenus.add(el);
    });

    // Color-related elements
    document.querySelectorAll('[data-color-picker="true"], .color-swatch, .color-grid').forEach(el => {
      if (el.closest('.floating-toolbar-content')) {
        toolbarTracker.colorPickers.add(el);
      }
    });

    // Gradient selectors
    document.querySelectorAll('[data-gradient-selector="true"], .gradient-preview').forEach(el => {
      if (el.closest('.floating-toolbar-content')) {
        toolbarTracker.gradientSelectors.add(el);
      }
    });

    // Pattern selectors
    document.querySelectorAll('[data-pattern-selector="true"], .pattern-preview').forEach(el => {
      if (el.closest('.floating-toolbar-content')) {
        toolbarTracker.patternSelectors.add(el);
      }
    });

    // Opacity sliders and controls
    document.querySelectorAll('input[type="range"], .opacity-slider, [data-opacity-control="true"]').forEach(el => {
      if (el.closest('.floating-toolbar-content')) {
        toolbarTracker.opacitySliders.add(el);
      }
    });

  } catch (error) {
    console.error('[FloatingToolbar Cleanup] Error during cataloging:', error);
  }

  const totalElements = Array.from(Object.values(toolbarTracker)).reduce((sum, collection) => {
    return sum + (collection instanceof Set ? collection.size : collection.size);
  }, 0);

  console.log('[FloatingToolbar Cleanup] Cataloged elements:', {
    mainToolbars: toolbarTracker.mainToolbars.size,
    portalContainers: toolbarTracker.portalContainers.size,
    overflowMenus: toolbarTracker.overflowMenus.size,
    submenus: toolbarTracker.submenus.size,
    colorPickers: toolbarTracker.colorPickers.size,
    gradientSelectors: toolbarTracker.gradientSelectors.size,
    patternSelectors: toolbarTracker.patternSelectors.size,
    opacitySliders: toolbarTracker.opacitySliders.size,
    total: totalElements
  });
};

// Comprehensive cleanup of all floating toolbar elements
export const comprehensiveFloatingToolbarCleanup = (): number => {
  console.log('[FloatingToolbar Cleanup] Starting comprehensive cleanup...');
  
  // First catalog everything
  catalogFloatingToolbarElements();
  
  let cleanedCount = 0;

  try {
    // 1. Clean up complex elements first (they might have more references)
    console.log('[FloatingToolbar Cleanup] Cleaning complex elements...');
    
    // Color pickers (might have canvas elements, event handlers for color selection)
    toolbarTracker.colorPickers.forEach(el => {
      removeElementWithReferences(el);
      cleanedCount++;
    });

    // Gradient selectors (might have canvas, drag handlers)
    toolbarTracker.gradientSelectors.forEach(el => {
      removeElementWithReferences(el);
      cleanedCount++;
    });

    // Pattern selectors (might have canvas, image references)
    toolbarTracker.patternSelectors.forEach(el => {
      removeElementWithReferences(el);
      cleanedCount++;
    });

    // Opacity sliders (input elements with change handlers)
    toolbarTracker.opacitySliders.forEach(el => {
      removeElementWithReferences(el);
      cleanedCount++;
    });

    // 2. Clean up menus and submenus
    console.log('[FloatingToolbar Cleanup] Cleaning menus and submenus...');
    
    toolbarTracker.submenus.forEach(el => {
      removeElementWithReferences(el);
      cleanedCount++;
    });

    toolbarTracker.overflowMenus.forEach(el => {
      removeElementWithReferences(el);
      cleanedCount++;
    });

    // 3. Clean up main toolbars
    console.log('[FloatingToolbar Cleanup] Cleaning main toolbars...');
    
    toolbarTracker.mainToolbars.forEach(el => {
      removeElementWithReferences(el);
      cleanedCount++;
    });

    // 4. Clean up portal containers last
    console.log('[FloatingToolbar Cleanup] Cleaning portal containers...');
    
    toolbarTracker.portalContainers.forEach(el => {
      removeElementWithReferences(el);
      cleanedCount++;
    });

    // 5. Emergency cleanup - remove any remaining floating toolbar elements
    console.log('[FloatingToolbar Cleanup] Emergency cleanup of remaining elements...');
    
    const emergencySelectors = [
      '.floating-toolbar-content',
      '[data-floating-toolbar-portal="true"]',
      '.floating-toolbar-portal-container',
      'div[style*="z-index: 40"]', // Common z-index for floating elements
      'div[style*="z-index: 41"]', // Overflow menus
    ];

    emergencySelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        try {
          removeElementWithReferences(el);
          cleanedCount++;
        } catch (e) {
          // Ignore cleanup errors in emergency phase
        }
      });
    });

    // 6. Force garbage collection if available
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc();
      console.log('[FloatingToolbar Cleanup] Forced garbage collection');
    }

  } catch (error) {
    console.error('[FloatingToolbar Cleanup] Error during comprehensive cleanup:', error);
  }

  console.log(`[FloatingToolbar Cleanup] Comprehensive cleanup completed - removed ${cleanedCount} elements`);
  return cleanedCount;
};

// Track event listener for proper cleanup
export const trackToolbarEventListener = (element: Element, type: string, handler: EventListener): void => {
  if (!toolbarTracker.eventListeners.has(element)) {
    toolbarTracker.eventListeners.set(element, []);
  }
  toolbarTracker.eventListeners.get(element)!.push({type, handler});
};

// Cleanup specific to toolbar overflow menus
export const cleanupToolbarOverflow = (): number => {
  console.log('[FloatingToolbar Cleanup] Cleaning up overflow menus...');
  let cleaned = 0;

  // Find overflow menus by their characteristic styles
  const overflowSelectors = [
    'div[style*="position: absolute"][style*="top:"][style*="right: 0"]',
    'div[style*="position: absolute"][style*="background: white"][style*="box-shadow"]'
  ];

  overflowSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      // Verify it's actually a toolbar overflow menu
      if (el.closest('.floating-toolbar-content') || 
          el.parentElement?.classList.contains('floating-toolbar-content')) {
        removeElementWithReferences(el);
        cleaned++;
      }
    });
  });

  console.log(`[FloatingToolbar Cleanup] Cleaned ${cleaned} overflow menus`);
  return cleaned;
};

// Make available globally
if (typeof window !== 'undefined') {
  (window as any).comprehensiveFloatingToolbarCleanup = comprehensiveFloatingToolbarCleanup;
  (window as any).catalogFloatingToolbarElements = catalogFloatingToolbarElements;
  (window as any).cleanupToolbarOverflow = cleanupToolbarOverflow;
}