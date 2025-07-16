import React, { useRef, useState, useCallback } from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { subPathToString, getContrastColor, subPathToStringInContext, findSubPathAtPoint } from '../../utils/path-utils';
import { getSVGPoint } from '../../utils/transform-utils';
import { transformManager } from '../transform/TransformManager';
import { getStyleValue } from '../../utils/gradient-utils';
import { guidelinesManager } from '../guidelines/GuidelinesManager';
import { Point } from '../../types';
import { captureAllSelectedElementsPositions, moveAllCapturedElements, DraggedElementsData } from '../../utils/drag-utils';

// Global path drag manager to handle pointer events from plugin system
import { PointerEventContext } from '../../core/PluginSystem';

class PathDragManager {
  private currentDragHandlers: {
    handlePointerMove: (e: React.PointerEvent<SVGElement>) => void;
  } | null = null;

  setDragHandlers(handlers: { handlePointerMove: (e: React.PointerEvent<SVGElement>) => void }) {
    this.currentDragHandlers = handlers;
  }

  clearDragHandlers() {
    this.currentDragHandlers = null;
  }

  handlePointerMove = (e: React.PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
    if (this.currentDragHandlers) {
      this.currentDragHandlers.handlePointerMove(e);
      return true; // We handled the event
    }
    return false; // We didn't handle the event
  };
}

const pathDragManager = new PathDragManager();

