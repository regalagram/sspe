import { Type, Bold, Italic, Underline, Palette, AlignLeft, AlignCenter, AlignRight, Trash2, LineSquiggle, Brush, Filter, Play, RotateCcw, Edit3 } from 'lucide-react';
import { FloatingActionDefinition, ToolbarAction } from '../../types/floatingToolbar';
import { useEditorStore } from '../../store/editorStore';
import { textEditManager } from '../../core/TextEditManager';
import { createDropShadowFilter, createBlurFilter, createGrayscaleFilter, createSepiaFilter, createEmbossFilter, createGlowFilter, createNeonGlowFilter, formatSVGReference, matchesFilterSignature } from '../../utils/svg-elements-utils';

// Apply style to selected textpaths
const applyTextPathStyle = (styleUpdate: any) => {
  const store = useEditorStore.getState();
  const selectedTextPaths = store.selection.selectedTextPaths || [];
  
  if (selectedTextPaths.length === 0) return;
  
  store.pushToHistory();
  
  selectedTextPaths.forEach(textPathId => {
    store.updateTextPathStyle(textPathId, styleUpdate);
  });
};

// Get current styles from the first selected textpath
const getCurrentTextPathStyles = () => {
  const store = useEditorStore.getState();
  const selectedTextPaths = store.selection.selectedTextPaths || [];
  
  if (selectedTextPaths.length === 0) return null;
  
  const firstTextPathId = selectedTextPaths[0];
  const textPath = store.textPaths.find(tp => tp.id === firstTextPathId);
  
  return textPath?.style || {};
};

// Get current font family
const getCurrentFontFamily = (): string => {
  const styles = getCurrentTextPathStyles();
  return styles?.fontFamily || 'Arial';
};

// Get current font size
const getCurrentFontSize = (): number => {
  const styles = getCurrentTextPathStyles();
  const fontSize = styles?.fontSize || '16';
  return parseInt(typeof fontSize === 'string' ? fontSize : '16');
};

// Get current text color
const getCurrentTextColor = (): string | any => {
  const styles = getCurrentTextPathStyles();
  const fill = styles?.fill;
  return fill || '#000000';
};

// Check if text is bold
const isTextBold = (): boolean => {
  const styles = getCurrentTextPathStyles();
  return styles?.fontWeight === 'bold';
};

// Check if text is italic
const isTextItalic = (): boolean => {
  const styles = getCurrentTextPathStyles();
  return styles?.fontStyle === 'italic';
};

// Check if text is underlined
const isTextUnderline = (): boolean => {
  const styles = getCurrentTextPathStyles();
  return styles?.textDecoration === 'underline';
};

// Font family options
const fontFamilies = [
  { id: 'arial', label: 'Arial', action: () => applyTextPathStyle({ fontFamily: 'Arial' }) },
  { id: 'helvetica', label: 'Helvetica', action: () => applyTextPathStyle({ fontFamily: 'Helvetica' }) },
  { id: 'times', label: 'Times New Roman', action: () => applyTextPathStyle({ fontFamily: 'Times New Roman' }) },
  { id: 'courier', label: 'Courier New', action: () => applyTextPathStyle({ fontFamily: 'Courier New' }) },
  { id: 'georgia', label: 'Georgia', action: () => applyTextPathStyle({ fontFamily: 'Georgia' }) },
  { id: 'verdana', label: 'Verdana', action: () => applyTextPathStyle({ fontFamily: 'Verdana' }) }
];

// Alignment options
const alignmentOptions = [
  { 
    id: 'left', 
    label: 'Left', 
    icon: AlignLeft,
    action: () => applyTextPathStyle({ textAnchor: 'start' }) 
  },
  { 
    id: 'center', 
    label: 'Center', 
    icon: AlignCenter,
    action: () => applyTextPathStyle({ textAnchor: 'middle' }) 
  },
  { 
    id: 'right', 
    label: 'Right', 
    icon: AlignRight,
    action: () => applyTextPathStyle({ textAnchor: 'end' }) 
  }
];

// Get current stroke color
const getCurrentStrokeColor = (): string | any => {
  const styles = getCurrentTextPathStyles();
  const stroke = styles?.stroke;
  return stroke || '#000000';
};

// Get current stroke width
const getCurrentStrokeWidth = (): number => {
  const styles = getCurrentTextPathStyles();
  const strokeWidth = styles?.strokeWidth;
  return typeof strokeWidth === 'number' ? strokeWidth : 1;
};

// Get current stroke dash
const getCurrentStrokeDash = (): string => {
  const styles = getCurrentTextPathStyles();
  const strokeDash = styles?.strokeDasharray;
  return typeof strokeDash === 'string' ? strokeDash : 'none';
};

