import { Palette, Brush, LineSquiggle, Minimize2, Maximize2, Filter, Play, Copy, Trash2, Lock, RotateCcw, Group, PaintBucket } from 'lucide-react';
import { ToolbarAction } from '../../../types/floatingToolbar';
import { useEditorStore } from '../../../store/editorStore';
import { createSubPathArrangeActions } from '../../../utils/floating-arrange-actions';
import { createReorderActions, createElementReorderFunctions } from '../../../utils/floating-reorder-actions';
import { createDropShadowFilter, createBlurFilter, createGrayscaleFilter, createSepiaFilter, createEmbossFilter, createGlowFilter, createNeonGlowFilter, formatSVGReference, matchesFilterSignature } from '../../../utils/svg-elements-utils';
import { subPathTransformManager } from '../../subpath-transform/SubPathTransformManager';

// Get common fill color for selected subpaths
const getCommonSubPathFillColor = (): string => {
  const store = useEditorStore.getState();
  const selectedSubPaths = store.selection.selectedSubPaths;
  
  if (selectedSubPaths.length === 0) return '#000000';
  
  // Get the parent path of the first subpath
  const firstSubPath = selectedSubPaths[0];
  const parentPath = store.paths.find(path => 
    path.subPaths.some(sp => sp.id === firstSubPath)
  );
  
  const fill = parentPath?.style?.fill;
  if (typeof fill === 'string') {
    return fill;
  }
  return '#000000';
};

// Apply fill color to selected subpaths
const applySubPathFillColor = (color: string) => {
  const store = useEditorStore.getState();
  const selectedSubPaths = store.selection.selectedSubPaths;
  
  // Save to history before changing colors
  store.pushToHistory();
  
  selectedSubPaths.forEach(subPathId => {
    const parentPath = store.paths.find(path => 
      path.subPaths.some(sp => sp.id === subPathId)
    );
    
    if (parentPath) {
      store.updatePathStyle(parentPath.id, { fill: color });
    }
  });
};

// Get common stroke color for selected subpaths
const getCommonSubPathStrokeColor = (): string => {
  const store = useEditorStore.getState();
  const selectedSubPaths = store.selection.selectedSubPaths;
  
  if (selectedSubPaths.length === 0) return '#000000';
  
  const firstSubPath = selectedSubPaths[0];
  const parentPath = store.paths.find(path => 
    path.subPaths.some(sp => sp.id === firstSubPath)
  );
  
  const stroke = parentPath?.style?.stroke;
  if (typeof stroke === 'string') {
    return stroke;
  }
  return '#000000';
};

// Apply stroke color to selected subpaths
const applySubPathStrokeColor = (color: string) => {
  const store = useEditorStore.getState();
  const selectedSubPaths = store.selection.selectedSubPaths;
  
  // Save to history before changing colors
  store.pushToHistory();
  
  selectedSubPaths.forEach(subPathId => {
    const parentPath = store.paths.find(path => 
      path.subPaths.some(sp => sp.id === subPathId)
    );
    
    if (parentPath) {
      store.updatePathStyle(parentPath.id, { stroke: color });
    }
  });
};

// Get common stroke width for selected subpaths
const getCommonSubPathStrokeWidth = () => {
  const store = useEditorStore.getState();
  const selectedSubPaths = store.selection.selectedSubPaths;
  
  if (selectedSubPaths.length === 0) return 1;
  
  const firstSubPath = selectedSubPaths[0];
  const parentPath = store.paths.find(path => 
    path.subPaths.some(sp => sp.id === firstSubPath)
  );
  
  return parentPath?.style?.strokeWidth || 1;
};

// Apply stroke width to selected subpaths
const applySubPathStrokeWidth = (width: string | number) => {
  const store = useEditorStore.getState();
  const selectedSubPaths = store.selection.selectedSubPaths;
  const strokeWidth = typeof width === 'number' ? width : parseFloat(width);
  
  if (!isNaN(strokeWidth) && strokeWidth >= 0) {
    // Save to history before changing stroke width
    store.pushToHistory();
    
    selectedSubPaths.forEach(subPathId => {
      const parentPath = store.paths.find(path => 
        path.subPaths.some(sp => sp.id === subPathId)
      );
      
      if (parentPath) {
        store.updatePathStyle(parentPath.id, { strokeWidth });
      }
    });
  }
};

