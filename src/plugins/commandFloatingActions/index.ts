import { Plugin } from '../../core/PluginSystem';
import { 
  FloatingActionDefinition, 
  ToolbarAction 
} from '../../types/floatingToolbar';
import { useEditorStore } from '../../store/editorStore';
import { getUniqueCommandPositions, isCommandArrangeable } from '../../utils/command-point-utils';
import { 
  Move, 
  RotateCw, 
  Scale, 
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  ArrowLeftRight,
  ArrowUpDown,
  Trash2,
  Grid3X3,
  MousePointer2,
  Spline,
  Minus
} from 'lucide-react';

// Helper functions for conditional visibility
const getSelectedCommandsWithContext = () => {
  const store = useEditorStore.getState();
  const commandsWithContext: Array<{ command: SVGCommand; subPathCommands: SVGCommand[] }> = [];
  
  store.selection.selectedCommands.forEach(id => {
    for (const path of store.paths) {
      for (const subPath of path.subPaths) {
        const cmd = subPath.commands.find(c => c.id === id);
        if (cmd && isCommandArrangeable(cmd, subPath.commands)) {
          commandsWithContext.push({
            command: cmd,
            subPathCommands: subPath.commands
          });
          return;
        }
      }
    }
  });
  
  return commandsWithContext;
};

const getSelectedCommands = () => {
  return getSelectedCommandsWithContext().map(ctx => ctx.command);
};

const getUniquePositionsCount = () => {
  const commandsWithContext = getSelectedCommandsWithContext();
  if (commandsWithContext.length === 0) return 0;
  
  const uniquePositions = getUniqueCommandPositions(commandsWithContext);
  return uniquePositions.length;
};

const canAlign = () => getUniquePositionsCount() >= 2;
const canDistribute = () => getUniquePositionsCount() >= 3;

// Point transformation helpers
const getTransformableCommands = () => {
  const commands = getSelectedCommands();
  return commands.filter(cmd => cmd.command === 'L' || cmd.command === 'C');
};

const canTransformToLines = () => {
  const commands = getTransformableCommands();
  return commands.length > 0 && commands.some(cmd => cmd.command === 'C');
};

const canTransformToCurves = () => {
  const commands = getTransformableCommands();
  return commands.length > 0 && commands.some(cmd => cmd.command === 'L');
};

const hasTransformableCommands = () => {
  return canTransformToLines() || canTransformToCurves();
};

// Transform commands to lines
const transformToLines = () => {
  const store = useEditorStore.getState();
  const commands = getSelectedCommands();
  
  if (!canTransformToLines()) return;
  
  store.pushToHistory();
  
  commands.forEach(command => {
    if (command.command === 'C') {
      // Convert to L command, keeping only the endpoint
      const updates = {
        command: 'L' as const,
        // Remove control points
        x1: undefined,
        y1: undefined,
        x2: undefined,
        y2: undefined,
      };
      
      store.updateCommand(command.id, updates);
    }
  });
};

// Transform commands to curves
const transformToCurves = () => {
  const store = useEditorStore.getState();
  const commands = getSelectedCommands();
  
  if (!canTransformToCurves()) return;
  
  store.pushToHistory();
  
  commands.forEach(command => {
    if (command.command === 'L' && command.x !== undefined && command.y !== undefined) {
      // Find previous command to create smooth curve
      const prevCommand = findPreviousCommand(command.id);
      
      if (prevCommand && prevCommand.x !== undefined && prevCommand.y !== undefined) {
        const startX = prevCommand.x;
        const startY = prevCommand.y;
        const endX = command.x;
        const endY = command.y;
        
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        
        // Use natural control point ratio
        const controlRatio = 0.4;
        
        const x1 = startX + deltaX * controlRatio;
        const y1 = startY + deltaY * controlRatio;
        const x2 = endX - deltaX * controlRatio;
        const y2 = endY - deltaY * controlRatio;
        
        const updates = {
          command: 'C' as const,
          x1: Math.round(x1 * 100) / 100,
          y1: Math.round(y1 * 100) / 100,
          x2: Math.round(x2 * 100) / 100,
          y2: Math.round(y2 * 100) / 100,
        };
        
        store.updateCommand(command.id, updates);
      }
    }
  });
};

// Helper to find previous command
const findPreviousCommand = (commandId: string) => {
  const store = useEditorStore.getState();
  
  for (const path of store.paths) {
    for (const subPath of path.subPaths) {
      const commandIndex = subPath.commands.findIndex(cmd => cmd.id === commandId);
      if (commandIndex > 0) {
        return subPath.commands[commandIndex - 1];
      }
    }
  }
  return null;
};

// Point transformation actions
const getTransformActions = (): ToolbarAction[] => [
  {
    id: 'transform-point-type',
    get icon() {
      // Dynamic icon based on what transformation is available
      if (canTransformToLines()) return Minus; // Line icon for converting curves to lines
      if (canTransformToCurves()) return Spline; // Curve icon for converting lines to curves
      return Spline; // Default to curve icon
    },
    get label() {
      if (canTransformToLines()) return 'To Lines';
      if (canTransformToCurves()) return 'To Curves';
      return 'Transform';
    },
    type: 'button',
    action: () => {
      if (canTransformToLines()) {
        transformToLines();
      } else if (canTransformToCurves()) {
        transformToCurves();
      }
    },
    priority: 95,
    get tooltip() {
      if (canTransformToLines()) return 'Convert curves to straight lines (Ctrl+Shift+L)';
      if (canTransformToCurves()) return 'Convert lines to smooth curves (Ctrl+Shift+C)';
      return 'Transform point type';
    },
    visible: hasTransformableCommands
  },
  {
    id: 'snap-to-grid',
    icon: Grid3X3,
    label: 'Snap to Grid',
    type: 'button',
    action: () => {
      const store = useEditorStore.getState();
      const { selection, grid } = store;
      
      if (!grid.enabled) {
        return;
      }

      // Snap each selected command to grid
      selection.selectedCommands.forEach(commandId => {
        // Find the command
        for (const path of store.paths) {
          for (const subPath of path.subPaths) {
            const command = subPath.commands.find(cmd => cmd.id === commandId);
            if (command && command.x !== undefined && command.y !== undefined) {
              const snappedX = Math.round(command.x / grid.size) * grid.size;
              const snappedY = Math.round(command.y / grid.size) * grid.size;
              
              if (command.x !== snappedX || command.y !== snappedY) {
                store.updateCommand(commandId, { x: snappedX, y: snappedY });
              }
              return;
            }
          }
        }
      });
      
      store.pushToHistory();
    },
    priority: 90,
    tooltip: 'Snap selected points to grid'
  }
];

