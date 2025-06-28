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

  const { selectedCommands, selectedSubPaths } = selection;
  
  // Determine what to smooth: selected commands OR selected subpaths
  let targetSubPath: any = null;
  let targetCommands: any[] = [];
  let startIndex: number | undefined;
  let endIndex: number | undefined;
  let canSmooth = false;
  
  if (selectedCommands.length >= 2) {
    // Use selected commands approach
    const analysisResult = areCommandsInSameSubPath(selectedCommands, paths);
    const result = analysisResult;
    if (result.sameSubPath && result.subPath && result.commands && result.commands.length >= 2) {
      targetSubPath = result.subPath;
      targetCommands = result.commands;
      startIndex = result.startIndex;
      endIndex = result.endIndex;
      canSmooth = true;
    }
  } else if (selectedSubPaths.length === 1) {
    // Use selected subpath approach - smooth the entire subpath
    const subPathId = selectedSubPaths[0];
    for (const path of paths) {
      const subPath = path.subPaths.find((sp: any) => sp.id === subPathId);
      if (subPath && subPath.commands.length >= 2) {
        targetSubPath = subPath;
        targetCommands = subPath.commands;
        startIndex = 0;
        endIndex = subPath.commands.length - 1;
        canSmooth = true;
        break;
      }
    }
  }

  const handleSmooth = () => {
    if (!canSmooth || !targetSubPath || !targetCommands || startIndex === undefined || endIndex === undefined) return;

    // CRITICAL: Commands are already sorted by path order (not selection order)
    // This guarantees that targetCommands[0] is the first command in the path sequence
    console.log('Smoothing - sorted commands by path order:', targetCommands.map((c: any) => `${c.command}(${c.x},${c.y})`));
    console.log('Smoothing - startIndex:', startIndex, 'endIndex:', endIndex);

    // Extract the segment to smooth
    const segmentToSmooth = [...targetCommands];
    
    // Helper function to update the path after smoothing
    const updatePath = (newCommands: any[], addToHistory: boolean = true) => {
      // Create the new commands array for the entire subpath
      let newSubPathCommands = [...targetSubPath.commands];
      
      // Replace the segment range with the new smoothed commands
      const actualStartIndex = Math.max(0, startIndex!);
      const actualEndIndex = Math.min(targetSubPath.commands.length - 1, endIndex!);
      const replaceLength = actualEndIndex - actualStartIndex + 1;
      
      newSubPathCommands.splice(actualStartIndex, replaceLength, ...newCommands);
      
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

      console.log('Final subpath commands:', newSubPathCommands.map((c: any) => `${c.command}(${c.x},${c.y})`));
      
      // Replace all commands in the subpath
      replaceSubPathCommands(targetSubPath.id, newSubPathCommands);
    };
    
    // Apply smoothing using the new generateSmoothPath function with void signature
    generateSmoothPath(
      segmentToSmooth,
      targetSubPath.commands,
      updatePath,
      (value: number) => Math.round(value / grid.size) * grid.size
    );
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
          {selectedCommands.length === 0 && selectedSubPaths.length === 0 && 'Select commands or a subpath to smooth'}
          {selectedCommands.length === 1 && selectedSubPaths.length === 0 && 'Select at least 2 commands'}
          {selectedCommands.length >= 2 && !canSmooth && 'Commands must be in same subpath'}
          {selectedSubPaths.length > 1 && 'Select only one subpath at a time'}
          {canSmooth && selectedCommands.length > 0 && `${selectedCommands.length} commands selected`}
          {canSmooth && selectedSubPaths.length === 1 && `Entire subpath selected`}
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

export const PathSmoothingPlugin: Plugin = {
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
