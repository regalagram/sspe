import React, { useState, MouseEvent, WheelEvent } from 'react';
import { Plugin, MouseEventHandler, MouseEventContext } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { snapToGrid, getCommandPosition } from '../../utils/path-utils';

interface MouseInteractionState {
  draggingCommand: string | null;
  draggingControlPoint: { commandId: string; point: 'x1y1' | 'x2y2' } | null;
  isPanning: boolean;
  lastMousePosition: { x: number; y: number };
  dragStartPositions: { [id: string]: { x: number; y: number } };
  dragOrigin: { x: number; y: number } | null;
}

class MouseInteractionManager {
  private state: MouseInteractionState = {
    draggingCommand: null,
    draggingControlPoint: null,
    isPanning: false,
    lastMousePosition: { x: 0, y: 0 },
    dragStartPositions: {},
    dragOrigin: null,
  };

  private editorStore: any;

  constructor() {
    // This will be set when the plugin is initialized
  }

  setEditorStore(store: any) {
    this.editorStore = store;
  }

  getSVGPoint(e: MouseEvent<SVGElement>, svgRef: React.RefObject<SVGSVGElement | null>): { x: number; y: number } {
    if (!svgRef.current) return { x: 0, y: 0 };
    
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPoint = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    
    // Transform point to account for zoom and pan
    const { viewport } = this.editorStore;
    return {
      x: (svgPoint.x - viewport.pan.x) / viewport.zoom,
      y: (svgPoint.y - viewport.pan.y) / viewport.zoom,
    };
  }

  handleMouseDown = (e: MouseEvent<SVGElement>, context: MouseEventContext): boolean => {
    const { commandId, controlPoint } = context;      const { 
        selection, 
        viewport, 
        grid, 
        mode, 
        paths,
        selectCommand,
        selectMultiple,
        clearSelection,
        pushToHistory
      } = this.editorStore;

    e.stopPropagation();
    
    if (e.button === 1) { // Middle mouse button for panning
      this.state.isPanning = true;
      this.state.lastMousePosition = { x: e.clientX, y: e.clientY };
      return true;
    }

    if (commandId && controlPoint) {
      // Dragging control point
      this.state.draggingControlPoint = { commandId, point: controlPoint };
      pushToHistory();
      return true;
    } else if (commandId) {
      // Selecting/dragging a command point
      if (e.ctrlKey || e.metaKey) {
        // Multiple selection
        if (selection.selectedCommands.includes(commandId)) {
          const newSelection = selection.selectedCommands.filter((id: string) => id !== commandId);
          selectMultiple(newSelection, 'commands');
        } else {
          selectMultiple([...selection.selectedCommands, commandId], 'commands');
        }
      } else {
        // Simple selection
        if (!selection.selectedCommands.includes(commandId)) {
          selectCommand(commandId);
        }
      }
      
      this.state.draggingCommand = commandId;
      
      // Save initial positions of all selected commands
      const selectedIds = selection.selectedCommands.includes(commandId)
        ? selection.selectedCommands
        : [commandId];
      const positions: { [id: string]: { x: number; y: number } } = {};
      
      paths.forEach((path: any) => {
        path.subPaths.forEach((subPath: any) => {
          subPath.commands.forEach((cmd: any) => {
            if (selectedIds.includes(cmd.id)) {
              const pos = getCommandPosition(cmd);
              if (pos) positions[cmd.id] = { x: pos.x, y: pos.y };
            }
          });
        });
      });
      
      this.state.dragStartPositions = positions;
      this.state.dragOrigin = this.getSVGPoint(e, context.svgRef);
      pushToHistory();
      return true;
    } else if (mode.current === 'create' && mode.createMode) {
      // Let creation mode plugin handle this
      return false;
    } else if (!commandId && !controlPoint && e.button === 0 && !(e.ctrlKey || e.metaKey)) {
      // Let rect selection plugin handle this
      return false;
    } else {
      // Clear selection if clicking on empty space
      clearSelection();
      return true;
    }

    return false;
  };

