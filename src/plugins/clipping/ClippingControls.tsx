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
    images,
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
  const [scaleToFit, setScaleToFit] = useState(false);

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

    console.log('Creating clip from selection...');
    console.log('Selected sub-paths:', selectedSubPaths);

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

    console.log('Bounding box calculated:', { minX, minY, maxX, maxY });

    // For clip paths, we DON'T normalize coordinates - we want to preserve the original position
    // This ensures the clip path appears in the same location as the original paths
    const selectedSubPathsData = selectedData.map((data, index) => {
      console.log('Processing sub-path data:', data);
      return {
        type: 'path' as const,
        id: `clip-${data.subPath.id}`,
        subPaths: [{
          ...data.subPath,
          commands: data.subPath.commands // Keep original commands with original coordinates
        }],
        style: data.style
      };
    });

    console.log('Final clip path data:', selectedSubPathsData);

    // Calculate dimensions based on original coordinates
    const width = minX !== Infinity ? (maxX - minX) : 100;
    const height = minX !== Infinity ? (maxY - minY) : 100;
    
    const clipPathData = {
      ...createDefaultClipPath(),
      clipPathUnits: 'userSpaceOnUse' as const,
      children: selectedSubPathsData
    };

    console.log('Adding clip path:', clipPathData);
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

    // For masks with userSpaceOnUse, we keep the original coordinates for precision
    const selectedSubPathsData = selectedData.map((data, index) => {
      return {
        type: 'path' as const,
        id: `mask-${data.subPath.id}`,
        subPaths: [{
          ...data.subPath,
          commands: data.subPath.commands // Keep original commands with full precision
        }],
        // For masks, we need white fill for visibility (black = transparent, white = opaque)
        style: {
          ...data.style,
          fill: 'white', // Force white fill for masks
          stroke: 'none' // Remove stroke to avoid edge effects
        }
      };
    });

    // Calculate dimensions based on original coordinates  
    const maskWidth = minX !== Infinity ? (maxX - minX) : 100;
    const maskHeight = minX !== Infinity ? (maxY - minY) : 100;
    
    const maskData = {
      ...createDefaultMask(),
      maskUnits: 'userSpaceOnUse' as const,
      maskContentUnits: 'userSpaceOnUse' as const,
      // Store original coordinates for precision
      children: selectedSubPathsData
    };

    console.log('Creating mask with data:', maskData);
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
      // Get current group to preserve existing style
      const currentGroup = useEditorStore.getState().groups.find(group => group.id === groupId);
      updateGroup(groupId, {
        style: {
          ...currentGroup?.style,
          clipPath: formatSVGReference(clipId)
        }
      });
    });
  };

  const handleApplyMaskToGroup = (maskId: string) => {
    selection.selectedGroups.forEach(groupId => {
      // Get current group to preserve existing style
      const currentGroup = useEditorStore.getState().groups.find(group => group.id === groupId);
      updateGroup(groupId, {
        style: {
          ...currentGroup?.style,
          mask: formatSVGReference(maskId)
        }
      });
    });
  };

  // Apply clipping to image elements
  const handleApplyClipToImage = (clipId: string) => {
    console.log('Applying clip:', clipId, 'to images:', selection.selectedImages);
    
    selection.selectedImages.forEach(imageId => {
      // Get current image and clipPath
      const currentImage = useEditorStore.getState().images.find(img => img.id === imageId);
      const currentClipPath = clipPaths.find(cp => cp.id === clipId);
      
      if (!currentImage || !currentClipPath) return;
      
      console.log('Image before:', currentImage);
      console.log('Original clipPath:', currentClipPath);
      
      // Calculate translation needed to move clipPath to image position
      const imageX = currentImage.x;
      const imageY = currentImage.y;
      
      // Get clipPath bounding box
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      currentClipPath.children.forEach(child => {
        if (child.type === 'path' && (child as any).subPaths) {
          (child as any).subPaths.forEach((subPath: any) => {
            subPath.commands.forEach((cmd: any) => {
              if (cmd.x !== undefined) {
                minX = Math.min(minX, cmd.x);
                maxX = Math.max(maxX, cmd.x);
              }
              if (cmd.y !== undefined) {
                minY = Math.min(minY, cmd.y);
                maxY = Math.max(maxY, cmd.y);
              }
            });
          });
        }
      });
      
      const clipPathX = minX !== Infinity ? minX : 0;
      const clipPathY = minY !== Infinity ? minY : 0;
      
      // Calculate translation
      const translateX = imageX - clipPathX;
      const translateY = imageY - clipPathY;
      
      console.log('Coordinate adjustment:', {
        imagePos: { x: imageX, y: imageY },
        clipPathPos: { x: clipPathX, y: clipPathY },
        translation: { x: translateX, y: translateY },
        scaleToFit
      });
      
      let transform = `translate(${translateX}, ${translateY})`;
      
      // If scale to fit is enabled, calculate scaling
      if (scaleToFit) {
        const clipWidth = maxX - minX;
        const clipHeight = maxY - minY;
        const imageWidth = currentImage.width;
        const imageHeight = currentImage.height;
        
        if (clipWidth > 0 && clipHeight > 0) {
          const scaleX = imageWidth / clipWidth;
          const scaleY = imageHeight / clipHeight;
          
          // Use uniform scaling (smaller scale to fit entirely)
          const scale = Math.min(scaleX, scaleY);
          
          console.log('Scaling calculation:', {
            clipSize: { width: clipWidth, height: clipHeight },
            imageSize: { width: imageWidth, height: imageHeight },
            scaleX, scaleY, scale
          });
          
          // Center the scaled clipPath within the image
          const scaledWidth = clipWidth * scale;
          const scaledHeight = clipHeight * scale;
          const centerOffsetX = (imageWidth - scaledWidth) / 2;
          const centerOffsetY = (imageHeight - scaledHeight) / 2;
          
          // Simple approach: translate to image position, then center and scale
          transform = `translate(${imageX + centerOffsetX}, ${imageY + centerOffsetY}) scale(${scale}) translate(${-clipPathX}, ${-clipPathY})`;
          
          console.log('Final transform:', transform);
        }
      }
      
      // Update the existing clipPath with transform
      const updatedClipPath = {
        ...currentClipPath,
        transform
      };
      
      updateClipPath(clipId, updatedClipPath);
      console.log('Updated clipPath with transform:', updatedClipPath);
      
      const newStyle = {
        ...currentImage?.style,
        clipPath: formatSVGReference(clipId)
      };
      console.log('Applying style:', newStyle);
      
      updateImage(imageId, {
        style: newStyle
      });
      
      // Check the result
      setTimeout(() => {
        const updatedImage = useEditorStore.getState().images.find(img => img.id === imageId);
        console.log('Image after:', updatedImage);
      }, 100);
    });
  };

  const handleApplyMaskToImage = (maskId: string) => {
    console.log('Applying mask:', maskId, 'to images:', selection.selectedImages);
    
    selection.selectedImages.forEach(imageId => {
      // Get current image and mask
      const currentImage = useEditorStore.getState().images.find(img => img.id === imageId);
      const currentMask = masks.find(m => m.id === maskId);
      
      if (!currentImage || !currentMask) {
        console.log('Missing image or mask:', { currentImage, currentMask });
        return;
      }
      
      console.log('Found image:', currentImage);
      console.log('Found mask:', currentMask);
      
      // Calculate translation needed to move mask to image position
      const imageX = currentImage.x;
      const imageY = currentImage.y;
      
      // Get mask bounding box
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      currentMask.children.forEach(child => {
        if (child.type === 'path' && (child as any).subPaths) {
          (child as any).subPaths.forEach((subPath: any) => {
            subPath.commands.forEach((cmd: any) => {
              if (cmd.x !== undefined) {
                minX = Math.min(minX, cmd.x);
                maxX = Math.max(maxX, cmd.x);
              }
              if (cmd.y !== undefined) {
                minY = Math.min(minY, cmd.y);
                maxY = Math.max(maxY, cmd.y);
              }
            });
          });
        }
      });
      
      const maskX = minX !== Infinity ? minX : 0;
      const maskY = minY !== Infinity ? minY : 0;
      
      console.log('Mask bounding box:', { minX, minY, maxX, maxY, maskX, maskY });
      console.log('Image position:', { imageX, imageY });
      
      // Calculate translation
      const translateX = imageX - maskX;
      const translateY = imageY - maskY;
      
      console.log('Translation needed:', { translateX, translateY });

      // RADICAL SOLUTION for MASKS: Instead of moving the mask, recreate the mask path at the image position
      if (currentMask.type === 'mask') {
        // Clone the mask and recreate its paths at the image position
        const clonedMask = {
          ...currentMask,
          id: `${currentMask.id}-positioned`, // New ID to avoid conflicts
          transform: undefined, // No transform needed
          children: currentMask.children.map((child: any) => {
            if (child.type === 'path') {
              // Recreate the path at the image position
              const translatedSubPaths = (child as any).subPaths?.map((subPath: any) => ({
                ...subPath,
                commands: subPath.commands?.map((cmd: any) => {
                  const newCmd = { ...cmd };
                  if (cmd.x !== undefined) newCmd.x = cmd.x + translateX;
                  if (cmd.y !== undefined) newCmd.y = cmd.y + translateY;
                  if (cmd.x1 !== undefined) newCmd.x1 = cmd.x1 + translateX;
                  if (cmd.y1 !== undefined) newCmd.y1 = cmd.y1 + translateY;
                  if (cmd.x2 !== undefined) newCmd.x2 = cmd.x2 + translateX;
                  if (cmd.y2 !== undefined) newCmd.y2 = cmd.y2 + translateY;
                  return newCmd;
                })
              }));
              
              return {
                ...child,
                id: `${child.id}-translated`,
                subPaths: translatedSubPaths
              };
            }
            return child;
          })
        };
        
        // Add the new positioned mask
        addMask(clonedMask);
        
        // Update the image to reference the new mask
        const currentImage = images.find(img => img.id === imageId);
        if (currentImage) {
          updateImage(imageId, {
            ...currentImage,
            style: { ...currentImage.style, mask: `url(#${clonedMask.id})` }
          });
        }

        console.log('🎭 MASK: Recreated mask at image position instead of using transforms');
        console.log('🎭 Original mask position:', { maskX, maskY });
        console.log('🎭 New mask position:', { imageX, imageY });
        console.log('🎭 Translation applied to paths:', { translateX, translateY });
        console.log('🎭 New mask ID:', clonedMask.id);
        
        return; // Skip all the transform logic
      }

      let transform = `translate(${translateX}, ${translateY})`;

      // If scale to fit is enabled, calculate scaling  
      if (scaleToFit) {
        const maskWidth = maxX - minX;
        const maskHeight = maxY - minY;
        const imageWidth = currentImage.width;
        const imageHeight = currentImage.height;
        
        if (maskWidth > 0 && maskHeight > 0) {
          const scaleX = imageWidth / maskWidth;
          const scaleY = imageHeight / maskHeight;
          
          // Use uniform scaling (smaller scale to fit entirely)
          const scale = Math.min(scaleX, scaleY);
          
          // Center the scaled mask within the image
          const scaledWidth = maskWidth * scale;
          const scaledHeight = maskHeight * scale;
          const centerOffsetX = (imageWidth - scaledWidth) / 2;
          const centerOffsetY = (imageHeight - scaledHeight) / 2;
          
          // For clipPaths, we can use scaling
          transform = `translate(${imageX + centerOffsetX}, ${imageY + centerOffsetY}) scale(${scale}) translate(${-maskX}, ${-maskY})`;
        }
      }
      
      console.log('Applying transform:', transform);
      
      // Update the existing mask with transform
      const updatedMask = {
        ...currentMask,
        transform
      };
      
      console.log('Updated mask:', updatedMask);
      updateMask(maskId, updatedMask);
      
      const newStyle = {
        ...currentImage?.style,
        mask: formatSVGReference(maskId)
        // Don't override clipPath - preserve existing clipping
      };
      
      console.log('Applying style to image:', newStyle);
      
      updateImage(imageId, {
        style: newStyle
      });
      
      // Let's check the final state after a short delay
      setTimeout(() => {
        const finalMask = useEditorStore.getState().masks.find(m => m.id === maskId);
        const finalImage = useEditorStore.getState().images.find(img => img.id === imageId);
        console.log('Final mask state:', finalMask);
        console.log('Final image state:', finalImage);
        console.log('Final image style mask:', finalImage?.style?.mask);
        
        // Let's also verify the SVG is correct by checking what's being rendered
        console.log('🔍 SVG Debug - Mask transform:', finalMask?.transform);
        console.log('🔍 SVG Debug - Image mask reference:', finalImage?.style?.mask);
        console.log('🔍 SVG Debug - Expected mask ID:', `url(#${maskId})`);
      }, 100);
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
              
              {/* Scale to Fit Option */}
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
                    checked={scaleToFit}
                    onChange={(e) => setScaleToFit(e.target.checked)}
                    style={{ margin: 0 }}
                  />
                  <span style={{ fontWeight: '500' }}>Scale to fit destination</span>
                </label>
                <div style={{ color: '#666', fontSize: '10px', marginTop: '2px', marginLeft: '18px' }}>
                  {scaleToFit ? 'Clip will scale to fit the target size' : 'Clip will keep original size and position'}
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
              
              {/* Scale to Fit Option for Masks */}
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
                    checked={scaleToFit}
                    onChange={(e) => setScaleToFit(e.target.checked)}
                    style={{ margin: 0 }}
                  />
                  <span style={{ fontWeight: '500' }}>Scale to fit destination</span>
                </label>
                <div style={{ color: '#666', fontSize: '10px', marginTop: '2px', marginLeft: '18px' }}>
                  {scaleToFit ? 'Mask will scale to fit the target size' : 'Mask will keep original size and position'}
                </div>
              </div>
              
              {/* Mask Explanation */}
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