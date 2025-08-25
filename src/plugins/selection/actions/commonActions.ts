import { Copy, Trash2, RotateCcw, Lock } from 'lucide-react';
import { ToolbarAction } from '../../../types/floatingToolbar';
import { useEditorStore } from '../../../store/editorStore';
import { BoundingBox } from '../../../types';
import { getTextBoundingBox, getImageBoundingBox, getPathBoundingBox, getGroupBoundingBox } from '../../../utils/bbox-utils';
import { duplicatePath } from '../../../utils/duplicate-utils';
import { generateId } from '../../../utils/id-utils';
import { calculateSmartDuplicationOffset, getUnifiedSelectionBounds } from '../../../utils/duplication-positioning';

// Calculate bounding box of all selected elements
export const getSelectedElementsBounds = (): BoundingBox | null => {
  const store = useEditorStore.getState();
  const { selection, paths, texts, images, uses, groups } = store;
  
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let hasElements = false;

  // Include selected paths
  selection.selectedPaths.forEach(pathId => {
    const path = paths.find(p => p.id === pathId);
    if (path) {
      const bbox = getPathBoundingBox(path);
      if (bbox) {
        minX = Math.min(minX, bbox.x);
        maxX = Math.max(maxX, bbox.x + bbox.width);
        minY = Math.min(minY, bbox.y);
        maxY = Math.max(maxY, bbox.y + bbox.height);
        hasElements = true;
      }
    }
  });

  // Include selected texts
  selection.selectedTexts.forEach(textId => {
    const text = texts.find(t => t.id === textId);
    if (text) {
      const bbox = getTextBoundingBox(text);
      minX = Math.min(minX, bbox.x);
      maxX = Math.max(maxX, bbox.x + bbox.width);
      minY = Math.min(minY, bbox.y);
      maxY = Math.max(maxY, bbox.y + bbox.height);
      hasElements = true;
    }
  });

  // Include selected images
  selection.selectedImages.forEach(imageId => {
    const image = images.find(img => img.id === imageId);
    if (image) {
      const bbox = getImageBoundingBox(image);
      minX = Math.min(minX, bbox.x);
      maxX = Math.max(maxX, bbox.x + bbox.width);
      minY = Math.min(minY, bbox.y);
      maxY = Math.max(maxY, bbox.y + bbox.height);
      hasElements = true;
    }
  });

  // Include selected use elements
  selection.selectedUses.forEach(useId => {
    const use = uses.find(u => u.id === useId);
    if (use) {
      const bbox = {
        x: use.x || 0,
        y: use.y || 0,
        width: use.width || 50,
        height: use.height || 50
      };
      minX = Math.min(minX, bbox.x);
      maxX = Math.max(maxX, bbox.x + bbox.width);
      minY = Math.min(minY, bbox.y);
      maxY = Math.max(maxY, bbox.y + bbox.height);
      hasElements = true;
    }
  });

  // Include selected groups
  selection.selectedGroups.forEach(groupId => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      const bbox = getGroupBoundingBox(group, paths, texts, images, groups);
      minX = Math.min(minX, bbox.x);
      maxX = Math.max(maxX, bbox.x + bbox.width);
      minY = Math.min(minY, bbox.y);
      maxY = Math.max(maxY, bbox.y + bbox.height);
      hasElements = true;
    }
  });

  if (!hasElements) {
    return null;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
};

