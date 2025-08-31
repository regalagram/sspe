import { 
  Copy, 
  Trash2, 
  Lock, 
  Group, 
  Palette, 
  Brush, 
  LineSquiggle, 
  Filter, 
  Play, 
  PaintBucket, 
  RotateCcw
} from 'lucide-react';
import { ToolbarAction } from '../../../types/floatingToolbar';
import { useEditorStore } from '../../../store/editorStore';
import { duplicateSelected, deleteSelected, getSelectedElementsBounds } from './commonActions';
import { createGenericArrangeActions } from '../../../utils/floating-arrange-actions';
import { createReorderActions, createElementReorderFunctions } from '../../../utils/floating-reorder-actions';
import { arrangeManager } from '../../../plugins/arrange/ArrangeManager';
import {
  createDropShadowFilter,
  createBlurFilter,
  createGrayscaleFilter,
  createSepiaFilter,
  createEmbossFilter,
  createGlowFilter,
  createNeonGlowFilter,
  formatSVGReference,
  matchesFilterSignature
} from '../../../utils/svg-elements-utils';

// Color functions
const getCommonUseFillColor = (): string | any => {
  const store = useEditorStore.getState();
  const selectedUses = store.selection.selectedUses || [];
  
  if (selectedUses.length === 0) return '#000000';
  
  const firstUse = store.uses.find(u => u.id === selectedUses[0]);
  if (!firstUse) return '#000000';
  
  const firstFill = firstUse.style?.fill;
  
  // Check if all selected uses have the same fill color
  const allSame = selectedUses.every(useId => {
    const useElement = store.uses.find(u => u.id === useId);
    const elementFill = useElement?.style?.fill;
    
    // Handle gradient/pattern comparison
    if (typeof firstFill === 'object' && typeof elementFill === 'object') {
      return JSON.stringify(firstFill) === JSON.stringify(elementFill);
    }
    
    return elementFill === firstFill;
  });
  
  // Return first fill if all same, or return object if it's a gradient/pattern
  if (allSame) {
    // If it's an object (gradient/pattern), return it as-is
    if (typeof firstFill === 'object' && firstFill !== null) {
      // Auto-register gradient/pattern if it has an id
      if (firstFill.id) {
        // Ensure gradient/pattern is in store
        const existingItem = store.gradients.find((g: any) => g.id === firstFill.id);
        if (!existingItem) {
          store.addGradient(firstFill);
        }
      }
      return firstFill;
    }
    return firstFill || '#000000';
  }
  
  return '#000000';
};

// Apply fill color to selected use elements
const applyUseFillColor = (color: string | any) => {
  const store = useEditorStore.getState();
  const selectedUses = store.selection.selectedUses || [];
  
  // Save to history before changing colors
  store.pushToHistory();
  
  // If color is a gradient or pattern object, add it to the store
  if (typeof color === 'object' && color && color.id && (color.type === 'linear' || color.type === 'radial' || color.type === 'pattern')) {
    // Check if gradient/pattern already exists in store
    const existingItem = store.gradients.find((g: any) => g.id === color.id);
    
    if (!existingItem) {
      store.addGradient(color);
    }
  }
  
  selectedUses.forEach(useId => {
    const use = store.uses.find(u => u.id === useId);
    if (use) {
      store.updateUse(useId, { 
        style: { 
          ...use.style, 
          fill: color 
        } 
      });
    }
  });
};

// Get common stroke color for selected use elements
const getCommonUseStrokeColor = (): string | any => {
  const store = useEditorStore.getState();
  const selectedUses = store.selection.selectedUses || [];
  
  if (selectedUses.length === 0) return '#000000';
  
  const firstUse = store.uses.find(u => u.id === selectedUses[0]);
  if (!firstUse) return '#000000';
  
  const firstStroke = firstUse.style?.stroke;
  
  // Check if all selected uses have the same stroke color
  const allSame = selectedUses.every(useId => {
    const useElement = store.uses.find(u => u.id === useId);
    const elementStroke = useElement?.style?.stroke;
    
    // Handle gradient/pattern comparison
    if (typeof firstStroke === 'object' && typeof elementStroke === 'object') {
      return JSON.stringify(firstStroke) === JSON.stringify(elementStroke);
    }
    
    return elementStroke === firstStroke;
  });
  
  // Return first stroke if all same, or return object if it's a gradient/pattern
  if (allSame) {
    // If it's an object (gradient/pattern), return it as-is
    if (typeof firstStroke === 'object' && firstStroke !== null) {
      // Auto-register gradient/pattern if it has an id
      if (firstStroke.id) {
        // Ensure gradient/pattern is in store
        const existingItem = store.gradients.find((g: any) => g.id === firstStroke.id);
        if (!existingItem) {
          store.addGradient(firstStroke);
        }
      }
      return firstStroke;
    }
    return firstStroke || '#000000';
  }
  
  return '#000000';
};

