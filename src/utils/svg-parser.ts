import { SVGSubPath, SVGCommand, PathStyle, SVGCommandType, SVGPath } from '../types';
import { generateId } from './id-utils';
import { decomposeIntoSubPaths } from './subpath-utils';

// Helper function to parse a path data string into commands
export function parsePathData(pathData: string): SVGCommand[] {
  const commands: SVGCommand[] = [];
  
  // Remove extra whitespace and normalize the path data
  const normalizedPath = pathData.trim().replace(/\s+/g, ' ').replace(/,/g, ' ');
  
  // Split by command letters while preserving the letters
  const tokens = normalizedPath.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi) || [];
  
  let currentX = 0;
  let currentY = 0;
  
  for (const token of tokens) {
    if (!token.trim()) continue;
    
    const commandLetter = token[0];
    const isRelative = commandLetter === commandLetter.toLowerCase();
    const commandType = commandLetter.toUpperCase() as SVGCommandType;
    const coords = token.slice(1).trim();
    
    const numbers = coords.match(/-?\d*\.?\d+/g)?.map(Number) || [];
    
    switch (commandType) {
      case 'M': // Move to
        if (numbers.length >= 2) {
          const x = isRelative ? currentX + numbers[0] : numbers[0];
          const y = isRelative ? currentY + numbers[1] : numbers[1];
          
          commands.push({
            id: generateId(),
            command: isRelative ? 'm' : 'M',
            x: isRelative ? numbers[0] : x,
            y: isRelative ? numbers[1] : y,
          });
          
          currentX = x;
          currentY = y;
        }
        break;
        
      case 'L': // Line to
        if (numbers.length >= 2) {
          const x = isRelative ? currentX + numbers[0] : numbers[0];
          const y = isRelative ? currentY + numbers[1] : numbers[1];
          
          commands.push({
            id: generateId(),
            command: isRelative ? 'l' : 'L',
            x: isRelative ? numbers[0] : x,
            y: isRelative ? numbers[1] : y,
          });
          
          currentX = x;
          currentY = y;
        }
        break;
        
      case 'H': // Horizontal line to
        if (numbers.length >= 1) {
          const x = isRelative ? currentX + numbers[0] : numbers[0];
          
          commands.push({
            id: generateId(),
            command: isRelative ? 'h' : 'H',
            x: isRelative ? numbers[0] : x,
          });
          
          currentX = x;
        }
        break;
        
      case 'V': // Vertical line to
        if (numbers.length >= 1) {
          const y = isRelative ? currentY + numbers[0] : numbers[0];
          
          commands.push({
            id: generateId(),
            command: isRelative ? 'v' : 'V',
            y: isRelative ? numbers[0] : y,
          });
          
          currentY = y;
        }
        break;
        
      case 'C': // Cubic Bezier curve
        if (numbers.length >= 6) {
          const x1 = isRelative ? currentX + numbers[0] : numbers[0];
          const y1 = isRelative ? currentY + numbers[1] : numbers[1];
          const x2 = isRelative ? currentX + numbers[2] : numbers[2];
          const y2 = isRelative ? currentY + numbers[3] : numbers[3];
          const x = isRelative ? currentX + numbers[4] : numbers[4];
          const y = isRelative ? currentY + numbers[5] : numbers[5];
          
          commands.push({
            id: generateId(),
            command: isRelative ? 'c' : 'C',
            x1: isRelative ? numbers[0] : x1,
            y1: isRelative ? numbers[1] : y1,
            x2: isRelative ? numbers[2] : x2,
            y2: isRelative ? numbers[3] : y2,
            x: isRelative ? numbers[4] : x,
            y: isRelative ? numbers[5] : y,
          });
          
          currentX = x;
          currentY = y;
        }
        break;
        
      case 'S': // Smooth cubic Bezier curve
        if (numbers.length >= 4) {
          const x2 = isRelative ? currentX + numbers[0] : numbers[0];
          const y2 = isRelative ? currentY + numbers[1] : numbers[1];
          const x = isRelative ? currentX + numbers[2] : numbers[2];
          const y = isRelative ? currentY + numbers[3] : numbers[3];
          
          commands.push({
            id: generateId(),
            command: isRelative ? 's' : 'S',
            x2: isRelative ? numbers[0] : x2,
            y2: isRelative ? numbers[1] : y2,
            x: isRelative ? numbers[2] : x,
            y: isRelative ? numbers[3] : y,
          });
          
          currentX = x;
          currentY = y;
        }
        break;
        
      case 'Q': // Quadratic Bezier curve
        if (numbers.length >= 4) {
          const x1 = isRelative ? currentX + numbers[0] : numbers[0];
          const y1 = isRelative ? currentY + numbers[1] : numbers[1];
          const x = isRelative ? currentX + numbers[2] : numbers[2];
          const y = isRelative ? currentY + numbers[3] : numbers[3];
          
          commands.push({
            id: generateId(),
            command: isRelative ? 'q' : 'Q',
            x1: isRelative ? numbers[0] : x1,
            y1: isRelative ? numbers[1] : y1,
            x: isRelative ? numbers[2] : x,
            y: isRelative ? numbers[3] : y,
          });
          
          currentX = x;
          currentY = y;
        }
        break;
        
      case 'T': // Smooth quadratic Bezier curve
        if (numbers.length >= 2) {
          const x = isRelative ? currentX + numbers[0] : numbers[0];
          const y = isRelative ? currentY + numbers[1] : numbers[1];
          
          commands.push({
            id: generateId(),
            command: isRelative ? 't' : 'T',
            x: isRelative ? numbers[0] : x,
            y: isRelative ? numbers[1] : y,
          });
          
          currentX = x;
          currentY = y;
        }
        break;
        
      case 'A': // Arc
        if (numbers.length >= 7) {
          const x = isRelative ? currentX + numbers[5] : numbers[5];
          const y = isRelative ? currentY + numbers[6] : numbers[6];
          
          commands.push({
            id: generateId(),
            command: isRelative ? 'a' : 'A',
            rx: numbers[0],
            ry: numbers[1],
            xAxisRotation: numbers[2],
            largeArcFlag: numbers[3],
            sweepFlag: numbers[4],
            x: isRelative ? numbers[5] : x,
            y: isRelative ? numbers[6] : y,
          });
          
          currentX = x;
          currentY = y;
        }
        break;
        
      case 'Z': // Close path
        commands.push({
          id: generateId(),
          command: isRelative ? 'z' : 'Z',
        });
        break;
    }
  }
  
  return commands;
}

