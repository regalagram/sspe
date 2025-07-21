# SVG Sub-path Editor

A comprehensive SVG editor with advanced sub-path manipulation and complete SVG filter support.

## Features

### Core Editing
- **Sub-path Selection**: Select and manipulate individual sub-paths within complex SVG paths
- **Bezier Curve Editing**: Advanced curve manipulation with control points
- **Multi-element Support**: Work with paths, text, groups, and images
- **Real-time Preview**: See changes instantly as you edit

### Complete SVG Filter Support

This editor implements **all standard SVG filters** according to the W3C specification:

#### Basic Filters
- **Gaussian Blur** - Smooth blurring effects
- **Drop Shadow** - Realistic shadows with customizable offset, blur, and color
- **Offset** - Translate elements in X/Y coordinates

#### Color Manipulation
- **Color Matrix** - Complete color transformation using 4x5 matrices
- **Component Transfer** - Per-channel (RGBA) color adjustments
- **Presets**: Grayscale, Sepia, Invert, Brightness, Contrast, Saturation, Hue Rotation

#### Artistic Effects
- **Oil Painting** - Textured paint-like appearance
- **Watercolor** - Soft, flowing artistic effect
- **Vintage** - Retro film look with grain
- **Neon Glow** - Electric neon sign effects
- **Emboss** - 3D raised surface appearance

#### Special Effects
- **Chromatic Aberration** - Camera lens-like color separation
- **Glitch** - Digital interference effects
- **Noise** - Film grain and texture
- **Wave Distortion** - Fluid, wavy deformation
- **Mosaic/Pixelate** - Retro pixelated appearance

#### Advanced Filters
- **Convolution Matrix** - Custom kernel-based effects (sharpen, edge detection, etc.)
- **Morphology** - Shape modification (erode/dilate)
- **Lighting** - Diffuse and specular lighting with multiple light sources
- **Displacement Mapping** - Complex distortions using texture maps
- **Turbulence** - Procedural noise and texture generation
- **Blend Modes** - Multiple compositing operations
- **Tile** - Pattern repetition effects

### Filter Features
- **Quick Apply**: One-click application of common effects
- **Custom Filters**: Build complex multi-stage filter pipelines
- **Real-time Editing**: Adjust filter parameters with immediate preview
- **Filter Chaining**: Combine multiple filter primitives for unique effects
- **Export Support**: All filters export correctly in standard SVG format

### User Interface
- **Plugin Architecture**: Modular, extensible design
- **Responsive Design**: Works on desktop and tablet devices
- **Keyboard Shortcuts**: Efficient workflow with hotkeys
- **Dark/Light Theme**: Comfortable editing in any lighting
- **Professional Tools**: Industry-standard editing capabilities

## Quick Start

```bash
npm install
npm run dev
```

Open your browser to see the editor. Try these steps:

1. **Create a Path**: Use the creation tools to draw shapes
2. **Select Sub-paths**: Click on individual path segments
3. **Apply Filters**: Use the Filters panel to add effects
4. **Experiment**: Combine multiple filters for unique results

## Filter Documentation

See [FILTERS.md](FILTERS.md) for comprehensive documentation of all available filters, including:
- Technical specifications
- Usage examples
- Performance considerations
- Browser compatibility

## Technology Stack

- **React + TypeScript**: Modern, type-safe development
- **Zustand**: Lightweight state management
- **Vite**: Fast development and building
- **SVG 1.1/2.0**: Full standard compliance
- **Modern Browser APIs**: Hardware-accelerated rendering

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

All modern browsers with SVG 2.0 filter support.

## Contributing

This editor implements the complete SVG filter specification. Contributions welcome for:
- New artistic filter presets
- UI/UX improvements
- Performance optimizations
- Additional export formats

## License

MIT License - See LICENSE file for details

---

**Note**: This implementation includes ALL standard SVG filters. Many online SVG editors only support basic filters like blur and drop-shadow. This editor provides professional-grade filter capabilities matching those found in desktop graphics applications.
