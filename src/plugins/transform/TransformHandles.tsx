import React, { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { transformManager, TransformHandle, TransformBounds } from './TransformManager';
import { useMobileDetection, getControlPointSize, getInteractionRadius } from '../../hooks/useMobileDetection';

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
  const boundingBoxOpacity = shouldHideHandles ? 0 : 1;
  const baseHandleSize = getControlPointSize(isMobile, isTablet);
  const strokeWidth = 1;
  const hoverMultiplier = isMobile ? 1.3 : isTablet ? 1.4 : 1.5;
  function getCornerOffset(handle: TransformHandle, size: number) {
    const margin = (
      baseHandleSize *
      visualDebugSizes.globalFactor *
      visualDebugSizes.commandPointsFactor *
      visualDebugSizes.transformResizeFactor * 1
    )/ viewport.zoom;
    let dx = 0, dy = 0;
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    dx = handle.position.x < centerX ? -margin : margin;
    dy = handle.position.y < centerY ? -margin : margin;
    return { dx, dy };
  }

  function getEdgeOffset(handle: TransformHandle, size: number) {
    const margin = (
      baseHandleSize *
      visualDebugSizes.globalFactor *
      visualDebugSizes.commandPointsFactor *
      visualDebugSizes.transformResizeFactor * 1
    )/ viewport.zoom;
    let dx = 0, dy = 0;
    
    // Apply offset based on edge direction
    switch (handle.id) {
      case 'n': // Top edge
        dy = -margin;
        break;
      case 's': // Bottom edge
        dy = margin;
        break;
      case 'e': // Right edge
        dx = margin;
        break;
      case 'w': // Left edge
        dx = -margin;
        break;
    }
    return { dx, dy };
  }
  return (
    <g className="transform-handles">
      <rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        fill="none"
        stroke="#007acc"
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
        strokeDasharray="4,2"
        pointerEvents="none"
        opacity={boundingBoxOpacity}
        style={{ transition: 'opacity 0.2s ease' }}
      />
      {handles.map((handle) => {
        const isHovered = hoveredHandle === handle.id;
        const sizeFactor = handle.type === 'corner' || handle.type === 'edge'
          ? visualDebugSizes.transformResizeFactor 
          : visualDebugSizes.transformRotateFactor;
        const handleSize = baseHandleSize * visualDebugSizes.globalFactor * sizeFactor;
        const hoverSize = handleSize * hoverMultiplier;
        const currentSize = isHovered ? hoverSize : handleSize;
        let offset = { dx: 0, dy: 0 };
        if (handle.type === 'corner') {
          offset = getCornerOffset(handle, currentSize);
        } else if (handle.type === 'edge') {
          offset = getEdgeOffset(handle, currentSize);
        }
        return (
          <g
            key={handle.id}
            style={{ 
              opacity: handleOpacity,
              transition: 'opacity 0.2s ease'
            }}
            onPointerEnter={() => setHoveredHandle(handle.id)}
            onPointerLeave={() => setHoveredHandle(null)}
            data-transform-handle={handle.id}
          >
            {handle.type === 'corner' ? (
              <g transform={`translate(${handle.position.x + offset.dx},${handle.position.y + offset.dy}) scale(${1 / viewport.zoom}) translate(${-(handle.position.x + offset.dx)},${-(handle.position.y + offset.dy)})`}>
                {/* Visual resize handle */}
                <rect
                  x={handle.position.x + offset.dx - currentSize / 2}
                  y={handle.position.y + offset.dy - currentSize / 2}
                  width={currentSize}
                  height={currentSize}
                  fill="#007acc"
                  fillOpacity={0.3}
                  stroke="#007acc"
                  strokeWidth={strokeWidth}
                  vectorEffect="non-scaling-stroke"
                  style={{
                    pointerEvents: 'none',
                    transition: 'all 0.1s ease'
                  }}
                />
                {/* Interaction overlay */}
                <rect
                  x={handle.position.x + offset.dx - getInteractionRadius(currentSize / 2, isMobile, isTablet)}
                  y={handle.position.y + offset.dy - getInteractionRadius(currentSize / 2, isMobile, isTablet)}
                  width={getInteractionRadius(currentSize / 2, isMobile, isTablet) * 2}
                  height={getInteractionRadius(currentSize / 2, isMobile, isTablet) * 2}
                  fill="transparent"
                  stroke="none"
                  className="transform-resize-interaction-overlay"
                  data-handle-id={handle.id}
                  data-handle-type="transform"
                  style={{
                    cursor: handle.cursor
                  }}
                />
              </g>
            ) : handle.type === 'edge' ? (
              <g transform={`translate(${handle.position.x + offset.dx},${handle.position.y + offset.dy}) scale(${1 / viewport.zoom}) translate(${-(handle.position.x + offset.dx)},${-(handle.position.y + offset.dy)})`}>
                {/* Visual edge handle */}
                <rect
                  x={handle.position.x + offset.dx - currentSize / 2}
                  y={handle.position.y + offset.dy - currentSize / 2}
                  width={currentSize}
                  height={currentSize}
                  fill="#28a745"
                  fillOpacity={0.4}
                  stroke="#28a745"
                  strokeWidth={strokeWidth}
                  vectorEffect="non-scaling-stroke"
                  style={{
                    pointerEvents: 'none',
                    transition: 'all 0.1s ease'
                  }}
                />
                {/* Interaction overlay */}
                <rect
                  x={handle.position.x + offset.dx - getInteractionRadius(currentSize / 2, isMobile, isTablet)}
                  y={handle.position.y + offset.dy - getInteractionRadius(currentSize / 2, isMobile, isTablet)}
                  width={getInteractionRadius(currentSize / 2, isMobile, isTablet) * 2}
                  height={getInteractionRadius(currentSize / 2, isMobile, isTablet) * 2}
                  fill="transparent"
                  stroke="none"
                  className="transform-resize-interaction-overlay"
                  data-handle-id={handle.id}
                  data-handle-type="transform"
                  style={{
                    cursor: handle.cursor
                  }}
                />
              </g>
            ) : (
              <g transform={`translate(${handle.position.x + currentSize / 2},${handle.position.y + currentSize / 2}) scale(${1 / viewport.zoom}) translate(${-(handle.position.x + currentSize / 2)},${-(handle.position.y + currentSize / 2)})`}>
                {/* Visual rotation handle */}
                <circle
                  cx={handle.position.x + currentSize / 2}
                  cy={handle.position.y + currentSize / 2}
                  r={currentSize / 2}
                  fill="#007acc"
                  fillOpacity={0.3}
                  stroke="#007acc"
                  strokeWidth={strokeWidth}
                  vectorEffect="non-scaling-stroke"
                  style={{
                    pointerEvents: 'none',
                    transition: 'all 0.1s ease'
                  }}
                />
                {/* Interaction overlay */}
                <circle
                  cx={handle.position.x + currentSize / 2}
                  cy={handle.position.y + currentSize / 2}
                  r={getInteractionRadius(currentSize / 2, isMobile, isTablet)}
                  fill="transparent"
                  stroke="none"
                  className="transform-rotate-interaction-overlay"
                  data-handle-id={handle.id}
                  data-handle-type="rotation"
                  style={{
                    cursor: handle.cursor
                  }}
                />
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
};
