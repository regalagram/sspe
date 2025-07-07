import React from 'react';
import { TransformBounds } from './TransformManager';

interface DimensionsInfoProps {
  bounds: TransformBounds;
  viewport: { zoom: number };
}

export const DimensionsInfo: React.FC<DimensionsInfoProps> = ({ bounds, viewport }) => {
  // Calculate the position below the bounding box
  const infoY = bounds.y + bounds.height + 20 / viewport.zoom;
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

  // Calculate text dimensions for background sizing
  const fontSize = Math.max(10, 12 / viewport.zoom);
  const padding = Math.max(4, 6 / viewport.zoom);
  const textWidth = dimensionText.length * fontSize * 0.6; // Approximate text width
  const boxWidth = textWidth + padding * 2;
  const boxHeight = fontSize + padding * 2;
  
  // Ensure the info box doesn't go outside reasonable bounds
  const safeInfoX = Math.max(boxWidth / 2, Math.min(infoX, bounds.x + bounds.width - boxWidth / 2));
  
  return (
    <g>
      {/* Background rectangle */}
      <rect
        x={safeInfoX - boxWidth / 2}
        y={infoY - boxHeight / 2}
        width={boxWidth}
        height={boxHeight}
        fill="rgba(0, 0, 0, 0.85)"
        rx={Math.max(2, 4 / viewport.zoom)}
        pointerEvents="none"
      />
      
      {/* Dimensions text */}
      <text
        x={safeInfoX}
        y={infoY + fontSize / 3} // Adjust for text baseline
        textAnchor="middle"
        fontSize={fontSize}
        fill="white"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="500"
        pointerEvents="none"
      >
        {dimensionText}
      </text>
      
      {/* Optional: Add a subtle connection line to the bounding box */}
      <line
        x1={safeInfoX}
        y1={bounds.y + bounds.height + Math.max(1, 2 / viewport.zoom)}
        x2={safeInfoX}
        y2={infoY - boxHeight / 2}
        stroke="rgba(255, 255, 255, 0.3)"
        strokeWidth={Math.max(0.5, 1 / viewport.zoom)}
        pointerEvents="none"
      />
    </g>
  );
};
