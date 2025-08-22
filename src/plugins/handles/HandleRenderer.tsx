import React from 'react';
import { useEditorStore } from '../../store/editorStore';
import { getAbsoluteCommandPosition, getAbsoluteControlPoints } from '../../utils/path-utils';
import { useMobileDetection, getInteractionRadius } from '../../hooks/useMobileDetection';
import { handleManager } from './HandleManager';
import { ControlPointType } from '../../types';

// Helper function to get control point size
const getControlPointSize = (isMobile: boolean, isTablet: boolean): number => {
  if (isMobile) return 12;
  if (isTablet) return 10;
  return 8;
};


// Helper function to get handle colors based on type and display mode
const getHandleColors = (type: ControlPointType, isOptionPressed: boolean, isNextCommandDisplay: boolean = false) => {
  // Control points: white fill with blue border
  const fillColor = '#ffffff';
  const strokeColor = '#007acc';
  const lineColor = '#007acc';
  
  if (isOptionPressed) {
    return {
      fill: '#fbbf24', // Yellow when Option is pressed
      stroke: '#f59e0b',
      lineColor: '#fbbf24',
      opacity: 1.0
    };
  }
  
  // White fill with blue border for all control points
  return {
    fill: fillColor,
    stroke: strokeColor,
    lineColor: lineColor,
    opacity: 1.0
  };
};

