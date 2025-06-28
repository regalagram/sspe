# Visual Debug Plugin

## Overview

The Visual Debug plugin consolidates three previously separate plugins into a unified interface:
- Command Points Renderer
- Control Points Renderer  
- Wireframe Mode

## Features

### Command Points
- Displays clickable points at each SVG command position
- Shows red points for unselected commands, blue for selected
- Auto-shows for selected sub-paths even when feature is disabled
- Shortcut: `Ctrl+C`

### Control Points
- Displays Bézier curve control points with connecting lines
- Shows gray control handles for cubic curves (C commands)
- Includes dashed lines connecting control points to their endpoints
- Auto-shows for selected sub-paths even when feature is disabled
- Shortcut: `Ctrl+P`

### Wireframe Mode
- Toggles wireframe visualization mode
- Changes how paths are rendered for debugging
- Shortcut: `Ctrl+W`

## UI Layout

All three features are controlled from a single draggable panel titled "Visual Debug" with checkboxes for each feature.

## Migration Notes

This plugin replaces the following individual plugins:
- `command-points-renderer` 
- `control-points`
- `wireframe`

All existing keyboard shortcuts are preserved for backward compatibility.

## Technical Details

- Position: Sidebar, order 3
- Panel ID: `visual-debug`
- Default position: x: 980, y: 300
- Preserves all original rendering logic and behavior
- Maintains feature flags in the editor store
