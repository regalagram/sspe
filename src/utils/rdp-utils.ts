import type { Point } from '../types'

/**
 * Calculate the distance from a point to a line segment
 */
function pointToSegDist(pt: Point, a: Point, b: Point): number {
  const x = Math.round(pt.x)
  const y = Math.round(pt.y)
  const x1 = Math.round(a.x)
  const y1 = Math.round(a.y)
  const x2 = Math.round(b.x)
  const y2 = Math.round(b.y)
  const dx = x2 - x1
  const dy = y2 - y1
  
  if (dx === 0 && dy === 0) {
    const px = x - x1
    const py = y - y1
    return Math.sqrt(px * px + py * py)
  }
  
  const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)
  const tt = Math.max(0, Math.min(1, t))
  const projx = x1 + tt * dx
  const projy = y1 + tt * dy
  const ddx = x - projx
  const ddy = y - projy
  return Math.sqrt(ddx * ddx + ddy * ddy)
}

/**
 * Ramer-Douglas-Peucker algorithm for polyline simplification
 * @param points Array of points to simplify
 * @param eps Tolerance for simplification (higher values = more simplification)
 * @returns Simplified array of points
 */
export function rdp(points: Point[], eps = 2): Point[] {
  if (!points || points.length < 3) {
    return points.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }))
  }
  
  let maxDist = 0
  let index = -1
  const a = { x: Math.round(points[0].x), y: Math.round(points[0].y) }
  const b = { x: Math.round(points[points.length - 1].x), y: Math.round(points[points.length - 1].y) }
  
  for (let i = 1; i < points.length - 1; i++) {
    const d = pointToSegDist(points[i], a, b)
    if (d > maxDist) {
      index = i
      maxDist = d
    }
  }
  
  if (maxDist <= eps) {
    return [{ x: Math.round(a.x), y: Math.round(a.y) }, { x: Math.round(b.x), y: Math.round(b.y) }]
  }
  
  const left = rdp(points.slice(0, index + 1), eps)
  const right = rdp(points.slice(index), eps)
  return left.slice(0, -1).concat(right)
}