import React from 'react';
import { TransformBounds } from './TransformManager';

interface DimensionsInfoProps {
  bounds: TransformBounds;
  viewport: { zoom: number };
}

export const DimensionsInfo: React.FC<DimensionsInfoProps> = ({ bounds, viewport }) => {
  // Calculate the position below the bounding box (in world coordinates, so it appears at a fixed screen distance)
  // Increased distance to avoid overlapping with the bottom edge handle
  const screenDistance = 40; // px in screen space - increased from 20 to avoid handle overlap
  const infoY = bounds.y + bounds.height + screenDistance / viewport.zoom;
  const infoX = bounds.x + bounds.width / 2; // Center horizontally
  
  // Format dimensions to show reasonable precision
  const formatDimension = (value: number): string => {
    if (Math.abs(value) < 0.01) return '0';
    if (Math.abs(value) < 1) return value.toFixed(2);
    if (Math.abs(value) < 10) return value.toFixed(1);
    return Math.round(value).toString();
  };

  const width = formatDimension(Math.abs(bounds.width));
  const height = formatDimension(Math.abs(bounds.height));
  const dimensionText = `${width} × ${height}`;

  // Calculate text dimensions for background sizing (in screen space)
  const fontSize = 12;
  const padding = 6;
  const textWidth = dimensionText.length * fontSize * 0.6; // Approximate text width
  const boxWidth = textWidth + padding * 2;
  const boxHeight = fontSize + padding * 2;
  // Ensure the info box doesn't go outside reasonable bounds (in world coordinates)
  const safeInfoX = Math.max(boxWidth / 2 / viewport.zoom, Math.min(infoX, bounds.x + bounds.width - boxWidth / 2 / viewport.zoom));
  
  return (
    <g
      transform={`translate(${safeInfoX},${infoY}) scale(${1 / viewport.zoom})`}
      style={{ pointerEvents: 'none' }}
    >
      {/* Background rectangle */}
      <rect
        x={-boxWidth / 2}
        y={-boxHeight / 2}
        width={boxWidth}
        height={boxHeight}
        fill="rgba(0, 0, 0, 0.85)"
        rx={4}
      />

      {/* Dimensions text */}
      <text
        x={0}
        y={fontSize / 3}
        textAnchor="middle"
        fontSize={fontSize}
        fill="white"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="500"
      >
        {dimensionText}
      </text>

      {/* Optional: Add a subtle connection line to the bounding box */}
      <line
        x1={0}
        y1={-(boxHeight / 2)}
        x2={0}
        y2={-(boxHeight / 2 + 8)}
        stroke="rgba(255, 255, 255, 0.3)"
        strokeWidth={1}
      />
    </g>
  );
};
