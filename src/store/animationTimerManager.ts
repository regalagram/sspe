// store/animationTimerManager.ts
import { ResourceManager } from '../core/ResourceManager';

export class AnimationTimerManager {
  private resourceManager = new ResourceManager();
  private animationTimers = new Map<string, NodeJS.Timeout>();

  /**
   * Set an animation timer with automatic cleanup
   */
  setAnimationTimer(animationId: string, callback: () => void, delay: number): void {
    // Clear existing timer if any
    this.clearAnimationTimer(animationId);
    
    const timerId = this.resourceManager.registerTimer(setTimeout(() => {
      this.animationTimers.delete(animationId);
      callback();
    }, delay));
    
    this.animationTimers.set(animationId, timerId);
  }

  /**
   * Clear a specific animation timer
   */
  clearAnimationTimer(animationId: string): void {
    const timerId = this.animationTimers.get(animationId);
    if (timerId) {
      this.resourceManager.clearTimer(timerId);
      this.animationTimers.delete(animationId);
    }
  }

  /**
   * Clear all animation timers
   */
  clearAllTimers(): void {
    this.animationTimers.forEach((timerId, animationId) => {
      this.resourceManager.clearTimer(timerId);
    });
    this.animationTimers.clear();
  }

  /**
   * Cleanup all resources
   */
  dispose(): void {
    this.clearAllTimers();
    this.resourceManager.dispose();
  }

  /**
   * Get active timer count for debugging
   */
  getActiveTimerCount(): number {
    return this.animationTimers.size;
  }
}

// Global instance for shared use
export const globalAnimationTimerManager = new AnimationTimerManager();
