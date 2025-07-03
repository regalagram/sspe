import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { creationManager } from './CreationManager';
import { CreationRenderer } from './CreationRenderer';
import { CreationUI } from './CreationUI';

export const CreationPlugin: Plugin = {
  id: 'creation',
  name: 'Creation',
  version: '1.0.0',
  enabled: true,
  dependencies: ['mouse-interaction'],
  
  initialize: (editor) => {
    creationManager.setEditorStore(editor);
  },
  
  mouseHandlers: {
    onMouseDown: creationManager.handleMouseDown,
  },
  
  shortcuts: [
    {
      key: 'm',
      description: 'Move To Tool',
      action: () => {
        const store = useEditorStore.getState();
        store.setCreateMode('M');
      }
    },
    {
      key: 'l',
      description: 'Line To Tool',
      action: () => {
        const store = useEditorStore.getState();
        store.setCreateMode('L');
      }
    },
    {
      key: 'c',
      description: 'Cubic Bezier Tool',
      action: () => {
        const store = useEditorStore.getState();
        store.setCreateMode('C');
      }
    },
    {
      key: 'z',
      description: 'Close Path Tool',
      action: () => {
        const store = useEditorStore.getState();
        store.setCreateMode('Z');
      }
    },
    {
      key: 'Escape',
      description: 'Exit Create Mode',
      action: () => {
        const store = useEditorStore.getState();
        store.exitCreateMode();
      }
    }
  ],

  tools: [
    {
      id: 'move-to',
      name: 'Move To',
      category: 'create',
      shortcut: 'M',
      onActivate: () => {
        const store = useEditorStore.getState();
        store.setCreateMode('M');
      }
    },
    {
      id: 'line-to',
      name: 'Line To',
      category: 'create',
      shortcut: 'L',
      onActivate: () => {
        const store = useEditorStore.getState();
        store.setCreateMode('L');
      }
    },
    {
      id: 'cubic-bezier',
      name: 'Cubic Bezier',
      category: 'create',
      shortcut: 'C',
      onActivate: () => {
        const store = useEditorStore.getState();
        store.setCreateMode('C');
      }
    },
    {
      id: 'close-path',
      name: 'Close Path',
      category: 'create',
      shortcut: 'Z',
      onActivate: () => {
        const store = useEditorStore.getState();
        store.setCreateMode('Z');
      }
    }
  ],

  ui: [
    {
      id: 'creation-renderer',
      component: CreationRenderer,
      position: 'svg-content',
      order: 40, // Render on top
    },
    {
      id: 'creation-tools',
      component: CreationUI,
      position: 'toolbar',
      order: 3
    }
  ]
};
