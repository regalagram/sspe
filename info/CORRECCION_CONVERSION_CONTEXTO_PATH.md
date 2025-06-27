# Corrección de Conversión de Coordenadas con Contexto de Path Completo

## Problema Identificado

Al convertir sub-paths de absoluto a relativo, el comando M (moveTo) estaba manteniendo su valor para todos los sub-paths, incluso para aquellos que no eran el primero en el path. Esto causaba problemas porque:

1. **Primer sub-path**: El comando M debe mantener coordenadas absolutas
2. **Sub-paths posteriores**: El comando M debe ser relativo al final del sub-path anterior
3. **Casos de borde**: Comandos H, V y Z requieren lógica especial para calcular posiciones

## Solución Implementada

### 1. Nuevas Funciones en `relative-utils.ts`

#### `getSubPathFinalPosition(subPath, startPoint)`
- Calcula la posición final de un sub-path después de ejecutar todos sus comandos
- Maneja casos especiales:
  - **Comando M**: Actualiza el punto de inicio del sub-path
  - **Comando Z**: Retorna al punto de inicio del sub-path
  - **Comandos H/V**: Solo actualiza una coordenada (x o y)
  - **Otros comandos**: Actualiza ambas coordenadas

#### `convertSubPathCoordinatesInContext(subPath, toRelative, pathStartPoint, isFirstSubPath)`
- Convierte un sub-path considerando su contexto dentro del path completo
- **Lógica especial para comando M**:
  - Primer sub-path: M se mantiene absoluto
  - Sub-paths posteriores: M se convierte a relativo basado en posición anterior
- **Manejo de casos especiales**:
  - Comandos H/V: Actualización correcta de posición
  - Comando Z: Mantiene comportamiento y retorna a inicio
  - Seguimiento de punto de inicio del sub-path para Z

#### `convertPathCoordinates(subPaths, toRelative)`
- Convierte múltiples sub-paths dentro del contexto de un path completo
- Rastrea la posición final de cada sub-path para el siguiente
- Asegura continuidad entre sub-paths

### 2. Actualización en `RelativeTools.tsx`

#### Conversión con Contexto de Path
- **Agrupación por path**: Los sub-paths se agrupan por path padre
- **Conversión completa**: Si todos los sub-paths de un path se convierten, usa la lógica contextual
- **Conversión individual**: Fallback al método original para casos parciales

```tsx
// Nuevo flujo:
const pathGroups = new Map<string, string[]>();
// Agrupar sub-paths por path padre
// Si conversión completa: usar convertPathCoordinates
// Si conversión parcial: usar convertSubPathCoordinates (fallback)
```

### 3. Casos de Borde Manejados

#### Comando H (Horizontal Line)
```typescript
// Actualización correcta de solo coordenada X
if (command.x !== undefined) {
  const x = command.command === 'h' ? currentPoint.x + command.x : command.x;
  currentPoint = { x, y: currentPoint.y };
}
```

#### Comando V (Vertical Line)
```typescript
// Actualización correcta de solo coordenada Y
if (command.y !== undefined) {
  const y = command.command === 'v' ? currentPoint.y + command.y : command.y;
  currentPoint = { x: currentPoint.x, y };
}
```

#### Comando Z (Close Path)
```typescript
// Retorna al punto de inicio del sub-path
if (command.command === 'Z' || command.command === 'z') {
  currentPoint = { ...subPathStartPoint };
}
```

## Lógica de Conversión M (MoveTo)

### Absoluto a Relativo
```
Primer sub-path:  M 100,100 → M 100,100 (mantiene absoluto)
Segundo sub-path: M 200,150 → m 50,50 (relativo desde final anterior: 150,100)
Tercer sub-path:  M 300,200 → m 75,25 (relativo desde final anterior: 225,175)
```

### Relativo a Absoluto
```
Primer sub-path:  m 100,100 → M 100,100 (convierte a absoluto)
Segundo sub-path: m 50,50   → M 200,150 (absoluto desde final anterior)
Tercer sub-path:  m 75,25   → M 300,200 (absoluto desde final anterior)
```

## Archivos Modificados

1. **`/src/utils/relative-utils.ts`**
   - `getSubPathFinalPosition()` - Nueva función
   - `convertSubPathCoordinatesInContext()` - Nueva función mejorada
   - `convertPathCoordinates()` - Nueva función para contexto completo

2. **`/src/plugins/relative-tools/RelativeTools.tsx`**
   - Import de nuevas funciones
   - Lógica de agrupación por path
   - Conversión contextual vs individual

## Beneficios de la Corrección

1. **Conversión precisa**: Los comandos M en sub-paths posteriores ahora se calculan correctamente
2. **Contexto completo**: Considera la posición final del sub-path anterior
3. **Casos especiales**: Manejo correcto de H, V, Z y otros comandos especiales
4. **Compatibilidad**: Mantiene funcionalidad para conversiones individuales
5. **Continuidad visual**: Los paths mantienen su forma visual después de la conversión

## Verificación

Para verificar la corrección:

1. Crear un SVG con múltiples sub-paths
2. Convertir de absoluto a relativo
3. Verificar que solo el primer M permanece absoluto
4. Verificar que M posteriores son relativos al final del sub-path anterior
5. Probar casos con comandos H, V, Z entre sub-paths

## Ejemplo de Uso

```
Path original (absoluto):
M 0,0 L 100,100 M 150,50 L 200,150 Z

Conversión a relativo:
M 0,0 l 100,100 m 50,-50 l 50,100 z

Donde:
- Primer M 0,0 se mantiene absoluto
- Segundo M se convierte a m 50,-50 (150,50 - 100,100)
```
