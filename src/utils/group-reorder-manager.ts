import { useEditorStore } from '../store/editorStore';
import { SVGGroup } from '../types';
import { 
  getAllElementsByZIndex, 
  getMaxZIndex, 
  getMinZIndex,
  initializeZIndexes,
  getElementZIndex
} from './z-index-manager';

/**
 * Get all element IDs that belong to a specific group (including nested groups)
 */
const getGroupElementIds = (group: SVGGroup, allGroups: SVGGroup[]): string[] => {
  const elementIds: string[] = [];
  
  for (const child of group.children) {
    if (child.type === 'group') {
      // For nested groups, recursively get their element IDs
      const nestedGroup = allGroups.find(g => g.id === child.id);
      if (nestedGroup) {
        elementIds.push(...getGroupElementIds(nestedGroup, allGroups));
      }
    } else {
      // For regular elements, add their ID
      elementIds.push(child.id);
    }
  }
  
  return elementIds;
};

/**
 * Get the current z-index range of all elements in a group
 */
const getGroupZIndexRange = (groupId: string): { min: number; max: number; elementIds: string[] } => {
  const store = useEditorStore.getState();
  const group = store.groups.find(g => g.id === groupId);
  
  if (!group) {
    return { min: 0, max: 0, elementIds: [] };
  }
  
  const elementIds = getGroupElementIds(group, store.groups);
  
  if (elementIds.length === 0) {
    return { min: 0, max: 0, elementIds: [] };
  }
  
  const zIndexes = elementIds
    .map(id => getElementZIndex(id))
    .filter((z): z is number => z !== undefined);
  
  if (zIndexes.length === 0) {
    return { min: 0, max: 0, elementIds };
  }
  
  return {
    min: Math.min(...zIndexes),
    max: Math.max(...zIndexes),
    elementIds
  };
};

/**
 * Update z-index for multiple elements while maintaining their relative order
 */
const updateElementsZIndex = (elementIds: string[], startZIndex: number) => {
  const store = useEditorStore.getState();
  
  // Get current z-indexes and sort elements by their current order
  const elementsWithZIndex = elementIds
    .map(id => ({ id, zIndex: getElementZIndex(id) || 0 }))
    .sort((a, b) => a.zIndex - b.zIndex);
  
  // Update each element type
  const updatedPaths = store.paths.map(path => {
    const elementIndex = elementsWithZIndex.findIndex(el => el.id === path.id);
    if (elementIndex !== -1) {
      return { ...path, zIndex: startZIndex + elementIndex };
    }
    return path;
  });
  
  const updatedTexts = store.texts.map(text => {
    const elementIndex = elementsWithZIndex.findIndex(el => el.id === text.id);
    if (elementIndex !== -1) {
      return { ...text, zIndex: startZIndex + elementIndex };
    }
    return text;
  });
  
  const updatedImages = store.images.map(image => {
    const elementIndex = elementsWithZIndex.findIndex(el => el.id === image.id);
    if (elementIndex !== -1) {
      return { ...image, zIndex: startZIndex + elementIndex };
    }
    return image;
  });
  
  const updatedUses = store.uses.map(use => {
    const elementIndex = elementsWithZIndex.findIndex(el => el.id === use.id);
    if (elementIndex !== -1) {
      return { ...use, zIndex: startZIndex + elementIndex };
    }
    return use;
  });
  
  useEditorStore.setState({
    paths: updatedPaths,
    texts: updatedTexts,
    images: updatedImages,
    uses: updatedUses,
  });
};

/**
 * Bring selected groups to front
 */
export const bringGroupsToFront = () => {
  const store = useEditorStore.getState();
  const selectedGroupIds = store.selection.selectedGroups;
  
  if (selectedGroupIds.length === 0) return;
  
  // Initialize z-indexes if needed
  initializeZIndexes();
  
  // History is pushed by the calling function, no need to do it here
  
  const maxZ = getMaxZIndex();
  let currentStartZ = maxZ + 1;
  
  // Process each selected group
  selectedGroupIds.forEach(groupId => {
    const { elementIds } = getGroupZIndexRange(groupId);
    
    if (elementIds.length > 0) {
      updateElementsZIndex(elementIds, currentStartZ);
      currentStartZ += elementIds.length;
    }
  });
};

/**
 * Send selected groups to back
 */
