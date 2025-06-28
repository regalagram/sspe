import React, { useState, MouseEvent } from 'react';
import { Plugin, MouseEventHandler, MouseEventContext } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { getCommandPosition } from '../../utils/path-utils';
import { getSVGPoint } from '../../utils/transform-utils';

interface RectSelectionState {
  isSelecting: boolean;
  selectionStart: { x: number; y: number } | null;
  selectionRect: { x: number; y: number; width: number; height: number } | null;
}

class RectSelectionManager {
  private state: RectSelectionState = {
    isSelecting: false,
    selectionStart: null,
    selectionRect: null,
  };

  private editorStore: any;
  private listeners: (() => void)[] = [];

  setEditorStore(store: any) {
    this.editorStore = store;
  }

  // Add listener for state changes
  addListener(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners when state changes
  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  getSVGPoint(e: MouseEvent<SVGElement>, svgRef: React.RefObject<SVGSVGElement | null>): { x: number; y: number } {
    return getSVGPoint(e, svgRef, this.editorStore.viewport);
  }

  handleMouseDown = (e: MouseEvent<SVGElement>, context: MouseEventContext): boolean => {
    const { commandId, controlPoint } = context;
    const { mode } = this.editorStore;

    // Only handle rect selection if we're in select mode, no command or control point is being clicked
    if (mode.current === 'select' && !commandId && !controlPoint && e.button === 0 && !e.shiftKey) {
      const svgPoint = this.getSVGPoint(e, context.svgRef);
      this.state.isSelecting = true;
      this.state.selectionStart = svgPoint;
      this.state.selectionRect = null;
      this.notifyListeners();
      return true;
    }

    return false;
  };

  handleMouseMove = (e: MouseEvent<SVGElement>, context: MouseEventContext): boolean => {
    if (this.state.isSelecting && this.state.selectionStart) {
      const svgPoint = this.getSVGPoint(e, context.svgRef);
      const x = Math.min(this.state.selectionStart.x, svgPoint.x);
      const y = Math.min(this.state.selectionStart.y, svgPoint.y);
      const width = Math.abs(this.state.selectionStart.x - svgPoint.x);
      const height = Math.abs(this.state.selectionStart.y - svgPoint.y);
      this.state.selectionRect = { x, y, width, height };
      this.notifyListeners();
      return true;
    }

    return false;
  };

  handleMouseUp = (e: MouseEvent<SVGElement>, context: MouseEventContext): boolean => {
    if (this.state.isSelecting && this.state.selectionRect) {
      const { paths, selectMultiple, clearSelection } = this.editorStore;
      
      // Only treat as a rectangle selection if there's actual area (not just a click)
      const hasSignificantArea = this.state.selectionRect.width > 5 || this.state.selectionRect.height > 5;
      
      if (hasSignificantArea) {
        // First, find all commands within the rectangle, plus Z commands from same sub-paths
        const commandsInRect: { commandId: string; subPathId: string; pathId: string }[] = [];
        const subPathsWithCommands = new Set<string>();
        
        paths.forEach((path: any) => {
          path.subPaths.forEach((subPath: any) => {
            subPath.commands.forEach((command: any) => {
              const pos = getCommandPosition(command);
              // Include commands with positions that are within the rectangle
              if (pos && 
                pos.x >= this.state.selectionRect!.x &&
                pos.x <= this.state.selectionRect!.x + this.state.selectionRect!.width &&
                pos.y >= this.state.selectionRect!.y &&
                pos.y <= this.state.selectionRect!.y + this.state.selectionRect!.height
              ) {
                commandsInRect.push({
                  commandId: command.id,
                  subPathId: subPath.id,
                  pathId: path.id
                });
                subPathsWithCommands.add(subPath.id);
              }
            });
          });
        });

        // Now add Z commands from sub-paths that have other commands selected
        paths.forEach((path: any) => {
          path.subPaths.forEach((subPath: any) => {
            if (subPathsWithCommands.has(subPath.id)) {
              subPath.commands.forEach((command: any) => {
                // Add Z commands (and other commands without position) from affected sub-paths
                const pos = getCommandPosition(command);
                if (!pos && !commandsInRect.some(item => item.commandId === command.id)) {
                  commandsInRect.push({
                    commandId: command.id,
                    subPathId: subPath.id,
                    pathId: path.id
                  });
                }
              });
            }
          });
        });

        if (commandsInRect.length > 0) {
          // Group commands by sub-path to check completeness
          const subPathGroups = new Map<string, { commandIds: string[]; totalCommands: number }>();
          
          // First pass: collect all commands in rectangle grouped by sub-path
          commandsInRect.forEach(({ commandId, subPathId }) => {
            if (!subPathGroups.has(subPathId)) {
              subPathGroups.set(subPathId, { commandIds: [], totalCommands: 0 });
            }
            subPathGroups.get(subPathId)!.commandIds.push(commandId);
          });
          
          // Second pass: get total command count for each sub-path
          paths.forEach((path: any) => {
            path.subPaths.forEach((subPath: any) => {
              if (subPathGroups.has(subPath.id)) {
                subPathGroups.get(subPath.id)!.totalCommands = subPath.commands.length;
              }
            });
          });
          
          // Check if ALL selected commands belong to COMPLETE sub-paths
          let allCommandsBelongToCompleteSubPaths = true;
          const completeSubPathIds: string[] = [];
          
          subPathGroups.forEach((group, subPathId) => {
            if (group.commandIds.length === group.totalCommands) {
              // This sub-path is complete
              completeSubPathIds.push(subPathId);
            } else {
              // This sub-path is incomplete - we have partial commands
              allCommandsBelongToCompleteSubPaths = false;
            }
          });
          
          if (allCommandsBelongToCompleteSubPaths && completeSubPathIds.length > 0) {
            // ALL commands belong to complete sub-paths, so select those sub-paths
            const { selectSubPathMultiple } = this.editorStore;
            // Clear current selection and select the first sub-path
            selectSubPathMultiple(completeSubPathIds[0], false);
            // Then add the rest with shift behavior
            for (let i = 1; i < completeSubPathIds.length; i++) {
              selectSubPathMultiple(completeSubPathIds[i], true);
            }
          } else {
            // Some commands don't complete their sub-paths, use original behavior
            // But only include commands that have positions (exclude Z commands in partial selection)
            const selectedCommandIds = commandsInRect
              .filter(item => {
                // Find the actual command to check if it has a position
                for (const path of paths) {
                  for (const subPath of path.subPaths) {
                    const command = subPath.commands.find((cmd: any) => cmd.id === item.commandId);
                    if (command) {
                      return getCommandPosition(command) !== null; // Only include commands with positions
                    }
                  }
                }
                return false;
              })
              .map(item => item.commandId);
            selectMultiple(selectedCommandIds, 'commands');
          }
        } else {
          clearSelection();
        }
      }
      // If it's just a small click (not a drag), don't clear selection

      this.state.isSelecting = false;
      this.state.selectionStart = null;
      this.state.selectionRect = null;
      this.notifyListeners();
      return hasSignificantArea; // Only consume the event if it was a real selection
    }

    if (this.state.isSelecting) {
      this.state.isSelecting = false;
      this.state.selectionStart = null;
      this.state.selectionRect = null;
      this.notifyListeners();
      return true;
    }

    return false;
  };

  getCursor(): string {
    return this.state.isSelecting ? 'crosshair' : 'default';
  }

  getSelectionRect() {
    return this.state.selectionRect;
  }

  isSelecting() {
    return this.state.isSelecting;
  }
}

const rectSelectionManager = new RectSelectionManager();

// Hook to access rect selection state
export const useRectSelection = () => {
  return {
    getCursor: () => rectSelectionManager.getCursor(),
    getSelectionRect: () => rectSelectionManager.getSelectionRect(),
    isSelecting: () => rectSelectionManager.isSelecting(),
  };
};

// React component for rendering the selection rectangle
export const RectSelectionRenderer: React.FC = () => {
  const { viewport } = useEditorStore();
  const [, forceUpdate] = useState({});

  // Subscribe to state changes to force re-render
  React.useEffect(() => {
    const unsubscribe = rectSelectionManager.addListener(() => {
      forceUpdate({});
    });
    return unsubscribe;
  }, []);

  const selectionRect = rectSelectionManager.getSelectionRect();
  const isSelecting = rectSelectionManager.isSelecting();

  if (!isSelecting || !selectionRect) return null;

  return (
    <rect
      x={selectionRect.x}
      y={selectionRect.y}
      width={selectionRect.width}
      height={selectionRect.height}
      fill="rgba(0, 120, 204, 0.15)"
      stroke="#007acc"
      strokeWidth={1 / viewport.zoom}
      style={{ pointerEvents: 'none' }}
    />
  );
};

export const RectSelectionPlugin: Plugin = {
  id: 'rect-selection',
  name: 'Rectangle Selection',
  version: '1.0.0',
  enabled: true,
  dependencies: ['mouse-interaction'],
  initialize: (editor) => {
    rectSelectionManager.setEditorStore(editor);
  },
  mouseHandlers: {
    onMouseDown: rectSelectionManager.handleMouseDown,
    onMouseMove: rectSelectionManager.handleMouseMove,
    onMouseUp: rectSelectionManager.handleMouseUp,
  },
  ui: [
    {
      id: 'rect-selection-renderer',
      component: RectSelectionRenderer,
      position: 'svg-content',
      order: 100, // Render on top
    },
  ],
};
