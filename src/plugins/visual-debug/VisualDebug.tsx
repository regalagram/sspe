import React from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { getAbsoluteCommandPosition } from '../../utils/path-utils';
import { useMobileDetection, getControlPointSize, getInteractionRadius } from '../../hooks/useMobileDetection';
import { stickyPointsManager } from '../pointer-interaction/StickyPointsManager';
import { transformManager } from '../transform/TransformManager';

// Memoized SVG components for command points optimization
interface CommandPointCircleProps {
  cx: number;
  cy: number;
  radius: number;
  fill: string;
  stroke: string;
  zoom: number;
}

const CommandPointCircle = React.memo<CommandPointCircleProps>(({ 
  cx, cy, radius, fill, stroke, zoom 
}) => (
  <circle
    cx={cx}
    cy={cy}
    r={radius}
    fill={fill}
    stroke={stroke}
    strokeWidth={1}
    vectorEffect="non-scaling-stroke"
    style={{ 
      pointerEvents: 'none',
      opacity: 0.9
    }}
    className="command-point"
  />
));

CommandPointCircle.displayName = 'CommandPointCircle';

interface CommandPointInteractionProps {
  cx: number;
  cy: number;
  radius: number;
  commandId: string;
}

const CommandPointInteraction = React.memo<CommandPointInteractionProps>(({ 
  cx, cy, radius, commandId 
}) => (
  <circle
    cx={cx}
    cy={cy}
    r={radius}
    fill="transparent"
    stroke="none"
    className="command-point-interaction-overlay"
    data-command-id={commandId}
    style={{ cursor: 'default' }}
  />
));

CommandPointInteraction.displayName = 'CommandPointInteraction';

interface CommandPointGroupProps {
  x: number;
  y: number;
  zoom: number;
  children: React.ReactNode;
}

const CommandPointGroup = React.memo<CommandPointGroupProps>(({ x, y, zoom, children }) => (
  <g transform={`translate(${x},${y}) scale(${1 / zoom}) translate(${-x},${-y})`}>
    {children}
  </g>
));

CommandPointGroup.displayName = 'CommandPointGroup';

interface SimpleCommandPointProps {
  position: { x: number; y: number };
  radius: number;
  fill: string;
  stroke: string;
  commandId: string;
  zoom: number;
  isSelected: boolean;
  isFirst: boolean;
  isLast: boolean;
  isMobile: boolean;
  isTablet: boolean;
  // OPTIMIZATION: Pass cached drag state to avoid repeated transformManager calls
  dragState: { isMoving: boolean; draggingCommandId: string | null };
}

const SimpleCommandPoint = React.memo<SimpleCommandPointProps>(({ 
  position, radius, fill, stroke, commandId, zoom, isSelected, isFirst, isLast, isMobile, isTablet, dragState 
}) => {
  // OPTIMIZATION: Use cached drag state instead of calling transformManager repeatedly
  const isDraggingThis = dragState.isMoving && dragState.draggingCommandId === commandId;
  const isDraggingMultipleSelected = dragState.isMoving && dragState.draggingCommandId && isSelected;
  const needsTemporaryHack = isDraggingThis || isDraggingMultipleSelected;
  
  return (
    <g key={`command-container-${commandId}`}>
      <CommandPointGroup x={position.x} y={position.y} zoom={zoom}>
        {/* Normal command circle - hide during drag to avoid sync issues */}
        {!needsTemporaryHack && (
          <CommandPointCircle
            cx={position.x}
            cy={position.y}
            radius={radius}
            fill={fill}
            stroke={stroke}
            zoom={zoom}
          />
        )}
        {/* Temporary sync-friendly circle during drag (hack!) - MEMORY SAFE */}
        {needsTemporaryHack && (
          <circle
            key={`temp-hack-${commandId}`}
            cx={position.x}
            cy={position.y}
            r={radius}
            fill={isFirst ? "#8B4513" : isLast ? "#FFD700" : fill} // Café para inicial, amarillo para final, color original para otros
            stroke={isFirst ? "#654321" : isLast ? "#FFA500" : stroke} // Bordes más oscuros para debug
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            data-temp-hack="true"
            data-command-id={commandId}
            style={{ 
              pointerEvents: 'none',
              opacity: 0.9
            }}
          />
        )}
        <CommandPointInteraction
          cx={position.x}
          cy={position.y}
          radius={getInteractionRadius(radius, isMobile, isTablet)}
          commandId={commandId}
        />
        {/* Inner circle for selected initial/final points */}
        {isSelected && (isFirst || isLast) && (
          <circle
            cx={position.x}
            cy={position.y}
            r={radius * 0.4}
            fill="#ffffff"
            stroke="none"
            style={{ 
              pointerEvents: 'none',
              opacity: 0.8
            }}
          />
        )}
      </CommandPointGroup>
    </g>
  );
}, (prevProps, nextProps) => {
  // OPTIMIZATION: Use cached drag state instead of calling transformManager
  const wasNeedingTemporaryHack = (prevProps.dragState.isMoving && prevProps.dragState.draggingCommandId === prevProps.commandId) || 
                                  (prevProps.dragState.isMoving && prevProps.dragState.draggingCommandId && prevProps.isSelected);
  const needsTemporaryHack = (nextProps.dragState.isMoving && nextProps.dragState.draggingCommandId === nextProps.commandId) || 
                            (nextProps.dragState.isMoving && nextProps.dragState.draggingCommandId && nextProps.isSelected);
  
  // If drag state changed, force re-render
  if (wasNeedingTemporaryHack !== needsTemporaryHack) {
    return false;
  }
  
  // Ultra-strict comparison - ignore renderVersion completely to prevent unnecessary re-renders
  return (
    prevProps.commandId === nextProps.commandId &&
    prevProps.position.x === nextProps.position.x &&
    prevProps.position.y === nextProps.position.y &&
    prevProps.radius === nextProps.radius &&
    prevProps.fill === nextProps.fill &&
    prevProps.stroke === nextProps.stroke &&
    prevProps.zoom === nextProps.zoom &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isFirst === nextProps.isFirst &&
    prevProps.isLast === nextProps.isLast &&
    prevProps.isMobile === nextProps.isMobile &&
    prevProps.isTablet === nextProps.isTablet &&
    // Compare drag state for optimization
    prevProps.dragState.isMoving === nextProps.dragState.isMoving &&
    prevProps.dragState.draggingCommandId === nextProps.dragState.draggingCommandId
    // NOTE: Deliberately ignoring renderVersion to prevent forced re-renders
  );
});

SimpleCommandPoint.displayName = 'SimpleCommandPoint';

