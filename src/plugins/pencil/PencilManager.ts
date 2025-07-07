import { MouseEvent } from 'react';
import { MouseEventContext } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { generateId } from '../../utils/id-utils';
import { SVGCommand, EditorCommandType, Point } from '../../types';
import { tldrawSmoother, SmoothedPoint } from './TldrawSmoother';
import { PencilStorage, PencilStorageData } from './PencilStorage';

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
  private readonly minDistance = 0.1; // Much more sensitive for testing
  private smoothingFactor = 0.85; // Increased for smoother result
  private readonly maxPoints = 500; // Reduced for better performance
  private lastUpdateTime = 0;
  private readonly updateThrottle = 1; // Very responsive for debugging

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Load settings from localStorage
   */
  private loadFromStorage() {
    const savedData = PencilStorage.load();
    if (savedData) {
      // Apply stroke style
      this.state.strokeStyle = { ...savedData.strokeStyle };
      
      // Apply smoother parameters
      tldrawSmoother.setSimplifyTolerance(savedData.smootherParams.simplifyTolerance);
      tldrawSmoother.setSmoothingFactor(savedData.smootherParams.smoothingFactor);
      tldrawSmoother.setMinDistance(savedData.smootherParams.minDistance);
      tldrawSmoother.setPressureDecay(savedData.smootherParams.pressureDecay);
      tldrawSmoother.setLowPassAlpha(savedData.smootherParams.lowPassAlpha);
    }
  }

  /**
   * Save current settings to localStorage
   */
  private saveToStorage() {
    const data: PencilStorageData = {
      strokeStyle: { ...this.state.strokeStyle },
      smootherParams: tldrawSmoother.getParameters()
    };
    PencilStorage.save(data);
  }

  private svgRef: React.RefObject<SVGSVGElement | null> | null = null;

  setEditorStore(store: any) {
    this.editorStore = store;
  }

  setSVGRef(ref: React.RefObject<SVGSVGElement | null>) {
    this.svgRef = ref;
  }

  isPencilMode(): boolean {
    if (!this.editorStore) return false;
    const state = useEditorStore.getState();
    const { mode } = state;
    const isPencil = mode.current === 'create' && mode.createMode?.commandType === 'PENCIL';
    return isPencil;
  }

  handleMouseDown = (e: MouseEvent<SVGElement>, context: MouseEventContext): boolean => {
    if (!this.isPencilMode()) {
      return false;
    }
    e.preventDefault();
    e.stopPropagation();
    const { svgPoint } = context;
    // Get current store state
    if (!this.editorStore) {
      console.error('PencilManager: EditorStore not initialized');
      return false;
    }

    // Start new drawing session but don't create path yet
    this.state.isDrawing = true;
    this.state.rawPoints = [{ ...svgPoint, timestamp: Date.now() }];
    this.state.lastPoint = svgPoint;
    
    // Don't create path yet - we'll create it only when we start drawing
    this.state.currentPath = null;
    this.state.currentSubPath = null;

    // Set up global mouse events for drawing
    this.setupGlobalMouseEvents();

    return true;
  };

  handleMouseMove = (e: MouseEvent<SVGElement>, context: MouseEventContext): boolean => {
    if (!this.isPencilMode() || !this.state.isDrawing) {
      // 
      return false;
    }

    e.preventDefault();
    e.stopPropagation();

    // Throttle updates for better performance
    const now = Date.now();
    if (now - this.lastUpdateTime < this.updateThrottle) {
      
      return true;
    }
    this.lastUpdateTime = now;

    const { svgPoint } = context;
    const { lastPoint } = this.state;

    if (!lastPoint || !this.editorStore) {
      
      return true;
    }

    

    // Calculate distance from last point to reduce noise
    const distance = Math.sqrt(
      Math.pow(svgPoint.x - lastPoint.x, 2) + 
      Math.pow(svgPoint.y - lastPoint.y, 2)
    );

    if (distance < this.minDistance) {
      
      return true;
    }

    // If this is the first real movement (second point), create the path and save state
    if (this.state.rawPoints.length === 1 && this.editorStore) {
      // Save the clean state BEFORE creating any path
      this.editorStore.pushToHistory();
      
      // Now create the path
      const { addPath } = this.editorStore;
      const firstPoint = this.state.rawPoints[0];
      const pathId = addPath(this.state.strokeStyle, firstPoint.x, firstPoint.y);
      
      // Get the existing subpath that was created with the path
      const currentState = useEditorStore.getState();
      const createdPath = currentState.paths.find((p: any) => p.id === pathId);
      const subPathId = createdPath?.subPaths[0]?.id;
      
      if (!subPathId) {
        console.error('PencilManager: Failed to find created subpath');
        return true;
      }
      
      this.state.currentPath = pathId;
      this.state.currentSubPath = subPathId;
    }

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

    // Check if we have meaningful drawing content (more than just the initial point)
    const hasDrawingContent = this.state.rawPoints.length > 1;

    if (hasDrawingContent && this.state.currentPath) {
      // Final smoothing pass
      this.updateSmoothPath();
      
      // No need to push to history here - we already saved the initial state
      // when the first movement happened
    } else {
      // If we only have the initial point, no path was created, so nothing to clean up
      // The state remains clean as if nothing happened
    }

    // Finish drawing
    this.state.isDrawing = false;

    // Reset state
    this.resetDrawingState();

    return true;
  };

  private updateSmoothPath() {
    if (!this.state.currentSubPath || this.state.rawPoints.length < 1 || !this.editorStore) return;

    const { replaceSubPathCommands } = this.editorStore;

    // For a single point, create a minimal visible mark
    if (this.state.rawPoints.length === 1) {
      const point = this.state.rawPoints[0];
      
      const svgCommands: Omit<SVGCommand, 'id'>[] = [
        { command: 'M', x: point.x, y: point.y },
        { command: 'L', x: point.x + 0.5, y: point.y } // Very small line to make it visible
      ];
      
      replaceSubPathCommands(this.state.currentSubPath, svgCommands);
      return;
    }

    // Apply tldraw-style smoothing and simplification
    const smoothedPoints = tldrawSmoother.smoothPoints(this.state.rawPoints);
    
    // Calculate pressure for potential variable stroke width
    const pointsWithPressure = tldrawSmoother.calculatePressure(smoothedPoints);

    // Convert smoothed points to SVG commands
    const svgCommands: Omit<SVGCommand, 'id'>[] = [];
    
    if (pointsWithPressure.length > 0) {
      // Start with move command - use the first smoothed point
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
    this.saveToStorage(); // Auto-save when style changes
  }

  getStrokeStyle() {
    return { ...this.state.strokeStyle };
  }

  // Method to set smoothing parameters
  setSmoothingFactor(factor: number) {
    this.smoothingFactor = Math.max(0, Math.min(1, factor));
  }

  // Methods for accessing smoother parameters
  getSmootherParameters() {
    return tldrawSmoother.getParameters();
  }

  setSmootherParameter(param: string, value: number) {
    switch (param) {
      case 'simplifyTolerance':
        tldrawSmoother.setSimplifyTolerance(value);
        break;
      case 'smoothingFactor':
        tldrawSmoother.setSmoothingFactor(value);
        break;
      case 'minDistance':
        tldrawSmoother.setMinDistance(value);
        break;
      case 'pressureDecay':
        tldrawSmoother.setPressureDecay(value);
        break;
      case 'lowPassAlpha':
        tldrawSmoother.setLowPassAlpha(value);
        break;
    }
    this.saveToStorage(); // Auto-save when parameters change
  }

  resetSmootherToDefaults() {
    tldrawSmoother.resetToDefaults();
    this.saveToStorage(); // Auto-save when reset
  }

  // Preset methods
  applyPreciseDrawingPreset() {
    tldrawSmoother.applyPreciseDrawingPreset();
    this.saveToStorage(); // Auto-save when preset applied
  }

  applyFluidDrawingPreset() {
    tldrawSmoother.applyFluidDrawingPreset();
    this.saveToStorage(); // Auto-save when preset applied
  }

  applyQuickSketchPreset() {
    tldrawSmoother.applyQuickSketchPreset();
    this.saveToStorage(); // Auto-save when preset applied
  }

  /**
   * Clear saved settings and reset to defaults
   */
  clearSavedSettings() {
    PencilStorage.clear();
    
    // Reset to defaults
    const defaults = PencilStorage.getDefaults();
    this.state.strokeStyle = { ...defaults.strokeStyle };
    
    tldrawSmoother.setSimplifyTolerance(defaults.smootherParams.simplifyTolerance);
    tldrawSmoother.setSmoothingFactor(defaults.smootherParams.smoothingFactor);
    tldrawSmoother.setMinDistance(defaults.smootherParams.minDistance);
    tldrawSmoother.setPressureDecay(defaults.smootherParams.pressureDecay);
    tldrawSmoother.setLowPassAlpha(defaults.smootherParams.lowPassAlpha);
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

    // Ignore synthetic mouse events from touch to prevent double processing
    const syntheticMouseEvent = e as any;
    if (syntheticMouseEvent.fromTouch) return;

    // Find the SVG element
    const svg = document.querySelector('.svg-editor svg') as SVGSVGElement;
    if (!svg) return;

    // Convert global mouse event to SVG coordinates
    const svgRect = svg.getBoundingClientRect();
    const svgPoint = this.clientToSVGPoint(e.clientX, e.clientY, svgRect);

    this.addPointToPath(svgPoint);
  };

  private handleGlobalMouseUp = (e: globalThis.MouseEvent) => {
    if (!this.state.isDrawing) return;

    // Ignore synthetic mouse events from touch to prevent double processing
    const syntheticMouseEvent = e as any;
    if (syntheticMouseEvent.fromTouch) return;

    // Check if we have meaningful drawing content (more than just the initial point)
    const hasDrawingContent = this.state.rawPoints.length > 1;

    if (hasDrawingContent && this.state.currentPath) {
      // Final smoothing pass
      this.updateSmoothPath();
      
      // No need to push to history here - we already saved the initial state
      // when the first movement happened
    } else {
      // If we only have the initial point, no path was created, so nothing to clean up
      // The state remains clean as if nothing happened
    }

    // Finish drawing
    this.state.isDrawing = false;

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

    if (!lastPoint || !this.editorStore) return;

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

    // If this is the first real movement (second point), create the path and save state
    if (this.state.rawPoints.length === 1 && this.editorStore) {
      // Save the clean state BEFORE creating any path
      this.editorStore.pushToHistory();
      
      // Now create the path
      const { addPath } = this.editorStore;
      const firstPoint = this.state.rawPoints[0];
      const pathId = addPath(this.state.strokeStyle, firstPoint.x, firstPoint.y);
      
      // Get the existing subpath that was created with the path
      const currentState = useEditorStore.getState();
      const createdPath = currentState.paths.find((p: any) => p.id === pathId);
      const subPathId = createdPath?.subPaths[0]?.id;
      
      if (!subPathId) {
        console.error('PencilManager: Failed to find created subpath');
        return;
      }
      
      this.state.currentPath = pathId;
      this.state.currentSubPath = subPathId;
    }

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
