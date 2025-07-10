import { SVGPath, SVGSubPath, SVGCommand } from '../types';
import { generateId } from './id-utils';

/**
 * Deeply clones a command with a new ID.
 */
export function duplicateCommand(cmd: SVGCommand): SVGCommand {
  return {
    ...cmd,
    id: generateId(),
  };
}

/**
 * Deeply clones a subpath with a new ID and new command IDs.
 */
export function duplicateSubPath(subPath: SVGSubPath): SVGSubPath {
  return {
    ...subPath,
    id: generateId(),
    commands: subPath.commands.map(duplicateCommand),
  };
}

/**
 * Deeply clones a path with a new ID, new subpath IDs, and new command IDs.
 */
export function duplicatePath(path: SVGPath): SVGPath {
  return {
    ...path,
    id: generateId(),
    subPaths: path.subPaths.map(duplicateSubPath),
  };
}
