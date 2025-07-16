import React, { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { createDefaultClipPath, createDefaultMask, formatSVGReference } from '../../utils/svg-elements-utils';

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
    updateTextStyle,
    updateGroup,
    updateImage,
    removePath,
    removeSubPath
  } = useEditorStore();
  
  const [activeTab, setActiveTab] = useState<'clips' | 'masks'>('clips');

  const selectedSubPaths = selection.selectedSubPaths;
  const hasPathSelection = selectedSubPaths.length > 0;

  const selectedPath = selection.selectedPaths.length === 1 
    ? paths.find(path => path.id === selection.selectedPaths[0])
    : null;

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

  const handleCreateClipPath = () => {
    addClipPath(createDefaultClipPath());
  };

  const handleCreateMask = () => {
    addMask(createDefaultMask());
  };

  const handleCreateClipFromSelection = () => {
    if (selectedSubPaths.length === 0) {
      alert('Please select one or more sub-paths to create a clipping path');
      return;
    }

    // Get selected sub-paths data from all paths
    const selectedSubPathsData: any[] = [];
    paths.forEach(path => {
      path.subPaths.forEach(subPath => {
        if (selectedSubPaths.includes(subPath.id)) {
          selectedSubPathsData.push({
            type: 'path' as const,
            id: `clip-${subPath.id}`,
            subPaths: [subPath], // Each selected sub-path becomes a separate path in the clip
            style: { ...path.style, fill: 'black' } // Clipping paths should be black
          });
        }
      });
    });

    if (selectedSubPathsData.length === 0) return;

    const clipPathData = {
      ...createDefaultClipPath(),
      children: selectedSubPathsData
    };

    addClipPath(clipPathData);
    
    // Optionally remove original sub-paths
    if (confirm('Remove original sub-paths from document? (they will be preserved in the clipping path)')) {
      selectedSubPaths.forEach(subPathId => {
        removeSubPath(subPathId);
      });
    }
  };

  const handleCreateMaskFromSelection = () => {
    if (selectedSubPaths.length === 0) {
      alert('Please select one or more sub-paths to create a mask');
      return;
    }

    // Get selected sub-paths data from all paths
    const selectedSubPathsData: any[] = [];
    paths.forEach(path => {
      path.subPaths.forEach(subPath => {
        if (selectedSubPaths.includes(subPath.id)) {
          selectedSubPathsData.push({
            type: 'path' as const,
            id: `mask-${subPath.id}`,
            subPaths: [subPath], // Each selected sub-path becomes a separate path in the mask
            style: { ...path.style, fill: 'white' } // Masks should be white for visible areas
          });
        }
      });
    });

    if (selectedSubPathsData.length === 0) return;

    const maskData = {
      ...createDefaultMask(),
      children: selectedSubPathsData
    };

    addMask(maskData);
    
    // Optionally remove original sub-paths
    if (confirm('Remove original sub-paths from document? (they will be preserved in the mask)')) {
      selectedSubPaths.forEach(subPathId => {
        removeSubPath(subPathId);
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

  const handleApplyClipToSubPaths = (clipId: string) => {
    const parentPaths = getParentPathsOfSelectedSubPaths();
    parentPaths.forEach(pathId => {
      updatePathStyle(pathId, {
        clipPath: formatSVGReference(clipId)
      });
    });
  };

  const handleApplyMaskToPath = (maskId: string) => {
    if (selectedPath) {
      updatePathStyle(selectedPath.id, {
        mask: formatSVGReference(maskId)
      });
    }
  };

  const handleApplyMaskToSubPaths = (maskId: string) => {
    const parentPaths = getParentPathsOfSelectedSubPaths();
    parentPaths.forEach(pathId => {
      updatePathStyle(pathId, {
        mask: formatSVGReference(maskId)
      });
    });
  };

  // Apply clipping to text elements
  const handleApplyClipToText = (clipId: string) => {
    selection.selectedTexts.forEach(textId => {
      updateTextStyle(textId, {
        clipPath: formatSVGReference(clipId)
      });
    });
  };

  const handleApplyMaskToText = (maskId: string) => {
    selection.selectedTexts.forEach(textId => {
      updateTextStyle(textId, {
        mask: formatSVGReference(maskId)
      });
    });
  };

  // Apply clipping to group elements
  const handleApplyClipToGroup = (clipId: string) => {
    selection.selectedGroups.forEach(groupId => {
      updateGroup(groupId, {
        style: {
          clipPath: formatSVGReference(clipId)
        }
      });
    });
  };

  const handleApplyMaskToGroup = (maskId: string) => {
    selection.selectedGroups.forEach(groupId => {
      updateGroup(groupId, {
        style: {
          mask: formatSVGReference(maskId)
        }
      });
    });
  };

  // Apply clipping to image elements
  const handleApplyClipToImage = (clipId: string) => {
    selection.selectedImages.forEach(imageId => {
      updateImage(imageId, {
        style: {
          clipPath: formatSVGReference(clipId)
        }
      });
    });
  };

  const handleApplyMaskToImage = (maskId: string) => {
    selection.selectedImages.forEach(imageId => {
      updateImage(imageId, {
        style: {
          mask: formatSVGReference(maskId)
        }
      });
    });
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

  // Remove clipping from text elements
  const handleRemoveClipFromText = () => {
    selection.selectedTexts.forEach(textId => {
      updateTextStyle(textId, {
        clipPath: undefined
      });
    });
  };

  const handleRemoveMaskFromText = () => {
    selection.selectedTexts.forEach(textId => {
      updateTextStyle(textId, {
        mask: undefined
      });
    });
  };

  // Remove clipping from group elements
  const handleRemoveClipFromGroup = () => {
    selection.selectedGroups.forEach(groupId => {
      updateGroup(groupId, {
        style: {
          clipPath: undefined
        }
      });
    });
  };

  const handleRemoveMaskFromGroup = () => {
    selection.selectedGroups.forEach(groupId => {
      updateGroup(groupId, {
        style: {
          mask: undefined
        }
      });
    });
  };

  // Remove clipping from image elements
  const handleRemoveClipFromImage = () => {
    selection.selectedImages.forEach(imageId => {
      updateImage(imageId, {
        style: {
          clipPath: undefined
        }
      });
    });
  };

  const handleRemoveMaskFromImage = () => {
    selection.selectedImages.forEach(imageId => {
      updateImage(imageId, {
        style: {
          mask: undefined
        }
      });
    });
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
    <div className="border-b border-gray-200 last:border-b-0" data-plugin="clipping">
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
                    data-action="create-clip-from-selection"
                    className={`w-full px-3 py-2 text-sm border rounded-md ${
                      hasPathSelection 
                        ? 'border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100' 
                        : 'border-gray-300 text-gray-400 bg-gray-50 cursor-not-allowed'
                    }`}
                    title={hasPathSelection ? 'Create clipping path from selected sub-paths' : 'Select sub-paths first'}
                  >
                    {hasPathSelection 
                      ? `Create from Selection (${selectedSubPaths.length} sub-path${selectedSubPaths.length > 1 ? 's' : ''})`
                      : 'Create from Selection (no sub-paths selected)'
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
                                Apply to Path
                              </button>
                            )}
                            {selectedSubPaths.length > 0 && (
                              <button
                                onClick={() => handleApplyClipToSubPaths(clipPath.id)}
                                className="px-2 py-1 text-xs border border-blue-300 text-blue-600 rounded hover:bg-blue-50"
                                title="Apply to parent paths of selected sub-paths"
                              >
                                Apply to Sub-paths
                              </button>
                            )}
                            {selection.selectedTexts.length > 0 && (
                              <button
                                onClick={() => handleApplyClipToText(clipPath.id)}
                                className="px-2 py-1 text-xs border border-blue-300 text-blue-600 rounded hover:bg-blue-50"
                                title="Apply to selected text"
                              >
                                Apply to Text
                              </button>
                            )}
                            {selection.selectedGroups.length > 0 && (
                              <button
                                onClick={() => handleApplyClipToGroup(clipPath.id)}
                                className="px-2 py-1 text-xs border border-blue-300 text-blue-600 rounded hover:bg-blue-50"
                                title="Apply to selected group"
                              >
                                Apply to Group
                              </button>
                            )}
                            {selection.selectedImages.length > 0 && (
                              <button
                                onClick={() => handleApplyClipToImage(clipPath.id)}
                                className="px-2 py-1 text-xs border border-blue-300 text-blue-600 rounded hover:bg-blue-50"
                                title="Apply to selected image"
                              >
                                Apply to Image
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
                    data-action="create-mask-from-selection"
                    className={`w-full px-3 py-2 text-sm border rounded-md ${
                      hasPathSelection 
                        ? 'border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100' 
                        : 'border-gray-300 text-gray-400 bg-gray-50 cursor-not-allowed'
                    }`}
                    title={hasPathSelection ? 'Create mask from selected sub-paths' : 'Select sub-paths first'}
                  >
                    {hasPathSelection 
                      ? `Create from Selection (${selectedSubPaths.length} sub-path${selectedSubPaths.length > 1 ? 's' : ''})`
                      : 'Create from Selection (no sub-paths selected)'
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
                                Apply to Path
                              </button>
                            )}
                            {selectedSubPaths.length > 0 && (
                              <button
                                onClick={() => handleApplyMaskToSubPaths(mask.id)}
                                className="px-2 py-1 text-xs border border-blue-300 text-blue-600 rounded hover:bg-blue-50"
                                title="Apply to parent paths of selected sub-paths"
                              >
                                Apply to Sub-paths
                              </button>
                            )}
                            {selection.selectedTexts.length > 0 && (
                              <button
                                onClick={() => handleApplyMaskToText(mask.id)}
                                className="px-2 py-1 text-xs border border-blue-300 text-blue-600 rounded hover:bg-blue-50"
                                title="Apply to selected text"
                              >
                                Apply to Text
                              </button>
                            )}
                            {selection.selectedGroups.length > 0 && (
                              <button
                                onClick={() => handleApplyMaskToGroup(mask.id)}
                                className="px-2 py-1 text-xs border border-blue-300 text-blue-600 rounded hover:bg-blue-50"
                                title="Apply to selected group"
                              >
                                Apply to Group
                              </button>
                            )}
                            {selection.selectedImages.length > 0 && (
                              <button
                                onClick={() => handleApplyMaskToImage(mask.id)}
                                className="px-2 py-1 text-xs border border-blue-300 text-blue-600 rounded hover:bg-blue-50"
                                title="Apply to selected image"
                              >
                                Apply to Image
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

          {/* Apply/Remove Section for Selected Elements */}
          {(selection.selectedTexts.length > 0 || selection.selectedGroups.length > 0 || selection.selectedImages.length > 0 || selectedPath) && (
            <div className="space-y-2 pt-2 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700">Selected Elements</h4>
              
              {/* Remove Clipping Buttons */}
              <div className="space-y-1">
                <div className="text-xs text-gray-600">Remove Clipping:</div>
                <div className="grid grid-cols-2 gap-2">
                  {selectedPath && selectedPath.style.clipPath && (
                    <button
                      onClick={handleRemoveClipFromPath}
                      className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                    >
                      Remove from Path
                    </button>
                  )}
                  {selection.selectedTexts.length > 0 && (
                    <button
                      onClick={handleRemoveClipFromText}
                      className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                    >
                      Remove from Text
                    </button>
                  )}
                  {selection.selectedGroups.length > 0 && (
                    <button
                      onClick={handleRemoveClipFromGroup}
                      className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                    >
                      Remove from Group
                    </button>
                  )}
                  {selection.selectedImages.length > 0 && (
                    <button
                      onClick={handleRemoveClipFromImage}
                      className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                    >
                      Remove from Image
                    </button>
                  )}
                </div>
              </div>

              {/* Remove Mask Buttons */}
              <div className="space-y-1">
                <div className="text-xs text-gray-600">Remove Mask:</div>
                <div className="grid grid-cols-2 gap-2">
                  {selectedPath && selectedPath.style.mask && (
                    <button
                      onClick={handleRemoveMaskFromPath}
                      className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                    >
                      Remove from Path
                    </button>
                  )}
                  {selection.selectedTexts.length > 0 && (
                    <button
                      onClick={handleRemoveMaskFromText}
                      className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                    >
                      Remove from Text
                    </button>
                  )}
                  {selection.selectedGroups.length > 0 && (
                    <button
                      onClick={handleRemoveMaskFromGroup}
                      className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                    >
                      Remove from Group
                    </button>
                  )}
                  {selection.selectedImages.length > 0 && (
                    <button
                      onClick={handleRemoveMaskFromImage}
                      className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                    >
                      Remove from Image
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
    </div>
  );
};
