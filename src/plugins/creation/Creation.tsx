import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { creationManager } from './CreationManager';
import { CreationRenderer } from './CreationRenderer';
import { CreationUI } from './CreationUI';
import { toolModeManager } from '../../core/ToolModeManager';

export const CreationPlugin: Plugin = {
  id: 'creation',
  name: 'Creation',
  version: '1.0.0',
  enabled: true,
  dependencies: ['pointer-interaction'],
  
  initialize: (editor) => {
    creationManager.setEditorStore(editor);
  },
  
  pointerHandlers: {
    onPointerDown: creationManager.handlePointerDown,
  },
  
  shortcuts: [
    {
      key: 'm',
      description: 'Move To Tool',
      action: () => {
        toolModeManager.setMode('creation', { commandType: 'M' });
      }
    },
    {
      key: 'shift+m',
      description: 'New Path Tool',
      action: () => {
        toolModeManager.setMode('creation', { commandType: 'NEW_PATH' });
      }
    },
    {
      key: 'l',
      description: 'Line To Tool',
      action: () => {
        toolModeManager.setMode('creation', { commandType: 'L' });
      }
    },
    {
      key: 'c',
      description: 'Cubic Bezier Tool',
      action: () => {
        toolModeManager.setMode('creation', { commandType: 'C' });
      }
    },
    {
      key: 'z',
      description: 'Close Path Tool',
      action: () => {
        toolModeManager.setMode('creation', { commandType: 'Z' });
      }
    },
    {
      key: 'Escape',
      description: 'Exit Create Mode',
      action: () => {
        toolModeManager.setMode('select');
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
      id: 'new-path',
      name: 'New Path',
      category: 'create',
      shortcut: 'Shift+M',
      onActivate: () => {
        const store = useEditorStore.getState();
        store.setCreateMode('NEW_PATH');
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
