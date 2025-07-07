import { MouseEvent } from 'react';
import { MouseEventHandler, MouseEventContext } from '../../core/PluginSystem';
import { snapToGrid } from '../../utils/path-utils';
import { getSVGPoint } from '../../utils/transform-utils';
import { Point, SVGCommand } from '../../types';

export enum CurveToolMode {
  INACTIVE = 'inactive',
  CREATING = 'creating',
  EDITING = 'editing',
  DRAGGING_HANDLE = 'dragging_handle',
  DRAGGING_POINT = 'dragging_point'
}

export enum PointType {
  CORNER = 'corner',
  SMOOTH = 'smooth',
  ASYMMETRIC = 'asymmetric'
}

export interface CurvePoint {
  id: string;
  x: number;
  y: number;
  type: PointType;
  handleIn?: Point;
  handleOut?: Point;
  selected?: boolean;
}

export interface CurveState {
  mode: CurveToolMode;
  isActive: boolean;
  currentPathId?: string;
  currentSubPathId?: string;
  points: CurvePoint[];
  selectedPointId?: string;
  dragState?: {
    isDragging: boolean;
    dragType: 'point' | 'handle_in' | 'handle_out';
    pointId: string;
    startPoint: Point;
    startHandleIn?: Point;
    startHandleOut?: Point;
  };
  previewPoint?: Point;
  previewHandle?: Point;
  isClosingPath: boolean;
}

export class CurvesManager {
  private editorStore: any;
  private curveState: CurveState = {
    mode: CurveToolMode.INACTIVE,
    isActive: false,
    points: [],
    isClosingPath: false,
  };
  private lastClickTime: number = 0;
  private lastClickPoint: Point | null = null;
  private doubleClickThreshold: number = 300; // ms
  private doubleClickDistance: number = 5; // pixels
  private listeners: (() => void)[] = [];
  
  // Throttling for performance during drag operations
  private isThrottling = false;

  setEditorStore(store: any) {
    this.editorStore = store;
  }

  getState(): CurveState {
    return this.curveState;
  }

