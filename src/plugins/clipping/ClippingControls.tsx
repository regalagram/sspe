import React, { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { formatSVGReference } from '../../utils/svg-elements-utils';
import { getClipPathBoundingBox, calculateClipPathAlignment, getImageBoundingBox, getPathBoundingBox, getTextBoundingBox, getGroupBoundingBox } from '../../utils/bbox-utils';
import { PluginButton } from '../../components/PluginButton';
import { ElementPreview } from '../../components/ElementPreview';
import { Plus, Scissors, Eye } from 'lucide-react';
export const ClippingControls: React.FC = () => {
  const { 
    clipPaths,
    masks,
    selection, 
    paths,
    texts,
    images,
    groups,
    addClipPath, 
    updateClipPath, 
    removeClipPath,
    addMask,
    removeMask,
    updatePathStyle,
    updateTextStyle,
    updateGroup,
    updateImage,
    removeSubPath
  } = useEditorStore();
  const [activeTab, setActiveTab] = useState<'clips' | 'masks'>('clips');
  const [alignmentMode, setAlignmentMode] = useState<'center' | 'top-left' | 'fit'>('center');
  const selectedSubPaths = selection.selectedSubPaths;
  const hasPathSelection = selectedSubPaths.length > 0;
  const selectedPath = selection.selectedPaths.length === 1 
    ? paths.find(path => path.id === selection.selectedPaths[0])
    : null;
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
  const createDefaultClipPath = () => ({
    type: 'clipPath' as const,
    clipPathUnits: 'userSpaceOnUse' as const,
    children: [],
    locked: false,
  });
  const createDefaultMask = () => ({
    type: 'mask' as const,
    maskUnits: 'userSpaceOnUse' as const,
    maskContentUnits: 'userSpaceOnUse' as const,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    children: [],
    locked: false,
  });
  const handleCreateClipFromSelection = () => {
    if (selectedSubPaths.length === 0) {
      alert('Please select one or more sub-paths to create a clipping path');
      return;
    }
    const selectedData: Array<{subPath: any, style: any}> = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    paths.forEach(path => {
      path.subPaths.forEach(subPath => {
        if (selectedSubPaths.includes(subPath.id)) {
          selectedData.push({
            subPath: subPath,
            style: { ...path.style, fill: 'black' } 
          });
          subPath.commands.forEach((cmd: any) => {
            if (cmd.x !== undefined) {
              minX = Math.min(minX, cmd.x);
              maxX = Math.max(maxX, cmd.x);
            }
            if (cmd.y !== undefined) {
              minY = Math.min(minY, cmd.y);
              maxY = Math.max(maxY, cmd.y);
            }
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
    const selectedSubPathsData = selectedData.map((data, index) => {
            return {
        type: 'path' as const,
        id: `clip-${data.subPath.id}`,
        subPaths: [{
          ...data.subPath,
          commands: data.subPath.commands 
        }],
        style: data.style
      };
    });
    const width = minX !== Infinity ? (maxX - minX) : 100;
    const height = minX !== Infinity ? (maxY - minY) : 100;
    const clipPathData = {
      ...createDefaultClipPath(),
      clipPathUnits: 'userSpaceOnUse' as const,
      children: selectedSubPathsData
    };
        addClipPath(clipPathData);
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
    const selectedData: Array<{subPath: any, style: any}> = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    paths.forEach(path => {
      path.subPaths.forEach(subPath => {
        if (selectedSubPaths.includes(subPath.id)) {
          selectedData.push({
            subPath: subPath,
            style: { ...path.style, fill: 'white' } 
          });
          subPath.commands.forEach((cmd: any) => {
            if (cmd.x !== undefined) {
              minX = Math.min(minX, cmd.x);
              maxX = Math.max(maxX, cmd.x);
            }
            if (cmd.y !== undefined) {
              minY = Math.min(minY, cmd.y);
              maxY = Math.max(maxY, cmd.y);
            }
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
    const selectedSubPathsData = selectedData.map((data, index) => {
      return {
        type: 'path' as const,
        id: `mask-${data.subPath.id}`,
        subPaths: [{
          ...data.subPath,
          commands: data.subPath.commands 
        }],
        style: {
          ...data.style,
          fill: 'white', 
          stroke: 'none' 
        }
      };
    });
    const maskWidth = minX !== Infinity ? (maxX - minX) : 100;
    const maskHeight = minX !== Infinity ? (maxY - minY) : 100;
    const maskData = {
      ...createDefaultMask(),
      maskUnits: 'userSpaceOnUse' as const,
      maskContentUnits: 'userSpaceOnUse' as const,
      children: selectedSubPathsData
    };
        addMask(maskData);
    if (confirm('Remove original sub-paths from document? (they will be preserved in the mask)')) {
      selectedSubPaths.forEach(subPathId => {
        removeSubPath(subPathId);
      });
    }
  };
  const handleApplyClipToPath = (clipId: string) => {
    if (selectedPath) {
      const currentClipPath = clipPaths.find(cp => cp.id === clipId);
      
      if (!currentClipPath) {
        updatePathStyle(selectedPath.id, {
          clipPath: formatSVGReference(clipId)
        });
        return;
      }

      // Get bounding boxes
      const pathBbox = getPathBoundingBox(selectedPath);
      const clipPathBbox = getClipPathBoundingBox(currentClipPath);
      
      if (!pathBbox || !clipPathBbox) {
        // If no bbox calculation possible, just apply clipPath without repositioning
        updatePathStyle(selectedPath.id, {
          clipPath: formatSVGReference(clipId)
        });
        return;
      }

      // Calculate positioning adjustment
      const adjustment = calculateClipPathAlignment(pathBbox, clipPathBbox, alignmentMode);
      
      // Apply transform to move path to align with clipPath
      if (adjustment.x !== 0 || adjustment.y !== 0) {
        // Transform all subpaths
        const transformedSubPaths = selectedPath.subPaths.map(subPath => ({
          ...subPath,
          commands: subPath.commands.map(cmd => ({
            ...cmd,
            x: cmd.x !== undefined ? cmd.x + adjustment.x : cmd.x,
            y: cmd.y !== undefined ? cmd.y + adjustment.y : cmd.y,
            x1: cmd.x1 !== undefined ? cmd.x1 + adjustment.x : cmd.x1,
            y1: cmd.y1 !== undefined ? cmd.y1 + adjustment.y : cmd.y1,
            x2: cmd.x2 !== undefined ? cmd.x2 + adjustment.x : cmd.x2,
            y2: cmd.y2 !== undefined ? cmd.y2 + adjustment.y : cmd.y2,
          }))
        }));

        // Update path with new positions and clipPath
        const { paths: currentPaths, replacePaths } = useEditorStore.getState();
        const updatedPaths = currentPaths.map(path => 
          path.id === selectedPath.id 
            ? {
                ...path,
                subPaths: transformedSubPaths,
                style: {
                  ...path.style,
                  clipPath: formatSVGReference(clipId)
                }
              }
            : path
        );
        replacePaths(updatedPaths);
      } else {
        // Just apply clipPath
        updatePathStyle(selectedPath.id, {
          clipPath: formatSVGReference(clipId)
        });
      }
    }
  };
  const handleApplyClipToSubPaths = (clipId: string) => {
    const parentPaths = getParentPathsOfSelectedSubPaths();
    const currentClipPath = clipPaths.find(cp => cp.id === clipId);
    
    if (!currentClipPath) {
      parentPaths.forEach(pathId => {
        updatePathStyle(pathId, {
          clipPath: formatSVGReference(clipId)
        });
      });
      return;
    }

    const clipPathBbox = getClipPathBoundingBox(currentClipPath);
    if (!clipPathBbox) {
      // If no clipPath bbox, just apply clipPath without repositioning
      parentPaths.forEach(pathId => {
        updatePathStyle(pathId, {
          clipPath: formatSVGReference(clipId)
        });
      });
      return;
    }

    // Update each parent path
    const { paths: currentPaths, replacePaths } = useEditorStore.getState();
    const updatedPaths = currentPaths.map(path => {
      if (!parentPaths.includes(path.id)) return path;

      const pathBbox = getPathBoundingBox(path);
      if (!pathBbox) {
        return {
          ...path,
          style: {
            ...path.style,
            clipPath: formatSVGReference(clipId)
          }
        };
      }

      // Calculate positioning adjustment
      const adjustment = calculateClipPathAlignment(pathBbox, clipPathBbox, alignmentMode);
      
      if (adjustment.x === 0 && adjustment.y === 0) {
        return {
          ...path,
          style: {
            ...path.style,
            clipPath: formatSVGReference(clipId)
          }
        };
      }

      // Transform path
      const transformedSubPaths = path.subPaths.map(subPath => ({
        ...subPath,
        commands: subPath.commands.map(cmd => ({
          ...cmd,
          x: cmd.x !== undefined ? cmd.x + adjustment.x : cmd.x,
          y: cmd.y !== undefined ? cmd.y + adjustment.y : cmd.y,
          x1: cmd.x1 !== undefined ? cmd.x1 + adjustment.x : cmd.x1,
          y1: cmd.y1 !== undefined ? cmd.y1 + adjustment.y : cmd.y1,
          x2: cmd.x2 !== undefined ? cmd.x2 + adjustment.x : cmd.x2,
          y2: cmd.y2 !== undefined ? cmd.y2 + adjustment.y : cmd.y2,
        }))
      }));

      return {
        ...path,
        subPaths: transformedSubPaths,
        style: {
          ...path.style,
          clipPath: formatSVGReference(clipId)
        }
      };
    });

    replacePaths(updatedPaths);
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
  const handleApplyClipToText = (clipId: string) => {
    const currentClipPath = clipPaths.find(cp => cp.id === clipId);
    
    if (!currentClipPath) {
      selection.selectedTexts.forEach(textId => {
        updateTextStyle(textId, {
          clipPath: formatSVGReference(clipId)
        });
      });
      return;
    }

    const clipPathBbox = getClipPathBoundingBox(currentClipPath);
    if (!clipPathBbox) {
      // If no clipPath bbox, just apply clipPath without repositioning
      selection.selectedTexts.forEach(textId => {
        updateTextStyle(textId, {
          clipPath: formatSVGReference(clipId)
        });
      });
      return;
    }

    // Update each selected text
    const { texts: currentTexts, replaceTexts } = useEditorStore.getState();
    const updatedTexts = currentTexts.map(text => {
      if (!selection.selectedTexts.includes(text.id)) return text;

      const textBbox = getTextBoundingBox(text);
      const adjustment = calculateClipPathAlignment(textBbox, clipPathBbox, alignmentMode);
      
      return {
        ...text,
        x: text.x + adjustment.x,
        y: text.y + adjustment.y,
        style: {
          ...text.style,
          clipPath: formatSVGReference(clipId)
        }
      };
    });

    replaceTexts(updatedTexts);
  };
  const handleApplyMaskToText = (maskId: string) => {
    selection.selectedTexts.forEach(textId => {
      updateTextStyle(textId, {
        mask: formatSVGReference(maskId)
      });
    });
  };
  const handleApplyClipToGroup = (clipId: string) => {
    const currentClipPath = clipPaths.find(cp => cp.id === clipId);
    
    if (!currentClipPath) {
      selection.selectedGroups.forEach(groupId => {
        const currentGroup = useEditorStore.getState().groups.find(group => group.id === groupId);
        updateGroup(groupId, {
          style: {
            ...currentGroup?.style,
            clipPath: formatSVGReference(clipId)
          }
        });
      });
      return;
    }

    const clipPathBbox = getClipPathBoundingBox(currentClipPath);
    if (!clipPathBbox) {
      // If no clipPath bbox, just apply clipPath without repositioning
      selection.selectedGroups.forEach(groupId => {
        const currentGroup = useEditorStore.getState().groups.find(group => group.id === groupId);
        updateGroup(groupId, {
          style: {
            ...currentGroup?.style,
            clipPath: formatSVGReference(clipId)
          }
        });
      });
      return;
    }

    // Update each selected group
    selection.selectedGroups.forEach(groupId => {
      const currentGroup = useEditorStore.getState().groups.find(group => group.id === groupId);
      if (!currentGroup) return;

      const groupBbox = getGroupBoundingBox(currentGroup, paths, texts, images, groups);
      const adjustment = calculateClipPathAlignment(groupBbox, clipPathBbox, alignmentMode);
      
      // Apply transform to move the group
      const existingTransform = currentGroup.transform || '';
      const newTransform = `translate(${adjustment.x}, ${adjustment.y}) ${existingTransform}`.trim();
      
      updateGroup(groupId, {
        transform: newTransform,
        style: {
          ...currentGroup.style,
          clipPath: formatSVGReference(clipId)
        }
      });
    });
  };
  const handleApplyMaskToGroup = (maskId: string) => {
    selection.selectedGroups.forEach(groupId => {
      const currentGroup = useEditorStore.getState().groups.find(group => group.id === groupId);
      updateGroup(groupId, {
        style: {
          ...currentGroup?.style,
          mask: formatSVGReference(maskId)
        }
      });
    });
  };
  const handleApplyClipToImage = (clipId: string) => {
    selection.selectedImages.forEach(imageId => {
      const currentImage = useEditorStore.getState().images.find(img => img.id === imageId);
      const currentClipPath = clipPaths.find(cp => cp.id === clipId);
      
      if (!currentImage || !currentClipPath) return;

      // Get bounding boxes
      const imageBbox = getImageBoundingBox(currentImage);
      const clipPathBbox = getClipPathBoundingBox(currentClipPath);
      
      if (!clipPathBbox) {
        // If no clipPath bbox, just apply clipPath without repositioning
        updateImage(imageId, {
          style: {
            ...currentImage.style,
            clipPath: formatSVGReference(clipId)
          }
        });
        return;
      }

      // Calculate positioning adjustment
      const adjustment = calculateClipPathAlignment(imageBbox, clipPathBbox, alignmentMode);
      
      // Apply clipPath and reposition image
      const newX = currentImage.x + adjustment.x;
      const newY = currentImage.y + adjustment.y;
      const newWidth = adjustment.scaleX ? currentImage.width * adjustment.scaleX : currentImage.width;
      const newHeight = adjustment.scaleY ? currentImage.height * adjustment.scaleY : currentImage.height;

      updateImage(imageId, {
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
        style: {
          ...currentImage.style,
          clipPath: formatSVGReference(clipId)
        }
      });
    });
  };
  const handleApplyMaskToImage = (maskId: string) => {
        selection.selectedImages.forEach(imageId => {
      const currentImage = useEditorStore.getState().images.find(img => img.id === imageId);
      if (!currentImage) {
                return;
      }
      const newStyle = {
        ...currentImage?.style,
        mask: formatSVGReference(maskId)
      };
            updateImage(imageId, {
        style: newStyle
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
      {activeTab === 'clips' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
              Create Clip Path:
            </span>
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
            {!hasPathSelection && (
              <div style={{ 
                fontSize: '10px', 
                color: '#999', 
                fontStyle: 'italic',
                padding: '4px',
                backgroundColor: '#f8f9fa',
                borderRadius: '3px',
                border: '1px solid #e9ecef'
              }}>
                Select one or more sub-paths to create a clipping path
              </div>
            )}
          </div>
          {clipPaths.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ 
                padding: '6px', 
                backgroundColor: '#f0f8ff', 
                borderRadius: '3px',
                fontSize: '11px',
                border: '1px solid #e0e0e0'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={alignmentMode === 'fit'}
                    onChange={(e) => setAlignmentMode(e.target.checked ? 'fit' : 'center')}
                    style={{ margin: 0 }}
                  />
                  <span style={{ fontWeight: '500' }}>Scale to fit destination</span>
                </label>
                <div style={{ color: '#666', fontSize: '10px', marginTop: '2px', marginLeft: '18px' }}>
                  {alignmentMode === 'fit' ? 'Clip will scale to fit the target size' : 'Clip will keep original size and position'}
                </div>
              </div>
              
              <div style={{ 
                padding: '6px', 
                backgroundColor: '#f0f8ff', 
                borderRadius: '3px',
                fontSize: '11px',
                border: '1px solid #e0e0e0'
              }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontWeight: '500' }}>Auto-Alignment Mode:</span>
                  <select
                    value={alignmentMode}
                    onChange={(e) => setAlignmentMode(e.target.value as 'center' | 'top-left' | 'fit')}
                    style={{
                      padding: '4px 6px',
                      border: '1px solid #ccc',
                      borderRadius: '3px',
                      fontSize: '11px',
                      backgroundColor: 'white'
                    }}
                  >
                    <option value="center">Center in clipPath</option>
                    <option value="top-left">Align to top-left</option>
                    <option value="fit">Scale to fit</option>
                  </select>
                </label>
                <div style={{ color: '#666', fontSize: '10px', marginTop: '2px' }}>
                  {alignmentMode === 'center' && 'Element centered within clipPath area'}
                  {alignmentMode === 'top-left' && 'Element aligned with clipPath top-left'}
                  {alignmentMode === 'fit' && 'Element scaled and centered to fit'}
                </div>
              </div>
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
      {activeTab === 'masks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
              Create Mask:
            </span>
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
            {!hasPathSelection && (
              <div style={{ 
                fontSize: '10px', 
                color: '#999', 
                fontStyle: 'italic',
                padding: '4px',
                backgroundColor: '#f8f9fa',
                borderRadius: '3px',
                border: '1px solid #e9ecef'
              }}>
                Select one or more sub-paths to create a mask
              </div>
            )}
          </div>
          {masks.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ 
                padding: '6px', 
                backgroundColor: '#f0f8ff', 
                borderRadius: '3px',
                fontSize: '11px',
                border: '1px solid #e0e0e0'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={alignmentMode === 'fit'}
                    onChange={(e) => setAlignmentMode(e.target.checked ? 'fit' : 'center')}
                    style={{ margin: 0 }}
                  />
                  <span style={{ fontWeight: '500' }}>Scale to fit destination</span>
                </label>
                <div style={{ color: '#666', fontSize: '10px', marginTop: '2px', marginLeft: '18px' }}>
                  {alignmentMode === 'fit' ? 'Mask will scale to fit the target size' : 'Mask will keep original size and position'}
                </div>
              </div>
              
              <div style={{ 
                padding: '6px', 
                backgroundColor: '#f0f8ff', 
                borderRadius: '3px',
                fontSize: '11px',
                border: '1px solid #e0e0e0'
              }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontWeight: '500' }}>Auto-Alignment Mode:</span>
                  <select
                    value={alignmentMode}
                    onChange={(e) => setAlignmentMode(e.target.value as 'center' | 'top-left' | 'fit')}
                    style={{
                      padding: '4px 6px',
                      border: '1px solid #ccc',
                      borderRadius: '3px',
                      fontSize: '11px',
                      backgroundColor: 'white'
                    }}
                  >
                    <option value="center">Center in mask</option>
                    <option value="top-left">Align to top-left</option>
                    <option value="fit">Scale to fit</option>
                  </select>
                </label>
                <div style={{ color: '#666', fontSize: '10px', marginTop: '2px' }}>
                  {alignmentMode === 'center' && 'Element centered within mask area'}
                  {alignmentMode === 'top-left' && 'Element aligned with mask top-left'}
                  {alignmentMode === 'fit' && 'Element scaled and centered to fit'}
                </div>
              </div>
              <div style={{ 
                padding: '6px', 
                backgroundColor: '#fff3cd', 
                borderRadius: '3px',
                fontSize: '10px',
                border: '1px solid #ffeaa7'
              }}>
                <div style={{ fontWeight: '500', marginBottom: '2px', color: '#856404' }}>💡 How masks work:</div>
                <div style={{ color: '#856404' }}>
                  • White areas = image visible<br/>
                  • Black areas = image hidden<br/>
                  • Gray areas = partially transparent<br/>
                  • Paths are automatically converted to white
                </div>
              </div>
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