export const HandleRenderer: React.FC = () => {
  const { paths, enabledFeatures, viewport, selection, visualDebugSizes, mode, ui } = useEditorStore();
  const { isMobile, isTablet } = useMobileDetection();
  const [handleState, setHandleState] = React.useState(handleManager.getState());
  const [renderKey, setRenderKey] = React.useState(0);

  // Subscribe to handle state changes
  React.useEffect(() => {
    const unsubscribe = handleManager.addListener(() => {
      const newState = handleManager.getState();
      setHandleState(newState);
      
      // NO incrementar renderKey durante el drag - esto causa que React desmonte los elementos
      // Solo incrementar cuando NO estamos en drag
      if (!newState.dragState.isDragging) {
        setRenderKey(prev => prev + 1);
      }
    });
    
    return unsubscribe;
  }, []);

  // Force re-render when visual debug sizes change
  React.useEffect(() => {
    setRenderKey(prev => prev + 1);
  }, [visualDebugSizes.globalFactor, visualDebugSizes.controlPointsFactor]);

  // Memoize drag state to prevent unnecessary re-renders during drag
  const dragStateInfo = React.useMemo(() => {
    const isDragging = handleState.dragState.isDragging;
    const dragCommandId = handleState.dragState.commandId;
    const dragHandleType = handleState.dragState.handleType;
    
    return {
      isDragging,
      dragCommandId,
      dragHandleType,
      pairedHandle: isDragging && dragCommandId && dragHandleType 
        ? handleManager.findPairedHandle(dragCommandId, dragHandleType) 
        : null
    };
  }, [handleState.dragState.isDragging, handleState.dragState.commandId, handleState.dragState.handleType]);

  if (!paths || paths.length === 0) {
    return null;
  }

  // Check if control points feature is enabled
  const controlPointsEnabled = enabledFeatures.controlPointsEnabled;
  const isSubpathEditMode = mode?.current === 'subpath-edit';
  const subpathShowCommandPoints = enabledFeatures.subpathShowCommandPoints ?? true;
  const subpathShowControlPoints = enabledFeatures.subpathShowControlPoints ?? true;
  
  // Check if any sub-path is selected or any command is selected
  const hasSelectedSubPath = selection.selectedSubPaths.length > 0;
  const hasSelectedCommand = selection.selectedCommands.length > 0;
  const selectionVisible = ui?.selectionVisible ?? true;
  
  // Show if feature is enabled OR if any sub-path is selected OR if any command is selected
  // For subpath-edit mode we additionally respect per-class flags
  // Also respect selectionVisible state for hiding during animations
  const shouldShow = selectionVisible && ((isSubpathEditMode && (subpathShowCommandPoints || subpathShowControlPoints)) || controlPointsEnabled || hasSelectedSubPath || hasSelectedCommand);

  if (!shouldShow) {
    return null;
  }

  // Use memoized drag state info
  const { isDragging, dragCommandId, dragHandleType, pairedHandle } = dragStateInfo;

  // Calcular radio responsivo basado en el dispositivo con factores de tamaño - una vez por render
  const baseRadius = getControlPointSize(isMobile, isTablet);
  const controlPointRadius = baseRadius * visualDebugSizes.globalFactor * visualDebugSizes.controlPointsFactor;

  // Use stable key during drag to prevent React from dismounting elements
  // Include visualDebugSizes factors to force re-render when they change
  const debugKey = `${visualDebugSizes.globalFactor}-${visualDebugSizes.controlPointsFactor}`;
  const stableKey = isDragging ? `handle-renderer-stable-${debugKey}` : `handle-renderer-${renderKey}-${debugKey}`;

  return (
    <g key={stableKey}>
      {paths.map((path) => 
        path.subPaths.map((subPath) => {
          // No mostrar puntos de control para subpaths bloqueados
          if (subPath.locked) return null;
          
          // If feature is disabled, only show control points for selected sub-paths
          const isSubPathSelected = selection.selectedSubPaths.includes(subPath.id);

          if (enabledFeatures.hidePointsInSelect && isSubPathSelected) return null;

          const shouldShowSubPath = selectionVisible && (enabledFeatures.controlPointsEnabled || isSubPathSelected);
          return subPath.commands.map((command, commandIndex) => {
            // Get the absolute position of the command
            const position = getAbsoluteCommandPosition(command, subPath, path.subPaths);
            if (!position) return null;
            const isCommandSelected = selection.selectedCommands.includes(command.id);
            // Check if this command has control points in the handle state
            const hasControlPoints = handleState.controlPoints.has(command.id);
            const controlPointInfoForCheck = handleState.controlPoints.get(command.id);
            // Show control points if:
            // 1. We're in subpath-edit mode (show everything), OR
            // 2. Feature is enabled / subpath is selected, OR 
            // 3. This specific command is selected, OR
            // 4. This command has control points to show (from HandleManager)
            const shouldShowCommand = selectionVisible && (isSubpathEditMode || shouldShowSubPath || isCommandSelected || hasControlPoints);
            if (!shouldShowCommand) return null;
            
            // Durante el drag, solo mostrar el comando que se arrastra y su pareja
            if (isDragging) {
              const isCurrentDragCommand = command.id === dragCommandId;
              const isPairedCommand = pairedHandle && pairedHandle.commandId === command.id;
              
              if (!isCurrentDragCommand && !isPairedCommand) {
                return null; // No mostrar este comando
              }
            }
            
            // Variables para uso en la lógica de renderizado
            const isCurrentDragCommand = isDragging && command.id === dragCommandId;
            const isPairedCommand = isDragging && pairedHandle && pairedHandle.commandId === command.id;
            
            // Get control point info from handle manager
            const controlPointInfo = handleState.controlPoints.get(command.id);
            const handleType = controlPointInfo?.type || 'independent';
            const isNextCommandDisplay = controlPointInfo?.isNextCommandDisplay || false;
            const colors = getHandleColors(handleType, handleState.isOptionPressed, isNextCommandDisplay);
            
            // Usar el radio calculado globalmente
            const radius = controlPointRadius;
            
            // Find previous command position for connecting control points
            const prevCommand = commandIndex > 0 ? subPath.commands[commandIndex - 1] : null;
            const prevPosition = prevCommand ? getAbsoluteCommandPosition(prevCommand, subPath, path.subPaths) : null;
            
            // Get absolute control points for this command with path context
            const controlPoints = getAbsoluteControlPoints(command, subPath, path.subPaths);

            // If we're in subpath-edit mode, optionally hide control points based on feature flag
            if (isSubpathEditMode && !subpathShowControlPoints) {
              return null;
            }
            
            return (
              <g key={`handle-control-${command.id}`}>
                {/* Render control points for cubic curves */}
                {command.command === 'C' && controlPoints.length >= 2 ? (
                  <>
                    {/* First control point (x1y1) - handle saliente */}
                    {prevPosition && (
                      <>
                        {/* Mostrar este handle: SIEMPRE si estamos arrastrando este comando y este control point */}
                        {(() => {
                          const isBeingDragged = isDragging && command.id === dragCommandId && dragHandleType === 'outgoing';
                          const shouldShow = !isDragging || 
                            (isDragging && command.id === dragCommandId) ||
                            (isDragging && isPairedCommand && pairedHandle?.controlPoint === 'x1y1');
                          
                          // Si estamos arrastrando este control point específico, SIEMPRE mostrarlo
                          return shouldShow || isBeingDragged;
                        })() && (
                          <>
                            <line
                              x1={prevPosition.x}
                              y1={prevPosition.y}
                              x2={controlPoints[0].x}
                              y2={controlPoints[0].y}
                              stroke={colors.lineColor}
                              strokeWidth={1}
                              vectorEffect="non-scaling-stroke"
                              strokeDasharray={`${2 / viewport.zoom},${2 / viewport.zoom}`}
                              pointerEvents="none"
                              opacity={1.0}
                            />
                            <g transform={`translate(${controlPoints[0].x},${controlPoints[0].y}) scale(${1 / viewport.zoom}) translate(${-controlPoints[0].x},${-controlPoints[0].y})`}>
                              {/* Visual control point */}
                              <circle
                                cx={controlPoints[0].x}
                                cy={controlPoints[0].y}
                                r={radius * 0.7}
                                fill={colors.fill}
                                stroke={colors.stroke}
                                strokeWidth={1.5}
                                vectorEffect="non-scaling-stroke"
                                className="control-point"
                                opacity={1.0}
                                style={{ pointerEvents: 'none' }}
                                // Durante el drag, hacer el punto más visible
                                filter={isDragging && command.id === dragCommandId && dragHandleType === 'outgoing' ? 'drop-shadow(0 0 4px rgba(0,0,0,0.5))' : undefined}
                              />
                              {/* Interaction overlay */}
                              <circle
                                cx={controlPoints[0].x}
                                cy={controlPoints[0].y}
                                r={getInteractionRadius(radius * 0.7, isMobile, isTablet)}
                                fill="transparent"
                                stroke="none"
                                className="control-point-interaction-overlay"
                                data-command-id={command.id}
                                data-prev-command-id={prevCommand ? prevCommand.id : undefined}
                                data-control-point="x1y1"
                                style={{ cursor: 'default' }}
                              />
                            </g>
                          </>
                        )}
                      </>
                    )}
                    
                    {/* Second control point (x2y2) - handle entrante */}
                    {controlPoints.length >= 2 && (
                      <>
                        {/* Mostrar este handle: SIEMPRE si estamos arrastrando este comando y este control point */}
                        {(() => {
                          const isBeingDragged = isDragging && command.id === dragCommandId && dragHandleType === 'incoming';
                          const shouldShow = !isDragging || 
                            (isDragging && command.id === dragCommandId) ||
                            (isDragging && isPairedCommand && pairedHandle?.controlPoint === 'x2y2');
                          
                          // Si estamos arrastrando este control point específico, SIEMPRE mostrarlo
                          return shouldShow || isBeingDragged;
                        })() && (
                          <>
                            <line
                              x1={position.x}
                              y1={position.y}
                              x2={controlPoints[1].x}
                              y2={controlPoints[1].y}
                              stroke={colors.lineColor}
                              strokeWidth={1}
                              vectorEffect="non-scaling-stroke"
                              strokeDasharray={`${2 / viewport.zoom},${2 / viewport.zoom}`}
                              pointerEvents="none"
                              opacity={1.0}
                            />
                            <g transform={`translate(${controlPoints[1].x},${controlPoints[1].y}) scale(${1 / viewport.zoom}) translate(${-controlPoints[1].x},${-controlPoints[1].y})`}>
                              {/* Visual control point */}
                              <circle
                                cx={controlPoints[1].x}
                                cy={controlPoints[1].y}
                                r={radius * 0.7}
                                fill={colors.fill}
                                stroke={colors.stroke}
                                strokeWidth={1.5}
                                vectorEffect="non-scaling-stroke"
                                className="control-point"
                                opacity={1.0}
                                style={{ pointerEvents: 'none' }}
                                // Durante el drag, hacer el punto más visible
                                filter={isDragging && command.id === dragCommandId && dragHandleType === 'incoming' ? 'drop-shadow(0 0 4px rgba(0,0,0,0.5))' : undefined}
                              />
                              {/* Interaction overlay */}
                              <circle
                                cx={controlPoints[1].x}
                                cy={controlPoints[1].y}
                                r={getInteractionRadius(radius * 0.7, isMobile, isTablet)}
                                fill="transparent"
                                stroke="none"
                                className="control-point-interaction-overlay"
                                data-command-id={command.id}
                                data-control-point="x2y2"
                                style={{ cursor: 'default' }}
                              />
                            </g>
                          </>
                        )}
                      </>
                    )}

                  </>
                ) : null}
              </g>
            );
          });
        })
      )}
    </g>
  );
};
