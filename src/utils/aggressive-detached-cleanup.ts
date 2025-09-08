/**
 * AGGRESSIVE DETACHED ELEMENTS CLEANUP
 * This runs continuously and aggressively removes duplicate elements
 */

let cleanupIntervalId: number | null = null;
let isAggressiveCleanupActive = false;

// Aggressive cleanup that runs frequently
const performAggressiveCleanup = (): number => {
  let removedCount = 0;

  try {
    // 1. Remove duplicate floating toolbars (keep only the last one)
    const floatingToolbars = Array.from(document.querySelectorAll('.floating-toolbar-content'));
    if (floatingToolbars.length > 1) {
      console.log(`[Aggressive Cleanup] Found ${floatingToolbars.length} floating toolbars, removing ${floatingToolbars.length - 1}`);
      
      // Remove all but the last one
      for (let i = 0; i < floatingToolbars.length - 1; i++) {
        try {
          const toolbar = floatingToolbars[i];
          if (toolbar.parentNode) {
            toolbar.parentNode.removeChild(toolbar);
            removedCount++;
          }
        } catch (e) {
          // Ignore individual removal errors
        }
      }
    }

    // 2. Remove plugin containers that appear to be duplicates
    const pluginContainers = Array.from(document.querySelectorAll('g[data-plugin-container]'));
    const pluginGroups = new Map<string, Element[]>();
    
    // Group by plugin type
    pluginContainers.forEach(container => {
      const pluginType = container.getAttribute('data-plugin-container');
      if (pluginType) {
        if (!pluginGroups.has(pluginType)) {
          pluginGroups.set(pluginType, []);
        }
        pluginGroups.get(pluginType)!.push(container);
      }
    });

    // Remove duplicates (keep only the last one of each type)
    pluginGroups.forEach((containers, pluginType) => {
      if (containers.length > 1) {
        console.log(`[Aggressive Cleanup] Found ${containers.length} ${pluginType} containers, removing ${containers.length - 1}`);
        
        for (let i = 0; i < containers.length - 1; i++) {
          try {
            const container = containers[i];
            if (container.parentNode) {
              container.parentNode.removeChild(container);
              removedCount++;
            }
          } catch (e) {
            // Ignore individual removal errors
          }
        }
      }
    });

    // 3. Remove empty g elements that are likely detached
    const allGs = Array.from(document.querySelectorAll('g'));
    let emptyGsRemoved = 0;
    
    allGs.forEach(g => {
      try {
        // Check if g is empty and doesn't have important attributes
        const isEmpty = g.children.length === 0;
        const hasImportantAttrs = g.hasAttribute('data-element-id') || 
                                 g.hasAttribute('data-unified-element-id') ||
                                 g.hasAttribute('data-plugin-container') ||
                                 g.hasAttribute('data-selection-rect-container');
        
        if (isEmpty && !hasImportantAttrs && g.parentNode) {
          g.parentNode.removeChild(g);
          removedCount++;
          emptyGsRemoved++;
        }
      } catch (e) {
        // Ignore individual removal errors
      }
    });

    if (emptyGsRemoved > 0) {
      console.log(`[Aggressive Cleanup] Removed ${emptyGsRemoved} empty g elements`);
    }

    // 4. Clean up any portal containers
    const portals = Array.from(document.querySelectorAll('[data-floating-toolbar-portal="true"]'));
    if (portals.length > 1) {
      console.log(`[Aggressive Cleanup] Found ${portals.length} portals, removing ${portals.length - 1}`);
      
      for (let i = 0; i < portals.length - 1; i++) {
        try {
          const portal = portals[i];
          if (portal.parentNode) {
            portal.parentNode.removeChild(portal);
            removedCount++;
          }
        } catch (e) {
          // Ignore individual removal errors
        }
      }
    }

  } catch (error) {
    console.error('[Aggressive Cleanup] Error during cleanup:', error);
  }

  if (removedCount > 0) {
    console.log(`[Aggressive Cleanup] Removed ${removedCount} detached elements`);
  }

  return removedCount;
};

// Start aggressive cleanup with frequent intervals
export const startAggressiveDetachedCleanup = (intervalMs: number = 1000): void => {
  if (isAggressiveCleanupActive) {
    console.log('[Aggressive Cleanup] Already active');
    return;
  }

  console.log(`[Aggressive Cleanup] Starting aggressive cleanup every ${intervalMs}ms`);
  isAggressiveCleanupActive = true;

  // Initial cleanup
  performAggressiveCleanup();

  // Set up interval
  cleanupIntervalId = window.setInterval(() => {
    performAggressiveCleanup();
  }, intervalMs);
};

// Stop aggressive cleanup
export const stopAggressiveDetachedCleanup = (): void => {
  if (!isAggressiveCleanupActive) {
    return;
  }

  console.log('[Aggressive Cleanup] Stopping aggressive cleanup');
  isAggressiveCleanupActive = false;

  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
  }
};

// Force immediate aggressive cleanup
export const forceAggressiveCleanup = (): number => {
  console.log('[Aggressive Cleanup] Forcing immediate aggressive cleanup');
  return performAggressiveCleanup();
};

// Check if aggressive cleanup is active
export const isAggressiveCleanupActive = (): boolean => {
  return isAggressiveCleanupActive;
};

// Make available globally
if (typeof window !== 'undefined') {
  (window as any).startAggressiveDetachedCleanup = startAggressiveDetachedCleanup;
  (window as any).stopAggressiveDetachedCleanup = stopAggressiveDetachedCleanup;
  (window as any).forceAggressiveCleanup = forceAggressiveCleanup;
  (window as any).isAggressiveCleanupActive = isAggressiveCleanupActive;
}

// Auto-start in development with 1 second interval
if (process.env.NODE_ENV === 'development') {
  setTimeout(() => {
    startAggressiveDetachedCleanup(1000);
    console.log('[Aggressive Cleanup] Auto-started in development mode');
  }, 2000);
}