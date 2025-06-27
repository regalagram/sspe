import React from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { DraggablePanel } from '../../components/DraggablePanel';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react';

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomToFit: () => void;
  onResetView: () => void;
  currentZoom: number;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onZoomToFit,
  onResetView,
  currentZoom,
}) => {
  const buttonStyle: React.CSSProperties = {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    background: '#f8f9fa',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s ease',
  };

  return (
    <div className="zoom-controls" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <button 
        onClick={onZoomIn} 
        title="Zoom In (Ctrl++)"
        style={buttonStyle}
        onMouseEnter={(e) => e.currentTarget.style.background = '#e9ecef'}
        onMouseLeave={(e) => e.currentTarget.style.background = '#f8f9fa'}
      >
        <ZoomIn size={16} /> Zoom In
      </button>
      <button 
        onClick={onZoomOut} 
        title="Zoom Out (Ctrl+-)"
        style={buttonStyle}
        onMouseEnter={(e) => e.currentTarget.style.background = '#e9ecef'}
        onMouseLeave={(e) => e.currentTarget.style.background = '#f8f9fa'}
      >
        <ZoomOut size={16} /> Zoom Out
      </button>
      <button 
        onClick={onZoomToFit} 
        title="Zoom to Fit (Ctrl+0)"
        style={buttonStyle}
        onMouseEnter={(e) => e.currentTarget.style.background = '#e9ecef'}
        onMouseLeave={(e) => e.currentTarget.style.background = '#f8f9fa'}
      >
        <Maximize2 size={16} /> Fit
      </button>
      <button 
        onClick={onResetView} 
        title="Reset View (Ctrl+R)"
        style={buttonStyle}
        onMouseEnter={(e) => e.currentTarget.style.background = '#e9ecef'}
        onMouseLeave={(e) => e.currentTarget.style.background = '#f8f9fa'}
      >
        <RotateCcw size={16} /> Reset
      </button>
      <div style={{ 
        fontSize: '12px', 
        textAlign: 'center', 
        padding: '4px', 
        background: '#f0f0f0', 
        borderRadius: '4px',
        color: '#666'
      }}>
        {Math.round(currentZoom * 100)}%
      </div>
    </div>
  );
};

export const Zoom: React.FC = () => {
  const { viewport, zoomIn, zoomOut, zoomToFit, resetView } = useEditorStore();

  return (
    <DraggablePanel 
      title="Zoom Controls"
      initialPosition={{ x: 980, y: 20 }}
      id="zoom-controls"
    >
      <ZoomControls
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onZoomToFit={zoomToFit}
        onResetView={resetView}
        currentZoom={viewport.zoom}
      />
    </DraggablePanel>
  );
};

export const ZoomPlugin: Plugin = {
  id: 'zoom',
  name: 'Zoom',
  version: '1.0.0',
  enabled: true,
  
  initialize(editor) {
    // Plugin initialization logic
  },
  
  shortcuts: [
    {
      key: '+',
      modifiers: ['ctrl'],
      description: 'Zoom In',
      action: () => {
        const store = useEditorStore.getState();
        store.zoomIn();
      }
    },
    {
      key: '-',
      modifiers: ['ctrl'],
      description: 'Zoom Out',
      action: () => {
        const store = useEditorStore.getState();
        store.zoomOut();
      }
    },
    {
      key: '0',
      modifiers: ['ctrl'],
      description: 'Zoom to Fit',
      action: () => {
        const store = useEditorStore.getState();
        store.zoomToFit();
      }
    },
    {
      key: 'r',
      modifiers: ['ctrl'],
      description: 'Reset View',
      action: () => {
        const store = useEditorStore.getState();
        store.resetView();
      }
    }
  ],
  
  ui: [
    {
      id: 'zoom-controls',
      component: Zoom,
      position: 'toolbar',
      order: 1
    }
  ]
};