import { Type, Bold, Italic, Underline, Palette, AlignLeft, AlignCenter, AlignRight, Copy, Trash2, LineSquiggle, Brush, Filter, Play, RotateCcw, Lock } from 'lucide-react';
import { FloatingActionDefinition, ToolbarAction } from '../../types/floatingToolbar';
import { useEditorStore } from '../../store/editorStore';
import { calculateSmartDuplicationOffset, getUnifiedSelectionBounds } from '../../utils/duplication-positioning';
import { generateId } from '../../utils/id-utils';
import { createDropShadowFilter, createBlurFilter, createGrayscaleFilter, createSepiaFilter, createEmbossFilter, createGlowFilter, createNeonGlowFilter, formatSVGReference, matchesFilterSignature } from '../../utils/svg-elements-utils';

// Get current text styles for selected texts
const getCurrentTextStyles = () => {
  const store = useEditorStore.getState();
  const selectedTexts = store.selection.selectedTexts || [];
  
  if (selectedTexts.length === 0) return null;
  
  const firstText = store.texts.find(t => t.id === selectedTexts[0]);
  return firstText?.style || {};
};

// Apply style to all selected texts
const applyTextStyle = (styleUpdates: any, saveToHistory: boolean = true) => {
  const store = useEditorStore.getState();
  const selectedTexts = store.selection.selectedTexts || [];
  
  if (saveToHistory) {
    store.pushToHistory();
  }
  
  selectedTexts.forEach(textId => {
    store.updateTextStyle(textId, styleUpdates);
  });
};

// Helper function to update text properties (position, transform, etc.) regardless of text type
const updateTextProperty = (textId: string, updates: any) => {
  const store = useEditorStore.getState();
  const textElement = store.texts.find(t => t.id === textId);
  if (textElement) {
    if (textElement.type === 'text') {
      store.updateText(textId, updates);
    } else if (textElement.type === 'multiline-text') {
      store.updateMultilineText(textId, updates);
    }
  }
};

// Get current font family
const getCurrentFontFamily = (): string => {
  const styles = getCurrentTextStyles();
  return styles?.fontFamily || 'Arial';
};

// Get current font size
const getCurrentFontSize = (): number => {
  const styles = getCurrentTextStyles();
  const fontSize = styles?.fontSize || '16';
  return parseInt(typeof fontSize === 'string' ? fontSize : '16');
};

// Get current text color
const getCurrentTextColor = (): string | any => {
  const styles = getCurrentTextStyles();
  const fill = styles?.fill;
  return fill || '#000000';
};

// Check if text is bold
const isTextBold = (): boolean => {
  const styles = getCurrentTextStyles();
  return styles?.fontWeight === 'bold';
};

// Check if text is italic
const isTextItalic = (): boolean => {
  const styles = getCurrentTextStyles();
  return styles?.fontStyle === 'italic';
};

// Check if text is underlined
const isTextUnderline = (): boolean => {
  const styles = getCurrentTextStyles();
  return styles?.textDecoration === 'underline';
};

// Get current text alignment
const getCurrentAlignment = (): string => {
  const styles = getCurrentTextStyles();
  return styles?.textAnchor || 'start';
};

// Font family options
const fontFamilies = [
  { id: 'arial', label: 'Arial', action: () => applyTextStyle({ fontFamily: 'Arial' }) },
  { id: 'helvetica', label: 'Helvetica', action: () => applyTextStyle({ fontFamily: 'Helvetica' }) },
  { id: 'times', label: 'Times New Roman', action: () => applyTextStyle({ fontFamily: 'Times New Roman' }) },
  { id: 'courier', label: 'Courier New', action: () => applyTextStyle({ fontFamily: 'Courier New' }) },
  { id: 'georgia', label: 'Georgia', action: () => applyTextStyle({ fontFamily: 'Georgia' }) },
  { id: 'verdana', label: 'Verdana', action: () => applyTextStyle({ fontFamily: 'Verdana' }) }
];

// Alignment options
const alignmentOptions = [
  { 
    id: 'left', 
    label: 'Left', 
    icon: AlignLeft,
    action: () => applyTextStyle({ textAnchor: 'start' }) 
  },
  { 
    id: 'center', 
    label: 'Center', 
    icon: AlignCenter,
    action: () => applyTextStyle({ textAnchor: 'middle' }) 
  },
  { 
    id: 'right', 
    label: 'Right', 
    icon: AlignRight,
    action: () => applyTextStyle({ textAnchor: 'end' }) 
  }
];

