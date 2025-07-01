import { SVGCommand, SVGSubPath, Point } from '../types';
import { pointsOnPath } from 'points-on-path';
import { getPointSmooth, normalizeZCommandsForSmoothing } from './point-smooth';

/**
 * Utility functions for path simplification and smoothing
 * Based on the reference implementation
 */

// Simulated snapToGridValue function - will use the grid snap from store
export const snapToGridValue = (value: number, gridSize: number = 1): number => {
  return Math.round(value / gridSize) * gridSize;
};

/**
 * Generates a path string from commands
 */
export const generateSubpathString = (commands: SVGCommand[], options?: { startX?: number; startY?: number }): string => {
  if (!commands || commands.length === 0) return '';
  
  let pathString = '';
  let isFirstCommand = true;
  
  for (const cmd of commands) {
    switch (cmd.command.toUpperCase()) {
      case 'M':
        pathString += isFirstCommand ? `M ${cmd.x} ${cmd.y}` : ` M ${cmd.x} ${cmd.y}`;
        break;
      case 'L':
        pathString += isFirstCommand ? `M ${cmd.x} ${cmd.y}` : ` L ${cmd.x} ${cmd.y}`;
        break;
      case 'C':
        pathString += isFirstCommand ? `M ${cmd.x} ${cmd.y}` : ` C ${cmd.x1} ${cmd.y1} ${cmd.x2} ${cmd.y2} ${cmd.x} ${cmd.y}`;
        break;
      case 'Z':
        if (!isFirstCommand) {
          pathString += ' Z';
        }
        break;
    }
    isFirstCommand = false;
  }
  
  return pathString.trim();
};

/**
 * Generates a segment string from commands (similar to generateSegmentString from reference)
 */
export const generateSegmentString = (segment: SVGCommand[], generateSubpathStringFn: (commands: SVGCommand[], options?: { startX?: number; startY?: number }) => string): string => {
  if (!segment || segment.length === 0) return '';

  let startX = 0;
  let startY = 0;
  const firstCmd = segment[0];

  if ('x' in firstCmd && 'y' in firstCmd) {
    startX = firstCmd.x!;
    startY = firstCmd.y!;
  }

  if (firstCmd.command === 'M') {
    return generateSubpathStringFn(segment);
  } else {
    return generateSubpathStringFn(segment, { startX, startY });
  }
};

/**
 * Simplification using points-on-path (Ramer-Douglas-Peucker algorithm)
 * Based on reference implementation - correctly handles M and Z commands
 */
export const simplifySegmentWithPointsOnPath = (
  segment: SVGCommand[], 
  simplifyTolerance: number = 0.1, 
  simplifyDistance: number = 10,
  gridSize: number = 1
): SVGCommand[] => {
  if (!segment || segment.length < 2) return segment;
  
  // Store original Z command state
  const originalEndsWithZ = segment[segment.length - 1]?.command === 'Z' || 
                             segment[segment.length - 1]?.command === 'Z';
  
  // Prepare segment for processing - remove Z if present
  let workingSegment = [...segment];
  if (originalEndsWithZ) {
    workingSegment = workingSegment.slice(0, -1);
  }
  
  // Ensure we have a valid working segment
  if (workingSegment.length < 2) return segment;
  
  // Ensure first command is M for path generation
  const firstCmd = workingSegment[0];
  if (firstCmd.command !== 'M') {
    // Convert first command to M if it has coordinates
    if ('x' in firstCmd && 'y' in firstCmd) {
      workingSegment[0] = { 
        ...firstCmd, 
        command: 'M'
      };
    } else {
      console.warn('Cannot convert first command to M - missing coordinates');
      return segment;
    }
  }
  
  // Generate path string for points-on-path processing
  const segmentPath = generateSegmentString(workingSegment, generateSubpathString);
  if (!segmentPath || segmentPath.startsWith('L')) {
    console.warn('Could not generate valid path string for segment simplification.');
    return segment;
  }
  
  let simplifiedPointsArrays;
  try {
    simplifiedPointsArrays = pointsOnPath(
      segmentPath,
      simplifyTolerance,
      simplifyDistance
    );
  } catch (error) {
    console.error('Error during pointsOnPath calculation:', error, 'Segment Path:', segmentPath);
    return segment;
  }
  
  if (
    !simplifiedPointsArrays ||
    simplifiedPointsArrays.length === 0 ||
    simplifiedPointsArrays[0].length < 2
  ) {
    console.warn('Simplified path has too few points or pointsOnPath failed.');
    return segment;
  }
  
  const simplifiedPoints = simplifiedPointsArrays[0];
  const newSegmentCommands: SVGCommand[] = [];
  
  // Create simplified commands - first one should be M
  for (let i = 0; i < simplifiedPoints.length; i++) {
    const point = simplifiedPoints[i];
    const command = i === 0 ? 'M' : 'L';
    
    newSegmentCommands.push({
      id: `simplified-${i}`,
      command: command,
      x: gridSize > 0 ? snapToGridValue(point[0], gridSize) : point[0],
      y: gridSize > 0 ? snapToGridValue(point[1], gridSize) : point[1],
    });
  }
  
  // Restore Z command if original had it
  if (originalEndsWithZ && newSegmentCommands.length > 0) {
    newSegmentCommands.push({
      id: `simplified-z`,
      command: 'Z'
    });
  }
  
  return newSegmentCommands;
};

