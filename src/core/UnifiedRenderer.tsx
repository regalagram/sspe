import React, { useCallback, useState, useEffect } from 'react';
import { useEditorStore } from '../store/editorStore';
import { getAllElementsByZIndex, getElementZIndex } from '../utils/z-index-manager';
import { subPathToString, getContrastColor, findSubPathAtPoint } from '../utils/path-utils';
import { getStyleValue } from '../utils/gradient-utils';
import { useAnimationsForElement } from '../components/AnimationRenderer';
import { useTextEditMode } from '../hooks/useTextEditMode';
import { TextEditOverlay } from '../components/TextEditOverlay';
import { calculateTextBoundsDOM } from '../utils/text-utils';
import { getSVGPoint } from '../utils/transform-utils';
import { captureAllSelectedElementsPositions, moveAllCapturedElementsByDelta } from '../utils/drag-utils';
import { transformManager } from '../plugins/transform/TransformManager';
import { shouldPreserveSelection } from '../utils/selection-utils';
import { stickyManager } from '../plugins/sticky-guidelines/StickyManager';
import { applyFinalSnapToGrid } from '../utils/final-snap-utils';

export interface RenderItem {
  zIndex: number;
  elementId: string;
  type: 'path' | 'text' | 'image' | 'use';
  element: React.JSX.Element | null;
}

// Component wrapper for path with animations
interface PathWithAnimationsProps {
  pathId: string;
  d: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  strokeLinecap?: "butt" | "round" | "square" | "inherit";
  strokeLinejoin?: "miter" | "round" | "bevel" | "inherit";
  fillOpacity?: number;
  strokeOpacity?: number;
  fillRule?: string;
  markerStart?: string;
  markerMid?: string;
  markerEnd?: string;
  style?: React.CSSProperties;
  path?: any; // Full path object for overlay logic
}

