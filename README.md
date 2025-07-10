# SVG Sub-Path Editor Architecture Guidelines

## Quick Context for AI Agent
- **Application**: SVG Sub-Path Editor with modular plugin architecture
- **UI System**: Accordion-only sidebar 
- **State Management**: Zustand with centralized store
- **Framework**: React + TypeScript
- **Key Pattern**: Everything is a plugin

## Core Architecture Rules

### 1. Plugin System (MANDATORY)

Every feature MUST be a plugin following this interface:

```typescript
interface Plugin {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  dependencies?: string[];
  initialize?: (editor: ReturnType<typeof useEditorStore>) => void;
  destroy?: () => void;
  onActivate?: () => void;
  onDeactivate?: () => void;
  tools?: ToolDefinition[];
  shortcuts?: ShortcutDefinition[];
  ui?: UIComponentDefinition[];
  mouseHandlers?: MouseEventHandler;
  handleKeyDown?: (e: KeyboardEvent) => boolean;
  handleKeyUp?: (e: KeyboardEvent) => boolean;
}
```

### 2. UI Component Positions
Only these positions are valid:
- `accordion` - Collapsible panels in sidebar
- `svg-content` - Inside SVG canvas

### 3. Directory Structure (STRICT)
```
src/
├── core/               # Core system only
├── plugins/            # One folder per plugin
│   └── [plugin-name]/
│       ├── index.ts    # Plugin definition
│       └── utils/      # Plugin-specific utils only
├── components/         # All UI components
│   ├── AccordionToggleButton.tsx
│   ├── PluginButton.tsx
│   ├── SVGCommandIcons.tsx
│   └── [component-name].tsx
├── managers/           # Global managers
├── store/             # Zustand store
├── types/             # TypeScript types
├── utils/             # Shared utilities
│   ├── path-utils.ts
│   ├── id-utils.ts
│   └── [domain]-utils.ts
├── hooks/             # Custom React hooks
│   ├── useCombinedCursor.ts
│   ├── useEditorStyles.ts
│   └── [hook-name].ts
└── styles/            # Global styles
    └── editor.css
```

**Directory Rules:**
- `components/`: ALL React components go here (never inside plugins)
- `plugins/[name]/`: Only plugin definition + plugin-specific utils
- `utils/`: Shared utilities used by multiple plugins
- `styles/`: Global CSS files only
- `hooks/`: Custom React hooks shared across plugins

## Code Generation Rules

### State Management Pattern
```typescript
// ALWAYS use this pattern for store actions
interface EditorActions {
  // Atomic, single-responsibility actions
  selectPath: (pathId: string) => void;
  updateCommand: (commandId: string, updates: Partial<SVGCommand>) => void;
  // Never combine multiple operations in one action
}

// Access store in components
const Component = () => {
  const { paths, selectPath } = useEditorStore();
  // Never use useState for shared data
};
```

### Plugin Creation Template
```typescript
// File: src/plugins/[plugin-name]/index.ts
import { Plugin } from '@/types';
import { PluginControls } from '@/components/PluginControls';
import { PluginRenderer } from '@/components/PluginRenderer';

export const MyPlugin: Plugin = {
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  enabled: true,
  
  ui: [
    {
      id: 'my-plugin-controls',
      component: PluginControls,
      position: 'accordion',
      order: 10
    },
    {
      id: 'my-plugin-renderer',
      component: PluginRenderer,
      position: 'svg-content',
      order: 20
    }
  ],
  
  shortcuts: [
    {
      key: 'p',
      modifiers: ['ctrl'],
      description: 'Toggle plugin',
      action: () => {
        const store = useEditorStore.getState();
        store.toggleFeature('my-plugin');
      }
    }
  ],
  
  mouseHandlers: {
    onMouseDown: (e, context) => {
      // Return true to stop propagation
      return false;
    }
  }
};
```

### Tool Mode Implementation
```typescript
// For exclusive tools (Creation, Pencil, etc.)
const MyTool: React.FC = () => {
  const { currentTool, setTool, clearTool } = useToolModeStore();
  const isActive = currentTool === 'my-tool';

  return (
    <button 
      onClick={() => isActive ? clearTool() : setTool('my-tool')}
      className={isActive ? 'active' : ''}
    >
      My Tool
    </button>
  );
};
```

