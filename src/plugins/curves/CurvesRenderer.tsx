import React from 'react';
import { useEditorStore } from '../../store/editorStore';
import { curvesManager, CurveToolMode } from './CurvesManager';

export const CurvesRenderer: React.FC = () => {
  const { viewport } = useEditorStore();
  const curveState = curvesManager.getState();

  if (!curveState.isActive) return null;

  const handleRadius = 4;
  const handleLineWidth = 1;
  const pointRadius = 3;
  const selectedPointRadius = 4;

  return (
    <g className="curves-overlay">
      {/* Render existing curve points */}
      {curveState.points.map((point, index) => (
        <g key={point.id}>
          {/* Handle lines */}
          {point.handleIn && (
            <line
              x1={point.x}
              y1={point.y}
              x2={point.handleIn.x}
              y2={point.handleIn.y}
              stroke="#007acc"
              strokeWidth={handleLineWidth}
              strokeDasharray="3,3"
            />
          )}
          {point.handleOut && (
            <line
              x1={point.x}
              y1={point.y}
              x2={point.handleOut.x}
              y2={point.handleOut.y}
              stroke="#007acc"
              strokeWidth={handleLineWidth}
              strokeDasharray="3,3"
            />
          )}
          
          {/* Handle control points */}
          {point.handleIn && (
            <circle
              cx={point.handleIn.x}
              cy={point.handleIn.y}
              r={handleRadius}
              fill="white"
              stroke="#007acc"
              strokeWidth={handleLineWidth}
              className="curve-handle"
              style={{ cursor: 'pointer' }}
            />
          )}
          {point.handleOut && (
            <circle
              cx={point.handleOut.x}
              cy={point.handleOut.y}
              r={handleRadius}
              fill="white"
              stroke="#007acc"
              strokeWidth={handleLineWidth}
              className="curve-handle"
              style={{ cursor: 'pointer' }}
            />
          )}
          
          {/* Point */}
          <circle
            cx={point.x}
            cy={point.y}
            r={point.selected ? selectedPointRadius : pointRadius}
            fill={point.selected ? '#007acc' : 'white'}
            stroke="#007acc"
            strokeWidth={2}
            className="curve-point"
            style={{ cursor: 'pointer' }}
          />
          
          {/* Point type indicator */}
          {point.type === 'corner' && (
            <rect
              x={point.x - 2}
              y={point.y - 2}
              width={4}
              height={4}
              fill={point.selected ? 'white' : '#007acc'}
            />
          )}
          
          {/* Point index label for debugging */}
          {point.selected && (
            <text
              x={point.x + 8}
              y={point.y - 8}
              fontSize="10"
              fill="#007acc"
              fontFamily="Arial, sans-serif"
            >
              {index + 1}
            </text>
          )}
        </g>
      ))}

      {/* Preview line when creating */}
      {curveState.mode === CurveToolMode.CREATING && 
       curveState.points.length > 0 && 
       curveState.previewPoint && (
        <line
          x1={curveState.points[curveState.points.length - 1].x}
          y1={curveState.points[curveState.points.length - 1].y}
          x2={curveState.previewPoint.x}
          y2={curveState.previewPoint.y}
          stroke="#007acc"
          strokeWidth={1}
          strokeDasharray="5,5"
          opacity={0.7}
        />
      )}

      {/* Preview point when hovering */}
      {curveState.previewPoint && curveState.mode === CurveToolMode.CREATING && (
        <circle
          cx={curveState.previewPoint.x}
          cy={curveState.previewPoint.y}
          r={pointRadius}
          fill="white"
          stroke="#007acc"
          strokeWidth={1}
          strokeDasharray="3,3"
          opacity={0.7}
        />
      )}

      {/* Path preview */}
      {curveState.points.length > 1 && (
        <path
          d={generatePathData(curveState.points)}
          fill="none"
          stroke="#007acc"
          strokeWidth={2}
          strokeDasharray="5,5"
          opacity={0.6}
        />
      )}

      {/* Closing path indicator */}
      {curveState.points.length > 2 && curveState.previewPoint && (
        (() => {
          const firstPoint = curveState.points[0];
          const distance = Math.sqrt(
            Math.pow(firstPoint.x - curveState.previewPoint.x, 2) + 
            Math.pow(firstPoint.y - curveState.previewPoint.y, 2)
          );
          
          if (distance < 20) {
            return (
              <>
                <circle
                  cx={firstPoint.x}
                  cy={firstPoint.y}
                  r={pointRadius + 5}
                  fill="none"
                  stroke="#007acc"
                  strokeWidth={2}
                  opacity={0.7}
                />
                <text
                  x={firstPoint.x + 15}
                  y={firstPoint.y - 10}
                  fontSize="12"
                  fill="#007acc"
                  fontFamily="Arial, sans-serif"
                >
                  Close Path
                </text>
              </>
            );
          }
          return null;
        })()
      )}

      {/* Instructions overlay */}
      {curveState.mode === CurveToolMode.CREATING && curveState.points.length === 0 && (
        <text
          x={viewport.viewBox.width / 2}
          y={viewport.viewBox.height / 2}
          fontSize="16"
          fill="#007acc"
          fontFamily="Arial, sans-serif"
          textAnchor="middle"
          opacity={0.7}
        >
          Click to create points, drag to create smooth curves
        </text>
      )}
    </g>
  );
};

function generatePathData(points: any[]): string {
  if (points.length < 2) return '';

  let pathData = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    const prevPoint = points[i - 1];

    if (point.type === 'corner' && !prevPoint.handleOut) {
      pathData += ` L ${point.x} ${point.y}`;
    } else {
      const cp1 = prevPoint.handleOut || { x: prevPoint.x, y: prevPoint.y };
      const cp2 = point.handleIn || { x: point.x, y: point.y };
      pathData += ` C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${point.x} ${point.y}`;
    }
  }

  return pathData;
}
