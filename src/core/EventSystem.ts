/**
 * Event-Driven State Management System
 * 
 * Replaces polling with reactive event-driven updates for better performance
 */

import React from 'react';

type EventCallback<T = any> = (data: T) => void;
type Unsubscribe = () => void;

/**
 * Generic Event Emitter for reactive updates
 */
export class EventEmitter<TEvents extends Record<string, any> = Record<string, any>> {
  private listeners = new Map<keyof TEvents, Set<EventCallback>>();

  /**
   * Subscribe to an event
   */
  on<K extends keyof TEvents>(event: K, callback: EventCallback<TEvents[K]>): Unsubscribe {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    const eventListeners = this.listeners.get(event)!;
    eventListeners.add(callback);

    // Return unsubscribe function
    return () => {
      eventListeners.delete(callback);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  /**
   * Subscribe to an event only once
   */
  once<K extends keyof TEvents>(event: K, callback: EventCallback<TEvents[K]>): Unsubscribe {
    const unsubscribe = this.on(event, (data) => {
      unsubscribe();
      callback(data);
    });
    return unsubscribe;
  }

  /**
   * Emit an event
   */
  emit<K extends keyof TEvents>(event: K, data: TEvents[K]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for "${String(event)}":`, error);
        }
      });
    }
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners<K extends keyof TEvents>(event?: K): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get listener count for an event
   */
  listenerCount<K extends keyof TEvents>(event: K): number {
    return this.listeners.get(event)?.size || 0;
  }

  /**
   * Get all event names that have listeners
   */
  eventNames(): Array<keyof TEvents> {
    return Array.from(this.listeners.keys());
  }
}

/**
 * State change events
 */
interface StateEvents {
  'tool-mode-changed': { mode: string; previous: string };
  'selection-changed': { selectedIds: string[]; previous: string[] };
  'animation-state-changed': { isPlaying: boolean; currentTime: number };
  'viewport-changed': { zoom: number; pan: { x: number; y: number } };
  'cursor-state-changed': { type: string; element?: string };
  'shape-state-changed': { activeShape?: string; isDrawing: boolean };
  'curves-state-changed': { activeCurve?: string; isDrawing: boolean };
  'pencil-state-changed': { isDrawing: boolean; currentPath?: string };
  'transform-state-changed': { isTransforming: boolean; elements: string[] };
}

/**
 * Global event emitter for state changes
 */
export const stateEvents = new EventEmitter<StateEvents>();

/**
 * React hook for subscribing to state events
 */
export function useStateEvent<K extends keyof StateEvents>(
  event: K,
  callback: EventCallback<StateEvents[K]>,
  deps: React.DependencyList = []
): void {
  React.useEffect(() => {
    return stateEvents.on(event, callback);
  }, deps);
}

/**
 * Debounced event emitter to prevent excessive updates
 */
export class DebouncedEventEmitter<TEvents extends Record<string, any> = Record<string, any>> extends EventEmitter<TEvents> {
  private debounceTimers = new Map<keyof TEvents, NodeJS.Timeout>();
  private readonly debounceMs: number;

  constructor(debounceMs: number = 16) { // 60fps by default
    super();
    this.debounceMs = debounceMs;
  }

  emit<K extends keyof TEvents>(event: K, data: TEvents[K]): void {
    // Clear existing timer
    const existingTimer = this.debounceTimers.get(event);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      super.emit(event, data);
      this.debounceTimers.delete(event);
    }, this.debounceMs);

    this.debounceTimers.set(event, timer);
  }

  /**
   * Force immediate emission (bypassing debounce)
   */
  emitImmediately<K extends keyof TEvents>(event: K, data: TEvents[K]): void {
    // Clear debounce timer if exists
    const existingTimer = this.debounceTimers.get(event);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.debounceTimers.delete(event);
    }

    super.emit(event, data);
  }

  /**
   * Cleanup all debounce timers
   */
  cleanup(): void {
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    this.removeAllListeners();
  }
}

/**
 * Throttled event emitter for high-frequency events
 */
export class ThrottledEventEmitter<TEvents extends Record<string, any> = Record<string, any>> extends EventEmitter<TEvents> {
  private lastEmitTime = new Map<keyof TEvents, number>();
  private readonly throttleMs: number;

  constructor(throttleMs: number = 16) { // 60fps by default
    super();
    this.throttleMs = throttleMs;
  }

  emit<K extends keyof TEvents>(event: K, data: TEvents[K]): void {
    const now = Date.now();
    const lastTime = this.lastEmitTime.get(event) || 0;

    if (now - lastTime >= this.throttleMs) {
      super.emit(event, data);
      this.lastEmitTime.set(event, now);
    }
  }

  /**
   * Force immediate emission (bypassing throttle)
   */
  emitImmediately<K extends keyof TEvents>(event: K, data: TEvents[K]): void {
    super.emit(event, data);
    this.lastEmitTime.set(event, Date.now());
  }
}

/**
 * Reactive state manager that emits events on changes
 */
export class ReactiveState<T extends Record<string, any>> {
  private state: T;
  private emitter = new EventEmitter<{ 'state-changed': { key: keyof T; value: T[keyof T]; previous: T[keyof T] } }>();

  constructor(initialState: T) {
    this.state = { ...initialState };
  }

  /**
   * Get current state value
   */
  get<K extends keyof T>(key: K): T[K] {
    return this.state[key];
  }

  /**
   * Set state value and emit change event
   */
  set<K extends keyof T>(key: K, value: T[K]): void {
    const previous = this.state[key];
    if (previous !== value) {
      this.state[key] = value;
      this.emitter.emit('state-changed', { key, value, previous });
    }
  }

  /**
   * Update multiple state values
   */
  update(updates: Partial<T>): void {
    Object.entries(updates).forEach(([key, value]) => {
      this.set(key as keyof T, value);
    });
  }

  /**
   * Subscribe to state changes
   */
  onChange(callback: EventCallback<{ key: keyof T; value: T[keyof T]; previous: T[keyof T] }>): Unsubscribe {
    return this.emitter.on('state-changed', callback);
  }

  /**
   * Subscribe to specific key changes
   */
  onKeyChange<K extends keyof T>(key: K, callback: EventCallback<{ value: T[K]; previous: T[K] }>): Unsubscribe {
    return this.emitter.on('state-changed', (data) => {
      if (data.key === key) {
        callback({ value: data.value as T[K], previous: data.previous as T[K] });
      }
    });
  }

  /**
   * Get all current state
   */
  getAll(): T {
    return { ...this.state };
  }

  /**
   * Clear all listeners
   */
  cleanup(): void {
    this.emitter.removeAllListeners();
  }
}

/**
 * React hook for reactive state
 */
export function useReactiveState<T extends Record<string, any>>(
  reactiveState: ReactiveState<T>
): [T, (updates: Partial<T>) => void] {
  const [state, setState] = React.useState(reactiveState.getAll());

  React.useEffect(() => {
    return reactiveState.onChange(() => {
      setState(reactiveState.getAll());
    });
  }, [reactiveState]);

  const updateState = React.useCallback((updates: Partial<T>) => {
    reactiveState.update(updates);
  }, [reactiveState]);

  return [state, updateState];
}

/**
 * Animation frame-based event emitter for smooth animations
 */
export class AnimationFrameEmitter extends EventEmitter<{ frame: { timestamp: number; delta: number } }> {
  private isRunning = false;
  private rafId: number | null = null;
  private lastTimestamp = 0;

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastTimestamp = performance.now();
    this.tick();
  }

  stop(): void {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private tick = (timestamp: number = performance.now()): void => {
    if (!this.isRunning) return;

    const delta = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;

    this.emit('frame', { timestamp, delta });

    this.rafId = requestAnimationFrame(this.tick);
  };

  cleanup(): void {
    this.stop();
    this.removeAllListeners();
  }
}

// Export singleton instances for common use
export const animationFrameEmitter = new AnimationFrameEmitter();
export const debouncedStateEvents = new DebouncedEventEmitter<StateEvents>();
export const throttledStateEvents = new ThrottledEventEmitter<StateEvents>();
