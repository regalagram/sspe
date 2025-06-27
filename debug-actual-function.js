// Test actual function behavior
import { findSubPathAtPointAdvanced, parsePathString } from './src/utils/path-utils.js';

console.log('Testing actual function behavior...');

// Test 1: Simple rectangle
const rectPath = parsePathString('M 50 50 L 150 50 L 150 150 L 50 150 Z');
console.log('Rectangle path subpaths:', rectPath.subPaths.length);

const testPoint = { x: 100, y: 100 };
console.log('Testing point:', testPoint);

// Test with different configurations
const configs = [
  { includeFill: true, includeStroke: true, fillRule: 'nonzero' },
  { includeFill: true, includeStroke: false, fillRule: 'nonzero' },
  { includeFill: false, includeStroke: true, fillRule: 'nonzero' },
  { includeFill: true, includeStroke: true, fillRule: 'evenodd' },
];

configs.forEach((config, i) => {
  const result = findSubPathAtPointAdvanced(rectPath, testPoint, {
    tolerance: 20,
    ...config
  });
  
  console.log(`Config ${i+1} (fill:${config.includeFill}, stroke:${config.includeStroke}, rule:${config.fillRule}):`, 
              result ? 'FOUND' : 'NOT FOUND');
});

// Test point clearly outside
const outsidePoint = { x: 200, y: 200 };
console.log('\nTesting point outside:', outsidePoint);

const outsideResult = findSubPathAtPointAdvanced(rectPath, outsidePoint, {
  tolerance: 20,
  includeFill: true,
  includeStroke: true
});

console.log('Outside point result:', outsideResult ? 'FOUND' : 'NOT FOUND');

// Test point on edge
const edgePoint = { x: 150, y: 100 };
console.log('\nTesting point on edge:', edgePoint);

const edgeResult = findSubPathAtPointAdvanced(rectPath, edgePoint, {
  tolerance: 20,
  includeFill: true,
  includeStroke: true
});

console.log('Edge point result:', edgeResult ? 'FOUND' : 'NOT FOUND');
