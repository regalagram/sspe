import { BoundingBox, Point, SVGPath, SVGSubPath, SVGCommand, TextElementType, SVGGroup, SVGImage } from '../types';

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

  // Calculate base bounding box (without transform)
  const baseX = text.x;
  const baseY = text.y - estimatedHeight * 0.8; // Adjust for text baseline
  const baseWidth = estimatedWidth;
  const baseHeight = estimatedHeight;

  // If no transform, return simple bounding box
  if (!text.transform) {
    return {
      x: baseX,
      y: baseY,
      width: baseWidth,
      height: baseHeight
    };
  }

  // Calculate all four corners of the text bounding box
  const corners = [
    { x: baseX, y: baseY }, // top-left
    { x: baseX + baseWidth, y: baseY }, // top-right
    { x: baseX, y: baseY + baseHeight }, // bottom-left
    { x: baseX + baseWidth, y: baseY + baseHeight } // bottom-right
  ];

  // Apply transform to all corners
  const transformedCorners = corners.map(corner => 
    applyTransform(corner.x, corner.y, text.transform!)
  );

  // Find the bounding box of the transformed corners
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  transformedCorners.forEach(corner => {
    minX = Math.min(minX, corner.x);
    maxX = Math.max(maxX, corner.x);
    minY = Math.min(minY, corner.y);
    maxY = Math.max(maxY, corner.y);
  });

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Calculate bounding box for group
 */
