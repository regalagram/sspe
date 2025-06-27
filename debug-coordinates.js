// Debug the actual coordinate calculation
import { parsePathString } from './src/utils/path-utils.js';

console.log('Debugging coordinate calculation...');

const rectPath = parsePathString('M 50 50 L 150 50 L 150 150 L 50 150 Z');
const subPath = rectPath.subPaths[0];

console.log('SubPath commands:');
subPath.commands.forEach((cmd, i) => {
  console.log(`  ${i}: ${cmd.command} x=${cmd.x} y=${cmd.y} id=${cmd.id}`);
});

// Manually simulate the getAbsoluteCommandPosition logic to understand what's happening
function simulateAbsolutePosition(command, subPath, commandIndex, allSubPaths) {
  if (command.x === undefined || command.y === undefined) {
    return null;
  }

  // Calculate the starting position of this subpath within the full path
  let pathStartPosition = { x: 0, y: 0 };
  
  if (allSubPaths) {
    const subPathIndex = allSubPaths.findIndex(sp => sp.id === subPath.id);
    console.log(`  SubPath index: ${subPathIndex}`);
    // For first subpath (index 0), pathStartPosition stays (0,0)
  }

  // Calculate absolute position by tracking through all previous commands in this subpath
  let currentX = pathStartPosition.x;
  let currentY = pathStartPosition.y;

  console.log(`  Starting from pathStartPosition: (${currentX}, ${currentY})`);

  for (let i = 0; i <= commandIndex; i++) {
    const cmd = subPath.commands[i];
    const isRelative = cmd.command === cmd.command.toLowerCase() && cmd.command !== 'z';

    console.log(`    Processing command ${i}: ${cmd.command} (${cmd.x}, ${cmd.y}) isRelative=${isRelative}`);

    if (cmd.x !== undefined && cmd.y !== undefined) {
      if (cmd.command === 'M' || cmd.command === 'm') {
        // Special handling for M/m commands
        if (i === 0) {
          // First command in subpath
          if (isRelative) {
            currentX = pathStartPosition.x + cmd.x;
            currentY = pathStartPosition.y + cmd.y;
          } else {
            currentX = cmd.x;
            currentY = cmd.y;
          }
        } else {
          // Subsequent M/m commands within the same subpath
          if (isRelative) {
            currentX += cmd.x;
            currentY += cmd.y;
          } else {
            currentX = cmd.x;
            currentY = cmd.y;
          }
        }
      } else {
        // Other commands (L, C, Q, etc.)
        if (isRelative) {
          currentX += cmd.x;
          currentY += cmd.y;
        } else {
          currentX = cmd.x;
          currentY = cmd.y;
        }
      }
    }

    console.log(`    After command ${i}: currentPos = (${currentX}, ${currentY})`);
  }

  return { x: currentX, y: currentY };
}

console.log('\nSimulating absolute positions:');
const polygonPoints = [];

subPath.commands.forEach((cmd, i) => {
  if (cmd.command.toUpperCase() !== 'Z') {
    const pos = simulateAbsolutePosition(cmd, subPath, i, rectPath.subPaths);
    if (pos && ['M', 'L', 'H', 'V'].includes(cmd.command.toUpperCase())) {
      console.log(`${cmd.command} -> (${pos.x}, ${pos.y})`);
      polygonPoints.push(pos);
    }
  }
});

console.log('\nFinal polygon points:', polygonPoints);

// Test point-in-polygon
const testPoint = { x: 100, y: 100 };
console.log(`\nTesting point (${testPoint.x}, ${testPoint.y})`);

// Manual even-odd test
function evenOddTest(point, polygon) {
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

const result = evenOddTest(testPoint, polygonPoints);
console.log('Even-odd result:', result);
