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
    updatePathStyle
  } = useEditorStore();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'clips' | 'masks'>('clips');

  const selectedPath = selection.selectedPaths.length === 1 
    ? paths.find(path => path.id === selection.selectedPaths[0])
    : null;

  const handleCreateClipPath = () => {
    addClipPath(createDefaultClipPath());
  };

  const handleCreateMask = () => {
    addMask(createDefaultMask());
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
                <h4 className="text-sm font-medium text-gray-700">Clip Paths</h4>
                <button
                  onClick={handleCreateClipPath}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Create Clip Path
                </button>
              </div>

              {/* Apply to Selected Path */}
              {selectedPath && (
                <div className="space-y-2 pt-2 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700">Apply to Selected Path</h4>
                  {clipPaths.length > 0 ? (
                    <div className="space-y-1">
                      {clipPaths.map((clip) => (
                        <div key={clip.id} className="flex items-center justify-between">
                          <span className="text-xs text-gray-600 truncate">
                            Clip ({clip.children.length} elements)
                          </span>
                          <button
                            onClick={() => handleApplyClipToPath(clip.id)}
                            className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                          >
                            Apply
                          </button>
                        </div>
                      ))}
                      {selectedPath.style.clipPath && (
                        <button
                          onClick={handleRemoveClipFromPath}
                          className="w-full px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                        >
                          Remove Clip
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">No clip paths available</div>
                  )}
                </div>
              )}

              {/* Clip Path List */}
              {clipPaths.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Clip Paths ({clipPaths.length})</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {clipPaths.map((clip) => (
                      <div
                        key={clip.id}
                        className="flex items-center justify-between p-2 border border-gray-200 rounded"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-gray-600">
                            {clip.children.length} elements
                          </div>
                          <div className="text-xs text-gray-500">
                            Units: {clip.clipPathUnits || 'userSpaceOnUse'}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveClipPath(clip.id)}
                          className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Masks Tab */}
          {activeTab === 'masks' && (
            <div className="space-y-4">
              {/* Create Mask */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Masks</h4>
                <button
                  onClick={handleCreateMask}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Create Mask
                </button>
              </div>

              {/* Apply to Selected Path */}
              {selectedPath && (
                <div className="space-y-2 pt-2 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700">Apply to Selected Path</h4>
                  {masks.length > 0 ? (
                    <div className="space-y-1">
                      {masks.map((mask) => (
                        <div key={mask.id} className="flex items-center justify-between">
                          <span className="text-xs text-gray-600 truncate">
                            Mask ({mask.children.length} elements)
                          </span>
                          <button
                            onClick={() => handleApplyMaskToPath(mask.id)}
                            className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                          >
                            Apply
                          </button>
                        </div>
                      ))}
                      {selectedPath.style.mask && (
                        <button
                          onClick={handleRemoveMaskFromPath}
                          className="w-full px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                        >
                          Remove Mask
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">No masks available</div>
                  )}
                </div>
              )}

              {/* Mask List */}
              {masks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Masks ({masks.length})</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {masks.map((mask) => (
                      <div
                        key={mask.id}
                        className="flex items-center justify-between p-2 border border-gray-200 rounded"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-gray-600">
                            {mask.children.length} elements
                          </div>
                          <div className="text-xs text-gray-500">
                            Units: {mask.maskUnits || 'objectBoundingBox'}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveMask(mask.id)}
                          className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Usage Instructions */}
          <div className="pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-500 space-y-1">
              <div>• Create clip paths and masks to control element visibility</div>
              <div>• Select a path to apply clipping or masking effects</div>
              <div>• Clips are binary (visible/hidden), masks support opacity gradients</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};