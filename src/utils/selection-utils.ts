import { EditorState, SVGPath, SVGSubPath } from '../types';

/**
 * Find the sub-path that contains a specific command
 */
export function findSubPathByCommandId(paths: SVGPath[], commandId: string): { pathId: string; subPath: SVGSubPath } | null {
  for (const path of paths) {
    for (const subPath of path.subPaths) {
      if (subPath.commands.some(cmd => cmd.id === commandId)) {
        return { pathId: path.id, subPath };
      }
    }
  }
  return null;
}

/**
 * Find a sub-path by its ID
 */
export function findSubPathById(paths: SVGPath[], subPathId: string): { pathId: string; subPath: SVGSubPath } | null {
  for (const path of paths) {
    for (const subPath of path.subPaths) {
      if (subPath.id === subPathId) {
        return { pathId: path.id, subPath };
      }
    }
  }
  return null;
}

/**
 * Get the insertion context for creation commands based on current selection
 */
export function getCreationInsertionContext(state: EditorState): {
  type: 'after-command' | 'end-of-subpath' | 'new-path';
  commandId?: string;
  subPathId?: string;
} {
  const { selection } = state;
  
  // Priority 1: If exactly one command is selected, insert after it
  if (selection.selectedCommands.length === 1) {
    return {
      type: 'after-command',
      commandId: selection.selectedCommands[0],
    };
  }
  
  // Priority 2: If exactly one sub-path is selected, insert at the end of it
  if (selection.selectedSubPaths.length === 1) {
    return {
      type: 'end-of-subpath',
      subPathId: selection.selectedSubPaths[0],
    };
  }
  
  // Default: Use existing behavior (last sub-path of last path or new path)
  return {
    type: 'new-path',
  };
}