// Helper function to parse style attributes into PathStyle object
export function parsePathStyle(element: Element): PathStyle {
  const style: PathStyle = {};
  
  // Get style from attributes
  const fill = element.getAttribute('fill');
  const stroke = element.getAttribute('stroke');
  const strokeWidth = element.getAttribute('stroke-width');
  const strokeDasharray = element.getAttribute('stroke-dasharray');
  const strokeLinecap = element.getAttribute('stroke-linecap');
  const strokeLinejoin = element.getAttribute('stroke-linejoin');
  const fillOpacity = element.getAttribute('fill-opacity');
  const strokeOpacity = element.getAttribute('stroke-opacity');
  
  if (fill) style.fill = fill;
  if (stroke) style.stroke = stroke;
  if (strokeWidth) style.strokeWidth = parseFloat(strokeWidth);
  if (strokeDasharray) style.strokeDasharray = strokeDasharray;
  if (strokeLinecap) style.strokeLinecap = strokeLinecap as any;
  if (strokeLinejoin) style.strokeLinejoin = strokeLinejoin as any;
  if (fillOpacity) style.fillOpacity = parseFloat(fillOpacity);
  if (strokeOpacity) style.strokeOpacity = parseFloat(strokeOpacity);
  
  // Also check for inline style attribute
  const styleAttr = element.getAttribute('style');
  if (styleAttr) {
    const styleRules = styleAttr.split(';');
    for (const rule of styleRules) {
      const [property, value] = rule.split(':').map(s => s.trim());
      if (!property || !value) continue;
      
      switch (property) {
        case 'fill':
          style.fill = value;
          break;
        case 'stroke':
          style.stroke = value;
          break;
        case 'stroke-width':
          style.strokeWidth = parseFloat(value);
          break;
        case 'stroke-dasharray':
          style.strokeDasharray = value;
          break;
        case 'stroke-linecap':
          style.strokeLinecap = value as any;
          break;
        case 'stroke-linejoin':
          style.strokeLinejoin = value as any;
          break;
        case 'fill-opacity':
          style.fillOpacity = parseFloat(value);
          break;
        case 'stroke-opacity':
          style.strokeOpacity = parseFloat(value);
          break;
      }
    }
  }
  
  return style;
}

// Main function to parse SVG string into SVGPath array
export function parseSVGToSubPaths(svgString: string): SVGPath[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  
  // Check for parsing errors
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error(`Invalid SVG format: ${parseError.textContent}`);
  }
  
  const svgElement = doc.querySelector('svg');
  if (!svgElement) {
    throw new Error('No SVG element found');
  }
  
  // Find all path elements
  const pathElements = svgElement.querySelectorAll('path');
  const paths: SVGPath[] = [];
  
  for (const pathElement of pathElements) {
    const pathData = pathElement.getAttribute('d');
    if (!pathData) continue;
    
    try {
      const commands = parsePathData(pathData);
      const style = parsePathStyle(pathElement);
      
      if (commands.length > 0) {
        // Descomponer el path en sub-paths
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
}
