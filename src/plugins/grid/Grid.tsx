import React from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { DraggablePanel } from '../../components/DraggablePanel';

interface GridProps {
  size: number;
  color: string;
  opacity: number;
  viewBox: { width: number; height: number };
}

export const GridOverlay: React.FC<GridProps> = ({ size, color, opacity, viewBox }) => {
  const lines = [];
  
  // Calculate the extended grid area to cover the entire viewport
  const extendedWidth = viewBox.width * 3; // Make it 3x larger
  const extendedHeight = viewBox.height * 3;
  
  // Vertical lines
  for (let x = -extendedWidth; x <= extendedWidth * 2; x += size) {
    lines.push(
      <line
        key={`v-${x}`}
        x1={x}
        y1={-extendedHeight}
        x2={x}
        y2={extendedHeight * 2}
        stroke={color}
        strokeOpacity={opacity}
        strokeWidth={1}
      />
    );
  }
  
  // Horizontal lines
  for (let y = -extendedHeight; y <= extendedHeight * 2; y += size) {
    lines.push(
      <line
        key={`h-${y}`}
        x1={-extendedWidth}
        y1={y}
        x2={extendedWidth * 2}
        y2={y}
        stroke={color}
        strokeOpacity={opacity}
        strokeWidth={1}
      />
    );
  }
  
  return <g className="grid-overlay">{lines}</g>;
};

// New full-screen grid overlay that covers the entire viewport
interface FullScreenGridProps {
  size: number;
  color: string;
  opacity: number;
  zoom: number;
  pan: { x: number; y: number };
}

export const FullScreenGridOverlay: React.FC<FullScreenGridProps> = ({ size, color, opacity, zoom, pan }) => {
  const lines = [];
  
  // Calculate effective grid size considering zoom
  const effectiveSize = size * zoom;
  
  // Calculate offset based on pan to keep grid aligned
  const offsetX = pan.x % effectiveSize;
  const offsetY = pan.y % effectiveSize;
  
  // Get viewport dimensions (assuming full screen)
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Calculate how many lines we need
  const numVerticalLines = Math.ceil(viewportWidth / effectiveSize) + 2;
  const numHorizontalLines = Math.ceil(viewportHeight / effectiveSize) + 2;
  
  // Vertical lines
  for (let i = -1; i <= numVerticalLines; i++) {
    const x = offsetX + i * effectiveSize;
    lines.push(
      <line
        key={`v-${i}`}
        x1={x}
        y1={0}
        x2={x}
        y2={viewportHeight}
        stroke={color}
        strokeOpacity={opacity}
        strokeWidth={1 / zoom} // Adjust stroke width based on zoom
      />
    );
  }
  
  // Horizontal lines
  for (let i = -1; i <= numHorizontalLines; i++) {
    const y = offsetY + i * effectiveSize;
    lines.push(
      <line
        key={`h-${i}`}
        x1={0}
        y1={y}
        x2={viewportWidth}
        y2={y}
        stroke={color}
        strokeOpacity={opacity}
        strokeWidth={1 / zoom} // Adjust stroke width based on zoom
      />
    );
  }
  
  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <g className="fullscreen-grid-overlay">{lines}</g>
    </svg>
  );
};

interface GridControlsProps {
  enabled: boolean;
  size: number;
  snapToGrid: boolean;
  showLabels: boolean;
  onToggleGrid: () => void;
  onToggleSnap: () => void;
  onToggleLabels: () => void;
  onSizeChange: (size: number) => void;
}

export const GridControls: React.FC<GridControlsProps> = ({
  enabled,
  size,
  snapToGrid,
  showLabels,
  onToggleGrid,
  onToggleSnap,
  onToggleLabels,
  onSizeChange,
}) => {
  return (
    <div className="grid-controls" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={onToggleGrid}
          style={{ accentColor: '#2196f3', marginRight: 4, cursor: 'pointer' }}
        />
        Show Grid
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={snapToGrid}
          onChange={onToggleSnap}
          disabled={!enabled}
          style={{ accentColor: '#2196f3', marginRight: 4, cursor: 'pointer' }}
        />
        Snap to Grid
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={showLabels}
          onChange={onToggleLabels}
          disabled={!enabled}
          style={{ accentColor: '#2196f3', marginRight: 4, cursor: 'pointer' }}
        />
        Show Ruler Labels
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '12px', color: '#666' }}>Grid Size:</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="range"
            min="5"
            max="50"
            value={size}
            onChange={(e) => onSizeChange(Number(e.target.value))}
            disabled={!enabled}
            style={{ flex: 1 }}
          />
          <span style={{ fontSize: '12px', minWidth: '30px', color: '#666' }}>{size}px</span>
        </div>
      </div>
    </div>
  );
};

