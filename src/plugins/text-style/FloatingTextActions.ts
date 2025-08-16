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
  Plus,
  Minus,
  RotateCcw,
  Edit,
  Brush,
  Filter
} from 'lucide-react';
import { FloatingActionDefinition, ToolbarAction } from '../../types/floatingToolbar';
import { useEditorStore } from '../../store/editorStore';
import { textEditManager } from '../../managers/TextEditManager';
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
const applyTextStyle = (styleUpdates: any) => {
  const store = useEditorStore.getState();
  const selectedTexts = store.selection.selectedTexts;
  
  selectedTexts.forEach(textId => {
    store.updateTextStyle(textId, styleUpdates);
  });
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
const applyInvertFilterToText = () => applyFilterToTexts(createInvertFilter);
const applyBrightnessFilterToText = () => applyFilterToTexts(createBrightnessFilter);
const applyContrastFilterToText = () => applyFilterToTexts(createContrastFilter);
const applySaturateFilterToText = () => applyFilterToTexts(createSaturateFilter);
const applyHueRotateFilterToText = () => applyFilterToTexts(createHueRotateFilter);
const applyEmbossFilterToText = () => applyFilterToTexts(createEmbossFilter);
const applySharpenFilterToText = () => applyFilterToTexts(createSharpenFilter);
const applyEdgeDetectFilterToText = () => applyFilterToTexts(createEdgeDetectFilter);
const applyGlowFilterToText = () => applyFilterToTexts(createGlowFilter);
const applyBevelFilterToText = () => applyFilterToTexts(createBevelFilter);
const applyMotionBlurFilterToText = () => applyFilterToTexts(createMotionBlurFilter);
const applyNoiseFilterToText = () => applyFilterToTexts(createNoiseFilter);
const applyWaveDistortionFilterToText = () => applyFilterToTexts(createWaveDistortionFilter);
const applyPosterizeFilterToText = () => applyFilterToTexts(createPosterizeFilter);
const applyOilPaintingFilterToText = () => applyFilterToTexts(createOilPaintingFilter);
const applyWatercolorFilterToText = () => applyFilterToTexts(createWatercolorFilter);
const applyVintageFilterToText = () => applyFilterToTexts(createVintageFilter);
const applyChromaticAberrationFilterToText = () => applyFilterToTexts(createChromaticAberrationFilter);
const applyNeonGlowFilterToText = () => applyFilterToTexts(createNeonGlowFilter);
const applyMosaicFilterToText = () => applyFilterToTexts(createMosaicFilter);
const applyGlitchFilterToText = () => applyFilterToTexts(createGlitchFilter);
const applyPixelateFilterToText = () => applyFilterToTexts(createPixelateFilter);
const applyDancingStrokeFilterToText = () => applyFilterToTexts(createDancingStrokeFilter);
const applySmokeFilterToText = () => applyFilterToTexts(createSmokeFilter);
const applyWavesFilterToText = () => applyFilterToTexts(createWavesFilter);
const applyPaperTextureFilterToText = () => applyFilterToTexts(createPaperTextureFilter);
const applyZebraFilterToText = () => applyFilterToTexts(createZebraFilter);
const applyNetFilterToText = () => applyFilterToTexts(createNetFilter);
const applyDustFilterToText = () => applyFilterToTexts(createDustFilter);
const applyColoredStripesFilterToText = () => applyFilterToTexts(createColoredStripesFilter);
const applyColoredSpotsFilterToText = () => applyFilterToTexts(createColoredSpotsFilter);
const applyColoredFlameFilterToText = () => applyFilterToTexts(createColoredFlameFilter);
const applyAdvancedWatercolorFilterToText = () => applyFilterToTexts(createAdvancedWatercolorFilter);

// Text filter options - Essential 7 filters
const textFilterOptions = [
  { id: 'text-blur', label: 'Blur', action: applyBlurFilterToText },
  { id: 'text-shadow', label: 'Drop Shadow', action: applyDropShadowToText },
  { id: 'text-glow', label: 'Glow', action: applyGlowFilterToText },
  { id: 'text-grayscale', label: 'Grayscale', action: applyGrayscaleFilterToText },
  { id: 'text-sepia', label: 'Sepia', action: applySepiaFilterToText },
  { id: 'text-emboss', label: 'Emboss', action: applyEmbossFilterToText },
  { id: 'text-neon-glow', label: 'Neon Glow', action: applyNeonGlowFilterToText }
];

// Duplicate selected texts using the built-in duplicateText method
const duplicateTexts = () => {
  const store = useEditorStore.getState();
  const selectedTexts = store.selection.selectedTexts;
  const newTextIds: string[] = [];
  
  selectedTexts.forEach(textId => {
    const newTextId = store.duplicateText(textId);
    if (newTextId) {
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

// Start editing text (same as double-click or F2)
const editText = () => {
  const store = useEditorStore.getState();
  
  if (store.selection.selectedTexts.length > 0) {
    const textId = store.selection.selectedTexts[0];
    textEditManager.startTextEdit(textId);
  }
};

// Delete selected texts
const deleteTexts = () => {
  const store = useEditorStore.getState();
  const selectedTexts = store.selection.selectedTexts;
  
  selectedTexts.forEach(textId => {
    store.deleteText(textId);
  });
  
  // Clear selection
  store.clearSelection();
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
    id: 'text-stroke-color',
    icon: Brush,
    label: 'Stroke Color',
    type: 'color',
    color: {
      currentColor: getCurrentStrokeColor(),
      onChange: (color: string | any) => applyTextStyle({ stroke: color })
    },
    priority: 65,
    tooltip: 'Change text stroke color'
  },
  {
    id: 'text-stroke-options',
    icon: Minus,
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
    priority: 60,
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
    priority: 55,
    tooltip: 'Apply filters'
  },
  {
    id: 'edit-text',
    icon: Edit,
    label: 'Edit Text',
    type: 'button',
    action: editText,
    priority: 50,
    tooltip: 'Edit text content (double-click/F2)'
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