# Transform Plugin

El plugin de transformación permite escalar y rotar selecciones directamente en el editor, similar a la funcionalidad de tldraw.

## Características

### 🎯 Transformaciones Interactivas
- **Escalado**: Arrastra los handles de las esquinas para cambiar el tamaño
- **Rotación**: Mantén el mouse cerca de los handles de esquina para activar el modo rotación
- **Proporciones**: Mantén presionada la tecla `Shift` para mantener las proporciones al escalar

### 🎮 Controles Visuales
- **Cuadro delimitador**: Se muestra automáticamente al seleccionar elementos
- **Handles de esquina**: Cuadrados azules para escalado
- **Handles de rotación**: Círculos verdes posicionados fuera de las esquinas
- **Indicador de rotación**: Círculo verde que aparece cerca de las esquinas al hacer hover
- **Feedback visual**: Los handles crecen al pasar el mouse sobre ellos
- **Estado de transformación**: Indicador en tiempo real del modo activo

### 🔧 Funcionalidades

#### Escalado
- Arrastra cualquier handle de esquina para escalar la selección
- La transformación se aplica desde el punto de anclaje opuesto
- Mantén `Shift` para escalar manteniendo las proporciones
- Soporte para escala negativa (reflejo)

#### Rotación
- Haz click y arrastra los handles de rotación (círculos verdes) posicionados fuera de las esquinas
- También puedes mantener el mouse cerca de los handles de esquina para activar el modo rotación temporal
- Aparece un círculo indicador verde con el símbolo de rotación (↻) 
- Arrastra para rotar alrededor del centro de la selección
- Rotación libre de 360 grados

### 🎨 Compatibilidad
- **Selección múltiple de comandos**: Transforma múltiples puntos seleccionados (mínimo 2 puntos)
- **Selección de sub-paths**: Transforma sub-paths completos
- **Selección múltiple**: Aplica transformaciones a todos los elementos seleccionados
- **Cálculo de área preciso**: Usa el DOM nativo del navegador con SVG temporal para obtener el bounding box real de curvas complejas
- **Fallback robusto**: Si el cálculo DOM falla, usa cálculo manual con todos los puntos de control
- **Nota**: Los controles de transformación no aparecen para selecciones de un solo punto, ya que no tiene sentido transformar un punto individual

### ⌨️ Atajos de Teclado
- `Shift`: Mantener proporciones durante el escalado
- La tecla se detecta automáticamente durante la transformación

### 🎯 Casos de Uso
- Redimensionar formas manteniendo proporciones
- Rotar elementos para cambiar su orientación
- Ajustar rápidamente el tamaño de selecciones complejas
- Transformar múltiples elementos a la vez

### ⚠️ Limitaciones
- **Selección individual**: Los controles no aparecen cuando solo hay un punto seleccionado, ya que transformar un punto individual no tiene sentido geométrico
- **Mínimo requerido**: Se necesitan al menos 2 puntos o 1 sub-path completo para mostrar los controles
- **Puntos únicos**: Los puntos deben estar en posiciones diferentes (no superpuestos) para crear un área transformable
- **Área mínima**: El cuadro delimitador debe tener un tamaño mínimo (1 unidad) en al menos una dimensión
- **Tolerancia de posición**: Se considera que dos puntos están en la misma posición si están dentro de 0.1 unidades de distancia

### 🔄 Integración con el Sistema
- Se registra automáticamente en el sistema de plugins
- Maneja eventos de mouse con prioridad alta
- Se actualiza automáticamente cuando cambia la selección
- Compatible con el sistema de historial (undo/redo)

### 🎨 Experiencia de Usuario
- **Responsivo**: Los handles se adaptan al nivel de zoom
- **Suave**: Transiciones animadas de 0.1s
- **Intuitivo**: Cursores contextuales para cada modo
- **Informativo**: Estado actual visible durante la transformación

## Arquitectura

### Componentes Principales

1. **TransformManager.ts**: Lógica central de transformación
   - Cálculo de bounds con DOM nativo (SVG temporal)
   - Fallback a cálculo manual para robustez
   - Generación de handles
   - Aplicación de transformaciones
   - Detección de eventos de teclado

2. **TransformHandles.tsx**: Renderizado visual
   - Cuadro delimitador
   - Handles interactivos
   - Indicadores de hover
   - Feedback de rotación

3. **Transform.tsx**: Plugin principal
   - Integración con el sistema
   - Gestión de estado React
   - Indicador de estado de transformación

### Flujo de Transformación

1. **Detección**: Usuario selecciona elementos
2. **Cálculo DOM**: Se crea un SVG temporal y se calcula el bounding box real usando `getBBox()`
3. **Fallback**: Si el cálculo DOM falla, se usa cálculo manual con todos los puntos
4. **Generación de handles**: Se crean handles de esquina y rotación basados en los bounds
5. **Interacción**: Usuario hace click en un handle
6. **Transformación**: Se aplican las matemáticas de transformación
7. **Actualización**: Se actualizan todos los comandos afectados
8. **Historial**: Se guarda el estado para undo/redo

### Matemáticas de Transformación

#### Validaciones Previas
```typescript
// Verificación de selección válida
hasValidSelection = selectedSubPaths.length > 0 || selectedCommands.length > 1

// Cálculo de bounds con DOM nativo (método principal)
tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
tempSvg.appendChild(pathElement) // Para cada selección
boundingBox = tempSvg.getBBox() // Obtiene bounds reales

// Filtrado de puntos únicos (tolerancia 0.1) - solo en fallback
uniquePoints = points.filter(p => !isDuplicateWithin(p, tolerance))

// Validación de área mínima
boundingBox.width >= 1 || boundingBox.height >= 1
```

#### Escalado
```typescript
newX = originX + (x - originX) * scaleX
newY = originY + (y - originY) * scaleY
```

#### Rotación
```typescript
newX = centerX + dx * cos(angle) - dy * sin(angle)
newY = centerY + dx * sin(angle) + dy * cos(angle)
```

## Configuración

El plugin se registra automáticamente con alta prioridad para mouse eventos:

```typescript
pluginManager.registerPlugin(Transform); // Early registration for mouse priority
```

## Compatibilidad

- ✅ Múltiples puntos de comando (mínimo 2)
- ✅ Sub-paths completos
- ✅ Selecciones múltiples
- ✅ Cálculo de bounds con DOM nativo (preciso)
- ✅ Fallback a cálculo manual (robusto)
- ✅ Handles de rotación dedicados
- ✅ Zoom responsivo
- ✅ Grid snapping (respeta la configuración)
- ✅ Historial de deshacer/rehacer
