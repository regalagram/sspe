import { useEffect } from 'react';
import { pluginManager } from '../core/PluginSystem';

/**
 * Hook for handling global keyboard events through the plugin system
 * Following the centralized events principle from README.md
 */
export const useGlobalKeyboard = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      pluginManager.handleKeyDown(e);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      pluginManager.handleKeyUp(e);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
};
