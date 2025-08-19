import { Copy, Trash2, RotateCcw, Lock, Group } from 'lucide-react';
import { ToolbarAction } from '../../../types/floatingToolbar';
import { useEditorStore } from '../../../store/editorStore';
import { duplicateSelected, deleteSelected } from './commonActions';

// Clear mixed style
const clearMixedStyle = () => {
  const store = useEditorStore.getState();
  store.pushToHistory();
  
  // Clear styles for paths
  store.selection.selectedPaths.forEach(pathId => {
    store.updatePathStyle(pathId, {
      fill: '#000000',
      stroke: undefined,
      strokeWidth: undefined,
      strokeDasharray: undefined,
      strokeLinecap: undefined,
      strokeLinejoin: undefined,
      filter: undefined,
      opacity: undefined,
      fillOpacity: undefined,
      strokeOpacity: undefined
    });
  });
  
  // Clear styles for subpaths (reset to parent path style)
  store.selection.selectedSubPaths.forEach(subPathId => {
    // Find the parent path to get its default style
    const parentPath = store.paths.find(path => 
      path.subPaths.some(sp => sp.id === subPathId)
    );
    if (parentPath) {
      // For subpaths, we reset the parent path style since subpaths inherit from parent
      store.updatePathStyle(parentPath.id, {
        fill: '#000000',
        stroke: undefined,
        strokeWidth: undefined,
        strokeDasharray: undefined,
        strokeLinecap: undefined,
        strokeLinejoin: undefined,
        filter: undefined,
        opacity: undefined,
        fillOpacity: undefined,
        strokeOpacity: undefined
      });
    }
  });
  
  // Clear styles for texts
  store.selection.selectedTexts.forEach(textId => {
    store.updateTextStyle(textId, {
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
    });
  });
  
  // Clear styles for images (reset opacity and filters)
  store.selection.selectedImages.forEach(imageId => {
    store.updateImage(imageId, {
      style: {
        opacity: undefined,
        filter: undefined,
        clipPath: undefined,
        mask: undefined
      }
    });
  });
  
  // Clear styles for use elements
  store.selection.selectedUses.forEach(useId => {
    store.updateUseStyle(useId, {
      fill: '#000000',
      stroke: undefined,
      strokeWidth: undefined,
      strokeDasharray: undefined,
      strokeLinecap: undefined,
      strokeLinejoin: undefined,
      filter: undefined,
      opacity: undefined,
      fillOpacity: undefined,
      strokeOpacity: undefined
    });
  });
  
  // Groups inherit styles from their children, so we apply recursively to all children
  store.selection.selectedGroups.forEach(groupId => {
    const group = store.groups.find(g => g.id === groupId);
    if (group) {
      group.children.forEach(child => {
        switch (child.type) {
          case 'path':
            store.updatePathStyle(child.id, {
              fill: '#000000',
              stroke: undefined,
              strokeWidth: undefined,
              strokeDasharray: undefined,
              strokeLinecap: undefined,
              strokeLinejoin: undefined,
              filter: undefined,
              opacity: undefined,
              fillOpacity: undefined,
              strokeOpacity: undefined
            });
            break;
          case 'text':
            store.updateTextStyle(child.id, {
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
            });
            break;
          case 'image':
            store.updateImage(child.id, {
              style: {
                opacity: undefined,
                filter: undefined,
                clipPath: undefined,
                mask: undefined
              }
            });
            break;
          case 'use':
            store.updateUseStyle(child.id, {
              fill: '#000000',
              stroke: undefined,
              strokeWidth: undefined,
              strokeDasharray: undefined,
              strokeLinecap: undefined,
              strokeLinejoin: undefined,
              filter: undefined,
              opacity: undefined,
              fillOpacity: undefined,
              strokeOpacity: undefined
            });
            break;
        }
      });
    }
  });
};

// Check if any element in mixed selection is locked
const isMixedSelectionLocked = (): boolean => {
  const store = useEditorStore.getState();
  const { selection } = store;
  
  // Check paths
  const pathsLocked = selection.selectedPaths.some(pathId => {
    const path = store.paths.find(p => p.id === pathId);
    return path?.locked === true;
  });
  
  // Check subpaths
  const subPathsLocked = selection.selectedSubPaths.some(subPathId => {
    const subPath = store.paths
      .flatMap(path => path.subPaths)
      .find(sp => sp.id === subPathId);
    return subPath?.locked === true;
  });
  
  // Check texts
  const textsLocked = selection.selectedTexts.some(textId => {
    const text = store.texts.find(t => t.id === textId);
    return text?.locked === true;
  });
  
  // Check images
  const imagesLocked = selection.selectedImages.some(imageId => {
    const image = store.images.find(img => img.id === imageId);
    return image?.locked === true;
  });
  
  // Check use elements
  const usesLocked = selection.selectedUses.some(useId => {
    const use = store.uses.find(u => u.id === useId);
    return use?.locked === true;
  });
  
  // Check groups
  const groupsLocked = selection.selectedGroups.some(groupId => {
    const group = store.groups.find(g => g.id === groupId);
    return group?.locked === true || group?.lockLevel !== 'none';
  });
  
  return pathsLocked || subPathsLocked || textsLocked || imagesLocked || usesLocked || groupsLocked;
};

