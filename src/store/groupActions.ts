import { StateCreator } from 'zustand';
import { EditorState, SVGGroup, SVGGroupChild, Point, GroupLockLevel } from '../types';
import { generateId } from '../utils/id-utils';
import { transformManager } from '../plugins/transform/TransformManager';
import { TextActions } from './textActions';
import { SVGElementActions } from './svgElementActions';
import { generateGroupSVG, downloadGroupSVG } from '../utils/group-svg-utils';
import { duplicatePath } from '../utils/duplicate-utils';
import { calculateSmartDuplicationOffset } from '../utils/duplication-positioning';

export interface GroupActions {
  // Group creation and management
  createGroup: (name?: string, childIds?: string[], childTypes?: ('path' | 'text' | 'group')[]) => string;
  createGroupFromSelection: () => string | null;
  addGroup: (group: SVGGroup) => void;
  updateGroup: (groupId: string, updates: Partial<Omit<SVGGroup, 'id'>>) => void;
  deleteGroup: (groupId: string, deleteChildren?: boolean) => void;
  
  // Group hierarchy management
  addChildToGroup: (groupId: string, childId: string, childType: 'path' | 'text' | 'textPath' | 'group' | 'image' | 'clipPath' | 'mask' | 'use') => void;
  removeChildFromGroup: (groupId: string, childId: string) => void;
  moveChildInGroup: (groupId: string, childId: string, newIndex: number) => void;
  ungroupElements: (groupId: string) => void;
  
  // Group transformations
  moveGroup: (groupId: string, delta: Point) => void;
  transformGroup: (groupId: string, transform: string) => void;
  
  // Group utilities
  getGroupById: (groupId: string) => SVGGroup | null;
  getAllGroups: () => SVGGroup[];
  getGroupChildren: (groupId: string) => SVGGroupChild[];
  getGroupChildrenDetails: (groupId: string) => { id: string; type: 'path' | 'text' | 'textPath' | 'group' | 'image' | 'clipPath' | 'mask' | 'use'; }[];
  getParentGroup: (childId: string, childType: 'path' | 'text' | 'textPath' | 'group' | 'image' | 'clipPath' | 'mask' | 'use') => SVGGroup | null;
  isElementInGroup: (elementId: string, elementType: 'path' | 'text' | 'textPath' | 'group' | 'image' | 'clipPath' | 'mask' | 'use') => boolean;
  shouldMoveSyncGroup: (elementId: string, elementType: 'path' | 'text' | 'textPath' | 'group' | 'image' | 'clipPath' | 'mask' | 'use') => SVGGroup | null;
  moveSyncGroupByElement: (elementId: string, elementType: 'path' | 'text' | 'textPath' | 'group' | 'image' | 'clipPath' | 'mask' | 'use', delta: Point) => boolean;
  hasMultipleGroupElementsSelected: (groupId: string) => boolean;
  
  // Group visibility and locking
  toggleGroupVisibility: (groupId: string) => void;
  lockGroup: (groupId: string, locked?: boolean) => void;
  setGroupLockLevel: (groupId: string, lockLevel: GroupLockLevel) => void;
  getGroupLockLevel: (groupId: string) => GroupLockLevel;
  isGroupLocked: (groupId: string, action: 'selection' | 'editing' | 'movement') => boolean;
  
  // Group duplication
  duplicateGroup: (groupId: string, customOffset?: { x: number; y: number }) => string | null;
  
  // Bulk operations
  clearAllGroups: () => void;
  replaceGroups: (groups: SVGGroup[]) => void;
  
  // SVG export
  exportGroupSVG: (groupId: string, autoDownload?: boolean) => string | null;
}

export const createGroupActions: StateCreator<
  EditorState & GroupActions & TextActions & SVGElementActions & { moveSubPath: (subPathId: string, delta: Point, skipGroupSync?: boolean, skipGridSnapping?: boolean) => void; },
  [],
  [],
  GroupActions
