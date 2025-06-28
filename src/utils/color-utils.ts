/**
 * Utility functions for color conversion and manipulation
 */

// CSS named colors mapping to hex values
const CSS_COLOR_NAMES: Record<string, string> = {
  // Basic colors
  'black': '#000000',
  'white': '#ffffff',
  'red': '#ff0000',
  'green': '#008000',
  'blue': '#0000ff',
  'yellow': '#ffff00',
  'cyan': '#00ffff',
  'magenta': '#ff00ff',
  'orange': '#ffa500',
  'purple': '#800080',
  'pink': '#ffc0cb',
  'brown': '#a52a2a',
  'gray': '#808080',
  'grey': '#808080',
  
  // Extended colors
  'lime': '#00ff00',
  'maroon': '#800000',
  'navy': '#000080',
  'olive': '#808000',
  'silver': '#c0c0c0',
  'teal': '#008080',
  'aqua': '#00ffff',
  'fuchsia': '#ff00ff',
  
  // Additional common colors
  'aliceblue': '#f0f8ff',
  'antiquewhite': '#faebd7',
  'aquamarine': '#7fffd4',
  'azure': '#f0ffff',
  'beige': '#f5f5dc',
  'bisque': '#ffe4c4',
  'blanchedalmond': '#ffebcd',
  'blueviolet': '#8a2be2',
  'burlywood': '#deb887',
  'cadetblue': '#5f9ea0',
  'chartreuse': '#7fff00',
  'chocolate': '#d2691e',
  'coral': '#ff7f50',
  'cornflowerblue': '#6495ed',
  'cornsilk': '#fff8dc',
  'crimson': '#dc143c',
  'darkblue': '#00008b',
  'darkcyan': '#008b8b',
  'darkgoldenrod': '#b8860b',
  'darkgray': '#a9a9a9',
  'darkgrey': '#a9a9a9',
  'darkgreen': '#006400',
  'darkkhaki': '#bdb76b',
  'darkmagenta': '#8b008b',
  'darkolivegreen': '#556b2f',
  'darkorange': '#ff8c00',
  'darkorchid': '#9932cc',
  'darkred': '#8b0000',
  'darksalmon': '#e9967a',
  'darkseagreen': '#8fbc8f',
  'darkslateblue': '#483d8b',
  'darkslategray': '#2f4f4f',
  'darkslategrey': '#2f4f4f',
  'darkturquoise': '#00ced1',
  'darkviolet': '#9400d3',
  'deeppink': '#ff1493',
  'deepskyblue': '#00bfff',
  'dimgray': '#696969',
  'dimgrey': '#696969',
  'dodgerblue': '#1e90ff',
  'firebrick': '#b22222',
  'floralwhite': '#fffaf0',
  'forestgreen': '#228b22',
  'gainsboro': '#dcdcdc',
  'ghostwhite': '#f8f8ff',
  'gold': '#ffd700',
  'goldenrod': '#daa520',
  'greenyellow': '#adff2f',
  'honeydew': '#f0fff0',
  'hotpink': '#ff69b4',
  'indianred': '#cd5c5c',
  'indigo': '#4b0082',
  'ivory': '#fffff0',
  'khaki': '#f0e68c',
  'lavender': '#e6e6fa',
  'lavenderblush': '#fff0f5',
  'lawngreen': '#7cfc00',
  'lemonchiffon': '#fffacd',
  'lightblue': '#add8e6',
  'lightcoral': '#f08080',
  'lightcyan': '#e0ffff',
  'lightgoldenrodyellow': '#fafad2',
  'lightgray': '#d3d3d3',
  'lightgrey': '#d3d3d3',
  'lightgreen': '#90ee90',
  'lightpink': '#ffb6c1',
  'lightsalmon': '#ffa07a',
  'lightseagreen': '#20b2aa',
  'lightskyblue': '#87cefa',
  'lightslategray': '#778899',
  'lightslategrey': '#778899',
  'lightsteelblue': '#b0c4de',
  'lightyellow': '#ffffe0',
  'limegreen': '#32cd32',
  'linen': '#faf0e6',
  'mediumaquamarine': '#66cdaa',
  'mediumblue': '#0000cd',
  'mediumorchid': '#ba55d3',
  'mediumpurple': '#9370db',
  'mediumseagreen': '#3cb371',
  'mediumslateblue': '#7b68ee',
  'mediumspringgreen': '#00fa9a',
  'mediumturquoise': '#48d1cc',
  'mediumvioletred': '#c71585',
  'midnightblue': '#191970',
  'mintcream': '#f5fffa',
  'mistyrose': '#ffe4e1',
  'moccasin': '#ffe4b5',
  'navajowhite': '#ffdead',
  'oldlace': '#fdf5e6',
  'olivedrab': '#6b8e23',
  'orangered': '#ff4500',
  'orchid': '#da70d6',
  'palegoldenrod': '#eee8aa',
  'palegreen': '#98fb98',
  'paleturquoise': '#afeeee',
  'palevioletred': '#db7093',
  'papayawhip': '#ffefd5',
  'peachpuff': '#ffdab9',
  'peru': '#cd853f',
  'plum': '#dda0dd',
  'powderblue': '#b0e0e6',
  'rosybrown': '#bc8f8f',
  'royalblue': '#4169e1',
  'saddlebrown': '#8b4513',
  'salmon': '#fa8072',
  'sandybrown': '#f4a460',
  'seagreen': '#2e8b57',
  'seashell': '#fff5ee',
  'sienna': '#a0522d',
  'skyblue': '#87ceeb',
  'slateblue': '#6a5acd',
  'slategray': '#708090',
  'slategrey': '#708090',
  'snow': '#fffafa',
  'springgreen': '#00ff7f',
  'steelblue': '#4682b4',
  'tan': '#d2b48c',
  'thistle': '#d8bfd8',
  'tomato': '#ff6347',
  'turquoise': '#40e0d0',
  'violet': '#ee82ee',
  'wheat': '#f5deb3',
  'whitesmoke': '#f5f5f5',
  'yellowgreen': '#9acd32'
};