// Get current stroke linecap
const getCurrentStrokeLinecap = (): string => {
  const styles = getCurrentTextPathStyles();
  const strokeLinecap = styles?.strokeLinecap;
  return typeof strokeLinecap === 'string' ? strokeLinecap : 'butt';
};

// Get current stroke linejoin
const getCurrentStrokeLinejoin = (): string => {
  const styles = getCurrentTextPathStyles();
  const strokeLinejoin = styles?.strokeLinejoin;
  return typeof strokeLinejoin === 'string' ? strokeLinejoin : 'miter';
};

// Apply stroke dash to selected textpaths
const applyStrokeDash = (dash: string) => {
  applyTextPathStyle({ strokeDasharray: dash });
};

// Apply stroke linecap to selected textpaths
const applyStrokeLinecap = (linecap: string) => {
  applyTextPathStyle({ strokeLinecap: linecap });
};

// Apply stroke linejoin to selected textpaths
const applyStrokeLinejoin = (linejoin: string) => {
  applyTextPathStyle({ strokeLinejoin: linejoin });
};

// Apply stroke width to selected textpaths
const applyStrokeWidth = (width: string | number) => {
  const strokeWidth = typeof width === 'number' ? width : parseFloat(width);
  if (!isNaN(strokeWidth) && strokeWidth >= 0) {
    applyTextPathStyle({ strokeWidth });
  }
};

// Generic function to apply filters to textpaths
const applyFilterToTextPaths = (filterCreatorFn: () => any) => {
  const store = useEditorStore.getState();
  const selectedTextPaths = store.selection.selectedTextPaths || [];
  
  if (selectedTextPaths.length === 0) return;
  
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
      
      // Apply filter to each selected textpath
      selectedTextPaths.forEach(textPathId => {
        storeState.updateTextPathStyle(textPathId, { 
          filter: filterRef
        });
      });
    }
  }, 0);
};

// Specific filter functions for textpath
const applyBlurFilterToTextPath = () => applyFilterToTextPaths(createBlurFilter);
const applyDropShadowToTextPath = () => applyFilterToTextPaths(createDropShadowFilter);
const applyGrayscaleFilterToTextPath = () => applyFilterToTextPaths(createGrayscaleFilter);
const applySepiaFilterToTextPath = () => applyFilterToTextPaths(createSepiaFilter);
const applyEmbossFilterToTextPath = () => applyFilterToTextPaths(createEmbossFilter);
const applyGlowFilterToTextPath = () => applyFilterToTextPaths(createGlowFilter);
const applyNeonGlowFilterToTextPath = () => applyFilterToTextPaths(createNeonGlowFilter);

// Add fade animation to textpaths
const addFadeAnimationToTextPath = () => {
  const store = useEditorStore.getState();
  const selectedTextPaths = store.selection.selectedTextPaths || [];
  
  // Save to history before adding animations
  store.pushToHistory();
  
  selectedTextPaths.forEach(textPathId => {
    const opacityAnimation = {
      targetElementId: textPathId,
      type: 'animate' as const,
      attributeName: 'opacity',
      from: '1',
      to: '0.2',
      dur: '2s',
      repeatCount: 'indefinite'
    };
    
    store.addAnimation(opacityAnimation);
  });
};

// Add rotation animation to textpaths
const addRotateAnimationToTextPath = () => {
  const store = useEditorStore.getState();
  const selectedTextPaths = store.selection.selectedTextPaths || [];
  
  // Save to history before adding animations
  store.pushToHistory();
  
  selectedTextPaths.forEach(textPathId => {
    const textPath = store.textPaths.find(tp => tp.id === textPathId);
    if (textPath) {
      // For textpath rotation, we'll rotate around the path center
      const rotationAnimation = {
        targetElementId: textPathId,
        type: 'animateTransform' as const,
        attributeName: 'transform',
        transformType: 'rotate',
        from: `0 0 0`,
        to: `360 0 0`, 
        dur: '3s',
        repeatCount: 'indefinite'
      };
      
      store.addAnimation(rotationAnimation);
    }
  });
};

// Add scale animation to textpaths
const addScaleAnimationToTextPath = () => {
  const store = useEditorStore.getState();
  const selectedTextPaths = store.selection.selectedTextPaths || [];
  
  // Save to history before adding animations
  store.pushToHistory();
  
  selectedTextPaths.forEach(textPathId => {
    const textPath = store.textPaths.find(tp => tp.id === textPathId);
    if (textPath) {
      const scaleAnimation = {
        targetElementId: textPathId,
        type: 'animateTransform' as const,
        attributeName: 'transform',
        transformType: 'scale',
        from: '1 1',
        to: '1.2 1.2',
        dur: '1s',
        repeatCount: 'indefinite'
      };
      
      store.addAnimation(scaleAnimation);
    }
  });
};