const PathWithAnimations: React.FC<PathWithAnimationsProps> = (props) => {
  const { viewport, enabledFeatures, selectSubPathMultiple, startCyclingDetection, checkMovementAndResolveCycling, finalizeCycling, grid } = useEditorStore();
  const animations = useAnimationsForElement(props.pathId);
  
  // Force re-evaluation when sticky guidelines feature changes
  useEffect(() => {
    if (enabledFeatures.stickyGuidelinesEnabled) {
      // Trigger re-evaluation of component state to ensure sticky guidelines are active
      setDragState(prevState => ({ ...prevState })); // Force re-render to sync with enabled features
    }
  }, [enabledFeatures.stickyGuidelinesEnabled]);
  
  // State for handling subpath dragging
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    subPathId: string | null;
    startPoint: { x: number; y: number } | null;
    lastPoint: { x: number; y: number } | null;
    svgElement: SVGSVGElement | null;
    dragStarted: boolean;
    capturedElements: any;
    lastAppliedDelta: { x: number; y: number };
  }>({
    isDragging: false,
    subPathId: null,
    startPoint: null,
    lastPoint: null,
    svgElement: null,
    dragStarted: false,
    capturedElements: null,
    lastAppliedDelta: { x: 0, y: 0 },
  });

  // State for handling cycling vs drag detection
  const [cyclingState, setCyclingState] = useState<{
    isPending: boolean;
    selectedSubPathId: string | null;
  }>({
    isPending: false,
    selectedSubPathId: null,
  });

  // Function to start drag operation
  const startDragOperation = useCallback((subPathId: string, point: { x: number; y: number }, svgElement: SVGSVGElement) => {
    const capturedElements = captureAllSelectedElementsPositions();
    
    // Clear any pending cycling state when starting drag
    setCyclingState({
      isPending: false,
      selectedSubPathId: null,
    });
    
    // Initialize sticky guidelines with original element bounds
    if (enabledFeatures.stickyGuidelinesEnabled) {
      // Get the first element being dragged for initialization
      let firstElementId: string | undefined;
      let firstElementType: string | undefined;
      
      if (capturedElements && Object.keys(capturedElements.subPaths).length > 0) {
        firstElementId = Object.keys(capturedElements.subPaths)[0];
        firstElementType = 'subpath';
      } else if (capturedElements && Object.keys(capturedElements.images).length > 0) {
        firstElementId = Object.keys(capturedElements.images)[0];
        firstElementType = 'image';
      } else if (capturedElements && Object.keys(capturedElements.texts).length > 0) {
        firstElementId = Object.keys(capturedElements.texts)[0];
        firstElementType = 'text';
      } else if (capturedElements && Object.keys(capturedElements.groups).length > 0) {
        firstElementId = Object.keys(capturedElements.groups)[0];
        firstElementType = 'group';
      } else if (capturedElements && Object.keys(capturedElements.uses).length > 0) {
        firstElementId = Object.keys(capturedElements.uses)[0];
        firstElementType = 'use';
      }
      
      stickyManager.startDragOperation(firstElementId, firstElementType);
    }
    
    setDragState({
      isDragging: true,
      subPathId,
      startPoint: point,
      lastPoint: point,
      svgElement,
      dragStarted: false,
      capturedElements,
      lastAppliedDelta: { x: 0, y: 0 },
    });
  }, [enabledFeatures.stickyGuidelinesEnabled]);

  // Handle pointer move for dragging
  const handlePointerMove = useCallback((e: React.PointerEvent<SVGElement>) => {
    // Check if we have pending cycling and detect movement
    if (cyclingState.isPending && cyclingState.selectedSubPathId) {
      const svgElement = (e.target as SVGPathElement).closest('svg');
      if (svgElement) {
        const svgRef = { current: svgElement };
        const currentPoint = getSVGPoint(e, svgRef, viewport);
        
        // Use the new movement detection system
        const result = checkMovementAndResolveCycling(currentPoint);
        
        if (result.shouldStartDrag && result.selectedSubPathId) {
          // Make sure the subpath is selected
          const currentState = useEditorStore.getState();
          if (!currentState.selection.selectedSubPaths.includes(result.selectedSubPathId)) {
            selectSubPathMultiple(result.selectedSubPathId, false);
          }
          
          // Start drag operation
          const initialPoint = currentState.deepSelection?.lastClickPoint || currentPoint;
          startDragOperation(result.selectedSubPathId, initialPoint, svgElement);
          
          // Clear cycling state
          setCyclingState({
            isPending: false,
            selectedSubPathId: null,
          });
          
          return;
        }
      }
    }

    // Normal drag handling
    if (!dragState.isDragging || !dragState.subPathId || !dragState.startPoint || !dragState.svgElement) {
      return;
    }
    
    const svgRef = { current: dragState.svgElement };
    const currentPoint = getSVGPoint(e, svgRef, viewport);
    
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
      transformManager.setMoving(true);
      
      // Hide floating toolbar during subpath drag
      const store = useEditorStore.getState();
      store.hideFloatingToolbarDuringDrag();
      
      // Push to history
      store.pushToHistory();
      
      setDragState(prev => ({ ...prev, dragStarted: true }));
      
      // Calculate the total delta from start point to current point
      // This ensures we don't lose the initial movement that triggered the drag
      const totalDelta = {
        x: currentPoint.x - dragState.startPoint.x,
        y: currentPoint.y - dragState.startPoint.y,
      };
      
      // Apply the initial movement immediately to avoid desync
      if (dragState.capturedElements) {
        const hasSubPaths = Object.keys(dragState.capturedElements.subPaths).length > 0;
        
        if (hasSubPaths && (Math.abs(totalDelta.x) > 0.001 || Math.abs(totalDelta.y) > 0.001)) {
          let snappedDelta = { ...totalDelta };
          
          // Apply sticky guidelines if enabled for initial movement
          if (enabledFeatures.stickyGuidelinesEnabled && stickyManager && dragState.subPathId) {
            const targetPoint = {
              x: dragState.startPoint.x + totalDelta.x,
              y: dragState.startPoint.y + totalDelta.y
            };
            
            const result = stickyManager.handleCursorDragMovement(
              targetPoint,
              dragState.startPoint,
              dragState.subPathId,
              'subpath'
            );
            
            if (result.snappedPoint) {
              snappedDelta = {
                x: result.snappedPoint.x - dragState.startPoint.x,
                y: result.snappedPoint.y - dragState.startPoint.y
              };
            }
          }
          
          // Apply initial movement - NO snap to grid during drag
          moveAllCapturedElementsByDelta(
            dragState.capturedElements,
            snappedDelta,
            false, // Don't snap to grid during drag
            0     // Grid size not needed
          );
          
          setDragState(prev => ({
            ...prev,
            lastPoint: currentPoint,
            lastAppliedDelta: snappedDelta,
          }));
        }
      }
      
      return; // Exit early after handling initial movement
    }
    
    // Calculate total delta from start point (like in PathRenderer)
    const totalDelta = {
      x: currentPoint.x - dragState.startPoint.x,
      y: currentPoint.y - dragState.startPoint.y,
    };
    
    // Handle sub-path movement with sticky guidelines
    if (dragState.capturedElements) {
      const hasSubPaths = Object.keys(dragState.capturedElements.subPaths).length > 0;
      
      if (hasSubPaths) {
        let snappedDelta = { ...totalDelta };
        
        // Apply sticky guidelines if enabled - cursor-based for guidelines, incremental for movement
        if (enabledFeatures.stickyGuidelinesEnabled && stickyManager && dragState.subPathId) {
          // Always update guidelines with current cursor position for visual feedback
          const targetPoint = {
            x: dragState.startPoint.x + totalDelta.x,
            y: dragState.startPoint.y + totalDelta.y
          };
          
          const result = stickyManager.handleCursorDragMovement(
            targetPoint,
            dragState.startPoint,
            dragState.subPathId,
            'subpath'
          );
          
          // If snapping occurred, adjust the delta
          if (result.snappedPoint) {
            snappedDelta = {
              x: result.snappedPoint.x - dragState.startPoint.x,
              y: result.snappedPoint.y - dragState.startPoint.y
            };
          }
        }
        
        // Calculate incremental delta (only apply the difference from last applied delta)
        const incrementalDelta = {
          x: snappedDelta.x - dragState.lastAppliedDelta.x,
          y: snappedDelta.y - dragState.lastAppliedDelta.y
        };
        
        // Only apply movement if there's a meaningful change
        if (Math.abs(incrementalDelta.x) > 0.001 || Math.abs(incrementalDelta.y) > 0.001) {
          // NO snap to grid during drag - only at the end
          moveAllCapturedElementsByDelta(
            dragState.capturedElements,
            incrementalDelta,
            false, // Don't snap to grid during drag
            0     // Grid size not needed
          );
          
          setDragState(prev => ({
            ...prev,
            lastPoint: currentPoint,
            lastAppliedDelta: snappedDelta,
          }));
        } else {
          // Update last point even if no movement applied
          setDragState(prev => ({
            ...prev,
            lastPoint: currentPoint,
          }));
        }
      }
    }
  }, [dragState, viewport, cyclingState, selectSubPathMultiple, startDragOperation, checkMovementAndResolveCycling, enabledFeatures.stickyGuidelinesEnabled, grid.snapToGrid, grid.size]);

  // Handle pointer up to end dragging
  const handlePointerUp = useCallback(() => {
    // Handle pending cycling (click without drag)
    if (cyclingState.isPending && cyclingState.selectedSubPathId) {
      // Perform cycling on click
      const selectedSubPathId = finalizeCycling();
      
      if (selectedSubPathId) {
        selectSubPathMultiple(selectedSubPathId, false);
      }
      
      // Clear cycling state
      setCyclingState({
        isPending: false,
        selectedSubPathId: null,
      });
      
      return;
    }

    // Handle normal drag end
    if (dragState.isDragging) {
      // Apply final snap to grid if drag actually started
      if (dragState.dragStarted) {
        applyFinalSnapToGrid();
        
        const store = useEditorStore.getState();
        store.showFloatingToolbarAfterDrag();
      }
      
      transformManager.setMoving(false);
      
      // Clear guidelines when dragging stops
      if (enabledFeatures.stickyGuidelinesEnabled) {
        stickyManager.clearGuidelines();
      }
      
      setDragState({
        isDragging: false,
        subPathId: null,
        startPoint: null,
        lastPoint: null,
        svgElement: null,
        dragStarted: false,
        capturedElements: null,
        lastAppliedDelta: { x: 0, y: 0 },
      });
    }
  }, [dragState.isDragging, dragState.dragStarted, cyclingState, finalizeCycling, selectSubPathMultiple, enabledFeatures.stickyGuidelinesEnabled]);

  // Set up global pointer move and up handlers when dragging or cycling
  useEffect(() => {
    if (dragState.isDragging && dragState.svgElement) {
      const handleGlobalPointerMove = (e: PointerEvent) => {
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
        document.removeEventListener('pointermove', handleGlobalPointerMove);
        document.removeEventListener('pointerup', handleGlobalPointerUp);
      };
    } else if (cyclingState.isPending) {
      // Add listeners for cycling detection
      const handleGlobalPointerMove = (e: PointerEvent) => {
        const mockEvent = {
          clientX: e.clientX,
          clientY: e.clientY,
          target: e.target,
        } as any;
        handlePointerMove(mockEvent);
      };

      const handleGlobalPointerUp = () => {
        handlePointerUp();
      };

      document.addEventListener('pointermove', handleGlobalPointerMove);
      document.addEventListener('pointerup', handleGlobalPointerUp);

      return () => {
        document.removeEventListener('pointermove', handleGlobalPointerMove);
        document.removeEventListener('pointerup', handleGlobalPointerUp);
      };
    }
  }, [dragState.isDragging, dragState.svgElement, cyclingState.isPending, handlePointerMove, handlePointerUp]);  return (
    <g>
      <path
        d={props.d}
        fill={props.fill}
        stroke={props.stroke}
        strokeWidth={props.strokeWidth}
        strokeDasharray={props.strokeDasharray}
        strokeLinecap={props.strokeLinecap}
        strokeLinejoin={props.strokeLinejoin}
        fillOpacity={props.fillOpacity}
        strokeOpacity={props.strokeOpacity}
        fillRule={props.fillRule as any}
        markerStart={props.markerStart}
        markerMid={props.markerMid}
        markerEnd={props.markerEnd}
        data-element-type="path"
        data-element-id={props.pathId}
        style={props.style}
      >
        {animations}
      </path>
      
      {/* Interactive overlay for sub-path selection */}
      {props.path && (() => {
        const hasUnlockedSubPaths = props.path.subPaths?.some((sp: any) => !sp.locked);
        if (!hasUnlockedSubPaths) {
          return null;
        }

        return (
          <path
            key={`path-overlay-${props.pathId}`}
            d={props.d}
            fill="none"
            stroke="transparent"
            strokeWidth={12 / viewport.zoom}
            markerStart={props.markerStart}
            markerMid={props.markerMid}
            markerEnd={props.markerEnd}
            data-element-type="path-overlay"
            data-element-id={props.pathId}
            style={{
              cursor: dragState.isDragging ? 'grabbing' : 'pointer',
              pointerEvents: 'all',
            }}
            onPointerDown={(e) => {
              // Only handle left pointer button
              if (e.button !== 0) return;
              
              // Check if any format copy mode is active - if so, let plugin system handle it
              const currentStoreState = useEditorStore.getState();
              const isAnyFormatCopyActive = (
                (currentStoreState.isFormatCopyActive && currentStoreState.isFormatCopyActive()) ||
                (currentStoreState.isTextFormatCopyActive && currentStoreState.isTextFormatCopyActive()) ||
                (currentStoreState.isImageFormatCopyActive && currentStoreState.isImageFormatCopyActive()) ||
                (currentStoreState.isUseFormatCopyActive && currentStoreState.isUseFormatCopyActive())
              );
              
              if (isAnyFormatCopyActive) {
                return; // Don't consume the event, let it bubble up to plugin system
              }
              
              // Get the SVG element to calculate the point
              const svgElement = (e.target as SVGPathElement).closest('svg');
              if (svgElement) {
                // Create a fake ref object for compatibility with the utility function
                const svgRef = { current: svgElement };
                const point = getSVGPoint(e, svgRef, viewport);
                
                // Use the new cycling detection system
                const result = startCyclingDetection(props.path, point, 15);
                
                if (result.shouldWaitForMovement) {
                  // Set up cycling state to detect if this is a click or drag
                  setCyclingState({
                    isPending: true,
                    selectedSubPathId: result.selectedSubPathId,
                  });
                } else if (result.selectedSubPathId) {
                  // Direct selection or start drag immediately
                  const currentState = useEditorStore.getState();
                  
                  // Check if this subpath belongs to a group
                  const parentPath = currentState.paths.find(path => 
                    path.subPaths.some(sp => sp.id === result.selectedSubPathId)
                  );
                  
                  let belongsToGroup = false;
                  if (parentPath) {
                    // Check if the parent path is in any group
                    belongsToGroup = currentState.groups.some(group => 
                      group.children.some(child => child.id === parentPath.id && child.type === 'path')
                    );
                  }
                  
                  // If subpath belongs to a group, just select it and don't handle dragging here
                  // Let PointerInteraction handle the group dragging through event bubbling
                  if (belongsToGroup) {
                    const isSubPathSelected = currentState.selection.selectedSubPaths.includes(result.selectedSubPathId);
                    if (!isSubPathSelected) {
                      const selectionContext = {
                        selection: currentState.selection,
                        groups: currentState.groups,
                        paths: currentState.paths
                      };
                      
                      const shouldPreserve = shouldPreserveSelection(result.selectedSubPathId, 'subpath', selectionContext);
                      
                      if (!shouldPreserve) {
                        // Normal selection (this will trigger group promotion if needed)
                        selectSubPathMultiple(result.selectedSubPathId, e.shiftKey);
                      }
                    }
                    // Don't call stopPropagation so the event bubbles up to PointerInteraction
                    return;
                  }
                  
                  // For subpaths NOT in groups, handle dragging directly
                  const isAlreadySelected = currentState.selection.selectedSubPaths.includes(result.selectedSubPathId);
                  
                  if (isAlreadySelected) {
                    // Subpath is already selected, start drag immediately
                    startDragOperation(result.selectedSubPathId, point, svgElement);
                  } else {
                    // Check if we should preserve the current selection
                    const selectionContext = {
                      selection: currentState.selection,
                      groups: currentState.groups,
                      paths: currentState.paths
                    };
                    
                    const shouldPreserve = shouldPreserveSelection(result.selectedSubPathId, 'subpath', selectionContext);
                    
                    if (shouldPreserve) {
                      // Preserve current selection - just start drag with current selection
                      startDragOperation(result.selectedSubPathId, point, svgElement);
                    } else {
                      // New selection - select first, then start drag
                      selectSubPathMultiple(result.selectedSubPathId, e.shiftKey);
                      // Start drag operation immediately after selection
                      startDragOperation(result.selectedSubPathId, point, svgElement);
                    }
                  }
                }
                
                // Only stop propagation if subpath doesn't belong to a group
                // When it belongs to a group, let the event bubble up to PointerInteraction
                const currentState = useEditorStore.getState();
                const parentPath = currentState.paths.find(path => 
                  path.subPaths.some(sp => sp.id === result.selectedSubPathId)
                );
                
                const belongsToGroup = parentPath && currentState.groups.some(group => 
                  group.children.some(child => child.id === parentPath.id && child.type === 'path')
                );
                
                if (!belongsToGroup) {
                  e.stopPropagation();
                }
              }
            }}
          />
        );
      })()}
      
      {/* Render selected subpaths with visual feedback */}
      {props.path?.subPaths?.map((subPath: any) => {
        const { selection } = useEditorStore.getState();
        const isSelected = selection.selectedSubPaths.includes(subPath.id);
        if (!isSelected) return null;

        // Use context-aware string generation for proper visual feedback
        const d = subPathToString(subPath);
        
        // Determine the primary color of this path for contrast calculation
        const pathStroke = props.stroke;
        const pathFill = props.fill;
        
        // Use stroke color if available, otherwise use fill color
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
              data-element-type="subpath"
              data-element-id={subPath.id}
              data-subpath-id={subPath.id}
              style={{
                pointerEvents: 'all',
                cursor: 'pointer',
                filter: `drop-shadow(0 0 ${3 / viewport.zoom}px ${contrastColor})`,
              }}
              onPointerDown={(e) => {
                // Check if any format copy mode is active - if so, let plugin system handle it
                const currentStoreState = useEditorStore.getState();
                const isAnyFormatCopyActive = (
                  (currentStoreState.isFormatCopyActive && currentStoreState.isFormatCopyActive()) ||
                  (currentStoreState.isTextFormatCopyActive && currentStoreState.isTextFormatCopyActive()) ||
                  (currentStoreState.isImageFormatCopyActive && currentStoreState.isImageFormatCopyActive()) ||
                  (currentStoreState.isUseFormatCopyActive && currentStoreState.isUseFormatCopyActive())
                );
                
                if (isAnyFormatCopyActive) {
                  return; // Don't consume the event, let it bubble up to plugin system
                }
                
                // Get the SVG element for deep selection check
                const svgElementForDeepSelection = (e.target as SVGPathElement).closest('svg');
                if (svgElementForDeepSelection) {
                  const svgRef = { current: svgElementForDeepSelection };
                  const point = getSVGPoint(e, svgRef, viewport);
                  
                  // Use the new cycling detection system
                  const result = startCyclingDetection(props.path, point, 15);
                  
                  if (result.shouldWaitForMovement) {
                    // Set up cycling state to detect if this is a click or drag
                    setCyclingState({
                      isPending: true,
                      selectedSubPathId: result.selectedSubPathId,
                    });
                  } else if (result.selectedSubPathId) {
                    // Direct selection or start drag immediately
                    const currentState = useEditorStore.getState();
                    
                    // Check if this subpath belongs to a group
                    const parentPath = currentState.paths.find(path => 
                      path.subPaths.some(sp => sp.id === result.selectedSubPathId)
                    );
                    
                    let belongsToGroup = false;
                    if (parentPath) {
                      // Check if the parent path is in any group
                      belongsToGroup = currentState.groups.some(group => 
                        group.children.some(child => child.id === parentPath.id && child.type === 'path')
                      );
                    }
                    
                    // If subpath belongs to a group, just select it and don't handle dragging here
                    // Let PointerInteraction handle the group dragging through event bubbling
                    if (belongsToGroup) {
                      const isSubPathSelected = currentState.selection.selectedSubPaths.includes(result.selectedSubPathId);
                      if (!isSubPathSelected) {
                        const selectionContext = {
                          selection: currentState.selection,
                          groups: currentState.groups,
                          paths: currentState.paths
                        };
                        
                        const shouldPreserve = shouldPreserveSelection(result.selectedSubPathId, 'subpath', selectionContext);
                        
                        if (!shouldPreserve) {
                          // Normal selection (this will trigger group promotion if needed)
                          selectSubPathMultiple(result.selectedSubPathId, e.shiftKey);
                        }
                      }
                      // Don't call stopPropagation so the event bubbles up to PointerInteraction
                      return;
                    }
                    
                    // For subpaths NOT in groups, handle dragging directly
                    const isAlreadySelected = currentState.selection.selectedSubPaths.includes(result.selectedSubPathId);
                    
                    if (isAlreadySelected) {
                      // Subpath is already selected, start drag immediately
                      startDragOperation(result.selectedSubPathId, point, svgElementForDeepSelection);
                    } else {
                      // New selection - select first, then start drag
                      selectSubPathMultiple(result.selectedSubPathId, e.shiftKey);
                      // Start drag operation immediately after selection
                      startDragOperation(result.selectedSubPathId, point, svgElementForDeepSelection);
                    }
                  }
                }
                
                // Only stop propagation if subpath doesn't belong to a group
                // When it belongs to a group, let the event bubble up to PointerInteraction  
                const currentState = useEditorStore.getState();
                const parentPath = currentState.paths.find(path => 
                  path.subPaths.some(sp => sp.id === subPath.id)
                );
                
                const belongsToGroup = parentPath && currentState.groups.some(group => 
                  group.children.some(child => child.id === parentPath.id && child.type === 'path')
                );
                
                if (!belongsToGroup) {
                  e.stopPropagation();
                }
              }}
            />
          </g>
        );
      })}
    </g>
  );
};

