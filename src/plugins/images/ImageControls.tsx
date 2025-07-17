import React, { useState, useRef } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { readFileAsDataURL, validateImageFile, createDefaultImage, calculateImageAspectRatio } from '../../utils/svg-elements-utils';
import { PluginButton } from '../../components/PluginButton';
import { Upload, Copy, Trash2, Image as ImageIcon } from 'lucide-react';

export const ImageControls: React.FC = () => {
  const { 
    images, 
    selection, 
    addImage, 
    updateImage, 
    removeImage, 
    duplicateImage,
    selectImage 
  } = useEditorStore();
  
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedImages = images.filter(img => selection.selectedImages.includes(img.id));
  const selectedImage = selectedImages.length === 1 ? selectedImages[0] : null;

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
        
        const newImage = {
          ...createDefaultImage(100, 100, dataURL),
          width,
          height
        };
        
        addImage(newImage);
        // Always select the last image from the latest store state
        const latestImages = useEditorStore.getState().images;
        if (latestImages.length > 0) {
          selectImage(latestImages[latestImages.length - 1].id);
        }
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

  const handleDuplicateSelected = () => {
    if (selectedImages.length > 0) {
      selectedImages.forEach(image => {
        duplicateImage(image.id);
      });
      // Select the duplicated images
      // Optionally, you could refresh selection here if needed
    }
  };

  const handleRemoveSelected = () => {
    if (selectedImages.length > 0 && 
        confirm(`Are you sure you want to remove ${selectedImages.length} image${selectedImages.length > 1 ? 's' : ''}?`)) {
      selectedImages.forEach(image => {
        removeImage(image.id);
      });
    }
  };

  const handlePropertyChange = (property: string, value: any) => {
    if (selectedImage) {
      updateImage(selectedImage.id, { [property]: value });
    }
  };

  const handleSelectImage = (imageId: string) => {
    selectImage(imageId);
  };

  const hasSelection = selectedImages.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Add Image Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
          Add Image:
        </span>
        
        <button
          type="button"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '8px 16px',
            fontSize: '12px',
            fontWeight: 500,
            background: loading ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '18px',
            cursor: loading ? 'not-allowed' : 'pointer',
            width: '100%',
            opacity: loading ? 0.6 : 1,
            minHeight: '32px'
          }}
          onClick={handleAddImage}
          disabled={loading}
        >
          <Upload size={12} />
          {loading ? 'Loading...' : 'Browse File'}
        </button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>

      {/* Image Operations */}
      {hasSelection && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
            Operations:
          </span>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <PluginButton
              icon={<Copy size={12} />}
              text="Duplicate"
              color="#ffc107"
              onPointerDown={handleDuplicateSelected}
            />
            <PluginButton
              icon={<Trash2 size={12} />}
              text="Remove"
              color="#dc3545"
              onPointerDown={handleRemoveSelected}
            />
          </div>
        </div>
      )}

      {/* Selection Info */}
      {hasSelection && (
        <div style={{ 
          padding: '8px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '4px',
          fontSize: '11px',
          color: '#666'
        }}>
          Editing {selectedImages.length} image{selectedImages.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Image List */}
      {images.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
            Images ({images.length}):
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflow: 'auto' }}>
            {images.map((image) => (
              <div
                key={image.id}
                style={{
                  padding: '8px',
                  backgroundColor: selection.selectedImages.includes(image.id) ? '#e3f2fd' : '#f8f9fa',
                  borderRadius: '4px',
                  border: selection.selectedImages.includes(image.id) ? '1px solid #1976d2' : '1px solid #e9ecef',
                  cursor: 'pointer'
                }}
                onClick={() => handleSelectImage(image.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ImageIcon size={16} style={{ color: '#666' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '11px', color: '#666' }}>
                      {image.width} × {image.height}
                    </div>
                    <div style={{ fontSize: '10px', color: '#999', wordBreak: 'break-all' }}>
                      {image.href.startsWith('data:') ? 'Embedded image' : image.href}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Image Properties */}
      {selectedImage && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px', borderTop: '1px solid #e9ecef' }}>
          <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
            Image Properties:
          </span>
          
          {/* Position */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <div>
              <label style={{ fontSize: '10px', color: '#666' }}>X Position</label>
              <input
                type="number"
                value={selectedImage.x}
                onChange={(e) => handlePropertyChange('x', parseFloat(e.target.value) || 0)}
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
              <label style={{ fontSize: '10px', color: '#666' }}>Y Position</label>
              <input
                type="number"
                value={selectedImage.y}
                onChange={(e) => handlePropertyChange('y', parseFloat(e.target.value) || 0)}
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

          {/* Dimensions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <div>
              <label style={{ fontSize: '10px', color: '#666' }}>Width</label>
              <input
                type="number"
                min="1"
                value={selectedImage.width}
                onChange={(e) => handlePropertyChange('width', parseFloat(e.target.value) || 1)}
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
              <label style={{ fontSize: '10px', color: '#666' }}>Height</label>
              <input
                type="number"
                min="1"
                value={selectedImage.height}
                onChange={(e) => handlePropertyChange('height', parseFloat(e.target.value) || 1)}
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

          {/* Preserve Aspect Ratio */}
          <div>
            <label style={{ fontSize: '10px', color: '#666' }}>Preserve Aspect Ratio</label>
            <select
              value={selectedImage.preserveAspectRatio || 'xMidYMid'}
              onChange={(e) => handlePropertyChange('preserveAspectRatio', e.target.value)}
              style={{
                width: '100%',
                padding: '4px',
                fontSize: '11px',
                border: '1px solid #ddd',
                borderRadius: '3px'
              }}
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
            <label style={{ fontSize: '10px', color: '#666' }}>
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
              style={{ width: '100%' }}
            />
          </div>

          {/* Transform */}
          <div>
            <label style={{ fontSize: '10px', color: '#666' }}>Transform</label>
            <input
              type="text"
              value={selectedImage.transform || ''}
              onChange={(e) => handlePropertyChange('transform', e.target.value)}
              placeholder="rotate(45) scale(1.5)"
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
      )}

      {/* Usage Instructions */}
      <div style={{ 
        padding: '8px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '4px',
        fontSize: '11px',
        color: '#666'
      }}>
        <div>• Click "Browse File" to add images from your computer</div>
        <div>• Click on an image in the list to select and edit it</div>
        <div>• Use duplicate and remove buttons for batch operations</div>
        <div>• Adjust position, size, opacity, and aspect ratio</div>
      </div>
    </div>
  );
};