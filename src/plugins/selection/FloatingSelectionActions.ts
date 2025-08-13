import { 
  Palette, 
  Brush, 
  Copy, 
  Trash2,
  Group,
  Ungroup,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowUp,
  ArrowDown,
  Lock,
  Unlock,
  Layers,
  Filter,
  Play,
  Compass,
  Eye,
  EyeOff,
  Waves,
  Minimize2
} from 'lucide-react';
import { FloatingActionDefinition, ToolbarAction } from '../../types/floatingToolbar';
import { useEditorStore } from '../../store/editorStore';
import { ReorderManager } from '../reorder/ReorderManager';
import { 
  generateSmoothPath, 
  areCommandsInSameSubPath,
  simplifySegmentWithPointsOnPath
} from '../../utils/path-simplification-utils';

// Utility functions for getting current selection state
const getSelectedPaths = () => {
  const store = useEditorStore.getState();
  return store.selection.selectedPaths.map(id => 
    store.paths.find(p => p.id === id)
  ).filter((path): path is NonNullable<typeof path> => Boolean(path));
};

const getSelectedSubPaths = () => {
  const store = useEditorStore.getState();
  const selectedSubPaths: any[] = [];
  
  store.selection.selectedSubPaths.forEach(subPathId => {
    store.paths.forEach(path => {
      const subPath = path.subPaths.find(sp => sp.id === subPathId);
      if (subPath) {
        selectedSubPaths.push({ path, subPath });
      }
    });
  });
  
  return selectedSubPaths;
};

const getSelectedGroups = () => {
  const store = useEditorStore.getState();
  return store.selection.selectedGroups.map(id => 
    store.groups.find(g => g.id === id)
  ).filter((group): group is NonNullable<typeof group> => Boolean(group));
};

// Get common fill color
const getCommonFillColor = (): string => {
  const paths = getSelectedPaths();
  if (paths.length === 0) return '#000000';
  
  const firstFill = paths[0]?.style?.fill;
  const fillColor = typeof firstFill === 'string' ? firstFill : '#000000';
  const allSame = paths.every(p => {
    const pathFill = p?.style?.fill;
    return typeof pathFill === 'string' && pathFill === fillColor;
  });
  
  return allSame ? fillColor : '#000000';
};

// Get common stroke color
const getCommonStrokeColor = (): string => {
  const paths = getSelectedPaths();
  if (paths.length === 0) return '#000000';
  
  const firstStroke = paths[0]?.style?.stroke;
  const strokeColor = typeof firstStroke === 'string' ? firstStroke : '#000000';
  const allSame = paths.every(p => {
    const pathStroke = p?.style?.stroke;
    return typeof pathStroke === 'string' && pathStroke === strokeColor;
  });
  
  return allSame ? strokeColor : '#000000';
};

// Apply fill color to selected elements
const applyFillColor = (color: string) => {
  const store = useEditorStore.getState();
  
  store.selection.selectedPaths.forEach(pathId => {
    store.updatePathStyle(pathId, { fill: color });
  });
  
  store.selection.selectedTexts.forEach(textId => {
    store.updateTextStyle(textId, { fill: color });
  });
};

// Apply stroke color to selected elements
const applyStrokeColor = (color: string) => {
  const store = useEditorStore.getState();
  
  store.selection.selectedPaths.forEach(pathId => {
    store.updatePathStyle(pathId, { stroke: color });
  });
  
  store.selection.selectedTexts.forEach(textId => {
    store.updateTextStyle(textId, { stroke: color });
  });
};

// Group selected elements
const groupSelected = () => {
  const store = useEditorStore.getState();
  const hasSelection = store.selection.selectedPaths.length > 0 || 
                      store.selection.selectedTexts.length > 0;
  
  if (hasSelection) {
    // TODO: Implement groupSelection method in store
      }
};

// Ungroup selected groups
const ungroupSelected = () => {
  const store = useEditorStore.getState();
  
  store.selection.selectedGroups.forEach(groupId => {
    store.ungroupElements(groupId);
  });
};

// Duplicate selected elements
const duplicateSelected = () => {
  const store = useEditorStore.getState();
  
  // Duplicate paths
  store.selection.selectedPaths.forEach(pathId => {
    const path = store.paths.find(p => p.id === pathId);
    if (path) {
      // Create a new path with offset position
      const newPath = {
        ...path,
        subPaths: path.subPaths.map(subPath => ({
          ...subPath,
          commands: subPath.commands.map(cmd => ({
            ...cmd,
            x: cmd.x ? cmd.x + 20 : cmd.x,
            y: cmd.y ? cmd.y + 20 : cmd.y,
            x1: cmd.x1 ? cmd.x1 + 20 : cmd.x1,
            y1: cmd.y1 ? cmd.y1 + 20 : cmd.y1,
            x2: cmd.x2 ? cmd.x2 + 20 : cmd.x2,
            y2: cmd.y2 ? cmd.y2 + 20 : cmd.y2
          }))
        }))
      };
      // TODO: This needs proper implementation to handle complex paths
          }
  });
  
  // Duplicate texts
  store.selection.selectedTexts.forEach(textId => {
    const text = store.texts.find(t => t.id === textId);
    if (text) {
      const content = 'content' in text ? (text as any).content : 'Text';
      store.addText(text.x + 20, text.y + 20, content);
    }
  });
};