  // Add listener for state changes
  addListener(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Notify all listeners of state changes
  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('Error in curves manager listener:', error);
      }
    });
    // Force editor re-render after notifying listeners
    this.forceUpdate();
  }

  // Throttled notification for performance during drag operations
  private throttledNotifyListeners() {
    // Simplify throttling - just use requestAnimationFrame for smooth updates
    if (this.isThrottling) return;
    
    this.isThrottling = true;
    requestAnimationFrame(() => {
      this.notifyListeners();
      this.isThrottling = false;
    });
  }

  // Update state and notify listeners
  private updateState() {
    
    this.notifyListeners();
  }

  getSVGPoint(e: MouseEvent<SVGElement>, svgRef: React.RefObject<SVGSVGElement | null>): Point {
    return getSVGPoint(e, svgRef, this.editorStore.viewport);
  }

  activateCurveTool = () => {
    this.curveState.isActive = true;
    this.curveState.mode = CurveToolMode.CREATING;
    this.editorStore.setMode('curves');
    this.updateState();
  };

  exitCurveTool = () => {
    this.finishPath();
    this.curveState.isActive = false;
    this.curveState.mode = CurveToolMode.INACTIVE;
    this.curveState.points = [];
    this.curveState.selectedPointId = undefined;
    this.curveState.dragState = undefined;
    this.curveState.previewPoint = undefined;
    this.curveState.previewHandle = undefined;
    this.curveState.isClosingPath = false;
    
    // Clean up throttling
    this.isThrottling = false;
    
    this.editorStore.setMode('select');
    this.updateState();
  };

  finishPath = () => {
    
    if (this.curveState.points.length > 1) {
      this.convertPointsToPath();
    }
    this.curveState.points = [];
    this.curveState.currentPathId = undefined;
    this.curveState.currentSubPathId = undefined;
    this.curveState.isClosingPath = false; // Reset the closing flag
    this.curveState.mode = CurveToolMode.CREATING;
    this.updateState();
  };

  // Manual finish - called by Enter key or explicit user action
  manualFinishPath = () => {
    if (this.curveState.points.length >= 2) {
      this.finishPath();
    }
  };

  private convertPointsToPath = () => {
    if (this.curveState.points.length < 2) return;

    console.log('CurvesManager: All points:', this.curveState.points.map(p => ({ id: p.id, x: p.x, y: p.y })));

    const { pushToHistory } = this.editorStore;
    
    // Save current state to history BEFORE making changes
    pushToHistory();
    
    // Get precision from store
    const precision = this.editorStore.precision;
    
    // Helper function to round to precision
    const roundToPrecision = (val: number | undefined): number | undefined => {
      if (val === undefined) return undefined;
      return Math.round(val * Math.pow(10, precision)) / Math.pow(10, precision);
    };
    
    // Build all commands first
    const commands: any[] = [];
    
    // Add move command for first point
    const firstPoint = this.curveState.points[0];
    commands.push({
      id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      command: 'M',
      x: roundToPrecision(firstPoint.x),
      y: roundToPrecision(firstPoint.y),
    });
    

    // Add curve commands for subsequent points
    for (let i = 1; i < this.curveState.points.length; i++) {
      const point = this.curveState.points[i];
      const prevPoint = this.curveState.points[i - 1];

      if (point.type === PointType.CORNER && !prevPoint.handleOut) {
        // Line to corner point
        commands.push({
          id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          command: 'L',
          x: roundToPrecision(point.x),
          y: roundToPrecision(point.y),
        });
        
      } else {
        // Cubic bezier curve
        const cp1 = prevPoint.handleOut || { x: prevPoint.x, y: prevPoint.y };
        const cp2 = point.handleIn || { x: point.x, y: point.y };
        
        commands.push({
          id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          command: 'C',
          x1: roundToPrecision(cp1.x),
          y1: roundToPrecision(cp1.y),
          x2: roundToPrecision(cp2.x),
          y2: roundToPrecision(cp2.y),
          x: roundToPrecision(point.x),
          y: roundToPrecision(point.y),
        });
        
      }
    }

    // Close path if needed
    if (this.curveState.isClosingPath) {
      commands.push({
        id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        command: 'Z',
      });
      
    }

    // Create the new path directly
    const pathId = `path-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const subPathId = `subpath-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newPath = {
      id: pathId,
      subPaths: [{
        id: subPathId,
        commands: commands,
      }],
      style: {
        fill: 'none',
        stroke: '#000000',
        strokeWidth: 2,
      },
    };

    // Add the path using the store's set method to ensure proper state management
    const currentPaths = this.editorStore.paths;
    this.editorStore.replacePaths([...currentPaths, newPath]);
    
    this.curveState.currentPathId = pathId;
    this.curveState.currentSubPathId = subPathId;

    // Debug: Log final path structure
    console.log('CurvesManager: Final path commands:', commands.map((cmd: any) => ({
      command: cmd.command,
      x: cmd.x,
      y: cmd.y,
      x1: cmd.x1,
      y1: cmd.y1,
      x2: cmd.x2,
      y2: cmd.y2
    })));
  };

  private snapPoint = (point: Point): Point => {
    const { grid } = this.editorStore;
    if (grid.snapToGrid) {
      return snapToGrid(point, grid.size);
    }
    return point;
  };

  private findPointAt = (point: Point, tolerance: number = 8): CurvePoint | null => {
    return this.curveState.points.find(p => {
      const distance = Math.sqrt(Math.pow(p.x - point.x, 2) + Math.pow(p.y - point.y, 2));
      return distance <= tolerance;
    }) || null;
  };

  private isDoubleClick = (point: Point): boolean => {
    const now = Date.now();
    const timeDiff = now - this.lastClickTime;
    
    if (timeDiff > this.doubleClickThreshold) {
      this.lastClickTime = now;
      this.lastClickPoint = point;
      return false;
    }
    
    if (this.lastClickPoint) {
      const distance = Math.sqrt(
        Math.pow(point.x - this.lastClickPoint.x, 2) + 
        Math.pow(point.y - this.lastClickPoint.y, 2)
      );
      
      if (distance <= this.doubleClickDistance) {
        this.lastClickTime = 0;
        this.lastClickPoint = null;
        return true;
      }
    }
    
    this.lastClickTime = now;
    this.lastClickPoint = point;
    return false;
  };

  private findHandleAt = (point: Point, tolerance: number = 8): { pointId: string; handleType: 'in' | 'out' } | null => {
    for (const p of this.curveState.points) {
      if (p.handleIn) {
        const distance = Math.sqrt(Math.pow(p.handleIn.x - point.x, 2) + Math.pow(p.handleIn.y - point.y, 2));
        if (distance <= tolerance) {
          return { pointId: p.id, handleType: 'in' };
        }
      }
      if (p.handleOut) {
        const distance = Math.sqrt(Math.pow(p.handleOut.x - point.x, 2) + Math.pow(p.handleOut.y - point.y, 2));
        if (distance <= tolerance) {
          return { pointId: p.id, handleType: 'out' };
        }
      }
    }
    return null;
  };

  handleMouseDown = (e: MouseEvent<SVGElement>, context: MouseEventContext): boolean => {
    if (!this.curveState.isActive) return false;

    const point = this.getSVGPoint(e, context.svgRef);
    const snappedPoint = this.snapPoint(point);

    // Check if clicking on existing point or handle
    const existingPoint = this.findPointAt(snappedPoint);
    const existingHandle = this.findHandleAt(snappedPoint);

    if (this.curveState.mode === CurveToolMode.CREATING) {
      if (existingPoint && existingPoint === this.curveState.points[0] && this.curveState.points.length > 2) {
        // Closing path by clicking on first point
        this.curveState.isClosingPath = true;
        this.finishPath();
        return true;
      }

      // Check for double-click to finish path (only if we have at least 3 points)
      if (this.isDoubleClick(snappedPoint) && this.curveState.points.length >= 3) {
        this.finishPath();
        return true;
      }

      // Start creating new point - we'll determine if it's corner or smooth on mouse up
      const newPoint: CurvePoint = {
        id: `curve-point-${Date.now()}`,
        x: snappedPoint.x,
        y: snappedPoint.y,
        type: PointType.CORNER,
        selected: true,
      };

      this.curveState.points.forEach(p => p.selected = false);
      this.curveState.points.push(newPoint);
      this.curveState.selectedPointId = newPoint.id;
      
      
      
      // Set up potential dragging for smooth point creation
      this.curveState.dragState = {
        isDragging: false,
        dragType: 'handle_out',
        pointId: newPoint.id,
        startPoint: snappedPoint,
      };

      this.curveState.mode = CurveToolMode.EDITING;
      this.updateState(); // Immediate update - point appears immediately
      return true;
    }

    if (this.curveState.mode === CurveToolMode.EDITING) {
      if (existingHandle) {
        // Save current state to history BEFORE starting to drag handle
        const { pushToHistory } = this.editorStore;
        pushToHistory();
        
        // Start dragging handle
        this.curveState.dragState = {
          isDragging: true,
          dragType: existingHandle.handleType === 'in' ? 'handle_in' : 'handle_out',
          pointId: existingHandle.pointId,
          startPoint: snappedPoint,
        };
        this.curveState.mode = CurveToolMode.DRAGGING_HANDLE;
        return true;
      }

      if (existingPoint) {
        // Select point or start dragging
        this.curveState.points.forEach(p => p.selected = false);
        existingPoint.selected = true;
        this.curveState.selectedPointId = existingPoint.id;

        if (e.altKey) {
          // Alt+click: Convert point type
          this.togglePointType(existingPoint);
        } else {
          // Save current state to history BEFORE starting to drag point
          const { pushToHistory } = this.editorStore;
          pushToHistory();
          
          // Start dragging point
          this.curveState.dragState = {
            isDragging: true,
            dragType: 'point',
            pointId: existingPoint.id,
            startPoint: snappedPoint,
            startHandleIn: existingPoint.handleIn ? { ...existingPoint.handleIn } : undefined,
            startHandleOut: existingPoint.handleOut ? { ...existingPoint.handleOut } : undefined,
          };
          this.curveState.mode = CurveToolMode.DRAGGING_POINT;
        }
        return true;
      }

      // Click on empty space - create new point
      const newPoint: CurvePoint = {
        id: `curve-point-${Date.now()}`,
        x: snappedPoint.x,
        y: snappedPoint.y,
        type: PointType.CORNER,
        selected: true,
      };

      this.curveState.points.forEach(p => p.selected = false);
      this.curveState.points.push(newPoint);
      this.curveState.selectedPointId = newPoint.id;
      
      // Set up potential dragging for smooth point creation
      this.curveState.dragState = {
        isDragging: false,
        dragType: 'handle_out',
        pointId: newPoint.id,
        startPoint: snappedPoint,
      };

      this.curveState.mode = CurveToolMode.EDITING;
      this.updateState(); // Immediate update - point appears immediately
      return true;
    }

    return false;
  };

  handleMouseMove = (e: MouseEvent<SVGElement>, context: MouseEventContext): boolean => {
    if (!this.curveState.isActive) return false;

    const point = this.getSVGPoint(e, context.svgRef);
    const snappedPoint = this.snapPoint(point);

    if (this.curveState.mode === CurveToolMode.CREATING) {
      this.curveState.previewPoint = snappedPoint;
      // Use throttled updates for preview point to avoid performance issues
      this.throttledNotifyListeners();
      return true;
    }

    if (this.curveState.mode === CurveToolMode.EDITING && this.curveState.dragState && !this.curveState.dragState.isDragging) {
      // Check if we're dragging to create a smooth point
      const { startPoint, pointId } = this.curveState.dragState;
      const distance = Math.sqrt(
        Math.pow(snappedPoint.x - startPoint.x, 2) + 
        Math.pow(snappedPoint.y - startPoint.y, 2)
      );
      
      if (distance > 5) { // Threshold for detecting drag
        const targetPoint = this.curveState.points.find(p => p.id === pointId);
        if (targetPoint) {
          // Convert to smooth point and add handles
          targetPoint.type = PointType.SMOOTH;
          targetPoint.handleOut = snappedPoint;
          
          // Mirror handle for symmetric smooth point
          const dx = snappedPoint.x - startPoint.x;
          const dy = snappedPoint.y - startPoint.y;
          targetPoint.handleIn = {
            x: startPoint.x - dx,
            y: startPoint.y - dy,
          };
          
          this.curveState.dragState.isDragging = true;
          this.curveState.mode = CurveToolMode.DRAGGING_HANDLE;
          // Immediate update when starting handle drag for instant feedback
          this.updateState();
        }
      }
      return true;
    }

    if (this.curveState.mode === CurveToolMode.DRAGGING_HANDLE && this.curveState.dragState) {
      const { pointId, dragType } = this.curveState.dragState;
      const targetPoint = this.curveState.points.find(p => p.id === pointId);
      
      if (targetPoint) {
        if (dragType === 'handle_in') {
          targetPoint.handleIn = snappedPoint;
          
          if (targetPoint.type === PointType.SMOOTH && targetPoint.handleOut) {
            // Mirror handle for smooth point
            const dx = targetPoint.x - snappedPoint.x;
            const dy = targetPoint.y - snappedPoint.y;
            targetPoint.handleOut = {
              x: targetPoint.x + dx,
              y: targetPoint.y + dy,
            };
            
          }
        } else if (dragType === 'handle_out') {
          targetPoint.handleOut = snappedPoint;
          
          if (targetPoint.type === PointType.SMOOTH && targetPoint.handleIn) {
            // Mirror handle for smooth point
            const dx = targetPoint.x - snappedPoint.x;
            const dy = targetPoint.y - snappedPoint.y;
            targetPoint.handleIn = {
              x: targetPoint.x + dx,
              y: targetPoint.y + dy,
            };
            
          }
        }
        // Use immediate updates during handle dragging for responsive feedback
        this.notifyListeners();
      }
      return true;
    }

    if (this.curveState.mode === CurveToolMode.DRAGGING_POINT && this.curveState.dragState) {
      const { pointId, startPoint, startHandleIn, startHandleOut } = this.curveState.dragState;
      const targetPoint = this.curveState.points.find(p => p.id === pointId);
      
      if (targetPoint) {
        const dx = snappedPoint.x - startPoint.x;
        const dy = snappedPoint.y - startPoint.y;
        
        targetPoint.x = snappedPoint.x;
        targetPoint.y = snappedPoint.y;
        
        // Move handles with the point
        if (startHandleIn) {
          targetPoint.handleIn = {
            x: startHandleIn.x + dx,
            y: startHandleIn.y + dy,
          };
        }
        if (startHandleOut) {
          targetPoint.handleOut = {
            x: startHandleOut.x + dx,
            y: startHandleOut.y + dy,
          };
        }
        // Use immediate updates during point dragging for responsive feedback
        this.notifyListeners();
      }
      return true;
    }

    return false;
  };

  handleMouseUp = (e: MouseEvent<SVGElement>, context: MouseEventContext): boolean => {
    if (!this.curveState.isActive) return false;

    

    if (this.curveState.mode === CurveToolMode.DRAGGING_HANDLE || 
        this.curveState.mode === CurveToolMode.DRAGGING_POINT) {
      
      this.curveState.dragState = undefined;
      this.curveState.mode = CurveToolMode.CREATING;
      
      // Final immediate update when dragging ends - ensure we capture the final state
      this.updateState();
      return true;
    }

    // Handle the case where we were potentially creating a smooth point but didn't drag
    if (this.curveState.mode === CurveToolMode.EDITING && this.curveState.dragState && !this.curveState.dragState.isDragging) {
      // No drag detected, keep as corner point and return to creating mode
      
      this.curveState.dragState = undefined;
      this.curveState.mode = CurveToolMode.CREATING;
      this.updateState();
      return true;
    }

    // Don't process double-click to finish - only handle via isDoubleClick in handleMouseDown
    if (this.curveState.mode === CurveToolMode.CREATING) {
      
      return false; // Let other handlers process this
    }

    return false;
  };

  private togglePointType = (point: CurvePoint) => {
    // Save current state to history BEFORE making changes
    const { pushToHistory } = this.editorStore;
    pushToHistory();

    switch (point.type) {
      case PointType.CORNER:
        point.type = PointType.SMOOTH;
        if (!point.handleIn && !point.handleOut) {
          // Add default handles
          point.handleIn = { x: point.x - 30, y: point.y };
          point.handleOut = { x: point.x + 30, y: point.y };
        }
        break;
      case PointType.SMOOTH:
        point.type = PointType.ASYMMETRIC;
        break;
      case PointType.ASYMMETRIC:
        point.type = PointType.CORNER;
        point.handleIn = undefined;
        point.handleOut = undefined;
        break;
    }
    
    this.updateState();
  };

  // Public method to change point type with history support
  setPointType = (pointId: string, newType: PointType) => {
    const point = this.curveState.points.find(p => p.id === pointId);
    if (!point) return;

    // Save current state to history BEFORE making changes
    const { pushToHistory } = this.editorStore;
    pushToHistory();

    point.type = newType;
    
    switch (newType) {
      case PointType.CORNER:
        point.handleIn = undefined;
        point.handleOut = undefined;
        break;
      case PointType.SMOOTH:
        if (!point.handleIn && !point.handleOut) {
          // Add default handles
          point.handleIn = { x: point.x - 30, y: point.y };
          point.handleOut = { x: point.x + 30, y: point.y };
        }
        break;
      case PointType.ASYMMETRIC:
        if (!point.handleIn && !point.handleOut) {
          // Add default handles
          point.handleIn = { x: point.x - 30, y: point.y };
          point.handleOut = { x: point.x + 30, y: point.y };
        }
        break;
    }
    
    this.updateState();
  };

  // Public method to delete selected point with history support
  deleteSelectedPoint = () => {
    if (!this.curveState.selectedPointId) return;

    // Save current state to history BEFORE making changes
    const { pushToHistory } = this.editorStore;
    pushToHistory();

    this.curveState.points = this.curveState.points.filter(
      p => p.id !== this.curveState.selectedPointId
    );
    this.curveState.selectedPointId = undefined;
    
    // If we have less than 2 points, we can't have a valid path
    if (this.curveState.points.length < 2) {
      this.curveState.points = [];
      this.curveState.mode = CurveToolMode.CREATING;
    }
    
    this.updateState();
  };

  // Add method to add point in the middle of a segment
  addPointToSegment = (segmentIndex: number, t: number = 0.5) => {
    if (segmentIndex >= this.curveState.points.length - 1) return;
    
    // Save current state to history BEFORE making changes
    const { pushToHistory } = this.editorStore;
    pushToHistory();
    
    const point1 = this.curveState.points[segmentIndex];
    const point2 = this.curveState.points[segmentIndex + 1];
    
    // Calculate intermediate point
    const newPoint: CurvePoint = {
      id: `curve-point-${Date.now()}`,
      x: point1.x + (point2.x - point1.x) * t,
      y: point1.y + (point2.y - point1.y) * t,
      type: PointType.CORNER,
      selected: true,
    };
    
    // Insert new point
    this.curveState.points.splice(segmentIndex + 1, 0, newPoint);
    
    // Update selection
    this.curveState.points.forEach(p => p.selected = false);
    newPoint.selected = true;
    this.curveState.selectedPointId = newPoint.id;
    
    this.updateState();
  };

  // Add method to break handles (make asymmetric)
  breakHandles = (pointId: string) => {
    const point = this.curveState.points.find(p => p.id === pointId);
    if (point && point.type === PointType.SMOOTH) {
      // Save current state to history BEFORE making changes
      const { pushToHistory } = this.editorStore;
      pushToHistory();
      
      point.type = PointType.ASYMMETRIC;
      this.updateState();
    }
  };

  // Add method to force update the editor
  forceUpdate = () => {
    if (this.editorStore && this.editorStore.forceRender) {
      
      this.editorStore.forceRender();
    } else {
      console.warn('CurvesManager: forceRender not available in editorStore');
    }
  };

  // Method to create smooth point with handles when dragging
  createSmoothPoint = (point: Point, dragPoint: Point): CurvePoint => {
    const dx = dragPoint.x - point.x;
    const dy = dragPoint.y - point.y;
    
    return {
      id: `curve-point-${Date.now()}`,
      x: point.x,
      y: point.y,
      type: PointType.SMOOTH,
      handleIn: { x: point.x - dx, y: point.y - dy },
      handleOut: { x: point.x + dx, y: point.y + dy },
      selected: true,
    };
  };
}

export const curvesManager = new CurvesManager();
