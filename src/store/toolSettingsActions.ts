import { StateCreator } from 'zustand';
import { EditorState, DrawingToolSettings } from '../types';

export interface ToolSettingsActions {
  updateDrawingSettings: (settings: Partial<DrawingToolSettings>) => void;
  getDrawingSettings: () => DrawingToolSettings;
  // Legacy methods for backward compatibility
  updatePencilSettings: (settings: Partial<DrawingToolSettings>) => void;
  updateCurvesSettings: (settings: Partial<DrawingToolSettings>) => void;
  updateShapesSettings: (settings: Partial<DrawingToolSettings>) => void;
  getToolSettings: (tool: 'pencil' | 'curves' | 'shapes') => DrawingToolSettings;
}

export const createToolSettingsActions: StateCreator<
  EditorState & ToolSettingsActions,
  [],
  [],
  ToolSettingsActions
> = (set, get) => ({
  updateDrawingSettings: (settings: Partial<DrawingToolSettings>) => {
    set((state) => ({
      ...state,
      toolSettings: {
        ...state.toolSettings,
        shared: { ...state.toolSettings.shared, ...settings }
      }
    }));
  },

  getDrawingSettings: () => {
    const state = get();
    return state.toolSettings.shared;
  },

  // Legacy methods for backward compatibility - all point to shared settings
  updatePencilSettings: (settings: Partial<DrawingToolSettings>) => {
    get().updateDrawingSettings(settings);
  },

  updateCurvesSettings: (settings: Partial<DrawingToolSettings>) => {
    get().updateDrawingSettings(settings);
  },

  updateShapesSettings: (settings: Partial<DrawingToolSettings>) => {
    get().updateDrawingSettings(settings);
  },

  getToolSettings: (tool: 'pencil' | 'curves' | 'shapes') => {
    const state = get();
    return state.toolSettings.shared;
  }
});
