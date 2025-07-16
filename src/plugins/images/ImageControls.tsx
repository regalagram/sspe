import React, { useState, useRef } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { readFileAsDataURL, validateImageFile, createDefaultImage, calculateImageAspectRatio } from '../../utils/svg-elements-utils';
import { AccordionToggleButton } from '../../components/AccordionPanel';

export const ImageControls: React.FC = () => {
  const { 
    images, 
    selection, 
    addImage, 
    updateImage, 
    removeImage, 
    duplicateImage 
  } = useEditorStore();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedImage = selection.selectedImages.length === 1 
    ? images.find(img => img.id === selection.selectedImages[0])
    : null;

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!validateImageFile(file)) {
      alert('Please select a valid image file (JPEG, PNG, GIF, SVG, WebP)');
      return;
    }

    setLoading(true);
    try {
      const dataURL = await readFileAsDataURL(file);
      
      // Create an image element to get natural dimensions
      const img = new Image();
      img.onload = () => {
        const { width, height } = calculateImageAspectRatio(
          img.naturalWidth, 
          img.naturalHeight, 
          300, 
          300
        );
        
        addImage({
          ...createDefaultImage(100, 100, dataURL),
          width,
          height
        });
        setLoading(false);
      };
      img.onerror = () => {
        alert('Failed to load image');
        setLoading(false);
      };
      img.src = dataURL;
    } catch (error) {
      console.error('Error reading file:', error);
      alert('Error reading file');
      setLoading(false);
    }
  };

  const handleAddImage = () => {
    fileInputRef.current?.click();
  };

  const handleDuplicateImage = () => {
    if (selectedImage) {
      duplicateImage(selectedImage.id);
    }
  };

  const handleRemoveImage = () => {
    if (selectedImage && confirm('Are you sure you want to remove this image?')) {
      removeImage(selectedImage.id);
    }
  };

  const handlePropertyChange = (property: string, value: any) => {
    if (selectedImage) {
      updateImage(selectedImage.id, { [property]: value });
    }
  };

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <AccordionToggleButton
        isExpanded={isExpanded}
        onClick={() => setIsExpanded(!isExpanded)}
        title="Images"
        badge={images.length > 0 ? images.length : undefined}
      />
      
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Add Image Section */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Add Image</h4>
            <div className="flex gap-2">
              <button
                onClick={handleAddImage}
                disabled={loading}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Browse File'}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Image List */}
          {images.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Images ({images.length})</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {images.map((image) => (
                  <div
                    key={image.id}
                    className={`p-2 rounded border cursor-pointer ${
                      selection.selectedImages.includes(image.id)
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => {
                      // Handle selection logic here if needed
                    }}
                  >
                    <div className="text-xs text-gray-600">
                      {image.width} × {image.height}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {image.href.startsWith('data:') ? 'Embedded image' : image.href}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Image Properties */}
          {selectedImage && (
            <div className="space-y-3 pt-3 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700">Image Properties</h4>
              
              {/* Position */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">X</label>
                  <input
                    type="number"
                    value={selectedImage.x}
                    onChange={(e) => handlePropertyChange('x', parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Y</label>
                  <input
                    type="number"
                    value={selectedImage.y}
                    onChange={(e) => handlePropertyChange('y', parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                </div>
              </div>

              {/* Dimensions */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Width</label>
                  <input
                    type="number"
                    value={selectedImage.width}
                    onChange={(e) => handlePropertyChange('width', parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Height</label>
                  <input
                    type="number"
                    value={selectedImage.height}
                    onChange={(e) => handlePropertyChange('height', parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                </div>
              </div>

              {/* Preserve Aspect Ratio */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">Preserve Aspect Ratio</label>
                <select
                  value={selectedImage.preserveAspectRatio || 'xMidYMid'}
                  onChange={(e) => handlePropertyChange('preserveAspectRatio', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                >
                  <option value="none">None</option>
                  <option value="xMinYMin">Top Left</option>
                  <option value="xMidYMin">Top Center</option>
                  <option value="xMaxYMin">Top Right</option>
                  <option value="xMinYMid">Center Left</option>
                  <option value="xMidYMid">Center</option>
                  <option value="xMaxYMid">Center Right</option>
                  <option value="xMinYMax">Bottom Left</option>
                  <option value="xMidYMax">Bottom Center</option>
                  <option value="xMaxYMax">Bottom Right</option>
                </select>
              </div>

              {/* Opacity */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Opacity ({Math.round(((selectedImage.style?.opacity ?? 1) * 100))}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={selectedImage.style?.opacity ?? 1}
                  onChange={(e) => handlePropertyChange('style', { 
                    ...selectedImage.style, 
                    opacity: parseFloat(e.target.value) 
                  })}
                  className="w-full"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleDuplicateImage}
                  className="flex-1 px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                >
                  Duplicate
                </button>
                <button
                  onClick={handleRemoveImage}
                  className="flex-1 px-3 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};