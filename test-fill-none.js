/**
 * Test script to verify that fill="none" is parsed correctly
 */

// Import the parser function
import { parseSVGToSubPaths } from './src/utils/svg-parser.js';

// Test cases
const testCases = [
  {
    name: 'Path with fill="none"',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <path d="M 10 10 L 50 50 L 90 10" fill="none" stroke="black" stroke-width="2"/>
    </svg>`,
    expected: { fill: 'none', stroke: '#000000', strokeWidth: 2 }
  },
  {
    name: 'Path with fill="none" and stroke="none"',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <path d="M 10 10 L 50 50 L 90 10" fill="none" stroke="none"/>
    </svg>`,
    expected: { fill: 'none', stroke: 'none' }
  },
  {
    name: 'Path with style="fill: none"',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <path d="M 10 10 L 50 50 L 90 10" style="fill: none; stroke: red; stroke-width: 3"/>
    </svg>`,
    expected: { fill: 'none', stroke: '#ff0000', strokeWidth: 3 }
  },
  {
    name: 'Path with mixed fill="none" and inline style stroke',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <path d="M 10 10 L 50 50 L 90 10" fill="none" style="stroke: blue; stroke-width: 1"/>
    </svg>`,
    expected: { fill: 'none', stroke: '#0000ff', strokeWidth: 1 }
  }
];

// Run tests
console.log('🧪 Testing fill="none" parsing...\n');

testCases.forEach((testCase, index) => {
  console.log(`--- Test ${index + 1}: ${testCase.name} ---`);
  
  try {
    const paths = parseSVGToSubPaths(testCase.svg);
    
    if (paths.length === 0) {
      console.log('❌ No paths found');
      return;
    }
    
    const pathStyle = paths[0].style;
    const expected = testCase.expected;
    
    console.log('Parsed style:', pathStyle);
    console.log('Expected:   ', expected);
    
    // Check each expected property
    let allMatched = true;
    for (const [key, expectedValue] of Object.entries(expected)) {
      const actualValue = pathStyle[key];
      
      if (actualValue !== expectedValue) {
        console.log(`❌ ${key}: expected "${expectedValue}", got "${actualValue}"`);
        allMatched = false;
      } else {
        console.log(`✅ ${key}: "${actualValue}" matches expected value`);
      }
    }
    
    if (allMatched) {
      console.log('✅ Test PASSED');
    } else {
      console.log('❌ Test FAILED');
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  console.log('');
});

console.log('🏁 Test completed');
