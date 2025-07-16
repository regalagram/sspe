import React, { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { createDefaultMarker, createArrowMarker, formatSVGReference } from '../../utils/svg-elements-utils';
import { PluginButton } from '../../components/PluginButton';
import { ArrowUp, ArrowDown, Plus, Trash2, Target } from 'lucide-react';

export const MarkerControls: React.FC = () => {
  const { 
    markers,
    selection, 
    paths,
    addMarker, 
    updateMarker, 
    removeMarker,
    updatePathStyle
  } = useEditorStore();

  const selectedPath = selection.selectedPaths.length === 1 
    ? paths.find(path => path.id === selection.selectedPaths[0])
    : null;

  const selectedSubPaths = selection.selectedSubPaths;
  const hasPathSelection = selectedSubPaths.length > 0;

  // Find the parent paths of selected sub-paths
  const getParentPathsOfSelectedSubPaths = () => {
    const parentPaths: string[] = [];
    selectedSubPaths.forEach(subPathId => {
      const parentPath = paths.find(path => 
        path.subPaths.some(subPath => subPath.id === subPathId)
      );
      if (parentPath && !parentPaths.includes(parentPath.id)) {
        parentPaths.push(parentPath.id);
      }
    });
    return parentPaths;
  };

  const handleCreateMarker = (type: 'default' | 'arrow') => {
    const markerData = type === 'arrow' ? createArrowMarker() : createDefaultMarker();
    addMarker(markerData);
  };

  const handleQuickApplyArrow = (position: 'start' | 'end') => {
    if (selectedSubPaths.length === 0) {
      alert('Please select one or more sub-paths first');
      return;
    }

    // Create arrow marker if none exists
    let arrowMarker = markers.find(m => m.children.some(child => 
      child.type === 'path' && child.id.includes('arrow')
    ));

    if (!arrowMarker) {
      const markerData = createArrowMarker();
      addMarker(markerData);
      arrowMarker = markerData as any;
    }

    // Apply to parent paths of selected sub-paths
    const parentPaths = getParentPathsOfSelectedSubPaths();
    parentPaths.forEach(pathId => {
      const updates: any = {};
      if (position === 'start') {
        updates.markerStart = formatSVGReference(arrowMarker!.id);
      } else {
        updates.markerEnd = formatSVGReference(arrowMarker!.id);
      }
      updatePathStyle(pathId, updates);
    });
  };

  const handleApplyMarker = (markerId: string, position: 'start' | 'mid' | 'end') => {
    if (selectedPath) {
      const reference = formatSVGReference(markerId);
      const updates: any = {};
      
      switch (position) {
        case 'start':
          updates.markerStart = reference;
          break;
        case 'mid':
          updates.markerMid = reference;
          break;
        case 'end':
          updates.markerEnd = reference;
          break;
      }
      
      updatePathStyle(selectedPath.id, updates);
    }
  };

  const handleRemoveMarkerDefinition = (id: string) => {
    if (confirm('Are you sure you want to remove this marker?')) {
      removeMarker(id);
    }
  };

  const selectedMarker = selection.selectedMarkers.length === 1 
    ? markers.find(marker => marker.id === selection.selectedMarkers[0])
    : null;

  const handleUpdateMarker = (markerId: string, updates: any) => {
    updateMarker(markerId, updates);
  };

  const handleRemoveMarkerFromPath = (position: 'start' | 'mid' | 'end') => {
    if (selectedPath) {
      const updates: any = {};
      switch (position) {
        case 'start':
          updates.markerStart = undefined;
          break;
        case 'mid':
          updates.markerMid = undefined;
          break;
        case 'end':
          updates.markerEnd = undefined;
          break;
      }
      updatePathStyle(selectedPath.id, updates);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Quick Apply */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
          Quick Apply:
        </span>
        <div style={{ fontSize: '11px', color: '#999', marginBottom: '6px' }}>
          {hasPathSelection 
            ? `Apply to ${selectedSubPaths.length} selected sub-path${selectedSubPaths.length > 1 ? 's' : ''}`
            : 'Select sub-paths first to apply markers'
          }
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          <PluginButton
            icon={<ArrowUp size={12} />}
            text="← Start Arrow"
            color={hasPathSelection ? '#17a2b8' : '#6c757d'}
            disabled={!hasPathSelection}
            onPointerDown={() => handleQuickApplyArrow('start')}
          />
          <PluginButton
            icon={<ArrowDown size={12} />}
            text="End Arrow →"
            color={hasPathSelection ? '#17a2b8' : '#6c757d'}
            disabled={!hasPathSelection}
            onPointerDown={() => handleQuickApplyArrow('end')}
          />
        </div>
      </div>

      {/* Create Markers */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
          Create Custom Marker:
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <PluginButton
            icon={<Target size={12} />}
            text="Arrow"
            color="#28a745"
            onPointerDown={() => handleCreateMarker('arrow')}
          />
          <PluginButton
            icon={<Plus size={12} />}
            text="Custom"
            color="#28a745"
            onPointerDown={() => handleCreateMarker('default')}
          />
        </div>
      </div>

      {/* Apply to Selected Path */}
      {selectedPath && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px', borderTop: '1px solid #e9ecef' }}>
          <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
            Apply to Selected Path:
          </span>
          
          {markers.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {markers.map((marker) => (
                <div key={marker.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '11px', color: '#666', fontWeight: '500' }}>
                    Marker ({marker.children.length} elements)
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
                    <button
                      onClick={() => handleApplyMarker(marker.id, 'start')}
                      style={{
                        padding: '4px 8px',
                        fontSize: '10px',
                        border: '1px solid #007bff',
                        backgroundColor: '#fff',
                        color: '#007bff',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      Start
                    </button>
                    <button
                      onClick={() => handleApplyMarker(marker.id, 'mid')}
                      style={{
                        padding: '4px 8px',
                        fontSize: '10px',
                        border: '1px solid #007bff',
                        backgroundColor: '#fff',
                        color: '#007bff',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      Mid
                    </button>
                    <button
                      onClick={() => handleApplyMarker(marker.id, 'end')}
                      style={{
                        padding: '4px 8px',
                        fontSize: '10px',
                        border: '1px solid #007bff',
                        backgroundColor: '#fff',
                        color: '#007bff',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      End
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '11px', color: '#999' }}>No markers available</div>
          )}
        </div>
      )}

      {/* Marker List */}
      {markers.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px', borderTop: '1px solid #e9ecef' }}>
          <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
            Markers ({markers.length}):
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflow: 'auto' }}>
            {markers.map((marker) => (
              <div
                key={marker.id}
                style={{
                  padding: '8px',
                  backgroundColor: selectedMarker?.id === marker.id ? '#e3f2fd' : '#f8f9fa',
                  borderRadius: '4px',
                  border: selectedMarker?.id === marker.id ? '1px solid #1976d2' : '1px solid #e9ecef'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '11px', color: '#666' }}>
                      {marker.children.length} elements
                    </div>
                    <div style={{ fontSize: '10px', color: '#999' }}>
                      {marker.markerWidth} × {marker.markerHeight}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveMarkerDefinition(marker.id)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '10px',
                      border: '1px solid #dc3545',
                      backgroundColor: '#fff',
                      color: '#dc3545',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                  >
                    Remove
                  </button>
                </div>
                
                {/* Marker Properties Editor */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <div>
                      <label style={{ fontSize: '10px', color: '#666' }}>Width</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={marker.markerWidth}
                        onChange={(e) => handleUpdateMarker(marker.id, { 
                          markerWidth: Number(e.target.value) || 10 
                        })}
                        style={{
                          width: '100%',
                          padding: '4px',
                          fontSize: '11px',
                          border: '1px solid #ddd',
                          borderRadius: '3px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', color: '#666' }}>Height</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={marker.markerHeight}
                        onChange={(e) => handleUpdateMarker(marker.id, { 
                          markerHeight: Number(e.target.value) || 10 
                        })}
                        style={{
                          width: '100%',
                          padding: '4px',
                          fontSize: '11px',
                          border: '1px solid #ddd',
                          borderRadius: '3px'
                        }}
                      />
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <div>
                      <label style={{ fontSize: '10px', color: '#666' }}>Ref X</label>
                      <input
                        type="number"
                        value={marker.refX || 0}
                        onChange={(e) => handleUpdateMarker(marker.id, { 
                          refX: Number(e.target.value) || 0 
                        })}
                        style={{
                          width: '100%',
                          padding: '4px',
                          fontSize: '11px',
                          border: '1px solid #ddd',
                          borderRadius: '3px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', color: '#666' }}>Ref Y</label>
                      <input
                        type="number"
                        value={marker.refY || 0}
                        onChange={(e) => handleUpdateMarker(marker.id, { 
                          refY: Number(e.target.value) || 0 
                        })}
                        style={{
                          width: '100%',
                          padding: '4px',
                          fontSize: '11px',
                          border: '1px solid #ddd',
                          borderRadius: '3px'
                        }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '10px', color: '#666' }}>Orientation</label>
                    <select
                      value={marker.orient || 'auto'}
                      onChange={(e) => handleUpdateMarker(marker.id, { 
                        orient: e.target.value 
                      })}
                      style={{
                        width: '100%',
                        padding: '4px',
                        fontSize: '11px',
                        border: '1px solid #ddd',
                        borderRadius: '3px'
                      }}
                    >
                      <option value="auto">Auto</option>
                      <option value="auto-start-reverse">Auto Start Reverse</option>
                      <option value="0">0°</option>
                      <option value="90">90°</option>
                      <option value="180">180°</option>
                      <option value="270">270°</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Remove Markers from Selected Path */}
      {selectedPath && (selectedPath.style.markerStart || selectedPath.style.markerMid || selectedPath.style.markerEnd) && (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px', 
          paddingTop: '8px', 
          borderTop: '1px solid #e9ecef' 
        }}>
          <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
            Remove Markers from Selected Path:
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
            {selectedPath.style.markerStart && (
              <button
                onClick={() => handleRemoveMarkerFromPath('start')}
                style={{
                  padding: '4px 8px',
                  fontSize: '10px',
                  border: '1px solid #dc3545',
                  backgroundColor: '#fff',
                  color: '#dc3545',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                Remove Start
              </button>
            )}
            {selectedPath.style.markerMid && (
              <button
                onClick={() => handleRemoveMarkerFromPath('mid')}
                style={{
                  padding: '4px 8px',
                  fontSize: '10px',
                  border: '1px solid #dc3545',
                  backgroundColor: '#fff',
                  color: '#dc3545',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                Remove Mid
              </button>
            )}
            {selectedPath.style.markerEnd && (
              <button
                onClick={() => handleRemoveMarkerFromPath('end')}
                style={{
                  padding: '4px 8px',
                  fontSize: '10px',
                  border: '1px solid #dc3545',
                  backgroundColor: '#fff',
                  color: '#dc3545',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                Remove End
              </button>
            )}
          </div>
        </div>
      )}

      {/* Usage Instructions */}
      <div style={{ 
        padding: '8px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '4px',
        fontSize: '11px',
        color: '#666'
      }}>
        <div>• Create markers to decorate path endpoints and vertices</div>
        <div>• Apply to start, middle, or end positions of paths</div>
        <div>• Markers automatically orient to path direction</div>
        <div>• Edit marker dimensions and orientation in the marker list</div>
      </div>
    </div>
  );
};