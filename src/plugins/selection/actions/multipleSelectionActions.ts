import { Group } from 'lucide-react';
import { ToolbarAction } from '../../../types/floatingToolbar';
import { createDuplicateAction, createDeleteAction } from './commonActions';
import { useEditorStore } from '../../../store/editorStore';
import { createGenericArrangeActions } from '../../../utils/floating-arrange-actions';
import { arrangeManager } from '../../../plugins/arrange/ArrangeManager';

// Group selected elements
const groupSelected = () => {
  const store = useEditorStore.getState();
  const hasSelection = store.selection.selectedPaths.length > 0 || 
                      store.selection.selectedTexts.length > 0 ||
                      store.selection.selectedSubPaths.length > 0 ||
                      store.selection.selectedImages.length > 0 ||
                      store.selection.selectedUses.length > 0;
  
  if (hasSelection) {
    // Push to history before making changes
    store.pushToHistory();
    
    // Use the built-in createGroupFromSelection method
    const groupId = store.createGroupFromSelection();
    
    if (groupId) {
      // Group created successfully
    } else {
      // Failed to create group
    }
  }
};

// Multiple selection arrange actions helper functions
const getMultipleSelectionCount = () => {
  const store = useEditorStore.getState();
  const { selection } = store;
  return selection.selectedPaths.length + 
         selection.selectedSubPaths.length + 
         selection.selectedTexts.length + 
         selection.selectedImages.length + 
         selection.selectedUses.length + 
         selection.selectedGroups.length;
};

const setupArrangeManagerForMultiple = () => {
  const store = useEditorStore.getState();
  arrangeManager.setEditorStore(store);
};

// Create multiple selection-specific arrange actions
const createMultipleArrangeActions = () => createGenericArrangeActions(
  'multiple-selection',
  getMultipleSelectionCount,
  {
    alignLeft: () => {
      setupArrangeManagerForMultiple();
      arrangeManager.alignLeft();
    },
    alignCenter: () => {
      setupArrangeManagerForMultiple();
      arrangeManager.alignCenter();
    },
    alignRight: () => {
      setupArrangeManagerForMultiple();
      arrangeManager.alignRight();
    },
    alignTop: () => {
      setupArrangeManagerForMultiple();
      arrangeManager.alignTop();
    },
    alignMiddle: () => {
      setupArrangeManagerForMultiple();
      arrangeManager.alignMiddle();
    },
    alignBottom: () => {
      setupArrangeManagerForMultiple();
      arrangeManager.alignBottom();
    },
    distributeHorizontally: () => {
      setupArrangeManagerForMultiple();
      arrangeManager.distributeHorizontally();
    },
    distributeVertically: () => {
      setupArrangeManagerForMultiple();
      arrangeManager.distributeVertically();
    }
  }
);

export const multipleSelectionActions: ToolbarAction[] = [
  {
    id: 'group-selected',
    icon: Group,
    label: 'Group',
    type: 'button',
    action: groupSelected,
    priority: 100,
    tooltip: 'Group selected elements'
  },
  // Add arrange actions for multiple selections
  ...createMultipleArrangeActions(),
  {
    ...createDuplicateAction(20),
    id: 'duplicate-multiple',
    label: 'Duplicate All',
    tooltip: 'Duplicate all selected'
  },
  {
    ...createDeleteAction(10),
    id: 'delete-multiple', 
    label: 'Delete All',
    tooltip: 'Delete all selected'
  }
];