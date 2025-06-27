import { SVGPath, SVGCommand, SVGSubPath, Point, BoundingBox } from "../types";
import { getSubPathFinalPosition } from "./relative-utils";

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
  return subPath.commands
    .map((command) => commandToString(command))
    .join(' ');
};

// Generate subpath string with context - for proper visual feedback rendering
export const subPathToStringInContext = (subPath: SVGSubPath, allSubPaths: SVGSubPath[]): string => {
  // Find the index of this subpath
  const subPathIndex = allSubPaths.findIndex(sp => sp.id === subPath.id);
  if (subPathIndex === -1) {
    // Fallback to regular string if not found in array
    return subPathToString(subPath);
  }

  // Calculate the starting position for this subpath based on previous subpaths
  let startingPosition: Point = { x: 0, y: 0 };
  for (let i = 0; i < subPathIndex; i++) {
    startingPosition = getSubPathFinalPosition(allSubPaths[i], startingPosition);
  }

  // Generate the commands string with proper context
  let currentPosition = startingPosition;
  
  return subPath.commands.map((command, index) => {
    const position = getAbsoluteCommandPosition(command, subPath, allSubPaths);
    
    if (!position) {
      return commandToString(command);
    }

    // For the first command of a subpath that's not the first subpath,
    // we need to ensure proper positioning
    if (index === 0 && subPathIndex > 0) {
      // If it's a relative 'm' command at the start of a non-first subpath,
      // convert it to absolute coordinates for proper rendering
      if (command.command === 'm') {
        const absoluteCommand = {
          ...command,
          command: 'M' as const,
          x: position.x,
          y: position.y
        };
        currentPosition = position;
        return commandToString(absoluteCommand);
      }
    }
    
    currentPosition = position;
    return commandToString(command);
  }).join(' ');
};

// Function to find which subpath contains a given point
export const findSubPathAtPoint = (path: SVGPath, point: Point, tolerance: number = 15): SVGSubPath | null => {
  let closestSubPath = null;
  let minDistance = Infinity;

  for (const subPath of path.subPaths) {
    // Calculate the distance from the point to this subpath
    const distance = getDistanceToSubPath(subPath, point);
    
    if (distance < tolerance && distance < minDistance) {
      minDistance = distance;
      closestSubPath = subPath;
    }
  }

  return closestSubPath;
};

