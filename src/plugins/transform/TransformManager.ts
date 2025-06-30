import { MouseEvent } from 'react';
import { MouseEventHandler, MouseEventContext } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { SVGCommand, Point } from '../../types';

export interface TransformBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  center: Point;
}

export interface TransformHandle {
  id: string;
  type: 'corner' | 'rotation';
  position: Point;
  cursor: string;
}

export type TransformMode = 'scale' | 'rotate' | null;

interface TransformState {
  isTransforming: boolean;
  mode: TransformMode;
  activeHandle: string | null;
  bounds: TransformBounds | null;
  handles: TransformHandle[];
  dragStart: Point | null;
  initialBounds: TransformBounds | null;
  initialCommands: { [commandId: string]: SVGCommand };
}

export class TransformManager {
  private state: TransformState = {
    isTransforming: false,
    mode: null,
    activeHandle: null,
    bounds: null,
    handles: [],
    dragStart: null,
    initialBounds: null,
    initialCommands: {}
  };

  private editorStore: any = null;
  private isShiftPressed: boolean = false;

  setEditorStore(store: any) {
    this.editorStore = store;
    this.setupKeyboardListeners();
  }

  private setupKeyboardListeners() {
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.shiftKey) {
      this.isShiftPressed = true;
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    if (!e.shiftKey) {
      this.isShiftPressed = false;
    }
  };

  cleanup() {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
  }

  // Calculate bounds from selected commands or subpaths
  calculateBounds(): TransformBounds | null {
    const store = this.editorStore || useEditorStore.getState();
    const { selection, paths } = store;
    
    console.log('TransformManager: calculateBounds called', { 
      selectedCommands: selection.selectedCommands, 
      selectedSubPaths: selection.selectedSubPaths,
      pathsCount: paths.length 
    });
    
    const allPoints: Point[] = [];

    // Collect points from selected commands (only if multiple commands)
    if (selection.selectedCommands.length > 1) {
      console.log('TransformManager: Processing multiple selected commands');
      for (const commandId of selection.selectedCommands) {
        const command = this.findCommandById(commandId, paths);
        console.log('TransformManager: Found command', { commandId, command });
        if (command) {
          if (command.x !== undefined && command.y !== undefined) {
            allPoints.push({ x: command.x, y: command.y });
          }
          if (command.x1 !== undefined && command.y1 !== undefined) {
            allPoints.push({ x: command.x1, y: command.y1 });
          }
          if (command.x2 !== undefined && command.y2 !== undefined) {
            allPoints.push({ x: command.x2, y: command.y2 });
          }
        }
      }
    }

    // Collect points from selected subpaths
    if (selection.selectedSubPaths.length > 0) {
      console.log('TransformManager: Processing selected subpaths');
      for (const subPathId of selection.selectedSubPaths) {
        const subPath = this.findSubPathById(subPathId, paths);
        console.log('TransformManager: Found subpath', { subPathId, subPath });
        if (subPath) {
          for (const command of subPath.commands) {
            if (command.x !== undefined && command.y !== undefined) {
              allPoints.push({ x: command.x, y: command.y });
            }
            if (command.x1 !== undefined && command.y1 !== undefined) {
              allPoints.push({ x: command.x1, y: command.y1 });
            }
            if (command.x2 !== undefined && command.y2 !== undefined) {
              allPoints.push({ x: command.x2, y: command.y2 });
            }
          }
        }
      }
    }

    console.log('TransformManager: Collected points', allPoints);

    if (allPoints.length === 0) {
      console.log('TransformManager: No points found, returning null');
      return null;
    }

    // For meaningful transformation, we need at least 2 points to create a bounding area
    if (allPoints.length < 2) {
      console.log('TransformManager: Insufficient points for transformation, returning null');
      return null;
    }

    // Calculate bounding box
    const minX = Math.min(...allPoints.map(p => p.x));
    const maxX = Math.max(...allPoints.map(p => p.x));
    const minY = Math.min(...allPoints.map(p => p.y));
    const maxY = Math.max(...allPoints.map(p => p.y));

    const width = maxX - minX;
    const height = maxY - minY;

    return {
      x: minX,
      y: minY,
      width,
      height,
      center: {
        x: minX + width / 2,
        y: minY + height / 2
      }
    };
  }

