import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { EditorState, SVGCommand, SVGPath, Point, EditorCommandType, PathStyle, ViewportState, SVGSubPath } from '../types';
import { generateId } from '../utils/id-utils.js';
import { duplicatePath, duplicateSubPath, duplicateCommand } from '../utils/duplicate-utils';
import { loadPreferences, savePreferences, UserPreferences, saveEditorState, loadEditorState, debounce } from '../utils/persistence';
import { createNewPath } from '../utils/subpath-utils';
import { parseSVGToSubPaths } from '../utils/svg-parser';
import { findSubPathAtPoint, snapToGrid, getAllPathsBounds, getSelectedElementsBounds, getSelectedSubPathsBounds } from '../utils/path-utils';
import { scaleSubPath, rotateSubPath, translateSubPath, getSubPathCenter, mirrorSubPathHorizontal, mirrorSubPathVertical } from '../utils/transform-subpath-utils';
interface EditorActions {
  addCommand: (subPathId: string, command: Omit<SVGCommand, 'id'>) => string;
  addPath: (style?: PathStyle, x?: number, y?: number) => string;
  addSubPath: (pathId: string) => string;
  clearSelection: () => void;
  disableFeature: (feature: string) => void;
  duplicateSelection: () => void;
  enableFeature: (feature: string) => void;
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
  const preferences = loadPreferences();
  const storedPrecision = preferences.precision ?? 2;
  const savedState = loadEditorState();
  let initialPaths: SVGPath[] = [];
  if (savedState && Array.isArray(savedState.paths)) {
    initialPaths = savedState.paths;
  } else {
    const hardcodedSVG = `
<svg xmlns="http:
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
  if (savedState && typeof savedState === 'object') {
    let enabledFeatures = baseState.enabledFeatures;
    if (savedState.enabledFeatures) {
      if (savedState.enabledFeatures instanceof Set) {
        enabledFeatures = savedState.enabledFeatures;
      } else if (Array.isArray(savedState.enabledFeatures)) {
        enabledFeatures = new Set(savedState.enabledFeatures);
      } else if (typeof savedState.enabledFeatures === 'object' && savedState.enabledFeatures !== null) {
        console.log(savedState);
        enabledFeatures = new Set(Object.keys(savedState.enabledFeatures));
      }
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      console.log('[SVG Editor] Estado cargado desde localStorage.');
    }
    return {
      ...baseState,
      ...savedState,
      enabledFeatures
    };
  }
  return baseState;
};
const initialState = loadInitialState();
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
        setTimeout(() => saveCurrentPreferences({ ...state, ...newState }), 0);
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
        setTimeout(() => saveCurrentPreferences({ ...state, ...newState }), 0);
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
        const newFeatures = new Set(state.enabledFeatures);
        if (newFeatures.has(feature)) {
          newFeatures.delete(feature);
        } else {
          newFeatures.add(feature);
        }
        const newState = { enabledFeatures: newFeatures };
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
        if (feature === 'control-points' || feature === 'command-points' || feature === 'wireframe') {
          setTimeout(() => saveCurrentPreferences({ ...state, ...newState }), 0);
        }
        return newState;
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
        setTimeout(() => saveCurrentPreferences({ ...state, ...newState }), 0);
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
        setTimeout(() => saveCurrentPreferences({ ...state, ...newState }), 0);
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
  if (typeof window !== 'undefined' && window.localStorage) {
    console.log('[SVG Editor] Estado del editor guardado en localStorage.');
  }
}, 500);
if (typeof window !== 'undefined') {
  setTimeout(() => {
    useEditorStore.subscribe(
      state => state,
      debouncedSave
    );
  }, 0);
}
