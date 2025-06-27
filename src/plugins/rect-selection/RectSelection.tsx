import React, { useState, MouseEvent } from 'react';
import { Plugin, MouseEventHandler, MouseEventContext } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { getCommandPosition } from '../../utils/path-utils';

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
    const { commandId, controlPoint } = context;

    // Only handle rect selection if no command or control point is being clicked
    if (!commandId && !controlPoint && e.button === 0 && !(e.ctrlKey || e.metaKey)) {
      const svgPoint = this.getSVGPoint(e, context.svgRef);
      this.state.isSelecting = true;
      this.state.selectionStart = svgPoint;
      this.state.selectionRect = null;
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
      return true;
    }

    return false;
  };

  handleMouseUp = (e: MouseEvent<SVGElement>, context: MouseEventContext): boolean => {
    if (this.state.isSelecting && this.state.selectionRect) {
      const { paths, selectMultiple, clearSelection } = this.editorStore;
      
      // Select all commands within the rectangle
      const selectedIds: string[] = [];
      paths.forEach((path: any) => {
        path.subPaths.forEach((subPath: any) => {
          subPath.commands.forEach((command: any) => {
            const pos = getCommandPosition(command);
            if (!pos) return;
            if (
              pos.x >= this.state.selectionRect!.x &&
              pos.x <= this.state.selectionRect!.x + this.state.selectionRect!.width &&
              pos.y >= this.state.selectionRect!.y &&
              pos.y <= this.state.selectionRect!.y + this.state.selectionRect!.height
            ) {
              selectedIds.push(command.id);
            }
          });
        });
      });
      
      if (selectedIds.length > 0) {
        selectMultiple(selectedIds, 'commands');
      } else {
        clearSelection();
      }

      this.state.isSelecting = false;
      this.state.selectionStart = null;
      this.state.selectionRect = null;
      return true;
    }

    if (this.state.isSelecting) {
      this.state.isSelecting = false;
      this.state.selectionStart = null;
      this.state.selectionRect = null;
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
