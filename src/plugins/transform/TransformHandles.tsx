import React, { useState } from 'react';

import { useEditorStore } from '../../store/editorStore';
import { transformManager, TransformHandle, TransformBounds } from './TransformManager';
import { useMobileDetection, getControlPointSize } from '../../hooks/useMobileDetection';

interface TransformHandlesProps {
  bounds: TransformBounds;
  handles: TransformHandle[];
}


export const TransformHandles: React.FC<TransformHandlesProps> = ({ bounds, handles }) => {
  const { viewport, visualDebugSizes } = useEditorStore();
  const { isMobile, isTablet } = useMobileDetection();
  const [hoveredHandle, setHoveredHandle] = useState<string | null>(null);


  if (!bounds || handles.length === 0) {
    return null;
  }

  const isTransforming = transformManager.isTransforming();
  const isMoving = transformManager.isMoving();
  const shouldHideHandles = isTransforming || isMoving;
  const handleOpacity = shouldHideHandles ? 0 : 1;
  // Keep bounding box slightly visible during transform, fully visible during movement
  const boundingBoxOpacity = isTransforming ? 0.3 : 1;

  // Calcular tamaño responsivo para los handles con factores de tamaño
  const baseHandleSize = getControlPointSize(isMobile, isTablet);
  const strokeWidth = 1.5 / viewport.zoom;
  // Menor multiplier de hover en móviles para evitar que se pongan demasiado grandes
  const hoverMultiplier = isMobile ? 1.3 : isTablet ? 1.4 : 1.5;


  return (
    <g className="transform-handles">
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
        opacity={boundingBoxOpacity}
        style={{ transition: 'opacity 0.2s ease' }}
      />

      {/* Transform handles */}
      {handles.map((handle) => {
        const isHovered = hoveredHandle === handle.id;
        
        // Calcular tamaño específico para cada tipo de handle
        const sizeFactor = handle.type === 'corner' 
          ? visualDebugSizes.transformResizeFactor 
          : visualDebugSizes.transformRotateFactor;
        
        const handleSize = (baseHandleSize * visualDebugSizes.globalFactor * sizeFactor) / viewport.zoom;
        const hoverSize = handleSize * hoverMultiplier;
        const currentSize = isHovered ? hoverSize : handleSize;

        return (
          <g
            key={handle.id}
            style={{ 
              pointerEvents: 'all', 
              cursor: handle.cursor,
              opacity: handleOpacity,
              transition: 'opacity 0.2s ease'
            }}
            onMouseEnter={() => setHoveredHandle(handle.id)}
            onMouseLeave={() => setHoveredHandle(null)}
            data-transform-handle={handle.id}
          >
            {handle.type === 'corner' ? (
              /* Square corner handles for scaling */
              <rect
                x={handle.position.x}
                y={handle.position.y}
                width={currentSize}
                height={currentSize}
                fill="white"
                stroke="#007acc"
                strokeWidth={strokeWidth}
                data-handle-id={handle.id}
                data-handle-type="transform"
                style={{
                  pointerEvents: 'all',
                  cursor: handle.cursor,
                  transition: 'all 0.1s ease'
                }}
              />
            ) : (
              /* Circular rotation handle */
              <g>
                {/* Connection line from bounding box to rotation handle */}
                <line
                  x1={bounds.x + bounds.width / 2}
                  y1={bounds.y}
                  x2={handle.position.x + currentSize / 2}
                  y2={handle.position.y + currentSize / 2}
                  stroke="#28a745"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${2 / viewport.zoom},${2 / viewport.zoom}`}
                />
                {/* Rotation handle circle */}
                <circle
                  cx={handle.position.x + currentSize / 2}
                  cy={handle.position.y + currentSize / 2}
                  r={currentSize / 2}
                  fill="white"
                  stroke="#28a745"
                  strokeWidth={strokeWidth}
                  data-handle-id={handle.id}
                  data-handle-type="rotation"
                  style={{
                    pointerEvents: 'all',
                    cursor: handle.cursor,
                    transition: 'all 0.1s ease'
                  }}
                />
                {/* Rotation symbol ↻ */}
                <text
                  x={handle.position.x + currentSize / 2}
                  y={handle.position.y + currentSize / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={`${currentSize * 0.8}px`}
                  fill="#28a745"
                  style={{
                    pointerEvents: 'none',
                    userSelect: 'none',
                    fontFamily: 'monospace',
                    fontWeight: 'bold'
                  }}
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
