import { SVGSubPath, SVGCommand, PathStyle, SVGCommandType, SVGPath } from '../types';
import { parsePath, absolutize, normalize, serialize } from 'path-data-parser';
import { generateId } from './id-utils';
import { decomposeIntoSubPaths } from './subpath-utils';
import { convertRgbToHex, parseColorWithOpacity } from './color-utils';
import { parseTransformString, transformPoint, type TransformMatrix } from './transform-utils';

/**
 * List of attributes to copy when converting shapes to paths
 */
const ATTRIBUTES_TO_COPY = [
  'fill',
  'fill-opacity',
  'fill-rule',
  'stroke',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-opacity',
  'stroke-width',
  'opacity',
  'transform',
  'style',
  'class',
  'id',
];

/**
 * Normalizes scientific notation in path strings to regular decimal format
 */
function normalizeScientificNotation(pathString: string, precision = 6): string {
  if (!pathString || typeof pathString !== 'string') {
    return pathString;
  }
  const scientificNotationRegex = /([-+]?\d*\.?\d+)[eE]([-+]?\d+)/g;
  return pathString.replace(scientificNotationRegex, (match) => {
    try {
      const num = Number(match);
      return num % 1 === 0 ? num.toString() : num.toFixed(precision);
    } catch (e) {
      return match;
    }
  });
}

/**
 * Rounds path values to specified decimal places
 */
function roundPathValues(pathString: string, decimals = 3): string {
  if (!pathString) return pathString;

  return pathString.replace(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g, (match) => {
    const num = parseFloat(match);
    const rounded = Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
    
    if (rounded % 1 === 0) {
      return rounded.toString();
    }
    return rounded.toString();
  });
}



/**
 * Shape conversion functions
 */
function circleToPathD(cx: number, cy: number, r: number): string {
  if (r <= 0) return '';
  return `M ${cx - r}, ${cy} a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 ${-r * 2},0 Z`;
}

function ellipseToPathD(cx: number, cy: number, rx: number, ry: number): string {
  if (rx <= 0 || ry <= 0) return '';
  return `M ${cx - rx}, ${cy} a ${rx},${ry} 0 1,0 ${rx * 2},0 a ${rx},${ry} 0 1,0 ${-rx * 2},0 Z`;
}

function rectToPathD(x: number, y: number, width: number, height: number, rx = 0, ry = 0): string {
  if (width <= 0 || height <= 0) return '';

  rx = Math.min(rx, width / 2);
  ry = Math.min(ry, height / 2);

  if (rx <= 0 || ry <= 0) {
    return `M ${x},${y} H ${x + width} V ${y + height} H ${x} Z`;
  } else {
    return (
      `M ${x + rx},${y} ` +
      `H ${x + width - rx} ` +
      `A ${rx},${ry} 0 0 1 ${x + width},${y + ry} ` +
      `V ${y + height - ry} ` +
      `A ${rx},${ry} 0 0 1 ${x + width - rx},${y + height} ` +
      `H ${x + rx} ` +
      `A ${rx},${ry} 0 0 1 ${x},${y + height - ry} ` +
      `V ${y + ry} ` +
      `A ${rx},${ry} 0 0 1 ${x + rx},${y} Z`
    );
  }
}

function lineToPathD(x1: number, y1: number, x2: number, y2: number): string {
  return `M ${x1},${y1} L ${x2},${y2}`;
}

function polylineToPathD(pointsStr: string): string {
  const points = pointsStr.trim().split(/[\s,]+/);
  if (points.length < 2) return '';
  return `M ${points[0]},${points[1]} L ${points.slice(2).join(' ')}`;
}

function polygonToPathD(pointsStr: string): string {
  const polylineD = polylineToPathD(pointsStr);
  return polylineD ? `${polylineD} Z` : '';
}

/**
 * Converts all SVG shapes to path elements
 */
