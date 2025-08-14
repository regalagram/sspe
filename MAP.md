# SVG Sub-Path Editor - Functionality Implementation Map

This document maps each major functionality described in FUNCTIONAL.md to its specific implementation files and components in the codebase.

## Core Architecture

### Plugin-Based Modular System
- **Core Plugin System**: `src/core/PluginSystem.ts`, `src/core/PluginInitializer.ts`
- **Plugin Interfaces**: `src/core/PluginSystem.ts` (Plugin, PointerEventHandler, ToolDefinition interfaces)
- **Plugin Manager**: `src/core/PluginSystem.ts` (PluginManager class)
- **Dependency Resolution**: `src/core/PluginSystem.ts` (enablePlugin method)

### State Management
- **Editor Store**: `src/store/editorStore.ts`
- **Action Creators**: `src/store/*Actions.ts` files
- **State Types**: `src/types/index.ts`
- **Persistence**: `src/store/editorStore.ts` (localStorage integration)

### Responsive UI Architecture
- **Mobile Detection**: `src/hooks/useMobileDetection.ts`
- **Mobile Container**: `src/components/MobileContainer.tsx`
- **Adaptive Toolbars**: `src/components/ToolbarButton.tsx`, `src/components/ToolbarSubmenu.tsx`
- **Bottom Sheet**: `src/components/BottomSheet.tsx`

## Core Editing Capabilities

### 1. Path Creation and Editing
- **Path Actions**: `src/store/pathActions.ts`
- **Path Utilities**: `src/utils/path-utils.ts`
- **Sub-path Management**: `src/utils/subpath-utils.ts`
- **Creation Plugin**: `src/plugins/creation/`
- **Command Plugin**: `src/plugins/command/`

### 2. Freehand Drawing System
- **Pencil Plugin**: `src/plugins/pencil/`
- **Smoothing Algorithms**: `src/utils/smoothing-utils.ts`
- **Pressure Handling**: `src/plugins/pencil/` (pressure sensitivity implementation)

### 3. Geometric Shape Tools
- **Shapes Plugin**: `src/plugins/shapes/`
- **Shape Creation Tools**: `src/components/WritingShapeTools.tsx`
- **Shape-to-Path Conversion**: `src/utils/svg-elements-utils.ts`

### 4. Advanced Text System
- **Text Placement**: `src/plugins/text-placement/`
- **Text Controls**: `src/plugins/text-controls/`
- **Text Style**: `src/plugins/text-style/`
- **Text Edit**: `src/plugins/text-edit/`
- **Text Renderer**: `src/plugins/text-renderer/`
- **Text Actions**: `src/store/textActions.ts`
- **Text Tools**: `src/components/WritingTextTools.tsx`
- **Text Edit Overlay**: `src/components/TextEditOverlay.tsx`
- **Text Manager**: `src/managers/TextManager.ts`
- **Text Edit Manager**: `src/managers/TextEditManager.ts`

### 5. Selection and Transformation
- **Selection Plugin**: `src/plugins/selection/`
- **Selection Actions**: `src/store/selectionActions.ts`
- **Transform Plugin**: `src/plugins/transform/`
- **Transform Actions**: `src/store/transformActions.ts`
- **Point Transform**: `src/plugins/point-transform/`
- **Sub-path Transform**: `src/plugins/subpath-transform/`

### 6. Bezier Curve Management
- **Curves Plugin**: `src/plugins/curves/`
- **Curve Tools**: `src/components/WritingCurveTools.tsx`
- **Handles Plugin**: `src/plugins/handles/`
- **Control Point Management**: `src/types/index.ts` (ControlPointInfo, BezierHandleState)

### 7. Group Management System
- **Group Controls**: `src/plugins/group-controls/`
- **Group Renderer**: `src/plugins/group-renderer/`
- **Group Actions**: `src/store/groupActions.ts`
- **Group Utilities**: `src/utils/group-utils.ts`, `src/utils/group-svg-utils.ts`

### 8. Gradient and Pattern System
- **Gradients Plugin**: `src/plugins/gradients/`
- **Gradient Actions**: `src/store/gradientActions.ts`
- **Gradient Utilities**: `src/utils/gradient-utils.ts`
- **Gradient Stop Editor**: `src/components/GradientStopEditor.tsx`
- **Pattern Preset Selector**: `src/components/PatternPresetSelector.tsx`

### 9. SVG Filter System
- **Filters Plugin**: `src/plugins/filters/`
- **Filter Types**: `src/types/index.ts` (FilterPrimitiveType, SVGFilter)
- **Filter Utilities**: `src/utils/svg-elements-utils.ts`

### 10. Image and Media Support
- **Images Plugin**: `src/plugins/images/`
- **Image Utilities**: `src/utils/svg-elements-utils.ts`
- **SVG Element Actions**: `src/store/svgElementActions.ts`

