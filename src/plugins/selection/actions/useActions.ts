import { Copy, Trash2, Lock } from 'lucide-react';
import { ToolbarAction } from '../../../types/floatingToolbar';
import { useEditorStore } from '../../../store/editorStore';
import { duplicateSelected, deleteSelected } from './commonActions';

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

export const useActions: ToolbarAction[] = [
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