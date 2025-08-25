import { BoundingBox, Point, SelectionState, SVGPath, TextElementType, SVGImage, SVGUse, SVGGroup } from '../types';
import { getTextBoundingBox, getImageBoundingBox, getPathBoundingBox, getGroupBoundingBox } from './bbox-utils';
import { useEditorStore } from '../store/editorStore';

/**
 * Standard duplication offset configuration
 */
export const DUPLICATION_CONFIG = {
  // Base offset for small elements or single elements
  BASE_OFFSET: 32,
  // Minimum offset to ensure visibility
  MIN_OFFSET: 20,
  // Padding to add for consistent spacing
  PADDING: 8,
  // Maximum offset to prevent elements from going too far (only for individual elements)
  MAX_OFFSET_INDIVIDUAL: 200,
  // Higher limit for multiple selections that use absolute positioning
  MAX_OFFSET_MULTIPLE: 2000,
  // Minimum guaranteed offset for multiple selections to avoid overlapping
  MIN_MULTIPLE_OFFSET: 80
} as const;

/**
 * Calculate intelligent duplication offset based on element bounds
 * For individual elements, positions the copy at the bottom-right corner plus offset
 * For multiple elements, uses the same logic but applied to the entire selection bounds
 */
export function calculateDuplicationOffset(bounds: BoundingBox | null): Point {
  if (!bounds) {
    return { x: DUPLICATION_CONFIG.BASE_OFFSET, y: DUPLICATION_CONFIG.BASE_OFFSET };
  }

  // For individual elements, use bottom-right corner as reference point
  // Add the width/height to position at bottom-right, plus padding
  const offsetX = bounds.width + DUPLICATION_CONFIG.PADDING;
  const offsetY = bounds.height + DUPLICATION_CONFIG.PADDING;
  
  // Clamp the offset within reasonable bounds
  const clampedOffsetX = Math.max(
    DUPLICATION_CONFIG.MIN_OFFSET,
    Math.min(offsetX, DUPLICATION_CONFIG.MAX_OFFSET_INDIVIDUAL)
  );
  
  const clampedOffsetY = Math.max(
    DUPLICATION_CONFIG.MIN_OFFSET,
    Math.min(offsetY, DUPLICATION_CONFIG.MAX_OFFSET_INDIVIDUAL)
  );

  return {
    x: Math.max(clampedOffsetX, DUPLICATION_CONFIG.BASE_OFFSET),
    y: Math.max(clampedOffsetY, DUPLICATION_CONFIG.BASE_OFFSET)
  };
}

/**
 * Get bounding box for a single path
 */
export function getPathBounds(path: SVGPath): BoundingBox | null {
  return getPathBoundingBox(path);
}

/**
 * Get bounding box for a single text element
 */
export function getTextBounds(text: TextElementType): BoundingBox {
  return getTextBoundingBox(text);
}

/**
 * Get bounding box for a single image element
 */
export function getImageBounds(image: SVGImage): BoundingBox {
  return getImageBoundingBox(image);
}

/**
 * Get bounding box for a single use element
 */
export function getUseBounds(use: SVGUse): BoundingBox {
  return {
    x: use.x || 0,
    y: use.y || 0,
    width: use.width || 50,
    height: use.height || 50
  };
}

/**
 * Get bounding box for a single group element
 */
export function getGroupBounds(group: SVGGroup): BoundingBox | null {
  const store = useEditorStore.getState();
  return getGroupBoundingBox(group, store.paths, store.texts, store.images, store.groups);
}

/**
 * Get bounding box for selected subpaths
 */
