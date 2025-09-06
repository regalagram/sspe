import React from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { findCommandById } from '../../utils/subpath-utils';
import { SVGCommand } from '../../types';

// Helper function to evaluate visibility rules (same logic as VisualDebug)
const evaluateVisibilityRules = (
  commandId: string,
  pathId: string,
  subPathId: string,
  store: any
) => {
  const rules = {
    rule1: { name: 'Subpath Selected', result: false, reason: '' },
    rule2: { name: 'Subpath Edit Mode', result: false, reason: '' },
    rule3: { name: 'Command Points Enabled', result: false, reason: '' },
    rule4: { name: 'Transformation Check', result: true, reason: 'No transformation blocking' },
    rule5: { name: 'Moving Command Check', result: true, reason: 'Not moving or magneto effect' },
    rule6: { name: 'Default Visibility', result: false, reason: '' },
    finalResult: false,
    memoizedData: false,
    renderCount: 0,
    timestamp: ''
  };

  try {
    const { paths, selection, mode, enabledFeatures, ui } = store;
    
    const isSubPathSelected = selection.selectedSubPaths.includes(subPathId);
    const isCommandSelected = selection.selectedCommands.includes(commandId);
    const isSubpathEditMode = mode?.current === 'subpath-edit';

    // Simplified checks (we can't access TransformManager easily here)
    const isTransforming = false; // Would need TransformManager
    const isMoving = false; // Would need TransformManager
    const draggingCommandId = null; // Would need TransformManager

    // Find subpath info
    const path = paths.find((p: any) => p.id === pathId);
    const subPath = path?.subPaths?.find((sp: any) => sp.id === subPathId);
    const hasSelectedCommandInSubPath = subPath?.commands?.some((cmd: any) => 
      selection.selectedCommands.includes(cmd.id)
    ) || false;

    // Rule 1: Si el subpath está seleccionado
    if (isSubPathSelected) {
      if (enabledFeatures.hidePointsInSelect) {
        rules.rule1 = { name: 'Subpath Selected', result: false, reason: 'Hidden by hidePointsInSelect' };
      } else {
        rules.rule1 = { name: 'Subpath Selected', result: true, reason: 'Subpath is selected, show all points' };
        rules.finalResult = true;
      }
    } else {
      rules.rule1 = { name: 'Subpath Selected', result: false, reason: 'Subpath not selected' };
    }

    // Rule 2: Si estamos en modo subpath-edit
    if (isSubpathEditMode) {
      if (!enabledFeatures.subpathShowCommandPoints) {
        rules.rule2 = { name: 'Subpath Edit Mode', result: false, reason: 'subpathShowCommandPoints disabled' };
      } else {
        rules.rule2 = { name: 'Subpath Edit Mode', result: true, reason: 'In subpath-edit mode' };
        if (!rules.finalResult) rules.finalResult = true;
      }
    } else {
      rules.rule2 = { name: 'Subpath Edit Mode', result: false, reason: 'Not in subpath-edit mode' };
    }

    // Rule 3: Si commandPointsEnabled está activo
    if (enabledFeatures.commandPointsEnabled) {
      rules.rule3 = { name: 'Command Points Enabled', result: true, reason: 'Global command points enabled' };
      if (!rules.finalResult) rules.finalResult = true;
    } else {
      rules.rule3 = { name: 'Command Points Enabled', result: false, reason: 'Global command points disabled' };
    }

    // Rule 4: Si hay transformación (pero no movimiento)
    if (isTransforming && !isMoving) {
      rules.rule4 = { name: 'Transformation Check', result: false, reason: 'Transforming but not moving' };
      rules.finalResult = false; // This overrides previous rules
    }

    // Rule 5: Si se está moviendo un comando
    if (isMoving && draggingCommandId) {
      if (commandId === draggingCommandId) {
        rules.rule5 = { name: 'Moving Command Check', result: true, reason: 'This command is being dragged' };
        rules.finalResult = true;
      } else {
        rules.rule5 = { name: 'Moving Command Check', result: false, reason: 'Other command being dragged' };
        if (rules.finalResult && rules.rule4.result) {
          // Don't override if other rules allow it
        } else {
          rules.finalResult = false;
        }
      }
    }

    // Rule 6: Condiciones adicionales y default
    if (isCommandSelected || hasSelectedCommandInSubPath) {
      if (enabledFeatures.hidePointsInSelect && isCommandSelected) {
        rules.rule6 = { name: 'Default Visibility', result: false, reason: 'Command selected but hidePointsInSelect active' };
      } else {
        rules.rule6 = { name: 'Default Visibility', result: true, reason: 'Command selected or has selected commands in subpath' };
        if (!rules.finalResult) rules.finalResult = true;
      }
    } else if (!isTransforming && !isMoving) {
      rules.rule6 = { name: 'Default Visibility', result: true, reason: 'Default visibility (no transformation)' };
      if (!rules.finalResult) rules.finalResult = true;
    } else {
      rules.rule6 = { name: 'Default Visibility', result: false, reason: 'No default conditions met' };
    }

    // Check if data might be memoized (simplified heuristic)
    rules.memoizedData = true; // Assume it might be memoized for now

  } catch (error: any) {
    rules.rule1.reason = `Error: ${error?.message || 'Unknown error'}`;
  }

  return rules;
};

