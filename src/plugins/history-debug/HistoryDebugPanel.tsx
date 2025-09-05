import React, { useState } from 'react';
import { Undo2, Redo2, Trash2, Eye, FileText, GitBranch, Clock } from 'lucide-react';
import { useEditorHistory } from '../../store/useEditorHistory';
import { globalUndoRedo } from '../../store/simpleUndoRedo';
import { PluginButton } from '../../components/PluginButton';

interface HistoryDebugPanelProps {
  onClose?: () => void;
}

interface HistoryEntry {
  index: number;
  timestamp: number;
  description: string;
  changedFields: string[];
  isDiff: boolean;
  state?: any;
}

interface HistoryDetailModalProps {
  entry: HistoryEntry | null;
  onClose: () => void;
  showDiffOnly: boolean;
  onToggleDiffMode: () => void;
}

function HistoryDetailModal({ entry, onClose, showDiffOnly, onToggleDiffMode }: HistoryDetailModalProps) {
  if (!entry) return null;
  
  const stateDetails = globalUndoRedo.getStateDetails(entry.index);
  const date = new Date(entry.timestamp);
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 30000, // Increased to be above floating toolbars
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '16px',
        maxWidth: '90%',
        maxHeight: '90%',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        fontFamily: 'monospace',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '12px',
          paddingBottom: '12px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div>
            <h3 style={{ margin: 0, color: '#1f2937', fontSize: '18px', fontWeight: '600' }}>
              History Entry #{entry.index}
            </h3>
            <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
              {date.toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px',
              borderRadius: '6px'
            }}
          >
            ×
          </button>
        </div>
        
        {/* Controls */}
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '12px',
          alignItems: 'center'
        }}>
          <PluginButton
            icon={showDiffOnly ? <FileText size={16} /> : <GitBranch size={16} />}
            text={showDiffOnly ? "Show Full State" : "Show Diff Only"}
            color="#3b82f6"
            onPointerDown={onToggleDiffMode}
          />
          
          <div style={{
            padding: '8px 12px',
            backgroundColor: entry.isDiff ? '#dcfce7' : '#fef3c7',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '500',
            color: entry.isDiff ? '#166534' : '#92400e'
          }}>
            {entry.isDiff ? 'INCREMENTAL DIFF' : 'FULL STATE'}
          </div>
        </div>
        
        {/* Metadata */}
        <div style={{ 
          marginBottom: '12px',
          padding: '12px',
          backgroundColor: '#f9fafb',
          borderRadius: '6px'
        }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>Metadata</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px', fontSize: '13px' }}>
            <span style={{ color: '#6b7280' }}>Description:</span>
            <span style={{ fontWeight: '500' }}>{entry.description}</span>
            <span style={{ color: '#6b7280' }}>Changed Fields:</span>
            <span>{entry.changedFields.join(', ')}</span>
            <span style={{ color: '#6b7280' }}>Timestamp:</span>
            <span>{entry.timestamp}</span>
          </div>
        </div>
        
        {/* State Data */}
        {stateDetails && (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
              {showDiffOnly ? 'Diff Data' : 'Full State Data'}
            </h4>
            <pre style={{
              background: '#1f2937',
              color: '#f9fafb',
              padding: '12px',
              borderRadius: '6px',
              overflow: 'auto',
              flex: 1,
              fontSize: '11px',
              border: 'none',
              margin: 0
            }}>
              {JSON.stringify(showDiffOnly ? stateDetails.entry.microDiff : stateDetails.state, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export const HistoryDebugPanel: React.FC<HistoryDebugPanelProps> = ({ onClose }) => {
  const { canUndo, canRedo, undo, redo, clear } = useEditorHistory();
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [showDiffOnly, setShowDiffOnly] = useState(false);
  const [modalDiffMode, setModalDiffMode] = useState(false);

  const historyState = globalUndoRedo.getState();
  const historyDetails = globalUndoRedo.getDetailedHistory();

  // Convert history details to entries format
  const historyEntries: HistoryEntry[] = historyDetails.map((detail, index) => ({
    index,
    timestamp: detail.timestamp,
    description: detail.description,
    changedFields: Array.from(detail.changedFields),
    isDiff: true, // All entries from detailed history are diffs
    state: detail
  }));

  const filteredEntries = showDiffOnly 
    ? historyEntries.filter(entry => entry.isDiff)
    : historyEntries;

  const currentStateIndex = historyState.pastCount - 1;

  const handleEntryClick = (entry: HistoryEntry) => {
    setSelectedEntry(entry);
  };

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Controls */}
      <div style={{ 
        padding: '0', 
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', padding: '8px' }}>
          <PluginButton
            icon={<Undo2 size={14} />}
            text="Undo"
            color="#3b82f6"
            disabled={!canUndo}
            onPointerDown={undo}
          />
          <PluginButton
            icon={<Redo2 size={14} />}
            text="Redo"
            color="#3b82f6"
            disabled={!canRedo}
            onPointerDown={redo}
          />
          <PluginButton
            icon={<Trash2 size={14} />}
            text="Clear"
            color="#ef4444"
            onPointerDown={clear}
          />
        </div>
        
        {/* Filter toggle */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '0 8px' }}>
          <PluginButton
            icon={<Eye size={14} />}
            text={showDiffOnly ? "Show All" : "Diffs Only"}
            color="#6b7280"
            active={showDiffOnly}
            onPointerDown={() => setShowDiffOnly(!showDiffOnly)}
          />
        </div>
        
        {/* Status info */}
        <div style={{ 
          fontSize: '11px', 
          color: '#6b7280',
          lineHeight: '1.3',
          padding: '0 8px 8px 8px'
        }}>
          <div>{filteredEntries.length} entries</div>
          <div>{canUndo ? 'Can undo' : 'Nothing to undo'}</div>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ 
        flex: 1, 
        overflow: 'auto',
        padding: '6px'
      }}>
        {filteredEntries.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '16px 8px',
            color: '#6b7280'
          }}>
            <Clock size={36} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
            <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>No history entries</p>
            <p style={{ margin: '6px 0 0 0', fontSize: '12px' }}>
              Use pushToHistory() to start tracking changes
            </p>
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            {/* Timeline line */}
            <div style={{
              position: 'absolute',
              left: '12px',
              top: '0',
              bottom: '0',
              width: '1px',
              backgroundColor: '#e5e7eb'
            }} />
            
            {filteredEntries.slice().reverse().map((entry, reverseIndex) => {
              const isCurrent = entry.index === currentStateIndex;
              const displayIndex = filteredEntries.length - 1 - reverseIndex;
              
              return (
                <div
                  key={entry.index}
                  style={{
                    position: 'relative',
                    marginBottom: reverseIndex === filteredEntries.length - 1 ? '0' : '12px',
                    paddingLeft: '28px'
                  }}
                >
                  {/* Timeline dot */}
                  <div style={{
                    position: 'absolute',
                    left: '6px',
                    top: '6px',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: isCurrent ? '#3b82f6' : (entry.isDiff ? '#10b981' : '#f59e0b'),
                    border: '2px solid white',
                    boxShadow: '0 0 0 1px #e5e7eb',
                    zIndex: 1
                  }} />
                  
                  {/* Entry card */}
                  <div
                    onClick={() => handleEntryClick(entry)}
                    style={{
                      padding: '6px',
                      backgroundColor: isCurrent ? '#eff6ff' : '#ffffff',
                      border: isCurrent ? '1px solid #3b82f6' : '1px solid #e5e7eb',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: isCurrent ? '0 2px 8px rgba(59, 130, 246, 0.15)' : '0 1px 2px rgba(0, 0, 0, 0.05)'
                    }}
                    onMouseEnter={(e) => {
                      if (!isCurrent) {
                        e.currentTarget.style.backgroundColor = '#f9fafb';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isCurrent) {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ 
                          fontSize: '12px', 
                          fontWeight: '600',
                          color: isCurrent ? '#1d4ed8' : '#374151'
                        }}>
                          #{entry.index}
                        </span>
                      </div>
                      
                      <span style={{
                        fontSize: '10px',
                        color: '#6b7280'
                      }}>
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    {isCurrent && (
                      <div style={{ marginBottom: '4px' }}>
                        <span style={{
                          fontSize: '9px',
                          fontWeight: '600',
                          color: '#1d4ed8',
                          backgroundColor: '#dbeafe',
                          padding: '1px 6px',
                          borderRadius: '8px'
                        }}>
                          CURRENT
                        </span>
                      </div>
                    )}
                    
                    <p style={{
                      margin: '0 0 4px 0',
                      fontSize: '11px',
                      color: '#374151',
                      fontWeight: '500',
                      lineHeight: '1.3'
                    }}>
                      {entry.description}
                    </p>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                      {entry.changedFields.slice(0, 3).map((field, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: '8px',
                            color: '#6b7280',
                            backgroundColor: '#f3f4f6',
                            padding: '1px 3px',
                            borderRadius: '2px'
                          }}
                        >
                          {field}
                        </span>
                      ))}
                      {entry.changedFields.length > 3 && (
                        <span style={{
                          fontSize: '8px',
                          color: '#6b7280'
                        }}>
                          +{entry.changedFields.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail modal */}
      <HistoryDetailModal
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
        showDiffOnly={modalDiffMode}
        onToggleDiffMode={() => setModalDiffMode(!modalDiffMode)}
      />
    </div>
  );
};