// Apply stroke color to selected use elements
const applyUseStrokeColor = (color: string | any) => {
  const store = useEditorStore.getState();
  const selectedUses = store.selection.selectedUses || [];
  
  // Save to history before changing colors
  store.pushToHistory();
  
  // If color is a gradient or pattern object, add it to the store
  if (typeof color === 'object' && color && color.id && (color.type === 'linear' || color.type === 'radial' || color.type === 'pattern')) {
    // Check if gradient/pattern already exists in store
    const existingItem = store.gradients.find((g: any) => g.id === color.id);
    
    if (!existingItem) {
      store.addGradient(color);
    }
  }
  
  selectedUses.forEach(useId => {
    const use = store.uses.find(u => u.id === useId);
    if (use) {
      store.updateUse(useId, { 
        style: { 
          ...use.style, 
          stroke: color 
        } 
      });
    }
  });
};

// Get common stroke width for selected use elements
const getCommonUseStrokeWidth = (): number => {
  const store = useEditorStore.getState();
  const selectedUses = store.selection.selectedUses || [];
  
  if (selectedUses.length === 0) return 1;
  
  const firstUse = store.uses.find(u => u.id === selectedUses[0]);
  return firstUse?.style?.strokeWidth || 1;
};

// Apply stroke width to selected use elements
const applyUseStrokeWidth = (strokeWidth: string | number) => {
  const store = useEditorStore.getState();
  const selectedUses = store.selection.selectedUses || [];
  
  store.pushToHistory();
  
  const numericValue = typeof strokeWidth === 'string' ? parseFloat(strokeWidth) : strokeWidth;
  
  selectedUses.forEach(useId => {
    const use = store.uses.find(u => u.id === useId);
    if (use) {
      store.updateUse(useId, { 
        style: { 
          ...use.style, 
          strokeWidth: numericValue
        } 
      });
    }
  });
};

// Get common stroke dash for selected use elements
const getCommonUseStrokeDash = (): string => {
  const store = useEditorStore.getState();
  const selectedUses = store.selection.selectedUses || [];
  
  if (selectedUses.length === 0) return '';
  
  const firstUse = store.uses.find(u => u.id === selectedUses[0]);
  return firstUse?.style?.strokeDasharray || '';
};

// Apply stroke dash to selected use elements
const applyUseStrokeDash = (strokeDash: string) => {
  const store = useEditorStore.getState();
  const selectedUses = store.selection.selectedUses || [];
  
  store.pushToHistory();
  
  selectedUses.forEach(useId => {
    const use = store.uses.find(u => u.id === useId);
    if (use) {
      store.updateUse(useId, { 
        style: { 
          ...use.style, 
          strokeDasharray: strokeDash 
        } 
      });
    }
  });
};

// Get common stroke linecap for selected use elements
const getCommonUseStrokeLinecap = (): string => {
  const store = useEditorStore.getState();
  const selectedUses = store.selection.selectedUses || [];
  
  if (selectedUses.length === 0) return 'butt';
  
  const firstUse = store.uses.find(u => u.id === selectedUses[0]);
  return firstUse?.style?.strokeLinecap || 'butt';
};

// Apply stroke linecap to selected use elements
const applyUseStrokeLinecap = (strokeLinecap: string) => {
  const store = useEditorStore.getState();
  const selectedUses = store.selection.selectedUses || [];
  
  store.pushToHistory();
  
  selectedUses.forEach(useId => {
    const use = store.uses.find(u => u.id === useId);
    if (use) {
      store.updateUse(useId, { 
        style: { 
          ...use.style, 
          strokeLinecap: strokeLinecap as 'butt' | 'round' | 'square'
        } 
      });
    }
  });
};

// Get common stroke linejoin for selected use elements
const getCommonUseStrokeLinejoin = (): string => {
  const store = useEditorStore.getState();
  const selectedUses = store.selection.selectedUses || [];
  
  if (selectedUses.length === 0) return 'miter';
  
  const firstUse = store.uses.find(u => u.id === selectedUses[0]);
  return firstUse?.style?.strokeLinejoin || 'miter';
};

// Apply stroke linejoin to selected use elements
const applyUseStrokeLinejoin = (strokeLinejoin: string) => {
  const store = useEditorStore.getState();
  const selectedUses = store.selection.selectedUses || [];
  
  store.pushToHistory();
  
  selectedUses.forEach(useId => {
    const use = store.uses.find(u => u.id === useId);
    if (use) {
      store.updateUse(useId, { 
        style: { 
          ...use.style, 
          strokeLinejoin: strokeLinejoin as 'miter' | 'round' | 'bevel'
        } 
      });
    }
  });
};

// Clear use element style
const clearUseStyle = () => {
  const store = useEditorStore.getState();
  const selectedUses = store.selection.selectedUses || [];
  
  store.pushToHistory();
  
  selectedUses.forEach(useId => {
    const use = store.uses.find(u => u.id === useId);
    if (use) {
      store.updateUse(useId, { 
        style: {}
      });
    }
  });
};

