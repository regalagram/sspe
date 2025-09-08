/**
 * TOOLBAR SINGLETON MANAGER
 * Prevents multiple toolbar instances by managing a single reusable toolbar
 */

interface ToolbarInstance {
  element: HTMLDivElement;
  isActive: boolean;
  lastUpdate: number;
  portalContainer: HTMLElement | null;
}

class ToolbarSingletonManager {
  private static instance: ToolbarSingletonManager;
  private toolbar: ToolbarInstance | null = null;
  private cleanupTimeoutId: number | null = null;
  private recreateTimeoutId: number | null = null;
  
  private constructor() {}
  
  static getInstance(): ToolbarSingletonManager {
    if (!ToolbarSingletonManager.instance) {
      ToolbarSingletonManager.instance = new ToolbarSingletonManager();
    }
    return ToolbarSingletonManager.instance;
  }
  
  /**
   * Get or create the single toolbar instance
   */
  getToolbar(portalContainer: HTMLElement): HTMLDivElement {
    // Check if we have a valid existing toolbar (even if hidden)
    const hasValidToolbar = this.toolbar && 
                           this.toolbar.element && 
                           this.toolbar.element.parentNode;
    
    if (!hasValidToolbar) {
      console.log('[ToolbarSingleton] Creating new toolbar instance');
      // Clean up any detached toolbars before creating new one
      this.forceCleanupDetachedToolbars();
      this.createNewToolbar(portalContainer);
    } else {
      console.log('[ToolbarSingleton] Reusing existing toolbar instance');
      // Update container if needed
      if (this.toolbar!.portalContainer !== portalContainer) {
        this.moveToolbarToContainer(portalContainer);
      }
      
      // Show the toolbar again
      this.toolbar!.element.style.display = 'flex';
    }
    
    this.toolbar!.isActive = true;
    this.toolbar!.lastUpdate = Date.now();
    
    // Cancel any pending cleanup and recreate operations
    if (this.cleanupTimeoutId) {
      clearTimeout(this.cleanupTimeoutId);
      this.cleanupTimeoutId = null;
    }
    if (this.recreateTimeoutId) {
      clearTimeout(this.recreateTimeoutId);
      this.recreateTimeoutId = null;
    }
    
    return this.toolbar!.element;
  }
  
  /**
   * Create a new toolbar instance
   */
  private createNewToolbar(portalContainer: HTMLElement) {
    const element = document.createElement('div');
    element.className = 'floating-toolbar-content';
    element.setAttribute('data-singleton-toolbar', 'true');
    
    // Basic styles - will be updated by React
    element.style.cssText = `
      position: fixed;
      z-index: 40;
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 0px;
      background: white;
      padding: 0px;
      box-shadow: rgba(0, 0, 0, 0.1) 0px 4px 6px -1px, rgba(0, 0, 0, 0.06) 0px 2px 4px -1px;
      user-select: none;
      touch-action: manipulation;
      pointer-events: auto;
      overflow: visible;
      scrollbar-width: none;
      backface-visibility: hidden;
      width: fit-content;
      min-height: fit-content;
    `;
    
    portalContainer.appendChild(element);
    
    this.toolbar = {
      element,
      isActive: true,
      lastUpdate: Date.now(),
      portalContainer
    };
    
    console.log('[ToolbarSingleton] Created toolbar in container:', portalContainer);
  }
  
  /**
   * Move toolbar to a different container
   */
  private moveToolbarToContainer(newContainer: HTMLElement) {
    if (!this.toolbar) return;
    
    console.log('[ToolbarSingleton] Moving toolbar to new container');
    
    // Remove from current container
    if (this.toolbar.element.parentNode) {
      this.toolbar.element.parentNode.removeChild(this.toolbar.element);
    }
    
    // Add to new container
    newContainer.appendChild(this.toolbar.element);
    this.toolbar.portalContainer = newContainer;
  }
  
