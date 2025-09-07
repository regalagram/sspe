import React from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { Undo2, Redo2, Clock, Eye } from 'lucide-react';
import { PluginButton } from '../../components/PluginButton';
import { EditorState } from '../../types';
import { HistoryModal } from '../../components/HistoryModal';
import { CONFIG } from '../../config/constants';
import { useMobileDetection } from '../../hooks/useMobileDetection';

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

// Memoized individual history item to prevent unnecessary re-renders of NOW spans
interface HistoryItemComponentProps {
  item: HistoryItem;
  index: number;
  totalItems: number;
  onJumpToState: (index: number) => void;
  onViewState: (index: number) => void;
}

const HistoryItemComponent = React.memo<HistoryItemComponentProps>(({ 
  item, index, totalItems, onJumpToState, onViewState 
}) => {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div 
      key={`${item.index}-${item.timestamp}`}
      className="history-item"
      style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: index < totalItems - 1 ? '12px' : '0',
        position: 'relative',
        cursor: item.isCurrent ? 'default' : 'pointer',
        opacity: item.isCurrent ? 1 : 0.8
      }}
      onClick={() => !item.isCurrent && onJumpToState(item.index)}
    >
      {/* Connecting line */}
      {index < totalItems - 1 && (
        <div 
          style={{
            position: 'absolute',
            left: '5.5px', // Centrado en el bullet (12px/2 - 1px/2)
            top: '18px', // Después del bullet
            width: '1px',
            height: '12px', // Altura hasta el próximo elemento
            backgroundColor: '#d1d5db',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '10px',
              color: '#6b7280',
              fontFamily: 'monospace'
            }}>
              {formatTime(item.timestamp)}
            </span>
            {/* Eye button to view state */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewState(item.index);
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px',
                borderRadius: '3px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6b7280',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
                e.currentTarget.style.color = '#374151';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#6b7280';
              }}
            >
              <Eye size={12} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.item.index === nextProps.item.index &&
    prevProps.item.timestamp === nextProps.item.timestamp &&
    prevProps.item.isCurrent === nextProps.item.isCurrent &&
    prevProps.index === nextProps.index &&
    prevProps.totalItems === nextProps.totalItems &&
    prevProps.onJumpToState === nextProps.onJumpToState &&
    prevProps.onViewState === nextProps.onViewState
  );
});

HistoryItemComponent.displayName = 'HistoryItemComponent';

const HistoryViewerCore: React.FC<HistoryViewerProps> = ({ history, onJumpToState }) => {
  const [selectedStateIndex, setSelectedStateIndex] = React.useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

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

  // Get all history states for modal (past + present + future)
  const allHistoryStates = React.useMemo(() => {
    return [...history.past, history.present, ...history.future];
  }, [history]);

  // Current state index in the complete history
  const currentStateIndex = history.past.length;

  const handleViewState = (stateIndex: number) => {
    setSelectedStateIndex(stateIndex);
    setIsModalOpen(true);
  };

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
      padding: '10px',
      maxHeight: '300px',
      overflowY: 'auto'
    }}>
      {/* History Modal */}
      {selectedStateIndex !== null && (
        <HistoryModal
          historyStates={allHistoryStates}
          currentStateIndex={currentStateIndex}
          selectedStateIndex={selectedStateIndex}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedStateIndex(null);
          }}
          isVisible={isModalOpen}
        />
      )}

      
      <div className="history-timeline" style={{ position: 'relative' }}>
        {allStates.map((item, index) => (
          <HistoryItemComponent
            key={`${item.index}-${item.timestamp}`}
            item={item}
            index={index}
            totalItems={allStates.length}
            onJumpToState={onJumpToState}
            onViewState={handleViewState}
          />
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

// Memoized HistoryViewer to prevent unnecessary re-renders of NOW spans
export const HistoryViewer = React.memo(HistoryViewerCore, (prevProps, nextProps) => {
  // Compare history states and timestamps to determine if re-render is needed
  const prevHistory = prevProps.history;
  const nextHistory = nextProps.history;
  
  // Check if past, present, future arrays changed
  if (prevHistory.past.length !== nextHistory.past.length ||
      prevHistory.future.length !== nextHistory.future.length) {
    return false; // Re-render
  }
  
  // Check if present state changed
  if (prevHistory.present !== nextHistory.present) {
    return false; // Re-render
  }
  
  // Check if timestamps changed (shallow comparison should be sufficient)
  const prevTimestamps = prevHistory.timestamps;
  const nextTimestamps = nextHistory.timestamps;
  
  if (prevTimestamps?.present !== nextTimestamps?.present) {
    return false; // Re-render
  }
  
  // Check if onJumpToState function reference changed
  if (prevProps.onJumpToState !== nextProps.onJumpToState) {
    return false; // Re-render
  }
  
  return true; // Skip re-render
});

export const UndoRedoControls: React.FC<UndoRedoControlsProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}) => {
  const { isMobile } = useMobileDetection();
  const iconSize = isMobile ? CONFIG.UI.ICONS.MOBILE_SIZE : CONFIG.UI.ICONS.DESKTOP_SIZE;
  const strokeWidth = isMobile ? CONFIG.UI.ICONS.MOBILE_STROKE_WIDTH : CONFIG.UI.ICONS.DESKTOP_STROKE_WIDTH;

  return (
    <div className="undo-redo-controls" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <PluginButton
        icon={<Undo2 size={iconSize} strokeWidth={strokeWidth} />}
        text="Undo"
        color="#374151"
        active={false}
        disabled={!canUndo}
        onPointerDown={onUndo}
      />
      <PluginButton
        icon={<Redo2 size={iconSize} strokeWidth={strokeWidth} />}
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
