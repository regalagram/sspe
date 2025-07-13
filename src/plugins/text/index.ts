import { toolModeManager } from '../../managers/ToolModeManager';
import { Plugin, PointerEventContext } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { PointerEvent } from 'react';
import { TextRenderer } from '../../components/TextRenderer';
import { TextPropertiesUI } from '../../components/TextPropertiesUI';

export const TextPlugin: Plugin = {
  id: 'text',
  name: 'Text',
  version: '1.0.0',
  enabled: true,

  ui: [
    {
      id: 'text-properties-ui',
      component: TextPropertiesUI,
      position: 'sidebar',
      order: 5,
    },
    {
      id: 'text-renderer',
      component: TextRenderer,
      position: 'svg-content',
    },
  ],

  shortcuts: [
    {
      key: 't',
      modifiers: [],
      description: 'Activate Text Tool',
      action: () => {
        toolModeManager.setMode('text');
      },
    },
  ],

  pointerHandlers: {
    onPointerDown: (e: PointerEvent<SVGElement>, context: PointerEventContext) => {
      const { activeMode } = toolModeManager.getState();
      if (activeMode !== 'text') {
        return false;
      }

      const { addText, selectText } = useEditorStore.getState();
      addText({ x: context.svgPoint.x, y: context.svgPoint.y });
      const newTextId = useEditorStore.getState().texts.slice(-1)[0].id;
      selectText(newTextId);
      toolModeManager.setMode('select');
      return true;
    },
  },
};
