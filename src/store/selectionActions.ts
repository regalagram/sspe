import { StateCreator } from 'zustand';
import { EditorState, Point } from '../types';
import { findSubPathAtPoint } from '../utils/path-utils';
import { calculateTextBounds } from '../utils/text-utils';

export interface SelectionActions {
  selectPath: (pathId: string, addToSelection?: boolean) => void;
  selectSubPath: (subPathId: string, addToSelection?: boolean) => void;
  selectSubPathMultiple: (subPathId: string, isShiftPressed?: boolean) => void;
  selectCommand: (commandId: string, addToSelection?: boolean) => void;
  selectText: (textId: string, addToSelection?: boolean) => void;
  selectTextMultiple: (textId: string, isShiftPressed?: boolean) => void;
  selectTextSpan: (textId: string, spanId: string, addToSelection?: boolean) => void;
  selectMultiple: (ids: string[], type: 'paths' | 'subpaths' | 'commands' | 'texts' | 'textspans') => void;
  addToSelection: (id: string, type: 'path' | 'subpath' | 'command' | 'text' | 'textspan') => void;
  removeFromSelection: (id: string, type: 'path' | 'subpath' | 'command' | 'text' | 'textspan') => void;
  clearSelection: () => void;
  selectSubPathByPoint: (pathId: string, point: Point, isShiftPressed?: boolean) => void;
  selectTextByPoint: (point: Point, isShiftPressed?: boolean) => void;
  selectInBox: (box: { x: number; y: number; width: number; height: number }) => void;
}

export const createSelectionActions: StateCreator<
  EditorState & SelectionActions,
  [],
  [],
  SelectionActions
