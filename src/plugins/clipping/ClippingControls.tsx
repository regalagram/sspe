import React, { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { createDefaultClipPath, createDefaultMask, formatSVGReference } from '../../utils/svg-elements-utils';
import { PluginButton } from '../../components/PluginButton';
import { Plus, Trash2, Scissors, Eye } from 'lucide-react';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Tab Navigation */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
          Type:
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <PluginButton
            icon={<Scissors size={12} />}
            text="Clips"
            color="#28a745"
            active={activeTab === 'clips'}
            onPointerDown={() => setActiveTab('clips')}
          />
          <PluginButton
            icon={<Eye size={12} />}
            text="Masks"
            color="#28a745"
            active={activeTab === 'masks'}
            onPointerDown={() => setActiveTab('masks')}
          />
        </div>
      </div>

      {/* Clip Paths Tab */}
      {activeTab === 'clips' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Create Clip Path */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
              Create Clip Path:
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <PluginButton
                icon={<Plus size={12} />}
                text={hasPathSelection 
                  ? `From Selection (${selectedSubPaths.length})`
                  : 'From Selection (none)'
                }
                color={hasPathSelection ? '#17a2b8' : '#6c757d'}
                disabled={!hasPathSelection}
                onPointerDown={handleCreateClipFromSelection}
              />
              <PluginButton
                icon={<Plus size={12} />}
                text="Empty Clip Path"
                color="#17a2b8"
                onPointerDown={handleCreateClipPath}
              />
            </div>
          </div>

          {/* Clip Path List */}
          {clipPaths.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
                Clip Paths ({clipPaths.length}):
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflow: 'auto' }}>
                {clipPaths.map((clipPath) => (
                  <div
                    key={clipPath.id}
                    style={{
                      padding: '8px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '4px',
                      border: '1px solid #e9ecef'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#666' }}>
                        {clipPath.children.length} elements
                      </span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {selectedPath && (
                          <button
                            onClick={() => handleApplyClipToPath(clipPath.id)}
                            style={{
                              padding: '4px 8px',
                              fontSize: '10px',
                              border: '1px solid #007bff',
                              backgroundColor: '#fff',
                              color: '#007bff',
                              borderRadius: '3px',
                              cursor: 'pointer'
                            }}
                            title="Apply to selected path"
                          >
                            Apply to Path
                          </button>
                        )}
                        {selectedSubPaths.length > 0 && (
                          <button
                            onClick={() => handleApplyClipToSubPaths(clipPath.id)}
                            style={{
                              padding: '4px 8px',
                              fontSize: '10px',
                              border: '1px solid #007bff',
                              backgroundColor: '#fff',
                              color: '#007bff',
                              borderRadius: '3px',
                              cursor: 'pointer'
                            }}
                            title="Apply to parent paths of selected sub-paths"
                          >
                            Apply to Sub-paths
                          </button>
                        )}
                        {selection.selectedTexts.length > 0 && (
                          <button
                            onClick={() => handleApplyClipToText(clipPath.id)}
                            style={{
                              padding: '4px 8px',
                              fontSize: '10px',
                              border: '1px solid #007bff',
                              backgroundColor: '#fff',
                              color: '#007bff',
                              borderRadius: '3px',
                              cursor: 'pointer'
                            }}
                            title="Apply to selected text"
                          >
                            Apply to Text
                          </button>
                        )}
                        {selection.selectedGroups.length > 0 && (
                          <button
                            onClick={() => handleApplyClipToGroup(clipPath.id)}
                            style={{
                              padding: '4px 8px',
                              fontSize: '10px',
                              border: '1px solid #007bff',
                              backgroundColor: '#fff',
                              color: '#007bff',
                              borderRadius: '3px',
                              cursor: 'pointer'
                            }}
                            title="Apply to selected group"
                          >
                            Apply to Group
                          </button>
                        )}
                        {selection.selectedImages.length > 0 && (
                          <button
                            onClick={() => handleApplyClipToImage(clipPath.id)}
                            style={{
                              padding: '4px 8px',
                              fontSize: '10px',
                              border: '1px solid #007bff',
                              backgroundColor: '#fff',
                              color: '#007bff',
                              borderRadius: '3px',
                              cursor: 'pointer'
                            }}
                            title="Apply to selected image"
                          >
                            Apply to Image
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveClipPath(clipPath.id)}
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
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '6px', 
              paddingTop: '8px', 
              borderTop: '1px solid #e9ecef' 
            }}>
              <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
                Selected Path:
              </span>
              {selectedPath.style.clipPath ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#666' }}>
                    Clipped: {selectedPath.style.clipPath}
                  </span>
                  <button
                    onClick={handleRemoveClipFromPath}
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
              ) : (
                <div style={{ fontSize: '11px', color: '#999' }}>No clipping applied</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Masks Tab */}
      {activeTab === 'masks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Create Mask */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
              Create Mask:
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <PluginButton
                icon={<Plus size={12} />}
                text={hasPathSelection 
                  ? `From Selection (${selectedSubPaths.length})`
                  : 'From Selection (none)'
                }
                color={hasPathSelection ? '#17a2b8' : '#6c757d'}
                disabled={!hasPathSelection}
                onPointerDown={handleCreateMaskFromSelection}
              />
              <PluginButton
                icon={<Plus size={12} />}
                text="Empty Mask"
                color="#17a2b8"
                onPointerDown={handleCreateMask}
              />
            </div>
          </div>

          {/* Mask List */}
          {masks.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
                Masks ({masks.length}):
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflow: 'auto' }}>
                {masks.map((mask) => (
                  <div
                    key={mask.id}
                    style={{
                      padding: '8px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '4px',
                      border: '1px solid #e9ecef'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#666' }}>
                        {mask.children.length} elements
                      </span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {selectedPath && (
                          <button
                            onClick={() => handleApplyMaskToPath(mask.id)}
                            style={{
                              padding: '4px 8px',
                              fontSize: '10px',
                              border: '1px solid #007bff',
                              backgroundColor: '#fff',
                              color: '#007bff',
                              borderRadius: '3px',
                              cursor: 'pointer'
                            }}
                            title="Apply to selected path"
                          >
                            Apply to Path
                          </button>
                        )}
                        {selectedSubPaths.length > 0 && (
                          <button
                            onClick={() => handleApplyMaskToSubPaths(mask.id)}
                            style={{
                              padding: '4px 8px',
                              fontSize: '10px',
                              border: '1px solid #007bff',
                              backgroundColor: '#fff',
                              color: '#007bff',
                              borderRadius: '3px',
                              cursor: 'pointer'
                            }}
                            title="Apply to parent paths of selected sub-paths"
                          >
                            Apply to Sub-paths
                          </button>
                        )}
                        {selection.selectedTexts.length > 0 && (
                          <button
                            onClick={() => handleApplyMaskToText(mask.id)}
                            style={{
                              padding: '4px 8px',
                              fontSize: '10px',
                              border: '1px solid #007bff',
                              backgroundColor: '#fff',
                              color: '#007bff',
                              borderRadius: '3px',
                              cursor: 'pointer'
                            }}
                            title="Apply to selected text"
                          >
                            Apply to Text
                          </button>
                        )}
                        {selection.selectedGroups.length > 0 && (
                          <button
                            onClick={() => handleApplyMaskToGroup(mask.id)}
                            style={{
                              padding: '4px 8px',
                              fontSize: '10px',
                              border: '1px solid #007bff',
                              backgroundColor: '#fff',
                              color: '#007bff',
                              borderRadius: '3px',
                              cursor: 'pointer'
                            }}
                            title="Apply to selected group"
                          >
                            Apply to Group
                          </button>
                        )}
                        {selection.selectedImages.length > 0 && (
                          <button
                            onClick={() => handleApplyMaskToImage(mask.id)}
                            style={{
                              padding: '4px 8px',
                              fontSize: '10px',
                              border: '1px solid #007bff',
                              backgroundColor: '#fff',
                              color: '#007bff',
                              borderRadius: '3px',
                              cursor: 'pointer'
                            }}
                            title="Apply to selected image"
                          >
                            Apply to Image
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveMask(mask.id)}
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
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '6px', 
              paddingTop: '8px', 
              borderTop: '1px solid #e9ecef' 
            }}>
              <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
                Selected Path:
              </span>
              {selectedPath.style.mask ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#666' }}>
                    Masked: {selectedPath.style.mask}
                  </span>
                  <button
                    onClick={handleRemoveMaskFromPath}
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
              ) : (
                <div style={{ fontSize: '11px', color: '#999' }}>No mask applied</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Apply/Remove Section for Selected Elements */}
      {(selection.selectedTexts.length > 0 || selection.selectedGroups.length > 0 || selection.selectedImages.length > 0 || selectedPath) && (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px', 
          paddingTop: '8px', 
          borderTop: '1px solid #e9ecef' 
        }}>
          <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
            Selected Elements:
          </span>
          
          {/* Remove Clipping Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '11px', color: '#666' }}>Remove Clipping:</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
              {selectedPath && selectedPath.style.clipPath && (
                <button
                  onClick={handleRemoveClipFromPath}
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
                  Remove from Path
                </button>
              )}
              {selection.selectedTexts.length > 0 && (
                <button
                  onClick={handleRemoveClipFromText}
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
                  Remove from Text
                </button>
              )}
              {selection.selectedGroups.length > 0 && (
                <button
                  onClick={handleRemoveClipFromGroup}
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
                  Remove from Group
                </button>
              )}
              {selection.selectedImages.length > 0 && (
                <button
                  onClick={handleRemoveClipFromImage}
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
                  Remove from Image
                </button>
              )}
            </div>
          </div>

          {/* Remove Mask Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '11px', color: '#666' }}>Remove Mask:</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
              {selectedPath && selectedPath.style.mask && (
                <button
                  onClick={handleRemoveMaskFromPath}
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
                  Remove from Path
                </button>
              )}
              {selection.selectedTexts.length > 0 && (
                <button
                  onClick={handleRemoveMaskFromText}
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
                  Remove from Text
                </button>
              )}
              {selection.selectedGroups.length > 0 && (
                <button
                  onClick={handleRemoveMaskFromGroup}
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
                  Remove from Group
                </button>
              )}
              {selection.selectedImages.length > 0 && (
                <button
                  onClick={handleRemoveMaskFromImage}
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
                  Remove from Image
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};