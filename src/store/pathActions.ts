import { StateCreator } from 'zustand';
import { EditorState, SVGPath, PathStyle, Point, SVGSubPath, SVGCommand } from '../types';
import { generateId } from '../utils/id-utils.js';
import { duplicatePath, duplicateSubPath, duplicateCommand } from '../utils/duplicate-utils';
import { createNewPath } from '../utils/subpath-utils';
import { getAllPathsBounds, snapToGrid, getSelectedElementsBounds } from '../utils/path-utils';

export interface PathActions {
  addPath: (style?: PathStyle, x?: number, y?: number) => string;
  removePath: (pathId: string) => void;
  addSubPath: (pathId: string) => string;
  removeSubPath: (subPathId: string) => void;
  moveSubPath: (subPathId: string, delta: Point) => void;
  updateSubPath: (subPathId: string, updates: Partial<SVGSubPath>) => void;
  updatePathStyle: (pathId: string, style: Partial<PathStyle>) => void;
  replacePaths: (newPaths: SVGPath[]) => void;
  duplicateSelection: () => void;
  lockSelectedSubPaths: () => void;
  lockAllSubPaths: () => void;
  unlockAllSubPaths: () => void;
  invertAllSubPaths: () => void;
}

export const createPathActions: StateCreator<
  EditorState & PathActions,
  [],
  [],
  PathActions
> = (set, get) => ({
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

  updateSubPath: (subPathId, updates) =>
    set((state) => ({
      paths: state.paths.map((path) => ({
        ...path,
        subPaths: path.subPaths.map((subPath) =>
          subPath.id === subPathId ? { ...subPath, ...updates } : subPath
        ),
      })),
    })),

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
});