import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { pencilManager } from './PencilManager';
import { PencilUI } from './PencilUI';
import { PencilDebug } from './PencilDebug';
import { toolModeManager } from '../../managers/ToolModeManager';

export const PencilPlugin: Plugin = {
  id: 'pencil',
  name: 'Pencil Drawing Tool',
  version: '1.0.0',
  enabled: true,
  dependencies: ['pointer-interaction'],
  
  initialize: (editor) => {
    pencilManager.setEditorStore(editor);
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
      key: 'p',
      description: 'Activate Pencil Tool',
      action: () => {
        toolModeManager.setMode('pencil');
      }
    },
    {
      key: 'Escape',
      description: 'Exit Pencil Mode',
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
      id: 'pencil-debug',
      component: PencilDebug,
      position: 'svg-content',
      order: 100
    }
  ]
};
