import React, { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { transformManager, TransformHandle, TransformBounds } from './TransformManager';

interface TransformHandlesProps {
  bounds: TransformBounds;
  handles: TransformHandle[];
}

export const TransformHandles: React.FC<TransformHandlesProps> = ({ bounds, handles }) => {
  const { viewport } = useEditorStore();
  const [hoveredHandle, setHoveredHandle] = useState<string | null>(null);

  console.log('TransformHandles: Rendering with', { bounds, handlesCount: handles.length });

  if (!bounds || handles.length === 0) {
    console.log('TransformHandles: Not rendering - no bounds or handles');
    return null;
  }

  const handleSize = 8 / viewport.zoom;
  const strokeWidth = 1.5 / viewport.zoom;
  const hoverSize = handleSize * 1.5;

  return (
    <g className="transform-handles" style={{ pointerEvents: 'none' }}>
      {/* Bounding box outline */}
      <rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        fill="none"
        stroke="#007acc"
        strokeWidth={strokeWidth}
        strokeDasharray={`${4 / viewport.zoom},${2 / viewport.zoom}`}
        pointerEvents="none"
      />

      {/* Transform handles */}
      {handles.map((handle) => {
        const isHovered = hoveredHandle === handle.id;
        const currentSize = isHovered ? hoverSize : handleSize;
        
        return (
          <g 
            key={handle.id} 
            style={{ pointerEvents: 'all', cursor: handle.cursor }}
            onMouseEnter={() => setHoveredHandle(handle.id)}
            onMouseLeave={() => setHoveredHandle(null)}
          >
            {handle.type === 'corner' ? (
              // Square corner handles for scaling
              <rect
                x={handle.position.x - (currentSize - handleSize) / 2}
                y={handle.position.y - (currentSize - handleSize) / 2}
                width={currentSize}
                height={currentSize}
                fill="white"
                stroke="#007acc"
                strokeWidth={strokeWidth}
                data-handle-id={handle.id}
                style={{
                  pointerEvents: 'all',
                  cursor: handle.cursor,
                  transition: 'all 0.1s ease'
                }}
              />
            ) : (
              // Circular rotation handles
              <circle
                cx={handle.position.x + handleSize / 2}
                cy={handle.position.y + handleSize / 2}
                r={currentSize / 2}
                fill="white"
                stroke="#28a745"
                strokeWidth={strokeWidth}
                data-handle-id={handle.id}
                style={{
                  pointerEvents: 'all',
                  cursor: handle.cursor,
                  transition: 'all 0.1s ease'
                }}
              />
            )}
            
            {/* Show rotation indicator when hovering near corners */}
            {handle.type === 'corner' && isHovered && (
              <g opacity="0.7">
                <circle
                  cx={handle.position.x + handleSize / 2}
                  cy={handle.position.y + handleSize / 2}
                  r={handleSize * 2}
                  fill="none"
                  stroke="#28a745"
                  strokeWidth={strokeWidth / 2}
                  strokeDasharray={`${2 / viewport.zoom},${2 / viewport.zoom}`}
                  pointerEvents="none"
                />
                <text
                  x={handle.position.x + handleSize / 2}
                  y={handle.position.y + handleSize / 2 + 3 / viewport.zoom}
                  textAnchor="middle"
                  fontSize={8 / viewport.zoom}
                  fill="#28a745"
                  pointerEvents="none"
                >
                  ↻
                </text>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
};