// Simplified stroke dash functions
const getCommonSubPathStrokeDash = () => {
  const store = useEditorStore.getState();
  const selectedSubPaths = store.selection.selectedSubPaths;
  
  if (selectedSubPaths.length === 0) return 'none';
  
  const firstSubPath = selectedSubPaths[0];
  const parentPath = store.paths.find(path => 
    path.subPaths.some(sp => sp.id === firstSubPath)
  );
  
  const strokeDash = parentPath?.style?.strokeDasharray;
  return typeof strokeDash === 'string' ? strokeDash : 'none';
};

const getCommonSubPathStrokeLinecap = () => {
  const store = useEditorStore.getState();
  const selectedSubPaths = store.selection.selectedSubPaths;
  
  if (selectedSubPaths.length === 0) return 'butt';
  
  const firstSubPath = selectedSubPaths[0];
  const parentPath = store.paths.find(path => 
    path.subPaths.some(sp => sp.id === firstSubPath)
  );
  
  const strokeLinecap = parentPath?.style?.strokeLinecap;
  return typeof strokeLinecap === 'string' ? strokeLinecap : 'butt';
};

const getCommonSubPathStrokeLinejoin = () => {
  const store = useEditorStore.getState();
  const selectedSubPaths = store.selection.selectedSubPaths;
  
  if (selectedSubPaths.length === 0) return 'miter';
  
  const firstSubPath = selectedSubPaths[0];
  const parentPath = store.paths.find(path => 
    path.subPaths.some(sp => sp.id === firstSubPath)
  );
  
  const strokeLinejoin = parentPath?.style?.strokeLinejoin;
  return typeof strokeLinejoin === 'string' ? strokeLinejoin : 'miter';
};

const applySubPathStrokeDash = (dash: string) => {
  const store = useEditorStore.getState();
  const selectedSubPaths = store.selection.selectedSubPaths;
  
  // Save to history before changing stroke dash
  store.pushToHistory();
  
  selectedSubPaths.forEach(subPathId => {
    const parentPath = store.paths.find(path => 
      path.subPaths.some(sp => sp.id === subPathId)
    );
    
    if (parentPath) {
      store.updatePathStyle(parentPath.id, { strokeDasharray: dash });
    }
  });
};

const applySubPathStrokeLinecap = (linecap: string) => {
  const store = useEditorStore.getState();
  const selectedSubPaths = store.selection.selectedSubPaths;
  
  // Save to history before changing stroke linecap
  store.pushToHistory();
  
  selectedSubPaths.forEach(subPathId => {
    const parentPath = store.paths.find(path => 
      path.subPaths.some(sp => sp.id === subPathId)
    );
    
    if (parentPath) {
      store.updatePathStyle(parentPath.id, { strokeLinecap: linecap as any });
    }
  });
};

const applySubPathStrokeLinejoin = (linejoin: string) => {
  const store = useEditorStore.getState();
  const selectedSubPaths = store.selection.selectedSubPaths;
  
  // Save to history before changing stroke linejoin
  store.pushToHistory();
  
  selectedSubPaths.forEach(subPathId => {
    const parentPath = store.paths.find(path => 
      path.subPaths.some(sp => sp.id === subPathId)
    );
    
    if (parentPath) {
      store.updatePathStyle(parentPath.id, { strokeLinejoin: linejoin as any });
    }
  });
};

// FillRule functions for subpaths
const getCommonSubPathFillRule = () => {
  const store = useEditorStore.getState();
  const selectedSubPaths = store.selection.selectedSubPaths;
  
  if (selectedSubPaths.length === 0) return 'nonzero';
  
  const firstSubPath = selectedSubPaths[0];
  const parentPath = store.paths.find(path => 
    path.subPaths.some(sp => sp.id === firstSubPath)
  );
  
  const fillRule = parentPath?.style?.fillRule;
  return typeof fillRule === 'string' ? fillRule : 'nonzero';
};

const applySubPathFillRule = (fillRule: string) => {
  const store = useEditorStore.getState();
  const selectedSubPaths = store.selection.selectedSubPaths;
  
  // Save to history before changing fill rule
  store.pushToHistory();
  
  selectedSubPaths.forEach(subPathId => {
    const parentPath = store.paths.find(path => 
      path.subPaths.some(sp => sp.id === subPathId)
    );
    
    if (parentPath) {
      store.updatePathStyle(parentPath.id, { fillRule: fillRule as 'nonzero' | 'evenodd' });
    }
  });
};

