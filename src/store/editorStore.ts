import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { EditorState, SVGCommand, SVGPath, Point, EditorCommandType, PathStyle } from '../types';
import { generateId } from '../utils/id-utils.js';
import { loadPreferences, savePreferences, UserPreferences } from '../utils/persistence';
import { createNewPath } from '../utils/subpath-utils';
import { parseSVGToSubPaths } from '../utils/svg-parser';
import { findSubPathAtPoint, snapToGrid, getAllPathsBounds, getSelectedElementsBounds, getSelectedSubPathsBounds } from '../utils/path-utils';
import { scaleSubPath, rotateSubPath, translateSubPath, getSubPathCenter, mirrorSubPathHorizontal, mirrorSubPathVertical } from '../utils/transform-subpath-utils';

interface EditorActions {
  // Selection actions
  selectPath: (pathId: string) => void;
  selectSubPath: (subPathId: string) => void;
  selectSubPathMultiple: (subPathId: string, isShiftPressed?: boolean) => void;
  selectCommand: (commandId: string) => void;
  selectMultiple: (ids: string[], type: 'paths' | 'subpaths' | 'commands') => void;
  clearSelection: () => void;
  selectSubPathByPoint: (pathId: string, point: Point, isShiftPressed?: boolean) => void;
  moveSubPath: (subPathId: string, delta: Point) => void;
  
  // Transform actions
  scaleSubPath: (subPathId: string, scaleX: number, scaleY: number, center?: Point) => void;
  rotateSubPath: (subPathId: string, angle: number, center?: Point) => void;
  translateSubPath: (subPathId: string, delta: Point) => void;
  mirrorSubPathHorizontal: (subPathId: string, center?: Point) => void;
  mirrorSubPathVertical: (subPathId: string, center?: Point) => void;
  
  // Path manipulation actions
  addPath: (style?: PathStyle, x?: number, y?: number) => string;
  removePath: (pathId: string) => void;
  addSubPath: (pathId: string) => string;
  removeSubPath: (subPathId: string) => void;
  addCommand: (subPathId: string, command: Omit<SVGCommand, 'id'>) => string;
  updateCommand: (commandId: string, updates: Partial<SVGCommand>) => void;
  removeCommand: (commandId: string) => void;
  moveCommand: (commandId: string, position: Point) => void;
  replaceSubPathCommands: (subPathId: string, commands: Omit<SVGCommand, 'id'>[]) => void;
  updatePathStyle: (pathId: string, style: Partial<PathStyle>) => void;
  replacePaths: (newPaths: SVGPath[]) => void;
  
  // Viewport actions
  setZoom: (zoom: number, center?: Point) => void;
  zoomIn: (center?: Point) => void;
  zoomOut: (center?: Point) => void;
  zoomToFit: () => void;
  zoomToSelection: () => void;
  zoomToSubPath: () => void;
  pan: (delta: Point) => void;
  setPan: (pan: Point) => void;
  resetView: () => void;
  resetViewportCompletely: () => void;
  
  // Mode actions
  setMode: (mode: EditorState['mode']['current']) => void;
  setCreateMode: (commandType: EditorCommandType) => void;
  exitCreateMode: () => void;
  
  // Grid actions
  toggleGrid: () => void;
  setGridSize: (size: number) => void;
  toggleSnapToGrid: () => void;
  toggleGridLabels: () => void;
  
  // History actions
  undo: () => void;
  redo: () => void;
  pushToHistory: () => void;
  
  // Feature toggles
  toggleFeature: (feature: string) => void;
  enableFeature: (feature: string) => void;
  disableFeature: (feature: string) => void;
  
  // Fullscreen
  toggleFullscreen: () => void;
  
  // Render control
  forceRender: () => void;

  // Precision control
  setPrecision: (precision: number) => void;

  // Visual Debug size controls
  setVisualDebugGlobalFactor: (factor: number) => void;
  setVisualDebugCommandPointsFactor: (factor: number) => void;
  setVisualDebugControlPointsFactor: (factor: number) => void;
  setVisualDebugTransformResizeFactor: (factor: number) => void;
  setVisualDebugTransformRotateFactor: (factor: number) => void;
}

