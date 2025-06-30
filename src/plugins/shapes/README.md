# Shapes Plugin

Este plugin agrega un panel completo de figuras geométricas predefinidas al editor SVG, similar a las herramientas de shapes que ofrece tldraw.

## Características

### 🎨 Figuras Disponibles

#### Formas Básicas
- **Rectángulo**: Rectángulo básico con proporciones 1:0.7
- **Cuadrado**: Cuadrado perfecto
- **Círculo**: Círculo perfecto usando curvas Bézier
- **Elipse**: Óvalo/elipse con proporción 1:0.6

#### Formas Geométricas
- **Triángulo**: Triángulo equilátero
- **Diamante**: Rombo/diamante
- **Hexágono**: Polígono de seis lados
- **Estrella**: Estrella de cinco puntas

#### Flechas
- **Flecha Derecha**: Flecha apuntando hacia la derecha
- **Flecha Izquierda**: Flecha apuntando hacia la izquierda

#### Símbolos
- **Corazón**: Forma de corazón usando curvas Bézier
- **Nube**: Forma de nube con curvas suaves
- **Checkbox**: Cuadrado con marca de verificación

### 🛠 Funcionalidades

#### Control de Tamaño
- Control deslizante para ajustar el tamaño (10-300px)
- Botones +/- para incrementos rápidos
- Input numérico para valores específicos
- Tamaño predeterminado: 50px

#### Categorías Organizadas
- **Basic**: Formas fundamentales (rectángulo, círculo, etc.)
- **Geometric**: Polígonos y figuras geométricas
- **Arrows**: Diferentes tipos de flechas
- **Symbols**: Símbolos especiales y decorativos

#### Modo de Creación
- **Activación**: Seleccionar cualquier forma activa el modo de creación
- **Vista Previa**: Visualización en tiempo real de la forma que se va a insertar
- **Cursor**: Crosshair con preview de la forma siguiendo el mouse
- **Inserción**: Un clic en el canvas inserta la forma
- **Desactivación**: Botón "Exit Shape Mode" o tecla Escape

### ⌨️ Atajos de Teclado

- **Shift + S**: Enfocar/mostrar el panel de figuras
- **Escape**: Salir del modo de creación de figuras

### 🎯 Integración con el Sistema

#### Compatibilidad con Otras Herramientas
- **Grid Snap**: Las figuras se ajustan automáticamente a la grilla si está activada
- **Historial**: Cada inserción se guarda en el historial (Undo/Redo)
- **Selección**: Las figuras insertadas se pueden seleccionar y editar normalmente
- **Transformaciones**: Compatible con todas las herramientas de transformación

#### Estilos Aplicados
- **Fill**: Azul semitransparente (#0078cc con 30% opacidad)
- **Stroke**: Azul sólido (#0000ff)
- **Stroke Width**: 2px
- **Line Caps**: Redondeadas
- **Line Joins**: Redondeadas

### 📐 Implementación Técnica

#### Algoritmos Utilizados
- **Círculos/Elipses**: Aproximación usando curvas Bézier cúbicas con factor kappa (0.5522848)
- **Corazón**: Ecuaciones paramétricas convertidas a curvas Bézier
- **Nube**: Múltiples curvas Bézier para crear forma orgánica
- **Estrella**: Algoritmo polar con radio interno/externo

#### Arquitectura
- **ShapeDefinitions.ts**: Definiciones y algoritmos de generación de formas
- **ShapeManager.ts**: Lógica de negocio y manejo de eventos
- **ShapesUI.tsx**: Interfaz de usuario y controles
- **ShapeCursor.tsx**: Preview y cursor personalizado
- **Shapes.tsx**: Plugin principal e integración

#### Patrones de Diseño
- **Manager Pattern**: ShapeManager centraliza la lógica de creación
- **Template Pattern**: Definiciones de formas usando interfaz común
- **Observer Pattern**: Sincronización entre UI y manager
- **Plugin Pattern**: Integración completa con el sistema de plugins

### 🚀 Uso

1. **Abrir Panel**: El panel "Shapes" aparece automáticamente en la barra lateral
2. **Seleccionar Categoría**: Usar las pestañas para navegar entre categorías
3. **Ajustar Tamaño**: Usar el control deslizante o input numérico
4. **Seleccionar Forma**: Hacer clic en cualquier botón de forma
5. **Vista Previa**: Mover el mouse sobre el canvas para ver el preview
6. **Insertar**: Hacer clic en la posición deseada para insertar la forma
7. **Continuar**: La forma se mantiene seleccionada para insertar múltiples instancias
8. **Terminar**: Hacer clic en "Exit Shape Mode" o presionar Escape

### 🎨 Personalización

Las formas se pueden personalizar después de la inserción usando:
- **Path Style Plugin**: Cambiar colores, opacidad, grosor de línea
- **Transform Plugin**: Escalar, rotar, mover
- **Point Transform**: Editar puntos individuales para modificar la forma

### 🔄 Estados del Plugin

1. **Inactivo**: Ninguna forma seleccionada, panel disponible
2. **Activo**: Forma seleccionada, modo de creación activado
3. **Preview**: Mouse sobre canvas, mostrando preview de la forma
4. **Insertando**: Procesando la inserción de la forma

### 📱 Responsive Design

- Panel redimensionable y arrastrable
- Categorías en pestañas compactas
- Controles optimizados para espacios pequeños
- Scroll automático para listas largas de formas

Este plugin extiende significativamente las capacidades del editor, permitiendo la inserción rápida de formas comunes sin necesidad de dibujarlas manualmente, similar a las herramientas profesionales de diseño como tldraw, Figma o Adobe Illustrator.
