/**
 * Simple test cases for transform-subpath-utils
 * Run with: node --loader ts-node/esm test-transforms.ts
 */

import { scaleSubPath, rotateSubPath, translateSubPath, getSubPathCenter } from '../utils/transform-subpath-utils';
import { SVGSubPath } from '../types';

// Test data: a simple rectangle subpath
const testSubPath: SVGSubPath = {
  id: 'test-subpath',
  commands: [
    { id: 'cmd1', command: 'M', x: 0, y: 0 },
    { id: 'cmd2', command: 'L', x: 100, y: 0 },
    { id: 'cmd3', command: 'L', x: 100, y: 100 },
    { id: 'cmd4', command: 'L', x: 0, y: 100 },
    { id: 'cmd5', command: 'Z' }
  ]
};

console.log('🧪 Testing SubPath Transform Utilities\n');

// Test 1: Get center
console.log('1. Testing getSubPathCenter:');
const center = getSubPathCenter(testSubPath);
console.log(`   Center: (${center.x}, ${center.y})`);
console.log(`   Expected: (50, 50)`);
console.log(`   ✅ ${center.x === 50 && center.y === 50 ? 'PASS' : 'FAIL'}\n`);

// Test 2: Scale by 2x
console.log('2. Testing scale (2x uniform):');
const scaledSubPath = scaleSubPath(testSubPath, 2, 2, center);
console.log(`   Original corner: (0, 0)`);
console.log(`   Scaled corner: (${scaledSubPath.commands[0].x}, ${scaledSubPath.commands[0].y})`);
console.log(`   Expected: (-50, -50)`);
console.log(`   ✅ ${scaledSubPath.commands[0].x === -50 && scaledSubPath.commands[0].y === -50 ? 'PASS' : 'FAIL'}\n`);

// Test 3: Rotate 90 degrees
console.log('3. Testing rotation (90 degrees):');
const rotatedSubPath = rotateSubPath(testSubPath, 90, center);
const rotatedCorner = rotatedSubPath.commands[0];
console.log(`   Original corner: (0, 0)`);
console.log(`   Rotated corner: (${rotatedCorner.x?.toFixed(1)}, ${rotatedCorner.y?.toFixed(1)})`);
console.log(`   Expected: (100, 0) approximately`);
const isCorrectRotation = Math.abs((rotatedCorner.x || 0) - 100) < 0.1 && Math.abs((rotatedCorner.y || 0) - 0) < 0.1;
console.log(`   ✅ ${isCorrectRotation ? 'PASS' : 'FAIL'}\n`);

// Test 4: Translate
console.log('4. Testing translation (10, 20):');
const translatedSubPath = translateSubPath(testSubPath, { x: 10, y: 20 });
console.log(`   Original corner: (0, 0)`);
console.log(`   Translated corner: (${translatedSubPath.commands[0].x}, ${translatedSubPath.commands[0].y})`);
console.log(`   Expected: (10, 20)`);
console.log(`   ✅ ${translatedSubPath.commands[0].x === 10 && translatedSubPath.commands[0].y === 20 ? 'PASS' : 'FAIL'}\n`);

console.log('🎉 All tests completed!');
