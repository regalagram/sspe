import React from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { getAbsoluteCommandPosition } from '../../utils/path-utils';
import { DraggablePanel } from '../../components/DraggablePanel';

interface CommandPointsControlsProps {
  enabled: boolean;
  onToggle: () => void;
}

export const CommandPointsControls: React.FC<CommandPointsControlsProps> = ({
  enabled,
  onToggle,
}) => {
  return (
    <div className="command-points-controls" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 4, 
        fontSize: 11,
        cursor: 'pointer'
      }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={onToggle}
          style={{ cursor: 'pointer', accentColor: '#2196f3', marginRight: 4 }}
        />
        Show Command Points
      </label>
    </div>
  );
}

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
            // Use the new function that correctly handles relative commands with path context
            const position = getAbsoluteCommandPosition(command, subPath, path.subPaths);
            
            if (!position) return null;

            const isCommandSelected = selection.selectedCommands.includes(command.id);
            
            // Show command point if:
            // 1. Feature is enabled, OR
            // 2. Sub-path is selected, OR 
            // 3. This specific command is selected
            const shouldShowCommand = shouldShowSubPath || isCommandSelected;
            
            if (!shouldShowCommand) return null;

            const radius = Math.max(6 / viewport.zoom, 2); // Minimum 2px for visibility

            return (
              <circle
                key={`command-${command.id}-v${renderVersion}`}
                cx={position.x}
                cy={position.y}
                r={radius}
                fill={isCommandSelected ? '#007acc' : '#ff4444'}
                stroke={isCommandSelected ? '#005299' : '#cc0000'}
                strokeWidth={2 / viewport.zoom}
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

export const CommandPointsComponent: React.FC = () => {
  const { enabledFeatures, toggleFeature } = useEditorStore();
  
  return (
    <DraggablePanel 
      title="Command Points"
      initialPosition={{ x: 980, y: 380 }}
      id="command-points"
    >
      <CommandPointsControls
        enabled={enabledFeatures.has('command-points')}
        onToggle={() => toggleFeature('command-points')}
      />
    </DraggablePanel>
  );
};

export const CommandPointsRendererPlugin: Plugin = {
  id: 'command-points-renderer',
  name: 'Command Points Renderer',
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
    }
  ],
  
  ui: [
    {
      id: 'command-points-controls',
      component: CommandPointsComponent,
      position: 'sidebar',
      order: 4
    },
    {
      id: 'command-points-renderer',
      component: CommandPointsRenderer,
      position: 'svg-content',
      order: 30, // Render on top of paths but below control points
    },
  ],
};
