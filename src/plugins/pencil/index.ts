import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { pencilManager } from './PencilManager';
import { PencilUI } from './PencilUI';
import { PencilRenderer } from './PencilRenderer';
import { toolModeManager } from '../../core/ToolModeManager';

export const PencilPlugin: Plugin = {
  id: 'pencil',
  name: 'Pencil Drawing Tool v2',
  version: '1.0.0',
  enabled: true,
  dependencies: ['pointer-interaction'],
  
  initialize: (editor) => {
    pencilManager.setEditorStore(editor);
    // Register with tool mode manager
    toolModeManager.setPencilManager(pencilManager);
  },

  destroy: () => {
    pencilManager.destroy();
  },
  
  pointerHandlers: {
    onPointerDown: pencilManager.handlePointerDown,
    onPointerMove: pencilManager.handlePointerMove,
    onPointerUp: pencilManager.handlePointerUp,
  },
  
  shortcuts: [
    {
      key: 'Escape',
      description: 'Exit Pencil Mode',
      action: () => {
        toolModeManager.setMode('select');
      }
    },
    {
      key: 'p',
      modifiers: [],
      description: 'Activate Pencil Tool',
      action: () => {
        toolModeManager.setMode('pencil');
      }
    }
  ],

  tools: [
    {
      id: 'pencil',
      name: 'Pencil v2',
      category: 'create',
      shortcut: 'P',
      onActivate: () => {
        toolModeManager.setMode('pencil');
      },
      onDeactivate: () => {
        pencilManager.destroy();
      }
    }
  ],

  ui: [
    {
      id: 'pencil-controls',
      component: PencilUI,
      position: 'sidebar',
      order: 4
    },
    {
      id: 'pencil-renderer',
      component: PencilRenderer,
      position: 'svg-content',
      order: 10
    }
  ]
};