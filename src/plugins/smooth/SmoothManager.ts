import React from 'react';
import { useEditorStore } from '../../store/editorStore';
import { toolModeManager } from '../../core/ToolModeManager';
import { getSVGPoint } from '../../utils/transform-utils';
import type { Point, SVGCommand } from '../../types';
import type { PointerEventContext } from '../../core/PluginSystem';
import { generateId } from '../../utils/id-utils';

interface SmoothSettings {
  radius: number;
  strength: number;
  tolerance: number;
}

export class SmoothManager {
  private editorStore: any = null;
  private isActive = false;
  private settings: SmoothSettings = {
    radius: 18,
    strength: 0.35,
    tolerance: 2.0
  };
  private currentPreviewPath: string = '';
  private currentFeedbackPath: string = '';
  private isProcessing = false;
  
  // Estado para drag continuo (igual que en el ejemplo HTML)
  private isDragging = false;
  private currentSubPathInfo: any = null;
  private lastSmoothPoint: Point | null = null;

  setEditorStore(store: any) {
    this.editorStore = store;
  }

  getSettings(): SmoothSettings {
    return { ...this.settings };
  }

  updateSettings(newSettings: Partial<SmoothSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  isActiveTool(): boolean {
    return this.isActive;
  }

  activateTool(): void {
    this.isActive = true;
    toolModeManager.setMode('smooth' as any);
    useEditorStore.getState().setMode('smooth' as any);
  }

  deactivateTool(): void {
    this.isActive = false;
    this.currentPreviewPath = '';
    this.currentFeedbackPath = '';
    
    // Clear drag state
    this.isDragging = false;
    this.currentSubPathInfo = null;
    this.lastSmoothPoint = null;
    
    toolModeManager.setMode('select');
  }

  // External activation/deactivation (llamado por ToolModeManager)
  activateExternally(): void {
    this.isActive = true;
    useEditorStore.getState().setMode('smooth' as any);
  }

  deactivateExternally(): void {
    this.isActive = false;
    this.currentPreviewPath = '';
    this.currentFeedbackPath = '';
    
    // Clear drag state
    this.isDragging = false;
    this.currentSubPathInfo = null;
    this.lastSmoothPoint = null;
  }

  destroy(): void {
    this.deactivateTool();
  }

  // Handlers de pointer events
  handlePointerDown = (event: React.PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
    if (!this.isActive) return false;

    const point = this.getPointFromEvent(event);
    if (!point) return false;

    // Find subpath under cursor
    const subPathInfo = this.findSubPathAtPoint(point);
    if (!subPathInfo) {
      return false;
    }

    // Start drag state (same as HTML example)
    this.isDragging = true;
    this.currentSubPathInfo = subPathInfo;
    this.lastSmoothPoint = point;
    
    // Pushear al historial una sola vez al inicio
    const store = useEditorStore.getState();
    store.pushToHistory();

    // Apply initial smooth
    this.applySmoothToSubPathContinuous(subPathInfo, point);
    
    return true; // Capturamos el evento
  };

  handlePointerMove = (event: React.PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
    if (!this.isActive) return false;

    const point = this.getPointFromEvent(event);
    if (!point) return false;

    // Show preview of influence area
    this.updatePreview(point);

    // If dragging, apply continuous smooth (same as HTML example)
    if (this.isDragging && this.currentSubPathInfo) {
      // Check minimum distance to avoid excessive processing
      const minDistance = 1.5;
      if (!this.lastSmoothPoint || 
          Math.hypot(point.x - this.lastSmoothPoint.x, point.y - this.lastSmoothPoint.y) >= minDistance) {
        
        // KEY: Get CURRENT subpath state (with accumulated changes)
        const store = useEditorStore.getState();
        const currentPath = store.paths.find(p => p.id === this.currentSubPathInfo.path.id);
        const currentSubPath = currentPath?.subPaths.find(sp => sp.id === this.currentSubPathInfo.subPath.id);
        
        if (currentSubPath) {
          // Crear nuevo subPathInfo con el estado actual (acumulativo)
          const updatedSubPathInfo = {
            path: currentPath,
            subPath: currentSubPath
          };
          
          this.applySmoothToSubPathContinuous(updatedSubPathInfo, point);
          this.lastSmoothPoint = point;
        }
      }
      return true; // Capturamos el evento durante drag
    }
    
    return false;
  };

  handlePointerUp = (event: React.PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
    if (!this.isActive) return false;
    
    // Finalize drag state
    this.isDragging = false;
    this.currentSubPathInfo = null;
    this.lastSmoothPoint = null;
    
    this.clearPreview();
    this.clearFeedback();
    
    return false;
  };

  private getPointFromEvent(event: React.PointerEvent<SVGElement>): Point | null {
    try {
      const store = useEditorStore.getState();
      const svgElement = event.currentTarget.closest('svg') as SVGSVGElement;
      
      if (!svgElement) {
        return null;
      }
      
      // Create a mock svgRef for the getSVGPoint function
      const svgRef = { current: svgElement };
      const svgPoint = getSVGPoint(event as any, svgRef, store.viewport);
      
      return { 
        x: Math.round(svgPoint.x), 
        y: Math.round(svgPoint.y) 
      };
    } catch (error) {
      console.error('Error getting point from event:', error);
      return null;
    }
  }

  private findSubPathAtPoint(point: Point): any {
    const store = useEditorStore.getState();
    
    // Search in all paths
    for (const path of store.paths) {
      for (const subPath of path.subPaths) {
        if (this.isPointNearSubPath(point, subPath)) {
          return { path, subPath };
        }
      }
    }
    return null;
  }

  private isPointNearSubPath(point: Point, subPath: any): boolean {
    // Convert commands to points to check proximity
    const points = this.commandsToPoints(subPath.commands);
    const threshold = this.settings.radius;

    for (const p of points) {
      const distance = Math.hypot(point.x - p.x, point.y - p.y);
      if (distance <= threshold) {
        return true;
      }
    }
    return false;
  }

  private applySmoothToSubPath(subPathInfo: any, center: Point): void {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const { path, subPath } = subPathInfo;
    const store = useEditorStore.getState();

    try {
      
      // Push to history
      store.pushToHistory();

      // EXACT ALGORITHM FROM HTML EXAMPLE:
      this.applySmoothCore(subPathInfo, center);
      
      // Clear feedback after a delay
      setTimeout(() => {
        this.clearFeedback();
      }, 800);

    } catch (error) {
      console.error('Error applying smooth:', error);
      this.clearFeedback();
    } finally {
      this.isProcessing = false;
    }
  }

  // Function to apply continuous smooth without pushing to history each time
  private applySmoothToSubPathContinuous(subPathInfo: any, center: Point): void {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      
      // Don't push to history here - already done in pointerDown
      this.applySmoothCore(subPathInfo, center);

    } catch (error) {
      console.error('Error applying smooth continuous:', error);
      this.clearFeedback();
    } finally {
      this.isProcessing = false;
    }
  }

