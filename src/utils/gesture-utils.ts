// Pure utility functions for gesture calculations

export interface PointerInfo {
  pointerId: number;
  x: number;
  y: number;
}

export function getDistance(p1: PointerInfo, p2: PointerInfo): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

export function getMidpoint(p1: PointerInfo, p2: PointerInfo): { x: number; y: number } {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

export function getPanDelta(pointersStart: PointerInfo[], pointersEnd: PointerInfo[]): { dx: number; dy: number } {
  // Assumes pointers are matched by pointerId
  if (pointersStart.length !== pointersEnd.length) return { dx: 0, dy: 0 };
  let dx = 0, dy = 0;
  for (let i = 0; i < pointersStart.length; i++) {
    dx += pointersEnd[i].x - pointersStart[i].x;
    dy += pointersEnd[i].y - pointersStart[i].y;
  }
  return { dx: dx / pointersStart.length, dy: dy / pointersStart.length };
}
