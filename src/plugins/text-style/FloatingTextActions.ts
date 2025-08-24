import { 
  Type, 
  Bold, 
  Italic, 
  Palette, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Copy, 
  Trash2,
  LineSquiggle,
  Edit,
  Brush,
  Filter,
  Play,
  RotateCcw,
  Lock
} from 'lucide-react';
import { FloatingActionDefinition, ToolbarAction } from '../../types/floatingToolbar';
import { useEditorStore } from '../../store/editorStore';
import { textEditManager } from '../../managers/TextEditManager';
import { getTextBoundingBox, getImageBoundingBox, getPathBoundingBox, getGroupBoundingBox } from '../../utils/bbox-utils';
import { BoundingBox } from '../../types';
import {
  createDropShadowFilter,
  createBlurFilter,
  createGrayscaleFilter,
  createSepiaFilter,
  createInvertFilter,
  createBrightnessFilter,
  createContrastFilter,
  createSaturateFilter,
  createHueRotateFilter,
  createEmbossFilter,
  createSharpenFilter,
  createEdgeDetectFilter,
  createGlowFilter,
  createBevelFilter,
  createMotionBlurFilter,
  createNoiseFilter,
  createWaveDistortionFilter,
  createPosterizeFilter,
  createOilPaintingFilter,
  createWatercolorFilter,
  createVintageFilter,
  createChromaticAberrationFilter,
  createNeonGlowFilter,
  createMosaicFilter,
  createGlitchFilter,
  createPixelateFilter,
  createDancingStrokeFilter,
  createSmokeFilter,
  createWavesFilter,
  createPaperTextureFilter,
  createZebraFilter,
  createNetFilter,
  createDustFilter,
  createColoredStripesFilter,
  createColoredSpotsFilter,
  createColoredFlameFilter,
  createAdvancedWatercolorFilter,
  formatSVGReference
} from '../../utils/svg-elements-utils';

// Get current text styles for selected texts
const getCurrentTextStyles = () => {
  const store = useEditorStore.getState();
  const selectedTexts = store.selection.selectedTexts;
  
  if (selectedTexts.length === 0) return null;
  
  const firstText = store.texts.find(t => t.id === selectedTexts[0]);
  return firstText?.style || {};
};

// Apply style to all selected texts
const applyTextStyle = (styleUpdates: any, saveToHistory: boolean = true) => {
  const store = useEditorStore.getState();
  const selectedTexts = store.selection.selectedTexts;
  
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
  const selectedTexts = store.selection.selectedTexts;
  
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
  const selectedTexts = store.selection.selectedTexts;
  
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
  const selectedTexts = store.selection.selectedTexts;
  
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
  const selectedTexts = store.selection.selectedTexts;
  
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
    action: addFadeAnimationToText 
  },
  { 
    id: 'text-rotate', 
    label: 'Rotate', 
    action: addRotateAnimationToText 
  },
  { 
    id: 'text-scale', 
    label: 'Scale', 
    action: addScaleAnimationToText 
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
  { id: 'text-blur', label: 'Blur', action: applyBlurFilterToText },
  { id: 'text-shadow', label: 'Drop Shadow', action: applyDropShadowToText },
  { id: 'text-glow', label: 'Glow', action: applyGlowFilterToText },
  { id: 'text-grayscale', label: 'Grayscale', action: applyGrayscaleFilterToText },
  { id: 'text-sepia', label: 'Sepia', action: applySepiaFilterToText },
  { id: 'text-emboss', label: 'Emboss', action: applyEmbossFilterToText },
  { id: 'text-neon-glow', label: 'Neon Glow', action: applyNeonGlowFilterToText },
  { id: 'text-more-filters', label: 'More ...', action: openFilterPanelForText }
];

// Calculate bounding box of all selected elements
const getSelectedElementsBounds = (): BoundingBox | null => {
  const store = useEditorStore.getState();
  const { selection, paths, texts, images, uses, groups } = store;
  
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let hasElements = false;

  // Include selected paths
  selection.selectedPaths.forEach(pathId => {
    const path = paths.find(p => p.id === pathId);
    if (path) {
      const bbox = getPathBoundingBox(path);
      if (bbox) {
        minX = Math.min(minX, bbox.x);
        maxX = Math.max(maxX, bbox.x + bbox.width);
        minY = Math.min(minY, bbox.y);
        maxY = Math.max(maxY, bbox.y + bbox.height);
        hasElements = true;
      }
    }
  });

  // Include selected texts
  selection.selectedTexts.forEach(textId => {
    const text = texts.find(t => t.id === textId);
    if (text) {
      const bbox = getTextBoundingBox(text);
      minX = Math.min(minX, bbox.x);
      maxX = Math.max(maxX, bbox.x + bbox.width);
      minY = Math.min(minY, bbox.y);
      maxY = Math.max(maxY, bbox.y + bbox.height);
      hasElements = true;
    }
  });

  // Include selected images
  selection.selectedImages.forEach(imageId => {
    const image = images.find(img => img.id === imageId);
    if (image) {
      const bbox = getImageBoundingBox(image);
      minX = Math.min(minX, bbox.x);
      maxX = Math.max(maxX, bbox.x + bbox.width);
      minY = Math.min(minY, bbox.y);
      maxY = Math.max(maxY, bbox.y + bbox.height);
      hasElements = true;
    }
  });

  // Include selected use elements
  selection.selectedUses.forEach(useId => {
    const use = uses.find(u => u.id === useId);
    if (use) {
      const bbox = {
        x: use.x || 0,
        y: use.y || 0,
        width: use.width || 50,
        height: use.height || 50
      };
      minX = Math.min(minX, bbox.x);
      maxX = Math.max(maxX, bbox.x + bbox.width);
      minY = Math.min(minY, bbox.y);
      maxY = Math.max(maxY, bbox.y + bbox.height);
      hasElements = true;
    }
  });

  // Include selected groups
  selection.selectedGroups.forEach(groupId => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      const bbox = getGroupBoundingBox(group, paths, texts, images, groups);
      minX = Math.min(minX, bbox.x);
      maxX = Math.max(maxX, bbox.x + bbox.width);
      minY = Math.min(minY, bbox.y);
      maxY = Math.max(maxY, bbox.y + bbox.height);
      hasElements = true;
    }
  });

  if (!hasElements) {
    return null;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
};

