/**
 * Utilities for generating SVG exports specific to groups
 */

import { SVGGroup, SVGPath, TextElementType, GradientOrPattern } from '../types';
import { subPathToString } from './path-utils';
import { extractGradientsFromPaths } from './gradient-utils';

/**
 * Generates SVG content for a specific group
 */
export function generateGroupSVG(
  group: SVGGroup,
  allPaths: SVGPath[],
  allTexts: TextElementType[],
  allGroups: SVGGroup[],
  allGradients: GradientOrPattern[] = [],
  precision: number = 2
): string {
  
  // Helper function to convert fill/stroke values to SVG format
  const convertStyleValue = (value: any): string => {
    if (!value || value === 'none') return 'none';
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value.id) {
      return `url(#${value.id})`;
    }
    return 'none';
  };

  // Collect all elements in the group (recursively)
  const collectGroupElements = (groupId: string): {
    paths: SVGPath[];
    texts: TextElementType[];
    usedGradients: Set<string>;
  } => {
    const targetGroup = allGroups.find(g => g.id === groupId);
    if (!targetGroup) return { paths: [], texts: [], usedGradients: new Set() };

    const paths: SVGPath[] = [];
    const texts: TextElementType[] = [];
    const usedGradients = new Set<string>();

    targetGroup.children.forEach(child => {
      switch (child.type) {
        case 'path':
          const path = allPaths.find(p => p.id === child.id);
          if (path) {
            paths.push(path);
            
            // Track gradients used in this path
            if (path.style.fill && typeof path.style.fill === 'object' && path.style.fill.id) {
              usedGradients.add(path.style.fill.id);
            }
            if (path.style.stroke && typeof path.style.stroke === 'object' && path.style.stroke.id) {
              usedGradients.add(path.style.stroke.id);
            }
          }
          break;
          
        case 'text':
          const text = allTexts.find(t => t.id === child.id);
          if (text) {
            texts.push(text);
            
            // Track gradients used in this text
            if (text.style?.fill && typeof text.style.fill === 'object' && text.style.fill.id) {
              usedGradients.add(text.style.fill.id);
            }
            if (text.style?.stroke && typeof text.style.stroke === 'object' && text.style.stroke.id) {
              usedGradients.add(text.style.stroke.id);
            }
          }
          break;
          
        case 'group':
          // Recursively collect from nested groups
          const nestedElements = collectGroupElements(child.id);
          paths.push(...nestedElements.paths);
          texts.push(...nestedElements.texts);
          nestedElements.usedGradients.forEach(id => usedGradients.add(id));
          break;
      }
    });

    return { paths, texts, usedGradients };
  };

  const { paths: groupPaths, texts: groupTexts, usedGradients } = collectGroupElements(group.id);

  // If no elements, return empty SVG
  if (groupPaths.length === 0 && groupTexts.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <!-- Empty group: ${group.name || group.id} -->
</svg>`;
  }

  // Calculate bounding box for the group elements
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  // Calculate bounds from paths
  groupPaths.forEach(path => {
    path.subPaths.forEach(subPath => {
      subPath.commands.forEach(command => {
        if (command.x !== undefined && command.y !== undefined) {
          minX = Math.min(minX, command.x);
          minY = Math.min(minY, command.y);
          maxX = Math.max(maxX, command.x);
          maxY = Math.max(maxY, command.y);
        }
        if (command.x1 !== undefined && command.y1 !== undefined) {
          minX = Math.min(minX, command.x1);
          minY = Math.min(minY, command.y1);
          maxX = Math.max(maxX, command.x1);
          maxY = Math.max(maxY, command.y1);
        }
        if (command.x2 !== undefined && command.y2 !== undefined) {
          minX = Math.min(minX, command.x2);
          minY = Math.min(minY, command.y2);
          maxX = Math.max(maxX, command.x2);
          maxY = Math.max(maxY, command.y2);
        }
      });
    });
  });

  // Calculate bounds from texts (approximate)
  groupTexts.forEach(text => {
    const fontSize = text.style?.fontSize || 16;
    let textWidth = 0;
    let textHeight = fontSize;

    if (text.type === 'text') {
      textWidth = (text.content?.length || 0) * fontSize * 0.6;
    } else if (text.type === 'multiline-text') {
      const maxLineLength = Math.max(...text.spans.map(span => span.content?.length || 0));
      textWidth = maxLineLength * fontSize * 0.6;
      textHeight = text.spans.length * fontSize * 1.2;
    }

    minX = Math.min(minX, text.x);
    minY = Math.min(minY, text.y);
    maxX = Math.max(maxX, text.x + textWidth);
    maxY = Math.max(maxY, text.y + textHeight);
  });

  // Add padding and create viewBox
  const padding = Math.max(10, Math.max(maxX - minX, maxY - minY) * 0.1);
  const viewBoxX = minX - padding;
  const viewBoxY = minY - padding;
  const viewBoxWidth = (maxX - minX) + (padding * 2);
  const viewBoxHeight = (maxY - minY) + (padding * 2);

  // Round to specified precision
  const roundToPrecision = (num: number): number => {
    const factor = Math.pow(10, precision);
    return Math.round(num * factor) / factor;
  };

  const finalViewBox = `${roundToPrecision(viewBoxX)} ${roundToPrecision(viewBoxY)} ${roundToPrecision(viewBoxWidth)} ${roundToPrecision(viewBoxHeight)}`;

  // Generate gradient definitions for used gradients
  const relevantGradients = allGradients.filter(grad => usedGradients.has(grad.id));
  const gradientDefs = relevantGradients.map(gradient => {
    switch (gradient.type) {
      case 'linear':
        const linearStops = gradient.stops.map(stop => 
          `    <stop offset="${stop.offset}%" stop-color="${stop.color}" stop-opacity="${stop.opacity}" />`
        ).join('\n');
        return `  <linearGradient id="${gradient.id}" x1="${gradient.x1}" y1="${gradient.y1}" x2="${gradient.x2}" y2="${gradient.y2}" gradientUnits="${gradient.gradientUnits || 'objectBoundingBox'}">\n${linearStops}\n  </linearGradient>`;
      
      case 'radial':
        const radialStops = gradient.stops.map(stop => 
          `    <stop offset="${stop.offset}%" stop-color="${stop.color}" stop-opacity="${stop.opacity}" />`
        ).join('\n');
        const fxAttr = (gradient.fx !== undefined && gradient.fx !== gradient.cx) ? ` fx="${gradient.fx}"` : '';
        const fyAttr = (gradient.fy !== undefined && gradient.fy !== gradient.cy) ? ` fy="${gradient.fy}"` : '';
        return `  <radialGradient id="${gradient.id}" cx="${gradient.cx}" cy="${gradient.cy}" r="${gradient.r}"${fxAttr}${fyAttr} gradientUnits="${gradient.gradientUnits || 'objectBoundingBox'}">\n${radialStops}\n  </radialGradient>`;
      
      case 'pattern':
        return `  <pattern id="${gradient.id}" width="${gradient.width}" height="${gradient.height}" patternUnits="${gradient.patternUnits || 'userSpaceOnUse'}"${gradient.patternContentUnits ? ` patternContentUnits="${gradient.patternContentUnits}"` : ''}${gradient.patternTransform ? ` patternTransform="${gradient.patternTransform}"` : ''}>\n    ${gradient.content}\n  </pattern>`;
      
      default:
        return '';
    }
  }).filter(Boolean);

  const defsSection = gradientDefs.length > 0 ? `  <defs>\n${gradientDefs.join('\n')}\n  </defs>\n` : '';

  // Generate path elements
  const pathElements = groupPaths.map(path => {
    const pathData = path.subPaths.map(subPath => subPathToString(subPath)).join(' ');
    const style = path.style;
    
    const fillValue = convertStyleValue(style.fill);
    const strokeValue = convertStyleValue(style.stroke);
    
    const attributes = [
      `d="${pathData}"`,
      fillValue !== 'none' ? `fill="${fillValue}"` : 'fill="none"',
      strokeValue !== 'none' ? `stroke="${strokeValue}"` : '',
      style.strokeWidth ? `stroke-width="${style.strokeWidth}"` : '',
      style.strokeDasharray ? `stroke-dasharray="${style.strokeDasharray}"` : '',
      style.strokeLinecap ? `stroke-linecap="${style.strokeLinecap}"` : '',
      style.strokeLinejoin ? `stroke-linejoin="${style.strokeLinejoin}"` : '',
      style.fillOpacity !== undefined && style.fillOpacity !== 1 ? `fill-opacity="${style.fillOpacity}"` : '',
      style.strokeOpacity !== undefined && style.strokeOpacity !== 1 ? `stroke-opacity="${style.strokeOpacity}"` : '',
    ].filter(Boolean).join(' ');
    
    return `  <path ${attributes} />`;
  }).join('\n');

  // Generate text elements
  const textElements = groupTexts.map(text => {
    const style = text.style || {};
    
    const textFillValue = convertStyleValue(style.fill);
    const textStrokeValue = convertStyleValue(style.stroke);
    
    const attributes = [
      `x="${text.x}"`,
      `y="${text.y}"`,
      text.transform ? `transform="${text.transform}"` : '',
      style.fontSize ? `font-size="${style.fontSize}"` : '',
      style.fontFamily ? `font-family="${style.fontFamily}"` : '',
      style.fontWeight ? `font-weight="${style.fontWeight}"` : '',
      style.fontStyle ? `font-style="${style.fontStyle}"` : '',
      style.textAnchor ? `text-anchor="${style.textAnchor}"` : '',
      textFillValue !== 'none' ? `fill="${textFillValue}"` : '',
      textStrokeValue !== 'none' ? `stroke="${textStrokeValue}"` : '',
      style.strokeWidth ? `stroke-width="${style.strokeWidth}"` : '',
      style.fillOpacity !== undefined && style.fillOpacity !== 1 ? `fill-opacity="${style.fillOpacity}"` : '',
      style.strokeOpacity !== undefined && style.strokeOpacity !== 1 ? `stroke-opacity="${style.strokeOpacity}"` : '',
    ].filter(Boolean).join(' ');

    if (text.type === 'multiline-text') {
      const spans = text.spans.map((span, index) => {
        const spanFillValue = span.style?.fill ? convertStyleValue(span.style.fill) : '';
        
        const spanAttributes = [
          `x="${text.x}"`,
          `dy="${index === 0 ? 0 : (style.fontSize || 16) * 1.2}"`,
          spanFillValue && spanFillValue !== textFillValue ? `fill="${spanFillValue}"` : '',
          span.style?.fontWeight && span.style.fontWeight !== style.fontWeight ? `font-weight="${span.style.fontWeight}"` : '',
        ].filter(Boolean).join(' ');
        
        return `    <tspan ${spanAttributes}>${span.content}</tspan>`;
      }).join('\n');
      
      return `  <text ${attributes}>\n${spans}\n  </text>`;
    } else {
      return `  <text ${attributes}>${text.content}</text>`;
    }
  }).join('\n');

  // Combine all elements
  const allElements = [pathElements, textElements].filter(Boolean).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${finalViewBox}">
${defsSection}${allElements}
</svg>`;
}

/**
 * Downloads SVG content as a file
 */
export function downloadGroupSVG(svgContent: string, filename: string): void {
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the object URL
  URL.revokeObjectURL(url);
}