import { useEditorStore } from '../store/editorStore';
import { SVGPath, TextElementType, SVGImage, SVGUse } from '../types';

// Type for any renderable element
export type RenderableElement = {
  id: string;
  type: 'path' | 'text' | 'image' | 'use';
  zIndex: number;
  element: SVGPath | TextElementType | SVGImage | SVGUse;
};

// Default z-index values for different element types
const DEFAULT_Z_INDEX = {
  path: 1000,
  text: 2000,
  image: 3000,
  use: 4000,
};

// Get default z-index for element type
const getDefaultZIndex = (type: 'path' | 'text' | 'image' | 'use', index: number = 0): number => {
  return DEFAULT_Z_INDEX[type] + index;
};

// Initialize z-index for elements that don't have it
export const initializeZIndexes = () => {
  const store = useEditorStore.getState();
  let needsUpdate = false;
  
  // Initialize paths
  const updatedPaths = store.paths.map((path, index) => {
    if (path.zIndex === undefined) {
      needsUpdate = true;
      return { ...path, zIndex: getDefaultZIndex('path', index) };
    }
    return path;
  });
  
  // Initialize texts
  const updatedTexts = store.texts.map((text, index) => {
    if (text.zIndex === undefined) {
      needsUpdate = true;
      return { ...text, zIndex: getDefaultZIndex('text', index) };
    }
    return text;
  });
  
  // Initialize images
  const updatedImages = store.images.map((image, index) => {
    if (image.zIndex === undefined) {
      needsUpdate = true;
      return { ...image, zIndex: getDefaultZIndex('image', index) };
    }
    return image;
  });
  
  // Initialize uses
  const updatedUses = store.uses.map((use, index) => {
    if (use.zIndex === undefined) {
      needsUpdate = true;
      return { ...use, zIndex: getDefaultZIndex('use', index) };
    }
    return use;
  });
  
  // Update store if needed
  if (needsUpdate) {
    useEditorStore.setState({
      paths: updatedPaths,
      texts: updatedTexts,
      images: updatedImages,
      uses: updatedUses,
    });
  }
};

// Get all elements sorted by z-index
export const getAllElementsByZIndex = (): RenderableElement[] => {
  const store = useEditorStore.getState();
  
  const allElements: RenderableElement[] = [];
  
  // Add paths
  store.paths.forEach(path => {
    allElements.push({
      id: path.id,
      type: 'path',
      zIndex: path.zIndex ?? getDefaultZIndex('path'),
      element: path,
    });
  });
  
  // Add texts
  store.texts.forEach(text => {
    allElements.push({
      id: text.id,
      type: 'text',
      zIndex: text.zIndex ?? getDefaultZIndex('text'),
      element: text,
    });
  });
  
  // Add images
  store.images.forEach(image => {
    allElements.push({
      id: image.id,
      type: 'image',
      zIndex: image.zIndex ?? getDefaultZIndex('image'),
      element: image,
    });
  });
  
  // Add uses
  store.uses.forEach(use => {
    allElements.push({
      id: use.id,
      type: 'use',
      zIndex: use.zIndex ?? getDefaultZIndex('use'),
      element: use,
    });
  });
  
  // Sort by z-index (lower z-index renders first, higher renders last/on top)
  return allElements.sort((a, b) => a.zIndex - b.zIndex);
};

// Get max z-index among all elements
export const getMaxZIndex = (): number => {
  const elements = getAllElementsByZIndex();
  return elements.length > 0 ? Math.max(...elements.map(el => el.zIndex)) : 0;
};

// Get min z-index among all elements
export const getMinZIndex = (): number => {
  const elements = getAllElementsByZIndex();
  return elements.length > 0 ? Math.min(...elements.map(el => el.zIndex)) : 0;
};

