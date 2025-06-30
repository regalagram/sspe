import { SVGCommand, Point } from '../../types';

export interface ShapeTemplate {
  id: string;
  name: string;
  category: 'basic' | 'geometric' | 'arrows' | 'symbols';
  icon: string; // SVG path for the icon
  description: string;
  generateCommands: (center: Point, size: number) => Omit<SVGCommand, 'id'>[];
}

// Helper function to create a rectangle path
const createRectangle = (center: Point, width: number, height: number): Omit<SVGCommand, 'id'>[] => {
  // Ensure we have valid numbers
  const centerX = Number(center.x);
  const centerY = Number(center.y);
  const w = Number(width);
  const h = Number(height);
  
  const x = centerX - w / 2;
  const y = centerY - h / 2;
  
  const commands: Omit<SVGCommand, 'id'>[] = [
    { command: 'M' as const, x, y },
    { command: 'L' as const, x: x + w, y },
    { command: 'L' as const, x: x + w, y: y + h },
    { command: 'L' as const, x, y: y + h },
    { command: 'Z' as const }
  ];
  
  return commands;
};

// Helper function to create an ellipse path using Bézier curves
const createEllipse = (center: Point, width: number, height: number): Omit<SVGCommand, 'id'>[] => {
  const rx = width / 2;
  const ry = height / 2;
  const cx = center.x;
  const cy = center.y;
  
  // Magic number for Bézier curves that approximate a circle/ellipse
  const kappa = 0.5522848;
  const ox = rx * kappa; // control point offset x
  const oy = ry * kappa; // control point offset y
  
  return [
    { command: 'M', x: cx - rx, y: cy },
    { command: 'C', x1: cx - rx, y1: cy - oy, x2: cx - ox, y2: cy - ry, x: cx, y: cy - ry },
    { command: 'C', x1: cx + ox, y1: cy - ry, x2: cx + rx, y2: cy - oy, x: cx + rx, y: cy },
    { command: 'C', x1: cx + rx, y1: cy + oy, x2: cx + ox, y2: cy + ry, x: cx, y: cy + ry },
    { command: 'C', x1: cx - ox, y1: cy + ry, x2: cx - rx, y2: cy + oy, x: cx - rx, y: cy },
    { command: 'Z' }
  ];
};

// Helper function to create a triangle
const createTriangle = (center: Point, size: number): Omit<SVGCommand, 'id'>[] => {
  const height = size * Math.sqrt(3) / 2;
  const topY = center.y - height / 2;
  const bottomY = center.y + height / 2;
  const leftX = center.x - size / 2;
  const rightX = center.x + size / 2;
  
  return [
    { command: 'M', x: center.x, y: topY },
    { command: 'L', x: rightX, y: bottomY },
    { command: 'L', x: leftX, y: bottomY },
    { command: 'Z' }
  ];
};

// Helper function to create a diamond
const createDiamond = (center: Point, size: number): Omit<SVGCommand, 'id'>[] => {
  const half = size / 2;
  return [
    { command: 'M', x: center.x, y: center.y - half },
    { command: 'L', x: center.x + half, y: center.y },
    { command: 'L', x: center.x, y: center.y + half },
    { command: 'L', x: center.x - half, y: center.y },
    { command: 'Z' }
  ];
};

// Helper function to create a hexagon
const createHexagon = (center: Point, size: number): Omit<SVGCommand, 'id'>[] => {
  const radius = size / 2;
  const commands: Omit<SVGCommand, 'id'>[] = [];
  
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60) * Math.PI / 180;
    const x = center.x + radius * Math.cos(angle);
    const y = center.y + radius * Math.sin(angle);
    
    if (i === 0) {
      commands.push({ command: 'M', x, y });
    } else {
      commands.push({ command: 'L', x, y });
    }
  }
  
  commands.push({ command: 'Z' });
  return commands;
};

// Helper function to create a star
const createStar = (center: Point, size: number): Omit<SVGCommand, 'id'>[] => {
  const outerRadius = size / 2;
  const innerRadius = outerRadius * 0.4;
  const commands: Omit<SVGCommand, 'id'>[] = [];
  
  for (let i = 0; i < 10; i++) {
    const angle = (i * 36) * Math.PI / 180;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const x = center.x + radius * Math.cos(angle - Math.PI / 2);
    const y = center.y + radius * Math.sin(angle - Math.PI / 2);
    
    if (i === 0) {
      commands.push({ command: 'M', x, y });
    } else {
      commands.push({ command: 'L', x, y });
    }
  }
  
  commands.push({ command: 'Z' });
  return commands;
};

