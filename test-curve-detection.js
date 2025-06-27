// Test file for improved curve detection
import { findSubPathAtPoint, parsePathString } from '../src/utils/path-utils';

// Test with a simple cubic Bézier curve
const testPathString = 'M 50 150 C 100 50, 200 50, 250 150';
const testPath = parsePathString(testPathString);

console.log('Testing curve detection...');

// Test point on the curve (approximately)
const pointOnCurve = { x: 150, y: 100 };
const result1 = findSubPathAtPoint(testPath, pointOnCurve, 20);
console.log('Point on curve detected:', result1 !== null);

// Test point far from curve
const pointFarAway = { x: 300, y: 300 };
const result2 = findSubPathAtPoint(testPath, pointFarAway, 20);
console.log('Point far away correctly rejected:', result2 === null);

// Test point near control point
const pointNearControl = { x: 105, y: 55 };
const result3 = findSubPathAtPoint(testPath, pointNearControl, 20);
console.log('Point near control detected:', result3 !== null);
