# Architectural Guidelines and Design Patterns

## 📋 Executive Summary

This document describes the architectural patterns, design principles, and technical guidelines used in the development of the SVG Sub-Path Editor. The goal is to provide a reference guide for developing similar applications with the same quality, structure, and simplicity.

## 🏗️ General Architecture

### 1. **Modular Plugin Architecture**

**Core Principle**: All functionality must be implemented as an independent plugin.

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

**Guidelines**:
- ✅ Each functionality must be in its own plugin
- ✅ Plugins must be completely independent
- ✅ It must be possible to enable/disable each plugin
- ✅ Plugins communicate only through the central store
- ✅ Each plugin defines its own UI components, shortcuts, and tools

### 2. **Position-Based UI System**

**Principle**: UI components are organized by physical positions in the interface.

```typescript
interface UIComponentDefinition {
  id: string;
  component: React.ComponentType<any>;
  position: 'toolbar' | 'sidebar' | 'statusbar' | 'contextmenu' | 'svg-content';
  order?: number;
}
```

**Standard Positions**:
- `toolbar`: Top toolbar
- `sidebar`: Right side panel (draggable)
- `svg-content`: Content rendered inside the SVG
- `statusbar`: Bottom status bar
- `contextmenu`: Context menus

**Order Guideline**: 
- Use `order` to control rendering order
- SVG content: Grid (0) → Paths (10) → Control Points (20) → Command Points (30) → Selection (100)

## 🗃️ State Management

### 3. **Central Store with Zustand**

**Principle**: A single centralized store that handles all application state.

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

**Guidelines**:
- ✅ The store is the single source of truth
- ✅ Plugins modify state only through store actions
- ✅ Use `renderVersion` to force re-renders when necessary
- ✅ Separate state by domains: paths, selection, viewport, etc.

### 4. **Granular and Specific Actions**

**Principle**: Each action must be atomic and focused on a single responsibility.

```typescript
interface EditorActions {
  // Selection actions
  selectPath: (pathId: string) => void;
  selectSubPath: (subPathId: string) => void;
  selectCommand: (commandId: string) => void;
  clearSelection: () => void;
  
  // Path actions
  addPath: (style?: PathStyle) => string;
  removePath: (pathId: string) => void;
  updateCommand: (commandId: string, updates: Partial<SVGCommand>) => void;
}
```

## 🎯 Component Patterns

### 5. **Draggable Panel Pattern**

**Principle**: All plugin controls must be in draggable panels.

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

**Guidelines**:
- ✅ Use `DraggablePanel` for all plugin controls
- ✅ Initial positions must avoid overlap
- ✅ Unique IDs for position persistence
- ✅ Descriptive and concise titles

### 6. **Separation of Logic and Presentation**

**Principle**: Separate control components from rendering components.

```typescript
// Control component
export const PluginControls: React.FC<PluginControlsProps> = ({ ... }) => {
  // Interaction logic
};

// SVG rendering component
export const PluginRenderer: React.FC = () => {
  // Rendering logic
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

## 🎮 Event Handling

### 7. **Centralized Mouse Events System**

**Principle**: Mouse events are handled centrally and distributed to plugins.

```typescript
interface MouseEventHandler {
  onMouseDown?: (e: MouseEvent<SVGElement>, context: MouseEventContext) => boolean;
  onMouseMove?: (e: MouseEvent<SVGElement>, context: MouseEventContext) => boolean;
  onMouseUp?: (e: MouseEvent<SVGElement>, context: MouseEventContext) => boolean;
}
```

**Guidelines**:
- ✅ Plugins return `true` if they handle the event (stop propagation)
- ✅ Use `data-*` attributes to identify SVG elements
- ✅ Provide complete context (svgPoint, refs, ids)

### 8. **Per-Plugin Keyboard Shortcuts**

**Principle**: Each plugin defines its own shortcuts declaratively.

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

## 🎨 SVG Rendering Patterns

### 9. **Smart Conditional Rendering**

**Principle**: Show elements only when necessary or relevant.

```typescript
export const Renderer: React.FC = () => {
  const { enabledFeatures, selection } = useEditorStore();
  
  // Show if feature is enabled OR if there are selected elements
  const shouldShow = enabledFeatures.has('feature') || selection.selectedItems.length > 0;
  
  if (!shouldShow) return null;
  
  return (/* render content */);
};
```

### 10. **Responsive Element Scaling**

**Principle**: UI elements in SVG must scale inversely to zoom.

```typescript
const radius = Math.max(6 / viewport.zoom, 2); // Minimum 2px
const strokeWidth = 2 / viewport.zoom;
```

## 🔧 Utilities and Helpers

### 11. **Pure Functions for Transformations**

**Principle**: Data transformations must be pure and reusable functions.

```typescript
// ✅ Pure function
export function getAbsoluteCommandPosition(
  command: SVGCommand, 
  subPath: SVGSubPath, 
  allSubPaths: SVGSubPath[]
): Point | null {
  // No side effects, predictable result
}

