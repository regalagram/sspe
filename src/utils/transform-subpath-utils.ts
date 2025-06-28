import { SVGSubPath, SVGCommand, Point } from '../types';

/**
 * Transform a subpath by scaling it around a center point
 */
export function scaleSubPath(
  subPath: SVGSubPath, 
  scaleX: number, 
  scaleY: number, 
  center: Point
): SVGSubPath {
  return {
    ...subPath,
    commands: subPath.commands.map((cmd: SVGCommand) => scaleCommand(cmd, scaleX, scaleY, center))
  };
}

/**
 * Transform a subpath by rotating it around a center point
 */
export function rotateSubPath(
  subPath: SVGSubPath, 
  angle: number, // in degrees
  center: Point
): SVGSubPath {
  const radians = (angle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  
  return {
    ...subPath,
    commands: subPath.commands.map((cmd: SVGCommand) => rotateCommand(cmd, cos, sin, center))
  };
}

/**
 * Transform a subpath by translating it
 */
export function translateSubPath(
  subPath: SVGSubPath, 
  delta: Point
): SVGSubPath {
  return {
    ...subPath,
    commands: subPath.commands.map((cmd: SVGCommand) => translateCommand(cmd, delta))
  };
}

/**
 * Scale a single command around a center point
 */
function scaleCommand(
  cmd: SVGCommand, 
  scaleX: number, 
  scaleY: number, 
  center: Point
): SVGCommand {
  const newCmd = { ...cmd };
  
  // Scale main coordinates
  if (cmd.x !== undefined && cmd.y !== undefined) {
    const scaledPoint = scalePoint({ x: cmd.x, y: cmd.y }, scaleX, scaleY, center);
    newCmd.x = scaledPoint.x;
    newCmd.y = scaledPoint.y;
  }
  
  // Scale control points
  if (cmd.x1 !== undefined && cmd.y1 !== undefined) {
    const scaledPoint = scalePoint({ x: cmd.x1, y: cmd.y1 }, scaleX, scaleY, center);
    newCmd.x1 = scaledPoint.x;
    newCmd.y1 = scaledPoint.y;
  }
  
  if (cmd.x2 !== undefined && cmd.y2 !== undefined) {
    const scaledPoint = scalePoint({ x: cmd.x2, y: cmd.y2 }, scaleX, scaleY, center);
    newCmd.x2 = scaledPoint.x;
    newCmd.y2 = scaledPoint.y;
  }
  
  return newCmd;
}

/**
 * Rotate a single command around a center point
 */
function rotateCommand(
  cmd: SVGCommand, 
  cos: number, 
  sin: number, 
  center: Point
): SVGCommand {
  const newCmd = { ...cmd };
  
  // Rotate main coordinates
  if (cmd.x !== undefined && cmd.y !== undefined) {
    const rotatedPoint = rotatePoint({ x: cmd.x, y: cmd.y }, cos, sin, center);
    newCmd.x = rotatedPoint.x;
    newCmd.y = rotatedPoint.y;
  }
  
  // Rotate control points
  if (cmd.x1 !== undefined && cmd.y1 !== undefined) {
    const rotatedPoint = rotatePoint({ x: cmd.x1, y: cmd.y1 }, cos, sin, center);
    newCmd.x1 = rotatedPoint.x;
    newCmd.y1 = rotatedPoint.y;
  }
  
  if (cmd.x2 !== undefined && cmd.y2 !== undefined) {
    const rotatedPoint = rotatePoint({ x: cmd.x2, y: cmd.y2 }, cos, sin, center);
    newCmd.x2 = rotatedPoint.x;
    newCmd.y2 = rotatedPoint.y;
  }
  
  return newCmd;
}

/**
 * Translate a single command
 */
function translateCommand(cmd: SVGCommand, delta: Point): SVGCommand {
  const newCmd = { ...cmd };
  
  // Translate main coordinates
  if (cmd.x !== undefined) newCmd.x = cmd.x + delta.x;
  if (cmd.y !== undefined) newCmd.y = cmd.y + delta.y;
  
  // Translate control points
  if (cmd.x1 !== undefined) newCmd.x1 = cmd.x1 + delta.x;
  if (cmd.y1 !== undefined) newCmd.y1 = cmd.y1 + delta.y;
  if (cmd.x2 !== undefined) newCmd.x2 = cmd.x2 + delta.x;
  if (cmd.y2 !== undefined) newCmd.y2 = cmd.y2 + delta.y;
  
  return newCmd;
}

/**
 * Scale a point around a center
 */
function scalePoint(point: Point, scaleX: number, scaleY: number, center: Point): Point {
  return {
    x: center.x + (point.x - center.x) * scaleX,
    y: center.y + (point.y - center.y) * scaleY
  };
}

/**
 * Rotate a point around a center
 */
function rotatePoint(point: Point, cos: number, sin: number, center: Point): Point {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos
  };
}

/**
 * Get the center point of a subpath
 */
export function getSubPathCenter(subPath: SVGSubPath): Point {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  subPath.commands.forEach((cmd: SVGCommand) => {
    if (cmd.x !== undefined && cmd.y !== undefined) {
      minX = Math.min(minX, cmd.x);
      minY = Math.min(minY, cmd.y);
      maxX = Math.max(maxX, cmd.x);
      maxY = Math.max(maxY, cmd.y);
    }
    
    if (cmd.x1 !== undefined && cmd.y1 !== undefined) {
      minX = Math.min(minX, cmd.x1);
      minY = Math.min(minY, cmd.y1);
      maxX = Math.max(maxX, cmd.x1);
      maxY = Math.max(maxY, cmd.y1);
    }
    
    if (cmd.x2 !== undefined && cmd.y2 !== undefined) {
      minX = Math.min(minX, cmd.x2);
      minY = Math.min(minY, cmd.y2);
      maxX = Math.max(maxX, cmd.x2);
      maxY = Math.max(maxY, cmd.y2);
    }
  });
  
  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2
  };
}
