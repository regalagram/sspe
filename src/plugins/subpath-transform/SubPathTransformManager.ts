import { useEditorStore } from '../../store/editorStore';
import { generateId } from '../../utils/id-utils';
import { rdp } from '../../utils/rdp-utils';
import { pluginManager } from '../../core/PluginSystem';
import type { Point, SVGCommand } from '../../types';

export class SubPathTransformManager {
  private animationId: number | null = null;

  destroy() {
    if (this.animationId) {
      clearTimeout(this.animationId);
      this.animationId = null;
    }
  }

  // Convert points to path using Catmull-Rom to Bezier (exact same logic as Pencil2)
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
    // Si tienen el mismo número de comandos, probablemente pueden usar animación directa
    if (commands1.length === commands2.length) {
      return true;
    }
    
    // Si la diferencia es pequeña (menos del 50%), intentar animación directa
    const sizeDiff = Math.abs(commands1.length - commands2.length);
    const avgSize = (commands1.length + commands2.length) / 2;
    const diffPercent = sizeDiff / avgSize;
    
    return diffPercent < 0.5; // Menos del 50% de diferencia
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

  // Create morphing path data for animation - IDENTICAL to Pencil2
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

    const originalPoints = this.commandsToPoints(originalCommands);
    const smoothedCommands = this.applySmoothAlgorithm(originalCommands);
    const smoothedPoints = this.commandsToPoints(smoothedCommands);

        
    // NUEVO ENFOQUE: Para que funcione el morphing, ambos paths deben tener la misma estructura
    // Convertir los puntos originales a curvas usando el mismo algoritmo que smooth
    // pero con tensión 0 (líneas rectas como curvas)
    
        
    // Crear path con curvas para los puntos originales (curvas de líneas rectas)
    const originalAsCurves = this.convertLinesToMatchingCurves(originalPoints);
    const dFrom = this.commandsToPathString(originalAsCurves);
    const dTo = this.commandsToPathString(smoothedCommands);
    
            
    // Verificar si son diferentes
    const arePathsDifferent = dFrom !== dTo;
        
