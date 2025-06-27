import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { EditorState, SVGCommand, SVGSubPath, SVGPath, Point, SVGCommandType, PathStyle } from '../types';
import { generateId } from '../utils/id-utils.js';
import { loadPreferences, savePreferences, UserPreferences } from '../utils/persistence';
import { decomposeIntoSubPaths, createNewPath, findSubPathContainingCommand } from '../utils/subpath-utils';
import { parseSVGToSubPaths } from '../utils/svg-parser';
import { findSubPathAtPoint, snapToGrid } from '../utils/path-utils';

interface EditorActions {
  // Selection actions
  selectPath: (pathId: string) => void;
  selectSubPath: (subPathId: string) => void;
  selectCommand: (commandId: string) => void;
  selectMultiple: (ids: string[], type: 'paths' | 'subpaths' | 'commands') => void;
  clearSelection: () => void;
  selectSubPathByPoint: (pathId: string, point: Point) => void;
  moveSubPath: (subPathId: string, delta: Point) => void;
  
  // Path manipulation actions
  addPath: (style?: PathStyle) => string;
  removePath: (pathId: string) => void;
  addSubPath: (pathId: string) => string;
  removeSubPath: (subPathId: string) => void;
  addCommand: (subPathId: string, command: Omit<SVGCommand, 'id'>) => string;
  updateCommand: (commandId: string, updates: Partial<SVGCommand>) => void;
  removeCommand: (commandId: string) => void;
  moveCommand: (commandId: string, position: Point) => void;
  updatePathStyle: (pathId: string, style: Partial<PathStyle>) => void;
  replacePaths: (newPaths: SVGPath[]) => void;
  
  // Viewport actions
  setZoom: (zoom: number, center?: Point) => void;
  zoomIn: (center?: Point) => void;
  zoomOut: (center?: Point) => void;
  zoomToFit: () => void;
  pan: (delta: Point) => void;
  setPan: (pan: Point) => void;
  resetView: () => void;
  
  // Mode actions
  setMode: (mode: EditorState['mode']['current']) => void;
  setCreateMode: (commandType: SVGCommandType) => void;
  exitCreateMode: () => void;
  
  // Grid actions
  toggleGrid: () => void;
  setGridSize: (size: number) => void;
  toggleSnapToGrid: () => void;
  
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
}

// Load preferences from localStorage
const preferences = loadPreferences();

const createInitialState = (): EditorState => {
  // Hardcoded SVG to load as initial state
  const hardcodedSVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <path d="M 190 160 C 200 150 280 150 290 160 C 300 170 300 250 290 260 C 280 270 180 300 170 290 C 160 280 180 170 190 160 M 20 190 L 100 190 L 100 270 L 20 270 L 20 190 M 40 200 L 40 240 L 70 260 L 90 210 L 40 200 M 380 170 L 380 250 L 460 250 A 50 30 0 0 0 380 170 M 90 40 C 90 130 120 130 140 130 S 170 60 190 60 Q 160 130 240 130 T 290 40 Z" fill="rgba(0, 120, 204, 0.2)" stroke="#007acc" stroke-width="3" />
  <path d="M 490 160 C 360 80 470 30 490 90 C 500 30 600 60 490 160 Z" fill="rgba(255, 107, 107, 0.2)" stroke="#ff6b6b" stroke-width="2" />
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
      ...(preferences.showControlPoints ? ['control-points'] : [])
    ]),
    renderVersion: 0,
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
    showControlPoints: state.enabledFeatures.has('control-points'),
    showCommandPoints: state.enabledFeatures.has('command-points'),
  };
  savePreferences(preferences);
};

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

    selectSubPathByPoint: (pathId, point) => {
      const state = get();
      const path = state.paths.find(p => p.id === pathId);
      if (!path) return;

      const foundSubPath = findSubPathAtPoint(path, point);

      if (foundSubPath) {
        set((state) => ({
          selection: {
            ...state.selection,
            selectedSubPaths: [foundSubPath.id],
            selectedPaths: [],
            selectedCommands: [],
          },
        }));
      }
    },
    
    // Path manipulation actions
    addPath: (style = { fill: 'none', stroke: '#000000', strokeWidth: 2 }) => {
      const newPath = createNewPath();
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
                    commands: [{ id: generateId(), command: 'M', x: 100, y: 100 }],
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
    
    addCommand: (subPathId, command) => {
      const commandId = generateId();
      
      // Si es un comando "M", debemos crear un nuevo sub-path
      if (command.command === 'M' || command.command === 'm') {
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
                  commands: [...subPath.commands, { ...command, id: commandId }],
                }
              : subPath
          ),
        })),
      }));
      
      return commandId;
    },
    
    updateCommand: (commandId, updates) =>
      set((state) => ({
        paths: state.paths.map((path) => ({
          ...path,
          subPaths: path.subPaths.map((subPath) => ({
            ...subPath,
            commands: subPath.commands.map((cmd) =>
              cmd.id === commandId ? { ...cmd, ...updates } : cmd
            ),
          })),
        })),
      })),
    
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
      set((state) => ({
        paths: state.paths.map((path) => ({
          ...path,
          subPaths: path.subPaths.map((subPath) => ({
            ...subPath,
            commands: subPath.commands.map((cmd) =>
              cmd.id === commandId ? { ...cmd, x: position.x, y: position.y } : cmd
            ),
          })),
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
      set((state) => ({
        paths: newPaths,
        selection: {
          selectedPaths: [],
          selectedSubPaths: [],
          selectedCommands: [],
          selectedControlPoints: [],
        },
      })),
    
    // Viewport actions
    setZoom: (zoom, center) =>
      set((state) => {
        let newPan = state.viewport.pan;
        if (center) {
          const zoomRatio = zoom / state.viewport.zoom;
          newPan = {
            x: center.x - (center.x - state.viewport.pan.x) * zoomRatio,
            y: center.y - (center.y - state.viewport.pan.y) * zoomRatio,
          };
        }
        const newState = {
          viewport: {
            ...state.viewport,
            zoom: Math.max(0.1, Math.min(10, zoom)),
            pan: newPan,
          },
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
      // Implementation for zoom to fit
      set((state) => ({
        viewport: {
          ...state.viewport,
          zoom: 1,
          pan: { x: 0, y: 0 },
        },
      }));
    },
    
    pan: (delta) =>
      set((state) => ({
        viewport: {
          ...state.viewport,
          pan: {
            x: state.viewport.pan.x + delta.x,
            y: state.viewport.pan.y + delta.y,
          },
        },
      })),
    
    setPan: (pan) =>
      set((state) => ({
        viewport: {
          ...state.viewport,
          pan,
        },
      })),
    
    resetView: () =>
      set((state) => ({
        viewport: {
          ...state.viewport,
          zoom: 1,
          pan: { x: 0, y: 0 },
        },
      })),
    
    // Mode actions
    setMode: (mode) =>
      set((state) => ({
        mode: {
          ...state.mode,
          current: mode,
          createMode: mode === 'create' ? state.mode.createMode : undefined,
        },
      })),
    
    setCreateMode: (commandType) =>
      set((state) => ({
        mode: {
          current: 'create',
          createMode: {
            commandType,
            isDrawing: false,
          },
        },
      })),
    
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
        if (feature === 'control-points' || feature === 'command-points') {
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
        if (feature === 'control-points' || feature === 'command-points') {
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
        if (feature === 'control-points' || feature === 'command-points') {
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
  }))
);