// Get common opacity for selected use elements
const getCommonUseOpacity = (): number => {
  const store = useEditorStore.getState();
  const selectedUses = store.selection.selectedUses || [];
  
  if (selectedUses.length === 0) return 1;
  
  const firstUse = store.uses.find(u => u.id === selectedUses[0]);
  if (!firstUse) return 1;
  
  // Helper function to extract opacity from element (like FloatingToolbarButton)
  const extractOpacityFromElement = (element: any, isStroke = false) => {
    const color = isStroke ? element?.style?.stroke : element?.style?.fill;
    const explicitOpacity = isStroke ? element?.style?.strokeOpacity : element?.style?.fillOpacity;
    
    // First check if there's an explicit opacity value
    if (explicitOpacity !== undefined) {
      return explicitOpacity;
    }
    
    // Then check if the color itself contains opacity (RGBA, HSLA)
    if (typeof color === 'string') {
      // Simple RGBA/HSLA detection - more complete parsing would be needed for production
      const rgbaMatch = color.match(/rgba?\s*\(\s*[^)]+,\s*([^)]+)\)/);
      const hslaMatch = color.match(/hsla?\s*\(\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*([^)]+)\)/);
      
      if (rgbaMatch) {
        return parseFloat(rgbaMatch[1]);
      }
      if (hslaMatch) {
        return parseFloat(hslaMatch[1]);
      }
    }
    
    return undefined;
  };
  
  const opacity = extractOpacityFromElement(firstUse, false); // false = fill
  return opacity !== undefined ? opacity : 1;
};

// Apply opacity to selected use elements (fill opacity)
const applyUseOpacity = (opacity: number) => {
  const store = useEditorStore.getState();
  const selectedUses = store.selection.selectedUses || [];
  
  // Save to history before changing opacity
  store.pushToHistory();
  
  selectedUses.forEach(useId => {
    const use = store.uses.find(u => u.id === useId);
    if (use) {
      store.updateUse(useId, { 
        style: { 
          ...use.style, 
          fillOpacity: opacity
        } 
      });
    }
  });
};

// Get common stroke opacity for selected use elements
const getCommonUseStrokeOpacity = (): number => {
  const store = useEditorStore.getState();
  const selectedUses = store.selection.selectedUses || [];
  
  if (selectedUses.length === 0) return 1;
  
  const firstUse = store.uses.find(u => u.id === selectedUses[0]);
  if (!firstUse) return 1;
  
  // Helper function to extract opacity from element (like FloatingToolbarButton)
  const extractOpacityFromElement = (element: any, isStroke = false) => {
    const color = isStroke ? element?.style?.stroke : element?.style?.fill;
    const explicitOpacity = isStroke ? element?.style?.strokeOpacity : element?.style?.fillOpacity;
    
    // First check if there's an explicit opacity value
    if (explicitOpacity !== undefined) {
      return explicitOpacity;
    }
    
    // Then check if the color itself contains opacity (RGBA, HSLA)
    if (typeof color === 'string') {
      // Simple RGBA/HSLA detection
      const rgbaMatch = color.match(/rgba?\s*\(\s*[^)]+,\s*([^)]+)\)/);
      const hslaMatch = color.match(/hsla?\s*\(\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*([^)]+)\)/);
      
      if (rgbaMatch) {
        return parseFloat(rgbaMatch[1]);
      }
      if (hslaMatch) {
        return parseFloat(hslaMatch[1]);
      }
    }
    
    return undefined;
  };
  
  const opacity = extractOpacityFromElement(firstUse, true); // true = stroke
  return opacity !== undefined ? opacity : 1;
};

// Apply stroke opacity to selected use elements
const applyUseStrokeOpacity = (strokeOpacity: number) => {
  const store = useEditorStore.getState();
  const selectedUses = store.selection.selectedUses || [];
  
  store.pushToHistory();
  
  selectedUses.forEach(useId => {
    const use = store.uses.find(u => u.id === useId);
    if (use) {
      store.updateUse(useId, { 
        style: { 
          ...use.style, 
          strokeOpacity 
        } 
      });
    }
  });
};

// Function to open filter panel
const openFilterPanel = async () => {
  // Use pluginManager to open filter panel (handles both mobile and desktop)
  const { pluginManager } = await import('../../../core/PluginSystem');
  pluginManager.openFilterPanel();
};