  // Generate transform handles based on current bounds
  generateHandles(): TransformHandle[] {
    if (!this.state.bounds) return [];

    const { x, y, width, height, center } = this.state.bounds;
    const handleSize = 8;
    const rotationOffset = 20;

    return [
      // Corner handles for scaling
      {
        id: 'nw',
        type: 'corner',
        position: { x: x - handleSize / 2, y: y - handleSize / 2 },
        cursor: 'nw-resize'
      },
      {
        id: 'ne',
        type: 'corner',
        position: { x: x + width - handleSize / 2, y: y - handleSize / 2 },
        cursor: 'ne-resize'
      },
      {
        id: 'sw',
        type: 'corner',
        position: { x: x - handleSize / 2, y: y + height - handleSize / 2 },
        cursor: 'sw-resize'
      },
      {
        id: 'se',
        type: 'corner',
        position: { x: x + width - handleSize / 2, y: y + height - handleSize / 2 },
        cursor: 'se-resize'
      },
      // Rotation handles (positioned outside the corners)
      {
        id: 'rotate-nw',
        type: 'rotation',
        position: { x: x - rotationOffset, y: y - rotationOffset },
        cursor: 'grab'
      },
      {
        id: 'rotate-ne',
        type: 'rotation',
        position: { x: x + width + rotationOffset - handleSize, y: y - rotationOffset },
        cursor: 'grab'
      },
      {
        id: 'rotate-sw',
        type: 'rotation',
        position: { x: x - rotationOffset, y: y + height + rotationOffset - handleSize },
        cursor: 'grab'
      },
      {
        id: 'rotate-se',
        type: 'rotation',
        position: { x: x + width + rotationOffset - handleSize, y: y + height + rotationOffset - handleSize },
        cursor: 'grab'
      }
    ];
  }

  // Update transform state
  updateTransformState() {
    console.log('TransformManager: updateTransformState called');
    this.state.bounds = this.calculateBounds();
    this.state.handles = this.generateHandles();
    console.log('TransformManager: updateTransformState result', {
      bounds: this.state.bounds,
      handlesCount: this.state.handles.length
    });
  }

  // Check if there's a valid selection for transformation
  hasValidSelection(): boolean {
    const store = this.editorStore || useEditorStore.getState();
    const { selection } = store;
    
    // Need at least one subpath OR multiple commands to show transform controls
    // Single point selection doesn't make sense for transformation
    const hasValidSelection = (
      selection.selectedSubPaths.length > 0 || 
      selection.selectedCommands.length > 1
    );
    
    console.log('TransformManager: hasValidSelection check', {
      selectedCommands: selection.selectedCommands,
      selectedSubPaths: selection.selectedSubPaths,
      hasValidSelection,
      reason: selection.selectedSubPaths.length > 0 ? 'subpaths selected' : 
              selection.selectedCommands.length > 1 ? 'multiple commands' :
              selection.selectedCommands.length === 1 ? 'single command (invalid)' : 'no selection'
    });
    
    return hasValidSelection;
  }

  // Get current bounds
  getBounds(): TransformBounds | null {
    return this.state.bounds;
  }

  // Get current handles
  getHandles(): TransformHandle[] {
    return this.state.handles;
  }

  // Check if currently transforming
  isTransforming(): boolean {
    return this.state.isTransforming;
  }

  // Get current transform mode
  getTransformMode(): string | null {
    return this.state.mode;
  }

  // Check if shift is pressed
  getShiftPressed(): boolean {
    return this.isShiftPressed;
  }

  // Mouse event handlers
  handleMouseDown = (e: MouseEvent<SVGElement>, context: MouseEventContext): boolean => {
    if (!this.hasValidSelection()) return false;

    // Check if clicking on a transform handle
    const clickPoint = context.svgPoint;
    const handle = this.getHandleAtPoint(clickPoint);
    
    if (handle) {
      this.startTransform(handle, clickPoint);
      return true;
    }

    return false;
  };

  handleMouseMove = (e: MouseEvent<SVGElement>, context: MouseEventContext): boolean => {
    if (!this.state.isTransforming) return false;

    this.updateTransform(context.svgPoint);
    return true;
  };

