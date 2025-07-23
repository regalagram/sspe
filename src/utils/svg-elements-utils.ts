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
  maskUnits: 'userSpaceOnUse',
  maskContentUnits: 'userSpaceOnUse',
  x: 0,
  y: 0,
  width: 100,
  height: 100,
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
      return { type: 'feColorMatrix', colorMatrixType: 'matrix', values: '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0' };
    case 'feDropShadow':
      return { type: 'feDropShadow', dx: 2, dy: 2, stdDeviation: 3, floodColor: '#000000', floodOpacity: 0.5 };
    case 'feBlend':
      return { type: 'feBlend', mode: 'normal' };
    case 'feMorphology':
      return { type: 'feMorphology', operator: 'dilate', radius: 1 };
    case 'feConvolveMatrix':
      return { type: 'feConvolveMatrix', order: '3', kernelMatrix: '0 -1 0 -1 5 -1 0 -1 0' };
    case 'feComponentTransfer':
      return { type: 'feComponentTransfer' };
    case 'feDiffuseLighting':
      return { 
        type: 'feDiffuseLighting', 
        surfaceScale: 1, 
        diffuseConstant: 1, 
        lightColor: '#ffffff',
        lightSource: { type: 'feDistantLight', azimuth: 45, elevation: 45 }
      };
    case 'feSpecularLighting':
      return { 
        type: 'feSpecularLighting', 
        surfaceScale: 1, 
        specularConstant: 1, 
        specularExponent: 20, 
        lightColor: '#ffffff',
        lightSource: { type: 'feDistantLight', azimuth: 45, elevation: 45 }
      };
    case 'feDisplacementMap':
      return { type: 'feDisplacementMap', scale: 50, xChannelSelector: 'R', yChannelSelector: 'G' };
    case 'feTurbulence':
      return { type: 'feTurbulence', baseFrequency: '0.04', numOctaves: 2, turbulenceType: 'turbulence' };
    case 'feImage':
      return { type: 'feImage', preserveAspectRatio: 'xMidYMid meet' };
    case 'feTile':
      return { type: 'feTile' };
    case 'feFuncR':
      return { type: 'feFuncR', funcType: 'identity' };
    case 'feFuncG':
      return { type: 'feFuncG', funcType: 'identity' };
    case 'feFuncB':
      return { type: 'feFuncB', funcType: 'identity' };
    case 'feFuncA':
      return { type: 'feFuncA', funcType: 'identity' };
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
    { type: 'feColorMatrix', colorMatrixType: 'matrix', values: '0.3 0.6 0.1 0 0 0.3 0.6 0.1 0 0 0.3 0.6 0.1 0 0 0 0 0 1 0' }
  ],
  locked: false,
});

// Filtros adicionales preconfigurados
export const createSepiaFilter = (): Omit<SVGFilter, 'id'> => ({
  type: 'filter',
  filterUnits: 'objectBoundingBox',
  primitiveUnits: 'userSpaceOnUse',
  primitives: [
    { type: 'feColorMatrix', colorMatrixType: 'matrix', values: '0.393 0.769 0.189 0 0 0.349 0.686 0.168 0 0 0.272 0.534 0.131 0 0 0 0 0 1 0' }
  ],
  locked: false,
});

export const createInvertFilter = (): Omit<SVGFilter, 'id'> => ({
  type: 'filter',
  filterUnits: 'objectBoundingBox',
  primitiveUnits: 'userSpaceOnUse',
  primitives: [
    { type: 'feColorMatrix', colorMatrixType: 'matrix', values: '-1 0 0 0 1 0 -1 0 0 1 0 0 -1 0 1 0 0 0 1 0' }
  ],
  locked: false,
});

export const createBrightnessFilter = (brightness: number = 1.2): Omit<SVGFilter, 'id'> => ({
  type: 'filter',
  filterUnits: 'objectBoundingBox',
  primitiveUnits: 'userSpaceOnUse',
  primitives: [
    { type: 'feColorMatrix', colorMatrixType: 'matrix', values: `${brightness} 0 0 0 0 0 ${brightness} 0 0 0 0 0 ${brightness} 0 0 0 0 0 1 0` }
  ],
  locked: false,
});

