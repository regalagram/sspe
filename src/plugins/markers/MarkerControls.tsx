import React, { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { createDefaultMarker, createArrowMarker, formatSVGReference, parseSVGReference } from '../../utils/svg-elements-utils';
import { PluginButton } from '../../components/PluginButton';
import { ArrowUp, ArrowDown, Plus, Trash2, Target } from 'lucide-react';

export const MarkerControls: React.FC = () => {
  const { 
    markers,
    selection, 
    paths,
    gradients,
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
    if (selectedSubPaths.length === 0) {
      alert('Please select one or more sub-paths first');
      return;
    }

    const reference = formatSVGReference(markerId);
    
    // Apply to parent paths of selected sub-paths
    const parentPaths = getParentPathsOfSelectedSubPaths();
    parentPaths.forEach(pathId => {
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
      updatePathStyle(pathId, updates);
    });
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

  const handleRemoveMarkerFromSubPaths = (position: 'start' | 'mid' | 'end') => {
    if (selectedSubPaths.length === 0) {
      alert('Please select one or more sub-paths first');
      return;
    }

    // Remove from parent paths of selected sub-paths
    const parentPaths = getParentPathsOfSelectedSubPaths();
    parentPaths.forEach(pathId => {
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
      updatePathStyle(pathId, updates);
    });
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

      {/* Create Markers */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
          Create Custom Marker:
        </span>
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

      {/* Apply Custom Markers to Selected Sub-Paths */}
      {hasPathSelection && markers.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px', borderTop: '1px solid #e9ecef' }}>
          <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
            Apply Custom Markers:
          </span>
          <div style={{ fontSize: '11px', color: '#999', marginBottom: '6px' }}>
            Apply to {selectedSubPaths.length} selected sub-path{selectedSubPaths.length > 1 ? 's' : ''}
          </div>
          
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
                        min="0.5"
                        max="10"
                        step="0.5"
                        value={marker.markerWidth}
                        onChange={(e) => handleUpdateMarker(marker.id, { 
                          markerWidth: Number(e.target.value) || 3 
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
                        min="0.5"
                        max="10"
                        step="0.5"
                        value={marker.markerHeight}
                        onChange={(e) => handleUpdateMarker(marker.id, { 
                          markerHeight: Number(e.target.value) || 3 
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
                        min="-5"
                        max="15"
                        step="0.5"
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
                        min="-2.5"
                        max="7.5"
                        step="0.5"
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

                  {/* Style Controls */}
                  <div style={{ paddingTop: '6px', borderTop: '1px solid #e9ecef' }}>
                    <span style={{ fontSize: '11px', color: '#666', fontWeight: '500', marginBottom: '6px', display: 'block' }}>
                      Marker Style:
                    </span>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                      <div>
                        <label style={{ fontSize: '10px', color: '#666' }}>Fill</label>
                        <input
                          type="color"
                          value={typeof marker.style?.fill === 'string' ? marker.style.fill : '#000000'}
                          onChange={(e) => handleUpdateMarker(marker.id, { 
                            style: { ...marker.style, fill: e.target.value }
                          })}
                          style={{
                            width: '100%',
                            height: '28px',
                            padding: '2px',
                            border: '1px solid #ddd',
                            borderRadius: '3px'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '10px', color: '#666' }}>Fill Opacity</label>
                        <input
                          type="number"
                          min="0"
                          max="1"
                          step="0.1"
                          value={marker.style?.fillOpacity ?? 1}
                          onChange={(e) => handleUpdateMarker(marker.id, { 
                            style: { ...marker.style, fillOpacity: parseFloat(e.target.value) || 1 }
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                      <div>
                        <label style={{ fontSize: '10px', color: '#666' }}>Stroke</label>
                        <input
                          type="color"
                          value={
                            typeof marker.style?.stroke === 'string'
                              ? (marker.style?.stroke === 'none' ? '#000000' : marker.style?.stroke)
                              : '#000000'
                          }
                          onChange={(e) => handleUpdateMarker(marker.id, { 
                            style: { ...marker.style, stroke: e.target.value }
                          })}
                          style={{
                            width: '100%',
                            height: '28px',
                            padding: '2px',
                            border: '1px solid #ddd',
                            borderRadius: '3px'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '10px', color: '#666' }}>Stroke Width</label>
                        <input
                          type="number"
                          min="0"
                          max="10"
                          step="0.5"
                          value={marker.style?.strokeWidth || 0}
                          onChange={(e) => handleUpdateMarker(marker.id, { 
                            style: { ...marker.style, strokeWidth: parseFloat(e.target.value) || 0 }
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px' }}>
                      <div>
                        <label style={{ fontSize: '10px', color: '#666' }}>Stroke Opacity</label>
                        <input
                          type="number"
                          min="0"
                          max="1"
                          step="0.1"
                          value={marker.style?.strokeOpacity ?? 1}
                          onChange={(e) => handleUpdateMarker(marker.id, { 
                            style: { ...marker.style, strokeOpacity: parseFloat(e.target.value) || 1 }
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
                      <div style={{ display: 'flex', alignItems: 'end' }}>
                        <button
                          onClick={() => handleUpdateMarker(marker.id, { 
                            style: { ...marker.style, stroke: 'none', strokeWidth: 0 }
                          })}
                          style={{
                            padding: '4px 8px',
                            fontSize: '10px',
                            border: '1px solid #6c757d',
                            backgroundColor: '#fff',
                            color: '#6c757d',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          No Stroke
                        </button>
                      </div>
                    </div>

                    {/* Gradients */}
                    {gradients.length > 0 && (
                      <div style={{ paddingTop: '6px', borderTop: '1px solid #e9ecef' }}>
                        <span style={{ fontSize: '11px', color: '#666', fontWeight: '500', marginBottom: '6px', display: 'block' }}>
                          Advanced Fill:
                        </span>
                        
                        <div style={{ marginBottom: '6px' }}>
                          <label style={{ fontSize: '10px', color: '#666', marginBottom: '4px', display: 'block' }}>Use Gradient</label>
                          <select
                            value={
                              marker.style?.fill && typeof marker.style.fill === 'string' && marker.style.fill.startsWith('url(#') 
                                ? parseSVGReference(marker.style.fill) || ''
                                : ''
                            }
                            onChange={(e) => {
                              if (e.target.value) {
                                handleUpdateMarker(marker.id, { 
                                  style: { ...marker.style, fill: formatSVGReference(e.target.value) }
                                });
                              }
                            }}
                            style={{
                              width: '100%',
                              padding: '4px',
                              fontSize: '11px',
                              border: '1px solid #ddd',
                              borderRadius: '3px'
                            }}
                          >
                            <option value="">No gradient</option>
                            {gradients.map((gradient) => (
                              <option key={gradient.id} value={gradient.id}>
                                {gradient.type === 'linear' ? 'Linear' : 'Radial'} Gradient
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          onClick={() => handleUpdateMarker(marker.id, { 
                            style: { ...marker.style, fill: '#000000' }
                          })}
                          style={{
                            width: '100%',
                            padding: '4px 8px',
                            fontSize: '10px',
                            border: '1px solid #6c757d',
                            backgroundColor: '#fff',
                            color: '#6c757d',
                            borderRadius: '3px',
                            cursor: 'pointer'
                          }}
                        >
                          Reset to Solid Color
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Remove Markers from Selected Sub-Paths */}
      {hasPathSelection && (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px', 
          paddingTop: '8px', 
          borderTop: '1px solid #e9ecef' 
        }}>
          <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
            Remove Markers:
          </span>
          <div style={{ fontSize: '11px', color: '#999', marginBottom: '6px' }}>
            Remove from {selectedSubPaths.length} selected sub-path{selectedSubPaths.length > 1 ? 's' : ''}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
            <button
              onClick={() => handleRemoveMarkerFromSubPaths('start')}
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
            <button
              onClick={() => handleRemoveMarkerFromSubPaths('mid')}
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
            <button
              onClick={() => handleRemoveMarkerFromSubPaths('end')}
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
        <div>• Edit marker dimensions, orientation, and colors in the marker list</div>
        <div>• Use solid colors or gradients for marker styling</div>
        <div>• Markers automatically scale with zoom for consistent visual size</div>
      </div>
    </div>
  );
};