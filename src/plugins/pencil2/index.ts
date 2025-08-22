import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { pencil2Manager } from './Pencil2Manager';
import { Pencil2UI } from './Pencil2UI';
import { Pencil2Renderer } from './Pencil2Renderer';
import { toolModeManager } from '../../managers/ToolModeManager';

export const Pencil2Plugin: Plugin = {
  id: 'pencil2',
  name: 'Pencil Drawing Tool v2',
  version: '1.0.0',
  enabled: true,
  dependencies: ['pointer-interaction'],
  
  initialize: (editor) => {
    pencil2Manager.setEditorStore(editor);
    // Register with tool mode manager
    toolModeManager.setPencilManager(pencil2Manager);
  },

  destroy: () => {
    pencil2Manager.destroy();
  },
  
  pointerHandlers: {
    onPointerDown: pencil2Manager.handlePointerDown,
    onPointerMove: pencil2Manager.handlePointerMove,
    onPointerUp: pencil2Manager.handlePointerUp,
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
      id: 'pencil2',
      name: 'Pencil v2',
      category: 'create',
      shortcut: 'P',
      onActivate: () => {
        toolModeManager.setMode('pencil');
      },
      onDeactivate: () => {
        pencil2Manager.destroy();
      }
    }
  ],

  ui: [
    {
      id: 'pencil2-controls',
      component: Pencil2UI,
      position: 'sidebar',
      order: 4
    },
    {
      id: 'pencil2-renderer',
      component: Pencil2Renderer,
      position: 'svg-content',
      order: 10
    }
  ]
};