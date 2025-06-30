import { MouseEvent } from 'react';
import { MouseEventContext } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { generateId } from '../../utils/id-utils';
import { SVGCommand, EditorCommandType, Point } from '../../types';
import { tldrawSmoother, SmoothedPoint } from './TldrawSmoother';

interface PencilState {
  isDrawing: boolean;
  currentPath: string | null;
  currentSubPath: string | null;
  rawPoints: SmoothedPoint[];
  lastPoint: Point | null;
  strokeStyle: {
    stroke: string;
    strokeWidth: number;
    fill: string;
    strokeLinecap: 'round';
    strokeLinejoin: 'round';
  };
}

class PencilManager {
  private state: PencilState = {
    isDrawing: false,
    currentPath: null,
    currentSubPath: null,
    rawPoints: [],
    lastPoint: null,
    strokeStyle: {
      stroke: '#000000',
      strokeWidth: 2,
      fill: 'none',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    }
  };

  private editorStore: any;
  private readonly minDistance = 1.5; // Reduced for more detail capture
  private smoothingFactor = 0.85; // Increased for smoother result
  private readonly maxPoints = 500; // Reduced for better performance
  private lastUpdateTime = 0;
  private readonly updateThrottle = 12; // Increased frequency for smoother drawing
  private svgRef: React.RefObject<SVGSVGElement | null> | null = null;

  setEditorStore(store: any) {
    console.log('PencilManager: Setting editor store:', store);
    this.editorStore = store;
  }

  setSVGRef(ref: React.RefObject<SVGSVGElement | null>) {
    this.svgRef = ref;
  }

  isPencilMode(): boolean {
    if (!this.editorStore) return false;
    const { mode } = this.editorStore;
    return mode.current === 'create' && mode.createMode?.commandType === 'PENCIL';
  }

  handleMouseDown = (e: MouseEvent<SVGElement>, context: MouseEventContext): boolean => {
    console.log('PencilManager.handleMouseDown called', { isPencilMode: this.isPencilMode() });
    
    if (!this.isPencilMode()) return false;

    e.preventDefault();
    e.stopPropagation();

    const { svgPoint } = context;
    
    // Get current store state
    if (!this.editorStore) {
      console.error('PencilManager: EditorStore not initialized');
      return false;
    }

    const {
      addPath,
      addSubPath,
      addCommand,
      pushToHistory,
    } = this.editorStore;

    // Start new drawing session
    this.state.isDrawing = true;
    this.state.rawPoints = [{ ...svgPoint, timestamp: Date.now() }];
    this.state.lastPoint = svgPoint;

    // Create new path and subpath
    const pathId = addPath(this.state.strokeStyle);
    const subPathId = addSubPath(pathId);
    
    this.state.currentPath = pathId;
    this.state.currentSubPath = subPathId;

    // Add initial move command
    const moveCommand: Omit<SVGCommand, 'id'> = {
      command: 'M',
      x: svgPoint.x,
      y: svgPoint.y
    };

    addCommand(subPathId, moveCommand);
    pushToHistory();

    // Set up global mouse events for drawing
    this.setupGlobalMouseEvents();

    console.log('Pencil drawing started:', { pathId, subPathId, point: svgPoint });

    return true;
  };

  handleMouseMove = (e: MouseEvent<SVGElement>, context: MouseEventContext): boolean => {
    if (!this.isPencilMode() || !this.state.isDrawing) return false;

    console.log('PencilManager.handleMouseMove called', { 
      isDrawing: this.state.isDrawing, 
      pointsCount: this.state.rawPoints.length 
    });

    e.preventDefault();
    e.stopPropagation();

    // Throttle updates for better performance
    const now = Date.now();
    if (now - this.lastUpdateTime < this.updateThrottle) return true;
    this.lastUpdateTime = now;

    const { svgPoint } = context;
    const { lastPoint } = this.state;

    if (!lastPoint || !this.state.currentSubPath || !this.editorStore) return true;

    // Calculate distance from last point to reduce noise
    const distance = Math.sqrt(
      Math.pow(svgPoint.x - lastPoint.x, 2) + 
      Math.pow(svgPoint.y - lastPoint.y, 2)
    );

    if (distance < this.minDistance) return true;

    // Add point to raw points collection
    this.state.rawPoints.push({ ...svgPoint, timestamp: Date.now() });
    this.state.lastPoint = svgPoint;

    // Limit the number of points for performance
    if (this.state.rawPoints.length > this.maxPoints) {
      // Keep the most recent points
      const keepPoints = Math.floor(this.maxPoints * 0.8);
      this.state.rawPoints = [
        this.state.rawPoints[0], // Keep the first point (move command)
        ...this.state.rawPoints.slice(-keepPoints)
      ];
    }

    // Update the path with smoothed points
    this.updateSmoothPath();

    return true;
  };