interface CommandPanelProps {
  command: SVGCommand;
  pathId: string;
  subPathId: string;
}

const CommandPanel: React.FC<CommandPanelProps> = ({ command, pathId, subPathId }) => {
  const store = useEditorStore();
  const renderCountRef = React.useRef(0);
  
  // Increment render count for debugging
  renderCountRef.current += 1;
  
  // Evaluate visibility rules for debugging
  const visibilityRules = React.useMemo(() => {
    const rules = evaluateVisibilityRules(command.id, pathId, subPathId, store);
    rules.renderCount = renderCountRef.current;
    rules.timestamp = new Date().toLocaleTimeString();
    return rules;
  }, [command.id, pathId, subPathId, store.selection, store.mode, store.enabledFeatures]);

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
      <div key="command-type">
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
        <div key="coordinates">
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
        <div key="control-point-1">
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
        <div key="control-point-2">
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
      <div key="ids">
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

  const renderVisibilityRules = () => {
    return (
      <div key="visibility-rules" style={{ marginTop: '16px', padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
          Visibility Rules Debug
        </div>
        <div style={{ fontSize: '12px', marginBottom: '8px', color: visibilityRules.finalResult ? '#22c55e' : '#ef4444' }}>
          <strong>Final Result: {visibilityRules.finalResult ? 'VISIBLE' : 'HIDDEN'}</strong>
        </div>
        <div style={{ fontSize: '11px', marginBottom: '6px', color: '#666' }}>
          Render Count: {visibilityRules.renderCount} | Time: {visibilityRules.timestamp}
        </div>
        <div style={{ fontSize: '11px', marginBottom: '6px', color: '#666' }}>
          Memoized Data: {visibilityRules.memoizedData ? 'Yes' : 'No'}
        </div>
        {Object.entries(visibilityRules).map(([key, rule]) => {
          if (key === 'finalResult' || key === 'memoizedData' || key === 'renderCount' || key === 'timestamp' || typeof rule !== 'object') return null;
          return (
            <div key={key} style={{ 
              marginBottom: '4px', 
              padding: '4px 6px', 
              background: rule.result ? '#dcfce7' : '#fef2f2',
              border: `1px solid ${rule.result ? '#22c55e' : '#ef4444'}`,
              borderRadius: '3px',
              fontSize: '10px'
            }}>
              <div style={{ fontWeight: 'bold', color: rule.result ? '#15803d' : '#dc2626' }}>
                {rule.name}: {rule.result ? '✓' : '✗'}
              </div>
              <div style={{ color: '#666', marginTop: '2px' }}>
                {rule.reason}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="command-info" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '12px',
    }}>
      {renderCommandProperties(command)}
      {renderVisibilityRules()}
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
