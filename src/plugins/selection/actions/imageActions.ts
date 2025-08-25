import { 
  Copy, 
  Trash2, 
  Lock, 
  Filter, 
  Move, 
  Group, 
  Palette, 
  Brush, 
  LineSquiggle, 
  Play, 
  RotateCcw, 
  PaintBucket,
  ArrowUp
} from 'lucide-react';
import { ToolbarAction } from '../../../types/floatingToolbar';
import { useEditorStore } from '../../../store/editorStore';
import { duplicateSelected, deleteSelected, getSelectedElementsBounds } from './commonActions';
import { createGenericArrangeActions } from '../../../utils/floating-arrange-actions';
import { createReorderActions, createElementReorderFunctions } from '../../../utils/floating-reorder-actions';
import { arrangeManager } from '../../../plugins/arrange/ArrangeManager';
import {
  createDropShadowFilter,
  createBlurFilter,
  createGrayscaleFilter,
  createSepiaFilter,
  createEmbossFilter,
  createGlowFilter,
  createNeonGlowFilter,
  formatSVGReference,
  matchesFilterSignature
} from '../../../utils/svg-elements-utils';

// Get common opacity for selected images
const getCommonImageOpacity = (): number => {
  const store = useEditorStore.getState();
  const selectedImages = store.selection.selectedImages;
  
  if (selectedImages.length === 0) return 1;
  
  const firstImage = store.images.find(img => img.id === selectedImages[0]);
  const opacity = firstImage?.style?.opacity || firstImage?.style?.fillOpacity;
  return typeof opacity === 'number' ? opacity : 1;
};

// Apply opacity to selected images
const applyImageOpacity = (opacity: number) => {
  const store = useEditorStore.getState();
  const selectedImages = store.selection.selectedImages;
  
  // Save to history before changing opacity
  store.pushToHistory();
  
  selectedImages.forEach(imageId => {
    const image = store.images.find(img => img.id === imageId);
    if (image) {
      store.updateImage(imageId, { 
        style: { 
          ...image.style, 
          opacity: opacity,
          fillOpacity: opacity
        } 
      });
    }
  });
};

// Get common stroke color for selected images
const getCommonImageStrokeColor = (): string | any => {
  const store = useEditorStore.getState();
  const selectedImages = store.selection.selectedImages;
  
  if (selectedImages.length === 0) return '#000000';
  
  const firstImage = store.images.find(img => img.id === selectedImages[0]);
  const stroke = firstImage?.style?.stroke;
  
  // Return the actual stroke value (string, gradient object, or pattern object)
  if (stroke !== undefined && stroke !== null) {
    return stroke;
  }
  
  return '#000000';
};

// Apply stroke color to selected images
const applyImageStrokeColor = (color: string | any) => {
  const store = useEditorStore.getState();
  const selectedImages = store.selection.selectedImages;
  
  // Save to history before changing colors
  store.pushToHistory();
  
  // If color is a gradient or pattern object, add it to the store
  if (typeof color === 'object' && color && color.id && (color.type === 'linear' || color.type === 'radial' || color.type === 'pattern')) {
    // Check if gradient/pattern already exists in store
    const existingItem = store.gradients.find((g: any) => g.id === color.id);
    
    if (!existingItem) {
      store.addGradient(color);
    }
  }
  
  selectedImages.forEach(imageId => {
    const image = store.images.find(img => img.id === imageId);
    if (image) {
      store.updateImage(imageId, { 
        style: { 
          ...image.style, 
          stroke: color 
        } 
      });
    }
  });
};

// Get common stroke width for selected images
const getCommonImageStrokeWidth = () => {
  const store = useEditorStore.getState();
  const selectedImages = store.selection.selectedImages;
  
  if (selectedImages.length === 0) return 1;
  
  const firstImage = store.images.find(img => img.id === selectedImages[0]);
  return firstImage?.style?.strokeWidth || 1;
};

