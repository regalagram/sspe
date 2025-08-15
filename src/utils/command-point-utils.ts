import { SVGCommand, Point } from '../types';

/**
 * Get the position of a command point
 * @param command - The SVG command
 * @param subPathCommands - All commands in the subpath (needed for Z command position)
 * @returns The position point or null if the command doesn't have a position
 */
export function getCommandPointPosition(command: SVGCommand, subPathCommands?: SVGCommand[]): Point | null {
  if (command.x !== undefined && command.y !== undefined) {
    return { x: command.x, y: command.y };
  }
  
  // Handle Z (close path) command - it connects to the first point of the subpath
  if (command.command === 'Z' && subPathCommands && subPathCommands.length > 0) {
    const firstCommand = subPathCommands.find(cmd => cmd.command === 'M');
    if (firstCommand && firstCommand.x !== undefined && firstCommand.y !== undefined) {
      return { x: firstCommand.x, y: firstCommand.y };
    }
  }
  
  return null;
}

/**
 * Check if a command has a valid position for arranging
 * @param command - The SVG command
 * @param subPathCommands - All commands in the subpath (needed for Z command validation)
 * @returns True if the command can be arranged
 */
export function isCommandArrangeable(command: SVGCommand, subPathCommands?: SVGCommand[]): boolean {
  // Regular commands with explicit coordinates
  if (command.x !== undefined && command.y !== undefined) {
    return true;
  }
  
  // Z commands are arrangeable if there's a valid first command to reference
  if (command.command === 'Z' && subPathCommands && subPathCommands.length > 0) {
    const firstCommand = subPathCommands.find(cmd => cmd.command === 'M');
    return firstCommand && firstCommand.x !== undefined && firstCommand.y !== undefined;
  }
  
  return false;
}

/**
 * Get bounds for a collection of command points with their context
 * @param commandsWithContext - Array of commands with their subpath context
 * @returns Bounding box or null if no valid commands
 */
export function getCommandPointsBounds(commandsWithContext: Array<{ command: SVGCommand; subPathCommands: SVGCommand[] }>) {
  const positions = commandsWithContext
    .map(({ command, subPathCommands }) => getCommandPointPosition(command, subPathCommands))
    .filter((pos): pos is Point => pos !== null);

  if (positions.length === 0) {
    return null;
  }

  const xs = positions.map(p => p.x);
  const ys = positions.map(p => p.y);
  
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2
  };
}

/**
 * Calculate the delta needed to move a command to a target position
 * @param command - The command to move
 * @param subPathCommands - All commands in the subpath (needed for Z command position)
 * @param targetX - Target X position
 * @param targetY - Target Y position
 * @returns Delta object with x and y offsets
 */
export function calculateCommandMoveDelta(command: SVGCommand, subPathCommands: SVGCommand[], targetX: number, targetY: number): Point {
  const currentPos = getCommandPointPosition(command, subPathCommands);
  if (!currentPos) {
    return { x: 0, y: 0 };
  }
  
  return {
    x: targetX - currentPos.x,
    y: targetY - currentPos.y
  };
}

/**
 * Check if two points are coincident (at the same position within tolerance)
 * @param point1 - First point
 * @param point2 - Second point
 * @param tolerance - Maximum distance to consider points coincident (default: 0.1)
 * @returns True if points are coincident
 */
export function arePointsCoincident(point1: Point, point2: Point, tolerance: number = 0.1): boolean {
  const dx = Math.abs(point1.x - point2.x);
  const dy = Math.abs(point1.y - point2.y);
  return dx <= tolerance && dy <= tolerance;
}

/**
 * Group commands by their positions, treating coincident points as one group
 * @param commandsWithContext - Array of commands with their subpath context
 * @param tolerance - Tolerance for considering points coincident
 * @returns Array of command groups where each group represents commands at the same position
 */
export function groupCoincidentCommands(
  commandsWithContext: Array<{ command: SVGCommand; subPathCommands: SVGCommand[] }>, 
  tolerance: number = 0.1
): SVGCommand[][] {
  const groups: SVGCommand[][] = [];
  
  for (const { command, subPathCommands } of commandsWithContext) {
    if (!isCommandArrangeable(command, subPathCommands)) continue;
    
    const position = getCommandPointPosition(command, subPathCommands);
    if (!position) continue;
    
    // Find an existing group with coincident position
    let foundGroup = false;
    for (const group of groups) {
      if (group.length > 0) {
        // Find the context for the first command in the group
        const groupCommandContext = commandsWithContext.find(ctx => ctx.command.id === group[0].id);
        const groupPosition = groupCommandContext 
          ? getCommandPointPosition(group[0], groupCommandContext.subPathCommands)
          : getCommandPointPosition(group[0]);
          
        if (groupPosition && arePointsCoincident(position, groupPosition, tolerance)) {
          group.push(command);
          foundGroup = true;
          break;
        }
      }
    }
    
    // If no existing group found, create a new one
    if (!foundGroup) {
      groups.push([command]);
    }
  }
  
  return groups;
}

/**
 * Get unique positions from commands with their subpath context, merging coincident points
 * @param commandsWithContext - Array of commands with their subpath context
 * @param tolerance - Tolerance for considering points coincident
 * @returns Array of unique positions with their associated command groups
 */
export function getUniqueCommandPositions(
  commandsWithContext: Array<{ command: SVGCommand; subPathCommands: SVGCommand[] }>, 
  tolerance: number = 0.1
): Array<{
  position: Point;
  commands: SVGCommand[];
}> {
  const groups = groupCoincidentCommands(commandsWithContext, tolerance);
  
  return groups.map(group => {
    // Get the context for the first command in the group to determine position
    const firstCommandContext = commandsWithContext.find(ctx => ctx.command.id === group[0].id);
    const position = firstCommandContext 
      ? getCommandPointPosition(group[0], firstCommandContext.subPathCommands)
      : getCommandPointPosition(group[0]);
    
    return {
      position: position!,
      commands: group
    };
  });
}