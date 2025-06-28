import React, { MouseEvent } from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { DraggablePanel } from '../../components/DraggablePanel';
import { getAbsoluteCommandPosition, getAbsoluteControlPoints } from '../../utils/path-utils';

interface VisualDebugControlsProps {
  commandPointsEnabled: boolean;
  controlPointsEnabled: boolean;
  wireframeEnabled: boolean;
  onToggleCommandPoints: () => void;
  onToggleControlPoints: () => void;
  onToggleWireframe: () => void;
}

export const VisualDebugControls: React.FC<VisualDebugControlsProps> = ({
  commandPointsEnabled,
  controlPointsEnabled,
  wireframeEnabled,
  onToggleCommandPoints,
  onToggleControlPoints,
  onToggleWireframe,
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
    </div>
  );
};

// Command Points Renderer Component
export const CommandPointsRenderer: React.FC = () => {
  const { paths, selection, viewport, enabledFeatures, renderVersion } = useEditorStore();

  if (!paths || paths.length === 0) {
    return null;
  }

  // Check if any sub-path is selected or any command is selected
  const hasSelectedSubPath = selection.selectedSubPaths.length > 0;
  const hasSelectedCommand = selection.selectedCommands.length > 0;
  
  // Show if feature is enabled OR if any sub-path is selected OR if any command is selected
  const shouldShow = enabledFeatures.has('command-points') || hasSelectedSubPath || hasSelectedCommand;
  
  if (!shouldShow) {
    return null;
  }

  return (
    <>
      {paths.map((path) => 
        path.subPaths.map((subPath) => {
          // If feature is disabled, only show points for selected sub-paths
          const isSubPathSelected = selection.selectedSubPaths.includes(subPath.id);
          const shouldShowSubPath = enabledFeatures.has('command-points') || isSubPathSelected;
          
          return subPath.commands.map((command) => {
            // Get the absolute position of the command
            const position = getAbsoluteCommandPosition(command, subPath, path.subPaths);
            
            if (!position) return null;

            const isCommandSelected = selection.selectedCommands.includes(command.id);
            
            // Show command point if:
            // 1. Feature is enabled, OR
            // 2. Sub-path is selected, OR 
            // 3. This specific command is selected
            const shouldShowCommand = shouldShowSubPath || isCommandSelected;
            
            if (!shouldShowCommand) return null;

            const radius = 4 / viewport.zoom; // Fixed visual size independent of zoom

            return (
              <circle
                key={`command-${command.id}-v${renderVersion}`}
                cx={position.x}
                cy={position.y}
                r={radius}
                fill={isCommandSelected ? '#007acc' : '#ff4444'}
                stroke={isCommandSelected ? '#005299' : '#cc0000'}
                strokeWidth={1 / viewport.zoom}
                style={{ 
                  cursor: 'grab',
                  pointerEvents: 'all',
                  opacity: 0.9
                }}
                data-command-id={command.id} // For mouse event handling
              />
            );
          });
        })
      )}
    </>
  );
};

// Control Points Renderer Component
export const ControlPointsRenderer: React.FC = () => {
  const { paths, enabledFeatures, viewport, selection } = useEditorStore();

  if (!paths || paths.length === 0) {
    return null;
  }

  // Check if any sub-path is selected or any command is selected
  const hasSelectedSubPath = selection.selectedSubPaths.length > 0;
  const hasSelectedCommand = selection.selectedCommands.length > 0;
  
  // Show if feature is enabled OR if any sub-path is selected OR if any command is selected
  const shouldShow = enabledFeatures.has('control-points') || hasSelectedSubPath || hasSelectedCommand;
  
  if (!shouldShow) {
    return null;
  }

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
            
            const radius = 3 / viewport.zoom; // Fixed visual size independent of zoom
            
            // Find previous command position for connecting control points
            const prevCommand = commandIndex > 0 ? subPath.commands[commandIndex - 1] : null;
            const prevPosition = prevCommand ? getAbsoluteCommandPosition(prevCommand, subPath, path.subPaths) : null;
            
            // Get absolute control points for this command with path context
            const controlPoints = getAbsoluteControlPoints(command, subPath, path.subPaths);
            
            return (
              <g key={`control-${command.id}`}>
                {/* Render control points for cubic curves */}
                {command.command === 'C' && controlPoints.length >= 2 && (
                  <>
                    {/* First control point connects to previous command position */}
                    {prevPosition && (
                      <>
                        <line
                          x1={prevPosition.x}
                          y1={prevPosition.y}
                          x2={controlPoints[0].x}
                          y2={controlPoints[0].y}
                          stroke="#999"
                          strokeWidth={1 / viewport.zoom}
                          strokeDasharray={`${2 / viewport.zoom},${2 / viewport.zoom}`}
                          pointerEvents="none"
                        />
                        <circle
                          cx={controlPoints[0].x}
                          cy={controlPoints[0].y}
                          r={radius * 0.7}
                          fill="#999"
                          stroke="#666"
                          strokeWidth={1 / viewport.zoom}
                          style={{ cursor: 'grab' }}
                          data-command-id={command.id}
                          data-control-point="x1y1"
                        />
                      </>
                    )}
                    {/* Second control point connects to current command position */}
                    {controlPoints.length >= 2 && (
                      <>
                        <line
                          x1={position.x}
                          y1={position.y}
                          x2={controlPoints[1].x}
                          y2={controlPoints[1].y}
                          stroke="#999"
                          strokeWidth={1 / viewport.zoom}
                          strokeDasharray={`${2 / viewport.zoom},${2 / viewport.zoom}`}
                          pointerEvents="none"
                        />
                        <circle
                          cx={controlPoints[1].x}
                          cy={controlPoints[1].y}
                          r={radius * 0.7}
                          fill="#999"
                          stroke="#666"
                          strokeWidth={1 / viewport.zoom}
                          style={{ cursor: 'grab' }}
                          data-command-id={command.id}
                          data-control-point="x2y2"
                        />
                      </>
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

// Main Visual Debug Component
export const VisualDebugComponent: React.FC = () => {
  const { enabledFeatures, toggleFeature } = useEditorStore();
  
  return (
    <DraggablePanel 
      title="Visual Debug"
      initialPosition={{ x: 980, y: 300 }}
      id="visual-debug"
    >
      <VisualDebugControls
        commandPointsEnabled={enabledFeatures.has('command-points')}
        controlPointsEnabled={enabledFeatures.has('control-points')}
        wireframeEnabled={enabledFeatures.has('wireframe')}
        onToggleCommandPoints={() => toggleFeature('command-points')}
        onToggleControlPoints={() => toggleFeature('control-points')}
        onToggleWireframe={() => toggleFeature('wireframe')}
      />
    </DraggablePanel>
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
        store.toggleFeature('wireframe');
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
      order: 30, // Render on top of paths but below control points
    },
    {
      id: 'control-points-renderer',
      component: ControlPointsRenderer,
      position: 'svg-content',
      order: 20, // Render between paths and command points
    }
  ]
};
