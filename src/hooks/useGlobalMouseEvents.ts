import { useEffect } from 'react';
import { pluginManager } from '../core/PluginSystem';

/**
 * Hook for handling global mouse events that escape the SVG during drag operations
 * Following the centralized mouse events system principle from README.md
 */
export const useGlobalMouseEvents = () => {
  useEffect(() => {
    const handleNativeMove = (e: MouseEvent) => {
      // Skip synthetic touch events to prevent double processing
      if ((e as any).fromTouch) return;
      
      if (e.buttons === 1) {
        const mouseEvent = {
          ...e,
          nativeEvent: e,
          currentTarget: e.target,
          target: e.target,
          clientX: e.clientX,
          clientY: e.clientY,
          buttons: e.buttons,
          button: e.button,
          preventDefault: () => e.preventDefault(),
          stopPropagation: () => e.stopPropagation(),
        } as any;
        pluginManager.handleMouseEvent('mouseMove', mouseEvent);
      }
    };

    const handleNativeUp = (e: MouseEvent) => {
      // Skip synthetic touch events to prevent double processing
      if ((e as any).fromTouch) return;
      
      const mouseEvent = {
        ...e,
        nativeEvent: e,
        currentTarget: e.target,
        target: e.target,
        clientX: e.clientX,
        clientY: e.clientY,
        buttons: e.buttons,
        button: e.button,
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation(),
      } as any;
      pluginManager.handleMouseEvent('mouseUp', mouseEvent);
    };

    document.addEventListener('mousemove', handleNativeMove);
    document.addEventListener('mouseup', handleNativeUp);
    
    return () => {
      document.removeEventListener('mousemove', handleNativeMove);
      document.removeEventListener('mouseup', handleNativeUp);
    };
  }, []);
};
