// Test for nested subpath detection
import { 
  findSubPathAtPoint, 
  findSubPathAtPointAdvanced,
  findInnermostSubPathAtPoint,
  parsePathString 
} from './src/utils/path-utils.js';

console.log('Testing nested subpath detection...');

// Create a path with nested rectangles (outer and inner)
const nestedPath = {
  id: 'nested-test',
  subPaths: [
    // Outer rectangle (larger)
    {
      id: 'outer-rect',
      commands: [
        { id: 'cmd-1', command: 'M', x: 50, y: 50 },
        { id: 'cmd-2', command: 'L', x: 200, y: 50 },
        { id: 'cmd-3', command: 'L', x: 200, y: 200 },
        { id: 'cmd-4', command: 'L', x: 50, y: 200 },
        { id: 'cmd-5', command: 'Z' }
      ]
    },
    // Inner rectangle (smaller, nested)
    {
      id: 'inner-rect',
      commands: [
        { id: 'cmd-6', command: 'M', x: 100, y: 100 },
        { id: 'cmd-7', command: 'L', x: 150, y: 100 },
        { id: 'cmd-8', command: 'L', x: 150, y: 150 },
        { id: 'cmd-9', command: 'L', x: 100, y: 150 },
        { id: 'cmd-10', command: 'Z' }
      ]
    }
  ],
  style: { fill: 'none', stroke: '#000', strokeWidth: 1 }
};

// Test point inside both rectangles (should select inner)
const pointInBoth = { x: 125, y: 125 };

console.log('\n--- Testing point inside both rectangles ---');

// Test with original function
const result1 = findSubPathAtPoint(nestedPath, pointInBoth, 20);
console.log('Original function selected:', result1?.id);

// Test with advanced function
const result2 = findSubPathAtPointAdvanced(nestedPath, pointInBoth, {
  tolerance: 20,
  includeFill: true,
  includeStroke: true
});
console.log('Advanced function selected:', result2?.id);

// Test with innermost function
const result3 = findInnermostSubPathAtPoint(nestedPath, pointInBoth, 20);
console.log('Innermost function selected:', result3?.id);

// Test point inside only outer rectangle
const pointInOuter = { x: 75, y: 75 };

console.log('\n--- Testing point inside only outer rectangle ---');

const result4 = findInnermostSubPathAtPoint(nestedPath, pointInOuter, 20);
console.log('Point in outer only, selected:', result4?.id);

// Test point outside both rectangles but close to inner
const pointNearInner = { x: 155, y: 125 };

console.log('\n--- Testing point near inner rectangle ---');

const result5 = findInnermostSubPathAtPoint(nestedPath, pointNearInner, 20);
console.log('Point near inner, selected:', result5?.id);

// Test with more complex nested case (three levels)
const tripleNestedPath = {
  id: 'triple-nested',
  subPaths: [
    // Outermost
    {
      id: 'level-1',
      commands: [
        { id: 'cmd-a1', command: 'M', x: 10, y: 10 },
        { id: 'cmd-a2', command: 'L', x: 190, y: 10 },
        { id: 'cmd-a3', command: 'L', x: 190, y: 190 },
        { id: 'cmd-a4', command: 'L', x: 10, y: 190 },
        { id: 'cmd-a5', command: 'Z' }
      ]
    },
    // Middle
    {
      id: 'level-2',
      commands: [
        { id: 'cmd-b1', command: 'M', x: 50, y: 50 },
        { id: 'cmd-b2', command: 'L', x: 150, y: 50 },
        { id: 'cmd-b3', command: 'L', x: 150, y: 150 },
        { id: 'cmd-b4', command: 'L', x: 50, y: 150 },
        { id: 'cmd-b5', command: 'Z' }
      ]
    },
    // Innermost
    {
      id: 'level-3',
      commands: [
        { id: 'cmd-c1', command: 'M', x: 80, y: 80 },
        { id: 'cmd-c2', command: 'L', x: 120, y: 80 },
        { id: 'cmd-c3', command: 'L', x: 120, y: 120 },
        { id: 'cmd-c4', command: 'L', x: 80, y: 120 },
        { id: 'cmd-c5', command: 'Z' }
      ]
    }
  ],
  style: { fill: 'none', stroke: '#000', strokeWidth: 1 }
};

console.log('\n--- Testing three-level nesting ---');

const pointInAll = { x: 100, y: 100 };
const result6 = findInnermostSubPathAtPoint(tripleNestedPath, pointInAll, 20);
console.log('Point in all three levels, selected:', result6?.id, '(should be level-3)');

const pointInTwoLevels = { x: 60, y: 100 };
const result7 = findInnermostSubPathAtPoint(tripleNestedPath, pointInTwoLevels, 20);
console.log('Point in outer two levels, selected:', result7?.id, '(should be level-2)');

console.log('\n--- Test completed ---');
