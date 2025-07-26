import { StateCreator } from 'zustand';
import { EditorState, Point } from '../types';
import { findSubPathAtPoint } from '../utils/path-utils';
import { calculateTextBounds, calculateTextBoundsDOM } from '../utils/text-utils';

export interface SelectionActions {
  selectPath: (pathId: string, addToSelection?: boolean) => void;
  selectSubPath: (subPathId: string, addToSelection?: boolean) => void;
  selectSubPathMultiple: (subPathId: string, isShiftPressed?: boolean) => void;
  selectCommand: (commandId: string, addToSelection?: boolean) => void;
  selectText: (textId: string, addToSelection?: boolean) => void;
  selectTextMultiple: (textId: string, isShiftPressed?: boolean) => void;
  selectTextSpan: (textId: string, spanId: string, addToSelection?: boolean) => void;
  selectGroup: (groupId: string, addToSelection?: boolean) => void;
  selectImage: (imageId: string, addToSelection?: boolean) => void;
  selectUse: (useId: string, addToSelection?: boolean) => void;
  selectMultiple: (ids: string[], type: 'paths' | 'subpaths' | 'commands' | 'texts' | 'textspans' | 'groups' | 'images' | 'uses') => void;
  addToSelection: (id: string, type: 'path' | 'subpath' | 'command' | 'text' | 'textspan' | 'group' | 'image' | 'use') => void;
  removeFromSelection: (id: string, type: 'path' | 'subpath' | 'command' | 'text' | 'textspan' | 'group' | 'image' | 'use') => void;
  clearSelection: () => void;
  selectSubPathByPoint: (pathId: string, point: Point, isShiftPressed?: boolean) => void;
  selectTextByPoint: (point: Point, isShiftPressed?: boolean) => void;
  selectImageByPoint: (point: Point, isShiftPressed?: boolean) => void;
  selectUseByPoint: (point: Point, isShiftPressed?: boolean) => void;
  selectElementByPoint: (point: Point, isShiftPressed?: boolean) => void;
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
        selectedGroups: [],
        selectedImages: [],
        selectedClipPaths: [],
        selectedMasks: [],
        selectedFilters: [],
        selectedMarkers: [],
        selectedSymbols: [],
        selectedUses: [],
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
            selectedTexts: [],
            selectedTextSpans: [],
            selectedGroups: [],
            selectedImages: [],
            selectedClipPaths: [],
            selectedMasks: [],
            selectedFilters: [],
            selectedMarkers: [],
            selectedSymbols: [],
            selectedUses: [],
          },
        };
      }
      return {
        selection: {
          ...state.selection,
          selectedSubPaths: [subPathId],
          selectedPaths: [],
          selectedCommands: [],
          selectedTexts: [],
          selectedTextSpans: [],
          selectedGroups: [],
          selectedImages: [],
          selectedClipPaths: [],
          selectedMasks: [],
          selectedFilters: [],
          selectedMarkers: [],
          selectedSymbols: [],
          selectedUses: [],
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
              selectedTexts: [],
              selectedTextSpans: [],
              selectedGroups: [],
              selectedImages: [],
              selectedClipPaths: [],
              selectedMasks: [],
              selectedFilters: [],
              selectedMarkers: [],
              selectedSymbols: [],
              selectedUses: [],
            },
          };
        } else {
          return {
            selection: {
              ...state.selection,
              selectedSubPaths: [...currentSelection, subPathId],
              selectedPaths: [],
              selectedCommands: [],
              selectedTexts: [],
              selectedTextSpans: [],
              selectedGroups: [],
              selectedImages: [],
              selectedClipPaths: [],
              selectedMasks: [],
              selectedFilters: [],
              selectedMarkers: [],
              selectedSymbols: [],
              selectedUses: [],
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
            selectedTexts: [],
            selectedTextSpans: [],
            selectedGroups: [],
            selectedImages: [],
            selectedClipPaths: [],
            selectedMasks: [],
            selectedFilters: [],
            selectedMarkers: [],
            selectedSymbols: [],
            selectedUses: [],
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
            selectedTexts: [],
            selectedTextSpans: [],
            selectedGroups: [],
            selectedImages: [],
            selectedClipPaths: [],
            selectedMasks: [],
            selectedFilters: [],
            selectedMarkers: [],
            selectedSymbols: [],
            selectedUses: [],
          },
        };
      }
      return {
        selection: {
          ...state.selection,
          selectedCommands: [commandId],
          selectedPaths: [],
          selectedSubPaths: [],
          selectedTexts: [],
          selectedTextSpans: [],
          selectedGroups: [],
          selectedImages: [],
          selectedClipPaths: [],
          selectedMasks: [],
          selectedFilters: [],
          selectedMarkers: [],
          selectedSymbols: [],
          selectedUses: [],
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
        newSelection.selectedTexts = [];
        newSelection.selectedTextSpans = [];
        newSelection.selectedGroups = [];
        newSelection.selectedImages = [];
        newSelection.selectedClipPaths = [];
        newSelection.selectedMasks = [];
        newSelection.selectedFilters = [];
        newSelection.selectedMarkers = [];
        newSelection.selectedSymbols = [];
        newSelection.selectedUses = [];
      } else if (type === 'subpaths') {
        const allowed = ids.filter(id =>
          !state.paths.some(path =>
            path.subPaths.some(subPath => subPath.id === id && subPath.locked)
          )
        );
        newSelection.selectedSubPaths = allowed;
        newSelection.selectedPaths = [];
        newSelection.selectedCommands = [];
        newSelection.selectedTexts = [];
        newSelection.selectedTextSpans = [];
        newSelection.selectedGroups = [];
        newSelection.selectedImages = [];
        newSelection.selectedClipPaths = [];
        newSelection.selectedMasks = [];
        newSelection.selectedFilters = [];
        newSelection.selectedMarkers = [];
        newSelection.selectedSymbols = [];
        newSelection.selectedUses = [];
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
        newSelection.selectedTexts = [];
        newSelection.selectedTextSpans = [];
        newSelection.selectedGroups = [];
        newSelection.selectedImages = [];
        newSelection.selectedClipPaths = [];
        newSelection.selectedMasks = [];
        newSelection.selectedFilters = [];
        newSelection.selectedMarkers = [];
        newSelection.selectedSymbols = [];
        newSelection.selectedUses = [];
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
        selectedGroups: [],
        selectedImages: [],
        selectedClipPaths: [],
        selectedMasks: [],
        selectedFilters: [],
        selectedMarkers: [],
        selectedSymbols: [],
        selectedUses: [],
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
          selectedGroups: [],
          selectedImages: [],
          selectedClipPaths: [],
          selectedMasks: [],
          selectedFilters: [],
          selectedMarkers: [],
          selectedSymbols: [],
          selectedUses: [],
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
              selectedGroups: [],
              selectedImages: [],
              selectedClipPaths: [],
              selectedMasks: [],
              selectedFilters: [],
              selectedMarkers: [],
              selectedSymbols: [],
              selectedUses: [],
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
            selectedGroups: [],
            selectedImages: [],
            selectedClipPaths: [],
            selectedMasks: [],
            selectedFilters: [],
            selectedMarkers: [],
            selectedSymbols: [],
            selectedUses: [],
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
          selectedGroups: [],
          selectedImages: [],
          selectedClipPaths: [],
          selectedMasks: [],
          selectedFilters: [],
          selectedMarkers: [],
          selectedSymbols: [],
          selectedUses: [],
        },
      };
    }),

  selectTextByPoint: (point, isShiftPressed = false) => {
    const state = get();
    
    // Find text at point using proper bounds calculation
    const textAtPoint = state.texts.find(text => {
      if (text.locked) return false;
      
      // Use DOM-based bounds calculation to account for transforms
      const bounds = calculateTextBoundsDOM(text);
      if (!bounds) return false;
      
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
        case 'group':
          if (!selection.selectedGroups.includes(id)) {
            selection.selectedGroups = [...selection.selectedGroups, id];
          }
          break;
        case 'image':
          if (!selection.selectedImages.includes(id)) {
            selection.selectedImages = [...selection.selectedImages, id];
          }
          break;
        case 'use':
          if (!selection.selectedUses.includes(id)) {
            selection.selectedUses = [...selection.selectedUses, id];
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
        case 'group':
          selection.selectedGroups = selection.selectedGroups.filter(groupId => groupId !== id);
          break;
        case 'image':
          selection.selectedImages = selection.selectedImages.filter(imageId => imageId !== id);
          break;
        case 'use':
          selection.selectedUses = selection.selectedUses.filter(useId => useId !== id);
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
      selectedTextPaths: [] as string[],
      selectedGroups: [] as string[],
      selectedImages: [] as string[],
      selectedClipPaths: [] as string[],
      selectedMasks: [] as string[],
      selectedFilters: [] as string[],
      selectedMarkers: [] as string[],
      selectedSymbols: [] as string[],
      selectedUses: [] as string[],
    };

    // Check texts in box
    state.texts.forEach(text => {
      if (text.locked) return;
      
      // Use DOM-based bounds calculation to account for transforms
      const textBounds = calculateTextBoundsDOM(text);
      if (!textBounds) return;
      
      if (textBounds.x < box.x + box.width &&
          textBounds.x + textBounds.width > box.x &&
          textBounds.y < box.y + box.height &&
          textBounds.y + textBounds.height > box.y) {
        newSelection.selectedTexts.push(text.id);
      }
    });

    // Check textPaths in box
    state.textPaths.forEach(textPath => {
      if (textPath.locked) return;
      
      // For textPaths, we need to check if they are near the path they follow
      // This is a simplified check - in a real implementation you might want to
      // calculate the actual position along the path
      const referencedPath = state.paths.find(p => 
        p.subPaths.some(sp => sp.id === textPath.pathRef)
      );
      
      if (referencedPath) {
        // Check if any part of the referenced path is in the box
        let pathInBox = false;
        referencedPath.subPaths.forEach(subPath => {
          subPath.commands.forEach(command => {
            if (command.x !== undefined && command.y !== undefined) {
              if (command.x >= box.x && command.x <= box.x + box.width &&
                  command.y >= box.y && command.y <= box.y + box.height) {
                pathInBox = true;
              }
            }
          });
        });
        
        if (pathInBox) {
          newSelection.selectedTextPaths.push(textPath.id);
        }
      }
    });

    // Check subpaths and commands in box
    // First pass: analyze which sub-paths are fully vs partially in the box
    const subPathAnalysis: Array<{
      subPath: any;
      commandsInBox: string[];
      commandsOutOfBox: string[];
      isFullyInBox: boolean;
      isPartiallyInBox: boolean;
    }> = [];

    state.paths.forEach(path => {
      path.subPaths.forEach(subPath => {
        if (subPath.locked) return;
        
        const commandsInBox: string[] = [];
        const commandsOutOfBox: string[] = [];
        
        subPath.commands.forEach(command => {
          if (command.x !== undefined && command.y !== undefined) {
            if (command.x >= box.x && command.x <= box.x + box.width &&
                command.y >= box.y && command.y <= box.y + box.height) {
              commandsInBox.push(command.id);
            } else {
              commandsOutOfBox.push(command.id);
            }
          }
        });
        
        const isFullyInBox = commandsInBox.length > 0 && commandsOutOfBox.length === 0;
        const isPartiallyInBox = commandsInBox.length > 0 && commandsOutOfBox.length > 0;
        
        if (commandsInBox.length > 0) {
          subPathAnalysis.push({
            subPath,
            commandsInBox,
            commandsOutOfBox,
            isFullyInBox,
            isPartiallyInBox
          });
        }
      });
    });

    // Determine selection strategy:
    // If ANY sub-path is partially in the box, select individual commands
    // If ALL sub-paths are fully in the box, select whole sub-paths
    const hasPartialSubPaths = subPathAnalysis.some(analysis => analysis.isPartiallyInBox);
    
    if (hasPartialSubPaths) {
      // Select individual commands when there are partial sub-paths
      subPathAnalysis.forEach(analysis => {
        newSelection.selectedCommands.push(...analysis.commandsInBox);
      });
    } else {
      // Select whole sub-paths when all are fully contained
      subPathAnalysis.forEach(analysis => {
        if (analysis.isFullyInBox) {
          newSelection.selectedSubPaths.push(analysis.subPath.id);
        }
      });
    }

    // Check images in box
    state.images.forEach(image => {
      if (image.locked) return;
      
      if (image.x < box.x + box.width &&
          image.x + image.width > box.x &&
          image.y < box.y + box.height &&
          image.y + image.height > box.y) {
        newSelection.selectedImages.push(image.id);
      }
    });

    // Check use elements in box
    state.uses.forEach(use => {
      if (use.locked) return;
      
      const x = use.x || 0;
      const y = use.y || 0;
      const width = use.width || 100;
      const height = use.height || 100;
      
      if (x < box.x + box.width &&
          x + width > box.x &&
          y < box.y + box.height &&
          y + height > box.y) {
        newSelection.selectedUses.push(use.id);
      }
    });

    set(state => ({
      selection: {
        ...state.selection,
        ...newSelection
      }
    }));
  },

  // New selection functions for SVG elements
  selectGroup: (groupId, addToSelection = false) =>
    set((state) => ({
      selection: addToSelection ? {
        ...state.selection,
        selectedGroups: state.selection.selectedGroups.includes(groupId) 
          ? state.selection.selectedGroups 
          : [...state.selection.selectedGroups, groupId],
      } : {
        ...state.selection,
        selectedPaths: [],
        selectedSubPaths: [],
        selectedCommands: [],
        selectedTexts: [],
        selectedTextSpans: [],
        selectedGroups: [groupId],
        selectedImages: [],
        selectedClipPaths: [],
        selectedMasks: [],
        selectedFilters: [],
        selectedMarkers: [],
        selectedSymbols: [],
        selectedUses: [],
      },
    })),

  selectImage: (imageId, addToSelection = false) =>
    set((state) => {
      const image = state.images.find(img => img.id === imageId);
      if (image?.locked) return state;

      return {
        selection: addToSelection ? {
          ...state.selection,
          selectedImages: state.selection.selectedImages.includes(imageId) 
            ? state.selection.selectedImages 
            : [...state.selection.selectedImages, imageId],
        } : {
          ...state.selection,
          selectedPaths: [],
          selectedSubPaths: [],
          selectedCommands: [],
          selectedTexts: [],
          selectedTextSpans: [],
          selectedGroups: [],
          selectedImages: [imageId],
          selectedClipPaths: [],
          selectedMasks: [],
          selectedFilters: [],
          selectedMarkers: [],
          selectedSymbols: [],
          selectedUses: [],
        },
      };
    }),

  selectUse: (useId, addToSelection = false) =>
    set((state) => {
      const use = state.uses.find(u => u.id === useId);
      if (use?.locked) return state;

      return {
        selection: addToSelection ? {
          ...state.selection,
          selectedUses: state.selection.selectedUses.includes(useId) 
            ? state.selection.selectedUses 
            : [...state.selection.selectedUses, useId],
        } : {
          ...state.selection,
          selectedPaths: [],
          selectedSubPaths: [],
          selectedCommands: [],
          selectedTexts: [],
          selectedTextSpans: [],
          selectedGroups: [],
          selectedImages: [],
          selectedClipPaths: [],
          selectedMasks: [],
          selectedFilters: [],
          selectedMarkers: [],
          selectedSymbols: [],
          selectedUses: [useId],
        },
      };
    }),

  selectImageByPoint: (point, isShiftPressed = false) => {
    const state = get();
    
    // Find image at point
    const imageAtPoint = state.images.find(image => {
      if (image.locked) return false;
      
      return point.x >= image.x && 
             point.x <= image.x + image.width &&
             point.y >= image.y && 
             point.y <= image.y + image.height;
    });
    
    if (imageAtPoint) {
      state.selectImage(imageAtPoint.id, isShiftPressed);
    }
  },

  selectUseByPoint: (point, isShiftPressed = false) => {
    const state = get();
    
    // Find use element at point
    const useAtPoint = state.uses.find(use => {
      if (use.locked) return false;
      
      const x = use.x || 0;
      const y = use.y || 0;
      const width = use.width || 100; // Default width
      const height = use.height || 100; // Default height
      
      return point.x >= x && 
             point.x <= x + width &&
             point.y >= y && 
             point.y <= y + height;
    });
    
    if (useAtPoint) {
      state.selectUse(useAtPoint.id, isShiftPressed);
    }
  },

  selectElementByPoint: (point, isShiftPressed = false) => {
    const state = get();
    
    // Try to select in order of priority: images, use elements, then existing logic
    state.selectImageByPoint(point, isShiftPressed);
    if (state.selection.selectedImages.length > 0) return;
    
    state.selectUseByPoint(point, isShiftPressed);
    if (state.selection.selectedUses.length > 0) return;
    
    // Fall back to existing selection logic
    state.selectTextByPoint(point, isShiftPressed);
    if (state.selection.selectedTexts.length > 0) return;
    
    // Try subpath selection for remaining elements
    const pathsToCheck = state.paths.filter(path => !path.subPaths.every(sp => sp.locked));
    for (const path of pathsToCheck) {
      state.selectSubPathByPoint(path.id, point, isShiftPressed);
      if (state.selection.selectedSubPaths.length > 0) break;
    }
  },
});