/**
 * Singleton Selection Rectangle Component
 * Renders a single reusable selection rectangle to prevent detached DOM elements
 */

import React, { useEffect, useRef } from 'react';

interface SingletonSelectionRectProps {
  isVisible: boolean;
  rect: { x: number; y: number; width: number; height: number } | null;
}

// Global singleton state to ensure only one instance renders
let currentInstance: React.RefObject<SVGRectElement> | null = null;
let isRenderingInstance = false;

export const SingletonSelectionRect: React.FC<SingletonSelectionRectProps> = ({
  isVisible,
  rect
}) => {
  const rectRef = useRef<SVGRectElement>(null);
  const shouldRender = !isRenderingInstance;
  
  // Mark this as the rendering instance
  useEffect(() => {
    if (shouldRender) {
      console.log('[SingletonSelectionRect] This instance is now the active singleton');
      isRenderingInstance = true;
      currentInstance = rectRef;
      
      return () => {
        console.log('[SingletonSelectionRect] Singleton instance unmounting');
        if (currentInstance === rectRef) {
          isRenderingInstance = false;
          currentInstance = null;
        }
      };
    }
  }, [shouldRender]);
  
  // Log updates for debugging
  useEffect(() => {
    if (shouldRender && isVisible && rect) {
      console.log('[SingletonSelectionRect] Updating rect:', rect);
    }
  }, [shouldRender, isVisible, rect]);
  
  // Only render if this is the singleton instance
  if (!shouldRender) {
    console.log('[SingletonSelectionRect] Skipping render - another instance is active');
    return null;
  }
  
  if (!isVisible || !rect) {
    console.log('[SingletonSelectionRect] Not visible or no rect data');
    return null;
  }
  
  return (
    <rect
      ref={rectRef}
      x={rect.x}
      y={rect.y}
      width={rect.width}
      height={rect.height}
      fill="rgba(0, 120, 204, 0.15)"
      stroke="#007acc"
      strokeWidth="1"
      vectorEffect="non-scaling-stroke"
      style={{ 
        pointerEvents: 'none'
      }}
      data-selection-rect="singleton"
    />
  );
};

// Cleanup function for debugging
export const getSelectionRectSingletonStatus = () => {
  return {
    hasCurrentInstance: !!currentInstance,
    isRenderingInstance,
    elementExists: currentInstance?.current ? !!currentInstance.current.parentNode : false
  };
};

// Make debugging function available globally
if (typeof window !== 'undefined') {
  (window as any).getSelectionRectSingletonStatus = getSelectionRectSingletonStatus;
}