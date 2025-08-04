import { Point } from '../../types';

/**
 * Advanced smoothing algorithm for pencil drawing
 * Provides better point simplification and adaptive smoothing
 */

export interface SmoothedPoint extends Point {
  pressure?: number;
  timestamp?: number;
}

export class Smoother {
  private simplifyTolerance = 2.0; // Increased for better simplification
  private smoothingFactor = 0.85; // Higher for smoother curves
  private minDistance = 1.5; // Reduced for more detail
  private pressureDecay = 0.7; // Faster pressure changes
  private lowPassAlpha = 0.3; // Low-pass filter strength

  /**
   * Simplify a series of points using the Ramer-Douglas-Peucker algorithm
   */
  simplifyPoints(points: Point[], tolerance: number = this.simplifyTolerance): Point[] {
    if (points.length <= 2) return points;

    const simplified = this.rdpSimplify(points, tolerance);
    return simplified.length < 2 ? points : simplified;
  }

  /**
   * Apply smoothing to a series of points
   */
  smoothPoints(points: Point[]): Point[] {
    if (points.length < 3) return points;

    // First, apply noise reduction with a low-pass filter
    const filtered = this.lowPassFilter(points);
    
    // Then, simplify the points to remove unnecessary detail
    const simplified = this.simplifyPoints(filtered);
    
    // Finally, apply adaptive smoothing
    const smoothed = this.adaptiveSmooth(simplified);
    
    return smoothed;
  }

  /**
   * Apply a simple low-pass filter to reduce noise in the input
   */
  private lowPassFilter(points: Point[], alpha: number = this.lowPassAlpha): Point[] {
    if (points.length < 2) return points;
    
    const filtered: Point[] = [points[0]]; // Keep first point
    
    for (let i = 1; i < points.length; i++) {
      const prev = filtered[i - 1];
      const current = points[i];
      
      // Apply exponential smoothing
      filtered.push({
        x: prev.x + alpha * (current.x - prev.x),
        y: prev.y + alpha * (current.y - prev.y)
      });
    }
    
    return filtered;
  }

  /**
   * Ramer-Douglas-Peucker line simplification algorithm
   */
  private rdpSimplify(points: Point[], tolerance: number): Point[] {
    if (points.length <= 2) return points;

    // Find the point with the maximum distance from the line segment
    let maxDistance = 0;
    let maxIndex = 0;
    const start = points[0];
    const end = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
      const distance = this.pointToLineDistance(points[i], start, end);
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }

