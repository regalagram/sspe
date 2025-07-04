import React, { useRef, useState, useCallback } from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { subPathToString, getContrastColor, subPathToStringInContext, findSubPathAtPoint } from '../../utils/path-utils';
import { getSVGPoint } from '../../utils/transform-utils';
import { transformManager } from '../transform/TransformManager';
import { isCurrentlyProcessingTouch, getCurrentTouchEventId, getCurrentTouchEventType } from '../../utils/touch-to-mouse-global';

// Global path drag manager to handle mouse events from plugin system
class PathDragManager {
  private currentDragHandlers: {
    handleMouseMove: (e: React.MouseEvent<SVGElement>) => void;
  } | null = null;

  setDragHandlers(handlers: { handleMouseMove: (e: React.MouseEvent<SVGElement>) => void }) {
    this.currentDragHandlers = handlers;
  }

  clearDragHandlers() {
    this.currentDragHandlers = null;
  }

  handleMouseMove = (e: React.MouseEvent<SVGElement>, context: any): boolean => {
    if (this.currentDragHandlers) {
      this.currentDragHandlers.handleMouseMove(e);
      return true; // We handled the event
    }
    return false; // We didn't handle the event
  };
}

const pathDragManager = new PathDragManager();

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
    dragStarted: boolean; // Track if actual dragging has begun
  }>({
    isDragging: false,
    subPathId: null,
    startPoint: null,
    lastPoint: null,
    svgElement: null,
    dragStarted: false,
  });

  const getTransformedPoint = (e: React.MouseEvent<SVGElement>, svgElement: SVGSVGElement) => {
    // Create a fake ref object for compatibility with the utility function
    const svgRef = { current: svgElement };
    return getSVGPoint(e, svgRef, viewport);
  };

  // Handle mouse down on subpath for dragging (selected or unselected)
  const handleSubPathMouseDown = useCallback((e: React.MouseEvent<SVGElement>, subPathId: string) => {
    e.stopPropagation();
    
    const fromTouch = isCurrentlyProcessingTouch();
    const touchEventId = getCurrentTouchEventId();
    const touchEventType = getCurrentTouchEventType();
  
    
    // Skip duplicate touch events using element-specific deduplication
    if (fromTouch) {
      // Use a more specific key that includes the subPathId
      const deduplicationKey = `subpath-${subPathId}-mousedown`;
      
      if (touchEventId && (window as any).lastProcessedTouchEvents?.[deduplicationKey] === touchEventId) {
        return; // Already processed this touch event for this specific subpath
      }
      if (touchEventId) {
        if (!(window as any).lastProcessedTouchEvents) {
          (window as any).lastProcessedTouchEvents = {};
        }
        (window as any).lastProcessedTouchEvents[deduplicationKey] = touchEventId;
      }
    }
    
    const svgElement = (e.target as SVGPathElement).closest('svg');
    if (svgElement) {
      // Always ensure the subpath being dragged is selected
      // If it's not selected and shift is not pressed, select it replacing current selection
      // If shift is pressed, add it to current selection
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
        dragStarted: false, // Will be set to true when actual movement begins
      });
      
      // Note: We don't call pushToHistory() or transformManager.setMoving(true) here
      // That will be done when we detect actual dragging movement in handleMouseMove
    }
  }, [viewport, selection.selectedSubPaths, selectSubPathMultiple]);

  // Handle mouse move for dragging
  const handleMouseMove = useCallback((e: React.MouseEvent<SVGElement>) => {
    if (!dragState.isDragging || !dragState.subPathId || !dragState.startPoint || !dragState.svgElement) return;
    
    const fromTouch = isCurrentlyProcessingTouch();
    const touchEventId = getCurrentTouchEventId();
    

    
    // Skip duplicate touch events using element-specific deduplication
    if (fromTouch) {
      // Use the dragging subpath ID for the deduplication key
      const deduplicationKey = `subpath-${dragState.subPathId}-mousemove`;
      
      if (touchEventId && (window as any).lastProcessedTouchEvents?.[deduplicationKey] === touchEventId) {
        return; // Already processed this touch event for this specific subpath
      }
      if (touchEventId) {
        if (!(window as any).lastProcessedTouchEvents) {
          (window as any).lastProcessedTouchEvents = {};
        }
        (window as any).lastProcessedTouchEvents[deduplicationKey] = touchEventId;
      }
    }
    
    const currentPoint = getTransformedPoint(e, dragState.svgElement);
    
    // Check if we've moved enough to start actual dragging (threshold in SVG units)
    if (!dragState.dragStarted) {
      const distance = Math.sqrt(
        Math.pow(currentPoint.x - dragState.startPoint.x, 2) + 
        Math.pow(currentPoint.y - dragState.startPoint.y, 2)
      );
      
      // Threshold of 5 SVG units to start dragging
      const dragThreshold = 5;
      
      if (distance < dragThreshold) {
        return; // Not enough movement yet
      }
      
      // Start actual dragging
      setDragState(prev => ({
        ...prev,
        dragStarted: true,
        lastPoint: currentPoint,
      }));
      
      // Notify transform manager that movement started (subpath drag)
      transformManager.setMoving(true);
      
      // Save to history when starting to drag
      pushToHistory();
      
      return; // Don't move on the first frame where we detect drag start
    }
    
    if (!dragState.lastPoint) return;
    
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
  }, [dragState, moveSubPath, selection.selectedSubPaths, viewport, pushToHistory]);

  // Handle mouse up to stop dragging
  const handleMouseUp = useCallback((e?: React.MouseEvent<SVGElement>) => {
    // Skip duplicate touch events using element-specific deduplication
    if (e && (e as any).fromTouch) {
      const touchEventId = (e as any).touchEventId;
      // Use the dragging subpath ID for the deduplication key
      const subPathId = dragState.subPathId || 'unknown';
      const deduplicationKey = `subpath-${subPathId}-mouseup`;
      
      if (touchEventId && (window as any).lastProcessedTouchEvents?.[deduplicationKey] === touchEventId) {
        return; // Already processed this touch event for this specific subpath
      }
      if (touchEventId) {
        if (!(window as any).lastProcessedTouchEvents) {
          (window as any).lastProcessedTouchEvents = {};
        }
        (window as any).lastProcessedTouchEvents[deduplicationKey] = touchEventId;
      }
    }
    
    // Notify transform manager that movement ended only if actual dragging occurred
    if (dragState.isDragging && dragState.dragStarted) {
      transformManager.setMoving(false);
    }
    
    setDragState({
      isDragging: false,
      subPathId: null,
      startPoint: null,
      lastPoint: null,
      svgElement: null,
      dragStarted: false,
    });
  }, [dragState.isDragging, dragState.dragStarted]);

  // Add global mouse event listeners for dragging
  React.useEffect(() => {
    if (dragState.isDragging && dragState.svgElement) {
      // Register with global path drag manager
      pathDragManager.setDragHandlers({
        handleMouseMove
      });

      const handleGlobalMouseMove = (e: MouseEvent) => {
        // Skip if this is a synthetic touch event - React handlers will handle it
        if ((e as any).fromTouch) return;
        
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
        // Cleanup
        pathDragManager.clearDragHandlers();
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    } else {
      // Clear handlers when not dragging
      pathDragManager.clearDragHandlers();
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
              cursor: 'grab', // Show that paths can be dragged directly
              pointerEvents: 'all',
            }}
            onMouseDown={(e) => {
              // Only handle left mouse button
              if (e.button !== 0) return;
              
              e.stopPropagation();
              
              // Get the SVG element from the path's parent
              const svgElement = (e.target as SVGPathElement).closest('svg');
              if (svgElement) {
                const point = getTransformedPoint(e as React.MouseEvent<SVGElement>, svgElement);
                const foundSubPath = findSubPathAtPoint(path, point, 15);
                
                if (foundSubPath) {
                  // If Shift is pressed, just select without starting drag
                  if (e.shiftKey) {
                    selectSubPathByPoint(path.id, point, true);
                    return;
                  }
                  
                  // If subpath is not selected, select it and start drag immediately
                  if (!selection.selectedSubPaths.includes(foundSubPath.id)) {
                    selectSubPathMultiple(foundSubPath.id, false);
                    // Start drag immediately
                    handleSubPathMouseDown(e, foundSubPath.id);
                  } else {
                    // If already selected, just start drag
                    handleSubPathMouseDown(e, foundSubPath.id);
                  }
                }
              }
            }}
            onClick={(e) => {
              // This is now only for fallback cases where mousedown didn't handle it
              e.stopPropagation();
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
                  cursor: dragState.isDragging && dragState.subPathId === subPath.id && dragState.dragStarted 
                    ? 'grabbing' 
                    : 'grab',
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
  // Export mouse handlers so the plugin system can call them
  mouseHandlers: {
    onMouseMove: pathDragManager.handleMouseMove,
  },
};
