// Test para casos de subpaths anidados
import { parsePathString, findSubPathAtPoint } from './src/utils/path-utils.js';

console.log('=== TESTING NESTED SUBPATHS ===');

// Crear un path con subpaths anidados: rectángulo grande con rectángulo pequeño adentro
const nestedPath = parsePathString('M 50 50 L 150 50 L 150 150 L 50 150 Z M 75 75 L 125 75 L 125 125 L 75 125 Z');

console.log('Nested path created with', nestedPath.subPaths.length, 'subpaths');
console.log('Outer rect commands:', nestedPath.subPaths[0].commands.map(c => `${c.command} ${c.x || ''} ${c.y || ''}`));
console.log('Inner rect commands:', nestedPath.subPaths[1].commands.map(c => `${c.command} ${c.x || ''} ${c.y || ''}`));

// Test 1: Point in outer rect but outside inner rect
const pointInOuter = { x: 60, y: 100 };
const result1 = findSubPathAtPoint(nestedPath, pointInOuter, 15);
console.log(`\nPoint (${pointInOuter.x}, ${pointInOuter.y}) - should select outer rect:`);
console.log('Selected subpath:', result1 ? `subpath-${nestedPath.subPaths.indexOf(result1)}` : 'none');

// Test 2: Point in inner rect
const pointInInner = { x: 100, y: 100 };
const result2 = findSubPathAtPoint(nestedPath, pointInInner, 15);
console.log(`\nPoint (${pointInInner.x}, ${pointInInner.y}) - should select inner rect:`);
console.log('Selected subpath:', result2 ? `subpath-${nestedPath.subPaths.indexOf(result2)}` : 'none');

// Test 3: Point on edge of outer rect
const pointOnOuterEdge = { x: 50, y: 100 };
const result3 = findSubPathAtPoint(nestedPath, pointOnOuterEdge, 15);
console.log(`\nPoint (${pointOnOuterEdge.x}, ${pointOnOuterEdge.y}) - on outer edge:`);
console.log('Selected subpath:', result3 ? `subpath-${nestedPath.subPaths.indexOf(result3)}` : 'none');

// Test 4: Point on edge of inner rect
const pointOnInnerEdge = { x: 75, y: 100 };
const result4 = findSubPathAtPoint(nestedPath, pointOnInnerEdge, 15);
console.log(`\nPoint (${pointOnInnerEdge.x}, ${pointOnInnerEdge.y}) - on inner edge:`);
console.log('Selected subpath:', result4 ? `subpath-${nestedPath.subPaths.indexOf(result4)}` : 'none');

// Test 5: Point outside both rects
const pointOutside = { x: 200, y: 200 };
const result5 = findSubPathAtPoint(nestedPath, pointOutside, 15);
console.log(`\nPoint (${pointOutside.x}, ${pointOutside.y}) - outside both:`);
console.log('Selected subpath:', result5 ? `subpath-${nestedPath.subPaths.indexOf(result5)}` : 'none');

console.log('\n=== TESTING SIMPLE RECTANGLE ===');

// Test simple rectangle for comparison
const simpleRect = parsePathString('M 50 50 L 150 50 L 150 150 L 50 150 Z');
const pointInSimple = { x: 100, y: 100 };
const resultSimple = findSubPathAtPoint(simpleRect, pointInSimple, 15);
console.log(`Point (${pointInSimple.x}, ${pointInSimple.y}) in simple rect:`);
console.log('Selected:', resultSimple ? 'YES' : 'NO');
