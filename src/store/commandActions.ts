import { StateCreator } from 'zustand';
import { EditorState, SVGCommand, Point } from '../types';
import { generateId } from '../utils/id-utils.js';
import { getCommandBoundingBox } from '../utils/bbox-utils';
import { transformManager } from '../plugins/transform/TransformManager';
import { getCommandPointPosition, getCommandPointsBounds, calculateCommandMoveDelta, isCommandArrangeable, getUniqueCommandPositions } from '../utils/command-point-utils';

export interface CommandActions {
  addCommand: (subPathId: string, command: Omit<SVGCommand, 'id'>) => string;
  insertCommandAfter: (commandId: string, command: Omit<SVGCommand, 'id'>) => string;
  updateCommand: (commandId: string, updates: Partial<SVGCommand>) => void;
  removeCommand: (commandId: string) => void;
  moveCommand: (commandId: string, position: Point) => void;
  replaceSubPathCommands: (subPathId: string, commands: Omit<SVGCommand, 'id'>[]) => void;
  
  // Command point arranging actions
  alignCommandsLeft: (commandIds: string[]) => void;
  alignCommandsCenter: (commandIds: string[]) => void;
  alignCommandsRight: (commandIds: string[]) => void;
  alignCommandsTop: (commandIds: string[]) => void;
  alignCommandsMiddle: (commandIds: string[]) => void;
  alignCommandsBottom: (commandIds: string[]) => void;
  distributeCommandsHorizontally: (commandIds: string[]) => void;
  distributeCommandsVertically: (commandIds: string[]) => void;
}

function roundToPrecision(val: number | undefined, precision: number): number | undefined {
  return typeof val === 'number' ? Number(val.toFixed(precision)) : val;
}

