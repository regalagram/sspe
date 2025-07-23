import React from 'react';
import { useEditorStore } from '../../store/editorStore';
export const ImageRenderer: React.FC = () => {
  const { images, selection, viewport } = useEditorStore();
  if (images.length === 0) return null;
  const handleImageError = (imageId: string) => {
    console.warn(`Failed to load image: ${imageId}`);
  };
  return (
    <g data-layer="images">
      {images.map((image) => {
        if (image.locked) return null;
        const isSelected = selection.selectedImages.includes(image.id);
        const strokeWidth = 1 / viewport.zoom;
        return (
          <g key={image.id} data-image-id={image.id}>
            <image
              x={image.x}
              y={image.y}
              width={image.width}
              height={image.height}
              href={image.href}
              preserveAspectRatio={image.preserveAspectRatio || 'xMidYMid'}
              transform={image.transform}
              style={{
                opacity: image.style?.opacity ?? 1,
                clipPath: image.style?.clipPath,
                mask: image.style?.mask,
                filter: image.style?.filter,
              }}
              data-element-type="image"
              data-element-id={image.id}
              onError={() => handleImageError(image.id)}
            />
            {isSelected && (
              <rect
                x={image.x}
                y={image.y}
                width={image.width}
                height={image.height}
                fill="none"
                stroke="#007bff"
                strokeWidth={strokeWidth}
                strokeDasharray={`${2 / viewport.zoom} ${2 / viewport.zoom}`}
                pointerEvents="none"
              />
            )}
          </g>
        );
      })}
    </g>
  );
};