import { TextElementType, TextElement, MultilineTextElement, ViewportState } from '../types';
import { elementRefManager } from '../core/ElementRefManager';

export interface TextEditPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
}

/**
 * Calculate the exact screen position for text editing overlay
 */
export const calculateTextEditPosition = (
  textElement: TextElementType,
  viewport: ViewportState
): TextEditPosition | null => {
  try {
    // Find the actual SVG text element using ElementRefManager
    const svgTextElement = elementRefManager.getElementById(textElement.id);
    if (!svgTextElement) {
      console.warn('calculateTextEditPosition: Could not find SVG text element:', textElement.id);
      return null;
    }

    // Get the bounding box of the text element
    const bbox = (svgTextElement as unknown as SVGTextElement).getBBox();
    const rect = svgTextElement.getBoundingClientRect();
    
    // Calculate font size in screen pixels (accounting for zoom)
    const fontSize = (textElement.style.fontSize || 16) * viewport.zoom;
    
    return {
      x: rect.x,
      y: rect.y,
      width: Math.max(rect.width, fontSize * 4), // Minimum width for editing
      height: rect.height,
      fontSize,
      fontFamily: textElement.style.fontFamily || 'Arial, sans-serif'
    };
  } catch (error) {
    console.error('calculateTextEditPosition: Error calculating position:', error);
    return null;
  }
};

/**
 * Apply SVG text styles to HTML input/textarea element
 */
export const syncTextStyles = (
  textElement: TextElementType,
  inputElement: HTMLInputElement | HTMLTextAreaElement,
  viewport: ViewportState
) => {
  const styles = textElement.style;
  
  // Apply font properties
  if (styles.fontFamily) inputElement.style.fontFamily = styles.fontFamily;
  if (styles.fontSize) inputElement.style.fontSize = `${styles.fontSize * viewport.zoom}px`;
  if (styles.fontWeight) inputElement.style.fontWeight = styles.fontWeight.toString();
  if (styles.fontStyle) inputElement.style.fontStyle = styles.fontStyle;
  
  // Apply text color
  if (styles.fill && typeof styles.fill === 'string') {
    inputElement.style.color = styles.fill;
  }
  
  // Apply spacing
  if (styles.letterSpacing !== undefined) inputElement.style.letterSpacing = `${styles.letterSpacing}px`;
  if (styles.wordSpacing !== undefined) inputElement.style.wordSpacing = `${styles.wordSpacing}px`;
  
  // Apply text alignment based on textAnchor
  if (styles.textAnchor) {
    switch (styles.textAnchor) {
      case 'start':
        inputElement.style.textAlign = 'left';
        break;
      case 'middle':
        inputElement.style.textAlign = 'center';
        break;
      case 'end':
        inputElement.style.textAlign = 'right';
        break;
    }
  }
  
  // Apply line height for multiline text
  if (textElement.type === 'multiline-text') {
    const lineHeight = styles.lineHeight;
    inputElement.style.lineHeight = lineHeight ? lineHeight.toString() : '1.2';
  }
};

/**
 * Get the current content of a text element as string or string array
 */
export const getTextElementContent = (textElement: TextElementType): string | string[] => {
  if (textElement.type === 'text') {
    return (textElement as TextElement).content;
  } else if (textElement.type === 'multiline-text') {
    return (textElement as MultilineTextElement).spans.map(span => span.content);
  }
  return '';
};

/**
 * Validate if content is appropriate for the text element type
 */
export const isValidContentForTextType = (
  content: string | string[],
  textType: 'text' | 'multiline-text'
): boolean => {
  if (textType === 'text') {
    return typeof content === 'string';
  } else if (textType === 'multiline-text') {
    return Array.isArray(content);
  }
  return false;
};

/**
 * Convert single line content to multiline format
 */
export const convertToMultilineContent = (content: string): string[] => {
  return content.split('\n').filter(line => line.length > 0);
};

/**
 * Convert multiline content to single line format
 */
export const convertToSingleLineContent = (content: string[]): string => {
  return content.join(' ').trim();
};

/**
 * Escape special characters for display in HTML input
 */
export const escapeTextForInput = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

/**
 * Unescape HTML entities back to normal text
 */
export const unescapeTextFromInput = (text: string): string => {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
};