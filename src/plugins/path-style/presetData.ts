import { PathStyle } from '../../types';

export interface StylePreset {
  id: string;
  name: string;
  description: string;
  style: PathStyle;
  category: 'basic' | 'outline' | 'special' | 'artistic';
}

export const stylePresets: StylePreset[] = [
  // Basic Fills
  {
    id: 'black-fill',
    name: 'Black Fill',
    description: 'Solid black fill, no stroke',
    category: 'basic',
    style: {
      fill: '#000000',
      fillOpacity: 1,
      stroke: 'none',
    }
  },
  {
    id: 'white-fill',
    name: 'White Fill',
    description: 'Solid white fill, no stroke',
    category: 'basic',
    style: {
      fill: '#ffffff',
      fillOpacity: 1,
      stroke: 'none',
    }
  },
  {
    id: 'red-fill',
    name: 'Red Fill',
    description: 'Solid red fill, no stroke',
    category: 'basic',
    style: {
      fill: '#ff0000',
      fillOpacity: 1,
      stroke: 'none',
    }
  },
  {
    id: 'blue-fill',
    name: 'Blue Fill',
    description: 'Solid blue fill, no stroke',
    category: 'basic',
    style: {
      fill: '#0066ff',
      fillOpacity: 1,
      stroke: 'none',
    }
  },
  {
    id: 'green-fill',
    name: 'Green Fill',
    description: 'Solid green fill, no stroke',
    category: 'basic',
    style: {
      fill: '#00cc00',
      fillOpacity: 1,
      stroke: 'none',
    }
  },

  // Outline Styles
  {
    id: 'black-outline',
    name: 'Black Outline',
    description: 'Black stroke, no fill',
    category: 'outline',
    style: {
      fill: 'none',
      stroke: '#000000',
      strokeWidth: 2,
      strokeOpacity: 1,
    }
  },
  {
    id: 'thin-outline',
    name: 'Thin Outline',
    description: 'Thin black stroke, no fill',
    category: 'outline',
    style: {
      fill: 'none',
      stroke: '#000000',
      strokeWidth: 1,
      strokeOpacity: 1,
    }
  },
  {
    id: 'thick-outline',
    name: 'Thick Outline',
    description: 'Thick black stroke, no fill',
    category: 'outline',
    style: {
      fill: 'none',
      stroke: '#000000',
      strokeWidth: 4,
      strokeOpacity: 1,
    }
  },
  {
    id: 'colored-outline',
    name: 'Blue Outline',
    description: 'Blue stroke, no fill',
    category: 'outline',
    style: {
      fill: 'none',
      stroke: '#0066ff',
      strokeWidth: 2,
      strokeOpacity: 1,
    }
  },

  // Special Effects
  {
    id: 'dashed-line',
    name: 'Dashed Line',
    description: 'Dashed black stroke',
    category: 'special',
    style: {
      fill: 'none',
      stroke: '#000000',
      strokeWidth: 2,
      strokeOpacity: 1,
      strokeDasharray: '5,5',
      strokeLinecap: 'round',
    }
  },
  {
    id: 'dotted-line',
    name: 'Dotted Line',
    description: 'Dotted black stroke',
    category: 'special',
    style: {
      fill: 'none',
      stroke: '#000000',
      strokeWidth: 2,
      strokeOpacity: 1,
      strokeDasharray: '2,3',
      strokeLinecap: 'round',
    }
  },
  {
    id: 'semi-transparent',
    name: 'Semi-transparent',
    description: 'Black fill with 50% opacity',
    category: 'special',
    style: {
      fill: '#000000',
      fillOpacity: 0.5,
      stroke: 'none',
    }
  },
  {
    id: 'outlined-fill',
    name: 'Outlined Fill',
    description: 'Black fill with white outline',
    category: 'special',
    style: {
      fill: '#000000',
      fillOpacity: 1,
      stroke: '#ffffff',
      strokeWidth: 2,
      strokeOpacity: 1,
    }
  },

  // Artistic Styles
  {
    id: 'sketch-style',
    name: 'Sketch Style',
    description: 'Hand-drawn sketch appearance',
    category: 'artistic',
    style: {
      fill: 'none',
      stroke: '#333333',
      strokeWidth: 1.5,
      strokeOpacity: 0.8,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    }
  },
  {
    id: 'watercolor',
    name: 'Watercolor',
    description: 'Soft watercolor effect',
    category: 'artistic',
    style: {
      fill: '#4a90e2',
      fillOpacity: 0.3,
      stroke: '#2171b5',
      strokeWidth: 1,
      strokeOpacity: 0.6,
    }
  },
  {
    id: 'neon-glow',
    name: 'Neon Glow',
    description: 'Bright neon effect',
    category: 'artistic',
    style: {
      fill: 'none',
      stroke: '#00ff00',
      strokeWidth: 3,
      strokeOpacity: 1,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    }
  },
  {
    id: 'vintage',
    name: 'Vintage',
    description: 'Vintage sepia tone',
    category: 'artistic',
    style: {
      fill: '#8b7355',
      fillOpacity: 0.7,
      stroke: '#654321',
      strokeWidth: 1,
      strokeOpacity: 0.8,
    }
  },

  // Additional useful presets
  {
    id: 'invisible',
    name: 'Invisible',
    description: 'No fill, no stroke',
    category: 'special',
    style: {
      fill: 'none',
      stroke: 'none',
    }
  },
  {
    id: 'construction-line',
    name: 'Construction Line',
    description: 'Light gray dashed line for construction',
    category: 'special',
    style: {
      fill: 'none',
      stroke: '#cccccc',
      strokeWidth: 1,
      strokeOpacity: 0.5,
      strokeDasharray: '3,3',
    }
  },
  {
    id: 'highlight',
    name: 'Highlight',
    description: 'Yellow highlight fill',
    category: 'basic',
    style: {
      fill: '#ffff00',
      fillOpacity: 0.7,
      stroke: 'none',
    }
  },
  {
    id: 'danger',
    name: 'Danger',
    description: 'Red alert style',
    category: 'special',
    style: {
      fill: '#ff4444',
      fillOpacity: 0.8,
      stroke: '#cc0000',
      strokeWidth: 2,
    }
  },
  {
    id: 'success',
    name: 'Success',
    description: 'Green success style',
    category: 'special',
    style: {
      fill: '#44ff44',
      fillOpacity: 0.8,
      stroke: '#00cc00',
      strokeWidth: 2,
    }
  },
  {
    id: 'blueprint',
    name: 'Blueprint',
    description: 'Technical drawing style',
    category: 'artistic',
    style: {
      fill: 'none',
      stroke: '#4a90e2',
      strokeWidth: 1,
      strokeOpacity: 1,
      strokeLinecap: 'round',
    }
  }
];

export const getPresetsByCategory = (category: StylePreset['category']): StylePreset[] => {
  return stylePresets.filter(preset => preset.category === category);
};

export const getAllCategories = (): StylePreset['category'][] => {
  return ['basic', 'outline', 'special', 'artistic'];
};

export const getCategoryDisplayName = (category: StylePreset['category']): string => {
  switch (category) {
    case 'basic': return 'Basic';
    case 'outline': return 'Outline';
    case 'special': return 'Special';
    case 'artistic': return 'Artistic';
    default: return category;
  }
};