function convertShapesToPaths(svgElement: Element, debugMode = false): void {
  const svgNS = 'http://www.w3.org/2000/svg';
  const shapesSelector = 'circle, rect, ellipse, line, polygon, polyline';
  const shapes = Array.from(svgElement.querySelectorAll(shapesSelector));

  if (debugMode) {
    console.log(`🔄 Converting ${shapes.length} shapes to paths`);
  }

  shapes.forEach((shape, index) => {
    let d = '';
    const tagName = shape.tagName.toLowerCase();

    if (debugMode) {
      console.log(`  Processing ${tagName} #${index}:`, {
        stroke: shape.getAttribute('stroke'),
        strokeWidth: shape.getAttribute('stroke-width'),
        style: shape.getAttribute('style')
      });
    }

    try {
      switch (tagName) {
        case 'circle': {
          const cx = parseFloat(shape.getAttribute('cx') || '0');
          const cy = parseFloat(shape.getAttribute('cy') || '0');
          const r = parseFloat(shape.getAttribute('r') || '0');
          d = circleToPathD(cx, cy, r);
          break;
        }
        case 'ellipse': {
          const cx = parseFloat(shape.getAttribute('cx') || '0');
          const cy = parseFloat(shape.getAttribute('cy') || '0');
          const rx = parseFloat(shape.getAttribute('rx') || '0');
          const ry = parseFloat(shape.getAttribute('ry') || '0');
          d = ellipseToPathD(cx, cy, rx, ry);
          break;
        }
        case 'rect': {
          const x = parseFloat(shape.getAttribute('x') || '0');
          const y = parseFloat(shape.getAttribute('y') || '0');
          const width = parseFloat(shape.getAttribute('width') || '0');
          const height = parseFloat(shape.getAttribute('height') || '0');
          const rx = parseFloat(shape.getAttribute('rx') || '0');
          const ry = parseFloat(shape.getAttribute('ry') || '0');
          d = rectToPathD(x, y, width, height, rx, ry);
          break;
        }
        case 'line': {
          const x1 = parseFloat(shape.getAttribute('x1') || '0');
          const y1 = parseFloat(shape.getAttribute('y1') || '0');
          const x2 = parseFloat(shape.getAttribute('x2') || '0');
          const y2 = parseFloat(shape.getAttribute('y2') || '0');
          d = lineToPathD(x1, y1, x2, y2);
          break;
        }
        case 'polyline': {
          const points = shape.getAttribute('points') || '';
          d = polylineToPathD(points);
          break;
        }
        case 'polygon': {
          const points = shape.getAttribute('points') || '';
          d = polygonToPathD(points);
          break;
        }
        default:
          break;
      }

      if (d && shape.parentNode) {
        const newPath = document.createElementNS(svgNS, 'path');
        newPath.setAttribute('d', d);

        // Copy all relevant attributes
        const copiedAttributes: string[] = [];
        ATTRIBUTES_TO_COPY.forEach((attrName) => {
          if (shape.hasAttribute(attrName)) {
            const attrValue = shape.getAttribute(attrName)!;
            newPath.setAttribute(attrName, attrValue);
            copiedAttributes.push(`${attrName}="${attrValue}"`);
          }
        });

        if (debugMode) {
          console.log(`    ✅ Converted to path:`, {
            pathData: d.substring(0, 50) + (d.length > 50 ? '...' : ''),
            copiedAttributes: copiedAttributes.length,
            stroke: newPath.getAttribute('stroke'),
            strokeWidth: newPath.getAttribute('stroke-width'),
            style: newPath.getAttribute('style')
          });
        }

        shape.parentNode.replaceChild(newPath, shape);
      } else if (!d) {
        if (debugMode) {
          console.warn(`    ❌ Could not generate path data for ${tagName}:`, shape);
        } else {
          console.warn(`Could not generate path data for ${tagName}:`, shape);
        }
      }
    } catch (convertError) {
      const errorMsg = `Error converting ${tagName} to path: ${convertError}`;
      if (debugMode) {
        console.error(`    ❌ ${errorMsg}`, shape);
      } else {
        console.error(errorMsg, convertError, shape);
      }
    }
  });

  if (debugMode) {
    console.log(`🔄 Shape conversion complete`);
  }
}

/**
 * Enhanced function to parse a path data string into commands using path-data-parser
 * Now normalizes all commands to M, L, C, Z using path-data-parser normalize function
 */
export function parsePathData(pathData: string): SVGCommand[] {
  const commands: SVGCommand[] = [];
  
  try {
    // Use path-data-parser for robust parsing with normalization
    const parsed = parsePath(pathData);
    const absolutized = absolutize(parsed);
    const normalized = normalize(absolutized); // This converts everything to M, L, C, Z
    
    for (const segment of normalized) {
      const command: Partial<SVGCommand> = {
        id: generateId(),
        command: segment.key as SVGCommandType,
      };

      // Map values based on command type - now only M, L, C, Z
      switch (segment.key.toUpperCase()) {
        case 'M':
        case 'L':
          command.x = segment.data[0];
          command.y = segment.data[1];
          break;
        case 'C':
          command.x1 = segment.data[0];
          command.y1 = segment.data[1];
          command.x2 = segment.data[2];
          command.y2 = segment.data[3];
          command.x = segment.data[4];
          command.y = segment.data[5];
          break;
        case 'Z':
          // No additional values needed
          break;
        default:
          // This should not happen with normalize, but skip if it does
          console.warn(`Unexpected command after normalization: ${segment.key}`);
          continue;
      }

      commands.push(command as SVGCommand);
    }
  } catch (error) {
    console.error('Error parsing path data:', error);
    // Fallback to original parsing logic if needed
  }
  
  return commands;
}