// Text Element Component
const TextElementComponent: React.FC<{ text: any }> = ({ text }) => {
  const { viewport, enabledFeatures } = useEditorStore();
  const animations = useAnimationsForElement(text.id);
  const { isTextBeingEdited, updateTextContent: updateTextContentLive, stopTextEdit } = useTextEditMode();
  
  const isWireframeMode = enabledFeatures.wireframeEnabled;
  const strokeWidth = 1 / viewport.zoom;
  const isBeingEdited = isTextBeingEdited(text.id);

  // Handle content changes during editing (memoized to prevent TextEditOverlay remount)
  const handleContentChange = useCallback((content: string | string[]) => {
    if (typeof content === 'string') {
      updateTextContentLive(content);
    }
  }, [updateTextContentLive]);
  
  // Handle finishing editing (memoized to prevent TextEditOverlay remount)
  const handleFinishEditing = useCallback((save: boolean) => {
    stopTextEdit(save);
  }, [stopTextEdit]);

  let fillValue = '#000000';
  if (isWireframeMode) {
    fillValue = 'none';
  } else if (text.style.fill) {
    fillValue = getStyleValue(text.style.fill);
  }

  let strokeValue: string | undefined;
  if (isWireframeMode) {
    strokeValue = '#000000';
  } else if (text.style.stroke) {
    strokeValue = getStyleValue(text.style.stroke);
  }

  let cursorValue = 'pointer';
  if (text.locked) {
    cursorValue = 'default';
  } else if (isBeingEdited) {
    cursorValue = 'text';
  }

  return (
    <g key={text.id} data-text-id={text.id}>
      <text
        id={text.id}
        x={text.x}
        y={text.y}
        fontFamily={text.style.fontFamily}
        fontSize={text.style.fontSize}
        fontWeight={text.style.fontWeight}
        fontStyle={text.style.fontStyle}
        fontVariant={text.style.fontVariant}
        fontStretch={text.style.fontStretch}
        textDecoration={text.style.textDecoration}
        textAnchor={text.style.textAnchor}
        dominantBaseline={text.style.dominantBaseline}
        alignmentBaseline={text.style.alignmentBaseline}
        baselineShift={text.style.baselineShift}
        direction={text.style.direction}
        writingMode={text.style.writingMode}
        textRendering={text.style.textRendering}
        fill={fillValue}
        fillOpacity={text.style.fillOpacity}
        stroke={strokeValue}
        strokeWidth={isWireframeMode ? strokeWidth : (text.style.strokeWidth || 0)}
        strokeOpacity={text.style.strokeOpacity}
        strokeDasharray={Array.isArray(text.style.strokeDasharray) 
          ? text.style.strokeDasharray.join(',') 
          : text.style.strokeDasharray}
        strokeDashoffset={text.style.strokeDashoffset}
        strokeLinecap={text.style.strokeLinecap}
        strokeLinejoin={text.style.strokeLinejoin}
        strokeMiterlimit={text.style.strokeMiterlimit}
        letterSpacing={text.style.letterSpacing}
        wordSpacing={text.style.wordSpacing}
        textLength={text.style.textLength}
        lengthAdjust={text.style.lengthAdjust}
        opacity={text.style.opacity}
        transform={text.transform}
        filter={text.style.filter}
        clipPath={text.style.clipPath}
        mask={text.style.mask}
        data-element-type="text"
        data-element-id={text.id}
        style={{
          pointerEvents: text.locked ? 'none' : 'all',
          clipPath: text.style.clipPath,
          mask: text.style.mask,
          filter: text.style.filter,
          cursor: cursorValue,
          userSelect: isBeingEdited ? 'text' : 'none',
          opacity: isBeingEdited ? 0 : 1 // Hide during editing to prevent duplication
        }}
      >
        {text.content}
        {animations}
      </text>

      {/* Text Edit Overlay for single-line text */}
      {isBeingEdited && (
        <TextEditOverlay
          textElement={text}
          viewport={viewport}
          onContentChange={handleContentChange}
          onFinishEditing={handleFinishEditing}
        />
      )}
    </g>
  );
};

