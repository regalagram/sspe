import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { EditorState, SVGCommand, SVGPath, Point, EditorCommandType, PathStyle, ViewportState, SVGSubPath } from '../types';
import { generateId } from '../utils/id-utils.js';
import { duplicatePath, duplicateSubPath, duplicateCommand } from '../utils/duplicate-utils';
import { saveEditorState, loadEditorState, debounce } from '../utils/persistence';
import { createNewPath } from '../utils/subpath-utils';
import { findSubPathAtPoint, snapToGrid, getAllPathsBounds, getSelectedElementsBounds, getSelectedSubPathsBounds } from '../utils/path-utils';
import { scaleSubPath, rotateSubPath, translateSubPath, getSubPathCenter, mirrorSubPathHorizontal, mirrorSubPathVertical } from '../utils/transform-subpath-utils';
interface EditorActions {
  setShapeSize: (size: number) => void;
  addCommand: (subPathId: string, command: Omit<SVGCommand, 'id'>) => string;
  addPath: (style?: PathStyle, x?: number, y?: number) => string;
  addSubPath: (pathId: string) => string;
  clearSelection: () => void;
  duplicateSelection: () => void;
  exitCreateMode: () => void;
  forceRender: () => void;
  invertAllSubPaths: () => void;
  lockAllSubPaths: () => void;
  lockSelectedSubPaths: () => void;
  mirrorSubPathHorizontal: (subPathId: string, center?: Point) => void;
  mirrorSubPathVertical: (subPathId: string, center?: Point) => void;
  moveCommand: (commandId: string, position: Point) => void;
  moveSubPath: (subPathId: string, delta: Point) => void;
  pan: (delta: Point) => void;
  pushToHistory: () => void;
  redo: () => void;
  removeCommand: (commandId: string) => void;
  removePath: (pathId: string) => void;
  removeSubPath: (subPathId: string) => void;
  replacePaths: (newPaths: SVGPath[]) => void;
  replaceSubPathCommands: (subPathId: string, commands: Omit<SVGCommand, 'id'>[]) => void;
  resetView: () => void;
  resetViewportCompletely: () => void;
  rotateSubPath: (subPathId: string, angle: number, center?: Point) => void;
  scaleSubPath: (subPathId: string, scaleX: number, scaleY: number, center?: Point) => void;
  selectCommand: (commandId: string) => void;
  selectMultiple: (ids: string[], type: 'paths' | 'subpaths' | 'commands') => void;
  selectPath: (pathId: string) => void;
  selectSubPath: (subPathId: string) => void;
  selectSubPathByPoint: (pathId: string, point: Point, isShiftPressed?: boolean) => void;
  selectSubPathMultiple: (subPathId: string, isShiftPressed?: boolean) => void;
  setCreateMode: (commandType: EditorCommandType) => void;
  setGridSize: (size: number) => void;
  setMode: (mode: EditorState['mode']['current']) => void;
  setPan: (pan: Point) => void;
  setPrecision: (precision: number) => void;
  setVisualDebugCommandPointsFactor: (factor: number) => void;
  setVisualDebugControlPointsFactor: (factor: number) => void;
  setVisualDebugGlobalFactor: (factor: number) => void;
  setVisualDebugTransformResizeFactor: (factor: number) => void;
  setVisualDebugTransformRotateFactor: (factor: number) => void;
  setZoom: (zoom: number, center?: Point) => void;
  toggleFeature: (feature: string) => void;
  toggleFullscreen: () => void;
  toggleGrid: () => void;
  toggleGridLabels: () => void;
  toggleSnapToGrid: () => void;
  translateSubPath: (subPathId: string, delta: Point) => void;
  undo: () => void;
  unlockAllSubPaths: () => void;
  updateCommand: (commandId: string, updates: Partial<SVGCommand>) => void;
  updatePathStyle: (pathId: string, style: Partial<PathStyle>) => void;
  updateSubPath: (subPathId: string, updates: Partial<SVGSubPath>) => void;
  zoomIn: (center?: Point) => void;
  zoomOut: (center?: Point) => void;
  zoomToFit: () => void;
  zoomToSelection: () => void;
  zoomToSubPath: () => void;
}
const loadInitialState = (): EditorState => {
  const savedState = loadEditorState();
  
  const baseState: EditorState = {
    paths: <SVGPath[]>[],
    selection: {
      selectedPaths: [],
      selectedSubPaths: [],
      selectedCommands: [],
      selectedControlPoints: [],
    },
    viewport: {
      zoom: 1,
      pan: { x: 0, y: 0 },
      viewBox: { x: 0, y: 0, width: 800, height: 600 },
    },
    grid: {
      enabled: true,
      size: 10,
      color: '#e0e0e0',
      opacity: 0.5,
      snapToGrid: true,
      showLabels: true,
    },
    mode: {
      current: 'select' as const,
    },
    history: {
      past: [],
      present: {} as EditorState,
      future: [],
      canUndo: false,
      canRedo: false,
    },
    isFullscreen: false,
    enabledFeatures: {
      commandPointsEnabled: false, 
      controlPointsEnabled: false, 
      wireframeEnabled: false,
      hidePointsInSelect: false
    },
    renderVersion: 0,
    precision: 2,
    visualDebugSizes: {
      globalFactor: 1.0,
      commandPointsFactor: 1.0,
      controlPointsFactor: 1.0,
      transformResizeFactor: 1.0,
      transformRotateFactor: 1.0,
    },
  };
  if (savedState && typeof savedState === 'object') {

    return {
      ...baseState,
      ...savedState,
      mode: { current: 'select' as const,
    }
    };
  }
  return baseState;
};
const initialState = loadInitialState();

