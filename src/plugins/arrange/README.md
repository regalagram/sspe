# Arrange Plugin

The Arrange plugin provides powerful alignment, distribution, and transformation tools for selected subpaths in the SVG editor, similar to the arrange functionality found in tldraw.

## Features

### Alignment Tools
- **Align Left**: Aligns all selected elements to the leftmost element
- **Align Center**: Aligns all selected elements to the horizontal center
- **Align Right**: Aligns all selected elements to the rightmost element
- **Align Top**: Aligns all selected elements to the topmost element
- **Align Middle**: Aligns all selected elements to the vertical center
- **Align Bottom**: Aligns all selected elements to the bottommost element

### Distribution Tools
- **Distribute Horizontally**: Evenly distributes 3+ elements horizontally between the leftmost and rightmost elements
- **Distribute Vertically**: Evenly distributes 3+ elements vertically between the topmost and bottommost elements

### Stretch Tools
- **Stretch Horizontally**: Stretches all elements to match the overall width of the selection
- **Stretch Vertically**: Stretches all elements to match the overall height of the selection

### Flip Tools
- **Flip Horizontally**: Mirrors selected elements horizontally around their collective center
- **Flip Vertically**: Mirrors selected elements vertically around their collective center

### Stack & Pack Tools
- **Pack**: Moves all elements to touch each other horizontally (removes gaps)
- **Stack Horizontally**: Stacks elements horizontally with aligned Y positions
- **Stack Vertically**: Stacks elements vertically with aligned X positions

## Usage

### Automatic Panel Display
- The Arrange panel appears automatically when you select one or more subpaths
- The panel disappears when no elements are selected
- No toolbar button needed - the plugin activates based on your selection

### Selection Requirements
- **Single element**: Only flip operations are available
- **Multiple elements**: All alignment, stretching, flipping, and stacking tools are available
- **3+ elements**: Distribution tools become available in addition to all other tools

### Optimized Interface
- **Compact Layout**: Up to 4 buttons per row for efficient space usage
- **Consistent Styling**: Titles follow the same small, uppercase style as other panels
- **Smart Organization**: Related tools are grouped logically in sections

### Keyboard Shortcuts
- `Shift + A` - Select first available subpath (triggers arrange panel)
- `Alt + L`: Align Left
- `Alt + C`: Align Center
- `Alt + R`: Align Right
- `Alt + T`: Align Top
- `Alt + M`: Align Middle
- `Alt + B`: Align Bottom
- `Alt + Shift + H`: Flip Horizontally
- `Alt + Shift + V`: Flip Vertically

## Technical Details

### Plugin Architecture
The plugin consists of three main components:

1. **ArrangeManager.ts**: Core logic for all arrange operations
2. **ArrangeUI.tsx**: User interface panel with buttons and controls
3. **Arrange.tsx**: Main plugin definition and registration

### Integration
The plugin integrates with the existing editor store and uses the same transformation utilities as other plugins. All operations respect the editor's undo/redo system and update the store properly.

### Dependencies
- React
- Zustand (via editor store)
- Lucide React (for icons)
- Existing editor utilities for bounds calculation and transformations

## Implementation Notes

- All arrange operations work on selected subpaths
- Operations automatically push to the history system for undo/redo support
- The UI dynamically enables/disables buttons based on current selection
- Bounds calculations use existing utility functions for consistency
- Transformations use the existing subpath transformation utilities
