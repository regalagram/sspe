import { Copy, Trash2, Lock, Group, PaintBucket } from 'lucide-react';
import { ToolbarAction } from '../../../types/floatingToolbar';
import { useEditorStore } from '../../../store/editorStore';
import { duplicateSelected, deleteSelected } from './commonActions';
import { createGenericArrangeActions } from '../../../utils/floating-arrange-actions';
import { createReorderActions, createElementReorderFunctions } from '../../../utils/floating-reorder-actions';
import { arrangeManager } from '../../../plugins/arrange/ArrangeManager';

// Check if selected texts are locked
const areTextsLocked = (): boolean => {
  const store = useEditorStore.getState();
  const selectedTexts = store.selection.selectedTexts;
  
  if (selectedTexts.length === 0) return false;
  
  return selectedTexts.some(textId => {
    const text = store.texts.find(t => t.id === textId);
    return text?.locked === true;
  });
};

// Toggle text lock
const toggleTextLock = () => {
  const store = useEditorStore.getState();
  const selectedTexts = store.selection.selectedTexts;
  
  if (selectedTexts.length === 0) return;
  
  store.pushToHistory();
  
  // Determine if we should lock or unlock based on the first selected text
  const firstText = store.texts.find(t => t.id === selectedTexts[0]);
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

// Group selected texts
const groupSelectedTexts = () => {
  const store = useEditorStore.getState();
  const hasSelection = store.selection.selectedTexts.length >= 2;
  
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

// Check if text format copy is active
const isTextFormatCopyActive = (): boolean => {
  const store = useEditorStore.getState();
  return store.isTextFormatCopyActive ? store.isTextFormatCopyActive() : false;
};

// Start text format copy
const startTextFormatCopy = () => {
  const store = useEditorStore.getState();
  
  // Check if text format copy is already active - if so, cancel it
  if (store.isTextFormatCopyActive && store.isTextFormatCopyActive()) {
    store.cancelTextFormatCopy();
    return;
  }
  
  const selectedTexts = store.selection.selectedTexts;
  const selectedTextPaths = store.selection.selectedTextPaths;
  
  // Get the first selected text (prefer regular texts over textPaths)
  let sourceTextId: string | null = null;
  
  if (selectedTexts.length > 0) {
    sourceTextId = selectedTexts[0];
  } else if (selectedTextPaths.length > 0) {
    sourceTextId = selectedTextPaths[0];
  }
  
  if (sourceTextId) {
    store.startTextFormatCopy(sourceTextId);
  }
};

// Check if selected texts are compatible for format copying
const areTextsCompatibleForFormatCopy = (): boolean => {
  const store = useEditorStore.getState();
  const selectedTexts = store.selection.selectedTexts;
  const selectedTextPaths = store.selection.selectedTextPaths;
  
  // Only show for exactly one text selected (not multiple)
  const totalSelected = selectedTexts.length + selectedTextPaths.length;
  return totalSelected === 1;
};

// Text arrange actions helper functions
const getTextSelectionCount = () => {
  const store = useEditorStore.getState();
  return store.selection.selectedTexts.length + store.selection.selectedTextPaths.length;
};

const setupArrangeManagerForText = () => {
  const store = useEditorStore.getState();
  arrangeManager.setEditorStore(store);
};

// Create text-specific arrange actions using the new reusable component
const createTextArrangeActions = () => createGenericArrangeActions(
  'texts',
  getTextSelectionCount,
  {
    alignLeft: () => {
      setupArrangeManagerForText();
      arrangeManager.alignLeft();
    },
    alignCenter: () => {
      setupArrangeManagerForText();
      arrangeManager.alignCenter();
    },
    alignRight: () => {
      setupArrangeManagerForText();
      arrangeManager.alignRight();
    },
    alignTop: () => {
      setupArrangeManagerForText();
      arrangeManager.alignTop();
    },
    alignMiddle: () => {
      setupArrangeManagerForText();
      arrangeManager.alignMiddle();
    },
    alignBottom: () => {
      setupArrangeManagerForText();
      arrangeManager.alignBottom();
    },
    distributeHorizontally: () => {
      setupArrangeManagerForText();
      arrangeManager.distributeHorizontally();
    },
    distributeVertically: () => {
      setupArrangeManagerForText();
      arrangeManager.distributeVertically();
    }
  }
);

// Text reorder functions
const createTextReorderActions = () => {
  const { bringToFront, sendToBack, sendForward, sendBackward } = createElementReorderFunctions('text');
  
  return createReorderActions(
    'text',
    getTextSelectionCount,
    { bringToFront, sendToBack, sendForward, sendBackward }
  );
};


export const textActions: ToolbarAction[] = [
  {
    id: 'copy-text-format',
    icon: PaintBucket,
    label: 'Copy Format',
    type: 'toggle',
    toggle: {
      isActive: isTextFormatCopyActive,
      onToggle: startTextFormatCopy
    },
    priority: 1000,
    tooltip: 'Copy text format (font, style, effects)',
    visible: areTextsCompatibleForFormatCopy
  },
  {
    id: 'group-texts',
    icon: Group,
    label: 'Group',
    type: 'button',
    action: groupSelectedTexts,
    priority: 100,
    tooltip: 'Group selected texts',
    visible: () => {
      // Only show when multiple texts are selected
      const store = useEditorStore.getState();
      return store.selection.selectedTexts.length >= 2;
    }
  },
  // Add arrange actions for text elements using the new reusable component
  ...createTextArrangeActions(),
  // Add reorder actions for text elements
  ...createTextReorderActions(),
  {
    id: 'duplicate-text',
    icon: Copy,
    label: 'Duplicate',
    type: 'button',
    action: duplicateSelected, // Use unified duplicate function
    priority: 80,
    tooltip: 'Duplicate text'
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
    action: deleteSelected, // Use unified delete function
    priority: 10,
    destructive: true,
    tooltip: 'Delete text'
  }
];