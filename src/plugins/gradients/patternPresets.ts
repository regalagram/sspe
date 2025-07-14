import { Pattern } from '../../types';
import { generatePatternId } from '../../utils/gradient-utils';

export interface PatternPreset {
  id: string;
  name: string;
  category: string;
  width: number;
  height: number;
  content: string;
  description?: string;
}

export const patternPresets: PatternPreset[] = [
  // Geometric Patterns
  {
    id: 'checkerboard',
    name: 'Checkerboard',
    category: 'geometric',
    width: 20,
    height: 20,
    content: '<rect width="10" height="10" fill="#000" /><rect x="10" y="10" width="10" height="10" fill="#000" />',
    description: 'Classic checkerboard pattern'
  },
  {
    id: 'stripes-horizontal',
    name: 'Horizontal Stripes',
    category: 'geometric',
    width: 20,
    height: 10,
    content: '<rect width="20" height="5" fill="#000" />',
    description: 'Horizontal stripes'
  },
  {
    id: 'stripes-vertical',
    name: 'Vertical Stripes',
    category: 'geometric',
    width: 10,
    height: 20,
    content: '<rect width="5" height="20" fill="#000" />',
    description: 'Vertical stripes'
  },
  {
    id: 'diagonal-stripes',
    name: 'Diagonal Stripes',
    category: 'geometric',
    width: 20,
    height: 20,
    content: '<path d="M0,20 L20,0 M-5,5 L5,-5 M15,25 L25,15" stroke="#000" stroke-width="2" />',
    description: 'Diagonal stripes pattern'
  },
  {
    id: 'grid',
    name: 'Grid',
    category: 'geometric',
    width: 20,
    height: 20,
    content: '<rect width="20" height="20" fill="none" stroke="#000" stroke-width="1" />',
    description: 'Simple grid pattern'
  },
  {
    id: 'triangles',
    name: 'Triangles',
    category: 'geometric',
    width: 20,
    height: 20,
    content: '<polygon points="10,2 18,16 2,16" fill="#000" />',
    description: 'Triangle pattern'
  },

  // Dots and Circles
  {
    id: 'dots-small',
    name: 'Small Dots',
    category: 'dots',
    width: 15,
    height: 15,
    content: '<circle cx="7.5" cy="7.5" r="2" fill="#000" />',
    description: 'Small dots pattern'
  },
  {
    id: 'dots-large',
    name: 'Large Dots',
    category: 'dots',
    width: 25,
    height: 25,
    content: '<circle cx="12.5" cy="12.5" r="5" fill="#000" />',
    description: 'Large dots pattern'
  },
  {
    id: 'dots-grid',
    name: 'Dot Grid',
    category: 'dots',
    width: 20,
    height: 20,
    content: '<circle cx="5" cy="5" r="1.5" fill="#000" /><circle cx="15" cy="5" r="1.5" fill="#000" /><circle cx="5" cy="15" r="1.5" fill="#000" /><circle cx="15" cy="15" r="1.5" fill="#000" />',
    description: 'Grid of dots'
  },
  {
    id: 'concentric-circles',
    name: 'Concentric Circles',
    category: 'dots',
    width: 30,
    height: 30,
    content: '<circle cx="15" cy="15" r="12" fill="none" stroke="#000" stroke-width="1" /><circle cx="15" cy="15" r="8" fill="none" stroke="#000" stroke-width="1" /><circle cx="15" cy="15" r="4" fill="#000" />',
    description: 'Concentric circles'
  },

  // Crosshatch and Lines
  {
    id: 'crosshatch',
    name: 'Crosshatch',
    category: 'lines',
    width: 20,
    height: 20,
    content: '<path d="M0,0 L20,20 M0,20 L20,0" stroke="#000" stroke-width="1" />',
    description: 'Crosshatch pattern'
  },
  {
    id: 'diagonal-grid',
    name: 'Diagonal Grid',
    category: 'lines',
    width: 20,
    height: 20,
    content: '<path d="M0,0 L20,20 M0,20 L20,0 M-10,10 L10,-10 M10,30 L30,10" stroke="#000" stroke-width="1" />',
    description: 'Diagonal grid pattern'
  },
  {
    id: 'zigzag',
    name: 'Zigzag',
    category: 'lines',
    width: 20,
    height: 10,
    content: '<path d="M0,8 L5,2 L10,8 L15,2 L20,8" stroke="#000" stroke-width="2" fill="none" />',
    description: 'Zigzag pattern'
  },

  // Decorative Patterns
  {
    id: 'stars',
    name: 'Stars',
    category: 'decorative',
    width: 25,
    height: 25,
    content: '<polygon points="12.5,2 14.5,8.5 21,8.5 16,12.5 18,19 12.5,15.5 7,19 9,12.5 4,8.5 10.5,8.5" fill="#000" />',
    description: 'Star pattern'
  },
  {
    id: 'hearts',
    name: 'Hearts',
    category: 'decorative',
    width: 20,
    height: 20,
    content: '<path d="M10,17 C10,17 4,12 4,8 C4,6 6,4 8,4 C9,4 10,5 10,6 C10,5 11,4 12,4 C14,4 16,6 16,8 C16,12 10,17 10,17 Z" fill="#000" />',
    description: 'Heart pattern'
  },
  {
    id: 'flowers',
    name: 'Flowers',
    category: 'decorative',
    width: 24,
    height: 24,
    content: '<circle cx="12" cy="6" r="3" fill="#000" /><circle cx="18" cy="12" r="3" fill="#000" /><circle cx="12" cy="18" r="3" fill="#000" /><circle cx="6" cy="12" r="3" fill="#000" /><circle cx="12" cy="12" r="2" fill="#000" />',
    description: 'Flower pattern'
  },

  // Texture Patterns
  {
    id: 'brick',
    name: 'Brick',
    category: 'texture',
    width: 30,
    height: 20,
    content: '<rect width="30" height="10" fill="none" stroke="#000" stroke-width="1" /><rect y="10" width="30" height="10" fill="none" stroke="#000" stroke-width="1" /><line x1="15" y1="0" x2="15" y2="10" stroke="#000" stroke-width="1" /><line x1="7.5" y1="10" x2="7.5" y2="20" stroke="#000" stroke-width="1" /><line x1="22.5" y1="10" x2="22.5" y2="20" stroke="#000" stroke-width="1" />',
    description: 'Brick wall pattern'
  },
  {
    id: 'honeycomb',
    name: 'Honeycomb',
    category: 'texture',
    width: 30,
    height: 26,
    content: '<polygon points="7.5,0 22.5,0 30,13 22.5,26 7.5,26 0,13" fill="none" stroke="#000" stroke-width="1" />',
    description: 'Honeycomb hexagon pattern'
  },
  {
    id: 'waves',
    name: 'Waves',
    category: 'texture',
    width: 40,
    height: 20,
    content: '<path d="M0,10 Q10,0 20,10 T40,10" stroke="#000" stroke-width="2" fill="none" />',
    description: 'Wave pattern'
  }
];

export const getPatternCategories = (): string[] => {
  const categories = new Set(patternPresets.map(preset => preset.category));
  return Array.from(categories);
};

export const getPatternsByCategory = (category: string): PatternPreset[] => {
  return patternPresets.filter(preset => preset.category === category);
};

export const getCategoryDisplayName = (category: string): string => {
  const displayNames: Record<string, string> = {
    geometric: 'Geometric',
    dots: 'Dots & Circles',
    lines: 'Lines & Crosshatch',
    decorative: 'Decorative',
    texture: 'Textures'
  };
  return displayNames[category] || category;
};

export const createPatternFromPreset = (preset: PatternPreset): Pattern => {
  return {
    type: 'pattern',
    id: generatePatternId(),
    width: preset.width,
    height: preset.height,
    content: preset.content,
    patternUnits: 'userSpaceOnUse'
  };
};