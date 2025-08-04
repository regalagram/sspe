# SVG Sub-Path Editor Architecture Guidelines

## Quick Context for AI Agent
- **Application**: SVG Sub-Path Editor with modular plugin architecture
- **UI System**: Accordion-only sidebar 
- **State Management**: Zustand with centralized store
- **Framework**: React + TypeScript
- **Key Pattern**: Everything is a plugin

## Core Architecture Rules

### Plugin System (MANDATORY)

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
  pointerHandlers?: PointerEventHandler;
  handleKeyDown?: (e: KeyboardEvent) => boolean;
  handleKeyUp?: (e: KeyboardEvent) => boolean;
}
```

### UI Component Positions
Only these positions are valid:
- `toolbar` - Fixed toolbars (top/bottom)
- `sidebar` - Accordion panels in sidebar
- `svg-content` - Inside SVG canvas
- `statusbar` - Status information
- `contextmenu` - Context menus

### Directory Structure (STRICT)
```
src/
├── core/               # Core system only
├── plugins/            # One folder per plugin
│   └── [plugin-name]/
│       ├── index.ts    # Plugin definition
│       └── utils/      # Plugin-specific utils only
├── components/         # All UI components
│   ├── Toolbar.tsx              # Main toolbar container
│   ├── ToolbarButton.tsx        # Reusable toolbar button
│   ├── ToolbarSubmenu.tsx       # Dropdown submenus
│   ├── WritingToolbar.tsx       # Top writing tools toolbar
│   ├── AccordionPanel.tsx       # Accordion panels for sidebar
│   ├── PluginButton.tsx         # Plugin buttons
│   ├── SVGCommandIcons.tsx      # SVG command icons
│   ├── SandwichButton.tsx       # Mobile menu toggle
│   └── [component-name].tsx
├── managers/           # Global managers
├── store/             # Zustand store
│   ├── editorStore.ts           # Main editor state
│   ├── toolbarStore.ts          # Toolbar state management
│   └── [domain]Actions.ts       # Domain-specific actions
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
- `store/`: Zustand stores with domain-specific actions
- `managers/`: Global system managers (ToolModeManager, etc.)

### Pointer Event Management (MANDATORY)

**Always use pointer event management for all input interactions.**

- All event handling must use Pointer events (`PointerEvent`).
- Do **not** use Mouse, Touch, or Pencil event handlers directly.
- All plugins, UI components, and logic must be designed for pointer event compatibility.
- This ensures unified handling for mouse, touch, pen, and other input devices.

**DO NOT** use `onMouseDown`, `onTouchStart`, or any device-specific event. Use only `onPointerDown`, `onPointerMove`, `onPointerUp`, etc.

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
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { PluginControls } from './PluginControls';
import { PluginRenderer } from './PluginRenderer';

export const MyPlugin: Plugin = {
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  enabled: true,
  
  ui: [
    {
      id: 'my-plugin-controls',
      component: PluginControls,
      position: 'sidebar',
      order: 10
    },
    {
      id: 'my-plugin-renderer',
      component: PluginRenderer,
      position: 'svg-content',
      order: 20
    },
    {
      id: 'my-plugin-toolbar',
      component: PluginToolbar,
      position: 'toolbar',
      order: 30
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
  
  pointerHandlers: {
    onPointerDown: (e, context) => {
      // Return true to stop propagation
      return false;
    }
  }
};
```

### Toolbar Implementation

#### Main Toolbar Structure
The application has two main toolbars:
- **WritingToolbar** (top): Creation tools, pencil, shapes, curves, styles, delete
- **Toolbar** (bottom): Undo/redo, zoom, animation controls

#### Toolbar Components
```typescript
// ToolbarButton - Reusable button component
import { ToolbarButton } from '../components/ToolbarButton';

const MyToolbarButton = () => (
  <ToolbarButton
    icon={<MyIcon />}
    label="Tool"
    onClick={handleClick}
    active={isActive}
    title="Tool description"
  />
);

// ToolbarSubmenu - Dropdown menus
import { ToolbarSubmenu } from '../components/ToolbarSubmenu';

const MySubmenu = () => (
  <ToolbarSubmenu
    trigger={<ToolbarButton icon={<MenuIcon />} />}
    isOpen={isSubmenuOpen}
    onToggle={toggleSubmenu}
  >
    <div>Submenu content</div>
  </ToolbarSubmenu>
);
```

#### Toolbar State Management
```typescript
// Use toolbar store for persistent states
import { useToolbarStore } from '../store/toolbarStore';

const MyToolbarComponent = () => {
  const { 
    activeCreationTool,
    setActiveCreationTool,
    isCreationSubmenuOpen,
    setCreationSubmenuOpen 
  } = useToolbarStore();
  
  return (
    <ToolbarButton
      active={activeCreationTool === 'my-tool'}
      onClick={() => setActiveCreationTool('my-tool')}
    />
  );
};
```

### Tool Mode Implementation
```typescript
// For exclusive tools (Creation, Pencil, etc.)
const MyTool: React.FC = () => {
  const { currentTool, setTool, clearTool } = useToolModeStore();
  const isActive = currentTool === 'my-tool';

  return (
    <ToolbarButton
      icon={<MyIcon />}
      onClick={() => isActive ? clearTool() : setTool('my-tool')}
      active={isActive}
      title="My Tool"
    />
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

### Pointer Event Handling
```typescript
// In plugin pointerHandlers
pointerHandlers: {
  onPointerDown: (e: PointerEvent<SVGElement>, context: PointerEventContext) => {
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
2. **Use toolbar/sidebar positions** for plugin UI
3. **Use ToolbarButton component** for consistent styling
4. **Use toolbar store** for persistent toolbar states
5. **Use ToolModeManager** for exclusive tools
6. **Complete TypeScript typing** (no `any`)
7. **Pure functions** for data transformations
8. **Central store** as single source of truth
9. **Separate UI and logic** components
10. **Scale elements** inversely to zoom
11. **Use data attributes** for element identification
12. **Return boolean** from pointer handlers
13. **Always use pointer event management for all input**

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
10. **No custom button styling** (use ToolbarButton)
11. **No toolbar state in component state** (use toolbar store)
12. **Never use Mouse, Touch, or Pencil event handlers** (`onMouseDown`, `onTouchStart`, etc.)

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
// In src/core/PluginInitializer.ts
import { MyPlugin } from '../plugins/shortcuts/MyPlugin';


export const initializePlugins = (): void => {
  // Register base dependencies first
  pluginManager.registerPlugin(MyPlugin); 
};
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
8. Use toolbar store for toolbar states
9. Use ToolbarButton for consistent styling
10. Scale SVG elements with zoom
11. Handle pointer events properly
12. Add keyboard shortcuts
13. Test with enable/disable
14. Always use pointer event management for all input (never Mouse, Touch, or Pencil events)

Remember: **Everything is a plugin, no exceptions.**