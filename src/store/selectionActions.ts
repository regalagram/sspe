import { StateCreator } from 'zustand';
import { EditorState, Point } from '../types';
import { findSubPathAtPoint } from '../utils/path-utils';
import { calculateTextBounds, calculateTextBoundsDOM } from '../utils/text-utils';
import { transformManager } from '../plugins/transform/TransformManager';

// Utility function to check if all elements of a group are selected
const areAllGroupElementsSelected = (state: EditorState, groupId: string): boolean => {
  const group = state.groups.find(g => g.id === groupId);
  if (!group) return false;

  const allElementsSelected = group.children.every(child => {
    switch (child.type) {
      case 'path':
        return state.selection.selectedPaths.includes(child.id);
      case 'text':
        return state.selection.selectedTexts.includes(child.id);
      case 'image':
        return state.selection.selectedImages.includes(child.id);
      case 'group':
        return state.selection.selectedGroups.includes(child.id);
      case 'use':
        return state.selection.selectedUses.includes(child.id);
      default:
        return false;
    }
  });

  return allElementsSelected && group.children.length > 0;
};

// Utility function to promote selection to group level
const promoteSelectionToGroup = (state: EditorState, groupId: string): EditorState['selection'] => {
  const group = state.groups.find(g => g.id === groupId);
  if (!group) return state.selection;

  // Remove individual elements from selection
  const newSelection = { ...state.selection };
  
  group.children.forEach(child => {
    switch (child.type) {
      case 'path':
        newSelection.selectedPaths = newSelection.selectedPaths.filter(id => id !== child.id);
        break;
      case 'text':
        newSelection.selectedTexts = newSelection.selectedTexts.filter(id => id !== child.id);
        break;
      case 'image':
        newSelection.selectedImages = newSelection.selectedImages.filter(id => id !== child.id);
        break;
      case 'group':
        newSelection.selectedGroups = newSelection.selectedGroups.filter(id => id !== child.id);
        break;
      case 'use':
        newSelection.selectedUses = newSelection.selectedUses.filter(id => id !== child.id);
        break;
    }
  });

  // Add group to selection if not already selected
  if (!newSelection.selectedGroups.includes(groupId)) {
    newSelection.selectedGroups = [...newSelection.selectedGroups, groupId];
  }

  return newSelection;
};

// Utility function to check if all sub-paths of a path are selected
const areAllSubPathsSelected = (state: EditorState, pathId: string): boolean => {
  const path = state.paths.find(p => p.id === pathId);
  if (!path) return false;
  
  // Check if all sub-paths of this path are selected
  const allSubPathsSelected = path.subPaths.every(subPath => 
    state.selection.selectedSubPaths.includes(subPath.id)
  );
  
  return allSubPathsSelected && path.subPaths.length > 0;
};

// Utility function to promote sub-path selection to path level
const promoteSubPathsToPath = (state: EditorState, pathId: string): EditorState['selection'] => {
  const path = state.paths.find(p => p.id === pathId);
  if (!path) return state.selection;
  
  const newSelection = { ...state.selection };
  
  // Remove all sub-paths of this path from selection
  path.subPaths.forEach(subPath => {
    newSelection.selectedSubPaths = newSelection.selectedSubPaths.filter(id => id !== subPath.id);
  });
  
  // Add the path to selection if not already selected
  if (!newSelection.selectedPaths.includes(pathId)) {
    newSelection.selectedPaths = [...newSelection.selectedPaths, pathId];
  }
  
  return newSelection;
};

// Utility function to find which group an element belongs to
const findGroupContainingElement = (state: EditorState, elementId: string, elementType: string): string | null => {
  for (const group of state.groups) {
    const isChild = group.children.some(child => 
      child.id === elementId && child.type === elementType
    );
    if (isChild) {
      return group.id;
    }
  }
  return null;
};

// Utility function to find which group a path belongs to (for sub-path selections)
const findGroupContainingPath = (state: EditorState, pathId: string): string | null => {
  return findGroupContainingElement(state, pathId, 'path');
};

