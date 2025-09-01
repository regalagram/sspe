import { StateCreator } from 'zustand';
import { EditorState, SVGPath, PathStyle, Point, SVGSubPath, SVGCommand } from '../types';
import { generateId } from '../utils/id-utils.js';
import { duplicatePath, duplicateSubPath, duplicateCommand } from '../utils/duplicate-utils';
import { createNewPath } from '../utils/subpath-utils';
import { snapToGrid } from '../utils/path-utils';
import { calculateSmartDuplicationOffset } from '../utils/duplication-positioning';

export interface PathActions {
  addPath: (style?: PathStyle, x?: number, y?: number) => string;
  removePath: (pathId: string) => void;
  addSubPath: (pathId: string) => string;
  removeSubPath: (subPathId: string) => void;
  moveSubPath: (subPathId: string, delta: Point, skipGroupSync?: boolean, skipGridSnapping?: boolean) => void;
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
  EditorState & PathActions & { moveGroup: (groupId: string, delta: Point) => void; shouldMoveSyncGroup: (elementId: string, elementType: 'path' | 'text' | 'group') => any; moveSyncGroupByElement: (elementId: string, elementType: 'path' | 'text' | 'group', delta: Point) => boolean; },
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
    set((state) => {
      // Remove all textPaths that reference this path
      const textPathsToRemove = state.textPaths.filter(tp => tp.pathRef === pathId);
      const textPathIdsToRemove = textPathsToRemove.map(tp => tp.id);
      
      return {
        paths: state.paths.filter((path) => path.id !== pathId),
        textPaths: state.textPaths.filter(tp => tp.pathRef !== pathId),
        selection: {
          ...state.selection,
          selectedPaths: state.selection.selectedPaths.filter(id => id !== pathId),
          selectedTextPaths: state.selection.selectedTextPaths.filter(id => !textPathIdsToRemove.includes(id)),
        },
      };
    }),

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
    set((state) => {
      // Find which path contains this subpath and check if it will have remaining subpaths
      const parentPath = state.paths.find(path => 
        path.subPaths.some(subPath => subPath.id === subPathId)
      );
      
      let textPathsToRemove: string[] = [];
      
      if (parentPath) {
        // Check if removing this subpath will leave the path with no subpaths
        const remainingSubPaths = parentPath.subPaths.filter(subPath => subPath.id !== subPathId);
        
        if (remainingSubPaths.length === 0) {
          // This is the last subpath, so we need to remove associated textPaths
          const textPathsForThisPath = state.textPaths.filter(tp => tp.pathRef === parentPath.id);
          textPathsToRemove = textPathsForThisPath.map(tp => tp.id);
        }
        // If remainingSubPaths.length > 0, we DON'T remove textPaths because they can move to other subpaths
      }
      
      return {
        paths: state.paths.map((path) => ({
          ...path,
          subPaths: path.subPaths.filter((subPath) => subPath.id !== subPathId),
        })),
        textPaths: textPathsToRemove.length > 0 
          ? state.textPaths.filter(tp => !textPathsToRemove.includes(tp.id))
          : state.textPaths,
        selection: {
          ...state.selection,
          selectedSubPaths: state.selection.selectedSubPaths.filter(id => id !== subPathId),
          selectedTextPaths: textPathsToRemove.length > 0
            ? state.selection.selectedTextPaths.filter(id => !textPathsToRemove.includes(id))
            : state.selection.selectedTextPaths,
        },
      };
    }),

