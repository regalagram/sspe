# Detección de SubPaths Anidados - Casos Especiales

## Problema Identificado

Cuando se tienen **subpaths anidados** (un subpath dentro de otro), el algoritmo original seleccionaba el primer subpath que cumplía los criterios, no necesariamente el más cercano o el más interno.

### Ejemplo del Problema:
```
Path con 2 subpaths:
1. Rectángulo exterior: (50,50) → (200,200) 
2. Rectángulo interior: (100,100) → (150,150)

Click en (125,125):
❌ Antes: Seleccionaba el subpath #1 (exterior) por orden
✅ Ahora: Selecciona el subpath #2 (interior) por proximidad
```

## Soluciones Implementadas

### 1. **Mejora en el Algoritmo Principal**

El algoritmo ya no retorna distancia `0` para todos los puntos dentro de áreas de relleno. En su lugar:

- **Calcula la distancia real** al contorno incluso para puntos dentro del área
- **Aplica una preferencia del 20%** a las áreas de relleno (multiplica distancia por 0.8)
- **Selecciona el subpath con menor distancia** final

```typescript
// Antes
if (isInside) {
  return 0; // Todos los "inside" tenían la misma prioridad
}

// Ahora  
if (isInside) {
  minDistance = minDistance * 0.8; // Preferencia pero mantiene distancia real
}
```

### 2. **Función Especializada para Casos Complejos**

Nueva función `findInnermostSubPathAtPoint()` que implementa estrategias avanzadas:

```typescript
const subPath = findInnermostSubPathAtPoint(path, point, tolerance);
```

#### Estrategias de Selección:

1. **Distancia al Contorno**: Prioriza el subpath cuyo contorno está más cerca del punto
2. **Área del Subpath**: Si las distancias son similares, prefiere el de menor área (más interno)
3. **Prioridad Inside vs Outside**: Los subpaths que contienen el punto tienen prioridad sobre los externos

### 3. **Casos de Uso Cubiertos**

#### Caso 1: Dos Subpaths Anidados
```
Exterior: M 50 50 L 200 50 L 200 200 L 50 200 Z
Interior: M 100 100 L 150 100 L 150 150 L 100 150 Z

Click (125,125): Selecciona Interior ✅
Click (75,75): Selecciona Exterior ✅
```

#### Caso 2: Tres Niveles de Anidación
```
Nivel 1: (10,10) → (190,190)
Nivel 2: (50,50) → (150,150)  
Nivel 3: (80,80) → (120,120)

Click (100,100): Selecciona Nivel 3 ✅
Click (60,100): Selecciona Nivel 2 ✅
Click (30,100): Selecciona Nivel 1 ✅
```

#### Caso 3: Subpaths Superpuestos (No Anidados)
```
Círculo A: Centro (100,100), Radio 50
Círculo B: Centro (120,120), Radio 50

Click (110,110): Selecciona el más cercano al punto
```

## Algoritmos Implementados

### 1. **Cálculo de Área (Shoelace Formula)**
```typescript
const calculateSubPathArea = (subPath: SVGSubPath): number => {
  // Usa la fórmula del cordón para calcular área del polígono
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += polygonPoints[i].x * polygonPoints[j].y;
    area -= polygonPoints[j].x * polygonPoints[i].y;
  }
  return Math.abs(area) / 2;
};
```

### 2. **Estrategia de Múltiples Candidatos**
```typescript
// 1. Filtrar subpaths válidos (inside o dentro de tolerancia)
const candidates = subPaths.filter(sp => 
  isInside(sp, point) || distance(sp, point) < tolerance
);

// 2. Separar candidatos "inside" vs "outside"
const insideCandidates = candidates.filter(c => c.isInside);

// 3. Para múltiples "inside", usar distancia + área
if (insideCandidates.length > 1) {
  return selectByDistanceAndArea(insideCandidates);
}
```

## Compatibilidad y Migración

### Funciones Disponibles:

1. **`findSubPathAtPoint()`** - Original mejorada
   - Compatibilidad 100% hacia atrás
   - Ahora selecciona correctamente en casos anidados
   
2. **`findSubPathAtPointAdvanced()`** - Con opciones
   - Control total sobre comportamiento
   - Configuración de reglas de relleno
   
3. **`findInnermostSubPathAtPoint()`** - Especializada
   - Optimizada específicamente para casos anidados
   - Usa área como criterio de desempate

### Migración Recomendada:

```typescript
// Para casos simples (no cambia)
const subPath = findSubPathAtPoint(path, point, tolerance);

// Para casos anidados complejos (nueva)
const subPath = findInnermostSubPathAtPoint(path, point, tolerance);

// Para control total (nueva)
const subPath = findSubPathAtPointAdvanced(path, point, {
  tolerance: 15,
  fillRule: 'nonzero',
  includeStroke: true,
  includeFill: true
});
```

## Rendimiento

- **Casos simples**: Sin impacto en rendimiento
- **Casos anidados**: Cálculo adicional de área (O(n) por subpath)
- **Optimización**: Solo calcula área cuando hay múltiples candidatos "inside"
- **Memoria**: Impacto mínimo - solo almacena candidatos durante evaluación

La solución mantiene eficiencia mientras resuelve correctamente los casos edge de anidación y superposición de subpaths.
