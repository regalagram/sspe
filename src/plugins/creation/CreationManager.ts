import { PointerEventContext } from '../../core/PluginSystem';
import { PointerEvent } from 'react';
import { snapToGrid } from '../../utils/path-utils';
import { getSVGPoint } from '../../utils/transform-utils';
import { useEditorStore } from '../../store/editorStore';
import { toolModeManager } from '../../core/ToolModeManager';
import { EditorCommandType, SVGCommand } from '../../types';
import { getCreationInsertionContext, findSubPathByCommandId, findSubPathById } from '../../utils/selection-utils';
import { calculateSmartBezierControlPoints } from '../../utils/bezier-utils';

export class CreationManager {
  private editorStore: any;

  constructor() {
    // Registrar con ToolModeManager
    toolModeManager.setCreationManager(this);
  }

  setEditorStore(store: any) {
    this.editorStore = store;
  }

  getSVGPoint(e: PointerEvent<SVGElement>, svgRef: React.RefObject<SVGSVGElement | null>): { x: number; y: number } {
    return getSVGPoint(e, svgRef, this.editorStore.viewport);
  }

  /**
   * Validate if a command can be created after another command
   */
  private validateCommandSequence(newCommandType: EditorCommandType, afterCommand?: SVGCommand): boolean {
    if (!afterCommand) {
      return true; // No previous command, allow any command
    }

    // Prevent Z after Z (cannot close an already closed path)
    if (newCommandType === 'Z' && afterCommand.command === 'Z') {
      console.warn('⚠️ Cannot create Z (Close Path) command after another Z command. Path is already closed.');
      return false;
    }

    // Prevent M after M (no need for consecutive MoveTo commands)
    if (newCommandType === 'M' && afterCommand.command === 'M') {
      console.warn('⚠️ Cannot create M (Move To) command after another M command. Use L (Line To) or other drawing commands instead.');
      return false;
    }

    return true; // All other combinations are valid
  }

  handlePointerDown = (e: PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
    const { mode, grid, paths, addCommand, insertCommandAfter, addPath, pushToHistory, setCreateMode, clearSelection } = this.editorStore;
    
    // Only handle if we're in create mode and no specific element is being clicked
    // Also exclude PENCIL mode as it's handled by the pencil plugin
    if (mode.current !== 'create' || !mode.createMode || context.commandId || context.controlPoint || mode.createMode.commandType === 'PENCIL') {
      return false;
    }

    // Creating a new command
    const point = this.getSVGPoint(e, context.svgRef);
    
    if (grid.snapToGrid) {
      const snappedPoint = snapToGrid(point, grid.size);
      point.x = snappedPoint.x;
      point.y = snappedPoint.y;
    }
    
    const commandType = mode.createMode.commandType;
    
    // Handle NEW_PATH command - always creates a new path and clears selection
    if (commandType === 'NEW_PATH') {
      // Clear any existing selection first (deselect any selected points or sub-paths)
      clearSelection();
      
      // Create a new path with the M command at the clicked position
      addPath(undefined, point.x, point.y);
      pushToHistory();
      
      // Automatically switch to 'L' command after creating new path
      setCreateMode('L');
      
      return true;
    }
    
    // Special handling for 'M' command when no paths exist
    if ((commandType === 'M' || commandType === 'm') && paths.length === 0) {
      // Create a new path with the M command at the clicked position
      addPath(undefined, point.x, point.y);
      pushToHistory();
      
      // Automatically switch to 'L' command after creating 'M'
      setCreateMode('L');
      
      return true;
    }
    
    // Special handling for 'M' command - always creates a new sub-path
    if ((commandType === 'M' || commandType === 'm')) {
      return this.handleMoveToCommand(point);
    }
    
    // Get insertion context based on current selection
    const insertionContext = getCreationInsertionContext(this.editorStore, commandType);
    
    // Handle different insertion contexts
    if (insertionContext.type === 'after-command' && insertionContext.commandId) {
      // Insert after a specific selected command
      return this.handleInsertAfterCommand(insertionContext.commandId, commandType, point);
    } else if (insertionContext.type === 'end-of-subpath' && insertionContext.subPathId) {
      // Insert at the end of a specific selected sub-path
      return this.handleInsertAtEndOfSubPath(insertionContext.subPathId, commandType, point);
    } else {
      // Default behavior: insert at the end of the last sub-path of the last path
      return this.handleDefaultInsertion(commandType, point);
    }
  };

  private handleMoveToCommand = (point: { x: number; y: number }): boolean => {
    const { paths, addSubPath, addCommand, pushToHistory, setCreateMode, clearSelection, selectCommand } = this.editorStore;
    
    if (paths.length === 0) {
      // No paths exist, create a new path (this case should be handled earlier)
      console.warn('🔧 CreationManager: No paths exist when creating M command');
      return false;
    }
    
    // Get the last path to add the new sub-path to
    const lastPath = paths[paths.length - 1];
    
    // Create new empty sub-path
    const newSubPathId = addSubPath(lastPath.id);
    
    // Create M command
    const newCommand = {
      command: 'M',
      x: point.x,
      y: point.y,
    };
    
    // Add the M command to the new sub-path
    const newCommandId = addCommand(newSubPathId, newCommand);
    pushToHistory();
    
    // Clear selection and select the new command
    clearSelection();
    selectCommand(newCommandId);
    
    // Automatically switch to 'L' command after creating 'M'
    setCreateMode('L');
    
    return true;
  };

