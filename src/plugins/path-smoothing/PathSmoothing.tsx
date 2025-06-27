import React from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { DraggablePanel } from '../../components/DraggablePanel';
import { Waves } from 'lucide-react';
import { 
  generateSmoothPath, 
  areCommandsInSameSubPath
} from '../../utils/path-simplification-utils';

export const PathSmoothingControls: React.FC = () => {
  const { 
    selection, 
    paths, 
    grid,
    replaceSubPathCommands
  } = useEditorStore();

  const { selectedCommands } = selection;
  
  // Check if selected commands are in the same subpath
  const analysisResult = areCommandsInSameSubPath(selectedCommands, paths);
  const { sameSubPath, subPath, pathId, commands: sortedCommands, startIndex, endIndex } = analysisResult;
  
  const canSmooth = selectedCommands.length >= 2 && sameSubPath && sortedCommands && sortedCommands.length >= 2;

  const handleSmooth = () => {
    if (!canSmooth || !subPath || !pathId || !sortedCommands || startIndex === undefined || endIndex === undefined) return;

    // CRITICAL: Commands are already sorted by path order (not selection order)
    // This guarantees that sortedCommands[0] is the first command in the path sequence
    console.log('Smoothing - sorted commands by path order:', sortedCommands.map(c => `${c.command}(${c.x},${c.y})`));
    console.log('Smoothing - startIndex:', startIndex, 'endIndex:', endIndex);

    // Check if the selection starts with the subpath's M command
    const isStartingFromM = startIndex === 0 && sortedCommands[0].command === 'M';
    
    // Determine commands to process
    let commandsToSmooth = [...sortedCommands];
    let needsContextM = false;
    
    // If we're not starting from M, we need M for context
    if (!isStartingFromM) {
      const subpathMCommand = subPath.commands[0]; // First command should be M
      if (subpathMCommand && subpathMCommand.command === 'M') {
        commandsToSmooth.unshift(subpathMCommand);
        needsContextM = true;
        console.log('Added M for context:', subpathMCommand);
      }
    }

    // Apply smoothing using getPointSmooth algorithm
    const smoothedCommands = generateSmoothPath(commandsToSmooth, grid.size);

    if (smoothedCommands.length === 0) return;
    console.log('Smoothed commands:', smoothedCommands.map(c => `${c.command}(${c.x},${c.y})`));

    // Create the new commands array for the entire subpath
    let newSubPathCommands = [...subPath.commands];
    
    // Determine what commands to use for replacement
    let commandsToReplace = smoothedCommands;
    
    // If we added M for context and it's still there, handle it properly
    if (needsContextM && smoothedCommands.length > 0 && smoothedCommands[0].command === 'M') {
      // We added M for context, so skip it in the replacement since it's not part of selection
      commandsToReplace = smoothedCommands.slice(1);
      console.log('Skipping context M, replacement commands:', commandsToReplace.map(c => `${c.command}(${c.x},${c.y})`));
    }
    
    // Replace the selected range with smoothed commands
    console.log('Replacing range [', startIndex, ',', endIndex, '] with', commandsToReplace.length, 'commands');
    newSubPathCommands.splice(startIndex, endIndex - startIndex + 1, ...commandsToReplace);
    
    // CRITICAL: Ensure the subpath ALWAYS starts with M
    if (newSubPathCommands.length > 0 && newSubPathCommands[0].command !== 'M') {
      console.warn('First command is not M, converting:', newSubPathCommands[0]);
      const firstCmd = newSubPathCommands[0];
      if ('x' in firstCmd && 'y' in firstCmd) {
        newSubPathCommands[0] = {
          ...firstCmd,
          command: 'M'
        };
      }
    }

    console.log('Final subpath commands:', newSubPathCommands.map(c => `${c.command}(${c.x},${c.y})`));
    
    // Replace all commands in the subpath
    replaceSubPathCommands(subPath.id, newSubPathCommands);
  };

  const buttonStyle: React.CSSProperties = {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: canSmooth ? 'pointer' : 'not-allowed',
    fontSize: '14px',
    transition: 'all 0.2s ease',
    width: '100%',
    background: canSmooth ? '#28a745' : '#f5f5f5',
    color: canSmooth ? 'white' : '#999',
    opacity: canSmooth ? 1 : 0.6,
  };

  const infoStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#666',
    textAlign: 'center',
    padding: '8px',
    background: '#f8f9fa',
    borderRadius: '4px',
    border: '1px solid #e9ecef',
  };

  return (
    <DraggablePanel
      title="Path Smoothing"
      id="path-smoothing"
      initialPosition={{ x: 980, y: 520 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '220px' }}>
        <div style={infoStyle}>
          {selectedCommands.length === 0 && 'Select commands to smooth'}
          {selectedCommands.length === 1 && 'Select at least 2 commands'}
          {selectedCommands.length >= 2 && !sameSubPath && 'Commands must be in same subpath'}
          {canSmooth && `${selectedCommands.length} commands selected`}
        </div>

        <button
          onClick={handleSmooth}
          disabled={!canSmooth}
          style={buttonStyle}
          title={canSmooth ? 'Apply smoothing to selected commands using getPointSmooth' : 'Select 2+ commands in same subpath'}
        >
          <Waves size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          Apply Smoothing
        </button>

        {canSmooth && (
          <div style={{ ...infoStyle, background: '#e8f5e8' }}>
            ✓ Ready to smooth {selectedCommands.length} commands
          </div>
        )}

        <div style={{ ...infoStyle, fontSize: '11px' }}>
          Converts straight lines to smooth Bézier curves while preserving the overall shape.
        </div>
      </div>
    </DraggablePanel>
  );
};

export const pathSmoothingPlugin: Plugin = {
  id: 'path-smoothing',
  name: 'Path Smoothing',
  version: '1.0.0',
  enabled: true,
  dependencies: ['selection-tools'],
  ui: [
    {
      id: 'path-smoothing-controls',
      component: PathSmoothingControls,
      position: 'sidebar',
      order: 16,
    },
  ],
  shortcuts: [
    {
      key: 's',
      modifiers: ['ctrl', 'shift'],
      description: 'Smooth selected commands',
      action: () => {
        // This will be handled by the component's logic
        const event = new CustomEvent('path-smoothing-trigger');
        document.dispatchEvent(event);
      },
    },
  ],
};