// Duplicate selected texts using the built-in duplicateText method with dynamic offset
const duplicateTexts = () => {
  const store = useEditorStore.getState();
  store.pushToHistory();
  
  // Calculate dynamic offset based on all selected elements
  const bounds = getSelectedElementsBounds();
  const OFFSET = 32;
  const dx = bounds ? (bounds.width > 0 ? bounds.width + OFFSET : OFFSET) : OFFSET;
  const dy = bounds ? (bounds.height > 0 ? bounds.height + OFFSET : OFFSET) : OFFSET;
  
  const selectedTexts = store.selection.selectedTexts;
  const newTextIds: string[] = [];
  
  selectedTexts.forEach(textId => {
    const newTextId = store.duplicateText(textId);
    if (newTextId) {
      newTextIds.push(newTextId);
      // Update position with dynamic offset instead of the default 20px
      const newText = store.texts.find(t => t.id === newTextId);
      if (newText) {
        store.updateText(newTextId, {
          x: newText.x - 20 + dx, // Remove default 20px offset and apply dynamic offset
          y: newText.y - 20 + dy
        });
      }
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

// Start editing text (same as double-click or F2)
const editText = () => {
  const store = useEditorStore.getState();
  
  if (store.selection.selectedTexts.length > 0) {
    const textId = store.selection.selectedTexts[0];
    textEditManager.startTextEdit(textId);
  }
};

// Lock/unlock selected texts
const toggleTextLock = () => {
  const store = useEditorStore.getState();
  const selectedTexts = store.selection.selectedTexts;
  
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
  const selectedTexts = store.selection.selectedTexts;
  
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
  const selectedTexts = store.selection.selectedTexts;
  
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
  const selectedTexts = store.selection.selectedTexts;
  
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
    opacity: undefined,
    fillOpacity: undefined,
    strokeOpacity: undefined
  };
  
  // Apply default style to all selected texts
  selectedTexts.forEach(textId => {
    store.updateTextStyle(textId, defaultStyle);
  });
};

// Convert text to path
const convertTextToPath = () => {
  // This would need to be implemented in the text plugin
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
    priority: 100,
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
    priority: 80,
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
    priority: 79,
    tooltip: 'Toggle italic'
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
    priority: 70,
    tooltip: 'Change text color'
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
    priority: 65,
    tooltip: 'Configure stroke width, dash pattern, line cap, and line join'
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
    priority: 60,
    tooltip: 'Change text stroke color'
  },
  {
    id: 'text-filters',
    icon: Filter,
    label: 'Filters',
    type: 'dropdown',
    dropdown: {
      options: textFilterOptions
    },
    priority: 55,
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
    priority: 52,
    tooltip: 'Add animations'
  },
  {
    id: 'edit-text',
    icon: Edit,
    label: 'Edit Text',
    type: 'button',
    action: editText,
    priority: 50,
    tooltip: 'Edit text content (double-click/F2)',
    visible: () => {
      // Only show when exactly one text is selected and nothing else
      const store = useEditorStore.getState();
      const selection = store.selection;
      return selection.selectedTexts.length === 1 &&
             selection.selectedPaths.length === 0 &&
             selection.selectedSubPaths.length === 0 &&
             selection.selectedCommands.length === 0 &&
             selection.selectedGroups.length === 0 &&
             selection.selectedImages.length === 0 &&
             selection.selectedUses.length === 0;
    }
  },
  {
    id: 'duplicate-text',
    icon: Copy,
    label: 'Duplicate',
    type: 'button',
    action: duplicateTexts,
    priority: 20,
    tooltip: 'Duplicate text with all styles'
  },
  {
    id: 'clear-text-style',
    icon: RotateCcw,
    label: 'Clear Style',
    type: 'button',
    action: clearTextStyle,
    priority: 15,
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
    priority: 12,
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