  private handleInsertAfterCommand = (commandId: string, commandType: EditorCommandType, point: { x: number; y: number }): boolean => {
    const { insertCommandAfter, pushToHistory, setCreateMode, clearSelection, selectCommand } = this.editorStore;
    
    // Find the command we're inserting after to validate the sequence
    const subPathInfo = findSubPathByCommandId(this.editorStore.paths, commandId);
    if (subPathInfo) {
      const commandIndex = subPathInfo.subPath.commands.findIndex(cmd => cmd.id === commandId);
      if (commandIndex >= 0) {
        const afterCommand = subPathInfo.subPath.commands[commandIndex];
        
        // Validate if this command sequence is allowed
        if (!this.validateCommandSequence(commandType, afterCommand)) {
          return false; // Prevent invalid command sequence
        }
      }
    }
    
    // Special handling for Z command - it should close the path to the starting point
    if (commandType === 'Z') {
      const subPathInfo = findSubPathByCommandId(this.editorStore.paths, commandId);
      if (subPathInfo) {
        const firstCommand = subPathInfo.subPath.commands.find((cmd: SVGCommand) => cmd.command === 'M');
        if (firstCommand && firstCommand.x !== undefined && firstCommand.y !== undefined) {
          const newCommand: any = {
            command: commandType,
            x: firstCommand.x,
            y: firstCommand.y,
          };
          
          const newCommandId = insertCommandAfter(commandId, newCommand);
          pushToHistory();
          
          // Clear selection and select the new command
          clearSelection();
          selectCommand(newCommandId);
          
          return true;
        }
      }
    } else {
      // Handle other commands (M, L, C)
      const newCommand: any = {
        command: commandType,
        x: point.x,
        y: point.y,
      };
      
      // Add properties based on command type
      if (commandType === 'C') {
        const subPathInfo = findSubPathByCommandId(this.editorStore.paths, commandId);
        if (subPathInfo) {
          const controlPoints = calculateSmartBezierControlPoints(
            subPathInfo.subPath,
            point,
            commandId
          );
          newCommand.x1 = controlPoints.x1;
          newCommand.y1 = controlPoints.y1;
          newCommand.x2 = controlPoints.x2;
          newCommand.y2 = controlPoints.y2;
        } else {
          // Fallback to simple control points if sub-path not found
          newCommand.x1 = point.x - 20;
          newCommand.y1 = point.y - 20;
          newCommand.x2 = point.x + 20;
          newCommand.y2 = point.y + 20;
        }
      }
      
      const newCommandId = insertCommandAfter(commandId, newCommand);
      pushToHistory();
      
      // Clear selection and select the new command
      clearSelection();
      selectCommand(newCommandId);
      
      // Automatically switch to 'L' command after creating 'M'
      if (commandType === 'M') {
        setCreateMode('L');
      }
      
      return true;
    }
    
    return false;
  };

  private handleInsertAtEndOfSubPath = (subPathId: string, commandType: EditorCommandType, point: { x: number; y: number }): boolean => {
    const { addCommand, pushToHistory, setCreateMode, clearSelection, selectCommand } = this.editorStore;
    
    // Find the sub-path and validate against the last command
    const subPathInfo = findSubPathById(this.editorStore.paths, subPathId);
    if (subPathInfo && subPathInfo.subPath.commands.length > 0) {
      const lastCommand = subPathInfo.subPath.commands[subPathInfo.subPath.commands.length - 1];
      
      // Validate if this command sequence is allowed
      if (!this.validateCommandSequence(commandType, lastCommand)) {
        return false; // Prevent invalid command sequence
      }
    }
    
    // Special handling for Z command - it should close the path to the starting point
    if (commandType === 'Z') {
      const subPathInfo = findSubPathById(this.editorStore.paths, subPathId);
      if (subPathInfo) {
        const firstCommand = subPathInfo.subPath.commands.find((cmd: SVGCommand) => cmd.command === 'M');
        if (firstCommand && firstCommand.x !== undefined && firstCommand.y !== undefined) {
          const newCommand: any = {
            command: commandType,
            x: firstCommand.x,
            y: firstCommand.y,
          };
          
          const newCommandId = addCommand(subPathId, newCommand);
          pushToHistory();
          
          // Clear selection and select the new command
          clearSelection();
          selectCommand(newCommandId);
          
          return true;
        }
      }
    } else {
      // Handle other commands (M, L, C)
      const newCommand: any = {
        command: commandType,
        x: point.x,
        y: point.y,
      };
      
      // Add properties based on command type
      if (commandType === 'C') {
        const subPathInfo = findSubPathById(this.editorStore.paths, subPathId);
        if (subPathInfo) {
          const controlPoints = calculateSmartBezierControlPoints(
            subPathInfo.subPath,
            point
          );
          newCommand.x1 = controlPoints.x1;
          newCommand.y1 = controlPoints.y1;
          newCommand.x2 = controlPoints.x2;
          newCommand.y2 = controlPoints.y2;
        } else {
          // Fallback to simple control points if sub-path not found
          newCommand.x1 = point.x - 20;
          newCommand.y1 = point.y - 20;
          newCommand.x2 = point.x + 20;
          newCommand.y2 = point.y + 20;
        }
      }
      
      const newCommandId = addCommand(subPathId, newCommand);
      pushToHistory();
      
      // Clear selection and select the new command
      clearSelection();
      selectCommand(newCommandId);
      
      // Automatically switch to 'L' command after creating 'M'
      if (commandType === 'M') {
        setCreateMode('L');
      }
      
      return true;
    }
    
    return false;
  };