/**
 * Result of parsing a color with opacity
 */
export interface ColorWithOpacity {
  color: string;
  opacity?: number;
}

/**
 * Convert color string to hex and extract opacity if present
 * @param color - Color string in various formats (hex, rgb, rgba, hsl, etc.)
 * @returns Object with hex color and optional opacity value
 */
export function parseColorWithOpacity(color: string): ColorWithOpacity {
  if (!color || color === 'none' || color === 'transparent') {
    return { color };
  }
  
  // Handle rgba() format - extract both color and opacity
  const rgbaMatch = color.match(/rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)/);
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1], 10);
    const g = parseInt(rgbaMatch[2], 10);
    const b = parseInt(rgbaMatch[3], 10);
    const alpha = parseFloat(rgbaMatch[4]);
    const hexColor = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    return { 
      color: hexColor, 
      opacity: alpha >= 0 && alpha <= 1 ? alpha : undefined 
    };
  }
  
  // Handle hsla() format - extract both color and opacity
  const hslaMatch = color.match(/hsla\s*\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*,\s*([0-9.]+)\s*\)/);
  if (hslaMatch) {
    const h = parseInt(hslaMatch[1], 10);
    const s = parseInt(hslaMatch[2], 10) / 100;
    const l = parseInt(hslaMatch[3], 10) / 100;
    const alpha = parseFloat(hslaMatch[4]);
    const { r, g, b } = hslToRgb(h, s, l);
    const hexColor = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    return { 
      color: hexColor, 
      opacity: alpha >= 0 && alpha <= 1 ? alpha : undefined 
    };
  }
  
  // For other formats, use the existing convertRgbToHex function
  return { color: convertRgbToHex(color) };
}

/**
 * Convert RGB color values to hexadecimal format
 * @param color - Color string in various formats
 * @returns Hexadecimal color string or original if not convertible
 */
export function convertRgbToHex(color: string): string {
  if (!color || color === 'none' || color === 'transparent') return color;
  
  // Handle CSS color names first
  const hexFromName = colorNameToHex(color);
  if (hexFromName) {
    return hexFromName;
  }
  
  // Handle rgb() format
  const rgbMatch = color.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }
  
  // Handle rgba() format
  const rgbaMatch = color.match(/rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)/);
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1], 10);
    const g = parseInt(rgbaMatch[2], 10);
    const b = parseInt(rgbaMatch[3], 10);
    // For RGBA, we'll return RGB hex and ignore alpha for now
    // In a more complete implementation, you might want to handle alpha separately
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }
  
  // Handle hsl() format
  const hslMatch = color.match(/hsl\s*\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/);
  if (hslMatch) {
    const h = parseInt(hslMatch[1], 10);
    const s = parseInt(hslMatch[2], 10) / 100;
    const l = parseInt(hslMatch[3], 10) / 100;
    const { r, g, b } = hslToRgb(h, s, l);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }
  
  // If already hex, return as-is
  if (color.startsWith('#')) {
    return color;
  }
  
  // Fallback for unknown formats
  return color;
}

/**
 * Convert HSL to RGB
 */
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360;
  
  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  
  let r: number, g: number, b: number;
  
  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

/**
 * Check if a color string is a valid hex color
 */
export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

/**
 * Convert hex color to RGB values
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!isValidHexColor(hex)) return null;
  
  const cleanHex = hex.slice(1);
  
  if (cleanHex.length === 3) {
    // Short hex format
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return { r, g, b };
  } else {
    // Full hex format
    const r = parseInt(cleanHex.slice(0, 2), 16);
    const g = parseInt(cleanHex.slice(2, 4), 16);
    const b = parseInt(cleanHex.slice(4, 6), 16);
    return { r, g, b };
  }
}

/**
 * Get contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number {
  const getLuminance = (color: string): number => {
    const rgb = hexToRgb(convertRgbToHex(color));
    if (!rgb) return 0;
    
    const { r, g, b } = rgb;
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };
  
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Convert CSS color name to hex value
 * @param colorName - CSS color name (case insensitive)
 * @returns Hex color string or null if not found
 */
export function colorNameToHex(colorName: string): string | null {
  const normalizedName = colorName.toLowerCase().trim();
  return CSS_COLOR_NAMES[normalizedName] || null;
}