> = (set, get) => ({
  selectPath: (pathId, addToSelection = false) =>
    set((state) => ({
      selection: addToSelection ? {
        ...state.selection,
        selectedPaths: state.selection.selectedPaths.includes(pathId) 
          ? state.selection.selectedPaths 
          : [...state.selection.selectedPaths, pathId],
      } : {
        ...state.selection,
        selectedPaths: [pathId],
        selectedSubPaths: [],
        selectedCommands: [],
        selectedTexts: [],
        selectedTextSpans: [],
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
        selectedTexts: [],
        selectedTextSpans: [],
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

  selectText: (textId, addToSelection = false) =>
    set((state) => {
      const text = state.texts.find(t => t.id === textId);
      if (!text || text.locked) {
        return state;
      }
      return {
        selection: addToSelection ? {
          ...state.selection,
          selectedTexts: state.selection.selectedTexts.includes(textId)
            ? state.selection.selectedTexts
            : [...state.selection.selectedTexts, textId],
        } : {
          ...state.selection,
          selectedTexts: [textId],
          selectedTextSpans: [],
          selectedPaths: [],
          selectedSubPaths: [],
          selectedCommands: [],
        },
      };
    }),

  selectTextMultiple: (textId, isShiftPressed = false) =>
    set((state) => {
      const text = state.texts.find(t => t.id === textId);
      if (!text || text.locked) return state;

      const currentSelection = state.selection.selectedTexts;
      
      if (isShiftPressed) {
        if (currentSelection.includes(textId)) {
          return {
            selection: {
              ...state.selection,
              selectedTexts: currentSelection.filter(id => id !== textId),
            },
          };
        } else {
          return {
            selection: {
              ...state.selection,
              selectedTexts: [...currentSelection, textId],
              selectedPaths: [],
              selectedSubPaths: [],
              selectedCommands: [],
            },
          };
        }
      } else {
        return {
          selection: {
            ...state.selection,
            selectedTexts: [textId],
            selectedTextSpans: [],
            selectedPaths: [],
            selectedSubPaths: [],
            selectedCommands: [],
          },
        };
      }
    }),

  selectTextSpan: (textId, spanId) =>
    set((state) => {
      const text = state.texts.find(t => t.id === textId);
      if (!text || text.locked || text.type !== 'multiline-text') {
        return state;
      }
      return {
        selection: {
          ...state.selection,
          selectedTexts: [textId],
          selectedTextSpans: [spanId],
          selectedPaths: [],
          selectedSubPaths: [],
          selectedCommands: [],
        },
      };
    }),

  selectTextByPoint: (point, isShiftPressed = false) => {
    const state = get();
    
    // Find text at point using proper bounds calculation
    const textAtPoint = state.texts.find(text => {
      if (text.locked) return false;
      
      // Use consistent bounds calculation
      const bounds = calculateTextBounds(text);
      const margin = 10;
      
      return point.x >= bounds.x - margin && 
             point.x <= bounds.x + bounds.width + margin &&
             point.y >= bounds.y - margin && 
             point.y <= bounds.y + bounds.height + margin;
    });

    if (textAtPoint) {
      if (isShiftPressed) {
        get().selectTextMultiple(textAtPoint.id, true);
      } else {
        get().selectText(textAtPoint.id);
      }
    }
  },

  addToSelection: (id, type) =>
    set((state) => {
      const selection = { ...state.selection };
      
      switch (type) {
        case 'path':
          if (!selection.selectedPaths.includes(id)) {
            selection.selectedPaths = [...selection.selectedPaths, id];
          }
          break;
        case 'subpath':
          if (!selection.selectedSubPaths.includes(id)) {
            selection.selectedSubPaths = [...selection.selectedSubPaths, id];
          }
          break;
        case 'command':
          if (!selection.selectedCommands.includes(id)) {
            selection.selectedCommands = [...selection.selectedCommands, id];
          }
          break;
        case 'text':
          if (!selection.selectedTexts.includes(id)) {
            selection.selectedTexts = [...selection.selectedTexts, id];
          }
          break;
        case 'textspan':
          if (!selection.selectedTextSpans.includes(id)) {
            selection.selectedTextSpans = [...selection.selectedTextSpans, id];
          }
          break;
      }
      
      return { selection };
    }),

  removeFromSelection: (id, type) =>
    set((state) => {
      const selection = { ...state.selection };
      
      switch (type) {
        case 'path':
          selection.selectedPaths = selection.selectedPaths.filter(pathId => pathId !== id);
          break;
        case 'subpath':
          selection.selectedSubPaths = selection.selectedSubPaths.filter(subPathId => subPathId !== id);
          break;
        case 'command':
          selection.selectedCommands = selection.selectedCommands.filter(commandId => commandId !== id);
          break;
        case 'text':
          selection.selectedTexts = selection.selectedTexts.filter(textId => textId !== id);
          break;
        case 'textspan':
          selection.selectedTextSpans = selection.selectedTextSpans.filter(spanId => spanId !== id);
          break;
      }
      
      return { selection };
    }),

  selectInBox: (box) => {
    const state = get();
    const newSelection = {
      selectedPaths: [] as string[],
      selectedSubPaths: [] as string[],
      selectedCommands: [] as string[],
      selectedControlPoints: [] as string[],
      selectedTexts: [] as string[],
      selectedTextSpans: [] as string[],
    };

    // Check texts in box
    state.texts.forEach(text => {
      if (text.locked) return;
      
      // Use consistent text bounds calculation
      const textBounds = calculateTextBounds(text);
      
      if (textBounds.x < box.x + box.width &&
          textBounds.x + textBounds.width > box.x &&
          textBounds.y < box.y + box.height &&
          textBounds.y + textBounds.height > box.y) {
        newSelection.selectedTexts.push(text.id);
      }
    });

    // Check subpaths in box
    state.paths.forEach(path => {
      path.subPaths.forEach(subPath => {
        if (subPath.locked) return;
        
        // Check if any command is in the box
        let subPathInBox = false;
        subPath.commands.forEach(command => {
          if (command.x !== undefined && command.y !== undefined) {
            if (command.x >= box.x && command.x <= box.x + box.width &&
                command.y >= box.y && command.y <= box.y + box.height) {
              subPathInBox = true;
            }
          }
        });
        
        if (subPathInBox) {
          newSelection.selectedSubPaths.push(subPath.id);
        }
      });
    });

    set(state => ({
      selection: {
        ...state.selection,
        ...newSelection
      }
    }));
  },
});