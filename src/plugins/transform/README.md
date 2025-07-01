# Transform Plugin

El plugin de transformación permite escalar y rotar selecciones directamente en el editor, similar a la funcionalidad de tldraw.

## Características

### 🎯 Transformaciones Interactivas
- **Escalado**: Arrastra los handles de las esquinas para cambiar el tamaño
- **Rotación**: Usa el handle dedicado de rotación ubicado arriba del cuadro delimitador
- **Proporciones**: Mantén presionada la tecla `Shift` para mantener las proporciones al escalar

### 🎮 Controles Visuales
- **Cuadro delimitador**: Se muestra automáticamente al seleccionar elementos
- **Handles de esquina**: Cuadrados azules para escalado
- **Handle de rotación**: Círculo verde ubicado arriba del centro del cuadro delimitador
- **Feedback visual**: Los handles crecen al pasar el mouse sobre ellos
- **Estado de transformación**: Indicador en tiempo real del modo activo

### 🔧 Funcionalidades

#### Escalado
- Arrastra cualquier handle de esquina para escalar la selección
- La transformación se aplica desde el punto de anclaje opuesto
- Mantén `Shift` para escalar manteniendo las proporciones
- Soporte para escala negativa (reflejo/mirror)

#### Rotación
- Usa el handle dedicado de rotación ubicado arriba del cuadro delimitador
- Aparece como un círculo verde con el símbolo de rotación (↻)
- Arrastra para rotar alrededor del centro de la selección
- Rotación libre de 360 grados

### 🎨 Compatibilidad
- **Selección múltiple de comandos**: Transforma múltiples puntos seleccionados (mínimo 2 puntos)
- **Selección de sub-paths**: Transforma sub-paths completos
- **Selección múltiple**: Aplica transformaciones a todos los elementos seleccionados
- **Puntos de control**: Incluye automáticamente los puntos de control de curvas Bézier
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
- **Área de transformación**: Solo se crean controles cuando hay suficiente área para definir un cuadro delimitador

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
- **Diferenciación visual**: Handles de esquina cuadrados azules vs handle de rotación circular verde
- **Línea guía**: Línea punteada conecta el handle de rotación con el cuadro delimitador

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
// Translate to center
dx = x - centerX
dy = y - centerY

// Apply rotation matrix
newX = centerX + dx * cos(angle) - dy * sin(angle)
newY = centerY + dx * sin(angle) + dy * cos(angle)
```

#### Mirror/Reflejo
- Se permite escala negativa para crear efectos de espejo
- Los bounds se normalizan automáticamente después del mirror
- Funciona tanto horizontal como verticalmente

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
