# Algoritmo de Suavizado SVG

Este documento describe el algoritmo de suavizado utilizado en el editor SVG, que implementa una versión mejorada del algoritmo Catmull-Rom con características avanzadas.

## Algoritmo de Suavizado (`getPointSmooth`)

El algoritmo implementa la especificación completa del algoritmo Enhanced de suavizado, con todas las características documentadas.

### Características Implementadas

#### 1. **Tensión Adaptativa**
```
tensión_ajustada = clamp(tensión * (1 + distancia/500), 0.1, 0.9)
```
- Se ajusta dinámicamente según la distancia entre puntos
- Curvas más suaves para segmentos largos
- Mayor precisión para segmentos cortos
- Rango limitado entre 0.1 y 0.9 para estabilidad

#### 2. **Límites de Vector**
```
vector = clamp(P2 - P0, -10000, 10000)
```
- Previene valores extremos en cálculos
- Mayor estabilidad numérica
- Evita artefactos visuales por valores desbordados

#### 3. **Tolerancia de Comparación Consistente**
- Usa `1e-6` para todas las comparaciones de puntos
- Mayor precisión en detección de puntos iguales
- Comportamiento consistente en todos los casos

#### 4. **Puntos de Control Bézier Optimizados**
```
control_point_1 = P1 + (vector_0 / 6) * tensión_ajustada
control_point_2 = P2 - (vector_1 / 6) * tensión_ajustada
```
- Divisor por 6 en lugar de 3 para mayor suavidad
- Mejores transiciones entre curvas
- Compatibilidad total con especificación Catmull-Rom

#### 5. **Manejo Avanzado de Puntos Fantasma**

##### Para Paths Cerrados:
- **Si primer y último punto coinciden Y hay > 2 puntos**:
  - Punto fantasma inicial: penúltimo punto
  - Punto fantasma final: segundo punto
- **Si primer y último punto NO coinciden**:
  - Punto fantasma inicial: último punto
  - Punto fantasma final: primer punto

##### Para Paths Abiertos:
- **Punto fantasma inicial**: `primer_punto - (segundo_punto - primer_punto)`
- **Punto fantasma final**: `último_punto + (último_punto - penúltimo_punto)`

#### 6. **Manejo de Comandos Especiales**
- Soporte completo para comandos `H` (horizontal) y `V` (vertical)
- Extracción correcta de coordenadas de todos los tipos de comando SVG
- Conversión apropiada de comandos relativos a absolutos

#### 7. **Optimizaciones Adicionales**
- Detección inteligente de paths cerrados
- Manejo especial para continuidad perfecta en figuras cerradas
- Preservación del comando `M` inicial
- Eliminación de comandos `L` redundantes

## Casos de Uso y Resultados

### Fortalezas del Algoritmo

1. **Tensión adaptativa** crea transiciones más naturales
2. **Límites de vector** previenen artefactos visuales
3. **Mejor manejo de paths cerrados** con continuidad perfecta
4. **Mayor precisión** en cálculos numéricos
5. **Estabilidad** en casos edge complejos

### Casos de Prueba Validados

1. **Path cerrado con puntos coincidentes**
   - Manejo correcto de esquinas en cuadrados/rectángulos
   - Continuidad perfecta en el punto de cierre

2. **Path con segmentos de diferentes longitudes**
   - Tensión adaptativa ajusta automáticamente la suavidad
   - Segmentos largos reciben más suavizado que cortos

3. **Path abierto con extremos**
   - Puntos fantasma calculados por extrapolación
   - Extremos suavizados de manera natural

4. **Path con puntos muy cercanos**
   - Estabilidad numérica mantenida
   - No genera valores NaN o infinitos

## Cómo Usar

1. Seleccionar un subpath o comandos específicos
2. En el panel de SubPath Transform, expandir "Smoothing"
3. Hacer clic en "Smooth" para aplicar el algoritmo
4. El resultado se ajusta automáticamente a la grilla si está activada

## Configuración y Parámetros

- **Tensión base**: 0.5 (modificada dinámicamente)
- **Tolerancia de comparación**: 1e-6
- **Límites de vector**: ±10000
- **Factor de adaptación**: distancia/500

## Algoritmo de Normalización

Incluye la función auxiliar `normalizeZCommandsForSmoothing` que:
- Convierte comandos `Z` a líneas explícitas `L`
- Facilita el procesamiento del algoritmo de suavizado
- Mantiene la compatibilidad visual del path

## Consideraciones Técnicas

- **Complejidad**: O(n) donde n es el número de puntos
- **Memoria**: Mínima sobrecarga adicional para puntos fantasma
- **Estabilidad**: Robusto ante casos edge y datos mal formados
- **Precisión**: Usa aritmética de punto flotante de doble precisión

## Integración con el Editor

El algoritmo está completamente integrado con:
- Sistema de grilla (snap to grid)
- Sistema de historial (undo/redo)
- Selección múltiple de subpaths
- Validación de comandos SVG

Este algoritmo representa la implementación definitiva del suavizado según la especificación documentada, sin versiones alternativas o algoritmos legacy.