// Smooth subpaths - using the new animation system
const smoothSubPaths = () => {
  const store = useEditorStore.getState();
  const { selection, replaceSubPathCommands } = store;
  const { selectedSubPaths } = selection;
  
  if (selectedSubPaths.length === 0) return;
  
  // Find target subpaths that can be smoothed
  const targetSubPaths: any[] = [];
  for (const subPathId of selectedSubPaths) {
    for (const path of store.paths) {
      const subPath = path.subPaths.find((sp: any) => sp.id === subPathId);
      if (subPath && subPath.commands.length >= 2) {
        targetSubPaths.push(subPath);
      }
    }
  }
  
  if (targetSubPaths.length === 0) return;
  
  // Save to history before making changes
  store.pushToHistory();
  
  // Apply smoothing with animation to each subpath
  targetSubPaths.forEach((subPath) => {
    const subPathCommands = subPath.commands;
    
    if (subPathCommands.length < 2) return;
    
    // Use the new animation system for smooth transformation
    subPathTransformManager.smoothWithAnimation(
      subPathCommands,
      (smoothedCommands) => {
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
        
        // Apply the smoothed commands
        updateSubPath(smoothedCommands);
      }
    );
  });
};

// Get simplification parameters from transform plugin settings
const getSimplificationParams = () => {
  try {
    const tolerance = localStorage.getItem('pathSimplification.tolerance');
    const distance = localStorage.getItem('pathSimplification.distance');
    
    return {
      tolerance: tolerance ? parseFloat(tolerance) : 0.1,
      distance: distance ? parseInt(distance) : 10
    };
  } catch {
    return {
      tolerance: 0.1,
      distance: 10
    };
  }
};

// Simplify subpaths - using the new animation system
const simplifySubPaths = () => {
  const store = useEditorStore.getState();
  const { selection, replaceSubPathCommands } = store;
  const { selectedSubPaths } = selection;
  
  if (selectedSubPaths.length === 0) return;
  
  // Get current simplification parameters from transform plugin UI
  const { tolerance: simplifyTolerance, distance: simplifyDistance } = getSimplificationParams();
  
  // Find target subpaths that can be simplified
  const targetSubPaths: any[] = [];
  for (const subPathId of selectedSubPaths) {
    for (const path of store.paths) {
      const subPath = path.subPaths.find((sp: any) => sp.id === subPathId);
      if (subPath && subPath.commands.length >= 2) {
        targetSubPaths.push(subPath);
      }
    }
  }
  
  if (targetSubPaths.length === 0) return;
  
  // Save to history before making changes
  store.pushToHistory();
  
  // Apply simplification with animation to each subpath
  targetSubPaths.forEach((subPath) => {
    const subPathCommands = subPath.commands;
    
    if (subPathCommands.length < 2) return;
    
    // Use the new animation system for simplify transformation
    subPathTransformManager.simplifyWithAnimation(
      subPathCommands,
      simplifyTolerance,
      simplifyDistance,
      (simplifiedCommands) => {
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
          replaceSubPathCommands(subPath.id, newCommands.map(cmd => ({
            command: cmd.command,
            x: cmd.x,
            y: cmd.y,
            x1: cmd.x1,
            y1: cmd.y1,
            x2: cmd.x2,
            y2: cmd.y2
          })));
        };
        
        // Apply the simplified commands
        updateSubPath(simplifiedCommands);
      }
    );
  });
};

const duplicateSubPaths = () => {
  const store = useEditorStore.getState();
  
  // Save to history before duplicating
  store.pushToHistory();
  
  store.duplicateSelection();
};

const deleteSubPaths = () => {
  const store = useEditorStore.getState();
  
  // Save to history before deleting
  store.pushToHistory();
  
  store.selection.selectedSubPaths.forEach(subPathId => {
    store.removeSubPath(subPathId);
  });
  
  store.clearSelection();
};

