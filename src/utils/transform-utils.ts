/**
 * Utility functions for SVG transform parsing and manipulation
 */

export interface TransformMatrix {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

/**
 * Parse a transform string into a transform object
 * @param transformString - SVG transform attribute string
 * @returns Transform matrix object
 */
export function parseTransformString(transformString: string): TransformMatrix {
  // Default identity matrix
  let matrix: TransformMatrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  
  if (!transformString) return matrix;
  
  // Regular expressions for different transform types
  const transforms = transformString.match(/(\w+)\s*\([^)]*\)/g) || [];
  
  for (const transform of transforms) {
    const match = transform.match(/(\w+)\s*\(([^)]*)\)/);
    if (!match) continue;
    
    const type = match[1];
    const values = match[2].split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
    
    switch (type) {
      case 'matrix':
        if (values.length >= 6) {
          matrix = multiplyMatrices(matrix, {
            a: values[0],
            b: values[1],
            c: values[2],
            d: values[3],
            e: values[4],
            f: values[5]
          });
        }
        break;
        
      case 'translate':
        if (values.length >= 1) {
          const tx = values[0];
          const ty = values[1] || 0;
          matrix = multiplyMatrices(matrix, {
            a: 1, b: 0, c: 0, d: 1, e: tx, f: ty
          });
        }
        break;
        
      case 'scale':
        if (values.length >= 1) {
          const sx = values[0];
          const sy = values[1] || sx;
          matrix = multiplyMatrices(matrix, {
            a: sx, b: 0, c: 0, d: sy, e: 0, f: 0
          });
        }
        break;
        
      case 'rotate':
        if (values.length >= 1) {
          const angle = values[0] * Math.PI / 180; // Convert to radians
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          
          let rotateMatrix: TransformMatrix = {
            a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0
          };
          
          // Handle rotation around a center point
          if (values.length >= 3) {
            const cx = values[1];
            const cy = values[2];
            
            // Translate to origin, rotate, translate back
            matrix = multiplyMatrices(matrix, { a: 1, b: 0, c: 0, d: 1, e: cx, f: cy });
            matrix = multiplyMatrices(matrix, rotateMatrix);
            matrix = multiplyMatrices(matrix, { a: 1, b: 0, c: 0, d: 1, e: -cx, f: -cy });
          } else {
            matrix = multiplyMatrices(matrix, rotateMatrix);
          }
        }
        break;
        
      case 'skewX':
        if (values.length >= 1) {
          const angle = values[0] * Math.PI / 180;
          matrix = multiplyMatrices(matrix, {
            a: 1, b: 0, c: Math.tan(angle), d: 1, e: 0, f: 0
          });
        }
        break;
        
      case 'skewY':
        if (values.length >= 1) {
          const angle = values[0] * Math.PI / 180;
          matrix = multiplyMatrices(matrix, {
            a: 1, b: Math.tan(angle), c: 0, d: 1, e: 0, f: 0
          });
        }
        break;
    }
  }
  
  return matrix;
}

/**
 * Multiply two transformation matrices
 */
function multiplyMatrices(m1: TransformMatrix, m2: TransformMatrix): TransformMatrix {
  return {
    a: m1.a * m2.a + m1.c * m2.b,
    b: m1.b * m2.a + m1.d * m2.b,
    c: m1.a * m2.c + m1.c * m2.d,
    d: m1.b * m2.c + m1.d * m2.d,
    e: m1.a * m2.e + m1.c * m2.f + m1.e,
    f: m1.b * m2.e + m1.d * m2.f + m1.f
  };
}

/**
 * Apply a transformation matrix to a point
 */
export function transformPoint(x: number, y: number, matrix: TransformMatrix): { x: number; y: number } {
  return {
    x: matrix.a * x + matrix.c * y + matrix.e,
    y: matrix.b * x + matrix.d * y + matrix.f
  };
}

/**
 * Convert a transform matrix to a transform string
 */
export function matrixToString(matrix: TransformMatrix): string {
  return `matrix(${matrix.a},${matrix.b},${matrix.c},${matrix.d},${matrix.e},${matrix.f})`;
}
