import { BoundingBox, Point, SVGPath, SVGSubPath, SVGCommand, TextElementType, SVGGroup } from '../types';

/**
 * Calculate bounding box for a single SVG command
 */
export function getCommandBoundingBox(command: SVGCommand): BoundingBox | null {
  if (command.x === undefined || command.y === undefined) {
    return null;
  }

  let minX = command.x;
  let maxX = command.x;
  let minY = command.y;
  let maxY = command.y;

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

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Calculate bounding box for a sub-path
 */
export function getSubPathBoundingBox(subPath: SVGSubPath): BoundingBox | null {
  if (subPath.commands.length === 0) {
    return null;
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const command of subPath.commands) {
    const bbox = getCommandBoundingBox(command);
    if (bbox) {
      minX = Math.min(minX, bbox.x);
      maxX = Math.max(maxX, bbox.x + bbox.width);
      minY = Math.min(minY, bbox.y);
      maxY = Math.max(maxY, bbox.y + bbox.height);
    }
  }

  if (minX === Infinity) {
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
 * Calculate bounding box for a path (includes all sub-paths)
 */
export function getPathBoundingBox(path: SVGPath): BoundingBox | null {
  if (path.subPaths.length === 0) {
    return null;
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const subPath of path.subPaths) {
    if (subPath.locked) continue;
    
    const bbox = getSubPathBoundingBox(subPath);
    if (bbox) {
      minX = Math.min(minX, bbox.x);
      maxX = Math.max(maxX, bbox.x + bbox.width);
      minY = Math.min(minY, bbox.y);
      maxY = Math.max(maxY, bbox.y + bbox.height);
    }
  }

  if (minX === Infinity) {
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
 * Calculate bounding box for text element
 */
export function getTextBoundingBox(text: TextElementType): BoundingBox {
  // For text, we need to estimate the bounding box based on font size
  // This is a simplified calculation - in a real implementation you'd measure actual text
  const fontSize = text.style?.fontSize || 16;
  
  let estimatedWidth = 0;
  let estimatedHeight = fontSize * 1.2; // Include line height
  
  if (text.type === 'text') {
    // Single line text
    estimatedWidth = text.content.length * fontSize * 0.6; // Rough estimate
  } else if (text.type === 'multiline-text') {
    // Multiline text - use longest span
    estimatedWidth = text.spans.reduce((maxWidth, span) => {
      const spanWidth = span.content.length * fontSize * 0.6;
      return Math.max(maxWidth, spanWidth);
    }, 0);
    estimatedHeight = text.spans.length * fontSize * 1.2;
  }

  return {
    x: text.x,
    y: text.y - estimatedHeight * 0.8, // Adjust for text baseline
    width: estimatedWidth,
    height: estimatedHeight
  };
}

/**
 * Calculate bounding box for group
 */
export function getGroupBoundingBox(group: SVGGroup): BoundingBox {
  // For groups, we need to calculate the bounding box from child elements
  // This is a simplified implementation - in reality you'd need to traverse all children
  // For now, we'll use a default bounding box
  return {
    x: 0, // Groups don't have direct x,y coordinates
    y: 0,
    width: 100, // Default width
    height: 100 // Default height
  };
}

/**
 * Get the 5 key points of a bounding box: 4 corners + center
 */
export function getBoundingBoxKeyPoints(bbox: BoundingBox): Point[] {
  const centerX = bbox.x + bbox.width / 2;
  const centerY = bbox.y + bbox.height / 2;

  return [
    // Four corners
    { x: bbox.x, y: bbox.y }, // Top-left
    { x: bbox.x + bbox.width, y: bbox.y }, // Top-right
    { x: bbox.x, y: bbox.y + bbox.height }, // Bottom-left
    { x: bbox.x + bbox.width, y: bbox.y + bbox.height }, // Bottom-right
    // Center
    { x: centerX, y: centerY }
  ];
}

/**
 * Get the 5 key points of a bounding box with extended alignment points
 * Includes corners, center, and edge midpoints
 */
export function getBoundingBoxAlignmentPoints(bbox: BoundingBox): Point[] {
  const centerX = bbox.x + bbox.width / 2;
  const centerY = bbox.y + bbox.height / 2;

  return [
    // Four corners
    { x: bbox.x, y: bbox.y }, // Top-left
    { x: bbox.x + bbox.width, y: bbox.y }, // Top-right
    { x: bbox.x, y: bbox.y + bbox.height }, // Bottom-left
    { x: bbox.x + bbox.width, y: bbox.y + bbox.height }, // Bottom-right
    // Center
    { x: centerX, y: centerY },
    // Edge midpoints
    { x: centerX, y: bbox.y }, // Top-center
    { x: centerX, y: bbox.y + bbox.height }, // Bottom-center
    { x: bbox.x, y: centerY }, // Left-center
    { x: bbox.x + bbox.width, y: centerY } // Right-center
  ];
}

/**
 * Calculate bounding box for the element being dragged
 */
export function getDraggedElementBoundingBox(
  elementId: string,
  elementType: 'path' | 'text' | 'group',
  paths: SVGPath[],
  texts: TextElementType[],
  groups: SVGGroup[],
  dragOffset: Point
): BoundingBox | null {
  let originalBbox: BoundingBox | null = null;

  if (elementType === 'path') {
    const path = paths.find(p => p.id === elementId);
    if (path) {
      originalBbox = getPathBoundingBox(path);
    }
  } else if (elementType === 'text') {
    const text = texts.find(t => t.id === elementId);
    if (text) {
      originalBbox = getTextBoundingBox(text);
    }
  } else if (elementType === 'group') {
    const group = groups.find(g => g.id === elementId);
    if (group) {
      originalBbox = getGroupBoundingBox(group);
    }
  }

  if (!originalBbox) {
    return null;
  }

  // Apply drag offset to get current position
  return {
    x: originalBbox.x + dragOffset.x,
    y: originalBbox.y + dragOffset.y,
    width: originalBbox.width,
    height: originalBbox.height
  };
}