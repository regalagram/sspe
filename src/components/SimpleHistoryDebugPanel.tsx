import React, { useState } from 'react';
import { useEditorHistory } from '../store/useEditorHistory';
import { globalUndoRedo } from '../store/simpleUndoRedo';

interface SimpleHistoryDebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChangeDetails {
  index: number;
  timestamp: number;
  description: string;
  changedFields: string[];
  isDiff: boolean;
  state?: any;
}

interface ChangeDetailModalProps {
  change: ChangeDetails | null;
  onClose: () => void;
}

function ChangeDetailModal({ change, onClose }: ChangeDetailModalProps) {
  if (!change) return null;
  
  const stateDetails = globalUndoRedo.getStateDetails(change.index);
  const date = new Date(change.timestamp);
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 20000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '20px',
        maxWidth: '80%',
        maxHeight: '80%',
        overflow: 'auto',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: '1px solid #eee',
          paddingBottom: '10px'
        }}>
          <h3 style={{ margin: 0, fontSize: '18px' }}>Change #{change.index + 1} Details</h3>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <strong>Timestamp:</strong> {date.toLocaleString()}
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <strong>Description:</strong> {change.description}
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <strong>Type:</strong> {change.isDiff ? 'Structural Diff' : 'Full State'}
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <strong>Changed Fields:</strong>
          <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
            {change.changedFields.map((field, idx) => (
              <li key={idx}>{field}</li>
            ))}
          </ul>
        </div>
        
        <div>
          <strong>State Data:</strong>
          <pre style={{
            backgroundColor: '#f5f5f5',
            padding: '10px',
            borderRadius: '4px',
            fontSize: '11px',
            overflow: 'auto',
            maxHeight: '300px',
            border: '1px solid #ddd'
          }}>
            {JSON.stringify(stateDetails, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

export function SimpleHistoryDebugPanel({ isOpen, onClose }: SimpleHistoryDebugPanelProps) {
  const history = useEditorHistory();
  const [selectedChange, setSelectedChange] = useState<ChangeDetails | null>(null);
  
  if (!isOpen) return null;

  const historyInfo = globalUndoRedo.getState();
  const detailedHistory = globalUndoRedo.getDetailedHistory();

  return (
    <div style={{
      position: 'fixed',
      top: '50px',
      right: '10px',
      width: '300px',
      maxHeight: '600px',
      backgroundColor: 'white',
      border: '1px solid #ccc',
      borderRadius: '8px',
      padding: '16px',
      zIndex: 10000,
      fontSize: '12px',
      fontFamily: 'monospace',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      overflow: 'auto'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '12px',
        borderBottom: '1px solid #eee',
        paddingBottom: '8px'
      }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
          Simple History Debug
        </h3>
        <button 
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '16px',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          ×
        </button>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>History State:</div>
        <div>Can Undo: <span style={{ color: history.canUndo ? 'green' : 'red' }}>{history.canUndo ? 'Yes' : 'No'}</span></div>
        <div>Can Redo: <span style={{ color: history.canRedo ? 'green' : 'red' }}>{history.canRedo ? 'Yes' : 'No'}</span></div>
        <div>Past States: <span style={{ color: 'blue' }}>{historyInfo.pastCount}</span></div>
        <div>Future States: <span style={{ color: 'purple' }}>{historyInfo.futureCount}</span></div>
        <div>Tracking: <span style={{ color: history.isTracking ? 'green' : 'red' }}>{history.isTracking ? 'Active' : 'Paused'}</span></div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Actions:</div>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          <button 
            onClick={history.undo}
            disabled={!history.canUndo}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              background: history.canUndo ? '#f0f8ff' : '#f5f5f5',
              cursor: history.canUndo ? 'pointer' : 'not-allowed',
              opacity: history.canUndo ? 1 : 0.6
            }}
          >
            Undo
          </button>
          <button 
            onClick={history.redo}
            disabled={!history.canRedo}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              background: history.canRedo ? '#f0fff0' : '#f5f5f5',
              cursor: history.canRedo ? 'pointer' : 'not-allowed',
              opacity: history.canRedo ? 1 : 0.6
            }}
          >
            Redo
          </button>
          <button 
            onClick={history.clear}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              background: '#fff0f0',
              cursor: 'pointer'
            }}
          >
            Clear
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Memory Optimization:</div>
        <div style={{ fontSize: '10px', color: '#666' }}>
          • Using structural diffs for memory efficiency<br/>
          • Automatic state partializing (excludes temporary fields)<br/>
          • Debounced capture (150ms) to prevent excessive history<br/>
          • Safe state reconstruction during undo/redo
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>System Info:</div>
        <div style={{ fontSize: '10px', color: '#666' }}>
          • Engine: Simple History (replaces Zundo)<br/>
          • Limit: 50 states<br/>
          • Diff System: Structural diffs with microdiff<br/>
          • Equality: Fast-deep-equal optimization
        </div>
      </div>

      <div>
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
          Change History ({detailedHistory.length} states):
        </div>
        <div style={{ 
          maxHeight: '200px',
          overflow: 'auto',
          border: '1px solid #ddd',
          borderRadius: '4px'
        }}>
          {detailedHistory.length === 0 ? (
            <div style={{ padding: '8px', color: '#666', fontStyle: 'italic' }}>
              No changes recorded yet
            </div>
          ) : (
            detailedHistory.map((change, index) => {
              const date = new Date(change.timestamp);
              const timeAgo = change.timestamp ? `${Math.round((Date.now() - change.timestamp) / 1000)}s ago` : 'unknown time';
              const fieldsArray = Array.from(change.changedFields);
              const changeWithIndex = { ...change, index, isDiff: index > 0, changedFields: fieldsArray };
              
              return (
                <div
                  key={index}
                  style={{
                    padding: '6px 8px',
                    borderBottom: index < detailedHistory.length - 1 ? '1px solid #eee' : 'none',
                    cursor: 'pointer',
                    fontSize: '10px'
                  }}
                  onClick={() => setSelectedChange(changeWithIndex)}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f0f0f0'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <div style={{ fontWeight: 'bold', color: '#333' }}>
                    #{index + 1} {index > 0 ? '🔧' : '📄'} {change.description}
                  </div>
                  <div style={{ color: '#666', fontSize: '9px' }}>
                    {timeAgo} • {fieldsArray.length} field(s)
                  </div>
                  <div style={{ color: '#888', fontSize: '8px' }}>
                    {fieldsArray.slice(0, 3).join(', ')}
                    {fieldsArray.length > 3 ? '...' : ''}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div style={{ marginTop: '12px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Current State Preview:</div>
        <div style={{ 
          background: '#f8f8f8', 
          padding: '8px', 
          borderRadius: '4px',
          fontSize: '10px',
          maxHeight: '120px',
          overflow: 'auto'
        }}>
          <div>Mode: {history.present?.mode?.current || 'unknown'}</div>
          <div>Paths: {Object.keys(history.present?.paths || {}).length}</div>
          <div>Texts: {Object.keys(history.present?.texts || {}).length}</div>
          <div>Selection: {history.present?.selection?.selectedPaths?.length || 0} items</div>
          <div>Viewport: {history.present?.viewport ? 'active' : 'none'}</div>
        </div>
      </div>

      {selectedChange && (
        <ChangeDetailModal 
          change={selectedChange} 
          onClose={() => setSelectedChange(null)} 
        />
      )}
    </div>
  );
}
