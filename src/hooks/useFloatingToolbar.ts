/**
 * Simplified floating toolbar hook
 * Focuses on core functionality: show/hide toolbar and self-cleanup
 */

import React, { useRef, useEffect, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';

interface UseFloatingToolbarOptions {
  isVisible: boolean;
  portalContainer: HTMLElement | null;
  position: { x: number; y: number } | null;
  isMobile?: boolean;
}

export const useFloatingToolbar = ({
  isVisible,
  portalContainer,
  position,
  isMobile = false
}: UseFloatingToolbarOptions) => {
  const [toolbarElement, setToolbarElement] = useState<HTMLDivElement | null>(null);
  const [forceUnmount, setForceUnmount] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const isMountedRef = useRef(true);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reactRootRef = useRef<Root | null>(null);

  // Component cleanup
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      
      // Clear any pending cleanup
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
        cleanupTimeoutRef.current = null;
      }
      
      // Clean self - give React time to cleanup before removing DOM element
      if (toolbarElement) {
        setToolbarElement(null);
        
        // Use timeout to ensure React has time to unmount portal content
        cleanupTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current === false && toolbarElement && toolbarElement.parentNode) {
            try {
              // Unmount React root first
              if (reactRootRef.current) {
                try {
                  reactRootRef.current.unmount();
                  reactRootRef.current = null;
                } catch (error) {
                  console.warn('[useFloatingToolbar] Unmount: Error unmounting React root:', error);
                }
              }
              
              toolbarElement.innerHTML = '';
              toolbarElement.parentNode.removeChild(toolbarElement);
            } catch (error) {
              console.warn('[useFloatingToolbar] Cleanup error removing toolbar element:', error);
            }
          }
          cleanupTimeoutRef.current = null;
        }, 16);
      }
    };
  }, [toolbarElement]);

  // Create toolbar element when visible (but not if cleaning up)
  useEffect(() => {
    if (!isMountedRef.current || isCleaningUp) return;

    if (isVisible && portalContainer && position && !toolbarElement) {
      const element = createToolbarElement();
      portalContainer.appendChild(element);
      updateToolbarPosition(element, position, isMobile);
      setToolbarElement(element);
      
      // Reset force unmount flag when creating new toolbar
      if (forceUnmount) {
        setForceUnmount(false);
      }
    }
  }, [isVisible, portalContainer, position, isMobile, toolbarElement, forceUnmount, isCleaningUp]);

  // Remove toolbar element when not visible
  useEffect(() => {
    if (!isVisible && toolbarElement && !forceUnmount) {
      // Set cleanup flag to prevent recreation during cleanup
      setIsCleaningUp(true);
      
      // Clear any pending cleanup first
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }
      
      setForceUnmount(true);
      
      // Unmount React root immediately
      if (reactRootRef.current) {
        try {
          reactRootRef.current.unmount();
          reactRootRef.current = null;
        } catch (error) {
          console.warn('[useFloatingToolbar] Error unmounting React root:', error);
        }
      }
      
      // Remove DOM element after brief delay
      cleanupTimeoutRef.current = setTimeout(() => {
        if (toolbarElement && toolbarElement.parentNode && isMountedRef.current) {
          try {
            toolbarElement.innerHTML = '';
            toolbarElement.parentNode.removeChild(toolbarElement);
          } catch (error) {
            console.warn('[useFloatingToolbar] Error removing toolbar element:', error);
          }
        }
        
        // Clean up state
        setTimeout(() => {
          setToolbarElement(null);
          setForceUnmount(false);
          setIsCleaningUp(false);
          cleanupTimeoutRef.current = null;
        }, 100);
      }, 16);
    }
  }, [isVisible, toolbarElement, forceUnmount]);

  // Update position when it changes
  useEffect(() => {
    if (toolbarElement && position) {
      updateToolbarPosition(toolbarElement, position, isMobile);
    }
  }, [toolbarElement, position, isMobile]);

  return {
    toolbarElement,
    renderPortal: (content: React.ReactNode) => {
      if (!toolbarElement || !content || !isVisible || forceUnmount) {
        // Unmount React root if exists
        if (reactRootRef.current) {
          try {
            reactRootRef.current.unmount();
            reactRootRef.current = null;
          } catch (error) {
            console.warn('[renderPortal] Error unmounting React root:', error);
          }
        }
        return null;
      }

      // Create or reuse React root
      if (!reactRootRef.current) {
        try {
          reactRootRef.current = createRoot(toolbarElement);
        } catch (error) {
          console.warn('[renderPortal] Error creating React root:', error);
          return null;
        }
      }

      // Render content using React root
      try {
        reactRootRef.current.render(content);
        return null;
      } catch (error) {
        console.warn('[renderPortal] Error rendering content:', error);
        return null;
      }
    }
  };
};

const createToolbarElement = (): HTMLDivElement => {
  const element = document.createElement('div');
  element.className = 'floating-toolbar-content';
  element.style.cssText = `
    position: absolute;
    z-index: 99999;
    pointer-events: auto;
    display: flex;
    flex-direction: row;
    gap: 0px;
    align-items: center;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1);
    min-height: 40px;
    min-width: 40px;
  `;
  return element;
};

const updateToolbarPosition = (
  element: HTMLDivElement,
  position: { x: number; y: number },
  isMobile: boolean
) => {
  element.style.left = isMobile ? '50%' : `${position.x}px`;
  element.style.top = isMobile ? '8px' : `${position.y}px`;
  element.style.transform = isMobile ? 'translateX(-50%)' : 'none';
  element.style.webkitTransform = isMobile ? 'translate3d(-50%, 0, 0)' : 'none';
  element.style.animation = isMobile ? 'none' : '0.2s ease-out 0s 1 normal forwards running fadeInScale';
  element.style.transformOrigin = 'center bottom';
  element.style.zIndex = isMobile ? '9999' : '40';
};