const toggleSubPathLock = () => {
  const store = useEditorStore.getState();
  const selectedSubPaths = store.selection.selectedSubPaths;
  
  if (selectedSubPaths.length === 0) return;
  
  store.pushToHistory();
  
  // Determine if we should lock or unlock based on the first selected subpath
  const firstSubPath = selectedSubPaths[0];
  const parentPath = store.paths.find(path => 
    path.subPaths.some(sp => sp.id === firstSubPath)
  );
  const subPath = parentPath?.subPaths.find(sp => sp.id === firstSubPath);
  const shouldLock = !subPath?.locked;
  
  // Apply lock/unlock to all selected subpaths
  selectedSubPaths.forEach(subPathId => {
    // Find parent path and update the subpath
    const pathIndex = store.paths.findIndex(path => 
      path.subPaths.some(sp => sp.id === subPathId)
    );
    
    if (pathIndex !== -1) {
      const path = store.paths[pathIndex];
      const updatedSubPaths = path.subPaths.map(sp => 
        sp.id === subPathId ? { ...sp, locked: shouldLock } : sp
      );
      
      useEditorStore.setState(state => ({
        paths: state.paths.map((p, index) => 
          index === pathIndex ? { ...p, subPaths: updatedSubPaths } : p
        )
      }));
    }
  });
  
  // If locking, clear selection as locked subpaths shouldn't be selectable
  if (shouldLock) {
    store.clearSelection();
  }
};

// Check if selected subpaths are locked
const areSubPathsLocked = (): boolean => {
  const store = useEditorStore.getState();
  const selectedSubPaths = store.selection.selectedSubPaths;
  
  if (selectedSubPaths.length === 0) return false;
  
  // Check if any of the selected subpaths are locked
  return selectedSubPaths.some(subPathId => {
    const subPath = store.paths
      .flatMap(path => path.subPaths)
      .find(sp => sp.id === subPathId);
    return subPath?.locked === true;
  });
};

// Clear style for selected subpaths - reset to default values
const clearSubPathStyle = () => {
  const store = useEditorStore.getState();
  const selectedSubPaths = store.selection.selectedSubPaths;
  
  if (selectedSubPaths.length === 0) return;
  
  store.pushToHistory();
  
  // Define default subpath style values
  const defaultStyle = {
    fill: '#000000',
    stroke: undefined,
    strokeWidth: undefined,
    strokeDasharray: undefined,
    strokeLinecap: undefined,
    strokeLinejoin: undefined,
    fillRule: undefined,
    filter: undefined,
    opacity: undefined,
    fillOpacity: undefined,
    strokeOpacity: undefined
  };
  
  // Find the unique paths that contain the selected subpaths and update their styles
  const pathsToUpdate = new Set<string>();
  
  selectedSubPaths.forEach(subPathId => {
    const path = store.paths.find(p => 
      p.subPaths.some(sp => sp.id === subPathId)
    );
    if (path) {
      pathsToUpdate.add(path.id);
    }
  });
  
  // Apply default style to all paths containing selected subpaths
  pathsToUpdate.forEach(pathId => {
    store.updatePathStyle(pathId, defaultStyle);
  });
};

// Get selected subpaths utility function
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

// Generic function to apply filters to subpaths
const applyFilterToSubPaths = (filterCreatorFn: () => any) => {
  const store = useEditorStore.getState();
  const selectedSubPaths = getSelectedSubPaths();
  
  if (selectedSubPaths.length === 0) return;
  
  // Save to history before applying filters
  store.pushToHistory();
  
  // Create the filter
  const filterData = filterCreatorFn();
  store.addFilter(filterData);
  
  // Apply using a timeout to ensure the store is updated
  setTimeout(() => {
    // Access filters from the store directly to get the most current state
    const storeState = useEditorStore.getState();
    const currentFilters = storeState.filters;
    const newFilter = currentFilters[currentFilters.length - 1]; // Get the last added filter
    
    if (newFilter && newFilter.id) {
      const filterRef = formatSVGReference(newFilter.id);
      
      // Apply filter to each selected subpath's parent path
      selectedSubPaths.forEach(({ path }) => {
        if (path && path.id) {
          storeState.updatePathStyle(path.id, { 
            filter: filterRef
          });
        }
      });
    }
  }, 0);
};

