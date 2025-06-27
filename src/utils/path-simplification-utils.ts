import { SVGCommand, SVGSubPath, Point } from '../types';
import { pointsOnPath } from 'points-on-path';
import { getPointSmooth, normalizeZCommandsForSmoothing } from './point-smooth';

/**
 * Utility functions for path simplification and smoothing
 * Based on the reference implementation
 */

// Simulated snapToGridValue function - will use the grid snap from store
export const snapToGridValue = (value: number, gridSize: number = 1): number => {
  return Math.round(value / gridSize) * gridSize;
};

/**
 * Generates a path string from commands
 */
export const generateSubpathString = (commands: SVGCommand[], options?: { startX?: number; startY?: number }): string => {
  if (!commands || commands.length === 0) return '';
  
  let pathString = '';
  let isFirstCommand = true;
  
  for (const cmd of commands) {
    switch (cmd.command.toUpperCase()) {
      case 'M':
        pathString += isFirstCommand ? `M ${cmd.x} ${cmd.y}` : ` M ${cmd.x} ${cmd.y}`;
        break;
      case 'L':
        pathString += isFirstCommand ? `M ${cmd.x} ${cmd.y}` : ` L ${cmd.x} ${cmd.y}`;
        break;
      case 'H':
        pathString += isFirstCommand ? `M ${cmd.x} ${options?.startY || 0}` : ` H ${cmd.x}`;
        break;
      case 'V':
        pathString += isFirstCommand ? `M ${options?.startX || 0} ${cmd.y}` : ` V ${cmd.y}`;
        break;
      case 'C':
        pathString += isFirstCommand ? `M ${cmd.x} ${cmd.y}` : ` C ${cmd.x1} ${cmd.y1} ${cmd.x2} ${cmd.y2} ${cmd.x} ${cmd.y}`;
        break;
      case 'S':
        pathString += isFirstCommand ? `M ${cmd.x} ${cmd.y}` : ` S ${cmd.x2} ${cmd.y2} ${cmd.x} ${cmd.y}`;
        break;
      case 'Q':
        pathString += isFirstCommand ? `M ${cmd.x} ${cmd.y}` : ` Q ${cmd.x1} ${cmd.y1} ${cmd.x} ${cmd.y}`;
        break;
      case 'T':
        pathString += isFirstCommand ? `M ${cmd.x} ${cmd.y}` : ` T ${cmd.x} ${cmd.y}`;
        break;
      case 'A':
        pathString += isFirstCommand ? `M ${cmd.x} ${cmd.y}` : ` A ${cmd.rx} ${cmd.ry} ${cmd.xAxisRotation} ${cmd.largeArcFlag} ${cmd.sweepFlag} ${cmd.x} ${cmd.y}`;
        break;
      case 'Z':
        if (!isFirstCommand) {
          pathString += ' Z';
        }
        break;
    }
    isFirstCommand = false;
  }
  
  return pathString.trim();
};

/**
 * Generates a segment string from commands (similar to generateSegmentString from reference)
 */
export const generateSegmentString = (segment: SVGCommand[], generateSubpathStringFn: (commands: SVGCommand[], options?: { startX?: number; startY?: number }) => string): string => {
  if (!segment || segment.length === 0) return '';

  let startX = 0;
  let startY = 0;
  const firstCmd = segment[0];

  if ('x' in firstCmd && 'y' in firstCmd) {
    startX = firstCmd.x!;
    startY = firstCmd.y!;
  } else if (firstCmd.command === 'H' && 'x' in firstCmd) {
    startX = firstCmd.x!;
    startY = 0;
  } else if (firstCmd.command === 'V' && 'y' in firstCmd) {
    startY = firstCmd.y!;
    startX = 0;
  }

  if (firstCmd.command === 'M') {
    return generateSubpathStringFn(segment);
  } else {
    return generateSubpathStringFn(segment, { startX, startY });
  }
};

/**
 * Simplification using points-on-path (Ramer-Douglas-Peucker algorithm)
 * Based on reference implementation - correctly handles M and Z commands
 */
