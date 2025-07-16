import React, { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { 
  createDefaultFilter, 
  createFilterPrimitive, 
  createDropShadowFilter, 
  createBlurFilter, 
  createGrayscaleFilter,
  formatSVGReference 
} from '../../utils/svg-elements-utils';
import { FilterPrimitiveType } from '../../types';
import { PluginButton } from '../../components/PluginButton';
import { Plus, Trash2, Eye, Zap, Droplets, Palette, Edit, Copy } from 'lucide-react';

export const FilterControls: React.FC = () => {
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
  } = useEditorStore();
  
  const [editingFilter, setEditingFilter] = useState<string | null>(null);

  const selectedFilter = selection.selectedFilters.length === 1 
    ? filters.find(filter => filter.id === selection.selectedFilters[0])
    : null;

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

  const handleCreateFilter = (type: 'custom' | 'drop-shadow' | 'blur' | 'grayscale') => {
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
      default:
        filterData = createDefaultFilter();
    }
    addFilter(filterData);
  };

  const handleQuickApplyFilter = (type: 'drop-shadow' | 'blur' | 'grayscale') => {
    if (selectedSubPaths.length === 0) {
      alert('Please select one or more sub-paths first');
      return;
    }

    // Create or find existing filter of this type
    let existingFilter = filters.find(f => {
      if (type === 'drop-shadow') {
        return f.primitives.some(p => p.type === 'feDropShadow');
      } else if (type === 'blur') {
        return f.primitives.some(p => p.type === 'feGaussianBlur');
      } else if (type === 'grayscale') {
        return f.primitives.some(p => p.type === 'feColorMatrix' && p.values === '0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0 0 0 1 0');
      }
      return false;
    });

    if (!existingFilter) {
      const filterData = type === 'drop-shadow' ? createDropShadowFilter() :
                         type === 'blur' ? createBlurFilter() : 
                         createGrayscaleFilter();
      addFilter(filterData);
      existingFilter = filterData as any;
    }

    // Apply to parent paths of selected sub-paths
    const parentPaths = getParentPathsOfSelectedSubPaths();
    parentPaths.forEach(pathId => {
      updatePathStyle(pathId, {
        filter: formatSVGReference(existingFilter!.id)
      });
    });
  };

  const handleApplyFilterToPath = (filterId: string) => {
    if (selectedPath) {
      updatePathStyle(selectedPath.id, {
        filter: formatSVGReference(filterId)
      });
    }
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

      default:
        return (
          <div style={{ fontSize: '11px', color: '#999' }}>
            {primitive.type} (Advanced editing not implemented)
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
          {hasPathSelection 
            ? `Apply to ${selectedSubPaths.length} selected sub-path${selectedSubPaths.length > 1 ? 's' : ''}`
            : 'Select sub-paths first to apply filters'
          }
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <PluginButton
            icon={<Droplets size={12} />}
            text="Drop Shadow"
            color={hasPathSelection ? '#17a2b8' : '#6c757d'}
            disabled={!hasPathSelection}
            onPointerDown={() => handleQuickApplyFilter('drop-shadow')}
          />
            <PluginButton
              icon={<Zap size={12} />}
              text="Blur"
              color={hasPathSelection ? '#17a2b8' : '#6c757d'}
              disabled={!hasPathSelection}
              onPointerDown={() => handleQuickApplyFilter('blur')}
            />
            <PluginButton
              icon={<Eye size={12} />}
              text="Grayscale"
              color={hasPathSelection ? '#17a2b8' : '#6c757d'}
              disabled={!hasPathSelection}
              onPointerDown={() => handleQuickApplyFilter('grayscale')}
            />
        </div>
      </div>

      {/* Create Custom Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
          Create Custom Filter:
        </span>
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
            text="Custom"
            color="#28a745"
            onPointerDown={() => handleCreateFilter('custom')}
          />
      </div>

      {/* Apply to Selected Elements */}
      {(selectedPath || selection.selectedTexts.length > 0 || selection.selectedGroups.length > 0 || selection.selectedImages.length > 0) && (
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
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
          <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
            Filters ({filters.length}):
          </span>
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
                        <option value="feGaussianBlur">Blur</option>
                        <option value="feOffset">Offset</option>
                        <option value="feFlood">Flood</option>
                        <option value="feDropShadow">Drop Shadow</option>
                        <option value="feColorMatrix">Color Matrix</option>
                        <option value="feComposite">Composite</option>
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