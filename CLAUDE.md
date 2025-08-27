# SVG Sub-Path Editor - AI Guidelines

## Core Rules
- **Everything is a plugin** (no exceptions)
- **Pointer events only** (`onPointerDown` not `onMouseDown`)
- **Central Zustand store** (no local state for shared data)
- **Components in `src/components/`** (never in plugins)
- **Scale with zoom** (`size / viewport.zoom`)
- **UnifiedRenderer** for all SVG content

## Plugin Template
```typescript
export const MyPlugin: Plugin = {
  id: 'my-feature',
  name: 'My Feature',
  version: '1.0.0',
  enabled: true,
  
  ui: [{
    id: 'my-controls',
    component: MyControls,
    position: 'sidebar'
  }],
  
  pointerHandlers: {
    onPointerDown: (e, context) => {
      // Handle events, return true to stop propagation
      return false;
    }
  },
  
  floatingActions: [{
    elementTypes: ['path'],
    actions: [{
      id: 'my-action',
      icon: MyIcon,
      type: 'button',
      action: () => doAction(),
      priority: 80
    }]
  }]
};
```

## Directory Structure
```
src/
├── core/               # PluginSystem, UnifiedRenderer
├── plugins/[name]/     # Plugin definition + utils only
├── components/         # ALL React components
├── store/             # Zustand stores
├── hooks/             # React hooks
└── types/             # TypeScript definitions
```

## Rendering Layers
```typescript
enum RenderLayer {
  BACKGROUND = 0,    // Grid, guides
  CONTENT = 100,     // SVG paths, shapes
  SELECTION = 200,   // Selection boxes
  HANDLES = 300,     # Control points
  OVERLAYS = 400,    # Edit overlays
  FLOATING_UI = 500  # Contextual UI
}
```

## SVG Pattern
```typescript
const SVGElement: React.FC = () => {
  const { viewport } = useEditorStore();
  
  return (
    <g data-layer="handles" data-plugin="my-plugin">
      <circle 
        r={6 / viewport.zoom}
        strokeWidth={2 / viewport.zoom}
        data-element-type="control-point"
        onPointerDown={handlePointer}
      />
    </g>
  );
};
```

## Store Pattern
```typescript
// Access state
const { paths, selection, selectPath } = useEditorStore();

// Atomic actions
interface EditorActions {
  selectPath: (pathId: string) => void;
  updateCommand: (commandId: string, updates: Partial<SVGCommand>) => void;
}
```

## Key Types
```typescript
interface SVGCommand {
  id: string;
  command: 'M' | 'L' | 'C' | 'Z';
  x?: number; y?: number;
  x1?: number; y1?: number; // Control points
  x2?: number; y2?: number;
}

interface SVGPath {
  id: string;
  subPaths: SVGSubPath[];
  style: PathStyle;
}
```

## Quick Checklist
1. Create plugin in `src/plugins/[name]/`
2. Place components in `src/components/`
3. Use `ToolbarButton` for consistency
4. Register in PluginInitializer
5. Use pointer events only
6. Scale with zoom
7. Assign proper RenderLayer
8. Test enable/disable

**Remember: Everything is a plugin. All SVG through UnifiedRenderer.**