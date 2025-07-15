import { StateCreator } from 'zustand';
import { EditorState, SVGGroup, SVGGroupChild, Point } from '../types';
import { generateId } from '../utils/id-utils';
import { TextActions } from './textActions';
import { generateGroupSVG, downloadGroupSVG } from '../utils/group-svg-utils';

export interface GroupActions {
  // Group creation and management
  createGroup: (name?: string, childIds?: string[], childTypes?: ('path' | 'text' | 'group')[]) => string;
  createGroupFromSelection: () => string | null;
  addGroup: (group: SVGGroup) => void;
  updateGroup: (groupId: string, updates: Partial<Omit<SVGGroup, 'id'>>) => void;
  deleteGroup: (groupId: string, deleteChildren?: boolean) => void;
  
  // Group hierarchy management
  addChildToGroup: (groupId: string, childId: string, childType: 'path' | 'text' | 'group') => void;
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
  getGroupChildrenDetails: (groupId: string) => { id: string; type: 'path' | 'text' | 'group'; }[];
  getParentGroup: (childId: string, childType: 'path' | 'text' | 'group') => SVGGroup | null;
  isElementInGroup: (elementId: string, elementType: 'path' | 'text' | 'group') => boolean;
  
  // Group visibility and locking
  toggleGroupVisibility: (groupId: string) => void;
  lockGroup: (groupId: string, locked?: boolean) => void;
  
  // Bulk operations
  clearAllGroups: () => void;
  replaceGroups: (groups: SVGGroup[]) => void;
  
  // SVG export
  exportGroupSVG: (groupId: string, autoDownload?: boolean) => string | null;
}