// Duplicate selected elements with unified approach
export const duplicateSelected = () => {
  const store = useEditorStore.getState();
  
  // Push to history before making changes
  store.pushToHistory();
  
  // Get the unified bounds of the entire selection
  const unifiedBounds = getUnifiedSelectionBounds(store.selection);
  if (!unifiedBounds) return;
  
  // Calculate offset for positioning from bottom-right corner
  const offset = calculateSmartDuplicationOffset(store.selection);
  
  // Calculate the bottom-right corner of the entire selection
  const bottomRightX = unifiedBounds.x + unifiedBounds.width;
  const bottomRightY = unifiedBounds.y + unifiedBounds.height;
  
  // The target position for the duplicated selection's top-left corner
  const targetTopLeftX = bottomRightX + (offset.x - unifiedBounds.width);
  const targetTopLeftY = bottomRightY + (offset.y - unifiedBounds.height);
  
  // Track new element IDs for selection update
  const newElementIds = {
    paths: [] as string[],
    texts: [] as string[],
    images: [] as string[],
    uses: [] as string[],
    groups: [] as string[]
  };

  // For mixed selections, we need to handle individual elements first, then groups
  // to avoid duplicating elements that are part of selected groups
  
  // Collect all element IDs that are children of selected groups
  const groupChildrenIds = new Set<string>();
  store.selection.selectedGroups.forEach(groupId => {
    const group = store.getGroupById(groupId);
    if (group) {
      group.children.forEach(child => {
        groupChildrenIds.add(child.id);
      });
    }
  });

  // Duplicate individual texts (only if not part of a selected group)
  store.selection.selectedTexts.forEach(textId => {
    if (!groupChildrenIds.has(textId)) {
      const text = store.texts.find(t => t.id === textId);
      if (text) {
        const newTextId = generateId();
        
        // Calculate relative position within the original selection
        const relativeX = text.x - unifiedBounds.x;
        const relativeY = text.y - unifiedBounds.y;
        
        const newText = {
          ...text,
          id: newTextId,
          x: targetTopLeftX + relativeX,
          y: targetTopLeftY + relativeY
        };
        
        useEditorStore.setState(state => ({
          texts: [...state.texts, newText]
        }));
        newElementIds.texts.push(newTextId);
      }
    }
  });

  // Duplicate individual images (only if not part of a selected group)
  store.selection.selectedImages.forEach(imageId => {
    if (!groupChildrenIds.has(imageId)) {
      const image = store.images.find(img => img.id === imageId);
      if (image) {
        const newImageId = generateId();
        
        // Calculate relative position within the original selection
        const relativeX = (image.x || 0) - unifiedBounds.x;
        const relativeY = (image.y || 0) - unifiedBounds.y;
        
        const newImage = {
          ...image,
          id: newImageId,
          x: targetTopLeftX + relativeX,
          y: targetTopLeftY + relativeY
        };
        
        useEditorStore.setState(state => ({
          images: [...state.images, newImage]
        }));
        newElementIds.images.push(newImageId);
      }
    }
  });

  // Duplicate individual use elements (only if not part of a selected group)
  store.selection.selectedUses.forEach(useId => {
    if (!groupChildrenIds.has(useId)) {
      const use = store.uses.find(u => u.id === useId);
      if (use) {
        const newUseId = generateId();
        
        // Calculate relative position within the original selection
        const relativeX = (use.x || 0) - unifiedBounds.x;
        const relativeY = (use.y || 0) - unifiedBounds.y;
        
        const newUse = {
          ...use,
          id: newUseId,
          x: targetTopLeftX + relativeX,
          y: targetTopLeftY + relativeY
        };
        
        useEditorStore.setState(state => ({
          uses: [...state.uses, newUse]
        }));
        newElementIds.uses.push(newUseId);
      }
    }
  });

  // For groups, we still need to use the relative offset approach since group duplication
  // handles internal positioning differently
  const groupOffset = { x: offset.x, y: offset.y };
  store.selection.selectedGroups.forEach(groupId => {
    const newGroupId = store.duplicateGroup(groupId, groupOffset);
    if (newGroupId) {
      newElementIds.groups.push(newGroupId);
    }
  });

  // Use existing duplicateSelection for paths/subpaths/commands (it already uses dynamic offset)
  if (store.selection.selectedPaths.length > 0 || store.selection.selectedSubPaths.length > 0 || store.selection.selectedCommands.length > 0) {
    // Get current paths count to identify new ones
    const currentPathCount = store.paths.length;
    store.duplicateSelection();
    
    // Find newly created paths
    const updatedStore = useEditorStore.getState();
    if (updatedStore.paths.length > currentPathCount) {
      const newPaths = updatedStore.paths.slice(currentPathCount);
      newElementIds.paths.push(...newPaths.map(p => p.id));
    }
  }

  // Update selection to include newly duplicated elements
  if (newElementIds.paths.length > 0 || newElementIds.texts.length > 0 || 
      newElementIds.images.length > 0 || newElementIds.uses.length > 0 || 
      newElementIds.groups.length > 0) {
    
    useEditorStore.setState(state => ({
      selection: {
        ...state.selection,
        selectedPaths: newElementIds.paths,
        selectedTexts: newElementIds.texts,
        selectedImages: newElementIds.images,
        selectedUses: newElementIds.uses,
        selectedGroups: newElementIds.groups,
        // Clear other selections as we're selecting newly duplicated elements
        selectedSubPaths: [],
        selectedCommands: [],
        selectedControlPoints: []
      }
    }));
  }
};