export function getGroupBoundingBox(
  group: SVGGroup, 
  allPaths: SVGPath[] = [], 
  allTexts: TextElementType[] = [], 
  allImages: SVGImage[] = [], 
  allGroups: SVGGroup[] = []
): BoundingBox {
  if (!group.children || group.children.length === 0) {
    return {
      x: 0,
      y: 0,
      width: 100,
      height: 100
    };
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let hasValidBounds = false;

  group.children.forEach(child => {
    if (child.type === 'path') {
      const path = allPaths.find(p => p.id === child.id);
      if (path) {
        const pathBbox = getPathBoundingBox(path);
        if (pathBbox) {
          minX = Math.min(minX, pathBbox.x);
          minY = Math.min(minY, pathBbox.y);
          maxX = Math.max(maxX, pathBbox.x + pathBbox.width);
          maxY = Math.max(maxY, pathBbox.y + pathBbox.height);
          hasValidBounds = true;
        }
      }
    } else if (child.type === 'text') {
      const text = allTexts.find(t => t.id === child.id);
      if (text) {
        const textBbox = getTextBoundingBox(text);
        minX = Math.min(minX, textBbox.x);
        minY = Math.min(minY, textBbox.y);
        maxX = Math.max(maxX, textBbox.x + textBbox.width);
        maxY = Math.max(maxY, textBbox.y + textBbox.height);
        hasValidBounds = true;
      }
    } else if (child.type === 'image') {
      const image = allImages.find(img => img.id === child.id);
      if (image) {
        const imageBbox = getImageBoundingBox(image);
        minX = Math.min(minX, imageBbox.x);
        minY = Math.min(minY, imageBbox.y);
        maxX = Math.max(maxX, imageBbox.x + imageBbox.width);
        maxY = Math.max(maxY, imageBbox.y + imageBbox.height);
        hasValidBounds = true;
      }
    } else if (child.type === 'group') {
      const childGroup = allGroups.find(g => g.id === child.id);
      if (childGroup) {
        const groupBbox = getGroupBoundingBox(childGroup, allPaths, allTexts, allImages, allGroups);
        minX = Math.min(minX, groupBbox.x);
        minY = Math.min(minY, groupBbox.y);
        maxX = Math.max(maxX, groupBbox.x + groupBbox.width);
        maxY = Math.max(maxY, groupBbox.y + groupBbox.height);
        hasValidBounds = true;
      }
    }
  });

  if (!hasValidBounds) {
    return {
      x: 0,
      y: 0,
      width: 100,
      height: 100
    };
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
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
  dragOffset: Point,
  images: SVGImage[] = []
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
      originalBbox = getGroupBoundingBox(group, paths, texts, images, groups);
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

/**
 * Apply a 2D transform matrix to a point
 */
function applyTransform(x: number, y: number, transform: string): Point {
  // Parse the transform string and apply the transformation
  if (!transform) return { x, y };
  
  // Handle rotate(angle, cx, cy) transform
  const rotateMatch = transform.match(/rotate\(([^,]+),\s*([^,]+),\s*([^)]+)\)/);
  if (rotateMatch) {
    const angle = parseFloat(rotateMatch[1]) * Math.PI / 180; // Convert to radians
    const cx = parseFloat(rotateMatch[2]);
    const cy = parseFloat(rotateMatch[3]);
    
    // Translate to origin, rotate, translate back
    const translatedX = x - cx;
    const translatedY = y - cy;
    
    const rotatedX = translatedX * Math.cos(angle) - translatedY * Math.sin(angle);
    const rotatedY = translatedX * Math.sin(angle) + translatedY * Math.cos(angle);
    
    return {
      x: rotatedX + cx,
      y: rotatedY + cy
    };
  }
  
  // If no known transform, return original point
  return { x, y };
}

/**
 * Calculate bounding box for an image element
 */
export function getImageBoundingBox(image: any): BoundingBox {
  // If no transform, return simple bounding box
  if (!image.transform) {
    return {
      x: image.x,
      y: image.y,
      width: image.width,
      height: image.height
    };
  }
  
  // Calculate all four corners of the image
  const corners = [
    { x: image.x, y: image.y }, // top-left
    { x: image.x + image.width, y: image.y }, // top-right
    { x: image.x, y: image.y + image.height }, // bottom-left
    { x: image.x + image.width, y: image.y + image.height } // bottom-right
  ];
  
  // Apply transform to all corners
  const transformedCorners = corners.map(corner => 
    applyTransform(corner.x, corner.y, image.transform)
  );
  
  // Find the bounding box of the transformed corners
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  transformedCorners.forEach(corner => {
    minX = Math.min(minX, corner.x);
    maxX = Math.max(maxX, corner.x);
    minY = Math.min(minY, corner.y);
    maxY = Math.max(maxY, corner.y);
  });
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Calculate bounding box for a clipPath element
 */
export function getClipPathBoundingBox(clipPath: any): BoundingBox | null {
  if (!clipPath.children || clipPath.children.length === 0) {
    return null;
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  clipPath.children.forEach((child: any) => {
    if (child.type === 'path' && child.subPaths) {
      child.subPaths.forEach((subPath: any) => {
        subPath.commands.forEach((cmd: any) => {
          if (cmd.x !== undefined) {
            minX = Math.min(minX, cmd.x);
            maxX = Math.max(maxX, cmd.x);
          }
          if (cmd.y !== undefined) {
            minY = Math.min(minY, cmd.y);
            maxY = Math.max(maxY, cmd.y);
          }
          if (cmd.x1 !== undefined) {
            minX = Math.min(minX, cmd.x1);
            maxX = Math.max(maxX, cmd.x1);
          }
          if (cmd.y1 !== undefined) {
            minY = Math.min(minY, cmd.y1);
            maxY = Math.max(maxY, cmd.y1);
          }
          if (cmd.x2 !== undefined) {
            minX = Math.min(minX, cmd.x2);
            maxX = Math.max(maxX, cmd.x2);
          }
          if (cmd.y2 !== undefined) {
            minY = Math.min(minY, cmd.y2);
            maxY = Math.max(maxY, cmd.y2);
          }
        });
      });
    }
  });

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
 * Calculate position adjustment to make element overlap with clipPath
 */
export function calculateClipPathAlignment(
  elementBbox: BoundingBox,
  clipPathBbox: BoundingBox,
  alignmentMode: 'center' | 'top-left' | 'fit' = 'center'
): { x: number; y: number; scaleX?: number; scaleY?: number } {
  switch (alignmentMode) {
    case 'top-left':
      // Align top-left corner of element with top-left corner of clipPath
      return {
        x: clipPathBbox.x - elementBbox.x,
        y: clipPathBbox.y - elementBbox.y
      };
    
    case 'center':
      // Center element within clipPath
      const centerX = clipPathBbox.x + clipPathBbox.width / 2 - elementBbox.width / 2;
      const centerY = clipPathBbox.y + clipPathBbox.height / 2 - elementBbox.height / 2;
      return {
        x: centerX - elementBbox.x,
        y: centerY - elementBbox.y
      };
    
    case 'fit':
      // Scale and center element to fit within clipPath
      const scaleX = clipPathBbox.width / elementBbox.width;
      const scaleY = clipPathBbox.height / elementBbox.height;
      const scale = Math.min(scaleX, scaleY);
      
      const scaledWidth = elementBbox.width * scale;
      const scaledHeight = elementBbox.height * scale;
      
      const fitCenterX = clipPathBbox.x + clipPathBbox.width / 2 - scaledWidth / 2;
      const fitCenterY = clipPathBbox.y + clipPathBbox.height / 2 - scaledHeight / 2;
      
      return {
        x: fitCenterX - elementBbox.x,
        y: fitCenterY - elementBbox.y,
        scaleX: scale,
        scaleY: scale
      };
    
    default:
      return { x: 0, y: 0 };
  }
}