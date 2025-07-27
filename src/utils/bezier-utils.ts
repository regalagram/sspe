import { SVGCommand, SVGSubPath, Point } from '../types';

/**
 * Calculate natural control points for a Bézier curve
 * @param startPoint - The starting point of the curve
 * @param endPoint - The ending point of the curve  
 * @param previousCommand - The previous command to determine curve direction
 * @returns Object with x1, y1, x2, y2 control points
 */
export function calculateBezierControlPoints(
  startPoint: Point,
  endPoint: Point,
  previousCommand?: SVGCommand
): { x1: number; y1: number; x2: number; y2: number } {
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Default control point distance (about 1/3 of the line distance)
  const controlDistance = distance * 0.33;
  
  // Calculate the angle of the line from start to end
  const angle = Math.atan2(dy, dx);
  
  // For the first control point (x1, y1) - extends from start point
  let cp1Angle = angle;
  
  // If there's a previous command, try to make a smooth transition
  if (previousCommand && 'x' in previousCommand && 'y' in previousCommand &&
      previousCommand.x !== undefined && previousCommand.y !== undefined) {
    
    // Calculate direction from previous point to start point
    const prevDx = startPoint.x - previousCommand.x;
    const prevDy = startPoint.y - previousCommand.y;
    const prevAngle = Math.atan2(prevDy, prevDx);
    
    // For smooth curves, continue in the same general direction
    cp1Angle = prevAngle;
  }
  
  // First control point extends from start point
  const x1 = startPoint.x + Math.cos(cp1Angle) * controlDistance;
  const y1 = startPoint.y + Math.sin(cp1Angle) * controlDistance;
  
  // Second control point extends towards end point (opposite direction)
  const cp2Angle = angle + Math.PI; // Opposite direction
  const x2 = endPoint.x + Math.cos(cp2Angle) * controlDistance;
  const y2 = endPoint.y + Math.sin(cp2Angle) * controlDistance;
  
  return { x1, y1, x2, y2 };
}

/**
 * Find the previous command in a sub-path relative to a given command ID
 * @param subPath - The sub-path to search in
 * @param commandId - The ID of the reference command
 * @returns The previous command or undefined if not found
 */
export function findPreviousCommand(subPath: SVGSubPath, commandId: string): SVGCommand | undefined {
  const commandIndex = subPath.commands.findIndex(cmd => cmd.id === commandId);
  if (commandIndex > 0) {
    return subPath.commands[commandIndex - 1];
  }
  return undefined;
}

/**
 * Get the end point of a command (where the cursor is after executing the command)
 * @param command - The SVG command
 * @returns The end point coordinates
 */
export function getCommandEndPoint(command: SVGCommand): Point | null {
  if ('x' in command && 'y' in command && 
      command.x !== undefined && command.y !== undefined) {
    return { x: command.x, y: command.y };
  }
  return null;
}

/**
 * Calculate smart Bézier control points based on context
 * @param subPath - The current sub-path
 * @param afterCommandId - ID of command after which we're inserting (optional)
 * @param endPoint - The target end point of the new curve
 * @returns Control points for a natural-looking Bézier curve
 */
export function calculateSmartBezierControlPoints(
  subPath: SVGSubPath,
  endPoint: Point,
  afterCommandId?: string
): { x1: number; y1: number; x2: number; y2: number } {
  let startPoint: Point;
  let previousCommand: SVGCommand | undefined;
  
  if (afterCommandId) {
    // Find the command we're inserting after
    const commandIndex = subPath.commands.findIndex(cmd => cmd.id === afterCommandId);
    if (commandIndex >= 0) {
      const currentCommand = subPath.commands[commandIndex];
      const currentEndPoint = getCommandEndPoint(currentCommand);
      if (currentEndPoint) {
        startPoint = currentEndPoint;
        // Use the current command as previous for smooth continuation
        previousCommand = currentCommand;
      } else {
        // Fallback to last command
        const lastCommand = subPath.commands[subPath.commands.length - 1];
        const lastEndPoint = getCommandEndPoint(lastCommand);
        startPoint = lastEndPoint || { x: 0, y: 0 };
        previousCommand = subPath.commands[subPath.commands.length - 2];
      }
    } else {
      // Fallback to last command
      const lastCommand = subPath.commands[subPath.commands.length - 1];
      const lastEndPoint = getCommandEndPoint(lastCommand);
      startPoint = lastEndPoint || { x: 0, y: 0 };
      previousCommand = subPath.commands[subPath.commands.length - 2];
    }
  } else {
    // Adding to end of sub-path - use last command
    const lastCommand = subPath.commands[subPath.commands.length - 1];
    const lastEndPoint = getCommandEndPoint(lastCommand);
    startPoint = lastEndPoint || { x: 0, y: 0 };
    previousCommand = subPath.commands[subPath.commands.length - 2];
  }
  
  return calculateBezierControlPoints(startPoint, endPoint, previousCommand);
}