// Check if a specific filter is active on selected use elements
const isUseFilterActive = (filterType: string): boolean => {
  const store = useEditorStore.getState();
  const selectedUses = store.selection.selectedUses || [];
  
  if (selectedUses.length === 0) return false;
  
  // Check if any selected use element has a filter applied
  return selectedUses.some(useId => {
    const use = store.uses.find(u => u.id === useId);
    const filterRef = use?.style?.filter;
    if (!filterRef || typeof filterRef !== 'string') return false;
    
    // Extract filter ID from url(#id) format
    const match = filterRef.match(/url\(#([^)]+)\)/);
    if (!match) return false;
    
    const filterId = match[1];
    
    // Find the filter in the store
    const filter = store.filters.find(f => f.id === filterId);
    if (!filter) return false;
    
    // Use the shared filter signature matching function
    return matchesFilterSignature(filter.primitives, filterType);
  });
};

// Remove specific filter from selected use elements
const removeUseFilter = (filterType: string) => {
  const store = useEditorStore.getState();
  const selectedUses = store.selection.selectedUses || [];
  
  if (selectedUses.length === 0) return;
  
  store.pushToHistory();
  
  selectedUses.forEach(useId => {
    const use = store.uses.find(u => u.id === useId);
    const filterRef = use?.style?.filter;
    if (!filterRef || typeof filterRef !== 'string') return;
    
    // Extract filter ID from url(#id) format
    const match = filterRef.match(/url\(#([^)]+)\)/);
    if (!match) return;
    
    const filterId = match[1];
    
    // Find the filter in the store
    const filter = store.filters.find(f => f.id === filterId);
    if (!filter) return;
    
    // Check if this filter matches the type we want to remove using the shared signature matching
    const shouldRemove = matchesFilterSignature(filter.primitives, filterType);
    
    if (shouldRemove) {
      // Remove the filter by setting it to undefined
      store.updateUse(useId, { 
        style: { 
          ...use.style, 
          filter: undefined 
        } 
      });
    }
  });
};

// Toggle functions that either apply or remove filters
const toggleUseFilter = (filterType: string, applyFunction: () => void) => {
  if (isUseFilterActive(filterType)) {
    removeUseFilter(filterType);
  } else {
    applyFunction();
  }
};

// Filter options for use elements
const useFilterOptions = [
  { 
    id: 'use-blur', 
    label: 'Blur', 
    action: () => toggleUseFilter('blur', applyBlurFilterToUses),
    active: () => isUseFilterActive('blur')
  },
  { 
    id: 'use-shadow', 
    label: 'Drop Shadow', 
    action: () => toggleUseFilter('shadow', applyDropShadowToUses),
    active: () => isUseFilterActive('shadow')
  },
  { 
    id: 'use-glow', 
    label: 'Glow', 
    action: () => toggleUseFilter('glow', applyGlowFilterToUses),
    active: () => isUseFilterActive('glow')
  },
  { 
    id: 'use-grayscale', 
    label: 'Grayscale', 
    action: () => toggleUseFilter('grayscale', applyGrayscaleFilterToUses),
    active: () => isUseFilterActive('grayscale')
  },
  { 
    id: 'use-sepia', 
    label: 'Sepia', 
    action: () => toggleUseFilter('sepia', applySepiaFilterToUses),
    active: () => isUseFilterActive('sepia')
  },
  { 
    id: 'use-emboss', 
    label: 'Emboss', 
    action: () => toggleUseFilter('emboss', applyEmbossFilterToUses),
    active: () => isUseFilterActive('emboss')
  },
  { 
    id: 'use-neon-glow', 
    label: 'Neon Glow', 
    action: () => toggleUseFilter('neon-glow', applyNeonGlowFilterToUses),
    active: () => isUseFilterActive('neon-glow')
  },
  { id: 'use-more-filters', label: 'More ...', action: openFilterPanel }
];

// Specific filter functions for use elements
const applyBlurFilterToUses = () => {
  const store = useEditorStore.getState();
  const selectedUses = store.selection.selectedUses || [];
  
  store.pushToHistory();
  
  const filterData = createBlurFilter();
  store.addFilter(filterData);
  
  setTimeout(() => {
    const storeState = useEditorStore.getState();
    const currentFilters = storeState.filters;
    const newFilter = currentFilters[currentFilters.length - 1];
    
    if (newFilter && newFilter.id) {
      const filterRef = formatSVGReference(newFilter.id);
      
      selectedUses.forEach(useId => {
        const use = storeState.uses.find(u => u.id === useId);
        if (use) {
          storeState.updateUse(useId, { 
            style: { 
              ...use.style, 
              filter: filterRef 
            } 
          });
        }
      });
    }
  }, 0);
};

const applyDropShadowToUses = () => {
  const store = useEditorStore.getState();
  const selectedUses = store.selection.selectedUses || [];
  
  store.pushToHistory();
  
  const filterData = createDropShadowFilter();
  store.addFilter(filterData);
  
  setTimeout(() => {
    const storeState = useEditorStore.getState();
    const currentFilters = storeState.filters;
    const newFilter = currentFilters[currentFilters.length - 1];
    
    if (newFilter && newFilter.id) {
      const filterRef = formatSVGReference(newFilter.id);
      
      selectedUses.forEach(useId => {
        const use = storeState.uses.find(u => u.id === useId);
        if (use) {
          storeState.updateUse(useId, { 
            style: { 
              ...use.style, 
              filter: filterRef 
            } 
          });
        }
      });
    }
  }, 0);
};

const applyGlowFilterToUses = () => {
  const store = useEditorStore.getState();
  const selectedUses = store.selection.selectedUses || [];
  
  store.pushToHistory();
  
  const filterData = createGlowFilter();
  store.addFilter(filterData);
  
  setTimeout(() => {
    const storeState = useEditorStore.getState();
    const currentFilters = storeState.filters;
    const newFilter = currentFilters[currentFilters.length - 1];
    
    if (newFilter && newFilter.id) {
      const filterRef = formatSVGReference(newFilter.id);
      
      selectedUses.forEach(useId => {
        const use = storeState.uses.find(u => u.id === useId);
        if (use) {
          storeState.updateUse(useId, { 
            style: { 
              ...use.style, 
              filter: filterRef 
            } 
          });
        }
      });
    }
  }, 0);
};

const applyGrayscaleFilterToUses = () => {
  const store = useEditorStore.getState();
  const selectedUses = store.selection.selectedUses || [];
  
  store.pushToHistory();
  
  const filterData = createGrayscaleFilter();
  store.addFilter(filterData);
  
  setTimeout(() => {
    const storeState = useEditorStore.getState();
    const currentFilters = storeState.filters;
    const newFilter = currentFilters[currentFilters.length - 1];
    
    if (newFilter && newFilter.id) {
      const filterRef = formatSVGReference(newFilter.id);
      
      selectedUses.forEach(useId => {
        const use = storeState.uses.find(u => u.id === useId);
        if (use) {
          storeState.updateUse(useId, { 
            style: { 
              ...use.style, 
              filter: filterRef 
            } 
          });
        }
      });
    }
  }, 0);
};

const applySepiaFilterToUses = () => {
  const store = useEditorStore.getState();
  const selectedUses = store.selection.selectedUses || [];
  
  store.pushToHistory();
  
  const filterData = createSepiaFilter();
  store.addFilter(filterData);
  
  setTimeout(() => {
    const storeState = useEditorStore.getState();
    const currentFilters = storeState.filters;
    const newFilter = currentFilters[currentFilters.length - 1];
    
    if (newFilter && newFilter.id) {
      const filterRef = formatSVGReference(newFilter.id);
      
      selectedUses.forEach(useId => {
        const use = storeState.uses.find(u => u.id === useId);
        if (use) {
          storeState.updateUse(useId, { 
            style: { 
              ...use.style, 
              filter: filterRef 
            } 
          });
        }
      });
    }
  }, 0);
};

const applyEmbossFilterToUses = () => {
  const store = useEditorStore.getState();
  const selectedUses = store.selection.selectedUses || [];
  
  store.pushToHistory();
  
  const filterData = createEmbossFilter();
  store.addFilter(filterData);
  
  setTimeout(() => {
    const storeState = useEditorStore.getState();
    const currentFilters = storeState.filters;
    const newFilter = currentFilters[currentFilters.length - 1];
    
    if (newFilter && newFilter.id) {
      const filterRef = formatSVGReference(newFilter.id);
      
      selectedUses.forEach(useId => {
        const use = storeState.uses.find(u => u.id === useId);
        if (use) {
          storeState.updateUse(useId, { 
            style: { 
              ...use.style, 
              filter: filterRef 
            } 
          });
        }
      });
    }
  }, 0);
};

const applyNeonGlowFilterToUses = () => {
  const store = useEditorStore.getState();
  const selectedUses = store.selection.selectedUses || [];
  
  store.pushToHistory();
  
  const filterData = createNeonGlowFilter();
  store.addFilter(filterData);
  
  setTimeout(() => {
    const storeState = useEditorStore.getState();
    const currentFilters = storeState.filters;
    const newFilter = currentFilters[currentFilters.length - 1];
    
    if (newFilter && newFilter.id) {
      const filterRef = formatSVGReference(newFilter.id);
      
      selectedUses.forEach(useId => {
        const use = storeState.uses.find(u => u.id === useId);
        if (use) {
          storeState.updateUse(useId, { 
            style: { 
              ...use.style, 
              filter: filterRef 
            } 
          });
        }
      });
    }
  }, 0);
};

// Function to open animation panel
const openAnimationPanel = async () => {
  // Use pluginManager to open animation panel (handles both mobile and desktop)
  const { pluginManager } = await import('../../../core/PluginSystem');
  pluginManager.openAnimationPanel();
};

// Check if a specific animation is active on selected use elements
const isUseAnimationActive = (animationType: string): boolean => {
  const store = useEditorStore.getState();
  const selectedUses = store.selection.selectedUses || [];
  
  if (selectedUses.length === 0) return false;
  
  // Check if any selected use element has an animation applied
  return selectedUses.some(useId => {
    return store.animations.some(animation => {
      if (animation.targetElementId !== useId) return false;
      
      switch (animationType) {
        case 'fade':
          return animation.type === 'animate' && (animation as any).attributeName === 'opacity';
        case 'scale':
          return animation.type === 'animateTransform' && 
                 (animation as any).transformType === 'scale';
        case 'rotate':
          return animation.type === 'animateTransform' && 
                 (animation as any).transformType === 'rotate';
        case 'translate':
          return animation.type === 'animateTransform' && 
                 (animation as any).transformType === 'translate';
        default:
          return false;
      }
    });
  });
};

// Remove specific animation from selected use elements
const removeUseAnimation = (animationType: string) => {
  const store = useEditorStore.getState();
  const selectedUses = store.selection.selectedUses || [];
  
  if (selectedUses.length === 0) return;
  
  store.pushToHistory();
  
  selectedUses.forEach(useId => {
    // Find animations targeting this use element that match the type
    const animationsToRemove = store.animations.filter(animation => {
      if (animation.targetElementId !== useId) return false;
      
      switch (animationType) {
        case 'fade':
          return animation.type === 'animate' && (animation as any).attributeName === 'opacity';
        case 'scale':
          return animation.type === 'animateTransform' && 
                 (animation as any).transformType === 'scale';
        case 'rotate':
          return animation.type === 'animateTransform' && 
                 (animation as any).transformType === 'rotate';
        case 'translate':
          return animation.type === 'animateTransform' && 
                 (animation as any).transformType === 'translate';
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

// Toggle functions that either apply or remove animations
const toggleUseAnimation = (animationType: string, applyFunction: () => void) => {
  if (isUseAnimationActive(animationType)) {
    removeUseAnimation(animationType);
  } else {
    applyFunction();
  }
};

// Animation options for use elements
const useAnimationOptions = [
  { 
    id: 'use-fade', 
    label: 'Fade In/Out', 
    action: () => toggleUseAnimation('fade', addFadeAnimationToUses),
    active: () => isUseAnimationActive('fade')
  },
  { 
    id: 'use-scale', 
    label: 'Scale In', 
    action: () => toggleUseAnimation('scale', addScaleAnimationToUses),
    active: () => isUseAnimationActive('scale')
  },
  { 
    id: 'use-rotate', 
    label: 'Rotate', 
    action: () => toggleUseAnimation('rotate', addRotateAnimationToUses),
    active: () => isUseAnimationActive('rotate')
  },
  { 
    id: 'use-translate', 
    label: 'Slide/Bounce', 
    action: () => toggleUseAnimation('translate', addTranslateAnimationToUses),
    active: () => isUseAnimationActive('translate')
  },
  { id: 'use-more-animations', label: 'More ...', action: openAnimationPanel }
];

// Specific animation functions for use elements
const addFadeAnimationToUses = () => {
  const store = useEditorStore.getState();
  const selectedUses = store.selection.selectedUses || [];
  
  store.pushToHistory();
  
  selectedUses.forEach(useId => {
    const opacityAnimation = {
      targetElementId: useId,
      type: 'animate' as const,
      attributeName: 'opacity',
      from: '0',
      to: '1',
      dur: '1s',
      fill: 'freeze'
    };
    
    store.addAnimation(opacityAnimation);
  });
};

const addScaleAnimationToUses = () => {
  const store = useEditorStore.getState();
  const selectedUses = store.selection.selectedUses || [];
  
  store.pushToHistory();
  
  selectedUses.forEach(useId => {
    const scaleAnimation = {
      targetElementId: useId,
      type: 'animateTransform' as const,
      attributeName: 'transform',
      transformType: 'scale',
      from: '0',
      to: '1',
      dur: '0.8s',
      fill: 'freeze'
    };
    
    store.addAnimation(scaleAnimation);
  });
};

const addRotateAnimationToUses = () => {
  const store = useEditorStore.getState();
  const selectedUses = store.selection.selectedUses || [];
  
  store.pushToHistory();
  
  selectedUses.forEach(useId => {
    const rotationAnimation = {
      targetElementId: useId,
      type: 'animateTransform' as const,
      attributeName: 'transform',
      transformType: 'rotate',
      from: '0',
      to: '360',
      dur: '2s',
      repeatCount: 'indefinite'
    };
    
    store.addAnimation(rotationAnimation);
  });
};

const addTranslateAnimationToUses = () => {
  const store = useEditorStore.getState();
  const selectedUses = store.selection.selectedUses || [];
  
  store.pushToHistory();
  
  selectedUses.forEach(useId => {
    const slideAnimation = {
      targetElementId: useId,
      type: 'animateTransform' as const,
      attributeName: 'transform',
      transformType: 'translate',
      values: '0,0; 0,-10; 0,0',
      dur: '1s',
      repeatCount: 'indefinite'
    };
    
    store.addAnimation(slideAnimation);
  });
};

// Check if selected use elements are locked
const areUsesLocked = (): boolean => {
  const store = useEditorStore.getState();
  const selectedUses = store.selection.selectedUses || [];
  
  if (selectedUses.length === 0) return false;
  
  return selectedUses.some(useId => {
    const use = store.uses.find(u => u.id === useId);
    return use?.locked === true;
  });
};

// Toggle use element lock
const toggleUseLock = () => {
  const store = useEditorStore.getState();
  const selectedUses = store.selection.selectedUses || [];
  
  if (selectedUses.length === 0) return;
  
  store.pushToHistory();
  
  // Determine if we should lock or unlock based on the first selected use element
  const firstUse = store.uses.find(u => u.id === selectedUses[0]);
  const shouldLock = !firstUse?.locked;
  
  // Apply lock/unlock to all selected use elements
  selectedUses.forEach(useId => {
    const useIndex = store.uses.findIndex(u => u.id === useId);
    if (useIndex !== -1) {
      useEditorStore.setState(state => ({
        uses: state.uses.map((u, index) => 
          index === useIndex ? { ...u, locked: shouldLock } : u
        )
      }));
    }
  });
  
  // If locking, clear selection as locked use elements shouldn't be selectable
  if (shouldLock) {
    store.clearSelection();
  }
};

// Delete selected use elements
const deleteUses = () => {
  const store = useEditorStore.getState();
  const selectedUses = store.selection.selectedUses || [];
  
  selectedUses.forEach(useId => {
    const useIndex = store.uses.findIndex(u => u.id === useId);
    if (useIndex !== -1) {
      useEditorStore.setState(state => ({
        uses: state.uses.filter((_, index) => index !== useIndex)
      }));
    }
  });
  
  store.clearSelection();
};

// Duplicate selected use elements
const duplicateUses = () => {
  const store = useEditorStore.getState();
  store.pushToHistory();
  
  // Calculate dynamic offset based on all selected elements
  const bounds = getSelectedElementsBounds();
  const OFFSET = 32;
  const dx = bounds ? (bounds.width > 0 ? bounds.width + OFFSET : OFFSET) : OFFSET;
  const dy = bounds ? (bounds.height > 0 ? bounds.height + OFFSET : OFFSET) : OFFSET;
  
  store.selection.selectedUses.forEach(useId => {
    store.duplicateUse(useId, { x: dx, y: dy });
  });
};

// Group selected use elements
const groupSelectedUses = () => {
  const store = useEditorStore.getState();
  const hasSelection = store.selection.selectedUses.length >= 2;
  
  if (hasSelection) {
    // Push to history before making changes
    store.pushToHistory();
    
    // Use the built-in createGroupFromSelection method
    const groupId = store.createGroupFromSelection();
    
    if (groupId) {
      console.log(`✅ Created group with ID: ${groupId}`);
    } else {
      console.log('❌ Failed to create group');
    }
  }
};

// Use element arrange actions helper functions
const getUseSelectionCount = () => {
  const store = useEditorStore.getState();
  return store.selection.selectedUses.length;
};

const setupArrangeManagerForUse = () => {
  const store = useEditorStore.getState();
  arrangeManager.setEditorStore(store);
};

// Create use element-specific arrange actions
const createUseArrangeActions = () => createGenericArrangeActions(
  'use-elements',
  getUseSelectionCount,
  {
    alignLeft: () => {
      setupArrangeManagerForUse();
      arrangeManager.alignLeft();
    },
    alignCenter: () => {
      setupArrangeManagerForUse();
      arrangeManager.alignCenter();
    },
    alignRight: () => {
      setupArrangeManagerForUse();
      arrangeManager.alignRight();
    },
    alignTop: () => {
      setupArrangeManagerForUse();
      arrangeManager.alignTop();
    },
    alignMiddle: () => {
      setupArrangeManagerForUse();
      arrangeManager.alignMiddle();
    },
    alignBottom: () => {
      setupArrangeManagerForUse();
      arrangeManager.alignBottom();
    },
    distributeHorizontally: () => {
      setupArrangeManagerForUse();
      arrangeManager.distributeHorizontally();
    },
    distributeVertically: () => {
      setupArrangeManagerForUse();
      arrangeManager.distributeVertically();
    }
  }
);

// Use element reorder functions
const createUseReorderActions = () => {
  const { bringToFront, sendToBack, sendForward, sendBackward } = createElementReorderFunctions('use');
  
  return createReorderActions(
    'use',
    getUseSelectionCount,
    { bringToFront, sendToBack, sendForward, sendBackward }
  );
};

// Format copy functions for use elements
const startUseFormatCopy = () => {
  const store = useEditorStore.getState();
  
  // Check if use format copy is already active - if so, cancel it
  if (store.isUseFormatCopyActive && store.isUseFormatCopyActive()) {
    store.cancelUseFormatCopy();
    return;
  }
  
  const selectedUses = store.selection.selectedUses || [];
  
  if (selectedUses.length === 0) return;
  
  // Get the first selected use element ID
  const firstUseId = selectedUses[0];
  
  // Start use format copy with use ID
  store.startUseFormatCopy(firstUseId);
};

const isUseFormatCopyActive = (): boolean => {
  const store = useEditorStore.getState();
  return store.isUseFormatCopyActive();
};

// Check if use format copy should be visible (only for single use selection)
const isUseFormatCopyVisible = (): boolean => {
  const store = useEditorStore.getState();
  const selectedUses = store.selection.selectedUses || [];
  
  // Only show for exactly one use element selected (not multiple)
  return selectedUses.length === 1;
};

export const useActions: ToolbarAction[] = [
  {
    id: 'copy-format-use',
    icon: PaintBucket,
    label: 'Copy Format',
    type: 'toggle',
    toggle: {
      isActive: isUseFormatCopyActive,
      onToggle: startUseFormatCopy
    },
    priority: 1000,
    tooltip: 'Copy format (styles, filters, effects)',
    visible: isUseFormatCopyVisible
  },
  {
    id: 'group-uses',
    icon: Group,
    label: 'Group',
    type: 'button',
    action: groupSelectedUses,
    priority: 100,
    tooltip: 'Group selected use elements',
    visible: () => {
      // Only show when multiple use elements are selected
      const store = useEditorStore.getState();
      return store.selection.selectedUses.length >= 2;
    }
  },
  // Add arrange actions for use/symbol elements
  ...createUseArrangeActions(),
  // Add reorder actions for use/symbol elements
  ...createUseReorderActions(),
  {
    id: 'use-fill-color',
    icon: Palette,
    label: 'Fill Color',
    type: 'color',
    color: {
      currentColor: getCommonUseFillColor(),
      onChange: applyUseFillColor
    },
    priority: 990,
    tooltip: 'Change use element fill color'
  },
  {
    id: 'use-stroke-color',
    icon: Brush,
    label: 'Stroke Color',
    type: 'color',
    color: {
      currentColor: getCommonUseStrokeColor(),
      onChange: applyUseStrokeColor
    },
    priority: 980,
    tooltip: 'Change use element stroke color'
  },
  {
    id: 'use-stroke-options',
    icon: LineSquiggle,
    label: 'Stroke Options',
    type: 'input',
    input: {
      currentValue: getCommonUseStrokeWidth(),
      onChange: applyUseStrokeWidth,
      type: 'number',
      placeholder: '1'
    },
    strokeOptions: {
      getCurrentStrokeWidth: getCommonUseStrokeWidth,
      getCurrentStrokeDash: getCommonUseStrokeDash,
      getCurrentStrokeLinecap: getCommonUseStrokeLinecap,
      getCurrentStrokeLinejoin: getCommonUseStrokeLinejoin,
      onStrokeWidthChange: applyUseStrokeWidth,
      onStrokeDashChange: applyUseStrokeDash,
      onStrokeLinecapChange: applyUseStrokeLinecap,
      onStrokeLinejoinChange: applyUseStrokeLinejoin
    },
    priority: 970,
    tooltip: 'Configure stroke width, dash pattern, line cap, and line join'
  },
  {
    id: 'use-filters',
    icon: Filter,
    label: 'Filters',
    type: 'dropdown',
    dropdown: {
      options: useFilterOptions
    },
    priority: 950,
    tooltip: 'Apply filters'
  },
  {
    id: 'use-animations',
    icon: Play,
    label: 'Animations',
    type: 'dropdown',
    dropdown: {
      options: useAnimationOptions
    },
    priority: 940,
    tooltip: 'Add animations'
  },
  {
    id: 'duplicate-use',
    icon: Copy,
    label: 'Duplicate',
    type: 'button',
    action: duplicateSelected, // Use unified duplicate function
    priority: 80,
    tooltip: 'Duplicate use element'
  },
  {
    id: 'use-clear-style',
    icon: RotateCcw,
    label: 'Reset',
    type: 'button',
    action: clearUseStyle,
    priority: 70,
    tooltip: 'Reset use element to default style (removes stroke, filters, animations)'
  },
  {
    id: 'use-lock',
    icon: Lock,
    label: 'Lock/Unlock',
    type: 'toggle',
    toggle: {
      isActive: areUsesLocked,
      onToggle: toggleUseLock
    },
    priority: 60,
    tooltip: 'Toggle use element lock state'
  },
  {
    id: 'delete-use',
    icon: Trash2,
    label: 'Delete',
    type: 'button',
    action: deleteSelected, // Use unified delete function
    priority: 10,
    destructive: true,
    tooltip: 'Delete use element'
  }
];

// Export for compatibility with existing code
export const symbolActions = useActions;