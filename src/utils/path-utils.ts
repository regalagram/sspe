import { SVGPath, SVGCommand, SVGSubPath, Point, BoundingBox } from "../types";
import { parsePathData } from "./svg-parser";

export const pathToString = (path: SVGPath): string => {
  return path.subPaths
    .map((subPath) => subPathToString(subPath))
    .join(' ');
};

export const pathsToString = (paths: SVGPath[]): string => {
  return paths
    .map((path) => pathToString(path))
    .join(' ');
};

export const subPathToString = (subPath: SVGSubPath): string => {
  if (!subPath.commands || subPath.commands.length === 0) {
    return '';
  }
  
  const commands = subPath.commands
    .map((command) => commandToString(command))
    .join(' ')
    .trim();
  
  return commands;
};

// Generate subpath string with context - simplified since everything is absolute internally
export const subPathToStringInContext = (subPath: SVGSubPath, allSubPaths: SVGSubPath[]): string => {
  // Since everything is already absolute internally, just return the regular string
  return subPathToString(subPath);
};

// Function to find which subpath contains a given point
export const findSubPathAtPoint = (path: SVGPath, point: Point, tolerance: number = 15): SVGSubPath | null => {
  // Collect all candidates with their distances and additional info
  const candidates: Array<{
    subPath: SVGSubPath;
    distance: number;
    contourDistance: number;
    isInside: boolean;
  }> = [];

  for (const subPath of path.subPaths) {
    const contourDistance = getDistanceToSubPathContour(subPath, point);
    const isInside = isPointInsideSubPath(subPath, point, 'nonzero', path.subPaths);
    const distance = getDistanceToSubPath(subPath, point, path.subPaths);
    
    // Only consider subpaths within tolerance or inside
    if (distance < tolerance || isInside) {
      candidates.push({
        subPath,
        distance,
        contourDistance,
        isInside
      });
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  // Sort candidates by priority:
  // 1. Closest to edge (contour distance)
  // 2. Inside candidates with smallest contour distance (innermost)
  // 3. General distance
  candidates.sort((a, b) => {
    // If both are very close to edge (< 5px), choose the closest
    if (a.contourDistance < 5 && b.contourDistance < 5) {
      return a.contourDistance - b.contourDistance;
    }
    
    // If one is close to edge and other is inside, prefer edge
    if (a.contourDistance < 5 && b.contourDistance >= 5) return -1;
    if (b.contourDistance < 5 && a.contourDistance >= 5) return 1;
    
    // If both are inside, choose the one with smallest contour distance (innermost)
    if (a.isInside && b.isInside) {
      return a.contourDistance - b.contourDistance;
    }
    
    // If one is inside and other is not, prefer inside
    if (a.isInside && !b.isInside) return -1;
    if (b.isInside && !a.isInside) return 1;
    
    // Default: closest distance
    return a.distance - b.distance;
  });

  return candidates[0].subPath;
};

// Enhanced version of findSubPathAtPoint with configurable behavior
export const findSubPathAtPointAdvanced = (
  path: SVGPath, 
  point: Point, 
  options: {
    tolerance?: number;
    fillRule?: 'nonzero' | 'evenodd';
    includeStroke?: boolean;
    includeFill?: boolean;
  } = {}
): SVGSubPath | null => {
  const { 
    tolerance = 15, 
    fillRule = 'nonzero', 
    includeStroke = true, 
    includeFill = true 
  } = options;
  
  let closestSubPath = null;
  let minDistance = Infinity;

  for (const subPath of path.subPaths) {
    let distance = Infinity;
    
    // Check if point is inside the filled area (if enabled and subpath is closed)
    const isInside = includeFill && isPointInsideSubPath(subPath, point, fillRule, path.subPaths);
    
    if (isInside) {
      // Even if inside, calculate distance to contour for proper comparison
      // This ensures we select the innermost/closest subpath when nested
      distance = getDistanceToSubPathContour(subPath, point);
      
      // Give slight preference to filled areas by reducing distance slightly
      // This ensures filled detection still works but allows proper ordering
      distance = distance * 0.8; // 20% preference for filled areas
    } 
    // Check distance to stroke/contour (if enabled)
    else if (includeStroke) {
      distance = getDistanceToSubPathContour(subPath, point);
    }
    
    if (distance < tolerance && distance < minDistance) {
      minDistance = distance;
      closestSubPath = subPath;
    }
  }

  return closestSubPath;
};

// Advanced function that prioritizes innermost subpaths for nested cases
export const findInnermostSubPathAtPoint = (path: SVGPath, point: Point, tolerance: number = 15): SVGSubPath | null => {
  // Get all subpaths that contain the point or are within tolerance
  const candidates: Array<{ subPath: SVGSubPath; distance: number; isInside: boolean }> = [];
  
  for (const subPath of path.subPaths) {
    const isInside = isPointInsideSubPath(subPath, point, 'nonzero', path.subPaths);
    const distance = getDistanceToSubPathContour(subPath, point);
    
    if (isInside || distance < tolerance) {
      candidates.push({
        subPath,
        distance,
        isInside
      });
    }
  }
  
  if (candidates.length === 0) {
    return null;
  }
  
  // If multiple candidates are "inside", we need to find the innermost one
  const insideCandidates = candidates.filter(c => c.isInside);
  
  if (insideCandidates.length > 1) {
    // For nested subpaths, the innermost one typically has the smallest area
    // or the closest contour to the click point
    return insideCandidates.reduce((closest, current) => {
      if (current.distance < closest.distance) {
        return current;
      }
      // If distances are very close, prefer the one with smaller area
      if (Math.abs(current.distance - closest.distance) < 1) {
        const currentArea = calculateSubPathArea(current.subPath);
        const closestArea = calculateSubPathArea(closest.subPath);
        return currentArea < closestArea ? current : closest;
      }
      return closest;
    }).subPath;
  }
  
  // If only one inside or none inside, return the closest one
  return candidates.reduce((closest, current) => {
    // Prioritize inside candidates
    if (current.isInside && !closest.isInside) return current;
    if (!current.isInside && closest.isInside) return closest;
    
    // Among same type (both inside or both outside), choose closest
    return current.distance < closest.distance ? current : closest;
  }).subPath;
};

// Calculate approximate area of a subpath (for nested subpath detection)
const calculateSubPathArea = (subPath: SVGSubPath, allSubPaths?: SVGSubPath[]): number => {
  if (!isSubPathClosed(subPath, allSubPaths)) {
    return 0;
  }
  
  const polygonPoints = getSubPathPolygonPoints(subPath, allSubPaths);
  if (polygonPoints.length < 3) {
    return 0;
  }
  
  // Use shoelace formula to calculate polygon area
  let area = 0;
  const n = polygonPoints.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += polygonPoints[i].x * polygonPoints[j].y;
    area -= polygonPoints[j].x * polygonPoints[i].y;
  }
  
  return Math.abs(area) / 2;
};

// Helper function to calculate distance from a point to a subpath (simplified)
const getDistanceToSubPath = (subPath: SVGSubPath, point: Point, allSubPaths?: SVGSubPath[]): number => {
  // First priority: Check distance to contour/stroke for all subpaths
  const contourDistance = getDistanceToSubPathContour(subPath, point);
  
  // Second priority: Check if the point is inside the filled area (if closed)
  const isInside = isPointInsideSubPath(subPath, point, 'nonzero', allSubPaths);
  
  // Strategy: Prioritize stroke/edge detection, then fill detection
  // This ensures nested subpaths work correctly and respects fill rules
  
  if (contourDistance < 5) {
    // Very close to edge - immediate selection with slight preference
    return contourDistance * 0.5; // Give edge detection higher priority
  }
  
  if (isInside) {
    // Inside filled area - good match but lower priority than very close edges
    return 10; // Fixed moderate distance for inside points
  }
  
  // Outside or far from edge - return actual distance
  return contourDistance;
};

// Separated contour-only distance calculation (simplified since everything is absolute)
const getDistanceToSubPathContour = (subPath: SVGSubPath, point: Point): number => {
  let minDistance = Infinity;
  let currentPoint: Point = { x: 0, y: 0 };

  // Process each command in the subpath for contour detection only
  for (let i = 0; i < subPath.commands.length; i++) {
    const command = subPath.commands[i];
    
    // Get absolute position for this command (simplified since everything is already absolute)
    const absolutePos = getAbsoluteCommandPosition(command);
    
    if (absolutePos) {
      // Distance to the endpoint of the command
      const endPointDistance = distance(point, absolutePos);
      minDistance = Math.min(minDistance, endPointDistance);
      
      // Calculate distance to the actual curve/path segment
      if (i > 0) {
        let segmentDistance = Infinity;
        
        switch (command.command.toUpperCase()) {
          case 'L':
          case 'H':
          case 'V':
            segmentDistance = distanceToLineSegment(point, currentPoint, absolutePos);
            break;
            
          case 'C':
            // Cubic Bézier curve
            if (command.x1 !== undefined && command.y1 !== undefined &&
                command.x2 !== undefined && command.y2 !== undefined) {
              const controlPoints = getAbsoluteControlPoints(command);
              if (controlPoints.length >= 2) {
                segmentDistance = distanceToCubicBezier(
                  point, currentPoint, controlPoints[0], controlPoints[1], absolutePos
                );
              }
            }
            break;
            
          case 'S':
            // Smooth cubic Bézier
            if (command.x2 !== undefined && command.y2 !== undefined) {
              const controlPoints = getAbsoluteControlPoints(command);
              if (controlPoints.length >= 1) {
                const reflectedCP1 = getReflectedControlPoint(subPath.commands, i, currentPoint);
                segmentDistance = distanceToCubicBezier(
                  point, currentPoint, reflectedCP1, controlPoints[0], absolutePos
                );
              }
            }
            break;
            
          case 'Q':
            // Quadratic Bézier curve
            if (command.x1 !== undefined && command.y1 !== undefined) {
              const controlPoints = getAbsoluteControlPoints(command);
              if (controlPoints.length >= 1) {
                segmentDistance = distanceToQuadraticBezier(
                  point, currentPoint, controlPoints[0], absolutePos
                );
              }
            }
            break;
            
          case 'T':
            // Smooth quadratic Bézier
            const reflectedCP = getReflectedControlPoint(subPath.commands, i, currentPoint);
            segmentDistance = distanceToQuadraticBezier(
              point, currentPoint, reflectedCP, absolutePos
            );
            break;
            
          default:
            // For other commands, fall back to line segment
            segmentDistance = distanceToLineSegment(point, currentPoint, absolutePos);
        }
        
        minDistance = Math.min(minDistance, segmentDistance);
      }
      
      currentPoint = absolutePos;
    }
  }

  return minDistance;
};

// Helper function to calculate distance from a point to a line segment
const distanceToLineSegment = (point: Point, lineStart: Point, lineEnd: Point): number => {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  if (lenSq === 0) {
    // Line start and end are the same point
    return Math.sqrt(A * A + B * B);
  }
  
  let param = dot / lenSq;

  let xx, yy;

  if (param < 0) {
    xx = lineStart.x;
    yy = lineStart.y;
  } else if (param > 1) {
    xx = lineEnd.x;
    yy = lineEnd.y;
  } else {
    xx = lineStart.x + param * C;
    yy = lineStart.y + param * D;
  }

  const dx = point.x - xx;
  const dy = point.y - yy;
  return Math.sqrt(dx * dx + dy * dy);
};

// Helper function to get a contrasting color for selection feedback
export const getContrastColor = (color: string): string => {
  // Handle common color formats
  if (!color || color === 'none' || color === 'transparent') {
    return '#ff4444'; // Default red for transparent/none
  }

  // Convert color to RGB values
  let r, g, b;
  
  if (color.startsWith('#')) {
    // Hex color
    const hex = color.slice(1);
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    } else {
      return '#ff4444'; // Default red for invalid hex
    }
  } else if (color.startsWith('rgb')) {
    // RGB/RGBA color
    const match = color.match(/\d+/g);
    if (match && match.length >= 3) {
      r = parseInt(match[0]);
      g = parseInt(match[1]);
      b = parseInt(match[2]);
    } else {
      return '#ff4444'; // Default red for invalid rgb
    }
  } else {
    // Named colors - use a simple mapping for common ones
    const namedColors: { [key: string]: [number, number, number] } = {
      'black': [0, 0, 0],
      'white': [255, 255, 255],
      'red': [255, 0, 0],
      'green': [0, 128, 0],
      'blue': [0, 0, 255],
      'yellow': [255, 255, 0],
      'cyan': [0, 255, 255],
      'magenta': [255, 0, 255],
      'orange': [255, 165, 0],
      'purple': [128, 0, 128],
      'brown': [165, 42, 42],
      'pink': [255, 192, 203],
      'gray': [128, 128, 128],
      'grey': [128, 128, 128],
    };
    
    const colorLower = color.toLowerCase();
    if (namedColors[colorLower]) {
      [r, g, b] = namedColors[colorLower];
    } else {
      return '#ff4444'; // Default red for unknown named colors
    }
  }

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Determine dominant color channel
  const maxChannel = Math.max(r, g, b);
  const isReddish = r === maxChannel;
  const isGreenish = g === maxChannel;
  const isBluish = b === maxChannel;
  
  // Choose contrasting color based on luminance and dominant color
  if (luminance > 0.7) {
    // Very light color - use dark contrasts
    if (isBluish) return '#cc3300'; // Dark red for light blue
    if (isGreenish) return '#6600cc'; // Dark purple for light green  
    if (isReddish) return '#0066cc'; // Dark blue for light red
    return '#333333'; // Dark gray for other light colors
  } else if (luminance > 0.3) {
    // Medium color - use bright contrasts
    if (isBluish) return '#ff6600'; // Bright orange for medium blue
    if (isGreenish) return '#ff3366'; // Bright pink for medium green
    if (isReddish) return '#00ccff'; // Bright cyan for medium red
    return '#ffff00'; // Bright yellow for other medium colors
  } else {
    // Dark color - use bright contrasts
    if (isBluish) return '#ffcc00'; // Bright yellow for dark blue
    if (isGreenish) return '#ff6699'; // Bright pink for dark green
    if (isReddish) return '#66ff99'; // Bright cyan-green for dark red
    return '#ffffff'; // White for other dark colors
  }
};

