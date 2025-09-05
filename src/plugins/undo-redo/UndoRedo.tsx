import React from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { useEditorHistory } from '../../store/useEditorHistory';
import { globalUndoRedo, setUndoRedoFlag } from '../../store/simpleUndoRedo';
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
        color="#374151"
        active={false}
        disabled={!canUndo}
        onPointerDown={onUndo}
      />
      <PluginButton
        icon={<Redo2 size={16} />}
        text="Redo"
        color="#374151"
        active={false}
        disabled={!canRedo}
        onPointerDown={onRedo}
      />
    </div>
  );
};

export const UndoRedoComponent: React.FC = () => {
  const { canUndo, canRedo, undo, redo } = useEditorHistory();
  
  return (
    <div>
      <UndoRedoControls
        canUndo={canUndo}
        canRedo={canRedo}
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
      action: () => {
        const currentState = useEditorStore.getState();
        const undoState = globalUndoRedo.undo(currentState);
        if (undoState) {
          console.log('🔄 Shortcut undo');
          setUndoRedoFlag(true);
          useEditorStore.setState(undoState, true);
          setTimeout(() => {
            setUndoRedoFlag(false);
          }, 100);
        }
      }
    },
    {
      key: 'y',
      modifiers: ['ctrl'],
      description: 'Redo',
      action: () => {
        const currentState = useEditorStore.getState();
        const redoState = globalUndoRedo.redo(currentState);
        if (redoState) {
          console.log('🔄 Shortcut redo');
          setUndoRedoFlag(true);
          useEditorStore.setState(redoState, true);
          setTimeout(() => {
            setUndoRedoFlag(false);
          }, 100);
        }
      }
    },
    {
      key: 'Z',
      modifiers: ['ctrl', 'shift'],
      description: 'Redo (Alternative)',
      action: () => {
        const currentState = useEditorStore.getState();
        const redoState = globalUndoRedo.redo(currentState);
        if (redoState) {
          console.log('🔄 Shortcut redo (alt)');
          setUndoRedoFlag(true);
          useEditorStore.setState(redoState, true);
          setTimeout(() => {
            setUndoRedoFlag(false);
          }, 100);
        }
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
