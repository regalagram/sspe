export interface GestureConfig {
  tapThreshold: number;       // Distancia máxima para considerar tap
  doubleTapTime: number;      // Tiempo máximo entre taps
  longPressTime: number;      // Tiempo para long press
  swipeThreshold: number;     // Distancia mínima para swipe
}

export const defaultGestureConfig: GestureConfig = {
  tapThreshold: 10,
  doubleTapTime: 300,
  longPressTime: 500,
  swipeThreshold: 50
};

export class GestureDetector {
  private config: GestureConfig;
  private longPressTimer?: number;
  
  constructor(config: Partial<GestureConfig> = {}) {
    this.config = { ...defaultGestureConfig, ...config };
  }
  
  startLongPress(callback: () => void): void {
    this.cancelLongPress();
    this.longPressTimer = window.setTimeout(callback, this.config.longPressTime);
  }
  
  cancelLongPress(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = undefined;
    }
  }
  
  detectSwipe(start: Touch, end: Touch): 'left' | 'right' | 'up' | 'down' | null {
    const dx = end.clientX - start.clientX;
    const dy = end.clientY - start.clientY;
    const distance = Math.hypot(dx, dy);
    
    if (distance < this.config.swipeThreshold) return null;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
  }
}