const validateViewport = (viewport: ViewportState) => {
  return {
    ...viewport,
    zoom: isFinite(viewport.zoom) && viewport.zoom > 0 ? viewport.zoom : 1,
    pan: {
      x: isFinite(viewport.pan.x) ? viewport.pan.x : 0,
      y: isFinite(viewport.pan.y) ? viewport.pan.y : 0,
    },
  };
};
function roundToPrecision(val: number | undefined, precision: number): number | undefined {
  return typeof val === 'number' ? Number(val.toFixed(precision)) : val;
}
export const useEditorStore = create<EditorState & EditorActions>()(
  subscribeWithSelector((set, get) => ({
    setShapeSize: (size) => {
      set((state) => ({
        shapeSize: Math.max(10, Math.min(300, size)),
      }));
    },
    ...initialState,
    duplicateSelection: () => {
      set((state) => {
        const { selection, paths } = state;
        let newPaths = [...paths];
        let newSelection = { ...selection };
        const OFFSET = 32;
        function offsetCommand(cmd: SVGCommand, dx: number, dy: number): SVGCommand {
          return {
            ...cmd,
            x: cmd.x !== undefined ? cmd.x + dx : cmd.x,
            y: cmd.y !== undefined ? cmd.y + dy : cmd.y,
            x1: cmd.x1 !== undefined ? cmd.x1 + dx : cmd.x1,
            y1: cmd.y1 !== undefined ? cmd.y1 + dy : cmd.y1,
            x2: cmd.x2 !== undefined ? cmd.x2 + dx : cmd.x2,
            y2: cmd.y2 !== undefined ? cmd.y2 + dy : cmd.y2,
          };
        }
        function offsetSubPath(subPath: SVGSubPath, dx: number, dy: number): SVGSubPath {
          return {
            ...subPath,
            commands: subPath.commands.map(cmd => offsetCommand(cmd, dx, dy)),
          };
        }
        function offsetPath(path: SVGPath, dx: number, dy: number): SVGPath {
          return {
            ...path,
            subPaths: path.subPaths.map(sp => offsetSubPath(sp, dx, dy)),
          };
        }
        let bounds: import('../types').BoundingBox | null = null;
        if (selection.selectedPaths.length > 0) {
          bounds = getAllPathsBounds(paths.filter(p => selection.selectedPaths.includes(p.id)));
        } else if (selection.selectedSubPaths.length > 0) {
          const selectedSubPaths: SVGSubPath[] = [];
          paths.forEach(path => {
            path.subPaths.forEach(subPath => {
              if (selection.selectedSubPaths.includes(subPath.id)) {
                selectedSubPaths.push(subPath);
              }
            });
          });
          if (selectedSubPaths.length > 0) {
            const tempPaths = selectedSubPaths.map(sp => ({ id: '', subPaths: [sp], style: {} }));
            bounds = getAllPathsBounds(tempPaths);
          }
        } else if (selection.selectedCommands.length > 0) {
          bounds = getSelectedElementsBounds(paths, selection.selectedCommands);
        }
        const dx = bounds ? (bounds.width > 0 ? bounds.width + OFFSET : OFFSET) : OFFSET;
        const dy = bounds ? (bounds.height > 0 ? bounds.height + OFFSET : OFFSET) : OFFSET;
        if (selection.selectedPaths.length > 0) {
          const duplicated = selection.selectedPaths.map(pathId => {
            const orig = paths.find(p => p.id === pathId);
            return orig ? offsetPath(duplicatePath(orig), dx, dy) : null;
          }).filter(Boolean) as typeof paths;
          newPaths = [...paths, ...duplicated];
          newSelection = {
            selectedPaths: duplicated.map(p => p.id),
            selectedSubPaths: [],
            selectedCommands: [],
            selectedControlPoints: [],
          };
        } else if (selection.selectedSubPaths.length > 0) {
          let newSubPathIds: string[] = [];
          newPaths = paths.map(path => {
            const toDuplicate = path.subPaths.filter(sp => selection.selectedSubPaths.includes(sp.id));
            if (toDuplicate.length === 0) return path;
            const duplicated = toDuplicate.map(sp => {
              const dup = offsetSubPath(duplicateSubPath(sp), dx, dy);
              newSubPathIds.push(dup.id);
              return dup;
            });
            return {
              ...path,
              subPaths: [...path.subPaths, ...duplicated],
            };
          });
          newSelection = {
            selectedPaths: [],
            selectedSubPaths: newSubPathIds,
            selectedCommands: [],
            selectedControlPoints: [],
          };
        } else if (selection.selectedCommands.length > 0) {
          let newCmdIds: string[] = [];
          newPaths = paths.map(path => ({
            ...path,
            subPaths: path.subPaths.map(subPath => {
              const cmdsToDuplicate = subPath.commands.filter(cmd => selection.selectedCommands.includes(cmd.id));
              if (cmdsToDuplicate.length === 0) return subPath;
              const duplicated = cmdsToDuplicate.map(cmd => {
                const dup = offsetCommand(duplicateCommand(cmd), dx, dy);
                newCmdIds.push(dup.id);
                return dup;
              });
              return {
                ...subPath,
                commands: [...subPath.commands, ...duplicated],
              };
            })
          }));
          newSelection = {
            selectedPaths: [],
            selectedSubPaths: [],
            selectedCommands: newCmdIds,
            selectedControlPoints: [],
          };
        }
        return {
          paths: newPaths,
          selection: newSelection,
        };
      });
    },
    updateSubPath: (subPathId, updates) =>
      set((state) => ({
        paths: state.paths.map((path) => ({
          ...path,
          subPaths: path.subPaths.map((subPath) =>
            subPath.id === subPathId ? { ...subPath, ...updates } : subPath
          ),
        })),
      })),
    selectPath: (pathId) =>
      set((state) => ({
        selection: {
          ...state.selection,
          selectedPaths: [pathId],
          selectedSubPaths: [],
          selectedCommands: [],
        },
      })),
    selectSubPath: (subPathId) =>
      set((state) => {
        const isLocked = state.paths.some(path =>
          path.subPaths.some(subPath => subPath.id === subPathId && subPath.locked)
        );
        if (isLocked) {
          return {
            selection: {
              ...state.selection,
              selectedSubPaths: [],
              selectedPaths: [],
              selectedCommands: [],
            },
          };
        }
        return {
          selection: {
            ...state.selection,
            selectedSubPaths: [subPathId],
            selectedPaths: [],
            selectedCommands: [],
          },
        };
      }),
    selectSubPathMultiple: (subPathId, isShiftPressed = false) =>
      set((state) => {
        const isLocked = state.paths.some(path =>
          path.subPaths.some(subPath => subPath.id === subPathId && subPath.locked)
        );
        if (isLocked) {
          return { selection: { ...state.selection } };
        }
        if (isShiftPressed && state.selection.selectedSubPaths.length > 0) {
          const currentSelection = state.selection.selectedSubPaths;
          if (currentSelection.includes(subPathId)) {
            return {
              selection: {
                ...state.selection,
                selectedSubPaths: currentSelection.filter(id => id !== subPathId),
                selectedPaths: [],
                selectedCommands: [],
              },
            };
          } else {
            return {
              selection: {
                ...state.selection,
                selectedSubPaths: [...currentSelection, subPathId],
                selectedPaths: [],
                selectedCommands: [],
              },
            };
          }
        } else {
          return {
            selection: {
              ...state.selection,
              selectedSubPaths: [subPathId],
              selectedPaths: [],
              selectedCommands: [],
            },
          };
        }
      }),
    selectCommand: (commandId) =>
      set((state) => {
        let isLocked = false;
        for (const path of state.paths) {
          for (const subPath of path.subPaths) {
            if (subPath.commands.some(cmd => cmd.id === commandId)) {
              if (subPath.locked) {
                isLocked = true;
              }
              break;
            }
          }
          if (isLocked) break;
        }
        if (isLocked) {
          return {
            selection: {
              ...state.selection,
              selectedCommands: [],
              selectedPaths: [],
              selectedSubPaths: [],
            },
          };
        }
        return {
          selection: {
            ...state.selection,
            selectedCommands: [commandId],
            selectedPaths: [],
            selectedSubPaths: [],
          },
        };
      }),
    selectMultiple: (ids, type) =>
      set((state) => {
        const newSelection = { ...state.selection };
        if (type === 'paths') {
          newSelection.selectedPaths = ids;
          newSelection.selectedSubPaths = [];
          newSelection.selectedCommands = [];
        } else if (type === 'subpaths') {
          const allowed = ids.filter(id =>
            !state.paths.some(path =>
              path.subPaths.some(subPath => subPath.id === id && subPath.locked)
            )
          );
          newSelection.selectedSubPaths = allowed;
          newSelection.selectedPaths = [];
          newSelection.selectedCommands = [];
        } else if (type === 'commands') {
          const allowed = ids.filter(cmdId => {
            for (const path of state.paths) {
              for (const subPath of path.subPaths) {
                if (subPath.commands.some(cmd => cmd.id === cmdId)) {
                  if (subPath.locked) return false;
                  return true;
                }
              }
            }
            return false;
          });
          newSelection.selectedCommands = allowed;
          newSelection.selectedPaths = [];
          newSelection.selectedSubPaths = [];
        }
        return { selection: newSelection };
      }),
    clearSelection: () =>
      set((state) => ({
        selection: {
          ...state.selection,
          selectedPaths: [],
          selectedSubPaths: [],
          selectedCommands: [],
          selectedControlPoints: [],
        },
      })),
    selectSubPathByPoint: (pathId, point, isShiftPressed = false) => {
      const state = get();
      const path = state.paths.find(p => p.id === pathId);
      if (!path) return;
      const foundSubPath = findSubPathAtPoint(path, point, 15);
      if (foundSubPath) {
        get().selectSubPathMultiple(foundSubPath.id, isShiftPressed);
      }
    },
    addPath: (style = { fill: 'none', stroke: '#000000', strokeWidth: 2 }, x = 100, y = 100) => {
      const newPath = createNewPath(x, y);
      newPath.style = { ...newPath.style, ...style };
      set((state) => ({
        paths: [...state.paths, newPath],
      }));
      return newPath.id;
    },
    removePath: (pathId) =>
      set((state) => ({
        paths: state.paths.filter((path) => path.id !== pathId),
        selection: {
          ...state.selection,
          selectedPaths: state.selection.selectedPaths.filter(id => id !== pathId),
        },
      })),
    addSubPath: (pathId) => {
      const subPathId = generateId();
      set((state) => ({
        paths: state.paths.map((path) =>
          path.id === pathId
            ? {
              ...path,
              subPaths: [
                ...path.subPaths,
                {
                  id: subPathId,
                  commands: [],
                },
              ],
            }
            : path
        ),
      }));
      return subPathId;
    },
    removeSubPath: (subPathId) =>
      set((state) => ({
        paths: state.paths.map((path) => ({
          ...path,
          subPaths: path.subPaths.filter((subPath) => subPath.id !== subPathId),
        })),
        selection: {
          ...state.selection,
          selectedSubPaths: state.selection.selectedSubPaths.filter(id => id !== subPathId),
        },
      })),
    moveSubPath: (subPathId, delta) => {
      set((state) => {
        const isLocked = state.paths.some(path =>
          path.subPaths.some(subPath => subPath.id === subPathId && subPath.locked)
        );
        if (isLocked) {
          return {};
        }
        return {
          paths: state.paths.map((path) => ({
            ...path,
            subPaths: path.subPaths.map((subPath) =>
              subPath.id === subPathId
                ? {
                  ...subPath,
                  commands: subPath.commands.map((cmd) => {
                    let newX = cmd.x !== undefined ? cmd.x + delta.x : cmd.x;
                    let newY = cmd.y !== undefined ? cmd.y + delta.y : cmd.y;
                    let newX1 = cmd.x1 !== undefined ? cmd.x1 + delta.x : cmd.x1;
                    let newY1 = cmd.y1 !== undefined ? cmd.y1 + delta.y : cmd.y1;
                    let newX2 = cmd.x2 !== undefined ? cmd.x2 + delta.x : cmd.x2;
                    let newY2 = cmd.y2 !== undefined ? cmd.y2 + delta.y : cmd.y2;
                    if (state.grid.snapToGrid) {
                      if (newX !== undefined && newY !== undefined) {
                        const snapped = snapToGrid({ x: newX, y: newY }, state.grid.size);
                        newX = snapped.x;
                        newY = snapped.y;
                      }
                      if (newX1 !== undefined && newY1 !== undefined) {
                        const snapped = snapToGrid({ x: newX1, y: newY1 }, state.grid.size);
                        newX1 = snapped.x;
                        newY1 = snapped.y;
                      }
                      if (newX2 !== undefined && newY2 !== undefined) {
                        const snapped = snapToGrid({ x: newX2, y: newY2 }, state.grid.size);
                        newX2 = snapped.x;
                        newY2 = snapped.y;
                      }
                    }
                    return {
                      ...cmd,
                      x: newX,
                      y: newY,
                      x1: newX1,
                      y1: newY1,
                      x2: newX2,
                      y2: newY2,
                    };
                  }),
                }
                : subPath
            ),
          })),
        };
      });
    },
    scaleSubPath: (subPathId, scaleX, scaleY, center) => {
      get().pushToHistory();
      set((state) => {
        let actualCenter = center;
        if (!actualCenter) {
          for (const path of state.paths) {
            const subPath = path.subPaths.find(sp => sp.id === subPathId);
            if (subPath) {
              actualCenter = getSubPathCenter(subPath);
              break;
            }
          }
        }
        if (!actualCenter) return state;
        return {
          paths: state.paths.map((path) => ({
            ...path,
            subPaths: path.subPaths.map((subPath) =>
              subPath.id === subPathId
                ? scaleSubPath(subPath, scaleX, scaleY, actualCenter)
                : subPath
            ),
          })),
          renderVersion: state.renderVersion + 1,
        };
      });
    },
    rotateSubPath: (subPathId, angle, center) => {
      get().pushToHistory();
      set((state) => {
        let actualCenter = center;
        if (!actualCenter) {
          for (const path of state.paths) {
            const subPath = path.subPaths.find(sp => sp.id === subPathId);
            if (subPath) {
              actualCenter = getSubPathCenter(subPath);
              break;
            }
          }
        }
        if (!actualCenter) return state;
        return {
          paths: state.paths.map((path) => ({
            ...path,
            subPaths: path.subPaths.map((subPath) =>
              subPath.id === subPathId
                ? rotateSubPath(subPath, angle, actualCenter)
                : subPath
            ),
          })),
          renderVersion: state.renderVersion + 1,
        };
      });
    },
    translateSubPath: (subPathId, delta) => {
      get().pushToHistory();
      set((state) => ({
        paths: state.paths.map((path) => ({
          ...path,
          subPaths: path.subPaths.map((subPath) =>
            subPath.id === subPathId
              ? translateSubPath(subPath, delta)
              : subPath
          ),
        })),
        renderVersion: state.renderVersion + 1,
      }));
    },
    mirrorSubPathHorizontal: (subPathId, center) => {
      get().pushToHistory();
      set((state) => {
        let actualCenter = center;
        if (!actualCenter) {
          for (const path of state.paths) {
            const subPath = path.subPaths.find(sp => sp.id === subPathId);
            if (subPath) {
              actualCenter = getSubPathCenter(subPath);
              break;
            }
          }
        }
        return {
          paths: state.paths.map((path) => ({
            ...path,
            subPaths: path.subPaths.map((subPath) =>
              subPath.id === subPathId && actualCenter
                ? mirrorSubPathHorizontal(subPath, actualCenter)
                : subPath
            ),
          })),
          renderVersion: state.renderVersion + 1,
        };
      });
    },
    mirrorSubPathVertical: (subPathId, center) => {
      get().pushToHistory();
      set((state) => {
        let actualCenter = center;
        if (!actualCenter) {
          for (const path of state.paths) {
            const subPath = path.subPaths.find(sp => sp.id === subPathId);
            if (subPath) {
              actualCenter = getSubPathCenter(subPath);
              break;
            }
          }
        }
        return {
          paths: state.paths.map((path) => ({
            ...path,
            subPaths: path.subPaths.map((subPath) =>
              subPath.id === subPathId && actualCenter
                ? mirrorSubPathVertical(subPath, actualCenter)
                : subPath
            ),
          })),
          renderVersion: state.renderVersion + 1,
        };
      });
    },
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
    updatePathStyle: (pathId, styleUpdates) =>
      set((state) => ({
        paths: state.paths.map((path) =>
          path.id === pathId
            ? { ...path, style: { ...path.style, ...styleUpdates } }
            : path
        ),
      })),
    replacePaths: (newPaths) =>
      set((state) => {
        const precision = state.precision;
        const round = (val: number | undefined) =>
          typeof val === 'number' ? Number(val.toFixed(precision)) : val;
        return {
          paths: newPaths.map((path) => ({
            ...path,
            subPaths: path.subPaths.map((subPath) => ({
              ...subPath,
              commands: subPath.commands.map((cmd) => ({
                ...cmd,
                x: round(cmd.x),
                y: round(cmd.y),
                x1: round(cmd.x1),
                y1: round(cmd.y1),
                x2: round(cmd.x2),
                y2: round(cmd.y2),
              })),
            })),
          })),
          selection: {
            selectedPaths: [],
            selectedSubPaths: [],
            selectedCommands: [],
            selectedControlPoints: [],
          },
        };
      }),
    setZoom: (zoom, center) =>
      set((state) => {
        if (!isFinite(zoom) || zoom <= 0) {
          console.warn('Invalid zoom value:', zoom);
          return state;
        }
        let newPan = state.viewport.pan;
        if (center && isFinite(center.x) && isFinite(center.y)) {
          const zoomRatio = zoom / state.viewport.zoom;
          if (isFinite(zoomRatio)) {
            newPan = {
              x: center.x - (center.x - state.viewport.pan.x) * zoomRatio,
              y: center.y - (center.y - state.viewport.pan.y) * zoomRatio,
            };
          }
        }
        const newViewport = validateViewport({
          ...state.viewport,
          zoom: Math.max(0.1, Math.min(10, zoom)),
          pan: newPan,
        });
        const newState = {
          viewport: newViewport,
        };
        return newState;
      }),
    zoomIn: (center) => {
      const { viewport } = get();
      get().setZoom(viewport.zoom * 1.2, center);
    },
    zoomOut: (center) => {
      const { viewport } = get();
      get().setZoom(viewport.zoom / 1.2, center);
    },
    zoomToFit: () => {
      const state = get();
      const { paths, viewport } = state;
      const bounds = getAllPathsBounds(paths);
      if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
        set({
          viewport: validateViewport({
            ...viewport,
            zoom: 1,
            pan: { x: 0, y: 0 },
          }),
        });
        return;
      }
      let viewportWidth = 800;
      let viewportHeight = 600;
      const svgElement = document.querySelector('svg');
      if (svgElement) {
        const rect = svgElement.getBoundingClientRect();
        if (rect.width > 100 && rect.height > 100) {
          viewportWidth = rect.width;
          viewportHeight = rect.height;
        }
      }
      if (viewportWidth < 100 || viewportHeight < 100) {
        viewportWidth = window.innerWidth * 0.8;
        viewportHeight = window.innerHeight * 0.8;
      }
      if (!isFinite(viewportWidth) || !isFinite(viewportHeight) || viewportWidth <= 0 || viewportHeight <= 0) {
        console.warn('Invalid viewport dimensions:', viewportWidth, viewportHeight);
        return;
      }
      const contentWidth = Math.max(bounds.width, 1);
      const contentHeight = Math.max(bounds.height, 1);
      const padding = 20;
      const availableWidth = Math.max(viewportWidth - padding * 2, 50);
      const availableHeight = Math.max(viewportHeight - padding * 2, 50);
      const zoomX = availableWidth / contentWidth;
      const zoomY = availableHeight / contentHeight;
      let newZoom = Math.min(zoomX, zoomY);
      if (!isFinite(newZoom) || newZoom <= 0) {
        console.warn('Invalid zoom calculation:', newZoom);
        return;
      }
      newZoom = Math.max(0.1, Math.min(newZoom, 10));
      const contentCenterX = bounds.x + bounds.width / 2;
      const contentCenterY = bounds.y + bounds.height / 2;
      if (!isFinite(contentCenterX) || !isFinite(contentCenterY)) {
        console.warn('Invalid content center:', contentCenterX, contentCenterY);
        return;
      }
      const viewportCenterX = viewportWidth / 2;
      const viewportCenterY = viewportHeight / 2;
      const newPanX = viewportCenterX - contentCenterX * newZoom;
      const newPanY = viewportCenterY - contentCenterY * newZoom;
      if (!isFinite(newPanX) || !isFinite(newPanY)) {
        console.warn('Invalid pan calculation:', newPanX, newPanY);
        return;
      }
      set({
        viewport: validateViewport({
          ...viewport,
          zoom: newZoom,
          pan: { x: newPanX, y: newPanY },
        }),
      });
    },
    zoomToSelection: () => {
      const state = get();
      const { paths, viewport, selection } = state;
      const bounds = getSelectedElementsBounds(paths, selection.selectedCommands);
      if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
        return;
      }
      let viewportWidth = 800;
      let viewportHeight = 600;
      const svgElement = document.querySelector('svg');
      if (svgElement) {
        const rect = svgElement.getBoundingClientRect();
        if (rect.width > 100 && rect.height > 100) {
          viewportWidth = rect.width;
          viewportHeight = rect.height;
        }
      }
      if (viewportWidth < 100 || viewportHeight < 100) {
        viewportWidth = window.innerWidth * 0.8;
        viewportHeight = window.innerHeight * 0.8;
      }
      const selectionWidth = Math.max(bounds.width, 1);
      const selectionHeight = Math.max(bounds.height, 1);
      const padding = 20;
      const availableWidth = Math.max(viewportWidth - padding * 2, 50);
      const availableHeight = Math.max(viewportHeight - padding * 2, 50);
      const zoomX = availableWidth / selectionWidth;
      const zoomY = availableHeight / selectionHeight;
      let newZoom = Math.min(zoomX, zoomY);
      if (!isFinite(newZoom) || newZoom <= 0) {
        console.warn('Invalid zoom calculation in zoomToSelection:', newZoom);
        return;
      }
      newZoom = Math.max(0.1, Math.min(newZoom, 20));
      const selectionCenterX = bounds.x + bounds.width / 2;
      const selectionCenterY = bounds.y + bounds.height / 2;
      if (!isFinite(selectionCenterX) || !isFinite(selectionCenterY)) {
        console.warn('Invalid selection center:', selectionCenterX, selectionCenterY);
        return;
      }
      const viewportCenterX = viewportWidth / 2;
      const viewportCenterY = viewportHeight / 2;
      const newPanX = viewportCenterX - selectionCenterX * newZoom;
      const newPanY = viewportCenterY - selectionCenterY * newZoom;
      if (!isFinite(newPanX) || !isFinite(newPanY)) {
        console.warn('Invalid pan calculation in zoomToSelection:', newPanX, newPanY);
        return;
      }
      set({
        viewport: validateViewport({
          ...viewport,
          zoom: newZoom,
          pan: { x: newPanX, y: newPanY },
        }),
      });
    },
    zoomToSubPath: () => {
      const state = get();
      const { paths, viewport, selection } = state;
      const bounds = getSelectedSubPathsBounds(paths, selection.selectedSubPaths);
      if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
        return;
      }
      let viewportWidth = 800;
      let viewportHeight = 600;
      const svgElement = document.querySelector('svg');
      if (svgElement) {
        const rect = svgElement.getBoundingClientRect();
        if (rect.width > 100 && rect.height > 100) {
          viewportWidth = rect.width;
          viewportHeight = rect.height;
        }
      }
      if (viewportWidth < 100 || viewportHeight < 100) {
        viewportWidth = window.innerWidth * 0.8;
        viewportHeight = window.innerHeight * 0.8;
      }
      const subPathWidth = Math.max(bounds.width, 1);
      const subPathHeight = Math.max(bounds.height, 1);
      const padding = 40;
      const availableWidth = Math.max(viewportWidth - padding * 2, 50);
      const availableHeight = Math.max(viewportHeight - padding * 2, 50);
      const zoomX = availableWidth / subPathWidth;
      const zoomY = availableHeight / subPathHeight;
      let newZoom = Math.min(zoomX, zoomY);
      if (!isFinite(newZoom) || newZoom <= 0) {
        console.warn('Invalid zoom calculation in zoomToSubPath:', newZoom);
        return;
      }
      newZoom = Math.max(0.1, Math.min(newZoom, 20));
      const subPathCenterX = bounds.x + bounds.width / 2;
      const subPathCenterY = bounds.y + bounds.height / 2;
      if (!isFinite(subPathCenterX) || !isFinite(subPathCenterY)) {
        console.warn('Invalid subpath center:', subPathCenterX, subPathCenterY);
        return;
      }
      const viewportCenterX = viewportWidth / 2;
      const viewportCenterY = viewportHeight / 2;
      const newPanX = viewportCenterX - subPathCenterX * newZoom;
      const newPanY = viewportCenterY - subPathCenterY * newZoom;
      if (!isFinite(newPanX) || !isFinite(newPanY)) {
        console.warn('Invalid pan calculation in zoomToSubPath:', newPanX, newPanY);
        return;
      }
      set({
        viewport: validateViewport({
          ...viewport,
          zoom: newZoom,
          pan: { x: newPanX, y: newPanY },
        }),
      });
    },
    pan: (delta) =>
      set((state) => {
        const safeDelta = {
          x: isFinite(delta.x) ? delta.x : 0,
          y: isFinite(delta.y) ? delta.y : 0,
        };
        return {
          viewport: validateViewport({
            ...state.viewport,
            pan: {
              x: state.viewport.pan.x + safeDelta.x,
              y: state.viewport.pan.y + safeDelta.y,
            },
          }),
        };
      }),
    setPan: (pan) =>
      set((state) => ({
        viewport: validateViewport({
          ...state.viewport,
          pan: {
            x: isFinite(pan.x) ? pan.x : 0,
            y: isFinite(pan.y) ? pan.y : 0,
          },
        }),
      })),
    resetView: () =>
      set((state) => {
        const newState = {
          viewport: validateViewport({
            ...state.viewport,
            zoom: 1,
            pan: { x: 0, y: 0 },
          }),
        };
        
        return newState;
      }),
    resetViewportCompletely: () =>
      set((state) => {
        const newState = {
          viewport: validateViewport({
            zoom: 1,
            pan: { x: 0, y: 0 },
            viewBox: { x: 0, y: 0, width: 800, height: 600 },
          }),
        };
        
        return newState;
      }),
    setMode: (mode) =>
      set((state) => ({
        mode: {
          ...state.mode,
          current: mode,
          createMode: mode === 'create' ? state.mode.createMode : undefined,
        },
      })),
    setCreateMode: (commandType) => {
      set((state) => ({
        mode: {
          current: 'create',
          createMode: {
            commandType,
            isDrawing: false,
          },
        },
      }));
    },
    exitCreateMode: () =>
      set(() => ({
        mode: {
          current: 'select',
        },
      })),
    toggleGrid: () =>
      set((state) => {
        const newState = {
          grid: {
            ...state.grid,
            enabled: !state.grid.enabled,
          },
        };
        
        return newState;
      }),
    setGridSize: (size) =>
      set((state) => {
        const newState = {
          grid: {
            ...state.grid,
            size,
          },
        };
        
        return newState;
      }),
    toggleSnapToGrid: () =>
      set((state) => {
        const newState = {
          grid: {
            ...state.grid,
            snapToGrid: !state.grid.snapToGrid,
          },
        };
        
        return newState;
      }),
    toggleGridLabels: () =>
      set((state) => {
        const newState = {
          grid: {
            ...state.grid,
            showLabels: !state.grid.showLabels,
          },
        };
        
        return newState;
      }),
    undo: () =>
      set((state) => {
        if (state.history.past.length === 0) return state;
        const previous = state.history.past[state.history.past.length - 1];
        const newPast = state.history.past.slice(0, state.history.past.length - 1);
        return {
          ...previous,
          history: {
            past: newPast,
            present: state,
            future: [state, ...state.history.future],
            canUndo: newPast.length > 0,
            canRedo: true,
          },
        };
      }),
    redo: () =>
      set((state) => {
        if (state.history.future.length === 0) return state;
        const next = state.history.future[0];
        const newFuture = state.history.future.slice(1);
        return {
          ...next,
          history: {
            past: [...state.history.past, state],
            present: next,
            future: newFuture,
            canUndo: true,
            canRedo: newFuture.length > 0,
          },
        };
      }),
    pushToHistory: () =>
      set((state) => ({
        history: {
          past: [...state.history.past, state].slice(-50),
          present: state,
          future: [],
          canUndo: true,
          canRedo: false,
        },
      })),
    toggleFeature: (feature) =>
      set((state) => {
        if (!(feature in state.enabledFeatures)) {
          return {};
        }
        return {
          enabledFeatures: {
            ...state.enabledFeatures,
            [feature]: !state.enabledFeatures[feature as keyof typeof state.enabledFeatures]
          }
        };
      }),
    toggleFullscreen: () =>
      set((state) => ({
        isFullscreen: !state.isFullscreen,
      })),
    forceRender: () =>
      set((state) => ({
        renderVersion: state.renderVersion + 1,
      })),
    setPrecision: (precision: number) => {
      get().pushToHistory();
      set((state) => {
        const round = (val: number | undefined) =>
          typeof val === 'number' ? Number(val.toFixed(precision)) : val;
        const newPaths = state.paths.map((path) => ({
          ...path,
          subPaths: path.subPaths.map((subPath) => ({
            ...subPath,
            commands: subPath.commands.map((cmd) => ({
              ...cmd,
              x: round(cmd.x),
              y: round(cmd.y),
              x1: round(cmd.x1),
              y1: round(cmd.y1),
              x2: round(cmd.x2),
              y2: round(cmd.y2),
            })),
          })),
        }));
        const newState = {
          precision,
          paths: newPaths,
          renderVersion: state.renderVersion + 1,
        };
        
        return newState;
      });
    },
    setVisualDebugGlobalFactor: (factor: number) => {
      set((state) => {
        const newState = {
          visualDebugSizes: {
            ...state.visualDebugSizes,
            globalFactor: Math.max(0.1, Math.min(5.0, factor)),
          },
          renderVersion: state.renderVersion + 1,
        };
        
        return newState;
      });
    },
    setVisualDebugCommandPointsFactor: (factor: number) => {
      set((state) => {
        const newState = {
          visualDebugSizes: {
            ...state.visualDebugSizes,
            commandPointsFactor: Math.max(0.1, Math.min(5.0, factor)),
          },
          renderVersion: state.renderVersion + 1,
        };
        
        return newState;
      });
    },
    setVisualDebugControlPointsFactor: (factor: number) => {
      set((state) => {
        const newState = {
          visualDebugSizes: {
            ...state.visualDebugSizes,
            controlPointsFactor: Math.max(0.1, Math.min(5.0, factor)),
          },
          renderVersion: state.renderVersion + 1,
        };
        
        return newState;
      });
    },
    setVisualDebugTransformResizeFactor: (factor: number) => {
      set((state) => {
        const newState = {
          visualDebugSizes: {
            ...state.visualDebugSizes,
            transformResizeFactor: Math.max(0.1, Math.min(5.0, factor)),
          },
          renderVersion: state.renderVersion + 1,
        };
        
        return newState;
      });
    },
    setVisualDebugTransformRotateFactor: (factor: number) => {
      set((state) => {
        const newState = {
          visualDebugSizes: {
            ...state.visualDebugSizes,
            transformRotateFactor: Math.max(0.1, Math.min(5.0, factor)),
          },
          renderVersion: state.renderVersion + 1,
        };
        
        return newState;
      });
    },
    lockSelectedSubPaths: () => {
      set((state) => {
        const selectedIds = state.selection.selectedSubPaths;
        if (!selectedIds || selectedIds.length === 0) return {};
        const newPaths = state.paths.map(path => ({
          ...path,
          subPaths: path.subPaths.map(subPath =>
            selectedIds.includes(subPath.id)
              ? { ...subPath, locked: true }
              : subPath
          )
        }));
        return { paths: newPaths };
      });
    },
    lockAllSubPaths: () => {
      set((state) => {
        const newPaths = state.paths.map(path => ({
          ...path,
          subPaths: path.subPaths.map(subPath => ({ ...subPath, locked: true }))
        }));
        return { paths: newPaths };
      });
    },
    unlockAllSubPaths: () => {
      set((state) => {
        const newPaths = state.paths.map(path => ({
          ...path,
          subPaths: path.subPaths.map(subPath => ({ ...subPath, locked: false }))
        }));
        return { paths: newPaths };
      });
    },
    invertAllSubPaths: () => {
      set((state) => {
        const newPaths = state.paths.map(path => ({
          ...path,
          subPaths: path.subPaths.map(subPath => ({ ...subPath, locked: !subPath.locked }))
        }));
        return { paths: newPaths };
      });
    },
  }))
);
const debouncedSave = debounce('editor-autosave', (state: EditorState) => {
  const { history, ...rest } = state;
  saveEditorState({ ...rest });
}, 500);
if (typeof window !== 'undefined') {
  setTimeout(() => {
    useEditorStore.subscribe(
      state => state,
      debouncedSave
    );
  }, 0);
}