  handleMouseUp = (e: MouseEvent<SVGElement>, context: MouseEventContext): boolean => {
    if (!this.state.isTransforming) return false;

    this.endTransform();
    return true;
  };

  // Helper methods
  private findCommandById(commandId: string, paths: any[]): SVGCommand | null {
    for (const path of paths) {
      for (const subPath of path.subPaths) {
        for (const command of subPath.commands) {
          if (command.id === commandId) {
            return command;
          }
        }
      }
    }
    return null;
  }

  private findSubPathById(subPathId: string, paths: any[]): any | null {
    for (const path of paths) {
      for (const subPath of path.subPaths) {
        if (subPath.id === subPathId) {
          return subPath;
        }
      }
    }
    return null;
  }

  private getHandleAtPoint(point: Point): TransformHandle | null {
    const handleSize = 8;
    const tolerance = handleSize + 2;
    const rotationTolerance = handleSize * 3; // Larger area for rotation detection

    for (const handle of this.state.handles) {
      const dx = point.x - (handle.position.x + handleSize / 2);
      const dy = point.y - (handle.position.y + handleSize / 2);
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Check for direct handle interaction first
      if (distance <= tolerance) {
        return handle;
      }

      // For corner handles, check if we're in the rotation zone (near but not on the handle)
      if (handle.type === 'corner' && distance <= rotationTolerance && distance > tolerance) {
        // Return a rotation variant of this handle
        return {
          ...handle,
          type: 'rotation',
          cursor: 'grab'
        };
      }
    }

    return null;
  }

  private startTransform(handle: TransformHandle, startPoint: Point) {
    const store = this.editorStore || useEditorStore.getState();
    
    this.state.isTransforming = true;
    this.state.activeHandle = handle.id;
    this.state.mode = handle.type === 'corner' ? 'scale' : 'rotate';
    this.state.dragStart = startPoint;
    this.state.initialBounds = { ...this.state.bounds! };
    
    // Store initial command positions
    this.state.initialCommands = {};
    this.storeInitialCommands();

    // Save to history
    store.pushToHistory();
  }

  private updateTransform(currentPoint: Point) {
    if (!this.state.dragStart || !this.state.initialBounds) return;

    if (this.state.mode === 'scale') {
      this.applyScale(currentPoint);
    } else if (this.state.mode === 'rotate') {
      this.applyRotation(currentPoint);
    }

    // Update bounds after transformation
    this.updateTransformState();
  }

  private applyScale(currentPoint: Point) {
    if (!this.state.dragStart || !this.state.initialBounds || !this.state.activeHandle) return;

    const store = this.editorStore || useEditorStore.getState();
    const { updateCommand } = store;

    // Calculate scale factors based on handle position
    const deltaX = currentPoint.x - this.state.dragStart.x;
    const deltaY = currentPoint.y - this.state.dragStart.y;

    let scaleX = 1;
    let scaleY = 1;

    const { width: initialWidth, height: initialHeight, x: initialX, y: initialY } = this.state.initialBounds;

    // Determine scale direction based on active handle
    switch (this.state.activeHandle) {
      case 'nw':
        scaleX = (initialWidth - deltaX) / initialWidth;
        scaleY = (initialHeight - deltaY) / initialHeight;
        break;
      case 'ne':
        scaleX = (initialWidth + deltaX) / initialWidth;
        scaleY = (initialHeight - deltaY) / initialHeight;
        break;
      case 'sw':
        scaleX = (initialWidth - deltaX) / initialWidth;
        scaleY = (initialHeight + deltaY) / initialHeight;
        break;
      case 'se':
        scaleX = (initialWidth + deltaX) / initialWidth;
        scaleY = (initialHeight + deltaY) / initialHeight;
        break;
    }

    // Check if shift is pressed to maintain aspect ratio
    const shiftPressed = this.isShiftPressed;
    if (shiftPressed) {
      const scale = Math.min(Math.abs(scaleX), Math.abs(scaleY));
      scaleX = scaleX < 0 ? -scale : scale;
      scaleY = scaleY < 0 ? -scale : scale;
    }

    // Ensure minimum scale
    scaleX = Math.max(0.1, scaleX);
    scaleY = Math.max(0.1, scaleY);

    // Calculate transform origin based on the opposite corner
    let originX = initialX;
    let originY = initialY;

    switch (this.state.activeHandle) {
      case 'nw':
        originX = initialX + initialWidth;
        originY = initialY + initialHeight;
        break;
      case 'ne':
        originX = initialX;
        originY = initialY + initialHeight;
        break;
      case 'sw':
        originX = initialX + initialWidth;
        originY = initialY;
        break;
      case 'se':
        originX = initialX;
        originY = initialY;
        break;
    }

    // Apply scaling to all selected commands
    this.applyTransformToCommands((x: number, y: number) => {
      const newX = originX + (x - originX) * scaleX;
      const newY = originY + (y - originY) * scaleY;
      return { x: newX, y: newY };
    });
  }

