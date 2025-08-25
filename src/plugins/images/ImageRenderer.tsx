import React from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useAnimationsForElement } from '../../components/AnimationRenderer';
import { getStyleValue } from '../../utils/gradient-utils';
// Individual Image Element Component that can use hooks
const ImageElementComponent: React.FC<{ image: any }> = ({ image }) => {
  const { selection, viewport, enabledFeatures } = useEditorStore();
  const animations = useAnimationsForElement(image.id);
  
  const isSelected = selection.selectedImages.includes(image.id);
  const isWireframeMode = enabledFeatures.wireframeEnabled;
  const strokeWidth = 1 / viewport.zoom;

  const handleImageError = (imageId: string) => {
    console.warn(`Failed to load image: ${imageId}`);
  };

  return (
    <g key={image.id} data-image-id={image.id}>
      {/* Render as wireframe or normal image depending on mode */}
      {isWireframeMode ? (
        // Wireframe mode: render as outlined rectangle with optional label
        <g>
          <rect
            x={image.x}
            y={image.y}
            width={image.width}
            height={image.height}
            fill="none"
            stroke="#000000"
            strokeWidth={strokeWidth * 2}
            transform={image.transform}
            data-element-type="image"
            data-element-id={image.id}
            data-locked={image.locked}
            style={{
              opacity: image.locked ? 0.6 : 1,
            }}
          />
          {/* Optional diagonal lines to indicate it's an image */}
          <line
            x1={image.x}
            y1={image.y}
            x2={image.x + image.width}
            y2={image.y + image.height}
            stroke="#000000"
            strokeWidth={strokeWidth}
            transform={image.transform}
            style={{
              opacity: image.locked ? 0.6 : 0.3,
              pointerEvents: 'none'
            }}
          />
          <line
            x1={image.x + image.width}
            y1={image.y}
            x2={image.x}
            y2={image.y + image.height}
            stroke="#000000"
            strokeWidth={strokeWidth}
            transform={image.transform}
            style={{
              opacity: image.locked ? 0.6 : 0.3,
              pointerEvents: 'none'
            }}
          />
          {/* Small "IMG" label in corner */}
          <text
            x={image.x + 4}
            y={image.y + 12}
            fontSize={10 / viewport.zoom}
            fill="#000000"
            style={{
              opacity: image.locked ? 0.6 : 0.7,
              pointerEvents: 'none',
              fontFamily: 'monospace'
            }}
            transform={image.transform}
          >
            IMG
          </text>
        </g>
      ) : (
        // Normal mode: render actual image
        <>
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
              opacity: image.locked ? (image.style?.opacity ?? 1) * 0.6 : (image.style?.opacity ?? 1),
              clipPath: image.style?.clipPath,
              mask: image.style?.mask,
              filter: image.style?.filter,
              fill: image.style?.fill,
              fillOpacity: image.style?.fillOpacity,
            }}
            data-element-type="image"
            data-element-id={image.id}
            data-locked={image.locked}
            onError={() => handleImageError(image.id)}
          />
          {/* Stroke overlay - SVG images don't support stroke natively */}
          {image.style?.stroke && (
            <rect
              x={image.x}
              y={image.y}
              width={image.width}
              height={image.height}
              fill="none"
              stroke={getStyleValue(image.style.stroke)}
              strokeWidth={image.style.strokeWidth || 1}
              strokeDasharray={image.style.strokeDasharray}
              strokeLinecap={image.style.strokeLinecap}
              strokeLinejoin={image.style.strokeLinejoin}
              strokeOpacity={image.style.strokeOpacity}
              opacity={image.locked ? 0.6 : 1}
              transform={image.transform}
              vectorEffect="non-scaling-stroke"
              style={{
                pointerEvents: 'none'
              }}
              data-stroke-overlay="true"
              data-element-type="image-stroke"
              data-element-id={image.id}
            />
          )}
        </>
      )}
      {/* Include animations as siblings that target the image */}
      {animations}
      
      {isSelected && !image.locked && (
        <rect
          x={image.x}
          y={image.y}
          width={image.width}
          height={image.height}
          fill="none"
          stroke="#ffc107"
          strokeWidth={strokeWidth}
          strokeDasharray={`${2 / viewport.zoom} ${2 / viewport.zoom}`}
          pointerEvents="none"
          transform={image.transform}
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
      {images.map((image) => (
        <ImageElementComponent key={image.id} image={image} />
      ))}
    </g>
  );
};