export const commandToString = (command: SVGCommand): string => {
  const { id, command: cmd, ...params } = command;
  
  switch (cmd) {
    case 'M':
    case 'L':
      return `${cmd} ${params.x} ${params.y}`;
    case 'C':
      return `${cmd} ${params.x1} ${params.y1} ${params.x2} ${params.y2} ${params.x} ${params.y}`;
    case 'Z':
      return cmd;
    default:
      return '';
  }
};

export const parsePathString = (d: string): SVGPath => {
  const commands = parsePathData(d); // Use the normalized path parser
  const subPaths = [];
  let currentSubPath: SVGCommand[] = [];
  
  commands.forEach((command) => {
    const cmd = command.command;
    
    if (cmd === 'M' && currentSubPath.length > 0) {
      // Start a new sub-path
      subPaths.push({
        id: `subpath-${subPaths.length}`,
        commands: currentSubPath,
      });
      currentSubPath = [command];
    } else {
      currentSubPath.push(command);
    }
  });
  
  if (currentSubPath.length > 0) {
    subPaths.push({
      id: `subpath-${subPaths.length}`,
      commands: currentSubPath,
    });
  }
  
  return {
    id: `path-${Date.now()}`,
    subPaths,
    style: { fill: 'none', stroke: '#000', strokeWidth: 1 }
  };
};

