import React, { useState, useEffect } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { shapeManager } from './ShapeManager';
import { getShapeById } from './ShapeDefinitions';
import { getSVGPoint } from '../../utils/transform-utils';

export const ShapeCursor: React.FC = () => {
  const { viewport } = useEditorStore();
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);

  if (!shapeManager.isInShapeCreationMode() || !mousePosition) {
    return null;
  }

  const shapeId = shapeManager.getCurrentShapeId();
  const size = shapeManager.getCurrentSize();
  
  if (!shapeId) {
    return null;
  }

  const shapeTemplate = getShapeById(shapeId);
  if (!shapeTemplate) {
    return null;
  }

  // Create a preview of the shape at the mouse position
  const previewCommands = shapeTemplate.generateCommands(mousePosition, size);
  
  // Convert commands to path string for preview
  const pathString = previewCommands.map(cmd => {
    switch (cmd.command) {
      case 'M':
        return `M ${cmd.x} ${cmd.y}`;
      case 'L':
        return `L ${cmd.x} ${cmd.y}`;
      case 'C':
        return `C ${cmd.x1} ${cmd.y1} ${cmd.x2} ${cmd.y2} ${cmd.x} ${cmd.y}`;
      case 'Z':
        return 'Z';
      default:
        return '';
    }
  }).join(' ');

  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* Shape preview */}
      <path
        d={pathString}
        fill="rgba(0, 120, 204, 0.2)"
        stroke="#007acc"
        strokeWidth={2 / viewport.zoom}
        strokeDasharray={`${5 / viewport.zoom} ${3 / viewport.zoom}`}
        opacity="0.7"
      />
      
      {/* Center crosshair */}
      <g opacity="0.8">
        <line
          x1={mousePosition.x - 8 / viewport.zoom}
          y1={mousePosition.y}
          x2={mousePosition.x + 8 / viewport.zoom}
          y2={mousePosition.y}
          stroke="#007acc"
          strokeWidth={1 / viewport.zoom}
        />
        <line
          x1={mousePosition.x}
          y1={mousePosition.y - 8 / viewport.zoom}
          x2={mousePosition.x}
          y2={mousePosition.y + 8 / viewport.zoom}
          stroke="#007acc"
          strokeWidth={1 / viewport.zoom}
        />
      </g>
    </g>
  );
};

// Hook to manage cursor position
export const useShapeCursor = () => {
  const [, forceUpdate] = useState({});
  const { viewport } = useEditorStore();

  useEffect(() => {
    if (!shapeManager.isInShapeCreationMode()) {
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      // Ignore synthetic mouse events from touch to prevent double processing
      const syntheticMouseEvent = e as any;
      if (syntheticMouseEvent.fromTouch) return;

      // Get SVG reference
      const svgElement = document.querySelector('svg.main-svg') as SVGSVGElement;
      if (!svgElement) return;

      // Convert screen coordinates to SVG coordinates
      const rect = svgElement.getBoundingClientRect();
      const x = (e.clientX - rect.left - viewport.pan.x) / viewport.zoom;
      const y = (e.clientY - rect.top - viewport.pan.y) / viewport.zoom;

      // Update the cursor component (we'll use a different approach)
      forceUpdate({});
    };

    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [viewport.pan.x, viewport.pan.y, viewport.zoom]);

  useEffect(() => {
    // Set cursor style on SVG element
    const svgElement = document.querySelector('svg.main-svg') as SVGSVGElement;
    if (svgElement) {
      if (shapeManager.isInShapeCreationMode()) {
        svgElement.style.cursor = 'crosshair';
      } else {
        svgElement.style.cursor = 'default';
      }
    }

    return () => {
      if (svgElement) {
        svgElement.style.cursor = 'default';
      }
    };
  });
};

// Mouse-following shape preview component for SVG overlay
export const ShapePreview: React.FC = () => {
  const { viewport } = useEditorStore();
  const [svgMousePosition, setSvgMousePosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!shapeManager.isInShapeCreationMode()) {
      setSvgMousePosition(null);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      // Ignore synthetic mouse events from touch to prevent double processing
      const syntheticMouseEvent = e as any;
      if (syntheticMouseEvent.fromTouch) return;

      const svgElement = document.querySelector('svg.main-svg') as SVGSVGElement;
      if (!svgElement) return;

      const rect = svgElement.getBoundingClientRect();
      const x = (e.clientX - rect.left - viewport.pan.x) / viewport.zoom;
      const y = (e.clientY - rect.top - viewport.pan.y) / viewport.zoom;

      setSvgMousePosition({ x, y });
    };

    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      setSvgMousePosition(null);
    };
  }, [viewport.pan.x, viewport.pan.y, viewport.zoom]);

  if (!shapeManager.isInShapeCreationMode() || !svgMousePosition) {
    return null;
  }

  const shapeId = shapeManager.getCurrentShapeId();
  const size = shapeManager.getCurrentSize();
  
  if (!shapeId) {
    return null;
  }

  const shapeTemplate = getShapeById(shapeId);
  if (!shapeTemplate) {
    return null;
  }

  const previewCommands = shapeTemplate.generateCommands(svgMousePosition, size);
  
  const pathString = previewCommands.map(cmd => {
    switch (cmd.command) {
      case 'M':
        return `M ${cmd.x} ${cmd.y}`;
      case 'L':
        return `L ${cmd.x} ${cmd.y}`;
      case 'C':
        return `C ${cmd.x1} ${cmd.y1} ${cmd.x2} ${cmd.y2} ${cmd.x} ${cmd.y}`;
      case 'Z':
        return 'Z';
      default:
        return '';
    }
  }).join(' ');

  return (
    <g style={{ pointerEvents: 'none' }}>
      <path
        d={pathString}
        fill="rgba(0, 120, 204, 0.2)"
        stroke="#007acc"
        strokeWidth={2 / viewport.zoom}
        strokeDasharray={`${5 / viewport.zoom} ${3 / viewport.zoom}`}
        opacity="0.7"
      />
      
      <g opacity="0.8">
        <line
          x1={svgMousePosition.x - 8 / viewport.zoom}
          y1={svgMousePosition.y}
          x2={svgMousePosition.x + 8 / viewport.zoom}
          y2={svgMousePosition.y}
          stroke="#007acc"
          strokeWidth={1 / viewport.zoom}
        />
        <line
          x1={svgMousePosition.x}
          y1={svgMousePosition.y - 8 / viewport.zoom}
          x2={svgMousePosition.x}
          y2={svgMousePosition.y + 8 / viewport.zoom}
          stroke="#007acc"
          strokeWidth={1 / viewport.zoom}
        />
      </g>
    </g>
  );
};