// Utility function to promote element selection to group selection (preserving other selections)
const promoteElementToGroup = (state: EditorState, elementId: string, elementType: string): EditorState['selection'] => {
  const groupId = findGroupContainingElement(state, elementId, elementType);
  if (!groupId) {
    return state.selection; // Element is not in a group
  }
  
  // If group is already selected, no need to promote
  if (state.selection.selectedGroups.includes(groupId)) {
    return state.selection;
  }
  
  const group = state.groups.find(g => g.id === groupId);
  if (!group) return state.selection;
  
  // Start with current selection
  let newSelection = { ...state.selection };
  
  // Remove all elements that belong to this group from individual selections
  group.children.forEach(child => {
    switch (child.type) {
      case 'path':
        newSelection.selectedPaths = newSelection.selectedPaths.filter(id => id !== child.id);
        // Also remove sub-paths and commands from this path
        const path = state.paths.find(p => p.id === child.id);
        if (path) {
          path.subPaths.forEach(subPath => {
            newSelection.selectedSubPaths = newSelection.selectedSubPaths.filter(id => id !== subPath.id);
            subPath.commands.forEach(command => {
              newSelection.selectedCommands = newSelection.selectedCommands.filter(id => id !== command.id);
            });
          });
        }
        break;
      case 'text':
        newSelection.selectedTexts = newSelection.selectedTexts.filter(id => id !== child.id);
        newSelection.selectedTextSpans = newSelection.selectedTextSpans.filter(spanId => {
          // Check if this span belongs to the text
          const text = state.texts.find(t => t.id === child.id);
          if (text && text.type === 'multiline-text') {
            return !text.spans?.some(span => span.id === spanId);
          }
          return true;
        });
        break;
      case 'textPath':
        newSelection.selectedTextPaths = newSelection.selectedTextPaths?.filter(id => id !== child.id) || [];
        break;
      case 'image':
        newSelection.selectedImages = newSelection.selectedImages.filter(id => id !== child.id);
        break;
      case 'use':
        newSelection.selectedUses = newSelection.selectedUses.filter(id => id !== child.id);
        break;
      case 'group':
        // Nested group case - remove the child group from selection
        newSelection.selectedGroups = newSelection.selectedGroups.filter(id => id !== child.id);
        break;
    }
  });
  
  // Add the group to selection (preserving other selected groups)
  if (!newSelection.selectedGroups.includes(groupId)) {
    newSelection.selectedGroups = [...newSelection.selectedGroups, groupId];
  }
  
  return newSelection;
};