// Delete selected elements
const deleteSelected = () => {
  const store = useEditorStore.getState();
  
  // Delete paths
  store.selection.selectedPaths.forEach(pathId => {
    // TODO: Implement deletePath method in store
      });
  
  // Delete texts
  store.selection.selectedTexts.forEach(textId => {
    store.deleteText(textId);
  });
  
  // Delete groups
  store.selection.selectedGroups.forEach(groupId => {
    // TODO: Implement deleteGroup method in store
      });
  
  // Clear selection
  store.clearSelection();
};

// Arrange functions
const bringToFront = () => {
  const store = useEditorStore.getState();
  
  store.selection.selectedPaths.forEach(pathId => {
    // TODO: Implement bring to front functionality
      });
};

const sendToBack = () => {
  const store = useEditorStore.getState();
  
  store.selection.selectedPaths.forEach(pathId => {
    // TODO: Implement send to back functionality
      });
};

// Alignment options
const alignmentOptions = [
  { 
    id: 'align-left', 
    label: 'Align Left', 
    icon: AlignLeft,
    action: () => console.warn('Align left - needs implementation') 
  },
  { 
    id: 'align-center', 
    label: 'Align Center', 
    icon: AlignCenter,
    action: () => console.warn('Align center - needs implementation') 
  },
  { 
    id: 'align-right', 
    label: 'Align Right', 
    icon: AlignRight,
    action: () => console.warn('Align right - needs implementation') 
  }
];

// Arrange options for regular elements
const arrangeOptions = [
  { 
    id: 'bring-front', 
    label: 'Bring to Front', 
    icon: ArrowUp,
    action: bringToFront 
  },
  { 
    id: 'send-back', 
    label: 'Send to Back', 
    icon: ArrowDown,
    action: sendToBack 
  }
];

// Filter options for regular elements
const filterOptions = [
  { 
    id: 'blur', 
    label: 'Blur', 
    action: () => console.warn('Apply blur - needs implementation') 
  },
  { 
    id: 'shadow', 
    label: 'Drop Shadow', 
    action: () => console.warn('Apply shadow - needs implementation') 
  }
];

// Animation options for regular elements
const animationOptions = [
  { 
    id: 'fade', 
    label: 'Fade In/Out', 
    action: () => console.warn('Add fade animation - needs implementation') 
  },
  { 
    id: 'move', 
    label: 'Move', 
    action: () => console.warn('Add move animation - needs implementation') 
  }
];

// Single element actions (paths, subpaths)
export const singleElementActions: ToolbarAction[] = [
  {
    id: 'fill-color',
    icon: Palette,
    label: 'Fill Color',
    type: 'color',
    color: {
      currentColor: getCommonFillColor(),
      onChange: applyFillColor
    },
    priority: 100,
    tooltip: 'Change fill color'
  },
  {
    id: 'stroke-color',
    icon: Brush,
    label: 'Stroke Color',
    type: 'color',
    color: {
      currentColor: getCommonStrokeColor(),
      onChange: applyStrokeColor
    },
    priority: 90,
    tooltip: 'Change stroke color'
  },
  {
    id: 'arrange',
    icon: Layers,
    label: 'Arrange',
    type: 'dropdown',
    dropdown: {
      options: arrangeOptions
    },
    priority: 70,
    tooltip: 'Arrange layer order'
  },
  {
    id: 'filters',
    icon: Filter,
    label: 'Filters',
    type: 'dropdown',
    dropdown: {
      options: filterOptions
    },
    priority: 60,
    tooltip: 'Apply filters'
  },
  {
    id: 'animations',
    icon: Play,
    label: 'Animations',
    type: 'dropdown',
    dropdown: {
      options: animationOptions
    },
    priority: 50,
    tooltip: 'Add animations'
  },
  {
    id: 'duplicate-element',
    icon: Copy,
    label: 'Duplicate',
    type: 'button',
    action: duplicateSelected,
    priority: 20,
    tooltip: 'Duplicate element'
  },
  {
    id: 'delete-element',
    icon: Trash2,
    label: 'Delete',
    type: 'button',
    action: deleteSelected,
    priority: 10,
    destructive: true,
    tooltip: 'Delete element'
  }
];

