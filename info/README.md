# SVG Sub-Path Editor

Un editor avanzado de archivos SVG con arquitectura modular de plugins, enfocado en la granularidad de sub-paths (desde un comando M hasta el siguiente comando M).

## Características Principales

### 🎯 Editor de Sub-Paths
- Manejo granular de sub-paths dentro de un path SVG
- Cada sub-path se puede seleccionar y editar independientemente
- Configuración individual de estilos por sub-path

### 🔧 Herramientas de Creación
- **Comandos básicos**: M (Move), L (Line), H (Horizontal), V (Vertical), Z (Close)
- **Curvas**: C (Cubic Bezier), S (Smooth Cubic), Q (Quadratic), T (Smooth Quadratic)
- **Arcos**: A (Arc) con control completo de parámetros
- Interfaz visual para seleccionar herramientas
- Atajos de teclado para acceso rápido

### 🎨 Configuración de Estilos
- Control completo de fill (color, opacidad)
- Control de stroke (color, grosor, opacidad, dash, line caps, line joins)
- Vista previa en tiempo real de cambios
- Selección de colores integrada

### 🔍 Navegación y Vista
- **Zoom**: In/Out, Zoom to Fit, Reset View
- **Pan**: Arrastrar con botón central del mouse
- Controles de zoom visual
- Atajos de teclado (Ctrl+Plus, Ctrl+Minus, Ctrl+0)

### 📐 Sistema de Grilla
- Grilla configurable con tamaño ajustable
- Snap to Grid para precisión
- Transparencia ajustable
- Toggle on/off

### ↶ Historial Undo/Redo
- Sistema completo de historial
- Undo/Redo con Ctrl+Z/Ctrl+Y
- Límite de 50 estados en historial
- Indicadores visuales de disponibilidad

### 🖥️ Pantalla Completa
- Modo fullscreen con F11
- Interfaz optimizada para pantalla completa
- API nativa del navegador

### 🎮 Selección y Manipulación
- Selección múltiple de puntos de comando
- Arrastrar y soltar puntos
- Selección de sub-paths completos
- Puntos de control visibles para curvas

## Arquitectura de Plugins

### 🏗️ Sistema Modular
El editor está construido con una arquitectura de plugins que permite:
- Habilitar/deshabilitar características independientemente
- Agregar nuevas funcionalidades sin modificar el core
- Gestión de atajos de teclado por plugin
- Componentes de UI modulares

### 📦 Plugins Incluidos
1. **ZoomPlugin**: Controles de zoom y navegación
2. **GridPlugin**: Sistema de grilla y snap
3. **UndoRedoPlugin**: Historial de cambios
4. **CreationToolsPlugin**: Herramientas de creación de comandos
5. **FullscreenPlugin**: Modo pantalla completa
6. **PathStylePlugin**: Configuración de estilos de path

### 🔌 Estructura de Plugin
```typescript
interface Plugin {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  dependencies?: string[];
  shortcuts?: ShortcutDefinition[];
  ui?: UIComponentDefinition[];
  tools?: ToolDefinition[];
}
```

## Tecnologías Utilizadas

- **React 19** - Framework de UI
- **TypeScript** - Tipado estático
- **Zustand** - Gestión de estado
- **Vite** - Build tool y servidor de desarrollo
- **SVG** - Formato de gráficos vectoriales

## Estructura del Proyecto

```
src/
├── core/
│   ├── SvgEditor.tsx        # Componente principal
│   └── PluginSystem.ts      # Sistema de plugins
├── plugins/
│   ├── zoom/
│   ├── grid/
│   ├── undo-redo/
│   ├── creation-tools/
│   ├── fullscreen/
│   └── path-style/
├── store/
│   └── editorStore.ts       # Estado global con Zustand
├── types/
│   └── index.ts            # Definiciones de tipos
├── utils/
│   ├── path-utils.ts       # Utilidades para SVG paths
│   └── id-utils.ts         # Generación de IDs únicos
└── styles/
    └── editor.css          # Estilos CSS
```

## Comandos Disponibles

### Desarrollo
```bash
npm run dev    # Inicia servidor de desarrollo
```

### Atajos de Teclado

#### Navegación
- `Ctrl+Plus`: Zoom In
- `Ctrl+Minus`: Zoom Out
- `Ctrl+0`: Zoom to Fit
- `Ctrl+R`: Reset View

#### Herramientas
- `M`: Herramienta Move To
- `L`: Herramienta Line To
- `C`: Herramienta Cubic Bezier
- `Q`: Herramienta Quadratic Bezier
- `A`: Herramienta Arc
- `Escape`: Salir del modo creación

#### Edición
- `Ctrl+Z`: Undo
- `Ctrl+Y`: Redo
- `Ctrl+Shift+Z`: Redo (alternativo)
- `Delete/Backspace`: Eliminar selección
- `Escape`: Limpiar selección

#### Vista
- `Ctrl+G`: Toggle Grid
- `Ctrl+Shift+G`: Toggle Snap to Grid
- `F11`: Toggle Fullscreen
- `Ctrl+F`: Toggle Fullscreen (alternativo)

## Próximas Características

### 🔄 Funcionalidades Planeadas
- [ ] Importar/Exportar archivos SVG
- [ ] Múltiples capas de paths
- [ ] Transformaciones (rotate, scale, skew)
- [ ] Herramientas de selección avanzadas
- [ ] Clipboard (copy/paste)
- [ ] Animaciones SVG
- [ ] Filtros y efectos SVG
- [ ] Modo oscuro
- [ ] Múltiples ventanas/pestañas
- [ ] Colaboración en tiempo real

### 🏗️ Mejoras Técnicas
- [ ] Mejor parsing de paths SVG complejos
- [ ] Optimización de renderizado para paths grandes
- [ ] Sistema de themes
- [ ] Extensibilidad de plugins de terceros
- [ ] API REST para integración
- [ ] Pruebas unitarias e integración

## Contribución

Este proyecto está diseñado para ser extensible. Para agregar nuevas características:

1. Crear un nuevo plugin en `src/plugins/`
2. Implementar la interfaz `Plugin`
3. Registrar el plugin en `SvgEditor.tsx`
4. Agregar tipos necesarios en `src/types/`
5. Actualizar el store si es necesario

## Licencia

MIT License - ver archivo LICENSE para detalles.