// Multiline Text Element Component
const MultilineTextElementComponent: React.FC<{ text: any }> = ({ text }) => {
  const { selection, viewport, renderVersion, enabledFeatures, updateTextSpan } = useEditorStore();
  const animations = useAnimationsForElement(text.id);
  const { isTextBeingEdited, updateTextContent: updateTextContentLive, stopTextEdit } = useTextEditMode();
  
  const isSelected = selection.selectedTexts.includes(text.id);
  const isWireframeMode = enabledFeatures.wireframeEnabled;
  const isBeingEdited = isTextBeingEdited(text.id);
  
  // Handle content changes during editing (memoized to prevent TextEditOverlay remount)
  const handleContentChange = useCallback((content: string | string[]) => {
        if (Array.isArray(content)) {
            updateTextContentLive(content);
    }
  }, [updateTextContentLive]);
  
  // Handle finishing editing (memoized to prevent TextEditOverlay remount)
  const handleFinishEditing = useCallback((save: boolean) => {
        stopTextEdit(save);
  }, [stopTextEdit]);
  
  return (
    <g key={`multiline-text-group-${text.id}`}>
      {/* Main multiline text element */}
      <text
        id={text.id}
        x={text.x}
        y={text.y}
        fontFamily={text.style.fontFamily}
        fontSize={text.style.fontSize}
        fontWeight={text.style.fontWeight}
        fontStyle={text.style.fontStyle}
        fontVariant={text.style.fontVariant}
        fontStretch={text.style.fontStretch}
        textDecoration={text.style.textDecoration}
        textAnchor={text.style.textAnchor}
        dominantBaseline={text.style.dominantBaseline}
        alignmentBaseline={text.style.alignmentBaseline}
        baselineShift={text.style.baselineShift}
        direction={text.style.direction}
        writingMode={text.style.writingMode}
        textRendering={text.style.textRendering}
        fill={isWireframeMode ? 'none' : (text.style.fill ? getStyleValue(text.style.fill) : '#000000')}
        fillOpacity={isWireframeMode ? 0 : text.style.fillOpacity}
        stroke={isWireframeMode ? '#000000' : (text.style.stroke ? getStyleValue(text.style.stroke) : undefined)}
        strokeWidth={isWireframeMode ? (1 / viewport.zoom) : text.style.strokeWidth}
        strokeOpacity={isWireframeMode ? 1 : text.style.strokeOpacity}
        strokeDasharray={Array.isArray(text.style.strokeDasharray) 
          ? text.style.strokeDasharray.join(',') 
          : text.style.strokeDasharray}
        strokeDashoffset={text.style.strokeDashoffset}
        strokeLinecap={text.style.strokeLinecap}
        strokeLinejoin={text.style.strokeLinejoin}
        strokeMiterlimit={text.style.strokeMiterlimit}
        letterSpacing={text.style.letterSpacing}
        wordSpacing={text.style.wordSpacing}
        textLength={text.style.textLength}
        lengthAdjust={text.style.lengthAdjust}
        opacity={text.style.opacity}
        transform={text.transform}
        filter={text.style.filter}
        clipPath={text.style.clipPath}
        mask={text.style.mask}
        style={{
          cursor: text.locked ? 'default' : (isBeingEdited ? 'text' : 'pointer'),
          pointerEvents: text.locked ? 'none' : 'all',
          userSelect: isBeingEdited ? 'text' : 'none',
          opacity: isBeingEdited ? 0 : 1 // Completely hide during editing to prevent duplication
        }}
        data-element-type="multiline-text"
        data-element-id={text.id}
      >
        {text.spans.map((span: any, index: number, spans: any[]) => {
          // Calculate the actual line number for dy (count non-empty spans before this one)
          const lineNumber = spans.slice(0, index).filter(s => s.content && s.content.trim()).length;
          
          // Don't render empty spans
          if (!span.content || !span.content.trim()) return null;
          
          return (
            <tspan
              key={span.id}
              x={text.x}
              dy={lineNumber === 0 ? 0 : (text.style?.fontSize || 16) * (text.style?.lineHeight || 1.2)}
              data-span-id={span.id}
            >
              {span.content}
            </tspan>
          );
        })}
        {/* Include animations with programmatic control */}
        {animations}
      </text>

      {/* Text Edit Overlay for multiline text */}
      {isBeingEdited && (
        <TextEditOverlay
          textElement={text}
          viewport={viewport}
          onContentChange={handleContentChange}
          onFinishEditing={handleFinishEditing}
        />
      )}

      {/* Selection indicator for multiline text */}
      {isSelected && (
        <g key={`selected-multiline-text-${text.id}-v${renderVersion}`}>
          {(() => {
            const bounds = calculateTextBoundsDOM(text);
            if (!bounds) return null;
            const margin = 4 / viewport.zoom;
            
            const primaryColor = typeof text.style.fill === 'string' ? text.style.fill : '#000000';
            const contrastColor = getContrastColor(primaryColor || '#000000');
            
            return (
              <rect
                x={bounds.x - margin}
                y={bounds.y - margin}
                width={bounds.width + margin * 2}
                height={bounds.height + margin * 2}
                fill="none"
                stroke={contrastColor}
                strokeWidth={1.5 / viewport.zoom}
                strokeDasharray={`${4 / viewport.zoom},${3 / viewport.zoom}`}
                style={{
                  pointerEvents: 'all',
                  cursor: 'pointer',
                }}
                data-element-type="multiline-text"
                data-element-id={text.id}
                onPointerDown={(e) => {
                  // Check if text format copy mode is active - if so, let plugin system handle it
                  const currentState = useEditorStore.getState();
                  if (currentState.isTextFormatCopyActive && currentState.isTextFormatCopyActive()) {
                    return; // Don't consume the event, let it bubble up to plugin system
                  }
                  // Handle normal selection if needed
                }}
              />
            );
          })()}
        </g>
      )}
    </g>
  );
};