export function getSelectedSubPathsBounds(paths: SVGPath[], selectedSubPathIds: string[]): BoundingBox | null {
  if (selectedSubPathIds.length === 0) return null;
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let hasValidBounds = false;
  
  paths.forEach(path => {
    path.subPaths.forEach(subPath => {
      if (selectedSubPathIds.includes(subPath.id)) {
        subPath.commands.forEach(command => {
          if (command.x !== undefined && command.y !== undefined) {
            minX = Math.min(minX, command.x);
            maxX = Math.max(maxX, command.x);
            minY = Math.min(minY, command.y);
            maxY = Math.max(maxY, command.y);
            hasValidBounds = true;
          }
          
          // Include control points for curves
          if (command.x1 !== undefined && command.y1 !== undefined) {
            minX = Math.min(minX, command.x1);
            maxX = Math.max(maxX, command.x1);
            minY = Math.min(minY, command.y1);
            maxY = Math.max(maxY, command.y1);
          }
          
          if (command.x2 !== undefined && command.y2 !== undefined) {
            minX = Math.min(minX, command.x2);
            maxX = Math.max(maxX, command.x2);
            minY = Math.min(minY, command.y2);
            maxY = Math.max(maxY, command.y2);
          }
        });
      }
    });
  });
  
  if (!hasValidBounds || !isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
    return null;
  }
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Get bounding box for selected commands
 */
export function getSelectedCommandsBounds(paths: SVGPath[], selectedCommandIds: string[]): BoundingBox | null {
  if (selectedCommandIds.length === 0) return null;
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let hasValidBounds = false;
  
  paths.forEach(path => {
    path.subPaths.forEach(subPath => {
      subPath.commands.forEach(command => {
        if (selectedCommandIds.includes(command.id)) {
          if (command.x !== undefined && command.y !== undefined) {
            minX = Math.min(minX, command.x);
            maxX = Math.max(maxX, command.x);
            minY = Math.min(minY, command.y);
            maxY = Math.max(maxY, command.y);
            hasValidBounds = true;
          }
          
          // Include control points for curves
          if (command.x1 !== undefined && command.y1 !== undefined) {
            minX = Math.min(minX, command.x1);
            maxX = Math.max(maxX, command.x1);
            minY = Math.min(minY, command.y1);
            maxY = Math.max(maxY, command.y1);
          }
          
          if (command.x2 !== undefined && command.y2 !== undefined) {
            minX = Math.min(minX, command.x2);
            maxX = Math.max(maxX, command.x2);
            minY = Math.min(minY, command.y2);
            maxY = Math.max(maxY, command.y2);
          }
        }
      });
    });
  });
  
  if (!hasValidBounds || !isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
    return null;
  }
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Calculate unified bounding box for all selected elements (mixed selection)
 */
export function getUnifiedSelectionBounds(selection: SelectionState): BoundingBox | null {
  const store = useEditorStore.getState();
  const { paths, texts, images, uses, groups } = store;
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let hasElements = false;

  // Include selected paths
  selection.selectedPaths.forEach(pathId => {
    const path = paths.find(p => p.id === pathId);
    if (path) {
      const bbox = getPathBounds(path);
      if (bbox) {
        minX = Math.min(minX, bbox.x);
        maxX = Math.max(maxX, bbox.x + bbox.width);
        minY = Math.min(minY, bbox.y);
        maxY = Math.max(maxY, bbox.y + bbox.height);
        hasElements = true;
      }
    }
  });

  // Include selected subpaths
  if (selection.selectedSubPaths.length > 0) {
    const subPathBounds = getSelectedSubPathsBounds(paths, selection.selectedSubPaths);
    if (subPathBounds) {
      minX = Math.min(minX, subPathBounds.x);
      maxX = Math.max(maxX, subPathBounds.x + subPathBounds.width);
      minY = Math.min(minY, subPathBounds.y);
      maxY = Math.max(maxY, subPathBounds.y + subPathBounds.height);
      hasElements = true;
    }
  }

  // Include selected commands
  if (selection.selectedCommands.length > 0) {
    const commandBounds = getSelectedCommandsBounds(paths, selection.selectedCommands);
    if (commandBounds) {
      minX = Math.min(minX, commandBounds.x);
      maxX = Math.max(maxX, commandBounds.x + commandBounds.width);
      minY = Math.min(minY, commandBounds.y);
      maxY = Math.max(maxY, commandBounds.y + commandBounds.height);
      hasElements = true;
    }
  }

  // Include selected texts
  selection.selectedTexts.forEach(textId => {
    const text = texts.find(t => t.id === textId);
    if (text) {
      const bbox = getTextBounds(text);
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
      const bbox = getImageBounds(image);
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
      const bbox = getUseBounds(use);
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
      const bbox = getGroupBounds(group);
      if (bbox) {
        minX = Math.min(minX, bbox.x);
        maxX = Math.max(maxX, bbox.x + bbox.width);
        minY = Math.min(minY, bbox.y);
        maxY = Math.max(maxY, bbox.y + bbox.height);
        hasElements = true;
      }
    }
  });

  if (!hasElements || !isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
    return null;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Check if the current selection contains multiple types of elements
 */
export function isMultiTypeSelection(selection: SelectionState): boolean {
  const elementCounts = [
    selection.selectedPaths.length,
    selection.selectedSubPaths.length,
    selection.selectedCommands.length,
    selection.selectedTexts.length,
    selection.selectedImages.length,
    selection.selectedUses.length,
    selection.selectedGroups.length
  ];
  
  // Count how many element types have selections
  const nonZeroCounts = elementCounts.filter(count => count > 0);
  return nonZeroCounts.length > 1;
}

/**
 * Calculate smart duplication offset for the current selection
 * This is the main function that should be used by all duplication operations
 */
export function calculateSmartDuplicationOffset(selection: SelectionState): Point {
  const totalCount = getTotalSelectionCount(selection);
  
  // For multiple elements (regardless of type), use unified bounds calculation
  // and position based on bottom-right corner of the entire selection
  if (totalCount > 1) {
    const unifiedBounds = getUnifiedSelectionBounds(selection);
    if (!unifiedBounds) {
      return { x: DUPLICATION_CONFIG.BASE_OFFSET, y: DUPLICATION_CONFIG.BASE_OFFSET };
    }
    
    // Calculate the absolute position of the bottom-right corner
    const bottomRightX = unifiedBounds.x + unifiedBounds.width;
    const bottomRightY = unifiedBounds.y + unifiedBounds.height;
    
    // The duplicated selection should start at bottom-right + padding
    // This means: offset = (bottomRight + padding) - topLeft
    // Simplified: offset = width + padding (to move from left to right edge + padding)
    //             offset = height + padding (to move from top to bottom edge + padding)
    
    // But ensure minimum offset to guarantee no overlapping
    const calculatedOffsetX = unifiedBounds.width + DUPLICATION_CONFIG.PADDING;
    const calculatedOffsetY = unifiedBounds.height + DUPLICATION_CONFIG.PADDING;
    
    const offsetX = Math.max(calculatedOffsetX, DUPLICATION_CONFIG.MIN_MULTIPLE_OFFSET);
    const offsetY = Math.max(calculatedOffsetY, DUPLICATION_CONFIG.MIN_MULTIPLE_OFFSET);
    
    // Clamp the offset within reasonable bounds (higher limit for multiple selections)
    const clampedOffsetX = Math.max(
      DUPLICATION_CONFIG.MIN_OFFSET,
      Math.min(offsetX, DUPLICATION_CONFIG.MAX_OFFSET_MULTIPLE)
    );
    
    const clampedOffsetY = Math.max(
      DUPLICATION_CONFIG.MIN_OFFSET,
      Math.min(offsetY, DUPLICATION_CONFIG.MAX_OFFSET_MULTIPLE)
    );

    return {
      x: Math.max(clampedOffsetX, DUPLICATION_CONFIG.BASE_OFFSET),
      y: Math.max(clampedOffsetY, DUPLICATION_CONFIG.BASE_OFFSET)
    };
  }
  
  // For single element, calculate bounds based on type and use bottom-right positioning
  const store = useEditorStore.getState();
  
  // Single path
  if (selection.selectedPaths.length === 1) {
    const path = store.paths.find(p => p.id === selection.selectedPaths[0]);
    if (path) {
      const bounds = getPathBounds(path);
      return calculateDuplicationOffset(bounds);
    }
  }
  
  // Single subpath
  if (selection.selectedSubPaths.length === 1) {
    const bounds = getSelectedSubPathsBounds(store.paths, selection.selectedSubPaths);
    return calculateDuplicationOffset(bounds);
  }
  
  // Single command
  if (selection.selectedCommands.length === 1) {
    const bounds = getSelectedCommandsBounds(store.paths, selection.selectedCommands);
    return calculateDuplicationOffset(bounds);
  }
  
  // Single text
  if (selection.selectedTexts.length === 1) {
    const text = store.texts.find(t => t.id === selection.selectedTexts[0]);
    if (text) {
      const bounds = getTextBounds(text);
      return calculateDuplicationOffset(bounds);
    }
  }
  
  // Single image
  if (selection.selectedImages.length === 1) {
    const image = store.images.find(img => img.id === selection.selectedImages[0]);
    if (image) {
      const bounds = getImageBounds(image);
      return calculateDuplicationOffset(bounds);
    }
  }
  
  // Single use
  if (selection.selectedUses.length === 1) {
    const use = store.uses.find(u => u.id === selection.selectedUses[0]);
    if (use) {
      const bounds = getUseBounds(use);
      return calculateDuplicationOffset(bounds);
    }
  }
  
  // Single group
  if (selection.selectedGroups.length === 1) {
    const group = store.groups.find(g => g.id === selection.selectedGroups[0]);
    if (group) {
      const bounds = getGroupBounds(group);
      return calculateDuplicationOffset(bounds);
    }
  }
  
  // Fallback to base offset
  return { x: DUPLICATION_CONFIG.BASE_OFFSET, y: DUPLICATION_CONFIG.BASE_OFFSET };
}

/**
 * Get total count of selected elements across all types
 */
function getTotalSelectionCount(selection: SelectionState): number {
  return (selection.selectedPaths?.length || 0) +
         (selection.selectedSubPaths?.length || 0) +
         (selection.selectedCommands?.length || 0) +
         (selection.selectedTexts?.length || 0) +
         (selection.selectedImages?.length || 0) +
         (selection.selectedUses?.length || 0) +
         (selection.selectedGroups?.length || 0);
}