export const sendGroupsToBack = () => {
  const store = useEditorStore.getState();
  const selectedGroupIds = store.selection.selectedGroups;
  
  if (selectedGroupIds.length === 0) return;
  
  // Initialize z-indexes if needed
  initializeZIndexes();
  
  // History is pushed by the calling function, no need to do it here
  
  const minZ = getMinZIndex();
  let currentStartZ = minZ - selectedGroupIds.length * 100; // Give enough space for all groups
  
  // Process each selected group (in reverse order for back positioning)
  [...selectedGroupIds].reverse().forEach(groupId => {
    const { elementIds } = getGroupZIndexRange(groupId);
    
    if (elementIds.length > 0) {
      updateElementsZIndex(elementIds, currentStartZ);
      currentStartZ += elementIds.length;
    }
  });
};

/**
 * Send selected groups forward (one level up)
 */
export const sendGroupsForward = () => {
  const store = useEditorStore.getState();
  const selectedGroupIds = store.selection.selectedGroups;
  
  if (selectedGroupIds.length === 0) return;
  
  // Initialize z-indexes if needed
  initializeZIndexes();
  
  // History is pushed by the calling function, no need to do it here
  
  const allElements = getAllElementsByZIndex();
  
  selectedGroupIds.forEach(groupId => {
    const { min: groupMinZ, max: groupMaxZ, elementIds } = getGroupZIndexRange(groupId);
    
    if (elementIds.length === 0) return;
    
    // Find the next element above the group that's not part of any selected group
    const selectedGroupElementIds = new Set<string>();
    selectedGroupIds.forEach(id => {
      const range = getGroupZIndexRange(id);
      range.elementIds.forEach(elId => selectedGroupElementIds.add(elId));
    });
    
    const higherElements = allElements
      .filter(el => el.zIndex > groupMaxZ && !selectedGroupElementIds.has(el.id))
      .sort((a, b) => a.zIndex - b.zIndex);
    
    if (higherElements.length > 0) {
      const nextElement = higherElements[0];
      const targetZIndex = nextElement.zIndex;
      
      // Move group elements to target position
      updateElementsZIndex(elementIds, targetZIndex - elementIds.length + 1);
      
      // Move the overlapped element down
      const elementWithTargetZ = allElements.find(el => el.id === nextElement.id);
      if (elementWithTargetZ) {
        updateElementsZIndex([nextElement.id], groupMinZ);
      }
    }
  });
};

/**
 * Send selected groups backward (one level down)
 */
export const sendGroupsBackward = () => {
  const store = useEditorStore.getState();
  const selectedGroupIds = store.selection.selectedGroups;
  
  if (selectedGroupIds.length === 0) return;
  
  // Initialize z-indexes if needed
  initializeZIndexes();
  
  // History is pushed by the calling function, no need to do it here
  
  const allElements = getAllElementsByZIndex();
  
  selectedGroupIds.forEach(groupId => {
    const { min: groupMinZ, max: groupMaxZ, elementIds } = getGroupZIndexRange(groupId);
    
    if (elementIds.length === 0) return;
    
    // Find the previous element below the group that's not part of any selected group
    const selectedGroupElementIds = new Set<string>();
    selectedGroupIds.forEach(id => {
      const range = getGroupZIndexRange(id);
      range.elementIds.forEach(elId => selectedGroupElementIds.add(elId));
    });
    
    const lowerElements = allElements
      .filter(el => el.zIndex < groupMinZ && !selectedGroupElementIds.has(el.id))
      .sort((a, b) => b.zIndex - a.zIndex);
    
    if (lowerElements.length > 0) {
      const prevElement = lowerElements[0];
      const targetZIndex = prevElement.zIndex;
      
      // Move group elements to target position
      updateElementsZIndex(elementIds, targetZIndex - elementIds.length + 1);
      
      // Move the overlapped element up
      const elementWithTargetZ = allElements.find(el => el.id === prevElement.id);
      if (elementWithTargetZ) {
        updateElementsZIndex([prevElement.id], groupMaxZ + 1);
      }
    }
  });
};

/**
 * Check if any groups are selected
 */
export const hasGroupSelection = (): boolean => {
  const store = useEditorStore.getState();
  return store.selection.selectedGroups.length > 0;
};

/**
 * Get information about selected groups for UI display
 */
export const getSelectedGroupsInfo = (): string => {
  const store = useEditorStore.getState();
  const count = store.selection.selectedGroups.length;
  
  if (count === 0) return "No groups selected";
  if (count === 1) return "1 group selected";
  return `${count} groups selected`;
};
