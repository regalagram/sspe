import { useEffect } from 'react';
import { pluginManager } from '../core/PluginSystem';

export const useGlobalPointerEvents = () => {
  useEffect(() => {
    const handleNativeMove = (e: PointerEvent) => {
      if (e.buttons === 1) {
        const pointerEvent = {
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
        pluginManager.handlePointerEvent('pointerMove', pointerEvent);
      }
    };

    const handleNativeUp = (e: PointerEvent) => {
      const pointerEvent = {
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
      pluginManager.handlePointerEvent('pointerUp', pointerEvent);
    };

    document.addEventListener('pointermove', handleNativeMove);
    document.addEventListener('pointerup', handleNativeUp);
    
    return () => {
      document.removeEventListener('pointermove', handleNativeMove);
      document.removeEventListener('pointerup', handleNativeUp);
    };
  }, []);
};