### 11. Clipping and Masking
- **Clipping Plugin**: `src/plugins/clipping/`
- **Clipping Controls**: `src/plugins/clipping/ClippingControls.tsx`
- **Clipping Renderer**: `src/plugins/clipping/ClippingRenderer.tsx`

### 12. Markers and Symbols
- **Markers Plugin**: `src/plugins/markers/`
- **Symbols Plugin**: `src/plugins/symbols/`
- **Symbol Utilities**: `src/utils/svg-elements-utils.ts`

### 13. Animation System
- **Animation System Plugin**: `src/plugins/animation-system/`
- **Animation Controls**: `src/components/AnimationControls.tsx`
- **Animation Timeline**: `src/components/AnimationTimeline.tsx`
- **Animation Renderer**: `src/components/AnimationRenderer.tsx`
- **Animation Synchronizer**: `src/components/AnimationSynchronizer.tsx`
- **Animation Actions**: `src/store/animationActions.ts`

### 14. Viewport and Navigation
- **Viewport Actions**: `src/store/viewportActions.ts`
- **Zoom Plugin**: `src/plugins/zoom/`
- **Zoom Controls**: `src/plugins/zoom/Zoom.tsx`, `src/plugins/zoom/ToolbarZoom.tsx`
- **Pan/Zoom Management**: `src/plugins/pointer-interaction/PointerInteraction.tsx` (PanZoomManager class)

### 15. Keyboard Shortcuts and Commands
- **Shortcuts Plugin**: `src/plugins/shortcuts/`
- **Global Keyboard Hook**: `src/hooks/useGlobalKeyboard.ts`
- **Plugin System Shortcuts**: `src/core/PluginSystem.ts` (ShortcutDefinition interface)

### 16. Layer and Z-Order Management
- **Arrange Plugin**: `src/plugins/arrange/`
- **Reorder Plugin**: `src/plugins/reorder/`
- **Z-order Utilities**: Integrated in selection and transform actions

### 17. Floating Contextual Interface
- **Floating Toolbar Manager**: `src/core/FloatingToolbar/FloatingToolbarManager.ts`
- **Floating Toolbar Types**: `src/types/floatingToolbar.ts`
- **Context Actions Carousel**: `src/components/ContextActionsCarousel.tsx`

### 18. Smart Guidelines System
- **Sticky Guidelines Plugin**: `src/plugins/sticky-guidelines/`
- **Grid Plugin**: `src/plugins/grid/`
- **Grid Component**: `src/plugins/grid/Grid.tsx`

### 19. Import and Export System
- **SVG Editor Plugin**: `src/plugins/svg-editor/`
- **SVG Parser**: `src/utils/svg-parser.ts`
- **SVG Export**: `src/utils/svg-export.ts`
- **Group SVG Utils**: `src/utils/group-svg-utils.ts`
- **SVG Import Options**: `src/components/SVGImportOptions.tsx`
- **SVG Drop Zone**: `src/components/SVGDropZone.tsx`

### 20. Development and Debug Tools
- **Visual Debug Plugin**: `src/plugins/visual-debug/`
- **Debug Controls**: Integrated in various plugins with debug flags

### 21. Context Menu System
- **Context Menu Plugin**: `src/plugins/context-menu/`
- **Context Menu Component**: `src/components/ContextMenuComponent.tsx`
- **Context Menu Store**: `src/store/contextMenuStore.ts`

### 22. Advanced Command Management
- **Command Actions**: `src/store/commandActions.ts`
- **Command Plugin**: `src/plugins/command/`
- **Precision Controls**: `src/store/editorStore.ts` (precision field)

### 23. Mobile and Touch Optimization
- **Gestures Plugin**: `src/plugins/gestures/Gestures.ts`
- **Mobile Plugin Menu**: `src/components/MobilePluginMenu.tsx`
- **Mobile Container**: `src/components/MobileContainer.tsx`
- **Touch Event Handling**: `src/plugins/pointer-interaction/PointerInteraction.tsx`

### 24. Mathematical and Geometric Utilities
- **Transform Utils**: `src/utils/transform-utils.ts`
- **Path Utils**: `src/utils/path-utils.ts`
- **Geometry Utils**: `src/utils/geometry-utils.ts`
- **BBox Utils**: `src/utils/bbox-utils.ts`

### 25. Advanced Text Features
- **Text Path Plugin**: `src/plugins/textpath/`
- **Text Path Actions**: `src/store/textPathActions.ts`
- **Text Cursor Management**: `src/hooks/useTextCursor.ts`
- **Text BBox Utilities**: `src/hooks/useSvgTextBBox.tsx`

### 26. Performance and Optimization
- **Editor Styles Hook**: `src/hooks/useEditorStyles.ts`
- **Combined Cursor Hook**: `src/hooks/useCombinedCursor.ts`
- **Tool Mode Management**: `src/hooks/useToolMode.ts`, `src/managers/ToolModeManager.ts`

