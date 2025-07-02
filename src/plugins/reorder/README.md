# Reorder Plugin

The Reorder plugin provides z-order management tools for selected subpaths in the SVG editor, allowing users to control which elements appear in front of or behind others.

## Features

### Z-Order Control Tools
- **Bring to Front**: Moves selected elements to the top of the rendering order. If all subpaths in a path are selected, moves the entire path to front
- **Bring Forward**: Moves selected elements one step forward. If elements are at the front of their path, moves the entire path forward
- **Send Backward**: Moves selected elements one step backward. If elements are at the back of their path, moves the entire path backward  
- **Send to Back**: Moves selected elements to the bottom of the rendering order. If all subpaths in a path are selected, moves the entire path to back

## Usage

### Automatic Panel Display
- The Reorder panel appears automatically when you select one or more subpaths
- The panel disappears when no elements are selected
- No toolbar button needed - the plugin activates based on your selection

### Selection Requirements
- **Single or multiple elements**: All reorder operations are available for any selection
- Operations work within the context of their parent path (subpaths can only be reordered relative to other subpaths in the same path)

### Optimized Interface
- **Compact Layout**: 2x2 grid layout for efficient space usage
- **Consistent Styling**: Follows the same design pattern as other editor panels
- **Intuitive Icons**: Double chevrons for "to front/back", single chevrons for "forward/backward"

### Keyboard Shortcuts
- **Shift + ]**: Bring to Front
- **]**: Bring Forward  
- **[**: Send Backward
- **Shift + [**: Send to Back

## Technical Details

### Plugin Architecture
The plugin consists of three main components:

1. **ReorderManager.ts**: Core logic for all reorder operations
2. **ReorderUI.tsx**: User interface panel with buttons and controls
3. **Reorder.tsx**: Main plugin definition and registration

### Z-Order Implementation
- Z-order is determined by the position of subpaths within their parent path's `subPaths` array and by the position of paths within the main `paths` array
- Elements later in arrays are rendered on top of earlier elements
- The plugin can reorder both subpaths within paths and entire paths relative to each other
- **Smart Path Movement**: When subpaths reach the extremes of their path's z-order, the plugin automatically moves the entire path
- **Intelligent Grouping**: When all subpaths in a path are selected for "to front/back" operations, the entire path is moved instead
- Operations are grouped by parent path to handle mixed selections efficiently

### Integration
The plugin integrates with the existing editor store and uses the path replacement utilities. All operations respect the editor's undo/redo system and update the store properly.

### Dependencies
- React
- Zustand (via editor store)
- Lucide React (for icons)
- Existing editor types and utilities

## Implementation Notes

- All reorder operations work on selected subpaths and can affect entire paths when appropriate
- Operations automatically push to the history system for undo/redo support
- The UI dynamically enables/disables buttons based on current selection
- Multiple subpaths from different paths can be reordered simultaneously
- **Cross-Path Reordering**: The plugin intelligently moves entire paths when subpaths reach z-order boundaries
- **Boundary Detection**: Forward/backward operations detect when elements are at extremes and move parent paths instead
- **Complete Selection Optimization**: When all subpaths in a path are selected, operations work at the path level for better efficiency
- Compatible with existing selection and transformation systems
