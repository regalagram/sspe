import { StateCreator } from 'zustand';
import { EditorState, SVGCommand, Point } from '../types';
import { generateId } from '../utils/id-utils.js';

export interface CommandActions {
  addCommand: (subPathId: string, command: Omit<SVGCommand, 'id'>) => string;
  insertCommandAfter: (commandId: string, command: Omit<SVGCommand, 'id'>) => string;
  updateCommand: (commandId: string, updates: Partial<SVGCommand>) => void;
  removeCommand: (commandId: string) => void;
  moveCommand: (commandId: string, position: Point) => void;
  replaceSubPathCommands: (subPathId: string, commands: Omit<SVGCommand, 'id'>[]) => void;
}

function roundToPrecision(val: number | undefined, precision: number): number | undefined {
  return typeof val === 'number' ? Number(val.toFixed(precision)) : val;
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
      const precision = state.precision;
      return {
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
      return {
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
});