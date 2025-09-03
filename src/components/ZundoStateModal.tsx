import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, ChevronRight, Copy, GitCompare, FileText, Search } from 'lucide-react';
import { EditorState } from '../types';
import { UI_CONSTANTS } from '../config/constants';
import { useMobileDetection } from '../hooks/useMobileDetection';
import { calculateInlineDiff, useDiffConfig, reconstructDisplayData } from '../store/diffConfig';
import { useTemporalStore } from '../store/useEditorHistory';
import { useEditorStore } from '../store/editorStore';

// Global search state to persist across modal opens
let globalSearchTerm = '';

interface StateInfo {
  state: any;
  index: number;
  type: 'past' | 'present' | 'future';
  label: string;
}

interface ZundoStateModalProps {
  state: any;
  stateInfo: StateInfo;
  onClose: () => void;
}

export const ZundoStateModal: React.FC<ZundoStateModalProps> = ({
  state,
  stateInfo,
  onClose
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['paths', 'selection']));
  const [backdropClickEnabled, setBackdropClickEnabled] = useState(false);
  const [showDiffOnly, setShowDiffOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState(globalSearchTerm);
  const { config } = useDiffConfig();
  const temporal = useTemporalStore();
  const currentState = useEditorStore.getState();
  const isMobile = useMobileDetection();
  const iconSize = isMobile ? UI_CONSTANTS.TOOLBAR.MOBILE_ICON_SIZE : UI_CONSTANTS.TOOLBAR.DESKTOP_ICON_SIZE;
  const strokeWidth = isMobile ? UI_CONSTANTS.TOOLBAR.MOBILE_ICON_STROKE_WIDTH : UI_CONSTANTS.TOOLBAR.DESKTOP_ICON_STROKE_WIDTH;

  // Update global search term when local changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    globalSearchTerm = value;
  };

  const isDiffModeActive = config.mode === 'diff';

  // Calculate inline diff between this state and the appropriate comparison state
  const diffData = useMemo(() => {
    if (stateInfo.type === 'present') {
      // Compare present with most recent past
      const latestPast = temporal.pastStates[temporal.pastStates.length - 1];
      return latestPast ? calculateInlineDiff(state, latestPast) : null;
    } 
    
    if (stateInfo.type === 'past') {
      // Para Past states: comparar con el estado anterior
      // Past 1 comparar con Present, Past 2 comparar con Past 1, etc.
      const match = stateInfo.label.match(/Past (\d+)/);
      if (match) {
        const pastNumber = parseInt(match[1]);
        
        if (pastNumber === 1) {
          // Past 1: comparar con Present
          return calculateInlineDiff(state, currentState);
        } else {
          // Past N: comparar con Past N-1
          const previousPastIndex = temporal.pastStates.length - pastNumber + 1;
          if (previousPastIndex >= 0 && previousPastIndex < temporal.pastStates.length) {
            const previousState = temporal.pastStates[previousPastIndex];
            return calculateInlineDiff(state, previousState);
          }
        }
      }
    }
    
    if (stateInfo.type === 'future') {
      // Compare future with current state
      return calculateInlineDiff(state, currentState);
    }
    
    return null;
  }, [state, stateInfo, temporal.pastStates, currentState]);

  // Enable backdrop click after a delay to prevent immediate closure
  React.useEffect(() => {
    setBackdropClickEnabled(false);
    const timer = setTimeout(() => {
      setBackdropClickEnabled(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Auto-enable diff view when in diff mode and diff data is available
  React.useEffect(() => {
    if (isDiffModeActive && diffData) {
      setShowDiffOnly(true);
    }
  }, [isDiffModeActive, diffData]);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const copyToClipboard = async (data: any) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  // Function to search in nested objects/arrays
  const searchInValue = (value: any, term: string): boolean => {
    if (!term) return true;
    const lowerTerm = term.toLowerCase();
    
    if (typeof value === 'string') {
      return value.toLowerCase().includes(lowerTerm);
    }
    if (typeof value === 'number') {
      return value.toString().includes(lowerTerm);
    }
    if (typeof value === 'boolean') {
      return value.toString().includes(lowerTerm);
    }
    if (Array.isArray(value)) {
      return value.some(item => searchInValue(item, term));
    }
    if (typeof value === 'object' && value !== null) {
      return Object.keys(value).some(key => 
        key.toLowerCase().includes(lowerTerm) || searchInValue(value[key], term)
      );
    }
    return false;
  };

  // Helper function to check if a path was exactly changed (not just a container)
  const isExactPathChanged = (currentPath: string, changedPaths: string[]): boolean => {
    return changedPaths.includes(currentPath);
  };

  // Helper function to check if a path contains changes (for container styling)
  const containsChanges = (currentPath: string, changedPaths: string[]): boolean => {
    return changedPaths.some(changePath => changePath.startsWith(currentPath + '.'));
  };

  // Helper function to get change info for a specific path
  const getChangeInfo = (currentPath: string): any | null => {
    if (!diffData?.__diffMetadata?.changes) return null;
    return diffData.__diffMetadata.changes.find((change: any) => change.path === currentPath);
  };

  const renderValue = (value: any, depth: number = 0, currentPath: string = ''): React.ReactNode => {
    // Get all changed paths for highlighting
    const changedPaths = diffData?.__diffMetadata?.changes?.map((change: any) => change.path) || [];
    const isExactlyChanged = isExactPathChanged(currentPath, changedPaths);
    const hasChildChanges = containsChanges(currentPath, changedPaths);
    
    // Style for exact value changes - bright highlight
    const exactChangeStyle = isExactlyChanged ? {
      backgroundColor: '#fef3c7',
      padding: '2px 4px',
      borderRadius: '3px',
      border: '1px solid #f59e0b',
      fontWeight: '600'
    } : {};
    
    if (value === null) return React.createElement('span', { style: { color: '#6b7280', ...exactChangeStyle } }, 'null');
    if (value === undefined) return React.createElement('span', { style: { color: '#6b7280', ...exactChangeStyle } }, 'undefined');
    if (typeof value === 'boolean') return React.createElement('span', { style: { color: '#7c3aed', ...exactChangeStyle } }, String(value));
    if (typeof value === 'number') return React.createElement('span', { style: { color: '#2563eb', ...exactChangeStyle } }, value);
    if (typeof value === 'string') return React.createElement('span', { style: { color: '#059669', ...exactChangeStyle } }, `"${value}"`);
    
    if (Array.isArray(value)) {
      // Handle sparse arrays - only show elements that exist (not undefined)
      const definedElements = value
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item !== undefined);
      
      if (definedElements.length === 0) return React.createElement('span', { style: { color: '#6b7280' } }, '[]');
      
      // Check if this is a sparse array (has gaps)
      const isSparseArray = definedElements.length < value.length;
      
      return React.createElement('div', { style: { marginLeft: '16px' } },
        React.createElement('span', { style: { color: '#6b7280' } }, '['),
        isSparseArray && React.createElement('div', { 
          style: { 
            marginLeft: '8px',
            fontSize: '11px',
            color: '#f59e0b',
            backgroundColor: '#fef3c7',
            padding: '2px 6px',
            borderRadius: '3px',
            display: 'inline-block',
            marginBottom: '4px'
          }
        }, `📌 Showing only ${definedElements.length} modified elements out of ${value.length} total`),
        ...definedElements.map(({ item, index }) => {
          const itemPath = currentPath ? `${currentPath}.${index}` : `${index}`;
          const itemHasChanges = containsChanges(itemPath, changedPaths);
          // No container highlighting - let individual values handle their own highlighting
          return React.createElement('div', { 
            key: index, 
            style: { 
              marginLeft: '8px'
            }
          },
            React.createElement('span', { 
              style: { 
                color: isSparseArray ? '#f59e0b' : '#9ca3af',
                fontWeight: isSparseArray ? '600' : 'normal'
              } 
            }, `[${index}]:`),
            ' ', renderValue(item, depth + 1, itemPath)
          );
        }),
        React.createElement('span', { style: { color: '#6b7280' } }, ']')
      );
    }

    if (typeof value === 'object') {
      const keys = Object.keys(value).sort(); // Sort keys alphabetically
      if (keys.length === 0) return React.createElement('span', { style: { color: '#6b7280' } }, '{}');
      return React.createElement('div', { style: { marginLeft: '16px' } },
        React.createElement('span', { style: { color: '#6b7280' } }, '{'),
        ...keys.map(key => {
          const keyPath = currentPath ? `${currentPath}.${key}` : key;
          // No container highlighting - let individual values handle their own highlighting
          return React.createElement('div', { 
            key, 
            style: { 
              marginLeft: '8px'
            }
          },
            React.createElement('span', { style: { color: '#4b5563' } }, `"${key}":`),
            ' ', renderValue(value[key], depth + 1, keyPath)
          );
        }),
        React.createElement('span', { style: { color: '#6b7280' } }, '}')
      );
    }

    return React.createElement('span', { style: exactChangeStyle }, String(value));
  };

  const getSectionSummary = (key: string, value: any) => {
    if (Array.isArray(value)) return `[${value.length}]`;
    if (typeof value === 'object' && value !== null) {
      const keys = Object.keys(value);
      return `{${keys.length}}`;
    }
    return '';
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (!backdropClickEnabled) return;
    e.stopPropagation();
    onClose();
  };

  const allSections = [
    { key: 'animations', label: 'Animations' },
    { key: 'animationState', label: 'Animation State' },
    { key: 'animationSync', label: 'Animation Sync' },
    { key: 'clipPaths', label: 'Clip Paths' },
    { key: 'enabledFeatures', label: 'Features' },
    { key: 'filters', label: 'Filters' },
    { key: 'formatCopyState', label: 'Format Copy State' },
    { key: 'gradients', label: 'Gradients' },
    { key: 'grid', label: 'Grid' },
    { key: 'groups', label: 'Groups' },
    { key: 'images', label: 'Images' },
    { key: 'isFloatingToolbarHidden', label: 'Floating Toolbar Hidden' },
    { key: 'isFullscreen', label: 'Fullscreen' },
    { key: 'markers', label: 'Markers' },
    { key: 'masks', label: 'Masks' },
    { key: 'mode', label: 'Mode' },
    { key: 'paths', label: 'Paths' },
    { key: 'precision', label: 'Precision' },
    { key: 'selection', label: 'Selection' },
    { key: 'shapeSize', label: 'Shape Size' },
    { key: 'symbols', label: 'Symbols' },
    { key: 'textEditState', label: 'Text Edit State' },
    { key: 'textFormatCopyState', label: 'Text Format Copy State' },
    { key: 'textPaths', label: 'Text Paths' },
    { key: 'texts', label: 'Texts' },
    { key: 'toolSettings', label: 'Tool Settings' },
    { key: 'ui', label: 'UI' },
    { key: 'useFormatCopyState', label: 'Use Format Copy State' },
    { key: 'uses', label: 'Uses' },
    { key: 'viewport', label: 'Viewport' },
    { key: 'visualDebugSizes', label: 'Visual Debug Sizes' }
  ].sort((a, b) => a.label.localeCompare(b.label));

  const dataToShow = useMemo(() => {
    if (showDiffOnly && diffData) {
      // Reconstruct rich display data from minimal storage using current state
      return reconstructDisplayData(diffData, currentState);
    }
    return state;
  }, [showDiffOnly, diffData, state, currentState]);

  // Filter sections based on view mode and search term
  const sectionsToShow = useMemo(() => {
    let filteredSections;
    if (!showDiffOnly || !diffData) {
      filteredSections = allSections;
    } else {
      // Show only sections that have changes
      filteredSections = allSections.filter(({ key }) => diffData.hasOwnProperty(key));
    }
    
    // Apply search filter
    if (searchTerm) {
      filteredSections = filteredSections.filter(({ key, label }) => {
        const value = dataToShow[key as keyof EditorState];
        return label.toLowerCase().includes(searchTerm.toLowerCase()) || 
               key.toLowerCase().includes(searchTerm.toLowerCase()) ||
               searchInValue(value, searchTerm);
      });
    }
    
    // Ensure sections remain alphabetically sorted
    return filteredSections.sort((a, b) => a.label.localeCompare(b.label));
  }, [showDiffOnly, diffData, searchTerm, dataToShow]);


  const modalContent = (
    <div className="zundo-state-modal">
      {/* Backdrop */}
      <div 
        className="modal-backdrop"
        onClick={handleBackdropClick}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
      >
        {/* Modal Content */}
        <div 
          className="modal-content"
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #ccc',
            width: '100%',
            maxWidth: '1200px',
            maxHeight: '80vh',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Header */}
          <div style={{
            padding: '16px',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px'
            }}>
              <div>
                <h2 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#111827',
                  margin: 0
                }}>
                  {isDiffModeActive ? 'Diff Mode - Memory Optimized' : 'State Details'}: {stateInfo.label}
                </h2>
                <p style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  margin: '4px 0 0 0'
                }}>
                  Index: {stateInfo.index} | Type: {stateInfo.type}
                  {isDiffModeActive && (
                    <span style={{
                      marginLeft: '8px',
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      Memory optimized storage active
                    </span>
                  )}
                </p>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <button
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setShowDiffOnly(!showDiffOnly);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 12px',
                    fontSize: '12px',
                    backgroundColor: showDiffOnly ? '#dbeafe' : '#f3f4f6',
                    border: `1px solid ${showDiffOnly ? '#3b82f6' : '#d1d5db'}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: showDiffOnly ? '#1e40af' : '#374151'
                  }}
                  disabled={!diffData}
                  title={diffData ? 'Toggle between full state and changes only' : 'No differences to show'}
                >
                  {showDiffOnly ? (
                    <><FileText size={iconSize * 0.75} strokeWidth={strokeWidth} /><span>Full</span></>
                  ) : (
                    <><GitCompare size={iconSize * 0.75} strokeWidth={strokeWidth} /><span>Diff</span></>
                  )}
                </button>
                <button
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    copyToClipboard(dataToShow);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 12px',
                    fontSize: '12px',
                    backgroundColor: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  <Copy size={iconSize * 0.75} strokeWidth={strokeWidth} />
                  <span>Copy</span>
                </button>
                <button
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  style={{
                    padding: '8px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '50%',
                    cursor: 'pointer'
                  }}
                >
                  <X size={iconSize} strokeWidth={strokeWidth} />
                </button>
              </div>
            </div>
            
            {/* Search Bar */}
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}>
              <div style={{
                position: 'absolute',
                left: '8px',
                pointerEvents: 'none'
              }}>
                <Search size={iconSize * 0.75} strokeWidth={strokeWidth} style={{ color: '#9ca3af' }} />
              </div>
              <input
                type="text"
                placeholder="Search in sections and JSON content..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                style={{
                  width: '100%',
                  paddingLeft: '32px',
                  paddingRight: '12px',
                  paddingTop: '8px',
                  paddingBottom: '8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  outline: 'none',
                  transition: 'border-color 0.15s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 0 0 1px #3b82f6';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
              />
              {searchTerm && (
                <button
                  onPointerDown={() => handleSearchChange('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    padding: '4px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: '#9ca3af'
                  }}
                  title="Clear search"
                >
                  <X size={iconSize * 0.75} strokeWidth={strokeWidth} />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {showDiffOnly && !diffData && (
                <div style={{
                  padding: '16px',
                  backgroundColor: '#fef3c7',
                  border: '1px solid #f59e0b',
                  borderRadius: '4px',
                  textAlign: 'center',
                  color: '#92400e'
                }}>
                  No differences detected for this state
                </div>
              )}
              
              {/* Show granular changes summary */}
              {showDiffOnly && diffData && diffData.__diffMetadata && (
                <div style={{
                  padding: '12px',
                  backgroundColor: '#f0f9ff',
                  border: '1px solid #0ea5e9',
                  borderRadius: '6px',
                  marginBottom: '8px'
                }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#0369a1',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    🔍 Changes Detected ({diffData.__diffMetadata.changes.length})
                  </div>
                  <div style={{ fontSize: '12px', lineHeight: '1.5' }}>
                    {diffData.__diffMetadata.changes.map((change: any, index: number) => (
                      <div key={index} style={{
                        padding: '6px 8px',
                        backgroundColor: 'white',
                        border: '1px solid #e0e7ff',
                        borderRadius: '4px',
                        marginBottom: '4px',
                        fontFamily: 'monospace'
                      }}>
                        <div style={{ color: '#374151', marginBottom: '2px' }}>
                          <span style={{ color: '#1f2937', fontWeight: '500', fontFamily: 'monospace' }}>{change.path}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ 
                            color: '#dc2626', 
                            backgroundColor: '#fee2e2', 
                            padding: '1px 4px', 
                            borderRadius: '2px',
                            fontSize: '10px'
                          }}>
                            - {JSON.stringify(change.oldValue)}
                          </span>
                          <span style={{ color: '#6b7280' }}>→</span>
                          <span style={{ 
                            color: '#059669',
                            backgroundColor: '#d1fae5',
                            padding: '1px 4px',
                            borderRadius: '2px',
                            fontSize: '10px',
                            fontWeight: '500'
                          }}>
                            + {JSON.stringify(change.value)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {sectionsToShow.map(({ key, label }) => {
                const value = dataToShow[key as keyof EditorState];
                const isExpanded = expandedSections.has(key);
                
                // Skip if showing diff and this field has no changes
                if (showDiffOnly && diffData && !diffData.hasOwnProperty(key)) {
                  return null;
                }
                
                
                return (
                  <div key={key} style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px'
                  }}>
                    <button
                      onPointerDown={() => toggleSection(key)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px',
                        textAlign: 'left',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '500'
                        }}>
                          {label}
                          {(showDiffOnly && diffData) && (
                            <span style={{
                              fontSize: '10px',
                              color: '#dc2626',
                              marginLeft: '4px',
                              backgroundColor: '#fef2f2',
                              padding: '1px 4px',
                              borderRadius: '2px'
                            }}>
                              CHANGED
                            </span>
                          )}
                        </span>
                        <span style={{
                          fontSize: '12px',
                          color: '#6b7280'
                        }}>{getSectionSummary(key, value)}</span>
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <div
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            copyToClipboard(value);
                          }}
                          style={{
                            padding: '4px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                          title="Copy section"
                        >
                          <Copy size={iconSize * 0.75} strokeWidth={strokeWidth} />
                        </div>
                        {isExpanded ? (
                          <ChevronDown size={iconSize} strokeWidth={strokeWidth} />
                        ) : (
                          <ChevronRight size={iconSize} strokeWidth={strokeWidth} />
                        )}
                      </div>
                    </button>
                    
                    {isExpanded && (
                      <div style={{
                        borderTop: '1px solid #e5e7eb',
                        padding: '12px',
                        backgroundColor: '#f9fafb'
                      }}>
                        <div style={{
                          fontFamily: 'monospace',
                          fontSize: '12px',
                          color: '#374151',
                          maxHeight: '240px',
                          overflowY: 'auto'
                        }}>
                          {renderValue(value, 0, key)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Ensure the portal target exists
  if (typeof document === 'undefined') return null;
  
  return createPortal(modalContent, document.body);
};