export const createContrastFilter = (contrast: number = 1.5): Omit<SVGFilter, 'id'> => ({
  type: 'filter',
  filterUnits: 'objectBoundingBox',
  primitiveUnits: 'userSpaceOnUse',
  primitives: [
    { type: 'feColorMatrix', colorMatrixType: 'matrix', values: `${contrast} 0 0 0 ${0.5 * (1 - contrast)} 0 ${contrast} 0 0 ${0.5 * (1 - contrast)} 0 0 ${contrast} 0 ${0.5 * (1 - contrast)} 0 0 0 1 0` }
  ],
  locked: false,
});

export const createSaturateFilter = (saturation: number = 1.5): Omit<SVGFilter, 'id'> => ({
  type: 'filter',
  filterUnits: 'objectBoundingBox',
  primitiveUnits: 'userSpaceOnUse',
  primitives: [
    { type: 'feColorMatrix', colorMatrixType: 'saturate', values: saturation.toString() }
  ],
  locked: false,
});

export const createHueRotateFilter = (angle: number = 90): Omit<SVGFilter, 'id'> => ({
  type: 'filter',
  filterUnits: 'objectBoundingBox',
  primitiveUnits: 'userSpaceOnUse',
  primitives: [
    { type: 'feColorMatrix', colorMatrixType: 'hueRotate', values: angle.toString() }
  ],
  locked: false,
});

export const createEmbossFilter = (): Omit<SVGFilter, 'id'> => ({
  type: 'filter',
  filterUnits: 'objectBoundingBox',
  primitiveUnits: 'userSpaceOnUse',
  primitives: [
    { type: 'feConvolveMatrix', order: '3', kernelMatrix: '-2 -1 0 -1 1 1 0 1 2' }
  ],
  locked: false,
});

export const createSharpenFilter = (): Omit<SVGFilter, 'id'> => ({
  type: 'filter',
  filterUnits: 'objectBoundingBox',
  primitiveUnits: 'userSpaceOnUse',
  primitives: [
    { type: 'feConvolveMatrix', order: '3', kernelMatrix: '0 -1 0 -1 5 -1 0 -1 0' }
  ],
  locked: false,
});

export const createEdgeDetectFilter = (): Omit<SVGFilter, 'id'> => ({
  type: 'filter',
  filterUnits: 'objectBoundingBox',
  primitiveUnits: 'userSpaceOnUse',
  primitives: [
    { type: 'feConvolveMatrix', order: '3', kernelMatrix: '-1 -1 -1 -1 8 -1 -1 -1 -1' }
  ],
  locked: false,
});

export const createGlowFilter = (color: string = '#ffff00', intensity: number = 3): Omit<SVGFilter, 'id'> => ({
  type: 'filter',
  filterUnits: 'objectBoundingBox',
  primitiveUnits: 'userSpaceOnUse',
  primitives: [
    { type: 'feMorphology', operator: 'dilate', radius: 2, result: 'dilated' },
    { type: 'feGaussianBlur', stdDeviation: intensity, in: 'dilated', result: 'blurred' },
    { type: 'feFlood', floodColor: color, floodOpacity: 0.8, result: 'glowColor' },
    { type: 'feComposite', operator: 'in', in: 'glowColor', in2: 'blurred', result: 'coloredGlow' },
    { type: 'feComposite', operator: 'over', in: 'SourceGraphic', in2: 'coloredGlow' }
  ],
  locked: false,
});

