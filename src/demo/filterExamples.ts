import { 
  createDropShadowFilter,
  createBlurFilter,
  createGrayscaleFilter,
  createSepiaFilter,
  createInvertFilter,
  createEmbossFilter,
  createGlowFilter,
  createNeonGlowFilter,
  createVintageFilter,
  createOilPaintingFilter
} from '../utils/svg-elements-utils';

// Filtros de demostración para cargar automáticamente
export const getDemoFilters = () => [
  {
    id: 'demo-drop-shadow',
    ...createDropShadowFilter(3, 3, 4, '#000000', 0.5)
  },
  {
    id: 'demo-blur',
    ...createBlurFilter(5)
  },
  {
    id: 'demo-grayscale',
    ...createGrayscaleFilter()
  },
  {
    id: 'demo-sepia',
    ...createSepiaFilter()
  },
  {
    id: 'demo-invert',
    ...createInvertFilter()
  },
  {
    id: 'demo-emboss',
    ...createEmbossFilter()
  },
  {
    id: 'demo-glow',
    ...createGlowFilter('#ffff00', 4)
  },
  {
    id: 'demo-neon',
    ...createNeonGlowFilter('#00ffff')
  },
  {
    id: 'demo-vintage',
    ...createVintageFilter()
  },
  {
    id: 'demo-oil-painting',
    ...createOilPaintingFilter()
  }
];

// Función para obtener descripciones de los filtros
export const getFilterDescription = (filterId: string): string => {
  const descriptions: Record<string, string> = {
    'demo-drop-shadow': 'Drop Shadow - Creates a realistic shadow behind the element',
    'demo-blur': 'Gaussian Blur - Applies smooth blurring effect',
    'demo-grayscale': 'Grayscale - Converts colors to black and white',
    'demo-sepia': 'Sepia - Vintage brown-tinted effect',
    'demo-invert': 'Invert - Reverses all colors',
    'demo-emboss': 'Emboss - Creates 3D raised surface effect',
    'demo-glow': 'Glow - Adds bright halo around element',
    'demo-neon': 'Neon Glow - Electric neon sign effect',
    'demo-vintage': 'Vintage - Retro film look with noise',
    'demo-oil-painting': 'Oil Painting - Artistic paint-like texture'
  };
  
  return descriptions[filterId] || 'Custom filter effect';
};