// Apply stroke width to selected images
const applyImageStrokeWidth = (width: string | number) => {
  const store = useEditorStore.getState();
  const selectedImages = store.selection.selectedImages;
  const strokeWidth = typeof width === 'number' ? width : parseFloat(width);
  
  if (!isNaN(strokeWidth) && strokeWidth >= 0) {
    // Save to history before changing stroke width
    store.pushToHistory();
    
    selectedImages.forEach(imageId => {
      const image = store.images.find(img => img.id === imageId);
      if (image) {
        store.updateImage(imageId, { 
          style: { 
            ...image.style, 
            strokeWidth 
          } 
        });
      }
    });
  }
};

// Get common stroke opacity for selected images
const getCommonImageStrokeOpacity = () => {
  const store = useEditorStore.getState();
  const selectedImages = store.selection.selectedImages;
  
  if (selectedImages.length === 0) return 1;
  
  const firstImage = store.images.find(img => img.id === selectedImages[0]);
  return firstImage?.style?.strokeOpacity ?? 1;
};

// Apply stroke opacity to selected images
const applyImageStrokeOpacity = (opacity: number) => {
  const store = useEditorStore.getState();
  const selectedImages = store.selection.selectedImages;
  
  if (opacity >= 0 && opacity <= 1) {
    // Save to history before changing stroke opacity
    store.pushToHistory();
    
    selectedImages.forEach(imageId => {
      const image = store.images.find(img => img.id === imageId);
      if (image) {
        store.updateImage(imageId, { 
          style: { 
            ...image.style, 
            strokeOpacity: opacity 
          } 
        });
      }
    });
  }
};

// Simplified stroke dash functions for images
const getCommonImageStrokeDash = () => {
  const store = useEditorStore.getState();
  const selectedImages = store.selection.selectedImages;
  
  if (selectedImages.length === 0) return 'none';
  
  const firstImage = store.images.find(img => img.id === selectedImages[0]);
  const strokeDash = firstImage?.style?.strokeDasharray;
  return typeof strokeDash === 'string' ? strokeDash : 'none';
};

const getCommonImageStrokeLinecap = () => {
  const store = useEditorStore.getState();
  const selectedImages = store.selection.selectedImages;
  
  if (selectedImages.length === 0) return 'butt';
  
  const firstImage = store.images.find(img => img.id === selectedImages[0]);
  const strokeLinecap = firstImage?.style?.strokeLinecap;
  return typeof strokeLinecap === 'string' ? strokeLinecap : 'butt';
};

const getCommonImageStrokeLinejoin = () => {
  const store = useEditorStore.getState();
  const selectedImages = store.selection.selectedImages;
  
  if (selectedImages.length === 0) return 'miter';
  
  const firstImage = store.images.find(img => img.id === selectedImages[0]);
  const strokeLinejoin = firstImage?.style?.strokeLinejoin;
  return typeof strokeLinejoin === 'string' ? strokeLinejoin : 'miter';
};

const applyImageStrokeDash = (dash: string) => {
  const store = useEditorStore.getState();
  const selectedImages = store.selection.selectedImages;
  
  // Save to history before changing stroke dash
  store.pushToHistory();
  
  selectedImages.forEach(imageId => {
    const image = store.images.find(img => img.id === imageId);
    if (image) {
      store.updateImage(imageId, { 
        style: { 
          ...image.style, 
          strokeDasharray: dash 
        } 
      });
    }
  });
};

const applyImageStrokeLinecap = (linecap: string) => {
  const store = useEditorStore.getState();
  const selectedImages = store.selection.selectedImages;
  
  // Save to history before changing stroke linecap
  store.pushToHistory();
  
  selectedImages.forEach(imageId => {
    const image = store.images.find(img => img.id === imageId);
    if (image) {
      store.updateImage(imageId, { 
        style: { 
          ...image.style, 
          strokeLinecap: linecap as any 
        } 
      });
    }
  });
};

const applyImageStrokeLinejoin = (linejoin: string) => {
  const store = useEditorStore.getState();
  const selectedImages = store.selection.selectedImages;
  
  // Save to history before changing stroke linejoin
  store.pushToHistory();
  
  selectedImages.forEach(imageId => {
    const image = store.images.find(img => img.id === imageId);
    if (image) {
      store.updateImage(imageId, { 
        style: { 
          ...image.style, 
          strokeLinejoin: linejoin as any 
        } 
      });
    }
  });
};

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

