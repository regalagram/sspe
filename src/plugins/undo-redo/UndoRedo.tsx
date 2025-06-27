import React from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { DraggablePanel } from '../../components/DraggablePanel';
import { Undo2, Redo2 } from 'lucide-react';

interface UndoRedoControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export const UndoRedoControls: React.FC<UndoRedoControlsProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}) => {
  const buttonStyle: React.CSSProperties = {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    background: '#f8f9fa',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s ease',
    minWidth: '80px',
  };

  const disabledStyle: React.CSSProperties = {
    ...buttonStyle,
    opacity: 0.5,
    cursor: 'not-allowed',
    background: '#f0f0f0',
  };

  return (
    <div className="undo-redo-controls" style={{ display: 'flex', gap: '8px' }}>
      <button
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        style={canUndo ? buttonStyle : disabledStyle}
        onMouseEnter={(e) => canUndo && (e.currentTarget.style.background = '#e9ecef')}
        onMouseLeave={(e) => canUndo && (e.currentTarget.style.background = '#f8f9fa')}
      >
        <Undo2 size={16} /> Undo
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (Ctrl+Y)"
        style={canRedo ? buttonStyle : disabledStyle}
        onMouseEnter={(e) => canRedo && (e.currentTarget.style.background = '#e9ecef')}
        onMouseLeave={(e) => canRedo && (e.currentTarget.style.background = '#f8f9fa')}
      >
        <Redo2 size={16} /> Redo
      </button>
    </div>
  );
};

export const UndoRedoComponent: React.FC = () => {
  const { history, undo, redo } = useEditorStore();
  
  return (
    <DraggablePanel 
      title="History"
      initialPosition={{ x: 980, y: 100 }}
      id="history-controls"
    >
      <UndoRedoControls
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onUndo={undo}
        onRedo={redo}
      />
    </DraggablePanel>
  );
};

export const UndoRedoPlugin: Plugin = {
  id: 'undo-redo',
  name: 'Undo/Redo',
  version: '1.0.0',
  enabled: true,
  
  shortcuts: [
    {
      key: 'z',
      modifiers: ['ctrl'],
      description: 'Undo',
      action: () => {
        const store = useEditorStore.getState();
        store.undo();
      }
    },
    {
      key: 'y',
      modifiers: ['ctrl'],
      description: 'Redo',
      action: () => {
        const store = useEditorStore.getState();
        store.redo();
      }
    },
    {
      key: 'z',
      modifiers: ['ctrl', 'shift'],
      description: 'Redo (Alternative)',
      action: () => {
        const store = useEditorStore.getState();
        store.redo();
      }
    }
  ],
  
  ui: [
    {
      id: 'undo-redo-controls',
      component: UndoRedoComponent,
      position: 'toolbar',
      order: 0
    }
  ]
};