export const createBevelFilter = (): Omit<SVGFilter, 'id'> => ({
  type: 'filter',
  filterUnits: 'objectBoundingBox',
  primitiveUnits: 'userSpaceOnUse',
  primitives: [
    { type: 'feGaussianBlur', stdDeviation: 3, in: 'SourceAlpha', result: 'blur' },
    { type: 'feOffset', dx: 2, dy: 2, in: 'blur', result: 'offsetBlur' },
    { type: 'feSpecularLighting', 
      surfaceScale: 5, 
      specularConstant: 0.75, 
      specularExponent: 20, 
      lightColor: '#bbbbbb',
      in: 'blur',
      result: 'specOut',
      lightSource: { type: 'feDistantLight', azimuth: 45, elevation: 45 }
    },
    { type: 'feComposite', operator: 'in', in: 'specOut', in2: 'SourceAlpha', result: 'specOut2' },
    { type: 'feComposite', operator: 'arithmetic', k1: 0, k2: 1, k3: 1, k4: 0, in: 'SourceGraphic', in2: 'specOut2' }
  ],
  locked: false,
});

export const createMotionBlurFilter = (direction: 'horizontal' | 'vertical' = 'horizontal', intensity: number = 5): Omit<SVGFilter, 'id'> => ({
  type: 'filter',
  filterUnits: 'objectBoundingBox',
  primitiveUnits: 'userSpaceOnUse',
  primitives: [
    { 
      type: 'feGaussianBlur', 
      stdDeviation: intensity,
      // Note: SVG feGaussianBlur doesn't support different X/Y values in the type system
      // For true motion blur, we would need multiple primitives or use a different approach
    }
  ],
  locked: false,
});

export const createNoiseFilter = (): Omit<SVGFilter, 'id'> => ({
  type: 'filter',
  filterUnits: 'objectBoundingBox',
  primitiveUnits: 'userSpaceOnUse',
  primitives: [
    { type: 'feTurbulence', baseFrequency: '0.9', numOctaves: 4, result: 'noise', turbulenceType: 'fractalNoise' },
    { type: 'feColorMatrix', in: 'noise', colorMatrixType: 'saturate', values: '0', result: 'monoNoise' },
    { type: 'feComponentTransfer', in: 'monoNoise', result: 'noiseContrast' },
    { type: 'feBlend', mode: 'multiply', in: 'SourceGraphic', in2: 'noiseContrast' }
  ],
  locked: false,
});

export const createWaveDistortionFilter = (): Omit<SVGFilter, 'id'> => ({
  type: 'filter',
  filterUnits: 'objectBoundingBox',
  primitiveUnits: 'userSpaceOnUse',
  primitives: [
    { type: 'feTurbulence', baseFrequency: '0.02', numOctaves: 3, result: 'turbulence', turbulenceType: 'turbulence' },
    { type: 'feDisplacementMap', in: 'SourceGraphic', in2: 'turbulence', scale: 20, xChannelSelector: 'R', yChannelSelector: 'G' }
  ],
  locked: false,
});

export const createPosterizeFilter = (levels: number = 4): Omit<SVGFilter, 'id'> => ({
  type: 'filter',
  filterUnits: 'objectBoundingBox',
  primitiveUnits: 'userSpaceOnUse',
  primitives: [
    { type: 'feComponentTransfer',
      funcR: { funcType: 'discrete', tableValues: Array.from({length: levels}, (_, i) => i / (levels - 1)).join(' ') },
      funcG: { funcType: 'discrete', tableValues: Array.from({length: levels}, (_, i) => i / (levels - 1)).join(' ') },
      funcB: { funcType: 'discrete', tableValues: Array.from({length: levels}, (_, i) => i / (levels - 1)).join(' ') }
    }
  ],
  locked: false,
});

// Filtros adicionales avanzados
export const createOilPaintingFilter = (): Omit<SVGFilter, 'id'> => ({
  type: 'filter',
  filterUnits: 'objectBoundingBox',
  primitiveUnits: 'userSpaceOnUse',
  primitives: [
    { type: 'feTurbulence', baseFrequency: '0.04', numOctaves: 3, turbulenceType: 'fractalNoise', result: 'noise' },
    { type: 'feDisplacementMap', in: 'SourceGraphic', in2: 'noise', scale: 5, xChannelSelector: 'R', yChannelSelector: 'G', result: 'displaced' },
    { type: 'feGaussianBlur', in: 'displaced', stdDeviation: 2, result: 'blurred' },
    { type: 'feColorMatrix', in: 'blurred', colorMatrixType: 'saturate', values: '1.2' }
  ],
  locked: false,
});