// Arrange actions for command points
const getArrangeActions = (): ToolbarAction[] => [
  {
    id: 'align-commands-left',
    icon: AlignLeft,
    label: 'Align Left',
    type: 'button',
    action: () => {
      const store = useEditorStore.getState();
      if (!canAlign()) return;
      
      store.alignCommandsLeft(store.selection.selectedCommands);
      store.pushToHistory();
    },
    priority: 80,
    tooltip: 'Align points to the left',
    visible: canAlign
  },
  {
    id: 'align-commands-center',
    icon: AlignCenter,
    label: 'Align Center',
    type: 'button',
    action: () => {
      const store = useEditorStore.getState();
      if (!canAlign()) return;
      
      store.alignCommandsCenter(store.selection.selectedCommands);
      store.pushToHistory();
    },
    priority: 79,
    tooltip: 'Align points to center',
    visible: canAlign
  },
  {
    id: 'align-commands-right',
    icon: AlignRight,
    label: 'Align Right',
    type: 'button',
    action: () => {
      const store = useEditorStore.getState();
      if (!canAlign()) return;
      
      store.alignCommandsRight(store.selection.selectedCommands);
      store.pushToHistory();
    },
    priority: 78,
    tooltip: 'Align points to the right',
    visible: canAlign
  },
  {
    id: 'align-commands-top',
    icon: AlignVerticalJustifyStart,
    label: 'Align Top',
    type: 'button',
    action: () => {
      const store = useEditorStore.getState();
      if (!canAlign()) return;
      
      store.alignCommandsTop(store.selection.selectedCommands);
      store.pushToHistory();
    },
    priority: 77,
    tooltip: 'Align points to top',
    visible: canAlign
  },
  {
    id: 'align-commands-middle',
    icon: AlignVerticalJustifyCenter,
    label: 'Align Middle',
    type: 'button',
    action: () => {
      const store = useEditorStore.getState();
      if (!canAlign()) return;
      
      store.alignCommandsMiddle(store.selection.selectedCommands);
      store.pushToHistory();
    },
    priority: 76,
    tooltip: 'Align points to middle',
    visible: canAlign
  },
  {
    id: 'align-commands-bottom',
    icon: AlignVerticalJustifyEnd,
    label: 'Align Bottom',
    type: 'button',
    action: () => {
      const store = useEditorStore.getState();
      if (!canAlign()) return;
      
      store.alignCommandsBottom(store.selection.selectedCommands);
      store.pushToHistory();
    },
    priority: 75,
    tooltip: 'Align points to bottom',
    visible: canAlign
  },
  {
    id: 'distribute-commands-horizontally',
    icon: ArrowLeftRight,
    label: 'Distribute H',
    type: 'button',
    action: () => {
      const store = useEditorStore.getState();
      if (!canDistribute()) return;
      
      store.distributeCommandsHorizontally(store.selection.selectedCommands);
      store.pushToHistory();
    },
    priority: 60,
    tooltip: 'Distribute points horizontally',
    visible: canDistribute
  },
  {
    id: 'distribute-commands-vertically',
    icon: ArrowUpDown,
    label: 'Distribute V',
    type: 'button',
    action: () => {
      const store = useEditorStore.getState();
      if (!canDistribute()) return;
      
      store.distributeCommandsVertically(store.selection.selectedCommands);
      store.pushToHistory();
    },
    priority: 59,
    tooltip: 'Distribute points vertically',
    visible: canDistribute
  }
];

// Delete action for command points
const getDeleteActions = (): ToolbarAction[] => [
  {
    id: 'delete-commands',
    icon: Trash2,
    label: 'Delete',
    type: 'button',
    action: () => {
      const store = useEditorStore.getState();
      const { selectedCommands } = store.selection;
      
      if (selectedCommands.length === 0) return;
      
      // Delete each selected command
      selectedCommands.forEach(commandId => {
        store.removeCommand(commandId);
      });
      
      store.pushToHistory();
    },
    priority: 10,
    destructive: true,
    tooltip: 'Delete selected points',
    shortcut: 'Delete'
  }
];

// All possible actions - we'll filter them at the manager level
const getAllCommandActions = (): ToolbarAction[] => {
  return [
    ...getTransformActions(),
    ...getArrangeActions(),
    ...getDeleteActions()
  ];
};

// Define floating actions for command points
const commandFloatingActions: FloatingActionDefinition[] = [
  {
    elementTypes: ['command'],
    selectionTypes: ['single', 'multiple'],
    actions: getAllCommandActions(),
    priority: 100
  }
];

export const CommandFloatingActionsPlugin: Plugin = {
  id: 'command-floating-actions',
  name: 'Command Point Floating Actions',
  version: '1.0.0',
  enabled: true,
  
  floatingActions: commandFloatingActions,
  
  initialize: () => {
  }
};