// Multiple selection actions
export const multipleSelectionActions: ToolbarAction[] = [
  {
    id: 'group-selected',
    icon: Group,
    label: 'Group',
    type: 'button',
    action: groupSelected,
    priority: 100,
    tooltip: 'Group selected elements'
  },
  {
    id: 'align-multiple',
    icon: AlignCenter,
    label: 'Align',
    type: 'dropdown',
    dropdown: {
      options: alignmentOptions
    },
    priority: 90,
    tooltip: 'Align elements'
  },
  {
    id: 'common-fill',
    icon: Palette,
    label: 'Fill Color',
    type: 'color',
    color: {
      currentColor: getCommonFillColor(),
      onChange: applyFillColor
    },
    priority: 80,
    tooltip: 'Change fill color'
  },
  {
    id: 'common-stroke',
    icon: Brush,
    label: 'Stroke Color',
    type: 'color',
    color: {
      currentColor: getCommonStrokeColor(),
      onChange: applyStrokeColor
    },
    priority: 70,
    tooltip: 'Change stroke color'
  },
  {
    id: 'arrange-multiple',
    icon: Layers,
    label: 'Arrange',
    type: 'dropdown',
    dropdown: {
      options: arrangeOptions
    },
    priority: 60,
    tooltip: 'Arrange layer order'
  },
  {
    id: 'duplicate-multiple',
    icon: Copy,
    label: 'Duplicate All',
    type: 'button',
    action: duplicateSelected,
    priority: 20,
    tooltip: 'Duplicate all selected'
  },
  {
    id: 'delete-multiple',
    icon: Trash2,
    label: 'Delete All',
    type: 'button',
    action: deleteSelected,
    priority: 10,
    destructive: true,
    tooltip: 'Delete all selected'
  }
];

// Group utility functions
const getSelectedGroupsData = () => {
  const store = useEditorStore.getState();
  return store.selection.selectedGroups.map(id => 
    store.getGroupById(id)
  ).filter((group): group is NonNullable<typeof group> => Boolean(group));
};

const getCommonGroupVisibility = (): boolean => {
  const groups = getSelectedGroupsData();
  if (groups.length === 0) return true;
  
  const firstVisibility = groups[0]?.visible !== false;
  return groups.every(group => (group?.visible !== false) === firstVisibility) ? firstVisibility : true;
};

const getCommonGroupLockLevel = (): 'none' | 'selection' | 'editing' | 'movement-sync' | 'full' => {
  const groups = getSelectedGroupsData();
  if (groups.length === 0) return 'none';
  
  const firstLockLevel = groups[0]?.lockLevel || (groups[0]?.locked ? 'full' : 'none');
  const allSame = groups.every(group => {
    const lockLevel = group?.lockLevel || (group?.locked ? 'full' : 'none');
    return lockLevel === firstLockLevel;
  });
  
  return allSame ? firstLockLevel : 'none';
};

// Group action functions
const toggleGroupVisibility = () => {
  const store = useEditorStore.getState();
  
  store.selection.selectedGroups.forEach(groupId => {
    store.toggleGroupVisibility(groupId);
  });
};

const toggleGroupLock = () => {
  const store = useEditorStore.getState();
  const currentLockLevel = getCommonGroupLockLevel();
  const newLockLevel = currentLockLevel === 'none' ? 'full' : 'none';
  
  store.selection.selectedGroups.forEach(groupId => {
    store.setGroupLockLevel(groupId, newLockLevel);
  });
};

const duplicateGroups = () => {
  const store = useEditorStore.getState();
  const selectedGroupIds = [...store.selection.selectedGroups];
  const newGroupIds: string[] = [];
  
  selectedGroupIds.forEach(groupId => {
    const group = store.getGroupById(groupId);
    if (group) {
      // Get all child IDs and types
      const childIds = group.children.map(child => child.id);
      const childTypes = group.children.map(child => child.type);
      
      // Create new group with offset position
      const newGroupId = store.createGroup(
        `${group.name} Copy`, 
        childIds, 
        childTypes as ('path' | 'text' | 'group')[]
      );
      
      // Move the duplicated group
      store.moveGroup(newGroupId, { x: 20, y: 20 });
      newGroupIds.push(newGroupId);
    }
  });
  
  // Select the new groups
  if (newGroupIds.length > 0) {
    store.clearSelection();
    newGroupIds.forEach((groupId, index) => {
      store.selectGroup(groupId, index > 0); // Add to selection for subsequent groups
    });
  }
};

const deleteGroups = () => {
  const store = useEditorStore.getState();
  
  store.selection.selectedGroups.forEach(groupId => {
    store.deleteGroup(groupId, true); // Delete with children
  });
  
  store.clearSelection();
};

const exportGroupSVG = () => {
  const store = useEditorStore.getState();
  
  store.selection.selectedGroups.forEach(groupId => {
    store.exportGroupSVG(groupId, true); // Auto download
  });
};

const bringGroupsToFront = () => {
  const reorderManager = new ReorderManager();
  const store = useEditorStore.getState();
  reorderManager.setEditorStore(store);
  
  reorderManager.bringToFront();
};

const sendGroupsToBack = () => {
  const reorderManager = new ReorderManager();
  const store = useEditorStore.getState();
  reorderManager.setEditorStore(store);
  
  reorderManager.sendToBack();
};