// Load preferences from localStorage
const preferences = loadPreferences();
const storedPrecision = (() => {
  try {
    const val = localStorage.getItem('sspe-precision');
    return val ? Math.max(0, Math.min(8, parseInt(JSON.parse(val), 10))) : 2;
  } catch {
    return 2;
  }
})();

const createInitialState = (): EditorState => {
  // Hardcoded SVG to load as initial state
  const hardcodedSVG = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="-19.77 0.23 874.96 539.69">
      <path d="M 155 295 C 165 285 245 285 255 295 C 265 305 265 385 255 395 C 245 405 145 435 135 425 C 125 415 145 305 155 295 M 20 190 L 100 190 L 100 270 L 20 270 L 20 190 M 40 200 L 40 240 L 70 260 L 90 210 L 40 200 M 355 255 L 355 335 L 435 335 C 485 315 485 270 435 255 C 410 245 380 245 355 255 M 90 40 C 90 130 120 130 140 130 C 160 130 170 60 190 60 C 170 106.667 186.667 130 240 130 C 293.333 130 310 100 290 40 Z" fill="#0078cc" stroke="#0000ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill-opacity="0.3" />
      <path d="M 435 160 C 305 80 415 30 435 90 C 445 30 545 60 435 160 Z M 360 405 L 405 495 L 450 405 L 495 495 C 520 385 560 425 540 405 C 565 475 605 515 585 495 C 610 385 650 425 630 405 L 675 495 C 700 385 740 425 720 405 L 765 495 C 790 385 830 425 810 405" fill="#ff6464" stroke="#c83232" stroke-width="2" stroke-opacity="0.9" />
    </svg>
  `;

  let initialPaths: SVGPath[] = [];
  
  try {
    // Parse the hardcoded SVG into the app's format
    initialPaths = parseSVGToSubPaths(hardcodedSVG);
  } catch (error) {
    console.warn('Failed to parse hardcoded SVG, falling back to empty paths:', error);
    initialPaths = [];
  }

  return {
    paths: initialPaths,
    selection: {
      selectedPaths: [],
      selectedSubPaths: [],
      selectedCommands: [],
      selectedControlPoints: [],
    },
    viewport: {
      zoom: preferences.zoom,
      pan: { x: 0, y: 0 },
      viewBox: { x: 0, y: 0, width: 800, height: 600 },
    },
    grid: {
      enabled: preferences.gridEnabled,
      size: preferences.gridSize,
      color: '#e0e0e0',
      opacity: 0.5,
      snapToGrid: preferences.snapToGrid,
      showLabels: preferences.showLabels,
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
    enabledFeatures: new Set([
      'zoom', 
      'pan', 
      'select', 
      'grid',
      ...(preferences.showCommandPoints ? ['command-points'] : []),
      ...(preferences.showControlPoints ? ['control-points'] : []),
      ...(preferences.wireframeMode ? ['wireframe'] : [])
    ]),
    renderVersion: 0,
    precision: storedPrecision, // Precisión inicial
    visualDebugSizes: {
      globalFactor: 1.0,
      commandPointsFactor: 1.0,
      controlPointsFactor: 1.0,
      transformResizeFactor: 1.0,
      transformRotateFactor: 1.0,
    },
  };
};

const initialState = createInitialState();

// Helper function to save current preferences
const saveCurrentPreferences = (state: EditorState) => {
  const preferences: UserPreferences = {
    zoom: state.viewport.zoom,
    gridEnabled: state.grid.enabled,
    gridSize: state.grid.size,
    snapToGrid: state.grid.snapToGrid,
    showLabels: state.grid.showLabels,
    showControlPoints: state.enabledFeatures.has('control-points'),
    showCommandPoints: state.enabledFeatures.has('command-points'),
    wireframeMode: state.enabledFeatures.has('wireframe'),
  };
  savePreferences(preferences);
};

// Helper function to ensure valid viewport values
const validateViewport = (viewport: any) => {
  return {
    ...viewport,
    zoom: isFinite(viewport.zoom) && viewport.zoom > 0 ? viewport.zoom : 1,
    pan: {
      x: isFinite(viewport.pan.x) ? viewport.pan.x : 0,
      y: isFinite(viewport.pan.y) ? viewport.pan.y : 0,
    },
  };
};

// Helper function to round values to the current precision
function roundToPrecision(val: number | undefined, precision: number): number | undefined {
  return typeof val === 'number' ? Number(val.toFixed(precision)) : val;
}

export const useEditorStore = create<EditorState & EditorActions>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,
    
    // Selection actions
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
      set((state) => ({
        selection: {
          ...state.selection,
          selectedSubPaths: [subPathId],
          selectedPaths: [],
          selectedCommands: [],
        },
      })),
      
    selectSubPathMultiple: (subPathId, isShiftPressed = false) =>
      set((state) => {
        if (isShiftPressed && state.selection.selectedSubPaths.length > 0) {
          // Si Shift está presionado y hay sub-paths seleccionados
          const currentSelection = state.selection.selectedSubPaths;
          
          if (currentSelection.includes(subPathId)) {
            // Si ya está seleccionado, lo removemos de la selección
            return {
              selection: {
                ...state.selection,
                selectedSubPaths: currentSelection.filter(id => id !== subPathId),
                selectedPaths: [],
                selectedCommands: [],
              },
            };
          } else {
            // Si no está seleccionado, lo agregamos a la selección
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
          // Comportamiento normal: seleccionar solo este sub-path
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
      set((state) => ({
        selection: {
          ...state.selection,
          selectedCommands: [commandId],
          selectedPaths: [],
          selectedSubPaths: [],
        },
      })),
      
    selectMultiple: (ids, type) =>
      set((state) => {
        const newSelection = { ...state.selection };
        
        if (type === 'paths') {
          newSelection.selectedPaths = ids;
          newSelection.selectedSubPaths = [];
          newSelection.selectedCommands = [];
        } else if (type === 'subpaths') {
          newSelection.selectedSubPaths = ids;
          newSelection.selectedPaths = [];
          newSelection.selectedCommands = [];
        } else if (type === 'commands') {
          newSelection.selectedCommands = ids;
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

      // Use the enhanced selection algorithm - modified existing function
      const foundSubPath = findSubPathAtPoint(path, point, 15);

      if (foundSubPath) {
        // Use the new multiple selection logic
        get().selectSubPathMultiple(foundSubPath.id, isShiftPressed);
      }
    },
    
    // Path manipulation actions
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
                    commands: [], // Start with empty commands array
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
      set((state) => ({
        paths: state.paths.map((path) => ({
          ...path,
          subPaths: path.subPaths.map((subPath) =>
            subPath.id === subPathId
              ? {
                  ...subPath,
                  commands: subPath.commands.map((cmd) => {
                    // Calculate new positions
                    let newX = cmd.x !== undefined ? cmd.x + delta.x : cmd.x;
                    let newY = cmd.y !== undefined ? cmd.y + delta.y : cmd.y;
                    let newX1 = cmd.x1 !== undefined ? cmd.x1 + delta.x : cmd.x1;
                    let newY1 = cmd.y1 !== undefined ? cmd.y1 + delta.y : cmd.y1;
                    let newX2 = cmd.x2 !== undefined ? cmd.x2 + delta.x : cmd.x2;
                    let newY2 = cmd.y2 !== undefined ? cmd.y2 + delta.y : cmd.y2;

                    // Apply snap to grid if enabled
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
                      // Apply the calculated positions
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
      }));
    },
    
    // Transform actions
    scaleSubPath: (subPathId, scaleX, scaleY, center) => {
      get().pushToHistory();
      set((state) => {
        // Find the subpath to get its center if not provided
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
        // Find the subpath to get its center if not provided
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
        // Find the subpath to get its center if not provided
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
        // Find the subpath to get its center if not provided
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
      
      // Si es un comando "M", debemos crear un nuevo sub-path
      if (command.command === 'M') {
        // Primero encontramos el path que contiene el subPathId
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
          // Crear un nuevo sub-path que comienza con el comando M
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
      
      // Para otros comandos, simplemente los agregamos al sub-path existente
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
        
        // First, find the command being moved to calculate the delta
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
          return state; // Command not found or invalid
        }
        
        const deltaX = position.x - movingCommand.x;
        const deltaY = position.y - movingCommand.y;
        
        return {
          paths: state.paths.map((path, pathIndex) => ({
            ...path,
            subPaths: path.subPaths.map((subPath, subPathIndex) => ({
              ...subPath,
              commands: subPath.commands.map((cmd, cmdIndex) => {
                // Move the main command
                if (cmd.id === commandId) {
                  if (cmd.command === 'C') {
                    return {
                      ...cmd,
                      x: roundToPrecision(position.x, precision),
                      y: roundToPrecision(position.y, precision),
                      // Move only the outgoing control point (x2, y2) that belongs to this command
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
                
                // Check if this is the next command after the one being moved in the same path and subpath
                if (pathIndex === movingPathIndex &&
                    subPathIndex === movingSubPathIndex && 
                    cmdIndex === movingCommandIndex + 1 && 
                    cmd.command === 'C') {
                  return {
                    ...cmd,
                    // Move the incoming control point (x1, y1) that connects to the previous command
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
            selectedCommands: [], // Clear command selection after replacement
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
        // Redondear todos los puntos de todos los paths importados
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
    
    // Viewport actions
    setZoom: (zoom, center) =>
      set((state) => {
        // Validate input
        if (!isFinite(zoom) || zoom <= 0) {
          console.warn('Invalid zoom value:', zoom);
          return state; // Return unchanged state
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
        
        // Validate the new viewport
        const newViewport = validateViewport({
          ...state.viewport,
          zoom: Math.max(0.1, Math.min(10, zoom)),
          pan: newPan,
        });
        
        const newState = {
          viewport: newViewport,
        };
        
        // Save preferences after updating zoom
        setTimeout(() => saveCurrentPreferences({ ...state, ...newState }), 0);
        
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
      
      // Get bounding box of all paths
      const bounds = getAllPathsBounds(paths);
      
      
      if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
        // If no valid content, reset to default view
        set({
          viewport: validateViewport({
            ...viewport,
            zoom: 1,
            pan: { x: 0, y: 0 },
          }),
        });
        return;
      }
      
      // Try to get actual SVG dimensions from DOM
      let viewportWidth = 800; // fallback width
      let viewportHeight = 600; // fallback height
      
      // Try to get real dimensions from the DOM if available
      const svgElement = document.querySelector('svg');
      if (svgElement) {
        const rect = svgElement.getBoundingClientRect();
        if (rect.width > 100 && rect.height > 100) { // Ensure reasonable minimum size
          viewportWidth = rect.width;
          viewportHeight = rect.height;
        }
      }
      
      // If DOM dimensions are still not available, try to get from viewport
      if (viewportWidth < 100 || viewportHeight < 100) {
        // Use window dimensions as last resort
        viewportWidth = window.innerWidth * 0.8; // 80% of window width
        viewportHeight = window.innerHeight * 0.8; // 80% of window height
      }
      
      
      // Validate viewport dimensions
      if (!isFinite(viewportWidth) || !isFinite(viewportHeight) || viewportWidth <= 0 || viewportHeight <= 0) {
        console.warn('Invalid viewport dimensions:', viewportWidth, viewportHeight);
        return;
      }
      
      // Use the content bounds directly without excessive padding
      const contentWidth = Math.max(bounds.width, 1);
      const contentHeight = Math.max(bounds.height, 1);
      
      
      // Calculate zoom to fit content in viewport (with some padding)
      const padding = 20; // 20px padding on each side
      const availableWidth = Math.max(viewportWidth - padding * 2, 50);
      const availableHeight = Math.max(viewportHeight - padding * 2, 50);
      
      const zoomX = availableWidth / contentWidth;
      const zoomY = availableHeight / contentHeight;
      let newZoom = Math.min(zoomX, zoomY);
      
      
      // Validate zoom calculation
      if (!isFinite(newZoom) || newZoom <= 0) {
        console.warn('Invalid zoom calculation:', newZoom);
        return;
      }
      
      // Apply zoom limits: between 0.1x and 10x
      newZoom = Math.max(0.1, Math.min(newZoom, 10));
      
      // Calculate the content center in SVG coordinates
      const contentCenterX = bounds.x + bounds.width / 2;
      const contentCenterY = bounds.y + bounds.height / 2;
      
      // Validate content center
      if (!isFinite(contentCenterX) || !isFinite(contentCenterY)) {
        console.warn('Invalid content center:', contentCenterX, contentCenterY);
        return;
      }
      
      // Calculate where we want this center to appear in screen coordinates
      const viewportCenterX = viewportWidth / 2;
      const viewportCenterY = viewportHeight / 2;
      
      // For the SVG transform: translate(pan) scale(zoom)
      // Screen coordinate = SVG coordinate * zoom + pan
      // So: pan = screen coordinate - SVG coordinate * zoom
      const newPanX = viewportCenterX - contentCenterX * newZoom;
      const newPanY = viewportCenterY - contentCenterY * newZoom;
      
      // Validate pan calculation
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
      
      // Get bounding box of selected commands
      const bounds = getSelectedElementsBounds(paths, selection.selectedCommands);
      
      
      if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
        return;
      }
      
      // Try to get actual SVG dimensions from DOM
      let viewportWidth = 800; // fallback width
      let viewportHeight = 600; // fallback height
      
      // Try to get real dimensions from the DOM if available
      const svgElement = document.querySelector('svg');
      if (svgElement) {
        const rect = svgElement.getBoundingClientRect();
        if (rect.width > 100 && rect.height > 100) { // Ensure reasonable minimum size
          viewportWidth = rect.width;
          viewportHeight = rect.height;
        }
      }
      
      // If DOM dimensions are still not available, try to get from viewport
      if (viewportWidth < 100 || viewportHeight < 100) {
        // Use window dimensions as last resort
        viewportWidth = window.innerWidth * 0.8; // 80% of window width
        viewportHeight = window.innerHeight * 0.8; // 80% of window height
      }
      
      
      // Use the selection bounds directly without excessive padding
      const selectionWidth = Math.max(bounds.width, 1);
      const selectionHeight = Math.max(bounds.height, 1);
      
      
      // Calculate zoom to fit selection in viewport (with some padding)
      const padding = 20; // 20px padding on each side
      const availableWidth = Math.max(viewportWidth - padding * 2, 50);
      const availableHeight = Math.max(viewportHeight - padding * 2, 50);
      
      const zoomX = availableWidth / selectionWidth;
      const zoomY = availableHeight / selectionHeight;
      let newZoom = Math.min(zoomX, zoomY);
      
      
      // Validate zoom calculation
      if (!isFinite(newZoom) || newZoom <= 0) {
        console.warn('Invalid zoom calculation in zoomToSelection:', newZoom);
        return;
      }
      
      // Apply zoom limits: between 0.1x and 20x (higher for selection)
      newZoom = Math.max(0.1, Math.min(newZoom, 20));
      
      // Calculate the selection center in SVG coordinates
      const selectionCenterX = bounds.x + bounds.width / 2;
      const selectionCenterY = bounds.y + bounds.height / 2;
      
      // Validate selection center
      if (!isFinite(selectionCenterX) || !isFinite(selectionCenterY)) {
        console.warn('Invalid selection center:', selectionCenterX, selectionCenterY);
        return;
      }
      
      // Calculate where we want this center to appear in screen coordinates
      const viewportCenterX = viewportWidth / 2;
      const viewportCenterY = viewportHeight / 2;
      
      // For the SVG transform: translate(pan) scale(zoom)
      // Screen coordinate = SVG coordinate * zoom + pan
      // So: pan = screen coordinate - SVG coordinate * zoom
      const newPanX = viewportCenterX - selectionCenterX * newZoom;
      const newPanY = viewportCenterY - selectionCenterY * newZoom;
      
      // Validate pan calculation
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
      
      // Get bounding box of selected sub-paths
      const bounds = getSelectedSubPathsBounds(paths, selection.selectedSubPaths);
      
      
      if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
        return;
      }
      
      // Try to get actual SVG dimensions from DOM
      let viewportWidth = 800; // fallback width
      let viewportHeight = 600; // fallback height
      
      // Try to get real dimensions from the DOM if available
      const svgElement = document.querySelector('svg');
      if (svgElement) {
        const rect = svgElement.getBoundingClientRect();
        if (rect.width > 100 && rect.height > 100) { // Ensure reasonable minimum size
          viewportWidth = rect.width;
          viewportHeight = rect.height;
        }
      }
      
      // If DOM dimensions are still not available, try to get from viewport
      if (viewportWidth < 100 || viewportHeight < 100) {
        // Use window dimensions as last resort
        viewportWidth = window.innerWidth * 0.8; // 80% of window width
        viewportHeight = window.innerHeight * 0.8; // 80% of window height
      }
      
      
      // Use the subpath bounds directly
      const subPathWidth = Math.max(bounds.width, 1);
      const subPathHeight = Math.max(bounds.height, 1);
      
      
      // Calculate zoom to fit subpath in viewport (with some padding)
      const padding = 40; // 40px padding on each side for better visibility
      const availableWidth = Math.max(viewportWidth - padding * 2, 50);
      const availableHeight = Math.max(viewportHeight - padding * 2, 50);
      
      const zoomX = availableWidth / subPathWidth;
      const zoomY = availableHeight / subPathHeight;
      
      let newZoom = Math.min(zoomX, zoomY);
      
      
      // Validate zoom calculation
      if (!isFinite(newZoom) || newZoom <= 0) {
        console.warn('Invalid zoom calculation in zoomToSubPath:', newZoom);
        return;
      }
      
      // Apply zoom limits: between 0.1x and 20x (higher for sub-path)
      newZoom = Math.max(0.1, Math.min(newZoom, 20));
      
      // Calculate the subpath center in SVG coordinates
      const subPathCenterX = bounds.x + bounds.width / 2;
      const subPathCenterY = bounds.y + bounds.height / 2;
      
      // Validate subpath center
      if (!isFinite(subPathCenterX) || !isFinite(subPathCenterY)) {
        console.warn('Invalid subpath center:', subPathCenterX, subPathCenterY);
        return;
      }
      
      // Calculate where we want this center to appear in screen coordinates
      const viewportCenterX = viewportWidth / 2;
      const viewportCenterY = viewportHeight / 2;
      
      // For the SVG transform: translate(pan) scale(zoom)
      // Screen coordinate = SVG coordinate * zoom + pan
      // So: pan = screen coordinate - SVG coordinate * zoom
      const newPanX = viewportCenterX - subPathCenterX * newZoom;
      const newPanY = viewportCenterY - subPathCenterY * newZoom;
      
      // Validate pan calculation
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
        // Validate delta input
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

        // Save preferences after resetting view
        setTimeout(() => saveCurrentPreferences({ ...state, ...newState }), 0);

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

        // Save preferences after resetting viewport completely
        setTimeout(() => saveCurrentPreferences({ ...state, ...newState }), 0);

        return newState;
      }),
    
    // Mode actions
    setMode: (mode) =>
      set((state) => ({
        mode: {
          ...state.mode,
          current: mode,
          createMode: mode === 'create' ? state.mode.createMode : undefined,
        },
      })),
    
    setCreateMode: (commandType) => {
      console.log('🏪 EditorStore: setCreateMode called with:', commandType);
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
      
    // Grid actions
    toggleGrid: () =>
      set((state) => {
        const newState = {
          grid: {
            ...state.grid,
            enabled: !state.grid.enabled,
          },
        };
        
        // Save preferences after updating grid
        setTimeout(() => saveCurrentPreferences({ ...state, ...newState }), 0);
        
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
        
        // Save preferences after updating grid size
        setTimeout(() => saveCurrentPreferences({ ...state, ...newState }), 0);
        
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
        
        // Save preferences after updating snap to grid
        setTimeout(() => saveCurrentPreferences({ ...state, ...newState }), 0);
        
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
        
        // Save preferences after updating grid labels
        setTimeout(() => saveCurrentPreferences({ ...state, ...newState }), 0);
        
        return newState;
      }),
    
    // History actions
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
          past: [...state.history.past, state].slice(-50), // Keep only last 50 states
          present: state,
          future: [],
          canUndo: true,
          canRedo: false,
        },
      })),
      
    // Feature toggles
    toggleFeature: (feature) =>
      set((state) => {
        const newFeatures = new Set(state.enabledFeatures);
        if (newFeatures.has(feature)) {
          newFeatures.delete(feature);
        } else {
          newFeatures.add(feature);
        }
        
        const newState = { enabledFeatures: newFeatures };
        
        // Save preferences after updating features
        if (feature === 'control-points' || feature === 'command-points' || feature === 'wireframe') {
          setTimeout(() => saveCurrentPreferences({ ...state, ...newState }), 0);
        }
        
        return newState;
      }),

    enableFeature: (feature) =>
      set((state) => {
        const newState = {
          enabledFeatures: new Set([...state.enabledFeatures, feature]),
        };
        
        // Save preferences after enabling features
        if (feature === 'control-points' || feature === 'command-points' || feature === 'wireframe') {
          setTimeout(() => saveCurrentPreferences({ ...state, ...newState }), 0);
        }
        
        return newState;
      }),

    disableFeature: (feature) =>
      set((state) => {
        const newFeatures = new Set(state.enabledFeatures);
        newFeatures.delete(feature);
        
        const newState = { enabledFeatures: newFeatures };
        
        // Save preferences after disabling features
        if (feature === 'control-points' || feature === 'command-points' || feature === 'wireframe') {
          setTimeout(() => saveCurrentPreferences({ ...state, ...newState }), 0);
        }
        
        return newState;
      }),
    
    // Fullscreen
    toggleFullscreen: () =>
      set((state) => ({
        isFullscreen: !state.isFullscreen,
      })),
    
    // Render control  
    forceRender: () =>
      set((state) => ({
        renderVersion: state.renderVersion + 1,
      })),

    // Precision control
    setPrecision: (precision: number) => {
      get().pushToHistory();
      set((state) => {
        // Ajustar todos los puntos de todos los paths a la nueva precisión
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
        return {
          precision,
          paths: newPaths,
          renderVersion: state.renderVersion + 1,
        };
      });
    },

    // Visual Debug size controls
    setVisualDebugGlobalFactor: (factor: number) => {
      set((state) => ({
        visualDebugSizes: {
          ...state.visualDebugSizes,
          globalFactor: Math.max(0.1, Math.min(5.0, factor)),
        },
        renderVersion: state.renderVersion + 1,
      }));
    },

    setVisualDebugCommandPointsFactor: (factor: number) => {
      set((state) => ({
        visualDebugSizes: {
          ...state.visualDebugSizes,
          commandPointsFactor: Math.max(0.1, Math.min(5.0, factor)),
        },
        renderVersion: state.renderVersion + 1,
      }));
    },

    setVisualDebugControlPointsFactor: (factor: number) => {
      set((state) => ({
        visualDebugSizes: {
          ...state.visualDebugSizes,
          controlPointsFactor: Math.max(0.1, Math.min(5.0, factor)),
        },
        renderVersion: state.renderVersion + 1,
      }));
    },

    setVisualDebugTransformResizeFactor: (factor: number) => {
      set((state) => ({
        visualDebugSizes: {
          ...state.visualDebugSizes,
          transformResizeFactor: Math.max(0.1, Math.min(5.0, factor)),
        },
        renderVersion: state.renderVersion + 1,
      }));
    },

    setVisualDebugTransformRotateFactor: (factor: number) => {
      set((state) => ({
        visualDebugSizes: {
          ...state.visualDebugSizes,
          transformRotateFactor: Math.max(0.1, Math.min(5.0, factor)),
        },
        renderVersion: state.renderVersion + 1,
      }));
    },
  }))
);