// Helper function to create a heart
const createHeart = (center: Point, size: number): Omit<SVGCommand, 'id'>[] => {
  // Scale factor based on the original example size (which appears to be about 457px wide)
  const scale = size / 457;
  const cx = center.x;
  const cy = center.y;
  
  // Offset to center the heart shape (original shape seems to start around x=20, y=20)
  const offsetX = -248.5; // Center of the original shape width
  const offsetY = -231.5; // Center of the original shape height
  
  return [
    { command: 'M', x: cx + (140 + offsetX) * scale, y: cy + (20 + offsetY) * scale },
    { command: 'C', 
      x1: cx + (73 + offsetX) * scale, y1: cy + (20 + offsetY) * scale,
      x2: cx + (20 + offsetX) * scale, y2: cy + (74 + offsetY) * scale,
      x: cx + (20 + offsetX) * scale, y: cy + (140 + offsetY) * scale
    },
    { command: 'C', 
      x1: cx + (20 + offsetX) * scale, y1: cy + (275 + offsetY) * scale,
      x2: cx + (156 + offsetX) * scale, y2: cy + (310 + offsetY) * scale,
      x: cx + (248 + offsetX) * scale, y: cy + (443 + offsetY) * scale
    },
    { command: 'C', 
      x1: cx + (336 + offsetX) * scale, y1: cy + (311 + offsetY) * scale,
      x2: cx + (477 + offsetX) * scale, y2: cy + (270 + offsetY) * scale,
      x: cx + (477 + offsetX) * scale, y: cy + (140 + offsetY) * scale
    },
    { command: 'C', 
      x1: cx + (477 + offsetX) * scale, y1: cy + (74 + offsetY) * scale,
      x2: cx + (423 + offsetX) * scale, y2: cy + (20 + offsetY) * scale,
      x: cx + (357 + offsetX) * scale, y: cy + (20 + offsetY) * scale
    },
    { command: 'C', 
      x1: cx + (309 + offsetX) * scale, y1: cy + (20 + offsetY) * scale,
      x2: cx + (267 + offsetX) * scale, y2: cy + (48 + offsetY) * scale,
      x: cx + (248 + offsetX) * scale, y: cy + (89 + offsetY) * scale
    },
    { command: 'C', 
      x1: cx + (229 + offsetX) * scale, y1: cy + (48 + offsetY) * scale,
      x2: cx + (188 + offsetX) * scale, y2: cy + (20 + offsetY) * scale,
      x: cx + (140 + offsetX) * scale, y: cy + (20 + offsetY) * scale
    },
    { command: 'Z' }
  ];
};

// Helper function to create an arrow
const createArrow = (center: Point, size: number): Omit<SVGCommand, 'id'>[] => {
  const width = size;
  const height = size * 0.6;
  const arrowHeadWidth = width * 0.3;
  const shaftHeight = height * 0.4;
  
  const x = center.x - width / 2;
  const y = center.y - height / 2;
  
  return [
    { command: 'M', x: x, y: y + height / 2 - shaftHeight / 2 },
    { command: 'L', x: x + width - arrowHeadWidth, y: y + height / 2 - shaftHeight / 2 },
    { command: 'L', x: x + width - arrowHeadWidth, y: y },
    { command: 'L', x: x + width, y: y + height / 2 },
    { command: 'L', x: x + width - arrowHeadWidth, y: y + height },
    { command: 'L', x: x + width - arrowHeadWidth, y: y + height / 2 + shaftHeight / 2 },
    { command: 'L', x: x, y: y + height / 2 + shaftHeight / 2 },
    { command: 'Z' }
  ];
};

