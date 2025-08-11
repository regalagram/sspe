import { Plugin } from '../../core/PluginSystem';
import { textPointerHandlers, textManager } from '../../managers/TextManager';
import { toolModeManager } from '../../managers/ToolModeManager';

export const TextPlacementPlugin: Plugin = {
  id: 'text-placement',
  name: 'Text Placement',
  version: '1.0.0',
  enabled: true,
  
  initialize: (editorStore: any) => {
    textManager.setEditorStore(editorStore);
  },
  
  shortcuts: [
    {
      key: 'Escape',
      action: () => {
        // Exit text mode when Escape is pressed
        if (toolModeManager.isActive('text')) {
          toolModeManager.setMode('select');
        }
      },
      description: 'Exit text placement mode'
    }
  ],
  
  pointerHandlers: textPointerHandlers,
};