// Check if a specific filter is active on selected textpaths
const isTextPathFilterActive = (filterType: string): boolean => {
  const store = useEditorStore.getState();
  const selectedTextPaths = store.selection.selectedTextPaths || [];
  
  if (selectedTextPaths.length === 0) return false;
  
  // Check if any selected textpath has a filter applied
  return selectedTextPaths.some(textPathId => {
    const textPath = store.textPaths.find(tp => tp.id === textPathId);
    const filterRef = textPath?.style?.filter;
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

// Check if a specific animation is active on selected textpaths
const isTextPathAnimationActive = (animationType: string): boolean => {
  const store = useEditorStore.getState();
  const selectedTextPaths = store.selection.selectedTextPaths || [];
  
  if (selectedTextPaths.length === 0) return false;
  
  // Check if any selected textpath has an animation applied
  return selectedTextPaths.some(textPathId => {
    return store.animations.some(animation => {
      if (animation.targetElementId !== textPathId) return false;
      
      switch (animationType) {
        case 'fade':
          return animation.type === 'animate' && (animation as any).attributeName === 'opacity';
        case 'rotate':
          return animation.type === 'animateTransform' && 
                 (animation as any).transformType === 'rotate';
        case 'scale':
          return animation.type === 'animateTransform' && 
                 (animation as any).transformType === 'scale';
        default:
          return false;
      }
    });
  });
};

// Remove specific filter from selected textpaths
const removeTextPathFilter = (filterType: string) => {
  const store = useEditorStore.getState();
  const selectedTextPaths = store.selection.selectedTextPaths || [];
  
  if (selectedTextPaths.length === 0) return;
  
  store.pushToHistory();
  
  selectedTextPaths.forEach(textPathId => {
    const textPath = store.textPaths.find(tp => tp.id === textPathId);
    if (!textPath) return;
    
    // Update the textpath style without the filter
    store.updateTextPathStyle(textPathId, { filter: undefined });
  });
};

// Remove specific animation from selected textpaths
const removeTextPathAnimation = (animationType: string) => {
  const store = useEditorStore.getState();
  const selectedTextPaths = store.selection.selectedTextPaths || [];
  
  if (selectedTextPaths.length === 0) return;
  
  store.pushToHistory();
  
  selectedTextPaths.forEach(textPathId => {
    // Find animations that match the type and target this textpath
    const animationsToRemove = store.animations.filter(animation => {
      if (animation.targetElementId !== textPathId) return false;
      
      switch (animationType) {
        case 'fade':
          return animation.type === 'animate' && (animation as any).attributeName === 'opacity';
        case 'rotate':
          return animation.type === 'animateTransform' && 
                 (animation as any).transformType === 'rotate';
        case 'scale':
          return animation.type === 'animateTransform' && 
                 (animation as any).transformType === 'scale';
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
const toggleTextPathFilter = (filterType: string, applyFunction: () => void) => {
  if (isTextPathFilterActive(filterType)) {
    removeTextPathFilter(filterType);
  } else {
    applyFunction();
  }
};

const toggleTextPathAnimation = (animationType: string, applyFunction: () => void) => {
  if (isTextPathAnimationActive(animationType)) {
    removeTextPathAnimation(animationType);
  } else {
    applyFunction();
  }
};

// Function to open animation panel for textpath
const openAnimationPanel = async () => {
  // Use pluginManager to open animation panel (handles both mobile and desktop)
  const { pluginManager } = await import('../../core/PluginSystem');
  pluginManager.openAnimationPanel();
};

// TextPath animation options
const textPathAnimationOptions = [
  { 
    id: 'textpath-fade', 
    label: 'Fade In/Out', 
    action: () => toggleTextPathAnimation('fade', addFadeAnimationToTextPath),
    active: () => isTextPathAnimationActive('fade')
  },
  { 
    id: 'textpath-rotate', 
    label: 'Rotate', 
    action: () => toggleTextPathAnimation('rotate', addRotateAnimationToTextPath),
    active: () => isTextPathAnimationActive('rotate')
  },
  { 
    id: 'textpath-scale', 
    label: 'Scale', 
    action: () => toggleTextPathAnimation('scale', addScaleAnimationToTextPath),
    active: () => isTextPathAnimationActive('scale')
  },
  { id: 'textpath-more-animations', label: 'More ...', action: openAnimationPanel }
];

// Function to open filter panel for textpath
const openFilterPanelForTextPath = async () => {
  // Use pluginManager to open filter panel (handles both mobile and desktop)
  const { pluginManager } = await import('../../core/PluginSystem');
  pluginManager.openFilterPanel();
};

// TextPath filter options - Essential 7 filters
const textPathFilterOptions = [
  { 
    id: 'textpath-blur', 
    label: 'Blur', 
    action: () => toggleTextPathFilter('blur', applyBlurFilterToTextPath),
    active: () => isTextPathFilterActive('blur')
  },
  { 
    id: 'textpath-shadow', 
    label: 'Drop Shadow', 
    action: () => toggleTextPathFilter('shadow', applyDropShadowToTextPath),
    active: () => isTextPathFilterActive('shadow')
  },
  { 
    id: 'textpath-glow', 
    label: 'Glow', 
    action: () => toggleTextPathFilter('glow', applyGlowFilterToTextPath),
    active: () => isTextPathFilterActive('glow')
  },
  { 
    id: 'textpath-grayscale', 
    label: 'Grayscale', 
    action: () => toggleTextPathFilter('grayscale', applyGrayscaleFilterToTextPath),
    active: () => isTextPathFilterActive('grayscale')
  },
  { 
    id: 'textpath-sepia', 
    label: 'Sepia', 
    action: () => toggleTextPathFilter('sepia', applySepiaFilterToTextPath),
    active: () => isTextPathFilterActive('sepia')
  },
  { 
    id: 'textpath-emboss', 
    label: 'Emboss', 
    action: () => toggleTextPathFilter('emboss', applyEmbossFilterToTextPath),
    active: () => isTextPathFilterActive('emboss')
  },
  { 
    id: 'textpath-neon-glow', 
    label: 'Neon Glow', 
    action: () => toggleTextPathFilter('neon-glow', applyNeonGlowFilterToTextPath),
    active: () => isTextPathFilterActive('neon-glow')
  },
  { id: 'textpath-more-filters', label: 'More ...', action: openFilterPanelForTextPath }
];

// Delete selected textpaths
const deleteTextPaths = () => {
  const store = useEditorStore.getState();
  const selectedTextPaths = store.selection.selectedTextPaths || [];
  
  // Save to history before deleting
  store.pushToHistory();
  
  selectedTextPaths.forEach(textPathId => {
    store.removeTextPath(textPathId);
  });
  
  // Clear selection
  store.clearSelection();
};

// Clear style for selected textpaths - reset to default values
const clearTextPathStyle = () => {
  const store = useEditorStore.getState();
  const selectedTextPaths = store.selection.selectedTextPaths || [];
  
  if (selectedTextPaths.length === 0) return;
  
  store.pushToHistory();
  
  // Define default textpath style values
  const defaultStyle = {
    fill: '#000000',
    stroke: undefined,
    strokeWidth: undefined,
    strokeDasharray: undefined,
    strokeLinecap: undefined,
    strokeLinejoin: undefined,
    filter: undefined,
    fontFamily: 'Arial',
    fontSize: 16,
    fontWeight: 'normal' as const,
    fontStyle: 'normal' as const,
    textAnchor: 'start' as const,
    textDecoration: undefined, // Reset underline/overline/line-through
    opacity: undefined,
    fillOpacity: undefined,
    strokeOpacity: undefined
  };
  
  // Apply default style to all selected textpaths
  selectedTextPaths.forEach(textPathId => {
    store.updateTextPathStyle(textPathId, defaultStyle);
  });
};

// Mobile textPath editing function
const startTextPathEditingMobile = () => {
  const store = useEditorStore.getState();
  
  // Get the first selected textPath
  if (store.selection.selectedTextPaths.length > 0) {
    const textPathToEdit = store.selection.selectedTextPaths[0];
    
    // Check if mobile
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Use mobile modal - dispatch global event
      window.dispatchEvent(new CustomEvent('openMobileTextEdit', {
        detail: { textId: textPathToEdit }
      }));
    } else {
      // Use desktop overlay system
      textEditManager.setEditorStore(store);
      textEditManager.startTextEdit(textPathToEdit);
    }
  }
};

// Check if exactly one textPath is selected for editing
const isExactlyOneTextPathSelectedForEdit = (): boolean => {
  const store = useEditorStore.getState();
  
  // Don't show edit button if already in text editing mode
  if (textEditManager.isEditing()) {
    return false;
  }
  
  return store.selection.selectedTextPaths.length === 1;
};

export const textPathFloatingActions: ToolbarAction[] = [
  {
    id: 'edit-textpath-mobile',
    icon: Edit3,
    label: 'Edit',
    type: 'button',
    action: startTextPathEditingMobile,
    priority: 1000, // Highest priority to appear first
    tooltip: 'Edit textPath content',
    visible: isExactlyOneTextPathSelectedForEdit
  },
  {
    id: 'textpath-font-family',
    icon: Type,
    label: 'Font Family',
    type: 'dropdown',
    dropdown: {
      options: fontFamilies,
      currentValue: getCurrentFontFamily()
    },
    priority: 995,
    tooltip: 'Change font family'
  },
  {
    id: 'textpath-bold',
    icon: Bold,
    label: 'Bold',
    type: 'toggle',
    toggle: {
      isActive: isTextBold,
      onToggle: () => {
        const isBold = isTextBold();
        applyTextPathStyle({ fontWeight: isBold ? 'normal' : 'bold' });
      }
    },
    priority: 990,
    tooltip: 'Toggle bold'
  },
  {
    id: 'textpath-italic',
    icon: Italic,
    label: 'Italic',
    type: 'toggle',
    toggle: {
      isActive: isTextItalic,
      onToggle: () => {
        const isItalic = isTextItalic();
        applyTextPathStyle({ fontStyle: isItalic ? 'normal' : 'italic' });
      }
    },
    priority: 980,
    tooltip: 'Toggle italic'
  },
  {
    id: 'textpath-underline',
    icon: Underline,
    label: 'Underline',
    type: 'toggle',
    toggle: {
      isActive: isTextUnderline,
      onToggle: () => {
        const isUnderline = isTextUnderline();
        applyTextPathStyle({ textDecoration: isUnderline ? 'none' : 'underline' });
      }
    },
    priority: 970,
    tooltip: 'Toggle underline'
  },
  {
    id: 'textpath-color',
    icon: Palette,
    label: 'Text Color',
    type: 'color',
    color: {
      currentColor: getCurrentTextColor(),
      onChange: (color: string | any) => applyTextPathStyle({ fill: color })
    },
    priority: 960,
    tooltip: 'Change text color'
  },
  {
    id: 'textpath-stroke-color',
    icon: Brush,
    label: 'Stroke Color',
    type: 'color',
    color: {
      currentColor: getCurrentStrokeColor(),
      onChange: (color: string | any) => applyTextPathStyle({ stroke: color })
    },
    priority: 950,
    tooltip: 'Change text stroke color'
  },
  {
    id: 'textpath-stroke-options',
    icon: LineSquiggle,
    label: 'Stroke Options',
    type: 'input',
    input: {
      currentValue: getCurrentStrokeWidth(),
      onChange: applyStrokeWidth,
      type: 'number',
      placeholder: '1'
    },
    strokeOptions: {
      getCurrentStrokeWidth: getCurrentStrokeWidth,
      getCurrentStrokeDash: getCurrentStrokeDash,
      getCurrentStrokeLinecap: getCurrentStrokeLinecap,
      getCurrentStrokeLinejoin: getCurrentStrokeLinejoin,
      onStrokeWidthChange: applyStrokeWidth,
      onStrokeDashChange: applyStrokeDash,
      onStrokeLinecapChange: applyStrokeLinecap,
      onStrokeLinejoinChange: applyStrokeLinejoin
    },
    priority: 940,
    tooltip: 'Configure stroke width, dash pattern, line cap, and line join'
  },
  {
    id: 'textpath-filters',
    icon: Filter,
    label: 'Filters',
    type: 'dropdown',
    dropdown: {
      options: textPathFilterOptions
    },
    priority: 930,
    tooltip: 'Apply filters'
  },
  {
    id: 'textpath-animations',
    icon: Play,
    label: 'Animations',
    type: 'dropdown',
    dropdown: {
      options: textPathAnimationOptions
    },
    priority: 920,
    tooltip: 'Add animations'
  },
  {
    id: 'textpath-clear-style',
    icon: RotateCcw,
    label: 'Reset',
    type: 'button',
    action: clearTextPathStyle,
    priority: 70,
    tooltip: 'Reset textpath to default style'
  },
  {
    id: 'textpath-delete',
    icon: Trash2,
    label: 'Delete',
    type: 'button',
    action: deleteTextPaths,
    priority: 10,
    destructive: true,
    tooltip: 'Delete textpath'
  }
];

export const textPathFloatingActionDefinition: FloatingActionDefinition = {
  elementTypes: ['textPath'],
  selectionTypes: ['single', 'multiple'],
  actions: textPathFloatingActions,
  priority: 100
};
