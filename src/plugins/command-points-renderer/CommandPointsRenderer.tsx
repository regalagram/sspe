import React from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { getCommandPosition } from '../../utils/path-utils';

export const CommandPointsRenderer: React.FC = () => {
  const { paths, selection, viewport } = useEditorStore();

  if (!paths || paths.length === 0) {
    return null;
  }

  return (
    <>
      {paths.map((path) => 
        path.subPaths.map((subPath) => 
          subPath.commands.map((command) => {
            const position = getCommandPosition(command);
            if (!position) return null;

            const isSelected = selection.selectedCommands.includes(command.id);
            const radius = Math.max(6 / viewport.zoom, 2); // Minimum 2px for visibility

            return (
              <circle
                key={`command-${command.id}`}
                cx={position.x}
                cy={position.y}
                r={radius}
                fill={isSelected ? '#007acc' : '#ff4444'}
                stroke={isSelected ? '#005299' : '#cc0000'}
                strokeWidth={2 / viewport.zoom}
                style={{ 
                  cursor: 'grab',
                  pointerEvents: 'all',
                  opacity: 0.9
                }}
                data-command-id={command.id} // For mouse event handling
              />
            );
          })
        )
      )}
    </>
  );
};

export const CommandPointsRendererPlugin: Plugin = {
  id: 'command-points-renderer',
  name: 'Command Points Renderer',
  version: '1.0.0',
  enabled: true,
  ui: [
    {
      id: 'command-points-renderer',
      component: CommandPointsRenderer,
      position: 'svg-content',
      order: 30, // Render on top of paths but below control points
    },
  ],
};