    // If max distance is greater than tolerance, recursively simplify
    if (maxDistance > tolerance) {
      const leftSide = this.rdpSimplify(points.slice(0, maxIndex + 1), tolerance);
      const rightSide = this.rdpSimplify(points.slice(maxIndex), tolerance);

      // Combine results (remove duplicate point at junction)
      return leftSide.slice(0, -1).concat(rightSide);
    } else {
      // If all points are within tolerance, return just the endpoints
      return [start, end];
    }
  }

  /**
   * Calculate distance from a point to a line segment
   */
  private pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) {
      // Line segment is actually a point
      return Math.sqrt(A * A + B * B);
    }

    let param = dot / lenSq;
    
    let xx: number, yy: number;
    
    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Apply adaptive smoothing based on point density and curvature
   */
  private adaptiveSmooth(points: Point[]): Point[] {
    if (points.length < 3) return points;

    const smoothed: Point[] = [points[0]]; // Always keep first point

    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const current = points[i];
      const next = points[i + 1];

      // Calculate curvature at this point
      const curvature = this.calculateCurvature(prev, current, next);
      
      // Adjust smoothing factor based on curvature
      const adaptiveFactor = this.getAdaptiveSmoothingFactor(curvature);
      
      // Apply smoothing
      const smoothedPoint = this.interpolatePoint(prev, current, next, adaptiveFactor);
      smoothed.push(smoothedPoint);
    }

    smoothed.push(points[points.length - 1]); // Always keep last point
    return smoothed;
  }

  /**
   * Calculate curvature at a point (simplified version)
   */
  private calculateCurvature(prev: Point, current: Point, next: Point): number {
    const v1 = { x: current.x - prev.x, y: current.y - prev.y };
    const v2 = { x: next.x - current.x, y: next.y - current.y };
    
    const v1Mag = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const v2Mag = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    
    if (v1Mag === 0 || v2Mag === 0) return 0;
    
    // Normalize vectors
    v1.x /= v1Mag;
    v1.y /= v1Mag;
    v2.x /= v2Mag;
    v2.y /= v2Mag;
    
    // Calculate angle between vectors
    const dotProduct = v1.x * v2.x + v1.y * v2.y;
    return Math.abs(Math.acos(Math.max(-1, Math.min(1, dotProduct))));
  }

  /**
   * Get adaptive smoothing factor based on curvature
   */
  private getAdaptiveSmoothingFactor(curvature: number): number {
    // Less smoothing for high curvature (sharp corners)
    // More smoothing for low curvature (gentle curves)
    const normalizedCurvature = curvature / Math.PI;
    return this.smoothingFactor * (1 - normalizedCurvature * 0.7);
  }

  /**
   * Interpolate a point with its neighbors for smoothing
   */
  private interpolatePoint(prev: Point, current: Point, next: Point, factor: number): Point {
    // Calculate the average of neighboring points
    const avgX = (prev.x + next.x) / 2;
    const avgY = (prev.y + next.y) / 2;
    
    // Interpolate between current point and average of neighbors
    return {
      x: current.x + (avgX - current.x) * factor,
      y: current.y + (avgY - current.y) * factor
    };
  }

  /**
   * Calculate simulated pressure based on drawing speed
   */
  calculatePressure(points: SmoothedPoint[]): SmoothedPoint[] {
    if (points.length < 2) return points;

    const result: SmoothedPoint[] = [];
    let lastPressure = 1.0;

    for (let i = 0; i < points.length; i++) {
      let pressure = 1.0;
      
      if (i > 0) {
        const prev = points[i - 1];
        const current = points[i];
        
        // Calculate speed (distance over time, approximated)
        const distance = Math.sqrt(
          Math.pow(current.x - prev.x, 2) + 
          Math.pow(current.y - prev.y, 2)
        );
        
        // Simulate pressure based on speed (faster = less pressure)
        const speed = distance; // Simplified speed calculation
        pressure = Math.max(0.3, Math.min(1.0, 1.0 - speed * 0.01));
        
        // Apply some smoothing to pressure changes
        pressure = lastPressure * this.pressureDecay + pressure * (1 - this.pressureDecay);
        lastPressure = pressure;
      }

      result.push({
        ...points[i],
        pressure
      });
    }

    return result;
  }

  /**
   * Configuration methods for real-time parameter adjustment
   */
  setSimplifyTolerance(tolerance: number) {
    this.simplifyTolerance = Math.max(0.1, Math.min(10, tolerance));
  }

  setSmoothingFactor(factor: number) {
    this.smoothingFactor = Math.max(0, Math.min(1, factor));
  }

  setMinDistance(distance: number) {
    this.minDistance = Math.max(0.5, Math.min(5, distance));
  }

  setPressureDecay(decay: number) {
    this.pressureDecay = Math.max(0.1, Math.min(1, decay));
  }

  setLowPassAlpha(alpha: number) {
    this.lowPassAlpha = Math.max(0.1, Math.min(1, alpha));
  }

  getParameters() {
    return {
      simplifyTolerance: this.simplifyTolerance,
      smoothingFactor: this.smoothingFactor,
      minDistance: this.minDistance,
      pressureDecay: this.pressureDecay,
      lowPassAlpha: this.lowPassAlpha
    };
  }

  resetToDefaults() {
    this.simplifyTolerance = 2.0;
    this.smoothingFactor = 0.85;
    this.minDistance = 1.5;
    this.pressureDecay = 0.7;
    this.lowPassAlpha = 0.3;
  }

  /**
   * Preset configurations for different drawing styles
   */
  applyPreciseDrawingPreset() {
    this.smoothingFactor = 0.4;
    this.simplifyTolerance = 0.8;
    this.minDistance = 0.8;
    this.pressureDecay = 0.6;
    this.lowPassAlpha = 0.2;
  }

  applyFluidDrawingPreset() {
    this.smoothingFactor = 0.8;
    this.simplifyTolerance = 2.5;
    this.minDistance = 2.0;
    this.pressureDecay = 0.7;
    this.lowPassAlpha = 0.3;
  }

  applyQuickSketchPreset() {
    this.smoothingFactor = 0.9;
    this.simplifyTolerance = 4.0;
    this.minDistance = 2.5;
    this.pressureDecay = 0.8;
    this.lowPassAlpha = 0.4;
  }
}

export const smoother = new Smoother();
