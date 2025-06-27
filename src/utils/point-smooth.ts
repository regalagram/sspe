import { SVGCommand } from '../types';

/**
 * Creates smooth Bézier curves from line segments using Catmull-Rom spline algorithm
 * Implements the exact algorithm from the provided pseudocode
 */
export function getPointSmooth(commands: SVGCommand[]): SVGCommand[] {
  if (!commands || commands.length < 2) {
    return commands;
  }

  // PASO 1: ANÁLISIS DE SECUENCIA DE PUNTOS
  const points: { x: number; y: number; originalCommand: SVGCommand; index: number }[] = [];
  
  // Extraer coordenadas (x,y) de todos los comandos
  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    if ('x' in cmd && 'y' in cmd && cmd.x !== undefined && cmd.y !== undefined) {
      points.push({
        x: cmd.x,
        y: cmd.y,
        originalCommand: cmd,
        index: i
      });
    }
  }

  if (points.length < 3) {
    // No hay suficientes puntos para suavizar
    return commands;
  }

  const smoothedCommands: SVGCommand[] = [];
  
  // PASO 2: DETECCIÓN DE SEGMENTOS PARA SUAVIZAR
  // Factor de tensión (controla "suavidad")
  const tension = 0.5; // Valor típico entre 0.0 (angular) y 1.0 (muy suave)
  const smoothingThreshold = Math.PI / 6; // 30 grados - ángulo mínimo para suavizar
  const epsilon = 1e-6; // Tolerancia para puntos "iguales"

  // DETECTAR SI ES FIGURA CERRADA
  const esFiguraCerrada = points.length > 2 && (
    Math.abs(points[0].x - points[points.length - 1].x) < epsilon &&
    Math.abs(points[0].y - points[points.length - 1].y) < epsilon
  );

  console.log('Figura cerrada detectada:', esFiguraCerrada);

  // FUNCIÓN AUXILIAR PARA ACCESO CIRCULAR
  const obtenerPuntoCircular = (índice: number) => {
    const n = points.length;
    if (!esFiguraCerrada) {
      // Para figuras abiertas, usar extrapolación en los extremos
      if (índice < 0) return points[0];
      if (índice >= n) return points[n - 1];
      return points[índice];
    }
    
    // Para figuras cerradas, usar acceso circular
    if (índice < 0) {
      // Envolver hacia el final (excluyendo último punto que duplica al primero)
      const índiceReal = n - 2 + (índice + 1);
      return points[Math.max(0, índiceReal)];
    }
    
    if (índice >= n - 1) {
      // Envolver hacia el inicio
      const índiceReal = índice % (n - 1);
      return points[índiceReal];
    }
    
    return points[índice];
  };

  // Preservar el primer comando (siempre M)
  if (points.length > 0) {
    smoothedCommands.push({ ...points[0].originalCommand });
  }

  // PASO 3: GENERACIÓN DE CURVAS BÉZIER CÚBICAS
  // Para cada segmento (desde el segundo punto), calcular si necesita suavizado
  // IMPORTANTE: Procesar TODOS los puntos, incluyendo primero y último
  for (let i = 1; i < points.length; i++) {
    // MANEJO ESPECIAL PARA FIGURAS CERRADAS
    let P0, P1, P2, P3;
    
    if (esFiguraCerrada) {
      // Usar acceso circular para figuras cerradas
      P0 = obtenerPuntoCircular(i - 2);
      P1 = obtenerPuntoCircular(i - 1);
      P2 = obtenerPuntoCircular(i);
      P3 = obtenerPuntoCircular(i + 1);
    } else {
      // Usar lógica normal para figuras abiertas
      P0 = i > 1 ? points[i - 2] : points[i - 1];
      P1 = points[i - 1];
      P2 = points[i];
      P3 = i < points.length - 1 ? points[i + 1] : points[i];
    }

    // Verificar si necesita suavizado (detectar "esquina")
    let needsSmoothing = false;
    
    // CAMBIO CRÍTICO: También evaluar primer y último segmento
    if (points.length >= 3) {
      // Para el primer segmento (i=1), evaluar si hay continuidad
      if (i === 1) {
        if (esFiguraCerrada) {
          // En figuras cerradas, siempre suavizar el primer segmento
          needsSmoothing = true;
        } else {
          // En figuras abiertas, verificar si hay vector de salida válido
          const outVec = { x: P3.x - P2.x, y: P3.y - P2.y };
          const outLength = Math.sqrt(outVec.x * outVec.x + outVec.y * outVec.y);
          needsSmoothing = outLength > 1e-6 && points.length > 2;
        }
      }
      // Para el último segmento en figuras cerradas, también suavizar
      else if (i === points.length - 1 && esFiguraCerrada) {
        needsSmoothing = true;
      }
      // Para el último segmento en figuras abiertas
      else if (i === points.length - 1 && !esFiguraCerrada) {
        const inVec = { x: P1.x - P0.x, y: P1.y - P0.y };
        const inLength = Math.sqrt(inVec.x * inVec.x + inVec.y * inVec.y);
        needsSmoothing = inLength > 1e-6 && points.length > 2;
      }
      // Para segmentos intermedios, calcular ángulo entre vectores
      else if (i > 1 && i < points.length - 1) {
        const inVec = { x: P1.x - P0.x, y: P1.y - P0.y };
        const outVec = { x: P2.x - P1.x, y: P2.y - P1.y };
        
        const inLength = Math.sqrt(inVec.x * inVec.x + inVec.y * inVec.y);
        const outLength = Math.sqrt(outVec.x * outVec.x + outVec.y * outVec.y);
        
        if (inLength > 1e-6 && outLength > 1e-6) {
          const inNorm = { x: inVec.x / inLength, y: inVec.y / inLength };
          const outNorm = { x: outVec.x / outLength, y: outVec.y / outLength };
          
          // Calcular ángulo entre vectores
          const dotProduct = inNorm.x * outNorm.x + inNorm.y * outNorm.y;
          const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct))); // Clamp para evitar NaN
          
          // Si el ángulo es mayor al umbral, necesita suavizado
          needsSmoothing = angle > smoothingThreshold;
        }
      }
    }

    if (needsSmoothing) {
      // CÁLCULO DE PUNTOS DE CONTROL BÉZIER usando Catmull-Rom
      
      // Vectores tangentes usando algoritmo Catmull-Rom
      // tangente1 = (P2 - P0) * tensión
      // tangente2 = (P3 - P1) * tensión
      const tangent1 = {
        x: (P2.x - P0.x) * tension,
        y: (P2.y - P0.y) * tension
      };
      
      const tangent2 = {
        x: (P3.x - P1.x) * tension,
        y: (P3.y - P1.y) * tension
      };
      
      // Puntos de control Bézier derivados de tangentes Catmull-Rom
      // control1 = P1 + tangente1 / 3
      // control2 = P2 - tangente2 / 3
      const control1 = {
        x: P1.x + tangent1.x / 3,
        y: P1.y + tangent1.y / 3
      };
      
      const control2 = {
        x: P2.x - tangent2.x / 3,
        y: P2.y - tangent2.y / 3
      };
      
      // CASO ESPECIAL: Si es figura cerrada y estamos en el último punto
      // que coincide con el primero, ajustar para continuidad
      if (esFiguraCerrada && i === points.length - 1) {
        console.log('Aplicando cálculo especial para último punto en figura cerrada');
        
        // El último punto debe coincidir exactamente con el primero
        const firstPoint = points[0];
        
        // Generar comando C que termina exactamente en el primer punto
        const bezierCommand: SVGCommand = {
          ...P2.originalCommand,
          command: 'C',
          x1: control1.x,
          y1: control1.y,
          x2: control2.x,
          y2: control2.y,
          x: firstPoint.x,  // Forzar cierre exacto
          y: firstPoint.y,  // Forzar cierre exacto
        };
        
        smoothedCommands.push(bezierCommand);
      } else {
        // Generar comando C normal
        const bezierCommand: SVGCommand = {
          ...P2.originalCommand,
          command: 'C',
          x1: control1.x,      // Primer punto de control
          y1: control1.y,
          x2: control2.x,      // Segundo punto de control  
          y2: control2.y,
          x: P2.x,             // Punto final de la curva
          y: P2.y,
        };
        
        smoothedCommands.push(bezierCommand);
      }
    } else {
      // PASO 4: PRESERVAR SEGMENTOS NO SUAVIZADOS
      // Los segmentos que ya son curvos o muy cortos se mantienen sin cambios
      
      // CASO ESPECIAL: Para figuras cerradas, asegurar que el último punto coincida
      if (esFiguraCerrada && i === points.length - 1) {
        const firstPoint = points[0];
        const preservedCommand = { 
          ...P2.originalCommand,
          x: firstPoint.x,  // Forzar cierre exacto
          y: firstPoint.y   // Forzar cierre exacto
        };
        smoothedCommands.push(preservedCommand);
      } else {
        smoothedCommands.push({ ...P2.originalCommand });
      }
    }
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
      cmd.command === 'M' || cmd.command === 'm'
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
