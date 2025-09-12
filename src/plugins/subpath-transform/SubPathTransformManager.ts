import { useEditorStore } from '../../store/editorStore';
import { generateId } from '../../utils/id-utils';
import { simplifySegmentWithPointsOnPath, generateSubpathString } from '../../utils/path-simplification-utils';
import { pluginManager } from '../../core/PluginSystem';
import type { Point, SVGCommand } from '../../types';
import { pointsOnPath } from 'points-on-path';

export class SubPathTransformManager {
  private animationId: number | null = null;

  destroy() {
    if (this.animationId) {
      clearTimeout(this.animationId);
      this.animationId = null;
    }
  }

  // Convert points to path using Catmull-Rom to Bezier (exact same logic as pencil)
  private pointsToPath(points: Point[]): string {
    // output path using cubic Beziers derived from Catmull-Rom spline
    // also round all coordinates to integers
    if (!points || points.length === 0) return ''
    const round = (n: number) => Math.round(n)

    if (points.length === 1) {
      const p = points[0]
      return `M ${round(p.x)} ${round(p.y)}`
    }

    if (points.length === 2) {
      const p0 = points[0]
      const p1 = points[1]
      return `M ${round(p0.x)} ${round(p0.y)} L ${round(p1.x)} ${round(p1.y)}`
    }

    // For 3+ points, convert Catmull-Rom to cubic bezier segments
    const pts = points
    let d = `M ${round(pts[0].x)} ${round(pts[0].y)}`

    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = i - 1 >= 0 ? pts[i - 1] : pts[i]
      const p1 = pts[i]
      const p2 = pts[i + 1]
      const p3 = i + 2 < pts.length ? pts[i + 2] : p2

      // Catmull-Rom to Bezier conversion (standard)
      const c1x = p1.x + (p2.x - p0.x) / 6
      const c1y = p1.y + (p2.y - p0.y) / 6
      const c2x = p2.x - (p3.x - p1.x) / 6
      const c2y = p2.y - (p3.y - p1.y) / 6

      d += ` C ${round(c1x)} ${round(c1y)} ${round(c2x)} ${round(c2y)} ${round(p2.x)} ${round(p2.y)}`
    }