export const createGroupActions: StateCreator<
  EditorState & GroupActions & TextActions,
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
      locked: false
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
    const selectedGroups = selection.selectedGroups ?? [];
    const selectedSubPaths = selection.selectedSubPaths ?? [];

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

    // Collect all selected elements
    const children: SVGGroupChild[] = [
      ...Array.from(allPathIds).map(id => ({ type: 'path' as const, id })),
      ...selectedTexts.map(id => ({ type: 'text' as const, id })),
      ...selectedGroups.map(id => ({ type: 'group' as const, id }))
    ];

    if (children.length === 0) {
      return null;
    }

    const newGroup: SVGGroup = {
      id: generateId(),
      name: `Group ${state.groups.length + 1}`,
      children,
      visible: true,
      locked: false
    };

    set(state => ({
      groups: [...state.groups, newGroup],
      selection: {
        ...state.selection,
        selectedPaths: [],
        selectedTexts: [],
        selectedGroups: [newGroup.id],
        selectedSubPaths: []
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
        const collectAllChildren = (group: any, allGroups: any[]): { paths: string[], texts: string[], groups: string[] } => {
          const result = { paths: [] as string[], texts: [] as string[], groups: [] as string[] };
          
          group.children.forEach((child: any) => {
            switch (child.type) {
              case 'path':
                result.paths.push(child.id);
                break;
              case 'text':
                result.texts.push(child.id);
                break;
              case 'group':
                result.groups.push(child.id);
                const childGroup = allGroups.find(g => g.id === child.id);
                if (childGroup) {
                  const nestedChildren = collectAllChildren(childGroup, allGroups);
                  result.paths.push(...nestedChildren.paths);
                  result.texts.push(...nestedChildren.texts);
                  result.groups.push(...nestedChildren.groups);
                }
                break;
            }
          });
          
          return result;
        };
        
        const allChildren = collectAllChildren(group, state.groups);
        
        // Remove all child elements
        newState.paths = newState.paths.filter(p => !allChildren.paths.includes(p.id));
        newState.texts = newState.texts.filter(t => !allChildren.texts.includes(t.id));
        newState.groups = newState.groups.filter(g => !allChildren.groups.includes(g.id));
        
        // Remove from selection
        newState.selection.selectedPaths = newState.selection.selectedPaths.filter(id => !allChildren.paths.includes(id));
        newState.selection.selectedTexts = newState.selection.selectedTexts.filter(id => !allChildren.texts.includes(id));
        newState.selection.selectedGroups = newState.selection.selectedGroups.filter(id => !allChildren.groups.includes(id));
      }
      
      return newState;
    });
  },

  addChildToGroup: (groupId: string, childId: string, childType: 'path' | 'text' | 'group') => {
    set(state => {
      let exists = false;
      if (childType === 'path') {
        exists = state.paths.some(p => p.id === childId);
      } else if (childType === 'text') {
        exists = state.texts.some(t => t.id === childId);
      } else if (childType === 'group') {
        exists = state.groups.some(g => g.id === childId);
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
    set(state => ({
      groups: state.groups.map(group =>
        group.id === groupId
          ? {
              ...group,
              children: group.children.filter(child => child.id !== childId)
            }
          : group
      )
    }));
  },

  moveChildInGroup: (groupId: string, childId: string, newIndex: number) => {
    set(state => ({
      groups: state.groups.map(group => {
        if (group.id !== groupId) return group;
        
        const children = [...group.children];
        const currentIndex = children.findIndex(child => child.id === childId);
        if (currentIndex === -1) return group;
        
        const [child] = children.splice(currentIndex, 1);
        children.splice(newIndex, 0, child);
        
        return { ...group, children };
      })
    }));
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
        ]
      }
    }));
  },

  moveGroup: (groupId: string, delta: Point) => {
    // Group movement applies to all children
    const state = get();
    const group = state.groups.find(g => g.id === groupId);
    if (!group) return;

    // Move paths directly, but use moveText for text elements to handle all edge cases
    const storeState = get();
    const targetGroup = storeState.groups.find(g => g.id === groupId);
    if (!targetGroup) return;

    // Move path children directly
    set(s => {
      let updatedPaths = [...s.paths];
      targetGroup.children.forEach(child => {
        if (child.type === 'path') {
          updatedPaths = updatedPaths.map(path => {
            if (path.id === child.id) {
              return {
                ...path,
                subPaths: path.subPaths.map(subPath => ({
                  ...subPath,
                  commands: subPath.commands.map(command => ({
                    ...command,
                    x: command.x !== undefined ? command.x + delta.x : command.x,
                    y: command.y !== undefined ? command.y + delta.y : command.y,
                    x1: command.x1 !== undefined ? command.x1 + delta.x : command.x1,
                    y1: command.y1 !== undefined ? command.y1 + delta.y : command.y1,
                    x2: command.x2 !== undefined ? command.x2 + delta.x : command.x2,
                    y2: command.y2 !== undefined ? command.y2 + delta.y : command.y2,
                  }))
                }))
              };
            }
            return path;
          });
        }
      });
      return {
        ...s,
        paths: updatedPaths
      };
    });

    // Move text children using moveText method
    targetGroup.children.forEach(child => {
      if (child.type === 'text') {
        if (typeof get().moveText === 'function') {
          get().moveText(child.id, delta);
        }
      }
      if (child.type === 'group') {
        if (typeof get().moveGroup === 'function') {
          get().moveGroup(child.id, delta);
        }
      }
    });
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

  getParentGroup: (childId: string, childType: 'path' | 'text' | 'group') => {
    const state = get();
    return state.groups.find(group => 
      group.children.some(child => child.id === childId && child.type === childType)
    ) || null;
  },

  isElementInGroup: (elementId: string, elementType: 'path' | 'text' | 'group') => {
    return get().getParentGroup(elementId, elementType) !== null;
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
        group.id === groupId ? { ...group, locked } : group
      )
    }));
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
      // Get all gradients (including imported ones)
      const allGradients = [...state.gradients];
      
      // Generate SVG content for the group
      const svgContent = generateGroupSVG(
        group,
        state.paths,
        state.texts,
        state.groups,
        allGradients,
        state.precision || 2
      );

      // Auto-download if requested
      if (autoDownload && typeof window !== 'undefined') {
        const filename = `${(group.name || 'group').replace(/[^a-zA-Z0-9-_]/g, '_')}_${new Date().getTime()}.svg`;
        downloadGroupSVG(svgContent, filename);
        
        // Show notification
        console.log(`✅ Group "${group.name || group.id}" exported as ${filename}`);
      }

      return svgContent;
    } catch (error) {
      console.error('Error generating group SVG:', error);
      return null;
    }
  }
});