### SVG Rendering Patterns
```typescript
// ALWAYS scale UI elements inversely to zoom
const SVGElement: React.FC = () => {
  const { viewport } = useEditorStore();
  
  const radius = Math.max(6 / viewport.zoom, 2);
  const strokeWidth = 2 / viewport.zoom;
  
  return (
    <circle 
      r={radius} 
      strokeWidth={strokeWidth}
      // Use data attributes for identification
      data-element-type="control-point"
      data-element-id={id}
    />
  );
};
```

### Mouse Event Handling
```typescript
// In plugin mouseHandlers
mouseHandlers: {
  onMouseDown: (e: MouseEvent<SVGElement>, context: MouseEventContext) => {
    const element = e.target as SVGElement;
    const elementType = element.dataset.elementType;
    const elementId = element.dataset.elementId;
    
    if (elementType === 'my-element') {
      // Handle event
      return true; // Stop propagation
    }
    return false;
  }
}
```

## Critical Implementation Rules

### DO ✅
1. **One plugin = One feature** (no exceptions)
2. **Use accordion panels** for all plugin controls
3. **Use ToolModeManager** for exclusive tools
4. **Complete TypeScript typing** (no `any`)
5. **Pure functions** for data transformations
6. **Central store** as single source of truth
7. **Separate UI and logic** components
8. **Scale elements** inversely to zoom
9. **Use data attributes** for element identification
10. **Return boolean** from mouse handlers

### DON'T ❌
1. **No business logic** in UI components
2. **No direct plugin dependencies**
3. **No useState for shared data**
4. **No hardcoded sizes** without zoom scaling
5. **No complex inheritance**
6. **No local state** for editor data
7. **No multiple active tools**
8. **No features outside plugins**
9. **No imperative APIs**

## Common Patterns

### Conditional Rendering
```typescript
// Show only when relevant
const Component = () => {
  const { enabledFeatures, selection } = useEditorStore();
  const shouldShow = enabledFeatures.has('feature') || selection.selectedItems.length > 0;
  
  if (!shouldShow) return null;
  return <div>...</div>;
};
```

### ID Generation
```typescript
// Always use this pattern
export const generateId = (): string => 
  `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
```

### Utility Functions
```typescript
// Pure, reusable, testable
export const snapToGrid = (point: Point, gridSize: number): Point => ({
  x: Math.round(point.x / gridSize) * gridSize,
  y: Math.round(point.y / gridSize) * gridSize
});
```

## Plugin Registration
```typescript
// In src/core/PluginSystem.ts
import { MyPlugin } from '@/plugins/my-plugin';

const plugins = [
  MyPlugin,
  // Other plugins...
];

plugins.forEach(plugin => {
  if (plugin.enabled) {
    registerPlugin(plugin);
  }
});
```

## TypeScript Interfaces

### Core Types
```typescript
export type SVGCommandType = 'M' | 'L' | 'C' | 'Z';

export interface Point {
  x: number;
  y: number;
}

export interface SVGCommand {
  id: string;
  command: SVGCommandType;
  x?: number;
  y?: number;
  x1?: number;  // Control point 1 x for curves
  y1?: number;  // Control point 1 y for curves
  x2?: number;  // Control point 2 x for curves
  y2?: number;  // Control point 2 y for curves
}

export interface SVGSubPath {
  id: string;
  commands: SVGCommand[];
  locked?: boolean; // If true, subpath is locked and unselectable
}

export interface PathStyle {
  fill?: string;
  fillOpacity?: number;
  stroke?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
  strokeDasharray?: string;
  strokeLinecap?: 'butt' | 'round' | 'square';
  strokeLinejoin?: 'miter' | 'round' | 'bevel';
  fillRule?: 'nonzero' | 'evenodd';
}

export interface SVGPath {
  id: string;
  subPaths: SVGSubPath[];
  style: PathStyle;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ViewportState {
  zoom: number;
  pan: Point;
  viewBox: BoundingBox;
}

export interface SelectionState {
  selectedPaths: string[];
  selectedSubPaths: string[];
  selectedCommands: string[];
  selectedControlPoints: string[];
  selectionBox?: BoundingBox;
}
```

## Language Requirements
- **All UI text in English** (buttons, labels, messages, tooltips)
- **No localization needed**

## Deployment
```bash
vercel --prod
```

---

## Quick Reference for AI Agents

When generating code:
1. Check if feature exists as plugin
2. Follow exact directory structure
3. Use provided interfaces
4. Place all components in src/components
5. Keep only plugin definition and specific utils in plugin folder
6. Register in plugin system
7. Use central store for state
8. Scale SVG elements with zoom
9. Handle mouse events properly
10. Add keyboard shortcuts
11. Test with enable/disable

Remember: **Everything is a plugin, no exceptions.**