import React from 'react';
import { useEditorStore } from '../../store/editorStore';
import { generateId } from '../../utils/id-utils';
import { rdp } from '../../utils/rdp-utils';
import { pointsToPath } from '../../utils/catmull-rom-utils';
import type { Point, SVGCommand } from '../../types';

export interface Pencil2Settings {
  simplifyEps: number; // Simplification epsilon (0 = no simplification)
  strokeWidth: number; // Stroke width for drawing
}

export class Pencil2Manager {
  private editorStore: any = null;
  private isDrawing = false;
  private currentPoints: Point[] = [];
  private pointsBuffer: Point[] = [];
  private rafId: number | null = null;
  private animationId: number | null = null;
  private settings: Pencil2Settings = {
    simplifyEps: 8,
    strokeWidth: 3
  };

  setEditorStore(store: any) {
    this.editorStore = store;
  }

  destroy() {
    this.stopDrawing();
  }

  activateExternally() {
    const store = useEditorStore.getState();
    store.setCreateMode('PENCIL');
  }

  deactivateExternally() {
    this.stopDrawing();
    const store = useEditorStore.getState();
    store.setMode('select');
  }

  // Settings management
  updateSettings(newSettings: Partial<Pencil2Settings>) {
    this.settings = { ...this.settings, ...newSettings };
  }

  getSettings(): Pencil2Settings {
    return { ...this.settings };
  }

  private stopDrawing() {
    this.isDrawing = false;
    this.currentPoints = [];
    this.pointsBuffer = [];
    
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    
    if (this.animationId) {
      clearTimeout(this.animationId);
      this.animationId = null;
    }
  }

  private flushBuffer() {
    if (this.pointsBuffer.length === 0) {
      this.rafId = null;
      return;
    }
    
    this.currentPoints = [...this.currentPoints, ...this.pointsBuffer];
    this.pointsBuffer = [];
    this.rafId = null;
    
    // Force re-render by updating a timestamp or similar
    if (this.editorStore) {
      this.editorStore.forceRender();
    }
  }

  private scheduleFlush() {
    if (this.rafId == null) {
      this.rafId = requestAnimationFrame(() => this.flushBuffer());
    }
  }

  // Convert client coordinates to SVG coordinates
  private clientToSvgPoint(clientX: number, clientY: number, svgElement: SVGSVGElement): Point {
    const pt = svgElement.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    
    const ctm = svgElement.getScreenCTM();
    if (!ctm) {
      const rect = svgElement.getBoundingClientRect();
      const rx = clientX - rect.left;
      const ry = clientY - rect.top;
      return { x: Math.round(rx), y: Math.round(ry) };
    }
    
    const inv = ctm.inverse();
    const transformed = pt.matrixTransform(inv);
    return { x: Math.round(transformed.x), y: Math.round(transformed.y) };
  }

  // Sample a path at N points for animation morphing
  private samplePathD(pathD: string, n: number, svgElement: SVGSVGElement): Point[] {
    const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    tmp.setAttribute('d', pathD);
    tmp.setAttribute('fill', 'none');
    tmp.setAttribute('stroke', 'none');
    
    svgElement.appendChild(tmp);
    
    const len = (tmp as SVGPathElement).getTotalLength();
    if (!isFinite(len) || len === 0) {
      svgElement.removeChild(tmp);
      const pts: Point[] = [];
      const fallbackPoint = this.currentPoints[0] || { x: 0, y: 0 };
      for (let i = 0; i < n; i++) {
        pts.push({ x: Math.round(fallbackPoint.x), y: Math.round(fallbackPoint.y) });
      }
      return pts;
    }
    
    const out: Point[] = [];
    for (let i = 0; i < n; i++) {
      const t = (i / (n - 1)) * len;
      const pt = (tmp as SVGPathElement).getPointAtLength(t);
      out.push({ x: Math.round(pt.x), y: Math.round(pt.y) });
    }
    
    svgElement.removeChild(tmp);
    return out;
  }