  private applyRotation(currentPoint: Point) {
    if (!this.state.dragStart || !this.state.initialBounds) return;

    const center = this.state.initialBounds.center;
    
    // Calculate rotation angle
    const startAngle = Math.atan2(
      this.state.dragStart.y - center.y,
      this.state.dragStart.x - center.x
    );
    
    const currentAngle = Math.atan2(
      currentPoint.y - center.y,
      currentPoint.x - center.x
    );
    
    let rotationAngle = currentAngle - startAngle;

    // Optional: Snap to 15-degree increments when Shift is pressed
    if (this.isShiftPressed) {
      const snapAngle = Math.PI / 12; // 15 degrees in radians
      rotationAngle = Math.round(rotationAngle / snapAngle) * snapAngle;
    }

    // Apply rotation to all selected commands
    this.applyTransformToCommands((x: number, y: number) => {
      const dx = x - center.x;
      const dy = y - center.y;
      
      const cos = Math.cos(rotationAngle);
      const sin = Math.sin(rotationAngle);
      
      const newX = center.x + dx * cos - dy * sin;
      const newY = center.y + dx * sin + dy * cos;
      
      return { x: newX, y: newY };
    });
  }

  private applyTransformToCommands(transform: (x: number, y: number) => Point) {
    const store = this.editorStore || useEditorStore.getState();
    const { updateCommand } = store;

    // Transform selected commands
    for (const commandId of Object.keys(this.state.initialCommands)) {
      const initialCommand = this.state.initialCommands[commandId];
      const updates: Partial<SVGCommand> = {};

      // Transform main point
      if (initialCommand.x !== undefined && initialCommand.y !== undefined) {
        const transformed = transform(initialCommand.x, initialCommand.y);
        updates.x = transformed.x;
        updates.y = transformed.y;
      }

      // Transform control points
      if (initialCommand.x1 !== undefined && initialCommand.y1 !== undefined) {
        const transformed = transform(initialCommand.x1, initialCommand.y1);
        updates.x1 = transformed.x;
        updates.y1 = transformed.y;
      }

      if (initialCommand.x2 !== undefined && initialCommand.y2 !== undefined) {
        const transformed = transform(initialCommand.x2, initialCommand.y2);
        updates.x2 = transformed.x;
        updates.y2 = transformed.y;
      }

      // Apply updates
      if (Object.keys(updates).length > 0) {
        updateCommand(commandId, updates);
      }
    }
  }

  private endTransform() {
    this.state.isTransforming = false;
    this.state.mode = null;
    this.state.activeHandle = null;
    this.state.dragStart = null;
    this.state.initialBounds = null;
    this.state.initialCommands = {};
  }

  private storeInitialCommands() {
    const store = this.editorStore || useEditorStore.getState();
    const { selection, paths } = store;

    // Store selected commands
    for (const commandId of selection.selectedCommands) {
      const command = this.findCommandById(commandId, paths);
      if (command) {
        this.state.initialCommands[commandId] = { ...command };
      }
    }

    // Store commands from selected subpaths
    for (const subPathId of selection.selectedSubPaths) {
      const subPath = this.findSubPathById(subPathId, paths);
      if (subPath) {
        for (const command of subPath.commands) {
          this.state.initialCommands[command.id] = { ...command };
        }
      }
    }
  }
}

export const transformManager = new TransformManager();

// Mouse event handlers for the plugin system
export const transformMouseHandlers: MouseEventHandler = {
  onMouseDown: transformManager.handleMouseDown,
  onMouseMove: transformManager.handleMouseMove,
  onMouseUp: transformManager.handleMouseUp,
};