/**
 * Enhanced function to parse style attributes into PathStyle object with computed styles support
 */
export function parsePathStyle(element: Element, useComputedStyles = false): PathStyle {
  const style: PathStyle = {};
  
  // Helper function to parse numeric values with units
  const parseNumericValue = (value: string | null): number | undefined => {
    if (!value || value.trim() === '') return undefined;
    // Remove units like px, em, %, etc. and parse as float
    const numericValue = parseFloat(value.replace(/[^\d.-]/g, ''));
    return isNaN(numericValue) ? undefined : numericValue;
  };
  
  // Helper function to normalize color values and extract opacity
  const normalizeColorWithOpacity = (color: string | null | undefined): { color?: string; opacity?: number } => {
    if (!color || color.trim() === '' || color === 'none') return {};
    const result = parseColorWithOpacity(color.trim());
    return {
      color: result.color, // Always return the color (converted or original)
      opacity: result.opacity
    };
  };
  
  // Legacy helper for backward compatibility
  const normalizeColor = (color: string | null | undefined): string | undefined => {
    if (!color || color.trim() === '' || color === 'none') return undefined;
    return convertRgbToHex(color.trim());
  };
  
  if (useComputedStyles && element instanceof HTMLElement) {
    // Use computed styles for better accuracy
    const computedStyle = window.getComputedStyle(element);
    
    const getStyleProp = (propName: string, defaultValue?: string) =>
      computedStyle.getPropertyValue(propName).trim() || defaultValue;
    
    const getNumericStyleProp = (propName: string, defaultValue?: number) => {
      const val = computedStyle.getPropertyValue(propName);
      const num = parseNumericValue(val);
      return num !== undefined ? num : defaultValue;
    };

    const fill = getStyleProp('fill');
    const stroke = getStyleProp('stroke');
    
    const normalizedFill = normalizeColor(fill);
    if (normalizedFill) style.fill = normalizedFill;
    
    const normalizedStroke = normalizeColor(stroke);
    if (normalizedStroke) style.stroke = normalizedStroke;
    
    const strokeWidth = getNumericStyleProp('stroke-width');
    if (strokeWidth !== undefined) style.strokeWidth = strokeWidth;
    
    const fillOpacity = getNumericStyleProp('fill-opacity');
    if (fillOpacity !== undefined) style.fillOpacity = fillOpacity;
    
    const strokeOpacity = getNumericStyleProp('stroke-opacity');
    if (strokeOpacity !== undefined) style.strokeOpacity = strokeOpacity;
    
    const strokeLinecap = getStyleProp('stroke-linecap');
    if (strokeLinecap && strokeLinecap !== 'inherit') style.strokeLinecap = strokeLinecap as any;
    
    const strokeLinejoin = getStyleProp('stroke-linejoin');
    if (strokeLinejoin && strokeLinejoin !== 'inherit') style.strokeLinejoin = strokeLinejoin as any;
    
    const strokeDasharray = getStyleProp('stroke-dasharray');
    if (strokeDasharray && strokeDasharray !== 'none' && strokeDasharray !== 'inherit') {
      style.strokeDasharray = strokeDasharray;
    }
    
  } else {
    // Fallback to attribute-based parsing
    const fill = element.getAttribute('fill');
    const stroke = element.getAttribute('stroke');
    const strokeWidth = element.getAttribute('stroke-width');
    const strokeDasharray = element.getAttribute('stroke-dasharray');
    const strokeLinecap = element.getAttribute('stroke-linecap');
    const strokeLinejoin = element.getAttribute('stroke-linejoin');
    const fillOpacity = element.getAttribute('fill-opacity');
    const strokeOpacity = element.getAttribute('stroke-opacity');
    const fillRule = element.getAttribute('fill-rule');
    
    // Parse fill color and extract opacity if present
    const fillResult = normalizeColorWithOpacity(fill);
    if (fillResult.color) style.fill = fillResult.color;
    
    // Parse stroke color and extract opacity if present
    const strokeResult = normalizeColorWithOpacity(stroke);
    if (strokeResult.color) style.stroke = strokeResult.color;
    
    const parsedStrokeWidth = parseNumericValue(strokeWidth);
    if (parsedStrokeWidth !== undefined) style.strokeWidth = parsedStrokeWidth;
    
    if (strokeDasharray && strokeDasharray !== 'none') style.strokeDasharray = strokeDasharray;
    if (strokeLinecap && strokeLinecap !== 'inherit') style.strokeLinecap = strokeLinecap as any;
    if (strokeLinejoin && strokeLinejoin !== 'inherit') style.strokeLinejoin = strokeLinejoin as any;
    
    // Handle opacity from explicit attributes first
    const parsedFillOpacity = parseNumericValue(fillOpacity);
    if (parsedFillOpacity !== undefined) style.fillOpacity = parsedFillOpacity;
    // Then apply opacity from RGBA fill color if no explicit fill-opacity was set
    else if (fillResult.opacity !== undefined) style.fillOpacity = fillResult.opacity;
    
    const parsedStrokeOpacity = parseNumericValue(strokeOpacity);
    if (parsedStrokeOpacity !== undefined) style.strokeOpacity = parsedStrokeOpacity;
    // Then apply opacity from RGBA stroke color if no explicit stroke-opacity was set
    else if (strokeResult.opacity !== undefined) style.strokeOpacity = strokeResult.opacity;
    
    if (fillRule && fillRule !== 'inherit') style.fillRule = fillRule as any;
    
    // Parse inline style attribute (this should override attributes)
    const styleAttr = element.getAttribute('style');
    if (styleAttr) {
      const styleRules = styleAttr.split(';');
      for (const rule of styleRules) {
        const colonIndex = rule.indexOf(':');
        if (colonIndex === -1) continue;
        
        const property = rule.substring(0, colonIndex).trim();
        const value = rule.substring(colonIndex + 1).trim();
        
        if (!property || !value) continue;
        
        switch (property) {
          case 'fill': {
            const fillInlineResult = normalizeColorWithOpacity(value);
            if (fillInlineResult.color) style.fill = fillInlineResult.color;
            // Apply opacity from RGBA fill if no explicit fill-opacity in inline styles
            if (fillInlineResult.opacity !== undefined && style.fillOpacity === undefined) {
              style.fillOpacity = fillInlineResult.opacity;
            }
            break;
          }
          case 'stroke': {
            const strokeInlineResult = normalizeColorWithOpacity(value);
            if (strokeInlineResult.color) style.stroke = strokeInlineResult.color;
            // Apply opacity from RGBA stroke if no explicit stroke-opacity in inline styles
            if (strokeInlineResult.opacity !== undefined && style.strokeOpacity === undefined) {
              style.strokeOpacity = strokeInlineResult.opacity;
            }
            break;
          }
          case 'stroke-width': {
            const parsedStrokeWidthInline = parseNumericValue(value);
            if (parsedStrokeWidthInline !== undefined) style.strokeWidth = parsedStrokeWidthInline;
            break;
          }
          case 'stroke-dasharray':
            if (value !== 'none') style.strokeDasharray = value;
            break;
          case 'stroke-linecap':
            if (value !== 'inherit') style.strokeLinecap = value as any;
            break;
          case 'stroke-linejoin':
            if (value !== 'inherit') style.strokeLinejoin = value as any;
            break;
          case 'fill-opacity': {
            const parsedFillOpacityInline = parseNumericValue(value);
            if (parsedFillOpacityInline !== undefined) style.fillOpacity = parsedFillOpacityInline;
            break;
          }
          case 'stroke-opacity': {
            const parsedStrokeOpacityInline = parseNumericValue(value);
            if (parsedStrokeOpacityInline !== undefined) style.strokeOpacity = parsedStrokeOpacityInline;
            break;
          }
          case 'fill-rule':
            if (value !== 'inherit') style.fillRule = value as any;
            break;
        }
      }
    }
  }
  
  return style;
}