// Group arrange options
const groupArrangeOptions = [
  { 
    id: 'group-bring-front', 
    label: 'Bring to Front', 
    icon: ArrowUp,
    action: bringGroupsToFront 
  },
  { 
    id: 'group-send-back', 
    label: 'Send to Back', 
    icon: ArrowDown,
    action: sendGroupsToBack 
  }
];

// Group lock level options
const groupLockOptions = [
  { 
    id: 'group-lock-none', 
    label: 'Unlock', 
    action: () => {
      const store = useEditorStore.getState();
      store.selection.selectedGroups.forEach(groupId => {
        store.setGroupLockLevel(groupId, 'none');
      });
    }
  },
  { 
    id: 'group-lock-selection', 
    label: 'Lock Selection', 
    action: () => {
      const store = useEditorStore.getState();
      store.selection.selectedGroups.forEach(groupId => {
        store.setGroupLockLevel(groupId, 'selection');
      });
    }
  },
  { 
    id: 'group-lock-editing', 
    label: 'Lock Editing', 
    action: () => {
      const store = useEditorStore.getState();
      store.selection.selectedGroups.forEach(groupId => {
        store.setGroupLockLevel(groupId, 'editing');
      });
    }
  },
  { 
    id: 'group-lock-movement', 
    label: 'Lock Movement', 
    action: () => {
      const store = useEditorStore.getState();
      store.selection.selectedGroups.forEach(groupId => {
        store.setGroupLockLevel(groupId, 'movement-sync');
      });
    }
  },
  { 
    id: 'group-lock-full', 
    label: 'Lock All', 
    action: () => {
      const store = useEditorStore.getState();
      store.selection.selectedGroups.forEach(groupId => {
        store.setGroupLockLevel(groupId, 'full');
      });
    }
  }
];

// Enhanced Group actions
export const groupActions: ToolbarAction[] = [
  {
    id: 'ungroup',
    icon: Ungroup,
    label: 'Ungroup',
    type: 'button',
    action: ungroupSelected,
    priority: 100,
    tooltip: 'Ungroup elements'
  },
  {
    id: 'group-visibility',
    icon: getCommonGroupVisibility() ? Eye : EyeOff,
    label: getCommonGroupVisibility() ? 'Hide' : 'Show',
    type: 'button',
    action: toggleGroupVisibility,
    priority: 95,
    tooltip: 'Toggle group visibility'
  },
  {
    id: 'group-lock',
    icon: getCommonGroupLockLevel() === 'none' ? Unlock : Lock,
    label: getCommonGroupLockLevel() === 'none' ? 'Lock' : 'Unlock',
    type: 'dropdown',
    dropdown: {
      options: groupLockOptions
    },
    priority: 90,
    tooltip: 'Group lock settings'
  },
  {
    id: 'group-arrange',
    icon: Layers,
    label: 'Arrange',
    type: 'dropdown',
    dropdown: {
      options: groupArrangeOptions
    },
    priority: 80,
    tooltip: 'Arrange group order'
  },
  {
    id: 'group-export',
    icon: Compass,
    label: 'Export SVG',
    type: 'button',
    action: exportGroupSVG,
    priority: 70,
    tooltip: 'Export group as SVG file'
  },
  {
    id: 'duplicate-group',
    icon: Copy,
    label: 'Duplicate',
    type: 'button',
    action: duplicateGroups,
    priority: 20,
    tooltip: 'Duplicate group'
  },
  {
    id: 'delete-group',
    icon: Trash2,
    label: 'Delete',
    type: 'button',
    action: deleteGroups,
    priority: 10,
    destructive: true,
    tooltip: 'Delete group'
  }
];

// SubPath-specific utility functions
const getCommonSubPathFillColor = (): string => {
  const store = useEditorStore.getState();
  const selectedSubPaths = getSelectedSubPaths();
  if (selectedSubPaths.length === 0) return '#000000';
  
  const firstSubPath = selectedSubPaths[0];
  const firstFill = firstSubPath?.path?.style?.fill;
  const fillColor = typeof firstFill === 'string' ? firstFill : '#000000';
  const allSame = selectedSubPaths.every(sp => {
    const pathFill = sp?.path?.style?.fill;
    return typeof pathFill === 'string' && pathFill === fillColor;
  });
  
  return allSame ? fillColor : '#000000';
};

const getCommonSubPathStrokeColor = (): string => {
  const store = useEditorStore.getState();
  const selectedSubPaths = getSelectedSubPaths();
  if (selectedSubPaths.length === 0) return '#000000';
  
  const firstSubPath = selectedSubPaths[0];
  const firstStroke = firstSubPath?.path?.style?.stroke;
  const strokeColor = typeof firstStroke === 'string' ? firstStroke : '#000000';
  const allSame = selectedSubPaths.every(sp => {
    const pathStroke = sp?.path?.style?.stroke;
    return typeof pathStroke === 'string' && pathStroke === strokeColor;
  });
  
  return allSame ? strokeColor : '#000000';
};