> = (set, get) => ({

  createGroup: (name?: string, childIds?: string[], childTypes?: ('path' | 'text' | 'group')[]) => {
    const newGroup: SVGGroup = {
      id: generateId(),
      name: name || `Group ${get().groups.length + 1}`,
      children: [],
      visible: true,
      locked: false,
      lockLevel: 'movement-sync'
    };
    
    // Add children if provided
    if (childIds && childTypes && childIds.length === childTypes.length) {
      newGroup.children = childIds.map((id, index) => ({
        type: childTypes[index],
        id
      }));
    }
    
    set(state => ({
      groups: [...state.groups, newGroup]
    }));
    
    return newGroup.id;
  },

  createGroupFromSelection: () => {
    const state = get();
    const { selection } = state;

    // Safely handle undefined selection arrays
    const selectedPaths = selection.selectedPaths ?? [];
    const selectedTexts = selection.selectedTexts ?? [];
    const selectedTextPaths = selection.selectedTextPaths ?? [];
    const selectedGroups = selection.selectedGroups ?? [];
    const selectedSubPaths = selection.selectedSubPaths ?? [];
    const selectedImages = selection.selectedImages ?? [];
    const selectedUses = selection.selectedUses ?? [];

    // Find paths that contain selected sub-paths
    const pathsFromSubPaths = new Set<string>();
    selectedSubPaths.forEach(subPathId => {
      const parentPath = state.paths.find(path => 
        path.subPaths.some(subPath => subPath.id === subPathId)
      );
      if (parentPath) {
        pathsFromSubPaths.add(parentPath.id);
      }
    });

    // Combine all path IDs (directly selected + from sub-paths)
    const allPathIds = new Set([...selectedPaths, ...pathsFromSubPaths]);

    // Decompose selected groups into their individual elements
    // This fixes the bug where group promotion would cause wrong elements to be grouped
    const decomposedElements: SVGGroupChild[] = [];
    
    selectedGroups.forEach(groupId => {
      const group = state.groups.find(g => g.id === groupId);
      if (group) {
        // Add all children of the selected group as individual elements
        decomposedElements.push(...group.children);
      }
    });

    // Collect all selected elements (including decomposed group elements)
    const children: SVGGroupChild[] = [
      ...Array.from(allPathIds).map(id => ({ type: 'path' as const, id })),
      ...selectedTexts.map(id => ({ type: 'text' as const, id })),
      ...selectedTextPaths.map(id => ({ type: 'textPath' as const, id })),
      ...selectedImages.map(id => ({ type: 'image' as const, id })),
      ...selectedUses.map(id => ({ type: 'use' as const, id })),
      ...decomposedElements // Add the decomposed group elements
    ];

    // Remove duplicate elements (in case an element was selected both individually and as part of a group)
    const uniqueChildren = children.filter((child, index, array) => 
      array.findIndex(c => c.id === child.id && c.type === child.type) === index
    );

    if (uniqueChildren.length === 0) {
      return null;
    }

    const newGroup: SVGGroup = {
      id: generateId(),
      name: `Group ${state.groups.length + 1}`,
      children: uniqueChildren,
      visible: true,
      locked: false,
      lockLevel: 'movement-sync'
    };

    set(state => ({
      groups: [...state.groups, newGroup],
      selection: {
        ...state.selection,
        selectedPaths: [],
        selectedTexts: [],
        selectedTextPaths: [],
        selectedGroups: [newGroup.id],
        selectedSubPaths: [],
        selectedImages: [],
        selectedUses: []
      }
    }));

    return newGroup.id;
  },

  addGroup: (group: SVGGroup) => {
    set(state => ({
      groups: [...state.groups, group]
    }));
  },

  updateGroup: (groupId: string, updates: Partial<Omit<SVGGroup, 'id'>>) => {
    set(state => ({
      groups: state.groups.map(group =>
        group.id === groupId ? { ...group, ...updates } : group
      )
    }));
  },

  deleteGroup: (groupId: string, deleteChildren: boolean = false) => {
    set(state => {
      const group = state.groups.find(g => g.id === groupId);
      if (!group) return state;
      
      // Check if group is locked for editing
      const lockLevel = group.lockLevel || (group.locked ? 'full' : 'none');
      if (lockLevel === 'editing' || lockLevel === 'full') {
        return state;
      }
      
      let newState = {
        ...state,
        groups: state.groups.filter(g => g.id !== groupId),
        selection: {
          ...state.selection,
          selectedGroups: state.selection.selectedGroups.filter(id => id !== groupId)
        }
      };
      
      // If deleteChildren is true, also delete all child elements
      if (deleteChildren) {
        // Helper function to recursively collect all child elements
        const collectAllChildren = (group: any, allGroups: any[]): { paths: string[], texts: string[], textPaths: string[], groups: string[], images: string[], uses: string[] } => {
          const result = { paths: [] as string[], texts: [] as string[], textPaths: [] as string[], groups: [] as string[], images: [] as string[], uses: [] as string[] };
          
          group.children.forEach((child: any) => {
            switch (child.type) {
              case 'path':
                result.paths.push(child.id);
                break;
              case 'text':
                result.texts.push(child.id);
                break;
              case 'textPath':
                result.textPaths.push(child.id);
                break;
              case 'group':
                result.groups.push(child.id);
                const childGroup = allGroups.find(g => g.id === child.id);
                if (childGroup) {
                  const nestedChildren = collectAllChildren(childGroup, allGroups);
                  result.paths.push(...nestedChildren.paths);
                  result.texts.push(...nestedChildren.texts);
                  result.textPaths.push(...nestedChildren.textPaths);
                  result.groups.push(...nestedChildren.groups);
                  result.images.push(...nestedChildren.images);
                  result.uses.push(...nestedChildren.uses);
                }
                break;
              case 'image':
                result.images.push(child.id);
                break;
              case 'use':
                result.uses.push(child.id);
                break;
            }
          });
          
          return result;
        };
        
        const allChildren = collectAllChildren(group, state.groups);
        
        // Remove all child elements
        newState.paths = newState.paths.filter(p => !allChildren.paths.includes(p.id));
        newState.texts = newState.texts.filter(t => !allChildren.texts.includes(t.id));
        newState.textPaths = newState.textPaths.filter(tp => !allChildren.textPaths.includes(tp.id));
        newState.groups = newState.groups.filter(g => !allChildren.groups.includes(g.id));
        newState.images = newState.images.filter(img => !allChildren.images.includes(img.id));
        newState.uses = newState.uses.filter(u => !allChildren.uses.includes(u.id));
        
        // Remove from selection
        newState.selection.selectedPaths = newState.selection.selectedPaths.filter(id => !allChildren.paths.includes(id));
        newState.selection.selectedTexts = newState.selection.selectedTexts.filter(id => !allChildren.texts.includes(id));
        newState.selection.selectedTextPaths = newState.selection.selectedTextPaths.filter(id => !allChildren.textPaths.includes(id));
        newState.selection.selectedGroups = newState.selection.selectedGroups.filter(id => !allChildren.groups.includes(id));
        newState.selection.selectedImages = newState.selection.selectedImages.filter(id => !allChildren.images.includes(id));
        newState.selection.selectedUses = newState.selection.selectedUses.filter(id => !allChildren.uses.includes(id));
      }
      
      return newState;
    });
  },

  addChildToGroup: (groupId: string, childId: string, childType: 'path' | 'text' | 'textPath' | 'group' | 'image' | 'clipPath' | 'mask' | 'use') => {
    set(state => {
      const group = state.groups.find(g => g.id === groupId);
      if (!group) return state;
      
      // Check if group is locked for editing
      const lockLevel = group.lockLevel || (group.locked ? 'full' : 'none');
      if (lockLevel === 'editing' || lockLevel === 'full') {
        return state;
      }
      
      let exists = false;
      if (childType === 'path') {
        exists = state.paths.some(p => p.id === childId);
      } else if (childType === 'text') {
        exists = state.texts.some(t => t.id === childId);
      } else if (childType === 'textPath') {
        exists = state.textPaths.some(tp => tp.id === childId);
      } else if (childType === 'group') {
        exists = state.groups.some(g => g.id === childId);
      } else if (childType === 'image') {
        exists = state.images.some(img => img.id === childId);
      } else if (childType === 'use') {
        exists = state.uses.some(u => u.id === childId);
      }
      if (!exists) {
        if (typeof window !== 'undefined') {
          alert(`No se puede agregar: el ${childType} con id ${childId} no existe.`);
        }
        return state;
      }
      return {
        ...state,
        groups: state.groups.map(group =>
          group.id === groupId
            ? {
                ...group,
                children: [...group.children, { type: childType, id: childId }]
              }
            : group
        )
      };
    });
  },

  removeChildFromGroup: (groupId: string, childId: string) => {
    set(state => {
      const group = state.groups.find(g => g.id === groupId);
      if (!group) return state;
      
      // Check if group is locked for editing
      const lockLevel = group.lockLevel || (group.locked ? 'full' : 'none');
      if (lockLevel === 'editing' || lockLevel === 'full') {
        return state;
      }
      
      return {
        ...state,
        groups: state.groups.map(group =>
          group.id === groupId
            ? {
                ...group,
                children: group.children.filter(child => child.id !== childId)
              }
            : group
        )
      };
    });
  },

  moveChildInGroup: (groupId: string, childId: string, newIndex: number) => {
    set(state => {
      const group = state.groups.find(g => g.id === groupId);
      if (!group) return state;
      
      // Check if group is locked for editing
      const lockLevel = group.lockLevel || (group.locked ? 'full' : 'none');
      if (lockLevel === 'editing' || lockLevel === 'full') {
        return state;
      }
      
      return {
        ...state,
        groups: state.groups.map(group => {
          if (group.id !== groupId) return group;
          
          const children = [...group.children];
          const currentIndex = children.findIndex(child => child.id === childId);
          if (currentIndex === -1) return group;
          
          const [child] = children.splice(currentIndex, 1);
          children.splice(newIndex, 0, child);
          
          return { ...group, children };
        })
      };
    });
  },

  ungroupElements: (groupId: string) => {
    const group = get().getGroupById(groupId);
    if (!group) return;
    
    set(state => ({
      groups: state.groups.filter(g => g.id !== groupId),
      selection: {
        ...state.selection,
        selectedGroups: state.selection.selectedGroups.filter(id => id !== groupId),
        selectedPaths: [
          ...state.selection.selectedPaths,
          ...group.children.filter(c => c.type === 'path').map(c => c.id)
        ],
        selectedTexts: [
          ...state.selection.selectedTexts,
          ...group.children.filter(c => c.type === 'text').map(c => c.id)
        ],
        selectedTextPaths: [
          ...state.selection.selectedTextPaths,
          ...group.children.filter(c => c.type === 'textPath').map(c => c.id)
        ],
        selectedImages: [
          ...state.selection.selectedImages,
          ...group.children.filter(c => c.type === 'image').map(c => c.id)
        ],
        selectedUses: [
          ...state.selection.selectedUses,
          ...group.children.filter(c => c.type === 'use').map(c => c.id)
        ]
      }
    }));
  },

  moveGroup: (groupId: string, delta: Point) => {
  // Group movement applies to all children
    const state = get();
    const group = state.groups.find(g => g.id === groupId);
    if (!group) return;

  // Debug log: entering moveGroup
  // eslint-disable-next-line no-console
  // moveGroup start

    // Move paths directly, but use moveText for text elements to handle all edge cases
    const storeState = get();
    const targetGroup = storeState.groups.find(g => g.id === groupId);
    if (!targetGroup) return;

    // Move all path children by updating all their subpaths in a single state update
    const pathChildrenIds = targetGroup.children
      .filter(child => child.type === 'path')
      .map(child => child.id);
    
    if (pathChildrenIds.length > 0) {
      set((state) => {
        // Apply grid snapping if enabled
        let finalDelta = delta;
        if (state.grid.enabled && state.grid.snapToGrid) {
          const gridSize = state.grid.size;
          const snapToGrid = (value: number) => Math.round(value / gridSize) * gridSize;
          finalDelta = {
            x: snapToGrid(delta.x),
            y: snapToGrid(delta.y)
          };
        }

        const newPaths = state.paths.map((path) => {
          if (pathChildrenIds.includes(path.id)) {
            return {
              ...path,
              subPaths: path.subPaths.map((subPath) => ({
                ...subPath,
                commands: subPath.commands.map((cmd) => {
                  let newX = cmd.x !== undefined ? cmd.x + finalDelta.x : cmd.x;
                  let newY = cmd.y !== undefined ? cmd.y + finalDelta.y : cmd.y;
                  let newX1 = cmd.x1 !== undefined ? cmd.x1 + finalDelta.x : cmd.x1;
                  let newY1 = cmd.y1 !== undefined ? cmd.y1 + finalDelta.y : cmd.y1;
                  let newX2 = cmd.x2 !== undefined ? cmd.x2 + finalDelta.x : cmd.x2;
                  let newY2 = cmd.y2 !== undefined ? cmd.y2 + finalDelta.y : cmd.y2;
                  
                  return {
                    ...cmd,
                    x: newX,
                    y: newY,
                    x1: newX1,
                    y1: newY1,
                    x2: newX2,
                    y2: newY2,
                  };
                }),
              }))
            };
          }
          return path;
        });

        return {
          paths: newPaths,
          renderVersion: state.renderVersion + 1
        };
      });
    }

    // Move text children using moveText method with skipGroupSync to avoid recursion
    targetGroup.children.forEach(child => {
      if (child.type === 'text') {
        if (typeof get().moveText === 'function') {
          get().moveText(child.id, delta, true); // Skip group sync to avoid recursion
        }
      }
      if (child.type === 'textPath') {
        const state = get() as any;
        if (typeof state.moveTextPath === 'function') {
          state.moveTextPath(child.id, delta, true); // Skip group sync to avoid recursion
        }
      }
      if (child.type === 'group') {
        if (typeof get().moveGroup === 'function') {
          get().moveGroup(child.id, delta);
        }
      }
      if (child.type === 'image') {
        if (typeof get().moveImage === 'function') {
          get().moveImage(child.id, delta, true); // Skip group sync to avoid recursion
        }
      }
      if (child.type === 'use') {
        if (typeof get().moveUse === 'function') {
          get().moveUse(child.id, delta);
        }
      }
    });

  // Debug log: finished moveGroup
  // eslint-disable-next-line no-console
  // moveGroup end
    // Force transform update so UI handlers follow the moved group immediately
    try {
      transformManager.updateTransformState();
    } catch (err) {
      // eslint-disable-next-line no-console
  // failed to update transform state after moveGroup
    }
  },

  transformGroup: (groupId: string, transform: string) => {
    set(state => ({
      groups: state.groups.map(group =>
        group.id === groupId ? { ...group, transform } : group
      )
    }));
  },

  getGroupById: (groupId: string) => {
    const state = get();
    return state.groups.find(group => group.id === groupId) || null;
  },

  getAllGroups: () => {
    const state = get();
    return state.groups;
  },

  getGroupChildren: (groupId: string) => {
    const group = get().getGroupById(groupId);
    return group ? group.children : [];
  },

  getGroupChildrenDetails: (groupId: string) => {
    const group = get().getGroupById(groupId);
    if (!group) return [];
    // Devuelve los hijos con su id y tipo
    return group.children.map(child => ({ id: child.id, type: child.type }));
  },

  getParentGroup: (childId: string, childType: 'path' | 'text' | 'textPath' | 'group' | 'image' | 'clipPath' | 'mask' | 'use') => {
    const state = get();
    return state.groups.find(group => 
      group.children.some(child => child.id === childId && child.type === childType)
    ) || null;
  },

  isElementInGroup: (elementId: string, elementType: 'path' | 'text' | 'textPath' | 'group' | 'image' | 'clipPath' | 'mask' | 'use') => {
    return get().getParentGroup(elementId, elementType) !== null;
  },

  shouldMoveSyncGroup: (elementId: string, elementType: 'path' | 'text' | 'textPath' | 'group' | 'image' | 'clipPath' | 'mask' | 'use') => {
    const state = get();
    const parentGroup = state.getParentGroup(elementId, elementType);
    
    if (!parentGroup) return null;
    
    const lockLevel = state.getGroupLockLevel(parentGroup.id);
    return lockLevel === 'movement-sync' ? parentGroup : null;
  },

  moveSyncGroupByElement: (elementId: string, elementType: 'path' | 'text' | 'textPath' | 'group' | 'image' | 'clipPath' | 'mask' | 'use', delta: Point) => {
    const state = get();
    const syncGroup = state.shouldMoveSyncGroup(elementId, elementType);
    
    if (!syncGroup) return false;
    
    // Move the entire group instead of just the individual element
    state.moveGroup(syncGroup.id, delta);
    return true;
  },

  hasMultipleGroupElementsSelected: (groupId: string) => {
    const state = get();
    const group = state.groups.find(g => g.id === groupId);
    if (!group) return false;
    
    let selectedCount = 0;
    
    // Count selected texts from this group
    const groupTextIds = group.children.filter(child => child.type === 'text').map(child => child.id);
    selectedCount += state.selection.selectedTexts.filter(id => groupTextIds.includes(id)).length;
    
    // Count selected subpaths from paths in this group
    const groupPathIds = group.children.filter(child => child.type === 'path').map(child => child.id);
    groupPathIds.forEach(pathId => {
      const path = state.paths.find(p => p.id === pathId);
      if (path) {
        path.subPaths.forEach(sp => {
          if (state.selection.selectedSubPaths.includes(sp.id)) {
            selectedCount++;
          }
        });
      }
    });
    
    return selectedCount > 1;
  },

  toggleGroupVisibility: (groupId: string) => {
    set(state => ({
      groups: state.groups.map(group =>
        group.id === groupId ? { ...group, visible: !group.visible } : group
      )
    }));
  },

  lockGroup: (groupId: string, locked: boolean = true) => {
    set(state => ({
      groups: state.groups.map(group =>
        group.id === groupId ? { ...group, locked, lockLevel: locked ? 'full' : 'none' } : group
      )
    }));
  },

  setGroupLockLevel: (groupId: string, lockLevel: GroupLockLevel) => {
    set(state => {
      const targetGroup = state.groups.find(g => g.id === groupId);
      if (!targetGroup) {
        return state;
      }
      
      const newGroups = state.groups.map(group =>
        group.id === groupId ? { 
          ...group, 
          lockLevel,
          locked: lockLevel !== 'none' // Update legacy field for compatibility
        } : group
      );
      
      return {
        ...state,
        groups: newGroups
      };
    });
  },

  getGroupLockLevel: (groupId: string) => {
    const state = get();
    const group = state.groups.find(g => g.id === groupId);
    if (!group) {
      return 'none';
    }
    
    // Handle legacy groups that might not have lockLevel defined
    let result: any = group.lockLevel;
    if (!result) {
      result = group.locked ? 'full' : 'none';
    }
    
    return result;
  },

  isGroupLocked: (groupId: string, action: 'selection' | 'editing' | 'movement') => {
    const lockLevel = get().getGroupLockLevel(groupId);
    
    switch (lockLevel) {
      case 'none':
        return false;
      case 'selection':
        return action === 'selection';
      case 'editing':
        return action === 'selection' || action === 'editing';
      case 'movement-sync':
        return action === 'selection' || action === 'editing';
      case 'full':
        return true;
      default:
        return false;
    }
  },

  duplicateGroup: (groupId: string, customOffset?: { x: number; y: number }) => {
    const state = get();
    const group = state.groups.find(g => g.id === groupId);
    if (!group) return null;

    // Check if group is locked
    const lockLevel = state.getGroupLockLevel(groupId);
    if (lockLevel === 'editing' || lockLevel === 'full') {
      return null;
    }

    // Use custom offset if provided, otherwise calculate smart offset
    let offset = customOffset;
    if (!offset) {
      const tempSelection = {
        selectedGroups: [groupId],
        selectedPaths: [],
        selectedSubPaths: [],
        selectedCommands: [],
        selectedControlPoints: [],
        selectedTexts: [],
        selectedTextSpans: [],
        selectedTextPaths: [],
        selectedImages: [],
        selectedClipPaths: [],
        selectedMasks: [],
        selectedFilters: [],
        selectedFilterPrimitives: [],
        selectedMarkers: [],
        selectedSymbols: [],
        selectedUses: [],
        selectedAnimations: [],
        selectedGradients: [],
        selectedGradientStops: [],
      };
      offset = calculateSmartDuplicationOffset(tempSelection);
    }
    
    const newGroupId = generateId();
    
    // Duplicate all child elements and collect their new IDs
    const newChildren: SVGGroupChild[] = [];
    
    // Helper function to apply offset to path
    const offsetPath = (path: any, dx: number, dy: number) => {
      return {
        ...path,
        subPaths: path.subPaths.map((subPath: any) => ({
          ...subPath,
          commands: subPath.commands.map((cmd: any) => ({
            ...cmd,
            x: cmd.x !== undefined ? cmd.x + dx : cmd.x,
            y: cmd.y !== undefined ? cmd.y + dy : cmd.y,
            x1: cmd.x1 !== undefined ? cmd.x1 + dx : cmd.x1,
            y1: cmd.y1 !== undefined ? cmd.y1 + dy : cmd.y1,
            x2: cmd.x2 !== undefined ? cmd.x2 + dx : cmd.x2,
            y2: cmd.y2 !== undefined ? cmd.y2 + dy : cmd.y2,
          }))
        }))
      };
    };
    
    group.children.forEach(child => {
      switch (child.type) {
        case 'path':
          const path = state.paths.find(p => p.id === child.id);
          if (path) {
            const duplicatedPath = offsetPath(duplicatePath(path), offset.x, offset.y);
            set(prevState => ({
              paths: [...prevState.paths, duplicatedPath]
            }));
            newChildren.push({ type: 'path', id: duplicatedPath.id });
          }
          break;
        case 'text':
          // Manually duplicate text to avoid automatic offset from duplicateText
          const text = state.texts.find(t => t.id === child.id);
          if (text) {
            const newTextId = generateId();
            const newText = {
              ...text,
              id: newTextId,
              // Keep original position - offset will be applied later with moveText
              x: text.x,
              y: text.y
            };
            
            set(prevState => ({
              texts: [...prevState.texts, newText]
            }));
            
            newChildren.push({ type: 'text', id: newTextId });
            // Move the duplicated text  
            state.moveText(newTextId, offset, true);
          }
          break;
        case 'image':
          // Manually duplicate image to get the new ID
          const image = state.images.find(img => img.id === child.id);
          if (image) {
            const newImageId = generateId();
            const newImage = {
              ...image,
              id: newImageId,
              x: (image.x || 0) + offset.x,
              y: (image.y || 0) + offset.y
            };
            set(prevState => ({
              images: [...prevState.images, newImage]
            }));
            newChildren.push({ type: 'image', id: newImageId });
          }
          break;
        case 'use':
          // Manually duplicate use element to get the new ID
          const use = state.uses.find(u => u.id === child.id);
          if (use) {
            const newUseId = generateId();
            const newUse = {
              ...use,
              id: newUseId,
              x: (use.x || 0) + offset.x,
              y: (use.y || 0) + offset.y
            };
            set(prevState => ({
              uses: [...prevState.uses, newUse]
            }));
            newChildren.push({ type: 'use', id: newUseId });
          }
          break;
        case 'group':
          // Recursively duplicate nested groups
          const newNestedGroupId = state.duplicateGroup(child.id);
          if (newNestedGroupId) {
            newChildren.push({ type: 'group', id: newNestedGroupId });
          }
          break;
      }
    });

    // Create the new group
    const newGroup: SVGGroup = {
      id: newGroupId,
      name: `${group.name} Copy`,
      children: newChildren,
      visible: group.visible,
      locked: false, // New groups are unlocked by default
      lockLevel: 'movement-sync',
      transform: group.transform,
      style: { ...group.style }
    };

    set(state => ({
      groups: [...state.groups, newGroup]
    }));

    return newGroupId;
  },

  clearAllGroups: () => {
    set(state => ({
      groups: [],
      selection: {
        ...state.selection,
        selectedGroups: []
      }
    }));
  },

  replaceGroups: (groups: SVGGroup[]) => {
    set(state => ({
      groups: groups,
      selection: {
        ...state.selection,
        selectedGroups: []
      }
    }));
  },

  exportGroupSVG: (groupId: string, autoDownload: boolean = false) => {
    const state = get();
    const group = state.groups.find(g => g.id === groupId);
    
    if (!group) {
      console.error(`Group with id ${groupId} not found`);
      return null;
    }

    try {
      // Get all gradients and filters (including imported ones)
      const allGradients = [...state.gradients];
      const allFilters = [...state.filters];
      
      // Generate SVG content for the group
      const svgContent = generateGroupSVG(
        group,
        state.paths,
        state.texts,
        state.groups,
        state.images,
        state.symbols,
        state.uses,
        allGradients,
        allFilters,
        state.animations,
        state.precision || 2
      );

      // Auto-download if requested
      if (autoDownload && typeof window !== 'undefined') {
        const filename = `${(group.name || 'group').replace(/[^a-zA-Z0-9-_]/g, '_')}_${new Date().getTime()}.svg`;
        downloadGroupSVG(svgContent, filename);
        
      }

      return svgContent;
    } catch (error) {
      console.error('Error generating group SVG:', error);
      return null;
    }
  }
});