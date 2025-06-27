import React, { useRef, useState, useCallback } from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { subPathToString, getContrastColor, subPathToStringInContext, findSubPathAtPoint } from '../../utils/path-utils';
import { getSVGPoint } from '../../utils/transform-utils';

export const PathRenderer: React.FC = () => {
  const { paths, selection, viewport, selectSubPathByPoint, moveSubPath, pushToHistory, renderVersion } = useEditorStore();
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

  const getTransformedPoint = (e: React.MouseEvent<SVGElement>, svgElement: SVGSVGElement) => {
    // Create a fake ref object for compatibility with the utility function
    const svgRef = { current: svgElement };
    return getSVGPoint(e, svgRef, viewport);
  };

  // Handle mouse down on selected subpath for dragging
  const handleSubPathMouseDown = useCallback((e: React.MouseEvent<SVGElement>, subPathId: string) => {
    e.stopPropagation();
    
    const svgElement = (e.target as SVGPathElement).closest('svg');
    if (svgElement) {
      const point = getTransformedPoint(e, svgElement);
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
  const handleMouseMove = useCallback((e: React.MouseEvent<SVGElement>) => {
    if (!dragState.isDragging || !dragState.subPathId || !dragState.lastPoint || !dragState.svgElement) return;
    
    const currentPoint = getTransformedPoint(e, dragState.svgElement);
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
                const point = getTransformedPoint(e as React.MouseEvent<SVGElement>, svgElement);
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

          // Use context-aware string generation for proper visual feedback
          const d = subPathToStringInContext(subPath, path.subPaths);
          
          // Determine the primary color of this path for contrast calculation
          const pathStroke = path.style.stroke || '#000000';
          const pathFill = path.style.fill;
          
          // Use stroke color if available, otherwise use fill color
          const primaryColor = (pathStroke && pathStroke !== 'none') ? pathStroke : 
                              (pathFill && pathFill !== 'none') ? pathFill : '#000000';
          
          const contrastColor = getContrastColor(primaryColor);
          
          return (
            <g key={`selected-subpath-${subPath.id}-v${renderVersion}`}>
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
                onMouseDown={(e) => {
                  // Check if this is a potential drag operation
                  const svgElement = (e.target as SVGPathElement).closest('svg');
                  if (svgElement) {
                    const point = getTransformedPoint(e as React.MouseEvent<SVGElement>, svgElement);
                    
                    // Try to find if there's a different subpath at this point that should be selected
                    const foundSubPath = findSubPathAtPoint(path, point, 15);
                    
                    // If we found a different subpath, select it instead of starting drag
                    if (foundSubPath && foundSubPath.id !== subPath.id) {
                      e.stopPropagation();
                      selectSubPathByPoint(path.id, point);
                      return;
                    }
                  }
                  
                  // Otherwise, proceed with normal drag operation
                  handleSubPathMouseDown(e, subPath.id);
                }}
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