  /**
   * Mark toolbar as inactive and hide it (let React handle cleanup naturally)
   */
  hideToolbar() {
    if (!this.toolbar) return;
    
    console.log('[ToolbarSingleton] Hiding toolbar - letting React cleanup naturally');
    this.toolbar.isActive = false;
    
    // Hide immediately
    this.toolbar.element.style.display = 'none';
    
    // Cancel any pending operations
    if (this.recreateTimeoutId) {
      clearTimeout(this.recreateTimeoutId);
    }
    if (this.cleanupTimeoutId) {
      clearTimeout(this.cleanupTimeoutId);
    }
    
    // DO NOT clean aggressively - let React handle unmounting
    console.log('[ToolbarSingleton] Toolbar hidden - React will handle content cleanup');
  }
  
  /**
   * Aggressively clean all references from child elements only
   */
  private aggressivelyCleanElement(element: HTMLElement) {
    // Get all child elements (not the container itself)
    const childElements = [...element.querySelectorAll('*')];
    
    console.log(`[ToolbarSingleton] Aggressively cleaning ${childElements.length} child elements`);
    
    childElements.forEach((el) => {
      try {
        // Clear all properties that might hold references
        if ('onclick' in el) (el as any).onclick = null;
        if ('onpointerdown' in el) (el as any).onpointerdown = null;
        if ('onpointerup' in el) (el as any).onpointerup = null;
        if ('onpointermove' in el) (el as any).onpointermove = null;
        if ('onmousedown' in el) (el as any).onmousedown = null;
        if ('onmouseup' in el) (el as any).onmouseup = null;
        if ('onmousemove' in el) (el as any).onmousemove = null;
        if ('onchange' in el) (el as any).onchange = null;
        if ('oninput' in el) (el as any).oninput = null;
        
        // Clear React fiber references if they exist
        const reactKeys = Object.keys(el).filter(key => key.startsWith('__react'));
        reactKeys.forEach(key => {
          try {
            delete (el as any)[key];
          } catch (e) {
            // Ignore deletion errors
          }
        });
        
      } catch (e) {
        // Ignore cleanup errors for individual elements
      }
    });
  }
  
  /**
   * Recreate the toolbar element to force React to unmount all components
   */
  private recreateToolbarElement() {
    if (!this.toolbar) return;
    
    const container = this.toolbar.portalContainer;
    if (!container) return;
    
    const oldElement = this.toolbar.element;
    
    // Aggressively clean the old element before removing it
    console.log('[ToolbarSingleton] Aggressively cleaning old element before removal');
    this.aggressivelyCleanElement(oldElement);
    
    // Remove the old element (this forces React to unmount everything)
    container.removeChild(oldElement);
    
    // Create a new element with the same attributes
    const newElement = document.createElement('div');
    newElement.className = 'floating-toolbar-content';
    newElement.setAttribute('data-singleton-toolbar', 'true');
    
    // Apply the same base styles
    Object.assign(newElement.style, {
      position: 'fixed',
      zIndex: '40',
      display: 'none',
      flexDirection: 'row',
      alignItems: 'center',
      gap: '0px',
      background: 'white',
      padding: '0px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      userSelect: 'none',
      touchAction: 'manipulation',
      pointerEvents: 'auto',
      overflow: 'visible',
      scrollbarWidth: 'none',
      backfaceVisibility: 'hidden',
      width: 'fit-content',
      minHeight: 'fit-content'
    });
    
    // Add to container
    container.appendChild(newElement);
    
    // Update the toolbar reference
    this.toolbar.element = newElement;
    
    console.log('[ToolbarSingleton] Element recreated successfully');
  }
  
  /**
   * Update toolbar content and styles
   */
  updateToolbar(content: string, styles: Partial<CSSStyleDeclaration>) {
    if (!this.toolbar) return;
    
    // Update content
    this.toolbar.element.innerHTML = content;
    
    // Update styles
    Object.assign(this.toolbar.element.style, styles);
    
    // Show toolbar
    this.toolbar.element.style.display = 'flex';
    
    this.toolbar.lastUpdate = Date.now();
    console.log('[ToolbarSingleton] Updated toolbar content and styles');
  }
  
