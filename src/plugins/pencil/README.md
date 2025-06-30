# Pencil Plugin

A freehand drawing tool that allows users to draw smooth lines with a pencil-like experience, similar to the drawing functionality found in tldraw.

## Features

- **Freehand Drawing**: Draw smooth curves by dragging the mouse
- **Real-time Smoothing**: Uses the existing point smoothing utilities to create smooth Bézier curves
- **Customizable Stroke**: Adjustable color and width
- **Performance Optimized**: Throttled updates and point limiting for smooth performance
- **Visual Feedback**: Custom cursor and stroke preview

## Usage

1. **Activate**: Click the "✏️ Pencil" button in the toolbar or press `P`
2. **Draw**: Click and drag on the canvas to draw
3. **Customize**: Adjust stroke color and width in the toolbar when active
4. **Exit**: Press `Escape` or click another tool

## Keyboard Shortcuts

- `P` - Activate pencil tool
- `Escape` - Exit pencil mode

## Technical Details

- **Smoothing Algorithm**: Uses Catmull-Rom spline interpolation via `getPointSmooth()`
- **Performance**: 60fps throttling and dynamic point limiting
- **SVG Output**: Creates proper SVG path elements with cubic Bézier curves
- **Integration**: Fully integrated with the plugin system and editor store

## Files

- `Pencil.tsx` - Main plugin definition
- `PencilManager.ts` - Core drawing logic and mouse event handling
- `PencilUI.tsx` - Toolbar interface for pencil controls
- `PencilCursor.tsx` - Custom cursor indicator
- `usePencilCursor.ts` - Cursor hook for integration with editor
