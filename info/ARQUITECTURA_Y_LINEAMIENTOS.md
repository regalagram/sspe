# Lineamientos Arquitectónicos y Patrones de Diseño

## 📋 Resumen Ejecutivo

Este documento describe los patrones arquitectónicos, principios de diseño y lineamientos técnicos utilizados en el desarrollo del SVG Sub-Path Editor. El objetivo es proporcionar una guía de referencia para desarrollar aplicaciones similares con la misma calidad, estructura y simplicidad.

## 🏗️ Arquitectura General

### 1. **Arquitectura de Plugin Modular**

**Principio Central**: Toda funcionalidad debe ser implementada como un plugin independiente.

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
  mouseHandlers?: MouseEventHandler;
  initialize?: (editor: any) => void;
  destroy?: () => void;
}
```

**Lineamientos**:
- ✅ Cada funcionalidad debe estar en su propio plugin
- ✅ Los plugins deben ser completamente independientes
- ✅ Debe ser posible habilitar/deshabilitar cada plugin
- ✅ Los plugins se comunican solo a través del store central
- ✅ Cada plugin define sus propios componentes UI, shortcuts y herramientas

### 2. **Sistema de UI por Posiciones**

**Principio**: Los componentes UI se organizan por posiciones físicas en la interfaz.

```typescript
interface UIComponentDefinition {
  id: string;
  component: React.ComponentType<any>;
  position: 'toolbar' | 'sidebar' | 'statusbar' | 'contextmenu' | 'svg-content';
  order?: number;
}
```

**Posiciones Estándar**:
- `toolbar`: Barra superior de herramientas
- `sidebar`: Panel lateral derecho (draggable)
- `svg-content`: Contenido renderizado dentro del SVG
- `statusbar`: Barra inferior de estado
- `contextmenu`: Menús contextuales

**Lineamiento de Orden**: 
- Usar `order` para controlar el orden de renderizado
- SVG content: Grid (0) → Paths (10) → Control Points (20) → Command Points (30) → Selection (100)

## 🗃️ Gestión de Estado

### 3. **Store Central con Zustand**

**Principio**: Un solo store centralizado que maneja todo el estado de la aplicación.

```typescript
interface EditorState {
  paths: SVGPath[];
  selection: SelectionState;
  viewport: ViewportState;
  grid: GridState;
  mode: EditorMode;
  history: HistoryState;
  isFullscreen: boolean;
  enabledFeatures: Set<string>;
  renderVersion: number;
}
```

**Lineamientos**:
- ✅ El store es la única fuente de verdad
- ✅ Los plugins modifican el estado solo a través de acciones del store
- ✅ Usar `renderVersion` para forzar re-renders cuando sea necesario
- ✅ Separar estado por dominios: paths, selection, viewport, etc.

### 4. **Acciones Granulares y Específicas**

**Principio**: Cada acción debe ser atómica y enfocada en una responsabilidad.

```typescript
interface EditorActions {
  // Acciones de selección
  selectPath: (pathId: string) => void;
  selectSubPath: (subPathId: string) => void;
  selectCommand: (commandId: string) => void;
  clearSelection: () => void;
  
  // Acciones de paths
  addPath: (style?: PathStyle) => string;
  removePath: (pathId: string) => void;
  updateCommand: (commandId: string, updates: Partial<SVGCommand>) => void;
}
```

## 🎯 Patrones de Componentes

### 5. **Patrón de Paneles Draggables**

**Principio**: Todos los controles de plugins deben estar en paneles arrastrables.

```typescript
export const PluginComponent: React.FC = () => {
  return (
    <DraggablePanel 
      title="Plugin Name"
      initialPosition={{ x: 980, y: 80 }}
      id="plugin-name"
    >
      <PluginControls />
    </DraggablePanel>
  );
};
```

**Lineamientos**:
- ✅ Usar `DraggablePanel` para todos los controles de plugins
- ✅ Posiciones iniciales deben evitar solapamiento
- ✅ IDs únicos para persistencia de posiciones
- ✅ Títulos descriptivos y concisos

### 6. **Separación de Lógica y Presentación**

**Principio**: Separar componentes de control de componentes de renderizado.

```typescript
// Componente de controles
export const PluginControls: React.FC<PluginControlsProps> = ({ ... }) => {
  // Lógica de interacción
};

// Componente de renderizado SVG
export const PluginRenderer: React.FC = () => {
  // Lógica de renderizado
};

