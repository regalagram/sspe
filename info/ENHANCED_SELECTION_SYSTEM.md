# Sistema de Selección de SubPaths Mejorado

## Resumen

El sistema de selección ahora soporta tanto detección de **contorno** (stroke) como detección de **área de relleno** (fill), replicando el comportamiento de las reglas de relleno SVG.

## Cómo Funciona

### 1. Detección Híbrida

La función `findSubPathAtPointAdvanced()` usa un enfoque híbrido:

```typescript
// Detección completa (contorno + relleno)
const subPath = findSubPathAtPointAdvanced(path, clickPoint, {
  tolerance: 15,
  fillRule: 'nonzero',
  includeStroke: true,  // Detecta clicks cerca del contorno
  includeFill: true     // Detecta clicks dentro del área
});
```

### 2. Reglas de Relleno SVG

Soporta ambas reglas estándar de SVG:

- **`nonzero`** (por defecto): Usa la regla de número de vueltas no-cero
- **`evenodd`**: Usa la regla par-impar

### 3. Casos Especiales Manejados

#### Figuras Abiertas
```typescript
// Para líneas o curvas abiertas (sin comando Z)
M 50 50 L 150 50  // Solo detección de contorno
```
- Solo se detecta proximidad al contorno
- No hay área de relleno porque la figura no está cerrada

#### Figuras Cerradas
```typescript
// Para figuras cerradas (con comando Z o que terminan donde empezaron)
M 50 50 L 150 50 L 150 150 L 50 150 Z
```
- Se detecta tanto el contorno como el área interior
- Aplica las reglas de relleno SVG

#### Sin Relleno (solo stroke)
```typescript
// Detección solo del contorno
const subPath = findSubPathAtPointAdvanced(path, point, {
  includeFill: false,
  includeStroke: true
});
```

## Algoritmos Implementados

### Point-in-Polygon (Relleno)

#### Regla Non-Zero (nonzero)
- Cuenta el número de veces que un rayo desde el punto cruza los bordes
- Considera la dirección del cruzamiento (+1 o -1)
- Si el resultado final ≠ 0, el punto está dentro

#### Regla Even-Odd (evenodd)
- Cuenta solo el número de cruzamientos
- Si es impar, el punto está dentro
- Si es par, el punto está fuera

### Aproximación de Curvas

Para figuras con curvas, el sistema:

1. **Muestrea puntos** a lo largo de cada curva Bézier/arco
2. **Crea un polígono aproximado** con esos puntos
3. **Aplica point-in-polygon** al polígono resultante

```typescript
// Ejemplo de muestreo para curva cúbica
const curvePoints = sampleCubicBezier(p0, p1, p2, p3, 10); // 10 puntos de muestra
```

## Beneficios del Nuevo Sistema

### 1. Experiencia Más Intuitiva
- Click dentro de figuras cerradas = selección inmediata
- Click cerca del borde = selección por proximidad
- Comportamiento consistente con editores SVG estándar

### 2. Flexibilidad de Configuración
- Habilitar/deshabilitar detección de relleno
- Habilitar/deshabilitar detección de contorno
- Configurar reglas de relleno
- Ajustar tolerancia de proximidad

### 3. Manejo Correcto de Casos Edge
- Figuras abiertas: solo contorno
- Figuras cerradas: contorno + área
- Curvas complejas: aproximación precisa
- Múltiples subpaths: cada uno evaluado independientemente

## Uso en el Código

### Función Básica (compatibilidad hacia atrás)
```typescript
const subPath = findSubPathAtPoint(path, point, 15);
```

### Función Avanzada (nueva)
```typescript
const subPath = findSubPathAtPointAdvanced(path, point, {
  tolerance: 15,
  fillRule: 'nonzero',
  includeStroke: true,
  includeFill: true
});
```

## Rendimiento

- **Detección de relleno**: O(n) donde n = número de puntos del polígono
- **Muestreo de curvas**: Configurable (por defecto 10 puntos por curva)
- **Optimización**: Detección de relleno solo para figuras cerradas
- **Cache**: Los puntos del polígono podrían cachearse en el futuro

El sistema mantiene un balance entre precisión y rendimiento, proporcionando una experiencia de usuario natural mientras es computacionalmente eficiente.
