import { SVGCommand, SVGSubPath } from '../types';
import { useEditorStore } from '../store/editorStore';
import { getAbsoluteCommandPosition } from './path-utils';

export interface SpecialPointInfo {
  initialCommand: SVGCommand;
  finalCommand: SVGCommand;
  subPath: SVGSubPath;
  position: { x: number; y: number };
  hasZCommand: boolean;
}

/**
 * Check if a command is part of a special point (coincident initial/final points or M+Z case)
 */
export const isSpecialPoint = (commandId: string): boolean => {
  const store = useEditorStore.getState();
  const commandInfo = findCommandInPaths(commandId, store.paths);
  
  if (!commandInfo) return false;
  
  const { command, subPath, commandIndex } = commandInfo;
  const isInitial = commandIndex === 0;
  const isFinal = commandIndex === subPath.commands.length - 1;
  
  // Only initial or final commands can be special points
  if (!isInitial && !isFinal) return false;
  
  // Need at least 2 commands to have initial and final
  if (subPath.commands.length < 2) return false;
  
  const firstCommand = subPath.commands[0];
  const lastCommand = subPath.commands[subPath.commands.length - 1];
  
  // Case 1: M+Z - if there's a Z command in this subpath
  const hasZCommand = subPath.commands.some(cmd => cmd.command === 'Z');
  if (hasZCommand) {
    // For M+Z case, both the initial M command and the Z command are special points
    if (command.command === 'Z' || (isInitial && command.command === 'M')) {
      return true;
    }
  }
  
  // Case 2: Check if positions coincide (for non-Z cases)
  const firstPos = getAbsoluteCommandPosition(firstCommand, subPath, [subPath]);
  const lastPos = getAbsoluteCommandPosition(lastCommand, subPath, [subPath]);
  
  if (!firstPos || !lastPos) return false;
  
  return Math.abs(firstPos.x - lastPos.x) < 0.1 && 
         Math.abs(firstPos.y - lastPos.y) < 0.1;
};

/**
 * Get special point information for a command
 */
export const getSpecialPointInfo = (commandId: string): SpecialPointInfo | null => {
  const store = useEditorStore.getState();
  const commandInfo = findCommandInPaths(commandId, store.paths);
  
  if (!commandInfo || !isSpecialPoint(commandId)) return null;
  
  const { subPath } = commandInfo;
  const initialCommand = subPath.commands[0];
  const lastCommand = subPath.commands[subPath.commands.length - 1];
  
  // For M+Z case, the final command is the Z command
  const hasZCommand = subPath.commands.some(cmd => cmd.command === 'Z');
  const finalCommand = hasZCommand 
    ? subPath.commands.find(cmd => cmd.command === 'Z')! 
    : lastCommand;
  
  const position = getAbsoluteCommandPosition(initialCommand, subPath, [subPath]);
  if (!position) return null;
  
  return {
    initialCommand,
    finalCommand,
    subPath,
    position,
    hasZCommand
  };
};

/**
 * Check if there is exactly one special point OR one special point pair selected (and nothing else)
 */
export const hasExactlyOneSpecialPointSelected = (): boolean => {
  const store = useEditorStore.getState();
  const { selection } = store;
  
  // Must have only commands selected and nothing else
  if (selection.selectedPaths.length > 0) return false;
  if (selection.selectedSubPaths.length > 0) return false;
  if (selection.selectedTexts?.length > 0) return false;
  if (selection.selectedGroups?.length > 0) return false;
  if (selection.selectedImages?.length > 0) return false;
  if (selection.selectedUses?.length > 0) return false;
  
  // Case 1: Exactly one command selected
  if (selection.selectedCommands.length === 1) {
    return isSpecialPoint(selection.selectedCommands[0]);
  }
  
  // Case 2: Exactly two commands selected - check if they form a special pair
  if (selection.selectedCommands.length === 2) {
    const [cmd1Id, cmd2Id] = selection.selectedCommands;
    
    // Both must be special points
    if (!isSpecialPoint(cmd1Id) || !isSpecialPoint(cmd2Id)) return false;
    
    // Check if they belong to the same subpath and form a special pair
    const cmd1Info = findCommandInPaths(cmd1Id, store.paths);
    const cmd2Info = findCommandInPaths(cmd2Id, store.paths);
    
    if (!cmd1Info || !cmd2Info) return false;
    
    // Must be from the same subpath
    if (cmd1Info.subPath.id !== cmd2Info.subPath.id) return false;
    
    const subPath = cmd1Info.subPath;
    const hasZCommand = subPath.commands.some(cmd => cmd.command === 'Z');
    
    if (hasZCommand) {
      // For M+Z case: one should be initial M, other should be Z
      const initialCommand = subPath.commands[0];
      const zCommand = subPath.commands.find(cmd => cmd.command === 'Z');
      
      if (!zCommand) return false;
      
      const hasInitial = selection.selectedCommands.includes(initialCommand.id);
      const hasZ = selection.selectedCommands.includes(zCommand.id);
      
      return hasInitial && hasZ;
    } else {
      // For coincident points case: one should be initial, other should be final
      const initialCommand = subPath.commands[0];
      const finalCommand = subPath.commands[subPath.commands.length - 1];
      
      const hasInitial = selection.selectedCommands.includes(initialCommand.id);
      const hasFinal = selection.selectedCommands.includes(finalCommand.id);
      
      return hasInitial && hasFinal;
    }
  }
  
  // Any other case (0, 3+) is not valid
  return false;
};