  handleMouseUp = (e: MouseEvent<SVGElement>, context: MouseEventContext): boolean => {
    if (!this.isPencilMode() || !this.state.isDrawing) return false;

    e.preventDefault();
    e.stopPropagation();

    console.log('Pencil drawing finished, total points:', this.state.rawPoints.length);

    // Finish drawing
    this.state.isDrawing = false;

    // Final smoothing pass
    this.updateSmoothPath();

    // Push final state to history
    if (this.editorStore) {
      this.editorStore.pushToHistory();
    }

    // Reset state
    this.resetDrawingState();

    return true;
  };

  private updateSmoothPath() {
    if (!this.state.currentSubPath || this.state.rawPoints.length < 2 || !this.editorStore) return;

    const { replaceSubPathCommands } = this.editorStore;

    // Apply tldraw-style smoothing and simplification
    const smoothedPoints = tldrawSmoother.smoothPoints(this.state.rawPoints);
    
    // Calculate pressure for potential variable stroke width
    const pointsWithPressure = tldrawSmoother.calculatePressure(smoothedPoints);

    // Convert smoothed points to SVG commands
    const svgCommands: Omit<SVGCommand, 'id'>[] = [];
    
    if (pointsWithPressure.length > 0) {
      // Start with move command
      svgCommands.push({
        command: 'M',
        x: pointsWithPressure[0].x,
        y: pointsWithPressure[0].y
      });

      // Create smooth curves using cubic bezier commands for better smoothness
      if (pointsWithPressure.length >= 4) {
        for (let i = 1; i < pointsWithPressure.length - 2; i += 3) {
          const p0 = pointsWithPressure[i - 1] || pointsWithPressure[0];
          const p1 = pointsWithPressure[i];
          const p2 = pointsWithPressure[i + 1];
          const p3 = pointsWithPressure[i + 2] || pointsWithPressure[pointsWithPressure.length - 1];
          
          // Calculate smooth control points
          const cp1x = p0.x + (p1.x - p0.x) * 0.6;
          const cp1y = p0.y + (p1.y - p0.y) * 0.6;
          const cp2x = p3.x - (p3.x - p2.x) * 0.6;
          const cp2y = p3.y - (p3.y - p2.y) * 0.6;

          svgCommands.push({
            command: 'C',
            x1: cp1x,
            y1: cp1y,
            x2: cp2x,
            y2: cp2y,
            x: p3.x,
            y: p3.y
          });
        }
        
        // Add final line to last point if needed
        const lastPoint = pointsWithPressure[pointsWithPressure.length - 1];
        const secondLastPoint = pointsWithPressure[pointsWithPressure.length - 2];
        if (lastPoint && secondLastPoint && 
            (Math.abs(lastPoint.x - secondLastPoint.x) > 1 || 
             Math.abs(lastPoint.y - secondLastPoint.y) > 1)) {
          svgCommands.push({
            command: 'L',
            x: lastPoint.x,
            y: lastPoint.y
          });
        }
      } else {
        // Simple lines for short strokes
        for (let i = 1; i < pointsWithPressure.length; i++) {
          svgCommands.push({
            command: 'L',
            x: pointsWithPressure[i].x,
            y: pointsWithPressure[i].y
          });
        }
      }
    }

    // Replace subpath commands with smoothed version
    replaceSubPathCommands(this.state.currentSubPath, svgCommands);
  }

  private resetDrawingState() {
    this.state.currentPath = null;
    this.state.currentSubPath = null;
    this.state.rawPoints = [];
    this.state.lastPoint = null;
  }

