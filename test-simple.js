// Test simple directo sin importaciones complejas
console.log('=== TEST SIMPLE SELECTION ===');

// Simular datos de un rectángulo simple
const rectPath = {
  id: 'test-path',
  subPaths: [{
    id: 'test-subpath',
    commands: [
      { id: 'cmd-0', command: 'M', x: 50, y: 50 },
      { id: 'cmd-1', command: 'L', x: 150, y: 50 },
      { id: 'cmd-2', command: 'L', x: 150, y: 150 },
      { id: 'cmd-3', command: 'L', x: 50, y: 150 },
      { id: 'cmd-4', command: 'Z' }
    ]
  }],
  style: { fill: 'blue', stroke: 'black', strokeWidth: 2 }
};

// Test point inside
const pointInside = { x: 100, y: 100 };
console.log(`Test point inside rectangle: (${pointInside.x}, ${pointInside.y})`);

// Test point on edge
const pointOnEdge = { x: 50, y: 100 };
console.log(`Test point on edge: (${pointOnEdge.x}, ${pointOnEdge.y})`);

// Test point outside
const pointOutside = { x: 200, y: 200 };
console.log(`Test point outside: (${pointOutside.x}, ${pointOutside.y})`);

console.log('\nExpected behavior:');
console.log('- Point inside should be detected (new algorithm priority)');
console.log('- Point on edge should be detected (high priority)');  
console.log('- Point outside should not be detected');

console.log('\nNote: Testing in browser console would be more reliable due to module loading issues in Node.js');
