import { Copy, Trash2, RotateCcw } from 'lucide-react';
import { ToolbarAction } from '../../../types/floatingToolbar';
import { useEditorStore } from '../../../store/editorStore';
import { BoundingBox } from '../../../types';
import { getTextBoundingBox, getImageBoundingBox, getPathBoundingBox, getGroupBoundingBox } from '../../../utils/bbox-utils';
import { calculateSmartDuplicationOffset } from '../../../utils/duplication-positioning';
import { generateId } from '../../../utils/id-utils';

// Calculate bounding box of all selected elements using existing bbox utilities
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

  // Include selected groups - use the existing getGroupBoundingBox utility
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

// Duplicate selected elements with unified approach using existing bbox utilities
export const duplicateSelected = () => {
  const store = useEditorStore.getState();
  
  // Push to history before making changes
  store.pushToHistory();
  
  // Special case: single group selected - use bottom-right positioning logic
  if (store.selection.selectedGroups.length === 1 && 
      store.selection.selectedPaths.length === 0 && 
      store.selection.selectedSubPaths.length === 0 && 
      store.selection.selectedCommands.length === 0 &&
      store.selection.selectedTexts.length === 0 &&
      store.selection.selectedImages.length === 0 &&
      store.selection.selectedUses.length === 0) {
    
    const groupId = store.selection.selectedGroups[0];
    const group = store.groups.find(g => g.id === groupId);
    
    if (group) {
      // Use the same bottom-right positioning logic as multiple selections
      const groupBounds = getGroupBoundingBox(group, store.paths, store.texts, store.images, store.groups);
      
      // Calculate smart offset for padding (width + padding, height + padding with minimums)
      const PADDING = 8;
      
      // Calculate the bottom-right corner of the group
      const bottomRightX = groupBounds.x + groupBounds.width;
      const bottomRightY = groupBounds.y + groupBounds.height;
      
      // The target position for the duplicated group's top-left corner should be bottom-right + padding
      const targetTopLeftX = bottomRightX + PADDING;
      const targetTopLeftY = bottomRightY + PADDING;
      
      // Calculate the offset needed to move the group from its current position to target position
      const customOffset = {
        x: targetTopLeftX - groupBounds.x,
        y: targetTopLeftY - groupBounds.y
      };
      
      // Duplicate the group WITHOUT any offset first
      const newGroupId = store.duplicateGroup(groupId);
      
      if (newGroupId) {
        // Get the duplicated group object
        const newGroup = store.groups.find(g => g.id === newGroupId);
        
        if (newGroup) {
          // Get the bounding box of the newly duplicated group
          const newGroupBounds = getGroupBoundingBox(newGroup, store.paths, store.texts, store.images, store.groups);
          
          // Calculate the actual offset needed to move from current position to target position
          const actualOffset = {
            x: targetTopLeftX - newGroupBounds.x,
            y: targetTopLeftY - newGroupBounds.y
          };
          
          // Move the entire duplicated group to the correct position
          store.moveGroup(newGroupId, actualOffset);
          
          // Select the newly duplicated group
          useEditorStore.setState(state => ({
            selection: {
              ...state.selection,
              selectedGroups: [newGroupId],
              selectedPaths: [],
              selectedSubPaths: [],
              selectedCommands: [],
              selectedControlPoints: [],
              selectedTexts: [],
              selectedImages: [],
              selectedUses: []
            }
          }));
        }
      }
    }
    return;
  }
  
  // For multiple elements or mixed selections, use unified positioning approach
  const unifiedBounds = getSelectedElementsBounds();
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

  // For groups, use the existing getGroupBoundingBox utility for accurate positioning
  store.selection.selectedGroups.forEach(groupId => {
    const group = store.groups.find(g => g.id === groupId);
    if (group) {
      // Use the existing getGroupBoundingBox utility function
      const groupBounds = getGroupBoundingBox(group, store.paths, store.texts, store.images, store.groups);
      
      // Calculate relative position within the original selection
      const relativeX = groupBounds.x - unifiedBounds.x;
      const relativeY = groupBounds.y - unifiedBounds.y;
      
      // The group should be positioned at the new target position maintaining its relative position
      const targetGroupX = targetTopLeftX + relativeX;
      const targetGroupY = targetTopLeftY + relativeY;
      
      // Calculate the offset to move the group from its current position to target position
      const groupSpecificOffset = {
        x: targetGroupX - groupBounds.x,
        y: targetGroupY - groupBounds.y
      };
      
      const newGroupId = store.duplicateGroup(groupId, groupSpecificOffset);
      if (newGroupId) {
        newElementIds.groups.push(newGroupId);
      }
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

// Invert selection - Select all unselected elements and deselect all selected ones
export const invertSelection = () => {
  const store = useEditorStore.getState();
  const currentSelection = store.selection;

  // Get all available element IDs
  const allPathIds = store.paths.map(p => p.id);
  const allTextIds = store.texts.map(t => t.id);
  const allImageIds = store.images.map(img => img.id);
  const allUseIds = store.uses.map(u => u.id);
  const allGroupIds = store.groups.map(g => g.id);

  // Calculate inverted selection
  const invertedPaths = allPathIds.filter(id => !currentSelection.selectedPaths.includes(id));
  const invertedTexts = allTextIds.filter(id => !currentSelection.selectedTexts.includes(id));
  const invertedImages = allImageIds.filter(id => !currentSelection.selectedImages.includes(id));
  const invertedUses = allUseIds.filter(id => !currentSelection.selectedUses.includes(id));
  const invertedGroups = allGroupIds.filter(id => !currentSelection.selectedGroups.includes(id));

  // Apply the inverted selection
  useEditorStore.setState(state => ({
    selection: {
      ...state.selection,
      selectedPaths: invertedPaths,
      selectedTexts: invertedTexts,
      selectedImages: invertedImages,
      selectedUses: invertedUses,
      selectedGroups: invertedGroups,
      // Clear sub-selections as they depend on path selection
      selectedSubPaths: [],
      selectedCommands: [],
      selectedControlPoints: [],
      selectedTextSpans: [],
      selectedTextPaths: []
    }
  }));
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