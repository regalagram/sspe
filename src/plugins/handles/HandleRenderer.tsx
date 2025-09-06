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

// Memoized SVG components for performance optimization
interface ControlPointLineProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  zoom: number;
}

const ControlPointLine = React.memo<ControlPointLineProps>(({ x1, y1, x2, y2, color, zoom }) => (
  <line
    x1={x1}
    y1={y1}
    x2={x2}
    y2={y2}
    stroke={color}
    strokeWidth={1}
    vectorEffect="non-scaling-stroke"
    strokeDasharray={`${2 / zoom},${2 / zoom}`}
    pointerEvents="none"
    opacity={1.0}
  />
));

ControlPointLine.displayName = 'ControlPointLine';

interface ControlPointCircleProps {
  cx: number;
  cy: number;
  radius: number;
  fill: string;
  stroke: string;
  zoom: number;
  isBeingDragged: boolean;
}

const ControlPointCircle = React.memo<ControlPointCircleProps>(({ 
  cx, cy, radius, fill, stroke, zoom, isBeingDragged 
}) => (
  <circle
    cx={cx}
    cy={cy}
    r={radius}
    fill={fill}
    stroke={stroke}
    strokeWidth={1.5}
    vectorEffect="non-scaling-stroke"
    className="control-point"
    opacity={1.0}
    style={{ pointerEvents: 'none' }}
    filter={isBeingDragged ? 'drop-shadow(0 0 4px rgba(0,0,0,0.5))' : undefined}
  />
));

ControlPointCircle.displayName = 'ControlPointCircle';

interface InteractionOverlayProps {
  cx: number;
  cy: number;
  radius: number;
  commandId: string;
  prevCommandId?: string;
  controlPoint: 'x1y1' | 'x2y2';
}

const InteractionOverlay = React.memo<InteractionOverlayProps>(({ 
  cx, cy, radius, commandId, prevCommandId, controlPoint 
}) => (
  <circle
    cx={cx}
    cy={cy}
    r={radius}
    fill="transparent"
    stroke="none"
    className="control-point-interaction-overlay"
    data-command-id={commandId}
    data-prev-command-id={prevCommandId}
    data-control-point={controlPoint}
    style={{ cursor: 'default' }}
  />
));

InteractionOverlay.displayName = 'InteractionOverlay';

interface ControlPointGroupProps {
  x: number;
  y: number;
  zoom: number;
  children: React.ReactNode;
}

const ControlPointGroup = React.memo<ControlPointGroupProps>(({ x, y, zoom, children }) => (
  <g transform={`translate(${x},${y}) scale(${1 / zoom}) translate(${-x},${-y})`}>
    {children}
  </g>
));

ControlPointGroup.displayName = 'ControlPointGroup';

interface SingleControlPointProps {
  controlPoint: { x: number; y: number };
  anchorPoint: { x: number; y: number };
  radius: number;
  colors: {
    fill: string;
    stroke: string;
    lineColor: string;
  };
  commandId: string;
  prevCommandId?: string;
  controlPointType: 'x1y1' | 'x2y2';
  zoom: number;
  isBeingDragged: boolean;
  isMobile: boolean;
  isTablet: boolean;
}

const SingleControlPoint = React.memo<SingleControlPointProps>(({ 
  controlPoint, 
  anchorPoint, 
  radius, 
  colors, 
  commandId, 
  prevCommandId, 
  controlPointType, 
  zoom, 
  isBeingDragged,
  isMobile,
  isTablet 
}) => (
  <>
    <ControlPointLine
      x1={anchorPoint.x}
      y1={anchorPoint.y}
      x2={controlPoint.x}
      y2={controlPoint.y}
      color={colors.lineColor}
      zoom={zoom}
    />
    <ControlPointGroup x={controlPoint.x} y={controlPoint.y} zoom={zoom}>
      <ControlPointCircle
        cx={controlPoint.x}
        cy={controlPoint.y}
        radius={radius * 0.7}
        fill={colors.fill}
        stroke={colors.stroke}
        zoom={zoom}
        isBeingDragged={isBeingDragged}
      />
      <InteractionOverlay
        cx={controlPoint.x}
        cy={controlPoint.y}
        radius={getInteractionRadius(radius * 0.7, isMobile, isTablet)}
        commandId={commandId}
        prevCommandId={prevCommandId}
        controlPoint={controlPointType}
      />
    </ControlPointGroup>
  </>
), (prevProps, nextProps) => {
  // Custom comparison function for better memoization
  return (
    prevProps.controlPoint.x === nextProps.controlPoint.x &&
    prevProps.controlPoint.y === nextProps.controlPoint.y &&
    prevProps.anchorPoint.x === nextProps.anchorPoint.x &&
    prevProps.anchorPoint.y === nextProps.anchorPoint.y &&
    prevProps.radius === nextProps.radius &&
    prevProps.colors.fill === nextProps.colors.fill &&
    prevProps.colors.stroke === nextProps.colors.stroke &&
    prevProps.colors.lineColor === nextProps.colors.lineColor &&
    prevProps.commandId === nextProps.commandId &&
    prevProps.prevCommandId === nextProps.prevCommandId &&
    prevProps.controlPointType === nextProps.controlPointType &&
    prevProps.zoom === nextProps.zoom &&
    prevProps.isBeingDragged === nextProps.isBeingDragged &&
    prevProps.isMobile === nextProps.isMobile &&
    prevProps.isTablet === nextProps.isTablet
  );
});

