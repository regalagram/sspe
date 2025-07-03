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

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
};
