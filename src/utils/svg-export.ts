import { subPathToString } from './path-utils';
import { FilterPrimitiveType, BoundingBox } from '../types';
import { getPathBoundingBox, getTextBoundingBox, getImageBoundingBox, getGroupBoundingBox } from './bbox-utils';
import { getAllElementsByZIndex, RenderableElement } from './z-index-manager';

/**
 * Calculate the overall viewport that encompasses all visible elements
 */
const calculateOverallViewport = (editorState: any): BoundingBox => {
  const { paths, texts, images, groups, uses, symbols, precision } = editorState;
  
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let hasElements = false;

  // Calculate bounding boxes for all paths
  paths.forEach((path: any) => {
    const bbox = getPathBoundingBox(path);
    if (bbox) {
      minX = Math.min(minX, bbox.x);
      maxX = Math.max(maxX, bbox.x + bbox.width);
      minY = Math.min(minY, bbox.y);
      maxY = Math.max(maxY, bbox.y + bbox.height);
      hasElements = true;
    }
  });

  // Calculate bounding boxes for all texts
  texts.forEach((text: any) => {
    const bbox = getTextBoundingBox(text);
    if (bbox) {
      minX = Math.min(minX, bbox.x);
      maxX = Math.max(maxX, bbox.x + bbox.width);
      minY = Math.min(minY, bbox.y);
      maxY = Math.max(maxY, bbox.y + bbox.height);
      hasElements = true;
    }
  });

  // Calculate bounding boxes for all images
  images.forEach((image: any) => {
    const bbox = getImageBoundingBox(image);
    if (bbox) {
      minX = Math.min(minX, bbox.x);
      maxX = Math.max(maxX, bbox.x + bbox.width);
      minY = Math.min(minY, bbox.y);
      maxY = Math.max(maxY, bbox.y + bbox.height);
      hasElements = true;
    }
  });

  // Calculate bounding boxes for all groups
  groups.forEach((group: any) => {
    const bbox = getGroupBoundingBox(group, paths, texts, images, groups);
    if (bbox) {
      minX = Math.min(minX, bbox.x);
      maxX = Math.max(maxX, bbox.x + bbox.width);
      minY = Math.min(minY, bbox.y);
      maxY = Math.max(maxY, bbox.y + bbox.height);
      hasElements = true;
    }
  });

  // Calculate bounding boxes for all use elements (symbol instances)
  uses.forEach((use: any) => {
    // For use elements, we need to consider their position and size
    const bbox = {
      x: use.x || 0,
      y: use.y || 0,
      width: use.width || 50, // Default symbol size
      height: use.height || 50
    };
    
    minX = Math.min(minX, bbox.x);
    maxX = Math.max(maxX, bbox.x + bbox.width);
    minY = Math.min(minY, bbox.y);
    maxY = Math.max(maxY, bbox.y + bbox.height);
    hasElements = true;
  });

  // If no elements found, return default viewport
  if (!hasElements) {
    return { x: 0, y: 0, width: 800, height: 600 };
  }

  // Add some padding around the content (10% of the size)
  const width = maxX - minX;
  const height = maxY - minY;
  const paddingX = Math.max(width * 0.1, 20);
  const paddingY = Math.max(height * 0.1, 20);

  return {
    x: Number((minX - paddingX).toFixed(precision)),
    y: Number((minY - paddingY).toFixed(precision)),
    width: Number((width + (paddingX * 2)).toFixed(precision)),
    height: Number((height + (paddingY * 2)).toFixed(precision))
  };
};

/**
 * Converts a filter primitive to its SVG string representation
 */
