import React, { useRef, useState, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { subPathToString, getContrastColor, subPathToStringInContext, findSubPathAtPoint } from '../../utils/path-utils';
import { getSVGPoint } from '../../utils/transform-utils';
import { transformManager } from '../transform/TransformManager';
import { getStyleValue } from '../../utils/gradient-utils';
import { stickyManager } from '../sticky-guidelines/StickyManager';
import { Point } from '../../types';
import { captureAllSelectedElementsPositions, moveAllCapturedElementsByDelta, DraggedElementsData } from '../../utils/drag-utils';
import { useAnimationsForElement } from '../../components/AnimationRenderer';
import { shouldPreserveSelection } from '../../utils/selection-utils';

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

// Component wrapper for path with animations
interface PathWithAnimationsProps {
  pathId: string;
  d: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  strokeLinecap?: "butt" | "round" | "square" | "inherit";
  strokeLinejoin?: "round" | "miter" | "bevel" | "inherit";
  fillOpacity?: number;
  strokeOpacity?: number;
  fillRule?: "nonzero" | "evenodd" | "inherit";
  markerStart?: string;
  markerMid?: string;
  markerEnd?: string;
  style?: React.CSSProperties;
  'data-element-type'?: string;
  'data-element-id'?: string;
}

const PathWithAnimations: React.FC<PathWithAnimationsProps> = (props) => {
  const animations = useAnimationsForElement(props.pathId);
  
  return (
    <path
      id={props.pathId}
      d={props.d}
      fill={props.fill}
      stroke={props.stroke}
      strokeWidth={props.strokeWidth}
      strokeDasharray={props.strokeDasharray}
      strokeLinecap={props.strokeLinecap}
      strokeLinejoin={props.strokeLinejoin}
      fillOpacity={props.fillOpacity}
      strokeOpacity={props.strokeOpacity}
      fillRule={props.fillRule}
      markerStart={props.markerStart}
      markerMid={props.markerMid}
      markerEnd={props.markerEnd}
      style={props.style}
      data-element-type={props['data-element-type']}
      data-element-id={props['data-element-id']}
    >
      {animations}
    </path>
  );
};

// Component wrapper for subpath with animations
interface SubPathWithAnimationsProps {
  subPathId: string;
  d: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  markerStart?: string;
  markerMid?: string;
  markerEnd?: string;
  style?: React.CSSProperties;
  onPointerDown?: (e: React.PointerEvent<SVGPathElement>) => void;
  'data-element-type'?: string;
  'data-element-id'?: string;
}

const SubPathWithAnimations: React.FC<SubPathWithAnimationsProps> = (props) => {
  const animations = useAnimationsForElement(props.subPathId);
  
  return (
    <path
      id={props.subPathId}
      d={props.d}
      fill={props.fill}
      stroke={props.stroke}
      strokeWidth={props.strokeWidth}
      markerStart={props.markerStart}
      markerMid={props.markerMid}
      markerEnd={props.markerEnd}
      style={props.style}
      onPointerDown={props.onPointerDown}
      data-element-type={props['data-element-type']}
      data-element-id={props['data-element-id']}
    >
      {animations}
    </path>
  );
};

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
    renderVersion, 
    enabledFeatures,
    grid
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
    const svgElement = (e.target as SVGPathElement).closest('svg');
    if (svgElement) {
      const currentState = useEditorStore.getState();
      const selectionContext = {
        selection: currentState.selection,
        groups: currentState.groups,
        paths: currentState.paths
      };
      
      // Check if this subpath belongs to a group
      const parentPath = currentState.paths.find(path => 
        path.subPaths.some(sp => sp.id === subPathId)
      );
      
      let belongsToGroup = false;
      if (parentPath) {
        // Check if the parent path is in any group
        belongsToGroup = currentState.groups.some(group => 
          group.children.some(child => child.id === parentPath.id && child.type === 'path')
        );
      }
      
      // If subpath belongs to a group, don't handle dragging here - let PointerInteraction handle it
      if (belongsToGroup) {
        // Just select the subpath and let PointerInteraction handle the group dragging
        const isSubPathSelected = currentState.selection.selectedSubPaths.includes(subPathId);
        if (!isSubPathSelected) {
          if (shouldPreserveSelection(subPathId, 'subpath', selectionContext)) {
            // Preserve current selection - don't call selectSubPathMultiple
          } else {
            // Normal selection (this will trigger group promotion if needed)
            selectSubPathMultiple(subPathId, e.shiftKey);
          }
        }
        // Don't stopPropagation or start drag state here - let PointerInteraction handle it
        return;
      }
      
      // Only handle dragging for subpaths that are NOT in groups
      e.stopPropagation();
      
      // Only select if not already selected and shouldn't preserve selection
      const isSubPathSelected = currentState.selection.selectedSubPaths.includes(subPathId);
      if (!isSubPathSelected) {
        if (shouldPreserveSelection(subPathId, 'subpath', selectionContext)) {
          // Preserve current selection - don't call selectSubPathMultiple
        } else {
          // Normal selection
          selectSubPathMultiple(subPathId, e.shiftKey);
        }
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
  }, [viewport, selectSubPathMultiple]);

  // Handle pointer move for dragging
  const handlePointerMove = useCallback((e: React.PointerEvent<SVGElement>) => {
    // Use functional state update to get current drag state without adding it to dependencies
    setDragState(currentDragState => {
      if (!currentDragState.isDragging || !currentDragState.subPathId || !currentDragState.startPoint || !currentDragState.svgElement) {
        return currentDragState;
      }
      
      const currentPoint = getTransformedPoint(e, currentDragState.svgElement);
      
      // Check if we've moved enough to start actual dragging (threshold in SVG units)
      if (!currentDragState.dragStarted) {
        const distance = Math.sqrt(
          Math.pow(currentPoint.x - currentDragState.startPoint.x, 2) + 
          Math.pow(currentPoint.y - currentDragState.startPoint.y, 2)
        );
        
        // Threshold of 5 SVG units to start dragging
        const dragThreshold = 5;
        
        if (distance < dragThreshold) {
          return currentDragState; // Not enough movement yet
        }
        
        // Start actual dragging
        // Notify transform manager that movement started (subpath drag)
        transformManager.setMoving(true);
        
        // Initialize sticky guidelines with original element bounds
        if (enabledFeatures.stickyGuidelinesEnabled) {
          // Get the first element being dragged for initialization
          let firstElementId: string | undefined;
          let firstElementType: string | undefined;
          
          if (currentDragState.capturedElements && Object.keys(currentDragState.capturedElements.subPaths).length > 0) {
            firstElementId = Object.keys(currentDragState.capturedElements.subPaths)[0];
            firstElementType = 'subpath';
          } else if (currentDragState.capturedElements && Object.keys(currentDragState.capturedElements.images).length > 0) {
            firstElementId = Object.keys(currentDragState.capturedElements.images)[0];
            firstElementType = 'image';
          } else if (currentDragState.capturedElements && Object.keys(currentDragState.capturedElements.texts).length > 0) {
            firstElementId = Object.keys(currentDragState.capturedElements.texts)[0];
            firstElementType = 'text';
          } else if (currentDragState.capturedElements && Object.keys(currentDragState.capturedElements.groups).length > 0) {
            firstElementId = Object.keys(currentDragState.capturedElements.groups)[0];
            firstElementType = 'group';
          } else if (currentDragState.capturedElements && Object.keys(currentDragState.capturedElements.uses).length > 0) {
            firstElementId = Object.keys(currentDragState.capturedElements.uses)[0];
            firstElementType = 'use';
          }
          
          console.log('PathRenderer: Starting sticky guidelines drag operation', { firstElementId, firstElementType });
          stickyManager.startDragOperation(firstElementId, firstElementType);
        }
        
        // Schedule pushToHistory outside of the render cycle
        setTimeout(() => {
          const store = useEditorStore.getState();
          store.pushToHistory();
        }, 0);
        
        // Calculate the total delta from start point to current point
        // This ensures we don't lose the initial movement that triggered the drag
        const initialDelta = {
          x: currentPoint.x - currentDragState.startPoint.x,
          y: currentPoint.y - currentDragState.startPoint.y,
        };
        
        // Apply the initial movement immediately to avoid desync
        if (currentDragState.capturedElements) {
          const hasSubPaths = Object.keys(currentDragState.capturedElements.subPaths).length > 0;
          
          if (hasSubPaths && (Math.abs(initialDelta.x) > 0.001 || Math.abs(initialDelta.y) > 0.001)) {
            // Capture variables before setTimeout to avoid closure issues
            const capturedElements = currentDragState.capturedElements;
            let moveDelta = { ...initialDelta };
            
            // Apply sticky guidelines if enabled - USE SIMPLE DELTA APPROACH like PointerInteraction
            console.log('PathRenderer checking sticky guidelines:', {
              enabled: enabledFeatures.stickyGuidelinesEnabled,
              stickyManagerExists: !!stickyManager,
              moveDelta: initialDelta
            });
            
            if (enabledFeatures.stickyGuidelinesEnabled && stickyManager) {
              console.log('PathRenderer applying sticky guidelines with simple delta approach');
              
              // Use the EXACT same approach as PointerInteraction.applyStickyGuidelines
              let selectionBounds = stickyManager.getOriginalSelectionBounds();
              
              if (!selectionBounds) {
                console.log('PathRenderer: Using current selection bounds for sticky guidelines');
                selectionBounds = stickyManager.calculateSelectionBounds();
              } else {
                console.log('PathRenderer: Using original selection bounds for sticky guidelines');
              }

              if (selectionBounds) {
                const targetPosition = {
                  x: selectionBounds.x + initialDelta.x,
                  y: selectionBounds.y + initialDelta.y
                };

                console.log('PathRenderer initial applyStickyGuidelines:', {
                  delta: initialDelta,
                  selectionBounds,
                  targetPosition,
                  usingOriginalBounds: !!stickyManager.getOriginalSelectionBounds()
                });

                const result = stickyManager.handleSelectionMoving(targetPosition, selectionBounds);
                if (result.snappedBounds) {
                  // Return the modified delta - EXACTLY like PointerInteraction
                  moveDelta = {
                    x: result.snappedBounds.x - selectionBounds.x,
                    y: result.snappedBounds.y - selectionBounds.y
                  };
                  
                  console.log('PathRenderer initial sticky guidelines applied:', {
                    originalDelta: initialDelta,
                    snappedMoveDelta: moveDelta,
                    guidelines: result.guidelines.length
                  });
                }
              }
            }
            
            const snapToGrid = grid.snapToGrid;
            const gridSize = grid.size;
            
            // Schedule the move operation outside of render cycle to avoid setState during render
            setTimeout(() => {
              moveAllCapturedElementsByDelta(
                capturedElements,
                moveDelta,
                snapToGrid,
                gridSize
              );
            }, 0);
          }
        }
        
        return {
          ...currentDragState,
          dragStarted: true,
          lastPoint: currentPoint,
        };
      }
      
      if (!currentDragState.lastPoint) return currentDragState;
      
      // Calculate delta directly without snapping logic for now to test synchronization
      const delta = {
        x: currentPoint.x - currentDragState.lastPoint.x,
        y: currentPoint.y - currentDragState.lastPoint.y,
      };
      
      // Handle sub-path movement specifically
      if (currentDragState.capturedElements) {
        const hasSubPaths = Object.keys(currentDragState.capturedElements.subPaths).length > 0;
        
        // PathRenderer handles sub-path dragging when initiated from sub-path overlay
        // Process all movement - no threshold needed for continuous movement
        if (hasSubPaths) {
          // Capture variables before setTimeout to avoid closure issues
          const capturedElements = currentDragState.capturedElements;
          let moveDelta = { ...delta };
          
          // Apply sticky guidelines if enabled - USE DELTA APPROACH like PointerInteraction
          console.log('PathRenderer continuous checking sticky guidelines:', {
            enabled: enabledFeatures.stickyGuidelinesEnabled,
            stickyManagerExists: !!stickyManager,
            currentPoint,
            lastPoint: currentDragState.lastPoint,
            delta,
            hasSubPaths
          });
          
          if (enabledFeatures.stickyGuidelinesEnabled && stickyManager) {
            console.log('PathRenderer continuous ENTERING sticky guidelines logic');
            
            // Use the EXACT same approach as PointerInteraction.applyStickyGuidelines
            let selectionBounds = stickyManager.getOriginalSelectionBounds();
            
            if (!selectionBounds) {
              console.log('PathRenderer continuous: Using current selection bounds for sticky guidelines');
              selectionBounds = stickyManager.calculateSelectionBounds();
            } else {
              console.log('PathRenderer continuous: Using original selection bounds for sticky guidelines');
            }

            if (selectionBounds) {
              const targetPosition = {
                x: selectionBounds.x + delta.x,
                y: selectionBounds.y + delta.y
              };

              console.log('PathRenderer continuous applyStickyGuidelines CALLING handleSelectionMoving:', {
                delta,
                selectionBounds,
                targetPosition,
                usingOriginalBounds: !!stickyManager.getOriginalSelectionBounds()
              });

              const result = stickyManager.handleSelectionMoving(targetPosition, selectionBounds);
              if (result.snappedBounds) {
                // Return the modified delta - EXACTLY like PointerInteraction
                moveDelta = {
                  x: result.snappedBounds.x - selectionBounds.x,
                  y: result.snappedBounds.y - selectionBounds.y
                };
                
                console.log('PathRenderer continuous sticky guidelines applied:', {
                  originalDelta: delta,
                  snappedMoveDelta: moveDelta,
                  guidelines: result.guidelines.length
                });
              }
            } else {
              // For single sub-path movement without selection, generate debug projections
              console.log('PathRenderer continuous: No selection bounds, generating debug projections for sub-path');
              const subPathId = currentDragState.subPathId;
              if (subPathId) {
                // Use handleCursorDragMovement just for debug projections, not for movement logic
                const debugResult = stickyManager.handleCursorDragMovement(
                  currentPoint,
                  currentDragState.startPoint,
                  subPathId,
                  'subpath'
                );
                
                console.log('PathRenderer continuous: Generated debug projections for sub-path:', {
                  subPathId,
                  debugProjections: debugResult.debugProjections?.length || 0,
                  guidelines: debugResult.guidelines?.length || 0
                });
              }
            }
          }
          
          const snapToGrid = grid.snapToGrid;
          const gridSize = grid.size;
          
          // Schedule the move operation outside of render cycle to avoid setState during render
          setTimeout(() => {
            moveAllCapturedElementsByDelta(
              capturedElements,
              moveDelta,
              snapToGrid,
              gridSize
            );
          }, 0);
        }
      }
      
      // Update last point after moving elements
      return {
        ...currentDragState,
        lastPoint: currentPoint,
      };
    });
  }, [viewport, grid.snapToGrid, grid.size]);

  // Handle pointer up to stop dragging
  const handlePointerUp = useCallback((e?: React.PointerEvent<SVGElement>) => {
    setDragState(currentDragState => {
      // Notify transform manager that movement ended only if actual dragging occurred
      if (currentDragState.isDragging && currentDragState.dragStarted) {
        transformManager.setMoving(false);
      }
      
      // Clear guidelines when dragging stops
      if (enabledFeatures.stickyGuidelinesEnabled) {
        stickyManager.clearGuidelines();
      }
      
      return {
        isDragging: false,
        subPathId: null,
        startPoint: null,
        lastPoint: null,
        svgElement: null,
        dragStarted: false,
        capturedElements: null,
      };
    });
  }, [enabledFeatures.stickyGuidelinesEnabled]);

  // Add global pointer event listeners for dragging
  React.useEffect(() => {
    const currentDragState = dragState;
    if (currentDragState.isDragging && currentDragState.svgElement) {
      // Register with global path drag manager
      pathDragManager.setDragHandlers({
        handlePointerMove
      });

      const handleGlobalPointerMove = (e: PointerEvent) => {
        // Convert global pointer event to React pointer event format
        const mockEvent = {
          clientX: e.clientX,
          clientY: e.clientY,
          target: currentDragState.svgElement,
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
            <PathWithAnimations
              pathId={path.id}
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
              markerStart={path.style.markerStart}
              markerMid={path.style.markerMid}
              markerEnd={path.style.markerEnd}
              data-element-type="path"
              data-element-id={path.id}
              style={{ 
                pointerEvents: 'all',
                clipPath: path.style.clipPath,
                mask: path.style.mask,
                filter: path.style.filter
              }}
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
                <SubPathWithAnimations
                  key={`subpath-interact-${subPath.id}`}
                  subPathId={subPath.id}
                  d={dSub}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={12 / viewport.zoom}
                  markerStart={path.style.markerStart}
                  markerMid={path.style.markerMid}
                  markerEnd={path.style.markerEnd}
                  data-element-type="subpath"
                  data-element-id={subPath.id}
                  style={{
                    cursor: 'grab',
                    pointerEvents: 'all',
                  }}
                  onPointerDown={(e) => {
                    // Only handle left pointer button
                    if (e.button !== 0) return;
                    
                    // Check if this subpath belongs to a group
                    const currentState = useEditorStore.getState();
                    const parentPath = currentState.paths.find(p => 
                      p.subPaths.some(sp => sp.id === subPath.id)
                    );
                    
                    let belongsToGroup = false;
                    if (parentPath) {
                      belongsToGroup = currentState.groups.some(group => 
                        group.children.some(child => child.id === parentPath.id && child.type === 'path')
                      );
                    }
                    
                    // If subpath belongs to a group, don't stopPropagation - let PointerInteraction handle it
                    if (!belongsToGroup) {
                      e.stopPropagation();
                    }
                    
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
                data-element-type="subpath"
                data-element-id={subPath.id}
                style={{
                  pointerEvents: 'all',
                  cursor: dragState.isDragging && dragState.subPathId === subPath.id && dragState.dragStarted 
                    ? 'grabbing' 
                    : 'grab',
                  filter: `drop-shadow(0 0 ${3 / viewport.zoom}px ${contrastColor})`,
                }}
                onPointerDown={(e) => {
                  // Check if this subpath belongs to a group
                  const currentState = useEditorStore.getState();
                  const parentPath = currentState.paths.find(p => 
                    p.subPaths.some(sp => sp.id === subPath.id)
                  );
                  
                  let belongsToGroup = false;
                  if (parentPath) {
                    belongsToGroup = currentState.groups.some(group => 
                      group.children.some(child => child.id === parentPath.id && child.type === 'path')
                    );
                  }
                  
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
                  
                  // If subpath belongs to a group, don't stopPropagation - let PointerInteraction handle it
                  if (!belongsToGroup) {
                    // Otherwise, proceed with normal drag operation
                    handleSubPathPointerDown(e, subPath.id);
                  } else {
                    // For group subpaths, just call the handler without stopPropagation
                    handleSubPathPointerDown(e, subPath.id);
                  }
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