// Image Element Component
const ImageElementComponent: React.FC<{ image: any }> = ({ image }) => {
  const { viewport, enabledFeatures } = useEditorStore();
  const animations = useAnimationsForElement(image.id);
  
  const isWireframeMode = enabledFeatures.wireframeEnabled;
  const strokeWidth = 1 / viewport.zoom;

  return (
    <g key={image.id} data-image-id={image.id}>
      {isWireframeMode ? (
        <g>
          <rect
            x={image.x}
            y={image.y}
            width={image.width}
            height={image.height}
            fill="none"
            stroke="#000000"
            strokeWidth={strokeWidth}
            data-element-type="image"
            data-element-id={image.id}
            style={{ 
              pointerEvents: 'all',
              clipPath: image.style?.clipPath,
              mask: image.style?.mask,
              filter: image.style?.filter
            }}
          />
          <text
            x={image.x + image.width / 2}
            y={image.y + image.height / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={Math.min(12 / viewport.zoom, image.width / 8, image.height / 8)}
            fill="#666666"
            style={{ pointerEvents: 'none' }}
          >
            IMG
          </text>
          {animations}
        </g>
      ) : (
        <g>
          <image
            x={image.x}
            y={image.y}
            width={image.width}
            height={image.height}
            href={image.href}
            opacity={image.style?.opacity !== undefined ? image.style.opacity : 1}
            transform={image.transform}
            data-element-type="image"
            data-element-id={image.id}
            style={{ 
              pointerEvents: 'all',
              clipPath: image.style?.clipPath,
              mask: image.style?.mask,
              filter: image.style?.filter
            }}
          />
          {animations}
        </g>
      )}
    </g>
  );
};

// Use Element Component
const UseElementComponent: React.FC<{ useElement: any }> = ({ useElement }) => {
  const { symbols, selection, viewport, enabledFeatures } = useEditorStore();
  const animations = useAnimationsForElement(useElement.id);
  
  const isSelected = selection.selectedUses.includes(useElement.id);
  const isWireframeMode = enabledFeatures.wireframeEnabled;
  const strokeWidth = 1 / viewport.zoom;

  // Helper function to convert gradient/pattern objects to URL references
  const styleValueToCSS = (value: any): string | undefined => {
    if (value === null || value === undefined) {
      return undefined;
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'object' && value !== null && value.id) {
      // It's a gradient or pattern object, convert to URL reference
      return `url(#${value.id})`;
    }
    return String(value);
  };

  // Calculate effective position considering transform
  const getEffectivePosition = () => {
    if (!useElement.transform || !useElement.transform.includes('translate')) {
      // No translate in transform, use x,y directly
      return { x: useElement.x, y: useElement.y };
    }
    
    // Has translate in transform, the x,y are used for bbox calculations
    // but for rendering we need to let the transform handle positioning
    return { x: 0, y: 0 };
  };

  const { x: effectiveX, y: effectiveY } = getEffectivePosition();

  return (
    <g key={useElement.id} data-use-id={useElement.id}>
      {/* Invisible interaction rectangle for better pointer event detection */}
      <rect
        x={effectiveX}
        y={effectiveY}
        width={useElement.width || 100}
        height={useElement.height || 100}
        transform={useElement.transform}
        fill="transparent"
        stroke="none"
        pointerEvents="all"
        data-element-type="use"
        data-element-id={useElement.id}
        style={{ cursor: 'pointer' }}
      />
      
      {/* Render as wireframe or normal use element depending on mode */}
      {isWireframeMode ? (
        // Wireframe mode: render as outlined rectangle with symbol label
        <g>
          <rect
            x={effectiveX}
            y={effectiveY}
            width={useElement.width || 100}
            height={useElement.height || 100}
            fill="none"
            stroke="#000000"
            strokeWidth={strokeWidth * 2}
            transform={useElement.transform}
            pointerEvents="none"
            data-element-type="use-visual"
            data-element-id={useElement.id}
            style={{
              opacity: useElement.style?.opacity ?? 1,
            }}
          />
          {/* Diagonal lines to indicate it's a symbol instance */}
          <line
            x1={effectiveX}
            y1={effectiveY}
            x2={effectiveX + (useElement.width || 100)}
            y2={effectiveY + (useElement.height || 100)}
            stroke="#000000"
            strokeWidth={strokeWidth}
            transform={useElement.transform}
            style={{
              opacity: 0.3,
              pointerEvents: 'none'
            }}
          />
          <line
            x1={effectiveX + (useElement.width || 100)}
            y1={effectiveY}
            x2={effectiveX}
            y2={effectiveY + (useElement.height || 100)}
            stroke="#000000"
            strokeWidth={strokeWidth}
            transform={useElement.transform}
            style={{
              opacity: 0.3,
              pointerEvents: 'none'
            }}
          />
          {/* Symbol reference label */}
          <text
            x={effectiveX + 4}
            y={effectiveY + 12}
            fontSize={10 / viewport.zoom}
            fill="#000000"
            style={{
              opacity: 0.7,
              pointerEvents: 'none',
              fontFamily: 'monospace'
            }}
            transform={useElement.transform}
          >
            {useElement.href?.replace('#', '') || 'SYM'}
          </text>
        </g>
      ) : (
        // Normal mode: render actual use element
        <use
          id={useElement.id}
          href={useElement.href}
          x={effectiveX}
          y={effectiveY}
          width={useElement.width}
          height={useElement.height}
          transform={useElement.transform}
          style={{
            opacity: useElement.style?.opacity ?? 1,
            clipPath: styleValueToCSS(useElement.style?.clipPath),
            mask: styleValueToCSS(useElement.style?.mask),
            filter: styleValueToCSS(useElement.style?.filter),
            fill: styleValueToCSS(useElement.style?.fill) || '#000000',
            stroke: styleValueToCSS(useElement.style?.stroke) || 'none',
            strokeWidth: useElement.style?.strokeWidth ?? 1,
            strokeOpacity: useElement.style?.strokeOpacity ?? 1,
            fillOpacity: useElement.style?.fillOpacity ?? 1,
            strokeDasharray: useElement.style?.strokeDasharray || 'none',
            strokeLinecap: useElement.style?.strokeLinecap || 'butt',
            strokeLinejoin: useElement.style?.strokeLinejoin || 'miter',
          }}
          pointerEvents="none"
          data-element-type="use-visual"
          data-element-id={useElement.id}
        />
      )}
      {/* Include animations as siblings that target the use element */}
      {animations}
      
      {/* Selection outline removed - handled by TransformManager/TransformHandles */}
    </g>
  );
};

// Helper functions for rendering elements
const renderPathElement = (path: any, selection: any, viewport: any, enabledFeatures: any, ui: any): React.JSX.Element | null => {
  const selectionVisible = ui?.selectionVisible ?? true;
  const pathHasSelectedSubPath = path.subPaths.some((subPath: any) => 
    selection.selectedSubPaths.includes(subPath.id)
  );
  
  if (!selectionVisible && pathHasSelectedSubPath) {
    return null;
  }
  
  const d = path.subPaths.map(subPathToString).join(' ');
  const isWireframeMode = enabledFeatures.wireframeEnabled;
  const wireframeStrokeWidth = 2 / viewport.zoom;
  
  let fillValue = '#000000'; // SVG default is black
  if (isWireframeMode) {
    fillValue = 'none';
  } else if (path.style.fill) {
    fillValue = getStyleValue(path.style.fill);
  }

  let strokeValue: string | undefined;
  if (isWireframeMode) {
    strokeValue = '#000000';
  } else if (path.style.stroke) {
    strokeValue = getStyleValue(path.style.stroke);
  }
  
  return (
    <PathWithAnimations
      pathId={path.id}
      d={d}
      fill={fillValue}
      stroke={strokeValue}
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
      path={path}
      style={{ 
        pointerEvents: 'all',
        clipPath: path.style.clipPath,
        mask: path.style.mask,
        filter: path.style.filter
      }}
    />
  );
};

const renderTextElement = (text: any): React.JSX.Element => {
  if (text.type === 'multiline-text') {
    return <MultilineTextElementComponent text={text} />;
  }
  return <TextElementComponent text={text} />;
};

const renderImageElement = (image: any): React.JSX.Element => {
  return <ImageElementComponent image={image} />;
};

const renderUseElement = (useElement: any): React.JSX.Element => {
  return <UseElementComponent useElement={useElement} />;
};

export const UnifiedRenderer: React.FC = () => {
  const { selection, viewport, enabledFeatures, ui, symbols, paths, groups } = useEditorStore();
  
  // Helper function to render symbol child content (from SymbolRenderer)
  const renderChildContent = (childId: string, childType: string) => {
    switch (childType) {
      case 'path': {
        const path = paths.find(p => p.id === childId);
        if (!path) return null;
        
        // Convert path to SVG path string
        const pathData = path.subPaths.map(subPath => 
          subPath.commands.map((cmd: any) => {
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
          }).join(' ')
        ).join(' ');

        return (
          <path
            key={childId}
            d={pathData}
          />
        );
      }

      case 'group': {
        const group = groups.find(g => g.id === childId);
        if (!group) return null;
        
        return (
          <g key={childId} transform={group.transform}>
            {group.children.map((child: any) => renderChildContent(child.id, child.type)).filter(Boolean)}
          </g>
        );
      }

      default:
        return null;
    }
  };
  
  // Get all elements sorted by z-index
  const allOrderedElements = getAllElementsByZIndex();
  
  // Convert to render items
  const renderItems: RenderItem[] = allOrderedElements.map(({ type, element }) => {
    const elementZIndex = getElementZIndex(element.id) || 0;
    
    let renderedElement: React.JSX.Element | null = null;
    
    switch (type) {
      case 'path':
        renderedElement = renderPathElement(element, selection, viewport, enabledFeatures, ui);
        break;
      case 'text':
        renderedElement = renderTextElement(element);
        break;
      case 'image':
        renderedElement = renderImageElement(element);
        break;
      case 'use':
        renderedElement = renderUseElement(element);
        break;
      default:
        break;
    }
    
    return {
      zIndex: elementZIndex,
      elementId: element.id,
      type,
      element: renderedElement
    };
  });

  // Filter out null elements and sort by z-index
  const validItems = renderItems.filter(item => item.element !== null);
  const sortedItems = validItems.toSorted((a: RenderItem, b: RenderItem) => a.zIndex - b.zIndex);

  return (
    <>
      {/* Render Symbol Definitions */}
      {symbols.length > 0 && (
        <defs>
          {symbols.map((symbol: any) => (
            <symbol
              key={symbol.id}
              id={symbol.id}
              viewBox={symbol.viewBox}
              preserveAspectRatio={symbol.preserveAspectRatio}
            >
              {symbol.children.map((child: any, index: number) => {
                // Handle direct child objects (created from selection)
                if (child.type === 'path' && (child as any).subPaths) {
                  const subPaths = (child as any).subPaths;
                  if (!subPaths || !Array.isArray(subPaths)) {
                    console.warn('Symbol child has invalid subPaths:', child);
                    return null;
                  }
                  
                  const pathData = subPaths.map((subPath: any) => {
                    if (!subPath.commands || !Array.isArray(subPath.commands)) {
                      return '';
                    }
                    return subPath.commands.map((cmd: any) => {
                      switch (cmd.command) {
                        case 'M':
                          return `M ${cmd.x || 0} ${cmd.y || 0}`;
                        case 'L':
                          return `L ${cmd.x || 0} ${cmd.y || 0}`;
                        case 'C':
                          return `C ${cmd.x1 || 0} ${cmd.y1 || 0} ${cmd.x2 || 0} ${cmd.y2 || 0} ${cmd.x || 0} ${cmd.y || 0}`;
                        case 'Z':
                          return 'Z';
                        default:
                          return '';
                      }
                    }).join(' ');
                  }).join(' ');

                  // Only render if we have valid path data
                  if (!pathData || pathData.trim() === '') {
                    console.warn('Symbol child generated empty path data:', child);
                    return null;
                  }

                  // Create path without explicit styles to allow inheritance from <use>
                  return (
                    <path
                      key={`${symbol.id}-child-${index}`}
                      d={pathData}
                    />
                  );
                }
                
                // Handle reference-based children (existing logic)
                if ((child as any).id && child.type) {
                  return renderChildContent((child as any).id, child.type);
                }
                
                // Skip unhandled children
                return null;
              }).filter(Boolean)}
            </symbol>
          ))}
        </defs>
      )}

      {/* Render all elements sorted by z-index */}
      {sortedItems.map((item: RenderItem) => (
        <g 
          key={item.elementId}
          data-unified-element-id={item.elementId}
          data-unified-element-type={item.type}
        >
          {item.element}
        </g>
      ))}
    </>
  );
};
