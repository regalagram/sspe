import { subPathToString } from './path-utils';

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
  const convertStyleValue = (value: any): string => {
    if (!value || value === 'none') return 'none';
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value.id) {
      return `url(#${value.id})`;
    }
    return 'none';
  };

  // Helper function to render a single path element
  const renderPath = (path: any) => {
    const pathData = path.subPaths.map((subPath: any) => subPathToString(subPath)).join(' ');
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
          `x="${text.x}"`,
          `dy="${index === 0 ? 0 : (style.fontSize || 16) * 1.2}"`,
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
      `x="${image.x}"`,
      `y="${image.y}"`,
      `width="${image.width}"`,
      `height="${image.height}"`,
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
    const attributes = [
      `href="#${use.href.replace('#', '')}"`,
      `x="${use.x}"`,
      `y="${use.y}"`,
      use.width ? `width="${use.width}"` : '',
      use.height ? `height="${use.height}"` : '',
      use.transform ? `transform="${use.transform}"` : '',
      use.style?.clipPath ? `clip-path="${convertStyleValue(use.style.clipPath)}"` : '',
      use.style?.mask ? `mask="${convertStyleValue(use.style.mask)}"` : '',
      use.style?.filter ? `filter="${convertStyleValue(use.style.filter)}"` : '',
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
      textPath.transform ? `transform="${textPath.transform}"` : '',
      style.filter ? `filter="${convertStyleValue(style.filter)}"` : '',
      style.clipPath ? `clip-path="${convertStyleValue(style.clipPath)}"` : '',
      style.mask ? `mask="${convertStyleValue(style.mask)}"` : '',
    ].filter(Boolean).join(' ');

    const textPathAttributes = [
      `href="#${textPath.pathRef}"`,
      textPath.startOffset !== undefined ? `startOffset="${textPath.startOffset}"` : '',
      textPath.method ? `method="${textPath.method}"` : '',
      textPath.spacing ? `spacing="${textPath.spacing}"` : '',
      textPath.side ? `side="${textPath.side}"` : '',
      textPath.textLength ? `textLength="${textPath.textLength}"` : '',
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
            animation.from ? `from="${animation.from}"` : '',
            animation.to ? `to="${animation.to}"` : '',
            animation.by ? `by="${animation.by}"` : '',
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
            animation.from ? `from="${animation.from}"` : '',
            animation.to ? `to="${animation.to}"` : '',
            animation.by ? `by="${animation.by}"` : '',
            getAnimationProperty(animation, 'additive') ? `additive="${getAnimationProperty(animation, 'additive')}"` : '',
            getAnimationProperty(animation, 'accumulate') ? `accumulate="${getAnimationProperty(animation, 'accumulate')}"` : ''
          ].filter(Boolean).join(' ');
          return `      <animateTransform ${transformProps} ${commonProps} />`;
          
        case 'animateMotion':
          return `<animateMotion ${animation.path ? `path="${animation.path}"` : ''} ${animation.rotate ? `rotate="${animation.rotate}"` : ''} ${animation.keyPoints ? `keyPoints="${animation.keyPoints}"` : ''} ${commonProps}>${animation.mpath ? `<mpath href="#${animation.mpath}"/>` : ''}</animateMotion>`;
          
        case 'set':
          const setProps = [
            `attributeName="${animation.attributeName}"`,
            animation.attributeType ? `attributeType="${animation.attributeType}"` : '',
            `to="${animation.to}"`
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
    
    // Check for gradient/pattern references
    if (typeof style.fill === 'object' && style.fill?.id) usedGradientIds.add(style.fill.id);
    if (typeof style.stroke === 'object' && style.stroke?.id) usedGradientIds.add(style.stroke.id);
    
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
            `x1="${gradient.x1}%"`,
            `y1="${gradient.y1}%"`,
            `x2="${gradient.x2}%"`,
            `y2="${gradient.y2}%"`,
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
            `cx="${gradient.cx}%"`,
            `cy="${gradient.cy}%"`,
            `r="${gradient.r}%"`,
            gradient.fx !== undefined ? `fx="${gradient.fx}%"` : '',
            gradient.fy !== undefined ? `fy="${gradient.fy}%"` : '',
            gradient.gradientUnits ? `gradientUnits="${gradient.gradientUnits}"` : '',
            gradient.gradientTransform ? `gradientTransform="${gradient.gradientTransform}"` : '',
            gradient.spreadMethod ? `spreadMethod="${gradient.spreadMethod}"` : ''
          ].filter(Boolean).join(' ');
          
          return `    <radialGradient ${gradientProps}>\n${stops}\n    </radialGradient>`;
        }
        return '';
      }).filter(Boolean);
      
      allDefs.push(...gradientDefs);
    }

    // Add symbols
    if (symbols.length > 0) {
      const symbolDefs = symbols.map((symbol: any) => {
        const symbolAttributes = [
          `id="${symbol.id}"`,
          symbol.viewBox ? `viewBox="${symbol.viewBox}"` : '',
          symbol.width ? `width="${symbol.width}"` : '',
          symbol.height ? `height="${symbol.height}"` : '',
          symbol.preserveAspectRatio ? `preserveAspectRatio="${symbol.preserveAspectRatio}"` : ''
        ].filter(Boolean).join(' ');
        
        return `    <symbol ${symbolAttributes}>\n      ${symbol.content}\n    </symbol>`;
      });
      
      allDefs.push(...symbolDefs);
    }

    // Add markers 
    if (allMarkers.length > 0) {
      const markerDefs = allMarkers.map((marker: any) => {
        const markerAttributes = [
          `id="${marker.id}"`,
          marker.viewBox ? `viewBox="${marker.viewBox}"` : '',
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
          filter.primitiveUnits ? `primitiveUnits="${filter.primitiveUnits}"` : ''
        ].filter(Boolean).join(' ');
        
        return `    <filter ${filterAttributes}>\n      ${filter.content}\n    </filter>`;
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

  // Generate element content
  const pathElements = paths.map((path: any) => `  ${renderPath(path)}`).join('\n');
  const textElements = texts.map((text: any) => `  ${renderText(text)}`).join('\n');
  const textPathElements = textPaths.map((textPath: any) => `  ${renderTextPath(textPath)}`).join('\n');
  const imageElements = images.map((image: any) => `  ${renderImage(image)}`).join('\n');
  const useElements = uses.map((use: any) => `  ${renderUse(use)}`).join('\n');

  // Combine all elements
  const allElements = [
    pathElements,
    textElements, 
    textPathElements,
    imageElements,
    useElements
  ].filter(Boolean).join('\n');

  // Generate final SVG
  const definitionsSection = generateDefinitions();
  
  const finalSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
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