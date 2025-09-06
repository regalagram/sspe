import React from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { getAbsoluteCommandPosition } from '../../utils/path-utils';
import { useMobileDetection, getControlPointSize, getInteractionRadius } from '../../hooks/useMobileDetection';
import { stickyPointsManager } from '../pointer-interaction/StickyPointsManager';

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
  renderVersion: number;
}

const SimpleCommandPoint = React.memo<SimpleCommandPointProps>(({ 
  position, radius, fill, stroke, commandId, zoom, isSelected, isFirst, isLast, isMobile, isTablet, renderVersion 
}) => (
  <g key={`command-${commandId}-v${renderVersion}`}>
    <CommandPointGroup x={position.x} y={position.y} zoom={zoom}>
      <CommandPointCircle
        cx={position.x}
        cy={position.y}
        radius={radius}
        fill={fill}
        stroke={stroke}
        zoom={zoom}
      />
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
), (prevProps, nextProps) => {
  // Custom comparison for better memoization
  return (
    prevProps.position.x === nextProps.position.x &&
    prevProps.position.y === nextProps.position.y &&
    prevProps.radius === nextProps.radius &&
    prevProps.fill === nextProps.fill &&
    prevProps.stroke === nextProps.stroke &&
    prevProps.commandId === nextProps.commandId &&
    prevProps.zoom === nextProps.zoom &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isFirst === nextProps.isFirst &&
    prevProps.isLast === nextProps.isLast &&
    prevProps.isMobile === nextProps.isMobile &&
    prevProps.isTablet === nextProps.isTablet &&
    prevProps.renderVersion === nextProps.renderVersion
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
  renderVersion: number;
}

const SplitCommandPoint = React.memo<SplitCommandPointProps>(({ 
  position, radius, directionAngle, firstCommandId, lastCommandId, 
  firstCommandSelected, lastCommandSelected, zoom, isMobile, isTablet, renderVersion 
}) => {
  // Calculate perpendicular angle for the split line
  const splitAngle = directionAngle + Math.PI / 2;
  
  // Calculate split line endpoints
  const splitX1 = position.x + Math.cos(splitAngle) * radius;
  const splitY1 = position.y + Math.sin(splitAngle) * radius;
  const splitX2 = position.x - Math.cos(splitAngle) * radius;
  const splitY2 = position.y - Math.sin(splitAngle) * radius;
  
  const interactionRadius = getInteractionRadius(radius, isMobile, isTablet);
  
  return (
    <g key={`command-split-${firstCommandId}-${lastCommandId}-v${renderVersion}`}>
      <CommandPointGroup x={position.x} y={position.y} zoom={zoom}>
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
  // Custom comparison for better memoization
  return (
    prevProps.position.x === nextProps.position.x &&
    prevProps.position.y === nextProps.position.y &&
    prevProps.radius === nextProps.radius &&
    prevProps.directionAngle === nextProps.directionAngle &&
    prevProps.firstCommandId === nextProps.firstCommandId &&
    prevProps.lastCommandId === nextProps.lastCommandId &&
    prevProps.firstCommandSelected === nextProps.firstCommandSelected &&
    prevProps.lastCommandSelected === nextProps.lastCommandSelected &&
    prevProps.zoom === nextProps.zoom &&
    prevProps.isMobile === nextProps.isMobile &&
    prevProps.isTablet === nextProps.isTablet &&
    prevProps.renderVersion === nextProps.renderVersion
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
    const shouldShow = selectionVisible && ((isSubpathEditMode && subpathShowCommandPoints) || enabledFeatures.commandPointsEnabled || hasSelectedSubPath || hasSelectedCommand);
    
    return {
      hasSelectedSubPath,
      hasSelectedCommand,
      isSubpathEditMode,
      subpathShowCommandPoints,
      selectionVisible,
      shouldShow
    };
  }, [selection.selectedSubPaths.length, selection.selectedCommands.length, mode?.current, storeEnabledFeatures.subpathShowCommandPoints, ui?.selectionVisible, enabledFeatures.commandPointsEnabled]);

  // Early returns after all hooks are called
  if (!paths || paths.length === 0) {
    return null;
  }

  // Use computed flags
  const { shouldShow, isSubpathEditMode, subpathShowCommandPoints, hasSelectedSubPath, hasSelectedCommand } = computedFlags;

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
          const shouldShowSubPath = (isSubpathEditMode && subpathShowCommandPoints) || enabledFeatures.commandPointsEnabled || isSubPathSelected || hasSelectedCommandInSubPath;
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
            
            let position = null;
            if (isZCommand) {
              // Show Z commands if feature is enabled OR if subpath is selected OR if Z command is selected
              const isZCommandSelected = selection.selectedCommands.includes(command.id);
              const shouldShowZCommand = (isSubpathEditMode && subpathShowCommandPoints) || enabledFeatures.commandPointsEnabled || shouldShowSubPath || isZCommandSelected;
              if (!shouldShowZCommand) return null;
              // Z commands don't have position, skip position-based checks
            } else {
              position = getAbsoluteCommandPosition(command, subPath, path.subPaths);
              if (!position) return null;
              const isCommandSelected = selection.selectedCommands.includes(command.id);
              // Si hidePointsInSelect está activo y el comando está seleccionado, no mostrar punto
              if (enabledFeatures.hidePointsInSelect && isCommandSelected) return null;
              const shouldShowCommand = shouldShowSubPath || isCommandSelected;
              if (!shouldShowCommand) return null;
            }
            
            const isCommandSelected = selection.selectedCommands.includes(command.id);
            
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
              
              return (
                <g key={`command-z-${command.id}-v${renderVersion}`}>
                  <g transform={`translate(${firstCommandPosition.x},${firstCommandPosition.y}) scale(${1 / viewport.zoom}) translate(${-firstCommandPosition.x},${-firstCommandPosition.y})`}>
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
                    {/* Interaction overlay first half (red) for Z command */}
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
                  renderVersion={renderVersion}
                />
              );
            }

            // Regular rendering for non-coinciding points (skip if position is null)
            if (!position) return null;
            
            return (
              <SimpleCommandPoint
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
                renderVersion={renderVersion}
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