// Apply fill color to selected subpaths
const applySubPathFillColor = (color: string) => {
  const store = useEditorStore.getState();
  const selectedSubPaths = getSelectedSubPaths();
  
  selectedSubPaths.forEach(({ path }) => {
    if (path && path.id) {
      store.updatePathStyle(path.id, { fill: color });
    }
  });
};

// Apply stroke color to selected subpaths
const applySubPathStrokeColor = (color: string) => {
  const store = useEditorStore.getState();
  const selectedSubPaths = getSelectedSubPaths();
  
  selectedSubPaths.forEach(({ path }) => {
    if (path && path.id) {
      store.updatePathStyle(path.id, { stroke: color });
    }
  });
};

// Duplicate selected subpaths
const duplicateSubPaths = () => {
  const store = useEditorStore.getState();
  
  // Use the existing duplicateSelection method which handles subpaths
  if (store.selection.selectedSubPaths.length > 0) {
    store.duplicateSelection();
  }
};

// Delete selected subpaths
const deleteSubPaths = () => {
  const store = useEditorStore.getState();
  
  // Delete each selected subpath using removeSubPath
  const subPathIds = [...store.selection.selectedSubPaths]; // Copy array to avoid mutation issues
  subPathIds.forEach(subPathId => {
    store.removeSubPath(subPathId);
  });
  
  // Selection is automatically cleared by removeSubPath
};

// Bring subpaths to front
const bringSubPathsToFront = () => {
  const reorderManager = new ReorderManager();
  const store = useEditorStore.getState();
  reorderManager.setEditorStore(store);
  
  reorderManager.bringToFront();
  };

// Send subpaths to back
const sendSubPathsToBack = () => {
  const reorderManager = new ReorderManager();
  const store = useEditorStore.getState();
  reorderManager.setEditorStore(store);
  
  reorderManager.sendToBack();
  };

// Get common stroke width for subpaths
const getCommonSubPathStrokeWidth = (): number => {
  const selectedSubPaths = getSelectedSubPaths();
  if (selectedSubPaths.length === 0) return 1;
  
  const firstStrokeWidth = selectedSubPaths[0]?.path?.style?.strokeWidth;
  const strokeWidth = typeof firstStrokeWidth === 'number' ? firstStrokeWidth : 1;
  const allSame = selectedSubPaths.every(({ path }) => {
    const pathStrokeWidth = path?.style?.strokeWidth;
    return typeof pathStrokeWidth === 'number' && pathStrokeWidth === strokeWidth;
  });
  
  return allSame ? strokeWidth : 1;
};

// Apply stroke width to subpaths
const applySubPathStrokeWidth = (width: string | number) => {
  const strokeWidth = typeof width === 'number' ? width : parseFloat(width);
  if (isNaN(strokeWidth) || strokeWidth < 0) return;
  
  const store = useEditorStore.getState();
  const selectedSubPaths = getSelectedSubPaths();
  
  selectedSubPaths.forEach(({ path }) => {
    if (path && path.id) {
      store.updatePathStyle(path.id, { strokeWidth });
    }
  });
};

// Get common stroke dash for subpaths
const getCommonSubPathStrokeDash = (): string => {
  const selectedSubPaths = getSelectedSubPaths();
  if (selectedSubPaths.length === 0) return 'none';
  
  const firstStrokeDash = selectedSubPaths[0]?.path?.style?.strokeDasharray;
  const strokeDash = typeof firstStrokeDash === 'string' ? firstStrokeDash : 'none';
  const allSame = selectedSubPaths.every(({ path }) => {
    const pathStrokeDash = path?.style?.strokeDasharray;
    return typeof pathStrokeDash === 'string' && pathStrokeDash === strokeDash;
  });
  
  return allSame ? strokeDash : 'none';
};

// Get common stroke linecap for subpaths
const getCommonSubPathStrokeLinecap = (): string => {
  const selectedSubPaths = getSelectedSubPaths();
  if (selectedSubPaths.length === 0) return 'butt';
  
  const firstStrokeLinecap = selectedSubPaths[0]?.path?.style?.strokeLinecap;
  const strokeLinecap = typeof firstStrokeLinecap === 'string' ? firstStrokeLinecap : 'butt';
  const allSame = selectedSubPaths.every(({ path }) => {
    const pathStrokeLinecap = path?.style?.strokeLinecap;
    return typeof pathStrokeLinecap === 'string' && pathStrokeLinecap === strokeLinecap;
  });
  
  return allSame ? strokeLinecap : 'butt';
};

// Get common stroke linejoin for subpaths
const getCommonSubPathStrokeLinejoin = (): string => {
  const selectedSubPaths = getSelectedSubPaths();
  if (selectedSubPaths.length === 0) return 'miter';
  
  const firstStrokeLinejoin = selectedSubPaths[0]?.path?.style?.strokeLinejoin;
  const strokeLinejoin = typeof firstStrokeLinejoin === 'string' ? firstStrokeLinejoin : 'miter';
  const allSame = selectedSubPaths.every(({ path }) => {
    const pathStrokeLinejoin = path?.style?.strokeLinejoin;
    return typeof pathStrokeLinejoin === 'string' && pathStrokeLinejoin === strokeLinejoin;
  });
  
  return allSame ? strokeLinejoin : 'miter';
};