export const getPathBounds = (path: SVGPath): BoundingBox => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  path.subPaths.forEach(subPath => {
    subPath.commands.forEach(command => {
      if (command.x !== undefined) {
        minX = Math.min(minX, command.x);
        maxX = Math.max(maxX, command.x);
      }
      if (command.y !== undefined) {
        minY = Math.min(minY, command.y);
        maxY = Math.max(maxY, command.y);
      }
      // Also check control points
      if (command.x1 !== undefined) {
        minX = Math.min(minX, command.x1);
        maxX = Math.max(maxX, command.x1);
      }
      if (command.y1 !== undefined) {
        minY = Math.min(minY, command.y1);
        maxY = Math.max(maxY, command.y1);
      }
      if (command.x2 !== undefined) {
        minX = Math.min(minX, command.x2);
        maxX = Math.max(maxX, command.x2);
      }
      if (command.y2 !== undefined) {
        minY = Math.min(minY, command.y2);
        maxY = Math.max(maxY, command.y2);
      }
    });
  });
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
};

export const snapToGrid = (point: Point, gridSize: number): Point => {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
};

export const distance = (p1: Point, p2: Point): number => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

export const getCommandPosition = (command: SVGCommand): Point | null => {
  if (command.x !== undefined && command.y !== undefined) {
    return { x: command.x, y: command.y };
  }
  return null;
};