/**
 * Debug function to log style parsing details
 */
export function debugParsePathStyle(element: Element, useComputedStyles = false): { 
  style: PathStyle; 
  debug: any 
} {
  const debug: any = {
    elementTag: element.tagName,
    attributes: {},
    inlineStyle: element.getAttribute('style'),
    useComputedStyles
  };
  
  // Capture all style-related attributes
  const styleAttributes = [
    'fill', 'stroke', 'stroke-width', 'stroke-dasharray', 
    'stroke-linecap', 'stroke-linejoin', 'fill-opacity', 
    'stroke-opacity', 'fill-rule'
  ];
  
  styleAttributes.forEach(attr => {
    const value = element.getAttribute(attr);
    if (value !== null) {
      debug.attributes[attr] = value;
    }
  });
  
  const style = parsePathStyle(element, useComputedStyles);
  
  debug.parsedStyle = style;
  debug.hasStroke = !!style.stroke;
  debug.hasStrokeWidth = style.strokeWidth !== undefined;
  
  console.log('🎨 Style Debug:', debug);
  
  return { style, debug };
}

/**
 * Test function for XML declaration handling
 */
export function testXmlDeclarationHandling(): void {
  if (typeof document === 'undefined') {
    console.log('❌ This function requires a browser environment');
    return;
  }
  
  console.log('🧪 Testing XML declaration handling...');
  
  // Test cases with and without XML declarations
  const testCases = [
    {
      name: 'SVG without XML declaration',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M 10 10 L 50 50" stroke="red" fill="none"/></svg>'
    },
    {
      name: 'SVG with leading blank lines',
      svg: '\n\n\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M 10 10 L 50 50" stroke="red" fill="none"/></svg>'
    },
    {
      name: 'SVG with XML declaration',
      svg: '<?xml version="1.0" encoding="utf-8" ?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M 10 10 L 50 50" stroke="red" fill="none"/></svg>'
    },
    {
      name: 'SVG with blank lines before XML declaration',
      svg: '\n\n<?xml version="1.0" encoding="utf-8" ?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M 10 10 L 50 50" stroke="blue" fill="none"/></svg>'
    },
    {
      name: 'SVG with XML declaration and different encoding',
      svg: '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M 10 10 L 50 50" stroke="blue" fill="none"/></svg>'
    },
    {
      name: 'SVG with XML declaration with extra attributes',
      svg: '<?xml version="1.0" encoding="utf-8" standalone="yes" ?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M 10 10 L 50 50" stroke="green" fill="none"/></svg>'
    },
    {
      name: 'SVG with spaces and tabs before XML',
      svg: '   \t\n  <?xml version="1.0" encoding="utf-8" ?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M 10 10 L 50 50" stroke="purple" fill="none"/></svg>'
    }
  ];
  
  testCases.forEach((testCase, index) => {
    console.log(`\n--- Test ${index + 1}: ${testCase.name} ---`);
    
    try {
      const paths = parseSVGToSubPaths(testCase.svg);
      console.log(`✅ Parsed successfully: ${paths.length} path(s) found`);
      
      if (paths.length > 0) {
        console.log(`   First path has ${paths[0].subPaths.length} subpath(s)`);
        if (paths[0].subPaths.length > 0) {
          console.log(`   First subpath has ${paths[0].subPaths[0].commands.length} command(s)`);
        }
      }
    } catch (error) {
      console.error('❌ Error:', error);
    }
  });
}

