// Debug getAbsoluteCommandPosition function
import { parsePathString } from './src/utils/path-utils.js';

// Test the basic rectangle
const rectPath = parsePathString('M 50 50 L 150 50 L 150 150 L 50 150 Z');
const subPath = rectPath.subPaths[0];

console.log('SubPath commands:');
subPath.commands.forEach((cmd, i) => {
  console.log(`  ${i}: ${cmd.command} ${cmd.x || ''} ${cmd.y || ''}`);
});

// Let's manually simulate getAbsoluteCommandPosition since we can't access it directly
// The logic should be straightforward for this simple case
function simulateGetAbsoluteCommandPosition(command, subPath) {
  if (command.x === undefined || command.y === undefined) {
    return null;
  }
  
  // For this simple test case with only absolute commands, it should just return the coordinates
  return { x: command.x, y: command.y };
}

console.log('\nSimulated absolute positions:');
const polygonPoints = [];
subPath.commands.forEach((cmd, i) => {
  const pos = simulateGetAbsoluteCommandPosition(cmd, subPath);
  if (pos && cmd.command.toUpperCase() !== 'Z') {
    console.log(`  ${cmd.command}: (${pos.x}, ${pos.y})`);
    if (['M', 'L', 'H', 'V'].includes(cmd.command.toUpperCase())) {
      polygonPoints.push(pos);
    }
  }
});

console.log('\nGenerated polygon points:', polygonPoints);

// Test point-in-polygon 
const testPoint = { x: 100, y: 100 };

// Manual even-odd implementation
function isPointInsidePolygonEvenOdd(point, polygon) {
  let inside = false;
  const n = polygon.length;
  
  console.log(`\nTesting point (${point.x}, ${point.y}) against ${n} polygon points:`);
  
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    
    console.log(`  Edge ${j}->${i}: (${xj},${yj}) to (${xi},${yi})`);
    
    const intersects = ((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    
    if (intersects) {
      console.log(`    -> Intersects! inside=${!inside} -> ${inside}`);
      inside = !inside;
    }
  }
  
  return inside;
}

const result = isPointInsidePolygonEvenOdd(testPoint, polygonPoints);
console.log(`\nFinal result: ${result}`);