/**
 * Gets the absolute position of a command (simplified since everything is already absolute internally)
 */
export const getAbsoluteCommandPosition = (command: SVGCommand, subPath?: SVGSubPath, allSubPaths?: SVGSubPath[]): Point | null => {
  if (command.x !== undefined && command.y !== undefined) {
    return { x: command.x, y: command.y };
  }
  return null;
};

/**
 * Gets all absolute control point positions for a command (simplified since everything is already absolute internally)
 */
export const getAbsoluteControlPoints = (command: SVGCommand, subPath?: SVGSubPath, allSubPaths?: SVGSubPath[]): Point[] => {
  const controlPoints: Point[] = [];
  
  // Add control points based on command type (all are already absolute)
  if (command.x1 !== undefined && command.y1 !== undefined) {
    controlPoints.push({ x: command.x1, y: command.y1 });
  }

  if (command.x2 !== undefined && command.y2 !== undefined) {
    controlPoints.push({ x: command.x2, y: command.y2 });
  }

  return controlPoints;
};

// Helper function to calculate distance from a point to a cubic Bézier curve
const distanceToCubicBezier = (point: Point, p0: Point, p1: Point, p2: Point, p3: Point): number => {
  let minDistance = Infinity;
  const steps = 50; // Number of points to sample along the curve
  
  for (let t = 0; t <= 1; t += 1 / steps) {
    // Calculate point on Bézier curve using De Casteljau's algorithm
    const curvePoint = cubicBezierPoint(p0, p1, p2, p3, t);
    const dist = distance(point, curvePoint);
    minDistance = Math.min(minDistance, dist);
  }
  
  return minDistance;
};