/**
 * Test function for browser environment
 */
export function testStrokeParsingInBrowser(): void {
  if (typeof document === 'undefined') {
    console.log('❌ This function requires a browser environment');
    return;
  }
  
  console.log('🧪 Testing stroke parsing in browser...');
  
  // Create test SVG elements
  const testCases = [
    {
      name: 'Direct attributes',
      svg: '<path d="M 10 10 L 50 50" stroke="red" stroke-width="2" fill="none"/>'
    },
    {
      name: 'Inline style',
      svg: '<path d="M 10 10 L 50 50" style="stroke: blue; stroke-width: 3; fill: none;"/>'
    },
    {
      name: 'Mixed attributes and style',
      svg: '<path d="M 10 10 L 50 50" stroke="green" style="stroke-width: 4; fill: none;"/>'
    },
    {
      name: 'With units',
      svg: '<path d="M 10 10 L 50 50" stroke="purple" stroke-width="2px" fill="none"/>'
    }
  ];
  
  testCases.forEach((testCase, index) => {
    console.log(`\n--- Test ${index + 1}: ${testCase.name} ---`);
    
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(
        `<svg xmlns="http://www.w3.org/2000/svg">${testCase.svg}</svg>`,
        'image/svg+xml'
      );
      
      const pathElement = doc.querySelector('path');
      if (pathElement) {
        const { style, debug } = debugParsePathStyle(pathElement, false);
        console.log('✅ Parsed successfully');
      } else {
        console.log('❌ No path element found');
      }
    } catch (error) {
      console.error('❌ Error:', error);
    }
  });
}

/**
 * Process and normalize SVG content, converting shapes to paths and normalizing path data
 */
