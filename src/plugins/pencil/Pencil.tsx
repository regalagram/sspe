import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { pencilManager } from './PencilManager';
import { PencilUI } from './PencilUI';
import { PencilCursor } from './PencilCursor';
import { PencilDebug } from './PencilDebug';

export const PencilPlugin: Plugin = {
  id: 'pencil',
  name: 'Pencil Drawing Tool',
  version: '1.0.0',
  enabled: true,
  dependencies: ['mouse-interaction'],
  
  initialize: (editor) => {
    console.log('PencilPlugin initialized with editor:', editor);
    pencilManager.setEditorStore(editor);
    // Get SVG ref from plugin manager - we'll set it up later via a different mechanism
  },

  destroy: () => {
    console.log('PencilPlugin destroyed');
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
      action: () => {
        const store = useEditorStore.getState();
        store.setCreateMode('PENCIL');
      }
    },
    {
      key: 'Escape',
      description: 'Exit Pencil Mode',
      action: () => {
        const store = useEditorStore.getState();
        const { mode } = store;
        if (mode.current === 'create' && mode.createMode?.commandType === 'PENCIL') {
          store.exitCreateMode();
        }
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
      position: 'toolbar',
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