export const simplifySegmentWithPointsOnPath = (
  segment: SVGCommand[], 
  simplifyTolerance: number = 0.1, 
  simplifyDistance: number = 10,
  gridSize: number = 1
): SVGCommand[] => {
  if (!segment || segment.length < 2) return segment;
  
  // Store original Z command state
  const originalEndsWithZ = segment[segment.length - 1]?.command === 'Z' || 
                             segment[segment.length - 1]?.command === 'z';
  
  // Prepare segment for processing - remove Z if present
  let workingSegment = [...segment];
  if (originalEndsWithZ) {
    workingSegment = workingSegment.slice(0, -1);
  }
  
  // Ensure we have a valid working segment
  if (workingSegment.length < 2) return segment;
  
  // Ensure first command is M for path generation
  const firstCmd = workingSegment[0];
  if (firstCmd.command !== 'M') {
    // Convert first command to M if it has coordinates
    if ('x' in firstCmd && 'y' in firstCmd) {
      workingSegment[0] = { 
        ...firstCmd, 
        command: 'M'
      };
    } else {
      console.warn('Cannot convert first command to M - missing coordinates');
      return segment;
    }
  }
  
  // Generate path string for points-on-path processing
  const segmentPath = generateSegmentString(workingSegment, generateSubpathString);
  if (!segmentPath || segmentPath.startsWith('L')) {
    console.warn('Could not generate valid path string for segment simplification.');
    return segment;
  }
  
  let simplifiedPointsArrays;
  try {
    simplifiedPointsArrays = pointsOnPath(
      segmentPath,
      simplifyTolerance,
      simplifyDistance
    );
  } catch (error) {
    console.error('Error during pointsOnPath calculation:', error, 'Segment Path:', segmentPath);
    return segment;
  }
  
  if (
    !simplifiedPointsArrays ||
    simplifiedPointsArrays.length === 0 ||
    simplifiedPointsArrays[0].length < 2
  ) {
    console.warn('Simplified path has too few points or pointsOnPath failed.');
    return segment;
  }
  
  const simplifiedPoints = simplifiedPointsArrays[0];
  const newSegmentCommands: SVGCommand[] = [];
  
  // Create simplified commands - first one should be M
  for (let i = 0; i < simplifiedPoints.length; i++) {
    const point = simplifiedPoints[i];
    const command = i === 0 ? 'M' : 'L';
    
    newSegmentCommands.push({
      id: `simplified-${i}`,
      command: command,
      x: snapToGridValue(point[0], gridSize),
      y: snapToGridValue(point[1], gridSize),
    });
  }
  
  // Restore Z command if original had it
  if (originalEndsWithZ && newSegmentCommands.length > 0) {
    newSegmentCommands.push({
      id: `simplified-z`,
      command: 'Z'
    });
  }
  
  return newSegmentCommands;
};

/**
 * Smoothing using getPointSmooth function (converts lines to curves)
 * Based on reference implementation - correctly handles M and Z commands
 */
