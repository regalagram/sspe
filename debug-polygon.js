// Debug polygon point generation
import { parsePathString } from './src/utils/path-utils.js';

// Test the basic rectangle
const rectPath = parsePathString('M 50 50 L 150 50 L 150 150 L 50 150 Z');
const subPath = rectPath.subPaths[0];

console.log('SubPath commands:');
subPath.commands.forEach((cmd, i) => {
  console.log(`  ${i}: ${cmd.command} ${cmd.x || ''} ${cmd.y || ''}`);
});

// Let's debug the polygon point generation manually
console.log('\nAnalyzing polygon points generation...');

// We can't directly access private functions, so let's manually trace what should happen
const testPoint = { x: 100, y: 100 };
console.log('Testing point:', testPoint);

// Let's check if the path is considered closed
const lastCommand = subPath.commands[subPath.commands.length - 1];
const isClosedByZ = lastCommand.command.toLowerCase() === 'z';
console.log('Has Z command:', isClosedByZ);

// Let's trace the expected polygon points for a simple rectangle
const expectedPoints = [
  { x: 50, y: 50 },   // M
  { x: 150, y: 50 },  // L
  { x: 150, y: 150 }, // L
  { x: 50, y: 150 },  // L
  // Z closes back to start
];

console.log('Expected polygon points:', expectedPoints);

// Manual point-in-polygon test using even-odd rule
function isPointInsidePolygonEvenOdd(point, polygon) {
  let inside = false;
  const n = polygon.length;
  
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    
    if (((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
}

const result = isPointInsidePolygonEvenOdd(testPoint, expectedPoints);
console.log('Manual even-odd test result:', result);
