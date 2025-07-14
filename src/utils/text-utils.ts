import { TextElementType, TextElement, MultilineTextElement } from '../types';

/**
 * Calculate consistent bounding box for text elements
 */
export function calculateTextBounds(text: TextElementType): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const fontSize = text.style?.fontSize || 16;
  
  if (text.type === 'text') {
    // For single-line text, use the actual content length
    const textWidth = text.content.length * fontSize * 0.6;
    const textHeight = fontSize;
    
    return {
      x: text.x,
      y: text.y - textHeight,
      width: textWidth,
      height: textHeight
    };
  } else if (text.type === 'multiline-text') {
    // For multi-line text, calculate based on spans
    const lineHeight = text.style?.lineHeight || fontSize * 1.2;
    const maxWidth = Math.max(...text.spans.map(span => span.content.length)) * fontSize * 0.6;
    const totalHeight = text.spans.length * lineHeight;
    
    return {
      x: text.x,
      y: text.y - fontSize,
      width: maxWidth,
      height: totalHeight
    };
  }
  
  // Fallback for unknown text type (should never happen with proper typing)
  return { x: (text as any).x, y: (text as any).y - fontSize, width: fontSize, height: fontSize };
}

/**
 * Calculate precise bounding box using DOM measurement
 */
export function calculateTextBoundsDOM(text: TextElementType): {
  x: number;
  y: number;
  width: number;
  height: number;
} | null {
  if (typeof document === 'undefined') {
    return calculateTextBounds(text); // Fallback to approximate calculation
  }

  try {
    const svgNS = 'http://www.w3.org/2000/svg';
    const tempSvg = document.createElementNS(svgNS, 'svg') as SVGSVGElement;
    tempSvg.style.position = 'absolute';
    tempSvg.style.top = '-9999px';
    tempSvg.style.left = '-9999px';
    tempSvg.style.width = '1000px'; // Larger to accommodate rotated text
    tempSvg.style.height = '1000px';
    tempSvg.setAttribute('viewBox', '-500 -500 1000 1000'); // Center the coordinate system
    document.body.appendChild(tempSvg);

    const textElement = document.createElementNS(svgNS, 'text');
    textElement.setAttribute('x', text.x.toString());
    textElement.setAttribute('y', text.y.toString());
    
    if (text.style?.fontSize) {
      textElement.setAttribute('font-size', text.style.fontSize.toString());
    }
    if (text.style?.fontFamily) {
      textElement.setAttribute('font-family', text.style.fontFamily);
    }
    if (text.style?.fontWeight) {
      textElement.setAttribute('font-weight', text.style.fontWeight.toString());
    }
    if (text.style?.fontStyle) {
      textElement.setAttribute('font-style', text.style.fontStyle);
    }
    
    // Apply transform if present
    if (text.transform) {
      textElement.setAttribute('transform', text.transform);
    }
    
    if (text.type === 'text') {
      textElement.textContent = text.content;
    } else if (text.type === 'multiline-text') {
      for (const span of text.spans) {
        const tspanElement = document.createElementNS(svgNS, 'tspan');
        tspanElement.textContent = span.content;
        if (span.x !== undefined) tspanElement.setAttribute('x', span.x.toString());
        if (span.y !== undefined) tspanElement.setAttribute('y', span.y.toString());
        if (span.dx !== undefined) tspanElement.setAttribute('dx', span.dx.toString());
        if (span.dy !== undefined) tspanElement.setAttribute('dy', span.dy.toString());
        textElement.appendChild(tspanElement);
      }
    }
    
    tempSvg.appendChild(textElement);
    
    // Get bounding box after transforms are applied
    const bbox = textElement.getBBox();
    document.body.removeChild(tempSvg);
    
    return {
      x: bbox.x,
      y: bbox.y,
      width: bbox.width,
      height: bbox.height
    };
  } catch (error) {
    console.error('Error calculating text bounds with DOM:', error);
    return calculateTextBounds(text); // Fallback
  }
}