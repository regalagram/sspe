// hooks/useAnimationFrame.ts
import { useEffect, useRef, useCallback } from 'react';
import { ResourceManager } from '../core/ResourceManager';

export interface AnimationFrameController {
  start: () => void;
  stop: () => void;
  isRunning: () => boolean;
}

/**
 * Custom hook for managing requestAnimationFrame with automatic cleanup
 */
export const useAnimationFrame = (
  callback: () => void
): AnimationFrameController => {
  const rafIdRef = useRef<number | null>(null);
  const resourceManagerRef = useRef<ResourceManager>(new ResourceManager());
  const callbackRef = useRef(callback);

  // Update callback ref when callback changes - no dependencies array to avoid loops
  useEffect(() => {
    callbackRef.current = callback;
  });

  const start = useCallback(() => {
    if (rafIdRef.current !== null) {
      return; // Already running
    }

    const animate = () => {
      callbackRef.current();
      rafIdRef.current = resourceManagerRef.current.registerRAF(
        requestAnimationFrame(animate)
      );
    };

    rafIdRef.current = resourceManagerRef.current.registerRAF(
      requestAnimationFrame(animate)
    );
  }, []);

  const stop = useCallback(() => {
    if (rafIdRef.current !== null) {
      resourceManagerRef.current.cancelRAF(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  const isRunning = useCallback(() => {
    return rafIdRef.current !== null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resourceManagerRef.current.dispose();
    };
  }, []);

  return {
    start,
    stop,
    isRunning
  };
};

/**
 * Hook for single-use requestAnimationFrame with automatic cleanup
 */
export const useRequestAnimationFrame = (
  callback: () => void,
  dependencies: React.DependencyList = []
): (() => void) => {
  const resourceManagerRef = useRef<ResourceManager>(new ResourceManager());
  const callbackRef = useRef(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback, ...dependencies]);

  const scheduleFrame = useCallback(() => {
    const rafId = requestAnimationFrame(() => {
      callbackRef.current();
    });
    resourceManagerRef.current.registerRAF(rafId);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resourceManagerRef.current.dispose();
    };
  }, []);

  return scheduleFrame;
};
