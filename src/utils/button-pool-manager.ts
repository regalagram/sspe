/**
 * BUTTON POOL MANAGER
 * Manages a pool of reusable button elements to prevent detached DOM nodes
 */

interface ButtonInstance {
  element: HTMLButtonElement;
  container: HTMLDivElement;
  isActive: boolean;
  actionId: string;
  lastUsed: number;
}

class ButtonPoolManager {
  private static instance: ButtonPoolManager;
  private buttonPool: Map<string, ButtonInstance> = new Map();
  private poolContainer: HTMLElement | null = null;
  private cleanupTimeoutId: number | null = null;
  
  private constructor() {}
  
  static getInstance(): ButtonPoolManager {
    if (!ButtonPoolManager.instance) {
      ButtonPoolManager.instance = new ButtonPoolManager();
    }
    return ButtonPoolManager.instance;
  }
  
  /**
   * Initialize the pool container
   */
  initialize(container: HTMLElement) {
    this.poolContainer = container;
    console.log('[ButtonPool] Initialized with container:', container);
  }
  
  /**
   * Get or create a button element for an action
   */
  getButton(actionId: string, parentContainer: HTMLElement): { button: HTMLButtonElement, container: HTMLDivElement } {
    // Clean up any detached buttons first
    this.cleanupDetachedButtons();
    
    const key = `${actionId}`;
    let buttonInstance = this.buttonPool.get(key);
    
    if (!buttonInstance || !buttonInstance.element.parentNode) {
      console.log('[ButtonPool] Creating new button for:', actionId);
      buttonInstance = this.createNewButton(actionId, parentContainer);
      this.buttonPool.set(key, buttonInstance);
    } else {
      console.log('[ButtonPool] Reusing existing button for:', actionId);
      // Move to correct parent if needed
      if (buttonInstance.container.parentNode !== parentContainer) {
        parentContainer.appendChild(buttonInstance.container);
      }
    }
    
    buttonInstance.isActive = true;
    buttonInstance.lastUsed = Date.now();
    
    // Cancel any pending cleanup
    if (this.cleanupTimeoutId) {
      clearTimeout(this.cleanupTimeoutId);
      this.cleanupTimeoutId = null;
    }
    
    return {
      button: buttonInstance.element,
      container: buttonInstance.container
    };
  }
  
  /**
   * Create a new button instance
   */
  private createNewButton(actionId: string, parentContainer: HTMLElement): ButtonInstance {
    // Create container div
    const container = document.createElement('div');
    container.style.cssText = 'position: relative;';
    container.setAttribute('data-action-id', actionId);
    container.setAttribute('data-pooled-button', 'true');
    
    // Create button element
    const button = document.createElement('button');
    button.style.cssText = `
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: white;
      color: rgb(55, 65, 81);
      border: none;
      border-radius: 0px;
      cursor: pointer;
      transition: all 0.15s ease;
      position: relative;
      opacity: 1;
      touch-action: manipulation;
      outline: none;
      user-select: none;
    `;
    
    container.appendChild(button);
    parentContainer.appendChild(container);
    
    const buttonInstance: ButtonInstance = {
      element: button,
      container,
      isActive: true,
      actionId,
      lastUsed: Date.now()
    };
    
    console.log('[ButtonPool] Created button instance for:', actionId);
    return buttonInstance;
  }
  
  /**
   * Update button properties
   */
  updateButton(
    actionId: string, 
    properties: {
      innerHTML?: string;
      title?: string;
      ariaLabel?: string;
      style?: Partial<CSSStyleDeclaration>;
      disabled?: boolean;
      onClick?: (e: Event) => void;
      onPointerDown?: (e: PointerEvent) => void;
    }
  ) {
    const key = `${actionId}`;
    const buttonInstance = this.buttonPool.get(key);
    
    if (!buttonInstance) {
      console.warn('[ButtonPool] Cannot update non-existent button:', actionId);
      return;
    }
    
    const { button } = buttonInstance;
    
    // Update properties
    if (properties.innerHTML !== undefined) {
      button.innerHTML = properties.innerHTML;
    }
    if (properties.title !== undefined) {
      button.title = properties.title;
    }
    if (properties.ariaLabel !== undefined) {
      button.setAttribute('aria-label', properties.ariaLabel);
    }
    if (properties.style) {
      Object.assign(button.style, properties.style);
    }
    if (properties.disabled !== undefined) {
      button.disabled = properties.disabled;
      button.style.opacity = properties.disabled ? '0.5' : '1';
      button.style.cursor = properties.disabled ? 'not-allowed' : 'pointer';
    }
    
    // Remove existing event listeners by cloning the button
    if (properties.onClick || properties.onPointerDown) {
      const newButton = button.cloneNode(true) as HTMLButtonElement;
      
      if (properties.onClick) {
        newButton.addEventListener('click', properties.onClick);
      }
      if (properties.onPointerDown) {
        newButton.addEventListener('pointerdown', properties.onPointerDown as any);
      }
      
      // Replace the button
      buttonInstance.container.replaceChild(newButton, button);
      buttonInstance.element = newButton;
    }
    
    buttonInstance.lastUsed = Date.now();
    console.log('[ButtonPool] Updated button:', actionId);
  }
  
