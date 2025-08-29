import React, { useState, useEffect } from 'react';
import { useEditorStore } from '../store/editorStore';
import { shapeManager } from '../plugins/shapes/ShapeManager';
import { getShapeById } from '../plugins/shapes/ShapeDefinitions';

export const ShapePreview: React.FC = () => {
  const { viewport } = useEditorStore();
  const toolSettings = useEditorStore((state) => state.toolSettings?.shared);
  const [, forceUpdate] = useState({});

  // Force re-render during drag operations
  useEffect(() => {
    let animationFrame: number;
    
    const updatePreview = () => {
      if (shapeManager.isDragInProgress()) {
        forceUpdate({});
        animationFrame = requestAnimationFrame(updatePreview);
      }
    };

    // Start update loop if drag is in progress
    if (shapeManager.isDragInProgress()) {
      animationFrame = requestAnimationFrame(updatePreview);
    }

    // Check every 16ms (60fps) for drag state changes
    const interval = setInterval(() => {
      if (shapeManager.isDragInProgress()) {
        if (!animationFrame) {
          animationFrame = requestAnimationFrame(updatePreview);
        }
      } else {
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
          animationFrame = 0;
        }
        forceUpdate({});
      }
    }, 16);

    return () => {
      clearInterval(interval);
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  // Check if we should show preview
  const isDragging = shapeManager.isDragInProgress();
  const shapeId = shapeManager.getCurrentShapeId();
  const startPoint = shapeManager.getDragStartPoint();
  const currentPoint = shapeManager.getDragCurrentPoint();
  const previewSize = shapeManager.getPreviewSize();

  if (!isDragging || !shapeId || !startPoint || !currentPoint || !toolSettings) {
    return null;
  }

  const shapeTemplate = getShapeById(shapeId);
  if (!shapeTemplate) {
    return null;
  }

  // Generate preview commands
  const commands = shapeTemplate.generateCommands(startPoint, previewSize);
  
  // Convert commands to path string
  const pathString = commands.map(cmd => {
    if (cmd.command === 'M') {
      return `M ${cmd.x} ${cmd.y}`;
    } else if (cmd.command === 'L') {
      return `L ${cmd.x} ${cmd.y}`;
    } else if (cmd.command === 'C') {
      return `C ${cmd.x1} ${cmd.y1} ${cmd.x2} ${cmd.y2} ${cmd.x} ${cmd.y}`;
    } else if (cmd.command === 'Z') {
      return 'Z';
    }
    return '';
  }).join(' ');

  // Use toolbar settings for styling - same as final shape will have
  const fill = toolSettings.fill || '#0078cc';
  const fillOpacity = toolSettings.fillOpacity || 0.3;
  const strokeColor = toolSettings.strokeColor || '#6b7280';
  const strokeWidth = Math.max((toolSettings.strokeWidth || 3) / viewport.zoom, 0.5);
  const strokeOpacity = toolSettings.strokeOpacity || 1.0;
  const strokeDasharray = toolSettings.strokeDasharray && toolSettings.strokeDasharray !== 'none' 
    ? toolSettings.strokeDasharray 
    : `${4 / viewport.zoom} ${2 / viewport.zoom}`; // Preview dashed style
  const strokeLinecap = toolSettings.strokeLinecap || 'round';
  const strokeLinejoin = toolSettings.strokeLinejoin || 'round';

  return (
    <g className="shape-preview">
      <path
        d={pathString}
        fill={fill}
        fillOpacity={fillOpacity}
        stroke={strokeColor}
        strokeOpacity={strokeOpacity}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        strokeLinecap={strokeLinecap}
        strokeLinejoin={strokeLinejoin}
        pointerEvents="none"
      />
      {/* Show drag line for reference */}
      <line
        x1={startPoint.x}
        y1={startPoint.y}
        x2={currentPoint.x}
        y2={currentPoint.y}
        stroke="#666"
        strokeWidth={Math.max(3 / viewport.zoom, 1)}
        strokeLinecap="round"
        pointerEvents="none"
        opacity={0.7}
      />
      {/* Show size indicator */}
      <text
        x={startPoint.x + (currentPoint.x - startPoint.x) / 2}
        y={startPoint.y + (currentPoint.y - startPoint.y) / 2 - 10 / viewport.zoom}
        fontSize={`${12 / viewport.zoom}px`}
        fontWeight="bold"
        fill="#666"
        textAnchor="middle"
        pointerEvents="none"
      >
        {Math.round(previewSize)}
      </text>
    </g>
  );
};