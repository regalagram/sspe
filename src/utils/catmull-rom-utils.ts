import type { Point } from '../types'

/**
 * Remove duplicate and very close points to avoid curve artifacts
 */
function filterPoints(points: Point[], minDistance = 2): Point[] {
  if (points.length <= 1) return points
  
  const filtered = [points[0]]
  for (let i = 1; i < points.length; i++) {
    const prev = filtered[filtered.length - 1]
    const curr = points[i]
    const dist = Math.sqrt((curr.x - prev.x) ** 2 + (curr.y - prev.y) ** 2)
    
    if (dist >= minDistance) {
      filtered.push(curr)
    }
  }
  
  return filtered
}

/**
 * Convert array of points to SVG path using Catmull-Rom spline converted to cubic Bezier
 * @param points Array of points to convert
 * @returns SVG path string
 */
export function pointsToPath(points: Point[]): string {
  if (!points || points.length === 0) return ''
  
  // Filter out duplicate and very close points
  const filteredPoints = filterPoints(points)
  
  const round = (n: number) => Math.round(n)

  if (filteredPoints.length === 1) {
    const p = filteredPoints[0]
    return `M ${round(p.x)} ${round(p.y)}`
  }

  if (filteredPoints.length === 2) {
    // Even with 2 points, generate a smooth curve for better preview
    const p0 = filteredPoints[0]
    const p1 = filteredPoints[1]
    
    // Create a gentle curve by offsetting control points slightly
    const dx = p1.x - p0.x
    const dy = p1.y - p0.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const offset = Math.min(dist * 0.25, 20) // Small curve offset
    
    const c1x = p0.x + dx * 0.33
    const c1y = p0.y + dy * 0.33
    const c2x = p0.x + dx * 0.67
    const c2y = p0.y + dy * 0.67
    
    return `M ${round(p0.x)} ${round(p0.y)} C ${round(c1x)} ${round(c1y)} ${round(c2x)} ${round(c2y)} ${round(p1.x)} ${round(p1.y)}`
  }

  // For 3+ points, convert Catmull-Rom to cubic bezier segments
  const pts = filteredPoints
  let d = `M ${round(pts[0].x)} ${round(pts[0].y)}`

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = i - 1 >= 0 ? pts[i - 1] : pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = i + 2 < pts.length ? pts[i + 2] : p2

    // Improved Catmull-Rom to Bezier conversion with tension control
    const tension = 0.5 // Reduce tension to make curves smoother
    const c1x = p1.x + (p2.x - p0.x) * tension / 6
    const c1y = p1.y + (p2.y - p0.y) * tension / 6
    const c2x = p2.x - (p3.x - p1.x) * tension / 6
    const c2y = p2.y - (p3.y - p1.y) * tension / 6

    d += ` C ${round(c1x)} ${round(c1y)} ${round(c2x)} ${round(c2y)} ${round(p2.x)} ${round(p2.y)}`
  }

  return d
}