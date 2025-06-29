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
    
    selectedCommands.forEach(({ command, pathId, subPathId }) => {
      // Si ya es un comando C, no hacer nada para preservar los puntos de control existentes
      if (command.command === 'C') {
        return;
      }
      
      if (command.command === 'L') {
        // Para puntos L, aplicar lógica de suavizado más sofisticada
        const { prevCommand, nextCommand, subPathCommands } = getCommandContext(command.id, pathId, subPathId);
        
        if (prevCommand && command.x !== undefined && command.y !== undefined) {
          let x1, y1, x2, y2;
          
          // Usar lógica de suavizado basada en comandos adyacentes
          if (nextCommand && nextCommand.x !== undefined && nextCommand.y !== undefined) {
            // Tenemos comando anterior y siguiente - usar suavizado Catmull-Rom simplificado
            const p0 = { x: prevCommand.x || 0, y: prevCommand.y || 0 };
            const p1 = { x: command.x, y: command.y };
            const p2 = { x: nextCommand.x, y: nextCommand.y };
            
            // Factor de tensión para suavizado
            const tension = 0.3;
            
            // Calcular tangentes basadas en los puntos adyacentes
            const tangentStart = {
              x: (p1.x - p0.x) * tension,
              y: (p1.y - p0.y) * tension
            };
            
            const tangentEnd = {
              x: (p2.x - p1.x) * tension,
              y: (p2.y - p1.y) * tension
            };
            
            // Puntos de control basados en las tangentes
            x1 = p0.x + tangentStart.x;
            y1 = p0.y + tangentStart.y;
            x2 = p1.x - tangentEnd.x;
            y2 = p1.y - tangentEnd.y;
          } else {
            // Solo tenemos comando anterior - usar aproximación simple pero mejorada
            const startX = prevCommand.x || 0;
            const startY = prevCommand.y || 0;
            const endX = command.x;
            const endY = command.y;
            
            const deltaX = endX - startX;
            const deltaY = endY - startY;
            
            // Usar una proporción más natural para los puntos de control
            const controlRatio = 0.4; // 40% en lugar de 33%
            
            x1 = startX + deltaX * controlRatio;
            y1 = startY + deltaY * controlRatio;
            x2 = endX - deltaX * controlRatio;
            y2 = endY - deltaY * controlRatio;
          }
          
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

  // Helper function to get command context (previous, current, next commands)
  const getCommandContext = (commandId: string, pathId: string, subPathId: string) => {
    const path = paths.find(p => p.id === pathId);
    if (!path) return { prevCommand: null, nextCommand: null, subPathCommands: [] };
    
    const subPath = path.subPaths.find(sp => sp.id === subPathId);
    if (!subPath) return { prevCommand: null, nextCommand: null, subPathCommands: [] };
    
    const commandIndex = subPath.commands.findIndex(cmd => cmd.id === commandId);
    if (commandIndex === -1) return { prevCommand: null, nextCommand: null, subPathCommands: subPath.commands };
    
    const prevCommand = commandIndex > 0 ? subPath.commands[commandIndex - 1] : null;
    const nextCommand = commandIndex < subPath.commands.length - 1 ? subPath.commands[commandIndex + 1] : null;
    
    return {
      prevCommand,
      nextCommand,
      subPathCommands: subPath.commands
    };
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
              command.command === 'L' // Solo permite convertir líneas a curvas (los comandos C se preservan sin cambios)
            )}
            fullWidth={true}
          />
          
        </div>
        
      </div>
    </DraggablePanel>
  );
};
