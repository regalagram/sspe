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
  const strokeWidth = 1 / viewport.zoom;
  // Menor multiplier de hover en móviles para evitar que se pongan demasiado grandes
  const hoverMultiplier = isMobile ? 1.3 : isTablet ? 1.4 : 1.5;


  // Función para calcular el offset de cada esquina, usando la dirección de la esquina
  function getCornerOffset(handle: TransformHandle, size: number) {
    // El margen depende de los factores visuales y el zoom
    const margin = (
      baseHandleSize *
      visualDebugSizes.globalFactor *
      visualDebugSizes.commandPointsFactor *
      visualDebugSizes.transformResizeFactor * 1
    )/ viewport.zoom;

    // Determinar la dirección de la esquina
    // NW: (-margin, -margin)
    // NE: (+margin, -margin)
    // SW: (-margin, +margin)
    // SE: (+margin, +margin)
    let dx = 0, dy = 0;
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    dx = handle.position.x < centerX ? -margin : margin;
    dy = handle.position.y < centerY ? -margin : margin;
    return { dx, dy };
  }

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

        // Debug: mostrar posiciones en consola
        if (handle.type === 'corner') {
          console.log('Handle:', handle.id, 'Pos:', handle.position, 'BBox:', bounds, 'currentSize:', currentSize, 'Offset:', getCornerOffset(handle, currentSize));
        }

        // Calcular offset para handles de esquina
        let offset = { dx: 0, dy: 0 };
        if (handle.type === 'corner') {
          offset = getCornerOffset(handle, currentSize);
        }

        return (
          <g
            key={handle.id}
            style={{ 
              pointerEvents: 'all', 
              cursor: handle.cursor,
              opacity: handleOpacity,
              transition: 'opacity 0.2s ease'
            }}
            onPointerEnter={() => setHoveredHandle(handle.id)}
            onPointerLeave={() => setHoveredHandle(null)}
            data-transform-handle={handle.id}
          >
            {handle.type === 'corner' ? (
              /* Square corner handles for scaling */
              <rect
                x={handle.position.x + offset.dx - currentSize / 2}
                y={handle.position.y + offset.dy - currentSize / 2}
                width={currentSize}
                height={currentSize}
                fill="#007acc"
                fillOpacity={0.3}
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

                {/* Rotation handle circle */}
                <circle
                  cx={handle.position.x + currentSize / 2}
                  cy={handle.position.y + currentSize / 2}
                  r={currentSize / 2}
                  fill="#007acc"
                  fillOpacity={0.3}
                  stroke="#007acc"
                  strokeWidth={strokeWidth}
                  data-handle-id={handle.id}
                  data-handle-type="rotation"
                  style={{
                    pointerEvents: 'all',
                    cursor: handle.cursor,
                    transition: 'all 0.1s ease'
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