export const createWatercolorFilter = (): Omit<SVGFilter, 'id'> => ({
  type: 'filter',
  filterUnits: 'objectBoundingBox',
  primitiveUnits: 'userSpaceOnUse',
  primitives: [
    { type: 'feTurbulence', baseFrequency: '0.08', numOctaves: 2, turbulenceType: 'fractalNoise', result: 'noise' },
    { type: 'feColorMatrix', in: 'noise', colorMatrixType: 'saturate', values: '0', result: 'monoNoise' },
    { type: 'feComponentTransfer', in: 'monoNoise', result: 'noiseContrast' },
    { type: 'feDisplacementMap', in: 'SourceGraphic', in2: 'noiseContrast', scale: 8, result: 'displaced' },
    { type: 'feGaussianBlur', in: 'displaced', stdDeviation: 1.5, result: 'soft' },
    { type: 'feColorMatrix', in: 'soft', colorMatrixType: 'matrix', values: '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.9 0' }
  ],
  locked: false,
});

export const createVintageFilter = (): Omit<SVGFilter, 'id'> => ({
  type: 'filter',
  filterUnits: 'objectBoundingBox',
  primitiveUnits: 'userSpaceOnUse',
  primitives: [
    { type: 'feColorMatrix', colorMatrixType: 'matrix', values: '1.1 -0.1 0.1 0 0.1 0.1 0.9 0.1 0 0.1 0.1 0.1 0.8 0 0.1 0 0 0 1 0', result: 'vintage' },
    { type: 'feTurbulence', baseFrequency: '0.9', numOctaves: 4, turbulenceType: 'fractalNoise', result: 'noise' },
    { type: 'feColorMatrix', in: 'noise', colorMatrixType: 'saturate', values: '0', result: 'monoNoise' },
    { type: 'feBlend', mode: 'multiply', in: 'vintage', in2: 'monoNoise', result: 'noisy' },
    { type: 'feColorMatrix', in: 'noisy', colorMatrixType: 'matrix', values: '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.95 0' }
  ],
  locked: false,
});

export const createChromaticAberrationFilter = (): Omit<SVGFilter, 'id'> => ({
  type: 'filter',
  filterUnits: 'userSpaceOnUse',
  primitiveUnits: 'userSpaceOnUse',
  primitives: [
    // Red channel offset
    { type: 'feOffset', dx: -2, dy: 0, in: 'SourceGraphic', result: 'redOffset' },
    { type: 'feColorMatrix', in: 'redOffset', colorMatrixType: 'matrix', values: '1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0', result: 'redChannel' },
    // Blue channel offset
    { type: 'feOffset', dx: 2, dy: 0, in: 'SourceGraphic', result: 'blueOffset' },
    { type: 'feColorMatrix', in: 'blueOffset', colorMatrixType: 'matrix', values: '0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0', result: 'blueChannel' },
    // Green channel (no offset)
    { type: 'feColorMatrix', in: 'SourceGraphic', colorMatrixType: 'matrix', values: '0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0', result: 'greenChannel' },
    // Combine channels
    { type: 'feComposite', operator: 'arithmetic', k1: 0, k2: 1, k3: 1, k4: 0, in: 'redChannel', in2: 'greenChannel', result: 'redGreen' },
    { type: 'feComposite', operator: 'arithmetic', k1: 0, k2: 1, k3: 1, k4: 0, in: 'redGreen', in2: 'blueChannel' }
  ],
  locked: false,
});

