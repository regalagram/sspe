// utils/animation-target-utils.ts

import { SVGPath, SelectionState } from '../types';

/**
 * Get the appropriate target element ID for animations based on current selection
 * Handles the logic for finding parent paths when subpaths or commands are selected
 */
export const getAnimationTargetId = (selection: SelectionState, paths: SVGPath[]): string | null => {
  // If a path is directly selected, use it
  if (selection.selectedPaths && selection.selectedPaths.length > 0) {
    return selection.selectedPaths[0];
  }
  
  // If a text is selected, use it
  if (selection.selectedTexts && selection.selectedTexts.length > 0) {
    return selection.selectedTexts[0];
  }
  
  // If an image is selected, use it
  if (selection.selectedImages && selection.selectedImages.length > 0) {
    return selection.selectedImages[0];
  }
  
  // If a group is selected, use it
  if (selection.selectedGroups && selection.selectedGroups.length > 0) {
    return selection.selectedGroups[0];
  }
  
  // If a textPath is selected, use it
  if (selection.selectedTextPaths && selection.selectedTextPaths.length > 0) {
    return selection.selectedTextPaths[0];
  }
  
  // If a symbol use is directly selected, use it
  if (selection.selectedUses && selection.selectedUses.length > 0) {
    return selection.selectedUses[0];
  }
  
  // If a subpath is selected, find the parent path
  if (selection.selectedSubPaths.length > 0) {
    const subPathId = selection.selectedSubPaths[0];
    const parentPath = paths.find(path => 
      path.subPaths.some((subPath: any) => subPath.id === subPathId)
    );
    return parentPath?.id || subPathId; // Fallback to subpath if parent not found
  }
  
  // If a command is selected, find the parent path
  if (selection.selectedCommands.length > 0) {
    const commandId = selection.selectedCommands[0];
    for (const path of paths) {
      for (const subPath of path.subPaths) {
        if (subPath.commands.some((cmd: any) => cmd.id === commandId)) {
          return path.id;
        }
      }
    }
  }
  
  return null;
};

/**
 * Get the target path ID specifically for path draw animations
 * Only returns path IDs, as path draw animation only works on paths
 */
export const getPathDrawAnimationTargetId = (selection: SelectionState, paths: SVGPath[]): string | null => {
  // If a path is directly selected, use it
  if (selection.selectedPaths && selection.selectedPaths.length > 0) {
    return selection.selectedPaths[0];
  }
  
  // If a subpath is selected, find the parent path
  if (selection.selectedSubPaths.length > 0) {
    const subPathId = selection.selectedSubPaths[0];
    const parentPath = paths.find(path => 
      path.subPaths.some((subPath: any) => subPath.id === subPathId)
    );
    return parentPath?.id || null; // Only return if parent path is found
  }
  
  // If a command is selected, find the parent path
  if (selection.selectedCommands.length > 0) {
    const commandId = selection.selectedCommands[0];
    for (const path of paths) {
      for (const subPath of path.subPaths) {
        if (subPath.commands.some((cmd: any) => cmd.id === commandId)) {
          return path.id;
        }
      }
    }
  }
  
  return null;
};