// Utility function to check for traditional group selection behavior
const checkAndPromoteToGroup = (state: EditorState): EditorState['selection'] => {
  let currentSelection = { ...state.selection };
  let hasPromotions = false;
  
  // Collect all elements that need group promotion
  const promotions = new Set<string>();
  
  // Check selected paths
  for (const pathId of currentSelection.selectedPaths) {
    const groupId = findGroupContainingElement(state, pathId, 'path');
    if (groupId && !currentSelection.selectedGroups.includes(groupId)) {
      promotions.add(groupId);
      hasPromotions = true;
    }
  }
  
  // Check selected sub-paths (find their parent path, then check if that path is in a group)
  for (const subPathId of currentSelection.selectedSubPaths) {
    const parentPath = state.paths.find(path => 
      path.subPaths.some(sp => sp.id === subPathId)
    );
    if (parentPath) {
      const groupId = findGroupContainingElement(state, parentPath.id, 'path');
      if (groupId && !currentSelection.selectedGroups.includes(groupId)) {
        promotions.add(groupId);
        hasPromotions = true;
      }
    }
  }
  
  // Check selected commands (find their parent path, then check if that path is in a group)
  for (const commandId of currentSelection.selectedCommands) {
    let parentPath = null;
    for (const path of state.paths) {
      for (const subPath of path.subPaths) {
        if (subPath.commands.some(cmd => cmd.id === commandId)) {
          parentPath = path;
          break;
        }
      }
      if (parentPath) break;
    }
    if (parentPath) {
      const groupId = findGroupContainingElement(state, parentPath.id, 'path');
      if (groupId && !currentSelection.selectedGroups.includes(groupId)) {
        promotions.add(groupId);
        hasPromotions = true;
      }
    }
  }
  
  // Check selected texts
  for (const textId of currentSelection.selectedTexts) {
    const groupId = findGroupContainingElement(state, textId, 'text');
    if (groupId && !currentSelection.selectedGroups.includes(groupId)) {
      promotions.add(groupId);
      hasPromotions = true;
    }
  }
  
  // Check selected text paths
  for (const textPathId of currentSelection.selectedTextPaths || []) {
    const groupId = findGroupContainingElement(state, textPathId, 'textPath');
    if (groupId && !currentSelection.selectedGroups.includes(groupId)) {
      promotions.add(groupId);
      hasPromotions = true;
    }
  }
  
  // Check selected images
  for (const imageId of currentSelection.selectedImages) {
    const groupId = findGroupContainingElement(state, imageId, 'image');
    if (groupId && !currentSelection.selectedGroups.includes(groupId)) {
      promotions.add(groupId);
      hasPromotions = true;
    }
  }
  
  // Check selected use elements
  for (const useId of currentSelection.selectedUses) {
    const groupId = findGroupContainingElement(state, useId, 'use');
    if (groupId && !currentSelection.selectedGroups.includes(groupId)) {
      promotions.add(groupId);
      hasPromotions = true;
    }
  }
  
  // If no promotions needed, return current selection
  if (!hasPromotions) {
    return currentSelection;
  }
  
  // Apply all promotions
  let finalSelection = { ...currentSelection };
  for (const groupId of promotions) {
    // Find any element in this group to trigger promotion
    const group = state.groups.find(g => g.id === groupId);
    if (group && group.children.length > 0) {
      const firstChild = group.children[0];
      finalSelection = promoteElementToGroup({ ...state, selection: finalSelection }, firstChild.id, firstChild.type);
    }
  }
  
  return finalSelection;
};

// Helper to avoid mutating selection while a transform/move is active
const shouldBlockSelectionChange = (caller?: string, details?: any): boolean => {
  try {
    if (transformManager && typeof transformManager.isMoving === 'function' && transformManager.isMoving()) {
      return true;
    }
  } catch (e) {
    // If transformManager is not available or throws, do not block
  }
  return false;
};

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
  selectMultiple: (ids: string[], type: 'paths' | 'subpaths' | 'commands' | 'texts' | 'textspans' | 'groups' | 'images' | 'uses' | 'animations') => void;
  addToSelection: (id: string, type: 'path' | 'subpath' | 'command' | 'text' | 'textspan' | 'textPath' | 'group' | 'image' | 'use' | 'animation') => void;
  removeFromSelection: (id: string, type: 'path' | 'subpath' | 'command' | 'text' | 'textspan' | 'textPath' | 'group' | 'image' | 'use' | 'animation') => void;
  selectAnimation: (animationId: string, addToSelection?: boolean) => void;
  selectAnimationMultiple: (animationId: string, isShiftPressed?: boolean) => void;
  clearSelection: () => void;
  selectSubPathByPoint: (pathId: string, point: Point, isShiftPressed?: boolean) => void;
  selectTextByPoint: (point: Point, isShiftPressed?: boolean) => void;
  selectImageByPoint: (point: Point, isShiftPressed?: boolean) => void;
  selectUseByPoint: (point: Point, isShiftPressed?: boolean) => void;
  selectElementByPoint: (point: Point, isShiftPressed?: boolean) => void;
  selectInBox: (box: { x: number; y: number; width: number; height: number }) => void;
  updateSelectionBox: (box: { x: number; y: number; width: number; height: number } | undefined) => void;
}

export const createSelectionActions: StateCreator<
  EditorState & SelectionActions,
  [],
  [],
  SelectionActions
