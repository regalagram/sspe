import { SVGCommand, Point } from '../types';

/**
 * Get the position of a command point
 * @param command - The SVG command
 * @returns The position point or null if the command doesn't have a position
 */
export function getCommandPointPosition(command: SVGCommand): Point | null {
  if (command.x !== undefined && command.y !== undefined) {
    return { x: command.x, y: command.y };
  }
  return null;
}

/**
 * Check if a command has a valid position for arranging
 * @param command - The SVG command
 * @returns True if the command can be arranged
 */
export function isCommandArrangeable(command: SVGCommand): boolean {
  // Z commands don't have position coordinates
  return command.command !== 'Z' && command.x !== undefined && command.y !== undefined;
}

/**
 * Get bounds for a collection of command points
 * @param commands - Array of SVG commands
 * @returns Bounding box or null if no valid commands
 */
export function getCommandPointsBounds(commands: SVGCommand[]) {
  const positions = commands
    .map(getCommandPointPosition)
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
 * @param targetX - Target X position
 * @param targetY - Target Y position
 * @returns Delta object with x and y offsets
 */
export function calculateCommandMoveDelta(command: SVGCommand, targetX: number, targetY: number): Point {
  const currentPos = getCommandPointPosition(command);
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
 * @param commands - Array of SVG commands
 * @param tolerance - Tolerance for considering points coincident
 * @returns Array of command groups where each group represents commands at the same position
 */
export function groupCoincidentCommands(commands: SVGCommand[], tolerance: number = 0.1): SVGCommand[][] {
  const groups: SVGCommand[][] = [];
  
  for (const command of commands) {
    if (!isCommandArrangeable(command)) continue;
    
    const position = getCommandPointPosition(command);
    if (!position) continue;
    
    // Find an existing group with coincident position
    let foundGroup = false;
    for (const group of groups) {
      if (group.length > 0) {
        const groupPosition = getCommandPointPosition(group[0]);
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
 * Get unique positions from a list of commands, merging coincident points
 * @param commands - Array of SVG commands
 * @param tolerance - Tolerance for considering points coincident
 * @returns Array of unique positions with their associated command groups
 */
export function getUniqueCommandPositions(commands: SVGCommand[], tolerance: number = 0.1): Array<{
  position: Point;
  commands: SVGCommand[];
}> {
  const groups = groupCoincidentCommands(commands, tolerance);
  
  return groups.map(group => {
    const position = getCommandPointPosition(group[0])!; // We know it exists from groupCoincidentCommands
    return {
      position,
      commands: group
    };
  });
}