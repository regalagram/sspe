import React from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { findCommandById } from '../../utils/subpath-utils';
import { SVGCommand } from '../../types';

interface CommandPanelProps {
  command: SVGCommand;
  pathId: string;
  subPathId: string;
}

const CommandPanel: React.FC<CommandPanelProps> = ({ command, pathId, subPathId }) => {
  const getCommandTypeDescription = (cmd: SVGCommand): string => {
    const descriptions: Record<string, string> = {
      'M': 'Move To (absolute)',
      'L': 'Line To (absolute)',
      'C': 'Cubic Bézier Curve (absolute)',
      'Z': 'Close Path'
    };
    return descriptions[cmd.command] || `Unknown command: ${cmd.command}`;
  };

  const renderCommandProperties = (cmd: SVGCommand) => {
    const properties: React.ReactElement[] = [];

    // Always show command type
    properties.push(
      <div>
        <div>
          Command Type:
        </div>
        <div>
          {cmd.command} - {getCommandTypeDescription(cmd)}
        </div>
      </div>
    );

    // Show coordinates based on command type
    if (cmd.x !== undefined || cmd.y !== undefined) {
      properties.push(
        <div>
          <div>
            Coordinates:
          </div>
          <div>
            x: {cmd.x?.toFixed(2) || 'N/A'}, y: {cmd.y?.toFixed(2) || 'N/A'}
          </div>
        </div>
      );
    }

    // Show control points for curves
    if (cmd.x1 !== undefined || cmd.y1 !== undefined) {
      properties.push(
        <div>
          <div>
            Control Point 1:
          </div>
          <div>
            x1: {cmd.x1?.toFixed(2) || 'N/A'}, y1: {cmd.y1?.toFixed(2) || 'N/A'}
          </div>
        </div>
      );
    }

    if (cmd.x2 !== undefined || cmd.y2 !== undefined) {
      properties.push(
        <div>
          <div>
            Control Point 2:
          </div>
          <div>
            x2: {cmd.x2?.toFixed(2) || 'N/A'}, y2: {cmd.y2?.toFixed(2) || 'N/A'}
          </div>
        </div>
      );
    }

    // Show ID information
    properties.push(
      <div>
        <div>
          IDs
        </div>
        <div>
          <div>Command: {cmd.id}</div>
          <div>SubPath: {subPathId}</div>
          <div>Path: {pathId}</div>
        </div>
      </div>
    );

    return properties;
  };

  return (
    <div className="command-info" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '12px',
    }}>
      {renderCommandProperties(command)}
    </div>
  );
};

export const CommandPanelComponent: React.FC = () => {
  const { paths, selection } = useEditorStore();

  // Only show the panel when exactly one command is selected
  if (selection.selectedCommands.length !== 1) {
    return null;
  }

  const selectedCommandId = selection.selectedCommands[0];
  const commandInfo = findCommandById(paths, selectedCommandId);

  if (!commandInfo) {
    return null;
  }

  const { command, pathId, subPathId } = commandInfo;

  return (
    <div>
      <CommandPanel 
        command={command}
        pathId={pathId}
        subPathId={subPathId}
      />
    </div>
  );
};

export const CommandPlugin: Plugin = {
  id: 'command',
  name: 'Point Info',
  version: '1.0.0',
  enabled: true,
  
  ui: [
    {
      id: 'command-info-panel',
      component: CommandPanelComponent,
      position: 'sidebar',
      order: 100
    }
  ]
};