  private handleDefaultInsertion = (commandType: EditorCommandType, point: { x: number; y: number }): boolean => {
    const { paths, addCommand, pushToHistory, setCreateMode, clearSelection, selectCommand } = this.editorStore;
    
    // Find the active path and sub-path (last sub-path of last path)
    let activeSubPath = null;
    if (paths.length > 0) {
      const lastPath = paths[paths.length - 1];
      if (lastPath.subPaths.length > 0) {
        activeSubPath = lastPath.subPaths[lastPath.subPaths.length - 1];
      }
    }
    
    if (activeSubPath) {
      // Validate against the last command in the active sub-path
      if (activeSubPath.commands.length > 0) {
        const lastCommand = activeSubPath.commands[activeSubPath.commands.length - 1];
        
        // Validate if this command sequence is allowed
        if (!this.validateCommandSequence(commandType, lastCommand)) {
          return false; // Prevent invalid command sequence
        }
      }
      // Special handling for Z command - it should close the path to the starting point
      if (commandType === 'Z') {
        const firstCommand = activeSubPath.commands.find((cmd: SVGCommand) => cmd.command === 'M');
        if (firstCommand && firstCommand.x !== undefined && firstCommand.y !== undefined) {
          const newCommand: any = {
            command: commandType,
            x: firstCommand.x,
            y: firstCommand.y,
          };
          
          const newCommandId = addCommand(activeSubPath.id, newCommand);
          pushToHistory();
          
          // Clear selection and select the new command
          clearSelection();
          selectCommand(newCommandId);
          
          return true;
        }
      } else {
        // Handle other commands (M, L, C)
        const newCommand: any = {
          command: commandType,
          x: point.x,
          y: point.y,
        };
        
        // Add properties based on command type
        if (commandType === 'C') {
          const controlPoints = calculateSmartBezierControlPoints(
            activeSubPath,
            point
          );
          newCommand.x1 = controlPoints.x1;
          newCommand.y1 = controlPoints.y1;
          newCommand.x2 = controlPoints.x2;
          newCommand.y2 = controlPoints.y2;
        }
        
        const newCommandId = addCommand(activeSubPath.id, newCommand);
        pushToHistory();
        
        // Clear selection and select the new command
        clearSelection();
        selectCommand(newCommandId);
        
        // Automatically switch to 'L' command after creating 'M'
        if (commandType === 'M') {
          setCreateMode('L');
        }
        
        return true;
      }
    }

    return false;
  };

  /**
   * Activar modo creation con un comando específico - llamado por ToolModeManager
   */
  activateCreation(commandType: string): void {
    const store = useEditorStore.getState();
    store.setCreateMode(commandType as any);
  }

  /**
   * Método para desactivación externa por ToolModeManager
   * No notifica de vuelta para evitar loops
   */
  deactivateExternally = (): void => {
        
    // Cambiar modo del editor a select - NO notificar a ToolModeManager para evitar loop
    const store = useEditorStore.getState();
    if (store.mode.current === 'create') {
      store.setMode('select');
    }
    
      };

  /**
   * Método para activación externa por ToolModeManager
   * No genera recursión porque no llama de vuelta a ToolModeManager
   */
  activateExternally = (commandType: EditorCommandType): void => {
        const store = useEditorStore.getState();
    store.setCreateMode(commandType);
  };

  /**
   * Salir del modo creation - llamado cuando el usuario presiona Escape o Exit
   */
  exitCreation = (): void => {
        
    // Verificar si fue activado por ToolModeManager
    if (toolModeManager.isActive('creation')) {
            toolModeManager.notifyModeDeactivated('creation');
    } else {
      // Solo cambiar modo del editor si no fue coordinado por ToolModeManager
      const store = useEditorStore.getState();
      if (store.mode.current === 'create') {
        store.setMode('select');
      }
    }
  };
}

export const creationManager = new CreationManager();
