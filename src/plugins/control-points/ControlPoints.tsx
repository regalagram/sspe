import React, { MouseEvent } from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { DraggablePanel } from '../../components/DraggablePanel';
import { getCommandPosition } from '../../utils/path-utils';

interface ControlPointsProps {
  enabled: boolean;
  onToggle: () => void;
}

export const ControlPointsControls: React.FC<ControlPointsProps> = ({
  enabled,
  onToggle,
}) => {
  return (
    <div className="control-points-controls" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        fontSize: '14px',
        cursor: 'pointer'
      }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={onToggle}
          style={{ cursor: 'pointer' }}
        />
        Show Control Points
      </label>
      <div style={{ 
        fontSize: '12px', 
        color: '#666', 
        padding: '8px',
        background: '#f8f9fa',
        borderRadius: '4px',
        border: '1px solid #dee2e6'
      }}>
        {enabled ? '✅ Control points are visible for curves' : '❌ Control points are hidden'}
      </div>
    </div>
  );
};

export const ControlPointsRenderer: React.FC = () => {
  const { paths, enabledFeatures, viewport } = useEditorStore();

  if (!enabledFeatures.has('control-points')) return null;

  return (
    <>
      {paths.map((path) => 
        path.subPaths.map((subPath) => 
          subPath.commands.map((command, commandIndex) => {
            const position = getCommandPosition(command);
            if (!position) return null;
            
            const radius = Math.max(6 / viewport.zoom, 6); // Minimum 6px for visibility
            
            // Find previous command position for connecting control points
            const prevCommand = commandIndex > 0 ? subPath.commands[commandIndex - 1] : null;
            const prevPosition = prevCommand ? getCommandPosition(prevCommand) : null;
            
            return (
              <g key={`control-${command.id}`}>
                {/* Render control points for cubic curves */}
                {(command.command === 'C' || command.command === 'c') && (
                  <>
                    {/* First control point connects to previous command position */}
                    {command.x1 !== undefined && command.y1 !== undefined && prevPosition && (
                      <>
                        <line
                          x1={prevPosition.x}
                          y1={prevPosition.y}
                          x2={command.x1}
                          y2={command.y1}
                          stroke="#999"
                          strokeWidth={1 / viewport.zoom}
                          strokeDasharray={`${2 / viewport.zoom},${2 / viewport.zoom}`}
                          pointerEvents="none"
                        />
                        <circle
                          cx={command.x1}
                          cy={command.y1}
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
                    {command.x2 !== undefined && command.y2 !== undefined && (
                      <>
                        <line
                          x1={position.x}
                          y1={position.y}
                          x2={command.x2}
                          y2={command.y2}
                          stroke="#999"
                          strokeWidth={1 / viewport.zoom}
                          strokeDasharray={`${2 / viewport.zoom},${2 / viewport.zoom}`}
                          pointerEvents="none"
                        />
                        <circle
                          cx={command.x2}
                          cy={command.y2}
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
                
                {/* Render control point for quadratic curves */}
                {(command.command === 'Q' || command.command === 'q') && command.x1 !== undefined && command.y1 !== undefined && (
                  <>
                    <line
                      x1={position.x}
                      y1={position.y}
                      x2={command.x1}
                      y2={command.y1}
                      stroke="#999"
                      strokeWidth={1 / viewport.zoom}
                      strokeDasharray={`${2 / viewport.zoom},${2 / viewport.zoom}`}
                      pointerEvents="none"
                    />
                    <circle
                      cx={command.x1}
                      cy={command.y1}
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
              </g>
            );
          })
        )
      )}
    </>
  );
};

export const ControlPointsComponent: React.FC = () => {
  const { enabledFeatures, toggleFeature } = useEditorStore();
  
  return (
    <DraggablePanel 
      title="Control Points"
      initialPosition={{ x: 980, y: 260 }}
      id="control-points"
    >
      <ControlPointsControls
        enabled={enabledFeatures.has('control-points')}
        onToggle={() => toggleFeature('control-points')}
      />
    </DraggablePanel>
  );
};

export const ControlPointsPlugin: Plugin = {
  id: 'control-points',
  name: 'Control Points',
  version: '1.0.0',
  enabled: true,
  
  shortcuts: [
    {
      key: 'p',
      modifiers: ['ctrl'],
      description: 'Toggle Control Points',
      action: () => {
        const store = useEditorStore.getState();
        store.toggleFeature('control-points');
      }
    }
  ],
  
  ui: [
    {
      id: 'control-points-controls',
      component: ControlPointsComponent,
      position: 'sidebar',
      order: 3
    },
    {
      id: 'control-points-renderer',
      component: ControlPointsRenderer,
      position: 'svg-content',
      order: 20, // Render between paths and command points
    }
  ]
};
