/**
 * Rounds a number to specified decimal places
 * @param num - Number to round
 * @param precision - Number of decimal places
 * @returns Rounded number
 */
function roundToPrecision(num: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return Math.round(num * factor) / factor;
}

/**
 * Calculates a global viewBox that encompasses all paths and text elements in an SVG element
 * @param svgElement - SVG element containing paths and/or text elements
 * @param precision - Number of decimal places for coordinates (default: 2)
 * @returns ViewBox data with viewBox string, width, and height
 */
export function calculateGlobalViewBox(svgElement: Element, precision: number = 2): { viewBox: string; width: number; height: number } | null {
  if (!svgElement || typeof document === 'undefined') {
    return null;
  }

  try {
    const svgNS = 'http://www.w3.org/2000/svg';
    const tempSvg = document.createElementNS(svgNS, 'svg') as SVGSVGElement;
    tempSvg.style.position = 'absolute';
    tempSvg.style.top = '-9999px';
    tempSvg.style.left = '-9999px';
    tempSvg.style.width = '1px';
    tempSvg.style.height = '1px';
    document.body.appendChild(tempSvg);

    // Process path elements
    const pathNodes = svgElement.querySelectorAll('path');
    pathNodes.forEach((pathNode) => {
      const clonedPath = document.createElementNS(svgNS, 'path');

      const attributesToCopy = [
        'd',
        'fill',
        'stroke',
        'stroke-width',
        'stroke-linecap',
        'stroke-linejoin',
        'stroke-miterlimit',
        'vector-effect',
      ];

      attributesToCopy.forEach((attr) => {
        if (pathNode.hasAttribute(attr)) {
          clonedPath.setAttribute(attr, pathNode.getAttribute(attr)!);
        }
      });

      tempSvg.appendChild(clonedPath);
    });

    // Process text elements
    const textNodes = svgElement.querySelectorAll('text');
    textNodes.forEach((textNode) => {
      const clonedText = document.createElementNS(svgNS, 'text');

      const textAttributesToCopy = [
        'x', 'y', 'dx', 'dy',
        'font-family', 'font-size', 'font-weight', 'font-style',
        'text-anchor', 'dominant-baseline',
        'fill', 'stroke', 'stroke-width',
        'letter-spacing', 'word-spacing',
        'transform'
      ];

      textAttributesToCopy.forEach((attr) => {
        if (textNode.hasAttribute(attr)) {
          clonedText.setAttribute(attr, textNode.getAttribute(attr)!);
        }
      });

      // Copy text content and tspan children
      clonedText.textContent = textNode.textContent;
      const tspanNodes = textNode.querySelectorAll('tspan');
      tspanNodes.forEach((tspanNode) => {
        const clonedTspan = document.createElementNS(svgNS, 'tspan');
        ['x', 'y', 'dx', 'dy'].forEach((attr) => {
          if (tspanNode.hasAttribute(attr)) {
            clonedTspan.setAttribute(attr, tspanNode.getAttribute(attr)!);
          }
        });
        clonedTspan.textContent = tspanNode.textContent;
        clonedText.appendChild(clonedTspan);
      });

      tempSvg.appendChild(clonedText);
    });

    // Process image elements
    const imageNodes = svgElement.querySelectorAll('image');
    imageNodes.forEach((imageNode) => {
      const clonedImage = document.createElementNS(svgNS, 'image');

      const imageAttributesToCopy = [
        'x', 'y', 'width', 'height',
        'href', 'preserveAspectRatio',
        'transform', 'opacity'
      ];

      imageAttributesToCopy.forEach((attr) => {
        if (imageNode.hasAttribute(attr)) {
          clonedImage.setAttribute(attr, imageNode.getAttribute(attr)!);
        }
      });

      tempSvg.appendChild(clonedImage);
    });

    // Process use elements
    const useNodes = svgElement.querySelectorAll('use');
    useNodes.forEach((useNode) => {
      const clonedUse = document.createElementNS(svgNS, 'use');

      const useAttributesToCopy = [
        'x', 'y', 'width', 'height',
        'href', 'transform'
      ];

      useAttributesToCopy.forEach((attr) => {
        if (useNode.hasAttribute(attr)) {
          clonedUse.setAttribute(attr, useNode.getAttribute(attr)!);
        }
      });

      tempSvg.appendChild(clonedUse);
    });

    // Check if we have any elements to measure
    if (pathNodes.length === 0 && textNodes.length === 0 && imageNodes.length === 0 && useNodes.length === 0) {
      document.body.removeChild(tempSvg);
      return null;
    }

    const bbox = tempSvg.getBBox();
    document.body.removeChild(tempSvg);

    if (
      bbox &&
      isFinite(bbox.x) &&
      isFinite(bbox.y) &&
      isFinite(bbox.width) &&
      isFinite(bbox.height) &&
      bbox.width >= 0 &&
      bbox.height >= 0
    ) {
      const padding = Math.max(2, Math.max(bbox.width, bbox.height) * 0.05);

      const vbX = roundToPrecision(bbox.x - padding, precision);
      const vbY = roundToPrecision(bbox.y - padding, precision);
      const vbWidth = roundToPrecision(bbox.width + padding * 2, precision);
      const vbHeight = roundToPrecision(bbox.height + padding * 2, precision);

      return {
        viewBox: `${vbX} ${vbY} ${vbWidth} ${vbHeight}`,
        width: vbWidth,
        height: vbHeight,
      };
    }
  } catch (error) {
    console.error('Error calculating global viewBox:', error);
  }

  return null;
}

/**
 * Calculates viewBox from SVG content string by creating a temporary DOM element
 * @param svgContent - SVG content as string
 * @param precision - Number of decimal places for coordinates (default: 2)
 * @returns ViewBox data or null if calculation fails
 */
export function calculateViewBoxFromSVGString(svgContent: string, precision: number = 2): { viewBox: string; width: number; height: number } | null {
  if (!svgContent || typeof document === 'undefined') {
    return null;
  }

  try {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svgElement = svgDoc.documentElement;
    
    // Check for parsing errors
    const parserError = svgElement.querySelector('parsererror');
    if (parserError) {
      console.error('Error parsing SVG for viewBox calculation:', parserError.textContent);
      return null;
    }

    return calculateGlobalViewBox(svgElement, precision);
  } catch (error) {
    console.error('Error calculating viewBox from SVG string:', error);
    return null;
  }
}
