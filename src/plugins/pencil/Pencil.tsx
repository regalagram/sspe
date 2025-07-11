import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { pencilManager } from './PencilManager';
import { PencilUI } from './PencilUI';
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
    }
  ]
};
