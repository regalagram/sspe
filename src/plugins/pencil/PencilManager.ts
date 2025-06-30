import { MouseEvent } from 'react';
import { MouseEventContext } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { generateId } from '../../utils/id-utils';
import { getPointSmooth } from '../../utils/point-smooth';
import { SVGCommand, EditorCommandType, Point } from '../../types';

interface PencilState {
  isDrawing: boolean;
  currentPath: string | null;
  currentSubPath: string | null;
  rawPoints: Point[];
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
  private readonly minDistance = 3; // Minimum distance between points to reduce noise
  private smoothingFactor = 0.5; // Smoothing intensity (0-1)
  private readonly maxPoints = 1000; // Maximum points before simplification
  private lastUpdateTime = 0;
  private readonly updateThrottle = 16; // ~60fps throttling (16ms)
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
    this.state.rawPoints = [svgPoint];
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
    this.state.rawPoints.push(svgPoint);
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

    // Convert raw points to basic line commands
    const rawCommands: Omit<SVGCommand, 'id'>[] = [];
    
    // Start with move command
    rawCommands.push({
      command: 'M',
      x: this.state.rawPoints[0].x,
      y: this.state.rawPoints[0].y
    });

    // Add line commands for each subsequent point
    for (let i = 1; i < this.state.rawPoints.length; i++) {
      rawCommands.push({
        command: 'L',
        x: this.state.rawPoints[i].x,
        y: this.state.rawPoints[i].y
      });
    }

    // Convert to SVGCommand format with IDs for smoothing
    const commandsWithIds: SVGCommand[] = rawCommands.map(cmd => ({
      id: generateId(),
      ...cmd
    }));

    // Apply smoothing only if we have enough points
    let finalCommands = commandsWithIds;
    if (commandsWithIds.length > 3) {
      try {
        finalCommands = getPointSmooth(commandsWithIds);
      } catch (error) {
        console.warn('Smoothing failed, using raw commands:', error);
      }
    }

    // Replace subpath commands with smoothed version
    const commandsWithoutIds = finalCommands.map(({ id, ...cmd }) => cmd);
    replaceSubPathCommands(this.state.currentSubPath, commandsWithoutIds);
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
    this.state.rawPoints.push(svgPoint);
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
