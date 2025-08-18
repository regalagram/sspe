import { Group } from 'lucide-react';
import { ToolbarAction } from '../../../types/floatingToolbar';
import { createDuplicateAction, createDeleteAction } from './commonActions';
import { useEditorStore } from '../../../store/editorStore';

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
      console.log(`✅ Created group with ID: ${groupId}`);
    } else {
      console.log('❌ Failed to create group');
    }
  }
};

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