// Bring elements to front (set to highest z-index + 1)
export const bringElementsToFront = (elementIds: string[]) => {
  if (elementIds.length === 0) return;
  
  const store = useEditorStore.getState();
  const maxZ = getMaxZIndex();
  
  store.pushToHistory();
  
  // Update each element type
  const updatedPaths = store.paths.map(path => {
    if (elementIds.includes(path.id)) {
      return { ...path, zIndex: maxZ + 1 + elementIds.indexOf(path.id) };
    }
    return path;
  });
  
  const updatedTexts = store.texts.map(text => {
    if (elementIds.includes(text.id)) {
      return { ...text, zIndex: maxZ + 1 + elementIds.indexOf(text.id) };
    }
    return text;
  });
  
  const updatedImages = store.images.map(image => {
    if (elementIds.includes(image.id)) {
      return { ...image, zIndex: maxZ + 1 + elementIds.indexOf(image.id) };
    }
    return image;
  });
  
  const updatedUses = store.uses.map(use => {
    if (elementIds.includes(use.id)) {
      return { ...use, zIndex: maxZ + 1 + elementIds.indexOf(use.id) };
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

// Send elements to back (set to lowest z-index - 1)
export const sendElementsToBack = (elementIds: string[]) => {
  if (elementIds.length === 0) return;
  
  const store = useEditorStore.getState();
  const minZ = getMinZIndex();
  
  store.pushToHistory();
  
  // Update each element type
  const updatedPaths = store.paths.map(path => {
    if (elementIds.includes(path.id)) {
      return { ...path, zIndex: minZ - 1 - elementIds.indexOf(path.id) };
    }
    return path;
  });
  
  const updatedTexts = store.texts.map(text => {
    if (elementIds.includes(text.id)) {
      return { ...text, zIndex: minZ - 1 - elementIds.indexOf(text.id) };
    }
    return text;
  });
  
  const updatedImages = store.images.map(image => {
    if (elementIds.includes(image.id)) {
      return { ...image, zIndex: minZ - 1 - elementIds.indexOf(image.id) };
    }
    return image;
  });
  
  const updatedUses = store.uses.map(use => {
    if (elementIds.includes(use.id)) {
      return { ...use, zIndex: minZ - 1 - elementIds.indexOf(use.id) };
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

// Get selected element IDs by type
export const getSelectedElementIds = () => {
  const store = useEditorStore.getState();
  
  return {
    paths: store.selection.selectedPaths,
    texts: store.selection.selectedTexts,
    images: store.selection.selectedImages,
    uses: store.selection.selectedUses,
    subpaths: store.selection.selectedSubPaths, // Note: subpaths are handled differently
  };
};

// Get all selected element IDs (excluding subpaths)
export const getAllSelectedElementIds = (): string[] => {
  const selected = getSelectedElementIds();
  const allIds = [
    ...selected.paths,
    ...selected.texts,
    ...selected.images,
    ...selected.uses,
  ];
  return allIds;
};

// Send elements forward (move up in z-index)
export const sendElementsForward = (elementIds: string[]) => {
  if (elementIds.length === 0) return;
  
  const store = useEditorStore.getState();
  const allElements = getAllElementsByZIndex();
  
  store.pushToHistory();
  
  // For each selected element, find the next element above it and swap z-indexes
  elementIds.forEach(elementId => {
    const currentElement = allElements.find(el => el.id === elementId);
    if (!currentElement) return;
    
    // Find the next element with higher z-index that's not selected
    const higherElements = allElements
      .filter(el => el.zIndex > currentElement.zIndex && !elementIds.includes(el.id))
      .sort((a, b) => a.zIndex - b.zIndex);
    
    if (higherElements.length > 0) {
      const nextElement = higherElements[0];
      const newZIndex = nextElement.zIndex;
      
      // Update current element to next position
      updateElementZIndex(elementId, newZIndex);
      // Move the next element down
      updateElementZIndex(nextElement.id, currentElement.zIndex);
    }
  });
};

// Send elements backward (move down in z-index)
export const sendElementsBackward = (elementIds: string[]) => {
  if (elementIds.length === 0) return;
  
  const store = useEditorStore.getState();
  const allElements = getAllElementsByZIndex();
  
  store.pushToHistory();
  
  // For each selected element, find the previous element below it and swap z-indexes
  elementIds.forEach(elementId => {
    const currentElement = allElements.find(el => el.id === elementId);
    if (!currentElement) return;
    
    // Find the previous element with lower z-index that's not selected
    const lowerElements = allElements
      .filter(el => el.zIndex < currentElement.zIndex && !elementIds.includes(el.id))
      .sort((a, b) => b.zIndex - a.zIndex);
    
    if (lowerElements.length > 0) {
      const prevElement = lowerElements[0];
      const newZIndex = prevElement.zIndex;
      
      // Update current element to previous position
      updateElementZIndex(elementId, newZIndex);
      // Move the previous element up
      updateElementZIndex(prevElement.id, currentElement.zIndex);
    }
  });
};

// Get z-index of a specific element
export const getElementZIndex = (elementId: string): number | undefined => {
  const store = useEditorStore.getState();
  
  // Check paths
  const path = store.paths.find(p => p.id === elementId);
  if (path) return path.zIndex;
  
  // Check texts
  const text = store.texts.find(t => t.id === elementId);
  if (text) return text.zIndex;
  
  // Check images
  const image = store.images.find(i => i.id === elementId);
  if (image) return image.zIndex;
  
  // Check uses
  const use = store.uses.find(u => u.id === elementId);
  if (use) return use.zIndex;
  
  return undefined;
};

// Helper function to update a single element's z-index
const updateElementZIndex = (elementId: string, newZIndex: number) => {
  const store = useEditorStore.getState();
  
  // Check which type of element it is and update accordingly
  const pathIndex = store.paths.findIndex(p => p.id === elementId);
  if (pathIndex !== -1) {
    const updatedPaths = [...store.paths];
    updatedPaths[pathIndex] = { ...updatedPaths[pathIndex], zIndex: newZIndex };
    useEditorStore.setState({ paths: updatedPaths });
    return;
  }
  
  const textIndex = store.texts.findIndex(t => t.id === elementId);
  if (textIndex !== -1) {
    const updatedTexts = [...store.texts];
    updatedTexts[textIndex] = { ...updatedTexts[textIndex], zIndex: newZIndex };
    useEditorStore.setState({ texts: updatedTexts });
    return;
  }
  
  const imageIndex = store.images.findIndex(i => i.id === elementId);
  if (imageIndex !== -1) {
    const updatedImages = [...store.images];
    updatedImages[imageIndex] = { ...updatedImages[imageIndex], zIndex: newZIndex };
    useEditorStore.setState({ images: updatedImages });
    return;
  }
  
  const useIndex = store.uses.findIndex(u => u.id === elementId);
  if (useIndex !== -1) {
    const updatedUses = [...store.uses];
    updatedUses[useIndex] = { ...updatedUses[useIndex], zIndex: newZIndex };
    useEditorStore.setState({ uses: updatedUses });
  }
};

// Reorder functions for the new system
export const globalBringToFront = () => {
  const selectedIds = getAllSelectedElementIds();
  if (selectedIds.length > 0) {
    bringElementsToFront(selectedIds);
  }
};

export const globalSendToBack = () => {
  const selectedIds = getAllSelectedElementIds();
  if (selectedIds.length > 0) {
    sendElementsToBack(selectedIds);
  }
};

export const globalSendForward = () => {
  const selectedIds = getAllSelectedElementIds();
  if (selectedIds.length > 0) {
    sendElementsForward(selectedIds);
  }
};

export const globalSendBackward = () => {
  const selectedIds = getAllSelectedElementIds();
  if (selectedIds.length > 0) {
    sendElementsBackward(selectedIds);
  }
};
