import React from 'react';
import { useEditorStore } from '../../store/editorStore';
import { getAbsoluteCommandPosition, getAbsoluteControlPoints } from '../../utils/path-utils';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { figmaHandleManager } from '../figma-handles/FigmaHandleManager';
import { ControlPointType } from '../../types';

// Helper function to get control point size
const getControlPointSize = (isMobile: boolean, isTablet: boolean): number => {
  if (isMobile) return 12;
  if (isTablet) return 10;
  return 8;
};

// Helper function to get handle colors based on type
const getHandleColors = (type: ControlPointType, isOptionPressed: boolean) => {
  if (isOptionPressed) {
    return {
      fill: '#fbbf24', // Amarillo cuando Option está presionado
      stroke: '#f59e0b',
      lineColor: '#fbbf24'
    };
  }
  
  switch (type) {
    case 'mirrored':
      return {
        fill: '#10b981', // Verde para simétrico
        stroke: '#059669',
        lineColor: '#10b981'
      };
    case 'aligned':
      return {
        fill: '#3b82f6', // Azul para alineado
        stroke: '#2563eb',
        lineColor: '#3b82f6'
      };
    case 'independent':
      return {
        fill: '#f59e0b', // Amarillo para independiente
        stroke: '#d97706',
        lineColor: '#f59e0b'
      };
    default:
      return {
        fill: '#999',
        stroke: '#666',
        lineColor: '#999'
      };
  }
};

