"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Test for enhanced path detection with fill area support
const path_utils_js_1 = require("./src/utils/path-utils.js");
console.log('Testing enhanced curve detection with fill area...');
// Test 1: Closed rectangle
const rectPath = (0, path_utils_js_1.parsePathString)('M 50 50 L 150 50 L 150 150 L 50 150 Z');
console.log('Parsed rectangle subpaths:', rectPath.subPaths.length);
console.log('First subpath commands:', rectPath.subPaths[0].commands.map(c => `${c.command} ${c.x || ''} ${c.y || ''}`));
// Point inside the rectangle
const pointInside = { x: 100, y: 100 };
const result1 = (0, path_utils_js_1.findSubPathAtPointAdvanced)(rectPath, pointInside, {
    tolerance: 20,
    includeFill: true,
    includeStroke: true
});
console.log('Point inside closed rectangle detected:', result1 !== null);
// Point outside the rectangle but close to edge
const pointNearEdge = { x: 160, y: 100 };
const result2 = (0, path_utils_js_1.findSubPathAtPointAdvanced)(rectPath, pointNearEdge, {
    tolerance: 20,
    includeFill: true,
    includeStroke: true
});
console.log('Point near edge detected:', result2 !== null);
// Point outside rectangle and far from edge
const pointFar = { x: 200, y: 200 };
const result3 = (0, path_utils_js_1.findSubPathAtPointAdvanced)(rectPath, pointFar, {
    tolerance: 20,
    includeFill: true,
    includeStroke: true
});
console.log('Point far away correctly rejected:', result3 === null);
// Test 2: Open path (line) - should not detect inside points
const linePath = (0, path_utils_js_1.parsePathString)('M 50 50 L 150 50');
// Point "inside" the line area (but line is open)
const pointOnLine = { x: 100, y: 50 };
const result4 = (0, path_utils_js_1.findSubPathAtPointAdvanced)(linePath, pointOnLine, {
    tolerance: 5,
    includeFill: true,
    includeStroke: true
});
console.log('Point on open line detected (stroke only):', result4 !== null);
// Test 3: Stroke-only detection
const result5 = (0, path_utils_js_1.findSubPathAtPointAdvanced)(rectPath, pointInside, {
    tolerance: 20,
    includeFill: false,
    includeStroke: true
});
console.log('Point inside rect with stroke-only detection rejected:', result5 === null);
// Test 4: Curved path
const curvePath = (0, path_utils_js_1.parsePathString)('M 50 100 C 50 50, 150 50, 150 100 C 150 150, 50 150, 50 100 Z');
const pointInCurve = { x: 100, y: 100 };
const result6 = (0, path_utils_js_1.findSubPathAtPointAdvanced)(curvePath, pointInCurve, {
    tolerance: 20,
    includeFill: true,
    includeStroke: true
});
console.log('Point inside curved shape detected:', result6 !== null);