// Plugin definition
export const Plugin: Plugin = {
  ui: [
    {
      id: 'plugin-controls',
      component: PluginControls,
      position: 'sidebar',
      order: 1
    },
    {
      id: 'plugin-renderer', 
      component: PluginRenderer,
      position: 'svg-content',
      order: 10
    }
  ]
};
```

## 🎮 Manejo de Eventos

### 7. **Sistema de Mouse Events Centralizado**

**Principio**: Los eventos de mouse se manejan centralmente y se distribuyen a plugins.

```typescript
interface MouseEventHandler {
  onMouseDown?: (e: MouseEvent<SVGElement>, context: MouseEventContext) => boolean;
  onMouseMove?: (e: MouseEvent<SVGElement>, context: MouseEventContext) => boolean;
  onMouseUp?: (e: MouseEvent<SVGElement>, context: MouseEventContext) => boolean;
}
```

**Lineamientos**:
- ✅ Los plugins retornan `true` si manejan el evento (stop propagation)
- ✅ Usar `data-*` attributes para identificar elementos SVG
- ✅ Proporcionar contexto completo (svgPoint, refs, ids)

### 8. **Shortcuts de Teclado por Plugin**

**Principio**: Cada plugin define sus propios shortcuts de forma declarativa.

```typescript
shortcuts: [
  {
    key: 'c',
    modifiers: ['ctrl'],
    description: 'Toggle Feature',
    action: () => {
      const store = useEditorStore.getState();
      store.toggleFeature('feature-name');
    }
  }
]
```

## 🎨 Patrones de Renderizado SVG

### 9. **Renderizado Condicional Inteligente**

**Principio**: Mostrar elementos solo cuando son necesarios o relevantes.

```typescript
export const Renderer: React.FC = () => {
  const { enabledFeatures, selection } = useEditorStore();
  
  // Mostrar si feature está habilitado O si hay elementos seleccionados
  const shouldShow = enabledFeatures.has('feature') || selection.selectedItems.length > 0;
  
  if (!shouldShow) return null;
  
  return (/* render content */);
};
```

### 10. **Escalado Responsivo de Elementos**

**Principio**: Los elementos UI en SVG deben escalar inversamente al zoom.

```typescript
const radius = Math.max(6 / viewport.zoom, 2); // Mínimo 2px
const strokeWidth = 2 / viewport.zoom;
```

## 🔧 Utilidades y Helpers

### 11. **Funciones Puras para Transformaciones**

**Principio**: Las transformaciones de datos deben ser funciones puras y reutilizables.

```typescript
// ✅ Función pura
export function getAbsoluteCommandPosition(
  command: SVGCommand, 
  subPath: SVGSubPath, 
  allSubPaths: SVGSubPath[]
): Point | null {
  // Sin efectos secundarios, resultado predecible
}

// ✅ Función utilitaria
export function snapToGrid(point: Point, gridSize: number): Point {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize
  };
}
```

### 12. **Generación de IDs Únicos**

**Principio**: Usar un sistema consistente de generación de IDs únicos.

```typescript
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
```

## 📦 Estructura de Directorios

### 13. **Organización por Dominio y Función**

```
src/
├── core/                    # Sistema central
│   ├── PluginSystem.ts     # Gestión de plugins
│   └── SvgEditor.tsx       # Componente principal
├── plugins/                # Un directorio por plugin
│   ├── zoom/
│   ├── grid/
│   ├── creation-tools/
│   └── [plugin-name]/
├── store/                  # Gestión de estado
│   └── editorStore.ts
├── types/                  # Definiciones de tipos
│   └── index.ts
├── utils/                  # Utilidades compartidas
│   ├── path-utils.ts
│   ├── id-utils.ts
│   └── [domain]-utils.ts
├── components/             # Componentes reutilizables
│   ├── DraggablePanel.tsx
│   └── SVGCommandIcons.tsx
└── styles/
    └── editor.css
```

## 🎯 Principios de Diseño de APIs

### 14. **APIs Declarativas**

**Principio**: Las configuraciones deben ser declarativas, no imperativas.

```typescript
// ✅ Declarativo
const plugin: Plugin = {
  shortcuts: [{ key: 'z', modifiers: ['ctrl'], action: undo }],
  ui: [{ component: Controls, position: 'sidebar', order: 1 }]
};

