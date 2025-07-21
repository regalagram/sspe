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
    // For multi-line text, calculate based on non-empty spans
    const lineHeight = fontSize * 1.2;
    const nonEmptySpans = text.spans.filter(span => span.content && span.content.trim());
    
    // Handle empty spans case
    if (nonEmptySpans.length === 0) {
      return {
        x: text.x,
        y: text.y - fontSize,
        width: 0,
        height: fontSize
      };
    }
    
    // Find the maximum width among all non-empty spans
    const maxWidth = Math.max(...nonEmptySpans.map(span => span.content.length * fontSize * 0.6));
    const totalHeight = nonEmptySpans.length * lineHeight;
    
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
    tempSvg.style.width = '1px';
    tempSvg.style.height = '1px';
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
      text.spans.forEach((span, index, spans) => {
        // Only add spans with content
        if (span.content && span.content.trim()) {
          // Calculate the actual line number for dy (count non-empty spans before this one)
          const lineNumber = spans.slice(0, index).filter(s => s.content && s.content.trim()).length;
          
          const tspanElement = document.createElementNS(svgNS, 'tspan');
          tspanElement.textContent = span.content;
          tspanElement.setAttribute('x', text.x.toString());
          if (lineNumber === 0) {
            tspanElement.setAttribute('dy', '0');
          } else {
            const fontSize = text.style?.fontSize || 16;
            tspanElement.setAttribute('dy', (fontSize * 1.2).toString());
          }
          textElement.appendChild(tspanElement);
        }
      });
    }
    
    tempSvg.appendChild(textElement);
    
    // Use getBBox for accurate measurement
    try {
      if (text.type === 'multiline-text') {
        // For multiline text, calculate bbox manually by measuring each tspan
        let maxWidth = 0;
        let totalHeight = 0;
        const fontSize = text.style?.fontSize || 16;
        const lineHeight = fontSize * 1.2;
        
        const tspans = textElement.querySelectorAll('tspan');
        const nonEmptySpansCount = tspans.length;
        
        // Measure each tspan individually
        tspans.forEach((tspan) => {
          try {
            const tspanBbox = tspan.getBBox();
            maxWidth = Math.max(maxWidth, tspanBbox.width);
          } catch (e) {
            // Fallback to text length estimation if getBBox fails
            const content = tspan.textContent || '';
            const estimatedWidth = content.length * fontSize * 0.6;
            maxWidth = Math.max(maxWidth, estimatedWidth);
          }
        });
        
        totalHeight = nonEmptySpansCount * lineHeight;
        
        document.body.removeChild(tempSvg);
        
        return {
          x: text.x,
          y: text.y - fontSize,
          width: maxWidth,
          height: totalHeight
        };
      } else {
        // For single line text, use standard getBBox
        const bbox = textElement.getBBox();
        document.body.removeChild(tempSvg);
        
        return {
          x: bbox.x,
          y: bbox.y,
          width: bbox.width,
          height: bbox.height
        };
      }
    } catch (error) {
      console.error('Error getting bbox:', error);
      document.body.removeChild(tempSvg);
      
      // Fallback with better calculation for multiline text
      if (text.type === 'multiline-text') {
        const fontSize = text.style?.fontSize || 16;
        const lineHeight = fontSize * 1.2;
        const nonEmptySpans = text.spans.filter(span => span.content && span.content.trim());
        
        if (nonEmptySpans.length === 0) {
          return {
            x: text.x,
            y: text.y - fontSize,
            width: 0,
            height: fontSize
          };
        }
        
        const longestLine = nonEmptySpans.reduce((max, span) => 
          span.content.length > max ? span.content.length : max, 0);
        const estimatedWidth = longestLine * fontSize * 0.6;
        const estimatedHeight = nonEmptySpans.length * lineHeight;
        
        return {
          x: text.x,
          y: text.y - fontSize,
          width: estimatedWidth,
          height: estimatedHeight
        };
      }
      
      return calculateTextBounds(text); // Fallback
    }
  } catch (error) {
    console.error('Error calculating text bounds with DOM:', error);
    return calculateTextBounds(text); // Fallback
  }
}