  // Core smooth algorithm (without history)
  private applySmoothCore(subPathInfo: any, center: Point): void {
    const { path, subPath } = subPathInfo;
    const store = useEditorStore.getState();
    
    // COMPLETELY LOCALIZED ALGORITHM WITH SMOOTH INTEGRATION
    
    // 1. Find which commands are within brush radius
    const affectedCommandIndices = this.findCommandsWithinRadius(subPath.commands, center, this.settings.radius);
    
    if (affectedCommandIndices.length === 0) {
      return;
    }
    
    // 2. Calcular rango extendido para preservar continuidad
    const { startIndex, endIndex } = this.getExtendedAffectedRange(affectedCommandIndices, subPath.commands.length);
    
    // 3. Extract segment with context to maintain continuity
    const segmentWithContext = this.extractSegmentWithContext(subPath.commands, startIndex, endIndex);
    
    if (!segmentWithContext || segmentWithContext.commands.length < 2) {
      return;
    }
    
    // 4. Apply smooth maintaining connection points
    const smoothedSegment = this.applySmoothWithContinuity(segmentWithContext, center);
    
    if (!smoothedSegment || smoothedSegment.length === 0) {
      return;
    }
    
    // 5. Integrate the smoothed segment maintaining perfect continuity
    const newCommands = this.integrateSmoothedSegment(
      subPath.commands, 
      smoothedSegment, 
      segmentWithContext.originalStartIndex,
      segmentWithContext.originalEndIndex
    );
    
    // 6. Validate continuity before applying
    if (this.validatePathContinuity(newCommands)) {
      store.replaceSubPathCommands(subPath.id, newCommands);
      
      // Show feedback of the actually modified section
      this.showLocalFeedback(newCommands, segmentWithContext.originalStartIndex, segmentWithContext.originalEndIndex);
    }
  }

  private applySmoothLocalized(commands: SVGCommand[], center: Point): SVGCommand[] {
    const { radius, strength, tolerance } = this.settings;
    
    // 1. Convert commands to dense points (same as in HTML example)
    const densePoints = this.commandsToDensePoints(commands, 1); // 1px resolution
    
    let affectedIndices: number[] = [];
    let moved: { index: number; point: Point }[] = [];
    
    // 2. Find points within radius and apply smoothing
    for (let i = 0; i < densePoints.length; i++) {
      const point = densePoints[i];
      const distance = Math.sqrt(
        Math.pow(point.x - center.x, 2) + 
        Math.pow(point.y - center.y, 2)
      );
      
      if (distance > radius) continue;
      
      // PROTECT start and end points - do not modify (same as in example)
      if (i === 0 || i === densePoints.length - 1) {
        affectedIndices.push(i); // Para feedback visual
        continue;
      }
      
      affectedIndices.push(i);
      
      // Simple smoothing: average with neighbors (same as example)
      let sumX = 0, sumY = 0, count = 0;
      
      for (let k = -2; k <= 2; k++) { // Use more neighbors for curves
        const j = i + k;
        if (j >= 0 && j < densePoints.length) {
          sumX += densePoints[j].x;
          sumY += densePoints[j].y;
          count++;
        }
      }
      
      if (count > 0) {
        const avgX = sumX / count;
        const avgY = sumY / count;
        
        const weight = strength * (1 - distance / radius);
        
        const newX = point.x + (avgX - point.x) * weight;
        const newY = point.y + (avgY - point.y) * weight;
        
        moved.push({ index: i, point: { x: newX, y: newY } });
      }
    }
    
    if (moved.length === 0) {
      return commands;
    }
    
    // 3. Apply changes to dense points
    for (const move of moved) {
      densePoints[move.index] = move.point;
    }
    
    // 4. Reconvert dense points to optimized commands (same as in the example)
    const optimizedCommands = this.pointsToCommands(densePoints);
    
    return optimizedCommands;
  }

