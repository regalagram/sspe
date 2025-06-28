import React, { useState, useEffect } from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { DraggablePanel } from '../../components/DraggablePanel';
import { Minimize2 } from 'lucide-react';
import { PluginButton } from '../../components/PluginButton';
import { 
  simplifySegmentWithPointsOnPath, 
  areCommandsInSameSubPath, 
  generateSegmentString,
  generateSubpathString
} from '../../utils/path-simplification-utils';

// Custom hook for persistent state in localStorage
const usePersistentState = <T,>(key: string, defaultValue: T): [T, (value: T) => void] => {
  const [state, setState] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setPersistentState = (value: T) => {
    setState(value);
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Failed to save ${key} to localStorage:`, error);
    }
  };

  return [state, setPersistentState];
};

export const PathSimplificationControls: React.FC = () => {
  const { 
    selection, 
    paths, 
    grid,
    replaceSubPathCommands,
    pushToHistory
  } = useEditorStore();

  // Tolerance settings for simplification with localStorage persistence
  const [simplifyTolerance, setSimplifyTolerance] = usePersistentState('pathSimplification.tolerance', 0.1);
  const [simplifyDistance, setSimplifyDistance] = usePersistentState('pathSimplification.distance', 10);

  const { selectedCommands, selectedSubPaths } = selection;
  
  // Determine what to simplify: selected commands OR selected subpaths (single or multiple)
  let targetSubPath: any = null;
  let targetSubPaths: any[] = [];
  let targetCommands: any[] = [];
  let startIndex: number | undefined;
  let endIndex: number | undefined;
  let canSimplify = false;
  let isMultiSubPath = false;
  
  if (selectedCommands.length >= 2) {
    // Use selected commands approach
    const analysisResult = areCommandsInSameSubPath(selectedCommands, paths);
    const result = analysisResult;
    if (result.sameSubPath && result.subPath && result.commands && result.commands.length >= 2) {
      targetSubPath = result.subPath;
      targetCommands = result.commands;
      startIndex = result.startIndex;
      endIndex = result.endIndex;
      canSimplify = true;
    }
  } else if (selectedSubPaths.length >= 1) {
    // Use selected subpath(s) approach - simplify entire subpath(s)
    if (selectedSubPaths.length === 1) {
      // Single subpath
      const subPathId = selectedSubPaths[0];
      for (const path of paths) {
        const subPath = path.subPaths.find((sp: any) => sp.id === subPathId);
        if (subPath && subPath.commands.length >= 2) {
          targetSubPath = subPath;
          targetCommands = subPath.commands;
          startIndex = 0;
          endIndex = subPath.commands.length - 1;
          canSimplify = true;
          break;
        }
      }
    } else {
      // Multiple subpaths
      for (const subPathId of selectedSubPaths) {
        for (const path of paths) {
          const subPath = path.subPaths.find((sp: any) => sp.id === subPathId);
          if (subPath && subPath.commands.length >= 2) {
            targetSubPaths.push(subPath);
          }
        }
      }
      if (targetSubPaths.length > 0) {
        canSimplify = true;
        isMultiSubPath = true;
      }
    }
  }

  const handleSimplify = () => {
    if (!canSimplify) return;

    // Save current state to history before making changes
    pushToHistory();

    if (isMultiSubPath) {
      // Handle multiple sub-paths
      console.log('Simplifying multiple sub-paths:', targetSubPaths.length);
      
      for (const subPath of targetSubPaths) {
        if (subPath.commands.length < 2) continue;
        
        const commands = subPath.commands;
        console.log('Simplification - processing subpath:', subPath.id, 'with', commands.length, 'commands');
        
        // Use points-on-path algorithm for simplification (Ramer-Douglas-Peucker)
        const simplifiedCommands = simplifySegmentWithPointsOnPath(
          commands, 
          simplifyTolerance, 
          simplifyDistance, 
          grid.snapToGrid ? grid.size : 0
        );

        if (simplifiedCommands.length === 0) continue;
        console.log('Simplified commands for', subPath.id, ':', simplifiedCommands.map((c: any) => `${c.command}(${c.x},${c.y})`));

        // CRITICAL: Ensure the subpath ALWAYS starts with M
        if (simplifiedCommands.length > 0 && simplifiedCommands[0].command !== 'M') {
          console.warn('First command is not M, converting:', simplifiedCommands[0]);
          const firstCmd = simplifiedCommands[0];
          if ('x' in firstCmd && 'y' in firstCmd) {
            simplifiedCommands[0] = {
              ...firstCmd,
              command: 'M'
            };
          }
        }

        console.log('Final subpath commands for', subPath.id, ':', simplifiedCommands.map((c: any) => `${c.command}(${c.x},${c.y})`));
        
        // Replace all commands in this subpath
        replaceSubPathCommands(subPath.id, simplifiedCommands);
      }
    } else if (targetSubPath && targetCommands && startIndex !== undefined && endIndex !== undefined) {
      // Handle single sub-path (existing logic)
      // CRITICAL: Commands are already sorted by path order (not selection order)
      // This guarantees that targetCommands[0] is the first command in the path sequence
      console.log('Simplification - sorted commands by path order:', targetCommands.map((c: any) => `${c.command}(${c.x},${c.y})`));
      console.log('Simplification - startIndex:', startIndex, 'endIndex:', endIndex);

      // Check if the selection starts with the subpath's M command
      const isStartingFromM = startIndex === 0 && targetCommands[0].command === 'M';
      
      // Determine commands to process
      let commandsToSimplify = [...targetCommands];
      let needsContextM = false;
      
      // If we're not starting from M, we need M for context
      if (!isStartingFromM) {
        const subpathMCommand = targetSubPath.commands[0]; // First command should be M
        if (subpathMCommand && subpathMCommand.command === 'M') {
          commandsToSimplify.unshift(subpathMCommand);
          needsContextM = true;
          console.log('Added M for context:', subpathMCommand);
        }
      }

      // Use points-on-path algorithm for simplification (Ramer-Douglas-Peucker)
      const simplifiedCommands = simplifySegmentWithPointsOnPath(
        commandsToSimplify, 
        simplifyTolerance, 
        simplifyDistance, 
        grid.snapToGrid ? grid.size : 0
      );

      if (simplifiedCommands.length === 0) return;
      console.log('Simplified commands:', simplifiedCommands.map((c: any) => `${c.command}(${c.x},${c.y})`));

      // Create the new commands array for the entire subpath
      let newSubPathCommands = [...targetSubPath.commands];
      
      // Determine what commands to use for replacement
      let commandsToReplace = simplifiedCommands;
      
      // If we added M for context and it's still there, handle it properly
      if (needsContextM && simplifiedCommands.length > 0 && simplifiedCommands[0].command === 'M') {
        // We added M for context, so skip it in the replacement since it's not part of selection
        commandsToReplace = simplifiedCommands.slice(1);
        console.log('Skipping context M, replacement commands:', commandsToReplace.map((c: any) => `${c.command}(${c.x},${c.y})`));
      }
      
      // Replace the selected range with simplified commands
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

      console.log('Final subpath commands:', newSubPathCommands.map((c: any) => `${c.command}(${c.x},${c.y})`));
      
      // Replace all commands in the subpath
      replaceSubPathCommands(targetSubPath.id, newSubPathCommands);
    }
  };

  const buttonStyle: React.CSSProperties = {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: canSimplify ? 'pointer' : 'not-allowed',
    fontSize: '14px',
    transition: 'all 0.2s ease',
    width: '100%',
    background: canSimplify ? '#007acc' : '#f5f5f5',
    color: canSimplify ? 'white' : '#999',
    opacity: canSimplify ? 1 : 0.6,
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

  const controlStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginBottom: '8px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    color: '#666',
    fontWeight: '500',
  };

  const inputStyle: React.CSSProperties = {
    padding: '4px 8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '12px',
  };

  return (
    <DraggablePanel
      title="Simplification"
      id="path-simplification"
      initialPosition={{ x: 980, y: 300 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={controlStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ ...labelStyle, minWidth: 55 }}>
              Tolerance
            </label>
            <input
              type="number"
              min="0.01"
              max="1"
              step="0.01"
              value={simplifyTolerance}
              onChange={(e) => setSimplifyTolerance(parseFloat(e.target.value))}
              style={{ ...inputStyle, width: 60 }}
            />
            <button
              onClick={() => setSimplifyTolerance(0.1)}
              style={{ 
                fontSize: '10px', 
                padding: '2px 6px', 
                border: '1px solid #ddd', 
                borderRadius: '3px', 
                background: '#f8f9fa',
                cursor: 'pointer',
                marginLeft: 1
              }}
              title="Reset to default (0.1)"
            >
              Reset
            </button>
          </div>
        </div>

        <div style={controlStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ ...labelStyle, minWidth: 55 }}>
              Distance
            </label>
            <input
              type="number"
              min="1"
              max="50"
              step="1"
              value={simplifyDistance}
              onChange={(e) => setSimplifyDistance(parseInt(e.target.value))}
              style={{ ...inputStyle, width: 60 }}
            />
            <button
              onClick={() => setSimplifyDistance(10)}
              style={{ 
                fontSize: '10px', 
                padding: '2px 6px', 
                border: '1px solid #ddd', 
                borderRadius: '3px', 
                background: '#f8f9fa',
                cursor: 'pointer',
                marginLeft: 1
              }}
              title="Reset to default (10px)"
            >
              Reset
            </button>
          </div>
        </div>



        <PluginButton
          icon={<Minimize2 size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />}
          text="Simplify"
          color="#007acc"
          active={false}
          disabled={!canSimplify}
          onClick={handleSimplify}
        />
      </div>
    </DraggablePanel>
  );
};

export const PathSimplificationPlugin: Plugin = {
  id: 'path-simplification',
  name: 'Path Simplification',
  version: '1.0.0',
  enabled: true,
  dependencies: ['selection-tools'],
  ui: [
    {
      id: 'path-simplification-controls',
      component: PathSimplificationControls,
      position: 'sidebar',
      order: 15,
    },
  ],
  shortcuts: [
    {
      key: 'i',
      modifiers: ['ctrl'],
      description: 'Simplify selected commands',
      action: () => {
        // This will be handled by the component's logic
        const event = new CustomEvent('path-simplification-trigger');
        document.dispatchEvent(event);
      },
    },
  ],
};
