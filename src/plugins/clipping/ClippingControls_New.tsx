import React, { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { createDefaultClipPath, createDefaultMask, formatSVGReference } from '../../utils/svg-elements-utils';
import { AccordionToggleButton } from '../../components/AccordionPanel';

export const ClippingControls: React.FC = () => {
  const { 
    clipPaths,
    masks,
    selection, 
    paths,
    addClipPath, 
    updateClipPath, 
    removeClipPath,
    addMask,
    updateMask,
    removeMask,
    updatePathStyle,
    removePath
  } = useEditorStore();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'clips' | 'masks'>('clips');

  const selectedPaths = selection.selectedPaths;
  const hasPathSelection = selectedPaths.length > 0;

  const selectedPath = selection.selectedPaths.length === 1 
    ? paths.find(path => path.id === selection.selectedPaths[0])
    : null;

  const handleCreateClipPath = () => {
    addClipPath(createDefaultClipPath());
  };

  const handleCreateMask = () => {
    addMask(createDefaultMask());
  };

  const handleCreateClipFromSelection = () => {
    if (selectedPaths.length === 0) {
      alert('Please select one or more paths to create a clipping path');
      return;
    }

    // Get selected paths data
    const selectedPathsData = paths.filter(path => selectedPaths.includes(path.id));
    
    if (selectedPathsData.length === 0) return;

    const clipPathData = {
      ...createDefaultClipPath(),
      children: selectedPathsData.map(path => ({
        type: 'path' as const,
        id: `clip-${path.id}`,
        subPaths: path.subPaths,
        style: { ...path.style, fill: 'black' } // Clipping paths should be black
      }))
    };

    addClipPath(clipPathData);
    
    // Optionally remove original paths
    if (confirm('Remove original paths from document? (they will be preserved in the clipping path)')) {
      selectedPaths.forEach(pathId => {
        removePath(pathId);
      });
    }
  };

  const handleCreateMaskFromSelection = () => {
    if (selectedPaths.length === 0) {
      alert('Please select one or more paths to create a mask');
      return;
    }

    // Get selected paths data
    const selectedPathsData = paths.filter(path => selectedPaths.includes(path.id));
    
    if (selectedPathsData.length === 0) return;

    const maskData = {
      ...createDefaultMask(),
      children: selectedPathsData.map(path => ({
        type: 'path' as const,
        id: `mask-${path.id}`,
        subPaths: path.subPaths,
        style: { ...path.style, fill: 'white' } // Masks should be white for visible areas
      }))
    };

    addMask(maskData);
    
    // Optionally remove original paths
    if (confirm('Remove original paths from document? (they will be preserved in the mask)')) {
      selectedPaths.forEach(pathId => {
        removePath(pathId);
      });
    }
  };

  const handleApplyClipToPath = (clipId: string) => {
    if (selectedPath) {
      updatePathStyle(selectedPath.id, {
        clipPath: formatSVGReference(clipId)
      });
    }
  };

  const handleApplyMaskToPath = (maskId: string) => {
    if (selectedPath) {
      updatePathStyle(selectedPath.id, {
        mask: formatSVGReference(maskId)
      });
    }
  };

  const handleRemoveClipFromPath = () => {
    if (selectedPath) {
      updatePathStyle(selectedPath.id, {
        clipPath: undefined
      });
    }
  };

  const handleRemoveMaskFromPath = () => {
    if (selectedPath) {
      updatePathStyle(selectedPath.id, {
        mask: undefined
      });
    }
  };

  const handleRemoveClipPath = (id: string) => {
    if (confirm('Are you sure you want to remove this clip path?')) {
      removeClipPath(id);
    }
  };

  const handleRemoveMask = (id: string) => {
    if (confirm('Are you sure you want to remove this mask?')) {
      removeMask(id);
    }
  };

  const totalElements = clipPaths.length + masks.length;

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <AccordionToggleButton
        isExpanded={isExpanded}
        onClick={() => setIsExpanded(!isExpanded)}
        title="Clipping & Masks"
        badge={totalElements > 0 ? totalElements : undefined}
      />
      
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Tab Navigation */}
          <div className="flex border border-gray-200 rounded overflow-hidden">
            <button
              onClick={() => setActiveTab('clips')}
              className={`flex-1 px-3 py-2 text-sm ${
                activeTab === 'clips'
                  ? 'bg-blue-50 text-blue-700 border-r border-gray-200'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              Clips ({clipPaths.length})
            </button>
            <button
              onClick={() => setActiveTab('masks')}
              className={`flex-1 px-3 py-2 text-sm ${
                activeTab === 'masks'
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              Masks ({masks.length})
            </button>
          </div>

          {/* Clip Paths Tab */}
          {activeTab === 'clips' && (
            <div className="space-y-4">
              {/* Create Clip Path */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Create Clip Path</h4>
                <div className="space-y-2">
                  <button
                    onClick={handleCreateClipFromSelection}
                    disabled={!hasPathSelection}
                    className={`w-full px-3 py-2 text-sm border rounded-md ${
                      hasPathSelection 
                        ? 'border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100' 
                        : 'border-gray-300 text-gray-400 bg-gray-50 cursor-not-allowed'
                    }`}
                    title={hasPathSelection ? 'Create clipping path from selected paths' : 'Select paths first'}
                  >
                    {hasPathSelection 
                      ? `Create from Selection (${selectedPaths.length} path${selectedPaths.length > 1 ? 's' : ''})`
                      : 'Create from Selection (no paths selected)'
                    }
                  </button>
                  <button
                    onClick={handleCreateClipPath}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Create Empty Clip Path
                  </button>
                </div>
              </div>

              {/* Clip Path List */}
              {clipPaths.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Clip Paths ({clipPaths.length})</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {clipPaths.map((clipPath) => (
                      <div
                        key={clipPath.id}
                        className="border border-gray-200 rounded p-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-gray-600">
                              {clipPath.children.length} elements
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {selectedPath && (
                              <button
                                onClick={() => handleApplyClipToPath(clipPath.id)}
                                className="px-2 py-1 text-xs border border-blue-300 text-blue-600 rounded hover:bg-blue-50"
                                title="Apply to selected path"
                              >
                                Apply
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveClipPath(clipPath.id)}
                              className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Path Clip Control */}
              {selectedPath && (
                <div className="space-y-2 pt-2 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700">Selected Path</h4>
                  {selectedPath.style.clipPath ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600">
                        Clipped: {selectedPath.style.clipPath}
                      </span>
                      <button
                        onClick={handleRemoveClipFromPath}
                        className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">No clipping applied</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Masks Tab */}
          {activeTab === 'masks' && (
            <div className="space-y-4">
              {/* Create Mask */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Create Mask</h4>
                <div className="space-y-2">
                  <button
                    onClick={handleCreateMaskFromSelection}
                    disabled={!hasPathSelection}
                    className={`w-full px-3 py-2 text-sm border rounded-md ${
                      hasPathSelection 
                        ? 'border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100' 
                        : 'border-gray-300 text-gray-400 bg-gray-50 cursor-not-allowed'
                    }`}
                    title={hasPathSelection ? 'Create mask from selected paths' : 'Select paths first'}
                  >
                    {hasPathSelection 
                      ? `Create from Selection (${selectedPaths.length} path${selectedPaths.length > 1 ? 's' : ''})`
                      : 'Create from Selection (no paths selected)'
                    }
                  </button>
                  <button
                    onClick={handleCreateMask}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Create Empty Mask
                  </button>
                </div>
              </div>

              {/* Mask List */}
              {masks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Masks ({masks.length})</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {masks.map((mask) => (
                      <div
                        key={mask.id}
                        className="border border-gray-200 rounded p-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-gray-600">
                              {mask.children.length} elements
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {selectedPath && (
                              <button
                                onClick={() => handleApplyMaskToPath(mask.id)}
                                className="px-2 py-1 text-xs border border-blue-300 text-blue-600 rounded hover:bg-blue-50"
                                title="Apply to selected path"
                              >
                                Apply
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveMask(mask.id)}
                              className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Path Mask Control */}
              {selectedPath && (
                <div className="space-y-2 pt-2 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700">Selected Path</h4>
                  {selectedPath.style.mask ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600">
                        Masked: {selectedPath.style.mask}
                      </span>
                      <button
                        onClick={handleRemoveMaskFromPath}
                        className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">No mask applied</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
