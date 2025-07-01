import { SVGCommand } from '../types';

/**
 * Creates smooth Bézier curves from line segments using enhanced Catmull-Rom spline algorithm
 * Implements the exact specification with adaptive tension, proper ghost point handling,
 * and exact control point calculations
 */
export function getPointSmooth(commands: SVGCommand[]): SVGCommand[] {
  if (!commands || commands.length < 2) {
    return commands;
  }

  // PASO 1: EXTRACCIÓN DE PUNTOS según especificación
  const points: { x: number; y: number; originalCommand: SVGCommand; index: number }[] = [];
  
  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    // Manejo de comandos especiales H, V según especificación
    if ('x' in cmd && 'y' in cmd && cmd.x !== undefined && cmd.y !== undefined) {
      points.push({
        x: cmd.x,
        y: cmd.y,
        originalCommand: cmd,
        index: i
      });
    } else if (cmd.command.toUpperCase() === 'H' && 'x' in cmd && cmd.x !== undefined) {
      // Para comando H, usar Y del comando anterior
      const prevPoint = points.length > 0 ? points[points.length - 1] : { x: 0, y: 0 };
      points.push({
        x: cmd.x,
        y: prevPoint.y,
        originalCommand: cmd,
        index: i
      });
    } else if (cmd.command.toUpperCase() === 'V' && 'y' in cmd && cmd.y !== undefined) {
      // Para comando V, usar X del comando anterior
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
    return commands;
  }

  const smoothedCommands: SVGCommand[] = [];
  
  // PASO 2: PARÁMETROS DE CONFIGURACIÓN según especificación
  const tensionDefault = 0.5; // Tensión por defecto (rango 0.1-0.9)
  const toleranceComparison = 1e-6; // Tolerancia de comparación
  const vectorLimits = 10000; // Límites de vector ±10000
  
  // PASO 3: DETECTAR SI ES PATH CERRADO
  const isClosedPath = points.length > 2 && (
    Math.abs(points[0].x - points[points.length - 1].x) < toleranceComparison &&
    Math.abs(points[0].y - points[points.length - 1].y) < toleranceComparison
  );

  // PASO 4: PREPARACIÓN DE PUNTOS FANTASMA según especificación exacta
  const pointsWithGhosts: typeof points = [];
  
  if (isClosedPath) {
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    const areFirstLastEqual = Math.abs(firstPoint.x - lastPoint.x) < toleranceComparison && 
                             Math.abs(firstPoint.y - lastPoint.y) < toleranceComparison;
    
    if (areFirstLastEqual && points.length > 2) {
      // Agregar el penúltimo punto al inicio
      pointsWithGhosts.push(points[points.length - 2]);
      pointsWithGhosts.push(...points);
      // Agregar el segundo punto al final
      pointsWithGhosts.push(points[1]);
    } else {
      // Agregar el último punto al inicio
      pointsWithGhosts.push(points[points.length - 1]);
      pointsWithGhosts.push(...points);
      // Agregar el primer punto al final
      pointsWithGhosts.push(points[0]);
    }
  } else {
    // Para paths abiertos: calcular puntos fantasma por extrapolación
    if (points.length >= 2) {
      // Punto fantasma inicial = primer_punto - (segundo_punto - primer_punto)
      const ghostStart = {
        x: points[0].x - (points[1].x - points[0].x),
        y: points[0].y - (points[1].y - points[0].y),
        originalCommand: points[0].originalCommand,
        index: -1
      };
      pointsWithGhosts.push(ghostStart);
      pointsWithGhosts.push(...points);
      
      // Punto fantasma final = último_punto + (último_punto - penúltimo_punto)
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

  // Preservar el primer comando (siempre M)
  if (points.length > 0) {
    smoothedCommands.push({ ...points[0].originalCommand });
  }

  // PASO 5: GENERACIÓN DE CURVAS BÉZIER CÚBICAS
  // Procesar cada par de puntos consecutivos (p1, p2) con contexto (p0, p3)
  for (let i = 1; i < pointsWithGhosts.length - 2; i++) {
    const p0 = pointsWithGhosts[i - 1];
    const p1 = pointsWithGhosts[i];
    const p2 = pointsWithGhosts[i + 1];
    const p3 = pointsWithGhosts[i + 2];
    
    // Skip si estamos procesando puntos fantasma en lugar de puntos originales
    if (p2.index < 0 || p2.index >= points.length) continue;
    
    // Calcular distancia entre puntos consecutivos
    const distance = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    
    // Tensión adaptativa: tensión * (1 + distancia/500), limitada entre 0.1-0.9
    const tensionAdjusted = Math.max(0.1, Math.min(0.9, tensionDefault * (1 + distance / 500)));
    
    // Calcular vectores con límites según especificación
    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
    
    const vector0 = {
      x: clamp(p2.x - p0.x, -vectorLimits, vectorLimits),
      y: clamp(p2.y - p0.y, -vectorLimits, vectorLimits)
    };
    
    const vector1 = {
      x: clamp(p3.x - p1.x, -vectorLimits, vectorLimits),
      y: clamp(p3.y - p1.y, -vectorLimits, vectorLimits)
    };
    
    // Calcular puntos de control Bézier según especificación exacta
    const controlPoint1 = {
      x: p1.x + (vector0.x / 6) * tensionAdjusted,
      y: p1.y + (vector0.y / 6) * tensionAdjusted
    };
    
    const controlPoint2 = {
      x: p2.x - (vector1.x / 6) * tensionAdjusted,
      y: p2.y - (vector1.y / 6) * tensionAdjusted
    };
    
    // Generar comando Bézier cúbico
    const bezierCommand: SVGCommand = {
      ...p2.originalCommand,
      command: 'C',
      x1: controlPoint1.x,
      y1: controlPoint1.y,
      x2: controlPoint2.x,
      y2: controlPoint2.y,
      x: p2.x,
      y: p2.y
    };
    
    smoothedCommands.push(bezierCommand);
  }

  return smoothedCommands;
}

/**
 * Normalize Z commands for smoothing by converting them to explicit L commands
 * PROPÓSITO: Convertir comandos Z a L para facilitar el suavizado
 * Los comandos Z (cerrar path) crean discontinuidades que interfieren
 * con los algoritmos de suavizado tipo spline
 */
export function normalizeZCommandsForSmoothing(segment: SVGCommand[]): SVGCommand[] {
  if (!segment || segment.length < 2) {
    return segment; // Sin cambios para segmentos muy cortos
  }
  
  // Crear copia profunda del segmento
  const normalizedSegment = JSON.parse(JSON.stringify(segment));
  const lastCommand = normalizedSegment[normalizedSegment.length - 1];
  
  // DETECTAR Y CONVERTIR COMANDO Z
  if (lastCommand && (lastCommand.command === 'Z' || lastCommand.command === 'z')) {
    // Buscar el comando M (moveTo) para obtener punto de inicio
    const firstCommand = normalizedSegment.find((cmd: SVGCommand) => 
      cmd.command === 'M'
    );
    
    if (firstCommand && 'x' in firstCommand && 'y' in firstCommand && 
        firstCommand.x !== undefined && firstCommand.y !== undefined) {
      // REEMPLAZAR Z con L explícito hacia el punto de inicio
      const lastIndex = normalizedSegment.length - 1;
      normalizedSegment[lastIndex] = {
        id: `${lastCommand.id || 'normalized'}-close`,
        command: 'L',                    // Línea explícita
        x: firstCommand.x,              // Coordenada X del punto inicial  
        y: firstCommand.y,              // Coordenada Y del punto inicial
        isRelative: false               // Coordenadas absolutas
      };
      
      // NOTA IMPORTANTE:
      // - Esto convierte un path cerrado en uno "casi cerrado" con línea explícita
      // - Los algoritmos de suavizado pueden procesar mejor las líneas que los comandos Z
      // - El resultado visual es idéntico pero matemáticamente más procesable
    } else {
      // Si no hay comando M válido, mantener Z (caso de error)
      console.warn('No se encontró comando M válido para convertir Z');
    }
  }
  
  return normalizedSegment;
}
