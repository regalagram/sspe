import React, { MouseEvent, WheelEvent } from 'react';
import { Plugin, MouseEventContext } from '../../core/PluginSystem';
import { snapToGrid, getCommandPosition } from '../../utils/path-utils';
import { getSVGPoint } from '../../utils/transform-utils';
import { transformManager } from '../transform/TransformManager';
import { figmaHandleManager } from '../figma-handles/FigmaHandleManager';

interface MouseInteractionState {
  draggingCommand: string | null;
  draggingControlPoint: { commandId: string; point: 'x1y1' | 'x2y2' } | null;
  isPanning: boolean;
  isSpacePressed: boolean;
  lastMousePosition: { x: number; y: number };
  dragStartPositions: { [id: string]: { x: number; y: number } };
  dragOrigin: { x: number; y: number } | null;
}

class MouseInteractionManager {
  private state: MouseInteractionState = {
    draggingCommand: null,
    draggingControlPoint: null,
    isPanning: false,
    isSpacePressed: false,
    lastMousePosition: { x: 0, y: 0 },
    dragStartPositions: {},
    dragOrigin: null,
  };

  private editorStore: any;

  constructor() {
    // This will be set when the plugin is initialized
    this.setupKeyboardListeners();
  }

  private setupKeyboardListeners() {
    // Listen for spacebar press/release globally
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    // Only intercept spacebar if not focused on input/textarea/contentEditable
    const target = e.target as HTMLElement | null;
    const isEditable = target && (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      (target as HTMLElement).isContentEditable
    );
    if (e.code === 'Space' && !e.repeat && !isEditable) {
      e.preventDefault();
      this.state.isSpacePressed = true;
      // Update cursor for all SVG elements
      this.updateCursorForSpaceMode(true);
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    // Only intercept spacebar if not focused on input/textarea/contentEditable
    const target = e.target as HTMLElement | null;
    const isEditable = target && (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      (target as HTMLElement).isContentEditable
    );
    if (e.code === 'Space' && !isEditable) {
      e.preventDefault();
      this.state.isSpacePressed = false;
      this.state.isPanning = false; // Stop panning if space is released
      // Update cursor for all SVG elements
      this.updateCursorForSpaceMode(false);
    }
  };

  private updateCursorForSpaceMode(isSpacePressed: boolean) {
    const svgElements = document.querySelectorAll('svg');
    svgElements.forEach(svg => {
      if (isSpacePressed) {
        svg.style.cursor = 'grab';
      } else {
        svg.style.cursor = 'default';
      }
    });
  }

  setEditorStore(store: any) {
    this.editorStore = store;
  }

  private hasAnySelection(): boolean {
    if (!this.editorStore) return false;
    const { selection } = this.editorStore;
    return selection.selectedCommands.length > 0 || 
           selection.selectedSubPaths.length > 0 || 
           selection.selectedPaths.length > 0;
  }

  getSVGPoint(e: MouseEvent<SVGElement>, svgRef: React.RefObject<SVGSVGElement | null>): { x: number; y: number } {
    return getSVGPoint(e, svgRef, this.editorStore.viewport);
  }

  handleMouseDown = (e: MouseEvent<SVGElement>, context: MouseEventContext): boolean => {
    const { commandId, controlPoint } = context;
    
    const { 
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
    
    // Check if this is a click on empty space (no command, no control point)
    const isEmptySpaceClick = !commandId && !controlPoint && !this.state.isSpacePressed && e.button === 0;
    
    // Si estamos arrastrando un control point y tocamos en otro lugar, finalizar el drag
    if (this.state.draggingControlPoint && !controlPoint && !this.state.isSpacePressed) {
      figmaHandleManager.endDragHandle();
      this.state.draggingControlPoint = null;
      transformManager.setMoving(false);
      // Continue processing the click normally
    }
    
    // PRIORITY: Deselection on empty space click
    if (isEmptySpaceClick && this.hasAnySelection() && !e.shiftKey) {
      clearSelection();
      return true;
    }
    
    // Space + Left Mouse Button for panning (Mac-friendly)
    if (this.state.isSpacePressed && e.button === 0) {
      this.state.isPanning = true;
      this.state.lastMousePosition = { x: e.clientX, y: e.clientY };
      // Update cursor to grabbing
      const svg = (e.target as Element).closest('svg');
      if (svg) svg.style.cursor = 'grabbing';
      return true;
    }
    
    if (e.button === 1) { // Middle mouse button for panning (for mice that have it)
      this.state.isPanning = true;
      this.state.lastMousePosition = { x: e.clientX, y: e.clientY };
      return true;
    }

    if (commandId && controlPoint && !this.state.isSpacePressed) {
      // Dragging control point - usar el nuevo sistema de Figma
             this.state.draggingControlPoint = { commandId, point: controlPoint };
      
      const startPoint = this.getSVGPoint(e, context.svgRef);
      const handleType = controlPoint === 'x1y1' ? 'outgoing' : 'incoming';
      
      figmaHandleManager.startDragHandle(commandId, handleType, startPoint);
      transformManager.setMoving(true);
      pushToHistory();
      return true;
    } else if (commandId && !this.state.isSpacePressed) {
      // Selecting/dragging a command point
      let finalSelectedIds: string[] = [];
      
      if (e.shiftKey) {
        // Multiple selection
        if (selection.selectedCommands.includes(commandId)) {
          finalSelectedIds = selection.selectedCommands.filter((id: string) => id !== commandId);
          selectMultiple(finalSelectedIds, 'commands');
        } else {
          finalSelectedIds = [...selection.selectedCommands, commandId];
          selectMultiple(finalSelectedIds, 'commands');
          
          // Notificar al FigmaHandleManager sobre el cambio de selección
          figmaHandleManager.onSelectionChanged();
        }
      } else {
        // Simple selection
        if (selection.selectedCommands.includes(commandId)) {
          // If the command is already selected, keep the current selection for dragging
          finalSelectedIds = selection.selectedCommands;
          // Use selectMultiple to ensure the state is maintained properly
          selectMultiple(finalSelectedIds, 'commands');
        } else {
          // If not selected, select only this command (clear others)
          finalSelectedIds = [commandId];
          selectCommand(commandId);
        }
      }
      
      // Notificar al FigmaHandleManager sobre el cambio de selección
      figmaHandleManager.onSelectionChanged();
      
      this.state.draggingCommand = commandId;
      
      // Save initial positions of all selected commands (use the final selection)
      const positions: { [id: string]: { x: number; y: number } } = {};
      
      paths.forEach((path: any) => {
        path.subPaths.forEach((subPath: any) => {
          subPath.commands.forEach((cmd: any) => {
            if (finalSelectedIds.includes(cmd.id)) {
              const pos = getCommandPosition(cmd);
              if (pos) positions[cmd.id] = { x: pos.x, y: pos.y };
            }
          });
        });
      });
      
      this.state.dragStartPositions = positions;
      this.state.dragOrigin = this.getSVGPoint(e, context.svgRef);
      
      // Notify transform manager that movement started
      transformManager.setMoving(true);
      
      pushToHistory();
      return true;
    } else if (mode.current === 'create' && mode.createMode && !this.state.isSpacePressed) {
      // Let creation mode plugin handle this
      return false;
    } else if (isEmptySpaceClick && !e.shiftKey) {
      // Let rect selection plugin handle this if no selection exists
      return false;
    } else if (isEmptySpaceClick && e.shiftKey) {
      // If Shift is pressed on empty space, let other plugins (like PathRenderer) handle the event first
      return false;
    }

    return false;
  };  handleMouseMove = (e: MouseEvent<SVGElement>, context: MouseEventContext): boolean => {
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
      
      // Pasar el punto original al FigmaHandleManager, que decidirá si aplicar snap
      figmaHandleManager.updateDragHandle(point);
      
      return true;
    }

    if (this.state.draggingCommand && this.state.dragOrigin && Object.keys(this.state.dragStartPositions).length > 0) {
      const point = this.getSVGPoint(e, context.svgRef);
      const dx = point.x - this.state.dragOrigin.x;
      const dy = point.y - this.state.dragOrigin.y;
      
      // Move all commands that were selected when dragging started
      Object.keys(this.state.dragStartPositions).forEach((cmdId: string) => {
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
  };  handleMouseUp = (e: MouseEvent<SVGElement>, context: MouseEventContext): boolean => {
    const wasHandling = !!(this.state.draggingCommand || this.state.draggingControlPoint || this.state.isPanning);
    const wasDraggingCommand = !!this.state.draggingCommand;
    const wasDraggingControlPoint = !!this.state.draggingControlPoint;

    // Finalizar arrastre de control points en el sistema de Figma
    if (wasDraggingControlPoint && this.state.draggingControlPoint) {
      figmaHandleManager.endDragHandle();
    }

    this.state.draggingCommand = null;
    this.state.draggingControlPoint = null;
    this.state.isPanning = false;
    this.state.dragStartPositions = {};
    this.state.dragOrigin = null;

    // Notify transform manager that movement ended
    if (wasDraggingCommand || wasDraggingControlPoint) {
      transformManager.setMoving(false);
    }

    // Reset cursor if space is still pressed but not panning
    if (this.state.isSpacePressed) {
      const svg = (e.target as Element).closest('svg');
      if (svg) svg.style.cursor = 'grab';
    }

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
    if (this.state.isSpacePressed) return 'grab';
    if (this.state.draggingCommand || this.state.draggingControlPoint) return 'grabbing';
    return 'default';
  }

  cleanup() {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
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
