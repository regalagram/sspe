import React, { useState, useEffect, useRef } from 'react';
import { useEditorStore } from '../store/editorStore';
import { shapeManager } from '../plugins/shapes/ShapeManager';
import { getShapeById } from '../plugins/shapes/ShapeDefinitions';

export const ShapePreview: React.FC = () => {
  const { viewport } = useEditorStore();
  const toolSettings = useEditorStore((state) => state.toolSettings?.shared);
  const [updateCounter, setUpdateCounter] = useState(0);
  const rafIdRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clean animation frame management
  const startAnimation = () => {
    if (rafIdRef.current !== null) return; // Already running
    
    const animate = () => {
      if (shapeManager.isDragInProgress()) {
        setUpdateCounter(prev => prev + 1);
        rafIdRef.current = requestAnimationFrame(animate);
      } else {
        rafIdRef.current = null;
      }
    };
    
    rafIdRef.current = requestAnimationFrame(animate);
  };

  const stopAnimation = () => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  };

  // Monitor drag state and control animation
  useEffect(() => {
    let isCleaningUp = false;
    
    const checkDragState = () => {
      if (isCleaningUp) return;
      
      if (shapeManager.isDragInProgress()) {
        if (rafIdRef.current === null) {
          startAnimation();
        }
      } else {
        stopAnimation();
        // Final update when drag ends - but only if not already cleaning up
        if (!isCleaningUp) {
          setUpdateCounter(prev => prev + 1);
        }
      }
    };

    // Check drag state immediately
    checkDragState();

    // Set up interval to monitor drag state changes
    intervalRef.current = setInterval(checkDragState, 16); // 60fps

    return () => {
      isCleaningUp = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      stopAnimation();
    };
  }, []); // Empty dependency array - no need to re-run

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

  return (
    <g className="shape-preview">
      <path
        d={pathString}
        fill={fill}
        fillOpacity={fillOpacity}
        stroke="none"
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