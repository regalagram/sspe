import React from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Target } from 'lucide-react';
import { PluginButton } from '../../components/PluginButton';

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomToFit: () => void;
  onZoomToSelection: () => void;
  onZoomToSubPath: () => void;
  onResetView: () => void;
  currentZoom: number;
  hasSelection: boolean;
  hasSubPathSelection: boolean;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onZoomToFit,
  onZoomToSelection,
  onZoomToSubPath,
  onResetView,
  currentZoom,
  hasSelection,
  hasSubPathSelection,
}) => {
  return (
    <div className="zoom-controls" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <PluginButton
        icon={<ZoomIn size={16} />}
        text="Zoom In"
        color="#007acc"
        active={false}
        disabled={false}
        onPointerDown={onZoomIn}
      />
      <PluginButton
        icon={<ZoomOut size={16} />}
        text="Zoom Out"
        color="#007acc"
        active={false}
        disabled={false}
        onPointerDown={onZoomOut}
      />
      <PluginButton
        icon={<Maximize2 size={16} />}
        text="Fit"
        color="#007acc"
        active={false}
        disabled={false}
        onPointerDown={onZoomToFit}
      />
      {hasSelection && (
        <PluginButton
          icon={<Target size={16} />}
          text="Fit Selection"
          color="#007acc"
          active={false}
          disabled={false}
          onPointerDown={onZoomToSelection}
        />
      )}
      {hasSubPathSelection && (
        <PluginButton
          icon={<Target size={16} />}
          text="Fit SubPath"
          color="#007acc"
          active={false}
          disabled={false}
          onPointerDown={onZoomToSubPath}
        />
      )}
      <PluginButton
        icon={<RotateCcw size={16} />}
        text="Reset"
        color="#6c757d"
        active={false}
        disabled={false}
        onPointerDown={onResetView}
      />
      <div style={{ 
        fontSize: '20px', 
        fontWeight: 700,
        textAlign: 'center', 
        padding: '8px 0', 
        background: '#fff', 
        borderRadius: '12px',
        color: '#007acc',
        border: 'none',
        margin: '8px 0 0 0',
        letterSpacing: '1px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8
      }}>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{ opacity: 0.7 }}><circle cx="9" cy="9" r="7" stroke="#007acc" strokeWidth="2"/><line x1="14.2" y1="14.2" x2="18" y2="18" stroke="#007acc" strokeWidth="2" strokeLinecap="round"/></svg>
        {Math.round(currentZoom * 100)}%
      </div>
    </div>
  );
};

export const Zoom: React.FC = () => {
  const { viewport, selection, zoomIn, zoomOut, zoomToFit, zoomToSelection, zoomToSubPath, resetView } = useEditorStore();

  return (
    <div>
      <ZoomControls
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onZoomToFit={zoomToFit}
        onZoomToSelection={zoomToSelection}
        onZoomToSubPath={zoomToSubPath}
        onResetView={resetView}
        currentZoom={viewport.zoom}
        hasSelection={selection.selectedCommands.length > 0}
        hasSubPathSelection={selection.selectedSubPaths.length > 0}
      />
    </div>
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
    },
    {
      key: '0',
      modifiers: ['ctrl', 'shift'],
      description: 'Zoom to Selection',
      action: () => {
        const store = useEditorStore.getState();
        if (store.selection.selectedCommands.length > 0) {
          store.zoomToSelection();
        }
      }
    },
    {
      key: 's',
      modifiers: ['ctrl', 'shift'],
      description: 'Zoom to Selected SubPath',
      action: () => {
        const store = useEditorStore.getState();
        if (store.selection.selectedSubPaths.length > 0) {
          store.zoomToSubPath();
        }
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