// Calculate bounding box for currently selected commands
function calculateSelectedCommandsBoundingBox(state: EditorState): { x: number; y: number; width: number; height: number } | null {
  if (state.selection.selectedCommands.length === 0) {
    return null;
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let hasValidBounds = false;

  // Find all selected commands and calculate their bounding box
  for (const path of state.paths) {
    for (const subPath of path.subPaths) {
      for (const command of subPath.commands) {
        if (state.selection.selectedCommands.includes(command.id)) {
          const commandBounds = getCommandBoundingBox(command);
          if (commandBounds) {
            minX = Math.min(minX, commandBounds.x);
            maxX = Math.max(maxX, commandBounds.x + commandBounds.width);
            minY = Math.min(minY, commandBounds.y);
            maxY = Math.max(maxY, commandBounds.y + commandBounds.height);
            hasValidBounds = true;
          }
        }
      }
    }
  }

  if (!hasValidBounds || minX === Infinity) {
    return null;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

export const createCommandActions: StateCreator<
  EditorState & CommandActions,
  [],
  [],
  CommandActions
> = (set, get) => ({
  addCommand: (subPathId, command) => {
    const commandId = generateId();
    const precision = get().precision;
    if (command.command === 'M') {
      let pathId = null;
      const state = get();
      for (const path of state.paths) {
        for (const subPath of path.subPaths) {
          if (subPath.id === subPathId) {
            pathId = path.id;
            break;
          }
        }
        if (pathId) break;
      }
      if (pathId) {
        const newSubPathId = generateId();
        set((state) => ({
          paths: state.paths.map((path) => {
            if (path.id === pathId) {
              return {
                ...path,
                subPaths: [
                  ...path.subPaths,
                  {
                    id: newSubPathId,
                    commands: [{ ...command, id: commandId }]
                  }
                ]
              };
            }
            return path;
          })
        }));
        return commandId;
      }
    }
    set((state) => ({
      paths: state.paths.map((path) => ({
        ...path,
        subPaths: path.subPaths.map((subPath) =>
          subPath.id === subPathId
            ? {
              ...subPath,
              commands: [...subPath.commands, {
                ...command,
                id: commandId,
                x: roundToPrecision(command.x, precision),
                y: roundToPrecision(command.y, precision),
                x1: roundToPrecision(command.x1, precision),
                y1: roundToPrecision(command.y1, precision),
                x2: roundToPrecision(command.x2, precision),
                y2: roundToPrecision(command.y2, precision),
              }],
            }
            : subPath
        ),
      })),
    }));
    return commandId;
  },

  insertCommandAfter: (commandId, command) => {
    const newCommandId = generateId();
    const precision = get().precision;
    set((state) => ({
      paths: state.paths.map((path) => ({
        ...path,
        subPaths: path.subPaths.map((subPath) => {
          const commandIndex = subPath.commands.findIndex(cmd => cmd.id === commandId);
          if (commandIndex !== -1) {
            // Insert after the found command
            const newCommands = [...subPath.commands];
            newCommands.splice(commandIndex + 1, 0, {
              ...command,
              id: newCommandId,
              x: roundToPrecision(command.x, precision),
              y: roundToPrecision(command.y, precision),
              x1: roundToPrecision(command.x1, precision),
              y1: roundToPrecision(command.y1, precision),
              x2: roundToPrecision(command.x2, precision),
              y2: roundToPrecision(command.y2, precision),
            });
            return {
              ...subPath,
              commands: newCommands,
            };
          }
          return subPath;
        }),
      })),
    }));
    return newCommandId;
  },

  updateCommand: (commandId, updates) =>
    set((state) => {
      // Find the current command to compare with updates
      let currentCommand = null;
      for (const path of state.paths) {
        for (const subPath of path.subPaths) {
          const cmd = subPath.commands.find(c => c.id === commandId);
          if (cmd) {
            currentCommand = cmd;
            break;
          }
        }
        if (currentCommand) break;
      }
      
      if (!currentCommand) {
        return state;
      }
      
      // Check if updates would actually change anything significant
      let hasRealChange = false;
      const precision = state.precision;
      
      for (const [key, newValue] of Object.entries(updates)) {
        const currentValue = currentCommand[key as keyof typeof currentCommand];
        if (typeof newValue === 'number' && typeof currentValue === 'number') {
          const preciseNew = Number(newValue.toFixed(precision));
          const preciseCurrent = Number(currentValue.toFixed(precision));
          if (Math.abs(preciseNew - preciseCurrent) > 0.001) {
            hasRealChange = true;
            break;
          }
        } else if (newValue !== currentValue) {
          hasRealChange = true;
          break;
        }
      }
      
      if (!hasRealChange) {
        return state;
      }
      
      const newState = {
        ...state,
        paths: state.paths.map((path) => ({
          ...path,
          subPaths: path.subPaths.map((subPath) => ({
            ...subPath,
            commands: subPath.commands.map((cmd) =>
              cmd.id === commandId
                ? {
                  ...cmd,
                  ...Object.fromEntries(
                    Object.entries(updates).map(([k, v]) =>
                      typeof v === 'number'
                        ? [k, Number(v.toFixed(precision))]
                        : [k, v]
                    )
                  ),
                }
                : cmd
            ),
          })),
        })),
      };
      
      // Update selection box only for multiple commands (not for single command)
      // Single command selection shows transform handles instead
      if (newState.selection.selectedCommands.length > 1) {
        const updatedSelectionBox = calculateSelectedCommandsBoundingBox(newState);
        if (updatedSelectionBox) {
          newState.selection = {
            ...newState.selection,
            selectionBox: updatedSelectionBox
          };
        }
      } else {
        // Clear selection box for single command to avoid showing blue debug box
        newState.selection = {
          ...newState.selection,
          selectionBox: undefined
        };
      }
      
      // Increment render version to force re-render of visual feedback for sub-paths
      // This ensures that when a command is edited, any visual feedback for the containing
      // sub-path gets updated to reflect the new shape
      newState.renderVersion = (newState.renderVersion || 0) + 1;
      
      // Notify TransformManager of the changes to update bounds immediately
      setTimeout(() => {
        transformManager.setEditorStore(newState);
        transformManager.updateTransformState();
      }, 0);
      
      return newState;
    }),

  removeCommand: (commandId) =>
    set((state) => ({
      paths: state.paths.map((path) => ({
        ...path,
        subPaths: path.subPaths.map((subPath) => ({
          ...subPath,
          commands: subPath.commands.filter((cmd) => cmd.id !== commandId),
        })),
      })),
      selection: {
        ...state.selection,
        selectedCommands: state.selection.selectedCommands.filter(id => id !== commandId),
      },
    })),

  moveCommand: (commandId, position) =>
    set((state) => {
      const precision = state.precision;
      let movingCommand: SVGCommand | undefined;
      let movingCommandIndex = -1;
      let movingSubPathIndex = -1;
      let movingPathIndex = -1;
      state.paths.forEach((path, pathIndex) => {
        path.subPaths.forEach((subPath, subPathIndex) => {
          subPath.commands.forEach((cmd, cmdIndex) => {
            if (cmd.id === commandId) {
              movingCommand = cmd;
              movingCommandIndex = cmdIndex;
              movingSubPathIndex = subPathIndex;
              movingPathIndex = pathIndex;
            }
          });
        });
      });
      if (!movingCommand || movingCommand.x === undefined || movingCommand.y === undefined) {
        return state;
      }
      const deltaX = position.x - movingCommand.x;
      const deltaY = position.y - movingCommand.y;
      const newState = {
        ...state,
        paths: state.paths.map((path, pathIndex) => ({
          ...path,
          subPaths: path.subPaths.map((subPath, subPathIndex) => ({
            ...subPath,
            commands: subPath.commands.map((cmd, cmdIndex) => {
              if (cmd.id === commandId) {
                if (cmd.command === 'C') {
                  return {
                    ...cmd,
                    x: roundToPrecision(position.x, precision),
                    y: roundToPrecision(position.y, precision),
                    x2: cmd.x2 !== undefined ? roundToPrecision(cmd.x2 + deltaX, precision) : cmd.x2,
                    y2: cmd.y2 !== undefined ? roundToPrecision(cmd.y2 + deltaY, precision) : cmd.y2,
                  };
                } else {
                  return {
                    ...cmd,
                    x: roundToPrecision(position.x, precision),
                    y: roundToPrecision(position.y, precision),
                  };
                }
              }
              if (pathIndex === movingPathIndex &&
                subPathIndex === movingSubPathIndex &&
                cmdIndex === movingCommandIndex + 1 &&
                cmd.command === 'C') {
                return {
                  ...cmd,
                  x1: cmd.x1 !== undefined ? roundToPrecision(cmd.x1 + deltaX, precision) : cmd.x1,
                  y1: cmd.y1 !== undefined ? roundToPrecision(cmd.y1 + deltaY, precision) : cmd.y1,
                };
              }
              return cmd;
            }),
          })),
        })),
      };
      
      // Update selection box only for multiple commands (not for single command)
      // Single command selection shows transform handles instead
      if (newState.selection.selectedCommands.length > 1) {
        const updatedSelectionBox = calculateSelectedCommandsBoundingBox(newState);
        if (updatedSelectionBox) {
          newState.selection = {
            ...newState.selection,
            selectionBox: updatedSelectionBox
          };
        }
      } else {
        // Clear selection box for single command to avoid showing blue debug box
        newState.selection = {
          ...newState.selection,
          selectionBox: undefined
        };
      }
      
      // Increment render version to force re-render of visual feedback for sub-paths
      // This ensures that when a command is moved, any visual feedback for the containing
      // sub-path gets updated to reflect the new shape
      newState.renderVersion = (newState.renderVersion || 0) + 1;
      
      // Notify TransformManager of the changes to update bounds immediately
      setTimeout(() => {
        transformManager.setEditorStore(newState);
        transformManager.updateTransformState();
      }, 0);
      
      return newState;
    }),

  replaceSubPathCommands: (subPathId, newCommands) => {
    set((state) => {
      const precision = state.precision;
      return {
        paths: state.paths.map((path) => ({
          ...path,
          subPaths: path.subPaths.map((subPath) =>
            subPath.id === subPathId
              ? {
                ...subPath,
                commands: newCommands.map((cmd) => ({
                  ...cmd,
                  id: generateId(),
                  x: roundToPrecision(cmd.x, precision),
                  y: roundToPrecision(cmd.y, precision),
                  x1: roundToPrecision(cmd.x1, precision),
                  y1: roundToPrecision(cmd.y1, precision),
                  x2: roundToPrecision(cmd.x2, precision),
                  y2: roundToPrecision(cmd.y2, precision),
                })),
              }
              : subPath
          ),
        })),
        selection: {
          ...state.selection,
          selectedCommands: [],
        },
      };
    });
  },

  // Command point arranging actions
  alignCommandsLeft: (commandIds) => {
    const state = get();
    const commandsWithContext: Array<{ command: SVGCommand; subPathCommands: SVGCommand[] }> = [];
    
    commandIds.forEach(id => {
      for (const path of state.paths) {
        for (const subPath of path.subPaths) {
          const cmd = subPath.commands.find(c => c.id === id);
          if (cmd && isCommandArrangeable(cmd, subPath.commands)) {
            commandsWithContext.push({
              command: cmd,
              subPathCommands: subPath.commands
            });
            return;
          }
        }
      }
    });

    if (commandsWithContext.length < 2) return;

    // Get unique positions to handle coincident points
    const uniquePositions = getUniqueCommandPositions(commandsWithContext);
    if (uniquePositions.length < 2) return;
    
    const leftmostX = Math.min(...uniquePositions.map(pos => pos.position.x));

    commandsWithContext.forEach(({ command }) => {
      get().updateCommand(command.id, { x: leftmostX });
    });
  },

  alignCommandsCenter: (commandIds) => {
    const state = get();
    const commandsWithContext: Array<{ command: SVGCommand; subPathCommands: SVGCommand[] }> = [];
    
    commandIds.forEach(id => {
      for (const path of state.paths) {
        for (const subPath of path.subPaths) {
          const cmd = subPath.commands.find(c => c.id === id);
          if (cmd && isCommandArrangeable(cmd, subPath.commands)) {
            commandsWithContext.push({
              command: cmd,
              subPathCommands: subPath.commands
            });
            return;
          }
        }
      }
    });

    if (commandsWithContext.length < 2) return;

    // Get unique positions to handle coincident points
    const uniquePositions = getUniqueCommandPositions(commandsWithContext);
    if (uniquePositions.length < 2) return;
    
    const allX = uniquePositions.map(pos => pos.position.x);
    const centerX = (Math.min(...allX) + Math.max(...allX)) / 2;

    commandsWithContext.forEach(({ command }) => {
      get().updateCommand(command.id, { x: centerX });
    });
  },

  alignCommandsRight: (commandIds) => {
    const state = get();
    const commandsWithContext: Array<{ command: SVGCommand; subPathCommands: SVGCommand[] }> = [];
    
    commandIds.forEach(id => {
      for (const path of state.paths) {
        for (const subPath of path.subPaths) {
          const cmd = subPath.commands.find(c => c.id === id);
          if (cmd && isCommandArrangeable(cmd, subPath.commands)) {
            commandsWithContext.push({
              command: cmd,
              subPathCommands: subPath.commands
            });
            return;
          }
        }
      }
    });

    if (commandsWithContext.length < 2) return;

    // Get unique positions to handle coincident points
    const uniquePositions = getUniqueCommandPositions(commandsWithContext);
    if (uniquePositions.length < 2) return;
    
    const rightmostX = Math.max(...uniquePositions.map(pos => pos.position.x));

    commandsWithContext.forEach(({ command }) => {
      get().updateCommand(command.id, { x: rightmostX });
    });
  },

  alignCommandsTop: (commandIds) => {
    const state = get();
    const commandsWithContext: Array<{ command: SVGCommand; subPathCommands: SVGCommand[] }> = [];
    
    commandIds.forEach(id => {
      for (const path of state.paths) {
        for (const subPath of path.subPaths) {
          const cmd = subPath.commands.find(c => c.id === id);
          if (cmd && isCommandArrangeable(cmd, subPath.commands)) {
            commandsWithContext.push({
              command: cmd,
              subPathCommands: subPath.commands
            });
            return;
          }
        }
      }
    });

    if (commandsWithContext.length < 2) return;

    // Get unique positions to handle coincident points
    const uniquePositions = getUniqueCommandPositions(commandsWithContext);
    if (uniquePositions.length < 2) return;
    
    const topmostY = Math.min(...uniquePositions.map(pos => pos.position.y));

    commandsWithContext.forEach(({ command }) => {
      get().updateCommand(command.id, { y: topmostY });
    });
  },

  alignCommandsMiddle: (commandIds) => {
    const state = get();
    const commandsWithContext: Array<{ command: SVGCommand; subPathCommands: SVGCommand[] }> = [];
    
    commandIds.forEach(id => {
      for (const path of state.paths) {
        for (const subPath of path.subPaths) {
          const cmd = subPath.commands.find(c => c.id === id);
          if (cmd && isCommandArrangeable(cmd, subPath.commands)) {
            commandsWithContext.push({
              command: cmd,
              subPathCommands: subPath.commands
            });
            return;
          }
        }
      }
    });

    if (commandsWithContext.length < 2) return;

    // Get unique positions to handle coincident points
    const uniquePositions = getUniqueCommandPositions(commandsWithContext);
    if (uniquePositions.length < 2) return;
    
    const allY = uniquePositions.map(pos => pos.position.y);
    const centerY = (Math.min(...allY) + Math.max(...allY)) / 2;

    commandsWithContext.forEach(({ command }) => {
      get().updateCommand(command.id, { y: centerY });
    });
  },

  alignCommandsBottom: (commandIds) => {
    const state = get();
    const commandsWithContext: Array<{ command: SVGCommand; subPathCommands: SVGCommand[] }> = [];
    
    commandIds.forEach(id => {
      for (const path of state.paths) {
        for (const subPath of path.subPaths) {
          const cmd = subPath.commands.find(c => c.id === id);
          if (cmd && isCommandArrangeable(cmd, subPath.commands)) {
            commandsWithContext.push({
              command: cmd,
              subPathCommands: subPath.commands
            });
            return;
          }
        }
      }
    });

    if (commandsWithContext.length < 2) return;

    // Get unique positions to handle coincident points
    const uniquePositions = getUniqueCommandPositions(commandsWithContext);
    if (uniquePositions.length < 2) return;
    
    const bottommostY = Math.max(...uniquePositions.map(pos => pos.position.y));

    commandsWithContext.forEach(({ command }) => {
      get().updateCommand(command.id, { y: bottommostY });
    });
  },

  distributeCommandsHorizontally: (commandIds) => {
    const state = get();
    const commandsWithContext: Array<{ command: SVGCommand; subPathCommands: SVGCommand[] }> = [];
    
    commandIds.forEach(id => {
      for (const path of state.paths) {
        for (const subPath of path.subPaths) {
          const cmd = subPath.commands.find(c => c.id === id);
          if (cmd && isCommandArrangeable(cmd, subPath.commands)) {
            commandsWithContext.push({
              command: cmd,
              subPathCommands: subPath.commands
            });
            return;
          }
        }
      }
    });

    // Get unique positions, treating coincident points as one
    const uniquePositions = getUniqueCommandPositions(commandsWithContext);
    
    if (uniquePositions.length < 3) return;

    // Sort by current X position
    const sortedPositions = [...uniquePositions].sort((a, b) => a.position.x - b.position.x);

    const leftmostX = sortedPositions[0].position.x;
    const rightmostX = sortedPositions[sortedPositions.length - 1].position.x;
    const totalDistance = rightmostX - leftmostX;
    const spacing = totalDistance / (sortedPositions.length - 1);

    sortedPositions.forEach((posGroup, index) => {
      if (index === 0 || index === sortedPositions.length - 1) return; // Skip first and last
      
      const targetX = leftmostX + (spacing * index);
      
      // Move all commands in this position group to the new X position
      posGroup.commands.forEach(cmd => {
        get().updateCommand(cmd.id, { x: targetX });
      });
    });
  },

  distributeCommandsVertically: (commandIds) => {
    const state = get();
    const commandsWithContext: Array<{ command: SVGCommand; subPathCommands: SVGCommand[] }> = [];
    
    commandIds.forEach(id => {
      for (const path of state.paths) {
        for (const subPath of path.subPaths) {
          const cmd = subPath.commands.find(c => c.id === id);
          if (cmd && isCommandArrangeable(cmd, subPath.commands)) {
            commandsWithContext.push({
              command: cmd,
              subPathCommands: subPath.commands
            });
            return;
          }
        }
      }
    });

    // Get unique positions, treating coincident points as one
    const uniquePositions = getUniqueCommandPositions(commandsWithContext);
    
    if (uniquePositions.length < 3) return;

    // Sort by current Y position
    const sortedPositions = [...uniquePositions].sort((a, b) => a.position.y - b.position.y);

    const topmostY = sortedPositions[0].position.y;
    const bottommostY = sortedPositions[sortedPositions.length - 1].position.y;
    const totalDistance = bottommostY - topmostY;
    const spacing = totalDistance / (sortedPositions.length - 1);

    sortedPositions.forEach((posGroup, index) => {
      if (index === 0 || index === sortedPositions.length - 1) return; // Skip first and last
      
      const targetY = topmostY + (spacing * index);
      
      // Move all commands in this position group to the new Y position
      posGroup.commands.forEach(cmd => {
        get().updateCommand(cmd.id, { y: targetY });
      });
    });
  },
});