// Helper function to create a cloud
const createCloud = (center: Point, size: number): Omit<SVGCommand, 'id'>[] => {
  const scale = size / 120;
  const cx = center.x;
  const cy = center.y;
  
  return [
    { command: 'M', x: cx - 50 * scale, y: cy + 10 * scale },
    { command: 'C', 
      x1: cx - 50 * scale, y1: cy - 5 * scale,
      x2: cx - 60 * scale, y2: cy - 10 * scale,
      x: cx - 60 * scale, y: cy - 10 * scale
    },
    { command: 'C', 
      x1: cx - 60 * scale, y1: cy - 25 * scale,
      x2: cx - 45 * scale, y2: cy - 25 * scale,
      x: cx - 30 * scale, y: cy - 25 * scale
    },
    { command: 'C', 
      x1: cx - 15 * scale, y1: cy - 35 * scale,
      x2: cx - 7 * scale, y2: cy - 30 * scale,
      x: cx, y: cy - 30 * scale
    },
    { command: 'C', 
      x1: cx + 15 * scale, y1: cy - 35 * scale,
      x2: cx + 30 * scale, y2: cy - 25 * scale,
      x: cx + 30 * scale, y: cy - 25 * scale
    },
    { command: 'C', 
      x1: cx + 45 * scale, y1: cy - 25 * scale,
      x2: cx + 50 * scale, y2: cy - 15 * scale,
      x: cx + 50 * scale, y: cy - 10 * scale
    },
    { command: 'C', 
      x1: cx + 60 * scale, y1: cy - 5 * scale,
      x2: cx + 50 * scale, y2: cy + 5 * scale,
      x: cx + 40 * scale, y: cy + 10 * scale
    },
    { command: 'L', x: cx - 50 * scale, y: cy + 10 * scale },
    { command: 'Z' }
  ];
};

// Helper function to create a pentagon
const createPentagon = (center: Point, size: number): Omit<SVGCommand, 'id'>[] => {
  const radius = size / 2;
  const commands: Omit<SVGCommand, 'id'>[] = [];
  
  for (let i = 0; i < 5; i++) {
    const angle = (i * 72 - 90) * Math.PI / 180; // Start from top
    const x = center.x + radius * Math.cos(angle);
    const y = center.y + radius * Math.sin(angle);
    
    if (i === 0) {
      commands.push({ command: 'M', x, y });
    } else {
      commands.push({ command: 'L', x, y });
    }
  }
  
  commands.push({ command: 'Z' });
  return commands;
};

// Helper function to create an octagon
const createOctagon = (center: Point, size: number): Omit<SVGCommand, 'id'>[] => {
  const radius = size / 2;
  const commands: Omit<SVGCommand, 'id'>[] = [];
  
  for (let i = 0; i < 8; i++) {
    const angle = (i * 45) * Math.PI / 180;
    const x = center.x + radius * Math.cos(angle);
    const y = center.y + radius * Math.sin(angle);
    
    if (i === 0) {
      commands.push({ command: 'M', x, y });
    } else {
      commands.push({ command: 'L', x, y });
    }
  }
  
  commands.push({ command: 'Z' });
  return commands;
};

// Helper function to create an arrow up
const createArrowUp = (center: Point, size: number): Omit<SVGCommand, 'id'>[] => {
  const width = size * 0.6;
  const height = size;
  const arrowHeadHeight = height * 0.3;
  const shaftWidth = width * 0.4;
  
  const x = center.x;
  const y = center.y - height / 2;
  
  return [
    { command: 'M', x: x, y: y },
    { command: 'L', x: x + width / 2, y: y + arrowHeadHeight },
    { command: 'L', x: x + shaftWidth / 2, y: y + arrowHeadHeight },
    { command: 'L', x: x + shaftWidth / 2, y: y + height },
    { command: 'L', x: x - shaftWidth / 2, y: y + height },
    { command: 'L', x: x - shaftWidth / 2, y: y + arrowHeadHeight },
    { command: 'L', x: x - width / 2, y: y + arrowHeadHeight },
    { command: 'Z' }
  ];
};

// Helper function to create an arrow down
const createArrowDown = (center: Point, size: number): Omit<SVGCommand, 'id'>[] => {
  const commands = createArrowUp(center, size);
  // Mirror vertically for down arrow
  return commands.map(cmd => ({
    ...cmd,
    y: cmd.y !== undefined ? center.y * 2 - cmd.y : undefined,
    y1: cmd.y1 !== undefined ? center.y * 2 - cmd.y1 : undefined,
    y2: cmd.y2 !== undefined ? center.y * 2 - cmd.y2 : undefined,
  }));
};

