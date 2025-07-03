import { MouseEvent } from 'react';
import { MouseEventHandler, MouseEventContext } from '../../core/PluginSystem';
import { snapToGrid } from '../../utils/path-utils';
import { getSVGPoint } from '../../utils/transform-utils';

export class CreationManager {
  private editorStore: any;

  setEditorStore(store: any) {
    this.editorStore = store;
  }

  getSVGPoint(e: MouseEvent<SVGElement>, svgRef: React.RefObject<SVGSVGElement | null>): { x: number; y: number } {
    return getSVGPoint(e, svgRef, this.editorStore.viewport);
  }

  handleMouseDown = (e: MouseEvent<SVGElement>, context: MouseEventContext): boolean => {
    const { mode, grid, paths, addCommand, addPath, pushToHistory, setCreateMode } = this.editorStore;
    
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
    
    // Special handling for 'M' command when no paths exist
    if ((commandType === 'M' || commandType === 'm') && paths.length === 0) {
      // Create a new path with the M command at the clicked position
      addPath(undefined, point.x, point.y);
      pushToHistory();
      
      // Automatically switch to 'L' command after creating 'M'
      setCreateMode('L');
      
      return true;
    }
    
    // Find the active path and sub-path (last sub-path of last path or create new)
    let activeSubPath = null;
    if (paths.length > 0) {
      const lastPath = paths[paths.length - 1];
      if (lastPath.subPaths.length > 0) {
        activeSubPath = lastPath.subPaths[lastPath.subPaths.length - 1];
      }
    }
    
    if (activeSubPath) {
      const newCommand: any = {
        command: commandType,
        x: point.x,
        y: point.y,
      };
      
      // Add properties based on command type - only M, L, C, Z supported
      if (commandType === 'C') {
        // For cubic bezier, we need control points
        newCommand.x1 = point.x - 20;
        newCommand.y1 = point.y - 20;
        newCommand.x2 = point.x + 20;
        newCommand.y2 = point.y + 20;
      }
      // M, L, Z commands don't need additional properties
      
      addCommand(activeSubPath.id, newCommand);
      pushToHistory();
      
      // Automatically switch to 'L' command after creating 'M'
      if (commandType === 'M' || commandType === 'm') {
        setCreateMode('L');
      }
      
      return true;
    }

    return false;
  };
}

export const creationManager = new CreationManager();
