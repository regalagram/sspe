# SVG Editor Plugin - Update Implementation

## Overview
The SVG Editor plugin now supports bidirectional editing - you can not only export the current paths as SVG code, but also edit the SVG code manually and apply those changes back to the diagram.

## Features Implemented

### 1. SVG Parsing (`src/utils/svg-parser.ts`)
- **parsePathData()**: Converts SVG path data strings (d attribute) into editor commands
- **parsePathStyle()**: Extracts style information from SVG path elements
- **parseSVGToSubPaths()**: Main function that converts complete SVG strings into SubPath arrays

### 2. Store Integration
- **replacePaths()**: New action in editorStore that replaces all current paths with a new set
- Clears selection when replacing paths to avoid referencing non-existent elements

### 3. Enhanced SVG Editor Component
- Real-time SVG generation from current paths
- Bidirectional editing: edit SVG code and apply changes to diagram
- Confirmation dialog before replacing existing paths
- Better error handling and user feedback

## Supported SVG Features

The parser supports the following SVG path commands:
- **M/m**: Move to (absolute/relative)
- **L/l**: Line to (absolute/relative)
- **H/h**: Horizontal line to (absolute/relative) - converted to L commands
- **V/v**: Vertical line to (absolute/relative) - converted to L commands
- **C/c**: Cubic Bézier curve (absolute/relative)
- **S/s**: Smooth cubic Bézier curve (absolute/relative)
- **Q/q**: Quadratic Bézier curve (absolute/relative)
- **T/t**: Smooth quadratic Bézier curve (absolute/relative)
- **A/a**: Arc (absolute/relative)
- **Z/z**: Close path

### Style Attributes
- fill, stroke, stroke-width
- stroke-dasharray, stroke-linecap, stroke-linejoin
- fill-opacity, stroke-opacity
- Both attribute-based and inline style declarations

## Usage

1. **Export to SVG**: The textarea shows the current diagram as SVG code
2. **Edit SVG Code**: Modify the SVG code in the textarea
3. **Apply Changes**: 
   - Click "Apply" button, or
   - Press Ctrl+Enter
   - Confirm the replacement when prompted
4. **Revert Changes**: Click "Revert" or press Escape

## Limitations

- Only `<path>` elements are parsed (shapes like `<rect>`, `<circle>` are ignored)
- Complex transformations are not supported
- Some advanced SVG features may not be preserved
- Relative coordinates are converted to absolute coordinates
- The operation replaces ALL current paths

## Error Handling

The implementation includes comprehensive error handling:
- Invalid XML/SVG syntax detection
- Path data parsing validation
- User-friendly error messages
- Graceful fallback for unsupported features

## Technical Notes

- Uses native browser DOMParser for XML parsing
- Maintains current coordinate tracking for relative commands
- Generates unique IDs for all imported commands and subpaths
- Preserves style information from both attributes and inline styles
- Automatic coordinate conversion from relative to absolute