export const generateSmoothPath = (
  subpathSegment: SVGCommand[],
  gridSize: number = 1
): SVGCommand[] => {
  if (!subpathSegment || subpathSegment.length < 2) return subpathSegment;
  
  // Store original Z command state
  const originalEndsWithZ = subpathSegment[subpathSegment.length - 1]?.command === 'Z' || 
                             subpathSegment[subpathSegment.length - 1]?.command === 'z';
  
  // Store original first command
  const originalFirstCommand = subpathSegment[0];
  
  // Normalize Z commands to L commands for proper smoothing
  const normalizedSegment = normalizeZCommandsForSmoothing(subpathSegment);
  
  // Apply smoothing
  let smoothedSegment = getPointSmooth(normalizedSegment);
  
  // Apply grid snapping to all coordinates
  smoothedSegment = smoothedSegment.map((cmd) => {
    const snappedCmd = { ...cmd };
    if ('x' in snappedCmd && snappedCmd.x !== undefined) snappedCmd.x = snapToGridValue(snappedCmd.x, gridSize);
    if ('y' in snappedCmd && snappedCmd.y !== undefined) snappedCmd.y = snapToGridValue(snappedCmd.y, gridSize);
    if ('x1' in snappedCmd && snappedCmd.x1 !== undefined) snappedCmd.x1 = snapToGridValue(snappedCmd.x1, gridSize);
    if ('y1' in snappedCmd && snappedCmd.y1 !== undefined) snappedCmd.y1 = snapToGridValue(snappedCmd.y1, gridSize);
    if ('x2' in snappedCmd && snappedCmd.x2 !== undefined) snappedCmd.x2 = snapToGridValue(snappedCmd.x2, gridSize);
    if ('y2' in snappedCmd && snappedCmd.y2 !== undefined) snappedCmd.y2 = snapToGridValue(snappedCmd.y2, gridSize);
    return snappedCmd;
  });
  
  // Ensure the first command is M (critical for valid SVG paths)
  if (smoothedSegment.length > 0) {
    const firstSmoothed = smoothedSegment[0];
    if (firstSmoothed.command !== 'M') {
      // If original was M, ensure the smoothed path starts with M
      if (originalFirstCommand.command === 'M') {
        firstSmoothed.command = 'M';
      } else {
        // If original wasn't M but we need M to start the path, insert one
        smoothedSegment.unshift({
          ...originalFirstCommand,
          command: 'M',
          x: snapToGridValue(originalFirstCommand.x || 0, gridSize),
          y: snapToGridValue(originalFirstCommand.y || 0, gridSize)
        });
      }
    }
  }
  
  // Handle Z command restoration for closed paths
  // Following reference implementation - add explicit line instead of Z for better smoothing
  if (originalEndsWithZ && smoothedSegment.length > 0) {
    const firstCmd = smoothedSegment[0];
    const lastCmd = smoothedSegment[smoothedSegment.length - 1];
    
    // Only add closing line if endpoints don't match
    if (firstCmd && lastCmd && 
        'x' in firstCmd && 'y' in firstCmd && 
        'x' in lastCmd && 'y' in lastCmd) {
      
      const tolerance = gridSize * 0.5;
      if (Math.abs(lastCmd.x! - firstCmd.x!) > tolerance || 
          Math.abs(lastCmd.y! - firstCmd.y!) > tolerance) {
        // Add explicit line to close path (better for smoothing than Z)
        smoothedSegment.push({
          id: `${lastCmd.id || 'smooth'}-close`,
          command: 'L',
          x: firstCmd.x,
          y: firstCmd.y
        });
      }
      // Note: Following reference, we don't add Z here for better smoothing results
    }
  }
  
  // Remove duplicate consecutive points at the beginning
  if (smoothedSegment.length > 1) {
    const first = smoothedSegment[0];
    const second = smoothedSegment[1];
    
    if (first.command === 'M' && second.command === 'L' &&
        'x' in first && 'y' in first && 'x' in second && 'y' in second &&
        Math.abs(first.x! - second.x!) < 1e-6 && Math.abs(first.y! - second.y!) < 1e-6) {
      smoothedSegment.splice(1, 1);
    }
  }

  return smoothedSegment;
};

/**
 * Check if all selected commands belong to the same subpath
 */
export const areCommandsInSameSubPath = (
  commandIds: string[], 
  paths: any[]
): { 
  sameSubPath: boolean; 
  subPath?: any; 
  pathId?: string;
  commands?: any[];
  startIndex?: number;
  endIndex?: number;
} => {
  if (commandIds.length === 0) return { sameSubPath: false };
  
  for (const path of paths) {
    for (const subPath of path.subPaths) {
      const commandsInThisSubPath = subPath.commands.filter((cmd: any) => 
        commandIds.includes(cmd.id)
      );
      
      if (commandsInThisSubPath.length === commandIds.length) {
        // All commands are in this subpath
        // Sort by their index in the subpath
        const sortedCommands = commandsInThisSubPath.sort((a: any, b: any) => {
          return subPath.commands.indexOf(a) - subPath.commands.indexOf(b);
        });
        
        const startIndex = subPath.commands.indexOf(sortedCommands[0]);
        const endIndex = subPath.commands.indexOf(sortedCommands[sortedCommands.length - 1]);
        
        return { 
          sameSubPath: true, 
          subPath, 
          pathId: path.id,
          commands: sortedCommands,
          startIndex,
          endIndex
        };
      }
      
      if (commandsInThisSubPath.length > 0 && commandsInThisSubPath.length < commandIds.length) {
        // Some commands are in this subpath, but not all - spans multiple subpaths
        return { sameSubPath: false };
      }
    }
  }
  
  return { sameSubPath: false };
};
