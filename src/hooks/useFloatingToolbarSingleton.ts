/**
 * Hook for managing floating toolbar with singleton pattern
 * Prevents multiple toolbar instances and manages proper cleanup
 */

import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { toolbarSingletonManager } from '../utils/toolbar-singleton-manager';
import { buttonPoolManager, forceCleanupAllButtons } from '../utils/button-pool-manager';
import { performDeepEventCleanup } from '../utils/deep-event-cleanup';

interface UseFloatingToolbarSingletonOptions {
  isVisible: boolean;
  portalContainer: HTMLElement | null;
  position: { x: number; y: number } | null;
  isMobile?: boolean;
}

export const useFloatingToolbarSingleton = ({
  isVisible,
  portalContainer,
  position,
  isMobile = false
}: UseFloatingToolbarSingletonOptions) => {
  const [toolbarElement, setToolbarElement] = useState<HTMLDivElement | null>(null);
  const isMountedRef = useRef(true);
  
  // Initialize toolbar when conditions are met
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    if (isVisible && portalContainer && position) {
      console.log('[ToolbarSingleton Hook] Initializing toolbar');
      
      // Force cleanup of any existing detached buttons
      forceCleanupAllButtons();
      
      // Get or create singleton toolbar
      const element = toolbarSingletonManager.getToolbar(portalContainer);
      
      // Initialize button pool with the toolbar element
      buttonPoolManager.initialize(element);
      
      // Update position and styles
      updateToolbarPosition(element, position, isMobile);
      
      setToolbarElement(element);
    } else {
      console.log('[ToolbarSingleton Hook] Hiding toolbar with deep event cleanup');
      
      // CRITICAL: Clean events BEFORE React unmounts (preserves DOM structure)
      if (toolbarElement) {
        performDeepEventCleanup(toolbarElement);
      }
      
      // Clean up buttons first
      buttonPoolManager.forceCleanup();
      
      // Then hide the toolbar 
      toolbarSingletonManager.hideToolbar();
      
      setToolbarElement(null);
    }
  }, [isVisible, portalContainer, position, isMobile, toolbarElement]);
  
  // Update position when it changes
  useEffect(() => {
    if (toolbarElement && position) {
      updateToolbarPosition(toolbarElement, position, isMobile);
    }
  }, [toolbarElement, position, isMobile]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('[ToolbarSingleton Hook] Component unmounting - event cleanup');
      isMountedRef.current = false;
      
      // Clean events if toolbar exists before final cleanup
      if (toolbarElement) {
        performDeepEventCleanup(toolbarElement);
      }
      
      toolbarSingletonManager.hideToolbar();
      buttonPoolManager.forceCleanup();
    };
  }, [toolbarElement]);
  
  return {
    toolbarElement,
    renderPortal: (content: React.ReactNode) => {
      if (!toolbarElement || !isMountedRef.current || !isVisible) {
        console.log('[ToolbarSingleton Hook] Not rendering portal - visible:', isVisible, 'element:', !!toolbarElement, 'mounted:', isMountedRef.current);
        return null;
      }
      
      try {
        console.log('[ToolbarSingleton Hook] Rendering portal content');
        return createPortal(content, toolbarElement);
      } catch (error) {
        console.error('[ToolbarSingleton Hook] Error creating portal:', error);
        return null;
      }
    }
  };
};

/**
 * Update toolbar position and mobile-specific styles
 */
const updateToolbarPosition = (
  element: HTMLDivElement,
  position: { x: number; y: number },
  isMobile: boolean
) => {
  const styles = {
    left: isMobile ? '50%' : `${position.x}px`,
    top: isMobile ? '8px' : `${position.y}px`,
    transform: isMobile ? 'translateX(-50%)' : 'none',
    WebkitTransform: isMobile ? 'translate3d(-50%, 0, 0)' : 'none',
    animation: isMobile ? 'none' : '0.2s ease-out 0s 1 normal forwards running fadeInScale',
    transformOrigin: 'center bottom',
    zIndex: isMobile ? '9999' : '40',
    display: 'flex',
    flexDirection: 'row' as const,
    gap: '0px',
    alignItems: 'center'
  };
  
  Object.assign(element.style, styles);
  console.log('[ToolbarSingleton] Updated position:', { x: position.x, y: position.y, isMobile });
};