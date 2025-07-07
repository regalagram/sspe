// Test module to verify fill="none" parsing
// This file should be included in the main application to test

console.log('🧪 Testing fill="none" parsing...');

// Test function that can be called from browser console
window.testFillNone = function() {
    // Import required functions
    const { parseSVGToSubPaths } = window.svgParser || {};
    
    if (!parseSVGToSubPaths) {
        console.error('❌ Parser not available. Make sure to import it first.');
        return;
    }
    
    // Test cases
    const testCases = [
        {
            name: 'Path with fill="none"',
            svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                <path d="M 10 10 L 50 50 L 90 10" fill="none" stroke="black" stroke-width="2"/>
            </svg>`,
            expected: { fill: 'none' }
        },
        {
            name: 'Path with fill="red"',
            svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                <path d="M 10 10 L 50 50 L 90 10" fill="red" stroke="black" stroke-width="2"/>
            </svg>`,
            expected: { fill: '#ff0000' }
        },
        {
            name: 'Path with style="fill: none"',
            svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                <path d="M 10 10 L 50 50 L 90 10" style="fill: none; stroke: blue"/>
            </svg>`,
            expected: { fill: 'none' }
        }
    ];
    
    console.log('Running fill="none" tests...\n');
    
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
};

// Export for use in modules
export { testFillNone };