// Specific filter functions
const applyBlurFilter = () => applyFilterToSubPaths(createBlurFilter);
const applyDropShadow = () => applyFilterToSubPaths(createDropShadowFilter);
const applyGlowFilter = () => applyFilterToSubPaths(createGlowFilter);
const applyGrayscaleFilter = () => applyFilterToSubPaths(createGrayscaleFilter);
const applySepiaFilter = () => applyFilterToSubPaths(createSepiaFilter);
const applyEmbossFilter = () => applyFilterToSubPaths(createEmbossFilter);
const applyNeonGlowFilter = () => applyFilterToSubPaths(createNeonGlowFilter);

// Add fade animation to subpaths
const addFadeAnimation = () => {
  const store = useEditorStore.getState();
  const selectedSubPaths = getSelectedSubPaths();
  
  // Save to history before adding animations
  store.pushToHistory();
  
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
  
  // Save to history before adding animations
  store.pushToHistory();
  
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

// Check if a specific filter is active on selected subpaths
const isSubPathFilterActive = (filterType: string): boolean => {
  const store = useEditorStore.getState();
  const selectedSubPaths = getSelectedSubPaths();
  
  if (selectedSubPaths.length === 0) return false;
  
  // Check if any selected subpath's parent path has a filter applied
  return selectedSubPaths.some(({ path }) => {
    if (!path) return false;
    
    const filterRef = path.style?.filter;
    if (!filterRef || typeof filterRef !== 'string') return false;
    
    // Extract filter ID from url(#id) format
    const match = filterRef.match(/url\(#([^)]+)\)/);
    if (!match) return false;
    
    const filterId = match[1];
    const filter = store.filters.find(f => f.id === filterId);
    
    if (!filter) return false;
    
    // Match filter type based on complete primitive sequences
    return matchesFilterSignature(filter.primitives, filterType);
  });
};

// Check if a specific animation is active on selected subpaths
const isSubPathAnimationActive = (animationType: string): boolean => {
  const store = useEditorStore.getState();
  const selectedSubPaths = getSelectedSubPaths();
  
  if (selectedSubPaths.length === 0) return false;
  
  // Check if any selected subpath's parent path has an animation applied
  return selectedSubPaths.some(({ path }) => {
    if (!path) return false;
    
    return store.animations.some(animation => {
      if (animation.targetElementId !== path.id) return false;
      
      switch (animationType) {
        case 'fade':
          return animation.type === 'animate' && (animation as any).attributeName === 'opacity';
        case 'rotate':
          return animation.type === 'animateTransform' && 
                 (animation as any).transformType === 'rotate';
        default:
          return false;
      }
    });
  });
};

// Remove specific filter from selected subpaths
const removeSubPathFilter = (filterType: string) => {
  const store = useEditorStore.getState();
  const selectedSubPaths = getSelectedSubPaths();
  
  if (selectedSubPaths.length === 0) return;
  
  store.pushToHistory();
  
  selectedSubPaths.forEach(({ path }) => {
    if (!path) return;
    
    // Update the path style to remove the filter
    store.updatePathStyle(path.id, { filter: undefined });
  });
};

// Remove specific animation from selected subpaths
const removeSubPathAnimation = (animationType: string) => {
  const store = useEditorStore.getState();
  const selectedSubPaths = getSelectedSubPaths();
  
  if (selectedSubPaths.length === 0) return;
  
  store.pushToHistory();
  
  selectedSubPaths.forEach(({ path }) => {
    if (!path) return;
    
    // Find animations that match the type and target this path
    const animationsToRemove = store.animations.filter(animation => {
      if (animation.targetElementId !== path.id) return false;
      
      switch (animationType) {
        case 'fade':
          return animation.type === 'animate' && (animation as any).attributeName === 'opacity';
        case 'rotate':
          return animation.type === 'animateTransform' && 
                 (animation as any).transformType === 'rotate';
        default:
          return false;
      }
    });
    
    // Remove each matching animation
    animationsToRemove.forEach(animation => {
      store.removeAnimation(animation.id);
    });
  });
};

// Toggle functions that either apply or remove filters/animations
const toggleSubPathFilter = (filterType: string, applyFunction: () => void) => {
  if (isSubPathFilterActive(filterType)) {
    removeSubPathFilter(filterType);
  } else {
    applyFunction();
  }
};

const toggleSubPathAnimation = (animationType: string, applyFunction: () => void) => {
  if (isSubPathAnimationActive(animationType)) {
    removeSubPathAnimation(animationType);
  } else {
    applyFunction();
  }
};

// Function to open filter panel
const openFilterPanel = async () => {
  // Use pluginManager to open filter panel (handles both mobile and desktop)
  const { pluginManager } = await import('../../../core/PluginSystem');
  pluginManager.openFilterPanel();
};

// SubPath filter options
const subPathFilterOptions = [
  { 
    id: 'subpath-blur', 
    label: 'Blur', 
    action: () => toggleSubPathFilter('blur', applyBlurFilter),
    active: () => isSubPathFilterActive('blur')
  },
  { 
    id: 'subpath-shadow', 
    label: 'Drop Shadow', 
    action: () => toggleSubPathFilter('shadow', applyDropShadow),
    active: () => isSubPathFilterActive('shadow')
  },
  { 
    id: 'subpath-glow', 
    label: 'Glow', 
    action: () => toggleSubPathFilter('glow', applyGlowFilter),
    active: () => isSubPathFilterActive('glow')
  },
  { 
    id: 'subpath-grayscale', 
    label: 'Grayscale', 
    action: () => toggleSubPathFilter('grayscale', applyGrayscaleFilter),
    active: () => isSubPathFilterActive('grayscale')
  },
  { 
    id: 'subpath-sepia', 
    label: 'Sepia', 
    action: () => toggleSubPathFilter('sepia', applySepiaFilter),
    active: () => isSubPathFilterActive('sepia')
  },
  { 
    id: 'subpath-emboss', 
    label: 'Emboss', 
    action: () => toggleSubPathFilter('emboss', applyEmbossFilter),
    active: () => isSubPathFilterActive('emboss')
  },
  { 
    id: 'subpath-neon-glow', 
    label: 'Neon Glow', 
    action: () => toggleSubPathFilter('neon-glow', applyNeonGlowFilter),
    active: () => isSubPathFilterActive('neon-glow')
  },
  { id: 'subpath-more-filters', label: 'More ...', action: openFilterPanel }
];

// Function to open animation panel
const openAnimationPanel = async () => {
  // Use pluginManager to open animation panel (handles both mobile and desktop)
  const { pluginManager } = await import('../../../core/PluginSystem');
  pluginManager.openAnimationPanel();
};

// SubPath animation options
const subPathAnimationOptions = [
  { 
    id: 'subpath-fade', 
    label: 'Fade In/Out', 
    action: () => toggleSubPathAnimation('fade', addFadeAnimation),
    active: () => isSubPathAnimationActive('fade')
  },
  { 
    id: 'subpath-rotate', 
    label: 'Rotate', 
    action: () => toggleSubPathAnimation('rotate', addRotateAnimation),
    active: () => isSubPathAnimationActive('rotate')
  },
  { id: 'subpath-more-animations', label: 'More ...', action: openAnimationPanel }
];

// Group selected subpaths
const groupSelectedSubPaths = () => {
  const store = useEditorStore.getState();
  const hasSelection = store.selection.selectedSubPaths.length >= 2;
  
  if (hasSelection) {
    // Push to history before making changes
    store.pushToHistory();
    
    // Use the built-in createGroupFromSelection method
    const groupId = store.createGroupFromSelection();
    
    if (groupId) {
      // console.log(`✅ Created group with ID: ${groupId}`);
    } else {
      console.log('❌ Failed to create group');
    }
  }
};

// Format copy functions
const startFormatCopy = () => {
  const store = useEditorStore.getState();
  
  // Check if format copy is already active - if so, cancel it
  if (store.isFormatCopyActive && store.isFormatCopyActive()) {
    store.cancelFormatCopy();
    return;
  }
  
  const selectedSubPaths = store.selection.selectedSubPaths;
  
  if (selectedSubPaths.length === 0) return;
  
  // Get the parent path of the first selected subpath
  const firstSubPath = selectedSubPaths[0];
  const parentPath = store.paths.find(path => 
    path.subPaths.some(sp => sp.id === firstSubPath)
  );
  
  if (parentPath) {
    store.startFormatCopy(parentPath.id);
  }
};

const isFormatCopyActive = (): boolean => {
  const store = useEditorStore.getState();
  return store.isFormatCopyActive();
};

// Check if selected subpaths belong to the same path
const areSubPathsFromSamePath = (): boolean => {
  const store = useEditorStore.getState();
  const selectedSubPaths = store.selection.selectedSubPaths;
  
  if (selectedSubPaths.length === 0) return false;
  
  // Get parent path IDs for all selected subpaths
  const parentPathIds = new Set<string>();
  
  selectedSubPaths.forEach(subPathId => {
    const parentPath = store.paths.find(path => 
      path.subPaths.some(sp => sp.id === subPathId)
    );
    if (parentPath) {
      parentPathIds.add(parentPath.id);
    }
  });
  
  // All subpaths should belong to the same path
  return parentPathIds.size === 1;
};

// SubPath reorder functions
const getSubPathSelectionCount = () => {
  const store = useEditorStore.getState();
  return store.selection.selectedSubPaths.length;
};

const createSubPathReorderActions = () => {
  const { bringToFront, sendToBack, sendForward, sendBackward } = createElementReorderFunctions('subpath');
  
  return createReorderActions(
    'subpath',
    getSubPathSelectionCount,
    { bringToFront, sendToBack, sendForward, sendBackward }
  );
};

export const subPathActions: ToolbarAction[] = [
  {
    id: 'copy-format',
    icon: PaintBucket,
    label: 'Copy Format',
    type: 'toggle',
    toggle: {
      isActive: isFormatCopyActive,
      onToggle: startFormatCopy
    },
    priority: 1000,
    tooltip: 'Copy format (styles, filters, effects)',
    visible: areSubPathsFromSamePath
  },
  {
    id: 'group-subpaths',
    icon: Group,
    label: 'Group',
    type: 'button',
    action: groupSelectedSubPaths,
    priority: 105,
    tooltip: 'Group selected subpaths',
    visible: () => {
      // Only show when multiple subpaths are selected
      const store = useEditorStore.getState();
      return store.selection.selectedSubPaths.length >= 2;
    }
  },
  // Add arrange actions - spread the array to include all arrange options
  ...createSubPathArrangeActions(),
  // Add reorder actions - spread the array to include reorder options
  ...createSubPathReorderActions(),
  {
    id: 'subpath-fill-color',
    icon: Palette,
    label: 'Fill Color',
    type: 'color',
    color: {
      currentColor: getCommonSubPathFillColor(),
      onChange: applySubPathFillColor
    },
    priority: 990,
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
    priority: 980,
    tooltip: 'Change subpath stroke color'
  },
  {
    id: 'subpath-stroke-options',
    icon: LineSquiggle,
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
      getCurrentFillRule: getCommonSubPathFillRule,
      onStrokeWidthChange: applySubPathStrokeWidth,
      onStrokeDashChange: applySubPathStrokeDash,
      onStrokeLinecapChange: applySubPathStrokeLinecap,
      onStrokeLinejoinChange: applySubPathStrokeLinejoin,
      onFillRuleChange: applySubPathFillRule
    },
    priority: 970,
    tooltip: 'Configure stroke width, dash pattern, line cap, and line join'
  },
  {
    id: 'subpath-smooth',
    icon: Maximize2,
    label: 'Smooth',
    type: 'button',
    action: smoothSubPaths,
    priority: 600,
    tooltip: 'Apply smoothing to subpath curves'
  },
  {
    id: 'subpath-simplify',
    icon: Minimize2,
    label: 'Simplify',
    type: 'button',
    action: simplifySubPaths,
    priority: 590,
    tooltip: 'Simplify subpath by reducing points'
  },
  {
    id: 'subpath-filters',
    icon: Filter,
    label: 'Filters',
    type: 'dropdown',
    dropdown: {
      options: subPathFilterOptions
    },
    priority: 950,
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
    priority: 940,
    tooltip: 'Add animations'
  },
  {
    id: 'subpath-duplicate',
    icon: Copy,
    label: 'Duplicate',
    type: 'button',
    action: duplicateSubPaths,
    priority: 80,
    tooltip: 'Duplicate subpath'
  },
  {
    id: 'subpath-clear-style',
    icon: RotateCcw,
    label: 'Reset',
    type: 'button',
    action: clearSubPathStyle,
    priority: 70,
    tooltip: 'Reset subpath to default style'
  },
  {
    id: 'subpath-lock',
    icon: Lock,
    label: 'Lock/Unlock',
    type: 'toggle',
    toggle: {
      isActive: areSubPathsLocked,
      onToggle: toggleSubPathLock
    },
    priority: 60,
    tooltip: 'Toggle subpath lock state'
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