/**
 * Generate smoothed path using the exact algorithm from pseudocode
 * Follows all 7 steps exactly as specified with all edge cases
 */
export const generateSmoothPath = (
  subpathSegment: SVGCommand[],
  commands: SVGCommand[],
  updatePath: (commands: SVGCommand[], addToHistory: boolean) => void,
  snapToGridValue: (value: number) => number,
  historyState?: any
): void => {
  // VALIDACIÓN INICIAL
  if (!subpathSegment || subpathSegment.length < 2) {
    return; // Sin hacer nada
  }
  
  console.log('🔧 PASO 1: Normalización de comandos Z');
  // PASO 1: NORMALIZACIÓN DE COMANDOS Z
  // Los comandos Z deben convertirse a L para mejor suavizado
  const normalizedSegment = normalizeZCommandsForSmoothing(subpathSegment);
  const originalEndsWithZ = (subpathSegment[subpathSegment.length - 1]?.command === 'Z' || 
                             subpathSegment[subpathSegment.length - 1]?.command === 'Z');
  
  console.log('Original ends with Z:', originalEndsWithZ);
  console.log('Normalized segment:', normalizedSegment.map(c => `${c.command}(${c.x},${c.y})`));
  
  console.log('🎨 PASO 2: Aplicar suavizado usando algoritmo Enhanced');
  // PASO 2: APLICAR SUAVIZADO USANDO getPointSmooth() (Algoritmo Enhanced)
  // getPointSmooth ahora implementa el algoritmo Enhanced con tensión adaptativa,
  // manejo avanzado de puntos fantasma y soporte completo para comandos H/V
  let smoothedSegment = getPointSmooth(normalizedSegment);
  
  console.log('Smoothed segment after smoothing:', smoothedSegment.map(c => `${c.command}(${c.x},${c.y})`));
  
  console.log('📐 PASO 3: Ajuste a grilla (Snap to Grid)');
  // PASO 3: AJUSTE A GRILLA (SNAP TO GRID)
  // Todos los puntos calculados se ajustan a la grilla definida
  smoothedSegment = smoothedSegment.map((cmd) => {
    const snappedCmd = { ...cmd };
    
    // Coordenadas principales
    if ('x' in snappedCmd && snappedCmd.x !== undefined) snappedCmd.x = snapToGridValue(snappedCmd.x);
    if ('y' in snappedCmd && snappedCmd.y !== undefined) snappedCmd.y = snapToGridValue(snappedCmd.y);
    
    // Puntos de control Bézier (para comandos C)
    if ('x1' in snappedCmd && snappedCmd.x1 !== undefined) snappedCmd.x1 = snapToGridValue(snappedCmd.x1);
    if ('y1' in snappedCmd && snappedCmd.y1 !== undefined) snappedCmd.y1 = snapToGridValue(snappedCmd.y1);
    if ('x2' in snappedCmd && snappedCmd.x2 !== undefined) snappedCmd.x2 = snapToGridValue(snappedCmd.x2);
    if ('y2' in snappedCmd && snappedCmd.y2 !== undefined) snappedCmd.y2 = snapToGridValue(snappedCmd.y2);
    
    return snappedCmd;
  });
  
  console.log('After grid snapping:', smoothedSegment.map(c => `${c.command}(${c.x},${c.y})`));
  
  console.log('🔄 PASO 4: Manejo de paths cerrados (Caso de borde crítico)');
  // PASO 4: MANEJO DE PATHS CERRADOS (CASO DE BORDE CRÍTICO)
  if (originalEndsWithZ && smoothedSegment.length > 0) {
    const lastCmd = smoothedSegment[smoothedSegment.length - 1];
    const firstCmd = smoothedSegment[0];
    
    // Verificar si es necesario agregar línea de cierre
    if (lastCmd && firstCmd && 
        'x' in lastCmd && 'y' in lastCmd && 'x' in firstCmd && 'y' in firstCmd &&
        lastCmd.x !== undefined && lastCmd.y !== undefined &&
        firstCmd.x !== undefined && firstCmd.y !== undefined) {
      
      const distanciaX = Math.abs(lastCmd.x - firstCmd.x);
      const distanciaY = Math.abs(lastCmd.y - firstCmd.y);
      const epsilon = 1e-6; // Tolerancia para puntos "iguales"
      
      console.log(`Distance check: dx=${distanciaX}, dy=${distanciaY}, epsilon=${epsilon}`);
      
      if (distanciaX > epsilon || distanciaY > epsilon) {
        // Agregar línea explícita para cerrar el path
        const comandoCierre: SVGCommand = {
          id: `${lastCmd.id || 'smooth'}-close`,
          command: 'L',
          x: firstCmd.x,
          y: firstCmd.y,
        };
        smoothedSegment.push(comandoCierre);
        console.log('Added closing line:', comandoCierre);
      }
    }
    
    // IMPORTANTE: NO se agrega comando 'Z' porque:
    //   - Los algoritmos de suavizado funcionan mejor con líneas explícitas
    //   - 'Z' puede crear discontinuidades en el suavizado
    //   - El comportamiento visual es idéntico con 'L' al primer punto
  }
  
  console.log('📍 PASO 5: Preservación de comando M inicial (Caso de borde)');
  // PASO 5: PRESERVACIÓN DE COMANDO M INICIAL (CASO DE BORDE)
  const originalFirstCommand = subpathSegment[0];
  
  // Caso 1: El original era M pero el suavizado lo cambió
  if (originalFirstCommand && originalFirstCommand.command === 'M' && 
      smoothedSegment.length > 0 && smoothedSegment[0].command !== 'M') {
    
    const firstSmoothed = smoothedSegment[0];
    
    if ('x' in originalFirstCommand && 'y' in originalFirstCommand &&
        originalFirstCommand.x !== undefined && originalFirstCommand.y !== undefined &&
        'x' in firstSmoothed && 'y' in firstSmoothed &&
        firstSmoothed.x !== undefined && firstSmoothed.y !== undefined) {
      
      // Verificar si las coordenadas son diferentes
      const coordenadasDiferentes = (
        snapToGridValue(originalFirstCommand.x) !== snapToGridValue(firstSmoothed.x) ||
        snapToGridValue(originalFirstCommand.y) !== snapToGridValue(firstSmoothed.y)
      );
      
      console.log('Coordinates different:', coordenadasDiferentes);
      
      if (coordenadasDiferentes) {
        // Insertar M explícito al inicio
        const comandoM: SVGCommand = {
          id: originalFirstCommand.id,
          command: 'M',
          x: snapToGridValue(originalFirstCommand.x),
          y: snapToGridValue(originalFirstCommand.y),
        };
        smoothedSegment.unshift(comandoM);
        console.log('Inserted explicit M command:', comandoM);
      } else {
        // Simplemente cambiar el tipo de comando
        firstSmoothed.command = 'M';
        console.log('Changed first command to M');
      }
    }
  }
  
  // Caso 2: El original NO era M pero el suavizado lo convirtió a M
  if (originalFirstCommand && originalFirstCommand.command !== 'M' && 
      smoothedSegment.length > 0 && smoothedSegment[0].command === 'M') {
    smoothedSegment[0].command = 'L';
    console.log('Changed M back to L (original was not M)');
  }
  
  console.log('🧹 PASO 6: Eliminación de comandos L redundantes (Optimización)');
  // PASO 6: ELIMINACIÓN DE COMANDOS L REDUNDANTES (OPTIMIZACIÓN)
  // Evitar M seguido inmediatamente de L al mismo punto
  if (smoothedSegment.length > 1) {
    const cmd0 = smoothedSegment[0];
    const cmd1 = smoothedSegment[1];
    
    if (cmd0.command === 'M' && cmd1.command === 'L' &&
        'x' in cmd0 && 'y' in cmd0 && 'x' in cmd1 && 'y' in cmd1 &&
        cmd0.x !== undefined && cmd0.y !== undefined &&
        cmd1.x !== undefined && cmd1.y !== undefined &&
        cmd1.x === cmd0.x && cmd1.y === cmd0.y) {
      
      smoothedSegment.splice(1, 1); // Eliminar L redundante
      console.log('Removed redundant L command after M');
    }
  }
  
  console.log('🔄 PASO 7: Reemplazo en el array de comandos principal');
  // PASO 7: REEMPLAZO EN EL ARRAY DE COMANDOS PRINCIPAL
  // Encontrar dónde está el segmento original en el array completo
  const startIndex = commands.findIndex((cmd) => cmd === subpathSegment[0]);
  const endIndex = commands.findIndex((cmd) => cmd === subpathSegment[subpathSegment.length - 1]);
  
  console.log(`Found indices: start=${startIndex}, end=${endIndex}`);
  
  if (startIndex === -1 || endIndex === -1 || startIndex > endIndex) {
    console.error('No se pudieron encontrar índices del segmento');
    return;
  }
  
  // Crear nuevo array con el segmento suavizado
  const newCommands = [...commands];
  newCommands.splice(startIndex, endIndex - startIndex + 1, ...smoothedSegment);
  
  console.log('Final smoothed commands:', smoothedSegment.map(c => `${c.command}(${c.x},${c.y})`));
  
  // Actualizar el path en el estado (con historial)
  updatePath(newCommands, true);
};