const primitiveToSVGString = (primitive: FilterPrimitiveType, index: number): string => {
  const commonProps = {
    result: 'result' in primitive ? primitive.result || `effect${index}` : `effect${index}`,
    in: 'in' in primitive ? primitive.in || (index === 0 ? 'SourceGraphic' : `effect${index - 1}`) : (index === 0 ? 'SourceGraphic' : `effect${index - 1}`),
  };

  const formatAttributes = (attrs: Record<string, any>): string => {
    return Object.entries(attrs)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ');
  };

  switch (primitive.type) {
    case 'feGaussianBlur':
      return `      <feGaussianBlur ${formatAttributes({
        ...commonProps,
        stdDeviation: primitive.stdDeviation
      })} />`;

    case 'feOffset':
      return `      <feOffset ${formatAttributes({
        ...commonProps,
        dx: primitive.dx,
        dy: primitive.dy
      })} />`;

    case 'feFlood':
      return `      <feFlood ${formatAttributes({
        ...commonProps,
        'flood-color': primitive.floodColor,
        'flood-opacity': primitive.floodOpacity
      })} />`;

    case 'feComposite':
      const compositeAttrs: any = {
        ...commonProps,
        operator: primitive.operator,
        in2: primitive.in2 || 'SourceGraphic'
      };
      
      if (primitive.operator === 'arithmetic') {
        compositeAttrs.k1 = primitive.k1 || 0;
        compositeAttrs.k2 = primitive.k2 || 0;
        compositeAttrs.k3 = primitive.k3 || 0;
        compositeAttrs.k4 = primitive.k4 || 0;
      }
      
      return `      <feComposite ${formatAttributes(compositeAttrs)} />`;

    case 'feColorMatrix':
      return `      <feColorMatrix ${formatAttributes({
        ...commonProps,
        type: primitive.colorMatrixType || 'matrix',
        values: primitive.values
      })} />`;

    case 'feDropShadow':
      return `      <feDropShadow ${formatAttributes({
        ...commonProps,
        dx: primitive.dx,
        dy: primitive.dy,
        stdDeviation: primitive.stdDeviation,
        'flood-color': primitive.floodColor,
        'flood-opacity': primitive.floodOpacity
      })} />`;

    case 'feBlend':
      return `      <feBlend ${formatAttributes({
        ...commonProps,
        mode: primitive.mode,
        in2: primitive.in2 || 'SourceGraphic'
      })} />`;

    case 'feMorphology':
      return `      <feMorphology ${formatAttributes({
        ...commonProps,
        operator: primitive.operator,
        radius: primitive.radius
      })} />`;

    case 'feConvolveMatrix':
      return `      <feConvolveMatrix ${formatAttributes({
        ...commonProps,
        order: primitive.order,
        kernelMatrix: primitive.kernelMatrix,
        divisor: primitive.divisor,
        bias: primitive.bias || 0,
        targetX: primitive.targetX,
        targetY: primitive.targetY,
        edgeMode: primitive.edgeMode || 'duplicate',
        preserveAlpha: primitive.preserveAlpha || false
      })} />`;

    case 'feComponentTransfer':
      let transferContent = '';
      if (primitive.funcR) {
        transferContent += `\n        <feFuncR ${formatAttributes({
          type: primitive.funcR.funcType || 'identity',
          tableValues: primitive.funcR.tableValues,
          slope: primitive.funcR.slope,
          intercept: primitive.funcR.intercept,
          amplitude: primitive.funcR.amplitude,
          exponent: primitive.funcR.exponent,
          offset: primitive.funcR.offset
        })} />`;
      }
      if (primitive.funcG) {
        transferContent += `\n        <feFuncG ${formatAttributes({
          type: primitive.funcG.funcType || 'identity',
          tableValues: primitive.funcG.tableValues,
          slope: primitive.funcG.slope,
          intercept: primitive.funcG.intercept,
          amplitude: primitive.funcG.amplitude,
          exponent: primitive.funcG.exponent,
          offset: primitive.funcG.offset
        })} />`;
      }
      if (primitive.funcB) {
        transferContent += `\n        <feFuncB ${formatAttributes({
          type: primitive.funcB.funcType || 'identity',
          tableValues: primitive.funcB.tableValues,
          slope: primitive.funcB.slope,
          intercept: primitive.funcB.intercept,
          amplitude: primitive.funcB.amplitude,
          exponent: primitive.funcB.exponent,
          offset: primitive.funcB.offset
        })} />`;
      }
      if (primitive.funcA) {
        transferContent += `\n        <feFuncA ${formatAttributes({
          type: primitive.funcA.funcType || 'identity',
          tableValues: primitive.funcA.tableValues,
          slope: primitive.funcA.slope,
          intercept: primitive.funcA.intercept,
          amplitude: primitive.funcA.amplitude,
          exponent: primitive.funcA.exponent,
          offset: primitive.funcA.offset
        })} />`;
      }
      return `      <feComponentTransfer ${formatAttributes(commonProps)}>${transferContent}\n      </feComponentTransfer>`;

    case 'feDiffuseLighting':
      let diffuseLightSource = '';
      if (primitive.lightSource.type === 'feDistantLight') {
        diffuseLightSource = `\n        <feDistantLight ${formatAttributes({
          azimuth: primitive.lightSource.azimuth || 45,
          elevation: primitive.lightSource.elevation || 45
        })} />`;
      } else if (primitive.lightSource.type === 'fePointLight') {
        diffuseLightSource = `\n        <fePointLight ${formatAttributes({
          x: primitive.lightSource.x || 0,
          y: primitive.lightSource.y || 0,
          z: primitive.lightSource.z || 0
        })} />`;
      } else if (primitive.lightSource.type === 'feSpotLight') {
        diffuseLightSource = `\n        <feSpotLight ${formatAttributes({
          x: primitive.lightSource.x || 0,
          y: primitive.lightSource.y || 0,
          z: primitive.lightSource.z || 0,
          pointsAtX: primitive.lightSource.pointsAtX || 0,
          pointsAtY: primitive.lightSource.pointsAtY || 0,
          pointsAtZ: primitive.lightSource.pointsAtZ || 0,
          specularExponent: primitive.lightSource.specularExponent || 1,
          limitingConeAngle: primitive.lightSource.limitingConeAngle
        })} />`;
      }
      return `      <feDiffuseLighting ${formatAttributes({
        ...commonProps,
        surfaceScale: primitive.surfaceScale || 1,
        diffuseConstant: primitive.diffuseConstant || 1,
        'lighting-color': primitive.lightingColor || '#ffffff'
      })}>${diffuseLightSource}\n      </feDiffuseLighting>`;

    case 'feSpecularLighting':
      let specularLightSource = '';
      if (primitive.lightSource.type === 'feDistantLight') {
        specularLightSource = `\n        <feDistantLight ${formatAttributes({
          azimuth: primitive.lightSource.azimuth || 45,
          elevation: primitive.lightSource.elevation || 45
        })} />`;
      } else if (primitive.lightSource.type === 'fePointLight') {
        specularLightSource = `\n        <fePointLight ${formatAttributes({
          x: primitive.lightSource.x || 0,
          y: primitive.lightSource.y || 0,
          z: primitive.lightSource.z || 0
        })} />`;
      } else if (primitive.lightSource.type === 'feSpotLight') {
        specularLightSource = `\n        <feSpotLight ${formatAttributes({
          x: primitive.lightSource.x || 0,
          y: primitive.lightSource.y || 0,
          z: primitive.lightSource.z || 0,
          pointsAtX: primitive.lightSource.pointsAtX || 0,
          pointsAtY: primitive.lightSource.pointsAtY || 0,
          pointsAtZ: primitive.lightSource.pointsAtZ || 0,
          specularExponent: primitive.lightSource.specularExponent || 1,
          limitingConeAngle: primitive.lightSource.limitingConeAngle
        })} />`;
      }
      return `      <feSpecularLighting ${formatAttributes({
        ...commonProps,
        surfaceScale: primitive.surfaceScale || 1,
        specularConstant: primitive.specularConstant || 1,
        specularExponent: primitive.specularExponent || 20,
        'lighting-color': primitive.lightingColor || '#ffffff'
      })}>${specularLightSource}\n      </feSpecularLighting>`;

    case 'feDisplacementMap':
      return `      <feDisplacementMap ${formatAttributes({
        ...commonProps,
        scale: primitive.scale || 0,
        xChannelSelector: primitive.xChannelSelector || 'R',
        yChannelSelector: primitive.yChannelSelector || 'G',
        in2: primitive.in2 || 'SourceGraphic'
      })} />`;

    case 'feTurbulence':
      return `      <feTurbulence ${formatAttributes({
        ...commonProps,
        baseFrequency: primitive.baseFrequency,
        numOctaves: primitive.numOctaves || 1,
        seed: primitive.seed || 0,
        stitchTiles: primitive.stitchTiles || 'noStitch',
        type: primitive.turbulenceType || 'turbulence'
      })} />`;

    case 'feImage':
      return `      <feImage ${formatAttributes({
        ...commonProps,
        href: primitive.href,
        preserveAspectRatio: primitive.preserveAspectRatio || 'xMidYMid meet',
        crossorigin: primitive.crossorigin
      })} />`;

    case 'feTile':
      return `      <feTile ${formatAttributes(commonProps)} />`;

    case 'feMerge':
      let mergeNodes = '';
      if (primitive.feMergeNodes) {
        mergeNodes = primitive.feMergeNodes.map(node => 
          `\n        <feMergeNode ${formatAttributes({ in: node.in })} />`
        ).join('');
      }
      return `      <feMerge ${formatAttributes(commonProps)}>${mergeNodes}\n      </feMerge>`;

    case 'feFuncR':
      return `      <feFuncR ${formatAttributes({
        type: primitive.funcType || 'identity',
        tableValues: primitive.tableValues,
        slope: primitive.slope,
        intercept: primitive.intercept,
        amplitude: primitive.amplitude,
        exponent: primitive.exponent,
        offset: primitive.offset
      })} />`;

    case 'feFuncG':
      return `      <feFuncG ${formatAttributes({
        type: primitive.funcType || 'identity',
        tableValues: primitive.tableValues,
        slope: primitive.slope,
        intercept: primitive.intercept,
        amplitude: primitive.amplitude,
        exponent: primitive.exponent,
        offset: primitive.offset
      })} />`;

    case 'feFuncB':
      return `      <feFuncB ${formatAttributes({
        type: primitive.funcType || 'identity',
        tableValues: primitive.tableValues,
        slope: primitive.slope,
        intercept: primitive.intercept,
        amplitude: primitive.amplitude,
        exponent: primitive.exponent,
        offset: primitive.offset
      })} />`;

    case 'feFuncA':
      return `      <feFuncA ${formatAttributes({
        type: primitive.funcType || 'identity',
        tableValues: primitive.tableValues,
        slope: primitive.slope,
        intercept: primitive.intercept,
        amplitude: primitive.amplitude,
        exponent: primitive.exponent,
        offset: primitive.offset
      })} />`;

    default:
      return '';
  }
};