import { useMobileDetection } from '../../hooks/useMobileDetection';

export const GridComponent: React.FC = () => {
  const { grid, toggleGrid, toggleSnapToGrid, setGridSize, toggleGridLabels } = useEditorStore();
  const { isMobile, isTablet } = useMobileDetection();
  // Forzar re-render usando una key dependiente del estado de la grilla
  const gridKey = `${grid.enabled}-${grid.snapToGrid}-${grid.showLabels}-${grid.size}`;

  return (
    <DraggablePanel 
      title="Grid Controls"
      initialPosition={{ x: 980, y: 60 }}
      id="grid-controls"
    >
      <div key={gridKey}>
        <GridControls
          enabled={grid.enabled}
          size={grid.size}
          snapToGrid={grid.snapToGrid}
          showLabels={grid.showLabels || false}
          onToggleGrid={toggleGrid}
          onToggleSnap={toggleSnapToGrid}
          onToggleLabels={toggleGridLabels}
          onSizeChange={setGridSize}
        />
      </div>
    </DraggablePanel>
  );
};

// Helper function to calculate nice intervals for labels
const getNiceInterval = (roughInterval: number): number => {
  if (roughInterval <= 0) return 10;

  const exponent = Math.floor(Math.log10(roughInterval));
  const magnitude = Math.pow(10, exponent);
  const normalized = roughInterval / magnitude;

  let niceNormalized;
  if (normalized < 1.5) {
    niceNormalized = 1;
  } else if (normalized < 3.5) {
    niceNormalized = 2;
  } else if (normalized < 7.5) {
    niceNormalized = 5;
  } else {
    niceNormalized = 10;
  }

  return niceNormalized * magnitude;
};

