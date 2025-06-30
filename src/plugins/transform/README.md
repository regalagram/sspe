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
- **Indicador de rotación**: Círculo verde que aparece cerca de las esquinas
- **Feedback visual**: Los handles crecen al pasar el mouse sobre ellos
- **Estado de transformación**: Indicador en tiempo real del modo activo

### 🔧 Funcionalidades

#### Escalado
- Arrastra cualquier handle de esquina para escalar la selección
- La transformación se aplica desde el punto de anclaje opuesto
- Mantén `Shift` para escalar manteniendo las proporciones
- Soporte para escala negativa (reflejo)

#### Rotación
- Acerca el mouse a cualquier handle de esquina para activar el modo rotación
- Aparece un círculo indicador verde con el símbolo de rotación (↻)
- Arrastra para rotar alrededor del centro de la selección
- Rotación libre de 360 grados

### 🎨 Compatibilidad
- **Selección de comandos**: Transforma puntos individuales seleccionados
- **Selección de sub-paths**: Transforma sub-paths completos
- **Selección múltiple**: Aplica transformaciones a todos los elementos seleccionados
- **Puntos de control**: Incluye automáticamente los puntos de control de curvas Bézier

### ⌨️ Atajos de Teclado
- `Shift`: Mantener proporciones durante el escalado
- La tecla se detecta automáticamente durante la transformación

### 🎯 Casos de Uso
- Redimensionar formas manteniendo proporciones
- Rotar elementos para cambiar su orientación
- Ajustar rápidamente el tamaño de selecciones complejas
- Transformar múltiples elementos a la vez

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
   - Cálculo de bounds
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
2. **Cálculo**: Se calculan los bounds y handles
3. **Interacción**: Usuario hace click en un handle
4. **Transformación**: Se aplican las matemáticas de transformación
5. **Actualización**: Se actualizan todos los comandos afectados
6. **Historial**: Se guarda el estado para undo/redo

### Matemáticas de Transformación

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

- ✅ Puntos individuales (comandos M, L, C)
- ✅ Sub-paths completos
- ✅ Selecciones múltiples
- ✅ Puntos de control de curvas
- ✅ Zoom responsivo
- ✅ Grid snapping (respeta la configuración)
- ✅ Historial de deshacer/rehacer
