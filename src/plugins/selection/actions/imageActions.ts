import { Copy, Trash2, Lock, Filter, Move, Group } from 'lucide-react';
import { ToolbarAction } from '../../../types/floatingToolbar';
import { useEditorStore } from '../../../store/editorStore';
import { duplicateSelected, deleteSelected, getSelectedElementsBounds } from './commonActions';
import { createGenericArrangeActions } from '../../../utils/floating-arrange-actions';
import { arrangeManager } from '../../../plugins/arrange/ArrangeManager';

// Check if selected images are locked
const areImagesLocked = (): boolean => {
  const store = useEditorStore.getState();
  const selectedImages = store.selection.selectedImages;
  
  if (selectedImages.length === 0) return false;
  
  return selectedImages.some(imageId => {
    const image = store.images.find(img => img.id === imageId);
    return image?.locked === true;
  });
};

// Toggle image lock
const toggleImageLock = () => {
  const store = useEditorStore.getState();
  const selectedImages = store.selection.selectedImages;
  
  if (selectedImages.length === 0) return;
  
  store.pushToHistory();
  
  // Determine if we should lock or unlock based on the first selected image
  const firstImage = store.images.find(img => img.id === selectedImages[0]);
  const shouldLock = !firstImage?.locked;
  
  // Apply lock/unlock to all selected images
  selectedImages.forEach(imageId => {
    const imageIndex = store.images.findIndex(img => img.id === imageId);
    if (imageIndex !== -1) {
      useEditorStore.setState(state => ({
        images: state.images.map((img, index) => 
          index === imageIndex ? { ...img, locked: shouldLock } : img
        )
      }));
    }
  });
  
  // If locking, clear selection as locked images shouldn't be selectable
  if (shouldLock) {
    store.clearSelection();
  }
};

// Delete selected images
const deleteImages = () => {
  const store = useEditorStore.getState();
  const selectedImages = store.selection.selectedImages;
  
  selectedImages.forEach(imageId => {
    const imageIndex = store.images.findIndex(img => img.id === imageId);
    if (imageIndex !== -1) {
      useEditorStore.setState(state => ({
        images: state.images.filter((_, index) => index !== imageIndex)
      }));
    }
  });
  
  store.clearSelection();
};

// Duplicate selected images
const duplicateImages = () => {
  const store = useEditorStore.getState();
  store.pushToHistory();
  
  // Calculate dynamic offset based on all selected elements
  const bounds = getSelectedElementsBounds();
  const OFFSET = 32;
  const dx = bounds ? (bounds.width > 0 ? bounds.width + OFFSET : OFFSET) : OFFSET;
  const dy = bounds ? (bounds.height > 0 ? bounds.height + OFFSET : OFFSET) : OFFSET;
  
  store.selection.selectedImages.forEach(imageId => {
    store.duplicateImage(imageId, { x: dx, y: dy });
  });
};

// Group selected images
const groupSelectedImages = () => {
  const store = useEditorStore.getState();
  const hasSelection = store.selection.selectedImages.length >= 2;
  
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

// Image arrange actions helper functions
const getImageSelectionCount = () => {
  const store = useEditorStore.getState();
  return store.selection.selectedImages.length;
};

const setupArrangeManagerForImage = () => {
  const store = useEditorStore.getState();
  arrangeManager.setEditorStore(store);
};

// Create image-specific arrange actions
const createImageArrangeActions = () => createGenericArrangeActions(
  'images',
  getImageSelectionCount,
  {
    alignLeft: () => {
      setupArrangeManagerForImage();
      arrangeManager.alignLeft();
    },
    alignCenter: () => {
      setupArrangeManagerForImage();
      arrangeManager.alignCenter();
    },
    alignRight: () => {
      setupArrangeManagerForImage();
      arrangeManager.alignRight();
    },
    alignTop: () => {
      setupArrangeManagerForImage();
      arrangeManager.alignTop();
    },
    alignMiddle: () => {
      setupArrangeManagerForImage();
      arrangeManager.alignMiddle();
    },
    alignBottom: () => {
      setupArrangeManagerForImage();
      arrangeManager.alignBottom();
    },
    distributeHorizontally: () => {
      setupArrangeManagerForImage();
      arrangeManager.distributeHorizontally();
    },
    distributeVertically: () => {
      setupArrangeManagerForImage();
      arrangeManager.distributeVertically();
    }
  }
);

export const imageActions: ToolbarAction[] = [
  {
    id: 'group-images',
    icon: Group,
    label: 'Group',
    type: 'button',
    action: groupSelectedImages,
    priority: 100,
    tooltip: 'Group selected images',
    visible: () => {
      // Only show when multiple images are selected
      const store = useEditorStore.getState();
      return store.selection.selectedImages.length >= 2;
    }
  },
  // Add arrange actions for image elements
  ...createImageArrangeActions(),
  {
    id: 'duplicate-image',
    icon: Copy,
    label: 'Duplicate',
    type: 'button',
    action: duplicateSelected, // Use unified duplicate function
    priority: 80,
    tooltip: 'Duplicate image'
  },
  {
    id: 'image-lock',
    icon: Lock,
    label: 'Lock/Unlock',
    type: 'toggle',
    toggle: {
      isActive: areImagesLocked,
      onToggle: toggleImageLock
    },
    priority: 90,
    tooltip: 'Toggle image lock state'
  },
  {
    id: 'delete-image',
    icon: Trash2,
    label: 'Delete',
    type: 'button',
    action: deleteSelected, // Use unified delete function
    priority: 10,
    destructive: true,
    tooltip: 'Delete image'
  }
];