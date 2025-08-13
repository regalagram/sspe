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
  Brush
} from 'lucide-react';
import { FloatingActionDefinition, ToolbarAction } from '../../types/floatingToolbar';
import { useEditorStore } from '../../store/editorStore';
import { textEditManager } from '../../managers/TextEditManager';

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
const getCurrentTextColor = (): string => {
  const styles = getCurrentTextStyles();
  const fill = styles?.fill;
  return typeof fill === 'string' ? fill : '#000000';
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
const getCurrentStrokeColor = (): string => {
  const styles = getCurrentTextStyles();
  const stroke = styles?.stroke;
  return typeof stroke === 'string' ? stroke : '#000000';
};

// Get current stroke width
const getCurrentStrokeWidth = (): number => {
  const styles = getCurrentTextStyles();
  const strokeWidth = styles?.strokeWidth;
  return typeof strokeWidth === 'number' ? strokeWidth : 1;
};

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
    id: 'font-size-increase',
    icon: Plus,
    label: 'Increase Size',
    type: 'button',
    action: () => {
      const currentSize = getCurrentFontSize();
      applyTextStyle({ fontSize: `${currentSize + 2}px` });
    },
    priority: 90,
    tooltip: 'Increase font size'
  },
  {
    id: 'font-size-decrease',
    icon: Minus,
    label: 'Decrease Size',
    type: 'button',
    action: () => {
      const currentSize = getCurrentFontSize();
      applyTextStyle({ fontSize: `${Math.max(8, currentSize - 2)}px` });
    },
    priority: 89,
    tooltip: 'Decrease font size'
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
      onChange: (color: string) => applyTextStyle({ fill: color })
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
      onChange: (color: string) => applyTextStyle({ stroke: color })
    },
    priority: 65,
    tooltip: 'Change text stroke color'
  },
  {
    id: 'text-stroke-width',
    icon: Brush,
    label: 'Stroke Width',
    type: 'input',
    input: {
      currentValue: getCurrentStrokeWidth(),
      onChange: (value: string | number) => {
        const width = typeof value === 'number' ? value : parseFloat(value);
        if (!isNaN(width) && width >= 0) {
          applyTextStyle({ strokeWidth: width });
        }
      },
      type: 'number',
      placeholder: '1'
    },
    priority: 60,
    tooltip: 'Change stroke width'
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