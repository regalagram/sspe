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
import { AccordionToggleButton } from '../../components/AccordionPanel';

export const FilterControls: React.FC = () => {
  const { 
    filters, 
    selection, 
    paths,
    addFilter, 
    updateFilter, 
    removeFilter, 
    duplicateFilter,
    updatePathStyle
  } = useEditorStore();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingFilter, setEditingFilter] = useState<string | null>(null);

  const selectedFilter = selection.selectedFilters.length === 1 
    ? filters.find(filter => filter.id === selection.selectedFilters[0])
    : null;

  const selectedPath = selection.selectedPaths.length === 1 
    ? paths.find(path => path.id === selection.selectedPaths[0])
    : null;

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

  const handleApplyFilterToPath = (filterId: string) => {
    if (selectedPath) {
      updatePathStyle(selectedPath.id, {
        filter: formatSVGReference(filterId)
      });
    }
  };

  const handleRemoveFilterFromPath = () => {
    if (selectedPath) {
      updatePathStyle(selectedPath.id, {
        filter: undefined
      });
    }
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
          <div className="space-y-2">
            <label className="block text-xs text-gray-600">Blur Amount</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={primitive.stdDeviation}
              onChange={(e) => updatePrimitive({ stdDeviation: parseFloat(e.target.value) || 0 })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
            />
          </div>
        );

      case 'feOffset':
        return (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-600">X Offset</label>
              <input
                type="number"
                value={primitive.dx}
                onChange={(e) => updatePrimitive({ dx: parseFloat(e.target.value) || 0 })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600">Y Offset</label>
              <input
                type="number"
                value={primitive.dy}
                onChange={(e) => updatePrimitive({ dy: parseFloat(e.target.value) || 0 })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
            </div>
          </div>
        );

      case 'feFlood':
        return (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-600">Color</label>
              <input
                type="color"
                value={primitive.floodColor}
                onChange={(e) => updatePrimitive({ floodColor: e.target.value })}
                className="w-full px-1 py-1 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600">Opacity</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={primitive.floodOpacity || 1}
                onChange={(e) => updatePrimitive({ floodOpacity: parseFloat(e.target.value) || 1 })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
            </div>
          </div>
        );

      case 'feDropShadow':
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600">X Offset</label>
                <input
                  type="number"
                  value={primitive.dx}
                  onChange={(e) => updatePrimitive({ dx: parseFloat(e.target.value) || 0 })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Y Offset</label>
                <input
                  type="number"
                  value={primitive.dy}
                  onChange={(e) => updatePrimitive({ dy: parseFloat(e.target.value) || 0 })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600">Blur</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={primitive.stdDeviation}
                onChange={(e) => updatePrimitive({ stdDeviation: parseFloat(e.target.value) || 0 })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600">Color</label>
                <input
                  type="color"
                  value={primitive.floodColor}
                  onChange={(e) => updatePrimitive({ floodColor: e.target.value })}
                  className="w-full px-1 py-1 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Opacity</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={primitive.floodOpacity || 1}
                  onChange={(e) => updatePrimitive({ floodOpacity: parseFloat(e.target.value) || 1 })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                />
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-xs text-gray-500">
            {primitive.type} (Advanced editing not implemented)
          </div>
        );
    }
  };

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <AccordionToggleButton
        isExpanded={isExpanded}
        onClick={() => setIsExpanded(!isExpanded)}
        title="Filters & Effects"
        badge={filters.length > 0 ? filters.length : undefined}
      />
      
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Quick Filter Creation */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Create Filter</h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleCreateFilter('drop-shadow')}
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
              >
                Drop Shadow
              </button>
              <button
                onClick={() => handleCreateFilter('blur')}
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
              >
                Blur
              </button>
              <button
                onClick={() => handleCreateFilter('grayscale')}
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
              >
                Grayscale
              </button>
              <button
                onClick={() => handleCreateFilter('custom')}
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
              >
                Custom
              </button>
            </div>
          </div>

          {/* Apply to Selected Path */}
          {selectedPath && (
            <div className="space-y-2 pt-2 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700">Apply to Selected Path</h4>
              {filters.length > 0 ? (
                <div className="space-y-1">
                  {filters.map((filter) => (
                    <div key={filter.id} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 truncate">
                        Filter ({filter.primitives.length} effects)
                      </span>
                      <button
                        onClick={() => handleApplyFilterToPath(filter.id)}
                        className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                      >
                        Apply
                      </button>
                    </div>
                  ))}
                  {selectedPath.style.filter && (
                    <button
                      onClick={handleRemoveFilterFromPath}
                      className="w-full px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                    >
                      Remove Filter
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-xs text-gray-500">No filters available</div>
              )}
            </div>
          )}

          {/* Filter List */}
          {filters.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Filters ({filters.length})</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filters.map((filter) => (
                  <div
                    key={filter.id}
                    className="border border-gray-200 rounded p-2"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium">
                        Filter ({filter.primitives.length} effects)
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingFilter(editingFilter === filter.id ? null : filter.id)}
                          className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                        >
                          {editingFilter === filter.id ? 'Done' : 'Edit'}
                        </button>
                        <button
                          onClick={() => duplicateFilter(filter.id)}
                          className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                        >
                          Copy
                        </button>
                        <button
                          onClick={() => handleRemoveFilter(filter.id)}
                          className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {editingFilter === filter.id && (
                      <div className="space-y-3">
                        {/* Add Primitive */}
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Add Effect</label>
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAddPrimitive(filter.id, e.target.value as FilterPrimitiveType['type']);
                                e.target.value = '';
                              }
                            }}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
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
                          <div key={index} className="border border-gray-100 rounded p-2">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium">{primitive.type}</span>
                              <button
                                onClick={() => handleRemovePrimitive(filter.id, index)}
                                className="px-1 py-0.5 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
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
      )}
    </div>
  );
};