// Helper function to create a plus/cross
const createPlus = (center: Point, size: number): Omit<SVGCommand, 'id'>[] => {
  const width = size * 0.3;
  const length = size;
  const half = length / 2;
  const halfWidth = width / 2;
  
  return [
    // Vertical bar
    { command: 'M', x: center.x - halfWidth, y: center.y - half },
    { command: 'L', x: center.x + halfWidth, y: center.y - half },
    { command: 'L', x: center.x + halfWidth, y: center.y - halfWidth },
    { command: 'L', x: center.x + half, y: center.y - halfWidth },
    { command: 'L', x: center.x + half, y: center.y + halfWidth },
    { command: 'L', x: center.x + halfWidth, y: center.y + halfWidth },
    { command: 'L', x: center.x + halfWidth, y: center.y + half },
    { command: 'L', x: center.x - halfWidth, y: center.y + half },
    { command: 'L', x: center.x - halfWidth, y: center.y + halfWidth },
    { command: 'L', x: center.x - half, y: center.y + halfWidth },
    { command: 'L', x: center.x - half, y: center.y - halfWidth },
    { command: 'L', x: center.x - halfWidth, y: center.y - halfWidth },
    { command: 'Z' }
  ];
};

// Helper function for debugging - creates a simple dot at the click point
const createDebugDot = (center: Point, size: number): Omit<SVGCommand, 'id'>[] => {
  console.log(`DEBUG createDebugDot: center=(${center.x}, ${center.y}), size=${size}`);
  
  // Create a tiny square centered exactly at the click point
  const halfSize = 5; // Fixed 10px dot
  const x = center.x - halfSize;
  const y = center.y - halfSize;
  
  const commands: Omit<SVGCommand, 'id'>[] = [
    { command: 'M' as const, x, y },
    { command: 'L' as const, x: x + halfSize * 2, y },
    { command: 'L' as const, x: x + halfSize * 2, y: y + halfSize * 2 },
    { command: 'L' as const, x, y: y + halfSize * 2 },
    { command: 'Z' as const }
  ];
  
  console.log(`DEBUG createDebugDot: commands=`, commands);
  return commands;
};

