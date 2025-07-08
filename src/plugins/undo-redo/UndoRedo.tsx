import React from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { Undo2, Redo2 } from 'lucide-react';
import { PluginButton } from '../../components/PluginButton';

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
  return (
    <div className="undo-redo-controls" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <PluginButton
        icon={<Undo2 size={16} />}
        text="Undo"
        color="#007acc"
        active={false}
        disabled={!canUndo}
        onClick={onUndo}
      />
      <PluginButton
        icon={<Redo2 size={16} />}
        text="Redo"
        color="#007acc"
        active={false}
        disabled={!canRedo}
        onClick={onRedo}
      />
    </div>
  );
};

export const UndoRedoComponent: React.FC = () => {
  const { history, undo, redo } = useEditorStore();
  
  return (
    <div>
      <UndoRedoControls
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onUndo={undo}
        onRedo={redo}
      />
    </div>
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
      plugin: 'undo-redo',
      action: () => {
        const store = useEditorStore.getState();
        store.undo();
      }
    },
    {
      key: 'y',
      modifiers: ['ctrl'],
      description: 'Redo',
      plugin: 'undo-redo',
      action: () => {
        const store = useEditorStore.getState();
        store.redo();
      }
    },
    {
      key: 'z',
      modifiers: ['ctrl', 'shift'],
      description: 'Redo (Alternative)',
      plugin: 'undo-redo',
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
