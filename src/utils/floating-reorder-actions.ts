import { Layers, ArrowUp, ArrowDown } from 'lucide-react';
import { ToolbarAction } from '../types/floatingToolbar';
import { useEditorStore } from '../store/editorStore';
import { ReorderManager } from '../plugins/reorder/ReorderManager';

// Create reorder actions for different element types
export const createReorderActions = (
  elementType: string,
  getSelectionCount: () => number,
  reorderActions: {
    bringToFront: () => void;
    sendToBack: () => void;
  }
): ToolbarAction[] => {
  return [
    {
      id: `${elementType}-reorder`,
      icon: Layers,
      label: 'Reorder',
      type: 'dropdown',
      dropdown: {
        options: [
          {
            id: `${elementType}-bring-front`,
            label: 'Bring to Front',
            icon: ArrowUp,
            action: reorderActions.bringToFront,
          },
          {
            id: `${elementType}-send-back`,
            label: 'Send to Back',
            icon: ArrowDown,
            action: reorderActions.sendToBack,
          },
        ],
      },
      priority: 14,
      tooltip: 'Reorder elements',
    } as ToolbarAction,
  ];
};

// Generic reorder functions for different element types
export const createElementReorderFunctions = (elementType: 'text' | 'image' | 'use' | 'subpath' | 'mixed') => {
  const bringToFront = () => {
    const store = useEditorStore.getState();
    store.pushToHistory();
    
    const reorderManager = new ReorderManager();
    reorderManager.setEditorStore(store);
    
    switch (elementType) {
      case 'text':
        // For texts, we need to move them in the texts array to change z-order
        moveTextsToFront();
        break;
      case 'image':
        // For images, we need to move them in the images array to change z-order
        moveImagesToFront();
        break;
      case 'use':
        // For use elements, we need to move them in the uses array to change z-order
        moveUsesToFront();
        break;
      case 'subpath':
        // For subpaths, use the existing ReorderManager
        reorderManager.bringToFront();
        break;
      case 'mixed':
        // For mixed selections, we need a more complex approach
        moveMixedSelectionToFront();
        break;
    }
  };

  const sendToBack = () => {
    const store = useEditorStore.getState();
    store.pushToHistory();
    
    const reorderManager = new ReorderManager();
    reorderManager.setEditorStore(store);
    
    switch (elementType) {
      case 'text':
        moveTextsToBack();
        break;
      case 'image':
        moveImagesToBack();
        break;
      case 'use':
        moveUsesToBack();
        break;
      case 'subpath':
        reorderManager.sendToBack();
        break;
      case 'mixed':
        moveMixedSelectionToBack();
        break;
    }
  };

  return { bringToFront, sendToBack };
};

// Helper functions for moving different element types

// Text reorder functions
const moveTextsToFront = () => {
  const store = useEditorStore.getState();
  const selectedTextIds = store.selection.selectedTexts;
  
  if (selectedTextIds.length === 0) return;
  
  // Get current texts array
  let texts = [...store.texts];
  
  // Remove selected texts from their current positions
  const selectedTexts = selectedTextIds.map(id => 
    texts.find(text => text.id === id)
  ).filter((text): text is NonNullable<typeof text> => text !== undefined);
  
  texts = texts.filter(text => !selectedTextIds.includes(text.id));
  
  // Add selected texts to the end (front in rendering order)
  texts.push(...selectedTexts);
  
  // Update the store
  useEditorStore.setState({ texts });
};

const moveTextsToBack = () => {
  const store = useEditorStore.getState();
  const selectedTextIds = store.selection.selectedTexts;
  
  if (selectedTextIds.length === 0) return;
  
  // Get current texts array
  let texts = [...store.texts];
  
  // Remove selected texts from their current positions
  const selectedTexts = selectedTextIds.map(id => 
    texts.find(text => text.id === id)
  ).filter((text): text is NonNullable<typeof text> => text !== undefined);
  
  texts = texts.filter(text => !selectedTextIds.includes(text.id));
  
  // Add selected texts to the beginning (back in rendering order)
  texts.unshift(...selectedTexts);
  
  // Update the store
  useEditorStore.setState({ texts });
};