// Get current stroke color
const getCurrentStrokeColor = (): string | any => {
  const styles = getCurrentTextStyles();
  const stroke = styles?.stroke;
  return stroke || '#000000';
};

// Get current stroke width
const getCurrentStrokeWidth = (): number => {
  const styles = getCurrentTextStyles();
  const strokeWidth = styles?.strokeWidth;
  return typeof strokeWidth === 'number' ? strokeWidth : 1;
};

// Get current stroke dash
const getCurrentStrokeDash = (): string => {
  const styles = getCurrentTextStyles();
  const strokeDash = styles?.strokeDasharray;
  return typeof strokeDash === 'string' ? strokeDash : 'none';
};

// Get current stroke linecap
const getCurrentStrokeLinecap = (): string => {
  const styles = getCurrentTextStyles();
  const strokeLinecap = styles?.strokeLinecap;
  return typeof strokeLinecap === 'string' ? strokeLinecap : 'butt';
};

// Get current stroke linejoin
const getCurrentStrokeLinejoin = (): string => {
  const styles = getCurrentTextStyles();
  const strokeLinejoin = styles?.strokeLinejoin;
  return typeof strokeLinejoin === 'string' ? strokeLinejoin : 'miter';
};

// Apply stroke dash to selected texts
const applyStrokeDash = (dash: string) => {
  applyTextStyle({ strokeDasharray: dash });
};

// Apply stroke linecap to selected texts
const applyStrokeLinecap = (linecap: string) => {
  applyTextStyle({ strokeLinecap: linecap });
};

// Apply stroke linejoin to selected texts
const applyStrokeLinejoin = (linejoin: string) => {
  applyTextStyle({ strokeLinejoin: linejoin });
};

// Apply stroke width to selected texts
const applyStrokeWidth = (width: string | number) => {
  const strokeWidth = typeof width === 'number' ? width : parseFloat(width);
  if (!isNaN(strokeWidth) && strokeWidth >= 0) {
    applyTextStyle({ strokeWidth });
  }
};

// Generic function to apply filters to texts
const applyFilterToTexts = (filterCreatorFn: () => any) => {
  const store = useEditorStore.getState();
  const selectedTexts = store.selection.selectedTexts || [];
  
  if (selectedTexts.length === 0) return;
  
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
      
      // Apply filter to each selected text
      selectedTexts.forEach(textId => {
        storeState.updateTextStyle(textId, { 
          filter: filterRef
        });
      });
    }
  }, 0);
};

// Specific filter functions for text
const applyBlurFilterToText = () => applyFilterToTexts(createBlurFilter);
const applyDropShadowToText = () => applyFilterToTexts(createDropShadowFilter);
const applyGrayscaleFilterToText = () => applyFilterToTexts(createGrayscaleFilter);
const applySepiaFilterToText = () => applyFilterToTexts(createSepiaFilter);
const applyEmbossFilterToText = () => applyFilterToTexts(createEmbossFilter);
const applyGlowFilterToText = () => applyFilterToTexts(createGlowFilter);
const applyNeonGlowFilterToText = () => applyFilterToTexts(createNeonGlowFilter);