// Helper function to calculate distance from a point to a quadratic Bézier curve
const distanceToQuadraticBezier = (point: Point, p0: Point, p1: Point, p2: Point): number => {
  let minDistance = Infinity;
  const steps = 50; // Number of points to sample along the curve
  
  for (let t = 0; t <= 1; t += 1 / steps) {
    // Calculate point on quadratic Bézier curve
    const curvePoint = quadraticBezierPoint(p0, p1, p2, t);
    const dist = distance(point, curvePoint);
    minDistance = Math.min(minDistance, dist);
  }
  
  return minDistance;
};

// Helper function to calculate distance from a point to an arc
const distanceToArc = (
  point: Point, 
  start: Point, 
  end: Point, 
  rx: number, 
  ry: number, 
  xAxisRotation: number, 
  largeArcFlag: number, 
  sweepFlag: number
): number => {
  let minDistance = Infinity;
  const steps = 50; // Number of points to sample along the arc
  
  // Convert SVG arc parameters to center parameterization
  const arcParams = convertToArcCenter(start, end, rx, ry, xAxisRotation, largeArcFlag, sweepFlag);
  
  if (!arcParams) {
    // Fallback to line segment if arc conversion fails
    return distanceToLineSegment(point, start, end);
  }
  
  const { cx, cy, startAngle, endAngle, rx: actualRx, ry: actualRy } = arcParams;
  
  // Sample points along the arc
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    let angle;
    
    if (sweepFlag === 1) {
      // Positive direction
      angle = startAngle + t * (endAngle - startAngle);
    } else {
      // Negative direction
      angle = startAngle - t * (startAngle - endAngle);
    }
    
    // Calculate point on ellipse
    const cos_angle = Math.cos(angle);
    const sin_angle = Math.sin(angle);
    const cos_rotation = Math.cos(xAxisRotation * Math.PI / 180);
    const sin_rotation = Math.sin(xAxisRotation * Math.PI / 180);
    
    const x = cx + actualRx * cos_angle * cos_rotation - actualRy * sin_angle * sin_rotation;
    const y = cy + actualRx * cos_angle * sin_rotation + actualRy * sin_angle * cos_rotation;
    
    const arcPoint = { x, y };
    const dist = distance(point, arcPoint);
    minDistance = Math.min(minDistance, dist);
  }
  
  return minDistance;
};

// Convert SVG arc parameters to center parameterization
const convertToArcCenter = (
  start: Point, 
  end: Point, 
  rx: number, 
  ry: number, 
  xAxisRotation: number, 
  largeArcFlag: number, 
  sweepFlag: number
): { cx: number; cy: number; startAngle: number; endAngle: number; rx: number; ry: number } | null => {
  // Handle degenerate cases
  if (rx === 0 || ry === 0) return null;
  if (start.x === end.x && start.y === end.y) return null;
  
  const phi = xAxisRotation * Math.PI / 180;
  const cos_phi = Math.cos(phi);
  const sin_phi = Math.sin(phi);
  
  // Step 1: Compute (x1', y1')
  const dx = (start.x - end.x) / 2;
  const dy = (start.y - end.y) / 2;
  const x1_prime = cos_phi * dx + sin_phi * dy;
  const y1_prime = -sin_phi * dx + cos_phi * dy;
  
  // Ensure radii are large enough
  const rx_sq = rx * rx;
  const ry_sq = ry * ry;
  const x1_prime_sq = x1_prime * x1_prime;
  const y1_prime_sq = y1_prime * y1_prime;
  
  const lambda = x1_prime_sq / rx_sq + y1_prime_sq / ry_sq;
  if (lambda > 1) {
    const sqrt_lambda = Math.sqrt(lambda);
    rx *= sqrt_lambda;
    ry *= sqrt_lambda;
  }
  
  // Step 2: Compute (cx', cy')
  const sign = largeArcFlag === sweepFlag ? -1 : 1;
  const sq = Math.max(0, (rx_sq * ry_sq - rx_sq * y1_prime_sq - ry_sq * x1_prime_sq) / (rx_sq * y1_prime_sq + ry_sq * x1_prime_sq));
  const coeff = sign * Math.sqrt(sq);
  const cx_prime = coeff * (rx * y1_prime / ry);
  const cy_prime = coeff * -(ry * x1_prime / rx);
  
  // Step 3: Compute (cx, cy)
  const cx = cos_phi * cx_prime - sin_phi * cy_prime + (start.x + end.x) / 2;
  const cy = sin_phi * cx_prime + cos_phi * cy_prime + (start.y + end.y) / 2;
  
  // Step 4: Compute angles
  const startAngle = Math.atan2((y1_prime - cy_prime) / ry, (x1_prime - cx_prime) / rx);
  const endAngle = Math.atan2((-y1_prime - cy_prime) / ry, (-x1_prime - cx_prime) / rx);
  
  return {
    cx,
    cy,
    startAngle,
    endAngle,
    rx,
    ry
  };
};