    return d
  }

  // Convert SVG commands to points
  private commandsToPoints(commands: SVGCommand[]): Point[] {
    const points: Point[] = [];

    for (const cmd of commands) {
      if (cmd.command === 'Z') continue; // Skip Z commands

      if ('x' in cmd && 'y' in cmd && cmd.x !== undefined && cmd.y !== undefined) {
        points.push({ x: cmd.x, y: cmd.y });
      }
    }

    return points;
  }

  // Convert SVG commands directly to path string
  private commandsToPathString(commands: SVGCommand[]): string {
    let pathString = '';

    for (const cmd of commands) {
      switch (cmd.command.toUpperCase()) {
        case 'M':
          pathString += `M ${Math.round(cmd.x!)} ${Math.round(cmd.y!)}`;
          break;
        case 'L':
          pathString += ` L ${Math.round(cmd.x!)} ${Math.round(cmd.y!)}`;
          break;
        case 'C':
          pathString += ` C ${Math.round(cmd.x1!)} ${Math.round(cmd.y1!)} ${Math.round(cmd.x2!)} ${Math.round(cmd.y2!)} ${Math.round(cmd.x!)} ${Math.round(cmd.y!)}`;
          break;
        case 'Z':
          pathString += ' Z';
          break;
      }
    }

    return pathString.trim();
  }

  // Convert points to curve commands that match the smoothed structure
  private convertLinesToMatchingCurves(points: Point[]): SVGCommand[] {
    if (points.length < 2) return [];

    const commands: SVGCommand[] = [];

    // First command is always M
    commands.push({
      id: generateId(),
      command: 'M',
      x: Math.round(points[0].x),
      y: Math.round(points[0].y)
    });

    // Convert lines to "flat" curves (curves that look like lines)
    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];

      // Create a cubic curve that represents a line
      // Control points are positioned 1/3 and 2/3 along the line
      const c1x = p1.x + (p2.x - p1.x) / 3;
      const c1y = p1.y + (p2.y - p1.y) / 3;
      const c2x = p1.x + (p2.x - p1.x) * 2 / 3;
      const c2y = p1.y + (p2.y - p1.y) * 2 / 3;

      commands.push({
        id: generateId(),
        command: 'C',
        x1: Math.round(c1x),
        y1: Math.round(c1y),
        x2: Math.round(c2x),
        y2: Math.round(c2y),
        x: Math.round(p2.x),
        y: Math.round(p2.y)
      });
    }

    return commands;
  }

  // Check if two command arrays can use direct animation (similar structure)
  private canUseDirectAnimation(commands1: SVGCommand[], commands2: SVGCommand[]): boolean {
    // If they have the same number of commands, they will probably be able to use direct animation
    if (commands1.length === commands2.length) {
      return true;
    }

    // If the difference is small (less than 50%), try direct animation
    const sizeDiff = Math.abs(commands1.length - commands2.length);
    const avgSize = (commands1.length + commands2.length) / 2;
    const diffPercent = sizeDiff / avgSize;

    return diffPercent < 0.5; // Less than 50% difference
  }

  // Convert path string to points by sampling
  private samplePathD(pathD: string, n: number, svgElement: SVGSVGElement): Point[] {
    const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    tmp.setAttribute('d', pathD);
    tmp.setAttribute('fill', 'none');
    tmp.setAttribute('stroke', 'none');

    svgElement.appendChild(tmp);

    const len = (tmp as SVGPathElement).getTotalLength();
    if (!isFinite(len) || len === 0) {
      svgElement.removeChild(tmp);
      // Return fallback points
      const pts: Point[] = [];
      const fallbackPoint = { x: 0, y: 0 };
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

  // Create morphing path data for animation - IDENTICAL to pencil
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
  private ensureGlowFilter(svgElement: SVGSVGElement, filterId: string) {
    if (svgElement.querySelector(`#${filterId}`)) return;

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', filterId);
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
    feFlood.setAttribute('flood-color', '#00ff88');
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
    filter.appendChild(feComposite1);
    filter.appendChild(feComposite2);
    defs.appendChild(filter);
    svgElement.appendChild(defs);
  }

  // Smooth with animation
  smoothWithAnimation(
    originalCommands: SVGCommand[],
    onComplete: (smoothedCommands: SVGCommand[]) => void
  ) {

    // Get the correct SVG element from plugin manager
    const svgRef = pluginManager.getSVGRef();
    const svgElement = svgRef?.current;

    if (!svgElement) {
      console.warn('⚠️ SVG element not found via plugin manager, falling back without animation');
      const smoothedCommands = this.applySmoothAlgorithm(originalCommands);
      onComplete(smoothedCommands);
      return;
    }


    // Skip animation if already running
    if (svgElement.getAttribute('data-transform-anim-running') === '1') {
      const smoothedCommands = this.applySmoothAlgorithm(originalCommands);
      onComplete(smoothedCommands);
      return;
    }

    // Hide selection UI and points during animation
    const store = useEditorStore.getState();
    const originalSelectionVisible = store.ui?.selectionVisible ?? true;
    const originalPointsVisible = {
      commandPointsEnabled: store.enabledFeatures.commandPointsEnabled,
      controlPointsEnabled: store.enabledFeatures.controlPointsEnabled,
      subpathShowCommandPoints: store.enabledFeatures.subpathShowCommandPoints ?? true,
      subpathShowControlPoints: store.enabledFeatures.subpathShowControlPoints ?? true,
    };

    store.setSelectionVisible(false);
    store.setPointsVisible(false);

    const originalPoints = this.commandsToPoints(originalCommands);
    const smoothedCommands = this.applySmoothAlgorithm(originalCommands);
    const smoothedPoints = this.commandsToPoints(smoothedCommands);


    // NEW APPROACH: For morphing to work, both paths must share the same structure
    // Convert the original points to curves using the same smoothing algorithm
    // but with zero tension (straight lines represented as curves)


    // Create a path of curves for the original points (line-like curves)
    const originalAsCurves = this.convertLinesToMatchingCurves(originalPoints);
    const dFrom = this.commandsToPathString(originalAsCurves);
    const dTo = this.commandsToPathString(smoothedCommands);


    // Check whether the paths are different
    const arePathsDifferent = dFrom !== dTo;

    if (!arePathsDifferent) {
      console.warn('⚠️ WARNING: The curve paths are identical!');
    }


    const filterId = 'transformSmoothGlowFilter';
    this.ensureGlowFilter(svgElement, filterId);

    const animPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    animPath.setAttribute('d', dFrom);
    animPath.setAttribute('stroke', '#00ff88');
    animPath.setAttribute('stroke-opacity', '0.8');
    animPath.setAttribute('stroke-width', '3');
    animPath.setAttribute('fill', 'none');
    animPath.setAttribute('stroke-linecap', 'round');
    animPath.setAttribute('filter', `url(#${filterId})`);
    animPath.setAttribute('vector-effect', 'non-scaling-stroke');

    // Apply viewport transform to animation element - same as pencil
    const viewportStore = useEditorStore.getState();
    const transform = `translate(${viewportStore.viewport.pan.x}, ${viewportStore.viewport.pan.y}) scale(${viewportStore.viewport.zoom})`;
    animPath.setAttribute('transform', transform);

    const animateEl = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
    animateEl.setAttribute('attributeName', 'd');
    animateEl.setAttribute('from', dFrom);
    animateEl.setAttribute('to', dTo);
    animateEl.setAttribute('dur', '1000ms');
    animateEl.setAttribute('fill', 'freeze');
    animPath.appendChild(animateEl);

    svgElement.appendChild(animPath);
    svgElement.setAttribute('data-transform-anim-running', '1');

    try {
      (animateEl as any).beginElement();
    } catch (e) {
      // Fallback for browsers that don't support beginElement
    }

    const durationMs = 1000;
    let committed = false;

    const cleanup = () => {
      if (committed) return;
      committed = true;

      // Restore selection UI and points visibility
      store.setSelectionVisible(originalSelectionVisible);
      store.restorePointsVisibility(originalPointsVisible);

      onComplete(smoothedCommands);

      try {
        svgElement.removeChild(animPath);
      } catch (e) {
        // Element might already be removed
      }

      svgElement.removeAttribute('data-transform-anim-running');
      this.animationId = null;
    };

    const timeout = setTimeout(cleanup, durationMs + 50);
    this.animationId = timeout as unknown as number;

    // Listen for animation end
    if ((animateEl as any).addEventListener) {
      (animateEl as any).addEventListener('endEvent', cleanup);
    }
  }

  // Simplify with animation
  simplifyWithAnimation(
    originalCommands: SVGCommand[],
    tolerance: number,
    distance: number,
    onComplete: (simplifiedCommands: SVGCommand[]) => void
  ) {

    // Get the correct SVG element from plugin manager
    const svgRef = pluginManager.getSVGRef();
    const svgElement = svgRef?.current;

    if (!svgElement) {
      console.warn('⚠️ SVG element not found via plugin manager for simplify, falling back without animation');
      const simplifiedCommands = this.applySimplifyAlgorithm(originalCommands, tolerance, distance);
      onComplete(simplifiedCommands);
      return;
    }


    // Skip animation if already running
    if (svgElement.getAttribute('data-transform-anim-running') === '1') {
      const simplifiedCommands = this.applySimplifyAlgorithm(originalCommands, tolerance, distance);
      onComplete(simplifiedCommands);
      return;
    }

    // Hide selection UI and points during animation
    const store = useEditorStore.getState();
    const originalSelectionVisible = store.ui?.selectionVisible ?? true;
    const originalPointsVisible = {
      commandPointsEnabled: store.enabledFeatures.commandPointsEnabled,
      controlPointsEnabled: store.enabledFeatures.controlPointsEnabled,
      subpathShowCommandPoints: store.enabledFeatures.subpathShowCommandPoints ?? true,
      subpathShowControlPoints: store.enabledFeatures.subpathShowControlPoints ?? true,
    };

    store.setSelectionVisible(false);
    store.setPointsVisible(false);

    const originalPoints = this.commandsToPoints(originalCommands);
    const simplifiedCommands = this.applySimplifyAlgorithm(originalCommands, tolerance, distance);
    const simplifiedPoints = this.commandsToPoints(simplifiedCommands);


    // NEW APPROACH FOR SIMPLIFY: Create compatible paths for morphing
    // 1. Generate an initial path with extra points using pointsToPath (smooth curves)
    // 2. Convert the final (simplified) path to curves that represent straight lines


    // Use pointsToPath to create a more complex initial path with smooth curves
    const enhancedInitialPath = this.pointsToPath(originalPoints);

    // Convert the simplified points to curves that represent straight lines
    const simplifiedAsStraightCurves = this.convertLinesToMatchingCurves(simplifiedPoints);

    // Create command paths
    const dFrom = enhancedInitialPath;
    const dTo = this.commandsToPathString(simplifiedAsStraightCurves);


    // Check whether the paths are different
    const arePathsDifferent = dFrom !== dTo;

    if (!arePathsDifferent) {
      console.warn('⚠️ WARNING: The simplify paths are identical!');
    }


    const filterId = 'transformSimplifyGlowFilter';
    this.ensureGlowFilter(svgElement, filterId);

    const animPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    animPath.setAttribute('d', dFrom);
    animPath.setAttribute('stroke', '#ff8800');
    animPath.setAttribute('stroke-opacity', '0.8');
    animPath.setAttribute('stroke-width', '3');
    animPath.setAttribute('fill', 'none');
    animPath.setAttribute('stroke-linecap', 'round');
    animPath.setAttribute('filter', `url(#${filterId})`);
    animPath.setAttribute('vector-effect', 'non-scaling-stroke');

    // Apply viewport transform to animation element - same as pencil
    const viewportStore = useEditorStore.getState();
    const transform = `translate(${viewportStore.viewport.pan.x}, ${viewportStore.viewport.pan.y}) scale(${viewportStore.viewport.zoom})`;
    animPath.setAttribute('transform', transform);

    const animateEl = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
    animateEl.setAttribute('attributeName', 'd');
    animateEl.setAttribute('from', dFrom);
    animateEl.setAttribute('to', dTo);
    animateEl.setAttribute('dur', '1000ms');
    animateEl.setAttribute('fill', 'freeze');
    animPath.appendChild(animateEl);

    svgElement.appendChild(animPath);
    svgElement.setAttribute('data-transform-anim-running', '1');

    try {
      (animateEl as any).beginElement();
    } catch (e) {
      // Fallback for browsers that don't support beginElement
    }

    const durationMs = 1000;
    let committed = false;

    const cleanup = () => {
      if (committed) return;
      committed = true;

      // Restore selection UI and points visibility
      store.setSelectionVisible(originalSelectionVisible);
      store.restorePointsVisibility(originalPointsVisible);

      onComplete(simplifiedCommands);

      try {
        svgElement.removeChild(animPath);
      } catch (e) {
        // Element might already be removed
      }

      svgElement.removeAttribute('data-transform-anim-running');
      this.animationId = null;
    };

    const timeout = setTimeout(cleanup, durationMs + 50);
    this.animationId = timeout as unknown as number;

    // Listen for animation end
    if ((animateEl as any).addEventListener) {
      (animateEl as any).addEventListener('endEvent', cleanup);
    }
  }

  // Apply smooth algorithm using enhanced Catmull-Rom to Bezier conversion with edge cases
  private applySmoothAlgorithm(commands: SVGCommand[]): SVGCommand[] {
    if (commands.length < 2) return commands;

    // STEP 1: Normalize Z commands (convert trailing Z to an explicit L)
    const normalizedCommands = this.normalizeZCommandsForSmoothing(commands);
    const originalEndsWithZ = commands[commands.length - 1]?.command === 'Z';

    // STEP 2: Extract points with handling for H and V commands
    const points: { x: number; y: number; originalCommand: SVGCommand; index: number }[] = [];

    for (let i = 0; i < normalizedCommands.length; i++) {
      const cmd = normalizedCommands[i];

      if ('x' in cmd && 'y' in cmd && cmd.x !== undefined && cmd.y !== undefined) {
        points.push({
          x: cmd.x,
          y: cmd.y,
          originalCommand: cmd,
          index: i
        });
      } else if (cmd.command.toUpperCase() === 'H' && 'x' in cmd && cmd.x !== undefined) {
        const prevPoint = points.length > 0 ? points[points.length - 1] : { x: 0, y: 0 };
        points.push({
          x: cmd.x,
          y: prevPoint.y,
          originalCommand: cmd,
          index: i
        });
      } else if (cmd.command.toUpperCase() === 'V' && 'y' in cmd && cmd.y !== undefined) {
        const prevPoint = points.length > 0 ? points[points.length - 1] : { x: 0, y: 0 };
        points.push({
          x: prevPoint.x,
          y: cmd.y,
          originalCommand: cmd,
          index: i
        });
      }
    }

    if (points.length < 3) {
      return commands; // Not enough points for smoothing
    }

    // STEP 3: Detect whether the path is closed
    const toleranceComparison = 1e-6;
    const isClosedPath = points.length > 2 && (
      Math.abs(points[0].x - points[points.length - 1].x) < toleranceComparison &&
      Math.abs(points[0].y - points[points.length - 1].y) < toleranceComparison
    );

    // STEP 4: Prepare ghost points for edge cases
    const pointsWithGhosts: typeof points = [];

    if (isClosedPath) {
      const firstPoint = points[0];
      const lastPoint = points[points.length - 1];
      const areFirstLastEqual = Math.abs(firstPoint.x - lastPoint.x) < toleranceComparison &&
        Math.abs(firstPoint.y - lastPoint.y) < toleranceComparison;

      if (areFirstLastEqual && points.length > 2) {
        // SPECIAL CASE: first point == last point
        // Add the penultimate point at the start as a ghost
        pointsWithGhosts.push(points[points.length - 2]);
        pointsWithGhosts.push(...points);
        // Add the second point at the end as a ghost
        pointsWithGhosts.push(points[1]);
      } else {
        // Normal closed-path case
        pointsWithGhosts.push(points[points.length - 1]);
        pointsWithGhosts.push(...points);
        pointsWithGhosts.push(points[0]);
      }
    } else {
      // For open paths: compute ghost points by extrapolation
      if (points.length >= 2) {
        const ghostStart = {
          x: points[0].x - (points[1].x - points[0].x),
          y: points[0].y - (points[1].y - points[0].y),
          originalCommand: points[0].originalCommand,
          index: -1
        };
        pointsWithGhosts.push(ghostStart);
        pointsWithGhosts.push(...points);

        const lastIdx = points.length - 1;
        const prevIdx = points.length - 2;
        const ghostEnd = {
          x: points[lastIdx].x + (points[lastIdx].x - points[prevIdx].x),
          y: points[lastIdx].y + (points[lastIdx].y - points[prevIdx].y),
          originalCommand: points[lastIdx].originalCommand,
          index: points.length
        };
        pointsWithGhosts.push(ghostEnd);
      }
    }

    // STEP 5: Generate smoothed commands
    const smoothedCommands: SVGCommand[] = [];

    // Preserve the first command (always M)
    if (points.length > 0) {
      smoothedCommands.push({
        ...points[0].originalCommand,
        command: 'M'
      });
    }

    // Generate cubic Bezier curves using the standard Catmull-Rom algorithm
    for (let i = 1; i < pointsWithGhosts.length - 2; i++) {
      const p0 = pointsWithGhosts[i - 1];
      const p1 = pointsWithGhosts[i];
      const p2 = pointsWithGhosts[i + 1];
      const p3 = pointsWithGhosts[i + 2];

      // Skip if we are processing ghost points
      if (p2.index < 0 || p2.index >= points.length) continue;

      // Catmull-Rom to Bezier conversion (standard) - same as in pencil
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;

      // Create a cubic Bezier command
      const bezierCommand: SVGCommand = {
        ...p2.originalCommand,
        id: generateId(),
        command: 'C',
        x1: Math.round(c1x),
        y1: Math.round(c1y),
        x2: Math.round(c2x),
        y2: Math.round(c2y),
        x: Math.round(p2.x),
        y: Math.round(p2.y)
      };

      smoothedCommands.push(bezierCommand);
    }

    // STEP 6: Handle closed paths - add an explicit closing line if necessary
    if (originalEndsWithZ && smoothedCommands.length > 0) {
      const lastCmd = smoothedCommands[smoothedCommands.length - 1];
      const firstCmd = smoothedCommands[0];

      if (lastCmd && firstCmd &&
        'x' in lastCmd && 'y' in lastCmd && 'x' in firstCmd && 'y' in firstCmd &&
        lastCmd.x !== undefined && lastCmd.y !== undefined &&
        firstCmd.x !== undefined && firstCmd.y !== undefined) {

        const distanceX = Math.abs(lastCmd.x - firstCmd.x);
        const distanceY = Math.abs(lastCmd.y - firstCmd.y);
        const epsilon = 1e-6;

        if (distanceX > epsilon || distanceY > epsilon) {
          // Add an explicit line to close the path
          const closingCommand: SVGCommand = {
            id: generateId(),
            command: 'L',
            x: firstCmd.x,
            y: firstCmd.y,
          };
          smoothedCommands.push(closingCommand);
        }
      }

      // DO NOT add a Z command for better behavior with smoothing
    }

    return smoothedCommands;
  }

  // Normalize Z commands for smoothing (similar to the original implementation)
  private normalizeZCommandsForSmoothing(segment: SVGCommand[]): SVGCommand[] {
    if (!segment || segment.length < 2) {
      return segment;
    }

    const normalizedSegment = JSON.parse(JSON.stringify(segment));
    const lastCommand = normalizedSegment[normalizedSegment.length - 1];

    if (lastCommand && (lastCommand.command === 'Z' || lastCommand.command === 'z')) {
      const firstCommand = normalizedSegment.find((cmd: SVGCommand) =>
        cmd.command === 'M'
      );

      if (firstCommand && 'x' in firstCommand && 'y' in firstCommand &&
        firstCommand.x !== undefined && firstCommand.y !== undefined) {

        const lastIndex = normalizedSegment.length - 1;
        normalizedSegment[lastIndex] = {
          id: `${lastCommand.id || 'normalized'}-close`,
          command: 'L',
          x: firstCommand.x,
          y: firstCommand.y,
        };
      }
    }

    return normalizedSegment;
  }

  // Apply simplify algorithm using points-on-path
  private applySimplifyAlgorithm(commands: SVGCommand[], tolerance: number, distance: number = 10): SVGCommand[] {
    if (commands.length < 2) return commands;

    // Get grid size from store - use 1 if snapToGrid is disabled, otherwise use store value
    const store = useEditorStore.getState();
    const gridSize = store.grid.snapToGrid ? (store.grid.size || 1) : 1;

    // Use the path simplification utility with configurable parameters
    return simplifySegmentWithPointsOnPath(commands, tolerance, distance, gridSize);
  }

  // Optimization with animation - combines Douglas-Peucker simplification with Bézier curve fitting
  optimizeWithAnimation(
    commands: SVGCommand[], 
    tolerance: number, 
    distance: number, 
    onComplete: (optimizedCommands: SVGCommand[]) => void
  ): void {
    if (commands.length < 2) {
      onComplete(commands);
      return;
    }

    try {
      // Step 1: Convert commands to dense points for processing
      const densePoints = this.commandsToDensePoints(commands);
      
      // Step 2: Apply Douglas-Peucker simplification
      const simplifiedPoints = this.douglasPeucker(densePoints, tolerance, distance);
      
      // Step 3: Apply Bézier curve fitting to get optimized commands
      const optimizedCommands = this.pointsToOptimizedCommands(simplifiedPoints, tolerance);
      
      // For now, apply immediately (we can add animation later if needed)
      onComplete(optimizedCommands);
      
    } catch (error) {
      console.error('Error in optimization:', error);
      onComplete(commands); // Return original commands on error
    }
  }

  // Convert commands to dense points for optimization
  private commandsToDensePoints(commands: SVGCommand[], resolution: number = 1): Point[] {
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
          // Bézier curve interpolation to create dense points
          const distance = Math.hypot(endPoint.x - currentPoint.x, endPoint.y - currentPoint.y);
          const steps = Math.max(2, Math.ceil(distance / resolution));
          
          for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const bezierPoint = this.evaluateBezier(currentPoint, cp1, cp2, endPoint, t);
            points.push(bezierPoint);
          }
        }
        currentPoint = endPoint;
      } else if (cmd.command === 'Z') {
        // Close path - connect back to first point if needed
        if (points.length > 0 && currentPoint) {
          const firstPoint = points[0];
          const distance = Math.hypot(firstPoint.x - currentPoint.x, firstPoint.y - currentPoint.y);
          if (distance > resolution) {
            const steps = Math.max(1, Math.ceil(distance / resolution));
            for (let i = 1; i <= steps; i++) {
              const t = i / steps;
              points.push({
                x: currentPoint.x + (firstPoint.x - currentPoint.x) * t,
                y: currentPoint.y + (firstPoint.y - currentPoint.y) * t
              });
            }
          }
        }
      }
    }

    return points;
  }

  // Evaluate point on cubic Bézier curve
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

  // Douglas-Peucker algorithm with distance filtering
  private douglasPeucker(points: Point[], tolerance: number, minDistance: number): Point[] {
    if (points.length <= 2) return points;
    
    // First, reduce density by minimum distance
    const distanceFiltered = this.filterByDistance(points, minDistance);
    
    // Then apply Douglas-Peucker simplification
    return this.douglasPeuckerRecursive(distanceFiltered, tolerance);
  }

  // Filter points by minimum distance
  private filterByDistance(points: Point[], minDistance: number): Point[] {
    if (points.length <= 2) return points;
    
    const filtered = [points[0]]; // Always include first point
    
    for (let i = 1; i < points.length - 1; i++) {
      const lastPoint = filtered[filtered.length - 1];
      const currentPoint = points[i];
      const distance = Math.hypot(currentPoint.x - lastPoint.x, currentPoint.y - lastPoint.y);
      
      if (distance >= minDistance) {
        filtered.push(currentPoint);
      }
    }
    
    filtered.push(points[points.length - 1]); // Always include last point
    return filtered;
  }

  // Recursive Douglas-Peucker implementation
  private douglasPeuckerRecursive(points: Point[], tolerance: number): Point[] {
    if (points.length <= 2) return points;
    
    let maxDist = 0;
    let maxIndex = 0;
    const start = points[0];
    const end = points[points.length - 1];
    
    // Find the point with maximum distance from line start-end
    for (let i = 1; i < points.length - 1; i++) {
      const dist = this.distanceToLine(points[i], start, end);
      if (dist > maxDist) {
        maxDist = dist;
        maxIndex = i;
      }
    }
    
    // If max distance is greater than tolerance, recursively simplify
    if (maxDist > tolerance) {
      const left = this.douglasPeuckerRecursive(points.slice(0, maxIndex + 1), tolerance);
      const right = this.douglasPeuckerRecursive(points.slice(maxIndex), tolerance);
      
      // Combine results (remove duplicate point)
      return left.slice(0, -1).concat(right);
    } else {
      // All points are within tolerance, return only start and end
      return [start, end];
    }
  }

  // Distance from point to line
  private distanceToLine(point: Point, lineStart: Point, lineEnd: Point): number {
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

  // Convert optimized points back to SVG commands with Bézier fitting
  private pointsToOptimizedCommands(points: Point[], tolerance: number): SVGCommand[] {
    if (points.length === 0) return [];

    const commands: SVGCommand[] = [];
    
    // First command is always M
    commands.push({
      id: generateId(),
      command: 'M',
      x: Math.round(points[0].x),
      y: Math.round(points[0].y)
    });

    if (points.length === 1) return commands;

    // Fit Bézier curves to the remaining points
    const curves = this.fitBezierCurvesOptimized(points, tolerance);
    commands.push(...curves);

    return commands;
  }

  // Optimized Bézier fitting that tries longer segments first
  private fitBezierCurvesOptimized(points: Point[], tolerance: number): SVGCommand[] {
    if (points.length < 2) return [];
    
    const curves: SVGCommand[] = [];
    let i = 0;

    while (i < points.length - 1) {
      let bestFit: any = null;
      let bestJ = i + 1;
      
      // Try longer segments first (up to 8 points)
      const maxSegmentSize = Math.min(i + 8, points.length - 1);
      
      for (let j = maxSegmentSize; j > i + 1; j--) {
        const segment = points.slice(i, j + 1);
        const fit = this.fitCubicBezier(segment, tolerance);
        
        if (fit) {
          bestFit = fit;
          bestJ = j;
          break; // Take the first (longest) valid segment
        }
      }

      if (bestFit && bestJ > i + 1) {
        // Use Bézier curve
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

  // Fit cubic Bézier curve to a set of points
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
    
    // Estimate control point distances
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
    
    // Check if curve fits within tolerance
    const maxError = this.calculateBezierError(points, start, cp1, cp2, end);
    
    if (maxError <= tolerance) {
      return { cp1, cp2, end };
    }
    
    return null;
  }

  // Normalize vector
  private normalize(vector: Point): Point {
    const length = Math.hypot(vector.x, vector.y) || 1;
    return { x: vector.x / length, y: vector.y / length };
  }

  // Calculate maximum error of Bézier fit
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

  /**
   * Densify: Convert subpath to dense points using points-on-path
   * Transforms curves and lines into a dense array of line segments
   */
  public densifySubPath(subPathId: string): void {
    const store = useEditorStore.getState();
    
    // Find the subpath
    let targetSubPath: any = null;
    for (const path of store.paths) {
      const subPath = path.subPaths.find((sp: any) => sp.id === subPathId);
      if (subPath) {
        targetSubPath = subPath;
        break;
      }
    }
    
    if (!targetSubPath || targetSubPath.commands.length < 2) {
      console.warn('SubPath not found or insufficient commands for densification');
      return;
    }

    try {
      // Store original Z command state
      const originalEndsWithZ = targetSubPath.commands[targetSubPath.commands.length - 1]?.command === 'Z';
      
      // Prepare commands for processing - remove Z if present
      let workingCommands = [...targetSubPath.commands];
      if (originalEndsWithZ) {
        workingCommands = workingCommands.slice(0, -1);
      }

      if (workingCommands.length < 2) {
        console.warn('Insufficient commands after Z removal');
        return;
      }

      // Ensure first command is M
      if (workingCommands[0].command !== 'M') {
        if ('x' in workingCommands[0] && 'y' in workingCommands[0]) {
          workingCommands[0] = {
            ...workingCommands[0],
            command: 'M'
          };
        } else {
          console.warn('Cannot convert first command to M - missing coordinates');
          return;
        }
      }

      // Generate path string for points-on-path processing
      const pathString = generateSubpathString(workingCommands);
      if (!pathString) {
        console.warn('Could not generate valid path string for densification');
        return;
      }

      // Use pointsOnPath without tolerance and distance to get ALL points
      const densePointsArrays = pointsOnPath(pathString);
      
      if (!densePointsArrays || densePointsArrays.length === 0) {
        console.warn('pointsOnPath returned no results');
        return;
      }

      // Convert points arrays to commands
      const newCommands: SVGCommand[] = [];
      let isFirstPoint = true;

      for (let i = 0; i < densePointsArrays.length; i++) {
        const pointsArray = densePointsArrays[i];
        
        if (!pointsArray || pointsArray.length === 0) continue;

        for (let j = 0; j < pointsArray.length; j++) {
          const point = pointsArray[j]; // point is [x, y] array
          
          if (isFirstPoint) {
            // First point is always M (Move)
            newCommands.push({
              id: generateId(),
              command: 'M',
              x: Math.round(point[0]),
              y: Math.round(point[1])
            });
            isFirstPoint = false;
          } else {
            // All other points are L (Line)
            newCommands.push({
              id: generateId(),
              command: 'L',
              x: Math.round(point[0]),
              y: Math.round(point[1])
            });
          }
        }
      }

      // Add Z command back if original had it
      if (originalEndsWithZ && newCommands.length > 0) {
        newCommands.push({
          id: generateId(),
          command: 'Z'
        });
      }

      if (newCommands.length === 0) {
        console.warn('No commands generated from dense points');
        return;
      }

      // Push to history before applying changes
      store.pushToHistory();

      // Replace the subpath commands with densified version
      store.replaceSubPathCommands(subPathId, newCommands);

    } catch (error) {
      console.error('❌ DENSIFY: Error during densification:', error);
    }
  }
}

export const subPathTransformManager = new SubPathTransformManager();