// Add fade animation to texts
const addFadeAnimationToText = () => {
  const store = useEditorStore.getState();
  const selectedTexts = store.selection.selectedTexts || [];
  
  // Save to history before adding animations
  store.pushToHistory();
  
  selectedTexts.forEach(textId => {
    const opacityAnimation = {
      targetElementId: textId,
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

// Add rotation animation to texts
const addRotateAnimationToText = () => {
  const store = useEditorStore.getState();
  const selectedTexts = store.selection.selectedTexts || [];
  
  // Save to history before adding animations
  store.pushToHistory();
  
  selectedTexts.forEach(textId => {
    const text = store.texts.find(t => t.id === textId);
    if (text) {
      const rotationAnimation = {
        targetElementId: textId,
        type: 'animateTransform' as const,
        attributeName: 'transform',
        transformType: 'rotate',
        from: `0 ${text.x} ${text.y}`,
        to: `360 ${text.x} ${text.y}`, 
        dur: '3s',
        repeatCount: 'indefinite'
      };
      
      store.addAnimation(rotationAnimation);
    }
  });
};

// Add scale animation to texts
const addScaleAnimationToText = () => {
  const store = useEditorStore.getState();
  const selectedTexts = store.selection.selectedTexts || [];
  
  // Save to history before adding animations
  store.pushToHistory();
  
  selectedTexts.forEach(textId => {
    const text = store.texts.find(t => t.id === textId);
    if (text) {
      const scaleAnimation = {
        targetElementId: textId,
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

// Check if a specific filter is active on selected texts
const isTextFilterActive = (filterType: string): boolean => {
  const store = useEditorStore.getState();
  const selectedTexts = store.selection.selectedTexts || [];
  
  if (selectedTexts.length === 0) return false;
  
  // Check if any selected text has a filter applied
  return selectedTexts.some(textId => {
    const text = store.texts.find(t => t.id === textId);
    const filterRef = text?.style?.filter;
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

// Check if a specific animation is active on selected texts
const isTextAnimationActive = (animationType: string): boolean => {
  const store = useEditorStore.getState();
  const selectedTexts = store.selection.selectedTexts || [];
  
  if (selectedTexts.length === 0) return false;
  
  // Check if any selected text has an animation applied
  return selectedTexts.some(textId => {
    return store.animations.some(animation => {
      if (animation.targetElementId !== textId) return false;
      
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

// Remove specific filter from selected texts
const removeTextFilter = (filterType: string) => {
  const store = useEditorStore.getState();
  const selectedTexts = store.selection.selectedTexts || [];
  
  if (selectedTexts.length === 0) return;
  
  store.pushToHistory();
  
  selectedTexts.forEach(textId => {
    const text = store.texts.find(t => t.id === textId);
    if (!text) return;
    
    // Create a new style object without the filter property
    const currentStyle = text.style || {};
    const { filter, ...newStyle } = currentStyle;
    
    // Update the text style without the filter
    store.updateTextStyle(textId, { filter: undefined });
  });
};

// Remove specific animation from selected texts
const removeTextAnimation = (animationType: string) => {
  const store = useEditorStore.getState();
  const selectedTexts = store.selection.selectedTexts || [];
  
  if (selectedTexts.length === 0) return;
  
  store.pushToHistory();
  
  selectedTexts.forEach(textId => {
    // Find animations that match the type and target this text
    const animationsToRemove = store.animations.filter(animation => {
      if (animation.targetElementId !== textId) return false;
      
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
const toggleTextFilter = (filterType: string, applyFunction: () => void) => {
  if (isTextFilterActive(filterType)) {
    removeTextFilter(filterType);
  } else {
    applyFunction();
  }
};

const toggleTextAnimation = (animationType: string, applyFunction: () => void) => {
  if (isTextAnimationActive(animationType)) {
    removeTextAnimation(animationType);
  } else {
    applyFunction();
  }
};

// Function to open animation panel for text
const openAnimationPanel = async () => {
  // Use pluginManager to open animation panel (handles both mobile and desktop)
  const { pluginManager } = await import('../../core/PluginSystem');
  pluginManager.openAnimationPanel();
};

// Text animation options
const textAnimationOptions = [
  { 
    id: 'text-fade', 
    label: 'Fade In/Out', 
    action: () => toggleTextAnimation('fade', addFadeAnimationToText),
    active: () => isTextAnimationActive('fade')
  },
  { 
    id: 'text-rotate', 
    label: 'Rotate', 
    action: () => toggleTextAnimation('rotate', addRotateAnimationToText),
    active: () => isTextAnimationActive('rotate')
  },
  { 
    id: 'text-scale', 
    label: 'Scale', 
    action: () => toggleTextAnimation('scale', addScaleAnimationToText),
    active: () => isTextAnimationActive('scale')
  },
  { id: 'text-more-animations', label: 'More ...', action: openAnimationPanel }
];



// Function to open filter panel for text
const openFilterPanelForText = async () => {
  // Use pluginManager to open filter panel (handles both mobile and desktop)
  const { pluginManager } = await import('../../core/PluginSystem');
  pluginManager.openFilterPanel();
};

// Text filter options - Essential 7 filters
const textFilterOptions = [
  { 
    id: 'text-blur', 
    label: 'Blur', 
    action: () => toggleTextFilter('blur', applyBlurFilterToText),
    active: () => isTextFilterActive('blur')
  },
  { 
    id: 'text-shadow', 
    label: 'Drop Shadow', 
    action: () => toggleTextFilter('shadow', applyDropShadowToText),
    active: () => isTextFilterActive('shadow')
  },
  { 
    id: 'text-glow', 
    label: 'Glow', 
    action: () => toggleTextFilter('glow', applyGlowFilterToText),
    active: () => isTextFilterActive('glow')
  },
  { 
    id: 'text-grayscale', 
    label: 'Grayscale', 
    action: () => toggleTextFilter('grayscale', applyGrayscaleFilterToText),
    active: () => isTextFilterActive('grayscale')
  },
  { 
    id: 'text-sepia', 
    label: 'Sepia', 
    action: () => toggleTextFilter('sepia', applySepiaFilterToText),
    active: () => isTextFilterActive('sepia')
  },
  { 
    id: 'text-emboss', 
    label: 'Emboss', 
    action: () => toggleTextFilter('emboss', applyEmbossFilterToText),
    active: () => isTextFilterActive('emboss')
  },
  { 
    id: 'text-neon-glow', 
    label: 'Neon Glow', 
    action: () => toggleTextFilter('neon-glow', applyNeonGlowFilterToText),
    active: () => isTextFilterActive('neon-glow')
  },
  { id: 'text-more-filters', label: 'More ...', action: openFilterPanelForText }
];

// Duplicate selected texts using the built-in duplicateText method with smart positioning
const duplicateTexts = () => {
  const store = useEditorStore.getState();
  store.pushToHistory();
  
  const selectedTexts = store.selection.selectedTexts || [];
  if (selectedTexts.length === 0) return;
  
  // Get the unified bounds of all selected texts
  const unifiedBounds = getUnifiedSelectionBounds(store.selection);
  if (!unifiedBounds) return;
  
  // Calculate offset for positioning from bottom-right corner
  const offset = calculateSmartDuplicationOffset(store.selection);
  
  // Calculate the bottom-right corner of the entire selection
  const bottomRightX = unifiedBounds.x + unifiedBounds.width;
  const bottomRightY = unifiedBounds.y + unifiedBounds.height;
  
  // The target position for the duplicated selection's top-left corner
  const targetTopLeftX = bottomRightX + (offset.x - unifiedBounds.width);
  const targetTopLeftY = bottomRightY + (offset.y - unifiedBounds.height);
  
  const newTextIds: string[] = [];
  
  selectedTexts.forEach(textId => {
    const text = store.texts.find(t => t.id === textId);
    if (text) {
      const newTextId = generateId();
      
      // Calculate relative position within the original selection
      const relativeX = text.x - unifiedBounds.x;
      const relativeY = text.y - unifiedBounds.y;
      
      // Position in the duplicated selection maintaining relative position
      const newText = {
        ...text,
        id: newTextId,
        x: targetTopLeftX + relativeX,
        y: targetTopLeftY + relativeY
      };
      
      useEditorStore.setState(state => ({
        texts: [...state.texts, newText]
      }));
      newTextIds.push(newTextId);
    }
  });
  
  // Select the new duplicated texts
  if (newTextIds.length > 0) {
    store.clearSelection();
    newTextIds.forEach((textId, index) => {
      store.selectText(textId, index > 0);
    });
  }
};


// Lock/unlock selected texts
const toggleTextLock = () => {
  const store = useEditorStore.getState();
  const selectedTexts = store.selection.selectedTexts || [];
  
  if (selectedTexts.length === 0) return;
  
  store.pushToHistory();
  
  // Determine if we should lock or unlock based on the first selected text
  const firstText = store.texts.find(text => text.id === selectedTexts[0]);
  const shouldLock = !firstText?.locked;
  
  // Apply lock/unlock to all selected texts
  selectedTexts.forEach(textId => {
    const textElement = store.texts.find(t => t.id === textId);
    if (textElement) {
      if (textElement.type === 'text') {
        store.updateText(textId, { locked: shouldLock });
      } else if (textElement.type === 'multiline-text') {
        store.updateMultilineText(textId, { locked: shouldLock });
      }
    }
  });
  
  // If locking, clear selection as locked texts shouldn't be selectable
  if (shouldLock) {
    store.clearSelection();
  }
};

// Check if selected texts are locked
const areTextsLocked = (): boolean => {
  const store = useEditorStore.getState();
  const selectedTexts = store.selection.selectedTexts || [];
  
  if (selectedTexts.length === 0) return false;
  
  // Check if any of the selected texts are locked
  return selectedTexts.some(textId => {
    const text = store.texts.find(t => t.id === textId);
    return text?.locked === true;
  });
};

// Delete selected texts
const deleteTexts = () => {
  const store = useEditorStore.getState();
  const selectedTexts = store.selection.selectedTexts || [];
  
  // Save to history before deleting
  store.pushToHistory();
  
  selectedTexts.forEach(textId => {
    store.deleteText(textId);
  });
  
  // Clear selection
  store.clearSelection();
};

// Clear style for selected texts - reset to default values
const clearTextStyle = () => {
  const store = useEditorStore.getState();
  const selectedTexts = store.selection.selectedTexts || [];
  
  if (selectedTexts.length === 0) return;
  
  store.pushToHistory();
  
  // Define default text style values
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
  
  // Apply default style to all selected texts
  selectedTexts.forEach(textId => {
    store.updateTextStyle(textId, defaultStyle);
  });
};

export const textFloatingActions: ToolbarAction[] = [
  {
    id: 'font-family',
    icon: Type,
    label: 'Font Family',
    type: 'dropdown',
    dropdown: {
      options: fontFamilies,
      currentValue: getCurrentFontFamily()
    },
    priority: 960,
    tooltip: 'Change font family'
  },
  {
    id: 'bold',
    icon: Bold,
    label: 'Bold',
    type: 'toggle',
    toggle: {
      isActive: isTextBold,
      onToggle: () => {
        const isBold = isTextBold();
        applyTextStyle({ fontWeight: isBold ? 'normal' : 'bold' });
      }
    },
    priority: 920,
    tooltip: 'Toggle bold'
  },
  {
    id: 'italic',
    icon: Italic,
    label: 'Italic',
    type: 'toggle',
    toggle: {
      isActive: isTextItalic,
      onToggle: () => {
        const isItalic = isTextItalic();
        applyTextStyle({ fontStyle: isItalic ? 'normal' : 'italic' });
      }
    },
    priority: 910,
    tooltip: 'Toggle italic'
  },
  {
    id: 'underline',
    icon: Underline,
    label: 'Underline',
    type: 'toggle',
    toggle: {
      isActive: isTextUnderline,
      onToggle: () => {
        const isUnderline = isTextUnderline();
        applyTextStyle({ textDecoration: isUnderline ? 'none' : 'underline' });
      }
    },
    priority: 900,
    tooltip: 'Toggle underline'
  },
  {
    id: 'text-color',
    icon: Palette,
    label: 'Text Color',
    type: 'color',
    color: {
      currentColor: getCurrentTextColor(),
      onChange: (color: string | any) => applyTextStyle({ fill: color })
    },
    priority: 990,
    tooltip: 'Change text color'
  },
  {
    id: 'text-stroke-color',
    icon: Brush,
    label: 'Stroke Color',
    type: 'color',
    color: {
      currentColor: getCurrentStrokeColor(),
      onChange: (color: string | any) => applyTextStyle({ stroke: color })
    },
    priority: 980,
    tooltip: 'Change text stroke color'
  },
  {
    id: 'text-stroke-options',
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
    priority: 970,
    tooltip: 'Configure stroke width, dash pattern, line cap, and line join'
  },
  {
    id: 'text-filters',
    icon: Filter,
    label: 'Filters',
    type: 'dropdown',
    dropdown: {
      options: textFilterOptions
    },
    priority: 950,
    tooltip: 'Apply filters'
  },
  {
    id: 'text-animations',
    icon: Play,
    label: 'Animations',
    type: 'dropdown',
    dropdown: {
      options: textAnimationOptions
    },
    priority: 945,
    tooltip: 'Add animations'
  },
  {
    id: 'duplicate-text',
    icon: Copy,
    label: 'Duplicate',
    type: 'button',
    action: duplicateTexts,
    priority: 80,
    tooltip: 'Duplicate text with all styles'
  },
  {
    id: 'clear-text-style',
    icon: RotateCcw,
    label: 'Reset',
    type: 'button',
    action: clearTextStyle,
    priority: 70,
    tooltip: 'Reset text to default style'
  },
  {
    id: 'text-lock',
    icon: Lock,
    label: 'Lock/Unlock',
    type: 'toggle',
    toggle: {
      isActive: areTextsLocked,
      onToggle: toggleTextLock
    },
    priority: 60,
    tooltip: 'Toggle text lock state'
  },
  {
    id: 'delete-text',
    icon: Trash2,
    label: 'Delete',
    type: 'button',
    action: deleteTexts,
    priority: 10,
    destructive: true,
    tooltip: 'Delete text'
  }
];

export const textFloatingActionDefinition: FloatingActionDefinition = {
  elementTypes: ['text'],
  selectionTypes: ['single', 'multiple'],
  actions: textFloatingActions,
  priority: 100
};