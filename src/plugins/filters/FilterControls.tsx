import React, { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { 
  createDefaultFilter, 
  createFilterPrimitive, 
  createDropShadowFilter, 
  createBlurFilter, 
  createGrayscaleFilter,
  createSepiaFilter,
  createInvertFilter,
  createBrightnessFilter,
  createContrastFilter,
  createSaturateFilter,
  createHueRotateFilter,
  createEmbossFilter,
  createSharpenFilter,
  createEdgeDetectFilter,
  createGlowFilter,
  createBevelFilter,
  createMotionBlurFilter,
  createNoiseFilter,
  createWaveDistortionFilter,
  createPosterizeFilter,
  createOilPaintingFilter,
  createWatercolorFilter,
  createVintageFilter,
  createChromaticAberrationFilter,
  createNeonGlowFilter,
  createMosaicFilter,
  createGlitchFilter,
  createPixelateFilter,
  // New artistic filters
  createDancingStrokeFilter,
  createSmokeFilter,
  createWavesFilter,
  createPaperTextureFilter,
  createZebraFilter,
  createNetFilter,
  createDustFilter,
  createColoredStripesFilter,
  createColoredSpotsFilter,
  createColoredFlameFilter,
  createAdvancedWatercolorFilter,
  formatSVGReference 
} from '../../utils/svg-elements-utils';
import { FilterPrimitiveType } from '../../types';
import { PluginButton } from '../../components/PluginButton';
import { Plus, Trash2, Eye, Zap, Droplets, Palette, Edit, Copy, Contrast, Sun, RotateCcw, Sparkles, Layers, Move, Volume2, Waves, Grid, Brush, Camera, Clock, Shuffle, Monitor, Activity, Wind, FileText, Network, Sparkle, Cloud, Flame } from 'lucide-react';

export const FilterControls: React.FC = () => {
  const store = useEditorStore();
  const { 
    filters, 
    selection, 
    paths,
    texts,
    groups,
    images,
    addFilter, 
    updateFilter, 
    removeFilter, 
    duplicateFilter,
    updatePathStyle,
    updateTextStyle,
    updateGroup,
    updateImage
  } = store;
  
  const [editingFilter, setEditingFilter] = useState<string | null>(null);

  const selectedFilter = selection.selectedFilters.length === 1 
    ? filters.find(filter => filter.id === selection.selectedFilters[0])
    : null;

  const selectedSubPaths = selection.selectedSubPaths;
  const hasPathSelection = selectedSubPaths.length > 0;

  const selectedPath = selection.selectedPaths.length === 1 
    ? paths.find(path => path.id === selection.selectedPaths[0])
    : null;

  // Check if any elements are selected for quick apply
  const hasAnyElementsSelected = hasPathSelection || 
                                selectedPath !== null || 
                                selection.selectedTexts.length > 0 || 
                                selection.selectedGroups.length > 0 || 
                                selection.selectedImages.length > 0;

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

  const handleCreateFilter = (type: 'custom' | 'drop-shadow' | 'blur' | 'grayscale' | 'sepia' | 'invert' | 'brightness' | 'contrast' | 'saturate' | 'hue-rotate' | 'emboss' | 'sharpen' | 'edge-detect' | 'glow' | 'bevel' | 'motion-blur' | 'noise' | 'wave-distortion' | 'posterize' | 'oil-painting' | 'watercolor' | 'vintage' | 'chromatic-aberration' | 'neon-glow' | 'mosaic' | 'glitch' | 'pixelate' | 'dancing-stroke' | 'smoke' | 'waves' | 'paper-texture' | 'zebra' | 'net' | 'dust' | 'colored-stripes' | 'colored-spots' | 'colored-flame' | 'advanced-watercolor') => {
    let filterData;
    switch (type) {
      case 'drop-shadow':
        filterData = createDropShadowFilter();
        break;
      case 'blur':
        filterData = createBlurFilter();
        break;
      case 'grayscale':
        filterData = createGrayscaleFilter();
        break;
      case 'sepia':
        filterData = createSepiaFilter();
        break;
      case 'invert':
        filterData = createInvertFilter();
        break;
      case 'brightness':
        filterData = createBrightnessFilter();
        break;
      case 'contrast':
        filterData = createContrastFilter();
        break;
      case 'saturate':
        filterData = createSaturateFilter();
        break;
      case 'hue-rotate':
        filterData = createHueRotateFilter();
        break;
      case 'emboss':
        filterData = createEmbossFilter();
        break;
      case 'sharpen':
        filterData = createSharpenFilter();
        break;
      case 'edge-detect':
        filterData = createEdgeDetectFilter();
        break;
      case 'glow':
        filterData = createGlowFilter();
        break;
      case 'bevel':
        filterData = createBevelFilter();
        break;
      case 'motion-blur':
        filterData = createMotionBlurFilter();
        break;
      case 'noise':
        filterData = createNoiseFilter();
        break;
      case 'wave-distortion':
        filterData = createWaveDistortionFilter();
        break;
      case 'posterize':
        filterData = createPosterizeFilter();
        break;
      case 'oil-painting':
        filterData = createOilPaintingFilter();
        break;
      case 'watercolor':
        filterData = createWatercolorFilter();
        break;
      case 'vintage':
        filterData = createVintageFilter();
        break;
      case 'chromatic-aberration':
        filterData = createChromaticAberrationFilter();
        break;
      case 'neon-glow':
        filterData = createNeonGlowFilter();
        break;
      case 'mosaic':
        filterData = createMosaicFilter();
        break;
      case 'glitch':
        filterData = createGlitchFilter();
        break;
      case 'pixelate':
        filterData = createPixelateFilter();
        break;
      case 'dancing-stroke':
        filterData = createDancingStrokeFilter();
        break;
      case 'smoke':
        filterData = createSmokeFilter();
        break;
      case 'waves':
        filterData = createWavesFilter();
        break;
      case 'paper-texture':
        filterData = createPaperTextureFilter();
        break;
      case 'zebra':
        filterData = createZebraFilter();
        break;
      case 'net':
        filterData = createNetFilter();
        break;
      case 'dust':
        filterData = createDustFilter();
        break;
      case 'colored-stripes':
        filterData = createColoredStripesFilter();
        break;
      case 'colored-spots':
        filterData = createColoredSpotsFilter();
        break;
      case 'colored-flame':
        filterData = createColoredFlameFilter();
        break;
      case 'advanced-watercolor':
        filterData = createAdvancedWatercolorFilter();
        break;
      default:
        filterData = createDefaultFilter();
    }
    addFilter(filterData);
  };

  const handleQuickApplyFilter = (type: 'drop-shadow' | 'blur' | 'grayscale' | 'sepia' | 'invert' | 'brightness' | 'contrast' | 'saturate' | 'hue-rotate' | 'emboss' | 'sharpen' | 'edge-detect' | 'glow' | 'bevel' | 'motion-blur' | 'noise' | 'wave-distortion' | 'posterize' | 'oil-painting' | 'watercolor' | 'vintage' | 'chromatic-aberration' | 'neon-glow' | 'mosaic' | 'glitch' | 'pixelate' | 'dancing-stroke' | 'smoke' | 'waves' | 'paper-texture' | 'zebra' | 'net' | 'dust' | 'colored-stripes' | 'colored-spots' | 'colored-flame' | 'advanced-watercolor') => {
    // Check if any elements are selected
    const hasSubPaths = selectedSubPaths.length > 0;
    const hasTexts = selection.selectedTexts.length > 0;
    const hasGroups = selection.selectedGroups.length > 0;
    const hasImages = selection.selectedImages.length > 0;
    const hasSelectedPath = selectedPath !== null;

    if (!hasSubPaths && !hasTexts && !hasGroups && !hasImages && !hasSelectedPath) {
      alert('Please select one or more elements (sub-paths, texts, groups, images, or paths) first');
      return;
    }

    // Create or find existing filter of this type
    let existingFilter = filters.find(f => {
      if (type === 'drop-shadow') {
        return f.primitives.some(p => p.type === 'feDropShadow');
      } else if (type === 'blur') {
        return f.primitives.some(p => p.type === 'feGaussianBlur');
      } else if (type === 'grayscale') {
        return f.primitives.some(p => p.type === 'feColorMatrix' && p.values === '0.3 0.6 0.1 0 0 0.3 0.6 0.1 0 0 0.3 0.6 0.1 0 0 0 0 0 1 0');
      } else if (type === 'sepia') {
        return f.primitives.some(p => p.type === 'feColorMatrix' && p.values === '0.393 0.769 0.189 0 0 0.349 0.686 0.168 0 0 0.272 0.534 0.131 0 0 0 0 0 1 0');
      } else if (type === 'invert') {
        return f.primitives.some(p => p.type === 'feColorMatrix' && p.values === '-1 0 0 0 1 0 -1 0 0 1 0 0 -1 0 1 0 0 0 1 0');
      } else if (type === 'emboss') {
        return f.primitives.some(p => p.type === 'feConvolveMatrix' && p.kernelMatrix === '-2 -1 0 -1 1 1 0 1 2');
      } else if (type === 'sharpen') {
        return f.primitives.some(p => p.type === 'feConvolveMatrix' && p.kernelMatrix === '0 -1 0 -1 5 -1 0 -1 0');
      } else if (type === 'edge-detect') {
        return f.primitives.some(p => p.type === 'feConvolveMatrix' && p.kernelMatrix === '-1 -1 -1 -1 8 -1 -1 -1 -1');
      }
      return false;
    });

    if (!existingFilter) {
      const filterData = type === 'drop-shadow' ? createDropShadowFilter() :
                         type === 'blur' ? createBlurFilter() : 
                         type === 'grayscale' ? createGrayscaleFilter() :
                         type === 'sepia' ? createSepiaFilter() :
                         type === 'invert' ? createInvertFilter() :
                         type === 'brightness' ? createBrightnessFilter() :
                         type === 'contrast' ? createContrastFilter() :
                         type === 'saturate' ? createSaturateFilter() :
                         type === 'hue-rotate' ? createHueRotateFilter() :
                         type === 'emboss' ? createEmbossFilter() :
                         type === 'sharpen' ? createSharpenFilter() :
                         type === 'edge-detect' ? createEdgeDetectFilter() :
                         type === 'glow' ? createGlowFilter() :
                         type === 'bevel' ? createBevelFilter() :
                         type === 'motion-blur' ? createMotionBlurFilter() :
                         type === 'noise' ? createNoiseFilter() :
                         type === 'wave-distortion' ? createWaveDistortionFilter() :
                         type === 'posterize' ? createPosterizeFilter() :
                         type === 'oil-painting' ? createOilPaintingFilter() :
                         type === 'watercolor' ? createWatercolorFilter() :
                         type === 'vintage' ? createVintageFilter() :
                         type === 'chromatic-aberration' ? createChromaticAberrationFilter() :
                         type === 'neon-glow' ? createNeonGlowFilter() :
                         type === 'mosaic' ? createMosaicFilter() :
                         type === 'glitch' ? createGlitchFilter() :
                         type === 'pixelate' ? createPixelateFilter() :
                         type === 'dancing-stroke' ? createDancingStrokeFilter() :
                         type === 'smoke' ? createSmokeFilter() :
                         type === 'waves' ? createWavesFilter() :
                         type === 'paper-texture' ? createPaperTextureFilter() :
                         type === 'zebra' ? createZebraFilter() :
                         type === 'net' ? createNetFilter() :
                         type === 'dust' ? createDustFilter() :
                         type === 'colored-stripes' ? createColoredStripesFilter() :
                         type === 'colored-spots' ? createColoredSpotsFilter() :
                         type === 'colored-flame' ? createColoredFlameFilter() :
                         createAdvancedWatercolorFilter();
      
      // Create the filter and apply immediately
      addFilter(filterData);
      
      // Apply using a timeout to ensure the store is updated
      setTimeout(() => {
        // Access filters from the store directly to get the most current state
        const storeState = useEditorStore.getState();
        const currentFilters = storeState.filters;
        const newFilter = currentFilters[currentFilters.length - 1]; // Get the last added filter
        
        if (newFilter && newFilter.id) {
          // Apply to all selected element types
          const filterRef = formatSVGReference(newFilter.id);
          
          // Apply to parent paths of selected sub-paths
          if (hasSubPaths) {
            const parentPaths = getParentPathsOfSelectedSubPaths();
            parentPaths.forEach(pathId => {
              updatePathStyle(pathId, {
                filter: filterRef
              });
            });
          }
          
          // Apply to selected path
          if (hasSelectedPath && selectedPath) {
            updatePathStyle(selectedPath.id, {
              filter: filterRef
            });
          }
          
          // Apply to selected texts
          if (hasTexts) {
            selection.selectedTexts.forEach(textId => {
              updateTextStyle(textId, {
                filter: filterRef
              });
            });
          }
          
          // Apply to selected groups
          if (hasGroups) {
            selection.selectedGroups.forEach(groupId => {
              const currentGroup = useEditorStore.getState().groups.find(group => group.id === groupId);
              updateGroup(groupId, {
                style: {
                  ...currentGroup?.style,
                  filter: filterRef
                }
              });
            });
          }
          
          // Apply to selected images
          if (hasImages) {
            selection.selectedImages.forEach(imageId => {
              const currentImage = useEditorStore.getState().images.find(img => img.id === imageId);
              updateImage(imageId, {
                style: {
                  ...currentImage?.style,
                  filter: filterRef
                }
              });
            });
          }
        }
      }, 200);
      return;
    }

    // Apply to all selected element types when filter already exists
    const filterRef = formatSVGReference(existingFilter.id);
    
    // Apply to parent paths of selected sub-paths
    if (hasSubPaths) {
      const parentPaths = getParentPathsOfSelectedSubPaths();
      parentPaths.forEach(pathId => {
        updatePathStyle(pathId, {
          filter: filterRef
        });
      });
    }
    
    // Apply to selected path
    if (hasSelectedPath && selectedPath) {
      updatePathStyle(selectedPath.id, {
        filter: filterRef
      });
    }
    
    // Apply to selected texts
    if (hasTexts) {
      selection.selectedTexts.forEach(textId => {
        updateTextStyle(textId, {
          filter: filterRef
        });
      });
    }
    
    // Apply to selected groups
    if (hasGroups) {
      selection.selectedGroups.forEach(groupId => {
        const currentGroup = useEditorStore.getState().groups.find(group => group.id === groupId);
        updateGroup(groupId, {
          style: {
            ...currentGroup?.style,
            filter: filterRef
          }
        });
      });
    }
    
    // Apply to selected images
    if (hasImages) {
      selection.selectedImages.forEach(imageId => {
        const currentImage = useEditorStore.getState().images.find(img => img.id === imageId);
        updateImage(imageId, {
          style: {
            ...currentImage?.style,
            filter: filterRef
          }
        });
      });
    }
  };

  const handleApplyFilterToPath = (filterId: string) => {
    if (selectedPath) {
      updatePathStyle(selectedPath.id, {
        filter: formatSVGReference(filterId)
      });
    }
  };

  const handleApplyFilterToSubPaths = (filterId: string) => {
    if (selectedSubPaths.length === 0) {
      alert('Please select one or more sub-paths first');
      return;
    }

    // Apply to parent paths of selected sub-paths
    const parentPaths = getParentPathsOfSelectedSubPaths();
    parentPaths.forEach(pathId => {
      updatePathStyle(pathId, {
        filter: formatSVGReference(filterId)
      });
    });
  };

  const handleApplyFilterToText = (filterId: string) => {
    const selectedTexts = texts.filter(text => 
      selection.selectedTexts.includes(text.id)
    );
    
    selectedTexts.forEach(text => {
      updateTextStyle(text.id, {
        filter: formatSVGReference(filterId)
      });
    });
  };

  const handleApplyFilterToGroup = (filterId: string) => {
    const selectedGroups = groups.filter(group => 
      selection.selectedGroups.includes(group.id)
    );
    
    selectedGroups.forEach(group => {
      updateGroup(group.id, {
        style: {
          ...group.style,
          filter: formatSVGReference(filterId)
        }
      });
    });
  };

  const handleApplyFilterToImage = (filterId: string) => {
    const selectedImages = images.filter(image => 
      selection.selectedImages.includes(image.id)
    );
    
    selectedImages.forEach(image => {
      updateImage(image.id, {
        style: {
          ...image.style,
          filter: formatSVGReference(filterId)
        }
      });
    });
  };

  const handleRemoveFilterFromPath = () => {
    if (selectedPath) {
      updatePathStyle(selectedPath.id, {
        filter: undefined
      });
    }
  };

  const handleRemoveFilterFromSubPaths = () => {
    if (selectedSubPaths.length === 0) {
      return;
    }

    // Remove from parent paths of selected sub-paths
    const parentPaths = getParentPathsOfSelectedSubPaths();
    parentPaths.forEach(pathId => {
      updatePathStyle(pathId, {
        filter: undefined
      });
    });
  };

  const handleRemoveFilterFromText = () => {
    const selectedTexts = texts.filter(text => 
      selection.selectedTexts.includes(text.id)
    );
    
    selectedTexts.forEach(text => {
      updateTextStyle(text.id, {
        filter: undefined
      });
    });
  };

  const handleRemoveFilterFromGroup = () => {
    const selectedGroups = groups.filter(group => 
      selection.selectedGroups.includes(group.id)
    );
    
    selectedGroups.forEach(group => {
      updateGroup(group.id, {
        style: {
          ...group.style,
          filter: undefined
        }
      });
    });
  };

  const handleRemoveFilterFromImage = () => {
    const selectedImages = images.filter(image => 
      selection.selectedImages.includes(image.id)
    );
    
    selectedImages.forEach(image => {
      updateImage(image.id, {
        style: {
          ...image.style,
          filter: undefined
        }
      });
    });
  };

  const handleAddPrimitive = (filterId: string, type: FilterPrimitiveType['type']) => {
    const filter = filters.find(f => f.id === filterId);
    if (filter) {
      const newPrimitive = createFilterPrimitive(type);
      updateFilter(filterId, {
        primitives: [...filter.primitives, newPrimitive]
      });
    }
  };

  const handleUpdatePrimitive = (filterId: string, primitiveIndex: number, updates: any) => {
    const filter = filters.find(f => f.id === filterId);
    if (filter) {
      const updatedPrimitives = [...filter.primitives];
      updatedPrimitives[primitiveIndex] = { ...updatedPrimitives[primitiveIndex], ...updates } as FilterPrimitiveType;
      updateFilter(filterId, {
        primitives: updatedPrimitives
      });
    }
  };

  const handleRemovePrimitive = (filterId: string, primitiveIndex: number) => {
    const filter = filters.find(f => f.id === filterId);
    if (filter) {
      const updatedPrimitives = filter.primitives.filter((_, index) => index !== primitiveIndex);
      updateFilter(filterId, {
        primitives: updatedPrimitives
      });
    }
  };

  const handleRemoveFilter = (filterId: string) => {
    if (confirm('Are you sure you want to remove this filter?')) {
      removeFilter(filterId);
    }
  };

  const handleClearAllFilters = () => {
    if (filters.length === 0) {
      alert('No filters to remove');
      return;
    }
    
    if (confirm(`Are you sure you want to remove all ${filters.length} filter${filters.length > 1 ? 's' : ''}? This action cannot be undone.`)) {
      // Remove all filters one by one
      filters.forEach(filter => {
        removeFilter(filter.id);
      });
    }
  };

  const renderPrimitiveEditor = (primitive: FilterPrimitiveType, filterId: string, index: number) => {
    const updatePrimitive = (updates: Partial<FilterPrimitiveType>) => {
      handleUpdatePrimitive(filterId, index, updates);
    };

    switch (primitive.type) {
      case 'feGaussianBlur':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', color: '#666' }}>Blur Amount</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={primitive.stdDeviation}
              onChange={(e) => updatePrimitive({ stdDeviation: parseFloat(e.target.value) || 0 })}
              style={{ 
                width: '100%', 
                padding: '4px', 
                fontSize: '11px',
                border: '1px solid #ddd',
                borderRadius: '3px'
              }}
            />
          </div>
        );

      case 'feOffset':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#666' }}>X Offset</label>
              <input
                type="number"
                value={primitive.dx}
                onChange={(e) => updatePrimitive({ dx: parseFloat(e.target.value) || 0 })}
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
              <label style={{ fontSize: '11px', color: '#666' }}>Y Offset</label>
              <input
                type="number"
                value={primitive.dy}
                onChange={(e) => updatePrimitive({ dy: parseFloat(e.target.value) || 0 })}
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
        );

      case 'feFlood':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#666' }}>Color</label>
              <input
                type="color"
                value={primitive.floodColor}
                onChange={(e) => updatePrimitive({ floodColor: e.target.value })}
                style={{ 
                  width: '100%', 
                  padding: '2px', 
                  border: '1px solid #ddd',
                  borderRadius: '3px'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#666' }}>Opacity</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={primitive.floodOpacity || 1}
                onChange={(e) => updatePrimitive({ floodOpacity: parseFloat(e.target.value) || 1 })}
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
        );

      case 'feDropShadow':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#666' }}>X Offset</label>
                <input
                  type="number"
                  value={primitive.dx}
                  onChange={(e) => updatePrimitive({ dx: parseFloat(e.target.value) || 0 })}
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
                <label style={{ fontSize: '11px', color: '#666' }}>Y Offset</label>
                <input
                  type="number"
                  value={primitive.dy}
                  onChange={(e) => updatePrimitive({ dy: parseFloat(e.target.value) || 0 })}
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
              <label style={{ fontSize: '11px', color: '#666' }}>Blur</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={primitive.stdDeviation}
                onChange={(e) => updatePrimitive({ stdDeviation: parseFloat(e.target.value) || 0 })}
                style={{ 
                  width: '100%', 
                  padding: '4px', 
                  fontSize: '11px',
                  border: '1px solid #ddd',
                  borderRadius: '3px'
                }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#666' }}>Color</label>
                <input
                  type="color"
                  value={primitive.floodColor}
                  onChange={(e) => updatePrimitive({ floodColor: e.target.value })}
                  style={{ 
                    width: '100%', 
                    padding: '2px', 
                    border: '1px solid #ddd',
                    borderRadius: '3px'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#666' }}>Opacity</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={primitive.floodOpacity || 1}
                  onChange={(e) => updatePrimitive({ floodOpacity: parseFloat(e.target.value) || 1 })}
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
          </div>
        );

      case 'feColorMatrix':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#666' }}>Type</label>
              <select
                value={primitive.colorMatrixType || 'matrix'}
                onChange={(e) => updatePrimitive({ colorMatrixType: e.target.value as any })}
                style={{ 
                  width: '100%', 
                  padding: '4px', 
                  fontSize: '11px',
                  border: '1px solid #ddd',
                  borderRadius: '3px'
                }}
              >
                <option value="matrix">Matrix</option>
                <option value="saturate">Saturate</option>
                <option value="hueRotate">Hue Rotate</option>
                <option value="luminanceToAlpha">Luminance to Alpha</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#666' }}>Values</label>
              <input
                type="text"
                value={primitive.values || ''}
                onChange={(e) => updatePrimitive({ values: e.target.value })}
                style={{ 
                  width: '100%', 
                  padding: '4px', 
                  fontSize: '11px',
                  border: '1px solid #ddd',
                  borderRadius: '3px'
                }}
                placeholder="e.g., 1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"
              />
            </div>
          </div>
        );

      case 'feMorphology':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#666' }}>Operator</label>
              <select
                value={primitive.operator}
                onChange={(e) => updatePrimitive({ operator: e.target.value as any })}
                style={{ 
                  width: '100%', 
                  padding: '4px', 
                  fontSize: '11px',
                  border: '1px solid #ddd',
                  borderRadius: '3px'
                }}
              >
                <option value="erode">Erode</option>
                <option value="dilate">Dilate</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#666' }}>Radius</label>
              <input
                type="number"
                min="0"
                value={primitive.radius}
                onChange={(e) => updatePrimitive({ radius: parseFloat(e.target.value) || 0 })}
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
        );

      case 'feBlend':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', color: '#666' }}>Blend Mode</label>
            <select
              value={primitive.mode}
              onChange={(e) => updatePrimitive({ mode: e.target.value as any })}
              style={{ 
                width: '100%', 
                padding: '4px', 
                fontSize: '11px',
                border: '1px solid #ddd',
                borderRadius: '3px'
              }}
            >
              <option value="normal">Normal</option>
              <option value="multiply">Multiply</option>
              <option value="screen">Screen</option>
              <option value="overlay">Overlay</option>
              <option value="darken">Darken</option>
              <option value="lighten">Lighten</option>
              <option value="color-dodge">Color Dodge</option>
              <option value="color-burn">Color Burn</option>
              <option value="hard-light">Hard Light</option>
              <option value="soft-light">Soft Light</option>
              <option value="difference">Difference</option>
              <option value="exclusion">Exclusion</option>
            </select>
          </div>
        );

      case 'feComposite':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#666' }}>Operator</label>
              <select
                value={primitive.operator}
                onChange={(e) => updatePrimitive({ operator: e.target.value as any })}
                style={{ 
                  width: '100%', 
                  padding: '4px', 
                  fontSize: '11px',
                  border: '1px solid #ddd',
                  borderRadius: '3px'
                }}
              >
                <option value="over">Over</option>
                <option value="in">In</option>
                <option value="out">Out</option>
                <option value="atop">Atop</option>
                <option value="xor">XOR</option>
                <option value="arithmetic">Arithmetic</option>
              </select>
            </div>
            {primitive.operator === 'arithmetic' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '4px' }}>
                <div>
                  <label style={{ fontSize: '10px', color: '#666' }}>k1</label>
                  <input
                    type="number"
                    step="0.1"
                    value={primitive.k1 || 0}
                    onChange={(e) => updatePrimitive({ k1: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '2px', fontSize: '10px', border: '1px solid #ddd', borderRadius: '3px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: '#666' }}>k2</label>
                  <input
                    type="number"
                    step="0.1"
                    value={primitive.k2 || 0}
                    onChange={(e) => updatePrimitive({ k2: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '2px', fontSize: '10px', border: '1px solid #ddd', borderRadius: '3px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: '#666' }}>k3</label>
                  <input
                    type="number"
                    step="0.1"
                    value={primitive.k3 || 0}
                    onChange={(e) => updatePrimitive({ k3: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '2px', fontSize: '10px', border: '1px solid #ddd', borderRadius: '3px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: '#666' }}>k4</label>
                  <input
                    type="number"
                    step="0.1"
                    value={primitive.k4 || 0}
                    onChange={(e) => updatePrimitive({ k4: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '2px', fontSize: '10px', border: '1px solid #ddd', borderRadius: '3px' }}
                  />
                </div>
              </div>
            )}
          </div>
        );

      case 'feConvolveMatrix':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#666' }}>Order</label>
                <input
                  type="text"
                  value={primitive.order}
                  onChange={(e) => updatePrimitive({ order: e.target.value })}
                  style={{ width: '100%', padding: '4px', fontSize: '11px', border: '1px solid #ddd', borderRadius: '3px' }}
                  placeholder="e.g., 3 or 3 3"
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#666' }}>Divisor</label>
                <input
                  type="number"
                  value={primitive.divisor || 1}
                  onChange={(e) => updatePrimitive({ divisor: parseFloat(e.target.value) || 1 })}
                  style={{ width: '100%', padding: '4px', fontSize: '11px', border: '1px solid #ddd', borderRadius: '3px' }}
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#666' }}>Kernel Matrix</label>
              <textarea
                value={primitive.kernelMatrix}
                onChange={(e) => updatePrimitive({ kernelMatrix: e.target.value })}
                style={{ width: '100%', padding: '4px', fontSize: '11px', border: '1px solid #ddd', borderRadius: '3px', minHeight: '60px' }}
                placeholder="e.g., 0 -1 0 -1 5 -1 0 -1 0"
              />
            </div>
          </div>
        );

      case 'feTurbulence':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#666' }}>Base Frequency</label>
                <input
                  type="text"
                  value={primitive.baseFrequency}
                  onChange={(e) => updatePrimitive({ baseFrequency: e.target.value })}
                  style={{ width: '100%', padding: '4px', fontSize: '11px', border: '1px solid #ddd', borderRadius: '3px' }}
                  placeholder="e.g., 0.04"
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#666' }}>Octaves</label>
                <input
                  type="number"
                  min="1"
                  value={primitive.numOctaves || 1}
                  onChange={(e) => updatePrimitive({ numOctaves: parseInt(e.target.value) || 1 })}
                  style={{ width: '100%', padding: '4px', fontSize: '11px', border: '1px solid #ddd', borderRadius: '3px' }}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#666' }}>Type</label>
                <select
                  value={primitive.turbulenceType || 'turbulence'}
                  onChange={(e) => updatePrimitive({ turbulenceType: e.target.value as any })}
                  style={{ width: '100%', padding: '4px', fontSize: '11px', border: '1px solid #ddd', borderRadius: '3px' }}
                >
                  <option value="turbulence">Turbulence</option>
                  <option value="fractalNoise">Fractal Noise</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#666' }}>Seed</label>
                <input
                  type="number"
                  value={primitive.seed || 0}
                  onChange={(e) => updatePrimitive({ seed: parseInt(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '4px', fontSize: '11px', border: '1px solid #ddd', borderRadius: '3px' }}
                />
              </div>
            </div>
          </div>
        );

      case 'feDisplacementMap':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#666' }}>Scale</label>
              <input
                type="number"
                value={primitive.scale || 0}
                onChange={(e) => updatePrimitive({ scale: parseFloat(e.target.value) || 0 })}
                style={{ width: '100%', padding: '4px', fontSize: '11px', border: '1px solid #ddd', borderRadius: '3px' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#666' }}>X Channel</label>
                <select
                  value={primitive.xChannelSelector || 'R'}
                  onChange={(e) => updatePrimitive({ xChannelSelector: e.target.value as any })}
                  style={{ width: '100%', padding: '4px', fontSize: '11px', border: '1px solid #ddd', borderRadius: '3px' }}
                >
                  <option value="R">Red</option>
                  <option value="G">Green</option>
                  <option value="B">Blue</option>
                  <option value="A">Alpha</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#666' }}>Y Channel</label>
                <select
                  value={primitive.yChannelSelector || 'G'}
                  onChange={(e) => updatePrimitive({ yChannelSelector: e.target.value as any })}
                  style={{ width: '100%', padding: '4px', fontSize: '11px', border: '1px solid #ddd', borderRadius: '3px' }}
                >
                  <option value="R">Red</option>
                  <option value="G">Green</option>
                  <option value="B">Blue</option>
                  <option value="A">Alpha</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 'feImage':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#666' }}>Image URL</label>
              <input
                type="text"
                value={primitive.href || ''}
                onChange={(e) => updatePrimitive({ href: e.target.value })}
                style={{ width: '100%', padding: '4px', fontSize: '11px', border: '1px solid #ddd', borderRadius: '3px' }}
                placeholder="Image URL or reference"
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#666' }}>Preserve Aspect Ratio</label>
              <input
                type="text"
                value={primitive.preserveAspectRatio || 'xMidYMid meet'}
                onChange={(e) => updatePrimitive({ preserveAspectRatio: e.target.value })}
                style={{ width: '100%', padding: '4px', fontSize: '11px', border: '1px solid #ddd', borderRadius: '3px' }}
              />
            </div>
          </div>
        );

      case 'feTile':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '11px', fontWeight: '500', color: '#333' }}>{primitive.type}</div>
            <div style={{ fontSize: '10px', color: '#666' }}>
              Tiles the input image to fill the filter region. Use with displacement maps for interesting effects.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: '#666' }}>Input:</label>
              <input
                type="text"
                value={primitive.in || ''}
                onChange={(e) => updatePrimitive({ in: e.target.value })}
                placeholder="Input source (e.g., SourceGraphic)"
                style={{ width: '100%', padding: '4px', fontSize: '11px', border: '1px solid #ddd', borderRadius: '3px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: '#666' }}>Result:</label>
              <input
                type="text"
                value={primitive.result || ''}
                onChange={(e) => updatePrimitive({ result: e.target.value })}
                placeholder="Result name (e.g., tiled)"
                style={{ width: '100%', padding: '4px', fontSize: '11px', border: '1px solid #ddd', borderRadius: '3px' }}
              />
            </div>
          </div>
        );

      case 'feComponentTransfer':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '11px', fontWeight: '500', color: '#333' }}>{primitive.type}</div>
            <div style={{ fontSize: '10px', color: '#666' }}>
              Performs component-wise remapping of color data. Use with nested feFuncR, feFuncG, feFuncB, feFuncA elements.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: '#666' }}>Input:</label>
              <input
                type="text"
                value={primitive.in || ''}
                onChange={(e) => updatePrimitive({ in: e.target.value })}
                placeholder="Input source (e.g., SourceGraphic)"
                style={{ width: '100%', padding: '4px', fontSize: '11px', border: '1px solid #ddd', borderRadius: '3px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: '#666' }}>Result:</label>
              <input
                type="text"
                value={primitive.result || ''}
                onChange={(e) => updatePrimitive({ result: e.target.value })}
                placeholder="Result name (e.g., transfered)"
                style={{ width: '100%', padding: '4px', fontSize: '11px', border: '1px solid #ddd', borderRadius: '3px' }}
              />
            </div>
            <div style={{ fontSize: '10px', color: '#888', fontStyle: 'italic' }}>
              Add feFuncR, feFuncG, feFuncB, feFuncA primitives as children for channel-specific transformations.
            </div>
          </div>
        );

      case 'feDiffuseLighting':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '11px', fontWeight: '500', color: '#333' }}>{primitive.type}</div>
            <div style={{ fontSize: '10px', color: '#666' }}>
              Lights a source image using alpha channel as a height map. Creates 3D lighting effects.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <label style={{ fontSize: '10px', color: '#666' }}>Surface Scale:</label>
                <input
                  type="number"
                  value={primitive.surfaceScale || 1}
                  onChange={(e) => updatePrimitive({ surfaceScale: parseFloat(e.target.value) })}
                  min="0"
                  max="10"
                  step="0.1"
                  style={{ width: '100%', padding: '4px', fontSize: '11px', border: '1px solid #ddd', borderRadius: '3px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <label style={{ fontSize: '10px', color: '#666' }}>Diffuse Constant:</label>
                <input
                  type="number"
                  value={primitive.diffuseConstant || 1}
                  onChange={(e) => updatePrimitive({ diffuseConstant: parseFloat(e.target.value) })}
                  min="0"
                  max="10"
                  step="0.1"
                  style={{ width: '100%', padding: '4px', fontSize: '11px', border: '1px solid #ddd', borderRadius: '3px' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: '#666' }}>Light Color:</label>
              <input
                type="color"
                value={primitive.lightColor || '#ffffff'}
                onChange={(e) => updatePrimitive({ lightColor: e.target.value })}
                style={{ width: '100%', padding: '2px', border: '1px solid #ddd', borderRadius: '3px' }}
              />
            </div>
            <div style={{ fontSize: '10px', color: '#888', fontStyle: 'italic' }}>
              Add feDistantLight, fePointLight, or feSpotLight as a child light source.
            </div>
          </div>
        );

      case 'feSpecularLighting':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '11px', fontWeight: '500', color: '#333' }}>{primitive.type}</div>
            <div style={{ fontSize: '10px', color: '#666' }}>
              Creates specular highlights using alpha channel as a height map. Great for metallic/reflective effects.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <label style={{ fontSize: '10px', color: '#666' }}>Surface Scale:</label>
                <input
                  type="number"
                  value={primitive.surfaceScale || 1}
                  onChange={(e) => updatePrimitive({ surfaceScale: parseFloat(e.target.value) })}
                  min="0"
                  max="10"
                  step="0.1"
                  style={{ width: '100%', padding: '4px', fontSize: '11px', border: '1px solid #ddd', borderRadius: '3px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <label style={{ fontSize: '10px', color: '#666' }}>Specular Constant:</label>
                <input
                  type="number"
                  value={primitive.specularConstant || 1}
                  onChange={(e) => updatePrimitive({ specularConstant: parseFloat(e.target.value) })}
                  min="0"
                  max="10"
                  step="0.1"
                  style={{ width: '100%', padding: '4px', fontSize: '11px', border: '1px solid #ddd', borderRadius: '3px' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: '#666' }}>Specular Exponent:</label>
              <input
                type="number"
                value={primitive.specularExponent || 20}
                onChange={(e) => updatePrimitive({ specularExponent: parseFloat(e.target.value) })}
                min="1"
                max="128"
                step="1"
                style={{ width: '100%', padding: '4px', fontSize: '11px', border: '1px solid #ddd', borderRadius: '3px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: '#666' }}>Light Color:</label>
              <input
                type="color"
                value={primitive.lightColor || '#ffffff'}
                onChange={(e) => updatePrimitive({ lightColor: e.target.value })}
                style={{ width: '100%', padding: '2px', border: '1px solid #ddd', borderRadius: '3px' }}
              />
            </div>
            <div style={{ fontSize: '10px', color: '#888', fontStyle: 'italic' }}>
              Add feDistantLight, fePointLight, or feSpotLight as a child light source.
            </div>
          </div>
        );

      case 'feFuncR':
      case 'feFuncG':
      case 'feFuncB':
      case 'feFuncA':
        const channelName = primitive.type.slice(-1); // Get R, G, B, or A
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '11px', fontWeight: '500', color: '#333' }}>{primitive.type} - {channelName} Channel</div>
            <div style={{ fontSize: '10px', color: '#666' }}>
              Defines the transfer function for the {channelName} color channel.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: '#666' }}>Function Type:</label>
              <select
                value={primitive.funcType || 'identity'}
                onChange={(e) => updatePrimitive({ funcType: e.target.value as any })}
                style={{ width: '100%', padding: '4px', fontSize: '11px', border: '1px solid #ddd', borderRadius: '3px' }}
              >
                <option value="identity">Identity (no change)</option>
                <option value="table">Table (lookup)</option>
                <option value="discrete">Discrete</option>
                <option value="linear">Linear</option>
                <option value="gamma">Gamma correction</option>
              </select>
            </div>
            {primitive.funcType === 'table' || primitive.funcType === 'discrete' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', color: '#666' }}>Table Values:</label>
                <input
                  type="text"
                  value={primitive.tableValues || ''}
                  onChange={(e) => updatePrimitive({ tableValues: e.target.value })}
                  placeholder="e.g., 0 0.5 1 (space-separated)"
                  style={{ width: '100%', padding: '4px', fontSize: '11px', border: '1px solid #ddd', borderRadius: '3px' }}
                />
              </div>
            ) : null}
            {primitive.funcType === 'linear' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <label style={{ fontSize: '10px', color: '#666' }}>Slope:</label>
                  <input
                    type="number"
                    value={primitive.slope || 1}
                    onChange={(e) => updatePrimitive({ slope: parseFloat(e.target.value) })}
                    step="0.1"
                    style={{ width: '100%', padding: '4px', fontSize: '11px', border: '1px solid #ddd', borderRadius: '3px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <label style={{ fontSize: '10px', color: '#666' }}>Intercept:</label>
                  <input
                    type="number"
                    value={primitive.intercept || 0}
                    onChange={(e) => updatePrimitive({ intercept: parseFloat(e.target.value) })}
                    step="0.1"
                    style={{ width: '100%', padding: '4px', fontSize: '11px', border: '1px solid #ddd', borderRadius: '3px' }}
                  />
                </div>
              </div>
            ) : null}
            {primitive.funcType === 'gamma' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <label style={{ fontSize: '10px', color: '#666' }}>Amplitude:</label>
                  <input
                    type="number"
                    value={primitive.amplitude || 1}
                    onChange={(e) => updatePrimitive({ amplitude: parseFloat(e.target.value) })}
                    step="0.1"
                    style={{ width: '100%', padding: '4px', fontSize: '11px', border: '1px solid #ddd', borderRadius: '3px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <label style={{ fontSize: '10px', color: '#666' }}>Exponent:</label>
                  <input
                    type="number"
                    value={primitive.exponent || 1}
                    onChange={(e) => updatePrimitive({ exponent: parseFloat(e.target.value) })}
                    step="0.1"
                    style={{ width: '100%', padding: '4px', fontSize: '11px', border: '1px solid #ddd', borderRadius: '3px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <label style={{ fontSize: '10px', color: '#666' }}>Offset:</label>
                  <input
                    type="number"
                    value={primitive.offset || 0}
                    onChange={(e) => updatePrimitive({ offset: parseFloat(e.target.value) })}
                    step="0.1"
                    style={{ width: '100%', padding: '4px', fontSize: '11px', border: '1px solid #ddd', borderRadius: '3px' }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        );

      case 'feMerge':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '11px', fontWeight: '500', color: '#333' }}>{primitive.type}</div>
            <div style={{ fontSize: '10px', color: '#666' }}>
              Merges multiple filter results. Each feMergeNode specifies an input to layer.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: '#666' }}>Result:</label>
              <input
                type="text"
                value={primitive.result || ''}
                onChange={(e) => updatePrimitive({ result: e.target.value })}
                placeholder="Result name (e.g., merged)"
                style={{ width: '100%', padding: '4px', fontSize: '11px', border: '1px solid #ddd', borderRadius: '3px' }}
              />
            </div>
            <div style={{ fontSize: '10px', color: '#888', fontStyle: 'italic' }}>
              Configure merge nodes in source mode or use filter presets for complex merging.
            </div>
          </div>
        );

      default:
        return (
          <div style={{ fontSize: '11px', color: '#999' }}>
            {(primitive as any).type} (Advanced editing not implemented)
          </div>
        );
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
          {(() => {
            const selectedElements = [];
            if (selectedSubPaths.length > 0) selectedElements.push(`${selectedSubPaths.length} sub-path${selectedSubPaths.length > 1 ? 's' : ''}`);
            if (selectedPath) selectedElements.push('1 path');
            if (selection.selectedTexts.length > 0) selectedElements.push(`${selection.selectedTexts.length} text${selection.selectedTexts.length > 1 ? 's' : ''}`);
            if (selection.selectedGroups.length > 0) selectedElements.push(`${selection.selectedGroups.length} group${selection.selectedGroups.length > 1 ? 's' : ''}`);
            if (selection.selectedImages.length > 0) selectedElements.push(`${selection.selectedImages.length} image${selection.selectedImages.length > 1 ? 's' : ''}`);
            
            if (selectedElements.length === 0) {
              return 'Select elements (sub-paths, paths, texts, groups, or images) first to apply filters';
            }
            
            return `Apply to ${selectedElements.join(', ')}`;
          })()}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {/* Filtros Básicos */}
          <div style={{ fontSize: '10px', color: '#666', fontWeight: '500', marginBottom: '2px' }}>Basic Filters:</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px' }}>
            <PluginButton
              icon={<Droplets size={12} />}
              text="Drop Shadow"
              color={hasAnyElementsSelected ? '#17a2b8' : '#6c757d'}
              disabled={!hasAnyElementsSelected}
              onPointerDown={() => handleQuickApplyFilter('drop-shadow')}
            />
            <PluginButton
              icon={<Zap size={12} />}
              text="Blur"
              color={hasAnyElementsSelected ? '#17a2b8' : '#6c757d'}
              disabled={!hasAnyElementsSelected}
              onPointerDown={() => handleQuickApplyFilter('blur')}
            />
          </div>
          
          {/* Filtros de Color */}
          <div style={{ fontSize: '10px', color: '#666', fontWeight: '500', marginTop: '8px', marginBottom: '2px' }}>Color Effects:</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px' }}>
            <PluginButton
              icon={<Eye size={12} />}
              text="Grayscale"
              color={hasAnyElementsSelected ? '#17a2b8' : '#6c757d'}
              disabled={!hasAnyElementsSelected}
              onPointerDown={() => handleQuickApplyFilter('grayscale')}
            />
            <PluginButton
              icon={<Palette size={12} />}
              text="Sepia"
              color={hasAnyElementsSelected ? '#17a2b8' : '#6c757d'}
              disabled={!hasAnyElementsSelected}
              onPointerDown={() => handleQuickApplyFilter('sepia')}
            />
            <PluginButton
              icon={<RotateCcw size={12} />}
              text="Invert"
              color={hasAnyElementsSelected ? '#17a2b8' : '#6c757d'}
              disabled={!hasAnyElementsSelected}
              onPointerDown={() => handleQuickApplyFilter('invert')}
            />
            <PluginButton
              icon={<Sun size={12} />}
              text="Brightness"
              color={hasAnyElementsSelected ? '#17a2b8' : '#6c757d'}
              disabled={!hasAnyElementsSelected}
              onPointerDown={() => handleQuickApplyFilter('brightness')}
            />
            <PluginButton
              icon={<Contrast size={12} />}
              text="Contrast"
              color={hasAnyElementsSelected ? '#17a2b8' : '#6c757d'}
              disabled={!hasAnyElementsSelected}
              onPointerDown={() => handleQuickApplyFilter('contrast')}
            />
            <PluginButton
              icon={<Sparkles size={12} />}
              text="Saturate"
              color={hasAnyElementsSelected ? '#17a2b8' : '#6c757d'}
              disabled={!hasAnyElementsSelected}
              onPointerDown={() => handleQuickApplyFilter('saturate')}
            />
            <PluginButton
              icon={<RotateCcw size={12} />}
              text="Hue Rotate"
              color={hasAnyElementsSelected ? '#17a2b8' : '#6c757d'}
              disabled={!hasAnyElementsSelected}
              onPointerDown={() => handleQuickApplyFilter('hue-rotate')}
            />
            <PluginButton
              icon={<Grid size={12} />}
              text="Posterize"
              color={hasAnyElementsSelected ? '#17a2b8' : '#6c757d'}
              disabled={!hasAnyElementsSelected}
              onPointerDown={() => handleQuickApplyFilter('posterize')}
            />
          </div>

          {/* Filtros de Efectos Especiales */}
          <div style={{ fontSize: '10px', color: '#666', fontWeight: '500', marginTop: '8px', marginBottom: '2px' }}>Special Effects:</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px' }}>
            <PluginButton
              icon={<Layers size={12} />}
              text="Emboss"
              color={hasAnyElementsSelected ? '#17a2b8' : '#6c757d'}
              disabled={!hasAnyElementsSelected}
              onPointerDown={() => handleQuickApplyFilter('emboss')}
            />
            <PluginButton
              icon={<Zap size={12} />}
              text="Sharpen"
              color={hasAnyElementsSelected ? '#17a2b8' : '#6c757d'}
              disabled={!hasAnyElementsSelected}
              onPointerDown={() => handleQuickApplyFilter('sharpen')}
            />
            <PluginButton
              icon={<Edit size={12} />}
              text="Edge Detect"
              color={hasAnyElementsSelected ? '#17a2b8' : '#6c757d'}
              disabled={!hasAnyElementsSelected}
              onPointerDown={() => handleQuickApplyFilter('edge-detect')}
            />
            <PluginButton
              icon={<Sparkles size={12} />}
              text="Glow"
              color={hasAnyElementsSelected ? '#17a2b8' : '#6c757d'}
              disabled={!hasAnyElementsSelected}
              onPointerDown={() => handleQuickApplyFilter('glow')}
            />
            <PluginButton
              icon={<Layers size={12} />}
              text="Bevel"
              color={hasAnyElementsSelected ? '#17a2b8' : '#6c757d'}
              disabled={!hasAnyElementsSelected}
              onPointerDown={() => handleQuickApplyFilter('bevel')}
            />
            <PluginButton
              icon={<Move size={12} />}
              text="Motion Blur"
              color={hasAnyElementsSelected ? '#17a2b8' : '#6c757d'}
              disabled={!hasAnyElementsSelected}
              onPointerDown={() => handleQuickApplyFilter('motion-blur')}
            />
            <PluginButton
              icon={<Volume2 size={12} />}
              text="Noise"
              color={hasAnyElementsSelected ? '#17a2b8' : '#6c757d'}
              disabled={!hasAnyElementsSelected}
              onPointerDown={() => handleQuickApplyFilter('noise')}
            />
            <PluginButton
              icon={<Waves size={12} />}
              text="Wave Distort"
              color={hasAnyElementsSelected ? '#17a2b8' : '#6c757d'}
              disabled={!hasAnyElementsSelected}
              onPointerDown={() => handleQuickApplyFilter('wave-distortion')}
            />
          </div>

          {/* Filtros Artísticos */}
          <div style={{ fontSize: '10px', color: '#666', fontWeight: '500', marginTop: '8px', marginBottom: '2px' }}>Artistic Filters:</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px' }}>
            <PluginButton
              icon={<Brush size={12} />}
              text="Oil Painting"
              color={hasAnyElementsSelected ? '#17a2b8' : '#6c757d'}
              disabled={!hasAnyElementsSelected}
              onPointerDown={() => handleQuickApplyFilter('oil-painting')}
            />
            <PluginButton
              icon={<Droplets size={12} />}
              text="Watercolor"
              color={hasAnyElementsSelected ? '#17a2b8' : '#6c757d'}
              disabled={!hasAnyElementsSelected}
              onPointerDown={() => handleQuickApplyFilter('watercolor')}
            />
            <PluginButton
              icon={<Camera size={12} />}
              text="Vintage"
              color={hasAnyElementsSelected ? '#17a2b8' : '#6c757d'}
              disabled={!hasAnyElementsSelected}
              onPointerDown={() => handleQuickApplyFilter('vintage')}
            />
            <PluginButton
              icon={<Zap size={12} />}
              text="Neon Glow"
              color={hasAnyElementsSelected ? '#17a2b8' : '#6c757d'}
              disabled={!hasAnyElementsSelected}
              onPointerDown={() => handleQuickApplyFilter('neon-glow')}
            />
            <PluginButton
              icon={<Grid size={12} />}
              text="Mosaic"
              color={hasAnyElementsSelected ? '#17a2b8' : '#6c757d'}
              disabled={!hasAnyElementsSelected}
              onPointerDown={() => handleQuickApplyFilter('mosaic')}
            />
            <PluginButton
              icon={<Shuffle size={12} />}
              text="Glitch"
              color={hasAnyElementsSelected ? '#17a2b8' : '#6c757d'}
              disabled={!hasAnyElementsSelected}
              onPointerDown={() => handleQuickApplyFilter('glitch')}
            />
            <PluginButton
              icon={<Monitor size={12} />}
              text="Pixelate"
              color={hasAnyElementsSelected ? '#17a2b8' : '#6c757d'}
              disabled={!hasAnyElementsSelected}
              onPointerDown={() => handleQuickApplyFilter('pixelate')}
            />
            <PluginButton
              icon={<Clock size={12} />}
              text="Chromatic"
              color={hasAnyElementsSelected ? '#17a2b8' : '#6c757d'}
              disabled={!hasAnyElementsSelected}
              onPointerDown={() => handleQuickApplyFilter('chromatic-aberration')}
            />
          </div>

          {/* New Artistic Filters Inspired by SVG Filters Website */}
          <div style={{ fontSize: '10px', color: '#666', fontWeight: '500', marginTop: '8px', marginBottom: '2px' }}>Artistic Presets (Inspired):</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px' }}>
            <PluginButton
              icon={<Activity size={12} />}
              text="Dancing Stroke"
              color={hasAnyElementsSelected ? '#ff6b35' : '#6c757d'}
              disabled={!hasAnyElementsSelected}
              onPointerDown={() => handleQuickApplyFilter('dancing-stroke')}
            />
            <PluginButton
              icon={<Cloud size={12} />}
              text="Smoke"
              color={hasAnyElementsSelected ? '#ff6b35' : '#6c757d'}
              disabled={!hasAnyElementsSelected}
              onPointerDown={() => handleQuickApplyFilter('smoke')}
            />
            <PluginButton
              icon={<Waves size={12} />}
              text="Waves"
              color={hasAnyElementsSelected ? '#ff6b35' : '#6c757d'}
              disabled={!hasAnyElementsSelected}
              onPointerDown={() => handleQuickApplyFilter('waves')}
            />
            <PluginButton
              icon={<FileText size={12} />}
              text="Paper"
              color={hasAnyElementsSelected ? '#ff6b35' : '#6c757d'}
              disabled={!hasAnyElementsSelected}
              onPointerDown={() => handleQuickApplyFilter('paper-texture')}
            />
            <PluginButton
              icon={<Sparkle size={12} />}
              text="Zebra"
              color={hasAnyElementsSelected ? '#ff6b35' : '#6c757d'}
              disabled={!hasAnyElementsSelected}
              onPointerDown={() => handleQuickApplyFilter('zebra')}
            />
            <PluginButton
              icon={<Network size={12} />}
              text="Net"
              color={hasAnyElementsSelected ? '#ff6b35' : '#6c757d'}
              disabled={!hasAnyElementsSelected}
              onPointerDown={() => handleQuickApplyFilter('net')}
            />
            <PluginButton
              icon={<Wind size={12} />}
              text="Dust"
              color={hasAnyElementsSelected ? '#ff6b35' : '#6c757d'}
              disabled={!hasAnyElementsSelected}
              onPointerDown={() => handleQuickApplyFilter('dust')}
            />
            <PluginButton
              icon={<Layers size={12} />}
              text="Stripes"
              color={hasAnyElementsSelected ? '#ff6b35' : '#6c757d'}
              disabled={!hasAnyElementsSelected}
              onPointerDown={() => handleQuickApplyFilter('colored-stripes')}
            />
            <PluginButton
              icon={<Sparkles size={12} />}
              text="Spots"
              color={hasAnyElementsSelected ? '#ff6b35' : '#6c757d'}
              disabled={!hasAnyElementsSelected}
              onPointerDown={() => handleQuickApplyFilter('colored-spots')}
            />
            <PluginButton
              icon={<Flame size={12} />}
              text="Flame"
              color={hasAnyElementsSelected ? '#ff6b35' : '#6c757d'}
              disabled={!hasAnyElementsSelected}
              onPointerDown={() => handleQuickApplyFilter('colored-flame')}
            />
            <PluginButton
              icon={<Droplets size={12} />}
              text="Advanced Watercolor"
              color={hasAnyElementsSelected ? '#ff6b35' : '#6c757d'}
              disabled={!hasAnyElementsSelected}
              onPointerDown={() => handleQuickApplyFilter('advanced-watercolor')}
            />
          </div>
        </div>
      </div>

      {/* Create Custom Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
          Create Custom Filter:
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px' }}>
          <PluginButton
            icon={<Droplets size={12} />}
            text="Drop Shadow"
            color="#28a745"
            onPointerDown={() => handleCreateFilter('drop-shadow')}
          />
          <PluginButton
            icon={<Zap size={12} />}
            text="Blur"
            color="#28a745"
            onPointerDown={() => handleCreateFilter('blur')}
          />
          <PluginButton
            icon={<Eye size={12} />}
            text="Grayscale"
            color="#28a745"
            onPointerDown={() => handleCreateFilter('grayscale')}
          />
          <PluginButton
            icon={<Palette size={12} />}
            text="Sepia"
            color="#28a745"
            onPointerDown={() => handleCreateFilter('sepia')}
          />
          <PluginButton
            icon={<RotateCcw size={12} />}
            text="Invert"
            color="#28a745"
            onPointerDown={() => handleCreateFilter('invert')}
          />
          <PluginButton
            icon={<Sun size={12} />}
            text="Brightness"
            color="#28a745"
            onPointerDown={() => handleCreateFilter('brightness')}
          />
          <PluginButton
            icon={<Contrast size={12} />}
            text="Contrast"
            color="#28a745"
            onPointerDown={() => handleCreateFilter('contrast')}
          />
          <PluginButton
            icon={<Sparkles size={12} />}
            text="Saturate"
            color="#28a745"
            onPointerDown={() => handleCreateFilter('saturate')}
          />
          <PluginButton
            icon={<RotateCcw size={12} />}
            text="Hue Rotate"
            color="#28a745"
            onPointerDown={() => handleCreateFilter('hue-rotate')}
          />
          <PluginButton
            icon={<Layers size={12} />}
            text="Emboss"
            color="#28a745"
            onPointerDown={() => handleCreateFilter('emboss')}
          />
          <PluginButton
            icon={<Zap size={12} />}
            text="Sharpen"
            color="#28a745"
            onPointerDown={() => handleCreateFilter('sharpen')}
          />
          <PluginButton
            icon={<Edit size={12} />}
            text="Edge Detect"
            color="#28a745"
            onPointerDown={() => handleCreateFilter('edge-detect')}
          />
          <PluginButton
            icon={<Sparkles size={12} />}
            text="Glow"
            color="#28a745"
            onPointerDown={() => handleCreateFilter('glow')}
          />
          <PluginButton
            icon={<Layers size={12} />}
            text="Bevel"
            color="#28a745"
            onPointerDown={() => handleCreateFilter('bevel')}
          />
          <PluginButton
            icon={<Move size={12} />}
            text="Motion Blur"
            color="#28a745"
            onPointerDown={() => handleCreateFilter('motion-blur')}
          />
          <PluginButton
            icon={<Volume2 size={12} />}
            text="Noise"
            color="#28a745"
            onPointerDown={() => handleCreateFilter('noise')}
          />
          <PluginButton
            icon={<Waves size={12} />}
            text="Wave Distort"
            color="#28a745"
            onPointerDown={() => handleCreateFilter('wave-distortion')}
          />
          <PluginButton
            icon={<Grid size={12} />}
            text="Posterize"
            color="#28a745"
            onPointerDown={() => handleCreateFilter('posterize')}
          />
          <PluginButton
            icon={<Brush size={12} />}
            text="Oil Painting"
            color="#28a745"
            onPointerDown={() => handleCreateFilter('oil-painting')}
          />
          <PluginButton
            icon={<Droplets size={12} />}
            text="Watercolor"
            color="#28a745"
            onPointerDown={() => handleCreateFilter('watercolor')}
          />
          <PluginButton
            icon={<Camera size={12} />}
            text="Vintage"
            color="#28a745"
            onPointerDown={() => handleCreateFilter('vintage')}
          />
          <PluginButton
            icon={<Zap size={12} />}
            text="Neon Glow"
            color="#28a745"
            onPointerDown={() => handleCreateFilter('neon-glow')}
          />
          <PluginButton
            icon={<Grid size={12} />}
            text="Mosaic"
            color="#28a745"
            onPointerDown={() => handleCreateFilter('mosaic')}
          />
          <PluginButton
            icon={<Shuffle size={12} />}
            text="Glitch"
            color="#28a745"
            onPointerDown={() => handleCreateFilter('glitch')}
          />
          <PluginButton
            icon={<Monitor size={12} />}
            text="Pixelate"
            color="#28a745"
            onPointerDown={() => handleCreateFilter('pixelate')}
          />
          <PluginButton
            icon={<Clock size={12} />}
            text="Chromatic"
            color="#28a745"
            onPointerDown={() => handleCreateFilter('chromatic-aberration')}
          />
          <PluginButton
            icon={<Palette size={12} />}
            text="Custom"
            color="#28a745"
            onPointerDown={() => handleCreateFilter('custom')}
          />
        </div>
      </div>

      {/* Apply to Selected Elements */}
      {(selectedPath || selectedSubPaths.length > 0 || selection.selectedTexts.length > 0 || selection.selectedGroups.length > 0 || selection.selectedImages.length > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px', borderTop: '1px solid #e9ecef' }}>
          <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
            Apply to Selected Elements:
          </span>
          {filters.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filters.map((filter) => (
                <div key={filter.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '11px', color: '#666', fontWeight: '500' }}>
                    Filter ({filter.primitives.length} effects)
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px' }}>
                    {selectedPath && (
                      <button
                        onClick={() => handleApplyFilterToPath(filter.id)}
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
                        Apply to Path
                      </button>
                    )}
                    {selectedSubPaths.length > 0 && (
                      <button
                        onClick={() => handleApplyFilterToSubPaths(filter.id)}
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
                        Apply to Sub-paths ({selectedSubPaths.length})
                      </button>
                    )}
                    {selection.selectedTexts.length > 0 && (
                      <button
                        onClick={() => handleApplyFilterToText(filter.id)}
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
                        Apply to Text ({selection.selectedTexts.length})
                      </button>
                    )}
                    {selection.selectedGroups.length > 0 && (
                      <button
                        onClick={() => handleApplyFilterToGroup(filter.id)}
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
                        Apply to Group ({selection.selectedGroups.length})
                      </button>
                    )}
                    {selection.selectedImages.length > 0 && (
                      <button
                        onClick={() => handleApplyFilterToImage(filter.id)}
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
                        Apply to Image ({selection.selectedImages.length})
                      </button>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Remove Filter Buttons */}
              <div style={{ paddingTop: '8px', borderTop: '1px solid #e9ecef' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px' }}>
                  {selectedPath && selectedPath.style.filter && (
                    <button
                      onClick={handleRemoveFilterFromPath}
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
                  {selectedSubPaths.length > 0 && (
                    <button
                      onClick={handleRemoveFilterFromSubPaths}
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
                      Remove from Sub-paths ({selectedSubPaths.length})
                    </button>
                  )}
                  {selection.selectedTexts.length > 0 && (
                    <button
                      onClick={handleRemoveFilterFromText}
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
                      onClick={handleRemoveFilterFromGroup}
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
                      onClick={handleRemoveFilterFromImage}
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
          ) : (
            <div style={{ fontSize: '11px', color: '#999' }}>No filters available</div>
          )}
        </div>
      )}

      {/* Filter List */}
      {filters.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
              Filters ({filters.length}):
            </span>
            <PluginButton
              icon={<Trash2 size={12} />}
              text="Clear All"
              color="#dc3545"
              onPointerDown={handleClearAllFilters}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '250px', overflow: 'auto' }}>
            {filters.map((filter) => (
              <div
                key={filter.id}
                style={{
                  padding: '8px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '4px',
                  border: '1px solid #e9ecef'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', color: '#666', fontWeight: '500' }}>
                    Filter ({filter.primitives.length} effects)
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => setEditingFilter(editingFilter === filter.id ? null : filter.id)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '10px',
                        border: '1px solid #6c757d',
                        backgroundColor: '#fff',
                        color: '#6c757d',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      {editingFilter === filter.id ? 'Done' : 'Edit'}
                    </button>
                    <button
                      onClick={() => duplicateFilter(filter.id)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '10px',
                        border: '1px solid #6c757d',
                        backgroundColor: '#fff',
                        color: '#6c757d',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => handleRemoveFilter(filter.id)}
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
                
                {editingFilter === filter.id && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Add Primitive */}
                    <div>
                      <label style={{ fontSize: '11px', color: '#666', marginBottom: '4px', display: 'block' }}>Add Effect</label>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddPrimitive(filter.id, e.target.value as FilterPrimitiveType['type']);
                            e.target.value = '';
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
                        <option value="">Select effect...</option>
                        <optgroup label="Basic Effects">
                          <option value="feGaussianBlur">Blur</option>
                          <option value="feOffset">Offset</option>
                          <option value="feFlood">Flood</option>
                          <option value="feDropShadow">Drop Shadow</option>
                        </optgroup>
                        <optgroup label="Color Effects">
                          <option value="feColorMatrix">Color Matrix</option>
                          <option value="feComponentTransfer">Component Transfer</option>
                          <option value="feFuncR">Function R</option>
                          <option value="feFuncG">Function G</option>
                          <option value="feFuncB">Function B</option>
                          <option value="feFuncA">Function A</option>
                        </optgroup>
                        <optgroup label="Composition">
                          <option value="feComposite">Composite</option>
                          <option value="feBlend">Blend</option>
                        </optgroup>
                        <optgroup label="Morphology & Convolution">
                          <option value="feMorphology">Morphology</option>
                          <option value="feConvolveMatrix">Convolve Matrix</option>
                        </optgroup>
                        <optgroup label="Lighting">
                          <option value="feDiffuseLighting">Diffuse Lighting</option>
                          <option value="feSpecularLighting">Specular Lighting</option>
                        </optgroup>
                        <optgroup label="Distortion & Noise">
                          <option value="feDisplacementMap">Displacement Map</option>
                          <option value="feTurbulence">Turbulence</option>
                        </optgroup>
                        <optgroup label="Image & Tile">
                          <option value="feImage">Image</option>
                          <option value="feTile">Tile</option>
                          <option value="feMerge">Merge</option>
                        </optgroup>
                      </select>
                    </div>

                    {/* Primitive List */}
                    {filter.primitives.map((primitive, index) => (
                      <div key={index} style={{ 
                        padding: '6px', 
                        backgroundColor: '#ffffff', 
                        borderRadius: '4px',
                        border: '1px solid #e9ecef'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '500' }}>{primitive.type}</span>
                          <button
                            onClick={() => handleRemovePrimitive(filter.id, index)}
                            style={{
                              padding: '2px 6px',
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
                        {renderPrimitiveEditor(primitive, filter.id, index)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};