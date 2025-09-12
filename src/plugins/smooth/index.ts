import { Plugin } from '../../core/PluginSystem';
import { smoothManager } from './SmoothManager';
import { SmoothUI } from './SmoothUI';
import { SmoothRenderer } from './SmoothRenderer';
import { toolModeManager } from '../../core/ToolModeManager';

export const SmoothPlugin: Plugin = {
  id: 'smooth',
  name: 'Smooth Tool',
  version: '1.0.0',
  enabled: true,
  dependencies: ['pointer-interaction'],
  
  initialize: (editor) => {
    smoothManager.setEditorStore(editor);
    // Register with tool mode manager
    toolModeManager.setSmoothManager(smoothManager);
  },

  destroy: () => {
    smoothManager.destroy();
  },
  
  pointerHandlers: {
    onPointerDown: smoothManager.handlePointerDown,
    onPointerMove: smoothManager.handlePointerMove,
    onPointerUp: smoothManager.handlePointerUp,
  },
  
  shortcuts: [
    {
      key: 'Escape',
      description: 'Exit Smooth Mode',
      action: () => {
        toolModeManager.setMode('select');
      }
    },
    {
      key: 's',
      modifiers: [],
      description: 'Activate Smooth Tool',
      action: () => {
        toolModeManager.setMode('smooth');
      }
    }
  ],

  tools: [
    {
      id: 'smooth',
      name: 'Smooth',
      category: 'create',
      shortcut: 'S',
      onActivate: () => {
        toolModeManager.setMode('smooth');
      },
      onDeactivate: () => {
        smoothManager.destroy();
      }
    }
  ],

  ui: [
    {
      id: 'smooth-controls',
      component: SmoothUI,
      position: 'sidebar',
      order: 5
    },
    {
      id: 'smooth-renderer',
      component: SmoothRenderer,
      position: 'svg-content',
      order: 11
    }
  ]
};
