import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { pencilManager } from './PencilManager';
import { PencilUI } from './PencilUI';
import { PencilCursor } from './PencilCursor';
import { PencilDebug } from './PencilDebug';
import { toolModeManager } from '../../managers/ToolModeManager';

export const PencilPlugin: Plugin = {
  id: 'pencil',
  name: 'Pencil Drawing Tool',
  version: '1.0.0',
  enabled: true,
  dependencies: ['mouse-interaction'],
  
  initialize: (editor) => {
    pencilManager.setEditorStore(editor);
    // Get SVG ref from plugin manager - we'll set it up later via a different mechanism
  },

  destroy: () => {
    pencilManager.destroy();
  },
  
  mouseHandlers: {
    onMouseDown: pencilManager.handleMouseDown,
    onMouseMove: pencilManager.handleMouseMove,
    onMouseUp: pencilManager.handleMouseUp,
  },
  
  shortcuts: [
    {
      key: 'p',
      description: 'Activate Pencil Tool',
      plugin: 'pencil',
      action: () => {
        toolModeManager.setMode('pencil');
      }
    },
    {
      key: 'Escape',
      description: 'Exit Pencil Mode',
      plugin: 'pencil',
      action: () => {
        toolModeManager.setMode('select');
      }
    }
  ],

  tools: [
    {
      id: 'pencil',
      name: 'Pencil',
      category: 'create',
      shortcut: 'P',
      onActivate: () => {
        const store = useEditorStore.getState();
        store.setCreateMode('PENCIL');
      },
      onDeactivate: () => {
        pencilManager.destroy();
      }
    }
  ],

  ui: [
    {
      id: 'pencil-tools',
      component: PencilUI,
      position: 'sidebar',
      order: 4
    },
    {
      id: 'pencil-cursor',
      component: PencilCursor,
      position: 'svg-content',
      order: 50
    },
    {
      id: 'pencil-debug',
      component: PencilDebug,
      position: 'svg-content',
      order: 100
    }
  ]
};