// Image reorder functions
const moveImagesToFront = () => {
  const store = useEditorStore.getState();
  const selectedImageIds = store.selection.selectedImages;
  
  if (selectedImageIds.length === 0) return;
  
  // Get current images array
  let images = [...store.images];
  
  // Remove selected images from their current positions
  const selectedImages = selectedImageIds.map(id => 
    images.find(image => image.id === id)
  ).filter((image): image is NonNullable<typeof image> => image !== undefined);
  
  images = images.filter(image => !selectedImageIds.includes(image.id));
  
  // Add selected images to the end (front in rendering order)
  images.push(...selectedImages);
  
  // Update the store
  useEditorStore.setState({ images });
};

const moveImagesToBack = () => {
  const store = useEditorStore.getState();
  const selectedImageIds = store.selection.selectedImages;
  
  if (selectedImageIds.length === 0) return;
  
  // Get current images array
  let images = [...store.images];
  
  // Remove selected images from their current positions
  const selectedImages = selectedImageIds.map(id => 
    images.find(image => image.id === id)
  ).filter((image): image is NonNullable<typeof image> => image !== undefined);
  
  images = images.filter(image => !selectedImageIds.includes(image.id));
  
  // Add selected images to the beginning (back in rendering order)
  images.unshift(...selectedImages);
  
  // Update the store
  useEditorStore.setState({ images });
};

// Use element reorder functions
const moveUsesToFront = () => {
  const store = useEditorStore.getState();
  const selectedUseIds = store.selection.selectedUses;
  
  if (selectedUseIds.length === 0) return;
  
  // Get current uses array
  let uses = [...store.uses];
  
  // Remove selected uses from their current positions
  const selectedUses = selectedUseIds.map(id => 
    uses.find(use => use.id === id)
  ).filter((use): use is NonNullable<typeof use> => use !== undefined);
  
  uses = uses.filter(use => !selectedUseIds.includes(use.id));
  
  // Add selected uses to the end (front in rendering order)
  uses.push(...selectedUses);
  
  // Update the store
  useEditorStore.setState({ uses });
};

const moveUsesToBack = () => {
  const store = useEditorStore.getState();
  const selectedUseIds = store.selection.selectedUses;
  
  if (selectedUseIds.length === 0) return;
  
  // Get current uses array
  let uses = [...store.uses];
  
  // Remove selected uses from their current positions
  const selectedUses = selectedUseIds.map(id => 
    uses.find(use => use.id === id)
  ).filter((use): use is NonNullable<typeof use> => use !== undefined);
  
  uses = uses.filter(use => !selectedUseIds.includes(use.id));
  
  // Add selected uses to the beginning (back in rendering order)
  uses.unshift(...selectedUses);
  
  // Update the store
  useEditorStore.setState({ uses });
};

// Mixed selection reorder functions
const moveMixedSelectionToFront = () => {
  const store = useEditorStore.getState();
  
  // Move each type of element to front in its respective array
  if (store.selection.selectedTexts.length > 0) {
    moveTextsToFront();
  }
  
  if (store.selection.selectedImages.length > 0) {
    moveImagesToFront();
  }
  
  if (store.selection.selectedUses.length > 0) {
    moveUsesToFront();
  }
  
  if (store.selection.selectedSubPaths.length > 0) {
    const reorderManager = new ReorderManager();
    reorderManager.setEditorStore(store);
    reorderManager.bringToFront();
  }
};

const moveMixedSelectionToBack = () => {
  const store = useEditorStore.getState();
  
  // Move each type of element to back in its respective array
  if (store.selection.selectedTexts.length > 0) {
    moveTextsToBack();
  }
  
  if (store.selection.selectedImages.length > 0) {
    moveImagesToBack();
  }
  
  if (store.selection.selectedUses.length > 0) {
    moveUsesToBack();
  }
  
  if (store.selection.selectedSubPaths.length > 0) {
    const reorderManager = new ReorderManager();
    reorderManager.setEditorStore(store);
    reorderManager.sendToBack();
  }
};