// Helper function to calculate distance from a point to a subpath
const getDistanceToSubPath = (subPath: SVGSubPath, point: Point): number => {
  let minDistance = Infinity;

  // Calculate distance to each command point in the subpath
  for (let i = 0; i < subPath.commands.length; i++) {
    const command = subPath.commands[i];
    
    // Distance to main command point
    if (command.x !== undefined && command.y !== undefined) {
      const distance = Math.sqrt(
        Math.pow(point.x - command.x, 2) + 
        Math.pow(point.y - command.y, 2)
      );
      minDistance = Math.min(minDistance, distance);
    }
    
    // Distance to control points for curves
    if (command.x1 !== undefined && command.y1 !== undefined) {
      const distance = Math.sqrt(
        Math.pow(point.x - command.x1, 2) + 
        Math.pow(point.y - command.y1, 2)
      );
      minDistance = Math.min(minDistance, distance);
    }
    
    if (command.x2 !== undefined && command.y2 !== undefined) {
      const distance = Math.sqrt(
        Math.pow(point.x - command.x2, 2) + 
        Math.pow(point.y - command.y2, 2)
      );
      minDistance = Math.min(minDistance, distance);
    }

    // For line segments, also check distance to the line between consecutive points
    if (i > 0) {
      const prevCommand = subPath.commands[i - 1];
      if (prevCommand.x !== undefined && prevCommand.y !== undefined &&
          command.x !== undefined && command.y !== undefined) {
        const lineDistance = distanceToLineSegment(
          point,
          { x: prevCommand.x, y: prevCommand.y },
          { x: command.x, y: command.y }
        );
        minDistance = Math.min(minDistance, lineDistance);
      }
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
    case 'm':
    case 'L':
    case 'l':
      return `${cmd} ${params.x} ${params.y}`;
    case 'H':
    case 'h':
      return `${cmd} ${params.x}`;
    case 'V':
    case 'v':
      return `${cmd} ${params.y}`;
    case 'C':
    case 'c':
      return `${cmd} ${params.x1} ${params.y1} ${params.x2} ${params.y2} ${params.x} ${params.y}`;
    case 'S':
    case 's':
      return `${cmd} ${params.x2} ${params.y2} ${params.x} ${params.y}`;
    case 'Q':
    case 'q':
      return `${cmd} ${params.x1} ${params.y1} ${params.x} ${params.y}`;
    case 'T':
    case 't':
      return `${cmd} ${params.x} ${params.y}`;
    case 'A':
    case 'a':
      return `${cmd} ${params.rx} ${params.ry} ${params.xAxisRotation} ${params.largeArcFlag} ${params.sweepFlag} ${params.x} ${params.y}`;
    case 'Z':
    case 'z':
      return cmd;
    default:
      return '';
  }
};

export const parsePathString = (d: string): SVGPath => {
  const commands = parsePathCommands(d);
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

export const parsePathCommands = (d: string): SVGCommand[] => {
  // Simple regex to parse SVG path commands
  const regex = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
  const commands: SVGCommand[] = [];
  let match;
  
  while ((match = regex.exec(d)) !== null) {
    const command = match[1];
    const params = match[2].trim().split(/[\s,]+/).filter(p => p !== '').map(parseFloat);
    
    if (command === 'M' || command === 'm' || 
        command === 'L' || command === 'l') {
      for (let i = 0; i < params.length; i += 2) {
        commands.push({
          id: `cmd-${commands.length}`,
          command: command,
          x: params[i],
          y: params[i + 1]
        });
      }
    } else if (command === 'H' || command === 'h') {
      for (let i = 0; i < params.length; i++) {
        commands.push({
          id: `cmd-${commands.length}`,
          command: command,
          x: params[i]
        });
      }
    } else if (command === 'V' || command === 'v') {
      for (let i = 0; i < params.length; i++) {
        commands.push({
          id: `cmd-${commands.length}`,
          command: command,
          y: params[i]
        });
      }
    } else if (command === 'C' || command === 'c') {
      for (let i = 0; i < params.length; i += 6) {
        commands.push({
          id: `cmd-${commands.length}`,
          command: command,
          x1: params[i],
          y1: params[i + 1],
          x2: params[i + 2],
          y2: params[i + 3],
          x: params[i + 4],
          y: params[i + 5]
        });
      }
    } else if (command === 'S' || command === 's' || 
               command === 'Q' || command === 'q') {
      for (let i = 0; i < params.length; i += 4) {
        commands.push({
          id: `cmd-${commands.length}`,
          command: command,
          x1: params[i],
          y1: params[i + 1],
          x: params[i + 2],
          y: params[i + 3]
        });
      }
    } else if (command === 'T' || command === 't') {
      for (let i = 0; i < params.length; i += 2) {
        commands.push({
          id: `cmd-${commands.length}`,
          command: command,
          x: params[i],
          y: params[i + 1]
        });
      }
    } else if (command === 'A' || command === 'a') {
      for (let i = 0; i < params.length; i += 7) {
        commands.push({
          id: `cmd-${commands.length}`,
          command: command,
          rx: params[i],
          ry: params[i + 1],
          xAxisRotation: params[i + 2],
          largeArcFlag: params[i + 3],
          sweepFlag: params[i + 4],
          x: params[i + 5],
          y: params[i + 6]
        });
      }
    } else if (command === 'Z' || command === 'z') {
      commands.push({
        id: `cmd-${commands.length}`,
        command: command
      });
    }
  }
  
  return commands;
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
 * Gets the absolute position of a command within its subpath context
 * This correctly handles relative commands by calculating cumulative positions
 * Now also considers the subpath's position within the full path
 */
export const getAbsoluteCommandPosition = (command: SVGCommand, subPath: SVGSubPath, allSubPaths?: SVGSubPath[]): Point | null => {
  if (command.x === undefined || command.y === undefined) {
    return null;
  }

  // Find the index of this command in the subpath
  const commandIndex = subPath.commands.findIndex(cmd => cmd.id === command.id);
  if (commandIndex === -1) {
    return null;
  }

  // Calculate the starting position of this subpath within the full path
  let pathStartPosition: { x: number, y: number } = { x: 0, y: 0 };
  
  if (allSubPaths) {
    const subPathIndex = allSubPaths.findIndex(sp => sp.id === subPath.id);
    if (subPathIndex > 0) {
      // Calculate cumulative position from all previous subpaths
      for (let i = 0; i < subPathIndex; i++) {
        pathStartPosition = getSubPathFinalPosition(allSubPaths[i], pathStartPosition);
      }
    }
  }

  // Calculate absolute position by tracking through all previous commands in this subpath
  let currentX = pathStartPosition.x;
  let currentY = pathStartPosition.y;

  for (let i = 0; i <= commandIndex; i++) {
    const cmd = subPath.commands[i];
    const isRelative = cmd.command === cmd.command.toLowerCase() && cmd.command !== 'z';

    if (cmd.x !== undefined && cmd.y !== undefined) {
      if (cmd.command === 'M' || cmd.command === 'm') {
        // Special handling for M/m commands
        if (i === 0) {
          // First command in subpath - m is relative to pathStartPosition
          if (isRelative) {
            currentX = pathStartPosition.x + cmd.x;
            currentY = pathStartPosition.y + cmd.y;
          } else {
            currentX = cmd.x;
            currentY = cmd.y;
          }
        } else {
          // Subsequent M/m commands within the same subpath
          if (isRelative) {
            currentX += cmd.x;
            currentY += cmd.y;
          } else {
            currentX = cmd.x;
            currentY = cmd.y;
          }
        }
      } else {
        // Other commands (L, C, Q, etc.)
        if (isRelative) {
          currentX += cmd.x;
          currentY += cmd.y;
        } else {
          currentX = cmd.x;
          currentY = cmd.y;
        }
      }
    } else if (cmd.command === 'H' || cmd.command === 'h') {
      // Horizontal line
      if (cmd.x !== undefined) {
        if (isRelative) {
          currentX += cmd.x;
        } else {
          currentX = cmd.x;
        }
      }
    } else if (cmd.command === 'V' || cmd.command === 'v') {
      // Vertical line
      if (cmd.y !== undefined) {
        if (isRelative) {
          currentY += cmd.y;
        } else {
          currentY = cmd.y;
        }
      }
    }
  }

  return { x: currentX, y: currentY };
};

/**
 * Gets all absolute control point positions for a command within its subpath context
 * Now also considers the subpath's position within the full path
 */
export const getAbsoluteControlPoints = (command: SVGCommand, subPath: SVGSubPath, allSubPaths?: SVGSubPath[]): Point[] => {
  const controlPoints: Point[] = [];
  
  // First get the absolute position of the current command
  const commandIndex = subPath.commands.findIndex(cmd => cmd.id === command.id);
  if (commandIndex === -1) {
    return controlPoints;
  }

  // Calculate the starting position of this subpath within the full path
  let pathStartPosition: { x: number, y: number } = { x: 0, y: 0 };
  
  if (allSubPaths) {
    const subPathIndex = allSubPaths.findIndex(sp => sp.id === subPath.id);
    if (subPathIndex > 0) {
      // Calculate cumulative position from all previous subpaths
      for (let i = 0; i < subPathIndex; i++) {
        pathStartPosition = getSubPathFinalPosition(allSubPaths[i], pathStartPosition);
      }
    }
  }

  // Calculate the current absolute position (position before this command)
  let currentX = pathStartPosition.x;
  let currentY = pathStartPosition.y;

  for (let i = 0; i < commandIndex; i++) {
    const cmd = subPath.commands[i];
    const isRelative = cmd.command === cmd.command.toLowerCase();

    if (cmd.x !== undefined && cmd.y !== undefined) {
      if (isRelative && i > 0) {
        currentX += cmd.x;
        currentY += cmd.y;
      } else {
        currentX = cmd.x;
        currentY = cmd.y;
      }
    } else if (cmd.command === 'H' || cmd.command === 'h') {
      if (cmd.x !== undefined) {
        if (isRelative) {
          currentX += cmd.x;
        } else {
          currentX = cmd.x;
        }
      }
    } else if (cmd.command === 'V' || cmd.command === 'v') {
      if (cmd.y !== undefined) {
        if (isRelative) {
          currentY += cmd.y;
        } else {
          currentY = cmd.y;
        }
      }
    }
  }

  const isRelative = command.command === command.command.toLowerCase();

  // Add control points based on command type
  if (command.x1 !== undefined && command.y1 !== undefined) {
    const x1 = isRelative ? currentX + command.x1 : command.x1;
    const y1 = isRelative ? currentY + command.y1 : command.y1;
    controlPoints.push({ x: x1, y: y1 });
  }

  if (command.x2 !== undefined && command.y2 !== undefined) {
    const x2 = isRelative ? currentX + command.x2 : command.x2;
    const y2 = isRelative ? currentY + command.y2 : command.y2;
    controlPoints.push({ x: x2, y: y2 });
  }

  return controlPoints;
};