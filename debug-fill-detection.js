// Debug test for fill detection
import { parsePathString } from './src/utils/path-utils.js';

console.log('=== DEBUG FILL DETECTION ===');

// Create a simple rectangle
const rectPath = parsePathString('M 50 50 L 150 50 L 150 150 L 50 150 Z');
const subPath = rectPath.subPaths[0];

// Import debug functions directly to avoid module issues
const getAbsoluteCommandPosition = (command, subPath, allSubPaths) => {
  if (command.x === undefined || command.y === undefined) {
    return null;
  }

  // Find the index of this command in the subpath
  const commandIndex = subPath.commands.findIndex(cmd => cmd.id === command.id);
  if (commandIndex === -1) {
    return null;
  }

  // For simple test, don't worry about multi-subpath context
  let currentX = 0;
  let currentY = 0;

  for (let i = 0; i <= commandIndex; i++) {
    const cmd = subPath.commands[i];
    const isRelative = cmd.command === cmd.command.toLowerCase() && cmd.command !== 'z';

    if (cmd.x !== undefined && cmd.y !== undefined) {
      if (isRelative && i > 0) {
        currentX += cmd.x;
        currentY += cmd.y;
      } else {
        currentX = cmd.x;
        currentY = cmd.y;
      }
    }
  }

  return { x: currentX, y: currentY };
};

const isSubPathClosed = (subPath) => {
  if (subPath.commands.length === 0) return false;
  
  // Check for explicit Z command
  const lastCommand = subPath.commands[subPath.commands.length - 1];
  if (lastCommand.command.toLowerCase() === 'z') {
    return true;
  }
  
  return false;
};

const getSubPathPolygonPoints = (subPath) => {
  const points = [];
  
  for (let i = 0; i < subPath.commands.length; i++) {
    const command = subPath.commands[i];
    const absolutePos = getAbsoluteCommandPosition(command, subPath);
    
    if (!absolutePos) continue;
    
    switch (command.command.toUpperCase()) {
      case 'M':
      case 'L':
      case 'H':
      case 'V':
        points.push(absolutePos);
        break;
      case 'Z':
        // Close path - don't add point as it should connect to start
        break;
    }
  }
  
  return points;
};

const isPointInsidePolygonNonZero = (point, polygon) => {
  let winding = 0;
  const n = polygon.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    
    if (yi <= point.y) {
      if (yj > point.y) {
        // Upward crossing
        const cross = (polygon[j].x - polygon[i].x) * (point.y - polygon[i].y) - (point.x - polygon[i].x) * (polygon[j].y - polygon[i].y);
        if (cross > 0) {
          winding++;
        }
      }
    } else {
      if (yj <= point.y) {
        // Downward crossing
        const cross = (polygon[j].x - polygon[i].x) * (point.y - polygon[i].y) - (point.x - polygon[i].x) * (polygon[j].y - polygon[i].y);
        if (cross < 0) {
          winding--;
        }
      }
    }
  }
  
  return winding !== 0;
};

console.log('SubPath commands:');
subPath.commands.forEach((cmd, i) => {
  const pos = getAbsoluteCommandPosition(cmd, subPath);
  console.log(`  ${i}: ${cmd.command} ${cmd.x || ''} ${cmd.y || ''} -> (${pos?.x}, ${pos?.y})`);
});

console.log('\nIs closed:', isSubPathClosed(subPath));

const polygonPoints = getSubPathPolygonPoints(subPath);
console.log('\nPolygon points:');
polygonPoints.forEach((pt, i) => {
  console.log(`  ${i}: (${pt.x}, ${pt.y})`);
});

const testPoint = { x: 100, y: 100 };
console.log(`\nTest point: (${testPoint.x}, ${testPoint.y})`);

const isInside = isPointInsidePolygonNonZero(testPoint, polygonPoints);
console.log('Point inside polygon:', isInside);

// Test edge point
const edgePoint = { x: 50, y: 100 };
console.log(`\nEdge point: (${edgePoint.x}, ${edgePoint.y})`);
const isEdgeInside = isPointInsidePolygonNonZero(edgePoint, polygonPoints);
console.log('Edge point inside polygon:', isEdgeInside);

// Test outside point
const outsidePoint = { x: 200, y: 200 };
console.log(`\nOutside point: (${outsidePoint.x}, ${outsidePoint.y})`);
const isOutsideInside = isPointInsidePolygonNonZero(outsidePoint, polygonPoints);
console.log('Outside point inside polygon:', isOutsideInside);