    if (!arePathsDifferent) {
      console.warn('⚠️ PROBLEMA: Los curve paths son iguales!');
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
    
    // Apply viewport transform to animation element - IGUAL que Pencil2
    const store = useEditorStore.getState();
        const transform = `translate(${store.viewport.pan.x}, ${store.viewport.pan.y}) scale(${store.viewport.zoom})`;
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
    onComplete: (simplifiedCommands: SVGCommand[]) => void
  ) {
        
    // Get the correct SVG element from plugin manager
    const svgRef = pluginManager.getSVGRef();
    const svgElement = svgRef?.current;
                       
    if (!svgElement) {
      console.warn('⚠️ SVG element not found via plugin manager for simplify, falling back without animation');
      const simplifiedCommands = this.applySimplifyAlgorithm(originalCommands, tolerance);
      onComplete(simplifiedCommands);
      return;
    }

    
    // Skip animation if already running
    if (svgElement.getAttribute('data-transform-anim-running') === '1') {
            const simplifiedCommands = this.applySimplifyAlgorithm(originalCommands, tolerance);
      onComplete(simplifiedCommands);
      return;
    }

    const originalPoints = this.commandsToPoints(originalCommands);
    const simplifiedCommands = this.applySimplifyAlgorithm(originalCommands, tolerance);
    const simplifiedPoints = this.commandsToPoints(simplifiedCommands);

        
    // NUEVO ENFOQUE PARA SIMPLIFY: Crear paths compatibles para morphing
    // 1. Generar path inicial con puntos adicionales usando pointsToPath (curvas suaves)
    // 2. Convertir path final (simplificado) a curvas que representen líneas rectas
    
        
    // Usar pointsToPath para crear un path inicial más complejo con curvas suaves
    const enhancedInitialPath = this.pointsToPath(originalPoints);
        
    // Convertir los puntos simplificados a curvas que representen líneas rectas
    const simplifiedAsStraightCurves = this.convertLinesToMatchingCurves(simplifiedPoints);
    
    // Crear paths de comandos
    const dFrom = enhancedInitialPath;
    const dTo = this.commandsToPathString(simplifiedAsStraightCurves);
    
            
    // Verificar si son diferentes
    const arePathsDifferent = dFrom !== dTo;
        
    if (!arePathsDifferent) {
      console.warn('⚠️ PROBLEMA: Los simplify paths son iguales!');
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
    
    // Apply viewport transform to animation element - IGUAL que Pencil2
    const store = useEditorStore.getState();
        const transform = `translate(${store.viewport.pan.x}, ${store.viewport.pan.y}) scale(${store.viewport.zoom})`;
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

    // PASO 1: Normalización de comandos Z (convertir Z a L explícita)
    const normalizedCommands = this.normalizeZCommandsForSmoothing(commands);
    const originalEndsWithZ = commands[commands.length - 1]?.command === 'Z';

    // PASO 2: Extracción de puntos con manejo de comandos H, V
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
      return commands; // No enough points for smoothing
    }

    // PASO 3: Detectar si es path cerrado
    const toleranceComparison = 1e-6;
    const isClosedPath = points.length > 2 && (
      Math.abs(points[0].x - points[points.length - 1].x) < toleranceComparison &&
      Math.abs(points[0].y - points[points.length - 1].y) < toleranceComparison
    );

    // PASO 4: Preparación de puntos fantasma según casos de borde
    const pointsWithGhosts: typeof points = [];
    
    if (isClosedPath) {
      const firstPoint = points[0];
      const lastPoint = points[points.length - 1];
      const areFirstLastEqual = Math.abs(firstPoint.x - lastPoint.x) < toleranceComparison && 
                               Math.abs(firstPoint.y - lastPoint.y) < toleranceComparison;
      
      if (areFirstLastEqual && points.length > 2) {
        // CASO ESPECIAL: primer punto = último punto
        // Agregar el penúltimo punto al inicio como fantasma
        pointsWithGhosts.push(points[points.length - 2]);
        pointsWithGhosts.push(...points);
        // Agregar el segundo punto al final como fantasma
        pointsWithGhosts.push(points[1]);
      } else {
        // Caso normal de path cerrado
        pointsWithGhosts.push(points[points.length - 1]);
        pointsWithGhosts.push(...points);
        pointsWithGhosts.push(points[0]);
      }
    } else {
      // Para paths abiertos: calcular puntos fantasma por extrapolación
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

    // PASO 5: Generación de comandos suavizados
    const smoothedCommands: SVGCommand[] = [];
    
    // Preservar el primer comando (siempre M)
    if (points.length > 0) {
      smoothedCommands.push({
        ...points[0].originalCommand,
        command: 'M'
      });
    }

    // Generar curvas Bézier cúbicas usando el algoritmo estándar de Catmull-Rom
    for (let i = 1; i < pointsWithGhosts.length - 2; i++) {
      const p0 = pointsWithGhosts[i - 1];
      const p1 = pointsWithGhosts[i];
      const p2 = pointsWithGhosts[i + 1];
      const p3 = pointsWithGhosts[i + 2];
      
      // Skip si estamos procesando puntos fantasma
      if (p2.index < 0 || p2.index >= points.length) continue;
      
      // Catmull-Rom to Bezier conversion (standard) - igual que en Pencil2
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      
      // Crear comando Bézier cúbico
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

    // PASO 6: Manejo de paths cerrados - agregar línea de cierre si es necesario
    if (originalEndsWithZ && smoothedCommands.length > 0) {
      const lastCmd = smoothedCommands[smoothedCommands.length - 1];
      const firstCmd = smoothedCommands[0];
      
      if (lastCmd && firstCmd && 
          'x' in lastCmd && 'y' in lastCmd && 'x' in firstCmd && 'y' in firstCmd &&
          lastCmd.x !== undefined && lastCmd.y !== undefined &&
          firstCmd.x !== undefined && firstCmd.y !== undefined) {
        
        const distanciaX = Math.abs(lastCmd.x - firstCmd.x);
        const distanciaY = Math.abs(lastCmd.y - firstCmd.y);
        const epsilon = 1e-6;
        
        if (distanciaX > epsilon || distanciaY > epsilon) {
          // Agregar línea explícita para cerrar el path
          const comandoCierre: SVGCommand = {
            id: generateId(),
            command: 'L',
            x: firstCmd.x,
            y: firstCmd.y,
          };
          smoothedCommands.push(comandoCierre);
        }
      }
      
      // NO agregar comando Z para mejor comportamiento con suavizado
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

  // Apply simplify algorithm using RDP
  private applySimplifyAlgorithm(commands: SVGCommand[], tolerance: number): SVGCommand[] {
    if (commands.length < 2) return commands;

    const points = this.commandsToPoints(commands);
    if (points.length < 2) return commands;

    // Apply RDP simplification
    const simplifiedPoints = rdp(points, tolerance);
    
    // Convert back to commands
    const newCommands: SVGCommand[] = [];
    
    for (let i = 0; i < simplifiedPoints.length; i++) {
      const point = simplifiedPoints[i];
      const command = i === 0 ? 'M' : 'L';
      
      newCommands.push({
        id: generateId(),
        command: command,
        x: Math.round(point.x),
        y: Math.round(point.y)
      });
    }

    // Preserve Z command if original had it
    if (commands[commands.length - 1]?.command === 'Z') {
      newCommands.push({
        id: generateId(),
        command: 'Z'
      });
    }

    return newCommands;
  }
}

export const subPathTransformManager = new SubPathTransformManager();