/**
 * Generates a complete SVG string from the current editor state
 * This is the unified export function used across the application
 */
export const generateSVGCode = (editorState: any): string => {
  const { 
    paths, 
    texts, 
    textPaths, 
    groups, 
    gradients, 
    images, 
    symbols, 
    markers, 
    clipPaths, 
    masks, 
    filters, 
    uses, 
    animations, 
    precision, 
    calculateChainDelays 
  } = editorState;

  // Calculate chain delays for proper animation timing
  const chainDelays = calculateChainDelays();
  
  // Helper function to convert fill/stroke values to SVG format
  const convertStyleValue = (value: any): string | null => {
    if (value === undefined || value === null) return null;
    if (value === 'none') return 'none';
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value !== null && value.id) {
      return `url(#${value.id})`;
    }
    return null;
  };

  // Helper function to format numbers with precision
  const formatNumber = (value: any): string => {
    if (typeof value === 'number') {
      return Number(value.toFixed(precision)).toString();
    }
    return value?.toString() || '0';
  };

  // Helper function to format viewBox with precision
  const formatViewBox = (viewBox: string): string => {
    if (!viewBox) return viewBox;
    const parts = viewBox.trim().split(/\s+/);
    if (parts.length === 4) {
      return `${formatNumber(parseFloat(parts[0]))} ${formatNumber(parseFloat(parts[1]))} ${formatNumber(parseFloat(parts[2]))} ${formatNumber(parseFloat(parts[3]))}`;
    }
    return viewBox;
  };

  // Helper function to render a single path element
  const renderPath = (path: any) => {
    const pathData = path.subPaths.map((subPath: any) => subPathToString(subPath, precision)).join(' ');
    const style = path.style;
    
    const fillValue = convertStyleValue(style.fill);
    const strokeValue = convertStyleValue(style.stroke);
    
    const attributes = [
      `id="${path.id}"`,
      `d="${pathData}"`,
      path.pathLength !== undefined ? `pathLength="${formatNumber(path.pathLength)}"` : '',
      fillValue !== 'none' ? `fill="${fillValue}"` : 'fill="none"',
      strokeValue !== 'none' ? `stroke="${strokeValue}"` : '',
      style.strokeWidth ? `stroke-width="${formatNumber(style.strokeWidth)}"` : '',
      style.strokeDasharray ? `stroke-dasharray="${style.strokeDasharray}"` : '',
      style.strokeDashoffset !== undefined ? `stroke-dashoffset="${formatNumber(style.strokeDashoffset)}"` : '',
      style.strokeLinecap ? `stroke-linecap="${style.strokeLinecap}"` : '',
      style.strokeLinejoin ? `stroke-linejoin="${style.strokeLinejoin}"` : '',
      style.fillRule ? `fill-rule="${style.fillRule}"` : '',
      style.fillOpacity !== undefined && style.fillOpacity !== 1 ? `fill-opacity="${formatNumber(style.fillOpacity)}"` : '',
      style.strokeOpacity !== undefined && style.strokeOpacity !== 1 ? `stroke-opacity="${formatNumber(style.strokeOpacity)}"` : '',
      style.markerStart ? `marker-start="${convertStyleValue(style.markerStart)}"` : '',
      style.markerMid ? `marker-mid="${convertStyleValue(style.markerMid)}"` : '',
      style.markerEnd ? `marker-end="${convertStyleValue(style.markerEnd)}"` : '',
      style.filter ? `filter="${convertStyleValue(style.filter)}"` : '',
      style.clipPath ? `clip-path="${convertStyleValue(style.clipPath)}"` : '',
      style.mask ? `mask="${convertStyleValue(style.mask)}"` : '',
    ].filter(Boolean).join(' ');
    
    // Get animations for this path
    const pathAnimations = renderAnimationsForElement(path.id, chainDelays);
    
    if (pathAnimations) {
      return `<path ${attributes}>\n${pathAnimations}\n    </path>`;
    } else {
      return `<path ${attributes} />`;
    }
  };

  const renderText = (text: any) => {
    const style = text.style || {};
    
    const textFillValue = convertStyleValue(style.fill);
    const textStrokeValue = convertStyleValue(style.stroke);
    
    const attributes = [
      `id="${text.id}"`,
      `x="${formatNumber(text.x)}"`,
      `y="${formatNumber(text.y)}"`,
      text.transform ? `transform="${text.transform}"` : '',
      style.fontSize ? `font-size="${formatNumber(style.fontSize)}"` : '',
      style.fontFamily ? `font-family="${style.fontFamily}"` : '',
      style.fontWeight ? `font-weight="${style.fontWeight}"` : '',
      style.fontStyle ? `font-style="${style.fontStyle}"` : '',
      style.textAnchor ? `text-anchor="${style.textAnchor}"` : '',
      textFillValue !== 'none' ? `fill="${textFillValue}"` : '',
      textStrokeValue !== 'none' ? `stroke="${textStrokeValue}"` : '',
      style.strokeWidth ? `stroke-width="${formatNumber(style.strokeWidth)}"` : '',
      style.fillOpacity !== undefined && style.fillOpacity !== 1 ? `fill-opacity="${formatNumber(style.fillOpacity)}"` : '',
      style.strokeOpacity !== undefined && style.strokeOpacity !== 1 ? `stroke-opacity="${formatNumber(style.strokeOpacity)}"` : '',
      style.filter ? `filter="${convertStyleValue(style.filter)}"` : '',
      style.clipPath ? `clip-path="${convertStyleValue(style.clipPath)}"` : '',
      style.mask ? `mask="${convertStyleValue(style.mask)}"` : '',
    ].filter(Boolean).join(' ');

    // Get animations for this text
    const textAnimations = renderAnimationsForElement(text.id, chainDelays);

    if (text.type === 'multiline-text') {
      const spans = text.spans.map((span: any, index: number) => {
        const spanFillValue = span.style?.fill ? convertStyleValue(span.style.fill) : '';
        
        const spanAttributes = [
          `x="${formatNumber(text.x)}"`,
          `dy="${index === 0 ? 0 : formatNumber((style.fontSize || 16) * 1.2)}"`,
          spanFillValue && spanFillValue !== textFillValue ? `fill="${spanFillValue}"` : '',
          span.style?.fontWeight && span.style.fontWeight !== style.fontWeight ? `font-weight="${span.style.fontWeight}"` : '',
        ].filter(Boolean).join(' ');
        
        return `    <tspan ${spanAttributes}>${span.content}</tspan>`;
      }).join('\n');
      
      if (textAnimations) {
        return `<text ${attributes}>\n${spans}\n${textAnimations}\n  </text>`;
      } else {
        return `<text ${attributes}>\n${spans}\n  </text>`;
      }
    } else {
      if (textAnimations) {
        return `<text ${attributes}>${text.content}\n${textAnimations}\n    </text>`;
      } else {
        return `<text ${attributes}>${text.content}</text>`;
      }
    }
  };

  // Render image elements
  const renderImage = (image: any) => {
    const attributes = [
      `x="${formatNumber(image.x)}"`,
      `y="${formatNumber(image.y)}"`,
      `width="${formatNumber(image.width)}"`,
      `height="${formatNumber(image.height)}"`,
      `href="${image.href}"`,
      image.preserveAspectRatio ? `preserveAspectRatio="${image.preserveAspectRatio}"` : '',
      image.transform ? `transform="${image.transform}"` : '',
      image.style?.clipPath ? `clip-path="${convertStyleValue(image.style.clipPath)}"` : '',
      image.style?.mask ? `mask="${convertStyleValue(image.style.mask)}"` : '',
      image.style?.filter ? `filter="${convertStyleValue(image.style.filter)}"` : '',
    ].filter(Boolean).join(' ');
    
    // Get animations for this image
    const imageAnimations = renderAnimationsForElement(image.id, chainDelays);
    
    if (imageAnimations) {
      return `<image ${attributes}>\n${imageAnimations}\n    </image>`;
    } else {
      return `<image ${attributes} />`;
    }
  };

  // Render use elements (symbol instances)
  const renderUse = (use: any) => {
    const style = use.style || {};
    
    
    const fillValue = convertStyleValue(style.fill);
    const strokeValue = convertStyleValue(style.stroke);
    const clipPathValue = convertStyleValue(style.clipPath);
    const maskValue = convertStyleValue(style.mask);
    const filterValue = convertStyleValue(style.filter);
    
    const attributes = [
      `href="${use.href.startsWith('#') ? use.href : '#' + use.href}"`,
      `x="${formatNumber(use.x || 0)}"`,
      `y="${formatNumber(use.y || 0)}"`,
      use.width ? `width="${formatNumber(use.width)}"` : '',
      use.height ? `height="${formatNumber(use.height)}"` : '',
      use.transform ? `transform="${use.transform}"` : '',
      // Add all style properties - be more permissive with conditions
      fillValue !== null ? `fill="${fillValue}"` : '',
      strokeValue !== null ? `stroke="${strokeValue}"` : '',
      style.strokeWidth !== undefined ? `stroke-width="${formatNumber(style.strokeWidth)}"` : '',
      style.strokeDasharray ? `stroke-dasharray="${style.strokeDasharray}"` : '',
      style.strokeLinecap ? `stroke-linecap="${style.strokeLinecap}"` : '',
      style.strokeLinejoin ? `stroke-linejoin="${style.strokeLinejoin}"` : '',
      style.fillRule ? `fill-rule="${style.fillRule}"` : '',
      style.fillOpacity !== undefined ? `fill-opacity="${style.fillOpacity}"` : '',
      style.strokeOpacity !== undefined ? `stroke-opacity="${style.strokeOpacity}"` : '',
      style.opacity !== undefined ? `opacity="${formatNumber(style.opacity)}"` : '',
      clipPathValue ? `clip-path="${clipPathValue}"` : '',
      maskValue ? `mask="${maskValue}"` : '',
      filterValue ? `filter="${filterValue}"` : '',
    ].filter(Boolean).join(' ');
    
    // Get animations for this use element (symbol instance)
    const useAnimations = renderAnimationsForElement(use.id, chainDelays);
    
    if (useAnimations) {
      return `<use ${attributes}>\n${useAnimations}\n    </use>`;
    } else {
      return `<use ${attributes} />`;
    }
  };

  // Render textPath elements
  const renderTextPath = (textPath: any) => {
    const style = textPath.style || {};
    const textFillValue = convertStyleValue(style.fill);
    const textStrokeValue = convertStyleValue(style.stroke);
    
    const textAttributes = [
      `id="${textPath.id}"`,
      style.fontSize ? `font-size="${formatNumber(style.fontSize)}"` : '',
      style.fontFamily ? `font-family="${style.fontFamily}"` : '',
      style.fontWeight ? `font-weight="${style.fontWeight}"` : '',
      style.fontStyle ? `font-style="${style.fontStyle}"` : '',
      style.textAnchor ? `text-anchor="${style.textAnchor}"` : '',
      textFillValue !== 'none' ? `fill="${textFillValue}"` : '',
      textStrokeValue !== 'none' ? `stroke="${textStrokeValue}"` : '',
      style.strokeWidth ? `stroke-width="${formatNumber(style.strokeWidth)}"` : '',
      style.fillOpacity !== undefined && style.fillOpacity !== 1 ? `fill-opacity="${formatNumber(style.fillOpacity)}"` : '',
      style.strokeOpacity !== undefined && style.strokeOpacity !== 1 ? `stroke-opacity="${formatNumber(style.strokeOpacity)}"` : '',
      textPath.transform ? `transform="${textPath.transform}"` : '',
      style.filter ? `filter="${convertStyleValue(style.filter)}"` : '',
      style.clipPath ? `clip-path="${convertStyleValue(style.clipPath)}"` : '',
      style.mask ? `mask="${convertStyleValue(style.mask)}"` : '',
    ].filter(Boolean).join(' ');

    const textPathAttributes = [
      `href="#${textPath.pathRef}"`,
      textPath.startOffset !== undefined ? `startOffset="${formatNumber(textPath.startOffset)}"` : '',
      textPath.method ? `method="${textPath.method}"` : '',
      textPath.spacing ? `spacing="${textPath.spacing}"` : '',
      textPath.side ? `side="${textPath.side}"` : '',
      textPath.textLength ? `textLength="${formatNumber(textPath.textLength)}"` : '',
      textPath.lengthAdjust ? `lengthAdjust="${textPath.lengthAdjust}"` : '',
    ].filter(Boolean).join(' ');
    
    // Get animations for this textPath
    const textPathAnimations = renderAnimationsForElement(textPath.id, chainDelays);
    
    if (textPathAnimations) {
      return `<text ${textAttributes}><textPath ${textPathAttributes}>${textPath.content}</textPath>\n${textPathAnimations}\n  </text>`;
    } else {
      return `<text ${textAttributes}><textPath ${textPathAttributes}>${textPath.content}</textPath></text>`;
    }
  };

  // Helper function to render animations for an element
  function renderAnimationsForElement(elementId: string, chainDelays: Map<string, number>): string {
    const elementAnimations = animations.filter((anim: any) => anim.targetElementId === elementId);
    if (elementAnimations.length === 0) return '';
    
    const result = elementAnimations.map((animation: any) => {
      // For SVG export, calculate proper begin times for sequential playback
      let beginValue = '0s';
      const chainDelay = chainDelays.get(animation.id);
      
      if (chainDelay !== undefined && chainDelay > 0) {
        // Convert from ms to seconds for SVG
        const delayInSeconds = chainDelay / 1000;
        beginValue = `${delayInSeconds}s`;
      } else {
        // Use original begin time or default to 0s
        beginValue = getAnimationProperty(animation, 'begin') || '0s';
      }
      
      const commonProps = [
        `dur="${animation.dur || '2s'}"`,
        beginValue !== '0s' ? `begin="${beginValue}"` : '',
        getAnimationProperty(animation, 'end') ? `end="${getAnimationProperty(animation, 'end')}"` : '',
        getAnimationProperty(animation, 'fill') ? `fill="${getAnimationProperty(animation, 'fill')}"` : '',
        getAnimationProperty(animation, 'repeatCount') ? `repeatCount="${getAnimationProperty(animation, 'repeatCount')}"` : '',
        getAnimationProperty(animation, 'repeatDur') ? `repeatDur="${getAnimationProperty(animation, 'repeatDur')}"` : '',
        getAnimationProperty(animation, 'restart') ? `restart="${getAnimationProperty(animation, 'restart')}"` : '',
        getAnimationProperty(animation, 'calcMode') ? `calcMode="${getAnimationProperty(animation, 'calcMode')}"` : '',
        getAnimationProperty(animation, 'keyTimes') ? `keyTimes="${getAnimationProperty(animation, 'keyTimes')}"` : '',
        getAnimationProperty(animation, 'keySplines') ? `keySplines="${getAnimationProperty(animation, 'keySplines')}"` : ''
      ].filter(Boolean).join(' ');
      
      switch (animation.type) {
        case 'animate':
          const animateProps = [
            `attributeName="${animation.attributeName}"`,
            animation.attributeType ? `attributeType="${animation.attributeType}"` : '',
            animation.values ? `values="${animation.values}"` : '',
            animation.from ? `from="${formatNumber(animation.from)}"` : '',
            animation.to ? `to="${formatNumber(animation.to)}"` : '',
            animation.by ? `by="${formatNumber(animation.by)}"` : '',
            getAnimationProperty(animation, 'additive') ? `additive="${getAnimationProperty(animation, 'additive')}"` : '',
            getAnimationProperty(animation, 'accumulate') ? `accumulate="${getAnimationProperty(animation, 'accumulate')}"` : ''
          ].filter(Boolean).join(' ');
          return `      <animate ${animateProps} ${commonProps} />`;
          
        case 'animateTransform':
          const transformProps = [
            `attributeName="transform"`,
            animation.attributeType ? `attributeType="${animation.attributeType}"` : '',
            `type="${animation.transformType}"`,
            animation.values ? `values="${animation.values}"` : '',
            animation.from ? `from="${formatNumber(animation.from)}"` : '',
            animation.to ? `to="${formatNumber(animation.to)}"` : '',
            animation.by ? `by="${formatNumber(animation.by)}"` : '',
            getAnimationProperty(animation, 'additive') ? `additive="${getAnimationProperty(animation, 'additive')}"` : '',
            getAnimationProperty(animation, 'accumulate') ? `accumulate="${getAnimationProperty(animation, 'accumulate')}"` : ''
          ].filter(Boolean).join(' ');
          return `      <animateTransform ${transformProps} ${commonProps} />`;
          
        case 'animateMotion':
          return `<animateMotion ${animation.path ? `path="${animation.path}"` : ''} ${animation.rotate ? `rotate="${formatNumber(animation.rotate)}"` : ''} ${animation.keyPoints ? `keyPoints="${animation.keyPoints}"` : ''} ${commonProps}>${animation.mpath ? `<mpath href="#${animation.mpath}"/>` : ''}</animateMotion>`;
          
        case 'set':
          const setProps = [
            `attributeName="${animation.attributeName}"`,
            animation.attributeType ? `attributeType="${animation.attributeType}"` : '',
            `to="${formatNumber(animation.to)}"`
          ].filter(Boolean).join(' ');
          return `      <set ${setProps} ${commonProps} />`;
          
        default:
          return '';
      }
    }).filter(Boolean);
    
    return result.join('\n');
  }

  // Helper function to safely get animation properties
  function getAnimationProperty(animation: any, property: string): any {
    return animation[property];
  }

  // Find which gradients, symbols, markers, etc. are actually used
  const usedGradientIds = new Set<string>();
  const usedSymbolIds = new Set<string>();
  const usedMarkerIds = new Set<string>();
  const usedClipPathIds = new Set<string>();
  const usedMaskIds = new Set<string>();
  const usedFilterIds = new Set<string>();
  
  // Check all elements for references
  [...paths, ...texts, ...textPaths, ...images, ...uses].forEach((element: any) => {
    const style = element.style || {};
    
    // Check for gradient/pattern references (both object and string formats)
    if (typeof style.fill === 'object' && style.fill?.id) {
      usedGradientIds.add(style.fill.id);
    } else if (typeof style.fill === 'string' && style.fill.includes('url(#')) {
      const gradientId = style.fill.replace('url(#', '').replace(')', '');
      usedGradientIds.add(gradientId);
    }
    
    if (typeof style.stroke === 'object' && style.stroke?.id) {
      usedGradientIds.add(style.stroke.id);
    } else if (typeof style.stroke === 'string' && style.stroke.includes('url(#')) {
      const gradientId = style.stroke.replace('url(#', '').replace(')', '');
      usedGradientIds.add(gradientId);
    }
    
    // Check for marker references
    if (style.markerStart && typeof style.markerStart === 'string' && style.markerStart.includes('#')) {
      const markerId = style.markerStart.replace('url(#', '').replace(')', '');
      usedMarkerIds.add(markerId);
    }
    if (style.markerMid && typeof style.markerMid === 'string' && style.markerMid.includes('#')) {
      const markerId = style.markerMid.replace('url(#', '').replace(')', '');
      usedMarkerIds.add(markerId);
    }
    if (style.markerEnd && typeof style.markerEnd === 'string' && style.markerEnd.includes('#')) {
      const markerId = style.markerEnd.replace('url(#', '').replace(')', '');
      usedMarkerIds.add(markerId);
    }
    
    // Check for clip path references
    if (style.clipPath && typeof style.clipPath === 'string' && style.clipPath.includes('#')) {
      const clipPathId = style.clipPath.replace('url(#', '').replace(')', '');
      usedClipPathIds.add(clipPathId);
    }
    
    // Check for mask references
    if (style.mask && typeof style.mask === 'string' && style.mask.includes('#')) {
      const maskId = style.mask.replace('url(#', '').replace(')', '');
      usedMaskIds.add(maskId);
    }
    
    // Check for filter references
    if (style.filter && typeof style.filter === 'string' && style.filter.includes('#')) {
      const filterId = style.filter.replace('url(#', '').replace(')', '');
      usedFilterIds.add(filterId);
    }
  });

  // Check for symbol references in use elements
  uses.forEach((use: any) => {
    const symbolId = use.href.replace('#', '');
    usedSymbolIds.add(symbolId);
  });

  // Filter to only include used definitions
  const allGradients = gradients.filter((gradient: any) => usedGradientIds.has(gradient.id));
  const allMarkers = markers; // Include ALL markers temporarily
  const allClipPaths = clipPaths; // Include ALL clipPaths temporarily
  const allMasks = masks.filter((mask: any) => usedMaskIds.has(mask.id));
  const allFilters = filters.filter((filter: any) => usedFilterIds.has(filter.id));
  const allSymbols = symbols.filter((symbol: any) => usedSymbolIds.has(symbol.id));

  // Generate all definitions (gradients, symbols, markers, filters, clip paths, masks)
  const generateDefinitions = () => {
    const allDefs: string[] = [];
    
    // Add gradients and patterns
    if (allGradients.length > 0) {
      const gradientDefs = allGradients.map((gradient: any) => {
        // Find animations that target this gradient
        const gradientAnimations = animations.filter((anim: any) => 
          anim.targetElementId === gradient.id
        );
        
        if (gradient.type === 'linear') {
          const stops = gradient.stops.map((stop: any) => {
            // Find animations that target this stop
            const stopAnimations = animations.filter((anim: any) => 
              anim.targetElementId === stop.id
            );
            
            const stopProps = [
              `id="${stop.id}"`,
              `offset="${stop.offset}%"`,
              `stop-color="${stop.color}"`,
              stop.opacity !== undefined && stop.opacity !== 1 ? `stop-opacity="${stop.opacity}"` : ''
            ].filter(Boolean).join(' ');
            
            if (stopAnimations.length > 0) {
              const stopAnimationElements = stopAnimations.map((anim: any) => renderAnimationsForElement(stop.id, chainDelays)).filter(Boolean).join('\n');
              return `      <stop ${stopProps}>\n${stopAnimationElements}\n      </stop>`;
            } else {
              return `      <stop ${stopProps} />`;
            }
          }).join('\n');
          
          const gradientProps = [
            `id="${gradient.id}"`,
            `x1="${gradient.x1 * 100}%"`,
            `y1="${gradient.y1 * 100}%"`,
            `x2="${gradient.x2 * 100}%"`,
            `y2="${gradient.y2 * 100}%"`,
            gradient.gradientUnits ? `gradientUnits="${gradient.gradientUnits}"` : '',
            gradient.gradientTransform ? `gradientTransform="${gradient.gradientTransform}"` : '',
            gradient.spreadMethod ? `spreadMethod="${gradient.spreadMethod}"` : ''
          ].filter(Boolean).join(' ');
          
          if (gradientAnimations.length > 0) {
            const gradientAnimationElements = gradientAnimations.map((anim: any) => renderAnimationsForElement(gradient.id, chainDelays)).filter(Boolean).join('\n');
            return `    <linearGradient ${gradientProps}>\n${stops}\n${gradientAnimationElements}\n    </linearGradient>`;
          } else {
            return `    <linearGradient ${gradientProps}>\n${stops}\n    </linearGradient>`;
          }
        } else if (gradient.type === 'radial') {
          const stops = gradient.stops.map((stop: any) => {
            const stopProps = [
              `id="${stop.id}"`,
              `offset="${stop.offset}%"`,
              `stop-color="${stop.color}"`,
              stop.opacity !== undefined && stop.opacity !== 1 ? `stop-opacity="${stop.opacity}"` : ''
            ].filter(Boolean).join(' ');
            return `      <stop ${stopProps} />`;
          }).join('\n');
          
          const gradientProps = [
            `id="${gradient.id}"`,
            `cx="${gradient.cx * 100}%"`,
            `cy="${gradient.cy * 100}%"`,
            `r="${gradient.r * 100}%"`,
            gradient.fx !== undefined ? `fx="${gradient.fx * 100}%"` : '',
            gradient.fy !== undefined ? `fy="${gradient.fy * 100}%"` : '',
            gradient.gradientUnits ? `gradientUnits="${gradient.gradientUnits}"` : '',
            gradient.gradientTransform ? `gradientTransform="${gradient.gradientTransform}"` : '',
            gradient.spreadMethod ? `spreadMethod="${gradient.spreadMethod}"` : ''
          ].filter(Boolean).join(' ');
          
          return `    <radialGradient ${gradientProps}>\n${stops}\n    </radialGradient>`;
        } else if (gradient.type === 'pattern') {
          const patternProps = [
            `id="${gradient.id}"`,
            `x="${gradient.x || 0}"`,
            `y="${gradient.y || 0}"`,
            `width="${gradient.width || 10}"`,
            `height="${gradient.height || 10}"`,
            gradient.patternUnits ? `patternUnits="${gradient.patternUnits}"` : 'patternUnits="userSpaceOnUse"',
            gradient.patternContentUnits ? `patternContentUnits="${gradient.patternContentUnits}"` : '',
            gradient.patternTransform ? `patternTransform="${gradient.patternTransform}"` : '',
            gradient.viewBox ? `viewBox="${formatViewBox(gradient.viewBox)}"` : '',
            gradient.preserveAspectRatio ? `preserveAspectRatio="${gradient.preserveAspectRatio}"` : ''
          ].filter(Boolean).join(' ');
          
          // Pattern content can be SVG elements or raw SVG string
          const patternContent = gradient.content || '';
          
          return `    <pattern ${patternProps}>\n      ${patternContent}\n    </pattern>`;
        }
        return '';
      }).filter(Boolean);
      
      allDefs.push(...gradientDefs);
    }

    // Add symbols
    if (allSymbols.length > 0) {
      const symbolDefs = allSymbols.map((symbol: any) => {
        const symbolAttributes = [
          `id="${symbol.id}"`,
          symbol.viewBox ? `viewBox="${formatViewBox(symbol.viewBox)}"` : '',
          symbol.width ? `width="${symbol.width}"` : '',
          symbol.height ? `height="${symbol.height}"` : '',
          symbol.preserveAspectRatio ? `preserveAspectRatio="${symbol.preserveAspectRatio}"` : ''
        ].filter(Boolean).join(' ');
        
        // Generate symbol content from children
        const symbolContent = symbol.children?.map((child: any) => {
          if (child.type === 'path') {
            // Handle direct child objects (created from selection)
            if (child.subPaths) {
              const pathData = child.subPaths.map((subPath: any) => {
                if (!subPath.commands || !Array.isArray(subPath.commands)) {
                  return '';
                }
                return subPath.commands.map((cmd: any) => {
                  switch (cmd.command) {
                    case 'M':
                      return `M ${cmd.x || 0} ${cmd.y || 0}`;
                    case 'L':
                      return `L ${cmd.x || 0} ${cmd.y || 0}`;
                    case 'C':
                      return `C ${cmd.x1 || 0} ${cmd.y1 || 0} ${cmd.x2 || 0} ${cmd.y2 || 0} ${cmd.x || 0} ${cmd.y || 0}`;
                    case 'Z':
                      return 'Z';
                    default:
                      return '';
                  }
                }).join(' ');
              }).join(' ');

              if (!pathData || pathData.trim() === '') {
                return '';
              }

              // For symbol paths, omit fill/stroke attributes to allow inheritance from <use>
              const pathAttrs = [
                `id="${child.id}"`,
                `d="${pathData}"`,
                // Don't include fill or stroke - let them inherit from <use> element
              ].filter(Boolean).join(' ');

              return `      <path ${pathAttrs} />`;
            } else if (child.id) {
              // Handle reference-based children - find the actual path data
              const referencedPath = paths.find((path: any) => path.id === child.id);
              if (referencedPath) {
                const pathData = referencedPath.subPaths.map((subPath: any) => {
                  if (!subPath.commands || !Array.isArray(subPath.commands)) {
                    return '';
                  }
                  return subPath.commands.map((cmd: any) => {
                    switch (cmd.command) {
                      case 'M':
                        return `M ${cmd.x || 0} ${cmd.y || 0}`;
                      case 'L':
                        return `L ${cmd.x || 0} ${cmd.y || 0}`;
                      case 'C':
                        return `C ${cmd.x1 || 0} ${cmd.y1 || 0} ${cmd.x2 || 0} ${cmd.y2 || 0} ${cmd.x || 0} ${cmd.y || 0}`;
                      case 'Z':
                        return 'Z';
                      default:
                        return '';
                    }
                  }).join(' ');
                }).join(' ');

                if (!pathData || pathData.trim() === '') {
                  return '';
                }

                // For symbol paths, omit fill/stroke attributes to allow inheritance from <use>
                const pathAttrs = [
                  `d="${pathData}"`,
                  // Don't include fill or stroke - let them inherit from <use> element
                ].filter(Boolean).join(' ');

                return `      <path ${pathAttrs} />`;
              }
            }
          }
          // Handle reference-based children (could be expanded for other types)
          return '';
        }).filter(Boolean).join('\n') || '';
        
        return `    <symbol ${symbolAttributes}>\n${symbolContent}\n    </symbol>`;
      });
      
      allDefs.push(...symbolDefs);
    }

    // Add markers 
    if (allMarkers.length > 0) {
      const markerDefs = allMarkers.map((marker: any) => {
        const markerAttributes = [
          `id="${marker.id}"`,
          marker.viewBox ? `viewBox="${formatViewBox(marker.viewBox)}"` : '',
          marker.refX !== undefined ? `refX="${marker.refX}"` : '',
          marker.refY !== undefined ? `refY="${marker.refY}"` : '',
          marker.markerWidth ? `markerWidth="${marker.markerWidth}"` : '',
          marker.markerHeight ? `markerHeight="${marker.markerHeight}"` : '',
          marker.orient ? `orient="${marker.orient}"` : '',
          marker.markerUnits ? `markerUnits="${marker.markerUnits}"` : ''
        ].filter(Boolean).join(' ');
        
        return `    <marker ${markerAttributes}>\n      ${marker.content}\n    </marker>`;
      });
      
      allDefs.push(...markerDefs);
    }

    // Add filters
    if (allFilters.length > 0) {
      const filterDefs = allFilters.map((filter: any) => {
        const filterAttributes = [
          `id="${filter.id}"`,
          filter.x ? `x="${filter.x}"` : '',
          filter.y ? `y="${filter.y}"` : '',
          filter.width ? `width="${filter.width}"` : '',
          filter.height ? `height="${filter.height}"` : '',
          filter.filterUnits ? `filterUnits="${filter.filterUnits}"` : '',
          filter.primitiveUnits ? `primitiveUnits="${filter.primitiveUnits}"` : '',
          filter.colorInterpolationFilters ? `color-interpolation-filters="${filter.colorInterpolationFilters}"` : ''
        ].filter(Boolean).join(' ');
        
        // Generate primitives content from the filter's primitives array
        const primitivesContent = filter.primitives && filter.primitives.length > 0 
          ? filter.primitives.map((primitive: any, index: number) => 
              primitiveToSVGString(primitive, index)
            ).join('\n')
          : '';
        
        return `    <filter ${filterAttributes}>\n${primitivesContent}\n    </filter>`;
      });
      
      allDefs.push(...filterDefs);
    }

    // Add clip paths
    if (allClipPaths.length > 0) {
      const clipPathDefs = allClipPaths.map((clipPath: any) => {
        const clipPathAttributes = [
          `id="${clipPath.id}"`,
          clipPath.clipPathUnits ? `clipPathUnits="${clipPath.clipPathUnits}"` : ''
        ].filter(Boolean).join(' ');
        
        return `    <clipPath ${clipPathAttributes}>\n      ${clipPath.content}\n    </clipPath>`;
      });
      
      allDefs.push(...clipPathDefs);
    }

    // Add masks
    if (allMasks.length > 0) {
      const maskDefs = allMasks.map((mask: any) => {
        const maskAttributes = [
          `id="${mask.id}"`,
          mask.x ? `x="${mask.x}"` : '',
          mask.y ? `y="${mask.y}"` : '',
          mask.width ? `width="${mask.width}"` : '',
          mask.height ? `height="${mask.height}"` : '',
          mask.maskUnits ? `maskUnits="${mask.maskUnits}"` : '',
          mask.maskContentUnits ? `maskContentUnits="${mask.maskContentUnits}"` : ''
        ].filter(Boolean).join(' ');
        
        return `    <mask ${maskAttributes}>\n      ${mask.content}\n    </mask>`;
      });
      
      allDefs.push(...maskDefs);
    }

    return allDefs.length > 0 ? `  <defs>\n${allDefs.join('\n')}\n  </defs>\n` : '';
  };

  // Helper function to render a group element
  const renderGroup = (group: any) => {
    const style = group.style || {};
    
    const attributes = [
      `id="${group.id}"`,
      group.name ? `data-name="${group.name}"` : '',
      group.transform ? `transform="${group.transform}"` : '',
      style.opacity !== undefined && style.opacity !== 1 ? `opacity="${formatNumber(style.opacity)}"` : '',
      style.filter ? `filter="${convertStyleValue(style.filter)}"` : '',
      style.clipPath ? `clip-path="${convertStyleValue(style.clipPath)}"` : '',
      style.mask ? `mask="${convertStyleValue(style.mask)}"` : '',
    ].filter(Boolean).join(' ');

    // Collect elements that are NOT in any group
    const elementsInGroups = new Set<string>();
    groups.forEach((g: any) => {
      g.children.forEach((child: any) => {
        elementsInGroups.add(child.id);
      });
    });

    // Generate child elements for this group using z-index order
    const childElements: string[] = [];
    
    // Get child IDs from the group
    const childIds = group.children?.map((child: any) => child.id) || [];
    
    // Filter elements by z-index that belong to this group
    const groupElements = elementsByZIndex.filter((element: RenderableElement) => 
      childIds.includes(element.id)
    );
    
    // Render group elements in z-index order
    groupElements.forEach((element: RenderableElement) => {
      switch (element.type) {
        case 'path':
          childElements.push(`    ${renderPath(element.element)}`);
          break;
        case 'text':
          childElements.push(`    ${renderText(element.element)}`);
          break;
        case 'image':
          childElements.push(`    ${renderImage(element.element)}`);
          break;
        case 'use':
          childElements.push(`    ${renderUse(element.element)}`);
          break;
      }
    });
    
    // Handle textPaths and nested groups separately (not yet in z-index system)
    group.children?.forEach((child: any) => {
      if (child.type === 'textPath') {
        const textPath = textPaths.find((tp: any) => tp.id === child.id);
        if (textPath) {
          childElements.push(`    ${renderTextPath(textPath)}`);
        }
      } else if (child.type === 'group') {
        const nestedGroup = groups.find((g: any) => g.id === child.id);
        if (nestedGroup) {
          childElements.push(`    ${renderGroup(nestedGroup)}`);
        }
      }
    });

    const childContent = childElements.join('\n');
    
    // Get animations for this group
    const groupAnimations = renderAnimationsForElement(group.id, chainDelays);
    
    if (groupAnimations) {
      return `<g ${attributes}>
${groupAnimations}
${childContent}
  </g>`;
    } else {
      return `<g ${attributes}>
${childContent}
  </g>`;
    }
  };

  // Get all elements sorted by z-index for proper rendering order
  const elementsByZIndex = getAllElementsByZIndex();
  
  // Collect elements that are NOT in any group
  const elementsInGroups = new Set<string>();
  groups.forEach((group: any) => {
    group.children.forEach((child: any) => {
      elementsInGroups.add(child.id);
    });
  });

  // Create render items that include both standalone elements and groups
  // Each group gets assigned the minimum z-index of its children for positioning
  const renderItems: Array<{
    type: 'element' | 'group';
    zIndex: number;
    content: string;
  }> = [];

  // Add standalone elements
  const standaloneElements = elementsByZIndex.filter((element: RenderableElement) => 
    !elementsInGroups.has(element.id)
  );

  standaloneElements.forEach((element: RenderableElement) => {
    let content = '';
    switch (element.type) {
      case 'path':
        content = `  ${renderPath(element.element)}`;
        break;
      case 'text':
        content = `  ${renderText(element.element)}`;
        break;
      case 'image':
        content = `  ${renderImage(element.element)}`;
        break;
      case 'use':
        content = `  ${renderUse(element.element)}`;
        break;
    }
    
    if (content) {
      renderItems.push({
        type: 'element',
        zIndex: element.zIndex,
        content
      });
    }
  });

  // Add textPath elements separately (not yet in z-index system, render at end)
  const standaloneTextPaths = textPaths.filter((textPath: any) => !elementsInGroups.has(textPath.id));
  standaloneTextPaths.forEach((textPath: any) => {
    renderItems.push({
      type: 'element',
      zIndex: Infinity, // Render textPaths at the end
      content: `  ${renderTextPath(textPath)}`
    });
  });

  // Add groups - each group gets the minimum z-index of its children
  groups.forEach((group: any) => {
    const groupChildIds = group.children?.map((child: any) => child.id) || [];
    const groupChildElements = elementsByZIndex.filter((element: RenderableElement) => 
      groupChildIds.includes(element.id)
    );
    
    // Find the minimum z-index among group children (this determines where the group renders)
    const minChildZIndex = groupChildElements.length > 0 
      ? Math.min(...groupChildElements.map(el => el.zIndex))
      : 0;
    
    renderItems.push({
      type: 'group',
      zIndex: minChildZIndex,
      content: `  ${renderGroup(group)}`
    });
  });

  // Sort all render items by z-index and render
  renderItems.sort((a, b) => a.zIndex - b.zIndex);
  const allElements = renderItems.map(item => item.content).join('\n');

  // Calculate dynamic viewport based on all elements
  const viewport = calculateOverallViewport(editorState);
  
  // Generate final SVG
  const definitionsSection = generateDefinitions();
  
  const finalSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${formatNumber(viewport.x)} ${formatNumber(viewport.y)} ${formatNumber(viewport.width)} ${formatNumber(viewport.height)}">
${definitionsSection}${allElements}
</svg>`;

  return finalSVG;
};

/**
 * Downloads SVG content as a file
 */
export const downloadSVGFile = (svgContent: string, filename: string = 'svg-export.svg') => {
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
};