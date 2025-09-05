import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Copy, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { EditorState } from '../types';
import { cleanStateForHistory } from '../utils/history-utils';

interface HistoryModalProps {
  historyStates: EditorState[];
  currentStateIndex: number;
  selectedStateIndex: number;
  onClose: () => void;
  isVisible: boolean;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  historyStates,
  currentStateIndex,
  selectedStateIndex,
  onClose,
  isVisible
}) => {
  const [activeTab, setActiveTab] = useState<'current' | 'diff'>('current');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success'>('idle');
  const [backdropClickEnabled, setBackdropClickEnabled] = useState(false);

  // Enable backdrop click after a delay to prevent immediate closure
  useEffect(() => {
    if (isVisible) {
      setBackdropClickEnabled(false);
      const timer = setTimeout(() => {
        setBackdropClickEnabled(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isVisible, onClose]);

  // Get the selected state and the previous state for diff
  const selectedState = historyStates[selectedStateIndex];
  const previousState = selectedStateIndex > 0 ? historyStates[selectedStateIndex - 1] : null;

  // Function to copy JSON to clipboard
  const copyToClipboard = async (data: any, label: string) => {
    try {
      // Clean the data before copying if it contains functions
      const cleanData = typeof data === 'object' && data !== null && 
                       (typeof (data as any).undo === 'function' || typeof (data as any).redo === 'function') 
                       ? cleanStateForHistory(data) 
                       : data;
      
      const jsonString = JSON.stringify(cleanData, null, 2);
      await navigator.clipboard.writeText(jsonString);
      setCopyStatus('success');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      try {
        const cleanData = typeof data === 'object' && data !== null && 
                         (typeof (data as any).undo === 'function' || typeof (data as any).redo === 'function') 
                         ? cleanStateForHistory(data) 
                         : data;
        const textArea = document.createElement('textarea');
        textArea.value = JSON.stringify(cleanData, null, 2);
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopyStatus('success');
        setTimeout(() => setCopyStatus('idle'), 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
      }
    }
  };

  // Calculate diff between current and previous state
  const calculateDiff = (current: EditorState, previous: EditorState | null) => {
    if (!previous) return { added: [], removed: [], modified: [] };
    
    // Clean both states before comparison to avoid function properties
    const cleanCurrent = typeof current === 'object' && current !== null && 
                        (typeof (current as any).undo === 'function' || typeof (current as any).redo === 'function')
                        ? cleanStateForHistory(current)
                        : current;
                        
    const cleanPrevious = typeof previous === 'object' && previous !== null && 
                         (typeof (previous as any).undo === 'function' || typeof (previous as any).redo === 'function')
                         ? cleanStateForHistory(previous)
                         : previous;
    
    const diff = {
      added: [] as string[],
      removed: [] as string[],
      modified: [] as string[]
    };

    // Compare different collections
    const collections = [
      'paths', 'texts', 'groups', 'images', 'textPaths', 
      'clipPaths', 'masks', 'filters', 'markers', 'symbols', 'uses'
    ];

    collections.forEach(collection => {
      const currentItems = (cleanCurrent as any)[collection] || [];
      const previousItems = (cleanPrevious as any)[collection] || [];
      
      const currentIds = new Set(currentItems.map((item: any) => item.id));
      const previousIds = new Set(previousItems.map((item: any) => item.id));

      // Find added items
      currentIds.forEach(id => {
        if (!previousIds.has(id)) {
          diff.added.push(`${collection}.${id}`);
        }
      });

      // Find removed items
      previousIds.forEach(id => {
        if (!currentIds.has(id)) {
          diff.removed.push(`${collection}.${id}`);
        }
      });

      // Find modified items (compare JSON representations)
      currentItems.forEach((currentItem: any) => {
        const previousItem = previousItems.find((prev: any) => prev.id === currentItem.id);
        if (previousItem) {
          // Deep comparison excluding timestamps and transient properties
          const cleanCurrentItem = JSON.parse(JSON.stringify(currentItem));
          const cleanPreviousItem = JSON.parse(JSON.stringify(previousItem));
          
          if (JSON.stringify(cleanCurrentItem) !== JSON.stringify(cleanPreviousItem)) {
            diff.modified.push(`${collection}.${currentItem.id}`);
          }
        }
      });
    });

    // Check for viewport changes
    if (JSON.stringify(cleanCurrent.viewport) !== JSON.stringify(cleanPrevious.viewport)) {
      diff.modified.push('viewport');
    }

    // Check for selection changes
    if (JSON.stringify(cleanCurrent.selection) !== JSON.stringify(cleanPrevious.selection)) {
      diff.modified.push('selection');
    }

    // Check for tool settings changes
    if (JSON.stringify(cleanCurrent.toolSettings) !== JSON.stringify(cleanPrevious.toolSettings)) {
      diff.modified.push('toolSettings');
    }

    return diff;
  };

  const diff = calculateDiff(selectedState, previousState);

  if (!isVisible || !selectedState) return null;

  const modalContent = (
    <div className="history-modal">
      {/* Backdrop */}
      <div 
        className="modal-backdrop"
        onClick={(e) => {
          if (backdropClickEnabled && e.target === e.currentTarget) {
            onClose();
          }
        }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 10001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
      >
        {/* Modal Content */}
        <div 
          className="modal-content"
          onClick={e => e.stopPropagation()}
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #000',
            width: '90%',
            maxWidth: '800px',
            height: '80%',
            maxHeight: '600px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }}
        >
          {/* Header */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e5e5e5',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ 
              margin: 0, 
              fontSize: '18px', 
              fontWeight: '600',
              color: '#000'
            }}>
              History State #{selectedStateIndex + 1}
              {selectedStateIndex === currentStateIndex && (
                <span style={{ 
                  marginLeft: '8px',
                  fontSize: '12px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '10px'
                }}>
                  CURRENT
                </span>
              )}
              <div style={{
                fontSize: '12px',
                fontWeight: '400',
                color: '#666',
                marginTop: '4px'
              }}>
                {selectedState && (
                  <>
                    Paths: {(selectedState.paths || []).length} • 
                    Texts: {(selectedState.texts || []).length} • 
                    Groups: {(selectedState.groups || []).length} • 
                    Images: {(selectedState.images || []).length}
                  </>
                )}
              </div>
            </h3>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f0f0f0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #e5e5e5'
          }}>
            <button
              onClick={() => setActiveTab('current')}
              style={{
                padding: '12px 20px',
                border: 'none',
                backgroundColor: activeTab === 'current' ? '#f8f9fa' : 'transparent',
                borderBottom: activeTab === 'current' ? '2px solid #3b82f6' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === 'current' ? '600' : '400',
                color: activeTab === 'current' ? '#3b82f6' : '#666'
              }}
            >
              Current State
            </button>
            {previousState && (
              <button
                onClick={() => setActiveTab('diff')}
                style={{
                  padding: '12px 20px',
                  border: 'none',
                  backgroundColor: activeTab === 'diff' ? '#f8f9fa' : 'transparent',
                  borderBottom: activeTab === 'diff' ? '2px solid #3b82f6' : '2px solid transparent',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: activeTab === 'diff' ? '600' : '400',
                  color: activeTab === 'diff' ? '#3b82f6' : '#666'
                }}
              >
                Changes from Previous
              </button>
            )}
          </div>

          {/* Content */}
          <div style={{
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {activeTab === 'current' ? (
              <>
                {/* Current State Tab */}
                <div style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #e5e5e5',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>
                    Complete State JSON
                  </span>
                  <button
                    onClick={() => copyToClipboard(selectedState, 'state')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      backgroundColor: copyStatus === 'success' ? '#10b981' : 'white',
                      color: copyStatus === 'success' ? 'white' : '#374151',
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Copy size={14} />
                    {copyStatus === 'success' ? 'Copied!' : 'Copy JSON'}
                  </button>
                </div>
                <div style={{
                  flex: 1,
                  overflow: 'auto',
                  padding: '16px 20px'
                }}>
                  <pre style={{
                    margin: 0,
                    fontSize: '12px',
                    fontFamily: 'Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                    lineHeight: '1.4',
                    color: '#374151',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all'
                  }}>
                    {JSON.stringify(
                      typeof selectedState === 'object' && selectedState !== null && 
                      (typeof (selectedState as any).undo === 'function' || typeof (selectedState as any).redo === 'function')
                      ? cleanStateForHistory(selectedState)
                      : selectedState, 
                      null, 
                      2
                    )}
                  </pre>
                </div>
              </>
            ) : (
              <>
                {/* Diff Tab */}
                <div style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #e5e5e5'
                }}>
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                      Summary of Changes
                    </span>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                      Comparing state #{selectedStateIndex + 1} with state #{selectedStateIndex}
                    </div>
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '16px',
                    fontSize: '12px'
                  }}>
                    <div>
                      <div style={{ 
                        fontWeight: '600', 
                        color: '#059669',
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span style={{
                          width: '12px',
                          height: '12px',
                          backgroundColor: '#059669',
                          borderRadius: '50%'
                        }}></span>
                        Added ({diff.added.length})
                      </div>
                      {diff.added.length === 0 ? (
                        <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>None</div>
                      ) : (
                        diff.added.map(item => (
                          <div key={item} style={{ color: '#059669', fontSize: '11px' }}>
                            + {item}
                          </div>
                        ))
                      )}
                    </div>
                    
                    <div>
                      <div style={{ 
                        fontWeight: '600', 
                        color: '#dc2626',
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span style={{
                          width: '12px',
                          height: '12px',
                          backgroundColor: '#dc2626',
                          borderRadius: '50%'
                        }}></span>
                        Removed ({diff.removed.length})
                      </div>
                      {diff.removed.length === 0 ? (
                        <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>None</div>
                      ) : (
                        diff.removed.map(item => (
                          <div key={item} style={{ color: '#dc2626', fontSize: '11px' }}>
                            - {item}
                          </div>
                        ))
                      )}
                    </div>
                    
                    <div>
                      <div style={{ 
                        fontWeight: '600', 
                        color: '#d97706',
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span style={{
                          width: '12px',
                          height: '12px',
                          backgroundColor: '#d97706',
                          borderRadius: '50%'
                        }}></span>
                        Modified ({diff.modified.length})
                      </div>
                      {diff.modified.length === 0 ? (
                        <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>None</div>
                      ) : (
                        diff.modified.map(item => (
                          <div key={item} style={{ color: '#d97706', fontSize: '11px' }}>
                            ~ {item}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  
                  {/* No changes indicator */}
                  {diff.added.length === 0 && diff.removed.length === 0 && diff.modified.length === 0 && (
                    <div style={{
                      textAlign: 'center',
                      padding: '16px',
                      color: '#9ca3af',
                      fontSize: '13px',
                      fontStyle: 'italic',
                      backgroundColor: '#f9fafb',
                      borderRadius: '6px',
                      border: '1px dashed #d1d5db',
                      marginTop: '12px'
                    }}>
                      No changes detected between these states
                    </div>
                  )}
                </div>

                {/* Copy buttons for diff data */}
                <div style={{
                  padding: '12px 20px',
                  borderBottom: '1px solid #e5e5e5',
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap'
                }}>
                  <button
                    onClick={() => copyToClipboard(selectedState, 'current')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      backgroundColor: 'white',
                      color: '#374151',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    <Copy size={12} />
                    Copy Current
                  </button>
                  {previousState && (
                    <button
                      onClick={() => copyToClipboard(previousState, 'previous')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        backgroundColor: 'white',
                        color: '#374151',
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                    >
                      <Copy size={12} />
                      Copy Previous
                    </button>
                  )}
                  <button
                    onClick={() => copyToClipboard(diff, 'diff')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      backgroundColor: 'white',
                      color: '#374151',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    <Copy size={12} />
                    Copy Diff
                  </button>
                </div>

                {/* Full JSON comparison */}
                <div style={{
                  flex: 1,
                  overflow: 'auto',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1px',
                  backgroundColor: '#e5e5e5'
                }}>
                  <div style={{ backgroundColor: 'white', overflow: 'auto' }}>
                    <div style={{ 
                      padding: '8px 12px', 
                      backgroundColor: '#f8f9fa', 
                      borderBottom: '1px solid #e5e5e5',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      Previous State #{selectedStateIndex}
                    </div>
                    <div style={{ padding: '12px' }}>
                      <pre style={{
                        margin: 0,
                        fontSize: '10px',
                        fontFamily: 'Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                        lineHeight: '1.3',
                        color: '#374151',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all'
                      }}>
                        {previousState ? JSON.stringify(
                          typeof previousState === 'object' && previousState !== null && 
                          (typeof (previousState as any).undo === 'function' || typeof (previousState as any).redo === 'function')
                          ? cleanStateForHistory(previousState)
                          : previousState, 
                          null, 
                          2
                        ) : 'No previous state'}
                      </pre>
                    </div>
                  </div>
                  
                  <div style={{ backgroundColor: 'white', overflow: 'auto' }}>
                    <div style={{ 
                      padding: '8px 12px', 
                      backgroundColor: '#f8f9fa', 
                      borderBottom: '1px solid #e5e5e5',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      Current State #{selectedStateIndex + 1}
                    </div>
                    <div style={{ padding: '12px' }}>
                      <pre style={{
                        margin: 0,
                        fontSize: '10px',
                        fontFamily: 'Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                        lineHeight: '1.3',
                        color: '#374151',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all'
                      }}>
                        {JSON.stringify(
                          typeof selectedState === 'object' && selectedState !== null && 
                          (typeof (selectedState as any).undo === 'function' || typeof (selectedState as any).redo === 'function')
                          ? cleanStateForHistory(selectedState)
                          : selectedState, 
                          null, 
                          2
                        )}
                      </pre>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Find the SVG container for the portal
  const svgContainer = document.querySelector('.svg-editor') as HTMLElement;
  const portalContainer = svgContainer || document.body;

  return ReactDOM.createPortal(modalContent, portalContainer);
};