SingleControlPoint.displayName = 'SingleControlPoint';

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

const HandleRendererCore: React.FC = React.memo(() => {
  const { paths, enabledFeatures, viewport, selection, visualDebugSizes, mode, ui } = useEditorStore();
  const { isMobile, isTablet } = useMobileDetection();
  const [handleState, setHandleState] = React.useState(handleManager.getState());
  const [renderKey, setRenderKey] = React.useState(0);

  // Subscribe to handle state changes - memoized callback to prevent re-subscription
  const handleStateChange = React.useCallback(() => {
    const newState = handleManager.getState();
    setHandleState(newState);
    
    // NO incrementar renderKey durante el drag - esto causa que React desmonte los elementos
    // Solo incrementar cuando NO estamos en drag
    if (!newState.dragState.isDragging) {
      setRenderKey(prev => prev + 1);
    }
  }, []);

  React.useEffect(() => {
    const unsubscribe = handleManager.addListener(handleStateChange);
    return unsubscribe;
  }, [handleStateChange]);

  // Memoized visual debug change handler
  const visualDebugKey = React.useMemo(
    () => `${visualDebugSizes.globalFactor}-${visualDebugSizes.controlPointsFactor}`,
    [visualDebugSizes.globalFactor, visualDebugSizes.controlPointsFactor]
  );

  // Force re-render when visual debug sizes change - only when not dragging
  React.useEffect(() => {
    if (!handleState.dragState.isDragging) {
      setRenderKey(prev => prev + 1);
    }
  }, [visualDebugKey, handleState.dragState.isDragging]);

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

  // Calculate responsive radius based on device with size factors
  const controlPointRadius = React.useMemo(() => {
    const baseRadius = getControlPointSize(isMobile, isTablet);
    return baseRadius * visualDebugSizes.globalFactor * visualDebugSizes.controlPointsFactor;
  }, [isMobile, isTablet, visualDebugSizes.globalFactor, visualDebugSizes.controlPointsFactor]);

  // Use stable key during drag to prevent React from dismounting elements
  const stableKey = React.useMemo(() => {
    const { isDragging } = dragStateInfo;
    return isDragging ? `handle-renderer-stable-${visualDebugKey}` : `handle-renderer-${renderKey}-${visualDebugKey}`;
  }, [dragStateInfo.isDragging, visualDebugKey, renderKey]);

  // Early returns after all hooks
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
            
            // Use the memoized radius
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
                    {prevPosition && (() => {
                      const isBeingDragged = isDragging && command.id === dragCommandId && dragHandleType === 'outgoing';
                      const shouldShow = !isDragging || 
                        (isDragging && command.id === dragCommandId) ||
                        (isDragging && isPairedCommand && pairedHandle?.controlPoint === 'x1y1');
                      
                      // Si estamos arrastrando este control point específico, SIEMPRE mostrarlo
                      return (shouldShow || isBeingDragged) ? (
                        <SingleControlPoint
                          key={`x1y1-${command.id}`}
                          controlPoint={controlPoints[0]}
                          anchorPoint={prevPosition}
                          radius={radius}
                          colors={colors}
                          commandId={command.id}
                          prevCommandId={prevCommand ? prevCommand.id : undefined}
                          controlPointType="x1y1"
                          zoom={viewport.zoom}
                          isBeingDragged={isBeingDragged}
                          isMobile={isMobile}
                          isTablet={isTablet}
                        />
                      ) : null;
                    })()}
                    
                    {/* Second control point (x2y2) - handle entrante */}
                    {controlPoints.length >= 2 && (() => {
                      const isBeingDragged = isDragging && command.id === dragCommandId && dragHandleType === 'incoming';
                      const shouldShow = !isDragging || 
                        (isDragging && command.id === dragCommandId) ||
                        (isDragging && isPairedCommand && pairedHandle?.controlPoint === 'x2y2');
                      
                      // Si estamos arrastrando este control point específico, SIEMPRE mostrarlo
                      return (shouldShow || isBeingDragged) ? (
                        <SingleControlPoint
                          key={`x2y2-${command.id}`}
                          controlPoint={controlPoints[1]}
                          anchorPoint={position}
                          radius={radius}
                          colors={colors}
                          commandId={command.id}
                          controlPointType="x2y2"
                          zoom={viewport.zoom}
                          isBeingDragged={isBeingDragged}
                          isMobile={isMobile}
                          isTablet={isTablet}
                        />
                      ) : null;
                    })()}
                  </>
                ) : null}
              </g>
            );
          });
        })
      )}
    </g>
  );
});

HandleRendererCore.displayName = 'HandleRendererCore';

// Memoized wrapper component with shallow comparison for Zustand state
export const HandleRenderer: React.FC = React.memo(() => {
  return <HandleRendererCore />;
}, () => {
  // Always re-render - let the internal memoization handle the optimization
  // This is because Zustand state changes are handled internally
  return false;
});

HandleRenderer.displayName = 'HandleRenderer';