// New SVG Grid Renderer that renders inside the SVG content with ruler-like numeric visualization
export const SVGGridRenderer: React.FC = () => {
  const { grid, viewport } = useEditorStore();

  if (!grid.enabled) return null;

  const { viewBox, zoom } = viewport;
  const { size, color, opacity, showLabels } = grid;

  // Calculate extended area to cover zoomed/panned view
  const extendFactor = 3;
  const extendedWidth = viewBox.width * extendFactor;
  const extendedHeight = viewBox.height * extendFactor;
  const startX = viewBox.x - extendedWidth;
  const endX = viewBox.x + viewBox.width + extendedWidth;
  const startY = viewBox.y - extendedHeight;
  const endY = viewBox.y + viewBox.height + extendedHeight;

  // Calculate effective grid size
  const effectiveGridSize = size > 0 ? size : 10;
  
  // Grid styling parameters
  const baseStrokeWidth = 0.5;
  const baseLabelLineStrokeWidth = 0.8;
  const baseAxisStrokeWidth = 1.2;
  const fontSize = 10 / zoom;
  const textStrokeWidth = 0.6 / zoom;
  const labelMargin = 4 / zoom;

  // Calculate label interval for ruler-like appearance
  const targetLabelSpacingPixels = 200;
  const roughAbsoluteInterval = targetLabelSpacingPixels / zoom;
  const finalLabelInterval = getNiceInterval(roughAbsoluteInterval);

  // Colors
  const gridColor = color;
  const labelLineColor = '#ddd';
  const axisColor = '#bbb';
  const labelColor = '#999';
  const labelStrokeColor = 'white';

  const moduloThreshold = finalLabelInterval * 1e-9;

  const gridLines = [];
  const gridLabels = [];

  // Generate vertical lines and labels
  for (let x = Math.floor(startX / effectiveGridSize) * effectiveGridSize; x <= endX; x += effectiveGridSize) {
    const isAxis = Math.abs(x) < 1e-9;
    const isLabelLine = Math.abs(x % finalLabelInterval) < moduloThreshold || 
                       Math.abs(x % finalLabelInterval - finalLabelInterval) < moduloThreshold;

    let strokeColor = gridColor;
    let currentStrokeWidth = baseStrokeWidth / zoom;
    let vectorEffect = 'none';

    if (isAxis) {
      strokeColor = axisColor;
      currentStrokeWidth = baseAxisStrokeWidth;
      vectorEffect = 'non-scaling-stroke';
    } else if (isLabelLine && x !== 0) {
      strokeColor = labelLineColor;
      currentStrokeWidth = baseLabelLineStrokeWidth;
      vectorEffect = 'non-scaling-stroke';
    }

    gridLines.push(
      <line
        key={`v-${x}`}
        x1={x}
        y1={startY}
        x2={x}
        y2={endY}
        stroke={strokeColor}
        strokeOpacity={opacity}
        strokeWidth={currentStrokeWidth}
        vectorEffect={vectorEffect}
      />
    );

    // Add labels for label lines (but not the axis)
    if (isLabelLine && !isAxis && showLabels) {
      // Only show labels if y=0 is visible
      if (0 >= startY && 0 <= endY) {
        const isNegative = x < 0;
        gridLabels.push(
          <text
            key={`label-x-${x}`}
            x={isNegative ? x + labelMargin : x - labelMargin}
            y={-labelMargin}
            fill={labelColor}
            stroke={labelStrokeColor}
            strokeWidth={textStrokeWidth}
            fontSize={fontSize}
            textAnchor={isNegative ? "start" : "end"}
            dominantBaseline="alphabetic"
            paintOrder="stroke"
            style={{
              pointerEvents: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              MozUserSelect: 'none',
              msUserSelect: 'none',
            }}
          >
            {Math.round(x)}
          </text>
        );
      }
    }
  }

  // Generate horizontal lines and labels
  for (let y = Math.floor(startY / effectiveGridSize) * effectiveGridSize; y <= endY; y += effectiveGridSize) {
    const isAxis = Math.abs(y) < 1e-9;
    const isLabelLine = Math.abs(y % finalLabelInterval) < moduloThreshold || 
                       Math.abs(y % finalLabelInterval - finalLabelInterval) < moduloThreshold;

    let strokeColor = gridColor;
    let currentStrokeWidth = baseStrokeWidth / zoom;
    let vectorEffect = 'none';

    if (isAxis) {
      strokeColor = axisColor;
      currentStrokeWidth = baseAxisStrokeWidth;
      vectorEffect = 'non-scaling-stroke';
    } else if (isLabelLine && y !== 0) {
      strokeColor = labelLineColor;
      currentStrokeWidth = baseLabelLineStrokeWidth;
      vectorEffect = 'non-scaling-stroke';
    }

    gridLines.push(
      <line
        key={`h-${y}`}
        x1={startX}
        y1={y}
        x2={endX}
        y2={y}
        stroke={strokeColor}
        strokeOpacity={opacity}
        strokeWidth={currentStrokeWidth}
        vectorEffect={vectorEffect}
      />
    );

    // Add labels for label lines (but not the axis)
    if (isLabelLine && !isAxis && showLabels) {
      // Only show labels if x=0 is visible
      if (0 >= startX && 0 <= endX) {
        const isNegative = y < 0;
        gridLabels.push(
          <text
            key={`label-y-${y}`}
            x={-labelMargin}
            y={isNegative ? y + labelMargin : y - labelMargin}
            fill={labelColor}
            stroke={labelStrokeColor}
            strokeWidth={textStrokeWidth}
            fontSize={fontSize}
            textAnchor="end"
            dominantBaseline={isNegative ? "hanging" : "alphabetic"}
            paintOrder="stroke"
            style={{
              pointerEvents: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              MozUserSelect: 'none',
              msUserSelect: 'none',
            }}
          >
            {Math.round(y)}
          </text>
        );
      }
    }
  }

  // Add origin label (0,0) if visible
  if (0 >= startX && 0 <= endX && 0 >= startY && 0 <= endY && showLabels) {
    gridLabels.push(
      <text
        key="label-origin"
        x={-labelMargin}
        y={-labelMargin}
        fill={labelColor}
        stroke={labelStrokeColor}
        strokeWidth={textStrokeWidth}
        fontSize={fontSize}
        textAnchor="end"
        dominantBaseline="alphabetic"
        paintOrder="stroke"
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
        }}
      >
        0
      </text>
    );
  }

  return (
    <g className="svg-grid-overlay" style={{ pointerEvents: 'none' }}>
      {gridLines}
      {gridLabels}
    </g>
  );
};

export const GridPlugin: Plugin = {
  id: 'grid',
  name: 'Grid',
  version: '1.0.0',
  enabled: true,
  
  shortcuts: [
    {
      key: 'g',
      modifiers: ['ctrl'],
      description: 'Toggle Grid',
      action: () => {
        const store = useEditorStore.getState();
        store.toggleGrid();
      }
    },
    {
      key: 'g',
      modifiers: ['ctrl', 'shift'],
      description: 'Toggle Snap to Grid',
      action: () => {
        const store = useEditorStore.getState();
        store.toggleSnapToGrid();
      }
    }
  ],
  
  ui: [
    {
      id: 'grid-controls',
      component: GridComponent,
      position: 'sidebar',
      order: 2
    },
    {
      id: 'svg-grid-renderer',
      component: SVGGridRenderer,
      position: 'svg-content',
      order: 0 // Render first (in the background)
    }
  ]
};