export const SHAPE_TEMPLATES: ShapeTemplate[] = [
  // Debug shape - should appear first for testing
  {
    id: 'debug-dot',
    name: 'Debug Dot',
    category: 'basic',
    icon: 'M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0',
    description: 'Debug dot for testing positioning',
    generateCommands: (center, size) => createDebugDot(center, size)
  },
  
  // Basic shapes
  {
    id: 'rectangle',
    name: 'Rectangle',
    category: 'basic',
    icon: 'M2 2h16v12H2z',
    description: 'Basic rectangle shape',
    generateCommands: (center, size) => createRectangle(center, size, size * 0.7)
  },
  {
    id: 'square',
    name: 'Square',
    category: 'basic', 
    icon: 'M2 2h16v16H2z',
    description: 'Perfect square shape',
    generateCommands: (center, size) => createRectangle(center, size, size)
  },
  {
    id: 'circle',
    name: 'Circle',
    category: 'basic',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z',
    description: 'Perfect circle shape',
    generateCommands: (center, size) => createEllipse(center, size, size)
  },
  {
    id: 'ellipse',
    name: 'Ellipse',
    category: 'basic',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z',
    description: 'Oval/ellipse shape',
    generateCommands: (center, size) => createEllipse(center, size, size * 0.6)
  },
  
  // Geometric shapes
  {
    id: 'triangle',
    name: 'Triangle',
    category: 'geometric',
    icon: 'M12 2l8 18H4z',
    description: 'Equilateral triangle',
    generateCommands: (center, size) => createTriangle(center, size)
  },
  {
    id: 'diamond',
    name: 'Diamond',
    category: 'geometric',
    icon: 'M12 2l6 10-6 10-6-10z',
    description: 'Diamond/rhombus shape',
    generateCommands: (center, size) => createDiamond(center, size)
  },
  {
    id: 'hexagon',
    name: 'Hexagon',
    category: 'geometric',
    icon: 'M17.5 3.5L22 12l-4.5 8.5h-11L2 12l4.5-8.5z',
    description: 'Six-sided polygon',
    generateCommands: (center, size) => createHexagon(center, size)
  },
  {
    id: 'star',
    name: 'Star',
    category: 'geometric',
    icon: 'M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z',
    description: 'Five-pointed star',
    generateCommands: (center, size) => createStar(center, size)
  },
  {
    id: 'pentagon',
    name: 'Pentagon',
    category: 'geometric',
    icon: 'M12 2l3.5 5.5h5.5l-4.5 7-4.5-7h-5.5z',
    description: 'Five-sided polygon',
    generateCommands: (center, size) => createPentagon(center, size)
  },
  {
    id: 'octagon',
    name: 'Octagon',
    category: 'geometric',
    icon: 'M7 2h10l7 7v10l-7 7H7l-7-7V9z',
    description: 'Eight-sided polygon',
    generateCommands: (center, size) => createOctagon(center, size)
  },
  
  // Arrows
  {
    id: 'arrow-right',
    name: 'Arrow Right',
    category: 'arrows',
    icon: 'M8 4l8 8-8 8v-6H2V10h6z',
    description: 'Right-pointing arrow',
    generateCommands: (center, size) => createArrow(center, size)
  },
  {
    id: 'arrow-left',
    name: 'Arrow Left',
    category: 'arrows',
    icon: 'M16 4l-8 8 8 8v-6h6v-4h-6z',
    description: 'Left-pointing arrow',
    generateCommands: (center, size) => {
      const commands = createArrow(center, size);
      // Mirror horizontally for left arrow
      return commands.map(cmd => ({
        ...cmd,
        x: cmd.x !== undefined ? center.x * 2 - cmd.x : undefined,
        x1: cmd.x1 !== undefined ? center.x * 2 - cmd.x1 : undefined,
        x2: cmd.x2 !== undefined ? center.x * 2 - cmd.x2 : undefined,
      }));
    }
  },
  {
    id: 'arrow-up',
    name: 'Arrow Up',
    category: 'arrows',
    icon: 'M12 4l8 8h-6v8h-4v-8H4z',
    description: 'Up-pointing arrow',
    generateCommands: (center, size) => createArrowUp(center, size)
  },
  {
    id: 'arrow-down',
    name: 'Arrow Down',
    category: 'arrows',
    icon: 'M12 20l-8-8h6V4h4v8h6z',
    description: 'Down-pointing arrow',
    generateCommands: (center, size) => createArrowDown(center, size)
  },
  
  // Symbols
  {
    id: 'heart',
    name: 'Heart',
    category: 'symbols',
    icon: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
    description: 'Heart symbol',
    generateCommands: (center, size) => createHeart(center, size)
  },
  {
    id: 'cloud',
    name: 'Cloud',
    category: 'symbols',
    icon: 'M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z',
    description: 'Cloud shape',
    generateCommands: (center, size) => createCloud(center, size)
  },
  {
    id: 'checkbox',
    name: 'Checkbox',
    category: 'symbols',
    icon: 'M2 2h16v16H2z M6 10l3 3 6-6',
    description: 'Checkbox with checkmark',
    generateCommands: (center, size) => {
      const boxCommands = createRectangle(center, size, size);
      const checkSize = size * 0.6;
      const checkX = center.x - checkSize / 4;
      const checkY = center.y;
      
      // Add checkmark
      const checkCommands: Omit<SVGCommand, 'id'>[] = [
        { command: 'M', x: checkX - checkSize / 4, y: checkY },
        { command: 'L', x: checkX, y: checkY + checkSize / 4 },
        { command: 'L', x: checkX + checkSize / 2, y: checkY - checkSize / 4 }
      ];
      
      return [...boxCommands, ...checkCommands];
    }
  },
  {
    id: 'plus',
    name: 'Plus',
    category: 'symbols',
    icon: 'M12 4v16m8-8H4',
    description: 'Plus/cross symbol',
    generateCommands: (center, size) => createPlus(center, size)
  },
];

export const getShapesByCategory = (category: ShapeTemplate['category']): ShapeTemplate[] => {
  return SHAPE_TEMPLATES.filter(shape => shape.category === category);
};

export const getShapeById = (id: string): ShapeTemplate | undefined => {
  return SHAPE_TEMPLATES.find(shape => shape.id === id);
};

export const getAllCategories = (): ShapeTemplate['category'][] => {
  return ['basic', 'geometric', 'arrows', 'symbols'];
};