export function processSvgContent(svgString: string, debugMode = false): { svgElement: Element; normalizedSvgContent: string } {
  // Normalize whitespace - remove leading/trailing whitespace and blank lines
  let normalizedString = svgString.trim();
  
  // Remove XML declaration if present (optional XML declaration support)
  const cleanedSvgString = normalizedString.replace(/^<\?xml[^>]*\?>\s*/, '');
  
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(cleanedSvgString, 'image/svg+xml');

  const svgElement = svgDoc.documentElement;
  const parserError = svgElement.querySelector('parsererror');
  if (parserError) {
    throw new Error(`Error parsing SVG: ${parserError.textContent}`);
  }

  if (debugMode) {
    console.log('🎨 Processing SVG content...');
  }

  // Convert shapes to paths
  convertShapesToPaths(svgElement, debugMode);

  // Normalize and round path values
  const pathNodes = svgElement.querySelectorAll('path');
  
  if (debugMode) {
    console.log(`🔍 Found ${pathNodes.length} path(s) to normalize`);
  }
  
  pathNodes.forEach((pathNode, index) => {
    if (debugMode) {
      console.log(`  Processing path #${index}:`, {
        originalD: pathNode.getAttribute('d')?.substring(0, 50) + '...',
        stroke: pathNode.getAttribute('stroke'),
        strokeWidth: pathNode.getAttribute('stroke-width')
      });
    }
    
    let normalizedD = normalizePathWithTransform(pathNode);
    if (normalizedD) {
      normalizedD = roundPathValues(normalizedD, 3);
      pathNode.setAttribute('d', normalizedD);
    } else {
      const originalD = pathNode.getAttribute('d');
      if (originalD) {
        pathNode.setAttribute('d', roundPathValues(originalD, 3));
      }
    }
    
    if (debugMode) {
      console.log(`    ✅ Normalized path #${index}:`, {
        normalizedD: pathNode.getAttribute('d')?.substring(0, 50) + '...',
        stroke: pathNode.getAttribute('stroke'),
        strokeWidth: pathNode.getAttribute('stroke-width')
      });
    }
  });

  // Serialize normalized SVG
  const serializer = new XMLSerializer();
  const normalizedSvgContent = serializer.serializeToString(svgElement);

  if (debugMode) {
    console.log('🎨 SVG processing complete');
  }

  return {
    svgElement,
    normalizedSvgContent
  };
}

/**
 * Main function to parse SVG string into SVGPath array with enhanced processing
 */
export function parseSVGToSubPaths(svgString: string, useComputedStyles = false): SVGPath[] {
  try {
    const { svgElement } = processSvgContent(svgString);
    
    // Find all path elements
    const pathElements = svgElement.querySelectorAll('path');
    const paths: SVGPath[] = [];
    
    for (const pathElement of Array.from(pathElements)) {
      const pathData = pathElement.getAttribute('d');
      if (!pathData) continue;
      
      try {
        const commands = parsePathData(pathData);
        const style = parsePathStyle(pathElement, useComputedStyles);
        
        if (commands.length > 0) {
          // Decompose the path into sub-paths
          const subPaths = decomposeIntoSubPaths(commands);
          
          paths.push({
            id: generateId(),
            subPaths,
            style
          });
        }
      } catch (error) {
        console.warn('Failed to parse path:', pathData, error);
      }
    }
    
    return paths;
  } catch (error) {
    console.error('Failed to parse SVG:', error);
    throw error;
  }
}

/**
 * Get absolute path data from a path string, normalized to M, L, C, Z commands
 */
export function getAbsolutePathData(pathData: string): string {
  try {
    const parsed = parsePath(pathData);
    const absolutized = absolutize(parsed);
    const normalized = normalize(absolutized); // Convert to M, L, C, Z only
    return normalizeScientificNotation(serialize(normalized));
  } catch (error) {
    console.error('Error converting path data to absolute:', error);
    return pathData;
  }
}

/**
 * Normalizes a path with transform attributes applied
 * @param pathNode - SVG path element
 * @returns Normalized path string
 */
