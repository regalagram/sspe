import React, { useRef, useState, useCallback } from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { subPathToString, getContrastColor, subPathToStringInContext, findSubPathAtPoint } from '../../utils/path-utils';
import { getSVGPoint } from '../../utils/transform-utils';
import { transformManager } from '../transform/TransformManager';

export const PathRenderer: React.FC = () => {
  const { 
    paths, 
    selection, 
    viewport, 
    selectSubPathByPoint, 
    selectSubPathMultiple,
    moveSubPath, 
    pushToHistory, 
    renderVersion, 
    enabledFeatures 
  } = useEditorStore();
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
      // If the subpath being dragged is not selected, select it (considering Shift key)
      if (!selection.selectedSubPaths.includes(subPathId)) {
        selectSubPathMultiple(subPathId, e.shiftKey);
      }
      
      const point = getTransformedPoint(e, svgElement);
      setDragState({
        isDragging: true,
        subPathId,
        startPoint: point,
        lastPoint: point,
        svgElement: svgElement,
      });
      
      // Notify transform manager that movement started (subpath drag)
      transformManager.setMoving(true);
      
      // Save to history when starting to drag
      pushToHistory();
    }
  }, [pushToHistory, viewport, selection.selectedSubPaths, selectSubPathMultiple]);

  // Handle mouse move for dragging
  const handleMouseMove = useCallback((e: React.MouseEvent<SVGElement>) => {
    if (!dragState.isDragging || !dragState.subPathId || !dragState.lastPoint || !dragState.svgElement) return;
    
    const currentPoint = getTransformedPoint(e, dragState.svgElement);
    const delta = {
      x: currentPoint.x - dragState.lastPoint.x,
      y: currentPoint.y - dragState.lastPoint.y,
    };
    
    // Move all selected subpaths (including the one being dragged)
    const subPathsToMove = selection.selectedSubPaths.length > 0 
      ? selection.selectedSubPaths 
      : [dragState.subPathId];
    
    subPathsToMove.forEach(subPathId => {
      moveSubPath(subPathId, delta);
    });
    
    // Update last point
    setDragState(prev => ({
      ...prev,
      lastPoint: currentPoint,
    }));
  }, [dragState, moveSubPath, selection.selectedSubPaths, viewport]);

  // Handle mouse up to stop dragging
  const handleMouseUp = useCallback(() => {
    // Notify transform manager that movement ended
    if (dragState.isDragging) {
      transformManager.setMoving(false);
    }
    
    setDragState({
      isDragging: false,
      subPathId: null,
      startPoint: null,
      lastPoint: null,
      svgElement: null,
    });
  }, [dragState.isDragging]);

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
        
        // Wireframe mode overrides path styles
        const isWireframeMode = enabledFeatures.has('wireframe');
        const wireframeStrokeWidth = 2 / viewport.zoom; // Fixed visual thickness independent of zoom
        
        return (
          <path
            key={`path-${path.id}`}
            d={d}
            fill={isWireframeMode ? 'none' : path.style.fill}
            stroke={isWireframeMode ? '#000000' : path.style.stroke}
            strokeWidth={isWireframeMode ? wireframeStrokeWidth : (path.style.strokeWidth || 1) / viewport.zoom}
            strokeDasharray={isWireframeMode ? undefined : path.style.strokeDasharray}
            strokeLinecap={isWireframeMode ? 'round' : path.style.strokeLinecap}
            strokeLinejoin={isWireframeMode ? 'round' : path.style.strokeLinejoin}
            fillOpacity={isWireframeMode ? 0 : path.style.fillOpacity}
            strokeOpacity={isWireframeMode ? 1 : path.style.strokeOpacity}
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
                selectSubPathByPoint(path.id, point, e.shiftKey);
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
                // In wireframe mode, all paths are rendered with black stroke, so use black for contrast
                const pathStroke = path.style.stroke || '#000000';
                const pathFill = path.style.fill;
                
                // Use stroke color if available, otherwise use fill color
                // But in wireframe mode, always use black since that's what's actually rendered
                const primaryColor = enabledFeatures.has('wireframe') ? '#000000' : 
                                    (pathStroke && pathStroke !== 'none') ? pathStroke : 
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
                      selectSubPathByPoint(path.id, point, e.shiftKey);
                      return;
                    }
                  }
                  
                  // Otherwise, proceed with normal drag operation
                  handleSubPathMouseDown(e, subPath.id);
                }}
              />
              
              {/* Multi-selection indicator */}
              {dragState.isDragging && dragState.subPathId === subPath.id && selection.selectedSubPaths.length > 1 && (
                (() => {
                  // Get bounding box of the subpath to position the indicator
                  const commands = subPath.commands;
                  if (commands.length === 0) return null;
                  
                  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                  commands.forEach(cmd => {
                    if (cmd.x !== undefined && cmd.y !== undefined) {
                      minX = Math.min(minX, cmd.x);
                      minY = Math.min(minY, cmd.y);
                      maxX = Math.max(maxX, cmd.x);
                      maxY = Math.max(maxY, cmd.y);
                    }
                  });
                  
                  if (!isFinite(minX) || !isFinite(minY)) return null;
                  
                  const centerX = (minX + maxX) / 2;
                  const centerY = (minY + maxY) / 2;
                  const fontSize = Math.max(12 / viewport.zoom, 8);
                  
                  return (
                    <g transform={`translate(${centerX}, ${centerY})`}>
                      {/* Background circle */}
                      <circle
                        cx="0"
                        cy="0"
                        r={fontSize * 0.8}
                        fill="rgba(33, 150, 243, 0.9)"
                        stroke="white"
                        strokeWidth={1 / viewport.zoom}
                      />
                      {/* Count text */}
                      <text
                        x="0"
                        y={fontSize * 0.3}
                        textAnchor="middle"
                        fill="white"
                        fontSize={fontSize}
                        fontWeight="bold"
                        style={{ pointerEvents: 'none' }}
                      >
                        {selection.selectedSubPaths.length}
                      </text>
                    </g>
                  );
                })()
              )}
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