export const createNeonGlowFilter = (color: string = '#00ffff'): Omit<SVGFilter, 'id'> => ({
  type: 'filter',
  filterUnits: 'objectBoundingBox',
  primitiveUnits: 'userSpaceOnUse',
  primitives: [
    // Inner glow
    { type: 'feGaussianBlur', stdDeviation: 3, in: 'SourceAlpha', result: 'blur1' },
    { type: 'feFlood', floodColor: color, floodOpacity: 0.8, result: 'color1' },
    { type: 'feComposite', operator: 'in', in: 'color1', in2: 'blur1', result: 'glow1' },
    // Outer glow
    { type: 'feGaussianBlur', stdDeviation: 8, in: 'SourceAlpha', result: 'blur2' },
    { type: 'feFlood', floodColor: color, floodOpacity: 0.6, result: 'color2' },
    { type: 'feComposite', operator: 'in', in: 'color2', in2: 'blur2', result: 'glow2' },
    // Combine glows
    { type: 'feComposite', operator: 'over', in: 'glow1', in2: 'glow2', result: 'combinedGlow' },
    { type: 'feComposite', operator: 'over', in: 'SourceGraphic', in2: 'combinedGlow' }
  ],
  locked: false,
});

export const createMosaicFilter = (): Omit<SVGFilter, 'id'> => ({
  type: 'filter',
  filterUnits: 'objectBoundingBox',
  primitiveUnits: 'userSpaceOnUse',
  primitives: [
    { type: 'feTurbulence', baseFrequency: '0.02', numOctaves: 1, turbulenceType: 'turbulence', result: 'turbulence' },
    { type: 'feColorMatrix', in: 'turbulence', colorMatrixType: 'saturate', values: '0', result: 'greyscale' },
    { type: 'feConvolveMatrix', in: 'greyscale', order: '3', kernelMatrix: '1 1 1 1 1 1 1 1 1', divisor: 9, result: 'convolved' },
    { type: 'feComposite', operator: 'in', in: 'SourceGraphic', in2: 'convolved', result: 'masked' },
    { type: 'feTile', in: 'masked' }
  ],
  locked: false,
});

export const createGlitchFilter = (): Omit<SVGFilter, 'id'> => ({
  type: 'filter',
  filterUnits: 'objectBoundingBox',
  primitiveUnits: 'userSpaceOnUse',
  primitives: [
    // Random displacement
    { type: 'feTurbulence', baseFrequency: '0.01 0.9', numOctaves: 1, turbulenceType: 'fractalNoise', result: 'displacement' },
    { type: 'feDisplacementMap', in: 'SourceGraphic', in2: 'displacement', scale: 15, xChannelSelector: 'R', yChannelSelector: 'G', result: 'displaced' },
    // Color separation
    { type: 'feOffset', dx: 3, dy: 0, in: 'displaced', result: 'redOffset' },
    { type: 'feOffset', dx: -3, dy: 0, in: 'displaced', result: 'blueOffset' },
    { type: 'feBlend', mode: 'screen', in: 'redOffset', in2: 'blueOffset' }
  ],
  locked: false,
});

export const createPixelateFilter = (): Omit<SVGFilter, 'id'> => ({
  type: 'filter',
  filterUnits: 'objectBoundingBox',
  primitiveUnits: 'userSpaceOnUse',
  primitives: [
    { type: 'feConvolveMatrix', order: '5', kernelMatrix: '1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1', divisor: 25 }
  ],
  locked: false,
});

