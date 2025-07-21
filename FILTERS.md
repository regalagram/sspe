# SVG Filters Implementation

Este editor SVG ahora incluye una implementación completa de todos los filtros estándar SVG según la especificación W3C.

## Filtros Básicos

### feGaussianBlur
Aplica un desenfoque gaussiano. Controla la intensidad con `stdDeviation`.

### feOffset
Desplaza el elemento en X e Y píxeles.

### feFlood
Crea un color sólido con opacidad configurable.

### feDropShadow
Sombra paralela con offset, desenfoque, color y opacidad.

## Filtros de Color

### feColorMatrix
Manipulación de colores mediante matrices 4x5:
- **Matrix**: Matriz personalizada completa
- **Saturate**: Ajusta la saturación (0 = escala de grises, >1 = más saturado)
- **HueRotate**: Rota el matiz por grados
- **LuminanceToAlpha**: Convierte luminancia a canal alfa

### Filtros Preconfigurados de Color
- **Grayscale**: Convierte a escala de grises
- **Sepia**: Efecto sepia vintage
- **Invert**: Invierte los colores
- **Brightness**: Ajusta el brillo
- **Contrast**: Ajusta el contraste
- **Saturate**: Aumenta/disminuye saturación

## Filtros de Composición

### feComposite
Combina dos entradas usando diferentes operadores:
- **over**: Superpone una imagen sobre otra
- **in**: Muestra solo donde ambas se superponen
- **out**: Muestra solo donde no se superponen
- **atop**: Combina usando el alfa de la segunda imagen
- **xor**: Exclusión mutua
- **arithmetic**: Operación matemática con k1, k2, k3, k4

### feBlend
Mezcla dos entradas usando modos de fusión:
- normal, multiply, screen, overlay, darken, lighten
- color-dodge, color-burn, hard-light, soft-light
- difference, exclusion

## Filtros Morfológicos

### feMorphology
Modifica la forma de los elementos:
- **erode**: Contrae/erosiona los bordes
- **dilate**: Expande/dilata los bordes

## Filtros de Convolución

### feConvolveMatrix
Aplica matrices de convolución personalizables:
- **Sharpen**: Aumenta la nitidez
- **Emboss**: Efecto de relieve 3D
- **Edge Detect**: Detecta bordes
- **Blur alternativo**: Desenfoque mediante convolución

## Filtros de Iluminación

### feDiffuseLighting
Iluminación difusa con fuentes de luz:
- **feDistantLight**: Luz direccional (azimuth, elevation)
- **fePointLight**: Luz puntual (x, y, z)
- **feSpotLight**: Foco con dirección y cono

### feSpecularLighting
Iluminación especular para efectos metálicos y brillos.

## Filtros de Distorsión

### feDisplacementMap
Distorsiona usando canales de color de otra imagen:
- Selecciona canales X e Y (R, G, B, A)
- Controla intensidad con `scale`

### feTurbulence
Genera ruido y texturas procedurales:
- **fractalNoise**: Ruido suave tipo Perlin
- **turbulence**: Ruido más caótico
- Configurable: frecuencia base, octavas, semilla

## Filtros de Imagen

### feImage
Incorpora imágenes externas en el filtro:
- Soporte para URLs y referencias
- Control de aspect ratio

### feTile
Repite la entrada como mosaico infinito.

## Filtros de Transferencia de Componentes

### feComponentTransfer
Manipulación avanzada de canales RGBA por separado:
- **feFuncR/G/B/A**: Funciones para cada canal
- Tipos: identity, table, discrete, linear, gamma

## Filtros Artísticos Preconfigurados

### Oil Painting
Simula pintura al óleo usando turbulencia y desenfoque.

### Watercolor
Efecto de acuarela con distorsión sutil y transparencia.

### Vintage
Look retro con ajuste de colores y ruido.

### Neon Glow
Efecto de neón con múltiples capas de brillo.

### Chromatic Aberration
Separación cromática como en lentes de cámara.

### Glitch
Efecto de interferencia digital con desplazamientos aleatorios.

### Mosaic
Efecto de mosaico/pixelado.

### Noise
Añade ruido granulado a la imagen.

### Wave Distortion
Distorsión ondulatoria usando turbulencia.

### Posterize
Reduce el número de colores para efecto poster.

## Cómo Usar

1. **Selecciona sub-paths**: Los filtros se aplican a los paths que contienen los sub-paths seleccionados.

2. **Quick Apply**: Aplica filtros preconfigurados instantáneamente.

3. **Create Custom**: Crea filtros personalizados que puedes editar primitiva por primitiva.

4. **Combinar Primitivas**: Los filtros pueden contener múltiples primitivas que se ejecutan en secuencia.

5. **Referencias**: Los filtros se referencian usando `url(#filterId)` en los estilos SVG.

## Rendimiento

- Los filtros complejos pueden afectar el rendimiento de renderizado
- Considera usar filtros más simples para animaciones
- Los navegadores modernos tienen aceleración por hardware para muchos filtros

## Compatibilidad

Todos los filtros implementados siguen la especificación SVG 1.1/2.0 y son compatibles con navegadores modernos que soporten SVG.
