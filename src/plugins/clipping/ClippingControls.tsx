import React, { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { createDefaultClipPath, createDefaultMask, formatSVGReference } from '../../utils/svg-elements-utils';
import { PluginButton } from '../../components/PluginButton';
import { ElementPreview } from '../../components/ElementPreview';
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

    // Collect selected sub-paths data and calculate bounding box in one pass
    const selectedData: Array<{subPath: any, style: any}> = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    paths.forEach(path => {
      path.subPaths.forEach(subPath => {
        if (selectedSubPaths.includes(subPath.id)) {
          // Store the original data
          selectedData.push({
            subPath: subPath,
            style: { ...path.style, fill: 'black' } // Clipping paths should be black
          });

          // Calculate bounding box from commands
          subPath.commands.forEach((cmd: any) => {
            if (cmd.x !== undefined) {
              minX = Math.min(minX, cmd.x);
              maxX = Math.max(maxX, cmd.x);
            }
            if (cmd.y !== undefined) {
              minY = Math.min(minY, cmd.y);
              maxY = Math.max(maxY, cmd.y);
            }
            // Handle control points for curves
            if (cmd.x1 !== undefined) {
              minX = Math.min(minX, cmd.x1);
              maxX = Math.max(maxX, cmd.x1);
            }
            if (cmd.y1 !== undefined) {
              minY = Math.min(minY, cmd.y1);
              maxY = Math.max(maxY, cmd.y1);
            }
            if (cmd.x2 !== undefined) {
              minX = Math.min(minX, cmd.x2);
              maxX = Math.max(maxX, cmd.x2);
            }
            if (cmd.y2 !== undefined) {
              minY = Math.min(minY, cmd.y2);
              maxY = Math.max(maxY, cmd.y2);
            }
          });
        }
      });
    });

    if (selectedData.length === 0) return;

    // If no valid coordinates found, use defaults
    let offsetX = 0, offsetY = 0;
    
    if (minX !== Infinity) {
      // Store original min values for normalization
      const originalMinX = minX;
      const originalMinY = minY;
      
      // The offset is the original minimum to start at 0,0
      offsetX = originalMinX;
      offsetY = originalMinY;
    }

    // Now normalize the coordinates and create the clip path data
    const selectedSubPathsData = selectedData.map((data, index) => {
      const normalizedCommands = data.subPath.commands.map((cmd: any) => {
        const newCmd = { ...cmd };
        
        // Normalize main coordinates (subtract the offset to start from 0,0)
        if (newCmd.x !== undefined) newCmd.x = newCmd.x - offsetX;
        if (newCmd.y !== undefined) newCmd.y = newCmd.y - offsetY;
        
        // Normalize control points
        if (newCmd.x1 !== undefined) newCmd.x1 = newCmd.x1 - offsetX;
        if (newCmd.y1 !== undefined) newCmd.y1 = newCmd.y1 - offsetY;
        if (newCmd.x2 !== undefined) newCmd.x2 = newCmd.x2 - offsetX;
        if (newCmd.y2 !== undefined) newCmd.y2 = newCmd.y2 - offsetY;
        
        return newCmd;
      });

      return {
        type: 'path' as const,
        id: `clip-${data.subPath.id}`,
        subPaths: [{
          ...data.subPath,
          commands: normalizedCommands
        }],
        style: data.style
      };
    });

    // Calculate dimensions based on normalized content
    const width = minX !== Infinity ? (maxX - minX) : 100;
    const height = minX !== Infinity ? (maxY - minY) : 100;
    
    const clipPathData = {
      ...createDefaultClipPath(),
      clipPathUnits: 'userSpaceOnUse' as const,
      x: 0,
      y: 0,
      width: width,
      height: height,
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

    // Collect selected sub-paths data and calculate bounding box in one pass
    const selectedData: Array<{subPath: any, style: any}> = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    paths.forEach(path => {
      path.subPaths.forEach(subPath => {
        if (selectedSubPaths.includes(subPath.id)) {
          // Store the original data
          selectedData.push({
            subPath: subPath,
            style: { ...path.style, fill: 'white' } // Masks should be white for visible areas
          });

          // Calculate bounding box from commands
          subPath.commands.forEach((cmd: any) => {
            if (cmd.x !== undefined) {
              minX = Math.min(minX, cmd.x);
              maxX = Math.max(maxX, cmd.x);
            }
            if (cmd.y !== undefined) {
              minY = Math.min(minY, cmd.y);
              maxY = Math.max(maxY, cmd.y);
            }
            // Handle control points for curves
            if (cmd.x1 !== undefined) {
              minX = Math.min(minX, cmd.x1);
              maxX = Math.max(maxX, cmd.x1);
            }
            if (cmd.y1 !== undefined) {
              minY = Math.min(minY, cmd.y1);
              maxY = Math.max(maxY, cmd.y1);
            }
            if (cmd.x2 !== undefined) {
              minX = Math.min(minX, cmd.x2);
              maxX = Math.max(maxX, cmd.x2);
            }
            if (cmd.y2 !== undefined) {
              minY = Math.min(minY, cmd.y2);
              maxY = Math.max(maxY, cmd.y2);
            }
          });
        }
      });
    });

    if (selectedData.length === 0) return;

    // If no valid coordinates found, use defaults
    let offsetX = 0, offsetY = 0;
    
    if (minX !== Infinity) {
      // Store original min values for normalization
      const originalMinX = minX;
      const originalMinY = minY;
      
      // The offset is the original minimum to start at 0,0
      offsetX = originalMinX;
      offsetY = originalMinY;
    }

    // Now normalize the coordinates and create the mask data
    const selectedSubPathsData = selectedData.map((data, index) => {
      const normalizedCommands = data.subPath.commands.map((cmd: any) => {
        const newCmd = { ...cmd };
        
        // Normalize main coordinates (subtract the offset to start from 0,0)
        if (newCmd.x !== undefined) newCmd.x = newCmd.x - offsetX;
        if (newCmd.y !== undefined) newCmd.y = newCmd.y - offsetY;
        
        // Normalize control points
        if (newCmd.x1 !== undefined) newCmd.x1 = newCmd.x1 - offsetX;
        if (newCmd.y1 !== undefined) newCmd.y1 = newCmd.y1 - offsetY;
        if (newCmd.x2 !== undefined) newCmd.x2 = newCmd.x2 - offsetX;
        if (newCmd.y2 !== undefined) newCmd.y2 = newCmd.y2 - offsetY;
        
        return newCmd;
      });

      return {
        type: 'path' as const,
        id: `mask-${data.subPath.id}`,
        subPaths: [{
          ...data.subPath,
          commands: normalizedCommands
        }],
        style: data.style
      };
    });

    // Calculate dimensions based on normalized content
    const width = minX !== Infinity ? (maxX - minX) : 100;
    const height = minX !== Infinity ? (maxY - minY) : 100;
    
    const maskData = {
      ...createDefaultMask(),
      maskUnits: 'userSpaceOnUse' as const, // Change to userSpaceOnUse for explicit dimensions
      maskContentUnits: 'userSpaceOnUse' as const,
      x: 0,
      y: 0,
      width: width,
      height: height,
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
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                      <ElementPreview 
                        elementId={clipPath.id} 
                        elementType="clipPath" 
                        size={48}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <div style={{ fontSize: '11px', color: '#666', fontWeight: '500' }}>
                            Clip Path #{clipPath.id.slice(-6)}
                          </div>
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
                        <div style={{ fontSize: '10px', color: '#999', marginBottom: '2px' }}>
                          {clipPath.children.length} element{clipPath.children.length !== 1 ? 's' : ''}
                        </div>
                        {clipPath.children.some((child: any) => child.type === 'path') && (
                          <div style={{ fontSize: '9px', color: '#999', fontFamily: 'monospace', marginTop: '4px' }}>
                            <div style={{ fontWeight: '500', marginBottom: '2px' }}>Path Commands:</div>
                            {clipPath.children
                              .filter((child: any) => child.type === 'path')
                              .map((pathChild: any, index: number) => {
                                const pathData = pathChild.subPaths?.map((subPath: any) => 
                                  subPath.commands?.map((cmd: any) => {
                                    switch (cmd.command) {
                                      case 'M':
                                        return `M ${(cmd.x || 0).toFixed(1)} ${(cmd.y || 0).toFixed(1)}`;
                                      case 'L':
                                        return `L ${(cmd.x || 0).toFixed(1)} ${(cmd.y || 0).toFixed(1)}`;
                                      case 'C':
                                        return `C ${(cmd.x1 || 0).toFixed(1)} ${(cmd.y1 || 0).toFixed(1)} ${(cmd.x2 || 0).toFixed(1)} ${(cmd.y2 || 0).toFixed(1)} ${(cmd.x || 0).toFixed(1)} ${(cmd.y || 0).toFixed(1)}`;
                                      case 'Z':
                                        return 'Z';
                                      default:
                                        return '';
                                    }
                                  }).join(' ')
                                ).join(' ') || 'M 0 0';
                                
                                return (
                                  <div key={index} style={{ 
                                    marginBottom: '2px', 
                                    wordBreak: 'break-all',
                                    maxWidth: '100%',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {pathData.length > 60 ? `${pathData.substring(0, 60)}...` : pathData}
                                  </div>
                                );
                              })
                            }
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
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
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                      <ElementPreview 
                        elementId={mask.id} 
                        elementType="mask" 
                        size={48}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <div style={{ fontSize: '11px', color: '#666', fontWeight: '500' }}>
                            Mask #{mask.id.slice(-6)}
                          </div>
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
                        <div style={{ fontSize: '10px', color: '#999', marginBottom: '2px' }}>
                          {mask.children.length} element{mask.children.length !== 1 ? 's' : ''}
                        </div>
                        {mask.children.some((child: any) => child.type === 'path') && (
                          <div style={{ fontSize: '9px', color: '#999', fontFamily: 'monospace', marginTop: '4px' }}>
                            <div style={{ fontWeight: '500', marginBottom: '2px' }}>Path Commands:</div>
                            {mask.children
                              .filter((child: any) => child.type === 'path')
                              .map((pathChild: any, index: number) => {
                                const pathData = pathChild.subPaths?.map((subPath: any) => 
                                  subPath.commands?.map((cmd: any) => {
                                    switch (cmd.command) {
                                      case 'M':
                                        return `M ${(cmd.x || 0).toFixed(1)} ${(cmd.y || 0).toFixed(1)}`;
                                      case 'L':
                                        return `L ${(cmd.x || 0).toFixed(1)} ${(cmd.y || 0).toFixed(1)}`;
                                      case 'C':
                                        return `C ${(cmd.x1 || 0).toFixed(1)} ${(cmd.y1 || 0).toFixed(1)} ${(cmd.x2 || 0).toFixed(1)} ${(cmd.y2 || 0).toFixed(1)} ${(cmd.x || 0).toFixed(1)} ${(cmd.y || 0).toFixed(1)}`;
                                      case 'Z':
                                        return 'Z';
                                      default:
                                        return '';
                                    }
                                  }).join(' ')
                                ).join(' ') || 'M 0 0';
                                
                                return (
                                  <div key={index} style={{ 
                                    marginBottom: '2px', 
                                    wordBreak: 'break-all',
                                    maxWidth: '100%',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {pathData.length > 60 ? `${pathData.substring(0, 60)}...` : pathData}
                                  </div>
                                );
                              })
                            }
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
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