  private commandsToPoints(commands: SVGCommand[]): Point[] {
    const points: Point[] = [];

    for (const cmd of commands) {
      if (cmd.command === 'Z') continue;

      if ('x' in cmd && 'y' in cmd && cmd.x !== undefined && cmd.y !== undefined) {
        points.push({ x: cmd.x, y: cmd.y });
      }
    }

    return points;
  }

  private commandsToDensePoints(commands: SVGCommand[], resolution: number = 2): Point[] {
    const points: Point[] = [];
    let currentPoint: Point | null = null;

    for (const cmd of commands) {
      if (cmd.command === 'M') {
        currentPoint = { x: cmd.x!, y: cmd.y! };
        points.push(currentPoint);
      } else if (cmd.command === 'L') {
        const endPoint = { x: cmd.x!, y: cmd.y! };
        if (currentPoint) {
          // Linear interpolation to create dense points
          const distance = Math.hypot(endPoint.x - currentPoint.x, endPoint.y - currentPoint.y);
          const steps = Math.max(1, Math.ceil(distance / resolution));
          
          for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            points.push({
              x: currentPoint.x + (endPoint.x - currentPoint.x) * t,
              y: currentPoint.y + (endPoint.y - currentPoint.y) * t
            });
          }
        }
        currentPoint = endPoint;
      } else if (cmd.command === 'C') {
        const cp1 = { x: cmd.x1!, y: cmd.y1! };
        const cp2 = { x: cmd.x2!, y: cmd.y2! };
        const endPoint = { x: cmd.x!, y: cmd.y! };
        
        if (currentPoint) {
          // Bezier curve interpolation to create dense points
          const distance = Math.hypot(endPoint.x - currentPoint.x, endPoint.y - currentPoint.y);
          const steps = Math.max(2, Math.ceil(distance / resolution));
          
          for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const bezierPoint = this.evaluateBezier(currentPoint, cp1, cp2, endPoint, t);
            points.push(bezierPoint);
          }
        }
        currentPoint = endPoint;
      }
    }

    return points;
  }

  private evaluateBezier(p0: Point, cp1: Point, cp2: Point, p3: Point, t: number): Point {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;
    
    return {
      x: mt3 * p0.x + 3 * mt2 * t * cp1.x + 3 * mt * t2 * cp2.x + t3 * p3.x,
      y: mt3 * p0.y + 3 * mt2 * t * cp1.y + 3 * mt * t2 * cp2.y + t3 * p3.y
    };
  }

  private applySmoothing(points: Point[], center: Point): Point[] {
    const { radius, strength } = this.settings;
    const smoothedPoints = [...points];

    // Protect start and end points - never modify
    for (let i = 1; i < smoothedPoints.length - 1; i++) {
      const point = smoothedPoints[i];
      const distance = Math.hypot(point.x - center.x, point.y - center.y);
      
      // Only process points within radius
      if (distance > radius) continue;

      // Simple smoothing: average with neighbors (like in HTML example)
      let sumX = 0, sumY = 0, count = 0;
      
      // Use more neighbors for curves (like in example)
      for (let k = -2; k <= 2; k++) {
        const neighborIndex = i + k;
        if (neighborIndex >= 0 && neighborIndex < smoothedPoints.length) {
          sumX += smoothedPoints[neighborIndex].x;
          sumY += smoothedPoints[neighborIndex].y;
          count++;
        }
      }
      
      if (count > 0) {
        const avgX = sumX / count;
        const avgY = sumY / count;
        
        // Apply smoothing with weight based on distance to center
        const weight = strength * (1 - distance / radius);
        
        smoothedPoints[i] = {
          x: point.x + (avgX - point.x) * weight,
          y: point.y + (avgY - point.y) * weight
        };
      }
    }

    return smoothedPoints;
  }

  private pointsToCommands(points: Point[]): SVGCommand[] {
    if (points.length === 0) return [];

    const commands: SVGCommand[] = [];
    
    // First command is always M
    commands.push({
      id: generateId(),
      command: 'M',
      x: Math.round(points[0].x),
      y: Math.round(points[0].y)
    });

    // Use Bezier curve fitting for remaining points
    const curves = this.fitBezierCurves(points, this.settings.tolerance);
    commands.push(...curves);

    return commands;
  }

  private fitBezierCurves(points: Point[], tolerance: number): SVGCommand[] {
    if (points.length < 2) return [];
    
    const curves: SVGCommand[] = [];
    let i = 0;

    while (i < points.length - 1) {
      let bestFit: any = null;
      let bestJ = i + 1;
      
      // Intentar segmentos de diferentes longitudes
      const maxSegmentSize = Math.min(i + 8, points.length - 1);
      
      for (let j = maxSegmentSize; j > i + 1; j--) {
        const segment = points.slice(i, j + 1);
        const fit = this.fitCubicBezier(segment, tolerance);
        
        if (fit) {
          bestFit = fit;
          bestJ = j;
          break;
        }
      }

      if (bestFit && bestJ > i + 1) {
        // Use Bezier curve
        curves.push({
          id: generateId(),
          command: 'C',
          x1: Math.round(bestFit.cp1.x),
          y1: Math.round(bestFit.cp1.y),
          x2: Math.round(bestFit.cp2.x),
          y2: Math.round(bestFit.cp2.y),
          x: Math.round(bestFit.end.x),
          y: Math.round(bestFit.end.y)
        });
        i = bestJ;
      } else {
        // Use straight line
        curves.push({
          id: generateId(),
          command: 'L',
          x: Math.round(points[i + 1].x),
          y: Math.round(points[i + 1].y)
        });
        i++;
      }
    }

    return curves;
  }

  private fitCubicBezier(points: Point[], tolerance: number): any {
    if (points.length < 3) return null;

    const start = points[0];
    const end = points[points.length - 1];
    
    // Estimate tangents
    const t1 = this.normalize({ 
      x: points[1].x - start.x, 
      y: points[1].y - start.y 
    });
    const t2 = this.normalize({ 
      x: end.x - points[points.length - 2].x, 
      y: end.y - points[points.length - 2].y 
    });
    
    // Estimate control point length
    const chordLen = Math.hypot(end.x - start.x, end.y - start.y);
    const alpha1 = chordLen / 3;
    const alpha2 = chordLen / 3;
    
    const cp1 = {
      x: start.x + t1.x * alpha1,
      y: start.y + t1.y * alpha1
    };
    const cp2 = {
      x: end.x - t2.x * alpha2,
      y: end.y - t2.y * alpha2
    };
    
    // Check if the curve fits within tolerance
    const maxError = this.calculateBezierError(points, start, cp1, cp2, end);
    
    if (maxError <= tolerance) {
      return { cp1, cp2, end };
    }
    
    return null;
  }

  private normalize(vector: Point): Point {
    const length = Math.hypot(vector.x, vector.y) || 1;
    return { x: vector.x / length, y: vector.y / length };
  }

  private calculateBezierError(points: Point[], p0: Point, cp1: Point, cp2: Point, p3: Point): number {
    let maxError = 0;
    
    for (let i = 1; i < points.length - 1; i++) {
      const t = i / (points.length - 1);
      const bezierPoint = this.evaluateBezier(p0, cp1, cp2, p3, t);
      const error = Math.hypot(points[i].x - bezierPoint.x, points[i].y - bezierPoint.y);
      maxError = Math.max(maxError, error);
    }
    
    return maxError;
  }

  // ============= FUNCIONES DEL EJEMPLO HTML =============
  
  // Convert curves to points for smooth brush (same as curvesToPoints in HTML example)
  private curvesToPointsHTML(commands: SVGCommand[], resolution: number = 2): Point[] {
    const points: Point[] = [];
    let current: Point | null = null;
    
    for (const cmd of commands) {
      if (cmd.command === 'M') {
        current = { x: cmd.x!, y: cmd.y! };
        points.push(current);
      } else if (cmd.command === 'L') {
        const end = { x: cmd.x!, y: cmd.y! };
        if (current) {
          // Linear interpolation to create dense points
          const distance = Math.hypot(end.x - current.x, end.y - current.y);
          const steps = Math.max(1, Math.ceil(distance / resolution));
          
          for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            points.push({
              x: current.x + (end.x - current.x) * t,
              y: current.y + (end.y - current.y) * t
            });
          }
        }
        current = end;
      } else if (cmd.command === 'C') {
        const cp1 = { x: cmd.x1!, y: cmd.y1! };
        const cp2 = { x: cmd.x2!, y: cmd.y2! };
        const end = { x: cmd.x!, y: cmd.y! };
        
        if (current) {
          // Bezier curve interpolation to create dense points
          const distance = Math.hypot(end.x - current.x, end.y - current.y);
          const steps = Math.max(2, Math.ceil(distance / resolution));
          
          for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const bezierPoint = this.evaluateBezier(current, cp1, cp2, end, t);
            points.push(bezierPoint);
          }
        }
        current = end;
      }
    }
    
    return points;
  }

  // Show brush feedback (same as showBrushFeedback in HTML example)
  private showBrushFeedbackHTML(points: Point[], affectedIndices: number[]): void {
    if (affectedIndices.length === 0) {
      this.currentFeedbackPath = '';
      return;
    }
    
    let minIndex = Math.min(...affectedIndices);
    let maxIndex = Math.max(...affectedIndices);
    
    minIndex = Math.max(0, minIndex - 1);
    maxIndex = Math.min(points.length - 1, maxIndex + 1);
    
    let pathData = '';
    
    if (minIndex <= maxIndex) {
      const startPt = points[minIndex];
      pathData = `M ${startPt.x} ${startPt.y}`;
      
      for (let i = minIndex + 1; i <= maxIndex; i++) {
        const pt = points[i];
        pathData += ` L ${pt.x} ${pt.y}`;
      }
    }
    
    this.currentFeedbackPath = pathData;
  }

  // Convert points to commands (same as fitBezierCurves in HTML example)
  private pointsToCommandsHTML(points: Point[]): SVGCommand[] {
    if (points.length === 0) return [];
    if (points.length === 1) {
      return [{
        id: generateId(),
        command: 'M',
        x: Math.round(points[0].x),
        y: Math.round(points[0].y)
      }];
    }

    const commands: SVGCommand[] = [];
    
    // Primer comando siempre es M
    commands.push({
      id: generateId(),
      command: 'M',
      x: Math.round(points[0].x),
      y: Math.round(points[0].y)
    });

    // Use real user tolerance for reconversion
    const tolerance = this.settings.tolerance;
    
    // Use optimized Bezier curve fitting (same as fitBezierCurves in example)
    const curves = this.fitBezierCurvesHTML(points, tolerance);
    commands.push(...curves);

    return commands;
  }

  // Convert points to commands with custom tolerance (for special cases)
  private pointsToCommandsHTMLWithCustomTolerance(points: Point[], customTolerance: number): SVGCommand[] {
    if (points.length === 0) return [];
    if (points.length === 1) {
      return [{
        id: generateId(),
        command: 'M',
        x: Math.round(points[0].x),
        y: Math.round(points[0].y)
      }];
    }

    const commands: SVGCommand[] = [];
    
    // Primer comando siempre es M
    commands.push({
      id: generateId(),
      command: 'M',
      x: Math.round(points[0].x),
      y: Math.round(points[0].y)
    });

    // Use custom tolerance
    
    // Use optimized Bezier curve fitting
    const curves = this.fitBezierCurvesHTML(points, customTolerance);
    commands.push(...curves);

    return commands;
  }

  // Bezier curve fitting (same as fitBezierCurves in HTML example)
  private fitBezierCurvesHTML(points: Point[], tolerance: number): SVGCommand[] {
    if (points.length < 2) return [];
    if (points.length === 2) {
      return [{
        id: generateId(),
        command: 'L',
        x: Math.round(points[1].x),
        y: Math.round(points[1].y)
      }];
    }

    const curves: SVGCommand[] = [];
    let i = 0;

    while (i < points.length - 1) {
      let bestFit: any = null;
      let bestJ = i + 1;
      
      // Try with longer segments first (up to 12 points)
      const maxSegmentSize = Math.min(i + 12, points.length - 1);
      
      // Find the longest segment that fits
      for (let j = maxSegmentSize; j > i + 2; j--) { // Start with at least 3 points
        const segment = points.slice(i, j + 1);
        const fit = this.fitCubicBezierHTML(segment, tolerance);
        
        if (fit) {
          bestFit = fit;
          bestJ = j;
          break; // Take the first (longest) valid segment
        }
      }

      if (bestFit && bestJ > i + 2) {
        // Use Bezier curve only if segment is significant
        curves.push({
          id: generateId(),
          command: 'C',
          x1: Math.round(bestFit.cp1.x),
          y1: Math.round(bestFit.cp1.y),
          x2: Math.round(bestFit.cp2.x),
          y2: Math.round(bestFit.cp2.y),
          x: Math.round(bestFit.end.x),
          y: Math.round(bestFit.end.y)
        });
        i = bestJ;
      } else {
        // Use straight line for short segments or those that don't fit well
        const nextIndex = Math.min(i + 3, points.length - 1); // Skip several points for lines
        curves.push({
          id: generateId(),
          command: 'L',
          x: Math.round(points[nextIndex].x),
          y: Math.round(points[nextIndex].y)
        });
        i = nextIndex;
      }
    }

    return curves;
  }

  // Ajustar curva Bézier cúbica (igual que fitCubicBezier en el ejemplo HTML)
  private fitCubicBezierHTML(points: Point[], tolerance: number): any {
    if (points.length < 3) return null;

    const start = points[0];
    const end = points[points.length - 1];
    
    // Estimar tangentes (igual que en el ejemplo)
    const t1 = this.normalizeVector({ 
      x: points[1].x - start.x, 
      y: points[1].y - start.y 
    });
    const t2 = this.normalizeVector({ 
      x: end.x - points[points.length - 2].x, 
      y: end.y - points[points.length - 2].y 
    });
    
    // Estimate control point lengths (same as in example)
    const chordLen = Math.hypot(end.x - start.x, end.y - start.y);
    const alpha1 = chordLen / 3;
    const alpha2 = chordLen / 3;
    
    const cp1 = {
      x: start.x + t1.x * alpha1,
      y: start.y + t1.y * alpha1
    };
    const cp2 = {
      x: end.x - t2.x * alpha2,
      y: end.y - t2.y * alpha2
    };
    
    // Check if curve fits within tolerance (same as in example)
    const maxError = this.calculateBezierErrorHTML(points, start, cp1, cp2, end);
    
    if (maxError <= tolerance) {
      return { cp1, cp2, end };
    }
    
    return null;
  }

  // Normalize vector (helper)
  private normalizeVector(vector: Point): Point {
    const length = Math.hypot(vector.x, vector.y) || 1;
    return { x: vector.x / length, y: vector.y / length };
  }

  // Calculate Bezier curve fitting error (same as calculateBezierError in HTML example)
  private calculateBezierErrorHTML(points: Point[], p0: Point, cp1: Point, cp2: Point, p3: Point): number {
    let maxError = 0;
    
    for (let i = 1; i < points.length - 1; i++) {
      const t = i / (points.length - 1);
      const bezierPoint = this.evaluateBezier(p0, cp1, cp2, p3, t);
      const error = Math.hypot(points[i].x - bezierPoint.x, points[i].y - bezierPoint.y);
      maxError = Math.max(maxError, error);
    }
    
    return maxError;
  }

  // ============= HELPER FUNCTIONS FOR BETTER SMOOTH =============

  // Detect if a path is a straight line
  private isPathStraightLine(commands: SVGCommand[]): boolean {
    if (commands.length <= 2) return true;
    
    // Get main points
    const points: Point[] = [];
    for (const cmd of commands) {
      if (cmd.command === 'M' || cmd.command === 'L' || cmd.command === 'C') {
        points.push({ x: cmd.x!, y: cmd.y! });
      }
    }
    
    if (points.length <= 2) return true;
    
    // Verificar si todos los puntos están alineados
    const start = points[0];
    const end = points[points.length - 1];
    const tolerance = 2.0; // Tolerance to consider "straight"
    
    for (let i = 1; i < points.length - 1; i++) {
      const point = points[i];
      const distance = this.distancePointToLine(point, start, end);
      if (distance > tolerance) {
        return false; // Not a straight line
      }
    }
    
    return true;
  }

  // Calculate distance from point to line
  private distancePointToLine(point: Point, lineStart: Point, lineEnd: Point): number {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return Math.hypot(A, B);
    
    const param = Math.max(0, Math.min(1, dot / lenSq));
    const xx = lineStart.x + param * C;
    const yy = lineStart.y + param * D;
    
    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.hypot(dx, dy);
  }

  // Calculate optimal resolution based on path complexity
  private calculateOptimalResolution(commands: SVGCommand[]): number {
    // Count curves vs lines
    const curveCount = commands.filter(cmd => cmd.command === 'C').length;
    const lineCount = commands.filter(cmd => cmd.command === 'L').length;
    const totalCommands = commands.length;
    
    // Calculate approximate total length
    let totalLength = 0;
    let current: Point | null = null;
    
    for (const cmd of commands) {
      if (cmd.command === 'M') {
        current = { x: cmd.x!, y: cmd.y! };
      } else if (cmd.command === 'L' || cmd.command === 'C') {
        const end = { x: cmd.x!, y: cmd.y! };
        if (current) {
          totalLength += Math.hypot(end.x - current.x, end.y - current.y);
        }
        current = end;
      }
    }
    
    // Adaptive resolution:
    // - Short paths: higher resolution (2-4px)
    // - Long paths: lower resolution (4-8px)
    // - Many curves: higher resolution
    // - Mostly lines: lower resolution
    
    let baseResolution = 4;
    
    if (totalLength < 100) {
      baseResolution = 2; // Very short paths
    } else if (totalLength > 500) {
      baseResolution = 6; // Long paths
    }
    
    // Adjust for complexity
    const curveRatio = curveCount / Math.max(1, totalCommands);
    if (curveRatio > 0.5) {
      baseResolution *= 0.7; // More curves = higher resolution
    }
    
    const resolution = Math.max(2, Math.min(8, Math.round(baseResolution)));
    
    return resolution;
  }

  // ============= FUNCTIONS FOR TRULY LOCALIZED SMOOTH =============

  // Find commands that are within the brush radius
  private findCommandsWithinRadius(commands: SVGCommand[], center: Point, radius: number): number[] {
    const affectedIndices: number[] = [];
    
    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      
      // Only check commands with final coordinates
      if (cmd.command === 'M' || cmd.command === 'L' || cmd.command === 'C') {
        const endPoint = { x: cmd.x!, y: cmd.y! };
        const distance = Math.hypot(endPoint.x - center.x, endPoint.y - center.y);
        
        if (distance <= radius) {
          affectedIndices.push(i);
        }
        
        // Para curvas, también verificar puntos de control
        if (cmd.command === 'C') {
          const cp1Distance = Math.hypot(cmd.x1! - center.x, cmd.y1! - center.y);
          const cp2Distance = Math.hypot(cmd.x2! - center.x, cmd.y2! - center.y);
          
          if (cp1Distance <= radius || cp2Distance <= radius) {
            if (!affectedIndices.includes(i)) {
              affectedIndices.push(i);
            }
          }
        }
      }
    }
    
    return affectedIndices.sort((a, b) => a - b);
  }

  // Get continuous range of affected commands (with margin)
  private getAffectedRange(affectedIndices: number[]): { startIndex: number; endIndex: number } {
    if (affectedIndices.length === 0) {
      return { startIndex: 0, endIndex: 0 };
    }
    
    const minIndex = Math.min(...affectedIndices);
    const maxIndex = Math.max(...affectedIndices);
    
    // Expand range to include context and allow effective smoothing
    const margin = 1;
    const startIndex = Math.max(0, minIndex - margin);
    const endIndex = maxIndex + margin; // We don't limit by length here, it's handled later
    
    return { startIndex, endIndex };
  }

  // Apply smooth only to a segment of commands
  private applySmoothToCommandSegment(commands: SVGCommand[], center: Point): SVGCommand[] {
    if (commands.length <= 1) return commands;
    
    // Convert segment to dense points
    const resolution = 3; // Medium resolution for local segments
    const segmentPoints = this.curvesToPointsHTML(commands, resolution);
    
    if (segmentPoints.length < 3) {
      return commands;
    }
    
    // Apply smoothing only to points within radius
    const smoothedPoints = [...segmentPoints];
    let modifiedCount = 0;
    
    for (let i = 1; i < smoothedPoints.length - 1; i++) { // Protect endpoints
      const point = smoothedPoints[i];
      const distance = Math.hypot(point.x - center.x, point.y - center.y);
      
      if (distance <= this.settings.radius) {
        // Smoothing with neighbors
        let sumX = 0, sumY = 0, count = 0;
        
        for (let k = -1; k <= 1; k++) { // Smaller neighborhood for segments
          const j = i + k;
          if (j >= 0 && j < smoothedPoints.length) {
            sumX += smoothedPoints[j].x;
            sumY += smoothedPoints[j].y;
            count++;
          }
        }
        
        if (count > 0) {
          const avgX = sumX / count;
          const avgY = sumY / count;
          
          const weight = this.settings.strength * (1 - distance / this.settings.radius);
          
          smoothedPoints[i] = {
            x: point.x + (avgX - point.x) * weight,
            y: point.y + (avgY - point.y) * weight
          };
          
          modifiedCount++;
        }
      }
    }
    
    if (modifiedCount === 0) {
      return commands; // No changes
    }
    
    // Reconvert to commands with high tolerance to avoid over-segmentation
    const result = this.pointsToCommandsHTML(smoothedPoints);
    
    return result;
  }

  // Show visual feedback for the affected local section
  private showLocalFeedback(commands: SVGCommand[], startIndex: number, endIndex: number): void {
    // Get points from affected range
    const affectedCommands = commands.slice(startIndex, endIndex + 1);
    const points = this.curvesToPointsHTML(affectedCommands, 2);
    
    if (points.length === 0) {
      this.currentFeedbackPath = '';
      return;
    }
    
    // Generate feedback path
    let pathData = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      pathData += ` L ${points[i].x} ${points[i].y}`;
    }
    
    this.currentFeedbackPath = pathData;
  }

  // ============= FUNCTIONS FOR SMOOTH INTEGRATION =============

  // Get extended range that preserves path continuity
  private getExtendedAffectedRange(affectedIndices: number[], commandsLength: number): { startIndex: number; endIndex: number } {
    if (affectedIndices.length === 0) {
      return { startIndex: 0, endIndex: 0 };
    }
    
    const minIndex = Math.min(...affectedIndices);
    const maxIndex = Math.max(...affectedIndices);
    
    // Expand more conservatively to preserve continuity
    let startIndex = minIndex;
    let endIndex = maxIndex;
    
    // Expand backward only if not at start
    if (startIndex > 0) {
      startIndex = Math.max(0, startIndex - 1);
    }
    
    // Expand forward only if not at end
    if (endIndex < commandsLength - 1) {
      endIndex = Math.min(commandsLength - 1, endIndex + 1);
    }
    
    return { startIndex, endIndex };
  }

  // Extract segment with context information for continuity
  private extractSegmentWithContext(commands: SVGCommand[], startIndex: number, endIndex: number): any {
    if (startIndex >= commands.length || endIndex >= commands.length || startIndex > endIndex) {
      return null;
    }
    
    const segmentCommands = commands.slice(startIndex, endIndex + 1);
    
    // Get segment start point (may be in previous command)
    let startPoint: Point | null = null;
    
    if (startIndex > 0) {
      // The start point is the end point of the previous command
      const prevCmd = commands[startIndex - 1];
      if (prevCmd.x !== undefined && prevCmd.y !== undefined) {
        startPoint = { x: prevCmd.x, y: prevCmd.y };
      }
    } else if (segmentCommands[0]?.command === 'M') {
      // If we start with M, that's our start point
      startPoint = { x: segmentCommands[0].x!, y: segmentCommands[0].y! };
    }
    
    // Get segment end point
    let endPoint: Point | null = null;
    const lastCmd = segmentCommands[segmentCommands.length - 1];
    if (lastCmd.x !== undefined && lastCmd.y !== undefined) {
      endPoint = { x: lastCmd.x, y: lastCmd.y };
    }
    
    return {
      commands: segmentCommands,
      startPoint,
      endPoint,
      originalStartIndex: startIndex,
      originalEndIndex: endIndex
    };
  }

  // Apply smooth keeping connection points fixed
  private applySmoothWithContinuity(segmentInfo: any, center: Point): SVGCommand[] {
    const { commands, startPoint, endPoint } = segmentInfo;
    
    if (commands.length <= 1) return commands;
    
    // Convert to points with tolerance-based resolution
    const resolution = Math.max(1, this.settings.tolerance);
    const points = this.curvesToPointsHTML(commands, resolution);
    
    if (points.length < 3) return commands;
    
    // FORCE exact start and end points for continuity
    if (startPoint) {
      points[0] = { ...startPoint };
    }
    if (endPoint) {
      points[points.length - 1] = { ...endPoint };
    }
    
    // Apply smoothing only to internal points, preserving endpoints
    const smoothedPoints = [...points];
    let modifiedCount = 0;
    
    for (let i = 1; i < smoothedPoints.length - 1; i++) { // NUNCA modificar extremos
      const point = smoothedPoints[i];
      const distance = Math.hypot(point.x - center.x, point.y - center.y);
      
      if (distance <= this.settings.radius) {
        // Suavizado con vecinos - rango adaptativo basado en tolerancia
        let sumX = 0, sumY = 0, count = 0;
        
        // Rango de vecinos basado en tolerancia (más tolerancia = más vecinos)
        const neighborRange = Math.max(1, Math.min(4, Math.round(this.settings.tolerance)));
        
        for (let k = -neighborRange; k <= neighborRange; k++) {
          const j = i + k;
          if (j >= 0 && j < smoothedPoints.length) {
            sumX += smoothedPoints[j].x;
            sumY += smoothedPoints[j].y;
            count++;
          }
        }
        
        if (count > 0) {
          const avgX = sumX / count;
          const avgY = sumY / count;
          
          // Peso basado en strength real del usuario (sin reducción artificial)
          const distanceWeight = 1 - distance / this.settings.radius;
          const finalWeight = this.settings.strength * distanceWeight;
          
          smoothedPoints[i] = {
            x: point.x + (avgX - point.x) * finalWeight,
            y: point.y + (avgY - point.y) * finalWeight
          };
          
          modifiedCount++;
        }
      }
    }
    
    if (modifiedCount === 0) {
      return commands; // No changes
    }
    
    // Reconvert using real user tolerance
    const result = this.pointsToCommandsHTML(smoothedPoints);
    
    // Ensure first command preserves correct type
    if (commands[0].command === 'M' && result[0]) {
      result[0] = {
        ...result[0],
        command: 'M'
      };
    }
    
    return result;
  }

  // Integrate smoothed segment maintaining perfect continuity
  private integrateSmoothedSegment(
    originalCommands: SVGCommand[], 
    smoothedSegment: SVGCommand[], 
    startIndex: number, 
    endIndex: number
  ): SVGCommand[] {
    
    // Build new commands array
    const newCommands: SVGCommand[] = [];
    
    // 1. Initial part (before smoothed segment)
    if (startIndex > 0) {
      newCommands.push(...originalCommands.slice(0, startIndex));
    }
    
    // 2. Smoothed segment
    if (smoothedSegment.length > 0) {
      // If not at start, ensure we don't duplicate M commands
      let segmentToAdd = smoothedSegment;
      
      if (startIndex > 0 && smoothedSegment[0]?.command === 'M') {
        // Convert initial M to L for continuity
        segmentToAdd = [
          {
            ...smoothedSegment[0],
            command: 'L'
          },
          ...smoothedSegment.slice(1)
        ];
      }
      
      newCommands.push(...segmentToAdd);
    }
    
    // 3. Parte final (después del segmento suavizado)
    if (endIndex + 1 < originalCommands.length) {
      newCommands.push(...originalCommands.slice(endIndex + 1));
    }
    
    return newCommands;
  }

  // Validar que el path mantiene continuidad
  private validatePathContinuity(commands: SVGCommand[]): boolean {
    if (commands.length <= 1) return true;
    
    let currentPoint: Point | null = null;
    let isValid = true;
    
    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      
      if (cmd.command === 'M') {
        currentPoint = { x: cmd.x!, y: cmd.y! };
      } else if (cmd.command === 'L' || cmd.command === 'C') {
        if (!currentPoint) {
          isValid = false;
          break;
        }
        
        // Update current position
        currentPoint = { x: cmd.x!, y: cmd.y! };
      } else if (cmd.command === 'Z') {
        // Z is valid, closes the path
        continue;
      }
    }
    
    return isValid;
  }

  private updatePreview(center: Point): void {
    // Generate preview circle of influence radius
    const radius = this.settings.radius;
    this.currentPreviewPath = `M ${center.x - radius} ${center.y} A ${radius} ${radius} 0 1 1 ${center.x + radius} ${center.y} A ${radius} ${radius} 0 1 1 ${center.x - radius} ${center.y}`;
  }

  private clearPreview(): void {
    this.currentPreviewPath = '';
  }

  private generateFeedbackPath(points: Point[], center: Point): void {
    const { radius } = this.settings;
    let affectedIndices: number[] = [];
    
    // Find points within radius
    for (let i = 0; i < points.length; i++) {
      const distance = Math.hypot(points[i].x - center.x, points[i].y - center.y);
      if (distance <= radius) {
        affectedIndices.push(i);
      }
    }
    
    if (affectedIndices.length === 0) {
      this.currentFeedbackPath = '';
      return;
    }
    
    // Expand range to show context
    let minIndex = Math.min(...affectedIndices);
    let maxIndex = Math.max(...affectedIndices);
    
    minIndex = Math.max(0, minIndex - 1);
    maxIndex = Math.min(points.length - 1, maxIndex + 1);
    
    // Generate feedback path
    if (minIndex <= maxIndex) {
      const startPoint = points[minIndex];
      let pathData = `M ${startPoint.x} ${startPoint.y}`;
      
      for (let i = minIndex + 1; i <= maxIndex; i++) {
        const point = points[i];
        pathData += ` L ${point.x} ${point.y}`;
      }
      
      this.currentFeedbackPath = pathData;
    } else {
      this.currentFeedbackPath = '';
    }
  }

  private clearFeedback(): void {
    this.currentFeedbackPath = '';
  }

  getFeedbackPath(): string {
    return this.currentFeedbackPath;
  }

  getPreviewPath(): string {
    return this.currentPreviewPath;
  }
}

export const smoothManager = new SmoothManager();