export const PathRenderer: React.FC = () => {
  const { 
    paths, 
    texts,
    groups,
    images,
    uses,
    selection, 
    viewport, 
    selectSubPathByPoint, 
    selectSubPathMultiple,
    moveSubPath, 
    moveText,
    moveImage,
    moveGroup,
    moveUse,
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
    capturedElements: DraggedElementsData | null;
  }>({
    isDragging: false,
    subPathId: null,
    startPoint: null,
    lastPoint: null,
    svgElement: null,
    dragStarted: false,
    capturedElements: null,
  });

  const getTransformedPoint = (e: React.PointerEvent<SVGElement>, svgElement: SVGSVGElement) => {
    // Create a fake ref object for compatibility with the utility function
    const svgRef = { current: svgElement };
    return getSVGPoint(e, svgRef, viewport);
  };

  // Handle pointer down on subpath for dragging (selected or unselected)
  const handleSubPathPointerDown = useCallback((e: React.PointerEvent<SVGElement>, subPathId: string) => {
    e.stopPropagation();
    
    const svgElement = (e.target as SVGPathElement).closest('svg');
    if (svgElement) {
      // Always ensure the subpath being dragged is selected
      // If it's not selected and shift is not pressed, select it replacing current selection
      // If shift is pressed, add it to current selection
      if (!selection.selectedSubPaths.includes(subPathId)) {
        selectSubPathMultiple(subPathId, e.shiftKey);
      }
      
      const point = getTransformedPoint(e, svgElement);
      const capturedElements = captureAllSelectedElementsPositions();
      
      setDragState({
        isDragging: true,
        subPathId,
        startPoint: point,
        lastPoint: point,
        svgElement: svgElement,
        dragStarted: false, // Will be set to true when actual movement begins
        capturedElements,
      });
      
      // Note: We don't call pushToHistory() or transformManager.setMoving(true) here
      // That will be done when we detect actual dragging movement in handlePointerMove
    }
  }, [viewport, selection.selectedSubPaths, selectSubPathMultiple]);

  // Handle pointer move for dragging
  const handlePointerMove = useCallback((e: React.PointerEvent<SVGElement>) => {
    if (!dragState.isDragging || !dragState.subPathId || !dragState.startPoint || !dragState.svgElement) return;
    
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
    
    // Apply snapping if guidelines are enabled
    let snappedPoint = currentPoint;
    if (enabledFeatures.guidelinesEnabled) {
      // Find the element we're currently dragging to exclude it from snapping calculations
      const draggedSubPathId = dragState.subPathId;
      const draggedPath = paths.find(p => p.subPaths.some(sp => sp.id === draggedSubPathId));
      
      snappedPoint = guidelinesManager.updateSnap(
        currentPoint,
        paths,
        texts,
        groups,
        viewport.viewBox,
        draggedPath?.id,
        'path'
      );
    }
    
    const delta = {
      x: snappedPoint.x - dragState.lastPoint.x,
      y: snappedPoint.y - dragState.lastPoint.y,
    };
    
    // Move all selected subpaths (including the one being dragged)
    const subPathsToMove = selection.selectedSubPaths.length > 0 
      ? selection.selectedSubPaths 
      : [dragState.subPathId];
    
    subPathsToMove.forEach(subPathId => {
      moveSubPath(subPathId, delta);
    });
    
    // Use the centralized utility to move all other selected elements
    if (dragState.capturedElements) {
      const totalOffset = {
        x: snappedPoint.x - dragState.startPoint!.x,
        y: snappedPoint.y - dragState.startPoint!.y,
      };
      
      moveAllCapturedElements(
        dragState.capturedElements,
        totalOffset,
        false, // Grid snapping disabled for now
        10     // Grid size (not used since snapping is disabled)
      );
    }
    
    console.log('handlePointerMove - Moving subpaths with other elements:', {
      subpaths: subPathsToMove.length,
      texts: dragState.capturedElements ? Object.keys(dragState.capturedElements.texts).length : 0,
      images: dragState.capturedElements ? Object.keys(dragState.capturedElements.images).length : 0,
      uses: dragState.capturedElements ? Object.keys(dragState.capturedElements.uses).length : 0,
      groups: dragState.capturedElements ? Object.keys(dragState.capturedElements.groups).length : 0
    });
    
    // Update last point (use snapped point to maintain consistent movement)
    setDragState(prev => ({
      ...prev,
      lastPoint: snappedPoint,
    }));
  }, [dragState, moveSubPath, selection.selectedSubPaths, viewport, pushToHistory, enabledFeatures.guidelinesEnabled, paths, texts, groups]);

  // Handle pointer up to stop dragging
  const handlePointerUp = useCallback((e?: React.PointerEvent<SVGElement>) => {
    // Notify transform manager that movement ended only if actual dragging occurred
    if (dragState.isDragging && dragState.dragStarted) {
      transformManager.setMoving(false);
    }
    
    // Clear guidelines when dragging stops
    if (enabledFeatures.guidelinesEnabled) {
      guidelinesManager.clearSnap();
    }
    
    setDragState({
      isDragging: false,
      subPathId: null,
      startPoint: null,
      lastPoint: null,
      svgElement: null,
      dragStarted: false,
      capturedElements: null,
    });
  }, [dragState.isDragging, dragState.dragStarted, enabledFeatures.guidelinesEnabled]);

  // Add global pointer event listeners for dragging
  React.useEffect(() => {
    if (dragState.isDragging && dragState.svgElement) {
      // Register with global path drag manager
      pathDragManager.setDragHandlers({
        handlePointerMove
      });

      const handleGlobalPointerMove = (e: PointerEvent) => {
        // Convert global pointer event to React pointer event format
        const mockEvent = {
          clientX: e.clientX,
          clientY: e.clientY,
          target: dragState.svgElement,
        } as any;
        handlePointerMove(mockEvent);
      };

      const handleGlobalPointerUp = () => {
        handlePointerUp();
      };

      document.addEventListener('pointermove', handleGlobalPointerMove);
      document.addEventListener('pointerup', handleGlobalPointerUp);

      return () => {
        // Cleanup
        pathDragManager.clearDragHandlers();
        document.removeEventListener('pointermove', handleGlobalPointerMove);
        document.removeEventListener('pointerup', handleGlobalPointerUp);
      };
    } else {
      // Clear handlers when not dragging
      pathDragManager.clearDragHandlers();
    }
  }, [dragState.isDragging, dragState.svgElement, handlePointerMove, handlePointerUp]);

  return (
    <>
      {paths.map((path) => {
        // Render the main path (all subpaths joined)
        const d = path.subPaths.map(subPathToString).join(' ');
        const isWireframeMode = enabledFeatures.wireframeEnabled;
        const wireframeStrokeWidth = 2 / viewport.zoom;
        return (
          <g key={`path-group-${path.id}`}>
            {/* Main visible path */}
            <path
              key={`path-${path.id}`}
              d={d}
              fill={isWireframeMode ? 'none' : (path.style.fill ? getStyleValue(path.style.fill) : 'none')}
              stroke={isWireframeMode ? '#000000' : (path.style.stroke ? getStyleValue(path.style.stroke) : undefined)}
              strokeWidth={isWireframeMode ? wireframeStrokeWidth : (path.style.strokeWidth || 1) / viewport.zoom}
              strokeDasharray={isWireframeMode ? undefined : path.style.strokeDasharray}
              strokeLinecap={path.style.strokeLinecap}
              strokeLinejoin={path.style.strokeLinejoin}
              fillOpacity={isWireframeMode ? 0 : path.style.fillOpacity}
              strokeOpacity={isWireframeMode ? 1 : path.style.strokeOpacity}
              fillRule={path.style.fillRule || 'nonzero'}
              style={{ pointerEvents: 'all' }}
            />

            {/* Dibujar subpaths lockeados en wireframe con dash */}
            {isWireframeMode && path.subPaths.map((subPath) => {
              if (!subPath.locked) return null;
              const dSub = subPathToStringInContext(subPath, path.subPaths);
              return (
                <path
                  key={`subpath-locked-wireframe-${subPath.id}`}
                  d={dSub}
                  fill="none"
                  stroke="#fff"
                  strokeWidth={wireframeStrokeWidth - 0.8 / viewport.zoom}
                  strokeLinecap={path.style.strokeLinecap}
                  strokeLinejoin={path.style.strokeLinejoin}
                  style={{ pointerEvents: 'none' }}
                />
              );
            })}

            {/* Invisible overlays for interaction, solo para subpaths desbloqueados */}
            {path.subPaths.map((subPath) => {
              if (subPath.locked) return null;
              const dSub = subPathToStringInContext(subPath, path.subPaths);
              return (
                <path
                  key={`subpath-interact-${subPath.id}`}
                  d={dSub}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={12 / viewport.zoom}
                  style={{
                    cursor: 'grab',
                    pointerEvents: 'all',
                  }}
                  onPointerDown={(e) => {
                    // Only handle left pointer button
                    if (e.button !== 0) return;
                    e.stopPropagation();
                    // Get the SVG element from the path's parent
                    const svgElement = (e.target as SVGPathElement).closest('svg');
                    if (svgElement) {
                      const point = getTransformedPoint(e as React.PointerEvent<SVGElement>, svgElement);
                      // Si hay otro subpath debajo, seleccionarlo
                      const foundSubPath = findSubPathAtPoint(path, point, 15);
                      if (foundSubPath && foundSubPath.id !== subPath.id) {
                        selectSubPathByPoint(path.id, point, e.shiftKey);
                        return;
                      }
                    }
                    handleSubPathPointerDown(e, subPath.id);
                  }}
                />
              );
            })}
          </g>
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
                const pathStroke = path.style.stroke;
                const pathFill = path.style.fill;
                
                // Use stroke color if available, otherwise use fill color
                // But in wireframe mode, always use black since that's what's actually rendered
                // For gradients, use a default color for contrast calculation
                let primaryColor = '#000000';
                if (!enabledFeatures.wireframeEnabled) {
                  if (pathStroke && pathStroke !== 'none') {
                    primaryColor = typeof pathStroke === 'string' ? pathStroke : '#000000';
                  } else if (pathFill && pathFill !== 'none') {
                    primaryColor = typeof pathFill === 'string' ? pathFill : '#000000';
                  }
                }
                
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
                onPointerDown={(e) => {
                  // Check if this is a potential drag operation
                  const svgElement = (e.target as SVGPathElement).closest('svg');
                  if (svgElement) {
                    const point = getTransformedPoint(e as React.PointerEvent<SVGElement>, svgElement);
                    
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
                  handleSubPathPointerDown(e, subPath.id);
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
  // Export pointer handlers so the plugin system can call them
  pointerHandlers: {
    onPointerMove: pathDragManager.handlePointerMove,
  },
};
