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
 * Enhanced smoothing that converts ALL segments to cubic Bézier curves (C commands)
 * Based on reference implementation - ensures smoothed paths use only C commands
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
  
  // Convert ALL segments to cubic Bézier curves
  const smoothedCommands: SVGCommand[] = [];
  const smoothingFactor = 0.25;
  
  for (let i = 0; i < normalizedSegment.length; i++) {
    const current = normalizedSegment[i];
    
    // Always preserve the first M command
    if (i === 0) {
      smoothedCommands.push({
        ...current,
        id: `${current.id || 'smooth'}-${i}`,
        command: 'M',
        x: snapToGridValue(current.x || 0, gridSize),
        y: snapToGridValue(current.y || 0, gridSize)
      });
      continue;
    }
    
    // Get previous point for curve calculation
    const prev = normalizedSegment[i - 1];
    if (!prev || !('x' in prev) || !('y' in prev) || !('x' in current) || !('y' in current)) {
      // Fallback: preserve as-is if we can't get coordinates
      smoothedCommands.push({ ...current });
      continue;
    }
    
    const prevX = prev.x!;
    const prevY = prev.y!;
    const currX = current.x!;
    const currY = current.y!;
    
    // Calculate segment vector
    const segVecX = currX - prevX;
    const segVecY = currY - prevY;
    const segLength = Math.sqrt(segVecX * segVecX + segVecY * segVecY);
    
    // Skip if segment is too short (degenerate case)
    if (segLength < 1e-6) {
      continue; // Skip degenerate segments
    }
    
    // Get next point to calculate smooth control points (if available)
    const next = i < normalizedSegment.length - 1 ? normalizedSegment[i + 1] : null;
    
    let cp1X, cp1Y, cp2X, cp2Y;
    
    if (next && 'x' in next && 'y' in next) {
      // We have a next point - use it for intelligent smoothing
      const nextX = next.x!;
      const nextY = next.y!;
      
      // Input vector (from previous to current)
      const inVecX = currX - prevX;
      const inVecY = currY - prevY;
      const inLength = Math.sqrt(inVecX * inVecX + inVecY * inVecY);
      
      // Output vector (from current to next)
      const outVecX = nextX - currX;
      const outVecY = nextY - currY;
      const outLength = Math.sqrt(outVecX * outVecX + outVecY * outVecY);
      
      if (inLength > 1e-6 && outLength > 1e-6) {
        // Calculate smooth tangent
        const inNormX = inVecX / inLength;
        const inNormY = inVecY / inLength;
        const outNormX = outVecX / outLength;
        const outNormY = outVecY / outLength;
        
        // Average tangent direction for smooth transitions
        const tangentX = (inNormX + outNormX) * 0.5;
        const tangentY = (inNormY + outNormY) * 0.5;
        const tangentLength = Math.sqrt(tangentX * tangentX + tangentY * tangentY);
        
        if (tangentLength > 1e-6) {
          const normTangentX = tangentX / tangentLength;
          const normTangentY = tangentY / tangentLength;
          
          const controlDistance = Math.min(inLength, outLength) * smoothingFactor;
          
          // Place control points along the smooth tangent
          cp1X = prevX + normTangentX * controlDistance;
          cp1Y = prevY + normTangentY * controlDistance;
          cp2X = currX - normTangentX * controlDistance;
          cp2Y = currY - normTangentY * controlDistance;
        } else {
          // Fallback to simple control points
          const controlDistance = segLength * smoothingFactor;
          cp1X = prevX + segVecX * smoothingFactor;
          cp1Y = prevY + segVecY * smoothingFactor;
          cp2X = currX - segVecX * smoothingFactor;
          cp2Y = currY - segVecY * smoothingFactor;
        }
      } else {
        // Fallback to linear control points
        const controlDistance = segLength * smoothingFactor;
        cp1X = prevX + segVecX * smoothingFactor;
        cp1Y = prevY + segVecY * smoothingFactor;
        cp2X = currX - segVecX * smoothingFactor;
        cp2Y = currY - segVecY * smoothingFactor;
      }
    } else {
      // Last segment or no next point - use simple control points
      const controlDistance = segLength * smoothingFactor;
      cp1X = prevX + segVecX * smoothingFactor;
      cp1Y = prevY + segVecY * smoothingFactor;
      cp2X = currX - segVecX * smoothingFactor;
      cp2Y = currY - segVecY * smoothingFactor;
    }
    
    // Create cubic Bézier curve command (ALL smoothed segments become C commands)
    smoothedCommands.push({
      id: `${current.id || 'smooth'}-${i}`,
      command: 'C',
      x1: snapToGridValue(cp1X, gridSize),
      y1: snapToGridValue(cp1Y, gridSize),
      x2: snapToGridValue(cp2X, gridSize),
      y2: snapToGridValue(cp2Y, gridSize),
      x: snapToGridValue(currX, gridSize),
      y: snapToGridValue(currY, gridSize)
    });
  }
  
  // Handle Z command restoration for closed paths
  // Following reference implementation - add explicit C curve instead of Z for better smoothing
  if (originalEndsWithZ && smoothedCommands.length > 1) {
    const firstCmd = smoothedCommands[0];
    const lastCmd = smoothedCommands[smoothedCommands.length - 1];
    
    // Only add closing curve if endpoints don't match
    if (firstCmd && lastCmd && 
        'x' in firstCmd && 'y' in firstCmd && 
        'x' in lastCmd && 'y' in lastCmd) {
      
      const tolerance = gridSize * 0.5;
      if (Math.abs(lastCmd.x! - firstCmd.x!) > tolerance || 
          Math.abs(lastCmd.y! - firstCmd.y!) > tolerance) {
        
        // Calculate smooth closing curve
        const closeVecX = firstCmd.x! - lastCmd.x!;
        const closeVecY = firstCmd.y! - lastCmd.y!;
        const closeLength = Math.sqrt(closeVecX * closeVecX + closeVecY * closeVecY);
        
        if (closeLength > 1e-6) {
          const controlDistance = closeLength * smoothingFactor;
          const cp1X = lastCmd.x! + closeVecX * smoothingFactor;
          const cp1Y = lastCmd.y! + closeVecY * smoothingFactor;
          const cp2X = firstCmd.x! - closeVecX * smoothingFactor;
          const cp2Y = firstCmd.y! - closeVecY * smoothingFactor;
          
          // Add smooth closing curve (C command, not Z)
          smoothedCommands.push({
            id: `${lastCmd.id || 'smooth'}-close`,
            command: 'C',
            x1: snapToGridValue(cp1X, gridSize),
            y1: snapToGridValue(cp1Y, gridSize),
            x2: snapToGridValue(cp2X, gridSize),
            y2: snapToGridValue(cp2Y, gridSize),
            x: firstCmd.x,
            y: firstCmd.y
          });
        }
      }
      // Note: Following reference, we don't add Z here for better smoothing results
    }
  }

  return smoothedCommands;
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