> = (set, get) => ({
  selectPath: (pathId, addToSelection = false) =>
    set((state) => {
      if (shouldBlockSelectionChange('selectPath', { pathId, addToSelection })) return { selection: { ...state.selection } };
      const newSelection = addToSelection ? {
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
        selectedAnimations: [],
      };
      
      // Check for traditional group promotion after selection change
      const promotedSelection = checkAndPromoteToGroup({ ...state, selection: newSelection });
      
      return { selection: promotedSelection };
    }),

  selectSubPath: (subPathId) =>
    set((state) => {
      if (shouldBlockSelectionChange('selectSubPath', { subPathId })) return { selection: { ...state.selection } };
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
      
      const newSelection = {
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
      };
      
      // Check for traditional group promotion after selection change
      const promotedSelection = checkAndPromoteToGroup({ ...state, selection: newSelection });
      
      return { selection: promotedSelection };
    }),

  selectSubPathMultiple: (subPathId, isShiftPressed = false) =>
    set((state) => {
      if (shouldBlockSelectionChange('selectSubPathMultiple', { subPathId, isShiftPressed })) return { selection: { ...state.selection } };
      const isLocked = state.paths.some(path =>
        path.subPaths.some(subPath => subPath.id === subPathId && subPath.locked)
      );
      if (isLocked) {
        return { selection: { ...state.selection } };
      }
      
      let newSelection;
      if (isShiftPressed && state.selection.selectedSubPaths.length > 0) {
        const currentSelection = state.selection.selectedSubPaths;
        if (currentSelection.includes(subPathId)) {
          newSelection = {
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
          };
        } else {
          newSelection = {
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
          };
        }
      } else {
        newSelection = {
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
        };
      }
      
      // Check for traditional group promotion after selection change
      const promotedSelection = checkAndPromoteToGroup({ ...state, selection: newSelection });
      
      return { selection: promotedSelection };
    }),

  selectCommand: (commandId) =>
    set((state) => {
      if (shouldBlockSelectionChange('selectCommand', { commandId })) return { selection: { ...state.selection } };
      let isLocked = false;
      for (const path of state.paths) {
        for (const subPath of path.subPaths) {
          const command = subPath.commands.find(cmd => cmd.id === commandId);
          if (command) {
            // Check if subPath is locked OR if individual command is locked
            if (subPath.locked || command.locked) {
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
      
      const newSelection = {
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
      };
      
      // Check for traditional group promotion after selection change
      const promotedSelection = checkAndPromoteToGroup({ ...state, selection: newSelection });
      
      return { selection: promotedSelection };
    }),

  selectMultiple: (ids, type) =>
    set((state) => {
      if (shouldBlockSelectionChange('selectMultiple', { ids, type })) return { selection: { ...state.selection } };
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
        newSelection.selectedAnimations = [];
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
        newSelection.selectedAnimations = [];
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
        newSelection.selectedAnimations = [];
      } else if (type === 'animations') {
        newSelection.selectedAnimations = ids;
        newSelection.selectedPaths = [];
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
        newSelection.selectedAnimations = [];
      }
      
      // Check for traditional group promotion after selection change
      const promotedSelection = checkAndPromoteToGroup({ ...state, selection: newSelection });
      
      return { selection: promotedSelection };
    }),

  clearSelection: () =>
    set((state) => {
      if (shouldBlockSelectionChange('clearSelection')) return { selection: { ...state.selection } } as any;
      return {
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
          selectedAnimations: [],
        },
      };
    }),

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
      if (shouldBlockSelectionChange('selectText', { textId, addToSelection })) return { selection: { ...state.selection } };
      const text = state.texts.find(t => t.id === textId);
      if (!text || text.locked) {
        return state;
      }
      
      const newSelection = addToSelection ? {
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
      };
      
      // Check for traditional group promotion after selection change
      const promotedSelection = checkAndPromoteToGroup({ ...state, selection: newSelection });
      
      return { selection: promotedSelection };
    }),

  selectTextMultiple: (textId, isShiftPressed = false) =>
    set((state) => {
      if (shouldBlockSelectionChange('selectTextMultiple', { textId, isShiftPressed })) return { selection: { ...state.selection } };
      const text = state.texts.find(t => t.id === textId);
      if (!text || text.locked) return state;

      const currentSelection = state.selection.selectedTexts;
      let newSelection;
      
      if (isShiftPressed) {
        if (currentSelection.includes(textId)) {
          newSelection = {
            ...state.selection,
            selectedTexts: currentSelection.filter(id => id !== textId),
          };
        } else {
          newSelection = {
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
          };
        }
      } else {
        newSelection = {
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
        };
      }
      
      // Check for traditional group promotion after selection change
      const promotedSelection = checkAndPromoteToGroup({ ...state, selection: newSelection });
      
      return { selection: promotedSelection };
    }),

  selectTextSpan: (textId, spanId) =>
    set((state) => {
      if (shouldBlockSelectionChange('selectTextSpan', { textId, spanId })) return { selection: { ...state.selection } };
      const text = state.texts.find(t => t.id === textId);
      if (!text || text.locked || text.type !== 'multiline-text') {
        return state;
      }
      
      const newSelection = {
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
      };
      
      // Check for traditional group promotion after selection change
      const promotedSelection = checkAndPromoteToGroup({ ...state, selection: newSelection });
      
      return { selection: promotedSelection };
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
      if (shouldBlockSelectionChange('addToSelection', { id, type })) return { selection: { ...state.selection } };
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
          // Check if command is locked before adding to selection
          let commandIsLocked = false;
          for (const path of state.paths) {
            for (const subPath of path.subPaths) {
              const command = subPath.commands.find(cmd => cmd.id === id);
              if (command) {
                if (subPath.locked || command.locked) {
                  commandIsLocked = true;
                }
                break;
              }
            }
            if (commandIsLocked) break;
          }
          if (!commandIsLocked && !selection.selectedCommands.includes(id)) {
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
        case 'textPath':
          if (!selection.selectedTextPaths.includes(id)) {
            selection.selectedTextPaths = [...selection.selectedTextPaths, id];
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
        case 'animation':
          if (!selection.selectedAnimations.includes(id)) {
            selection.selectedAnimations = [...selection.selectedAnimations, id];
          }
          break;
      }
      
      // Check for group promotion after selection change
      const promotedSelection = checkAndPromoteToGroup({ ...state, selection });
      
      return { selection: promotedSelection };
    }),

  removeFromSelection: (id, type) =>
    set((state) => {
      if (shouldBlockSelectionChange('removeFromSelection', { id, type })) return { selection: { ...state.selection } };
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
        case 'textPath':
          selection.selectedTextPaths = selection.selectedTextPaths.filter(textPathId => textPathId !== id);
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
        case 'animation':
          selection.selectedAnimations = selection.selectedAnimations.filter(animationId => animationId !== id);
          break;
      }
      
      // Check for group promotion after selection change
      const promotedSelection = checkAndPromoteToGroup({ ...state, selection });
      
      return { selection: promotedSelection };
    }),

  selectInBox: (box) => {
  if (shouldBlockSelectionChange('selectInBox', { box })) return;
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
              // Only add to selection if command is not locked
              if (!command.locked) {
                commandsInBox.push(command.id);
              }
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
        // Double-check that commands are not locked before adding to selection
        const allowedCommands = analysis.commandsInBox.filter(commandId => {
          for (const path of state.paths) {
            for (const subPath of path.subPaths) {
              const command = subPath.commands.find(cmd => cmd.id === commandId);
              if (command) {
                return !command.locked && !subPath.locked;
              }
            }
          }
          return false;
        });
        newSelection.selectedCommands.push(...allowedCommands);
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

    set(state => {
      const tempSelection = {
        ...state.selection,
        ...newSelection
      };
      
      // Check for group promotion after box selection
      const promotedSelection = checkAndPromoteToGroup({ ...state, selection: tempSelection });
      
      return {
        selection: promotedSelection
      };
    });
  },

  // New selection functions for SVG elements
  selectGroup: (groupId, addToSelection = false) =>
    set((state) => {
      if (shouldBlockSelectionChange('selectGroup', { groupId, addToSelection })) return { selection: { ...state.selection } };
      const newSelection = addToSelection ? {
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
        selectedAnimations: [],
      };
      
      // Check for traditional group promotion after selection change
      const promotedSelection = checkAndPromoteToGroup({ ...state, selection: newSelection });
      
      return { selection: promotedSelection };
    }),

  selectImage: (imageId, addToSelection = false) =>
    set((state) => {
      if (shouldBlockSelectionChange('selectImage', { imageId, addToSelection })) return { selection: { ...state.selection } };
      const image = state.images.find(img => img.id === imageId);
      if (image?.locked) return state;

      const newSelection = addToSelection ? {
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
      };
      
      // Check for traditional group promotion after selection change
      const promotedSelection = checkAndPromoteToGroup({ ...state, selection: newSelection });
      
      return { selection: promotedSelection };
    }),

  selectUse: (useId, addToSelection = false) =>
    set((state) => {
      if (shouldBlockSelectionChange('selectUse', { useId, addToSelection })) return { selection: { ...state.selection } };
      const use = state.uses.find(u => u.id === useId);
      if (use?.locked) return state;

      const newSelection = addToSelection ? {
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
      };
      
      // Check for traditional group promotion after selection change
      const promotedSelection = checkAndPromoteToGroup({ ...state, selection: newSelection });
      
      return { selection: promotedSelection };
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
      if (!shouldBlockSelectionChange('selectImageByPoint', { imageId: imageAtPoint.id })) {
        state.selectImage(imageAtPoint.id, isShiftPressed);
      }
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
      if (!shouldBlockSelectionChange('selectUseByPoint', { useId: useAtPoint.id })) {
        state.selectUse(useAtPoint.id, isShiftPressed);
      }
    }
  },

  selectElementByPoint: (point, isShiftPressed = false) => {
    const state = get();
    
    // Try to select in order of priority: images, use elements, then existing logic
    if (!shouldBlockSelectionChange('selectElementByPoint')) {
      state.selectImageByPoint(point, isShiftPressed);
    }
    if (state.selection.selectedImages.length > 0) return;
    
    if (!shouldBlockSelectionChange('selectElementByPoint')) {
      state.selectUseByPoint(point, isShiftPressed);
    }
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

  selectAnimation: (animationId, addToSelection = false) =>
    set((state) => {
      const newSelection = addToSelection ? {
        ...state.selection,
        selectedAnimations: state.selection.selectedAnimations.includes(animationId) 
          ? state.selection.selectedAnimations 
          : [...state.selection.selectedAnimations, animationId],
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
        selectedUses: [],
        selectedAnimations: [animationId],
      };
      
      // Check for traditional group promotion after selection change
      const promotedSelection = checkAndPromoteToGroup({ ...state, selection: newSelection });
      
      return { selection: promotedSelection };
    }),

  selectAnimationMultiple: (animationId, isShiftPressed = false) =>
    set((state) => {
      const currentSelection = state.selection.selectedAnimations;
      let newSelection;
      
      if (isShiftPressed) {
        if (currentSelection.includes(animationId)) {
          newSelection = {
            ...state.selection,
            selectedAnimations: currentSelection.filter(id => id !== animationId),
          };
        } else {
          newSelection = {
            ...state.selection,
            selectedAnimations: [...currentSelection, animationId],
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
            selectedUses: [],
          };
        }
      } else {
        newSelection = {
          ...state.selection,
          selectedAnimations: [animationId],
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
          selectedUses: [],
        };
      }
      
      // Check for traditional group promotion after selection change
      const promotedSelection = checkAndPromoteToGroup({ ...state, selection: newSelection });
      
      return { selection: promotedSelection };
    }),

  updateSelectionBox: (box) =>
    set((state) => ({
      selection: {
        ...state.selection,
        selectionBox: box || undefined
      }
    })),
});