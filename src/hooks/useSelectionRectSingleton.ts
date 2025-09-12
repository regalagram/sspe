/**
 * Hook for managing selection rectangle with singleton pattern
 * Prevents multiple selection rectangle instances and manages proper cleanup
 */

import { useRef, useEffect, useState } from 'react';
import { selectionRectSingletonManager } from '../utils/selection-rect-manager';

interface UseSelectionRectSingletonOptions {
  isVisible: boolean;
  container: SVGGElement | null;
  rect: { x: number; y: number; width: number; height: number } | null;
}

export const useSelectionRectSingleton = ({
  isVisible,
  container,
  rect
}: UseSelectionRectSingletonOptions) => {
  const [selectionRectElement, setSelectionRectElement] = useState<SVGRectElement | null>(null);
  const isMountedRef = useRef(true);
  
  // Initialize selection rectangle when conditions are met
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    if (isVisible && container) {
      // Get or create singleton selection rectangle
      const element = selectionRectSingletonManager.getSelectionRect(container);
      setSelectionRectElement(element);
    } else {
      if (isVisible && !container) {
        // Waiting for container
      } else {
        // Hiding selection rectangle
      }
      selectionRectSingletonManager.hideSelectionRect();
      setSelectionRectElement(null);
    }
  }, [isVisible, container]);
  
  // Update rectangle when properties change
  useEffect(() => {
    if (selectionRectElement && rect && isVisible) {
      selectionRectSingletonManager.updateSelectionRect(rect);
    } else {
      // Not updating rect
    }
  }, [selectionRectElement, rect, isVisible]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      selectionRectSingletonManager.hideSelectionRect();
    };
  }, []);
  
  return {
    selectionRectElement,
    isVisible: selectionRectSingletonManager.isVisible(),
    currentRect: selectionRectSingletonManager.getCurrentRect()
  };
};