// Complex components for special cases
interface SplitCommandPointProps {
  position: { x: number; y: number };
  radius: number;
  directionAngle: number;
  firstCommandId: string;
  lastCommandId: string;
  firstCommandSelected: boolean;
  lastCommandSelected: boolean;
  zoom: number;
  isMobile: boolean;
  isTablet: boolean;
  // OPTIMIZATION: Pass cached drag state to avoid repeated transformManager calls
  dragState: { isMoving: boolean; draggingCommandId: string | null };
}

const SplitCommandPoint = React.memo<SplitCommandPointProps>(({ 
  position, radius, directionAngle, firstCommandId, lastCommandId, 
  firstCommandSelected, lastCommandSelected, zoom, isMobile, isTablet, dragState 
}) => {
  // OPTIMIZATION: Use cached drag state instead of calling transformManager repeatedly
  const isDraggingFirst = dragState.isMoving && dragState.draggingCommandId === firstCommandId;
  const isDraggingLast = dragState.isMoving && dragState.draggingCommandId === lastCommandId;
  const isDraggingMultipleFirst = dragState.isMoving && dragState.draggingCommandId && firstCommandSelected;
  const isDraggingMultipleLast = dragState.isMoving && dragState.draggingCommandId && lastCommandSelected;
  
  const needsTemporaryHackFirst = isDraggingFirst || isDraggingMultipleFirst;
  const needsTemporaryHackLast = isDraggingLast || isDraggingMultipleLast;
  const needsTemporaryHackEither = needsTemporaryHackFirst || needsTemporaryHackLast;
  
  // Calculate perpendicular angle for the split line
  const splitAngle = directionAngle + Math.PI / 2;
  
  // Calculate split line endpoints
  const splitX1 = position.x + Math.cos(splitAngle) * radius;
  const splitY1 = position.y + Math.sin(splitAngle) * radius;
  const splitX2 = position.x - Math.cos(splitAngle) * radius;
  const splitY2 = position.y - Math.sin(splitAngle) * radius;
  
  const interactionRadius = getInteractionRadius(radius, isMobile, isTablet);
  
  return (
    <g>
      <CommandPointGroup x={position.x} y={position.y} zoom={zoom}>
        {/* Normal paths - hide during drag to avoid sync issues */}
        {!needsTemporaryHackEither && (
          <>
            {/* First half (red) - initial point */}
            <path
              d={`M ${position.x} ${position.y} L ${splitX1} ${splitY1} A ${radius} ${radius} 0 0 1 ${splitX2} ${splitY2} Z`}
              fill="#ef4444"
              stroke="#dc2626"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              style={{ 
                pointerEvents: 'none',
                opacity: 0.9
              }}
              className="command-point"
            />
            {/* Second half (green) - final point */}
            <path
              d={`M ${position.x} ${position.y} L ${splitX2} ${splitY2} A ${radius} ${radius} 0 0 1 ${splitX1} ${splitY1} Z`}
              fill="#22c55e"
              stroke="#16a34a"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              style={{ 
                pointerEvents: 'none',
                opacity: 0.9
              }}
              className="command-point"
            />
          </>
        )}
        
        {/* Temporary sync-friendly paths during drag (hack!) */}
        {needsTemporaryHackEither && (
          <>
            {/* First half (red) - initial point - DEBUG: café si se arrastra o está en selección múltiple */}
            <path
              key={`temp-hack-first-${firstCommandId}`}
              d={`M ${position.x} ${position.y} L ${splitX1} ${splitY1} A ${radius} ${radius} 0 0 1 ${splitX2} ${splitY2} Z`}
              fill={needsTemporaryHackFirst ? "#8B4513" : "#ef4444"} // Café si necesita hack, rojo normal si no
              stroke={needsTemporaryHackFirst ? "#654321" : "#dc2626"} // Borde café oscuro si necesita hack
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              data-temp-hack="true"
              data-command-id={firstCommandId}
              style={{ 
                pointerEvents: 'none',
                opacity: 0.9
              }}
            />
            {/* Second half (green) - final point - DEBUG: amarillo si se arrastra o está en selección múltiple */}
            <path
              key={`temp-hack-last-${lastCommandId}`}
              d={`M ${position.x} ${position.y} L ${splitX2} ${splitY2} A ${radius} ${radius} 0 0 1 ${splitX1} ${splitY1} Z`}
              fill={needsTemporaryHackLast ? "#FFD700" : "#22c55e"} // Amarillo si necesita hack, verde normal si no
              stroke={needsTemporaryHackLast ? "#FFA500" : "#16a34a"} // Borde naranja si necesita hack
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              data-temp-hack="true"
              data-command-id={lastCommandId}
              style={{ 
                pointerEvents: 'none',
                opacity: 0.9
              }}
            />
          </>
        )}
        {/* Interaction overlay first half (red) for last command */}
        <path
          d={`M ${position.x} ${position.y} L ${position.x + Math.cos(splitAngle) * interactionRadius} ${position.y + Math.sin(splitAngle) * interactionRadius} A ${interactionRadius} ${interactionRadius} 0 0 1 ${position.x - Math.cos(splitAngle) * interactionRadius} ${position.y - Math.sin(splitAngle) * interactionRadius} Z`}
          fill="transparent"
          stroke="none"
          className="command-point-interaction-overlay"
          data-command-id={lastCommandId}
          style={{ cursor: 'default' }}
        />
        {/* Interaction overlay second half (green) for first command */}
        <path
          d={`M ${position.x} ${position.y} L ${position.x - Math.cos(splitAngle) * interactionRadius} ${position.y - Math.sin(splitAngle) * interactionRadius} A ${interactionRadius} ${interactionRadius} 0 0 1 ${position.x + Math.cos(splitAngle) * interactionRadius} ${position.y + Math.sin(splitAngle) * interactionRadius} Z`}
          fill="transparent"
          stroke="none"
          className="command-point-interaction-overlay"
          data-command-id={firstCommandId}
          style={{ cursor: 'default' }}
        />
        {/* Inner circle for selected initial point */}
        {firstCommandSelected && (
          <circle
            cx={position.x + Math.cos(directionAngle) * radius * 0.3}
            cy={position.y + Math.sin(directionAngle) * radius * 0.3}
            r={radius * 0.2}
            fill="#ffffff"
            stroke="none"
            style={{ 
              pointerEvents: 'none',
              opacity: 0.8
            }}
          />
        )}
        {/* Inner circle for selected final point */}
        {lastCommandSelected && (
          <circle
            cx={position.x - Math.cos(directionAngle) * radius * 0.3}
            cy={position.y - Math.sin(directionAngle) * radius * 0.3}
            r={radius * 0.2}
            fill="#ffffff"
            stroke="none"
            style={{ 
              pointerEvents: 'none',
              opacity: 0.8
            }}
          />
        )}
      </CommandPointGroup>
    </g>
  );
}, (prevProps, nextProps) => {
  // OPTIMIZATION: Use cached drag state instead of calling transformManager
  const wasNeedingTemporaryHackFirst = (prevProps.dragState.isMoving && prevProps.dragState.draggingCommandId === prevProps.firstCommandId) || 
                                      (prevProps.dragState.isMoving && prevProps.dragState.draggingCommandId && prevProps.firstCommandSelected);
  const wasNeedingTemporaryHackLast = (prevProps.dragState.isMoving && prevProps.dragState.draggingCommandId === prevProps.lastCommandId) || 
                                     (prevProps.dragState.isMoving && prevProps.dragState.draggingCommandId && prevProps.lastCommandSelected);
  
  const needsTemporaryHackFirst = (nextProps.dragState.isMoving && nextProps.dragState.draggingCommandId === nextProps.firstCommandId) || 
                                 (nextProps.dragState.isMoving && nextProps.dragState.draggingCommandId && nextProps.firstCommandSelected);
  const needsTemporaryHackLast = (nextProps.dragState.isMoving && nextProps.dragState.draggingCommandId === nextProps.lastCommandId) || 
                                (nextProps.dragState.isMoving && nextProps.dragState.draggingCommandId && nextProps.lastCommandSelected);
  
  // If drag state changed, force re-render
  if (wasNeedingTemporaryHackFirst !== needsTemporaryHackFirst || wasNeedingTemporaryHackLast !== needsTemporaryHackLast) {
    return false;
  }
  
  // Ultra-strict comparison - ignore renderVersion to prevent unnecessary re-renders
  return (
    prevProps.firstCommandId === nextProps.firstCommandId &&
    prevProps.lastCommandId === nextProps.lastCommandId &&
    prevProps.position.x === nextProps.position.x &&
    prevProps.position.y === nextProps.position.y &&
    prevProps.radius === nextProps.radius &&
    prevProps.directionAngle === nextProps.directionAngle &&
    prevProps.firstCommandSelected === nextProps.firstCommandSelected &&
    prevProps.lastCommandSelected === nextProps.lastCommandSelected &&
    prevProps.zoom === nextProps.zoom &&
    prevProps.isMobile === nextProps.isMobile &&
    prevProps.isTablet === nextProps.isTablet &&
    // Compare drag state for optimization
    prevProps.dragState.isMoving === nextProps.dragState.isMoving &&
    prevProps.dragState.draggingCommandId === nextProps.dragState.draggingCommandId
    // NOTE: Deliberately ignoring renderVersion to prevent forced re-renders
  );
});