// ✅ Utility function
export function snapToGrid(point: Point, gridSize: number): Point {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize
  };
}
```

### 12. **Unique ID Generation**

**Principle**: Use a consistent system for generating unique IDs.

```typescript
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
```

## 📦 Directory Structure

### 13. **Organization by Domain and Function**

```
src/
├── core/                    # Core system
│   ├── PluginSystem.ts     # Plugin management
│   └── SvgEditor.tsx       # Main component
├── plugins/                # One directory per plugin
│   ├── zoom/
│   ├── grid/
│   ├── creation-tools/
│   └── [plugin-name]/
├── store/                  # State management
│   └── editorStore.ts
├── types/                  # Type definitions
│   └── index.ts
├── utils/                  # Shared utilities
│   ├── path-utils.ts
│   ├── id-utils.ts
│   └── [domain]-utils.ts
├── components/             # Reusable components
│   ├── DraggablePanel.tsx
│   └── SVGCommandIcons.tsx
└── styles/
    └── editor.css
```

## 🎯 API Design Principles

### 14. **Declarative APIs**

**Principle**: Configurations must be declarative, not imperative.

```typescript
// ✅ Declarative
const plugin: Plugin = {
  shortcuts: [{ key: 'z', modifiers: ['ctrl'], action: undo }],
  ui: [{ component: Controls, position: 'sidebar', order: 1 }]
};

// ❌ Imperative  
plugin.registerShortcut('ctrl+z', undo);
plugin.addUI(Controls, 'sidebar');
```

### 15. **Composition over Inheritance**

**Principle**: Prefer composition of functionalities over inheritance.

```typescript
// ✅ Composition
const useMyPlugin = () => {
  const { data } = useEditorStore();
  const { helper } = useUtilityHook();
  
  return { processedData: helper(data) };
};

// Plugin uses composition of hooks and utilities
```

## 🔄 Persistence Management

### 16. **Granular Persistence**

**Principle**: Persist user preferences in a granular and optional manner.

```typescript
interface UserPreferences {
  zoom: number;
  gridEnabled: boolean;
  gridSize: number;
  snapToGrid: boolean;
  showControlPoints: boolean;
}

// Persist only what's necessary for UX
const savePreferences = (prefs: UserPreferences) => {
  localStorage.setItem('svg-editor-prefs', JSON.stringify(prefs));
};
```

## 🧪 Testing Principles

### 17. **Testability by Design**

**Guidelines for making code testable**:
- ✅ Pure functions in utils/
- ✅ Independently testable store
- ✅ Plugins with injectable dependencies
- ✅ Clear separation of logic and presentation

## 📏 Code Standards

### 18. **Naming Conventions**

```typescript
// Interfaces: PascalCase with descriptive suffix
interface EditorState { }
interface PluginDefinition { }

// Components: PascalCase
export const ComponentName: React.FC = () => { };

// Hooks: camelCase with 'use' prefix
export const useEditorStore = () => { };

// Utilities: descriptive camelCase
export function getAbsolutePosition() { }

// Constants: UPPER_SNAKE_CASE
const DEFAULT_GRID_SIZE = 20;
```

### 19. **Strict TypeScript**

**Principle**: Use TypeScript strictly with complete typing.

```typescript
// ✅ Complete typing
interface StrictProps {
  requiredProp: string;
  optionalProp?: number;
  callback: (value: string) => void;
}

// ✅ Specific union types
type Mode = 'select' | 'create' | 'edit';

// ✅ Avoid 'any'
const processData = (data: unknown): ProcessedData => {
  // Type guards for validation
};
```

## 🚀 Scalability and Maintenance

### 20. **Scalability Principles**

**Extensibility**:
- ✅ New plugins without modifying core
- ✅ Configurable new UI positions
- ✅ Hook system for customization

**Performance**:
- ✅ Conditional rendering
- ✅ Memoization of expensive calculations
- ✅ Lazy loading of heavy components

**Maintenance**:
- ✅ Clear separation of responsibilities
- ✅ Inline code documentation
- ✅ Independent plugin versioning

## 📚 Summary of Key Guidelines

### ✅ DO

1. **Create one plugin per functionality**
2. **Use DraggablePanel for all controls**
3. **Complete typing with TypeScript**
4. **Pure functions for transformations**
5. **Central store as single source of truth**
6. **Separate control and rendering components**
7. **Centralized events with complete context**
8. **Smart conditional rendering**
9. **Inverse proportional scaling to zoom**
10. **Directory structure by domain**

### ❌ DON'T

1. **Don't mix business logic in UI components**
2. **Don't create direct dependencies between plugins**
3. **Don't use local state for shared data**
4. **Don't hardcode UI values without scaling**
5. **Don't create complex inheritance hierarchies**
6. **Don't ignore mouse event handling**
7. **Don't persist temporary state**
8. **Don't use 'any' in TypeScript**
9. **Don't couple components to specific positions**
10. **Don't implement functionalities outside the plugin system**

---

## 🎯 Applying these Guidelines

Following these guidelines ensures:

- **🏗️ Modular and extensible architecture**
- **🎨 Consistent and responsive UI**
- **⚡ Optimized performance**
- **🧪 Testable and maintainable code**
- **📈 Long-term scalability**
- **👥 Ease for new developers**

These principles have proven their effectiveness in building the SVG Sub-Path Editor and can be applied to any complex web application that requires modularity, extensibility, and long-term maintainability.