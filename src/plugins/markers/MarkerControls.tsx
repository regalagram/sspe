import React, { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { createDefaultMarker, createArrowMarker, createCustomMarkerWithPath, formatSVGReference, parseSVGReference } from '../../utils/svg-elements-utils';
import { PluginButton } from '../../components/PluginButton';
import { ElementPreview } from '../../components/ElementPreview';
import { ArrowUp, ArrowDown, Plus, Trash2, Target, Edit3 } from 'lucide-react';

export const MarkerControls: React.FC = () => {
  const { 
    markers,
    selection, 
    paths,
    gradients,
    addMarker, 
    updateMarker, 
    removeMarker,
    updatePathStyle,
    addPath,
    replacePaths
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

  const handleCreateMarker = (type: 'default' | 'arrow' | 'custom') => {
    if (type === 'custom') {
      // Create a custom marker with an editable path
      const { marker, path } = createCustomMarkerWithPath();
      
      // First add the path
      const pathId = addPath(path.style);
      
      // Update the path with the correct structure by getting current state and replacing
      const state = useEditorStore.getState();
      const updatedPaths = state.paths.map(p => 
        p.id === pathId 
          ? { ...path, id: pathId }
          : p
      );
      replacePaths(updatedPaths);
      
      // Create marker with reference to the path
      const markerWithPath = {
        ...marker,
        children: [{ type: 'path' as const, id: pathId }]
      };
      
      addMarker(markerWithPath);
    } else {
      const markerData = type === 'arrow' ? createArrowMarker() : createDefaultMarker();
      addMarker(markerData);
    }
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
          <PluginButton
            icon={<Edit3 size={12} />}
            text="Custom Path"
            color="#ffc107"
            onPointerDown={() => handleCreateMarker('custom')}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ElementPreview 
                    elementId={marker.id} 
                    elementType="marker" 
                    size={32}
                  />
                  <span style={{ fontSize: '11px', color: '#666', fontWeight: '500' }}>
                    Marker ({marker.children.length} elements)
                  </span>
                </div>
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
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                  <ElementPreview 
                    elementId={marker.id} 
                    elementType="marker" 
                    size={48}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ fontSize: '11px', color: '#666', fontWeight: '500' }}>
                        Marker #{marker.id.slice(-6)}
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
                    <div style={{ fontSize: '10px', color: '#999', marginBottom: '2px' }}>
                      {marker.children.length} element{marker.children.length !== 1 ? 's' : ''}
                    </div>
                    <div style={{ fontSize: '10px', color: '#999' }}>
                      Size: {marker.markerWidth} × {marker.markerHeight}
                    </div>
                  </div>
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

                  {/* Path Editor for Custom Markers */}
                  {marker.children.length > 0 && marker.children.some(child => child.type === 'path') && (
                    <div style={{ paddingTop: '6px', borderTop: '1px solid #e9ecef' }}>
                      <span style={{ fontSize: '11px', color: '#666', fontWeight: '500', marginBottom: '6px', display: 'block' }}>
                        Custom Path:
                      </span>
                      
                      {marker.children
                        .filter(child => child.type === 'path')
                        .map(child => {
                          const markerPath = paths.find(p => p.id === child.id);
                          if (!markerPath) return null;
                          
                          // Convert path to SVG path string for editing
                          const pathData = markerPath.subPaths.map(subPath => 
                            subPath.commands.map(cmd => {
                              switch (cmd.command) {
                                case 'M':
                                  return `M ${cmd.x} ${cmd.y}`;
                                case 'L':
                                  return `L ${cmd.x} ${cmd.y}`;
                                case 'C':
                                  return `C ${cmd.x1} ${cmd.y1} ${cmd.x2} ${cmd.y2} ${cmd.x} ${cmd.y}`;
                                case 'Z':
                                  return 'Z';
                                default:
                                  return '';
                              }
                            }).join(' ')
                          ).join(' ');

                          const handlePathDataChange = (newPathData: string) => {
                            try {
                              // Parse the new path data and update the path
                              const { marker: newMarkerData, path: newPathData_parsed } = createCustomMarkerWithPath(newPathData);
                              
                              // Update the existing path with new data
                              const updatedPaths = paths.map(p => 
                                p.id === child.id 
                                  ? { ...newPathData_parsed, id: child.id }
                                  : p
                              );
                              replacePaths(updatedPaths);
                            } catch (error) {
                              console.warn('Invalid path data:', error);
                            }
                          };

                          return (
                            <div key={child.id} style={{ marginBottom: '6px' }}>
                              <label style={{ fontSize: '10px', color: '#666', marginBottom: '4px', display: 'block' }}>
                                Path Data (SVG d attribute):
                              </label>
                              <textarea
                                value={pathData}
                                onChange={(e) => handlePathDataChange(e.target.value)}
                                placeholder="M 0 0 L 10 2.5 L 0 5 Z"
                                style={{
                                  width: '100%',
                                  padding: '4px',
                                  fontSize: '10px',
                                  border: '1px solid #ddd',
                                  borderRadius: '3px',
                                  minHeight: '60px',
                                  fontFamily: 'monospace',
                                  resize: 'vertical'
                                }}
                              />
                              <div style={{ fontSize: '9px', color: '#999', marginTop: '2px' }}>
                                Enter SVG path commands. Example: M 0 0 L 10 2.5 L 0 5 Z
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
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
        <div>• <strong>Custom Path:</strong> Create markers with editable SVG path data</div>
        <div>• Edit the path data directly to create custom arrow shapes and symbols</div>
      </div>
    </div>
  );
};