  /**
   * Force cleanup of detached toolbars in the DOM
   */
  forceCleanupDetachedToolbars() {
    // Get ALL floating toolbars, including singleton ones that might be detached
    const allToolbars = document.querySelectorAll('.floating-toolbar-content');
    console.log(`[ToolbarSingleton] Found ${allToolbars.length} floating toolbars to evaluate`);
    
    let cleanedCount = 0;
    
    allToolbars.forEach(toolbar => {
      // Keep only the one that is currently managed by this singleton
      const isCurrentlyManaged = this.toolbar && 
                                 this.toolbar.element === toolbar &&
                                 this.toolbar.isActive;
      
      if (!isCurrentlyManaged) {
        try {
          if (toolbar.parentNode) {
            toolbar.parentNode.removeChild(toolbar);
            cleanedCount++;
            console.log('[ToolbarSingleton] Removed detached/inactive toolbar:', toolbar);
          }
        } catch (e) {
          // Ignore removal errors
        }
      }
    });
    
    console.log(`[ToolbarSingleton] Cleaned up ${cleanedCount} detached/inactive toolbars`);
  }
  
  /**
   * Clean up inactive toolbar
   */
  private cleanupInactiveToolbar() {
    if (!this.toolbar || this.toolbar.isActive) return;
    
    console.log('[ToolbarSingleton] Cleaning up inactive toolbar');
    
    try {
      if (this.toolbar.element.parentNode) {
        this.toolbar.element.parentNode.removeChild(this.toolbar.element);
      }
    } catch (e) {
      console.error('[ToolbarSingleton] Error removing toolbar:', e);
    }
    
    this.toolbar = null;
    this.cleanupTimeoutId = null;
  }
  
  /**
   * Force immediate cleanup
   */
  forceCleanup() {
    console.log('[ToolbarSingleton] Force cleanup');
    
    if (this.cleanupTimeoutId) {
      clearTimeout(this.cleanupTimeoutId);
      this.cleanupTimeoutId = null;
    }
    if (this.recreateTimeoutId) {
      clearTimeout(this.recreateTimeoutId);
      this.recreateTimeoutId = null;
    }
    
    if (this.toolbar) {
      try {
        if (this.toolbar.element.parentNode) {
          this.toolbar.element.parentNode.removeChild(this.toolbar.element);
        }
      } catch (e) {
        // Ignore removal errors
      }
      this.toolbar = null;
    }
    
    // Clean up any remaining detached toolbars
    this.forceCleanupDetachedToolbars();
  }
  
  /**
   * Get current toolbar status
   */
  getStatus() {
    return {
      hasToolbar: !!this.toolbar,
      isActive: this.toolbar?.isActive || false,
      lastUpdate: this.toolbar?.lastUpdate || 0,
      elementExists: !!(this.toolbar?.element.parentNode)
    };
  }
}

// Singleton instance
export const toolbarSingletonManager = ToolbarSingletonManager.getInstance();

// Global cleanup function
export const forceCleanupAllToolbars = () => {
  toolbarSingletonManager.forceCleanup();
  
  // Also clean up any remaining toolbars not managed by singleton
  const allToolbars = document.querySelectorAll('.floating-toolbar-content');
  console.log(`[Global Cleanup] Found ${allToolbars.length} total toolbars, cleaning up`);
  
  allToolbars.forEach(toolbar => {
    try {
      if (toolbar.parentNode) {
        toolbar.parentNode.removeChild(toolbar);
      }
    } catch (e) {
      // Ignore removal errors
    }
  });
};

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).toolbarSingletonManager = toolbarSingletonManager;
  (window as any).forceCleanupAllToolbars = forceCleanupAllToolbars;
  
  console.log('[ToolbarSingleton] Global functions available:');
  console.log('- toolbarSingletonManager.getStatus()');
  console.log('- toolbarSingletonManager.forceCleanup()');
  console.log('- forceCleanupAllToolbars()');
}