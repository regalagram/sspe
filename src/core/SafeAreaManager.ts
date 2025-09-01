/**
 * iOS Safe Area Management System
 * 
 * Provides comprehensive safe area handling for iOS devices including
 * notch support, home indicator spacing, and landscape orientation.
 */

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface SafeAreaConfig {
  // Enable/disable individual safe areas
  enableTop: boolean;
  enableRight: boolean;
  enableBottom: boolean;
  enableLeft: boolean;
  
  // Minimum fallback values for older devices
  minTop: number;
  minRight: number;
  minBottom: number;
  minLeft: number;
  
  // Additional spacing beyond safe areas
  additionalTop: number;
  additionalRight: number;
  additionalBottom: number;
  additionalLeft: number;
  
  // Component-specific overrides
  toolbar: Partial<SafeAreaInsets>;
  bottomSheet: Partial<SafeAreaInsets>;
  floatingActions: Partial<SafeAreaInsets>;
  canvas: Partial<SafeAreaInsets>;
}

/**
 * Default safe area configuration
 */
export const DEFAULT_SAFE_AREA_CONFIG: SafeAreaConfig = {
  // Enable all safe areas by default
  enableTop: true,
  enableRight: true,
  enableBottom: true,
  enableLeft: true,
  
  // Minimum fallbacks for non-safe-area devices
  minTop: 0,
  minRight: 0,
  minBottom: 0,
  minLeft: 0,
  
  // Additional spacing for better UX
  additionalTop: 0,
  additionalRight: 0,
  additionalBottom: 0,
  additionalLeft: 0,
  
  // Component-specific configurations
  toolbar: {
    top: 0, // Toolbar typically sits in the notch area
    bottom: 8 // Small bottom spacing
  },
  
  bottomSheet: {
    bottom: 16 // Extra space above home indicator
  },
  
  floatingActions: {
    right: 16,
    bottom: 24 // Clear the home indicator
  },
  
  canvas: {
    // Canvas should respect all safe areas to prevent content cutoff
  }
};

/**
 * Safe area detection and management class
 */