function normalizePathWithTransform(pathNode: Element): string | null {
  const d = pathNode.getAttribute('d');
  if (!d) return d;

  const transform = pathNode.getAttribute('transform');
  if (!transform) {
    // No transform, just normalize and return
    try {
      const parsed = parsePath(d);
      const absolutized = absolutize(parsed);
      const normalized = normalize(absolutized); // Convert to M, L, C, Z only
      return normalizeScientificNotation(serialize(normalized)).replace(/,/g, ' ');
    } catch (error) {
      console.warn('Failed to normalize path without transform:', error);
      return d;
    }
  }

  try {
    const transformMatrix = parseTransformString(transform);
    
    // Parse the path
    const parsed = parsePath(d);
    const absolutized = absolutize(parsed);
    const normalized = normalize(absolutized); // Convert to M, L, C, Z only
    
    // Apply transformation to each command
    const transformedCommands = normalized.map(segment => {
      const newSegment = { ...segment };
      
      // Transform coordinate pairs based on command type
      switch (segment.key.toUpperCase()) {
        case 'M':
        case 'L':
          if (segment.data.length >= 2) {
            const transformed = transformPoint(segment.data[0], segment.data[1], transformMatrix);
            newSegment.data = [transformed.x, transformed.y];
          }
          break;
        case 'C':
          if (segment.data.length >= 6) {
            const cp1 = transformPoint(segment.data[0], segment.data[1], transformMatrix);
            const cp2 = transformPoint(segment.data[2], segment.data[3], transformMatrix);
            const end = transformPoint(segment.data[4], segment.data[5], transformMatrix);
            newSegment.data = [cp1.x, cp1.y, cp2.x, cp2.y, end.x, end.y];
          }
          break;
        case 'Z':
          // No coordinates to transform
          break;
        default:
          // Should not happen with normalize, but handle gracefully
          console.warn(`Unexpected command in transform: ${segment.key}`);
          break;
      }
      
      return newSegment;
    });
    
    const normalizedPath = normalizeScientificNotation(serialize(transformedCommands));
    
    // Remove the transform attribute since we've applied it
    pathNode.removeAttribute('transform');
    
    return normalizedPath.replace(/,/g, ' ');
  } catch (error) {
    console.error('Error normalizing path with transform:', error);
    return d;
  }
}

/**
 * Process path information including original and absolute path data
 * @param svgElement - The SVG element containing paths
 * @param defaultAppearance - Default style values
 * @returns Array of path information objects
 */
export async function processPathsInfo(
  svgElement: Element, 
  defaultAppearance: Partial<PathStyle> = {}
): Promise<Array<{
  index: number;
  originalD: string;
  absoluteD: string;
  computedStyles: PathStyle;
}>> {
  const pathNodes = svgElement.querySelectorAll('path');
  
  const pathsInfoPromises = Array.from(pathNodes).map(
    async (node, index) => {
      const originalD = node.getAttribute('d') || '';
      let absoluteD = originalD;
      
      try {
        const parsed = parsePath(originalD);
        const absolutized = absolutize(parsed);
        const normalized = normalize(absolutized); // Convert to M, L, C, Z only
        absoluteD = normalizeScientificNotation(serialize(normalized));
      } catch (parseError) {
        console.error(
          `Error converting path data to absolute for index ${index}:`,
          parseError
        );
      }

      // Get computed styles with fallback to default appearance
      const computedStyles = await getComputedPathStyles(
        svgElement,
        index,
        defaultAppearance
      );

      return { index, originalD, absoluteD, computedStyles };
    }
  );

  return Promise.all(pathsInfoPromises);
}

/**
 * Get computed styles for a path element
 * @param svgElement - The SVG element
 * @param pathIndex - Index of the path element
 * @param defaults - Default style values
 * @returns Promise resolving to computed styles
 */