// New Artistic Filters inspired by yoksel.github.io/svg-filters
export const createDancingStrokeFilter = (strokeColor: string = '#30597E'): Omit<SVGFilter, 'id'> => ({
  type: 'filter',
  filterUnits: 'objectBoundingBox',
  primitiveUnits: 'userSpaceOnUse',
  colorInterpolationFilters: 'linearRGB',
  primitives: [
    // Create dilated stroke outline
    { type: 'feMorphology', operator: 'dilate', radius: 4, in: 'SourceAlpha', result: 'morphology' },
    { type: 'feFlood', floodColor: strokeColor, floodOpacity: 1, result: 'flood' },
    { type: 'feComposite', in: 'flood', in2: 'morphology', operator: 'in', result: 'composite' },
    { type: 'feComposite', in: 'composite', in2: 'SourceAlpha', operator: 'out', result: 'composite1' },
    // Add turbulence for dancing effect
    { type: 'feTurbulence', turbulenceType: 'fractalNoise', baseFrequency: '0.01 0.02', numOctaves: 1, seed: 0, stitchTiles: 'stitch', result: 'turbulence' },
    { type: 'feDisplacementMap', in: 'composite1', in2: 'turbulence', scale: 17, xChannelSelector: 'A', yChannelSelector: 'A', result: 'displacementMap' },
    // Merge with original
    { type: 'feMerge', result: 'merge', feMergeNodes: [
      { in: 'SourceGraphic' },
      { in: 'displacementMap' }
    ]}
  ],
  locked: false,
});

export const createSmokeFilter = (color: string = '#38252f'): Omit<SVGFilter, 'id'> => ({
  type: 'filter',
  filterUnits: 'objectBoundingBox',
  primitiveUnits: 'userSpaceOnUse',
  colorInterpolationFilters: 'linearRGB',
  primitives: [
    { type: 'feTurbulence', turbulenceType: 'turbulence', baseFrequency: '0.013 0.01', numOctaves: 2, seed: 1, stitchTiles: 'stitch', result: 'turbulence' },
    { type: 'feFlood', floodColor: color, floodOpacity: 1, result: 'flood' },
    { type: 'feComposite', in: 'flood', in2: 'turbulence', operator: 'in', result: 'composite1' },
    { type: 'feComposite', in: 'composite1', in2: 'SourceAlpha', operator: 'in', result: 'composite2' }
  ],
  locked: false,
});

export const createWavesFilter = (): Omit<SVGFilter, 'id'> => ({
  type: 'filter',
  filterUnits: 'objectBoundingBox',
  primitiveUnits: 'userSpaceOnUse',
  colorInterpolationFilters: 'linearRGB',
  primitives: [
    { type: 'feTurbulence', turbulenceType: 'turbulence', baseFrequency: '0.01 0.05', numOctaves: 2, seed: 2, stitchTiles: 'noStitch', result: 'turbulence' },
    { type: 'feDisplacementMap', in: 'SourceGraphic', in2: 'turbulence', scale: 20, xChannelSelector: 'G', yChannelSelector: 'A', result: 'displacementMap' }
  ],
  locked: false,
});

export const createPaperTextureFilter = (): Omit<SVGFilter, 'id'> => ({
  type: 'filter',
  filterUnits: 'objectBoundingBox',
  primitiveUnits: 'userSpaceOnUse',
  colorInterpolationFilters: 'sRGB',
  primitives: [
    { type: 'feTurbulence', turbulenceType: 'fractalNoise', baseFrequency: '0.04', numOctaves: 5, seed: 2, result: 'noise' },
    { type: 'feColorMatrix', in: 'noise', colorMatrixType: 'saturate', values: '0', result: 'desaturatedNoise' },
    { type: 'feBlend', mode: 'multiply', in: 'SourceGraphic', in2: 'desaturatedNoise', result: 'blend' },
    { type: 'feComposite', in: 'blend', in2: 'SourceAlpha', operator: 'in' }
  ],
  locked: false,
});

export const createZebraFilter = (): Omit<SVGFilter, 'id'> => ({
  type: 'filter',
  filterUnits: 'objectBoundingBox',
  primitiveUnits: 'userSpaceOnUse',
  primitives: [
    { type: 'feTurbulence', turbulenceType: 'turbulence', baseFrequency: '0 0.15', numOctaves: 1, seed: 0, result: 'turbulence' },
    { type: 'feColorMatrix', in: 'turbulence', colorMatrixType: 'matrix', 
      values: '0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0', result: 'alpha' },
    { type: 'feComposite', in: 'SourceGraphic', in2: 'alpha', operator: 'in' }
  ],
  locked: false,
});