// Image reorder functions
const createImageReorderActions = () => {
  const { bringToFront, sendToBack } = createElementReorderFunctions('image');
  
  return createReorderActions(
    'image',
    getImageSelectionCount,
    { bringToFront, sendToBack }
  );
};

// Get selected images utility function
const getSelectedImages = () => {
  const store = useEditorStore.getState();
  return store.selection.selectedImages.map(imageId => 
    store.images.find(img => img.id === imageId)
  ).filter(Boolean);
};

// Generic function to apply filters to images
const applyFilterToImages = (filterCreatorFn: () => any) => {
  const store = useEditorStore.getState();
  const selectedImages = getSelectedImages();
  
  if (selectedImages.length === 0) return;
  
  // Save to history before applying filters
  store.pushToHistory();
  
  // Create the filter
  const filterData = filterCreatorFn();
  store.addFilter(filterData);
  
  // Apply using a timeout to ensure the store is updated
  setTimeout(() => {
    // Access filters from the store directly to get the most current state
    const storeState = useEditorStore.getState();
    const currentFilters = storeState.filters;
    const newFilter = currentFilters[currentFilters.length - 1]; // Get the last added filter
    
    if (newFilter && newFilter.id) {
      const filterRef = formatSVGReference(newFilter.id);
      
      // Apply filter to each selected image
      selectedImages.forEach(image => {
        if (image && image.id) {
          storeState.updateImage(image.id, { 
            style: {
              ...image.style,
              filter: filterRef
            }
          });
        }
      });
    }
  }, 0);
};

// Specific filter functions
const applyBlurFilterToImages = () => applyFilterToImages(createBlurFilter);
const applyDropShadowToImages = () => applyFilterToImages(createDropShadowFilter);
const applyGlowFilterToImages = () => applyFilterToImages(createGlowFilter);
const applyGrayscaleFilterToImages = () => applyFilterToImages(createGrayscaleFilter);
const applySepiaFilterToImages = () => applyFilterToImages(createSepiaFilter);
const applyEmbossFilterToImages = () => applyFilterToImages(createEmbossFilter);
const applyNeonGlowFilterToImages = () => applyFilterToImages(createNeonGlowFilter);

// Add fade animation to images
const addFadeAnimationToImages = () => {
  const store = useEditorStore.getState();
  const selectedImages = getSelectedImages();
  
  // Save to history before adding animations
  store.pushToHistory();
  
  selectedImages.forEach(image => {
    if (image && image.id) {
      const opacityAnimation = {
        targetElementId: image.id,
        type: 'animate' as const,
        attributeName: 'opacity',
        from: '1',
        to: '0.2',
        dur: '2s',
        repeatCount: 'indefinite'
      };
      
      store.addAnimation(opacityAnimation);
    }
  });
};

// Add rotation animation to images
const addRotateAnimationToImages = () => {
  const store = useEditorStore.getState();
  const selectedImages = getSelectedImages();
  
  // Save to history before adding animations
  store.pushToHistory();
  
  selectedImages.forEach(image => {
    if (image && image.id) {
      const rotationAnimation = {
        targetElementId: image.id,
        type: 'animateTransform' as const,
        attributeName: 'transform',
        transformType: 'rotate',
        from: '0 200 200',
        to: '360 200 200', 
        dur: '3s',
        repeatCount: 'indefinite'
      };
      
      store.addAnimation(rotationAnimation);
    }
  });
};

// Function to open filter panel
const openFilterPanel = async () => {
  // Use pluginManager to open filter panel (handles both mobile and desktop)
  const { pluginManager } = await import('../../../core/PluginSystem');
  pluginManager.openFilterPanel();
};

