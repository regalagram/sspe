import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { EditorState, SVGCommand, SVGPath, Point, EditorCommandType, PathStyle, ViewportState,SVGSubPath } from '../types';
import { generateId } from '../utils/id-utils.js';
import {
  loadPreferences,
  savePreferences,
  UserPreferences,
  saveSVG,
  loadSVG,
  saveEditorState,
  loadEditorState,
  debounce
} from '../utils/persistence';
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

  // SubPath manipulation actions
  updateSubPath: (subPathId: string, updates: Partial<SVGSubPath>) => void;
  
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

// Cargar SVG y estado del editor desde localStorage si existen
const loadInitialState = (): EditorState => {
  const preferences = loadPreferences();
  const storedPrecision = preferences.precision ?? 2;
  const savedSVG = loadSVG();
  const savedState = loadEditorState();
  let initialPaths: SVGPath[] = [];
  if (savedSVG) {
    try {
      initialPaths = parseSVGToSubPaths(savedSVG);
    } catch (error) {
      console.warn('Failed to parse saved SVG, falling back to default:', error);
      initialPaths = [];
    }
  } else {
    // Hardcoded SVG fallback
    const hardcodedSVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-32 -32 953 755">
  <path d="M 643 257 C 744 33 296 -150 174 237 C 52 746 439 766 643 257 Z M 643 257 C 602 135 500 33 439 196 C 439 53 317 74 195 216 M 215 264 C 439 142 476 298 215 563 M 11 481 L 154 481 M 520 481 C 602 502 663 461 704 481 M 364 153 C 364 143 374 133 384 133 C 396 133 404 143 404 153 C 404 166 396 174 384 174 C 374 174 364 166 364 153 Z M 373 150 C 373 145 378 142 381 142 C 386 142 389 145 389 150 C 389 155 386 158 381 158 C 378 158 373 155 373 150 Z M 492 155 C 492 143 502 135 512 135 C 525 135 533 143 533 155 C 533 166 525 176 512 176 C 502 176 492 166 492 155 Z M 504 155 C 504 152 507 147 512 147 C 517 147 520 152 520 155 C 520 160 517 164 512 164 C 507 164 504 160 504 155 Z" fill="none" stroke="#000000" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M 819 321 C 812 323 808 326 806 331 C 806 334 806 334 799 333 C 793 332 791 332 792 333 C 792 334 796 336 803 339 C 817 345 818 345 818 350 C 818 352 816 361 812 377 C 808 390 808 390 808 407 C 808 421 808 421 809 438 C 812 469 812 468 816 485 C 819 495 819 497 819 501 C 819 505 819 505 815 502 C 811 499 808 499 807 503 C 807 506 809 507 810 504 C 811 502 810 502 815 506 C 821 510 822 510 821 501 C 821 494 821 492 818 478 C 815 466 814 464 813 453 C 813 448 812 441 812 437 C 811 427 810 415 810 402 C 811 389 811 388 816 370 C 821 347 821 347 819 345 C 817 344 817 343 810 339 C 805 337 805 337 806 336 C 808 335 810 336 812 337 C 819 341 827 342 830 339 C 832 337 832 337 830 336 C 827 332 818 331 813 332 C 811 333 811 333 811 331 C 811 325 815 323 825 323 C 854 323 867 349 873 417 C 873 421 874 427 875 432 C 876 445 875 470 871 487 C 870 493 870 493 871 493 C 872 494 867 510 866 510 C 865 510 863 507 860 496 C 857 484 852 468 849 459 C 845 446 842 434 840 421 C 838 402 838 395 842 384 C 845 374 845 367 842 367 C 841 367 838 370 836 375 C 830 384 830 384 829 381 C 828 374 832 364 837 360 C 843 354 847 355 850 362 C 852 368 855 368 853 362 C 849 352 844 350 837 357 C 828 365 823 382 828 387 C 830 388 830 388 833 384 C 836 377 840 373 841 373 C 842 373 842 375 840 383 C 836 396 835 400 837 412 C 838 430 842 446 853 479 C 856 488 859 498 860 503 C 863 513 864 514 866 514 C 868 514 876 490 874 487 C 874 486 874 485 875 480 C 879 452 879 445 873 394 C 871 385 871 382 868 367 C 861 333 844 317 819 321 M 824 335 C 827 336 828 337 827 338 C 824 339 815 337 815 335 C 815 334 821 334 824 335" fill="#000000" stroke="#000000" />
  <path d="M 868 589 C 865 590 859 593 854 595 C 843 600 839 601 828 604 C 824 605 817 607 813 608 C 798 612 789 614 770 615 C 733 617 720 616 693 610 C 688 609 673 604 672 602 C 671 601 670 600 670 596 C 669 594 667 590 665 589 C 660 586 656 588 645 598 C 636 608 634 609 622 616 C 613 622 593 635 591 637 C 585 642 601 644 618 641 C 645 636 646 636 648 649 C 649 661 651 666 655 670 C 665 680 672 662 673 622 C 673 611 673 608 674 608 C 674 608 678 609 682 610 C 708 619 724 621 752 619 C 784 618 798 616 824 609 C 844 604 847 603 859 596 C 869 592 871 591 872 592 C 876 594 867 601 857 604 C 850 606 851 605 853 610 C 854 614 854 614 853 620 C 851 630 850 637 850 656 C 850 673 850 675 849 675 C 847 675 846 668 843 649 C 841 639 841 639 820 637 C 798 634 779 635 755 640 C 748 641 746 641 720 641 C 688 642 692 641 690 650 C 684 673 683 677 685 677 C 687 677 687 674 690 660 C 694 643 692 645 705 645 C 721 645 750 644 766 641 C 786 638 826 639 836 643 C 838 644 839 646 839 650 C 839 659 843 673 846 676 C 852 684 853 682 854 656 C 854 632 856 611 858 608 C 858 608 859 607 861 607 C 871 603 879 593 876 588 C 875 587 875 587 868 589 M 663 593 C 667 597 667 600 663 603 C 654 606 651 610 648 624 C 646 633 646 633 641 633 C 639 633 637 634 635 634 C 633 634 631 635 629 636 C 627 636 623 637 620 637 C 614 639 598 640 596 638 C 595 637 602 632 623 620 C 634 613 638 609 647 601 C 657 592 660 590 663 593 M 667 605 C 670 607 670 636 668 650 C 667 657 662 670 660 670 C 659 670 656 666 654 663 C 646 647 649 614 659 607 C 662 605 666 604 667 605" fill="#000000" stroke="#000000" />
</svg>
    `;
    try {
      initialPaths = parseSVGToSubPaths(hardcodedSVG);
    } catch (error) {
      initialPaths = [];
    }
  }

  // Estado base
  const baseState: EditorState = {
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
    precision: storedPrecision,
    visualDebugSizes: preferences.visualDebugSizes || {
      globalFactor: 1.0,
      commandPointsFactor: 1.0,
      controlPointsFactor: 1.0,
      transformResizeFactor: 1.0,
      transformRotateFactor: 1.0,
    },
  };

  // Si hay estado guardado, mergear (sin sobrescribir paths)
  if (savedState && typeof savedState === 'object') {
    // Solo mergear propiedades de primer nivel relevantes
    // Asegurar que enabledFeatures sea siempre un Set
    let enabledFeatures = baseState.enabledFeatures;
    if (savedState.enabledFeatures) {
      if (savedState.enabledFeatures instanceof Set) {
        enabledFeatures = savedState.enabledFeatures;
      } else if (Array.isArray(savedState.enabledFeatures)) {
        enabledFeatures = new Set(savedState.enabledFeatures);
      } else if (typeof savedState.enabledFeatures === 'object' && savedState.enabledFeatures !== null) {
        enabledFeatures = new Set(Object.keys(savedState.enabledFeatures));
      }
    }
    return {
      ...baseState,
      ...savedState,
      enabledFeatures,
      paths: baseState.paths, // paths solo desde SVG
    };
  }
  return baseState;
};

const initialState = loadInitialState();

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
    precision: state.precision,
    visualDebugSizes: state.visualDebugSizes,
  };
  savePreferences(preferences);
};

// Helper function to ensure valid viewport values
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

// Helper function to round values to the current precision
function roundToPrecision(val: number | undefined, precision: number): number | undefined {
  return typeof val === 'number' ? Number(val.toFixed(precision)) : val;
}

export const useEditorStore = create<EditorState & EditorActions>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,
    
    updateSubPath: (subPathId, updates) =>
      set((state) => ({
        paths: state.paths.map((path) => ({
          ...path,
          subPaths: path.subPaths.map((subPath) =>
            subPath.id === subPathId ? { ...subPath, ...updates } : subPath
          ),
        })),
      })),
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
      set((state) => {
        // Buscar el subpath y chequear si está lockeado
        const isLocked = state.paths.some(path =>
          path.subPaths.some(subPath => subPath.id === subPathId && subPath.locked)
        );
        if (isLocked) {
          // Si está lockeado, no seleccionar
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
        // Buscar el subpath y chequear si está lockeado
        const isLocked = state.paths.some(path =>
          path.subPaths.some(subPath => subPath.id === subPathId && subPath.locked)
        );
        if (isLocked) {
          // Si está lockeado, no seleccionar ni modificar selección
          return { selection: { ...state.selection } };
        }
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
      set((state) => {
        // Buscar el subpath al que pertenece el comando y chequear si está lockeado
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
          // Si el subpath está lockeado, no seleccionar el comando
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
          // Filtrar subpaths lockeados
          const allowed = ids.filter(id =>
            !state.paths.some(path =>
              path.subPaths.some(subPath => subPath.id === id && subPath.locked)
            )
          );
          newSelection.selectedSubPaths = allowed;
          newSelection.selectedPaths = [];
          newSelection.selectedCommands = [];
        } else if (type === 'commands') {
          // Filtrar comandos que pertenezcan a subpaths lockeados
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
      set((state) => {
        // No mover si el subpath está lockeado
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
        };
      });
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
        
        const newState = {
          precision,
          paths: newPaths,
          renderVersion: state.renderVersion + 1,
        };
        
        // Save preferences after updating precision
        setTimeout(() => saveCurrentPreferences({ ...state, ...newState }), 0);
        
        return newState;
      });
    },

    // Visual Debug size controls
    setVisualDebugGlobalFactor: (factor: number) => {
      set((state) => {
        const newState = {
          visualDebugSizes: {
            ...state.visualDebugSizes,
            globalFactor: Math.max(0.1, Math.min(5.0, factor)),
          },
          renderVersion: state.renderVersion + 1,
        };
        
        // Save preferences after updating visual debug sizes
        setTimeout(() => saveCurrentPreferences({ ...state, ...newState }), 0);
        
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
        
        // Save preferences after updating visual debug sizes
        setTimeout(() => saveCurrentPreferences({ ...state, ...newState }), 0);
        
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
        
        // Save preferences after updating visual debug sizes
        setTimeout(() => saveCurrentPreferences({ ...state, ...newState }), 0);
        
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
        
        // Save preferences after updating visual debug sizes
        setTimeout(() => saveCurrentPreferences({ ...state, ...newState }), 0);
        
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
        
        // Save preferences after updating visual debug sizes
        setTimeout(() => saveCurrentPreferences({ ...state, ...newState }), 0);
        
        return newState;
      });
    },
  }))
);

// Guardado automático debounced de SVG y editor state
const debouncedSave = debounce('editor-autosave', (state: EditorState) => {
  // Serializar SVG (debería haber una función que lo haga, aquí se asume paths -> SVG string)
  // Si tienes una función exportSVG(paths: SVGPath[]): string, úsala aquí
  let svgString = '';
  if (typeof window !== 'undefined' && (window as any).exportSVG) {
    svgString = (window as any).exportSVG(state.paths);
  } else {
    // Fallback: no guardar si no hay función
    svgString = '';
  }
  if (svgString) saveSVG(svgString);
  // Guardar estado del editor (sin paths ni history)
  const { history, ...rest } = state;
  saveEditorState({ ...rest });
}, 500);

// Suscribirse a todos los cambios relevantes
if (typeof window !== 'undefined') {
  setTimeout(() => {
    // Suscribirse a todos los cambios del estado completo
    useEditorStore.subscribe(
      state => state, // selector: todo el estado
      debouncedSave
    );
  }, 0);
}
