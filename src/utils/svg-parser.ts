import { SVGCommand, PathStyle, SVGCommandType, SVGPath, TextElement, MultilineTextElement, TextElementType, SVGGroup, SVGGroupChild, SVGFilter, FilterPrimitiveType, SVGTextPath, SVGAnimation, SVGImage, SVGSymbol, SVGUse } from '../types';
import { parsePath, absolutize, normalize, serialize } from 'path-data-parser';
import { generateId } from './id-utils';
import { decomposeIntoSubPaths } from './subpath-utils';
import { convertRgbToHex, parseColorWithOpacity } from './color-utils';
import { parseTransformString, transformPoint } from './transform-utils';
import { LinearGradient, RadialGradient, Pattern, GradientOrPattern } from '../types';

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
 * Converts all SVG shapes to path elements, but excludes shapes inside defs
 */
function convertShapesToPathsExcludingDefs(svgElement: Element, debugMode = false): void {
  const svgNS = 'http://www.w3.org/2000/svg';
  const shapesSelector = 'circle, rect, ellipse, line, polygon, polyline';
  
  // Get all shapes but exclude those inside defs
  const allShapes = Array.from(svgElement.querySelectorAll(shapesSelector));
  const shapes = allShapes.filter(shape => {
    // Check if this shape is inside a defs element
    let parent = shape.parentElement;
    while (parent && parent !== svgElement) {
      if (parent.tagName.toLowerCase() === 'defs') {
        return false; // Skip shapes inside defs
      }
      parent = parent.parentElement;
    }
    return true;
  });

  if (debugMode) {
    console.log(`🔄 Converting ${shapes.length} shapes to paths (excluding ${allShapes.length - shapes.length} shapes in defs)`);
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
 * Converts all SVG shapes to path elements (original function for backward compatibility)
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
    if (!color || color.trim() === '') return {};
    if (color === 'none') return { color: 'none' };
    const result = parseColorWithOpacity(color.trim());
    return {
      color: result.color, // Always return the color (converted or original)
      opacity: result.opacity
    };
  };
  
  // Legacy helper for backward compatibility
  const normalizeColor = (color: string | null | undefined): string | undefined => {
    if (!color || color.trim() === '') return undefined;
    if (color === 'none') return 'none';
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
    if (normalizedFill !== undefined) style.fill = normalizedFill;
    
    const normalizedStroke = normalizeColor(stroke);
    if (normalizedStroke !== undefined) style.stroke = normalizedStroke;
    
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
    
    const filter = getStyleProp('filter');
    if (filter && filter !== 'none' && filter !== 'inherit') {
      style.filter = filter;
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
    const filter = element.getAttribute('filter');
    
    // Parse fill color and extract opacity if present
    const fillResult = normalizeColorWithOpacity(fill);
    if (fillResult.color !== undefined) style.fill = fillResult.color;
    
    // Parse stroke color and extract opacity if present
    const strokeResult = normalizeColorWithOpacity(stroke);
    if (strokeResult.color !== undefined) style.stroke = strokeResult.color;
    
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
    if (filter) {
      style.filter = filter;
      console.log('🎯 PATH FILTER PARSED:', { elementTag: element.tagName, filter });
    }
    
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
            if (fillInlineResult.color !== undefined) style.fill = fillInlineResult.color;
            // Apply opacity from RGBA fill if no explicit fill-opacity in inline styles
            if (fillInlineResult.opacity !== undefined && style.fillOpacity === undefined) {
              style.fillOpacity = fillInlineResult.opacity;
            }
            break;
          }
          case 'stroke': {
            const strokeInlineResult = normalizeColorWithOpacity(value);
            if (strokeInlineResult.color !== undefined) style.stroke = strokeInlineResult.color;
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
          case 'filter':
            style.filter = value;
            console.log('🎯 PATH FILTER PARSED (inline style):', { elementTag: element.tagName, filter: value });
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
 * But preserve defs section with gradients and patterns
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

  // Preserve defs section before converting shapes
  const defsElement = svgElement.querySelector('defs');
  let preservedDefs: Element | null = null;
  if (defsElement) {
    preservedDefs = defsElement.cloneNode(true) as Element;
  }

  // Convert shapes to paths (but not inside defs)
  convertShapesToPathsExcludingDefs(svgElement, debugMode);

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

  // Restore preserved defs if they existed
  if (preservedDefs) {
    // Remove the current defs (if any) and replace with preserved one
    const currentDefs = svgElement.querySelector('defs');
    if (currentDefs) {
      svgElement.removeChild(currentDefs);
    }
    // Insert preserved defs as first child
    svgElement.insertBefore(preservedDefs, svgElement.firstChild);
    
    if (debugMode) {
      console.log('🔧 Restored preserved defs section');
    }
  }

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
      
      // Use existing ID if present, otherwise generate a new one
      const pathId = pathElement.getAttribute('id') || generateId();
      
      try {
        const commands = parsePathData(pathData);
        const style = parsePathStyle(pathElement, useComputedStyles);
        
        if (style.filter) {
          console.log('🎯 PATH WITH FILTER FOUND:', { 
            pathData: pathData.substring(0, 50) + '...', 
            filter: style.filter,
            fullStyle: style
          });
        }
        
        if (commands.length > 0) {
          // Decompose the path into sub-paths
          const subPaths = decomposeIntoSubPaths(commands);
          
          paths.push({
            id: pathId,
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
        
        const fillValue = getStyleProp('fill', '');
        if (fillValue) {
          const converted = convertRgbToHex(fillValue);
          styles.fill = converted || fillValue;
        } else if (defaults.fill && typeof defaults.fill === 'string') {
          const converted = convertRgbToHex(defaults.fill);
          styles.fill = converted || defaults.fill;
        }
        
        const strokeValue = getStyleProp('stroke', '');
        if (strokeValue) {
          const converted = convertRgbToHex(strokeValue);
          styles.stroke = converted || strokeValue;
        } else if (defaults.stroke && typeof defaults.stroke === 'string') {
          const converted = convertRgbToHex(defaults.stroke);
          styles.stroke = converted || defaults.stroke;
        }
        
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

/**
 * Parse text elements from SVG
 */
export function parseTextElements(svgElement: Element): TextElementType[] {
  const textElements: TextElementType[] = [];
  const textNodes = svgElement.querySelectorAll('text');
  
  textNodes.forEach((textNode) => {
    // Use existing ID if present, otherwise generate a new one
    const textId = textNode.getAttribute('id') || generateId();
    
    const x = parseFloat(textNode.getAttribute('x') || '0');
    const y = parseFloat(textNode.getAttribute('y') || '0');
    const transform = textNode.getAttribute('transform') || undefined;
    
    // Parse text style
    const style: any = {};
    
    // Font properties
    if (textNode.getAttribute('font-family')) {
      style.fontFamily = textNode.getAttribute('font-family');
    }
    if (textNode.getAttribute('font-size')) {
      style.fontSize = parseFloat(textNode.getAttribute('font-size')!);
    }
    if (textNode.getAttribute('font-weight')) {
      style.fontWeight = textNode.getAttribute('font-weight');
    }
    if (textNode.getAttribute('font-style')) {
      style.fontStyle = textNode.getAttribute('font-style');
    }
    if (textNode.getAttribute('font-variant')) {
      style.fontVariant = textNode.getAttribute('font-variant');
    }
    if (textNode.getAttribute('font-stretch')) {
      style.fontStretch = textNode.getAttribute('font-stretch');
    }
    if (textNode.getAttribute('text-decoration')) {
      style.textDecoration = textNode.getAttribute('text-decoration');
    }
    if (textNode.getAttribute('text-anchor')) {
      style.textAnchor = textNode.getAttribute('text-anchor');
    }
    if (textNode.getAttribute('dominant-baseline')) {
      style.dominantBaseline = textNode.getAttribute('dominant-baseline');
    }
    if (textNode.getAttribute('alignment-baseline')) {
      style.alignmentBaseline = textNode.getAttribute('alignment-baseline');
    }
    if (textNode.getAttribute('baseline-shift')) {
      style.baselineShift = textNode.getAttribute('baseline-shift');
    }
    if (textNode.getAttribute('direction')) {
      style.direction = textNode.getAttribute('direction');
    }
    if (textNode.getAttribute('writing-mode')) {
      style.writingMode = textNode.getAttribute('writing-mode');
    }
    if (textNode.getAttribute('text-rendering')) {
      style.textRendering = textNode.getAttribute('text-rendering');
    }
    if (textNode.getAttribute('letter-spacing')) {
      style.letterSpacing = parseFloat(textNode.getAttribute('letter-spacing')!);
    }
    if (textNode.getAttribute('word-spacing')) {
      style.wordSpacing = parseFloat(textNode.getAttribute('word-spacing')!);
    }
    if (textNode.getAttribute('textLength')) {
      style.textLength = parseFloat(textNode.getAttribute('textLength')!);
    }
    if (textNode.getAttribute('lengthAdjust')) {
      style.lengthAdjust = textNode.getAttribute('lengthAdjust');
    }
    
    // Color and opacity
    const fill = textNode.getAttribute('fill');
    if (fill) {
      if (fill.startsWith('url(#')) {
        // Handle gradient/pattern references
        style.fill = fill;
      } else {
        style.fill = convertRgbToHex(fill) || fill;
      }
    }
    
    const stroke = textNode.getAttribute('stroke');
    if (stroke) {
      if (stroke.startsWith('url(#')) {
        style.stroke = stroke;
      } else {
        style.stroke = convertRgbToHex(stroke) || stroke;
      }
    }
    
    if (textNode.getAttribute('stroke-width')) {
      style.strokeWidth = parseFloat(textNode.getAttribute('stroke-width')!);
    }
    if (textNode.getAttribute('stroke-dasharray')) {
      const dasharray = textNode.getAttribute('stroke-dasharray')!;
      if (dasharray === 'none') {
        style.strokeDasharray = 'none';
      } else {
        style.strokeDasharray = dasharray.split(',').map(v => parseFloat(v.trim()));
      }
    }
    if (textNode.getAttribute('stroke-dashoffset')) {
      style.strokeDashoffset = parseFloat(textNode.getAttribute('stroke-dashoffset')!);
    }
    if (textNode.getAttribute('stroke-linecap')) {
      style.strokeLinecap = textNode.getAttribute('stroke-linecap');
    }
    if (textNode.getAttribute('stroke-linejoin')) {
      style.strokeLinejoin = textNode.getAttribute('stroke-linejoin');
    }
    if (textNode.getAttribute('stroke-miterlimit')) {
      style.strokeMiterlimit = parseFloat(textNode.getAttribute('stroke-miterlimit')!);
    }
    if (textNode.getAttribute('fill-opacity')) {
      style.fillOpacity = parseFloat(textNode.getAttribute('fill-opacity')!);
    }
    if (textNode.getAttribute('stroke-opacity')) {
      style.strokeOpacity = parseFloat(textNode.getAttribute('stroke-opacity')!);
    }
    if (textNode.getAttribute('opacity')) {
      style.opacity = parseFloat(textNode.getAttribute('opacity')!);
    }
    if (textNode.getAttribute('filter')) {
      style.filter = textNode.getAttribute('filter');
    }
    if (textNode.getAttribute('clip-path')) {
      style.clipPath = textNode.getAttribute('clip-path');
    }
    if (textNode.getAttribute('mask')) {
      style.mask = textNode.getAttribute('mask');
    }
    
    // Parse inline styles
    const styleAttr = textNode.getAttribute('style');
    if (styleAttr) {
      const styleRules = styleAttr.split(';');
      for (const rule of styleRules) {
        const colonIndex = rule.indexOf(':');
        if (colonIndex === -1) continue;
        
        const property = rule.substring(0, colonIndex).trim();
        const value = rule.substring(colonIndex + 1).trim();
        
        switch (property) {
          case 'font-family':
            style.fontFamily = value;
            break;
          case 'font-size':
            style.fontSize = parseFloat(value);
            break;
          case 'font-weight':
            style.fontWeight = value;
            break;
          case 'font-style':
            style.fontStyle = value;
            break;
          case 'font-variant':
            style.fontVariant = value;
            break;
          case 'font-stretch':
            style.fontStretch = value;
            break;
          case 'text-decoration':
            style.textDecoration = value;
            break;
          case 'text-anchor':
            style.textAnchor = value;
            break;
          case 'dominant-baseline':
            style.dominantBaseline = value;
            break;
          case 'alignment-baseline':
            style.alignmentBaseline = value;
            break;
          case 'baseline-shift':
            style.baselineShift = value;
            break;
          case 'direction':
            style.direction = value;
            break;
          case 'writing-mode':
            style.writingMode = value;
            break;
          case 'text-rendering':
            style.textRendering = value;
            break;
          case 'letter-spacing':
            style.letterSpacing = parseFloat(value);
            break;
          case 'word-spacing':
            style.wordSpacing = parseFloat(value);
            break;
          case 'textLength':
            style.textLength = parseFloat(value);
            break;
          case 'lengthAdjust':
            style.lengthAdjust = value;
            break;
          case 'fill':
            if (value.startsWith('url(#')) {
              style.fill = value;
            } else {
              style.fill = convertRgbToHex(value) || value;
            }
            break;
          case 'stroke':
            if (value.startsWith('url(#')) {
              style.stroke = value;
            } else {
              style.stroke = convertRgbToHex(value) || value;
            }
            break;
          case 'stroke-width':
            style.strokeWidth = parseFloat(value);
            break;
          case 'stroke-dasharray':
            if (value === 'none') {
              style.strokeDasharray = 'none';
            } else {
              style.strokeDasharray = value.split(',').map(v => parseFloat(v.trim()));
            }
            break;
          case 'stroke-dashoffset':
            style.strokeDashoffset = parseFloat(value);
            break;
          case 'stroke-linecap':
            style.strokeLinecap = value;
            break;
          case 'stroke-linejoin':
            style.strokeLinejoin = value;
            break;
          case 'stroke-miterlimit':
            style.strokeMiterlimit = parseFloat(value);
            break;
          case 'fill-opacity':
            style.fillOpacity = parseFloat(value);
            break;
          case 'stroke-opacity':
            style.strokeOpacity = parseFloat(value);
            break;
          case 'opacity':
            style.opacity = parseFloat(value);
            break;
          case 'filter':
            style.filter = value;
            break;
          case 'clip-path':
            style.clipPath = value;
            break;
          case 'mask':
            style.mask = value;
            break;
        }
      }
    }
    
    // Check if it has tspan children (multiline text)
    const tspanNodes = textNode.querySelectorAll('tspan');
    
    if (tspanNodes.length > 0) {
      // Multiline text
      const spans = Array.from(tspanNodes).map((tspanNode) => ({
        id: generateId(),
        content: tspanNode.textContent || '',
        x: tspanNode.getAttribute('x') ? parseFloat(tspanNode.getAttribute('x')!) : undefined,
        y: tspanNode.getAttribute('y') ? parseFloat(tspanNode.getAttribute('y')!) : undefined,
        dx: tspanNode.getAttribute('dx') ? parseFloat(tspanNode.getAttribute('dx')!) : undefined,
        dy: tspanNode.getAttribute('dy') ? parseFloat(tspanNode.getAttribute('dy')!) : undefined,
      }));
      
      const multilineText: MultilineTextElement = {
        id: textId,
        type: 'multiline-text',
        x,
        y,
        spans,
        style,
        transform,
      };
      
      textElements.push(multilineText);
    } else {
      // Single line text
      const content = textNode.textContent || '';
      
      const singleText: TextElement = {
        id: textId,
        type: 'text',
        content,
        x,
        y,
        style,
        transform,
      };
      
      textElements.push(singleText);
    }
  });
  
  return textElements;
}

/**
 * Parse gradient definitions from SVG
 */
export function parseGradients(svgElement: Element): GradientOrPattern[] {
  const gradients: GradientOrPattern[] = [];
  const defsElement = svgElement.querySelector('defs');
  
  if (!defsElement) return gradients;
  
  // Parse linear gradients
  const linearGradients = defsElement.querySelectorAll('linearGradient');
  linearGradients.forEach((gradientNode) => {
    const id = gradientNode.getAttribute('id');
    if (!id) return;
    
    const x1 = parseFloat(gradientNode.getAttribute('x1') || '0');
    const y1 = parseFloat(gradientNode.getAttribute('y1') || '0');
    const x2 = parseFloat(gradientNode.getAttribute('x2') || '100');
    const y2 = parseFloat(gradientNode.getAttribute('y2') || '0');
    
    const stops = Array.from(gradientNode.querySelectorAll('stop')).map((stopNode) => ({
      id: generateId(),
      offset: parseFloat(stopNode.getAttribute('offset') || '0'),
      color: convertRgbToHex(stopNode.getAttribute('stop-color') || '#000000') || '#000000',
      opacity: parseFloat(stopNode.getAttribute('stop-opacity') || '1'),
    }));
    
    const linearGradient: LinearGradient = {
      id,
      type: 'linear',
      x1,
      y1,
      x2,
      y2,
      stops,
    };
    
    gradients.push(linearGradient);
  });
  
  // Parse radial gradients
  const radialGradients = defsElement.querySelectorAll('radialGradient');
  radialGradients.forEach((gradientNode) => {
    const id = gradientNode.getAttribute('id');
    if (!id) return;
    
    const cx = parseFloat(gradientNode.getAttribute('cx') || '50');
    const cy = parseFloat(gradientNode.getAttribute('cy') || '50');
    const r = parseFloat(gradientNode.getAttribute('r') || '50');
    const fx = parseFloat(gradientNode.getAttribute('fx') || cx.toString());
    const fy = parseFloat(gradientNode.getAttribute('fy') || cy.toString());
    
    const stops = Array.from(gradientNode.querySelectorAll('stop')).map((stopNode) => ({
      id: generateId(),
      offset: parseFloat(stopNode.getAttribute('offset') || '0'),
      color: convertRgbToHex(stopNode.getAttribute('stop-color') || '#000000') || '#000000',
      opacity: parseFloat(stopNode.getAttribute('stop-opacity') || '1'),
    }));
    
    const radialGradient: RadialGradient = {
      id,
      type: 'radial',
      cx,
      cy,
      r,
      fx,
      fy,
      stops,
    };
    
    gradients.push(radialGradient);
  });
  
  // Parse patterns
  const patterns = defsElement.querySelectorAll('pattern');
  patterns.forEach((patternNode) => {
    const id = patternNode.getAttribute('id');
    if (!id) return;
    
    const width = parseFloat(patternNode.getAttribute('width') || '10');
    const height = parseFloat(patternNode.getAttribute('height') || '10');
    const patternUnits = (patternNode.getAttribute('patternUnits') || 'objectBoundingBox') as 'userSpaceOnUse' | 'objectBoundingBox';
    const patternContentUnits = patternNode.getAttribute('patternContentUnits');
    const patternTransform = patternNode.getAttribute('patternTransform');
    
    // Extract pattern content as SVG string, removing xmlns attributes
    const patternContent = Array.from(patternNode.children)
      .map(child => {
        const serialized = new XMLSerializer().serializeToString(child);
        // Remove xmlns attribute from the serialized string
        return serialized.replace(/\s*xmlns="[^"]*"/g, '');
      })
      .join('');
    
    const pattern: Pattern = {
      id,
      type: 'pattern',
      width,
      height,
      patternUnits,
      patternContentUnits: (patternContentUnits || undefined) as 'userSpaceOnUse' | 'objectBoundingBox' | undefined,
      patternTransform: patternTransform || undefined,
      content: patternContent,
    };
    
    gradients.push(pattern);
  });
  
  return gradients;
}

/**
 * Parse filter definitions from SVG
 */
export function parseFilters(svgElement: Element): SVGFilter[] {
  const filters: SVGFilter[] = [];
  const defsElement = svgElement.querySelector('defs');
  
  if (!defsElement) return filters;
  
  // Parse filter elements
  const filterElements = defsElement.querySelectorAll('filter');
  filterElements.forEach((filterNode) => {
    const id = filterNode.getAttribute('id');
    if (!id) return;
    
    const x = filterNode.getAttribute('x') ? parseFloat(filterNode.getAttribute('x')!) : undefined;
    const y = filterNode.getAttribute('y') ? parseFloat(filterNode.getAttribute('y')!) : undefined;
    const width = filterNode.getAttribute('width') ? parseFloat(filterNode.getAttribute('width')!) : undefined;
    const height = filterNode.getAttribute('height') ? parseFloat(filterNode.getAttribute('height')!) : undefined;
    const filterUnits = filterNode.getAttribute('filterUnits') as 'userSpaceOnUse' | 'objectBoundingBox' | undefined;
    const primitiveUnits = filterNode.getAttribute('primitiveUnits') as 'userSpaceOnUse' | 'objectBoundingBox' | undefined;
    const colorInterpolationFilters = filterNode.getAttribute('color-interpolation-filters') as 'auto' | 'sRGB' | 'linearRGB' | undefined;
    
    // Parse filter primitives
    const primitives: FilterPrimitiveType[] = [];
    
    // Parse feGaussianBlur
    const blurElements = filterNode.querySelectorAll('feGaussianBlur');
    blurElements.forEach((element) => {
      primitives.push({
        type: 'feGaussianBlur',
        stdDeviation: parseFloat(element.getAttribute('stdDeviation') || '3'),
        in: element.getAttribute('in') || undefined,
        result: element.getAttribute('result') || undefined,
      });
    });
    
    // Parse feOffset
    const offsetElements = filterNode.querySelectorAll('feOffset');
    offsetElements.forEach((element) => {
      primitives.push({
        type: 'feOffset',
        dx: parseFloat(element.getAttribute('dx') || '0'),
        dy: parseFloat(element.getAttribute('dy') || '0'),
        in: element.getAttribute('in') || undefined,
        result: element.getAttribute('result') || undefined,
      });
    });
    
    // Parse feFlood
    const floodElements = filterNode.querySelectorAll('feFlood');
    floodElements.forEach((element) => {
      primitives.push({
        type: 'feFlood',
        floodColor: element.getAttribute('flood-color') || '#000000',
        floodOpacity: element.getAttribute('flood-opacity') ? parseFloat(element.getAttribute('flood-opacity')!) : undefined,
        result: element.getAttribute('result') || undefined,
      });
    });
    
    // Parse feComposite
    const compositeElements = filterNode.querySelectorAll('feComposite');
    compositeElements.forEach((element) => {
      const primitive: any = {
        type: 'feComposite',
        operator: (element.getAttribute('operator') || 'over') as 'over' | 'in' | 'out' | 'atop' | 'xor' | 'arithmetic',
        in: element.getAttribute('in') || undefined,
        in2: element.getAttribute('in2') || undefined,
        result: element.getAttribute('result') || undefined,
      };

      // Parse arithmetic coefficients for arithmetic operator
      if (primitive.operator === 'arithmetic') {
        primitive.k1 = element.getAttribute('k1') ? parseFloat(element.getAttribute('k1')!) : 0;
        primitive.k2 = element.getAttribute('k2') ? parseFloat(element.getAttribute('k2')!) : 1;
        primitive.k3 = element.getAttribute('k3') ? parseFloat(element.getAttribute('k3')!) : 1;
        primitive.k4 = element.getAttribute('k4') ? parseFloat(element.getAttribute('k4')!) : 0;
      }

      primitives.push(primitive);
    });
    
    // Parse feColorMatrix
    const colorMatrixElements = filterNode.querySelectorAll('feColorMatrix');
    colorMatrixElements.forEach((element) => {
      primitives.push({
        type: 'feColorMatrix',
        colorMatrixType: (element.getAttribute('type') || 'matrix') as 'matrix' | 'saturate' | 'hueRotate' | 'luminanceToAlpha',
        values: element.getAttribute('values') || undefined,
        in: element.getAttribute('in') || undefined,
        result: element.getAttribute('result') || undefined,
      });
    });
    
    // Parse feDropShadow
    const dropShadowElements = filterNode.querySelectorAll('feDropShadow');
    dropShadowElements.forEach((element) => {
      primitives.push({
        type: 'feDropShadow',
        dx: parseFloat(element.getAttribute('dx') || '2'),
        dy: parseFloat(element.getAttribute('dy') || '2'),
        stdDeviation: parseFloat(element.getAttribute('stdDeviation') || '3'),
        floodColor: element.getAttribute('flood-color') || '#000000',
        floodOpacity: element.getAttribute('flood-opacity') ? parseFloat(element.getAttribute('flood-opacity')!) : undefined,
        result: element.getAttribute('result') || undefined,
      });
    });
    
    // Parse feBlend
    const blendElements = filterNode.querySelectorAll('feBlend');
    blendElements.forEach((element) => {
      primitives.push({
        type: 'feBlend',
        mode: (element.getAttribute('mode') || 'normal') as 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light' | 'difference' | 'exclusion',
        in: element.getAttribute('in') || undefined,
        in2: element.getAttribute('in2') || undefined,
        result: element.getAttribute('result') || undefined,
      });
    });
    
    // Parse feMorphology
    const morphologyElements = filterNode.querySelectorAll('feMorphology');
    morphologyElements.forEach((element) => {
      primitives.push({
        type: 'feMorphology',
        operator: (element.getAttribute('operator') || 'dilate') as 'erode' | 'dilate',
        radius: parseFloat(element.getAttribute('radius') || '1'),
        in: element.getAttribute('in') || undefined,
        result: element.getAttribute('result') || undefined,
      });
    });
    
    // Parse feConvolveMatrix
    const convolveMatrixElements = filterNode.querySelectorAll('feConvolveMatrix');
    convolveMatrixElements.forEach((element) => {
      primitives.push({
        type: 'feConvolveMatrix',
        order: element.getAttribute('order') || '3',
        kernelMatrix: element.getAttribute('kernelMatrix') || '0 -1 0 -1 5 -1 0 -1 0',
        in: element.getAttribute('in') || undefined,
        result: element.getAttribute('result') || undefined,
      });
    });
    
    // Parse feTurbulence
    const turbulenceElements = filterNode.querySelectorAll('feTurbulence');
    turbulenceElements.forEach((element) => {
      primitives.push({
        type: 'feTurbulence',
        baseFrequency: element.getAttribute('baseFrequency') || '0.1',
        numOctaves: element.getAttribute('numOctaves') ? parseInt(element.getAttribute('numOctaves')!) : 4,
        seed: element.getAttribute('seed') ? parseInt(element.getAttribute('seed')!) : 2,
        stitchTiles: (element.getAttribute('stitchTiles') || 'noStitch') as 'stitch' | 'noStitch',
        turbulenceType: (element.getAttribute('type') || 'turbulence') as 'fractalNoise' | 'turbulence',
        result: element.getAttribute('result') || undefined,
      });
    });
    
    // Parse feDisplacementMap
    const displacementMapElements = filterNode.querySelectorAll('feDisplacementMap');
    displacementMapElements.forEach((element) => {
      primitives.push({
        type: 'feDisplacementMap',
        scale: element.getAttribute('scale') ? parseFloat(element.getAttribute('scale')!) : 0,
        xChannelSelector: (element.getAttribute('xChannelSelector') || 'A') as 'R' | 'G' | 'B' | 'A',
        yChannelSelector: (element.getAttribute('yChannelSelector') || 'A') as 'R' | 'G' | 'B' | 'A',
        in: element.getAttribute('in') || undefined,
        in2: element.getAttribute('in2') || undefined,
        result: element.getAttribute('result') || undefined,
      });
    });
    
    // Parse feMerge
    const mergeElements = filterNode.querySelectorAll('feMerge');
    mergeElements.forEach((element) => {
      const mergeNodes = Array.from(element.querySelectorAll('feMergeNode')).map(node => ({
        in: node.getAttribute('in') || '',
      }));
      
      primitives.push({
        type: 'feMerge',
        feMergeNodes: mergeNodes,
        result: element.getAttribute('result') || undefined,
      });
    });
    
    // Parse feComponentTransfer
    const componentTransferElements = filterNode.querySelectorAll('feComponentTransfer');
    componentTransferElements.forEach((element) => {
      primitives.push({
        type: 'feComponentTransfer',
        in: element.getAttribute('in') || undefined,
        result: element.getAttribute('result') || undefined,
      });
    });
    
    // Parse feImage
    const imageElements = filterNode.querySelectorAll('feImage');
    imageElements.forEach((element) => {
      primitives.push({
        type: 'feImage',
        href: element.getAttribute('href') || element.getAttribute('xlink:href') || undefined,
        preserveAspectRatio: element.getAttribute('preserveAspectRatio') || undefined,
        crossorigin: element.getAttribute('crossorigin') as 'anonymous' | 'use-credentials' | undefined,
        result: element.getAttribute('result') || undefined,
      });
    });
    
    // Parse feTile
    const tileElements = filterNode.querySelectorAll('feTile');
    tileElements.forEach((element) => {
      primitives.push({
        type: 'feTile',
        in: element.getAttribute('in') || undefined,
        result: element.getAttribute('result') || undefined,
      });
    });
    
    // Parse feDiffuseLighting
    const diffuseLightingElements = filterNode.querySelectorAll('feDiffuseLighting');
    diffuseLightingElements.forEach((element) => {
      // Parse light source
      const distantLight = element.querySelector('feDistantLight');
      const pointLight = element.querySelector('fePointLight');
      const spotLight = element.querySelector('feSpotLight');
      
      let lightSource: any;
      if (distantLight) {
        lightSource = {
          type: 'feDistantLight',
          azimuth: distantLight.getAttribute('azimuth') ? parseFloat(distantLight.getAttribute('azimuth')!) : 45,
          elevation: distantLight.getAttribute('elevation') ? parseFloat(distantLight.getAttribute('elevation')!) : 45,
        };
      } else if (pointLight) {
        lightSource = {
          type: 'fePointLight',
          x: pointLight.getAttribute('x') ? parseFloat(pointLight.getAttribute('x')!) : 0,
          y: pointLight.getAttribute('y') ? parseFloat(pointLight.getAttribute('y')!) : 0,
          z: pointLight.getAttribute('z') ? parseFloat(pointLight.getAttribute('z')!) : 1,
        };
      } else if (spotLight) {
        lightSource = {
          type: 'feSpotLight',
          x: spotLight.getAttribute('x') ? parseFloat(spotLight.getAttribute('x')!) : 0,
          y: spotLight.getAttribute('y') ? parseFloat(spotLight.getAttribute('y')!) : 0,
          z: spotLight.getAttribute('z') ? parseFloat(spotLight.getAttribute('z')!) : 1,
          pointsAtX: spotLight.getAttribute('pointsAtX') ? parseFloat(spotLight.getAttribute('pointsAtX')!) : 0,
          pointsAtY: spotLight.getAttribute('pointsAtY') ? parseFloat(spotLight.getAttribute('pointsAtY')!) : 0,
          pointsAtZ: spotLight.getAttribute('pointsAtZ') ? parseFloat(spotLight.getAttribute('pointsAtZ')!) : 0,
        };
      } else {
        // Default light source
        lightSource = {
          type: 'feDistantLight',
          azimuth: 45,
          elevation: 45,
        };
      }
      
      primitives.push({
        type: 'feDiffuseLighting',
        surfaceScale: element.getAttribute('surface-scale') ? parseFloat(element.getAttribute('surface-scale')!) : 1,
        diffuseConstant: element.getAttribute('diffuse-constant') ? parseFloat(element.getAttribute('diffuse-constant')!) : 1,
        lightingColor: element.getAttribute('lighting-color') || '#ffffff',
        in: element.getAttribute('in') || undefined,
        result: element.getAttribute('result') || undefined,
        lightSource,
      });
    });
    
    // Parse feSpecularLighting
    const specularLightingElements = filterNode.querySelectorAll('feSpecularLighting');
    specularLightingElements.forEach((element) => {
      // Parse light source (same logic as diffuse lighting)
      const distantLight = element.querySelector('feDistantLight');
      const pointLight = element.querySelector('fePointLight');
      const spotLight = element.querySelector('feSpotLight');
      
      let lightSource: any;
      if (distantLight) {
        lightSource = {
          type: 'feDistantLight',
          azimuth: distantLight.getAttribute('azimuth') ? parseFloat(distantLight.getAttribute('azimuth')!) : 45,
          elevation: distantLight.getAttribute('elevation') ? parseFloat(distantLight.getAttribute('elevation')!) : 45,
        };
      } else if (pointLight) {
        lightSource = {
          type: 'fePointLight',
          x: pointLight.getAttribute('x') ? parseFloat(pointLight.getAttribute('x')!) : 0,
          y: pointLight.getAttribute('y') ? parseFloat(pointLight.getAttribute('y')!) : 0,
          z: pointLight.getAttribute('z') ? parseFloat(pointLight.getAttribute('z')!) : 1,
        };
      } else if (spotLight) {
        lightSource = {
          type: 'feSpotLight',
          x: spotLight.getAttribute('x') ? parseFloat(spotLight.getAttribute('x')!) : 0,
          y: spotLight.getAttribute('y') ? parseFloat(spotLight.getAttribute('y')!) : 0,
          z: spotLight.getAttribute('z') ? parseFloat(spotLight.getAttribute('z')!) : 1,
          pointsAtX: spotLight.getAttribute('pointsAtX') ? parseFloat(spotLight.getAttribute('pointsAtX')!) : 0,
          pointsAtY: spotLight.getAttribute('pointsAtY') ? parseFloat(spotLight.getAttribute('pointsAtY')!) : 0,
          pointsAtZ: spotLight.getAttribute('pointsAtZ') ? parseFloat(spotLight.getAttribute('pointsAtZ')!) : 0,
        };
      } else {
        lightSource = {
          type: 'feDistantLight',
          azimuth: 45,
          elevation: 45,
        };
      }
      
      primitives.push({
        type: 'feSpecularLighting',
        surfaceScale: element.getAttribute('surface-scale') ? parseFloat(element.getAttribute('surface-scale')!) : 1,
        specularConstant: element.getAttribute('specular-constant') ? parseFloat(element.getAttribute('specular-constant')!) : 1,
        specularExponent: element.getAttribute('specular-exponent') ? parseFloat(element.getAttribute('specular-exponent')!) : 1,
        lightingColor: element.getAttribute('lighting-color') || '#ffffff',
        in: element.getAttribute('in') || undefined,
        result: element.getAttribute('result') || undefined,
        lightSource,
      });
    });
    
    const filter: SVGFilter = {
      id,
      type: 'filter',
      x,
      y,
      width,
      height,
      filterUnits,
      primitiveUnits,
      colorInterpolationFilters,
      primitives,
    };
    
    filters.push(filter);
  });
  
  return filters;
}

/**
 * Parse SVG group elements (<g>) from SVG
 */
export function parseGroups(svgElement: Element, allPaths: SVGPath[], allTexts: TextElementType[]): SVGGroup[] {
  const groups: SVGGroup[] = [];
  const groupElements = svgElement.querySelectorAll('g');
  
  // Create maps for quick lookup
  const pathMap = new Map(allPaths.map(p => [p.id, p]));
  const textMap = new Map(allTexts.map(t => [t.id, t]));
  
  // Helper function to recursively parse group hierarchy
  const parseGroupRecursive = (groupElement: Element, allGroupElements: Element[]): SVGGroup | null => {
    // Use existing ID if present, otherwise generate a new one
    const groupId = groupElement.getAttribute('id') || generateId();
    
    // If no ID was present, set it on the element for consistency
    if (!groupElement.getAttribute('id')) {
      groupElement.setAttribute('id', groupId);
    }
    
    const name = groupElement.getAttribute('data-name') || undefined;
    const transform = groupElement.getAttribute('transform') || undefined;
    
    const children: SVGGroupChild[] = [];
    
    // Parse direct children of this group
    Array.from(groupElement.children).forEach(child => {
      const tagName = child.tagName.toLowerCase();
      
      if (tagName === 'path') {
        // Try to find matching path by ID first, then by d attribute
        const pathId = child.getAttribute('id');
        const pathData = child.getAttribute('d');
        
        let matchingPath = null;
        
        if (pathId) {
          matchingPath = allPaths.find(p => p.id === pathId);
        }
        
        if (!matchingPath && pathData) {
          matchingPath = allPaths.find(p => {
            // Compare normalized path data as fallback
            const pathString = p.subPaths.map(sp => sp.commands.map(cmd => {
              let cmdStr: string = cmd.command;
              if (cmd.x !== undefined && cmd.y !== undefined) {
                cmdStr += ` ${cmd.x} ${cmd.y}`;
              }
              if (cmd.x1 !== undefined && cmd.y1 !== undefined) {
                cmdStr = `${cmd.command} ${cmd.x1} ${cmd.y1}`;
                if (cmd.x2 !== undefined && cmd.y2 !== undefined) {
                  cmdStr += ` ${cmd.x2} ${cmd.y2}`;
                  if (cmd.x !== undefined && cmd.y !== undefined) {
                    cmdStr += ` ${cmd.x} ${cmd.y}`;
                  }
                }
              }
              return cmdStr;
            }).join(' ')).join(' ');
            
            return pathString.replace(/\s+/g, ' ').trim() === pathData.replace(/\s+/g, ' ').trim();
          });
        }
        
        if (matchingPath) {
          children.push({
            type: 'path',
            id: matchingPath.id
          });
        }
      } else if (tagName === 'text') {
        // Try to find matching text by ID first, then by content and position
        const textId = child.getAttribute('id');
        const textContent = child.textContent || '';
        const x = parseFloat(child.getAttribute('x') || '0');
        const y = parseFloat(child.getAttribute('y') || '0');
        
        let matchingText = null;
        
        if (textId) {
          matchingText = allTexts.find(t => t.id === textId);
        }
        
        if (!matchingText) {
          matchingText = allTexts.find(t => {
            const contentMatches = (t.type === 'text' && t.content === textContent) ||
                                  (t.type === 'multiline-text' && t.spans.map(s => s.content).join(' ') === textContent);
            const positionMatches = Math.abs(t.x - x) < 0.1 && Math.abs(t.y - y) < 0.1;
            return contentMatches && positionMatches;
          });
        }
        
        if (matchingText) {
          children.push({
            type: 'text',
            id: matchingText.id
          });
        }
      } else if (tagName === 'g') {
        // Recursive group parsing
        const nestedGroup = parseGroupRecursive(child, allGroupElements);
        if (nestedGroup) {
          // Add nested group to groups array first
          groups.push(nestedGroup);
          // Then reference it in children
          children.push({
            type: 'group',
            id: nestedGroup.id
          });
        }
      }
    });
    
    // Only create group if it has children
    if (children.length > 0) {
      const group: SVGGroup = {
        id: groupId,
        name,
        transform,
        children,
        visible: true,
        locked: false,
        lockLevel: 'movement-sync' // Set movement-sync as default for imported groups
      };
      
      return group;
    }
    
    return null;
  };
  
  // Parse only top-level groups (not nested ones, as they'll be handled recursively)
  const topLevelGroups = Array.from(groupElements).filter(g => {
    // Check if this group is not inside another group
    let parent = g.parentElement;
    while (parent && parent !== svgElement) {
      if (parent.tagName.toLowerCase() === 'g') {
        return false; // This is a nested group
      }
      parent = parent.parentElement;
    }
    return true; // This is a top-level group
  });
  
  topLevelGroups.forEach(groupElement => {
    const group = parseGroupRecursive(groupElement, Array.from(groupElements));
    if (group) {
      groups.push(group);
    }
  });
  
  return groups;
}

/**
 * Parse text style from an element (for both text and textPath elements)
 */
function parseTextStyle(element: Element): any {
  const style: any = {};
  
  // Font properties
  if (element.getAttribute('font-family')) {
    style.fontFamily = element.getAttribute('font-family');
  }
  if (element.getAttribute('font-size')) {
    style.fontSize = parseFloat(element.getAttribute('font-size')!);
  }
  if (element.getAttribute('font-weight')) {
    style.fontWeight = element.getAttribute('font-weight');
  }
  if (element.getAttribute('font-style')) {
    style.fontStyle = element.getAttribute('font-style');
  }
  if (element.getAttribute('font-variant')) {
    style.fontVariant = element.getAttribute('font-variant');
  }
  if (element.getAttribute('font-stretch')) {
    style.fontStretch = element.getAttribute('font-stretch');
  }
  if (element.getAttribute('text-decoration')) {
    style.textDecoration = element.getAttribute('text-decoration');
  }
  if (element.getAttribute('text-anchor')) {
    style.textAnchor = element.getAttribute('text-anchor');
  }
  if (element.getAttribute('dominant-baseline')) {
    style.dominantBaseline = element.getAttribute('dominant-baseline');
  }
  if (element.getAttribute('alignment-baseline')) {
    style.alignmentBaseline = element.getAttribute('alignment-baseline');
  }
  if (element.getAttribute('baseline-shift')) {
    style.baselineShift = element.getAttribute('baseline-shift');
  }
  if (element.getAttribute('direction')) {
    style.direction = element.getAttribute('direction');
  }
  if (element.getAttribute('writing-mode')) {
    style.writingMode = element.getAttribute('writing-mode');
  }
  if (element.getAttribute('text-rendering')) {
    style.textRendering = element.getAttribute('text-rendering');
  }
  if (element.getAttribute('letter-spacing')) {
    style.letterSpacing = parseFloat(element.getAttribute('letter-spacing')!);
  }
  if (element.getAttribute('word-spacing')) {
    style.wordSpacing = parseFloat(element.getAttribute('word-spacing')!);
  }
  if (element.getAttribute('textLength')) {
    style.textLength = parseFloat(element.getAttribute('textLength')!);
  }
  if (element.getAttribute('lengthAdjust')) {
    style.lengthAdjust = element.getAttribute('lengthAdjust');
  }
  
  // Color and opacity
  const fill = element.getAttribute('fill');
  if (fill) {
    if (fill.startsWith('url(#')) {
      style.fill = fill;
    } else {
      style.fill = convertRgbToHex(fill) || fill;
    }
  }
  
  const stroke = element.getAttribute('stroke');
  if (stroke) {
    if (stroke.startsWith('url(#')) {
      style.stroke = stroke;
    } else {
      style.stroke = convertRgbToHex(stroke) || stroke;
    }
  }
  
  if (element.getAttribute('stroke-width')) {
    style.strokeWidth = parseFloat(element.getAttribute('stroke-width')!);
  }
  if (element.getAttribute('stroke-dasharray')) {
    const dasharray = element.getAttribute('stroke-dasharray')!;
    if (dasharray === 'none') {
      style.strokeDasharray = 'none';
    } else {
      style.strokeDasharray = dasharray.split(',').map(v => parseFloat(v.trim()));
    }
  }
  if (element.getAttribute('stroke-dashoffset')) {
    style.strokeDashoffset = parseFloat(element.getAttribute('stroke-dashoffset')!);
  }
  if (element.getAttribute('stroke-linecap')) {
    style.strokeLinecap = element.getAttribute('stroke-linecap');
  }
  if (element.getAttribute('stroke-linejoin')) {
    style.strokeLinejoin = element.getAttribute('stroke-linejoin');
  }
  if (element.getAttribute('stroke-miterlimit')) {
    style.strokeMiterlimit = parseFloat(element.getAttribute('stroke-miterlimit')!);
  }
  if (element.getAttribute('fill-opacity')) {
    style.fillOpacity = parseFloat(element.getAttribute('fill-opacity')!);
  }
  if (element.getAttribute('stroke-opacity')) {
    style.strokeOpacity = parseFloat(element.getAttribute('stroke-opacity')!);
  }
  if (element.getAttribute('opacity')) {
    style.opacity = parseFloat(element.getAttribute('opacity')!);
  }
  if (element.getAttribute('filter')) {
    style.filter = element.getAttribute('filter');
  }
  if (element.getAttribute('clip-path')) {
    style.clipPath = element.getAttribute('clip-path');
  }
  if (element.getAttribute('mask')) {
    style.mask = element.getAttribute('mask');
  }
  
  return style;
}

/**
 * Parse SVG textPath elements from SVG
 */
export function parseTextPaths(svgElement: Element, allPaths?: SVGPath[]): SVGTextPath[] {
  const textPaths: SVGTextPath[] = [];
  
  // Find all textPath elements
  const textPathElements = svgElement.querySelectorAll('textPath');
  
  textPathElements.forEach(textPathElement => {
    try {
      const textElement = textPathElement.parentElement;
      if (!textElement || textElement.tagName.toLowerCase() !== 'text') {
        return; // textPath must be inside a text element
      }

      // Get path reference
      const pathRef = textPathElement.getAttribute('href') || textPathElement.getAttribute('xlink:href');
      if (!pathRef) {
        console.warn('textPath element missing href attribute');
        return; // textPath must reference a path
      }

      // Remove # from href if present
      const cleanPathRef = pathRef.replace('#', '');

      // Validate that the referenced path exists if allPaths is provided
      if (allPaths && !allPaths.some(p => p.id === cleanPathRef)) {
        // Try to find a path element with this ID in the SVG
        const pathElement = svgElement.querySelector(`path[id="${cleanPathRef}"]`);
        if (!pathElement) {
          console.warn(`textPath references non-existent path: ${cleanPathRef}`);
          // Continue parsing anyway - the textPath will be imported but may not work properly
        }
      }

      // Get content
      const content = textPathElement.textContent || '';

      // Parse attributes
      const startOffset = textPathElement.getAttribute('startOffset');
      const method = textPathElement.getAttribute('method') as 'align' | 'stretch' | null;
      const spacing = textPathElement.getAttribute('spacing') as 'auto' | 'exact' | null;
      const side = textPathElement.getAttribute('side') as 'left' | 'right' | null;
      const textLength = textPathElement.getAttribute('textLength');
      const lengthAdjust = textPathElement.getAttribute('lengthAdjust') as 'spacing' | 'spacingAndGlyphs' | null;

      // Parse style from both text element and textPath element
      const textStyle = parseTextStyle(textElement);
      const textPathStyle = parseTextStyle(textPathElement);
      
      // Merge styles (textPath takes precedence)
      const style = { ...textStyle, ...textPathStyle };

      // Get transform from text element
      const transform = textElement.getAttribute('transform');

      const textPath: SVGTextPath = {
        id: generateId(),
        type: 'textPath',
        content,
        pathRef: cleanPathRef,
        startOffset: startOffset ? (isNaN(Number(startOffset)) ? startOffset : Number(startOffset)) : undefined,
        method: method || undefined,
        spacing: spacing || undefined,
        side: side || undefined,
        textLength: textLength ? Number(textLength) : undefined,
        lengthAdjust: lengthAdjust || undefined,
        style,
        transform: transform || undefined,
        locked: false
      };

      textPaths.push(textPath);
    } catch (error) {
      console.warn('Failed to parse textPath element:', error);
    }
  });

  return textPaths;
}

/**
 * Enhanced SVG parser that handles paths, texts, gradients, patterns, and groups
 */
/**
 * Parse SVG animation elements from SVG content
 */
function parseAnimations(svgElement: Element): SVGAnimation[] {
  const animations: SVGAnimation[] = [];
  
  // Function to extract animation from element
  const extractAnimationFromElement = (element: Element, targetElementId: string): SVGAnimation[] => {
    const elementAnimations: SVGAnimation[] = [];
    
    // Find all animation elements within this element
    const animationElements = element.querySelectorAll('animate, animateTransform, animateMotion, set');
    
    animationElements.forEach(animElement => {
      const tagName = animElement.tagName.toLowerCase();
      
      // Common attributes
      const id = animElement.getAttribute('id') || generateId();
      const dur = animElement.getAttribute('dur') || '2s';
      const begin = animElement.getAttribute('begin') || undefined;
      const end = animElement.getAttribute('end') || undefined;
      const repeatCount = animElement.getAttribute('repeatCount') || undefined;
      const repeatDur = animElement.getAttribute('repeatDur') || undefined;
      const fill = animElement.getAttribute('fill') || undefined;
      const restart = animElement.getAttribute('restart') || undefined;
      const calcMode = animElement.getAttribute('calcMode') || undefined;
      const keyTimes = animElement.getAttribute('keyTimes') || undefined;
      const keySplines = animElement.getAttribute('keySplines') || undefined;
      const values = animElement.getAttribute('values') || undefined;
      const additive = animElement.getAttribute('additive') || undefined;
      const accumulate = animElement.getAttribute('accumulate') || undefined;
      
      const baseAnimation = {
        id,
        targetElementId,
        dur,
        begin,
        end,
        repeatCount,
        repeatDur,
        fill,
        restart,
        calcMode,
        keyTimes,
        keySplines,
        values,
        additive,
        accumulate
      };
      
      switch (tagName) {
        case 'animate': {
          const attributeName = animElement.getAttribute('attributeName');
          const attributeType = animElement.getAttribute('attributeType');
          const from = animElement.getAttribute('from');
          const to = animElement.getAttribute('to');
          const by = animElement.getAttribute('by');
          
          if (attributeName) {
            elementAnimations.push({
              ...baseAnimation,
              type: 'animate',
              attributeName,
              attributeType: attributeType as any,
              from,
              to,
              by
            } as SVGAnimation);
          }
          break;
        }
        
        case 'animatetransform': {
          const attributeName = animElement.getAttribute('attributeName');
          const attributeType = animElement.getAttribute('attributeType');
          const transformType = animElement.getAttribute('type');
          const from = animElement.getAttribute('from');
          const to = animElement.getAttribute('to');
          const by = animElement.getAttribute('by');
          
          if (attributeName && transformType) {
            elementAnimations.push({
              ...baseAnimation,
              type: 'animateTransform',
              attributeName,
              attributeType: attributeType as any,
              transformType: transformType as any,
              from,
              to,
              by
            } as SVGAnimation);
          }
          break;
        }
        
        case 'animatemotion': {
          const path = animElement.getAttribute('path');
          const keyPoints = animElement.getAttribute('keyPoints');
          const rotate = animElement.getAttribute('rotate');
          
          // Check for mpath child element
          const mpathElement = animElement.querySelector('mpath');
          const mpath = mpathElement?.getAttribute('href')?.replace('#', '') || undefined;
          
          elementAnimations.push({
            ...baseAnimation,
            type: 'animateMotion',
            path,
            keyPoints,
            rotate: rotate === 'auto' || rotate === 'auto-reverse' ? rotate : rotate ? parseFloat(rotate) : undefined,
            mpath
          } as SVGAnimation);
          break;
        }
        
        case 'set': {
          const attributeName = animElement.getAttribute('attributeName');
          const attributeType = animElement.getAttribute('attributeType');
          const to = animElement.getAttribute('to');
          
          if (attributeName && to) {
            elementAnimations.push({
              ...baseAnimation,
              type: 'set',
              attributeName,
              attributeType: attributeType as any,
              to
            } as SVGAnimation);
          }
          break;
        }
      }
    });
    
    return elementAnimations;
  };
  
  // Parse animations from SVG root (only direct children, not nested)
  // Temporarily disabled to avoid duplicates - animations are processed via elements with IDs
  /*
  const svgRootAnimations = extractAnimationFromElement(svgElement, 'svg-root');
  // Filter out animations that are actually inside other elements
  const directSvgAnimations = svgRootAnimations.filter(anim => {
    // Check if this animation element is a direct child of the SVG root
    const animElement = svgElement.querySelector(`#${anim.id}`);
    return animElement && animElement.parentElement === svgElement;
  });
  animations.push(...directSvgAnimations);
  */
  
  // Find all elements with IDs and check for embedded animations
  const elementsWithIds = svgElement.querySelectorAll('[id]');
  const processedAnimations = new Set<string>(); // Track processed animation IDs to avoid duplicates
  
  elementsWithIds.forEach(element => {
    const elementId = element.getAttribute('id');
    if (elementId) {
      const elementAnimations = extractAnimationFromElement(element, elementId);
      // Only add animations we haven't processed before
      elementAnimations.forEach(anim => {
        if (!processedAnimations.has(anim.id)) {
          animations.push(anim);
          processedAnimations.add(anim.id);
        }
      });
    }
  });
  
  // Also check elements without IDs that might contain animations
  const allElements = svgElement.querySelectorAll('*');
  allElements.forEach(element => {
    const elementId = element.getAttribute('id');
    if (!elementId) {
      // Generate a temporary ID for elements without ID that contain animations
      const animationElements = element.querySelectorAll('animate, animateTransform, animateMotion, set');
      if (animationElements.length > 0) {
        const tempId = generateId(); // Generate a unique ID for this element
        element.setAttribute('id', tempId); // Actually set the ID on the element
        const elementAnimations = extractAnimationFromElement(element, tempId);
        animations.push(...elementAnimations);
      }
    }
  });
  
  // Deduplicate animations before returning to prevent duplicates from SVG files
  const deduplicatedAnimations = animations.filter((animation, index) => {
    // Find if there's another animation with the same characteristics earlier in the array
    const duplicateIndex = animations.findIndex((otherAnim, otherIndex) => {
      if (otherIndex >= index) return false; // Only look at earlier animations
      
      const sameElement = otherAnim.targetElementId === animation.targetElementId;
      const sameType = otherAnim.type === animation.type;
      
      // Check attribute name for animations that have it
      const sameAttribute = 
        ('attributeName' in otherAnim && 'attributeName' in animation) ? 
          otherAnim.attributeName === animation.attributeName : true;
      
      // Check transform type for animateTransform animations
      const sameTransformType = (animation.type === 'animateTransform' && otherAnim.type === 'animateTransform') ? 
        otherAnim.transformType === animation.transformType : true;
      
      return sameElement && sameType && sameAttribute && sameTransformType;
    });
    
    // Keep this animation if no duplicate was found earlier
    return duplicateIndex === -1;
  });
  
  return deduplicatedAnimations;
}

/**
 * Parse SVG image elements from SVG content
 */
function parseImages(svgElement: Element): SVGImage[] {
  const images: SVGImage[] = [];
  
  const imageElements = svgElement.querySelectorAll('image');
  console.log(`🖼️ Found ${imageElements.length} image elements in SVG`);
  
  imageElements.forEach(imageElement => {
    // Use existing ID if present, otherwise generate a new one
    const id = imageElement.getAttribute('id') || generateId();
    
    // If no ID was present, set it on the element for consistency
    if (!imageElement.getAttribute('id')) {
      imageElement.setAttribute('id', id);
    }
    
    const href = imageElement.getAttribute('href') || imageElement.getAttribute('xlink:href') || '';
    const x = parseFloat(imageElement.getAttribute('x') || '0');
    const y = parseFloat(imageElement.getAttribute('y') || '0');
    const width = parseFloat(imageElement.getAttribute('width') || '0');
    const height = parseFloat(imageElement.getAttribute('height') || '0');
    const transform = imageElement.getAttribute('transform') || undefined;
    const preserveAspectRatio = imageElement.getAttribute('preserveAspectRatio') || undefined;
    
    console.log(`🖼️ Parsing image: ${id}, href: ${href.substring(0, 50)}..., size: ${width}x${height}, position: (${x}, ${y})`);
    
    // Parse style attributes
    const style = parsePathStyle(imageElement);
    
    images.push({
      id,
      type: 'image',
      href,
      x,
      y,
      width,
      height,
      transform,
      preserveAspectRatio,
      style
    });
  });
  
  console.log(`🖼️ Total images parsed: ${images.length}`);
  return images;
}

/**
 * Parse SVG symbol elements from SVG content
 */
function parseSymbols(svgElement: Element): SVGSymbol[] {
  const symbols: SVGSymbol[] = [];
  
  const symbolElements = svgElement.querySelectorAll('defs symbol, symbol');
  symbolElements.forEach(symbolElement => {
    const id = symbolElement.getAttribute('id') || generateId();
    const viewBox = symbolElement.getAttribute('viewBox') || undefined;
    const preserveAspectRatio = symbolElement.getAttribute('preserveAspectRatio') || undefined;
    
    // Parse style attributes
    const style = parsePathStyle(symbolElement);
    
    // Parse children elements
    const children: SVGGroupChild[] = [];
    const childElements = symbolElement.children;
    for (let i = 0; i < childElements.length; i++) {
      const child = childElements[i];
      const childId = child.getAttribute('id');
      if (childId) {
        const tagName = child.tagName.toLowerCase();
        if (['path', 'text', 'tspan', 'group', 'g', 'image', 'use', 'textpath'].includes(tagName)) {
          const childType = tagName === 'g' ? 'group' : 
                           tagName === 'tspan' ? 'text' : 
                           tagName as any;
          children.push({
            type: childType,
            id: childId
          });
        }
      }
    }
    
    symbols.push({
      id,
      type: 'symbol',
      viewBox,
      preserveAspectRatio,
      children,
      style
    });
  });
  
  return symbols;
}

/**
 * Parse SVG use elements from SVG content
 */
function parseUses(svgElement: Element): SVGUse[] {
  const uses: SVGUse[] = [];
  
  const useElements = svgElement.querySelectorAll('use');
  useElements.forEach(useElement => {
    const id = useElement.getAttribute('id') || generateId();
    const href = useElement.getAttribute('href') || useElement.getAttribute('xlink:href') || '';
    const x = useElement.getAttribute('x') ? parseFloat(useElement.getAttribute('x')!) : undefined;
    const y = useElement.getAttribute('y') ? parseFloat(useElement.getAttribute('y')!) : undefined;
    const width = useElement.getAttribute('width') ? parseFloat(useElement.getAttribute('width')!) : undefined;
    const height = useElement.getAttribute('height') ? parseFloat(useElement.getAttribute('height')!) : undefined;
    const transform = useElement.getAttribute('transform') || undefined;
    
    // Parse style attributes
    const style = parsePathStyle(useElement);
    
    uses.push({
      id,
      type: 'use',
      href,
      x,
      y,
      width,
      height,
      transform,
      style
    });
  });
  
  return uses;
}

/**
 * Auto-generate animation chains based on begin times in animations
 */
function createAutoAnimationChains(animations: SVGAnimation[]): any[] {
  const chains: any[] = [];
  
  // Group animations that have begin times (including 0s)
  const animationsWithBeginTimes = animations.filter(anim => {
    const beginTime = (anim as any).begin;
    return beginTime && beginTime !== 'indefinite';
  });
  
  if (animationsWithBeginTimes.length === 0) {
    return chains;
  }
  
  console.log('⛓️ Found animations with begin times:', animationsWithBeginTimes.map(a => ({ id: a.id, begin: (a as any).begin })));
  
  // Parse begin times and sort animations
  const animationsWithParsedTimes = animationsWithBeginTimes.map(anim => {
    const beginTime = (anim as any).begin;
    const beginValue = parseTimeValue(beginTime);
    return {
      animation: anim,
      beginTimeMs: beginValue,
      beginTimeOriginal: beginTime
    };
  }).sort((a, b) => a.beginTimeMs - b.beginTimeMs);
  
  // Group animations by target element
  const animationsByTarget = new Map<string, typeof animationsWithParsedTimes>();
  animationsWithParsedTimes.forEach(item => {
    const targetId = item.animation.targetElementId;
    if (!animationsByTarget.has(targetId)) {
      animationsByTarget.set(targetId, []);
    }
    animationsByTarget.get(targetId)!.push(item);
  });
  
  // Create chains for each target element (if multiple animations)
  animationsByTarget.forEach((targetAnimations, targetId) => {
    if (targetAnimations.length > 1) {
      // Multiple animations on same element - create element-specific sequential chain
      const chainName = `Auto Sequential - Element ${targetId.slice(-8)}`;
      const chainAnimations = targetAnimations.map((item, index) => {
        if (index === 0) {
          // First animation on this element starts immediately
          return {
            animationId: item.animation.id,
            delay: 0,
            trigger: 'start' as const
            // No dependsOn for the first animation
          };
        } else {
          // Each subsequent animation depends on the previous one ending
          const previousAnimation = targetAnimations[index - 1];
          return {
            animationId: item.animation.id,
            delay: 0, // No additional delay - just wait for dependency
            trigger: 'end' as const, // Start when previous animation ENDS
            dependsOn: previousAnimation.animation.id
          };
        }
      });
      
      chains.push({
        id: generateId(),
        name: chainName,
        animations: chainAnimations,
        autoGenerated: true
      });
      
      console.log(`⛓️ Created auto sequential chain for element ${targetId}: ${targetAnimations.length} animations with dependencies`);
    }
  });
  
  // If we have animations across different elements, create a global sequential chain
  if (animationsWithParsedTimes.length > 1) {
    const allAnimationsChain = animationsWithParsedTimes.map((item, index) => {
      const delayInSeconds = item.beginTimeMs / 1000; // Convert ms to seconds
      console.log(`⛓️ Animation ${item.animation.id} (target: ${item.animation.targetElementId}) - begin: ${item.beginTimeOriginal} -> delay: ${delayInSeconds}s`);
      
      // For auto sequential chains from begin times, use absolute delays
      return {
        animationId: item.animation.id,
        delay: delayInSeconds, // Use the absolute begin time as delay
        trigger: 'start' as const
        // No dependsOn - all start from beginning with their respective delays
      };
    });
    
    const chainName = `Auto Sequential Chain - ${animationsWithParsedTimes.length} Animations`;
    chains.push({
      id: generateId(),
      name: chainName,
      animations: allAnimationsChain,
      autoGenerated: true
    });
    
    console.log(`⛓️ Created auto sequential chain: ${animationsWithParsedTimes.length} animations with delays`);
    console.log(`⛓️ Chain structure:`, allAnimationsChain.map(a => ({ 
      id: a.animationId, 
      delay: a.delay,
      trigger: a.trigger 
    })));
  }
  
  return chains;
}

/**
 * Parse time value (e.g., "1s", "500ms") into milliseconds
 */
function parseTimeValue(timeStr: string): number {
  if (!timeStr) return 0;
  
  // Handle special case for "0" without unit
  if (timeStr === '0') return 0;
  
  const match = timeStr.match(/^(\d+(?:\.\d+)?)(s|ms)?$/i);
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = (match[2] || 's').toLowerCase();
  
  return unit === 'ms' ? value : value * 1000;
}

export function parseCompleteSVG(svgString: string): {
  paths: SVGPath[];
  texts: TextElementType[];
  textPaths: SVGTextPath[];
  images: SVGImage[];
  symbols: SVGSymbol[];
  uses: SVGUse[];
  gradients: GradientOrPattern[];
  filters: SVGFilter[];
  groups: SVGGroup[];
  animations: SVGAnimation[];
  animationChains?: any[]; // Auto-generated chains
} {
  try {
    const { svgElement } = processSvgContent(svgString);
    
    // First pass: Ensure all elements that contain animations have IDs
    const elementsWithAnimations = svgElement.querySelectorAll('*');
    elementsWithAnimations.forEach(element => {
      const hasAnimations = element.querySelectorAll('animate, animateTransform, animateMotion, set').length > 0;
      if (hasAnimations && !element.getAttribute('id')) {
        element.setAttribute('id', generateId());
      }
    });
    
    // Parse animations FIRST to ensure elements get proper IDs
    let animations = parseAnimations(svgElement);
    
    console.log('🎬 Parsed animations:', animations.length, animations);
    
    // Parse other elements
    const paths = parseSVGToSubPaths(svgString);
    const texts = parseTextElements(svgElement);
    const textPaths = parseTextPaths(svgElement, paths);
    const images = parseImages(svgElement);
    const symbols = parseSymbols(svgElement);
    const uses = parseUses(svgElement);
    const gradients = parseGradients(svgElement);
    const filters = parseFilters(svgElement);
    const groups = parseGroups(svgElement, paths, texts);
    
    // Auto-generate animation chains based on begin times
    let animationChains = createAutoAnimationChains(animations);
    
    // If auto-chains were created, remove begin times from those animations to avoid conflicts
    if (animationChains.length > 0) {
      console.log('🔧 Removing begin times from chained animations to prevent conflicts');
      const chainedAnimationIds = new Set<string>();
      animationChains.forEach(chain => {
        chain.animations.forEach((chainAnim: any) => {
          chainedAnimationIds.add(chainAnim.animationId);
        });
      });
      
      // Remove begin times from animations that are part of chains
      animations = animations.map(anim => {
        if (chainedAnimationIds.has(anim.id)) {
          console.log(`🔧 Removing begin="${(anim as any).begin}" from animation ${anim.id}`);
          const { begin, ...animWithoutBegin } = anim as any;
          return animWithoutBegin;
        }
        return anim;
      });
    }
    
    console.log('🖼️ Parsed images:', images.length, images);
    if (animationChains.length > 0) {
      console.log('⛓️ Auto-generated animation chains:', animationChains.length, animationChains);
    }
    
    return {
      paths,
      texts,
      textPaths,
      images,
      symbols,
      uses,
      gradients,
      filters,
      groups,
      animations,
      animationChains
    };
  } catch (error) {
    console.error('Failed to parse complete SVG:', error);
    throw error;
  }
}
