import { EditorState, SVGPath, SVGSubPath } from '../types';

// ElementType definition for selection utilities
export type ElementType = 'image' | 'use' | 'text' | 'multiline-text' | 'textPath' | 'group' | 'command' | 'subpath';

export interface SelectionState {
  selectedCommands: string[];
  selectedSubPaths: string[];
  selectedPaths: string[];
  selectedTexts: string[];
  selectedTextPaths: string[];
  selectedImages: string[];
  selectedUses: string[];
  selectedGroups: string[];
}

export interface SelectionContext {
  selection: SelectionState;
  groups: any[];
  paths: any[];
}

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
export function getCreationInsertionContext(
  state: EditorState, 
  commandType?: string
): {
  type: 'after-command' | 'end-of-subpath' | 'new-path';
  commandId?: string;
  subPathId?: string;
} {
  const { selection } = state;
  
  // Special case: NEW_PATH always creates a new path regardless of selection
  if (commandType === 'NEW_PATH') {
    return {
      type: 'new-path',
    };
  }
  
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

/**
 * Checks if an element is currently selected
 */
export function isElementSelected(elementId: string, elementType: ElementType, selection: SelectionState): boolean {
  switch (elementType) {
    case 'image': return selection.selectedImages?.includes(elementId) || false;
    case 'use': return selection.selectedUses?.includes(elementId) || false;
    case 'text': 
    case 'multiline-text': return selection.selectedTexts?.includes(elementId) || false;
    case 'textPath': return selection.selectedTextPaths?.includes(elementId) || false;
    case 'group': return selection.selectedGroups?.includes(elementId) || false;
    case 'command': return selection.selectedCommands?.includes(elementId) || false;
    case 'subpath': return selection.selectedSubPaths?.includes(elementId) || false;
    default: return false;
  }
}

/**
 * Checks if there's currently a multi-selection (more than one element selected)
 */
export function hasMultiSelection(selection: SelectionState): boolean {
  const totalSelected = (selection.selectedCommands?.length || 0) + 
                       (selection.selectedSubPaths?.length || 0) + 
                       (selection.selectedPaths?.length || 0) +
                       (selection.selectedTexts?.length || 0) +
                       (selection.selectedTextPaths?.length || 0) +
                       (selection.selectedImages?.length || 0) +
                       (selection.selectedUses?.length || 0) +
                       (selection.selectedGroups?.length || 0);
  return totalSelected > 1;
}

/**
 * Checks if an element belongs to a currently selected group
 */
export function isElementInSelectedGroup(
  elementId: string, 
  elementType: ElementType, 
  context: SelectionContext
): boolean {
  const { selection, groups, paths } = context;
  
  // Special case for subpaths: find the parent path and check if it's in a selected group
  if (elementType === 'subpath') {
    const parentPath = paths.find((path: any) => 
      path.subPaths?.some((subPath: any) => subPath.id === elementId)
    );
    
    if (parentPath) {
      for (const groupId of selection.selectedGroups || []) {
        const group = groups.find((g: any) => g.id === groupId);
        if (group?.children?.some((child: any) => 
          child.id === parentPath.id && child.type === 'path')) {
          return true;
        }
      }
    }
    return false;
  }
  
  // Regular case for other element types
  for (const groupId of selection.selectedGroups || []) {
    const group = groups.find((g: any) => g.id === groupId);
    if (group?.children?.some((child: any) => 
      child.id === elementId && child.type === elementType)) {
      return true;
    }
  }
  return false;
}

/**
 * Determines if selection should be preserved based on group membership and multi-selection state
 * Returns true if selection should be preserved (don't call selection functions)
 */
export function shouldPreserveSelection(
  elementId: string,
  elementType: ElementType,
  context: SelectionContext
): boolean {
  const isSelected = isElementSelected(elementId, elementType, context.selection);
  const hasMulti = hasMultiSelection(context.selection);
  const belongsToSelectedGroup = isElementInSelectedGroup(elementId, elementType, context);
  
  // If element is already selected, don't change selection
  if (isSelected) {
    return true;
  }
  
  // If element belongs to selected group and we have multi-selection, preserve selection
  if (belongsToSelectedGroup && hasMulti) {
    return true;
  }
  
  // If element belongs to selected group but no multi-selection, preserve selection
  if (belongsToSelectedGroup && !hasMulti) {
    return true;
  }
  
  // Otherwise, allow selection change
  return false;
}

/**
 * Debug logging helper for selection operations
 */
export function logSelectionDebug(
  message: string,
  elementId: string,
  elementType: ElementType,
  context: SelectionContext,
  debugMode: boolean = false
) {
  if (!debugMode) return;
  
  const isSelected = isElementSelected(elementId, elementType, context.selection);
  const hasMulti = hasMultiSelection(context.selection);
  const belongsToSelectedGroup = isElementInSelectedGroup(elementId, elementType, context);
  
  }
