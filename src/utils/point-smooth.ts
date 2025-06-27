import { SVGCommand } from '../types';

/**
 * Creates smooth Bézier curves from line segments
 * Based on the reference implementation with proper edge case handling
 */
export function getPointSmooth(commands: SVGCommand[]): SVGCommand[] {
  if (!commands || commands.length < 2) {
    return commands;
  }

  const smoothedCommands: SVGCommand[] = [];
  const smoothingFactor = 0.25;

  for (let i = 0; i < commands.length; i++) {
    const current = commands[i];
    const prev = i > 0 ? commands[i - 1] : null;
    const next = i < commands.length - 1 ? commands[i + 1] : null;

    // Handle initial M command - always preserve as-is
    if (i === 0) {
      smoothedCommands.push({ ...current });
      continue;
    }

    // Handle final commands - preserve structure
    if (i === commands.length - 1) {
      // For Z commands, don't add them here - will be handled by generateSmoothPath
      if (current.command === 'Z' || current.command === 'z') {
        continue;
      }
      // For last non-Z commands, preserve as-is
      smoothedCommands.push({ ...current });
      continue;
    }

    // Only smooth L commands with valid neighbors (not M or Z)
    // Also check that prev is not M to avoid smoothing the first segment after M
    if (
      current.command === 'L' &&
      prev && next &&
      prev.command !== 'Z' && prev.command !== 'z' &&
      prev.command !== 'M' && prev.command !== 'm' && // Don't smooth immediately after M
      next.command !== 'Z' && next.command !== 'z' &&
      'x' in current && 'y' in current &&
      'x' in prev && 'y' in prev &&
      'x' in next && 'y' in next
    ) {
      // Calculate direction vectors
      const prevX = prev.x!;
      const prevY = prev.y!;
      const currX = current.x!;
      const currY = current.y!;
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

      // Skip smoothing if segments are too short
      if (inLength < 1e-6 || outLength < 1e-6) {
        smoothedCommands.push({ ...current });
        continue;
      }

      // Normalize vectors
      const inNormX = inVecX / inLength;
      const inNormY = inVecY / inLength;
      const outNormX = outVecX / outLength;
      const outNormY = outVecY / outLength;

      // Calculate control distance
      const controlDistance = Math.min(inLength, outLength) * smoothingFactor;

      // Calculate control points
      const cp1X = currX - inNormX * controlDistance;
      const cp1Y = currY - inNormY * controlDistance;
      const cp2X = currX + outNormX * controlDistance;
      const cp2Y = currY + outNormY * controlDistance;

      // Create cubic curve command
      smoothedCommands.push({
        ...current,
        command: 'C',
        x1: cp1X,
        y1: cp1Y,
        x2: cp2X,
        y2: cp2Y,
        x: currX,
        y: currY,
      });
    } else {
      // Preserve other commands without smoothing
      smoothedCommands.push({ ...current });
    }
  }

  return smoothedCommands;
}

/**
 * Normalizes Z commands by converting them to L commands for proper smoothing
 */
export function normalizeZCommandsForSmoothing(segment: SVGCommand[]): SVGCommand[] {
  if (!segment || segment.length < 2) return segment;
  
  const normalizedSegment = [...segment];
  const lastCommand = normalizedSegment[normalizedSegment.length - 1];
  
  // If the segment ends with Z, convert it to a line back to the first point
  if (lastCommand && (lastCommand.command === 'Z' || lastCommand.command === 'z')) {
    // Find the first moveTo command to get the start point
    const firstCommand = normalizedSegment.find(cmd => cmd.command === 'M' || cmd.command === 'm');
    
    if (firstCommand && ('x' in firstCommand && 'y' in firstCommand)) {
      // Replace Z with L command to the start point
      normalizedSegment[normalizedSegment.length - 1] = {
        ...lastCommand,
        command: 'L',
        x: firstCommand.x,
        y: firstCommand.y,
      };
    }
  }
  
  return normalizedSegment;
}
