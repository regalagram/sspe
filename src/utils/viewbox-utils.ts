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
 * Calculates a global viewBox that encompasses all paths in an SVG element
 * @param svgElement - SVG element containing paths
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

    const pathNodes = svgElement.querySelectorAll('path');
    if (pathNodes.length === 0) {
      document.body.removeChild(tempSvg);
      return null;
    }

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
