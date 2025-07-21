/**
 * Utilities for generating SVG exports specific to groups
 */

import { SVGGroup, SVGPath, TextElementType, GradientOrPattern, SVGFilter } from '../types';
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
  allFilters: SVGFilter[] = [],
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
    usedFilters: Set<string>;
  } => {
    const targetGroup = allGroups.find(g => g.id === groupId);
    if (!targetGroup) return { paths: [], texts: [], usedGradients: new Set(), usedFilters: new Set() };

    const paths: SVGPath[] = [];
    const texts: TextElementType[] = [];
    const usedGradients = new Set<string>();
    const usedFilters = new Set<string>();

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
            
            // Track filters used in this path
            if (path.style.filter) {
              const filterMatch = path.style.filter.match(/url\(#([^)]+)\)/);
              if (filterMatch) {
                usedFilters.add(filterMatch[1]);
              }
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
            
            // Track filters used in this text
            if (text.style?.filter) {
              const filterMatch = text.style.filter.match(/url\(#([^)]+)\)/);
              if (filterMatch) {
                usedFilters.add(filterMatch[1]);
              }
            }
          }
          break;
          
        case 'group':
          // Recursively collect from nested groups
          const nestedElements = collectGroupElements(child.id);
          paths.push(...nestedElements.paths);
          texts.push(...nestedElements.texts);
          nestedElements.usedGradients.forEach(id => usedGradients.add(id));
          nestedElements.usedFilters.forEach(id => usedFilters.add(id));
          break;
      }
    });

    return { paths, texts, usedGradients, usedFilters };
  };

  const { paths: groupPaths, texts: groupTexts, usedGradients, usedFilters } = collectGroupElements(group.id);

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
          `    <stop offset="${stop.offset}%" stop-color="${stop.color}" stop-opacity="${stop.opacity ?? 1}" />`
        ).join('\n');
        return `  <linearGradient id="${gradient.id}" x1="${gradient.x1}%" y1="${gradient.y1}%" x2="${gradient.x2}%" y2="${gradient.y2}%" gradientUnits="${gradient.gradientUnits || 'objectBoundingBox'}">\n${linearStops}\n  </linearGradient>`;
      
      case 'radial':
        const radialStops = gradient.stops.map(stop => 
          `    <stop offset="${stop.offset}%" stop-color="${stop.color}" stop-opacity="${stop.opacity ?? 1}" />`
        ).join('\n');
        const fxAttr = (gradient.fx !== undefined && gradient.fx !== gradient.cx) ? ` fx="${gradient.fx}%"` : '';
        const fyAttr = (gradient.fy !== undefined && gradient.fy !== gradient.cy) ? ` fy="${gradient.fy}%"` : '';
        return `  <radialGradient id="${gradient.id}" cx="${gradient.cx}%" cy="${gradient.cy}%" r="${gradient.r}%"${fxAttr}${fyAttr} gradientUnits="${gradient.gradientUnits || 'objectBoundingBox'}">\n${radialStops}\n  </radialGradient>`;
      
      case 'pattern':
        return `  <pattern id="${gradient.id}" width="${gradient.width}" height="${gradient.height}" patternUnits="${gradient.patternUnits || 'userSpaceOnUse'}"${gradient.patternContentUnits ? ` patternContentUnits="${gradient.patternContentUnits}"` : ''}${gradient.patternTransform ? ` patternTransform="${gradient.patternTransform}"` : ''}>\n    ${gradient.content}\n  </pattern>`;
      
      default:
        return '';
    }
  }).filter(Boolean);

  // Generate filter definitions for used filters
  const relevantFilters = allFilters.filter(filter => usedFilters.has(filter.id));
  const filterDefs = relevantFilters.map(filter => {
    const primitives = filter.primitives.map(primitive => {
      switch (primitive.type) {
        case 'feGaussianBlur':
          return `    <feGaussianBlur stdDeviation="${primitive.stdDeviation}"${primitive.in ? ` in="${primitive.in}"` : ''}${primitive.result ? ` result="${primitive.result}"` : ''} />`;
        case 'feOffset':
          return `    <feOffset dx="${primitive.dx}" dy="${primitive.dy}"${primitive.in ? ` in="${primitive.in}"` : ''}${primitive.result ? ` result="${primitive.result}"` : ''} />`;
        case 'feFlood':
          return `    <feFlood flood-color="${primitive.floodColor}" flood-opacity="${primitive.floodOpacity ?? 1}"${primitive.result ? ` result="${primitive.result}"` : ''} />`;
        case 'feComposite':
          return `    <feComposite operator="${primitive.operator}"${primitive.in ? ` in="${primitive.in}"` : ''}${primitive.in2 ? ` in2="${primitive.in2}"` : ''}${primitive.result ? ` result="${primitive.result}"` : ''} />`;
        case 'feColorMatrix':
          return `    <feColorMatrix type="${primitive.colorMatrixType}" values="${primitive.values}"${primitive.in ? ` in="${primitive.in}"` : ''}${primitive.result ? ` result="${primitive.result}"` : ''} />`;
        case 'feDropShadow':
          return `    <feDropShadow dx="${primitive.dx}" dy="${primitive.dy}" stdDeviation="${primitive.stdDeviation}" flood-color="${primitive.floodColor}" flood-opacity="${primitive.floodOpacity ?? 1}"${primitive.result ? ` result="${primitive.result}"` : ''} />`;
        case 'feBlend':
          return `    <feBlend mode="${primitive.mode}"${primitive.in ? ` in="${primitive.in}"` : ''}${primitive.in2 ? ` in2="${primitive.in2}"` : ''}${primitive.result ? ` result="${primitive.result}"` : ''} />`;
        case 'feMorphology':
          return `    <feMorphology operator="${primitive.operator}" radius="${primitive.radius}"${primitive.in ? ` in="${primitive.in}"` : ''}${primitive.result ? ` result="${primitive.result}"` : ''} />`;
        case 'feConvolveMatrix':
          return `    <feConvolveMatrix order="${primitive.order}" kernelMatrix="${primitive.kernelMatrix}"${primitive.in ? ` in="${primitive.in}"` : ''}${primitive.result ? ` result="${primitive.result}"` : ''} />`;
        case 'feComponentTransfer':
          return `    <feComponentTransfer${primitive.in ? ` in="${primitive.in}"` : ''}${primitive.result ? ` result="${primitive.result}"` : ''} />`;
        case 'feDiffuseLighting':
          const diffuseLightSource = primitive.lightSource.type === 'feDistantLight' 
            ? `<feDistantLight azimuth="${primitive.lightSource.azimuth || 45}" elevation="${primitive.lightSource.elevation || 45}" />`
            : primitive.lightSource.type === 'fePointLight'
            ? `<fePointLight x="${primitive.lightSource.x || 0}" y="${primitive.lightSource.y || 0}" z="${primitive.lightSource.z || 1}" />`
            : `<feSpotLight x="${primitive.lightSource.x || 0}" y="${primitive.lightSource.y || 0}" z="${primitive.lightSource.z || 1}" pointsAtX="${primitive.lightSource.pointsAtX || 0}" pointsAtY="${primitive.lightSource.pointsAtY || 0}" pointsAtZ="${primitive.lightSource.pointsAtZ || 0}" />`;
          return `    <feDiffuseLighting surface-scale="${primitive.surfaceScale || 1}" diffuse-constant="${primitive.diffuseConstant || 1}" lighting-color="${primitive.lightColor || '#ffffff'}"${primitive.in ? ` in="${primitive.in}"` : ''}${primitive.result ? ` result="${primitive.result}"` : ''}>\n      ${diffuseLightSource}\n    </feDiffuseLighting>`;
        case 'feSpecularLighting':
          const specularLightSource = primitive.lightSource.type === 'feDistantLight' 
            ? `<feDistantLight azimuth="${primitive.lightSource.azimuth || 45}" elevation="${primitive.lightSource.elevation || 45}" />`
            : primitive.lightSource.type === 'fePointLight'
            ? `<fePointLight x="${primitive.lightSource.x || 0}" y="${primitive.lightSource.y || 0}" z="${primitive.lightSource.z || 1}" />`
            : `<feSpotLight x="${primitive.lightSource.x || 0}" y="${primitive.lightSource.y || 0}" z="${primitive.lightSource.z || 1}" pointsAtX="${primitive.lightSource.pointsAtX || 0}" pointsAtY="${primitive.lightSource.pointsAtY || 0}" pointsAtZ="${primitive.lightSource.pointsAtZ || 0}" />`;
          return `    <feSpecularLighting surface-scale="${primitive.surfaceScale || 1}" specular-constant="${primitive.specularConstant || 1}" specular-exponent="${primitive.specularExponent || 1}" lighting-color="${primitive.lightColor || '#ffffff'}"${primitive.in ? ` in="${primitive.in}"` : ''}${primitive.result ? ` result="${primitive.result}"` : ''}>\n      ${specularLightSource}\n    </feSpecularLighting>`;
        case 'feDisplacementMap':
          return `    <feDisplacementMap scale="${primitive.scale || 0}" xChannelSelector="${primitive.xChannelSelector || 'A'}" yChannelSelector="${primitive.yChannelSelector || 'A'}"${primitive.in ? ` in="${primitive.in}"` : ''}${primitive.in2 ? ` in2="${primitive.in2}"` : ''}${primitive.result ? ` result="${primitive.result}"` : ''} />`;
        case 'feTurbulence':
          return `    <feTurbulence baseFrequency="${primitive.baseFrequency}" numOctaves="${primitive.numOctaves || 4}" seed="${primitive.seed || 2}" stitchTiles="${primitive.stitchTiles || 'noStitch'}" type="${primitive.turbulenceType || 'turbulence'}"${primitive.result ? ` result="${primitive.result}"` : ''} />`;
        case 'feImage':
          return `    <feImage href="${primitive.href || ''}"${primitive.preserveAspectRatio ? ` preserveAspectRatio="${primitive.preserveAspectRatio}"` : ''}${primitive.crossorigin ? ` crossorigin="${primitive.crossorigin}"` : ''}${primitive.result ? ` result="${primitive.result}"` : ''} />`;
        case 'feTile':
          return `    <feTile${primitive.in ? ` in="${primitive.in}"` : ''}${primitive.result ? ` result="${primitive.result}"` : ''} />`;
        case 'feMerge':
          const mergeNodes = primitive.feMergeNodes?.map(node => `      <feMergeNode in="${node.in}" />`).join('\n') || '';
          return `    <feMerge${primitive.result ? ` result="${primitive.result}"` : ''}>\n${mergeNodes}\n    </feMerge>`;
        default:
          return `    <!-- Unsupported primitive: ${primitive.type} -->`;
      }
    }).join('\n');

    const filterAttrs = [
      `id="${filter.id}"`,
      filter.x !== undefined ? `x="${filter.x}"` : '',
      filter.y !== undefined ? `y="${filter.y}"` : '',
      filter.width !== undefined ? `width="${filter.width}"` : '',
      filter.height !== undefined ? `height="${filter.height}"` : '',
      filter.filterUnits ? `filterUnits="${filter.filterUnits}"` : '',
      filter.primitiveUnits ? `primitiveUnits="${filter.primitiveUnits}"` : '',
      filter.colorInterpolationFilters ? `color-interpolation-filters="${filter.colorInterpolationFilters}"` : ''
    ].filter(Boolean).join(' ');

    return `  <filter ${filterAttrs}>\n${primitives}\n  </filter>`;
  }).filter(Boolean);

  const defsSection = (gradientDefs.length > 0 || filterDefs.length > 0) 
    ? `  <defs>\n${[...gradientDefs, ...filterDefs].join('\n')}\n  </defs>\n` 
    : '';

  // Generate path elements
  const pathElements = groupPaths.map(path => {
    const pathData = path.subPaths.map(subPath => subPathToString(subPath)).join(' ');
    const style = path.style;
    
    const fillValue = convertStyleValue(style.fill);
    const strokeValue = convertStyleValue(style.stroke);
    
    const attributes = [
      `id="${path.id}"`,
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
      style.fontVariant ? `font-variant="${style.fontVariant}"` : '',
      style.fontStretch ? `font-stretch="${style.fontStretch}"` : '',
      style.textDecoration ? `text-decoration="${style.textDecoration}"` : '',
      style.textAnchor ? `text-anchor="${style.textAnchor}"` : '',
      style.dominantBaseline ? `dominant-baseline="${style.dominantBaseline}"` : '',
      style.alignmentBaseline ? `alignment-baseline="${style.alignmentBaseline}"` : '',
      style.baselineShift ? `baseline-shift="${style.baselineShift}"` : '',
      style.direction ? `direction="${style.direction}"` : '',
      style.writingMode ? `writing-mode="${style.writingMode}"` : '',
      style.textRendering ? `text-rendering="${style.textRendering}"` : '',
      style.letterSpacing ? `letter-spacing="${style.letterSpacing}"` : '',
      style.wordSpacing ? `word-spacing="${style.wordSpacing}"` : '',
      style.textLength ? `textLength="${style.textLength}"` : '',
      style.lengthAdjust ? `lengthAdjust="${style.lengthAdjust}"` : '',
      textFillValue !== 'none' ? `fill="${textFillValue}"` : '',
      textStrokeValue !== 'none' ? `stroke="${textStrokeValue}"` : '',
      style.strokeWidth ? `stroke-width="${style.strokeWidth}"` : '',
      style.strokeDasharray ? `stroke-dasharray="${Array.isArray(style.strokeDasharray) ? style.strokeDasharray.join(',') : style.strokeDasharray}"` : '',
      style.strokeDashoffset ? `stroke-dashoffset="${style.strokeDashoffset}"` : '',
      style.strokeLinecap ? `stroke-linecap="${style.strokeLinecap}"` : '',
      style.strokeLinejoin ? `stroke-linejoin="${style.strokeLinejoin}"` : '',
      style.strokeMiterlimit ? `stroke-miterlimit="${style.strokeMiterlimit}"` : '',
      style.fillOpacity !== undefined && style.fillOpacity !== 1 ? `fill-opacity="${style.fillOpacity}"` : '',
      style.strokeOpacity !== undefined && style.strokeOpacity !== 1 ? `stroke-opacity="${style.strokeOpacity}"` : '',
      style.opacity !== undefined && style.opacity !== 1 ? `opacity="${style.opacity}"` : '',
      style.filter ? `filter="${style.filter}"` : '',
      style.clipPath ? `clip-path="${style.clipPath}"` : '',
      style.mask ? `mask="${style.mask}"` : '',
    ].filter(Boolean).join(' ');

    if (text.type === 'multiline-text') {
      const spans = text.spans.map((span, index) => {
        const spanFillValue = span.style?.fill ? convertStyleValue(span.style.fill) : '';
        
        const spanAttributes = [
          `x="${text.x}"`,
          `dy="${index === 0 ? 0 : (style.fontSize || 16) * (style.lineHeight || 1.2)}"`,
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