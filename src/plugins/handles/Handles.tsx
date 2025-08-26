import { Plugin } from '../../core/PluginSystem';
import { HandleControls } from './HandleUI';
import { HandleRenderer } from './HandleRenderer';
import { handleManager } from './HandleManager';

export const HandlesPlugin: Plugin = {
  id: 'handles',
  name: 'Handles',
  version: '1.0.0',
  enabled: true,

  ui: [
    {
      id: 'handle-controls',
      component: HandleControls,
      position: 'svg-content'
    },
    {
      id: 'handle-renderer',
      component: HandleRenderer,
      position: 'svg-content',
      order: 101 // Render above everything else, including selection UI
    }
  ],

  initialize: (editorStore) => {
    
    // Set up the editor store reference
    handleManager.setEditorStore(editorStore);
    
    // Expose manager for debugging
    (window as any).handleManager = handleManager;
    
    // Note: This plugin replaces the default control points renderer
    // The HandleRenderer provides enhanced visual feedback
    
    return () => {
      handleManager.cleanup();
    };
  },

  shortcuts: [
    {
      key: 'Alt+H',
      description: 'Convertir a handles simétricos',
      action: () => {
        const state = handleManager.getState();
        const selectedCommands = Object.keys(state.controlPoints);
        
        if (selectedCommands.length === 1) {
          handleManager.convertToMirrored(selectedCommands[0]);
        }
      }
    }
  ],

  handleKeyDown: (e: KeyboardEvent) => {
    // El manager ya maneja las teclas globalmente
    return false; // No bloquear otros plugins
  },

  handleKeyUp: (e: KeyboardEvent) => {
    // El manager ya maneja las teclas globalmente
    return false; // No bloquear otros plugins
  }
};
