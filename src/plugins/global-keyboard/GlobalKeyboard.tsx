import { Plugin, pluginManager } from '../../core/PluginSystem';
import { curvesManager } from '../curves/CurvesManager';

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
        if (editorStore) {
          // Check if we're in curves mode and have a selected point
          const curveState = curvesManager.getState();
          if (curveState.isActive && curveState.selectedPointId) {
            curvesManager.deleteSelectedPoint();
            return;
          }
          
          // Default behavior: delete selected commands
          if (editorStore.selection.selectedCommands.length > 0) {
            editorStore.selection.selectedCommands.forEach((commandId: string) => {
              editorStore.removeCommand(commandId);
            });
            editorStore.clearSelection();
            editorStore.pushToHistory();
          }
        }
      },
      description: 'Delete selected commands or curve points'
    },
    {
      key: 'Backspace',
      action: () => {
        const editorStore = pluginManager.getEditorStore();
        if (editorStore) {
          // Check if we're in curves mode and have a selected point
          const curveState = curvesManager.getState();
          if (curveState.isActive && curveState.selectedPointId) {
            curvesManager.deleteSelectedPoint();
            return;
          }
          
          // Default behavior: delete selected commands
          if (editorStore.selection.selectedCommands.length > 0) {
            editorStore.selection.selectedCommands.forEach((commandId: string) => {
              editorStore.removeCommand(commandId);
            });
            editorStore.clearSelection();
            editorStore.pushToHistory();
          }
        }
      },
      description: 'Delete selected commands or curve points'
    },
    {
      key: 'Enter',
      action: () => {
        const editorStore = pluginManager.getEditorStore();
        if (editorStore) {
          // Check if we're in curves mode
          const curveState = curvesManager.getState();
          if (curveState.isActive && curveState.points.length >= 2) {
            curvesManager.manualFinishPath();
            return;
          }
        }
      },
      description: 'Finish curve path'
    },
    {
      key: 'Escape',
      action: () => {
        const editorStore = pluginManager.getEditorStore();
        if (editorStore) {
          // Check if we're in curves mode
          const curveState = curvesManager.getState();
          if (curveState.isActive) {
            curvesManager.exitCurveTool();
            return;
          }
          
          // Default behavior: clear selection
          editorStore.clearSelection();
        }
      },
      description: 'Clear selection or exit curve tool'
    }
  ],
};
