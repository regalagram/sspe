# Plugin de Curvas - Documentación

## Descripción General
El plugin de curvas permite crear paths vectoriales personalizados usando curvas de Bézier, similar al Pen Tool de Adobe Illustrator y la herramienta de curvas de Figma.

## Características Principales

### 1. Creación de Puntos
- **Click simple**: Crea un punto angular (corner point)
- **Click + arrastrar**: Crea un punto suave (smooth point) con handles de control
- **Double-click**: Finaliza el path actual

### 2. Tipos de Puntos
- **Corner Point**: Cambio abrupto de dirección, sin handles
- **Smooth Point**: Transición suave, handles simétricos
- **Asymmetric Point**: Transición suave pero handles independientes

### 3. Estados de la Herramienta
- **Modo Creación**: Cada click añade un nuevo punto al path
- **Modo Edición**: Permite modificar puntos existentes

### 4. Controles Avanzados
- **Alt + click**: Convierte el tipo de punto
- **Arrastrar punto**: Mueve el punto seleccionado
- **Arrastrar handle**: Ajusta la curvatura
- **Delete**: Elimina el punto seleccionado

## Atajos de Teclado
- **P**: Activar herramienta de curvas
- **Enter**: Finalizar path
- **Escape**: Salir de la herramienta
- **Delete/Backspace**: Eliminar punto seleccionado

## Estructura del Plugin

### Archivos principales:
- `Curves.tsx`: Definición del plugin
- `CurvesManager.ts`: Lógica de manejo de eventos y estado
- `CurvesRenderer.tsx`: Renderizado visual de curvas y handles
- `CurvesUI.tsx`: Interfaz de usuario del plugin

### Tipos definidos:
- `CurveToolMode`: Estados del modo de curva
- `PointType`: Tipos de puntos (corner, smooth, asymmetric)
- `CurvePoint`: Definición de un punto de curva
- `CurveState`: Estado completo de la herramienta

## Funcionalidad Técnica

### Detección de Drag
El plugin detecta automáticamente cuando el usuario hace click y arrastra para crear puntos suaves:
- Threshold de 5 pixels para detectar el inicio del drag
- Conversión automática de corner point a smooth point durante el drag

### Manejo de Handles
- **Handles simétricos**: Para puntos smooth, los handles se mueven juntos
- **Handles independientes**: Para puntos asymmetric
- **Snap de handles**: Los handles se ajustan a la grilla si está activada

### Conversión a Path SVG
Los puntos de curva se convierten automáticamente a comandos SVG:
- Primer punto: comando `M` (moveTo)
- Puntos subsecuentes: comando `L` (lineTo) o `C` (curveTo)
- Cierre de path: comando `Z` (closePath)

## Uso del Plugin

### Activación
1. Presionar `P` o usar el botón "Activate Curve Tool"
2. El panel de herramientas muestra el estado actual

### Creación de Curvas
1. Click para crear puntos angulares
2. Click + drag para crear puntos suaves
3. Alt + click para convertir tipos de punto
4. Double-click o Enter para finalizar

### Edición de Curvas
1. Click en puntos existentes para seleccionar
2. Arrastrar puntos para mover
3. Arrastrar handles para ajustar curvatura
4. Usar controles de UI para cambiar tipos de punto

### Finalización
- **Enter**: Finaliza el path actual y lo convierte a SVG
- **Escape**: Sale de la herramienta y descarta el path actual
- **Double-click**: Finaliza el path en el punto actual

## Integración con el Sistema
El plugin se integra con:
- **Sistema de grillas**: Snap automático si está activado
- **Historial de deshacer**: Los paths se guardan en el historial
- **Almacén de estado**: Se sincroniza con el estado global del editor
- **Sistema de plugins**: Depende del plugin de mouse-interaction

## Mejoras Futuras
- Adición de puntos en medio de segmentos
- Herramientas de selección múltiple
- Importación/exportación de paths
- Presets de curvas comunes
- Atajos de teclado para tipos de punto