  // Create morphing path data for animation
  private createMorphD(pts: Point[]): string {
    if (!pts || pts.length === 0) return '';
    
    const round = (n: number) => Math.round(n);
    let d = `M ${round(pts[0].x)} ${round(pts[0].y)}`;
    
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      d += ` C ${round(a.x)} ${round(a.y)} ${round(b.x)} ${round(b.y)} ${round(b.x)} ${round(b.y)}`;
    }
    
    return d;
  }

  // Create glow filter for animation
  private ensureGlowFilter(svgElement: SVGSVGElement) {
    if (svgElement.querySelector('#pencil2AnimGlowFilter')) return;
    
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', 'pencil2AnimGlowFilter');
    filter.setAttribute('filterUnits', 'objectBoundingBox');
    filter.setAttribute('primitiveUnits', 'userSpaceOnUse');

    const feMorph = document.createElementNS('http://www.w3.org/2000/svg', 'feMorphology');
    feMorph.setAttribute('in', 'SourceGraphic');
    feMorph.setAttribute('result', 'dilated');
    feMorph.setAttribute('operator', 'dilate');
    feMorph.setAttribute('radius', '2');

    const feBlur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
    feBlur.setAttribute('in', 'dilated');
    feBlur.setAttribute('result', 'blurred');
    feBlur.setAttribute('stdDeviation', '3');

    const feFlood = document.createElementNS('http://www.w3.org/2000/svg', 'feFlood');
    feFlood.setAttribute('result', 'glowColor');
    feFlood.setAttribute('flood-color', '#ffff00');
    feFlood.setAttribute('flood-opacity', '0.8');

    const feComposite1 = document.createElementNS('http://www.w3.org/2000/svg', 'feComposite');
    feComposite1.setAttribute('in', 'glowColor');
    feComposite1.setAttribute('in2', 'blurred');
    feComposite1.setAttribute('operator', 'in');
    feComposite1.setAttribute('result', 'coloredGlow');

    const feComposite2 = document.createElementNS('http://www.w3.org/2000/svg', 'feComposite');
    feComposite2.setAttribute('in', 'SourceGraphic');
    feComposite2.setAttribute('in2', 'coloredGlow');
    feComposite2.setAttribute('operator', 'over');
    feComposite2.setAttribute('result', 'effect4');

    filter.appendChild(feMorph);
    filter.appendChild(feBlur);
    filter.appendChild(feFlood);
    filter.appendChild(feComposite1);
    filter.appendChild(feComposite2);
    defs.appendChild(filter);
    svgElement.appendChild(defs);
  }

  handlePointerDown = (e: React.PointerEvent<SVGElement>): boolean => {
    const store = useEditorStore.getState();
    
    if (store.mode.current !== 'create' || store.mode.createMode?.commandType !== 'PENCIL') {
      return false;
    }

    const svgElement = e.currentTarget.closest('svg') as SVGSVGElement;
    if (!svgElement) return false;

    this.isDrawing = true;
    const point = this.clientToSvgPoint(e.clientX, e.clientY, svgElement);
    this.currentPoints = [point];
    this.pointsBuffer = [];

    return true;
  };

  handlePointerMove = (e: React.PointerEvent<SVGElement>): boolean => {
    if (!this.isDrawing) return false;

    const svgElement = e.currentTarget.closest('svg') as SVGSVGElement;
    if (!svgElement) return false;

    const point = this.clientToSvgPoint(e.clientX, e.clientY, svgElement);
    this.pointsBuffer.push(point);
    this.scheduleFlush();

    return true;
  };

  handlePointerUp = (e: React.PointerEvent<SVGElement>): boolean => {
    if (!this.isDrawing) return false;

    const svgElement = e.currentTarget.closest('svg') as SVGSVGElement;
    if (!svgElement) return false;

    this.isDrawing = false;

    // Add final point
    const finalPoint = this.clientToSvgPoint(e.clientX, e.clientY, svgElement);
    
    // Flush any remaining buffer
    const allPoints = [...this.currentPoints, ...this.pointsBuffer, finalPoint];
    this.pointsBuffer = [];

    if (allPoints.length === 0) return true;

    // If no simplification, create path directly
    if (this.settings.simplifyEps === 0) {
      this.createPathFromPoints(allPoints);
      this.currentPoints = [];
      return true;
    }

    // Simplify the points
    const simplified = rdp(allPoints, this.settings.simplifyEps);

    // If only one point or simplification didn't change much, create directly
    if (simplified.length <= 2 || simplified.length === allPoints.length) {
      this.createPathFromPoints(allPoints);
      this.currentPoints = [];
      return true;
    }

    // Show animation if simplification occurred
    this.animateSimplification(allPoints, simplified, svgElement);

    return true;
  };

  private createPathFromPoints(points: Point[]) {
    if (points.length === 0) return;

    const store = useEditorStore.getState();
    
    // Filter out duplicate and very close points to avoid curve artifacts
    const filteredPoints = this.filterPoints(points);
    
    // Convert points to SVG commands using Catmull-Rom to Bezier conversion
    const commands: SVGCommand[] = [];
    
    if (filteredPoints.length === 1) {
      // Single point - create a small circle using move
      const p = filteredPoints[0];
      commands.push({
        id: generateId(),
        command: 'M',
        x: p.x,
        y: p.y
      });
    } else if (filteredPoints.length === 2) {
      // Two points - generate smooth curve instead of line
      const p0 = filteredPoints[0];
      const p1 = filteredPoints[1];
      
      commands.push({
        id: generateId(),
        command: 'M',
        x: Math.round(p0.x),
        y: Math.round(p0.y)
      });
      
      // Create gentle curve even with 2 points
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const c1x = p0.x + dx * 0.33;
      const c1y = p0.y + dy * 0.33;
      const c2x = p0.x + dx * 0.67;
      const c2y = p0.y + dy * 0.67;
      
      commands.push({
        id: generateId(),
        command: 'C',
        x1: Math.round(c1x),
        y1: Math.round(c1y),
        x2: Math.round(c2x),
        y2: Math.round(c2y),
        x: Math.round(p1.x),
        y: Math.round(p1.y)
      });
    } else {
      // 3+ points - use Catmull-Rom to Bezier conversion for smooth curves
      const round = (n: number) => Math.round(n);
      
      // Start with move command
      commands.push({
        id: generateId(),
        command: 'M',
        x: round(filteredPoints[0].x),
        y: round(filteredPoints[0].y)
      });

      // Generate cubic Bezier curves from filtered points
      for (let i = 0; i < filteredPoints.length - 1; i++) {
        const p0 = i - 1 >= 0 ? filteredPoints[i - 1] : filteredPoints[i];
        const p1 = filteredPoints[i];
        const p2 = filteredPoints[i + 1];
        const p3 = i + 2 < filteredPoints.length ? filteredPoints[i + 2] : p2;

        // Improved Catmull-Rom to Bezier conversion with tension control
        const tension = 0.5; // Reduce tension to make curves smoother
        const c1x = p1.x + (p2.x - p0.x) * tension / 6;
        const c1y = p1.y + (p2.y - p0.y) * tension / 6;
        const c2x = p2.x - (p3.x - p1.x) * tension / 6;
        const c2y = p2.y - (p3.y - p1.y) * tension / 6;

        commands.push({
          id: generateId(),
          command: 'C',
          x1: round(c1x),
          y1: round(c1y),
          x2: round(c2x),
          y2: round(c2y),
          x: round(p2.x),
          y: round(p2.y)
        });
      }
    }

    // Create a new path with custom structure
    const newPath = {
      id: generateId(),
      subPaths: [{
        id: generateId(),
        commands: commands
      }],
      style: {
        fill: 'none',
        stroke: '#000000',
        strokeWidth: this.settings.strokeWidth,
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const
      }
    };

    // Add the path to the store
    store.replacePaths([...store.paths, newPath]);
  }

  private animateSimplification(originalPoints: Point[], simplifiedPoints: Point[], svgElement: SVGSVGElement) {
    // Skip animation if already running
    if (svgElement.getAttribute('data-pencil2-anim-running') === '1') {
      this.createPathFromPoints(simplifiedPoints); // Use simplified points
      this.currentPoints = [];
      return;
    }

    const baseFromD = pointsToPath(originalPoints);
    const baseToD = pointsToPath(simplifiedPoints);
    const n = Math.max(Math.max(originalPoints.length, simplifiedPoints.length), 8);
    
    const fromPts = this.samplePathD(baseFromD, n, svgElement);
    const toPts = this.samplePathD(baseToD, n, svgElement);

    // Force endpoints to match
    if (fromPts.length > 0 && originalPoints.length > 0) {
      fromPts[0] = { x: Math.round(originalPoints[0].x), y: Math.round(originalPoints[0].y) };
      fromPts[fromPts.length - 1] = { x: Math.round(originalPoints[originalPoints.length - 1].x), y: Math.round(originalPoints[originalPoints.length - 1].y) };
    }
    if (toPts.length > 0 && simplifiedPoints.length > 0) {
      toPts[0] = { x: Math.round(simplifiedPoints[0].x), y: Math.round(simplifiedPoints[0].y) };
      toPts[toPts.length - 1] = { x: Math.round(simplifiedPoints[simplifiedPoints.length - 1].x), y: Math.round(simplifiedPoints[simplifiedPoints.length - 1].y) };
    }

    const dFrom = this.createMorphD(fromPts);
    const dTo = this.createMorphD(toPts);

    this.ensureGlowFilter(svgElement);

    const animPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    animPath.setAttribute('d', dFrom);
    animPath.setAttribute('stroke', '#d9d9d9');
    animPath.setAttribute('stroke-opacity', '0.8');
    animPath.setAttribute('stroke-width', String(this.settings.strokeWidth));
    animPath.setAttribute('fill', 'none');
    animPath.setAttribute('stroke-linecap', 'round');
    animPath.setAttribute('filter', 'url(#pencil2AnimGlowFilter)');

    const animateEl = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
    animateEl.setAttribute('attributeName', 'd');
    animateEl.setAttribute('from', dFrom);
    animateEl.setAttribute('to', dTo);
    animateEl.setAttribute('dur', '500ms');
    animateEl.setAttribute('fill', 'freeze');
    animPath.appendChild(animateEl);
    
    svgElement.appendChild(animPath);
    svgElement.setAttribute('data-pencil2-anim-running', '1');

    try {
      (animateEl as any).beginElement();
    } catch (e) {
      // Fallback for browsers that don't support beginElement
    }

    const durationMs = 500;
    let committed = false;
    
    const cleanup = () => {
      if (committed) return;
      committed = true;
      
      this.createPathFromPoints(simplifiedPoints); // Use simplified points!
      
      try {
        svgElement.removeChild(animPath);
      } catch (e) {
        // Element might already be removed
      }
      
      svgElement.removeAttribute('data-pencil2-anim-running');
      this.currentPoints = [];
      this.animationId = null;
    };

    const timeout = setTimeout(cleanup, durationMs + 50);
    this.animationId = timeout as unknown as number;

    // Listen for animation end
    if ((animateEl as any).addEventListener) {
      (animateEl as any).addEventListener('endEvent', cleanup);
    }
  }

  // Get current drawing points for rendering
  getCurrentPoints(): Point[] {
    return [...this.currentPoints, ...this.pointsBuffer];
  }

  // Get current path data for rendering
  getCurrentPathData(): string {
    const points = this.getCurrentPoints();
    return points.length > 0 ? pointsToPath(points) : '';
  }

  // Check if currently drawing
  getIsDrawing(): boolean {
    return this.isDrawing;
  }

  // Filter out duplicate and very close points to avoid curve artifacts
  private filterPoints(points: Point[], minDistance = 2): Point[] {
    if (points.length <= 1) return points;
    
    const filtered = [points[0]];
    for (let i = 1; i < points.length; i++) {
      const prev = filtered[filtered.length - 1];
      const curr = points[i];
      const dist = Math.sqrt((curr.x - prev.x) ** 2 + (curr.y - prev.y) ** 2);
      
      if (dist >= minDistance) {
        filtered.push(curr);
      }
    }
    
    return filtered;
  }
}

export const pencil2Manager = new Pencil2Manager();