/**
 * Check if all selected commands belong to the same subpath
 */
export const areCommandsInSameSubPath = (
  commandIds: string[], 
  paths: any[]
): { 
  sameSubPath: boolean; 
  subPath?: any; 
  pathId?: string;
  commands?: any[];
  startIndex?: number;
  endIndex?: number;
} => {
  if (commandIds.length === 0) return { sameSubPath: false };
  
  for (const path of paths) {
    for (const subPath of path.subPaths) {
      const commandsInThisSubPath = subPath.commands.filter((cmd: any) => 
        commandIds.includes(cmd.id)
      );
      
      if (commandsInThisSubPath.length === commandIds.length) {
        // All commands are in this subpath
        // Sort by their index in the subpath
        const sortedCommands = commandsInThisSubPath.sort((a: any, b: any) => {
          return subPath.commands.indexOf(a) - subPath.commands.indexOf(b);
        });
        
        const startIndex = subPath.commands.indexOf(sortedCommands[0]);
        const endIndex = subPath.commands.indexOf(sortedCommands[sortedCommands.length - 1]);
        
        return { 
          sameSubPath: true, 
          subPath, 
          pathId: path.id,
          commands: sortedCommands,
          startIndex,
          endIndex
        };
      }
      
      if (commandsInThisSubPath.length > 0 && commandsInThisSubPath.length < commandIds.length) {
        // Some commands are in this subpath, but not all - spans multiple subpaths
        return { sameSubPath: false };
      }
    }
  }
  
  return { sameSubPath: false };
};