  /**
   * Mark button as inactive
   */
  releaseButton(actionId: string) {
    const key = `${actionId}`;
    const buttonInstance = this.buttonPool.get(key);
    
    if (buttonInstance) {
      console.log('[ButtonPool] Released button:', actionId);
      buttonInstance.isActive = false;
      
      // Hide the button
      buttonInstance.container.style.display = 'none';
      
      // Schedule cleanup
      this.scheduleCleanup();
    }
  }
  
  /**
   * Schedule cleanup of inactive buttons
   */
  private scheduleCleanup() {
    if (this.cleanupTimeoutId) {
      clearTimeout(this.cleanupTimeoutId);
    }
    
    this.cleanupTimeoutId = window.setTimeout(() => {
      this.cleanupInactiveButtons();
    }, 2000); // Wait 2 seconds before cleanup
  }
  
  /**
   * Clean up inactive buttons
   */
  private cleanupInactiveButtons() {
    const cutoffTime = Date.now() - 5000; // 5 seconds ago
    const toRemove: string[] = [];
    
    for (const [key, buttonInstance] of this.buttonPool.entries()) {
      if (!buttonInstance.isActive && buttonInstance.lastUsed < cutoffTime) {
        console.log('[ButtonPool] Cleaning up inactive button:', buttonInstance.actionId);
        
        try {
          if (buttonInstance.container.parentNode) {
            buttonInstance.container.parentNode.removeChild(buttonInstance.container);
          }
        } catch (e) {
          console.error('[ButtonPool] Error removing button:', e);
        }
        
        toRemove.push(key);
      }
    }
    
    toRemove.forEach(key => this.buttonPool.delete(key));
    
    if (toRemove.length > 0) {
      console.log(`[ButtonPool] Cleaned up ${toRemove.length} inactive buttons`);
    }
  }
  
  /**
   * Clean up detached buttons in the DOM
   */
  private cleanupDetachedButtons() {
    const detachedButtons = document.querySelectorAll('[data-pooled-button]:not([data-singleton-toolbar] [data-pooled-button])');
    console.log(`[ButtonPool] Found ${detachedButtons.length} detached buttons to cleanup`);
    
    detachedButtons.forEach(button => {
      try {
        if (button.parentNode) {
          button.parentNode.removeChild(button);
        }
      } catch (e) {
        // Ignore removal errors
      }
    });
  }
  
  /**
   * Force cleanup of all buttons
   */
  forceCleanup() {
    console.log('[ButtonPool] Force cleanup of all buttons');
    
    // Cancel scheduled cleanup
    if (this.cleanupTimeoutId) {
      clearTimeout(this.cleanupTimeoutId);
      this.cleanupTimeoutId = null;
    }
    
    // Remove all pooled buttons
    for (const [key, buttonInstance] of this.buttonPool.entries()) {
      try {
        if (buttonInstance.container.parentNode) {
          buttonInstance.container.parentNode.removeChild(buttonInstance.container);
        }
      } catch (e) {
        // Ignore removal errors
      }
    }
    
    this.buttonPool.clear();
    
    // Clean up any remaining detached buttons
    this.cleanupDetachedButtons();
  }
  
  /**
   * Get pool status for debugging
   */
  getStatus() {
    return {
      poolSize: this.buttonPool.size,
      activeButtons: Array.from(this.buttonPool.values()).filter(b => b.isActive).length,
      buttons: Array.from(this.buttonPool.entries()).map(([key, instance]) => ({
        key,
        actionId: instance.actionId,
        isActive: instance.isActive,
        hasParent: !!instance.container.parentNode,
        lastUsed: instance.lastUsed
      }))
    };
  }
}

// Singleton instance
export const buttonPoolManager = ButtonPoolManager.getInstance();

// Global cleanup function
export const forceCleanupAllButtons = () => {
  buttonPoolManager.forceCleanup();
  
  // Also clean up any remaining buttons not managed by the pool
  const allButtons = document.querySelectorAll('[data-pooled-button]');
  console.log(`[ButtonPool Global] Found ${allButtons.length} total pooled buttons, cleaning up`);
  
  allButtons.forEach(button => {
    try {
      if (button.parentNode) {
        button.parentNode.removeChild(button);
      }
    } catch (e) {
      // Ignore removal errors
    }
  });
};

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).buttonPoolManager = buttonPoolManager;
  (window as any).forceCleanupAllButtons = forceCleanupAllButtons;
  
  console.log('[ButtonPool] Global functions available:');
  console.log('- buttonPoolManager.getStatus()');
  console.log('- buttonPoolManager.forceCleanup()');
  console.log('- forceCleanupAllButtons()');
}