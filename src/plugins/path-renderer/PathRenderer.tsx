import React, { useRef, useState, useCallback } from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { subPathToString, getContrastColor } from '../../utils/path-utils';

export const PathRenderer: React.FC = () => {
  const { paths, selection, viewport, selectSubPathByPoint, moveSubPath, pushToHistory } = useEditorStore();
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Drag state
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    subPathId: string | null;
    startPoint: { x: number; y: number } | null;
    lastPoint: { x: number; y: number } | null;
    svgElement: SVGSVGElement | null;
  }>({
    isDragging: false,
    subPathId: null,
    startPoint: null,
    lastPoint: null,
    svgElement: null,
  });

  const getSVGPoint = (e: React.MouseEvent, svgElement: SVGSVGElement) => {
    const rect = svgElement.getBoundingClientRect();
    
    // Get mouse position relative to SVG element
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    console.log('Debug getSVGPoint:', {
      clientX: e.clientX,
      clientY: e.clientY,
      rectLeft: rect.left,
      rectTop: rect.top,
      relativeX: x,
      relativeY: y,
      panX: viewport.pan.x,
      panY: viewport.pan.y,
      zoom: viewport.zoom
    });
    
    // Apply inverse transform: first inverse scale, then inverse translate
    // The SVG transform is: translate(pan.x, pan.y) scale(zoom)
    // So inverse is: scale(1/zoom) translate(-pan.x, -pan.y)
    const result = {
      x: x / viewport.zoom - viewport.pan.x,
      y: y / viewport.zoom - viewport.pan.y,
    };
    
    console.log('Final point:', result);
    return result;
  };

  // Handle mouse down on selected subpath for dragging
  const handleSubPathMouseDown = useCallback((e: React.MouseEvent, subPathId: string) => {
    e.stopPropagation();
    
    const svgElement = (e.target as SVGPathElement).closest('svg');
    if (svgElement) {
      const point = getSVGPoint(e, svgElement);
      setDragState({
        isDragging: true,
        subPathId,
        startPoint: point,
        lastPoint: point,
        svgElement: svgElement,
      });
      
      // Save to history when starting to drag
      pushToHistory();
    }
  }, [pushToHistory]);

  // Handle mouse move for dragging
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState.isDragging || !dragState.subPathId || !dragState.lastPoint || !dragState.svgElement) return;
    
    const currentPoint = getSVGPoint(e, dragState.svgElement);
    const delta = {
      x: currentPoint.x - dragState.lastPoint.x,
      y: currentPoint.y - dragState.lastPoint.y,
    };
    
    // Move the subpath
    moveSubPath(dragState.subPathId, delta);
    
    // Update last point
    setDragState(prev => ({
      ...prev,
      lastPoint: currentPoint,
    }));
  }, [dragState, moveSubPath]);

  // Handle mouse up to stop dragging
  const handleMouseUp = useCallback(() => {
    setDragState({
      isDragging: false,
      subPathId: null,
      startPoint: null,
      lastPoint: null,
      svgElement: null,
    });
  }, []);

  // Add global mouse event listeners for dragging
  React.useEffect(() => {
    if (dragState.isDragging && dragState.svgElement) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        // Convert global mouse event to React mouse event format
        const mockEvent = {
          clientX: e.clientX,
          clientY: e.clientY,
          target: dragState.svgElement,
        } as any;
        handleMouseMove(mockEvent);
      };

      const handleGlobalMouseUp = () => {
        handleMouseUp();
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [dragState.isDragging, dragState.svgElement, handleMouseMove, handleMouseUp]);

  return (
    <>
      {paths.map((path) => {
        // Check if any subpath of this path is selected
        const hasSelectedSubPath = path.subPaths.some(subPath => 
          selection.selectedSubPaths.includes(subPath.id)
        );
        
        // Join all sub-paths into a single d string
        const d = path.subPaths.map(subPathToString).join(' ');
        
        return (
          <path
            key={`path-${path.id}`}
            d={d}
            fill={path.style.fill}
            stroke={path.style.stroke}
            strokeWidth={(path.style.strokeWidth || 1) / viewport.zoom}
            strokeDasharray={path.style.strokeDasharray}
            strokeLinecap={path.style.strokeLinecap}
            strokeLinejoin={path.style.strokeLinejoin}
            fillOpacity={path.style.fillOpacity}
            strokeOpacity={path.style.strokeOpacity}
            fillRule={path.style.fillRule || 'nonzero'}
            style={{
              cursor: 'pointer',
              pointerEvents: 'all',
            }}
            onClick={(e) => {
              e.stopPropagation();
              
              // Get the SVG element from the path's parent
              const svgElement = (e.target as SVGPathElement).closest('svg');
              if (svgElement) {
                const point = getSVGPoint(e, svgElement);
                selectSubPathByPoint(path.id, point);
              }
            }}
          />
        );
      })}

      {/* Render selected subpaths with visual feedback */}
      {paths.map((path) => 
        path.subPaths.map((subPath) => {
          const isSelected = selection.selectedSubPaths.includes(subPath.id);
          if (!isSelected) return null;

          const d = subPathToString(subPath);
          
          // Determine the primary color of this path for contrast calculation
          const pathStroke = path.style.stroke || '#000000';
          const pathFill = path.style.fill;
          
          // Use stroke color if available, otherwise use fill color
          const primaryColor = (pathStroke && pathStroke !== 'none') ? pathStroke : 
                              (pathFill && pathFill !== 'none') ? pathFill : '#000000';
          
          const contrastColor = getContrastColor(primaryColor);
          
          return (
            <g key={`selected-subpath-${subPath.id}`}>
              {/* Background glow */}
              <path
                d={d}
                fill="none"
                stroke={contrastColor}
                strokeWidth={(5) / viewport.zoom}
                strokeOpacity={0.3}
                style={{
                  pointerEvents: 'none',
                  filter: `blur(${2 / viewport.zoom}px)`,
                }}
              />
              {/* Main selection border - draggable */}
              <path
                d={d}
                fill="none"
                stroke={contrastColor}
                strokeWidth={(2.5) / viewport.zoom}
                strokeDasharray={`${6 / viewport.zoom},${4 / viewport.zoom}`}
                style={{
                  pointerEvents: 'all',
                  cursor: dragState.isDragging && dragState.subPathId === subPath.id ? 'grabbing' : 'grab',
                  filter: `drop-shadow(0 0 ${3 / viewport.zoom}px ${contrastColor})`,
                }}
                onMouseDown={(e) => handleSubPathMouseDown(e, subPath.id)}
              />
            </g>
          );
        })
      )}
    </>
  );
};

export const PathRendererPlugin: Plugin = {
  id: 'path-renderer',
  name: 'Path Renderer',
  version: '1.0.0',
  enabled: true,
  ui: [
    {
      id: 'path-renderer',
      component: PathRenderer,
      position: 'svg-content',
      order: 10, // Render paths in background
    },
  ],
};