// Calculate a point on a cubic Bézier curve at parameter t
const cubicBezierPoint = (p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point => {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;
  
  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y
  };
};

// Calculate a point on a quadratic Bézier curve at parameter t
const quadraticBezierPoint = (p0: Point, p1: Point, p2: Point, t: number): Point => {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  
  return {
    x: mt2 * p0.x + 2 * mt * t * p1.x + t2 * p2.x,
    y: mt2 * p0.y + 2 * mt * t * p1.y + t2 * p2.y
  };
};

// Get reflected control point for smooth curves (S and T commands) - simplified
const getReflectedControlPoint = (commands: SVGCommand[], currentIndex: number, currentPoint: Point): Point => {
  if (currentIndex <= 0) {
    return currentPoint;
  }
  
  const prevCommand = commands[currentIndex - 1];
  const prevCommandType = prevCommand.command.toUpperCase();
  
  // For S command, reflect the second control point of the previous C command
  if (prevCommandType === 'C' && prevCommand.x2 !== undefined && prevCommand.y2 !== undefined) {
    const prevAbsolutePos = getAbsoluteCommandPosition(prevCommand);
    if (prevAbsolutePos) {
      return {
        x: 2 * prevAbsolutePos.x - prevCommand.x2,
        y: 2 * prevAbsolutePos.y - prevCommand.y2
      };
    }
  }
  
  // For T command, reflect the control point of the previous Q command
  if (prevCommandType === 'Q' && prevCommand.x1 !== undefined && prevCommand.y1 !== undefined) {
    const prevAbsolutePos = getAbsoluteCommandPosition(prevCommand);
    if (prevAbsolutePos) {
      return {
        x: 2 * prevAbsolutePos.x - prevCommand.x1,
        y: 2 * prevAbsolutePos.y - prevCommand.y1
      };
    }
  }
  
  return currentPoint;
};

// Helper function to check if a point is inside a subpath using fill rules (simplified)
const isPointInsideSubPath = (subPath: SVGSubPath, point: Point, fillRule: 'nonzero' | 'evenodd' = 'nonzero', allSubPaths?: SVGSubPath[]): boolean => {
  // First, check if the subpath is closed (has a Z command or ends where it starts)
  const isClosed = isSubPathClosed(subPath, allSubPaths);
  
  // If not closed, only use contour detection
  if (!isClosed) {
    return false;
  }
  
  // Get all points that form the polygon
  const polygonPoints = getSubPathPolygonPoints(subPath, allSubPaths);
  
  if (polygonPoints.length < 3) {
    return false; // Need at least 3 points to form an area
  }
  
  // Use the appropriate fill rule algorithm
  let result;
  if (fillRule === 'evenodd') {
    result = isPointInsidePolygonEvenOdd(point, polygonPoints);
  } else {
    result = isPointInsidePolygonNonZero(point, polygonPoints);
  }
  
  return result;
};

// Check if a subpath is closed (simplified)
const isSubPathClosed = (subPath: SVGSubPath, allSubPaths?: SVGSubPath[]): boolean => {
  if (subPath.commands.length === 0) return false;
  
  // Check for explicit Z command
  const lastCommand = subPath.commands[subPath.commands.length - 1];
  if (lastCommand.command.toLowerCase() === 'z') {
    return true;
  }
  
  // Check if the path ends where it starts (simplified since everything is absolute)
  const firstCommand = subPath.commands[0];
  const lastPosition = getAbsoluteCommandPosition(lastCommand);
  const firstPosition = getAbsoluteCommandPosition(firstCommand);
  
  if (firstPosition && lastPosition) {
    const threshold = 1; // Allow small tolerance for floating point errors
    return distance(firstPosition, lastPosition) < threshold;
  }
  
  return false;
};