// Toggle lock for mixed selection
const toggleMixedLock = () => {
  const store = useEditorStore.getState();
  const { selection } = store;
  
  if (selection.selectedPaths.length === 0 && 
      selection.selectedSubPaths.length === 0 &&
      selection.selectedTexts.length === 0 && 
      selection.selectedImages.length === 0 && 
      selection.selectedUses.length === 0 && 
      selection.selectedGroups.length === 0) {
    return;
  }
  
  store.pushToHistory();
  
  // Determine if we should lock or unlock based on current state
  const shouldLock = !isMixedSelectionLocked();
  
  // Lock/unlock paths
  selection.selectedPaths.forEach(pathId => {
    const pathIndex = store.paths.findIndex(p => p.id === pathId);
    if (pathIndex !== -1) {
      const path = store.paths[pathIndex];
      const updatedPath = {
        ...path,
        locked: shouldLock,
        subPaths: path.subPaths.map(subPath => ({
          ...subPath,
          locked: shouldLock,
          commands: subPath.commands.map(command => ({
            ...command,
            locked: shouldLock
          }))
        }))
      };
      
      useEditorStore.setState(state => ({
        paths: state.paths.map((p, index) => 
          index === pathIndex ? updatedPath : p
        )
      }));
    }
  });
  
  // Lock/unlock subpaths
  selection.selectedSubPaths.forEach(subPathId => {
    // Find parent path and update the subpath
    const pathIndex = store.paths.findIndex(path => 
      path.subPaths.some(sp => sp.id === subPathId)
    );
    
    if (pathIndex !== -1) {
      const path = store.paths[pathIndex];
      const updatedSubPaths = path.subPaths.map(sp => 
        sp.id === subPathId ? { ...sp, locked: shouldLock } : sp
      );
      
      useEditorStore.setState(state => ({
        paths: state.paths.map((p, index) => 
          index === pathIndex ? { ...p, subPaths: updatedSubPaths } : p
        )
      }));
    }
  });
  
  // Lock/unlock texts
  selection.selectedTexts.forEach(textId => {
    const textElement = store.texts.find(t => t.id === textId);
    if (textElement) {
      if (textElement.type === 'text') {
        store.updateText(textId, { locked: shouldLock });
      } else if (textElement.type === 'multiline-text') {
        store.updateMultilineText(textId, { locked: shouldLock });
      }
    }
  });
  
  // Lock/unlock images
  selection.selectedImages.forEach(imageId => {
    const imageIndex = store.images.findIndex(img => img.id === imageId);
    if (imageIndex !== -1) {
      useEditorStore.setState(state => ({
        images: state.images.map((img, index) => 
          index === imageIndex ? { ...img, locked: shouldLock } : img
        )
      }));
    }
  });
  
  // Lock/unlock use elements
  selection.selectedUses.forEach(useId => {
    const useIndex = store.uses.findIndex(u => u.id === useId);
    if (useIndex !== -1) {
      useEditorStore.setState(state => ({
        uses: state.uses.map((u, index) => 
          index === useIndex ? { ...u, locked: shouldLock } : u
        )
      }));
    }
  });
  
  // Lock/unlock groups
  selection.selectedGroups.forEach(groupId => {
    store.setGroupLockLevel(groupId, shouldLock ? 'full' : 'none');
  });
  
  // If locking, clear selection as locked elements shouldn't be selectable
  if (shouldLock) {
    store.clearSelection();
  }
};

// Group selected elements in mixed selection
const groupMixedSelected = () => {
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

export const mixedSelectionActions: ToolbarAction[] = [
  {
    id: 'mixed-group',
    icon: Group,
    label: 'Group',
    type: 'button',
    action: groupMixedSelected,
    priority: 100,
    tooltip: 'Group selected elements'
  },
  {
    id: 'mixed-duplicate',
    icon: Copy,
    label: 'Duplicate All',
    type: 'button',
    action: duplicateSelected,
    priority: 20,
    tooltip: 'Duplicate all selected elements'
  },
  {
    id: 'mixed-clear-style',
    icon: RotateCcw,
    label: 'Clear Style',
    type: 'button',
    action: clearMixedStyle,
    priority: 15,
    tooltip: 'Reset all elements to default style'
  },
  {
    id: 'mixed-lock',
    icon: Lock,
    label: 'Lock/Unlock',
    type: 'toggle',
    toggle: {
      isActive: isMixedSelectionLocked,
      onToggle: toggleMixedLock
    },
    priority: 12,
    tooltip: 'Toggle lock state for all selected elements'
  },
  {
    id: 'mixed-delete',
    icon: Trash2,
    label: 'Delete All',
    type: 'button',
    action: deleteSelected,
    priority: 10,
    destructive: true,
    tooltip: 'Delete all selected elements'
  }
];