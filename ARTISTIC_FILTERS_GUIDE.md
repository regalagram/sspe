# Quick Guide: New Artistic Filter Presets

## Getting Started

1. **Create or import an SVG element** (path, text, or image)
2. **Select sub-paths** by clicking on them
3. **Open the Filters panel** in the sidebar
4. **Find the "Artistic Presets (Inspired)" section** with orange buttons

## New Artistic Presets

### 🎭 Dancing Stroke
**Best for**: Animated outlines, dynamic borders
**How to use**: Apply to paths with visible strokes
**Tip**: Works great on text and simple shapes

### ☁️ Smoke
**Best for**: Atmospheric effects, fog, mist
**How to use**: Apply to any element for smoky overlay
**Tip**: Try different colors for different moods

### 🌊 Waves
**Best for**: Water effects, liquid distortion
**How to use**: Apply to create wave-like distortions
**Tip**: Great for simulating underwater effects

### 📄 Paper
**Best for**: Vintage textures, document effects
**How to use**: Apply as texture overlay
**Tip**: Combines well with sepia filters

### 🦓 Zebra
**Best for**: Pattern overlays, artistic effects
**How to use**: Creates stripe patterns
**Tip**: Adjust opacity for subtle texturing

### 🕸️ Net
**Best for**: Technical diagrams, grid effects
**How to use**: Creates mesh/grid patterns
**Tip**: Good for industrial or technical aesthetics

### 💨 Dust
**Best for**: Aged effects, weathering
**How to use**: Adds dust particle texture
**Tip**: Perfect for vintage or aged appearances

### 🌈 Stripes
**Best for**: Colorful patterns, rainbow effects
**How to use**: Creates multicolored stripe patterns
**Tip**: Great for festive or celebration themes

### ✨ Spots
**Best for**: Confetti effects, bright overlays
**How to use**: Creates colorful spot patterns
**Tip**: Use screen blend mode for bright effects

### 🔥 Flame
**Best for**: Fire effects, energy visualization
**How to use**: Creates flame-like color patterns
**Tip**: Animate with transforms for dynamic fire

### 🎨 Advanced Watercolor
**Best for**: Realistic watercolor painting effects
**How to use**: Enhanced watercolor with 3D lighting
**Tip**: Best artistic filter for painting-like results

## Pro Tips

### Combining Filters
- Apply multiple filters in sequence for complex effects
- Use basic filters (blur, color adjustments) before artistic filters
- Experiment with different blend modes

### Customization
- After applying a preset, edit individual primitives for fine-tuning
- Use the enhanced primitive editors for advanced control
- Adjust filter regions if effects are clipped

### Performance
- Complex filters may impact performance on large elements
- Use simpler filters for real-time editing
- Consider filter regions to optimize rendering

### Best Practices
1. **Start simple**: Begin with one artistic filter
2. **Layer gradually**: Add complexity step by step
3. **Test variations**: Try different colors and parameters
4. **Save presets**: Export successful combinations for reuse

## Advanced Usage

### Lighting Filters
- **feDiffuseLighting**: Use the enhanced UI to adjust surface scale and diffuse constant
- **feSpecularLighting**: Control shininess with specular exponent (1-128)
- **Light sources**: Add point, distant, or spot lights as children

### Component Transfer
- **Per-channel control**: Use feFuncR, feFuncG, feFuncB, feFuncA for color manipulation
- **Function types**: Identity, table, discrete, linear, gamma
- **Creative uses**: Posterization, color mapping, artistic color effects

### Tiling and Merging
- **feTile**: Creates seamless patterns from any input
- **feMerge**: Combines multiple filter results
- **Best practices**: Use with displacement maps for complex textures

## Troubleshooting

### Common Issues
1. **Filter not visible**: Check if element has proper fill/stroke
2. **Effect too strong**: Reduce opacity or filter intensity
3. **Clipped effects**: Increase filter region size
4. **Performance issues**: Simplify filter chains

### Browser Support
- All filters use standard SVG primitives
- Compatible with Chrome, Firefox, Safari, Edge
- Some effects may vary slightly between browsers

## Examples

### Vintage Document Effect
1. Apply "Paper" texture
2. Add "Sepia" color filter
3. Apply "Dust" for aging
4. Reduce overall opacity

### Underwater Scene
1. Apply "Waves" distortion
2. Add blue "Smoke" overlay
3. Use "Blur" for depth
4. Apply blue-green color tint

### Artistic Text
1. Apply "Advanced Watercolor"
2. Add "Dancing Stroke" outline
3. Use "Soft Light" blend mode
4. Adjust colors for mood
