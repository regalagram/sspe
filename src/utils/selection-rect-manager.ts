/**
 * SELECTION RECTANGLE SINGLETON MANAGER
 * Prevents multiple selection rectangle instances
 */

interface SelectionRectInstance {
  element: SVGRectElement;
  container: SVGGElement;
  isActive: boolean;
  lastUpdate: number;
  currentRect: { x: number; y: number; width: number; height: number } | null;
}

class SelectionRectSingletonManager {
  private static instance: SelectionRectSingletonManager;
  private selectionRect: SelectionRectInstance | null = null;
  private cleanupTimeoutId: number | null = null;
  
  private constructor() {}
  
  static getInstance(): SelectionRectSingletonManager {
    if (!SelectionRectSingletonManager.instance) {
      SelectionRectSingletonManager.instance = new SelectionRectSingletonManager();
    }
    return SelectionRectSingletonManager.instance;
  }
  
  /**
   * Get or create the single selection rectangle instance
   */
  getSelectionRect(container: SVGGElement): SVGRectElement {
    // Check if we have a valid existing rectangle
    const hasValidRect = this.selectionRect && 
                        this.selectionRect.element && 
                        this.selectionRect.element.parentNode;
    
    if (!hasValidRect) {
      console.log('[SelectionRectSingleton] Creating new selection rectangle instance');
      this.createNewSelectionRect(container);
    } else {
      console.log('[SelectionRectSingleton] Reusing existing selection rectangle instance');
      // Update container if needed
      if (this.selectionRect!.container !== container) {
        this.moveSelectionRectToContainer(container);
      }
    }
    
    // Ensure we have a valid selection rect at this point
    if (!this.selectionRect) {
      throw new Error('[SelectionRectSingleton] Failed to create or retrieve selection rectangle');
    }
    
    this.selectionRect.isActive = true;
    this.selectionRect.lastUpdate = Date.now();
    
    // Cancel any pending cleanup
    if (this.cleanupTimeoutId) {
      clearTimeout(this.cleanupTimeoutId);
      this.cleanupTimeoutId = null;
    }
    
    return this.selectionRect.element;
  }
  
  /**
   * Create a new selection rectangle instance
   */
  private createNewSelectionRect(container: SVGGElement) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    element.setAttribute('data-singleton-selection-rect', 'true');
    element.setAttribute('data-element-type', 'selection-rect');
    
    // Default styling
    element.setAttribute('fill', 'rgba(0, 120, 204, 0.15)');
    element.setAttribute('stroke', '#007acc');
    element.setAttribute('stroke-width', '1');
    element.setAttribute('vector-effect', 'non-scaling-stroke');
    element.style.pointerEvents = 'none';
    element.style.display = 'none'; // Start hidden
    
    container.appendChild(element);
    
    this.selectionRect = {
      element,
      container,
      isActive: true,
      lastUpdate: Date.now(),
      currentRect: null
    };
    
    console.log('[SelectionRectSingleton] Created selection rectangle:', {
      element,
      container,
      containerParent: container.parentNode,
      containerAttributes: {
        'data-selection-rect-container': container.getAttribute('data-selection-rect-container')
      }
    });
  }
  
  /**
   * Move selection rectangle to a different container
   */
  private moveSelectionRectToContainer(newContainer: SVGGElement) {
    if (!this.selectionRect) return;
    
    console.log('[SelectionRectSingleton] Moving selection rectangle to new container');
    
    // Remove from current container
    if (this.selectionRect.element.parentNode) {
      this.selectionRect.element.parentNode.removeChild(this.selectionRect.element);
    }
    
    // Add to new container
    newContainer.appendChild(this.selectionRect.element);
    this.selectionRect.container = newContainer;
  }
  
  /**
   * Update selection rectangle properties
   */
  updateSelectionRect(rect: { x: number; y: number; width: number; height: number }) {
    if (!this.selectionRect) {
      console.log('[SelectionRectSingleton] Cannot update - no selection rectangle instance');
      return;
    }
    
    const { element } = this.selectionRect;
    
    // Check if element is still in DOM
    if (!element.parentNode) {
      console.log('[SelectionRectSingleton] Element is not in DOM, skipping update');
      return;
    }
    
    // Only update if the rectangle has actually changed
    const currentRect = this.selectionRect.currentRect;
    const hasChanged = !currentRect || 
      currentRect.x !== rect.x || 
      currentRect.y !== rect.y || 
      currentRect.width !== rect.width || 
      currentRect.height !== rect.height;
    
    if (hasChanged) {
      element.setAttribute('x', rect.x.toString());
      element.setAttribute('y', rect.y.toString());
      element.setAttribute('width', rect.width.toString());
      element.setAttribute('height', rect.height.toString());
      
      this.selectionRect.currentRect = { ...rect };
      this.selectionRect.lastUpdate = Date.now();
      
      // Show the rectangle
      element.style.display = 'block';
      element.style.visibility = 'visible';
      element.style.opacity = '1';
      
      console.log('[SelectionRectSingleton] Updated selection rectangle:', {
        rect,
        element,
        parentNode: element.parentNode,
        isVisible: element.style.display !== 'none'
      });
    }
  }
  
  /**
   * Hide the selection rectangle
   */
  hideSelectionRect() {
    if (!this.selectionRect) return;
    
    console.log('[SelectionRectSingleton] Hiding selection rectangle');
    this.selectionRect.isActive = false;
    this.selectionRect.currentRect = null;
    
    // Hide immediately
    this.selectionRect.element.style.display = 'none';
  }
  
  /**
   * Check if selection rectangle is currently visible
   */
  isVisible(): boolean {
    return !!(this.selectionRect && 
              this.selectionRect.isActive && 
              this.selectionRect.element.style.display !== 'none');
  }
  
  /**
   * Get current selection rectangle bounds
   */
  getCurrentRect(): { x: number; y: number; width: number; height: number } | null {
    return this.selectionRect?.currentRect || null;
  }
  
  
  
  /**
   * Clear current selection rectangle
   */
  clear() {
    console.log('[SelectionRectSingleton] Clearing selection rectangle');
    
    if (this.cleanupTimeoutId) {
      clearTimeout(this.cleanupTimeoutId);
      this.cleanupTimeoutId = null;
    }
    
    if (this.selectionRect) {
      try {
        if (this.selectionRect.element.parentNode) {
          this.selectionRect.element.parentNode.removeChild(this.selectionRect.element);
        }
      } catch (e) {
        // Ignore removal errors
      }
      this.selectionRect = null;
    }
  }
  
  /**
   * Get current selection rectangle status
   */
  getStatus() {
    return {
      hasSelectionRect: !!this.selectionRect,
      isActive: this.selectionRect?.isActive || false,
      isVisible: this.isVisible(),
      lastUpdate: this.selectionRect?.lastUpdate || 0,
      currentRect: this.getCurrentRect(),
      elementExists: !!(this.selectionRect?.element.parentNode)
    };
  }
}

// Singleton instance
export const selectionRectSingletonManager = SelectionRectSingletonManager.getInstance();


// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).selectionRectSingletonManager = selectionRectSingletonManager;
  
  console.log('[SelectionRectSingleton] Global functions available:');
  console.log('- selectionRectSingletonManager.getStatus()');
  console.log('- selectionRectSingletonManager.clear()');
}