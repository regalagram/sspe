/**
 * SIMPLE BUT ROBUST FLOATING TOOLBAR CLEANUP
 * Comprehensive cleanup for floating toolbars and all their components
 */

// Simple but effective cleanup function for floating toolbars
export const cleanupFloatingToolbar = (): number => {
  console.log('[FloatingToolbar Simple Cleanup] Starting comprehensive cleanup...');
  let removedCount = 0;

  try {
    // Wait a tick to allow React to finish any pending operations
    setTimeout(() => {
      // Force garbage collection after cleanup completes
      if (typeof window !== 'undefined' && (window as any).gc) {
        (window as any).gc();
      }
    }, 0);
    // 1. Main floating toolbar elements
    const floatingToolbars = document.querySelectorAll('.floating-toolbar-content');
    console.log(`[FloatingToolbar Simple Cleanup] Found ${floatingToolbars.length} main toolbars`);
    
    floatingToolbars.forEach(toolbar => {
      try {
        // Additional safety check - don't remove if it's actively being rendered
        const isActivelyRendered = toolbar.children.length > 0 && 
                                  toolbar.getBoundingClientRect().width > 0;
        
        if (toolbar.parentNode && !isActivelyRendered) {
          toolbar.parentNode.removeChild(toolbar);
          removedCount++;
        } else if (isActivelyRendered) {
          console.log('[FloatingToolbar Simple Cleanup] Skipping actively rendered toolbar');
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    });

    // 2. Portal containers
    const portals = document.querySelectorAll('[data-floating-toolbar-portal="true"]');
    console.log(`[FloatingToolbar Simple Cleanup] Found ${portals.length} portal containers`);
    
    portals.forEach(portal => {
      try {
        if (portal.parentNode) {
          portal.parentNode.removeChild(portal);
          removedCount++;
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    });

    // 3. Overflow menus (positioned absolute with specific characteristics)
    const overflowMenus = document.querySelectorAll('div[style*="position: absolute"][style*="background: white"][style*="box-shadow"]');
    console.log(`[FloatingToolbar Simple Cleanup] Found ${overflowMenus.length} potential overflow menus`);
    
    overflowMenus.forEach(menu => {
      try {
        // Only remove if it's a toolbar overflow menu
        const isToolbarOverflow = menu.parentElement?.classList.contains('floating-toolbar-content') ||
                                 menu.closest('.floating-toolbar-content') ||
                                 (menu as HTMLElement).style.zIndex === '41';
        
        if (isToolbarOverflow && menu.parentNode) {
          menu.parentNode.removeChild(menu);
          removedCount++;
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    });

    // 4. Any elements with floating toolbar z-index
    const floatingElements = document.querySelectorAll('[style*="z-index: 40"], [style*="z-index: 41"]');
    console.log(`[FloatingToolbar Simple Cleanup] Found ${floatingElements.length} elements with floating z-index`);
    
    floatingElements.forEach(element => {
      try {
        // Check if it's a floating toolbar related element
        const isFloatingToolbar = element.classList.contains('floating-toolbar-content') ||
                                 element.hasAttribute('data-floating-toolbar-portal') ||
                                 element.closest('.floating-toolbar-content');
        
        if (isFloatingToolbar && element.parentNode) {
          element.parentNode.removeChild(element);
          removedCount++;
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    });

    // 5. Clean up any remaining floating toolbar portal containers
    const remainingPortals = document.querySelectorAll('.floating-toolbar-portal-container');
    console.log(`[FloatingToolbar Simple Cleanup] Found ${remainingPortals.length} remaining portal containers`);
    
    remainingPortals.forEach(container => {
      try {
        if (container.parentNode) {
          container.parentNode.removeChild(container);
          removedCount++;
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    });

    // 6. Force garbage collection if available
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc();
      console.log('[FloatingToolbar Simple Cleanup] Forced garbage collection');
    }

  } catch (error) {
    console.error('[FloatingToolbar Simple Cleanup] Error during cleanup:', error);
  }

  console.log(`[FloatingToolbar Simple Cleanup] Completed - removed ${removedCount} elements`);
  return removedCount;
};

// Make available globally
if (typeof window !== 'undefined') {
  (window as any).cleanupFloatingToolbar = cleanupFloatingToolbar;
}