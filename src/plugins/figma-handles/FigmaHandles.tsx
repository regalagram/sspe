import { Plugin } from '../../core/PluginSystem';
import { FigmaHandleControls } from './FigmaHandleUI';
import { FigmaHandleRenderer } from './FigmaHandleRenderer';
import { figmaHandleManager } from './FigmaHandleManager';

export const FigmaHandlesPlugin: Plugin = {
  id: 'figma-handles',
  name: 'Figma Handles',
  version: '1.0.0',
  enabled: true,

  ui: [
    {
      id: 'figma-handle-controls',
      component: FigmaHandleControls,
      position: 'svg-content'
    },
    {
      id: 'figma-handle-renderer',
      component: FigmaHandleRenderer,
      position: 'svg-content',
      order: 15 // Render on top of regular control points
    }
  ],

  initialize: (editorStore) => {
    
    // Set up the editor store reference
    figmaHandleManager.setEditorStore(editorStore);
    
    // Expose manager for debugging
    (window as any).figmaHandleManager = figmaHandleManager;
    
    // Note: This plugin replaces the default control points renderer
    // The FigmaHandleRenderer provides enhanced visual feedback
    
    return () => {
      figmaHandleManager.cleanup();
    };
  },

  shortcuts: [
    {
      key: 'Alt+H',
      description: 'Convertir a handles simétricos',
      action: () => {
        const state = figmaHandleManager.getState();
        const selectedCommands = Object.keys(state.controlPoints);
        
        if (selectedCommands.length === 1) {
          figmaHandleManager.convertToMirrored(selectedCommands[0]);
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
