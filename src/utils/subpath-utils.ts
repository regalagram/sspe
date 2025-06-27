import { SVGCommand, SVGSubPath, SVGPath } from '../types';
import { generateId } from './id-utils';

/**
 * Decomposes a list of commands into sub-paths.
 * Each sub-path starts with an 'M' command and continues until the next 'M' or end of commands.
 */
export function decomposeIntoSubPaths(commands: SVGCommand[]): SVGSubPath[] {
  const subPaths: SVGSubPath[] = [];
  let currentSubPath: SVGCommand[] = [];

  for (const command of commands) {
    if (command.command === 'M' || command.command === 'm') {
      // If we have commands in the current sub-path, save it
      if (currentSubPath.length > 0) {
        subPaths.push({
          id: generateId(),
          commands: currentSubPath,
        });
      }
      // Start a new sub-path
      currentSubPath = [command];
    } else {
      // Add command to current sub-path
      currentSubPath.push(command);
    }
  }

  // Add the last sub-path if it has commands
  if (currentSubPath.length > 0) {
    subPaths.push({
      id: generateId(),
      commands: currentSubPath,
    });
  }

  return subPaths;
}

/**
 * Combines sub-paths back into a single list of commands.
 */
export function combineSubPaths(subPaths: SVGSubPath[]): SVGCommand[] {
  return subPaths.flatMap(subPath => subPath.commands);
}

/**
 * Validates that a sub-path starts with an 'M' command and doesn't contain other 'M' commands.
 */
export function validateSubPath(subPath: SVGSubPath): boolean {
  if (subPath.commands.length === 0) return false;
  
  const firstCommand = subPath.commands[0];
  if (firstCommand.command !== 'M' && firstCommand.command !== 'm') {
    return false;
  }

  // Check that there are no other 'M' commands
  for (let i = 1; i < subPath.commands.length; i++) {
    const command = subPath.commands[i];
    if (command.command === 'M' || command.command === 'm') {
      return false;
    }
  }

  return true;
}

/**
 * Finds the sub-path that contains a specific command.
 */
export function findSubPathContainingCommand(paths: SVGPath[], commandId: string): { pathId: string; subPathId: string } | null {
  for (const path of paths) {
    for (const subPath of path.subPaths) {
      const hasCommand = subPath.commands.some(cmd => cmd.id === commandId);
      if (hasCommand) {
        return { pathId: path.id, subPathId: subPath.id };
      }
    }
  }
  return null;
}

/**
 * Gets all sub-paths from all paths as a flat array with path reference.
 */
export function getAllSubPaths(paths: SVGPath[]): Array<{ path: SVGPath; subPath: SVGSubPath }> {
  const result: Array<{ path: SVGPath; subPath: SVGSubPath }> = [];
  
  for (const path of paths) {
    for (const subPath of path.subPaths) {
      result.push({ path, subPath });
    }
  }
  
  return result;
}

/**
 * Creates a new path with a single sub-path containing a move command.
 */
export function createNewPath(x: number = 100, y: number = 100): SVGPath {
  return {
    id: generateId(),
    subPaths: [{
      id: generateId(),
      commands: [{
        id: generateId(),
        command: 'M',
        x,
        y,
      }],
    }],
    style: {
      fill: 'none',
      stroke: '#000000',
      strokeWidth: 2,
    },
  };
}
