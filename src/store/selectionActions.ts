import { StateCreator } from 'zustand';
import { EditorState, Point } from '../types';
import { findSubPathAtPoint } from '../utils/path-utils';

export interface SelectionActions {
  selectPath: (pathId: string) => void;
  selectSubPath: (subPathId: string) => void;
  selectSubPathMultiple: (subPathId: string, isShiftPressed?: boolean) => void;
  selectCommand: (commandId: string) => void;
  selectMultiple: (ids: string[], type: 'paths' | 'subpaths' | 'commands') => void;
  clearSelection: () => void;
  selectSubPathByPoint: (pathId: string, point: Point, isShiftPressed?: boolean) => void;
}

export const createSelectionActions: StateCreator<
  EditorState & SelectionActions,
  [],
  [],
  SelectionActions
> = (set, get) => ({
  selectPath: (pathId) =>
    set((state) => ({
      selection: {
        ...state.selection,
        selectedPaths: [pathId],
        selectedSubPaths: [],
        selectedCommands: [],
      },
    })),

  selectSubPath: (subPathId) =>
    set((state) => {
      const isLocked = state.paths.some(path =>
        path.subPaths.some(subPath => subPath.id === subPathId && subPath.locked)
      );
      if (isLocked) {
        return {
          selection: {
            ...state.selection,
            selectedSubPaths: [],
            selectedPaths: [],
            selectedCommands: [],
          },
        };
      }
      return {
        selection: {
          ...state.selection,
          selectedSubPaths: [subPathId],
          selectedPaths: [],
          selectedCommands: [],
        },
      };
    }),

  selectSubPathMultiple: (subPathId, isShiftPressed = false) =>
    set((state) => {
      const isLocked = state.paths.some(path =>
        path.subPaths.some(subPath => subPath.id === subPathId && subPath.locked)
      );
      if (isLocked) {
        return { selection: { ...state.selection } };
      }
      if (isShiftPressed && state.selection.selectedSubPaths.length > 0) {
        const currentSelection = state.selection.selectedSubPaths;
        if (currentSelection.includes(subPathId)) {
          return {
            selection: {
              ...state.selection,
              selectedSubPaths: currentSelection.filter(id => id !== subPathId),
              selectedPaths: [],
              selectedCommands: [],
            },
          };
        } else {
          return {
            selection: {
              ...state.selection,
              selectedSubPaths: [...currentSelection, subPathId],
              selectedPaths: [],
              selectedCommands: [],
            },
          };
        }
      } else {
        return {
          selection: {
            ...state.selection,
            selectedSubPaths: [subPathId],
            selectedPaths: [],
            selectedCommands: [],
          },
        };
      }
    }),

  selectCommand: (commandId) =>
    set((state) => {
      let isLocked = false;
      for (const path of state.paths) {
        for (const subPath of path.subPaths) {
          if (subPath.commands.some(cmd => cmd.id === commandId)) {
            if (subPath.locked) {
              isLocked = true;
            }
            break;
          }
        }
        if (isLocked) break;
      }
      if (isLocked) {
        return {
          selection: {
            ...state.selection,
            selectedCommands: [],
            selectedPaths: [],
            selectedSubPaths: [],
          },
        };
      }
      return {
        selection: {
          ...state.selection,
          selectedCommands: [commandId],
          selectedPaths: [],
          selectedSubPaths: [],
        },
      };
    }),

  selectMultiple: (ids, type) =>
    set((state) => {
      const newSelection = { ...state.selection };
      if (type === 'paths') {
        newSelection.selectedPaths = ids;
        newSelection.selectedSubPaths = [];
        newSelection.selectedCommands = [];
      } else if (type === 'subpaths') {
        const allowed = ids.filter(id =>
          !state.paths.some(path =>
            path.subPaths.some(subPath => subPath.id === id && subPath.locked)
          )
        );
        newSelection.selectedSubPaths = allowed;
        newSelection.selectedPaths = [];
        newSelection.selectedCommands = [];
      } else if (type === 'commands') {
        const allowed = ids.filter(cmdId => {
          for (const path of state.paths) {
            for (const subPath of path.subPaths) {
              if (subPath.commands.some(cmd => cmd.id === cmdId)) {
                if (subPath.locked) return false;
                return true;
              }
            }
          }
          return false;
        });
        newSelection.selectedCommands = allowed;
        newSelection.selectedPaths = [];
        newSelection.selectedSubPaths = [];
      }
      return { selection: newSelection };
    }),

  clearSelection: () =>
    set((state) => ({
      selection: {
        ...state.selection,
        selectedPaths: [],
        selectedSubPaths: [],
        selectedCommands: [],
        selectedControlPoints: [],
      },
    })),

  selectSubPathByPoint: (pathId, point, isShiftPressed = false) => {
    const state = get();
    const path = state.paths.find(p => p.id === pathId);
    if (!path) return;
    const foundSubPath = findSubPathAtPoint(path, point, 15);
    if (foundSubPath) {
      get().selectSubPathMultiple(foundSubPath.id, isShiftPressed);
    }
  },
});