// Check if a specific filter is active on selected images
const isImageFilterActive = (filterType: string): boolean => {
  const store = useEditorStore.getState();
  const selectedImages = getSelectedImages();
  
  if (selectedImages.length === 0) return false;
  
  // Check if any selected image has a filter applied
  return selectedImages.some(image => {
    const filterRef = image?.style?.filter;
    if (!filterRef || typeof filterRef !== 'string') return false;
    
    // Extract filter ID from url(#id) format
    const match = filterRef.match(/url\(#([^)]+)\)/);
    if (!match) return false;
    
    const filterId = match[1];
    
    // Find the filter in the store
    const filter = store.filters.find(f => f.id === filterId);
    if (!filter) return false;
    
    // Use the shared filter signature matching function
    return matchesFilterSignature(filter.primitives, filterType);
  });
};

// Remove specific filter from selected images
const removeImageFilter = (filterType: string) => {
  const store = useEditorStore.getState();
  const selectedImages = getSelectedImages();
  
  if (selectedImages.length === 0) return;
  
  store.pushToHistory();
  
  selectedImages.forEach(image => {
    const filterRef = image?.style?.filter;
    if (!filterRef || typeof filterRef !== 'string') return;
    
    // Extract filter ID from url(#id) format
    const match = filterRef.match(/url\(#([^)]+)\)/);
    if (!match) return;
    
    const filterId = match[1];
    
    // Find the filter in the store
    const filter = store.filters.find(f => f.id === filterId);
    if (!filter) return;
    
    // Check if this filter matches the type we want to remove using the shared signature matching
    const shouldRemove = matchesFilterSignature(filter.primitives, filterType);
    
    if (shouldRemove) {
      // Remove the filter by setting it to undefined
      store.updateImage(image.id, { style: { ...image.style, filter: undefined } });
    }
  });
};

// Remove specific animation from selected images
const removeImageAnimation = (animationType: string) => {
  const store = useEditorStore.getState();
  const selectedImages = getSelectedImages();
  
  if (selectedImages.length === 0) return;
  
  store.pushToHistory();
  
  selectedImages.forEach(image => {
    if (!image) return;
    
    // Find animations that match the type and target this image
    const animationsToRemove = store.animations.filter(animation => {
      if (animation.targetElementId !== image.id) return false;
      
      switch (animationType) {
        case 'fade':
          return animation.type === 'animate' && (animation as any).attributeName === 'opacity';
        case 'rotate':
          return animation.type === 'animateTransform' && 
                 (animation as any).transformType === 'rotate';
        default:
          return false;
      }
    });
    
    // Remove each matching animation
    animationsToRemove.forEach(animation => {
      store.removeAnimation(animation.id);
    });
  });
};

// Toggle functions that either apply or remove filters/animations
const toggleImageFilter = (filterType: string, applyFunction: () => void) => {
  if (isImageFilterActive(filterType)) {
    removeImageFilter(filterType);
  } else {
    applyFunction();
  }
};

const toggleImageAnimation = (animationType: string, applyFunction: () => void) => {
  if (isImageAnimationActive(animationType)) {
    removeImageAnimation(animationType);
  } else {
    applyFunction();
  }
};

// Image filter options
const imageFilterOptions = [
  { 
    id: 'image-blur', 
    label: 'Blur', 
    action: () => toggleImageFilter('blur', applyBlurFilterToImages),
    active: () => isImageFilterActive('blur')
  },
  { 
    id: 'image-shadow', 
    label: 'Drop Shadow', 
    action: () => toggleImageFilter('shadow', applyDropShadowToImages),
    active: () => isImageFilterActive('shadow')
  },
  { 
    id: 'image-glow', 
    label: 'Glow', 
    action: () => toggleImageFilter('glow', applyGlowFilterToImages),
    active: () => isImageFilterActive('glow')
  },
  { 
    id: 'image-grayscale', 
    label: 'Grayscale', 
    action: () => toggleImageFilter('grayscale', applyGrayscaleFilterToImages),
    active: () => isImageFilterActive('grayscale')
  },
  { 
    id: 'image-sepia', 
    label: 'Sepia', 
    action: () => toggleImageFilter('sepia', applySepiaFilterToImages),
    active: () => isImageFilterActive('sepia')
  },
  { 
    id: 'image-emboss', 
    label: 'Emboss', 
    action: () => toggleImageFilter('emboss', applyEmbossFilterToImages),
    active: () => isImageFilterActive('emboss')
  },
  { 
    id: 'image-neon-glow', 
    label: 'Neon Glow', 
    action: () => toggleImageFilter('neon-glow', applyNeonGlowFilterToImages),
    active: () => isImageFilterActive('neon-glow')
  },
  { id: 'image-more-filters', label: 'More ...', action: openFilterPanel }
];

// Function to open animation panel
const openAnimationPanel = async () => {
  // Use pluginManager to open animation panel (handles both mobile and desktop)
  const { pluginManager } = await import('../../../core/PluginSystem');
  pluginManager.openAnimationPanel();
};

// Check if a specific animation is active on selected images
const isImageAnimationActive = (animationType: string): boolean => {
  const store = useEditorStore.getState();
  const selectedImages = getSelectedImages();
  
  if (selectedImages.length === 0) return false;
  
  // Check if any selected image has an animation applied
  return selectedImages.some(image => {
    if (!image) return false;
    
    return store.animations.some(animation => {
      if (animation.targetElementId !== image.id) return false;
      
      switch (animationType) {
        case 'fade':
          return animation.type === 'animate' && (animation as any).attributeName === 'opacity';
        case 'rotate':
          return animation.type === 'animateTransform' && 
                 (animation as any).transformType === 'rotate';
        default:
          return false;
      }
    });
  });
};

// Image animation options
const imageAnimationOptions = [
  { 
    id: 'image-fade', 
    label: 'Fade In/Out', 
    action: () => toggleImageAnimation('fade', addFadeAnimationToImages),
    active: () => isImageAnimationActive('fade')
  },
  { 
    id: 'image-rotate', 
    label: 'Rotate', 
    action: () => toggleImageAnimation('rotate', addRotateAnimationToImages),
    active: () => isImageAnimationActive('rotate')
  },
  { id: 'image-more-animations', label: 'More ...', action: openAnimationPanel }
];

// Clear style for selected images - reset to default values
const clearImageStyle = () => {
  const store = useEditorStore.getState();
  const selectedImages = store.selection.selectedImages;
  
  if (selectedImages.length === 0) return;
  
  store.pushToHistory();
  
  // Define default image style values
  const defaultStyle = {
    stroke: undefined,
    strokeWidth: undefined,
    strokeDasharray: undefined,
    strokeLinecap: undefined,
    strokeLinejoin: undefined,
    filter: undefined,
    opacity: undefined,
    strokeOpacity: undefined
  };
  
  // Apply default style to all selected images
  selectedImages.forEach(imageId => {
    const image = store.images.find(img => img.id === imageId);
    if (image) {
      // Create a new style object by explicitly removing the properties we want to reset
      const currentStyle = image.style || {};
      const newStyle = { ...currentStyle };
      
      // Delete properties that should be reset
      delete newStyle.stroke;
      delete newStyle.strokeWidth;
      delete newStyle.strokeDasharray;
      delete newStyle.strokeLinecap;
      delete newStyle.strokeLinejoin;
      delete newStyle.strokeOpacity;
      delete newStyle.filter;
      delete newStyle.opacity;
      
      store.updateImage(imageId, { 
        style: newStyle
      });
    }
  });
};

// Format copy functions for images
const startImageFormatCopy = () => {
  const store = useEditorStore.getState();
  
  // Check if image format copy is already active - if so, cancel it
  if (store.isImageFormatCopyActive && store.isImageFormatCopyActive()) {
    store.cancelImageFormatCopy();
    return;
  }
  
  const selectedImages = store.selection.selectedImages;
  
  if (selectedImages.length === 0) return;
  
  // Get the first selected image ID
  const firstImageId = selectedImages[0];
  
  // Start image format copy with image ID
  store.startImageFormatCopy(firstImageId);
};

const isImageFormatCopyActive = (): boolean => {
  const store = useEditorStore.getState();
  return store.isImageFormatCopyActive();
};

export const imageActions: ToolbarAction[] = [
  {
    id: 'copy-format-image',
    icon: PaintBucket,
    label: 'Copy Format',
    type: 'toggle',
    toggle: {
      isActive: isImageFormatCopyActive,
      onToggle: startImageFormatCopy
    },
    priority: 1000,
    tooltip: 'Copy format (styles, filters, effects)'
  },
  {
    id: 'image-opacity',
    icon: Palette,
    label: 'Opacity',
    type: 'input',
    input: {
      currentValue: Math.round(getCommonImageOpacity() * 100),
      onChange: (value: string | number) => {
        const opacity = typeof value === 'string' ? parseFloat(value) / 100 : value / 100;
        if (!isNaN(opacity) && opacity >= 0 && opacity <= 1) {
          applyImageOpacity(opacity);
        }
      },
      type: 'number',
      placeholder: '100'
    },
    opacityOptions: {
      getCurrentOpacity: () => getCommonImageOpacity() * 100,
      onOpacityChange: (opacity: number) => applyImageOpacity(opacity / 100),
      quickValues: [0, 25, 50, 75, 100],
      unit: '%'
    },
    priority: 110,
    tooltip: 'Change image opacity (0-100%)'
  },
  {
    id: 'group-images',
    icon: Group,
    label: 'Group',
    type: 'button',
    action: groupSelectedImages,
    priority: 105,
    tooltip: 'Group selected images',
    visible: () => {
      // Only show when multiple images are selected
      const store = useEditorStore.getState();
      return store.selection.selectedImages.length >= 2;
    }
  },
  // Add arrange actions for image elements
  ...createImageArrangeActions(),
  // Add reorder actions for image elements
  ...createImageReorderActions(),
  {
    id: 'image-stroke-color',
    icon: Brush,
    label: 'Stroke Color',
    type: 'color',
    color: {
      currentColor: getCommonImageStrokeColor(),
      onChange: applyImageStrokeColor
    },
    priority: 95,
    tooltip: 'Change image stroke color'
  },
  {
    id: 'image-stroke-options',
    icon: LineSquiggle,
    label: 'Stroke Options',
    type: 'input',
    input: {
      currentValue: getCommonImageStrokeWidth(),
      onChange: applyImageStrokeWidth,
      type: 'number',
      placeholder: '1'
    },
    strokeOptions: {
      getCurrentStrokeWidth: getCommonImageStrokeWidth,
      getCurrentStrokeDash: getCommonImageStrokeDash,
      getCurrentStrokeLinecap: getCommonImageStrokeLinecap,
      getCurrentStrokeLinejoin: getCommonImageStrokeLinejoin,
      getCurrentStrokeOpacity: getCommonImageStrokeOpacity,
      onStrokeWidthChange: applyImageStrokeWidth,
      onStrokeDashChange: applyImageStrokeDash,
      onStrokeLinecapChange: applyImageStrokeLinecap,
      onStrokeLinejoinChange: applyImageStrokeLinejoin,
      onStrokeOpacityChange: applyImageStrokeOpacity
    },
    priority: 90,
    tooltip: 'Configure stroke width, dash pattern, line cap, and line join'
  },
  {
    id: 'image-filters',
    icon: Filter,
    label: 'Filters',
    type: 'dropdown',
    dropdown: {
      options: imageFilterOptions
    },
    priority: 60,
    tooltip: 'Apply filters'
  },
  {
    id: 'image-animations',
    icon: Play,
    label: 'Animations',
    type: 'dropdown',
    dropdown: {
      options: imageAnimationOptions
    },
    priority: 50,
    tooltip: 'Add animations'
  },
  {
    id: 'duplicate-image',
    icon: Copy,
    label: 'Duplicate',
    type: 'button',
    action: duplicateSelected, // Use unified duplicate function
    priority: 20,
    tooltip: 'Duplicate image'
  },
  {
    id: 'image-clear-style',
    icon: RotateCcw,
    label: 'Reset',
    type: 'button',
    action: clearImageStyle,
    priority: 15,
    tooltip: 'Reset image to default style (removes stroke, filters, animations)'
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
    priority: 12,
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