// Extract polygon points from a subpath (approximating curves) - simplified
const getSubPathPolygonPoints = (subPath: SVGSubPath, allSubPaths?: SVGSubPath[]): Point[] => {
  const points: Point[] = [];
  let currentPoint: Point = { x: 0, y: 0 };
  
  for (let i = 0; i < subPath.commands.length; i++) {
    const command = subPath.commands[i];
    const absolutePos = getAbsoluteCommandPosition(command);
    
    if (!absolutePos) continue;
    
    switch (command.command.toUpperCase()) {
      case 'M':
      case 'L':
      case 'H':
      case 'V':
        points.push(absolutePos);
        break;
        
      case 'C':
        // For cubic Bézier, sample points along the curve
        if (command.x1 !== undefined && command.y1 !== undefined &&
            command.x2 !== undefined && command.y2 !== undefined) {
          const controlPoints = getAbsoluteControlPoints(command);
          if (controlPoints.length >= 2) {
            const curvePoints = sampleCubicBezier(currentPoint, controlPoints[0], controlPoints[1], absolutePos, 10);
            points.push(...curvePoints);
          }
        }
        break;
        
      case 'S':
        // Smooth cubic Bézier
        if (command.x2 !== undefined && command.y2 !== undefined) {
          const controlPoints = getAbsoluteControlPoints(command);
          if (controlPoints.length >= 1) {
            const reflectedCP1 = getReflectedControlPoint(subPath.commands, i, currentPoint);
            const curvePoints = sampleCubicBezier(currentPoint, reflectedCP1, controlPoints[0], absolutePos, 10);
            points.push(...curvePoints);
          }
        }
        break;
        
      case 'Q':
        // Quadratic Bézier
        if (command.x1 !== undefined && command.y1 !== undefined) {
          const controlPoints = getAbsoluteControlPoints(command);
          if (controlPoints.length >= 1) {
            const curvePoints = sampleQuadraticBezier(currentPoint, controlPoints[0], absolutePos, 10);
            points.push(...curvePoints);
          }
        }
        break;
        
      case 'T':
        // Smooth quadratic Bézier
        const reflectedCP = getReflectedControlPoint(subPath.commands, i, currentPoint);
        const curvePoints = sampleQuadraticBezier(currentPoint, reflectedCP, absolutePos, 10);
        points.push(...curvePoints);
        break;
        
      case 'Z':
        // Close path - don't add point as it should connect to start
        break;
    }
    
    currentPoint = absolutePos;
  }
  
  return points;
};

// Sample points along a cubic Bézier curve
const sampleCubicBezier = (p0: Point, p1: Point, p2: Point, p3: Point, steps: number): Point[] => {
  const points: Point[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    points.push(cubicBezierPoint(p0, p1, p2, p3, t));
  }
  return points;
};

// Sample points along a quadratic Bézier curve
const sampleQuadraticBezier = (p0: Point, p1: Point, p2: Point, steps: number): Point[] => {
  const points: Point[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    points.push(quadraticBezierPoint(p0, p1, p2, t));
  }
  return points;
};

// Sample points along an arc
const sampleArc = (
  start: Point, 
  end: Point, 
  rx: number, 
  ry: number, 
  xAxisRotation: number, 
  largeArcFlag: number, 
  sweepFlag: number, 
  steps: number
): Point[] => {
  const points: Point[] = [];
  const arcParams = convertToArcCenter(start, end, rx, ry, xAxisRotation, largeArcFlag, sweepFlag);
  
  if (!arcParams) {
    // Fallback to linear interpolation
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      points.push({
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t
      });
    }
    return points;
  }
  
  const { cx, cy, startAngle, endAngle, rx: actualRx, ry: actualRy } = arcParams;
  const cos_rotation = Math.cos(xAxisRotation * Math.PI / 180);
  const sin_rotation = Math.sin(xAxisRotation * Math.PI / 180);
  
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    let angle;
    
    if (sweepFlag === 1) {
      angle = startAngle + t * (endAngle - startAngle);
    } else {
      angle = startAngle - t * (startAngle - endAngle);
    }
    
    const cos_angle = Math.cos(angle);
    const sin_angle = Math.sin(angle);
    
    const x = cx + actualRx * cos_angle * cos_rotation - actualRy * sin_angle * sin_rotation;
    const y = cy + actualRx * cos_angle * sin_rotation + actualRy * sin_angle * cos_rotation;
    
    points.push({ x, y });
  }
  
  return points;
};