/**
 * Check if any of the selected commands is part of a special point
 * @deprecated Use hasExactlyOneSpecialPointSelected for refined control
 */
export const hasSpecialPointInSelection = (): boolean => {
  const store = useEditorStore.getState();
  const selectedCommands = store.selection.selectedCommands;
  
  return selectedCommands.some(commandId => isSpecialPoint(commandId));
};

/**
 * Get the special point info from the current selection (works for single point or point pair)
 */
export const getSpecialPointFromSelection = (): SpecialPointInfo | null => {
  if (!hasExactlyOneSpecialPointSelected()) return null;
  
  const store = useEditorStore.getState();
  const selectedCommands = store.selection.selectedCommands;
  
  // For both single selection and pair selection, use the first command to get the special point info
  // The getSpecialPointInfo function will properly identify the initial/final commands for the subpath
  return getSpecialPointInfo(selectedCommands[0]);
};

/**
 * Select only the initial command of a special point
 */
export const selectInitialPoint = () => {
  const specialInfo = getSpecialPointFromSelection();
  if (!specialInfo) return;
  
  const store = useEditorStore.getState();
  
  // Clear current selection and select only the initial command
  store.clearSelection();
  store.selectCommand(specialInfo.initialCommand.id);
};

/**
 * Select only the final command of a special point
 */
export const selectFinalPoint = () => {
  const specialInfo = getSpecialPointFromSelection();
  if (!specialInfo) return;
  
  const store = useEditorStore.getState();
  
  // Clear current selection and select only the final command
  store.clearSelection();
  store.selectCommand(specialInfo.finalCommand.id);
};

/**
 * Separate special points by moving them apart perpendicular to the path direction
 */
export const separateSpecialPoints = () => {
  const specialInfo = getSpecialPointFromSelection();
  if (!specialInfo) return;
  
  const store = useEditorStore.getState();
  
  const { initialCommand, finalCommand, subPath, position } = specialInfo;
  
  // Calculate path direction using the same logic as VisualDebug.tsx
  let directionAngle = 0;
  
  if (subPath.commands.length >= 2) {
    const secondCommand = subPath.commands[1];
    
    if (secondCommand.command === 'C') {
      // For cubic Bézier curves, use the first control point
      if (secondCommand.x1 !== undefined && secondCommand.y1 !== undefined) {
        const dx = secondCommand.x1 - position.x;
        const dy = secondCommand.y1 - position.y;
        directionAngle = Math.atan2(dy, dx);
      } else {
        // Fallback to end point
        const secondPosition = getAbsoluteCommandPosition(secondCommand, subPath, [subPath]);
        if (secondPosition) {
          const dx = secondPosition.x - position.x;
          const dy = secondPosition.y - position.y;
          directionAngle = Math.atan2(dy, dx);
        }
      }
    } else {
      // For L, M, and other commands
      const secondPosition = getAbsoluteCommandPosition(secondCommand, subPath, [subPath]);
      if (secondPosition) {
        const dx = secondPosition.x - position.x;
        const dy = secondPosition.y - position.y;
        directionAngle = Math.atan2(dy, dx);
      }
    }
  }
  
  // Calculate perpendicular angle for separation
  const perpAngle = directionAngle + Math.PI / 2;
  
  // Separation distance (must be > 35px to avoid sticky field)
  const separationDistance = 50;
  const offsetDistance = separationDistance / 2;
  
  // Calculate offsets for both points
  const initialOffset = {
    x: Math.cos(perpAngle) * offsetDistance,
    y: Math.sin(perpAngle) * offsetDistance
  };
  
  const finalOffset = {
    x: -Math.cos(perpAngle) * offsetDistance,
    y: -Math.sin(perpAngle) * offsetDistance
  };
  
  // Push to history before making changes
  store.pushToHistory();
  
  // Move initial command (green semicircle)
  if (initialCommand.x !== undefined && initialCommand.y !== undefined) {
    store.updateCommand(initialCommand.id, {
      x: Math.round((initialCommand.x + initialOffset.x) * 100) / 100,
      y: Math.round((initialCommand.y + initialOffset.y) * 100) / 100
    });
  }
  
  // Move final command (red semicircle) - handle Z command specially
  if (finalCommand.command === 'Z') {
    // Z commands don't have coordinates, they close to the initial point
    // Since we moved the initial point, the Z will automatically follow
    // No additional action needed
  } else if (finalCommand.x !== undefined && finalCommand.y !== undefined) {
    store.updateCommand(finalCommand.id, {
      x: Math.round((finalCommand.x + finalOffset.x) * 100) / 100,
      y: Math.round((finalCommand.y + finalOffset.y) * 100) / 100
    });
  }
  
  // Clear selection to show the separated points
  store.clearSelection();
};

/**
 * Helper function to find a command in the paths structure
 */
const findCommandInPaths = (commandId: string, paths: any[]): {
  command: SVGCommand;
  subPath: SVGSubPath;
  commandIndex: number;
  pathIndex: number;
  subPathIndex: number;
} | null => {
  for (let pathIndex = 0; pathIndex < paths.length; pathIndex++) {
    const path = paths[pathIndex];
    for (let subPathIndex = 0; subPathIndex < path.subPaths.length; subPathIndex++) {
      const subPath = path.subPaths[subPathIndex];
      for (let commandIndex = 0; commandIndex < subPath.commands.length; commandIndex++) {
        const command = subPath.commands[commandIndex];
        if (command.id === commandId) {
          return {
            command,
            subPath,
            commandIndex,
            pathIndex,
            subPathIndex
          };
        }
      }
    }
  }
  return null;
};