export const createNetFilter = (): Omit<SVGFilter, 'id'> => ({
  type: 'filter',
  filterUnits: 'objectBoundingBox',
  primitiveUnits: 'userSpaceOnUse',
  primitives: [
    { type: 'feTurbulence', turbulenceType: 'turbulence', baseFrequency: '0.1', numOctaves: 1, seed: 0, result: 'grid' },
    { type: 'feColorMatrix', in: 'grid', colorMatrixType: 'matrix',
      values: '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 20 -10', result: 'gridPattern' },
    { type: 'feComposite', in: 'SourceGraphic', in2: 'gridPattern', operator: 'in' }
  ],
  locked: false,
});

export const createDustFilter = (): Omit<SVGFilter, 'id'> => ({
  type: 'filter',
  filterUnits: 'objectBoundingBox',
  primitiveUnits: 'userSpaceOnUse',
  primitives: [
    { type: 'feTurbulence', turbulenceType: 'fractalNoise', baseFrequency: '0.3', numOctaves: 4, seed: 5, result: 'noise' },
    { type: 'feColorMatrix', in: 'noise', colorMatrixType: 'matrix',
      values: '0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 -0.2', result: 'dustPattern' },
    { type: 'feBlend', mode: 'multiply', in: 'SourceGraphic', in2: 'dustPattern' }
  ],
  locked: false,
});

export const createColoredStripesFilter = (): Omit<SVGFilter, 'id'> => ({
  type: 'filter',
  filterUnits: 'objectBoundingBox',
  primitiveUnits: 'userSpaceOnUse',
  primitives: [
    { type: 'feTurbulence', turbulenceType: 'turbulence', baseFrequency: '0 0.15', numOctaves: 1, seed: 0, result: 'stripes' },
    { type: 'feColorMatrix', in: 'stripes', colorMatrixType: 'matrix',
      values: '1 0 1 0 0 0.5 1 0.5 0 0 0 0.5 1 0 0 0 0 0 1 0', result: 'coloredStripes' },
    { type: 'feBlend', mode: 'multiply', in: 'SourceGraphic', in2: 'coloredStripes' }
  ],
  locked: false,
});

export const createColoredSpotsFilter = (): Omit<SVGFilter, 'id'> => ({
  type: 'filter',
  filterUnits: 'objectBoundingBox',
  primitiveUnits: 'userSpaceOnUse',
  primitives: [
    { type: 'feTurbulence', turbulenceType: 'fractalNoise', baseFrequency: '0.02', numOctaves: 1, seed: 0, result: 'spots' },
    { type: 'feColorMatrix', in: 'spots', colorMatrixType: 'matrix',
      values: '2 0 0 0 0 0 2 0 0 0 0 0 2 0 0 0 0 0 1 0', result: 'coloredSpots' },
    { type: 'feBlend', mode: 'screen', in: 'SourceGraphic', in2: 'coloredSpots' }
  ],
  locked: false,
});

export const createColoredFlameFilter = (): Omit<SVGFilter, 'id'> => ({
  type: 'filter',
  filterUnits: 'objectBoundingBox',
  primitiveUnits: 'userSpaceOnUse',
  primitives: [
    { type: 'feTurbulence', turbulenceType: 'fractalNoise', baseFrequency: '0.01 0.1', numOctaves: 3, seed: 1, result: 'flame' },
    { type: 'feColorMatrix', in: 'flame', colorMatrixType: 'matrix',
      values: '3 0 0 0 0 0 1.5 0 0 0 0 0 0.5 0 0 0 0 0 1 0', result: 'coloredFlame' },
    { type: 'feBlend', mode: 'screen', in: 'SourceGraphic', in2: 'coloredFlame' }
  ],
  locked: false,
});