// ❌ Imperativo  
plugin.registerShortcut('ctrl+z', undo);
plugin.addUI(Controls, 'sidebar');
```

### 15. **Composición sobre Herencia**

**Principio**: Preferir composición de funcionalidades sobre herencia.

```typescript
// ✅ Composición
const useMyPlugin = () => {
  const { data } = useEditorStore();
  const { helper } = useUtilityHook();
  
  return { processedData: helper(data) };
};

// Plugin usa composición de hooks y utilidades
```

## 🔄 Gestión de Persistencia

### 16. **Persistencia Granular**

**Principio**: Persistir preferencias de usuario de forma granular y opcional.

```typescript
interface UserPreferences {
  zoom: number;
  gridEnabled: boolean;
  gridSize: number;
  snapToGrid: boolean;
  showControlPoints: boolean;
}

// Persistir solo lo necesario para UX
const savePreferences = (prefs: UserPreferences) => {
  localStorage.setItem('svg-editor-prefs', JSON.stringify(prefs));
};
```

## 🧪 Principios de Testing

### 17. **Testabilidad por Diseño**

**Lineamientos para hacer el código testeable**:
- ✅ Funciones puras en utils/
- ✅ Store testeable independientemente 
- ✅ Plugins con dependencias inyectables
- ✅ Separación clara de lógica y presentación

## 📏 Estándares de Código

### 18. **Convenciones de Nomenclatura**

```typescript
// Interfaces: PascalCase con sufijo descriptivo
interface EditorState { }
interface PluginDefinition { }

// Componentes: PascalCase
export const ComponentName: React.FC = () => { };

// Hooks: camelCase con prefijo 'use'
export const useEditorStore = () => { };

// Utilidades: camelCase descriptivo
export function getAbsolutePosition() { }

// Constantes: UPPER_SNAKE_CASE
const DEFAULT_GRID_SIZE = 20;
```

### 19. **TypeScript Estricto**

**Principio**: Usar TypeScript de forma estricta con tipado completo.

```typescript
// ✅ Tipado completo
interface StrictProps {
  requiredProp: string;
  optionalProp?: number;
  callback: (value: string) => void;
}

// ✅ Tipos de unión específicos
type Mode = 'select' | 'create' | 'edit';

// ✅ Evitar 'any'
const processData = (data: unknown): ProcessedData => {
  // Type guards para validar
};
```

## 🚀 Escalabilidad y Mantenimiento

### 20. **Principios de Escalabilidad**

**Extensibilidad**:
- ✅ Nuevos plugins sin modificar core
- ✅ Nuevas posiciones UI configurables
- ✅ Sistema de hooks para customización

**Performance**:
- ✅ Renderizado condicional
- ✅ Memoización de cálculos costosos
- ✅ Lazy loading de componentes pesados

**Mantenimiento**:
- ✅ Separación clara de responsabilidades
- ✅ Documentación inline del código
- ✅ Versionado de plugins independiente

## 📚 Resumen de Lineamientos Clave

### ✅ DO (Hacer)

1. **Crear un plugin por cada funcionalidad**
2. **Usar DraggablePanel para todos los controles**
3. **Tipado completo con TypeScript**
4. **Funciones puras para transformaciones**
5. **Store central como única fuente de verdad**
6. **Separar componentes de control y renderizado**
7. **Eventos centralizados con contexto completo**
8. **Renderizado condicional inteligente**
9. **Escalado inversamente proporcional al zoom**
10. **Estructura de directorios por dominio**

### ❌ DON'T (No hacer)

1. **No mezclar lógica de negocio en componentes UI**
2. **No crear dependencias directas entre plugins**
3. **No usar state local para datos compartidos**
4. **No hardcodear valores de UI sin escalado**
5. **No crear jerarquías de herencia complejas**
6. **No ignorar el manejo de eventos de mouse**
7. **No persistir estado temporal**
8. **No usar 'any' en TypeScript**
9. **No acoplar componentes a posiciones específicas**
10. **No implementar funcionalidades fuera del sistema de plugins**

---

## 🎯 Aplicación de estos Lineamientos

Siguiendo estos lineamientos se garantiza:

- **🏗️ Arquitectura modular y extensible**
- **🎨 UI consistente y responsive**
- **⚡ Performance optimizada**
- **🧪 Código testeable y mantenible**
- **📈 Escalabilidad a largo plazo**
- **👥 Facilidad para nuevos desarrolladores**

Estos principios han demostrado su efectividad en la construcción del SVG Sub-Path Editor y pueden aplicarse a cualquier aplicación web compleja que requiera modularidad, extensibilidad y mantenabilidad a largo plazo.
