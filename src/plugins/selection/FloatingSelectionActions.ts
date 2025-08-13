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
  Compass
} from 'lucide-react';
import { FloatingActionDefinition, ToolbarAction } from '../../types/floatingToolbar';
import { useEditorStore } from '../../store/editorStore';
import { ReorderManager } from '../reorder/ReorderManager';

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
    console.log('Group selection - needs store implementation');
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
      console.log('Duplicate path - needs proper path creation implementation');
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
    console.log('Delete path - needs store implementation');
  });
  
  // Delete texts
  store.selection.selectedTexts.forEach(textId => {
    store.deleteText(textId);
  });
  
  // Delete groups
  store.selection.selectedGroups.forEach(groupId => {
    // TODO: Implement deleteGroup method in store
    console.log('Delete group - needs store implementation');
  });
  
  // Clear selection
  store.clearSelection();
};

// Arrange functions
const bringToFront = () => {
  const store = useEditorStore.getState();
  
  store.selection.selectedPaths.forEach(pathId => {
    // TODO: Implement bring to front functionality
    console.log('Bring to front - needs store implementation');
  });
};

const sendToBack = () => {
  const store = useEditorStore.getState();
  
  store.selection.selectedPaths.forEach(pathId => {
    // TODO: Implement send to back functionality
    console.log('Send to back - needs store implementation');
  });
};

// Alignment options
const alignmentOptions = [
  { 
    id: 'align-left', 
    label: 'Align Left', 
    icon: AlignLeft,
    action: () => console.log('Align left - needs implementation') 
  },
  { 
    id: 'align-center', 
    label: 'Align Center', 
    icon: AlignCenter,
    action: () => console.log('Align center - needs implementation') 
  },
  { 
    id: 'align-right', 
    label: 'Align Right', 
    icon: AlignRight,
    action: () => console.log('Align right - needs implementation') 
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
    action: () => console.log('Apply blur - needs implementation') 
  },
  { 
    id: 'shadow', 
    label: 'Drop Shadow', 
    action: () => console.log('Apply shadow - needs implementation') 
  }
];

// Animation options for regular elements
const animationOptions = [
  { 
    id: 'fade', 
    label: 'Fade In/Out', 
    action: () => console.log('Add fade animation - needs implementation') 
  },
  { 
    id: 'move', 
    label: 'Move', 
    action: () => console.log('Add move animation - needs implementation') 
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

// Group actions
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
    id: 'duplicate-group',
    icon: Copy,
    label: 'Duplicate Group',
    type: 'button',
    action: duplicateSelected,
    priority: 20,
    tooltip: 'Duplicate group'
  },
  {
    id: 'delete-group',
    icon: Trash2,
    label: 'Delete Group',
    type: 'button',
    action: deleteSelected,
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
  console.log('🔝 Brought subpaths to front');
};

// Send subpaths to back
const sendSubPathsToBack = () => {
  const reorderManager = new ReorderManager();
  const store = useEditorStore.getState();
  reorderManager.setEditorStore(store);
  
  reorderManager.sendToBack();
  console.log('🔽 Sent subpaths to back');
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
  
  console.log('✨ Added fade animation to selected subpaths');
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
  
  console.log('🔄 Added rotation animation to selected subpaths');
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
    priority: 90,
    tooltip: 'Change subpath stroke color'
  },
  {
    id: 'subpath-stroke-width',
    icon: Brush,
    label: 'Stroke Width',
    type: 'input',
    input: {
      currentValue: getCommonSubPathStrokeWidth(),
      onChange: applySubPathStrokeWidth,
      type: 'number',
      placeholder: '1'
    },
    priority: 85,
    tooltip: 'Change stroke width'
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