// Point-in-polygon test using even-odd rule
const isPointInsidePolygonEvenOdd = (point: Point, polygon: Point[]): boolean => {
  let inside = false;
  const n = polygon.length;
  
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    
    if (((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
};

// Point-in-polygon test using non-zero winding rule
const isPointInsidePolygonNonZero = (point: Point, polygon: Point[]): boolean => {
  let winding = 0;
  const n = polygon.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    
    if (yi <= point.y) {
      if (yj > point.y) {
        // Upward crossing
        if (isLeft(polygon[i], polygon[j], point) > 0) {
          winding++;
        }
      }
    } else {
      if (yj <= point.y) {
        // Downward crossing
        if (isLeft(polygon[i], polygon[j], point) < 0) {
          winding--;
        }
      }
    }
  }
  
  return winding !== 0;
};

// Helper function to determine if point is left of line
const isLeft = (p0: Point, p1: Point, p2: Point): number => {
  return (p1.x - p0.x) * (p2.y - p0.y) - (p2.x - p0.x) * (p1.y - p0.y);
};

export const getAllPathsBounds = (paths: SVGPath[]): BoundingBox | null => {
  if (paths.length === 0) return null;
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  paths.forEach(path => {
    const bounds = getPathBounds(path);
    
    // Skip empty bounds
    if (!isFinite(bounds.x) || !isFinite(bounds.y) || bounds.width <= 0 || bounds.height <= 0) {
      return;
    }
    
    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);
  });
  
  // Return null if no valid bounds found
  if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
    return null;
  }
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
};

export const getSelectedElementsBounds = (paths: SVGPath[], selectedCommandIds: string[]): BoundingBox | null => {
  if (selectedCommandIds.length === 0) return null;
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let hasValidBounds = false;
  
  paths.forEach(path => {
    path.subPaths.forEach(subPath => {
      subPath.commands.forEach(command => {
        if (selectedCommandIds.includes(command.id)) {
          // Add command position
          if (command.x !== undefined && command.y !== undefined) {
            minX = Math.min(minX, command.x);
            maxX = Math.max(maxX, command.x);
            minY = Math.min(minY, command.y);
            maxY = Math.max(maxY, command.y);
            hasValidBounds = true;
          }
          
          // Add control points if they exist
          if (command.x1 !== undefined && command.y1 !== undefined) {
            minX = Math.min(minX, command.x1);
            maxX = Math.max(maxX, command.x1);
            minY = Math.min(minY, command.y1);
            maxY = Math.max(maxY, command.y1);
            hasValidBounds = true;
          }
          
          if (command.x2 !== undefined && command.y2 !== undefined) {
            minX = Math.min(minX, command.x2);
            maxX = Math.max(maxX, command.x2);
            minY = Math.min(minY, command.y2);
            maxY = Math.max(maxY, command.y2);
            hasValidBounds = true;
          }
        }
      });
    });
  });
  
  if (!hasValidBounds) return null;
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
};

export const getSubPathBounds = (subPath: SVGSubPath, allSubPaths?: SVGSubPath[]): BoundingBox | null => {
  if (subPath.commands.length === 0) return null;
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let hasValidBounds = false;
  
  subPath.commands.forEach(command => {
    // Get absolute position (simplified since everything is already absolute)
    const position = getAbsoluteCommandPosition(command);
    if (position) {
      minX = Math.min(minX, position.x);
      maxX = Math.max(maxX, position.x);
      minY = Math.min(minY, position.y);
      maxY = Math.max(maxY, position.y);
      hasValidBounds = true;
    }
    
    // Also check control points
    const controlPoints = getAbsoluteControlPoints(command);
    controlPoints.forEach(cp => {
      minX = Math.min(minX, cp.x);
      maxX = Math.max(maxX, cp.x);
      minY = Math.min(minY, cp.y);
      maxY = Math.max(maxY, cp.y);
      hasValidBounds = true;
    });
  });
  
  if (!hasValidBounds) return null;
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
};

export const getSelectedSubPathsBounds = (paths: SVGPath[], selectedSubPathIds: string[]): BoundingBox | null => {
  if (selectedSubPathIds.length === 0) return null;
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let hasValidBounds = false;
  
  for (const path of paths) {
    for (const subPath of path.subPaths) {
      if (selectedSubPathIds.includes(subPath.id)) {
        const bounds = getSubPathBounds(subPath, path.subPaths);
        if (bounds && bounds.width > 0 && bounds.height > 0) {
          minX = Math.min(minX, bounds.x);
          minY = Math.min(minY, bounds.y);
          maxX = Math.max(maxX, bounds.x + bounds.width);
          maxY = Math.max(maxY, bounds.y + bounds.height);
          hasValidBounds = true;
        }
      }
    }
  }
  
  if (!hasValidBounds) return null;
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
};