import React, { PointerEvent, WheelEvent } from 'react';
import { Plugin, PointerEventContext } from '../../core/PluginSystem';
import { snapToGrid, getCommandPosition } from '../../utils/path-utils';
import { getSVGPoint } from '../../utils/transform-utils';
import { transformManager } from '../transform/TransformManager';
import { figmaHandleManager } from '../figma-handles/FigmaHandleManager';

interface PointerInteractionState {
  draggingCommand: string | null;
  draggingControlPoint: { commandId: string; point: 'x1y1' | 'x2y2' } | null;
  isPanning: boolean;
  isSpacePressed: boolean;
  lastPointerPosition: { x: number; y: number };
  dragStartPositions: { [id: string]: { x: number; y: number } };
  dragOrigin: { x: number; y: number } | null;
}

class PointerInteractionManager {
  private state: PointerInteractionState = {
    draggingCommand: null,
    draggingControlPoint: null,
    isPanning: false,
    isSpacePressed: false,
    lastPointerPosition: { x: 0, y: 0 },
    dragStartPositions: {},
    dragOrigin: null,
  };

  private editorStore: any;

  constructor() {
    this.setupKeyboardListeners();
  }

  private setupKeyboardListeners() {
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    const isEditable = target && (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      (target as HTMLElement).isContentEditable
    );
    if (e.code === 'Space' && !e.repeat && !isEditable) {
      e.preventDefault();
      this.state.isSpacePressed = true;
      this.updateCursorForSpaceMode(true);
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    const isEditable = target && (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      (target as HTMLElement).isContentEditable
    );
    if (e.code === 'Space' && !isEditable) {
      e.preventDefault();
      this.state.isSpacePressed = false;
      this.state.isPanning = false;
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

  getSVGPoint(e: PointerEvent<SVGElement>, svgRef: React.RefObject<SVGSVGElement | null>): { x: number; y: number } {
    return getSVGPoint(e, svgRef, this.editorStore.viewport);
  }

  handlePointerDown = (e: PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
    const { commandId, controlPoint } = context;
    const { selection, viewport, grid, mode, paths, selectCommand, selectMultiple, clearSelection, pushToHistory } = this.editorStore;
    e.stopPropagation();
    const isEmptySpaceClick = !commandId && !controlPoint && !this.state.isSpacePressed && e.button === 0;
    if (this.state.draggingControlPoint && !controlPoint && !this.state.isSpacePressed) {
      figmaHandleManager.endDragHandle();
      this.state.draggingControlPoint = null;
      transformManager.setMoving(false);
    }
    if (isEmptySpaceClick && this.hasAnySelection() && !e.shiftKey) {
      clearSelection();
      return true;
    }
    if (this.state.isSpacePressed && e.button === 0) {
      this.state.isPanning = true;
      this.state.lastPointerPosition = { x: e.clientX, y: e.clientY };
      const svg = (e.target as Element).closest('svg');
      if (svg) svg.style.cursor = 'grabbing';
      return true;
    }
    if (e.button === 1) {
      this.state.isPanning = true;
      this.state.lastPointerPosition = { x: e.clientX, y: e.clientY };
      return true;
    }
    if (commandId && controlPoint && !this.state.isSpacePressed) {
      this.state.draggingControlPoint = { commandId, point: controlPoint };
      const startPoint = this.getSVGPoint(e, context.svgRef);
      const handleType = controlPoint === 'x1y1' ? 'outgoing' : 'incoming';
      figmaHandleManager.startDragHandle(commandId, handleType, startPoint);
      transformManager.setMoving(true);
      pushToHistory();
      return true;
    } else if (commandId && !this.state.isSpacePressed) {
      let finalSelectedIds: string[] = [];
      if (e.shiftKey) {
        if (selection.selectedCommands.includes(commandId)) {
          finalSelectedIds = selection.selectedCommands.filter((id: string) => id !== commandId);
          selectMultiple(finalSelectedIds, 'commands');
        } else {
          finalSelectedIds = [...selection.selectedCommands, commandId];
          selectMultiple(finalSelectedIds, 'commands');
          figmaHandleManager.onSelectionChanged();
        }
      } else {
        if (selection.selectedCommands.includes(commandId)) {
          finalSelectedIds = selection.selectedCommands;
          selectMultiple(finalSelectedIds, 'commands');
        } else {
          finalSelectedIds = [commandId];
          selectCommand(commandId);
        }
      }
      figmaHandleManager.onSelectionChanged();
      this.state.draggingCommand = commandId;
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
      transformManager.setMoving(true);
      pushToHistory();
      return true;
    } else if (mode.current === 'create' && mode.createMode && !this.state.isSpacePressed) {
      return false;
    } else if (isEmptySpaceClick && !e.shiftKey) {
      return false;
    } else if (isEmptySpaceClick && e.shiftKey) {
      return false;
    }
    return false;
  };

  handlePointerMove = (e: PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
    const { grid, selection, pan, updateCommand, moveCommand } = this.editorStore;
    if (this.state.isPanning) {
      const dx = e.clientX - this.state.lastPointerPosition.x;
      const dy = e.clientY - this.state.lastPointerPosition.y;
      pan({ x: dx, y: dy });
      this.state.lastPointerPosition = { x: e.clientX, y: e.clientY };
      return true;
    }
    if (this.state.draggingControlPoint) {
      const point = this.getSVGPoint(e, context.svgRef);
      figmaHandleManager.updateDragHandle(point);
      return true;
    }
    if (this.state.draggingCommand && this.state.dragOrigin && Object.keys(this.state.dragStartPositions).length > 0) {
      const point = this.getSVGPoint(e, context.svgRef);
      const dx = point.x - this.state.dragOrigin.x;
      const dy = point.y - this.state.dragOrigin.y;
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
  };

  handlePointerUp = (e: PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
    const wasHandling = !!(this.state.draggingCommand || this.state.draggingControlPoint || this.state.isPanning);
    const wasDraggingCommand = !!this.state.draggingCommand;
    const wasDraggingControlPoint = !!this.state.draggingControlPoint;
    if (wasDraggingControlPoint && this.state.draggingControlPoint) {
      figmaHandleManager.endDragHandle();
    }
    this.state.draggingCommand = null;
    this.state.draggingControlPoint = null;
    this.state.isPanning = false;
    this.state.dragStartPositions = {};
    this.state.dragOrigin = null;
    if (wasDraggingCommand || wasDraggingControlPoint) {
      transformManager.setMoving(false);
    }
    if (this.state.isSpacePressed) {
      const svg = (e.target as Element).closest('svg');
      if (svg) svg.style.cursor = 'grab';
    }
    return wasHandling;
  };

  handleWheel = (e: WheelEvent<SVGElement>, context: PointerEventContext): boolean => {
    const { setZoom, viewport } = this.editorStore;
    e.preventDefault();
    // Usar clientX/clientY del WheelEvent para calcular el punto
    const point = { x: e.clientX, y: e.clientY };
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

const pointerManager = new PointerInteractionManager();

export const usePointerInteraction = () => {
  return {
    getCursor: () => pointerManager.getCursor(),
  };
};

export const PointerInteractionPlugin: Plugin = {
  id: 'pointer-interaction',
  name: 'Pointer Interaction',
  version: '1.0.0',
  enabled: true,
  initialize: (editor) => {
    pointerManager.setEditorStore(editor);
  },
  pointerHandlers: {
    onPointerDown: pointerManager.handlePointerDown,
    onPointerMove: pointerManager.handlePointerMove,
    onPointerUp: pointerManager.handlePointerUp,
    onWheel: pointerManager.handleWheel,
  },
};
