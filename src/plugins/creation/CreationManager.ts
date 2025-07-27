import { PointerEventContext } from '../../core/PluginSystem';
import { PointerEvent } from 'react';
import { snapToGrid } from '../../utils/path-utils';
import { getSVGPoint } from '../../utils/transform-utils';
import { useEditorStore } from '../../store/editorStore';
import { toolModeManager } from '../../managers/ToolModeManager';
import { EditorCommandType, SVGCommand } from '../../types';
import { getCreationInsertionContext, findSubPathByCommandId, findSubPathById } from '../../utils/selection-utils';

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

  handlePointerDown = (e: PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
    const { mode, grid, paths, addCommand, insertCommandAfter, addPath, pushToHistory, setCreateMode } = this.editorStore;
    
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
    
    // Handle NEW_PATH command - always creates a new path
    if (commandType === 'NEW_PATH') {
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
    
    // Get insertion context based on current selection
    const insertionContext = getCreationInsertionContext(this.editorStore);
    
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

  private handleInsertAfterCommand = (commandId: string, commandType: EditorCommandType, point: { x: number; y: number }): boolean => {
    const { insertCommandAfter, pushToHistory, setCreateMode } = this.editorStore;
    
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
          
          insertCommandAfter(commandId, newCommand);
          pushToHistory();
          
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
        newCommand.x1 = point.x - 20;
        newCommand.y1 = point.y - 20;
        newCommand.x2 = point.x + 20;
        newCommand.y2 = point.y + 20;
      }
      
      insertCommandAfter(commandId, newCommand);
      pushToHistory();
      
      // Automatically switch to 'L' command after creating 'M'
      if (commandType === 'M') {
        setCreateMode('L');
      }
      
      return true;
    }
    
    return false;
  };

  private handleInsertAtEndOfSubPath = (subPathId: string, commandType: EditorCommandType, point: { x: number; y: number }): boolean => {
    const { addCommand, pushToHistory, setCreateMode } = this.editorStore;
    
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
          
          addCommand(subPathId, newCommand);
          pushToHistory();
          
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
        newCommand.x1 = point.x - 20;
        newCommand.y1 = point.y - 20;
        newCommand.x2 = point.x + 20;
        newCommand.y2 = point.y + 20;
      }
      
      addCommand(subPathId, newCommand);
      pushToHistory();
      
      // Automatically switch to 'L' command after creating 'M'
      if (commandType === 'M') {
        setCreateMode('L');
      }
      
      return true;
    }
    
    return false;
  };

  private handleDefaultInsertion = (commandType: EditorCommandType, point: { x: number; y: number }): boolean => {
    const { paths, addCommand, pushToHistory, setCreateMode } = this.editorStore;
    
    // Find the active path and sub-path (last sub-path of last path)
    let activeSubPath = null;
    if (paths.length > 0) {
      const lastPath = paths[paths.length - 1];
      if (lastPath.subPaths.length > 0) {
        activeSubPath = lastPath.subPaths[lastPath.subPaths.length - 1];
      }
    }
    
    if (activeSubPath) {
      // Special handling for Z command - it should close the path to the starting point
      if (commandType === 'Z') {
        const firstCommand = activeSubPath.commands.find((cmd: SVGCommand) => cmd.command === 'M');
        if (firstCommand && firstCommand.x !== undefined && firstCommand.y !== undefined) {
          const newCommand: any = {
            command: commandType,
            x: firstCommand.x,
            y: firstCommand.y,
          };
          
          addCommand(activeSubPath.id, newCommand);
          pushToHistory();
          
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
          newCommand.x1 = point.x - 20;
          newCommand.y1 = point.y - 20;
          newCommand.x2 = point.x + 20;
          newCommand.y2 = point.y + 20;
        }
        
        addCommand(activeSubPath.id, newCommand);
        pushToHistory();
        
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