export class SafeAreaManager {
  private config: SafeAreaConfig;
  private currentInsets: SafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };
  private listeners: Set<(insets: SafeAreaInsets) => void> = new Set();
  private isInitialized = false;
  
  constructor(config: Partial<SafeAreaConfig> = {}) {
    this.config = { ...DEFAULT_SAFE_AREA_CONFIG, ...config };
    this.initialize();
  }
  
  /**
   * Initialize safe area detection
   */
  private initialize(): void {
    if (this.isInitialized) return;
    
    // Detect initial safe areas
    this.detectSafeAreas();
    
    // Listen for orientation changes
    window.addEventListener('orientationchange', this.handleOrientationChange.bind(this));
    window.addEventListener('resize', this.handleResize.bind(this));
    
    // For iOS, also listen for viewport changes
    if (this.isIOSDevice()) {
      document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }
    
    this.isInitialized = true;
  }
  
  /**
   * Detect current safe area values
   */
  private detectSafeAreas(): void {
    if (!this.supportsSafeArea()) {
      // Fallback for non-supporting devices
      this.currentInsets = {
        top: this.config.minTop,
        right: this.config.minRight,
        bottom: this.config.minBottom,
        left: this.config.minLeft
      };
      this.notifyListeners();
      return;
    }
    
    // Create a test element to measure safe areas
    const testElement = document.createElement('div');
    testElement.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      pointer-events: none;
      visibility: hidden;
      z-index: -1;
      padding-top: env(safe-area-inset-top, 0px);
      padding-right: env(safe-area-inset-right, 0px);
      padding-bottom: env(safe-area-inset-bottom, 0px);
      padding-left: env(safe-area-inset-left, 0px);
    `;
    
    document.body.appendChild(testElement);
    
    // Use computed style to get actual values
    const computed = getComputedStyle(testElement);
    
    this.currentInsets = {
      top: this.parsePixelValue(computed.paddingTop),
      right: this.parsePixelValue(computed.paddingRight),
      bottom: this.parsePixelValue(computed.paddingBottom),
      left: this.parsePixelValue(computed.paddingLeft)
    };
    
    document.body.removeChild(testElement);
    
    // Apply configuration overrides
    this.applyConfigOverrides();
    
    this.notifyListeners();
  }
  
  /**
   * Apply configuration overrides to detected values
   */
  private applyConfigOverrides(): void {
    if (!this.config.enableTop) this.currentInsets.top = this.config.minTop;
    if (!this.config.enableRight) this.currentInsets.right = this.config.minRight;
    if (!this.config.enableBottom) this.currentInsets.bottom = this.config.minBottom;
    if (!this.config.enableLeft) this.currentInsets.left = this.config.minLeft;
    
    // Add additional spacing
    this.currentInsets.top += this.config.additionalTop;
    this.currentInsets.right += this.config.additionalRight;
    this.currentInsets.bottom += this.config.additionalBottom;
    this.currentInsets.left += this.config.additionalLeft;
    
    // Ensure minimum values
    this.currentInsets.top = Math.max(this.currentInsets.top, this.config.minTop);
    this.currentInsets.right = Math.max(this.currentInsets.right, this.config.minRight);
    this.currentInsets.bottom = Math.max(this.currentInsets.bottom, this.config.minBottom);
    this.currentInsets.left = Math.max(this.currentInsets.left, this.config.minLeft);
  }
  
  /**
   * Parse pixel value from CSS
   */
  private parsePixelValue(value: string): number {
    const match = value.match(/^(\d+(?:\.\d+)?)px$/);
    return match ? parseFloat(match[1]) : 0;
  }
  
  /**
   * Check if device supports safe area
   */
  private supportsSafeArea(): boolean {
    return CSS.supports('padding', 'env(safe-area-inset-top)');
  }
  
  /**
   * Check if device is iOS
   */
  private isIOSDevice(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }
  
  /**
   * Handle orientation change
   */
  private handleOrientationChange(): void {
    // Delay detection to allow for orientation transition
    setTimeout(() => {
      this.detectSafeAreas();
    }, 200);
  }
  
  /**
   * Handle window resize
   */
  private handleResize(): void {
    // Debounce resize events
    setTimeout(() => {
      this.detectSafeAreas();
    }, 100);
  }
  
  /**
   * Handle visibility change (iOS specific)
   */
  private handleVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
      // Re-detect when app becomes visible
      setTimeout(() => {
        this.detectSafeAreas();
      }, 100);
    }
  }
  
  /**
   * Notify all listeners of safe area changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener({ ...this.currentInsets }); // Always send a copy to prevent reference issues
      } catch (error) {
        console.error('Safe area listener error:', error);
      }
    });
  }
  
  /**
   * Get current safe area insets
   */
  getSafeAreaInsets(): SafeAreaInsets {
    return { ...this.currentInsets };
  }
  
  /**
   * Get safe area insets for specific component
   */
  getComponentInsets(component: 'toolbar' | 'bottomSheet' | 'floatingActions' | 'canvas'): SafeAreaInsets {
    const base = this.getSafeAreaInsets();
    const override = this.config[component] || {};
    
    return {
      top: override.top !== undefined ? override.top : base.top,
      right: override.right !== undefined ? override.right : base.right,
      bottom: override.bottom !== undefined ? override.bottom : base.bottom,
      left: override.left !== undefined ? override.left : base.left,
    };
  }
  
  /**
   * Generate CSS for safe area padding
   */
  generateCSS(component?: 'toolbar' | 'bottomSheet' | 'floatingActions' | 'canvas'): string {
    const insets = component ? this.getComponentInsets(component) : this.getSafeAreaInsets();
    
    return `
      padding-top: ${insets.top}px;
      padding-right: ${insets.right}px;
      padding-bottom: ${insets.bottom}px;
      padding-left: ${insets.left}px;
    `.trim();
  }
  
  /**
   * Generate CSS custom properties for safe areas
   */
  generateCSSProperties(): string {
    const insets = this.getSafeAreaInsets();
    
    return `
      --safe-area-inset-top: ${insets.top}px;
      --safe-area-inset-right: ${insets.right}px;
      --safe-area-inset-bottom: ${insets.bottom}px;
      --safe-area-inset-left: ${insets.left}px;
    `.trim();
  }
  
  /**
   * Subscribe to safe area changes
   */
  subscribe(listener: (insets: SafeAreaInsets) => void): () => void {
    this.listeners.add(listener);
    
    // Immediately notify with current values using setTimeout to prevent render loops
    setTimeout(() => {
      if (this.listeners.has(listener)) {
        listener({ ...this.currentInsets });
      }
    }, 0);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }
  
  /**
   * Check if device has safe areas (notch, home indicator, etc.)
   */
  hasSafeAreas(): boolean {
    const insets = this.getSafeAreaInsets();
    return insets.top > 0 || insets.right > 0 || insets.bottom > 0 || insets.left > 0;
  }
  
  /**
   * Check if device has top safe area (notch)
   */
  hasNotch(): boolean {
    return this.getSafeAreaInsets().top > 0;
  }
  
  /**
   * Check if device has bottom safe area (home indicator)
   */
  hasHomeIndicator(): boolean {
    return this.getSafeAreaInsets().bottom > 0;
  }
  
  /**
   * Get viewport dimensions accounting for safe areas
   */
  getSafeViewportDimensions(): { width: number; height: number } {
    const insets = this.getSafeAreaInsets();
    
    return {
      width: window.innerWidth - insets.left - insets.right,
      height: window.innerHeight - insets.top - insets.bottom
    };
  }
  
  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SafeAreaConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.detectSafeAreas();
  }
  
  /**
   * Dispose of the manager
   */
  dispose(): void {
    if (!this.isInitialized) return;
    
    window.removeEventListener('orientationchange', this.handleOrientationChange);
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    
    this.listeners.clear();
    this.isInitialized = false;
  }
}

/**
 * CSS utility functions for safe areas
 */
export class SafeAreaCSS {
  /**
   * Generate CSS max() function for safe area
   */
  static max(side: 'top' | 'right' | 'bottom' | 'left', fallback: number | string): string {
    const fallbackValue = typeof fallback === 'number' ? `${fallback}px` : fallback;
    return `max(${fallbackValue}, env(safe-area-inset-${side}))`;
  }
  
  /**
   * Generate CSS calc() function with safe area
   */
  static calc(side: 'top' | 'right' | 'bottom' | 'left', base: number | string, operation: '+' | '-' = '+'): string {
    const baseValue = typeof base === 'number' ? `${base}px` : base;
    return `calc(${baseValue} ${operation} env(safe-area-inset-${side}))`;
  }
  
  /**
   * Generate complete safe area padding
   */
  static padding(insets: Partial<SafeAreaInsets>, fallbacks: Partial<SafeAreaInsets> = {}): string {
    const top = insets.top !== undefined ? `${insets.top}px` : this.max('top', fallbacks.top || 0);
    const right = insets.right !== undefined ? `${insets.right}px` : this.max('right', fallbacks.right || 0);
    const bottom = insets.bottom !== undefined ? `${insets.bottom}px` : this.max('bottom', fallbacks.bottom || 0);
    const left = insets.left !== undefined ? `${insets.left}px` : this.max('left', fallbacks.left || 0);
    
    return `${top} ${right} ${bottom} ${left}`;
  }
  
  /**
   * Generate safe area margin
   */
  static margin(insets: Partial<SafeAreaInsets>, fallbacks: Partial<SafeAreaInsets> = {}): string {
    return this.padding(insets, fallbacks);
  }
}

/**
 * React hook for safe area management
 */
export const useSafeAreaManager = (config?: Partial<SafeAreaConfig>) => {
  // This would be implemented in a React-specific file
  // Included here for completeness
  return {
    safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
    hasSafeAreas: false,
    hasNotch: false,
    hasHomeIndicator: false,
    safeViewportDimensions: { width: window.innerWidth, height: window.innerHeight }
  };
};

/**
 * Default safe area manager instance
 */
export const safeAreaManager = new SafeAreaManager();
