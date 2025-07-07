// Quick test to verify fill="none" fix
import { parseSVGToSubPaths } from './src/utils/svg-parser.ts';

const testSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path d="M 10 10 L 50 50 L 90 10" fill="none" stroke="red" stroke-width="2"/>
</svg>`;

console.log('🧪 Testing fill="none" parsing...');
try {
  const paths = parseSVGToSubPaths(testSvg);
  console.log('Parsed paths:', paths);
  
  if (paths.length > 0) {
    console.log('First path style:', paths[0].style);
    
    if (paths[0].style.fill === 'none') {
      console.log('✅ SUCCESS: fill="none" is correctly parsed as "none"');
    } else {
      console.log('❌ FAIL: fill="none" was parsed as:', paths[0].style.fill);
    }
  } else {
    console.log('❌ FAIL: No paths found');
  }
} catch (error) {
  console.error('❌ ERROR:', error);
}
