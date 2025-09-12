# SVG Sub-Path Editor - AI Guidelines

## Core Rules
- **Everything is a plugin** (no exceptions)
- **Pointer events only** (`onPointerDown` not `onMouseDown`, `onTouchEnd` or other event types)
- **Central Zustand store** (no local state for shared data)
- **Components in `src/components/`** (never in plugins)
- **Scale with zoom** (`size / viewport.zoom`)
- **UnifiedRenderer** for all SVG content
- **English only** (all code comments and user-facing text must be in English)

## Event Handling Standards
- Use **pointer events exclusively**: `onPointerDown`, `onPointerMove`, `onPointerUp`
- Never use mouse events (`onMouseDown`, `onClick`) or touch events (`onTouchStart`, `onTouchEnd`)
- Pointer events provide unified handling for mouse, touch, and pen inputs
- Always include `preventDefault()` and `stopPropagation()` when needed

## Language Standards
- **All code comments must be in English** (no Spanish, French, or other languages)
- **All user-facing text must be in English** (UI labels, error messages, tooltips, instructions)
- **Variable and function names should be in English** (descriptive and self-documenting)
- **Console messages and logging should be in English**
- **Documentation and README files must be in English**
- **Commit messages should be in English**

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

## Floating Toolbars
### PencilFloatingToolbar
- Appears only when pencil mode is active
- Positioned at top center (mobile: respects safe-area-inset-top)
- Controls: color picker, stroke width, opacity
- Exclusive menu behavior: only one submenu open at a time
- Uses pointer events for cross-platform compatibility
- Renders via portal outside normal DOM hierarchy

### Example Toolbar Implementation
```typescript
// Correct approach for toolbar buttons
<button
  onClick={handleAction}
  onPointerDown={handleAction}  // For mobile compatibility
  style={{
    touchAction: 'manipulation',  // Prevent zoom on double tap
    // ... other styles
  }}
>
```

**Remember: Everything is a plugin. All SVG through UnifiedRenderer. Pointer events only.**