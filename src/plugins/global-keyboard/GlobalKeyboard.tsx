import { Plugin, pluginManager } from '../../core/PluginSystem';

export const GlobalKeyboardPlugin: Plugin = {
  id: 'global-keyboard',
  name: 'Global Keyboard Shortcuts',
  version: '1.0.0',
  enabled: true,
  shortcuts: [
    {
      key: 'Delete',
      action: () => {
        const editorStore = pluginManager.getEditorStore();
        if (editorStore && editorStore.selection.selectedCommands.length > 0) {
          editorStore.selection.selectedCommands.forEach((commandId: string) => {
            editorStore.removeCommand(commandId);
          });
          editorStore.clearSelection();
          editorStore.pushToHistory();
        }
      },
      description: 'Delete selected commands'
    },
    {
      key: 'Backspace',
      action: () => {
        const editorStore = pluginManager.getEditorStore();
        if (editorStore && editorStore.selection.selectedCommands.length > 0) {
          editorStore.selection.selectedCommands.forEach((commandId: string) => {
            editorStore.removeCommand(commandId);
          });
          editorStore.clearSelection();
          editorStore.pushToHistory();
        }
      },
      description: 'Delete selected commands'
    },
    {
      key: 'Escape',
      action: () => {
        const editorStore = pluginManager.getEditorStore();
        if (editorStore) {
          editorStore.clearSelection();
        }
      },
      description: 'Clear selection'
    }
  ],
};