### 27. Extensibility and Plugin API
- **Plugin System Core**: `src/core/PluginSystem.ts`
- **Plugin Initializer**: `src/core/PluginInitializer.ts`
- **Plugin Interfaces**: Defined in `src/core/PluginSystem.ts`

### 28. Panel Management and UI Organization
- **Panel Mode Plugin**: `src/plugins/panelmode/`
- **Panel Manager**: `src/plugins/panelmode/PanelManager.ts`
- **Accordion Sidebar**: `src/plugins/panelmode/AccordionSidebar.tsx`
- **Panel Wrapper**: `src/plugins/panelmode/PanelWrapper.tsx`
- **Panel Mode UI**: `src/plugins/panelmode/PanelModeUI.tsx`

### 29. Comprehensive Export and Download System
- **Unified SVG Export**: `src/utils/svg-export.ts` (generateUnifiedSVG function)
- **Group Export**: `src/utils/group-svg-utils.ts`
- **Download Integration**: `src/utils/svg-export.ts` (downloadSVGFile function)
- **Export Options**: `src/plugins/svg-editor/SVGEditor.tsx`

### 30. State Persistence and Auto-Save
- **Editor Store**: `src/store/editorStore.ts` (localStorage integration)
- **Toolbar Store**: `src/store/toolbarStore.ts`
- **UI State Actions**: `src/store/uiStateActions.ts`

### 31. Advanced Path Utilities and Mathematical Operations
- **Path Utilities**: `src/utils/path-utils.ts`
- **Sub-path Utils**: `src/utils/subpath-utils.ts`
- **Smoothing Utils**: `src/utils/smoothing-utils.ts`
- **Scientific Notation Handling**: `src/utils/path-utils.ts`

### 32. Real-Time Validation and Error Handling
- **SVG Parser Validation**: `src/utils/svg-parser.ts`
- **Input Validation**: Integrated throughout action creators
- **Error Recovery**: `src/store/editorStore.ts` and various utility functions

## Component Architecture

### Core UI Components
- **Element Preview**: `src/components/ElementPreview.tsx`
- **Accordion Panel**: `src/components/AccordionPanel.tsx`
- **Toolbar Components**: `src/components/Toolbar.tsx`, `src/components/ToolbarButton.tsx`
- **Writing Tools**: `src/components/Writing*.tsx` files
- **SVG Definitions**: `src/components/SVGDefinitions.tsx`
- **SVG Command Icons**: `src/components/SVGCommandIcons.tsx`

### Hook System
- **Global Pointer Events**: `src/hooks/useGlobalPointerEvents.ts`
- **Pointer Event Handlers**: `src/hooks/usePointerEventHandlers.ts`
- **Double Click Detection**: `src/hooks/useDoubleClick.ts`
- **Text Edit Mode**: `src/hooks/useTextEditMode.ts`
- **Plugin Initialization**: `src/hooks/usePluginInitialization.ts`

### Manager Classes
- **Tool Mode Manager**: `src/managers/ToolModeManager.ts`
- **Text Manager**: `src/managers/TextManager.ts`
- **Text Edit Manager**: `src/managers/TextEditManager.ts`

### Store Architecture
- **Main Editor Store**: `src/store/editorStore.ts`
- **Context Menu Store**: `src/store/contextMenuStore.ts`
- **Toolbar Store**: `src/store/toolbarStore.ts`
- **Store Index**: `src/store/index.ts`

### Plugin Directory Structure
Each plugin follows a consistent structure:
- **Plugin Definition**: `index.ts` or main plugin file
- **Components**: UI components specific to the plugin
- **Utilities**: Plugin-specific utility functions
- **Types**: Plugin-specific type definitions

### Type System
- **Main Types**: `src/types/index.ts` (comprehensive type definitions)
- **Floating Toolbar Types**: `src/types/floatingToolbar.ts`
- **Plugin Types**: Defined in `src/core/PluginSystem.ts`

## File Organization Patterns

### Plugin Structure
```
src/plugins/[plugin-name]/
├── index.ts              # Main plugin definition
├── [PluginName].tsx      # Main component (if applicable)
├── components/           # Plugin-specific components
├── utils/               # Plugin-specific utilities
└── types.ts             # Plugin-specific types (if needed)
```

### Store Structure
```
src/store/
├── editorStore.ts       # Main store configuration
├── [feature]Actions.ts  # Action creators for specific features
├── contextMenuStore.ts  # Specialized stores
├── toolbarStore.ts      # UI state stores
└── index.ts            # Store exports
```

### Utility Structure
```
src/utils/
├── [feature]-utils.ts   # Feature-specific utilities
├── [feature]-parser.ts  # Parsing utilities
├── [feature]-export.ts  # Export utilities
└── [shared-util].ts    # Shared utility functions
```

This mapping provides a comprehensive guide to understanding how each feature in the functional specification is implemented in the codebase, making it easier for developers to locate, modify, and extend specific functionality.