  // Method to change pencil stroke style
  setStrokeStyle(style: Partial<PencilState['strokeStyle']>) {
    this.state.strokeStyle = { ...this.state.strokeStyle, ...style };
  }

  getStrokeStyle() {
    return { ...this.state.strokeStyle };
  }

  // Method to set smoothing parameters
  setSmoothingFactor(factor: number) {
    this.smoothingFactor = Math.max(0, Math.min(1, factor));
  }

  // Clean up method
  destroy() {
    this.resetDrawingState();
    this.removeGlobalMouseEvents();
  }

  private setupGlobalMouseEvents() {
    document.addEventListener('mousemove', this.handleGlobalMouseMove);
    document.addEventListener('mouseup', this.handleGlobalMouseUp);
  }

  private removeGlobalMouseEvents() {
    document.removeEventListener('mousemove', this.handleGlobalMouseMove);
    document.removeEventListener('mouseup', this.handleGlobalMouseUp);
  }

  private handleGlobalMouseMove = (e: globalThis.MouseEvent) => {
    if (!this.state.isDrawing) return;

    // Find the SVG element
    const svg = document.querySelector('.svg-editor svg') as SVGSVGElement;
    if (!svg) return;

    // Convert global mouse event to SVG coordinates
    const svgRect = svg.getBoundingClientRect();
    const svgPoint = this.clientToSVGPoint(e.clientX, e.clientY, svgRect);

    console.log('Global mouse move:', { svgPoint, clientX: e.clientX, clientY: e.clientY });

    this.addPointToPath(svgPoint);
  };

  private handleGlobalMouseUp = (e: globalThis.MouseEvent) => {
    if (!this.state.isDrawing) return;

    console.log('Pencil drawing finished via global mouseup, total points:', this.state.rawPoints.length);

    // Finish drawing
    this.state.isDrawing = false;

    // Final smoothing pass
    this.updateSmoothPath();

    // Push final state to history
    if (this.editorStore) {
      this.editorStore.pushToHistory();
    }

    // Reset state and remove global listeners
    this.resetDrawingState();
    this.removeGlobalMouseEvents();
  };

  private clientToSVGPoint(clientX: number, clientY: number, svgRect: DOMRect): Point {
    // Find the main SVG element
    const svg = document.querySelector('.svg-editor svg') as SVGSVGElement;
    if (!svg || !this.editorStore) {
      return { x: 0, y: 0 };
    }

    // Convert client coordinates to SVG coordinates
    const pt = svg.createSVGPoint();
    pt.x = clientX - svgRect.left;
    pt.y = clientY - svgRect.top;
    
    const screenCTM = svg.getScreenCTM();
    if (screenCTM) {
      const svgPoint = pt.matrixTransform(screenCTM.inverse());
      
      // Apply viewport transform
      const { viewport } = this.editorStore;
      return {
        x: (svgPoint.x - viewport.pan.x) / viewport.zoom,
        y: (svgPoint.y - viewport.pan.y) / viewport.zoom
      };
    }
    
    return { x: pt.x, y: pt.y };
  }

  private addPointToPath(svgPoint: Point) {
    const { lastPoint } = this.state;

    if (!lastPoint || !this.state.currentSubPath || !this.editorStore) return;

    // Throttle updates for better performance
    const now = Date.now();
    if (now - this.lastUpdateTime < this.updateThrottle) return;
    this.lastUpdateTime = now;

    // Calculate distance from last point to reduce noise
    const distance = Math.sqrt(
      Math.pow(svgPoint.x - lastPoint.x, 2) + 
      Math.pow(svgPoint.y - lastPoint.y, 2)
    );

    if (distance < this.minDistance) return;

    // Add point to raw points collection
    this.state.rawPoints.push({ ...svgPoint, timestamp: Date.now() });
    this.state.lastPoint = svgPoint;

    // Limit the number of points for performance
    if (this.state.rawPoints.length > this.maxPoints) {
      // Keep the most recent points
      const keepPoints = Math.floor(this.maxPoints * 0.8);
      this.state.rawPoints = [
        this.state.rawPoints[0], // Keep the first point (move command)
        ...this.state.rawPoints.slice(-keepPoints)
      ];
    }

    // Update the path with smoothed points
    this.updateSmoothPath();
  }
}

export const pencilManager = new PencilManager();