// Apply stroke dash to subpaths
const applySubPathStrokeDash = (dashValue: string) => {
  const store = useEditorStore.getState();
  const selectedSubPaths = getSelectedSubPaths();
  
  selectedSubPaths.forEach(({ path }) => {
    if (path && path.id) {
      const strokeDasharray = dashValue === 'none' ? undefined : dashValue;
      store.updatePathStyle(path.id, { strokeDasharray });
    }
  });
};

// Apply stroke linecap to subpaths
const applySubPathStrokeLinecap = (linecap: string) => {
  const store = useEditorStore.getState();
  const selectedSubPaths = getSelectedSubPaths();
  
  selectedSubPaths.forEach(({ path }) => {
    if (path && path.id) {
      store.updatePathStyle(path.id, { strokeLinecap: linecap as 'butt' | 'round' | 'square' });
    }
  });
};

// Apply stroke linejoin to subpaths
const applySubPathStrokeLinejoin = (linejoin: string) => {
  const store = useEditorStore.getState();
  const selectedSubPaths = getSelectedSubPaths();
  
  selectedSubPaths.forEach(({ path }) => {
    if (path && path.id) {
      store.updatePathStyle(path.id, { strokeLinejoin: linejoin as 'miter' | 'round' | 'bevel' });
    }
  });
};

// Smooth subpaths - based on SubPathTransformControls implementation
const smoothSubPaths = () => {
  const store = useEditorStore.getState();
  const { selection, paths, grid, replaceSubPathCommands, pushToHistory } = store;
  const { selectedSubPaths } = selection;
  
  if (selectedSubPaths.length === 0) return;
  
  // Save current state to history before making changes
  pushToHistory();
  
  // Find target subpaths that can be smoothed
  const targetSubPaths: any[] = [];
  for (const subPathId of selectedSubPaths) {
    for (const path of paths) {
      const subPath = path.subPaths.find((sp: any) => sp.id === subPathId);
      if (subPath && subPath.commands.length >= 2) {
        targetSubPaths.push(subPath);
      }
    }
  }
  
  if (targetSubPaths.length === 0) return;
  
  // Apply smoothing to each subpath
  targetSubPaths.forEach((subPath) => {
    const subPathCommands = subPath.commands;
    
    if (subPathCommands.length < 2) return;
    
    // Apply smoothing to entire subpath
    const segmentToSmooth = [...subPathCommands];
    
    // Helper function to update this specific subpath
    const updateSubPath = (newCommands: any[]) => {
      // Ensure the subpath ALWAYS starts with M
      if (newCommands.length > 0 && newCommands[0].command !== 'M') {
        const firstCmd = newCommands[0];
        if ('x' in firstCmd && 'y' in firstCmd) {
          newCommands[0] = {
            ...firstCmd,
            command: 'M'
          };
        }
      }
      
      // Replace all commands in this subpath
      replaceSubPathCommands(subPath.id, newCommands);
    };
    
    // Apply smoothing using the generateSmoothPath function
    generateSmoothPath(
      segmentToSmooth,
      subPathCommands,
      updateSubPath,
      grid.snapToGrid ? (value: number) => Math.round(value / grid.size) * grid.size : (value: number) => value
    );
  });
};

// Simplify subpaths - based on SubPathTransformControls implementation
const simplifySubPaths = () => {
  const store = useEditorStore.getState();
  const { selection, paths, grid, replaceSubPathCommands, pushToHistory } = store;
  const { selectedSubPaths } = selection;
  
  if (selectedSubPaths.length === 0) return;
  
  // Default simplification parameters
  const simplifyTolerance = 0.1;
  const simplifyDistance = 10;
  
  // Save current state to history before making changes
  pushToHistory();
  
  // Find target subpaths that can be simplified
  const targetSubPaths: any[] = [];
  for (const subPathId of selectedSubPaths) {
    for (const path of paths) {
      const subPath = path.subPaths.find((sp: any) => sp.id === subPathId);
      if (subPath && subPath.commands.length >= 2) {
        targetSubPaths.push(subPath);
      }
    }
  }
  
  if (targetSubPaths.length === 0) return;
  
  // Apply simplification to each subpath
  for (const subPath of targetSubPaths) {
    if (subPath.commands.length < 2) continue;
    
    const commands = subPath.commands;
    
    // Use points-on-path algorithm for simplification (Ramer-Douglas-Peucker)
    const simplifiedCommands = simplifySegmentWithPointsOnPath(
      commands, 
      simplifyTolerance, 
      simplifyDistance, 
      grid.snapToGrid ? grid.size : 0
    );

    if (simplifiedCommands.length === 0) continue;

    // Ensure the subpath ALWAYS starts with M
    if (simplifiedCommands.length > 0 && simplifiedCommands[0].command !== 'M') {
      const firstCmd = simplifiedCommands[0];
      if ('x' in firstCmd && 'y' in firstCmd) {
        simplifiedCommands[0] = {
          ...firstCmd,
          command: 'M'
        };
      }
    }
    
    // Replace all commands in this subpath
    replaceSubPathCommands(subPath.id, simplifiedCommands);
  }
};

