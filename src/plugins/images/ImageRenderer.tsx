import React from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useAnimationsForElement } from '../../components/AnimationRenderer';
// Individual Image Element Component that can use hooks
const ImageElementComponent: React.FC<{ image: any }> = ({ image }) => {
  const { selection, viewport } = useEditorStore();
  const animations = useAnimationsForElement(image.id);
  
  const isSelected = selection.selectedImages.includes(image.id);
  const strokeWidth = 1 / viewport.zoom;

  const handleImageError = (imageId: string) => {
    console.warn(`Failed to load image: ${imageId}`);
  };

  return (
    <g key={image.id} data-image-id={image.id}>
      <image
        id={image.id}
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
      {/* Include animations as siblings that target the image */}
      {animations}
      
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
};

export const ImageRenderer: React.FC = () => {
  const { images } = useEditorStore();
  if (images.length === 0) return null;

  return (
    <g data-layer="images">
      {images.map((image) => {
        if (image.locked) return null;
        return <ImageElementComponent key={image.id} image={image} />;
      })}
    </g>
  );
};