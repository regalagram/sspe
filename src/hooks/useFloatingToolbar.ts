/**
 * Simplified floating toolbar hook using React portals
 * Much simpler cleanup logic than createRoot approach
 */

import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface UseFloatingToolbarOptions {
  isVisible: boolean;
  portalContainer: HTMLElement | null;
  position: { x: number; y: number } | null;
  isMobile?: boolean;
  buttonSize?: number;
}

export const useFloatingToolbar = ({
  isVisible,
  portalContainer,
  position,
  isMobile = false,
  buttonSize = 32
}: UseFloatingToolbarOptions) => {
  const isMountedRef = useRef(true);

  // Simple cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    renderPortal: (content: React.ReactNode) => {
      // Don't render if not visible or no portal container
      if (!isVisible || !portalContainer || !position || !content) {
        return null;
      }

      // Create the toolbar wrapper with positioning styles
      const toolbarWrapper = React.createElement('div', {
        className: 'floating-toolbar-content',
        style: {
          position: 'absolute',
          left: isMobile ? '50%' : `${position.x}px`,
          top: isMobile ? '0px' : `${position.y}px`,
          transform: isMobile ? 'translateX(-50%)' : 'none',
          zIndex: isMobile ? 9999 : 40,
          pointerEvents: 'auto',
          display: 'flex',
          flexDirection: 'row',
          gap: '0px',
          alignItems: 'center',
          background: 'white',
          padding: '0px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          minHeight: `${buttonSize}px`,
          minWidth: `${buttonSize}px`,
          animation: isMobile ? 'none' : '0.2s ease-out 0s 1 normal forwards running fadeInScale',
          transformOrigin: 'center bottom',
          // Ensure mobile transform is preserved
          ...(isMobile && {
            WebkitTransform: 'translate3d(-50%, 0, 0)'
          })
        },
        onPointerDown: (e: React.PointerEvent) => {
          const target = e.target as HTMLElement;
          const isButton = target.tagName === 'BUTTON' || target.closest('button');
          const isMultiTouch = e.pointerType === 'touch' && (e as any).touches?.length > 1;

          if (isButton && !isMultiTouch) {
            e.stopPropagation();
          }
        }
      }, content);

      // Use React portal to render outside normal DOM hierarchy
      return createPortal(toolbarWrapper, portalContainer);
    }
  };
};
