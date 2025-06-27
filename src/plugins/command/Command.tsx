import React from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { DraggablePanel } from '../../components/DraggablePanel';
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
      'm': 'Move To (relative)',
      'L': 'Line To (absolute)',
      'l': 'Line To (relative)',
      'H': 'Horizontal Line To (absolute)',
      'h': 'Horizontal Line To (relative)',
      'V': 'Vertical Line To (absolute)',
      'v': 'Vertical Line To (relative)',
      'C': 'Cubic Bézier Curve (absolute)',
      'c': 'Cubic Bézier Curve (relative)',
      'S': 'Smooth Cubic Bézier Curve (absolute)',
      's': 'Smooth Cubic Bézier Curve (relative)',
      'Q': 'Quadratic Bézier Curve (absolute)',
      'q': 'Quadratic Bézier Curve (relative)',
      'T': 'Smooth Quadratic Bézier Curve (absolute)',
      't': 'Smooth Quadratic Bézier Curve (relative)',
      'A': 'Elliptical Arc (absolute)',
      'a': 'Elliptical Arc (relative)',
      'Z': 'Close Path',
      'z': 'Close Path'
    };
    return descriptions[cmd.command] || `Unknown command: ${cmd.command}`;
  };

  const renderCommandProperties = (cmd: SVGCommand) => {
    const properties: React.ReactElement[] = [];

    // Always show command type
    properties.push(
      <div key="type" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
          Command Type:
        </div>
        <div style={{ 
          fontSize: '14px', 
          fontWeight: '600', 
          color: '#007acc',
          maxWidth: '170px',
          wordWrap: 'break-word',
          lineHeight: '1.3'
        }}>
          {cmd.command} - {getCommandTypeDescription(cmd)}
        </div>
      </div>
    );

    // Show coordinates based on command type
    if (cmd.x !== undefined || cmd.y !== undefined) {
      properties.push(
        <div key="coordinates" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
            Coordinates:
          </div>
          <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
            x: {cmd.x?.toFixed(2) || 'N/A'}, y: {cmd.y?.toFixed(2) || 'N/A'}
          </div>
        </div>
      );
    }

    // Show control points for curves
    if (cmd.x1 !== undefined || cmd.y1 !== undefined) {
      properties.push(
        <div key="control1" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
            Control Point 1:
          </div>
          <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
            x1: {cmd.x1?.toFixed(2) || 'N/A'}, y1: {cmd.y1?.toFixed(2) || 'N/A'}
          </div>
        </div>
      );
    }

    if (cmd.x2 !== undefined || cmd.y2 !== undefined) {
      properties.push(
        <div key="control2" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
            Control Point 2:
          </div>
          <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
            x2: {cmd.x2?.toFixed(2) || 'N/A'}, y2: {cmd.y2?.toFixed(2) || 'N/A'}
          </div>
        </div>
      );
    }

    // Show arc-specific properties
    if (cmd.rx !== undefined || cmd.ry !== undefined) {
      properties.push(
        <div key="radii" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
            Radii:
          </div>
          <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
            rx: {cmd.rx?.toFixed(2) || 'N/A'}, ry: {cmd.ry?.toFixed(2) || 'N/A'}
          </div>
        </div>
      );
    }

    if (cmd.xAxisRotation !== undefined) {
      properties.push(
        <div key="rotation" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
            X-Axis Rotation:
          </div>
          <div style={{ fontSize: '12px' }}>
            {cmd.xAxisRotation}°
          </div>
        </div>
      );
    }

    if (cmd.largeArcFlag !== undefined) {
      properties.push(
        <div key="large-arc" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
            Large Arc Flag:
          </div>
          <div style={{ fontSize: '12px' }}>
            {cmd.largeArcFlag ? 'Yes' : 'No'}
          </div>
        </div>
      );
    }

    if (cmd.sweepFlag !== undefined) {
      properties.push(
        <div key="sweep" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
            Sweep Direction:
          </div>
          <div style={{ fontSize: '12px' }}>
            {cmd.sweepFlag ? 'Clockwise' : 'Counter-clockwise'}
          </div>
        </div>
      );
    }

    // Show ID information
    properties.push(
      <div key="ids" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
          IDs:
        </div>
        <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#666' }}>
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
      gap: '12px' 
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
    <DraggablePanel
      title="Command"
      initialPosition={{ x: 20, y: 200 }}
      id="command-panel"
    >
      <CommandPanel 
        command={command}
        pathId={pathId}
        subPathId={subPathId}
      />
    </DraggablePanel>
  );
};

export const CommandPlugin: Plugin = {
  id: 'command',
  name: 'Command Info',
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
