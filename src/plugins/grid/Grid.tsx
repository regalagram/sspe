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
  onToggleGrid: () => void;
  onToggleSnap: () => void;
  onSizeChange: (size: number) => void;
}

export const GridControls: React.FC<GridControlsProps> = ({
  enabled,
  size,
  snapToGrid,
  onToggleGrid,
  onToggleSnap,
  onSizeChange,
}) => {
  return (
    <div className="grid-controls" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={onToggleGrid}
        />
        Show Grid
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
        <input
          type="checkbox"
          checked={snapToGrid}
          onChange={onToggleSnap}
          disabled={!enabled}
        />
        Snap to Grid
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

export const GridComponent: React.FC = () => {
  const { grid, toggleGrid, toggleSnapToGrid, setGridSize } = useEditorStore();
  
  return (
    <DraggablePanel 
      title="Grid Controls"
      initialPosition={{ x: 980, y: 60 }}
      id="grid-controls"
    >
      <GridControls
        enabled={grid.enabled}
        size={grid.size}
        snapToGrid={grid.snapToGrid}
        onToggleGrid={toggleGrid}
        onToggleSnap={toggleSnapToGrid}
        onSizeChange={setGridSize}
      />
    </DraggablePanel>
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
    }
  ]
};