export const FigmaHandleRenderer: React.FC = () => {
  const { paths, enabledFeatures, viewport, selection, visualDebugSizes } = useEditorStore();
  const { isMobile, isTablet } = useMobileDetection();
  const [handleState, setHandleState] = React.useState(figmaHandleManager.getState());

  // Subscribe to handle state changes
  React.useEffect(() => {
    const unsubscribe = figmaHandleManager.addListener(() => {
      setHandleState(figmaHandleManager.getState());
    });
    
    return unsubscribe;
  }, []);

  if (!paths || paths.length === 0) {
    return null;
  }

  // Check if control points feature is enabled
  const controlPointsEnabled = enabledFeatures.has('control-points');
  
  // Check if any sub-path is selected or any command is selected
  const hasSelectedSubPath = selection.selectedSubPaths.length > 0;
  const hasSelectedCommand = selection.selectedCommands.length > 0;
  
  // Show if feature is enabled OR if any sub-path is selected OR if any command is selected
  const shouldShow = controlPointsEnabled || hasSelectedSubPath || hasSelectedCommand;
  
  if (!shouldShow) {
    return null;
  }

  // Durante el drag, solo mostrar el handle que se arrastra y su pareja
  const isDragging = handleState.dragState.isDragging;
  const dragCommandId = handleState.dragState.commandId;
  const dragHandleType = handleState.dragState.handleType;
  
  // Si estamos en modo drag, obtener información de la pareja
  const pairedHandle = isDragging && dragCommandId && dragHandleType 
    ? figmaHandleManager.findPairedHandle(dragCommandId, dragHandleType) 
    : null;

  return (
    <>
      {paths.map((path) => 
        path.subPaths.map((subPath) => {
          // If feature is disabled, only show control points for selected sub-paths
          const isSubPathSelected = selection.selectedSubPaths.includes(subPath.id);
          const shouldShowSubPath = enabledFeatures.has('control-points') || isSubPathSelected;
          
          return subPath.commands.map((command, commandIndex) => {
            // Get the absolute position of the command
            const position = getAbsoluteCommandPosition(command, subPath, path.subPaths);
            if (!position) return null;
            
            const isCommandSelected = selection.selectedCommands.includes(command.id);
            
            // Show control points if:
            // 1. Feature is enabled, OR
            // 2. Sub-path is selected, OR 
            // 3. This specific command is selected
            const shouldShowCommand = shouldShowSubPath || isCommandSelected;
            
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
            
            // Get control point info from Figma handle manager
            const controlPointInfo = handleState.controlPoints.get(command.id);
            const handleType = controlPointInfo?.type || 'independent';
            const colors = getHandleColors(handleType, handleState.isOptionPressed);
            
            // Calcular radio responsivo basado en el dispositivo con factores de tamaño
            const baseRadius = getControlPointSize(isMobile, isTablet);
            const radius = (baseRadius * visualDebugSizes.globalFactor * visualDebugSizes.controlPointsFactor) / viewport.zoom;
            
            // Find previous command position for connecting control points
            const prevCommand = commandIndex > 0 ? subPath.commands[commandIndex - 1] : null;
            const prevPosition = prevCommand ? getAbsoluteCommandPosition(prevCommand, subPath, path.subPaths) : null;
            
            // Get absolute control points for this command with path context
            const controlPoints = getAbsoluteControlPoints(command, subPath, path.subPaths);
            
            return (
              <g key={`figma-control-${command.id}`}>
                {/* Render control points for cubic curves */}
                {command.command === 'C' && controlPoints.length >= 2 && (
                  <>
                    {/* First control point (x1y1) - handle saliente */}
                    {prevPosition && (
                      <>
                        {/* Mostrar este handle si no estamos en drag, o si es el handle específico que debe mostrarse */}
                        {(!isDragging || 
                          (isDragging && command.id === dragCommandId && dragHandleType === 'outgoing') ||
                          (isDragging && isPairedCommand && pairedHandle?.controlPoint === 'x1y1')) && (
                          <>
                            <line
                              x1={prevPosition.x}
                              y1={prevPosition.y}
                              x2={controlPoints[0].x}
                              y2={controlPoints[0].y}
                              stroke={colors.lineColor}
                              strokeWidth={1 / viewport.zoom}
                              strokeDasharray={`${2 / viewport.zoom},${2 / viewport.zoom}`}
                              pointerEvents="none"
                              opacity={0.8}
                            />
                            <circle
                              cx={controlPoints[0].x}
                              cy={controlPoints[0].y}
                              r={radius * 0.7}
                              fill={colors.fill}
                              stroke={colors.stroke}
                              strokeWidth={1.5 / viewport.zoom}
                              style={{ cursor: 'grab' }}
                              data-command-id={command.id}
                              data-control-point="x1y1"
                            />
                          </>
                        )}
                      </>
                    )}
                    
                    {/* Second control point (x2y2) - handle entrante */}
                    {controlPoints.length >= 2 && (
                      <>
                        {/* Mostrar este handle si no estamos en drag, o si es el handle específico que debe mostrarse */}
                        {(!isDragging || 
                          (isDragging && command.id === dragCommandId && dragHandleType === 'incoming') ||
                          (isDragging && isPairedCommand && pairedHandle?.controlPoint === 'x2y2')) && (
                          <>
                            <line
                              x1={position.x}
                              y1={position.y}
                              x2={controlPoints[1].x}
                              y2={controlPoints[1].y}
                              stroke={colors.lineColor}
                              strokeWidth={1 / viewport.zoom}
                              strokeDasharray={`${2 / viewport.zoom},${2 / viewport.zoom}`}
                              pointerEvents="none"
                              opacity={0.8}
                            />
                            <circle
                              cx={controlPoints[1].x}
                              cy={controlPoints[1].y}
                              r={radius * 0.7}
                              fill={colors.fill}
                              stroke={colors.stroke}
                              strokeWidth={1.5 / viewport.zoom}
                              style={{ cursor: 'grab' }}
                              data-command-id={command.id}
                              data-control-point="x2y2"
                            />
                          </>
                        )}
                      </>
                    )}
                    
                    {/* Indicador simple del tipo en el anchor cuando el comando está seleccionado (sin drag) */}
                    {!isDragging && isCommandSelected && controlPointInfo && (
                      <circle
                        cx={position.x}
                        cy={position.y}
                        r={radius * 0.4}
                        fill={colors.fill}
                        stroke={colors.stroke}
                        strokeWidth={0.5 / viewport.zoom}
                        pointerEvents="none"
                        opacity={0.7}
                      />
                    )}
                  </>
                )}
              </g>
            );
          });
        })
      )}
    </>
  );
};
