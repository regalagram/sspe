import React, { useEffect } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { DraggablePanel } from '../../components/DraggablePanel';
import { PluginButton } from '../../components/PluginButton';
import { ArrowUpDown, Spline } from 'lucide-react';
import { SVGCommand, SVGCommandType } from '../../types';

interface PointTransformControlsProps {}

export const PointTransformControls: React.FC<PointTransformControlsProps> = () => {
  const { 
    selection,
    paths,
    updateCommand,
    pushToHistory
  } = useEditorStore();
  
  const hasSelectedCommands = selection.selectedCommands.length > 0;

  // Get selected commands details
  const getSelectedCommands = () => {
    const selectedCommands: Array<{ command: SVGCommand; pathId: string; subPathId: string }> = [];
    
    selection.selectedCommands.forEach(commandId => {
      for (const path of paths) {
        for (const subPath of path.subPaths) {
          const command = subPath.commands.find(cmd => cmd.id === commandId);
          if (command) {
            selectedCommands.push({
              command,
              pathId: path.id,
              subPathId: subPath.id
            });
            break;
          }
        }
      }
    });
    
    return selectedCommands;
  };

  const selectedCommands = getSelectedCommands();
  
  // Count command types
  const commandTypeCounts = selectedCommands.reduce((acc, { command }) => {
    acc[command.command] = (acc[command.command] || 0) + 1;
    return acc;
  }, {} as Record<SVGCommandType, number>);

  // Transform to Line commands
  const transformToLine = () => {
    if (!hasSelectedCommands) return;
    
    pushToHistory();
    
    selectedCommands.forEach(({ command }) => {
      if (command.command !== 'L' && command.command !== 'M' && command.command !== 'Z') {
        // Convert to L command, keeping only the endpoint
        const updates: Partial<SVGCommand> = {
          command: 'L',
          // Remove control points
          x1: undefined,
          y1: undefined,
          x2: undefined,
          y2: undefined,
        };
        
        updateCommand(command.id, updates);
      }
    });
  };

  // Transform to Cubic Bézier commands
  const transformToCurve = () => {
    if (!hasSelectedCommands) return;
    
    pushToHistory();
    
    selectedCommands.forEach(({ command }) => {
      if (command.command === 'L') {
        // Find the previous command to calculate control points
        const prevCommand = findPreviousCommand(command.id);
        
        if (prevCommand && command.x !== undefined && command.y !== undefined) {
          // Calculate reasonable control points (1/3 of the way from start to end)
          const startX = prevCommand.x || 0;
          const startY = prevCommand.y || 0;
          const endX = command.x;
          const endY = command.y;
          
          const deltaX = endX - startX;
          const deltaY = endY - startY;
          
          const x1 = startX + deltaX / 3;
          const y1 = startY + deltaY / 3;
          const x2 = endX - deltaX / 3;
          const y2 = endY - deltaY / 3;
          
          const updates: Partial<SVGCommand> = {
            command: 'C',
            x1: Math.round(x1 * 100) / 100,
            y1: Math.round(y1 * 100) / 100,
            x2: Math.round(x2 * 100) / 100,
            y2: Math.round(y2 * 100) / 100,
          };
          
          updateCommand(command.id, updates);
        }
      }
    });
  };

  // Helper function to find the previous command in the same subpath
  const findPreviousCommand = (commandId: string): SVGCommand | null => {
    for (const path of paths) {
      for (const subPath of path.subPaths) {
        const commandIndex = subPath.commands.findIndex(cmd => cmd.id === commandId);
        if (commandIndex > 0) {
          return subPath.commands[commandIndex - 1];
        }
      }
    }
    return null;
  };

  // Listen for custom events from shortcuts
  useEffect(() => {
    const handleTransformToLine = () => transformToLine();
    const handleTransformToCurve = () => transformToCurve();
    
    document.addEventListener('point-transform-to-line', handleTransformToLine);
    document.addEventListener('point-transform-to-curve', handleTransformToCurve);
    
    return () => {
      document.removeEventListener('point-transform-to-line', handleTransformToLine);
      document.removeEventListener('point-transform-to-curve', handleTransformToCurve);
    };
  }, [hasSelectedCommands, selectedCommands]);

  if (!hasSelectedCommands) {
    return null;
  }

  return (
    <DraggablePanel
      id="point-transform"
      title="Point Transform"
      initialPosition={{ x: 20, y: 400 }}
    >
      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        
        {/* Selection info */}
        <div style={{ 
          fontSize: '12px', 
          color: '#666',
          padding: '6px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
          lineHeight: '1.3'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '2px' }}>
            Selected: {selection.selectedCommands.length} command{selection.selectedCommands.length !== 1 ? 's' : ''}
          </div>
          {Object.entries(commandTypeCounts).map(([type, count]) => (
            <div key={type}>
              {count} × {type} {type === 'M' ? '(Move)' : type === 'L' ? '(Line)' : type === 'C' ? '(Curve)' : type === 'Z' ? '(Close)' : ''}
            </div>
          ))}
        </div>

        {/* Transform buttons */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '6px' 
        }}>
          
          <PluginButton
            icon={<ArrowUpDown size={16} />}
            text="to Line (L)"
            color="#0078cc"
            onClick={transformToLine}
            disabled={!selectedCommands.some(({ command }) => 
              command.command === 'C' // Only allow converting curves to lines
            )}
            fullWidth={true}
          />

          <PluginButton
            icon={<Spline size={16} />}
            text="to Curve (C)"
            color="#0078cc"
            onClick={transformToCurve}
            disabled={!selectedCommands.some(({ command }) => 
              command.command === 'L' // Only allow converting lines to curves
            )}
            fullWidth={true}
          />
          
        </div>
        
      </div>
    </DraggablePanel>
  );
};