// Enhanced Watercolor Filter (inspired by the website)
export const createAdvancedWatercolorFilter = (): Omit<SVGFilter, 'id'> => ({
  type: 'filter',
  filterUnits: 'objectBoundingBox',
  primitiveUnits: 'userSpaceOnUse',
  colorInterpolationFilters: 'sRGB',
  primitives: [
    // Base turbulence for texture
    { type: 'feTurbulence', turbulenceType: 'fractalNoise', baseFrequency: '0.05 0.05', numOctaves: 5, seed: 1, stitchTiles: 'stitch', result: 'turbulence' },
    // Diffuse lighting for 3D effect
    { type: 'feDiffuseLighting', surfaceScale: 0.5, diffuseConstant: 3.2, lightColor: '#ffffff', in: 'turbulence', result: 'diffuseLighting', lightSource: {
      type: 'feDistantLight',
      azimuth: 150,
      elevation: 16
    }},
    // Secondary turbulence for color variation
    { type: 'feTurbulence', turbulenceType: 'fractalNoise', baseFrequency: '0.011 0.004', numOctaves: 2, seed: 3, stitchTiles: 'noStitch', result: 'turbulence1' },
    { type: 'feColorMatrix', colorMatrixType: 'saturate', values: '3', in: 'turbulence1', result: 'colormatrix' },
    { type: 'feColorMatrix', colorMatrixType: 'matrix', values: '2 0 0 0 0 0 1.5 0 0 0 0 0 2 0 0 0 0 0 2 0', in: 'colormatrix', result: 'colormatrix1' },
    { type: 'feBlend', mode: 'multiply', in: 'diffuseLighting', in2: 'colormatrix1', result: 'blend' },
    { type: 'feComposite', in: 'blend', in2: 'SourceAlpha', operator: 'in', result: 'composite1' }
  ],
  locked: false,
});

// Marker utilities
export const createDefaultMarker = (): Omit<SVGMarker, 'id'> => ({
  type: 'marker',
  markerUnits: 'strokeWidth',
  refX: 0,
  refY: 2,
  markerWidth: 1,
  markerHeight: 1,
  orient: 'auto',
  viewBox: '0 0 10 5',
  children: [], // Empty children so MarkerRenderer will use default arrow path
  style: {
    fill: '#000000',
    stroke: 'none',
    fillOpacity: 1,
    strokeOpacity: 1,
    strokeWidth: 0,
  },
  locked: false,
});

export const createArrowMarker = (): Omit<SVGMarker, 'id'> => ({
  type: 'marker',
  markerUnits: 'strokeWidth',
  refX: 0,
  refY: 2,
  markerWidth: 1,
  markerHeight: 1,
  orient: 'auto',
  viewBox: '0 0 10 5',
  children: [], // Empty children so MarkerRenderer will use default arrow path
  style: {
    fill: '#000000',
    stroke: 'none',
    fillOpacity: 1,
    strokeOpacity: 1,
    strokeWidth: 0,
  },
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
      return Boolean(primitive.values) || Boolean(primitive.colorMatrixType);
    case 'feDropShadow':
      return primitive.stdDeviation >= 0 && Boolean(primitive.floodColor);
    case 'feBlend':
      return ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion'].includes(primitive.mode);
    case 'feMorphology':
      return ['erode', 'dilate'].includes(primitive.operator) && primitive.radius >= 0;
    case 'feConvolveMatrix':
      return Boolean(primitive.order) && Boolean(primitive.kernelMatrix);
    case 'feComponentTransfer':
      return true; // Basic validation - has optional function components
    case 'feDiffuseLighting':
    case 'feSpecularLighting':
      return Boolean(primitive.lightSource);
    case 'feDisplacementMap':
      return typeof primitive.scale === 'number';
    case 'feTurbulence':
      return Boolean(primitive.baseFrequency);
    case 'feImage':
      return true; // Basic validation
    case 'feTile':
      return true; // Basic validation
    case 'feMerge':
      return true; // Basic validation - feMergeNodes is optional
    case 'feFuncR':
    case 'feFuncG':
    case 'feFuncB':
    case 'feFuncA':
      return Boolean(primitive.funcType);
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