SplitCommandPoint.displayName = 'SplitCommandPoint';

interface VisualDebugControlsProps {
  commandPointsEnabled: boolean;
  controlPointsEnabled: boolean;
  wireframeEnabled: boolean;
  hidePointsInSelect: boolean;
  showGroupsFrame: boolean;
  onToggleCommandPoints: () => void;
  onToggleControlPoints: () => void;
  onToggleWireframe: () => void;
  onToggleHidePointsInSelect: () => void;
  onToggleShowGroupsFrame: () => void;
}

// Size Controls Component
interface SizeControlsProps {
  globalFactor: number;
  commandPointsFactor: number;
  controlPointsFactor: number;
  transformResizeFactor: number;
  transformRotateFactor: number;
  onGlobalFactorChange: (factor: number) => void;
  onCommandPointsFactorChange: (factor: number) => void;
  onControlPointsFactorChange: (factor: number) => void;
  onTransformResizeFactorChange: (factor: number) => void;
  onTransformRotateFactorChange: (factor: number) => void;
}

export const SizeControls: React.FC<SizeControlsProps> = ({
  globalFactor,
  commandPointsFactor,
  controlPointsFactor,
  transformResizeFactor,
  transformRotateFactor,
  onGlobalFactorChange,
  onCommandPointsFactorChange,
  onControlPointsFactorChange,
  onTransformResizeFactorChange,
  onTransformRotateFactorChange,
}) => {
  const sliderStyle = {
    width: '100%',
    marginTop: '4px',
  };

  const labelStyle = {
    fontSize: '11px',
    fontWeight: 'bold' as const,
    marginBottom: '2px',
    color: '#333',
  };

  const valueStyle = {
    fontSize: '10px',
    color: '#666',
    float: 'right' as const,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
      <div style={{ fontSize: '12px', fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>
        Size Controls
      </div>
      
      {/* Global Factor */}
      <div>
        <div style={labelStyle}>
          Global Factor
          <span style={valueStyle}>{globalFactor.toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="5.0"
          step="0.1"
          value={globalFactor}
          onChange={(e) => onGlobalFactorChange(parseFloat(e.target.value))}
          style={sliderStyle}
        />
      </div>

      {/* Command Points Factor */}
      <div>
        <div style={labelStyle}>
          Command Points
          <span style={valueStyle}>{commandPointsFactor.toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="5.0"
          step="0.1"
          value={commandPointsFactor}
          onChange={(e) => onCommandPointsFactorChange(parseFloat(e.target.value))}
          style={sliderStyle}
        />
      </div>

      {/* Control Points Factor */}
      <div>
        <div style={labelStyle}>
          Control Points
          <span style={valueStyle}>{controlPointsFactor.toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="5.0"
          step="0.1"
          value={controlPointsFactor}
          onChange={(e) => onControlPointsFactorChange(parseFloat(e.target.value))}
          style={sliderStyle}
        />
      </div>

      {/* Transform Resize Factor */}
      <div>
        <div style={labelStyle}>
          Transform Resize
          <span style={valueStyle}>{transformResizeFactor.toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="5.0"
          step="0.1"
          value={transformResizeFactor}
          onChange={(e) => onTransformResizeFactorChange(parseFloat(e.target.value))}
          style={sliderStyle}
        />
      </div>

      {/* Transform Rotate Factor */}
      <div>
        <div style={labelStyle}>
          Transform Rotate
          <span style={valueStyle}>{transformRotateFactor.toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="5.0"
          step="0.1"
          value={transformRotateFactor}
          onChange={(e) => onTransformRotateFactorChange(parseFloat(e.target.value))}
          style={sliderStyle}
        />
      </div>
    </div>
  );
};

export const VisualDebugControls: React.FC<VisualDebugControlsProps> = ({
  commandPointsEnabled,
  controlPointsEnabled,
  wireframeEnabled,
  hidePointsInSelect,
  showGroupsFrame,
  onToggleCommandPoints,
  onToggleControlPoints,
  onToggleWireframe,
  onToggleHidePointsInSelect,
  onToggleShowGroupsFrame,
}) => {
  const checkboxStyle = {
    cursor: 'pointer',
    accentColor: '#2196f3',
    marginRight: 4
  };

  const labelStyle = {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 4,
    fontSize: 11,
    cursor: 'pointer' as const
  };

  return (
    <div className="visual-debug-controls" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label style={labelStyle}>
        <input
          type="checkbox"
          checked={commandPointsEnabled}
          onChange={onToggleCommandPoints}
          style={checkboxStyle}
        />
        Show Command Points
      </label>
      <label style={labelStyle}>
        <input
          type="checkbox"
          checked={controlPointsEnabled}
          onChange={onToggleControlPoints}
          style={checkboxStyle}
        />
        Show Control Points
      </label>
      <label style={labelStyle}>
        <input
          type="checkbox"
          checked={wireframeEnabled}
          onChange={onToggleWireframe}
          style={checkboxStyle}
        />
        View Wireframe
      </label>
      <label style={labelStyle}>
        <input
          type="checkbox"
          checked={hidePointsInSelect}
          onChange={onToggleHidePointsInSelect}
          style={checkboxStyle}
        />
        Hide Points In Select
      </label>
      <label style={labelStyle}>
        <input
          type="checkbox"
          checked={showGroupsFrame}
          onChange={onToggleShowGroupsFrame}
          style={checkboxStyle}
        />
        Show Groups Frame
      </label>
    </div>
  );
};

// Sticky Visual Feedback Component
export const StickyVisualFeedback: React.FC = () => {
  const { viewport, visualDebugSizes, renderVersion } = useEditorStore();
  const { isMobile, isTablet } = useMobileDetection();
  
  // Get current sticky state (renderVersion ensures reactivity)
  const stickyState = stickyPointsManager.getStickyState();
  
  if (!stickyState.isActive || !stickyState.targetPosition) {
    return null;
  }
  
  const baseRadius = getControlPointSize(isMobile, isTablet);
  const stickyRadius = (baseRadius * visualDebugSizes.globalFactor * visualDebugSizes.commandPointsFactor) / viewport.zoom;
  
  // Render pulsing circle around sticky target
  return (
    <g>
      {/* Outer pulsing ring */}
      <circle
        cx={stickyState.targetPosition.x}
        cy={stickyState.targetPosition.y}
        r={stickyRadius * 2.5}
        fill="none"
        stroke="#fbbf24"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        strokeDasharray="8 4"
        style={{ 
          pointerEvents: 'none',
          opacity: 0.8,
          animation: 'sticky-pulse 1s ease-in-out infinite alternate'
        }}
      />
      {/* Inner solid ring */}
      <circle
        cx={stickyState.targetPosition.x}
        cy={stickyState.targetPosition.y}
        r={stickyRadius * 1.8}
        fill="none"
        stroke="#f59e0b"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        style={{ 
          pointerEvents: 'none',
          opacity: 0.6
        }}
      />
    </g>
  );
};

// Command Points Renderer Component - Optimized with memoization
const CommandPointsRendererCore: React.FC = React.memo(() => {
  // All hooks must be called before any early returns
  const { paths, selection, viewport, enabledFeatures, renderVersion, visualDebugSizes, mode, enabledFeatures: storeEnabledFeatures, ui } = useEditorStore();
  const { isMobile, isTablet } = useMobileDetection();
  
  // OPTIMIZATION: Cache drag state to avoid repeated transformManager calls
  const dragState = React.useMemo(() => {
    const state = {
      isMoving: transformManager.isMoving(),
      draggingCommandId: transformManager.getDraggingCommandId()
    };
    
    // DEBUG: Log when dragState is recalculated (potential memoization issue)
    // console.debug('[VisualDebug] dragState recalculated:', state, 'renderVersion:', renderVersion);
    
    return state;
  }, [renderVersion]); // Only recalculate when renderVersion changes
  

  // Cleanup temporary elements when drag ends with event listener cleanup
  React.useEffect(() => {
    if (!dragState.isMoving) {
      // Use requestAnimationFrame to ensure cleanup happens after render
      requestAnimationFrame(() => {
        const tempElements = document.querySelectorAll('[data-temp-hack="true"]');
        tempElements.forEach(element => {
          if (!element.isConnected) {
            try {
              // Clear event listeners before removal
              (element as any).onpointerdown = null;
              (element as any).onpointerup = null;
              (element as any).onpointermove = null;
              (element as any).onclick = null;
              (element as any).__reactProps = null;
              (element as any).__reactFiber = null;
              
              if (element.parentNode) {
                element.parentNode.removeChild(element);
              }
            } catch (error) {
              // Ignore cleanup errors
            }
          }
        });
      });
    }
  }, [dragState.isMoving]);
  
  // Memoize computed values
  const baseRadius = React.useMemo(() => 
    getControlPointSize(isMobile, isTablet), 
    [isMobile, isTablet]
  );
  
  // Memoize computed flags
  const computedFlags = React.useMemo(() => {
    const hasSelectedSubPath = selection.selectedSubPaths.length > 0;
    const hasSelectedCommand = selection.selectedCommands.length > 0;
    const isSubpathEditMode = mode?.current === 'subpath-edit';
    const subpathShowCommandPoints = storeEnabledFeatures.subpathShowCommandPoints ?? true;
    const selectionVisible = ui?.selectionVisible ?? true;
    
    const flags = {
      hasSelectedSubPath,
      hasSelectedCommand,
      isSubpathEditMode,
      subpathShowCommandPoints,
      selectionVisible
    };
    
    // DEBUG: Log when computedFlags are recalculated (potential memoization issue)
    // console.debug('[VisualDebug] computedFlags recalculated:', flags);
    
    return flags;
  }, [selection.selectedSubPaths.length, selection.selectedCommands.length, mode?.current, storeEnabledFeatures.subpathShowCommandPoints, ui?.selectionVisible]);

  // Check transformation states outside of memoization for real-time updates
  const isTransforming = transformManager.isTransforming();
  const isMoving = transformManager.isMoving();
  const draggingCommandId = transformManager.getDraggingCommandId();
  
  // Helper function to find command info for dragging command detection
  const findCommandInfo = React.useCallback((commandId: string) => {
    for (const path of paths) {
      for (const subPath of path.subPaths) {
        for (let i = 0; i < subPath.commands.length; i++) {
          const command = subPath.commands[i];
          if (command.id === commandId) {
            return { command, subPath, commandIndex: i };
          }
        }
      }
    }
    return null;
  }, [paths]);

  const shouldShow = computedFlags.selectionVisible && (!isTransforming && !isMoving || (isMoving && draggingCommandId));

  // Use computed flags early to make them available for the function below
  const { isSubpathEditMode, subpathShowCommandPoints, hasSelectedSubPath, hasSelectedCommand } = computedFlags;

  // Consolidated function to determine if command point should be visible (regular function to avoid hook order issues)
  const shouldShowCommandPoint = (
    commandId: string, 
    subPath: any, 
    isCommandSelected: boolean,
    isSubPathSelected: boolean,
    hasSelectedCommandInSubPath: boolean
  ): boolean => {
    // Rule 1: Si el subpath está seleccionado, mostrar todos los puntos de comando EXCEPTO si hidePointsInSelect está activo
    if (isSubPathSelected) {
      if (enabledFeatures.hidePointsInSelect) return false;
      return true;
    }
    
    // Rule 2: Si estamos en modo subpath-edit, mostrar todos los puntos EXCEPTO si subpathShowCommandPoints está desactivado
    if (isSubpathEditMode) {
      if (!subpathShowCommandPoints) return false;
      return true;
    }
    
    // Rule 3: Si commandPointsEnabled está activo globalmente, mostrar todos los puntos
    if (enabledFeatures.commandPointsEnabled) {
      return true;
    }
    
    // Rule 4: Si hay transformación (pero no movimiento de comando), ocultar todos los puntos
    if (isTransforming && !isMoving) {
      return false;
    }
    
    // Rule 5: Si se está moviendo un comando diferente, ocultar EXCEPTO para efecto magneto
    if (isMoving && draggingCommandId) {
      // Si este comando es el que se está arrastrando, siempre mostrarlo
      if (commandId === draggingCommandId) {
        return true;
      }
      
      // Find info about the dragging command to check if it's in the same subpath
      const draggingInfo = findCommandInfo(draggingCommandId);
      if (!draggingInfo || draggingInfo.subPath.id !== subPath.id) {
        return false;
      }
      
      const { commandIndex: draggingIndex } = draggingInfo;
      const isDraggingInitial = draggingIndex === 0;
      const isDraggingFinal = draggingIndex === draggingInfo.subPath.commands.length - 1;
      
      // Efecto magneto: si se arrastra el primer comando, mostrar el último (y viceversa)
      if (isDraggingInitial) {
        const finalCommandIndex = subPath.commands.length - 1;
        const shouldShow = subPath.commands[finalCommandIndex].id === commandId;
        return shouldShow;
      }
      
      if (isDraggingFinal) {
        const shouldShow = subPath.commands[0].id === commandId;
        return shouldShow;
      }
      
      // Para cualquier otro comando que se esté moviendo, ocultar todos los demás
      return false;
    }
    
    // Condiciones adicionales: mostrar si el comando está seleccionado o si hay comandos seleccionados en el subpath
    if (isCommandSelected || hasSelectedCommandInSubPath) {
      // Aplicar hidePointsInSelect solo si el comando específico está seleccionado
      if (enabledFeatures.hidePointsInSelect && isCommandSelected) {
        return false;
      }
      return true;
    }
    
    // Rule 6: Mostrar puntos si el subpath es visible Y el path está seleccionado
    // Esta regla requiere que el path contenedor esté seleccionado para mostrar los puntos
    // sin necesidad de selección específica de subpath o comando
    const pathId = paths.find(p => p.subPaths.some(sp => sp.id === subPath.id))?.id;
    const isPathSelected = pathId && selection.selectedPaths.includes(pathId);
    
    if (!isTransforming && !isMoving && isPathSelected) {
      return true;
    }

    // Por defecto, no mostrar
    return false;
  };

  // Early returns after all hooks are called
  if (!paths || paths.length === 0) {
    return null;
  }

  if (!shouldShow) {
    return null;
  }

  return (
    <>
      <StickyVisualFeedback />
      {paths.map((path) => 
        path.subPaths.map((subPath) => {
          // No mostrar puntos para subpaths bloqueados
          if (subPath.locked) return null;
          const isSubPathSelected = selection.selectedSubPaths.includes(subPath.id);
          // Si hidePointsInSelect está activo y el subpath está seleccionado, no mostrar puntos
          if (enabledFeatures.hidePointsInSelect && isSubPathSelected) return null;
          // Check if any command in this subpath is selected
          const hasSelectedCommandInSubPath = subPath.commands.some(cmd => 
            selection.selectedCommands.includes(cmd.id)
          );
          
          // Check if first and last commands coincide (guard against empty commands array)
          const firstCommand = subPath.commands.length > 0 ? subPath.commands[0] : null;
          const lastCommand = subPath.commands.length > 0 ? subPath.commands[subPath.commands.length - 1] : null;
          const firstPosition = firstCommand ? getAbsoluteCommandPosition(firstCommand, subPath, path.subPaths) : null;
          const lastPosition = lastCommand ? getAbsoluteCommandPosition(lastCommand, subPath, path.subPaths) : null;
          const pointsCoincide = firstPosition && lastPosition && 
            Math.abs(firstPosition.x - lastPosition.x) < 0.1 && 
            Math.abs(firstPosition.y - lastPosition.y) < 0.1;

          // Check if there's a Z command in this subpath (declare early)
          const hasZCommand = subPath.commands.some(cmd => cmd.command === 'Z');

          return subPath.commands.map((command, commandIndex) => {
            // Handle Z commands specially - they don't have their own position
            const isZCommand = command.command === 'Z';
            
            // Get command selection status - needed for visibility rules and rendering
            const isCommandSelected = selection.selectedCommands.includes(command.id);
            
            let position = null;
            if (isZCommand) {
              // Show Z commands using consolidated visibility rules
              const isZCommandSelected = isCommandSelected; // Use the same value
              const shouldShowZCommand = shouldShowCommandPoint(command.id, subPath, isZCommandSelected, isSubPathSelected, hasSelectedCommandInSubPath);
              if (!shouldShowZCommand) return null;
              // Z commands don't have position, skip position-based checks
            } else {
              position = getAbsoluteCommandPosition(command, subPath, path.subPaths);
              if (!position) return null;
              
              // Use consolidated visibility rules FIRST
              const shouldShowCommand = shouldShowCommandPoint(command.id, subPath, isCommandSelected, isSubPathSelected, hasSelectedCommandInSubPath);
              if (!shouldShowCommand) return null;
              
              // Viewport culling removed - keep all points visible to avoid issues during drag
            }
            
            // Determine if this is the first or last command in the subpath
            const isFirstCommand = commandIndex === 0;
            const isLastCommand = commandIndex === subPath.commands.length - 1;
            
            // Handle Z commands specially - they close the path
            if (isZCommand) {
              // Z commands are positioned at the first command's position
              if (!firstCommand) return null;
              const firstCommandPosition = getAbsoluteCommandPosition(firstCommand, subPath, path.subPaths);
              if (!firstCommandPosition) return null;
              
              // Calculate direction for Z command split using tangent calculation
              let zDirectionAngle = 0;
              if (subPath.commands.length >= 2) {
                const secondCommand = subPath.commands[1];
                
                // For different command types, calculate the tangent differently
                if (secondCommand.command === 'C') {
                  // For cubic Bézier curves, use the first control point to determine tangent
                  if (secondCommand.x1 !== undefined && secondCommand.y1 !== undefined) {
                    // Tangent direction from first point to first control point
                    const dx = secondCommand.x1 - firstCommandPosition.x;
                    const dy = secondCommand.y1 - firstCommandPosition.y;
                    zDirectionAngle = Math.atan2(dy, dx);
                  } else {
                    // Fallback to end point if no control point
                    const secondPosition = getAbsoluteCommandPosition(secondCommand, subPath, path.subPaths);
                    if (secondPosition) {
                      const dx = secondPosition.x - firstCommandPosition.x;
                      const dy = secondPosition.y - firstCommandPosition.y;
                      zDirectionAngle = Math.atan2(dy, dx);
                    }
                  }
                } else {
                  // For L, M, and other commands, use direct line to the point
                  const secondPosition = getAbsoluteCommandPosition(secondCommand, subPath, path.subPaths);
                  if (secondPosition) {
                    const dx = secondPosition.x - firstCommandPosition.x;
                    const dy = secondPosition.y - firstCommandPosition.y;
                    zDirectionAngle = Math.atan2(dy, dx);
                  }
                }
              }
              
              // Use same radius calculation as coincidence case (with 30% larger for initial)
              let zRadius = baseRadius * visualDebugSizes.globalFactor * visualDebugSizes.commandPointsFactor;
              zRadius *= 1.3; // Same 30% larger as initial points
              
              // Calculate perpendicular angle for the split line
              const zSplitAngle = zDirectionAngle + Math.PI / 2;
              
              // Calculate split line endpoints
              const zSplitX1 = firstCommandPosition.x + Math.cos(zSplitAngle) * zRadius;
              const zSplitY1 = firstCommandPosition.y + Math.sin(zSplitAngle) * zRadius;
              const zSplitX2 = firstCommandPosition.x - Math.cos(zSplitAngle) * zRadius;
              const zSplitY2 = firstCommandPosition.y - Math.sin(zSplitAngle) * zRadius;
              
              // Use the same split visual logic as coinciding points
              const firstCommandSelected = selection.selectedCommands.includes(firstCommand.id);
              const zCommandSelected = selection.selectedCommands.includes(command.id);
              
              // Apply temporary hack logic for Z commands (same as other command points) - OPTIMIZED
              const isDraggingFirstCommand = dragState.isMoving && dragState.draggingCommandId === firstCommand.id;
              const isDraggingZCommand = dragState.isMoving && dragState.draggingCommandId === command.id;
              const isDraggingMultipleFirst = dragState.isMoving && dragState.draggingCommandId && firstCommandSelected;
              const isDraggingMultipleZ = dragState.isMoving && dragState.draggingCommandId && zCommandSelected;
              
              const needsTemporaryHackFirst = isDraggingFirstCommand || isDraggingMultipleFirst;
              const needsTemporaryHackZ = isDraggingZCommand || isDraggingMultipleZ;
              const needsTemporaryHackEither = needsTemporaryHackFirst || needsTemporaryHackZ;
              
              return (
                <g key={`command-z-${command.id}`}>
                  <g transform={`translate(${firstCommandPosition.x},${firstCommandPosition.y}) scale(${1 / viewport.zoom}) translate(${-firstCommandPosition.x},${-firstCommandPosition.y})`}>
                    {/* Normal rendering - hide during drag to avoid sync issues */}
                    {!needsTemporaryHackEither && (
                      <>
                        {/* Visual first half (red) for Z command */}
                        <path
                          d={`M ${firstCommandPosition.x} ${firstCommandPosition.y} L ${zSplitX1} ${zSplitY1} A ${zRadius} ${zRadius} 0 0 1 ${zSplitX2} ${zSplitY2} Z`}
                          fill="#ef4444"
                          stroke="#dc2626"
                          strokeWidth={1}
                          vectorEffect="non-scaling-stroke"
                          style={{ 
                            pointerEvents: 'none',
                            opacity: 0.9
                          }}
                          className="command-point"
                        />
                        {/* Visual second half (green) for initial M command */}
                        <path
                          d={`M ${firstCommandPosition.x} ${firstCommandPosition.y} L ${zSplitX2} ${zSplitY2} A ${zRadius} ${zRadius} 0 0 1 ${zSplitX1} ${zSplitY1} Z`}
                          fill="#22c55e"
                          stroke="#16a34a"
                          strokeWidth={1}
                          vectorEffect="non-scaling-stroke"
                          style={{ 
                            pointerEvents: 'none',
                            opacity: 0.9
                          }}
                          className="command-point"
                        />
                      </>
                    )}
                    
                    {/* Temporary sync-friendly rendering during drag (hack!) */}
                    {needsTemporaryHackEither && (
                      <>
                        {/* Visual first half (red) for Z command - DEBUG: café si necesita hack */}
                        <path
                          key={`temp-z-visual-${command.id}-${Date.now()}`}
                          d={`M ${firstCommandPosition.x} ${firstCommandPosition.y} L ${zSplitX1} ${zSplitY1} A ${zRadius} ${zRadius} 0 0 1 ${zSplitX2} ${zSplitY2} Z`}
                          fill={needsTemporaryHackZ ? "#8B4513" : "#ef4444"} // Café si Z necesita hack, rojo normal
                          stroke={needsTemporaryHackZ ? "#654321" : "#dc2626"} // Borde café oscuro si Z necesita hack
                          strokeWidth={1}
                          vectorEffect="non-scaling-stroke"
                          style={{ 
                            pointerEvents: 'none',
                            opacity: 0.9
                          }}
                          data-temp-hack="true"
                          data-command-id={command.id}
                          data-temp-type="z-visual"
                        />
                        {/* Visual second half (green) for initial M command - DEBUG: amarillo si necesita hack */}
                        <path
                          key={`temp-m-visual-${command.id}-${Date.now()}`}
                          d={`M ${firstCommandPosition.x} ${firstCommandPosition.y} L ${zSplitX2} ${zSplitY2} A ${zRadius} ${zRadius} 0 0 1 ${zSplitX1} ${zSplitY1} Z`}
                          fill={needsTemporaryHackFirst ? "#FFD700" : "#22c55e"} // Amarillo si M necesita hack, verde normal
                          stroke={needsTemporaryHackFirst ? "#FFA500" : "#16a34a"} // Borde naranja si M necesita hack
                          strokeWidth={1}
                          vectorEffect="non-scaling-stroke"
                          style={{ 
                            pointerEvents: 'none',
                            opacity: 0.9
                          }}
                          data-temp-hack="true"
                          data-command-id={command.id}
                          data-temp-type="m-visual"
                        />
                      </>
                    )}
                    
                    {/* Interaction overlays - always present */}
                    <path
                      d={`M ${firstCommandPosition.x} ${firstCommandPosition.y} L ${firstCommandPosition.x + Math.cos(zSplitAngle) * getInteractionRadius(zRadius, isMobile, isTablet)} ${firstCommandPosition.y + Math.sin(zSplitAngle) * getInteractionRadius(zRadius, isMobile, isTablet)} A ${getInteractionRadius(zRadius, isMobile, isTablet)} ${getInteractionRadius(zRadius, isMobile, isTablet)} 0 0 1 ${firstCommandPosition.x - Math.cos(zSplitAngle) * getInteractionRadius(zRadius, isMobile, isTablet)} ${firstCommandPosition.y - Math.sin(zSplitAngle) * getInteractionRadius(zRadius, isMobile, isTablet)} Z`}
                      fill="transparent"
                      stroke="none"
                      className="command-point-interaction-overlay"
                      data-command-id={command.id}
                      style={{ cursor: 'default' }}
                    />
                    {/* Interaction overlay second half (green) for initial M command */}
                    <path
                      d={`M ${firstCommandPosition.x} ${firstCommandPosition.y} L ${firstCommandPosition.x - Math.cos(zSplitAngle) * getInteractionRadius(zRadius, isMobile, isTablet)} ${firstCommandPosition.y - Math.sin(zSplitAngle) * getInteractionRadius(zRadius, isMobile, isTablet)} A ${getInteractionRadius(zRadius, isMobile, isTablet)} ${getInteractionRadius(zRadius, isMobile, isTablet)} 0 0 1 ${firstCommandPosition.x + Math.cos(zSplitAngle) * getInteractionRadius(zRadius, isMobile, isTablet)} ${firstCommandPosition.y + Math.sin(zSplitAngle) * getInteractionRadius(zRadius, isMobile, isTablet)} Z`}
                      fill="transparent"
                      stroke="none"
                      className="command-point-interaction-overlay"
                      data-command-id={firstCommand.id}
                      style={{ cursor: 'default' }}
                    />
                  </g>
                  {/* Inner circle for selected Z command */}
                  {zCommandSelected && (
                    <circle
                      cx={firstCommandPosition.x - Math.cos(zDirectionAngle) * zRadius * 0.3}
                      cy={firstCommandPosition.y - Math.sin(zDirectionAngle) * zRadius * 0.3}
                      r={zRadius * 0.2}
                      fill="#ffffff"
                      stroke="none"
                      style={{ 
                        pointerEvents: 'none',
                        opacity: 0.8
                      }}
                    />
                  )}
                  {/* Inner circle for selected initial command */}
                  {firstCommandSelected && (
                    <circle
                      cx={firstCommandPosition.x + Math.cos(zDirectionAngle) * zRadius * 0.3}
                      cy={firstCommandPosition.y + Math.sin(zDirectionAngle) * zRadius * 0.3}
                      r={zRadius * 0.2}
                      fill="#ffffff"
                      stroke="none"
                      style={{ 
                        pointerEvents: 'none',
                        opacity: 0.8
                      }}
                    />
                  )}
                </g>
              );
            }
            
            // Skip rendering last command if it coincides with first (will render split visual instead)
            if (isLastCommand && pointsCoincide && subPath.commands.length > 1) {
              return null;
            }
            
            // Skip rendering first command if there's a Z command (will render split visual instead)
            // UNLESS the first command is specifically selected in a multi-command selection
            if (isFirstCommand && hasZCommand) {
              if (!firstCommand) return null;
              const isFirstCommandSelected = selection.selectedCommands.includes(firstCommand.id);
              const hasMultipleCommandsSelected = selection.selectedCommands.length > 1;
              // Only skip if the first command is NOT selected in a multi-command selection
              if (!(isFirstCommandSelected && hasMultipleCommandsSelected)) {
                return null;
              }
            }
            
            let radius = baseRadius * visualDebugSizes.globalFactor * visualDebugSizes.commandPointsFactor;
            
            // Make initial point 30% larger
            if (isFirstCommand) {
              radius *= 1.3;
            }
            
            // Determine colors based on position and selection
            let fill: string, stroke: string;
            
            if (isFirstCommand) {
              // Initial point is green (always, even when selected)
              fill = '#22c55e';
              stroke = '#16a34a';
            } else if (isLastCommand) {
              // Final point is red (always, even when selected)
              fill = '#ef4444';
              stroke = '#dc2626';
            } else if (isCommandSelected) {
              // Selected commands (only middle points) keep their blue color
              fill = '#007acc';
              stroke = '#005299';
            } else {
              // All other points are white with black outline
              fill = '#ffffff';
              stroke = '#000000';
            }
            
            // Check if this is the first command and points coincide (but skip if there's a Z command)
            if (isFirstCommand && pointsCoincide && subPath.commands.length > 1 && !hasZCommand && position) {
              // Calculate direction angle for the split using tangent calculation
              let directionAngle = 0;
              
              if (subPath.commands.length >= 2) {
                const secondCommand = subPath.commands[1];
                
                // For different command types, calculate the tangent differently
                if (secondCommand.command === 'C') {
                  // For cubic Bézier curves, use the first control point to determine tangent
                  if (secondCommand.x1 !== undefined && secondCommand.y1 !== undefined) {
                    // Tangent direction from current point to first control point
                    const dx = secondCommand.x1 - position.x;
                    const dy = secondCommand.y1 - position.y;
                    directionAngle = Math.atan2(dy, dx);
                  } else {
                    // Fallback to end point if no control point
                    const secondPosition = getAbsoluteCommandPosition(secondCommand, subPath, path.subPaths);
                    if (secondPosition) {
                      const dx = secondPosition.x - position.x;
                      const dy = secondPosition.y - position.y;
                      directionAngle = Math.atan2(dy, dx);
                    }
                  }
                } else {
                  // For L, M, and other commands, use direct line to the point
                  const secondPosition = getAbsoluteCommandPosition(secondCommand, subPath, path.subPaths);
                  if (secondPosition) {
                    const dx = secondPosition.x - position.x;
                    const dy = secondPosition.y - position.y;
                    directionAngle = Math.atan2(dy, dx);
                  }
                }
              }
              
              // Calculate perpendicular angle for the split line (add 90 degrees)
              const splitAngle = directionAngle + Math.PI / 2;
              
              // Calculate split line endpoints
              const splitX1 = position.x + Math.cos(splitAngle) * radius;
              const splitY1 = position.y + Math.sin(splitAngle) * radius;
              const splitX2 = position.x - Math.cos(splitAngle) * radius;
              const splitY2 = position.y - Math.sin(splitAngle) * radius;
              
              // Render split visual for coinciding points
              if (!firstCommand || !lastCommand) return null;
              const firstCommandSelected = selection.selectedCommands.includes(firstCommand.id);
              const lastCommandSelected = selection.selectedCommands.includes(lastCommand.id);
              
              return (
                <SplitCommandPoint
                  key={`split-${firstCommand.id}-${lastCommand.id}`}
                  position={position}
                  radius={radius}
                  directionAngle={directionAngle}
                  firstCommandId={firstCommand.id}
                  lastCommandId={lastCommand.id}
                  firstCommandSelected={firstCommandSelected}
                  lastCommandSelected={lastCommandSelected}
                  zoom={viewport.zoom}
                  isMobile={isMobile}
                  isTablet={isTablet}
                  dragState={dragState}
                />
              );
            }

            // Regular rendering for non-coinciding points (skip if position is null)
            if (!position) return null;
            
            return (
              <SimpleCommandPoint
                key={`command-${command.id}`}
                position={position}
                radius={radius}
                fill={fill}
                stroke={stroke}
                commandId={command.id}
                zoom={viewport.zoom}
                isSelected={isCommandSelected}
                isFirst={isFirstCommand}
                isLast={isLastCommand}
                isMobile={isMobile}
                isTablet={isTablet}
                dragState={dragState}
              />
            );
          });
        })
      )}
    </>
  );
});

CommandPointsRendererCore.displayName = 'CommandPointsRendererCore';

// Main wrapper component for command points rendering
export const CommandPointsRenderer: React.FC = React.memo(() => {
  return <CommandPointsRendererCore />;
}, () => {
  // Always re-render - let the internal memoization handle the optimization
  // This is because Zustand state changes are handled internally
  return false;
});

CommandPointsRenderer.displayName = 'CommandPointsRenderer';



// Main Visual Debug Component
export const VisualDebugComponent: React.FC = () => {
  const { 
    enabledFeatures, 
    toggleFeature, 
    visualDebugSizes,
    setVisualDebugGlobalFactor,
    setVisualDebugCommandPointsFactor,
    setVisualDebugControlPointsFactor,
    setVisualDebugTransformResizeFactor,
    setVisualDebugTransformRotateFactor
  } = useEditorStore();
  const handleClearLocalStorage = () => {
    localStorage.clear();
    window.location.reload();
  };
  return (
    <div>
      <button
        style={{
          marginBottom: '16px',
          padding: '8px 12px',
          background: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontWeight: 'bold',
          cursor: 'pointer',
          width: '100%'
        }}
        onClick={handleClearLocalStorage}
      >
        Delete LocalStorage
      </button>
      <VisualDebugControls
        commandPointsEnabled={enabledFeatures.commandPointsEnabled}
        controlPointsEnabled={enabledFeatures.controlPointsEnabled}
        wireframeEnabled={enabledFeatures.wireframeEnabled}
        hidePointsInSelect={enabledFeatures.hidePointsInSelect ?? false}
        showGroupsFrame={enabledFeatures.showGroupsFrame ?? false}
        onToggleCommandPoints={() => toggleFeature('commandPointsEnabled')}
        onToggleControlPoints={() => toggleFeature('controlPointsEnabled')}
        onToggleWireframe={() => toggleFeature('wireframeEnabled')}
        onToggleHidePointsInSelect={() => toggleFeature('hidePointsInSelect')}
        onToggleShowGroupsFrame={() => toggleFeature('showGroupsFrame')}
      />
      <SizeControls
        globalFactor={visualDebugSizes.globalFactor}
        commandPointsFactor={visualDebugSizes.commandPointsFactor}
        controlPointsFactor={visualDebugSizes.controlPointsFactor}
        transformResizeFactor={visualDebugSizes.transformResizeFactor}
        transformRotateFactor={visualDebugSizes.transformRotateFactor}
        onGlobalFactorChange={setVisualDebugGlobalFactor}
        onCommandPointsFactorChange={setVisualDebugCommandPointsFactor}
        onControlPointsFactorChange={setVisualDebugControlPointsFactor}
        onTransformResizeFactorChange={setVisualDebugTransformResizeFactor}
        onTransformRotateFactorChange={setVisualDebugTransformRotateFactor}
      />
    </div>
  );
};

export const VisualDebugPlugin: Plugin = {
  id: 'visual-debug',
  name: 'Visual Debug',
  version: '1.0.0',
  enabled: true,
  
  shortcuts: [
    {
      key: 'c',
      modifiers: ['ctrl'],
      description: 'Toggle Command Points',
      action: () => {
        const store = useEditorStore.getState();
        store.toggleFeature('command-points');
      }
    },
    {
      key: 'p',
      modifiers: ['ctrl'],
      description: 'Toggle Control Points',
      action: () => {
        const store = useEditorStore.getState();
        store.toggleFeature('control-points');
      }
    },
    {
      key: 'w',
      modifiers: ['ctrl'],
      description: 'Toggle Wireframe Mode',
      action: () => {
        const store = useEditorStore.getState();
        store.toggleFeature('wireframeEnabled');
      }
    }
  ],
  
  ui: [
    {
      id: 'visual-debug-controls',
      component: VisualDebugComponent,
      position: 'sidebar',
      order: 3
    },
    {
      id: 'command-points-renderer',
      component: CommandPointsRenderer,
      position: 'svg-content',
      order: 110, // Render on top of selection and context menu
    }
  ]
};
