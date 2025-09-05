import React from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { Undo2, Redo2, Clock } from 'lucide-react';
import { PluginButton } from '../../components/PluginButton';
import { EditorState } from '../../types';

interface UndoRedoControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

interface HistoryItem {
  state: EditorState;
  timestamp: number;
  isCurrent: boolean;
  index: number;
}

interface HistoryViewerProps {
  history: {
    past: EditorState[];
    present: EditorState;
    future: EditorState[];
    timestamps?: {
      past: number[];
      present: number;
      future: number[];
    };
  };
  onJumpToState: (index: number) => void;
}

export const HistoryViewer: React.FC<HistoryViewerProps> = ({ history, onJumpToState }) => {
  // Combine all states with metadata
  const allStates: HistoryItem[] = React.useMemo(() => {
    const items: HistoryItem[] = [];
    const timestamps = history.timestamps;
    const now = Date.now();
    
    // Add future states (in reverse order since they're ahead of current)
    history.future.forEach((state, index) => {
      const timestamp = timestamps?.future[index] || (now + (index + 1) * 1000);
      items.unshift({
        state,
        timestamp,
        isCurrent: false,
        index: history.past.length + 1 + index
      });
    });
    
    // Add current state
    items.push({
      state: history.present,
      timestamp: timestamps?.present || now,
      isCurrent: true,
      index: history.past.length
    });
    
    // Add past states (most recent first)
    history.past.slice().reverse().forEach((state, index) => {
      const timestampIndex = history.past.length - 1 - index;
      const timestamp = timestamps?.past[timestampIndex] || (now - (index + 1) * 1000);
      items.push({
        state,
        timestamp,
        isCurrent: false,
        index: timestampIndex
      });
    });
    
    return items;
  }, [history]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  return (
    <div className="history-viewer" style={{ 
      marginTop: '20px', 
      padding: '10px',
      borderTop: '1px solid #e5e7eb',
      maxHeight: '300px',
      overflowY: 'auto'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        marginBottom: '15px',
        fontSize: '14px',
        fontWeight: '600',
        color: '#374151'
      }}>
        <Clock size={16} />
        <span>History States</span>
      </div>
      
      <div className="history-timeline" style={{ position: 'relative' }}>
        {allStates.map((item, index) => (
          <div 
            key={`${item.index}-${item.timestamp}`}
            className="history-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: index < allStates.length - 1 ? '12px' : '0',
              position: 'relative',
              cursor: item.isCurrent ? 'default' : 'pointer',
              opacity: item.isCurrent ? 1 : 0.8
            }}
            onClick={() => !item.isCurrent && onJumpToState(item.index)}
          >
            {/* Timeline line */}
            {index < allStates.length - 1 && (
              <div 
                style={{
                  position: 'absolute',
                  left: '5px', // Centrado en el bullet
                  top: '0px', // Comienza desde el inicio del item
                  width: '2px',
                  height: '36px', // Cubre el item completo + el marginBottom (12px bullet + 12px marginBottom + 12px del siguiente bullet)
                  backgroundColor: item.isCurrent ? '#3b82f6' : '#9ca3af',
                  zIndex: 0 // Por debajo del bullet
                }}
              />
            )}
            
            {/* Bullet point - sin borde para fusión perfecta */}
            <div 
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: item.isCurrent ? '#3b82f6' : '#9ca3af',
                // Sin border para evitar separación visual
                marginRight: '12px',
                flexShrink: 0,
                zIndex: 1,
                position: 'relative',
                // Añadir un efecto de resaltado solo para el estado actual
                boxShadow: item.isCurrent ? '0 0 0 3px rgba(59, 130, 246, 0.2)' : 'none'
              }}
            />
            
            {/* State info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '13px'
              }}>
                <span style={{
                  fontWeight: item.isCurrent ? '600' : '500',
                  color: item.isCurrent ? '#1f2937' : '#4b5563'
                }}>
                  #{item.index + 1}
                  {item.isCurrent && (
                    <span style={{ 
                      marginLeft: '6px',
                      fontSize: '9px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      padding: '1px 4px',
                      borderRadius: '8px'
                    }}>
                      NOW
                    </span>
                  )}
                </span>
                <span style={{
                  fontSize: '10px',
                  color: '#6b7280',
                  fontFamily: 'monospace'
                }}>
                  {formatTime(item.timestamp)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {allStates.length === 1 && (
        <div style={{
          textAlign: 'center',
          color: '#9ca3af',
          fontSize: '12px',
          fontStyle: 'italic',
          marginTop: '10px'
        }}>
          No history available
        </div>
      )}
    </div>
  );
};

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
  const { history, undo, redo } = useEditorStore();
  
  const handleJumpToState = (targetIndex: number) => {
    const store = useEditorStore.getState();
    const currentIndex = store.history.past.length;
    
    if (targetIndex === currentIndex) {
      // Already at this state
      return;
    }
    
    if (targetIndex < currentIndex) {
      // Need to undo to reach target
      const undoSteps = currentIndex - targetIndex;
      for (let i = 0; i < undoSteps; i++) {
        store.undo();
      }
    } else {
      // Need to redo to reach target
      const redoSteps = targetIndex - currentIndex;
      for (let i = 0; i < redoSteps; i++) {
        store.redo();
      }
    }
  };
  
  return (
    <div>
      <UndoRedoControls
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onUndo={undo}
        onRedo={redo}
      />
      <HistoryViewer
        history={history}
        onJumpToState={handleJumpToState}
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
      key: 'Z',
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
      position: 'sidebar',
      order: 0
    }
  ]
};