export function getComputedPathStyles(
  svgElement: Element,
  pathIndex: number,
  defaults: Partial<PathStyle> = {}
): Promise<PathStyle> {
  return new Promise((resolve) => {
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.top = '-9999px';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = '1px';
    tempContainer.style.height = '1px';
    tempContainer.style.visibility = 'hidden';
    tempContainer.style.pointerEvents = 'none';

    const clonedSvgElement = svgElement.cloneNode(true) as Element;
    tempContainer.appendChild(clonedSvgElement);
    document.body.appendChild(tempContainer);

    const clonedTargetPathNode = clonedSvgElement.querySelectorAll('path')[pathIndex];

    if (!clonedTargetPathNode) {
      document.body.removeChild(tempContainer);
      console.warn(
        `Could not find target path node (index ${pathIndex}) in cloned SVG for style computation.`
      );
      resolve({ ...defaults } as PathStyle);
      return;
    }

    requestAnimationFrame(() => {
      try {
        const computedStyle = window.getComputedStyle(clonedTargetPathNode);
        const getStyleProp = (propName: string, defaultValue?: string) =>
          computedStyle.getPropertyValue(propName).trim() || defaultValue;
        const getNumericStyleProp = (propName: string, defaultValue?: number) => {
          const val = computedStyle.getPropertyValue(propName);
          const num = parseFloat(val);
          return val === null || val.trim() === '' || isNaN(num)
            ? defaultValue
            : num;
        };

        const styles: PathStyle = {};
        
        const fillValue = getStyleProp('fill', defaults.fill || '');
        if (fillValue) styles.fill = convertRgbToHex(fillValue);
        
        const strokeValue = getStyleProp('stroke', defaults.stroke || '');
        if (strokeValue) styles.stroke = convertRgbToHex(strokeValue);
        
        const strokeWidth = getNumericStyleProp('stroke-width', defaults.strokeWidth);
        if (strokeWidth !== undefined) styles.strokeWidth = strokeWidth;
        
        const fillOpacity = getNumericStyleProp('fill-opacity', defaults.fillOpacity);
        if (fillOpacity !== undefined) styles.fillOpacity = fillOpacity;
        
        const strokeOpacity = getNumericStyleProp('stroke-opacity', defaults.strokeOpacity);
        if (strokeOpacity !== undefined) styles.strokeOpacity = strokeOpacity;
        
        const strokeLinecap = getStyleProp('stroke-linecap', defaults.strokeLinecap);
        if (strokeLinecap) styles.strokeLinecap = strokeLinecap as any;
        
        const strokeLinejoin = getStyleProp('stroke-linejoin', defaults.strokeLinejoin);
        if (strokeLinejoin) styles.strokeLinejoin = strokeLinejoin as any;
        
        const strokeDasharray = getStyleProp('stroke-dasharray', defaults.strokeDasharray);
        if (strokeDasharray) styles.strokeDasharray = strokeDasharray;
        
        const fillRule = getStyleProp('fill-rule', defaults.fillRule);
        if (fillRule) styles.fillRule = fillRule as any;
        
        resolve(styles);
      } catch (styleError) {
        console.error(
          `Error getting computed style for path index ${pathIndex}:`,
          styleError
        );
        resolve({ ...defaults } as PathStyle);
      } finally {
        document.body.removeChild(tempContainer);
      }
    });
  });
}

/**
 * Complete SVG file processor that handles all aspects of SVG parsing
 * @param rawSvgContent - Raw SVG content string
 * @param defaultAppearance - Default style values
 * @returns Processed SVG information
 */
export async function processSvgFile(
  rawSvgContent: string,
  defaultAppearance: Partial<PathStyle> = {}
): Promise<{
  normalizedSvgContent: string;
  pathsInfo: Array<{
    index: number;
    originalD: string;
    absoluteD: string;
    computedStyles: PathStyle;
  }>;
  svgElement: Element;
  paths: SVGPath[];
}> {
  // Process the SVG content (convert shapes, normalize paths)
  const { svgElement, normalizedSvgContent } = processSvgContent(rawSvgContent);
  
  // Process individual path information
  const pathsInfo = await processPathsInfo(svgElement, defaultAppearance);
  
  // Parse to SVGPath array for the editor
  const paths = parseSVGToSubPaths(normalizedSvgContent, false);
  
  return {
    normalizedSvgContent,
    pathsInfo,
    svgElement,
    paths
  };
}

/**
 * Enhanced SVG parser factory with different processing options
 */
export const SVGParser = {
  /**
   * Basic parsing - just convert to SVGPath array
   */
  parse: (svgString: string): SVGPath[] => {
    return parseSVGToSubPaths(svgString, false);
  },
  
  /**
   * Advanced parsing with shape conversion and path normalization
   */
  parseAdvanced: (svgString: string, debugMode = false): SVGPath[] => {
    const { normalizedSvgContent } = processSvgContent(svgString, debugMode);
    return parseSVGToSubPaths(normalizedSvgContent, false);
  },
  
  /**
   * Full processing with computed styles and path information
   */
  processFile: async (
    svgString: string, 
    defaultAppearance?: Partial<PathStyle>
  ) => {
    return processSvgFile(svgString, defaultAppearance);
  },
  
  /**
   * Get absolute path data from path string
   */
  getAbsolutePath: (pathData: string): string => {
    return getAbsolutePathData(pathData);
  },
  
  /**
   * Parse path data into commands
   */
  parsePathData,
  
  /**
   * Parse element styles
   */
  parsePathStyle,
  
  /**
   * Process SVG content (shapes to paths, normalization)
   */
  processSvgContent,
  
  /**
   * Debug functions
   */
  debug: {
    parsePathStyle: debugParsePathStyle,
    testStrokeParsingInBrowser,
    testXmlDeclarationHandling,
  }
};
