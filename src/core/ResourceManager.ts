// core/ResourceManager.ts
export interface Disposable {
  dispose(): void;
}

export class ResourceManager implements Disposable {
  private resources = new Set<Disposable>();
  private timers = new Set<NodeJS.Timeout>();
  private rafIds = new Set<number>();
  private eventListeners = new Map<EventTarget, Map<string, EventListener>>();
  private isDisposed = false;

  /**
   * Register a timer for automatic cleanup
   */
  registerTimer(id: NodeJS.Timeout): NodeJS.Timeout {
    if (this.isDisposed) {
      clearTimeout(id);
      throw new Error('ResourceManager is disposed');
    }
    this.timers.add(id);
    return id;
  }

  /**
   * Register a RAF ID for automatic cleanup
   */
  registerRAF(id: number): number {
    if (this.isDisposed) {
      cancelAnimationFrame(id);
      throw new Error('ResourceManager is disposed');
    }
    this.rafIds.add(id);
    return id;
  }

  /**
   * Register an event listener for automatic cleanup
   */
  addEventListener<K extends keyof HTMLElementEventMap>(
    target: EventTarget,
    type: K,
    listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions
  ): void {
    if (this.isDisposed) {
      throw new Error('ResourceManager is disposed');
    }

    target.addEventListener(type, listener, options);

    // Track for cleanup
    if (!this.eventListeners.has(target)) {
      this.eventListeners.set(target, new Map());
    }
    this.eventListeners.get(target)!.set(type, listener);
  }

  /**
   * Register a disposable resource for automatic cleanup
   */
  register<T extends Disposable>(resource: T): T {
    if (this.isDisposed) {
      resource.dispose();
      throw new Error('ResourceManager is disposed');
    }
    this.resources.add(resource);
    return resource;
  }

  /**
   * Manually clean up a specific timer
   */
  clearTimer(id: NodeJS.Timeout): void {
    clearTimeout(id);
    this.timers.delete(id);
  }

  /**
   * Manually clean up a specific RAF
   */
  cancelRAF(id: number): void {
    cancelAnimationFrame(id);
    this.rafIds.delete(id);
  }

  /**
   * Manually remove an event listener
   */
  removeEventListener(target: EventTarget, type: string): void {
    const listeners = this.eventListeners.get(target);
    if (listeners) {
      const listener = listeners.get(type);
      if (listener) {
        target.removeEventListener(type, listener);
        listeners.delete(type);
        if (listeners.size === 0) {
          this.eventListeners.delete(target);
        }
      }
    }
  }

  /**
   * Clean up all resources
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    // Clear all timers
    this.timers.forEach(id => clearTimeout(id));
    this.timers.clear();

    // Cancel all RAFs
    this.rafIds.forEach(id => cancelAnimationFrame(id));
    this.rafIds.clear();

    // Remove all event listeners
    this.eventListeners.forEach((listeners, target) => {
      listeners.forEach((listener, type) => {
        target.removeEventListener(type, listener);
      });
    });
    this.eventListeners.clear();

    // Dispose all resources
    this.resources.forEach(resource => {
      try {
        resource.dispose();
      } catch (error) {
        console.error('Error disposing resource:', error);
      }
    });
    this.resources.clear();

    this.isDisposed = true;
  }

  /**
   * Check if the manager has been disposed
   */
  get disposed(): boolean {
    return this.isDisposed;
  }

  /**
   * Get resource counts for debugging
   */
  getResourceCounts(): {
    timers: number;
    rafIds: number;
    eventListeners: number;
    resources: number;
  } {
    return {
      timers: this.timers.size,
      rafIds: this.rafIds.size,
      eventListeners: Array.from(this.eventListeners.values()).reduce((acc, listeners) => acc + listeners.size, 0),
      resources: this.resources.size
    };
  }
}

/**
 * Global resource manager instance for shared use
 */
export const globalResourceManager = new ResourceManager();