// Delete selected elements
export const deleteSelected = () => {
  const store = useEditorStore.getState();
  
  // Push to history before making changes
  store.pushToHistory();

  // Delete texts
  store.selection.selectedTexts.forEach(textId => {
    store.deleteText(textId);
  });

  // Delete paths using removePath
  store.selection.selectedPaths.forEach(pathId => {
    store.removePath(pathId);
  });

  // Delete subpaths using removeSubPath
  store.selection.selectedSubPaths.forEach(subPathId => {
    store.removeSubPath(subPathId);
  });

  // For commands, we need to remove them from their subpaths
  store.selection.selectedCommands.forEach(commandId => {
    const pathWithCommand = store.paths.find(path => 
      path.subPaths.some(subPath => 
        subPath.commands.some(cmd => cmd.id === commandId)
      )
    );
    
    if (pathWithCommand) {
      const subPathWithCommand = pathWithCommand.subPaths.find(subPath => 
        subPath.commands.some(cmd => cmd.id === commandId)
      );
      
      if (subPathWithCommand) {
        const updatedCommands = subPathWithCommand.commands.filter(cmd => cmd.id !== commandId);
        store.replaceSubPathCommands(subPathWithCommand.id, updatedCommands.map(cmd => ({
          command: cmd.command,
          x: cmd.x,
          y: cmd.y,
          x1: cmd.x1,
          y1: cmd.y1,
          x2: cmd.x2,
          y2: cmd.y2
        })));
      }
    }
  });

  // Delete images (using ID-based filtering for safety)
  if (store.selection.selectedImages.length > 0) {
    useEditorStore.setState(state => ({
      images: state.images.filter(img => !store.selection.selectedImages.includes(img.id)),
      selection: {
        ...state.selection,
        selectedImages: []
      }
    }));
  }

  // Delete use elements (using ID-based filtering for safety)
  if (store.selection.selectedUses.length > 0) {
    useEditorStore.setState(state => ({
      uses: state.uses.filter(u => !store.selection.selectedUses.includes(u.id)),
      selection: {
        ...state.selection,
        selectedUses: []
      }
    }));
  }

  // Delete groups
  store.selection.selectedGroups.forEach(groupId => {
    store.deleteGroup(groupId, true); // Delete with children
  });

  // Clear selection
  store.clearSelection();
};

// Common duplicate action
export const createDuplicateAction = (priority: number = 20): ToolbarAction => ({
  id: 'duplicate-element',
  icon: Copy,
  label: 'Duplicate',
  type: 'button',
  action: duplicateSelected,
  priority,
  tooltip: 'Duplicate element'
});

// Common delete action
export const createDeleteAction = (priority: number = 10): ToolbarAction => ({
  id: 'delete-element',
  icon: Trash2,
  label: 'Delete',
  type: 'button',
  action: deleteSelected,
  priority,
  destructive: true,
  tooltip: 'Delete element'
});