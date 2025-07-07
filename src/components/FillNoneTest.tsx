import React, { useEffect, useState } from 'react';
import { parseSVGToSubPaths } from '../utils/svg-parser';

const FillNoneTest: React.FC = () => {
  const [testResults, setTestResults] = useState<string>('');

  useEffect(() => {
    const runTest = () => {
      // Test multiple scenarios
      const testCases = [
        {
          name: 'fill="none" attribute',
          svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
            <path d="M 10 10 L 50 50 L 90 10" fill="none" stroke="red" stroke-width="2"/>
          </svg>`,
          expected: { fill: 'none' }
        },
        {
          name: 'style="fill: none"',
          svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
            <path d="M 10 10 L 50 50 L 90 10" style="fill: none; stroke: blue; stroke-width: 2"/>
          </svg>`,
          expected: { fill: 'none' }
        },
        {
          name: 'fill="red" for comparison',
          svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
            <path d="M 10 10 L 50 50 L 90 10" fill="red" stroke="blue" stroke-width="2"/>
          </svg>`,
          expected: { fill: '#ff0000' }
        }
      ];

      let allResults = '';
      
      testCases.forEach((testCase, index) => {
        try {
          const paths = parseSVGToSubPaths(testCase.svg);
          
          if (paths.length > 0) {
            const style = paths[0].style;
            allResults += `Test ${index + 1}: ${testCase.name}\n`;
            allResults += `  Expected: ${JSON.stringify(testCase.expected)}\n`;
            allResults += `  Actual: ${JSON.stringify({ fill: style.fill })}\n`;
            
            if (style.fill === testCase.expected.fill) {
              allResults += `  ✅ PASS\n`;
            } else {
              allResults += `  ❌ FAIL\n`;
            }
          } else {
            allResults += `Test ${index + 1}: ${testCase.name} - ❌ No paths found\n`;
          }
        } catch (error) {
          allResults += `Test ${index + 1}: ${testCase.name} - ❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}\n`;
        }
        
        allResults += '\n';
      });

      setTestResults(allResults);
    };

    runTest();
  }, []);

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: 'white', 
      padding: '15px', 
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '12px',
      fontFamily: 'monospace',
      maxWidth: '400px',
      maxHeight: '400px',
      overflow: 'auto',
      zIndex: 1000,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
    }}>
      <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>fill="none" Test Results</h4>
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '11px' }}>
        {testResults}
      </pre>
    </div>
  );
};

export default FillNoneTest;
