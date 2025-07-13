import { StateCreator } from 'zustand';
import { EditorState, EditorCommandType } from '../types';
import { HistoryActions } from './historyActions';

export interface UIStateActions {
  setMode: (mode: EditorState['mode']['current']) => void;
  setCreateMode: (commandType: EditorCommandType) => void;
  exitCreateMode: () => void;
  toggleGrid: () => void;
  setGridSize: (size: number) => void;
  toggleSnapToGrid: () => void;
  toggleGridLabels: () => void;
  toggleFeature: (feature: string) => void;
  toggleFullscreen: () => void;
  forceRender: () => void;
  setPrecision: (precision: number) => void;
  setShapeSize: (size: number) => void;
  setVisualDebugGlobalFactor: (factor: number) => void;
  setVisualDebugCommandPointsFactor: (factor: number) => void;
  setVisualDebugControlPointsFactor: (factor: number) => void;
  setVisualDebugTransformResizeFactor: (factor: number) => void;
  setVisualDebugTransformRotateFactor: (factor: number) => void;
}

export const createUIStateActions: StateCreator<
  EditorState & UIStateActions & HistoryActions,
  [],
  [],
  UIStateActions
> = (set, get) => ({
  setMode: (mode) =>
    set((state) => ({
      mode: {
        ...state.mode,
        current: mode,
        createMode: mode === 'create' ? state.mode.createMode : undefined,
      },
    })),

  setCreateMode: (commandType) => {
    set((state) => ({
      mode: {
        current: 'create',
        createMode: {
          commandType,
          isDrawing: false,
        },
      },
    }));
  },

  exitCreateMode: () =>
    set(() => ({
      mode: {
        current: 'select',
      },
    })),

  toggleGrid: () =>
    set((state) => {
      const newState = {
        grid: {
          ...state.grid,
          enabled: !state.grid.enabled,
        },
      };
      return newState;
    }),

  setGridSize: (size) =>
    set((state) => {
      const newState = {
        grid: {
          ...state.grid,
          size,
        },
      };
      return newState;
    }),

  toggleSnapToGrid: () =>
    set((state) => {
      const newState = {
        grid: {
          ...state.grid,
          snapToGrid: !state.grid.snapToGrid,
        },
      };
      return newState;
    }),

  toggleGridLabels: () =>
    set((state) => {
      const newState = {
        grid: {
          ...state.grid,
          showLabels: !state.grid.showLabels,
        },
      };
      return newState;
    }),

  toggleFeature: (feature) =>
    set((state) => {
      if (!(feature in state.enabledFeatures)) {
        return {};
      }
      return {
        enabledFeatures: {
          ...state.enabledFeatures,
          [feature]: !state.enabledFeatures[feature as keyof typeof state.enabledFeatures]
        }
      };
    }),

  toggleFullscreen: () =>
    set((state) => ({
      isFullscreen: !state.isFullscreen,
    })),

  forceRender: () =>
    set((state) => ({
      renderVersion: state.renderVersion + 1,
    })),

  setPrecision: (precision: number) => {
    get().pushToHistory();
    set((state) => {
      const round = (val: number | undefined) =>
        typeof val === 'number' ? Number(val.toFixed(precision)) : val;
      const newPaths = state.paths.map((path) => ({
        ...path,
        subPaths: path.subPaths.map((subPath) => ({
          ...subPath,
          commands: subPath.commands.map((cmd) => ({
            ...cmd,
            x: round(cmd.x),
            y: round(cmd.y),
            x1: round(cmd.x1),
            y1: round(cmd.y1),
            x2: round(cmd.x2),
            y2: round(cmd.y2),
          })),
        })),
      }));
      const newState = {
        precision,
        paths: newPaths,
        renderVersion: state.renderVersion + 1,
      };
      return newState;
    });
  },

  setShapeSize: (size) => {
    set((state) => ({
      shapeSize: Math.max(10, Math.min(300, size)),
    }));
  },

  setVisualDebugGlobalFactor: (factor: number) => {
    set((state) => {
      const newState = {
        visualDebugSizes: {
          ...state.visualDebugSizes,
          globalFactor: Math.max(0.1, Math.min(5.0, factor)),
        },
        renderVersion: state.renderVersion + 1,
      };
      return newState;
    });
  },

  setVisualDebugCommandPointsFactor: (factor: number) => {
    set((state) => {
      const newState = {
        visualDebugSizes: {
          ...state.visualDebugSizes,
          commandPointsFactor: Math.max(0.1, Math.min(5.0, factor)),
        },
        renderVersion: state.renderVersion + 1,
      };
      return newState;
    });
  },

  setVisualDebugControlPointsFactor: (factor: number) => {
    set((state) => {
      const newState = {
        visualDebugSizes: {
          ...state.visualDebugSizes,
          controlPointsFactor: Math.max(0.1, Math.min(5.0, factor)),
        },
        renderVersion: state.renderVersion + 1,
      };
      return newState;
    });
  },

  setVisualDebugTransformResizeFactor: (factor: number) => {
    set((state) => {
      const newState = {
        visualDebugSizes: {
          ...state.visualDebugSizes,
          transformResizeFactor: Math.max(0.1, Math.min(5.0, factor)),
        },
        renderVersion: state.renderVersion + 1,
      };
      return newState;
    });
  },

  setVisualDebugTransformRotateFactor: (factor: number) => {
    set((state) => {
      const newState = {
        visualDebugSizes: {
          ...state.visualDebugSizes,
          transformRotateFactor: Math.max(0.1, Math.min(5.0, factor)),
        },
        renderVersion: state.renderVersion + 1,
      };
      return newState;
    });
  },
});