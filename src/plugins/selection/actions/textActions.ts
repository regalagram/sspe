import { Copy, Trash2, Lock, Group } from 'lucide-react';
import { ToolbarAction } from '../../../types/floatingToolbar';
import { useEditorStore } from '../../../store/editorStore';
import { duplicateSelected, deleteSelected } from './commonActions';

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

export const textActions: ToolbarAction[] = [
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
    priority: 90,
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