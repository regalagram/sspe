// SVG Filter Examples and Usage Guide

/* 
 * Esta implementación incluye TODOS los filtros estándar de SVG:
 * 
 * FILTROS BÁSICOS:
 * - feGaussianBlur: Desenfoque suave
 * - feOffset: Desplazamiento X/Y
 * - feFlood: Color sólido
 * - feDropShadow: Sombra paralela
 * 
 * MANIPULACIÓN DE COLOR:
 * - feColorMatrix: Transformaciones de color completas
 * - feComponentTransfer: Ajustes por canal RGBA
 * 
 * COMPOSICIÓN:
 * - feComposite: Combinación de elementos
 * - feBlend: Modos de fusión
 * 
 * EFECTOS ESPECIALES:
 * - feConvolveMatrix: Filtros de convolución (sharpen, emboss, etc.)
 * - feMorphology: Modificación de formas (erode/dilate)
 * - feDiffuseLighting/feSpecularLighting: Iluminación 3D
 * - feDisplacementMap: Distorsión avanzada
 * - feTurbulence: Ruido procedural
 * - feImage: Incorporación de imágenes
 * - feTile: Patrones repetitivos
 */

// Ejemplo de uso programático:

import { useEditorStore } from '../store/editorStore';
import { createGlowFilter, formatSVGReference } from '../utils/svg-elements-utils';

// Crear un filtro de brillo personalizado
const customGlowFilter = createGlowFilter('#ff6b6b', 6);

// Aplicar a un elemento específico
const applyCustomFilter = (pathId: string) => {
  const store = useEditorStore.getState();
  
  // Agregar el filtro al store
  store.addFilter(customGlowFilter);
  
  // El ID se genera automáticamente, necesitamos obtenerlo del estado
  const filters = store.filters;
  const newFilter = filters[filters.length - 1];
  
  // Aplicar el filtro al path
  store.updatePathStyle(pathId, {
    filter: formatSVGReference(newFilter.id)
  });
};

// Ejemplo de filtro complejo multicapa
const createComplexArtisticFilter = () => ({
  type: 'filter' as const,
  filterUnits: 'objectBoundingBox' as const,
  primitiveUnits: 'userSpaceOnUse' as const,
  primitives: [
    // Paso 1: Añadir textura de ruido
    { 
      type: 'feTurbulence' as const, 
      baseFrequency: '0.04', 
      numOctaves: 3, 
      turbulenceType: 'fractalNoise' as const,
      result: 'noise' 
    },
    // Paso 2: Distorsionar ligeramente
    { 
      type: 'feDisplacementMap' as const, 
      in: 'SourceGraphic', 
      in2: 'noise', 
      scale: 5, 
      result: 'displaced' 
    },
    // Paso 3: Desenfocar para suavizar
    { 
      type: 'feGaussianBlur' as const, 
      in: 'displaced', 
      stdDeviation: 1.5, 
      result: 'soft' 
    },
    // Paso 4: Ajustar colores para look vintage
    { 
      type: 'feColorMatrix' as const, 
      in: 'soft',
      colorMatrixType: 'matrix' as const,
      values: '1.1 -0.1 0.1 0 0.1 0.1 0.9 0.1 0 0.1 0.1 0.1 0.8 0 0.1 0 0 0 1 0' 
    }
  ],
  locked: false
});

// Filtros preconfigurados más populares:
export const POPULAR_FILTERS = {
  // Efecto Instagram-like
  instagram: () => ({
    type: 'filter' as const,
    primitives: [
      { 
        type: 'feColorMatrix' as const, 
        colorMatrixType: 'saturate' as const, 
        values: '1.2' 
      },
      { 
        type: 'feColorMatrix' as const, 
        colorMatrixType: 'matrix' as const, 
        values: '1.1 0 0 0 0.05 0 1.1 0 0 0.05 0 0 0.9 0 0.1 0 0 0 1 0' 
      }
    ]
  }),
  
  // Efecto de papel antiguo
  oldPaper: () => ({
    type: 'filter' as const,
    primitives: [
      { type: 'feTurbulence' as const, baseFrequency: '0.9', numOctaves: 4, result: 'noise' },
      { type: 'feColorMatrix' as const, in: 'noise', colorMatrixType: 'saturate' as const, values: '0' },
      { type: 'feBlend' as const, mode: 'multiply' as const, in: 'SourceGraphic', in2: 'noise' },
      { type: 'feColorMatrix' as const, colorMatrixType: 'matrix' as const, 
        values: '1.2 0.2 0.1 0 0.1 0.1 1.1 0.1 0 0.05 0.1 0.1 0.8 0 0.05 0 0 0 1 0' }
    ]
  }),
  
  // Efecto holográfico
  holographic: () => ({
    type: 'filter' as const,
    primitives: [
      // Separación cromática
      { type: 'feOffset' as const, dx: -2, dy: 0, in: 'SourceGraphic', result: 'redOffset' },
      { type: 'feOffset' as const, dx: 2, dy: 0, in: 'SourceGraphic', result: 'blueOffset' },
      // Combinar con modo screen para efecto holográfico
      { type: 'feBlend' as const, mode: 'screen' as const, in: 'redOffset', in2: 'blueOffset', result: 'chromatic' },
      // Añadir brillo metálico
      { type: 'feColorMatrix' as const, in: 'chromatic', colorMatrixType: 'matrix' as const,
        values: '1.2 0.2 0.5 0 0 0.2 1.2 0.8 0 0 0.5 0.8 1.2 0 0 0 0 0 1 0' }
    ]
  })
};

/* 
 * GUÍA DE RENDIMIENTO:
 * 
 * - Filtros básicos (blur, offset, flood): Muy rápidos
 * - Filtros de color: Rápidos, acelerados por hardware
 * - Filtros de convolución: Moderados, depende del tamaño del kernel
 * - Filtros de iluminación: Más lentos, cálculos complejos
 * - Filtros con turbulencia: Variables, depende de parámetros
 * 
 * CONSEJOS:
 * - Usa stdDeviation < 10 para blur en animaciones
 * - Combina filtros simples antes que uno complejo
 * - Los filtros se aplican en orden secuencial
 * - Usa result e in para optimizar la cadena de filtros
 */

export default {};
