import { Copy, Trash2, Lock, Group } from 'lucide-react';
import { ToolbarAction } from '../../../types/floatingToolbar';
import { useEditorStore } from '../../../store/editorStore';
import { duplicateSelected, deleteSelected, getSelectedElementsBounds } from './commonActions';
import { createGenericArrangeActions } from '../../../utils/floating-arrange-actions';
import { arrangeManager } from '../../../plugins/arrange/ArrangeManager';

// Check if selected use elements are locked
const areUsesLocked = (): boolean => {
  const store = useEditorStore.getState();
  const selectedUses = store.selection.selectedUses;
  
  if (selectedUses.length === 0) return false;
  
  return selectedUses.some(useId => {
    const use = store.uses.find(u => u.id === useId);
    return use?.locked === true;
  });
};

// Toggle use element lock
const toggleUseLock = () => {
  const store = useEditorStore.getState();
  const selectedUses = store.selection.selectedUses;
  
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
  const selectedUses = store.selection.selectedUses;
  
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

export const useActions: ToolbarAction[] = [
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
    id: 'use-lock',
    icon: Lock,
    label: 'Lock/Unlock',
    type: 'toggle',
    toggle: {
      isActive: areUsesLocked,
      onToggle: toggleUseLock
    },
    priority: 90,
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