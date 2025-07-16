import { SVGImage, SVGClipPath, SVGMask, SVGFilter, SVGMarker, SVGSymbol, SVGUse, FilterPrimitiveType, Point } from '../types';

// File handling utilities
export const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const validateImageFile = (file: File): boolean => {
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'];
  return validTypes.includes(file.type);
};

// Image utilities
export const createDefaultImage = (x: number = 0, y: number = 0, href: string = ''): Omit<SVGImage, 'id'> => ({
  type: 'image',
  x,
  y,
  width: 100,
  height: 100,
  href,
  preserveAspectRatio: 'xMidYMid',
  locked: false,
});

export const calculateImageAspectRatio = (naturalWidth: number, naturalHeight: number, maxWidth: number, maxHeight: number) => {
  const aspectRatio = naturalWidth / naturalHeight;
  
  if (naturalWidth > maxWidth || naturalHeight > maxHeight) {
    if (aspectRatio > maxWidth / maxHeight) {
      return { width: maxWidth, height: maxWidth / aspectRatio };
    } else {
      return { width: maxHeight * aspectRatio, height: maxHeight };
    }
  }
  
  return { width: naturalWidth, height: naturalHeight };
};

// ClipPath utilities
export const createDefaultClipPath = (): Omit<SVGClipPath, 'id'> => ({
  type: 'clipPath',
  clipPathUnits: 'userSpaceOnUse',
  children: [],
  locked: false,
});

// Mask utilities
export const createDefaultMask = (): Omit<SVGMask, 'id'> => ({
  type: 'mask',
  maskUnits: 'objectBoundingBox',
  maskContentUnits: 'userSpaceOnUse',
  children: [],
  locked: false,
});

// Filter utilities
export const createDefaultFilter = (): Omit<SVGFilter, 'id'> => ({
  type: 'filter',
  filterUnits: 'objectBoundingBox',
  primitiveUnits: 'userSpaceOnUse',
  primitives: [],
  locked: false,
});

export const createFilterPrimitive = (type: FilterPrimitiveType['type']): FilterPrimitiveType => {
  switch (type) {
    case 'feGaussianBlur':
      return { type: 'feGaussianBlur', stdDeviation: 3 };
    case 'feOffset':
      return { type: 'feOffset', dx: 2, dy: 2 };
    case 'feFlood':
      return { type: 'feFlood', floodColor: '#000000', floodOpacity: 1 };
    case 'feComposite':
      return { type: 'feComposite', operator: 'over' };
    case 'feColorMatrix':
      return { type: 'feColorMatrix', values: '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0' };
    case 'feDropShadow':
      return { type: 'feDropShadow', dx: 2, dy: 2, stdDeviation: 3, floodColor: '#000000', floodOpacity: 0.5 };
    case 'feBlend':
      return { type: 'feBlend', mode: 'normal' };
    case 'feMorphology':
      return { type: 'feMorphology', operator: 'dilate', radius: 1 };
    default:
      throw new Error(`Unknown filter primitive type: ${type}`);
  }
};

// Preset filters
export const createDropShadowFilter = (dx: number = 2, dy: number = 2, blur: number = 3, color: string = '#000000', opacity: number = 0.5): Omit<SVGFilter, 'id'> => ({
  type: 'filter',
  filterUnits: 'objectBoundingBox',
  primitiveUnits: 'userSpaceOnUse',
  primitives: [
    { type: 'feDropShadow', dx, dy, stdDeviation: blur, floodColor: color, floodOpacity: opacity }
  ],
  locked: false,
});

export const createBlurFilter = (stdDeviation: number = 3): Omit<SVGFilter, 'id'> => ({
  type: 'filter',
  filterUnits: 'objectBoundingBox',
  primitiveUnits: 'userSpaceOnUse',
  primitives: [
    { type: 'feGaussianBlur', stdDeviation }
  ],
  locked: false,
});