  moveSubPath: (subPathId, delta, skipGroupSync = false, skipGridSnapping = false) => {
    // Skip update if delta is too small to prevent unnecessary re-renders
    if (Math.abs(delta.x) < 0.001 && Math.abs(delta.y) < 0.001) {
      return;
    }
    
    set((state) => {
      const isLocked = state.paths.some(path =>
        path.subPaths.some(subPath => subPath.id === subPathId && subPath.locked)
      );
      if (isLocked) {
        return state;
      }
      
      // Find the parent path of this subpath
      const parentPath = state.paths.find(path =>
        path.subPaths.some(subPath => subPath.id === subPathId)
      );
      
      // Check if the parent path is in a movement-sync group (only if not skipping)
      if (!skipGroupSync && parentPath && typeof state.moveSyncGroupByElement === 'function') {
        const syncGroup = state.shouldMoveSyncGroup(parentPath.id, 'path');
        if (syncGroup) {
          // Check if multiple subpaths of the same group are being moved
          // Get all subpaths from paths that belong to this group
          const groupPathIds = syncGroup.children.filter((child: any) => child.type === 'path').map((child: any) => child.id);
          const groupSubPathIds: string[] = [];
          
          groupPathIds.forEach((pathId: string) => {
            const path = state.paths.find(p => p.id === pathId);
            if (path) {
              path.subPaths.forEach(sp => groupSubPathIds.push(sp.id));
            }
          });
          
          const selectedGroupSubPaths = state.selection.selectedSubPaths.filter(id => groupSubPathIds.includes(id));
          
          if (selectedGroupSubPaths.length > 1) {
            // Multiple subpaths of the same group are selected
            // Only move the group if this is the first subpath being processed
            const isFirstSubPath = selectedGroupSubPaths[0] === subPathId;
            if (isFirstSubPath) {
              state.moveGroup(syncGroup.id, delta);
            }
            return state; // Don't move individual subpath, return unchanged state
          } else {
            // Single subpath, move the whole group
            const wasMoved = state.moveSyncGroupByElement(parentPath.id, 'path', delta);
            if (wasMoved) {
              return state; // Group was moved instead, return unchanged state
            }
          }
        }
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
                  if (state.grid.snapToGrid && !skipGridSnapping) {
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
    set((state) => {
      // Auto-register gradients/patterns when they're applied to path styles
      const newGradients = [...state.gradients];
      
      Object.values(styleUpdates).forEach(value => {
        if (typeof value === 'object' && value?.id && value?.type) {
          // Check if this gradient/pattern is already in the store
          const exists = newGradients.some(g => g.id === value.id);
          if (!exists) {
            newGradients.push(value);
          }
        } else if (typeof value === 'string' && value.startsWith('url(#')) {
          // Handle url(#id) format - extract ID and look for predefined gradients
          const match = value.match(/url\(#([^)]+)\)/);
          if (match) {
            const gradientId = match[1];
            const exists = newGradients.some(g => g.id === gradientId);
            
            if (!exists) {
              // Look for predefined gradients that match this ID
              const predefinedGradients = [
                {
                  id: 'text-gradient-1',
                  type: 'linear' as const,
                  x1: 0, y1: 0, x2: 100, y2: 0,
                  stops: [
                    { id: 'stop-1', offset: 0, color: '#ff6b6b', opacity: 1 },
                    { id: 'stop-2', offset: 100, color: '#4ecdc4', opacity: 1 }
                  ]
                },
                {
                  id: 'text-gradient-2',
                  type: 'linear' as const,
                  x1: 0, y1: 0, x2: 100, y2: 100,
                  stops: [
                    { id: 'stop-3', offset: 0, color: '#667eea', opacity: 1 },
                    { id: 'stop-4', offset: 100, color: '#764ba2', opacity: 1 }
                  ]
                },
                {
                  id: 'text-gradient-3',
                  type: 'radial' as const,
                  cx: 50, cy: 50, r: 50,
                  stops: [
                    { id: 'stop-5', offset: 0, color: '#ffeaa7', opacity: 1 },
                    { id: 'stop-6', offset: 100, color: '#fab1a0', opacity: 1 }
                  ]
                }
              ];
              
              const predefinedGradient = predefinedGradients.find(g => g.id === gradientId);
              if (predefinedGradient) {
                newGradients.push(predefinedGradient);
              }
            }
          }
        }
      });

      return {
        paths: state.paths.map((path) =>
          path.id === pathId
            ? { ...path, style: { ...path.style, ...styleUpdates } }
            : path
        ),
        gradients: newGradients,
      };
    }),

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
          selectedTexts: [],
          selectedTextSpans: [],
          selectedTextPaths: [],
          selectedGroups: [],
          selectedImages: [],
          selectedClipPaths: [],
          selectedMasks: [],
          selectedFilters: [],
          selectedFilterPrimitives: [],
          selectedMarkers: [],
          selectedSymbols: [],
          selectedUses: [],
          selectedAnimations: [],
          selectedGradients: [],
          selectedGradientStops: [],
        },
      };
    }),

  duplicateSelection: () => {
    set((state) => {
      const { selection, paths } = state;
      let newPaths = [...paths];
      let newSelection = { ...selection };
      
      // Use the new smart duplication offset calculation
      const offset = calculateSmartDuplicationOffset(selection);
      const dx = offset.x;
      const dy = offset.y;
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
          selectedTexts: [],
          selectedTextSpans: [],
          selectedTextPaths: [],
          selectedGroups: [],
          selectedImages: [],
          selectedClipPaths: [],
          selectedMasks: [],
          selectedFilters: [],
          selectedFilterPrimitives: [],
          selectedMarkers: [],
          selectedSymbols: [],
          selectedUses: [],
          selectedAnimations: [],
          selectedGradients: [],
          selectedGradientStops: [],
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
          selectedTexts: [],
          selectedTextSpans: [],
          selectedTextPaths: [],
          selectedGroups: [],
          selectedImages: [],
          selectedClipPaths: [],
          selectedMasks: [],
          selectedFilters: [],
          selectedFilterPrimitives: [],
          selectedMarkers: [],
          selectedSymbols: [],
          selectedUses: [],
          selectedAnimations: [],
          selectedGradients: [],
          selectedGradientStops: [],
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
          selectedTexts: [],
          selectedTextSpans: [],
          selectedTextPaths: [],
          selectedGroups: [],
          selectedImages: [],
          selectedClipPaths: [],
          selectedMasks: [],
          selectedFilters: [],
          selectedFilterPrimitives: [],
          selectedMarkers: [],
          selectedSymbols: [],
          selectedUses: [],
          selectedAnimations: [],
          selectedGradients: [],
          selectedGradientStops: [],
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