const applyBlurFilter = () => {
  const store = useEditorStore.getState();
  const selectedSubPaths = getSelectedSubPaths();
  
  selectedSubPaths.forEach(({ path }) => {
    if (path && path.id) {
      // Apply a simple blur filter
      store.updatePathStyle(path.id, { 
        filter: 'blur(2px)' 
      });
    }
  });
};

// Apply drop shadow to subpaths
const applyDropShadow = () => {
  const store = useEditorStore.getState();
  const selectedSubPaths = getSelectedSubPaths();
  
  selectedSubPaths.forEach(({ path }) => {
    if (path && path.id) {
      // Apply a drop shadow filter
      store.updatePathStyle(path.id, { 
        filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))' 
      });
    }
  });
};

// Add fade animation to subpaths
const addFadeAnimation = () => {
  const store = useEditorStore.getState();
  const selectedSubPaths = getSelectedSubPaths();
  
  selectedSubPaths.forEach(({ path }) => {
    if (path && path.id) {
      const opacityAnimation = {
        targetElementId: path.id,
        type: 'animate' as const,
        attributeName: 'opacity',
        from: '1',
        to: '0.2',
        dur: '2s',
        repeatCount: 'indefinite'
      };
      
      store.addAnimation(opacityAnimation);
    }
  });
  
  };

// Add rotation animation to subpaths
const addRotateAnimation = () => {
  const store = useEditorStore.getState();
  const selectedSubPaths = getSelectedSubPaths();
  
  selectedSubPaths.forEach(({ path }) => {
    if (path && path.id) {
      const rotationAnimation = {
        targetElementId: path.id,
        type: 'animateTransform' as const,
        attributeName: 'transform',
        transformType: 'rotate',
        from: '0 200 200',
        to: '360 200 200', 
        dur: '3s',
        repeatCount: 'indefinite'
      };
      
      store.addAnimation(rotationAnimation);
    }
  });
  
  };

// SubPath-specific options (defined after functions to avoid hoisting issues)
const subPathArrangeOptions = [
  { 
    id: 'subpath-bring-front', 
    label: 'Bring to Front', 
    icon: ArrowUp,
    action: bringSubPathsToFront 
  },
  { 
    id: 'subpath-send-back', 
    label: 'Send to Back', 
    icon: ArrowDown,
    action: sendSubPathsToBack 
  }
];

const subPathFilterOptions = [
  { 
    id: 'subpath-blur', 
    label: 'Blur', 
    action: applyBlurFilter 
  },
  { 
    id: 'subpath-shadow', 
    label: 'Drop Shadow', 
    action: applyDropShadow 
  }
];

const subPathAnimationOptions = [
  { 
    id: 'subpath-fade', 
    label: 'Fade In/Out', 
    action: addFadeAnimation 
  },
  { 
    id: 'subpath-rotate', 
    label: 'Rotate', 
    action: addRotateAnimation 
  }
];