export const createGrayscaleFilter = (): Omit<SVGFilter, 'id'> => ({
  type: 'filter',
  filterUnits: 'objectBoundingBox',
  primitiveUnits: 'userSpaceOnUse',
  primitives: [
    { type: 'feColorMatrix', values: '0.3 0.6 0.1 0 0 0.3 0.6 0.1 0 0 0.3 0.6 0.1 0 0 0 0 0 1 0' }
  ],
  locked: false,
});

// Marker utilities
export const createDefaultMarker = (): Omit<SVGMarker, 'id'> => ({
  type: 'marker',
  markerUnits: 'userSpaceOnUse',
  refX: 0,
  refY: 2.5,
  markerWidth: 8,
  markerHeight: 8,
  orient: 'auto',
  viewBox: '0 0 10 5',
  children: [], // Empty children so MarkerRenderer will use default arrow path
  locked: false,
});

export const createArrowMarker = (): Omit<SVGMarker, 'id'> => ({
  type: 'marker',
  markerUnits: 'userSpaceOnUse',
  refX: 0,
  refY: 2.5,
  markerWidth: 8,
  markerHeight: 8,
  orient: 'auto',
  viewBox: '0 0 10 5',
  children: [], // Empty children so MarkerRenderer will use default arrow path
  locked: false,
});

// Symbol utilities
export const createDefaultSymbol = (): Omit<SVGSymbol, 'id'> => ({
  type: 'symbol',
  viewBox: '0 0 100 100',
  preserveAspectRatio: 'xMidYMid meet',
  children: [],
  locked: false,
});

// Use utilities
export const createDefaultUse = (href: string, x: number = 0, y: number = 0): Omit<SVGUse, 'id'> => ({
  type: 'use',
  href,
  x,
  y,
  locked: false,
});

// SVG reference utilities
export const formatSVGReference = (id: string): string => `url(#${id})`;

export const parseSVGReference = (reference: string): string | null => {
  const match = reference.match(/^url\(#(.+)\)$/);
  return match ? match[1] : null;
};

// Element positioning utilities
export const moveElement = <T extends { x?: number; y?: number }>(element: T, delta: Point): T => ({
  ...element,
  x: (element.x || 0) + delta.x,
  y: (element.y || 0) + delta.y,
});

export const getElementBounds = (element: SVGImage | SVGUse) => {
  const x = element.x || 0;
  const y = element.y || 0;
  const width = 'width' in element ? element.width || 0 : 0;
  const height = 'height' in element ? element.height || 0 : 0;
  
  return {
    x,
    y,
    width,
    height,
    right: x + width,
    bottom: y + height,
  };
};

// Validation utilities
export const validateFilterPrimitive = (primitive: FilterPrimitiveType): boolean => {
  switch (primitive.type) {
    case 'feGaussianBlur':
      return primitive.stdDeviation >= 0;
    case 'feOffset':
      return typeof primitive.dx === 'number' && typeof primitive.dy === 'number';
    case 'feFlood':
      return Boolean(primitive.floodColor);
    case 'feComposite':
      return ['over', 'in', 'out', 'atop', 'xor', 'arithmetic'].includes(primitive.operator);
    case 'feColorMatrix':
      return Boolean(primitive.values);
    case 'feDropShadow':
      return primitive.stdDeviation >= 0 && Boolean(primitive.floodColor);
    case 'feBlend':
      return ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion'].includes(primitive.mode);
    case 'feMorphology':
      return ['erode', 'dilate'].includes(primitive.operator) && primitive.radius >= 0;
    default:
      return false;
  }
};

export const validateImageDimensions = (width: number, height: number): boolean => {
  return width > 0 && height > 0 && width <= 10000 && height <= 10000;
};

export const validateViewBox = (viewBox: string): boolean => {
  const parts = viewBox.trim().split(/\s+/);
  return parts.length === 4 && parts.every(part => !isNaN(parseFloat(part)));
};