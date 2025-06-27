// Direct test of actual functions
import { parsePathString, findSubPathAtPointAdvanced } from './src/utils/path-utils.js';

console.log('=== TESTING ACTUAL FUNCTIONS ===');

// Create a simple rectangle
const rectPath = parsePathString('M 50 50 L 150 50 L 150 150 L 50 150 Z');
console.log('Rect path created with', rectPath.subPaths.length, 'subpaths');

const testPoint = { x: 100, y: 100 };

// Test with includeFill = true, includeStroke = false
const result1 = findSubPathAtPointAdvanced(rectPath, testPoint, {
  tolerance: 20,
  includeFill: true,
  includeStroke: false
});
console.log('Result with fill-only detection:', result1 !== null);

// Test with includeFill = false, includeStroke = true  
const result2 = findSubPathAtPointAdvanced(rectPath, testPoint, {
  tolerance: 20,
  includeFill: false,
  includeStroke: true
});
console.log('Result with stroke-only detection:', result2 !== null);

// Test with both enabled
const result3 = findSubPathAtPointAdvanced(rectPath, testPoint, {
  tolerance: 20,
  includeFill: true,
  includeStroke: true
});
console.log('Result with both fill and stroke detection:', result3 !== null);

// Test edge case
const edgePoint = { x: 50, y: 100 };
const result4 = findSubPathAtPointAdvanced(rectPath, edgePoint, {
  tolerance: 5,
  includeFill: true,
  includeStroke: true
});
console.log('Result for edge point:', result4 !== null);

// Test outside point
const outsidePoint = { x: 200, y: 200 };
const result5 = findSubPathAtPointAdvanced(rectPath, outsidePoint, {
  tolerance: 20,
  includeFill: true,
  includeStroke: true
});
console.log('Result for outside point:', result5 !== null);