// SubPath-specific actions (complete set based on singleElementActions)
export const subPathActions: ToolbarAction[] = [
  {
    id: 'subpath-fill-color',
    icon: Palette,
    label: 'Fill Color',
    type: 'color',
    color: {
      currentColor: getCommonSubPathFillColor(),
      onChange: applySubPathFillColor
    },
    priority: 100,
    tooltip: 'Change subpath fill color'
  },
  {
    id: 'subpath-stroke-color',
    icon: Brush,
    label: 'Stroke Color',
    type: 'color',
    color: {
      currentColor: getCommonSubPathStrokeColor(),
      onChange: applySubPathStrokeColor
    },
    priority: 95,
    tooltip: 'Change subpath stroke color'
  },
  {
    id: 'subpath-stroke-options',
    icon: Brush,
    label: 'Stroke Options',
    type: 'input',
    input: {
      currentValue: getCommonSubPathStrokeWidth(),
      onChange: applySubPathStrokeWidth,
      type: 'number',
      placeholder: '1'
    },
    strokeOptions: {
      getCurrentStrokeWidth: getCommonSubPathStrokeWidth,
      getCurrentStrokeDash: getCommonSubPathStrokeDash,
      getCurrentStrokeLinecap: getCommonSubPathStrokeLinecap,
      getCurrentStrokeLinejoin: getCommonSubPathStrokeLinejoin,
      onStrokeWidthChange: applySubPathStrokeWidth,
      onStrokeDashChange: applySubPathStrokeDash,
      onStrokeLinecapChange: applySubPathStrokeLinecap,
      onStrokeLinejoinChange: applySubPathStrokeLinejoin
    },
    priority: 90,
    tooltip: 'Configure stroke width, dash pattern, line cap, and line join'
  },
  {
    id: 'subpath-smooth',
    icon: Waves,
    label: 'Smooth',
    type: 'button',
    action: smoothSubPaths,
    priority: 85,
    tooltip: 'Apply smoothing to subpath curves'
  },
  {
    id: 'subpath-simplify',
    icon: Minimize2,
    label: 'Simplify',
    type: 'button',
    action: simplifySubPaths,
    priority: 80,
    tooltip: 'Simplify subpath by reducing points'
  },
  {
    id: 'subpath-arrange',
    icon: Layers,
    label: 'Arrange',
    type: 'dropdown',
    dropdown: {
      options: subPathArrangeOptions
    },
    priority: 70,
    tooltip: 'Arrange layer order'
  },
  {
    id: 'subpath-filters',
    icon: Filter,
    label: 'Filters',
    type: 'dropdown',
    dropdown: {
      options: subPathFilterOptions
    },
    priority: 60,
    tooltip: 'Apply filters'
  },
  {
    id: 'subpath-animations',
    icon: Play,
    label: 'Animations',
    type: 'dropdown',
    dropdown: {
      options: subPathAnimationOptions
    },
    priority: 50,
    tooltip: 'Add animations'
  },
  {
    id: 'subpath-duplicate',
    icon: Copy,
    label: 'Duplicate',
    type: 'button',
    action: duplicateSubPaths,
    priority: 20,
    tooltip: 'Duplicate subpath'
  },
  {
    id: 'subpath-delete',
    icon: Trash2,
    label: 'Delete',
    type: 'button',
    action: deleteSubPaths,
    priority: 10,
    destructive: true,
    tooltip: 'Delete subpath'
  }
];

// Floating action definitions
export const subPathFloatingActionDefinition: FloatingActionDefinition = {
  elementTypes: ['subpath'],
  selectionTypes: ['single'],
  actions: subPathActions,
  priority: 95  // Higher priority than paths
};

export const pathFloatingActionDefinition: FloatingActionDefinition = {
  elementTypes: ['path'],
  selectionTypes: ['single'], 
  actions: singleElementActions,
  priority: 85  // Lower priority than subpaths
};

// Mixed selection actions (text + subpath or other combinations)
// Only show selection-relevant actions and universal styling options
export const mixedSelectionActions: ToolbarAction[] = [
  {
    id: 'mixed-fill-color',
    icon: Palette,
    label: 'Fill Color',
    type: 'color',
    color: {
      currentColor: getCommonFillColor(),
      onChange: applyFillColor
    },
    priority: 100,
    tooltip: 'Change fill color'
  },
  {
    id: 'mixed-stroke-color',
    icon: Brush,
    label: 'Stroke Color',
    type: 'color',
    color: {
      currentColor: getCommonStrokeColor(),
      onChange: applyStrokeColor
    },
    priority: 90,
    tooltip: 'Change stroke color'
  },
  {
    id: 'mixed-stroke-width',
    icon: Brush,
    label: 'Stroke Width',
    type: 'input',
    input: {
      currentValue: 1, // Default value for mixed selections
      onChange: (value: string | number) => {
        const width = typeof value === 'number' ? value : parseFloat(value);
        if (!isNaN(width) && width >= 0) {
          const store = useEditorStore.getState();
          
          // Apply to all selected elements
          store.selection.selectedPaths.forEach(pathId => {
            store.updatePathStyle(pathId, { strokeWidth: width });
          });
          
          store.selection.selectedTexts.forEach(textId => {
            store.updateTextStyle(textId, { strokeWidth: width });
          });
        }
      },
      type: 'number',
      placeholder: '1'
    },
    priority: 85,
    tooltip: 'Change stroke width'
  },
  {
    id: 'mixed-group',
    icon: Group,
    label: 'Group',
    type: 'button',
    action: groupSelected,
    priority: 70,
    tooltip: 'Group selected elements'
  },
  {
    id: 'mixed-duplicate',
    icon: Copy,
    label: 'Duplicate All',
    type: 'button',
    action: duplicateSelected,
    priority: 20,
    tooltip: 'Duplicate all selected elements'
  },
  {
    id: 'mixed-delete',
    icon: Trash2,
    label: 'Delete All',
    type: 'button',
    action: deleteSelected,
    priority: 10,
    destructive: true,
    tooltip: 'Delete all selected elements'
  }
];

export const mixedSelectionFloatingActionDefinition: FloatingActionDefinition = {
  elementTypes: ['mixed'],
  selectionTypes: ['multiple'],
  actions: mixedSelectionActions,
  priority: 90  // High priority for mixed selections
};

export const groupFloatingActionDefinition: FloatingActionDefinition = {
  elementTypes: ['group'],
  selectionTypes: ['single', 'multiple'],
  actions: groupActions,
  priority: 80
};