  handleMouseMove = (e: MouseEvent<SVGElement>, context: MouseEventContext): boolean => {
    const { grid, selection, pan, updateCommand, moveCommand } = this.editorStore;

    if (this.state.isPanning) {
      const dx = e.clientX - this.state.lastMousePosition.x;
      const dy = e.clientY - this.state.lastMousePosition.y;
      pan({ x: dx, y: dy });
      this.state.lastMousePosition = { x: e.clientX, y: e.clientY };
      return true;
    }

    if (this.state.draggingControlPoint) {
      const point = this.getSVGPoint(e, context.svgRef);
      
      if (grid.snapToGrid) {
        const snappedPoint = snapToGrid(point, grid.size);
        point.x = snappedPoint.x;
        point.y = snappedPoint.y;
      }
      
      // Update control point
      if (this.state.draggingControlPoint.point === 'x1y1') {
        updateCommand(this.state.draggingControlPoint.commandId, { x1: point.x, y1: point.y });
      } else if (this.state.draggingControlPoint.point === 'x2y2') {
        updateCommand(this.state.draggingControlPoint.commandId, { x2: point.x, y2: point.y });
      }
      return true;
    }

    if (this.state.draggingCommand && this.state.dragOrigin && Object.keys(this.state.dragStartPositions).length > 0) {
      const point = this.getSVGPoint(e, context.svgRef);
      const dx = point.x - this.state.dragOrigin.x;
      const dy = point.y - this.state.dragOrigin.y;
      
      // Move all selected commands
      selection.selectedCommands.forEach((cmdId: string) => {
        const start = this.state.dragStartPositions[cmdId];
        if (start) {
          let newX = start.x + dx;
          let newY = start.y + dy;
          if (grid.snapToGrid) {
            const snapped = snapToGrid({ x: newX, y: newY }, grid.size);
            newX = snapped.x;
            newY = snapped.y;
          }
          moveCommand(cmdId, { x: newX, y: newY });
        }
      });
      return true;
    }

    return false;
  };

  handleMouseUp = (e: MouseEvent<SVGElement>, context: MouseEventContext): boolean => {
    const wasHandling = !!(this.state.draggingCommand || this.state.draggingControlPoint || this.state.isPanning);

    this.state.draggingCommand = null;
    this.state.draggingControlPoint = null;
    this.state.isPanning = false;
    this.state.dragStartPositions = {};
    this.state.dragOrigin = null;

    return wasHandling;
  };

  handleWheel = (e: WheelEvent<SVGElement>, context: MouseEventContext): boolean => {
    const { setZoom, viewport } = this.editorStore;
    
    e.preventDefault();
    const point = this.getSVGPoint(e as MouseEvent<SVGElement>, context.svgRef);
    const zoomFactor = 1 - e.deltaY * 0.001;
    setZoom(viewport.zoom * zoomFactor, point);
    return true;
  };

  getCursor(): string {
    if (this.state.isPanning) return 'grabbing';
    if (this.state.draggingCommand || this.state.draggingControlPoint) return 'grabbing';
    return 'default';
  }
}

const mouseManager = new MouseInteractionManager();

// Hook to access mouse interaction state
export const useMouseInteraction = () => {
  return {
    getCursor: () => mouseManager.getCursor(),
  };
};

export const MouseInteractionPlugin: Plugin = {
  id: 'mouse-interaction',
  name: 'Mouse Interaction',
  version: '1.0.0',
  enabled: true,
  initialize: (editor) => {
    mouseManager.setEditorStore(editor);
  },
  mouseHandlers: {
    onMouseDown: mouseManager.handleMouseDown,
    onMouseMove: mouseManager.handleMouseMove,
    onMouseUp: mouseManager.handleMouseUp,
    onWheel: mouseManager.handleWheel,
  },
};
