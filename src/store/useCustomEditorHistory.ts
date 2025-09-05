import { useCallback } from 'react';

/**
 * Temporary hook that mimics the custom editor history
 * We'll implement this properly once we migrate the store
 */
export const useCustomEditorHistory = () => {
  // For now, return a simple implementation that shows the concept works
  const undo = useCallback(() => {
    console.log('Custom undo called - implementation coming soon');
  }, []);

  const redo = useCallback(() => {
    console.log('Custom redo called - implementation coming soon');
  }, []);

  const clear = useCallback(() => {
    console.log('Custom clear called - implementation coming soon');
  }, []);

  return {
    canUndo: false,
    canRedo: false,
    undo,
    redo,
    clear
  };
};
