import React, { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { createDefaultMarker, createArrowMarker, formatSVGReference } from '../../utils/svg-elements-utils';
import { AccordionToggleButton } from '../../components/AccordionPanel';

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
  
  const [isExpanded, setIsExpanded] = useState(false);

  const selectedPath = selection.selectedPaths.length === 1 
    ? paths.find(path => path.id === selection.selectedPaths[0])
    : null;

  const handleCreateMarker = (type: 'default' | 'arrow') => {
    const markerData = type === 'arrow' ? createArrowMarker() : createDefaultMarker();
    addMarker(markerData);
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

  const handleRemoveMarker = (position: 'start' | 'mid' | 'end') => {
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

  const handleRemoveMarkerDefinition = (id: string) => {
    if (confirm('Are you sure you want to remove this marker?')) {
      removeMarker(id);
    }
  };

  const handleMarkerPropertyChange = (id: string, property: string, value: any) => {
    updateMarker(id, { [property]: value });
  };

  const selectedMarker = selection.selectedMarkers.length === 1 
    ? markers.find(marker => marker.id === selection.selectedMarkers[0])
    : null;

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <AccordionToggleButton
        isExpanded={isExpanded}
        onClick={() => setIsExpanded(!isExpanded)}
        title="Markers"
        badge={markers.length > 0 ? markers.length : undefined}
      />
      
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Create Markers */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Create Marker</h4>
            <div className="flex gap-2">
              <button
                onClick={() => handleCreateMarker('arrow')}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Arrow
              </button>
              <button
                onClick={() => handleCreateMarker('default')}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Custom
              </button>
            </div>
          </div>

          {/* Apply to Selected Path */}
          {selectedPath && (
            <div className="space-y-3 pt-3 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700">Apply to Selected Path</h4>
              
              {markers.length > 0 ? (
                <div className="space-y-3">
                  {/* Start Marker */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Start Marker</label>
                    <div className="flex gap-1">
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleApplyMarker(e.target.value, 'start');
                          }
                        }}
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                      >
                        <option value="">Select marker...</option>
                        {markers.map((marker) => (
                          <option key={marker.id} value={marker.id}>
                            Marker ({marker.children.length} elements)
                          </option>
                        ))}
                      </select>
                      {selectedPath.style.markerStart && (
                        <button
                          onClick={() => handleRemoveMarker('start')}
                          className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Mid Marker */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Mid Marker</label>
                    <div className="flex gap-1">
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleApplyMarker(e.target.value, 'mid');
                          }
                        }}
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                      >
                        <option value="">Select marker...</option>
                        {markers.map((marker) => (
                          <option key={marker.id} value={marker.id}>
                            Marker ({marker.children.length} elements)
                          </option>
                        ))}
                      </select>
                      {selectedPath.style.markerMid && (
                        <button
                          onClick={() => handleRemoveMarker('mid')}
                          className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* End Marker */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">End Marker</label>
                    <div className="flex gap-1">
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleApplyMarker(e.target.value, 'end');
                          }
                        }}
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                      >
                        <option value="">Select marker...</option>
                        {markers.map((marker) => (
                          <option key={marker.id} value={marker.id}>
                            Marker ({marker.children.length} elements)
                          </option>
                        ))}
                      </select>
                      {selectedPath.style.markerEnd && (
                        <button
                          onClick={() => handleRemoveMarker('end')}
                          className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-500">No markers available</div>
              )}
            </div>
          )}

          {/* Marker List */}
          {markers.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700">Markers ({markers.length})</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {markers.map((marker) => (
                  <div
                    key={marker.id}
                    className="flex items-center justify-between p-2 border border-gray-200 rounded"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-600">
                        {marker.children.length} elements
                      </div>
                      <div className="text-xs text-gray-500">
                        {marker.markerWidth} × {marker.markerHeight}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveMarkerDefinition(marker.id)}
                      className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Marker Properties */}
          {selectedMarker && (
            <div className="space-y-3 pt-3 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700">Marker Properties</h4>
              
              {/* Dimensions */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Width</label>
                  <input
                    type="number"
                    value={selectedMarker.markerWidth || 10}
                    onChange={(e) => handleMarkerPropertyChange(selectedMarker.id, 'markerWidth', parseFloat(e.target.value) || 10)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Height</label>
                  <input
                    type="number"
                    value={selectedMarker.markerHeight || 6}
                    onChange={(e) => handleMarkerPropertyChange(selectedMarker.id, 'markerHeight', parseFloat(e.target.value) || 6)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                </div>
              </div>

              {/* Reference Point */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Ref X</label>
                  <input
                    type="number"
                    value={selectedMarker.refX || 0}
                    onChange={(e) => handleMarkerPropertyChange(selectedMarker.id, 'refX', parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Ref Y</label>
                  <input
                    type="number"
                    value={selectedMarker.refY || 0}
                    onChange={(e) => handleMarkerPropertyChange(selectedMarker.id, 'refY', parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                </div>
              </div>

              {/* Orientation */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">Orientation</label>
                <select
                  value={selectedMarker.orient === 'auto' ? 'auto' : selectedMarker.orient?.toString() || 'auto'}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleMarkerPropertyChange(selectedMarker.id, 'orient', 
                      value === 'auto' ? 'auto' : parseFloat(value) || 0
                    );
                  }}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                >
                  <option value="auto">Auto</option>
                  <option value="0">0°</option>
                  <option value="45">45°</option>
                  <option value="90">90°</option>
                  <option value="135">135°</option>
                  <option value="180">180°</option>
                  <option value="225">225°</option>
                  <option value="270">270°</option>
                  <option value="315">315°</option>
                </select>
              </div>

              {/* Units */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">Units</label>
                <select
                  value={selectedMarker.markerUnits || 'strokeWidth'}
                  onChange={(e) => handleMarkerPropertyChange(selectedMarker.id, 'markerUnits', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                >
                  <option value="strokeWidth">Stroke Width</option>
                  <option value="userSpaceOnUse">User Space</option>
                </select>
              </div>
            </div>
          )}

          {/* Usage Instructions */}
          <div className="pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-500 space-y-1">
              <div>• Create markers to decorate path endpoints and vertices</div>
              <div>• Apply to start, middle, or end positions of paths</div>
              <div>• Markers automatically orient to path direction</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};