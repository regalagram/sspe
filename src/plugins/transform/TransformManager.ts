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
    console.log('=== TransformManager: calculateBounds START ===');
    
    const store = this.editorStore || useEditorStore.getState();
    console.log('🔍 Store state check:', {
      hasStore: !!store,
      selection: store?.selection,
      pathsCount: store?.paths?.length || 0
    });
    
    // Try DOM-based calculation first (more accurate)
    console.log('🌐 DOM CALCULATION: Starting DOM-based bounds calculation using SVG getBBox()...');
    const domBounds = this.calculateBoundsWithDOM();
    
    if (domBounds) {
      console.log('🟢 DOM CALCULATION SUCCESS!', {
        method: '🌐 DOM_NATIVE (getBBox)',
        bounds: domBounds,
        precision: 'HIGH - includes curve calculations',
        advantage: 'Browser-native SVG geometry calculation'
      });
      console.log('=== TransformManager: calculateBounds END (DOM SUCCESS) ===');
      return domBounds;
    }

    // Fallback to manual calculation
    console.log('🟡 DOM CALCULATION FAILED: Falling back to manual point-based calculation');
    const manualBounds = this.calculateBoundsManual();
    
    if (manualBounds) {
      console.log('🟠 MANUAL CALCULATION SUCCESS!', {
        method: '📐 MANUAL_FALLBACK (point iteration)',
        bounds: manualBounds,
        precision: 'MEDIUM - control points only',
        reason: 'DOM calculation failed or returned invalid bounds'
      });
    } else {
      console.log('🔴 BOTH CALCULATIONS FAILED: Neither DOM nor manual bounds calculation succeeded');
    }
    
    console.log('=== TransformManager: calculateBounds END (MANUAL FALLBACK) ===');
    return manualBounds;
  }

  // Manual bounds calculation (fallback)
  private calculateBoundsManual(): TransformBounds | null {
    const store = this.editorStore || useEditorStore.getState();
    const { selection, paths } = store;
    
    console.log('📐 MANUAL CALCULATION START: Using point iteration for bounds');
    console.log('📐 MANUAL METHOD: Selection state', { 
      selectedCommands: selection.selectedCommands, 
      selectedSubPaths: selection.selectedSubPaths,
      pathsCount: paths.length,
      technique: 'Min/Max point iteration',
      precision: 'MEDIUM (control points only)'
    });
    
    const allPoints: Point[] = [];

    // Collect points from selected commands (only if multiple commands)
    if (selection.selectedCommands.length > 1) {
      console.log('📐 MANUAL METHOD: Processing multiple selected commands');
      for (const commandId of selection.selectedCommands) {
        const command = this.findCommandById(commandId, paths);
        console.log('TransformManager: Found command', { commandId, command });
        if (command) {
          // Include all points (main command point + control points) for visual area calculation
          // This gives us the complete visual bounds including curve control points
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
      console.log('📐 MANUAL METHOD: Processing selected subpaths');
      for (const subPathId of selection.selectedSubPaths) {
        const subPath = this.findSubPathById(subPathId, paths);
        console.log('TransformManager: Found subpath', { subPathId, subPath });
        if (subPath) {
          for (const command of subPath.commands) {
            // Include all points (main command point + control points) for visual area calculation
            if (command.x !== undefined && command.y !== undefined) {
              allPoints.push({ x: command.x, y: command.y });
            }
            // Include control points for curves to get the complete visual bounds
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

    console.log('📐 MANUAL METHOD: Collected points', {
      totalPoints: allPoints.length,
      samplePoints: allPoints.slice(0, 3),
      technique: 'Point iteration'
    });

    if (allPoints.length === 0) {
      console.log('📐 MANUAL METHOD ABORT: No points found');
      return null;
    }

    // For meaningful transformation, we need at least 2 points to create a bounding area
    if (allPoints.length < 2) {
      console.log('📐 MANUAL METHOD ABORT: Insufficient points for transformation');
      return null;
    }

    // Check if all points are in the same position (no transformable area)
    const uniquePoints = this.getUniquePoints(allPoints);
    if (uniquePoints.length < 2) {
      console.log('📐 MANUAL METHOD ABORT: All points are in the same position, no transformable area', {
        totalPoints: allPoints.length,
        uniquePoints: uniquePoints.length,
        firstPoint: allPoints[0]
      });
      return null;
    }

    // Calculate bounding box
    console.log('📐 MANUAL METHOD: Calculating min/max bounds from', allPoints.length, 'points');
    const minX = Math.min(...allPoints.map(p => p.x));
    const maxX = Math.max(...allPoints.map(p => p.x));
    const minY = Math.min(...allPoints.map(p => p.y));
    const maxY = Math.max(...allPoints.map(p => p.y));

    const width = maxX - minX;
    const height = maxY - minY;

    // Ensure the bounding box has a minimum size for meaningful transformation
    const minSize = 1; // Minimum 1 unit in any dimension
    if (width < minSize && height < minSize) {
      console.log('📐 MANUAL METHOD ABORT: Bounding box too small for transformation', {
        width,
        height,
        minSize
      });
      return null;
    }

    const result = {
      x: minX,
      y: minY,
      width,
      height,
      center: {
        x: minX + width / 2,
        y: minY + height / 2
      }
    };

    console.log('🟠 MANUAL METHOD SUCCESS: Calculated bounds using point iteration', {
      result,
      method: 'MANUAL FALLBACK',
      limitation: 'Does not include true curve geometry'
    });

    return result;
  }

  // Generate transform handles based on current bounds
  generateHandles(): TransformHandle[] {
    if (!this.state.bounds) return [];

    const { x, y, width, height, center } = this.state.bounds;
    const handleSize = 8;
    const rotationOffset = 30; // Increased distance to avoid conflicts

    const handles: TransformHandle[] = [
      // Corner handles for scaling
      {
        id: 'nw',
        type: 'corner',
        position: { x: x, y: y },
        cursor: 'nw-resize'
      },
      {
        id: 'ne',
        type: 'corner', 
        position: { x: x + width, y: y },
        cursor: 'ne-resize'
      },
      {
        id: 'sw',
        type: 'corner',
        position: { x: x, y: y + height },
        cursor: 'sw-resize'
      },
      {
        id: 'se',
        type: 'corner',
        position: { x: x + width, y: y + height },
        cursor: 'se-resize'
      },
      // Rotation handles (positioned further outside the corners)
      {
        id: 'rotate-nw',
        type: 'rotation',
        position: { x: x - rotationOffset, y: y - rotationOffset },
        cursor: 'grab'
      },
      {
        id: 'rotate-ne',
        type: 'rotation',
        position: { x: x + width + rotationOffset, y: y - rotationOffset },
        cursor: 'grab'
      },
      {
        id: 'rotate-sw',
        type: 'rotation',
        position: { x: x - rotationOffset, y: y + height + rotationOffset },
        cursor: 'grab'
      },
      {
        id: 'rotate-se',
        type: 'rotation',
        position: { x: x + width + rotationOffset, y: y + height + rotationOffset },
        cursor: 'grab'
      }
    ];

    console.log('🎯 Generated handles:', {
      totalHandles: handles.length,
      cornerHandles: handles.filter(h => h.type === 'corner').length,
      rotationHandles: handles.filter(h => h.type === 'rotation').length,
      bounds: this.state.bounds,
      rotationOffset
    });

    return handles;
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
    const store = this.editorStore || useEditorStore.getState();
    
    console.log('🖱️ TransformManager handleMouseDown called', {
      point: context.svgPoint,
      hasValidSelection: this.hasValidSelection(),
      bounds: this.state.bounds,
      handlesCount: this.state.handles.length,
      selection: {
        selectedCommands: store.selection.selectedCommands,
        selectedSubPaths: store.selection.selectedSubPaths
      },
      contextInfo: {
        commandId: context.commandId,
        controlPoint: context.controlPoint
      }
    });

    if (!this.hasValidSelection()) {
      console.log('🖱️ TransformManager: No valid selection, skipping', {
        selectedCommands: store.selection.selectedCommands.length,
        selectedSubPaths: store.selection.selectedSubPaths.length,
        reason: 'Need at least 1 subpath OR 2+ commands'
      });
      return false;
    }

    // Only handle events when there's no specific command/control point interaction
    // This allows MouseInteraction to handle direct point manipulation
    if (context.commandId || context.controlPoint) {
      console.log('🖱️ TransformManager: Command/control point detected, letting MouseInteraction handle it', {
        commandId: context.commandId,
        controlPoint: context.controlPoint
      });
      return false;
    }

    // Check if clicking on a transform handle
    const clickPoint = context.svgPoint;
    
    // Log all available handles for debugging
    console.log('🖱️ TransformManager: Available handles:', this.state.handles.map(h => ({
      id: h.id,
      type: h.type,
      position: h.position,
      distanceFromClick: Math.sqrt(
        Math.pow(h.position.x - clickPoint.x, 2) + 
        Math.pow(h.position.y - clickPoint.y, 2)
      )
    })));
    
    const handle = this.getHandleAtPoint(clickPoint);
    
    if (handle) {
      console.log('🖱️ TransformManager: Handle found and starting transform!', {
        handleId: handle.id,
        handleType: handle.type,
        expectedMode: handle.type === 'corner' ? 'scale' : 'rotate',
        clickPoint
      });
      
      this.startTransform(handle, clickPoint);
      
      // Prevent event propagation to other plugins
      e.stopPropagation();
      e.preventDefault();
      
      return true;
    }

    console.log('🖱️ TransformManager: No handle found at point:', clickPoint);
    return false;
  };

  handleMouseMove = (e: MouseEvent<SVGElement>, context: MouseEventContext): boolean => {
    if (!this.state.isTransforming) {
      return false;
    }

    console.log('🖱️ TransformManager handleMouseMove during transform:', {
      mode: this.state.mode,
      activeHandle: this.state.activeHandle,
      currentPoint: context.svgPoint,
      isTransforming: this.state.isTransforming
    });

    this.updateTransform(context.svgPoint);
    
    // Prevent event propagation during transform
    e.stopPropagation();
    e.preventDefault();
    
    return true;
  };

  handleMouseUp = (e: MouseEvent<SVGElement>, context: MouseEventContext): boolean => {
    if (!this.state.isTransforming) {
      return false;
    }

    console.log('🖱️ TransformManager handleMouseUp ending transform:', {
      mode: this.state.mode,
      activeHandle: this.state.activeHandle,
      finalPoint: context.svgPoint
    });

    this.endTransform();
    
    // Prevent event propagation
    e.stopPropagation();
    e.preventDefault();
    
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
    const tolerance = handleSize * 1.5; // Slightly larger tolerance for easier clicking

    console.log('🎯 getHandleAtPoint: Checking', {
      clickPoint: point,
      tolerance,
      totalHandles: this.state.handles.length
    });

    // Sort handles by distance to prioritize closer ones
    const handlesWithDistance = this.state.handles.map(handle => {
      const dx = point.x - handle.position.x;
      const dy = point.y - handle.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      return { handle, distance };
    }).sort((a, b) => a.distance - b.distance);

    console.log('🎯 getHandleAtPoint: Handle distances:', handlesWithDistance.map(h => ({
      id: h.handle.id,
      type: h.handle.type,
      position: h.handle.position,
      distance: h.distance,
      withinTolerance: h.distance <= tolerance
    })));

    // Find the closest handle within tolerance
    for (const { handle, distance } of handlesWithDistance) {
      if (distance <= tolerance) {
        console.log('🎯 Handle clicked:', {
          handleId: handle.id,
          handleType: handle.type,
          distance,
          tolerance,
          clickPoint: point,
          handlePosition: handle.position
        });
        
        // Return the handle as-is - no conversion between types
        return handle;
      }
    }

    console.log('❌ No handle found within tolerance at point:', {
      point,
      tolerance,
      closestDistance: handlesWithDistance[0]?.distance || 'N/A'
    });

    return null;
  }

  private startTransform(handle: TransformHandle, startPoint: Point) {
    const store = this.editorStore || useEditorStore.getState();
    
    this.state.isTransforming = true;
    this.state.activeHandle = handle.id;
    this.state.mode = handle.type === 'corner' ? 'scale' : 'rotate';
    this.state.dragStart = startPoint;
    this.state.initialBounds = { ...this.state.bounds! };
    
    console.log('🚀 Transform started:', {
      handleId: handle.id,
      handleType: handle.type,
      transformMode: this.state.mode,
      startPoint,
      bounds: this.state.initialBounds
    });
    
    // Store initial command positions
    this.state.initialCommands = {};
    this.storeInitialCommands();

    // Save to history
    store.pushToHistory();
  }

  private updateTransform(currentPoint: Point) {
    if (!this.state.dragStart || !this.state.initialBounds) return;

    console.log('🔄 Updating transform:', {
      mode: this.state.mode,
      activeHandle: this.state.activeHandle,
      currentPoint,
      dragStart: this.state.dragStart
    });

    if (this.state.mode === 'scale') {
      console.log('📏 Applying scale transformation');
      this.applyScale(currentPoint);
    } else if (this.state.mode === 'rotate') {
      console.log('🔄 Applying rotation transformation');
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
    console.log('🏁 Transform ended:', {
      previousMode: this.state.mode,
      previousHandle: this.state.activeHandle,
      wasTransforming: this.state.isTransforming
    });
    
    this.state.isTransforming = false;
    this.state.mode = null;
    this.state.activeHandle = null;
    this.state.dragStart = null;
    this.state.initialBounds = null;
    this.state.initialCommands = {};
    
    console.log('🏁 Transform state cleared');
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

  // Helper methods
  private getUniquePoints(points: Point[], tolerance: number = 0.1): Point[] {
    const unique: Point[] = [];
    
    for (const point of points) {
      const isDuplicate = unique.some(existing => 
        Math.abs(existing.x - point.x) < tolerance && 
        Math.abs(existing.y - point.y) < tolerance
      );
      
      if (!isDuplicate) {
        unique.push(point);
      }
    }
    
    return unique;
  }

  // Helper methods
  private calculateBoundsWithDOM(): TransformBounds | null {
    const store = this.editorStore || useEditorStore.getState();
    const { selection, paths } = store;
    
    console.log('🌐 DOM CALCULATION START: Using browser getBBox() for precise bounds');
    console.log('🌐 DOM METHOD: Selection state', {
      selectedCommands: selection.selectedCommands,
      selectedSubPaths: selection.selectedSubPaths,
      totalPaths: paths.length,
      technique: 'SVG temporary element + getBBox()'
    });

    // Check if we have anything to process
    if (selection.selectedCommands.length <= 1 && selection.selectedSubPaths.length === 0) {
      console.log('🌐 DOM METHOD ABORT: Invalid selection for DOM calculation (need multiple items)', {
        selectedCommandsCount: selection.selectedCommands.length,
        selectedSubPathsCount: selection.selectedSubPaths.length,
        reason: 'Need either multiple commands OR at least one subpath'
      });
      return null;
    }
    
    console.log('🌐 DOM METHOD: Selection validation passed', {
      selectedCommandsCount: selection.selectedCommands.length,
      selectedSubPathsCount: selection.selectedSubPaths.length,
      willProcessCommands: selection.selectedCommands.length > 1,
      willProcessSubPaths: selection.selectedSubPaths.length > 0
    });

    // Create a temporary SVG element for precise bounding box calculation
    const svgNS = 'http://www.w3.org/2000/svg';
    const tempSvg = document.createElementNS(svgNS, 'svg') as SVGSVGElement;
    tempSvg.style.position = 'absolute';
    tempSvg.style.top = '-9999px';
    tempSvg.style.left = '-9999px';
    tempSvg.style.visibility = 'hidden';
    tempSvg.style.pointerEvents = 'none';
    document.body.appendChild(tempSvg);

    console.log('🌐 DOM METHOD: Created temporary SVG element for getBBox() calculation');

    try {
      let pathElementsCreated = 0;

      // Create path elements for selected commands/subpaths
      if (selection.selectedCommands.length > 1) {
        console.log('🔍 DOM Method: Processing multiple selected commands');
        
        // For multiple selected commands, create a path with just those commands
        const selectedCommands = selection.selectedCommands
          .map((commandId: string) => this.findCommandById(commandId, paths))
          .filter((cmd: SVGCommand | null) => cmd !== null);

        console.log('🔍 DOM Method: Found commands', {
          requestedCommands: selection.selectedCommands.length,
          foundCommands: selectedCommands.length
        });

        if (selectedCommands.length > 0) {
          console.log('🌐 DOM METHOD: Processing', selectedCommands.length, 'selected commands');
          
          // Group commands by subpath to maintain proper path structure
          const commandsBySubPath = new Map<string, any[]>();
          
          selectedCommands.forEach((command: SVGCommand | null) => {
            if (command) {
              const subPath = this.findSubPathByCommandId(command.id, paths);
              console.log('🌐 DOM METHOD: Command analysis', {
                commandId: command.id,
                commandData: command,
                subPathFound: !!subPath,
                subPathId: subPath?.id
              });
              
              if (subPath) {
                if (!commandsBySubPath.has(subPath.id)) {
                  commandsBySubPath.set(subPath.id, []);
                }
                commandsBySubPath.get(subPath.id)!.push(command);
              } else {
                console.log('🔴 DOM METHOD: Command without subpath', { command });
              }
            }
          });

          console.log('🔍 DOM Method: Grouped commands by subpath', {
            subPathGroups: commandsBySubPath.size
          });

          // Create a path for each subpath with selected commands
          console.log('🌐 DOM METHOD: Creating path elements from command groups');
          commandsBySubPath.forEach((commands, subPathId) => {
            console.log('🌐 DOM METHOD: Processing command group', {
              subPathId,
              commandCount: commands.length,
              commands: commands.map(cmd => ({ id: cmd.id, ...cmd }))
            });
            
            const pathString = commands
              .map(cmd => {
                const cmdString = this.commandToString(cmd);
                console.log('🌐 DOM METHOD: Command to string', {
                  commandId: cmd.id,
                  command: cmd,
                  generatedString: cmdString
                });
                return cmdString;
              })
              .join(' ');
            
            console.log('🌐 DOM METHOD: Generated path string', {
              subPathId,
              commandCount: commands.length,
              pathString: pathString,
              pathStringLength: pathString.length,
              isValid: pathString.trim().length > 0
            });
            
            if (pathString.trim()) {
              const pathElement = document.createElementNS(svgNS, 'path');
              pathElement.setAttribute('d', pathString);
              tempSvg.appendChild(pathElement);
              pathElementsCreated++;
              console.log('🔍 DOM Method: Created path element for commands');
            }
          });
        }
      }

      // For selected subpaths, add complete subpaths
      if (selection.selectedSubPaths.length > 0) {
        console.log('🔍 DOM Method: Processing selected subpaths');
        
        selection.selectedSubPaths.forEach((subPathId: string) => {
          const subPath = this.findSubPathById(subPathId, paths);
          if (subPath) {
            const pathString = this.subPathToString(subPath);
            
            console.log('🔍 DOM Method: Generated subpath string', {
              subPathId,
              commandCount: subPath.commands?.length || 0,
              pathString: pathString.substring(0, 100) + (pathString.length > 100 ? '...' : '')
            });
            
            if (pathString.trim()) {
              const pathElement = document.createElementNS(svgNS, 'path');
              pathElement.setAttribute('d', pathString);
              tempSvg.appendChild(pathElement);
              pathElementsCreated++;
              console.log('🔍 DOM Method: Created path element for subpath');
            }
          } else {
            console.log('⚠️ DOM Method: SubPath not found', { subPathId });
          }
        });
      }

      console.log('🌐 DOM METHOD: Total path elements created:', pathElementsCreated);
      console.log('🌐 DOM METHOD: Temporary SVG content:', {
        childElementCount: tempSvg.childElementCount,
        innerHTML: tempSvg.innerHTML.substring(0, 500) + (tempSvg.innerHTML.length > 500 ? '...' : ''),
        pathElements: Array.from(tempSvg.children).map(el => {
          const dAttr = el.getAttribute('d');
          return {
            tagName: el.tagName,
            dAttribute: dAttr ? (dAttr.length > 100 ? dAttr.substring(0, 100) + '...' : dAttr) : 'null'
          };
        })
      });

      // If no path elements were created with the complex approach, try a simple approach
      if (pathElementsCreated === 0) {
        console.log('🌐 DOM METHOD: Trying fallback approach - individual path elements');
        
        // Try creating simple path elements for individual commands/subpaths
        if (selection.selectedCommands.length > 1) {
          selection.selectedCommands.forEach((commandId: string) => {
            const command = this.findCommandById(commandId, paths);
            if (command) {
              const cmdString = this.commandToString(command);
              if (cmdString.trim()) {
                // For individual commands, we need to create a minimal valid path
                const pathElement = document.createElementNS(svgNS, 'path');
                pathElement.setAttribute('d', `M 0 0 ${cmdString}`); // Add a move to make it valid
                tempSvg.appendChild(pathElement);
                pathElementsCreated++;
                console.log('🌐 DOM METHOD: Created individual command path', { commandId, cmdString });
              }
            }
          });
        }
        
        if (selection.selectedSubPaths.length > 0) {
          selection.selectedSubPaths.forEach((subPathId: string) => {
            const subPath = this.findSubPathById(subPathId, paths);
            if (subPath) {
              const pathString = this.subPathToString(subPath);
              if (pathString.trim()) {
                const pathElement = document.createElementNS(svgNS, 'path');
                pathElement.setAttribute('d', pathString);
                tempSvg.appendChild(pathElement);
                pathElementsCreated++;
                console.log('🌐 DOM METHOD: Created individual subpath', { subPathId, pathString: pathString.substring(0, 100) });
              }
            }
          });
        }
        
        console.log('🌐 DOM METHOD: Fallback approach created', pathElementsCreated, 'additional path elements');
      }

      if (pathElementsCreated === 0) {
        console.log('🔴 DOM METHOD ABORT: No valid path elements created');
        return null;
      }

      // Get the precise bounding box using DOM
      console.log('🌐 DOM METHOD: Executing getBBox() on temporary SVG with', pathElementsCreated, 'path elements...');
      const bbox = tempSvg.getBBox();
      
      console.log('🌐 DOM METHOD: getBBox() native result', {
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height,
        isFinite: {
          x: isFinite(bbox.x),
          y: isFinite(bbox.y),
          width: isFinite(bbox.width),
          height: isFinite(bbox.height)
        },
        sizeValid: bbox.width >= 1 && bbox.height >= 1,
        technique: 'Browser native SVG getBBox()',
        precision: 'HIGH (includes curve geometry)'
      });
      
      if (bbox && 
          isFinite(bbox.x) && isFinite(bbox.y) && 
          isFinite(bbox.width) && isFinite(bbox.height) &&
          bbox.width >= 1 && bbox.height >= 1) {
        
        const result = {
          x: bbox.x,
          y: bbox.y,
          width: bbox.width,
          height: bbox.height,
          center: {
            x: bbox.x + bbox.width / 2,
            y: bbox.y + bbox.height / 2
          }
        };
        
        console.log('🟢 DOM METHOD SUCCESS: Calculated precise bounds using getBBox()', {
          result,
          method: 'DOM NATIVE',
          advantage: 'Includes exact curve calculations'
        });
        return result;
      } else {
        console.log('🔴 DOM METHOD FAILED: Invalid bbox result from getBBox()');
        return null;
      }

    } catch (error) {
      console.error('🔴 DOM METHOD ERROR: Exception during DOM bounds calculation', error);
      return null;
    } finally {
      // Always clean up the temporary SVG
      document.body.removeChild(tempSvg);
      console.log('🔍 DOM Method: Cleaned up temporary SVG element');
    }
  }

  private findSubPathByCommandId(commandId: string, paths: any[]): any | null {
    for (const path of paths) {
      for (const subPath of path.subPaths) {
        if (subPath.commands.some((cmd: any) => cmd.id === commandId)) {
          return subPath;
        }
      }
    }
    return null;
  }

  private commandToString(command: any): string {
    if (!command) {
      console.log('🔴 commandToString: null/undefined command');
      return '';
    }
    
    // Use 'command' property instead of 'type' based on SVGCommand interface
    const { command: type, x, y, x1, y1, x2, y2 } = command;
    
    console.log('🔍 commandToString: Processing command', {
      id: command.id,
      command: type,
      x, y, x1, y1, x2, y2
    });
    
    switch (type) {
      case 'M':
        if (x !== undefined && y !== undefined) {
          const result = `M ${x} ${y}`;
          console.log('🟢 commandToString: M command success', { result });
          return result;
        }
        console.log('🔴 commandToString: M command missing x/y', { command });
        return '';
      case 'L':
        if (x !== undefined && y !== undefined) {
          const result = `L ${x} ${y}`;
          console.log('🟢 commandToString: L command success', { result });
          return result;
        }
        console.log('🔴 commandToString: L command missing x/y', { command });
        return '';
      case 'C':
        if (x1 !== undefined && y1 !== undefined && x2 !== undefined && y2 !== undefined && x !== undefined && y !== undefined) {
          const result = `C ${x1} ${y1} ${x2} ${y2} ${x} ${y}`;
          console.log('🟢 commandToString: C command success', { result });
          return result;
        }
        console.log('🔴 commandToString: C command missing coordinates', { command });
        return '';
      case 'Q':
        if (x1 !== undefined && y1 !== undefined && x !== undefined && y !== undefined) {
          const result = `Q ${x1} ${y1} ${x} ${y}`;
          console.log('🟢 commandToString: Q command success', { result });
          return result;
        }
        console.log('🔴 commandToString: Q command missing coordinates', { command });
        return '';
      case 'Z':
        console.log('🟢 commandToString: Z command success');
        return 'Z';
      default:
        console.log('🔴 commandToString: Unknown command type', { command: type, fullCommand: command });
        return '';
    }
  }

  private subPathToString(subPath: any): string {
    if (!subPath) {
      console.log('🔴 subPathToString: null/undefined subPath');
      return '';
    }
    
    if (!subPath.commands || subPath.commands.length === 0) {
      console.log('🔴 subPathToString: subPath has no commands', { subPath });
      return '';
    }
    
    console.log('🔍 subPathToString: Processing subPath', {
      id: subPath.id,
      commandCount: subPath.commands.length,
      commands: subPath.commands.map((cmd: any) => ({ id: cmd.id, command: cmd.command }))
    });
    
    const pathString = subPath.commands
      .map((command: any) => {
        const cmdString = this.commandToString(command);
        console.log('🔍 subPathToString: Command processed', {
          commandId: command.id,
          command: command.command,
          generatedString: cmdString
        });
        return cmdString;
      })
      .filter((str: string) => str.trim().length > 0) // Filter out empty commands
      .join(' ')
      .trim();
      
    console.log('🔍 subPathToString: Final result', {
      subPathId: subPath.id,
      pathString,
      pathStringLength: pathString.length
    });
    
    return pathString;
  }

  // ...existing code...
}

export const transformManager = new TransformManager();

// Mouse event handlers for the plugin system
export const transformMouseHandlers: MouseEventHandler = {
  onMouseDown: transformManager.handleMouseDown,
  onMouseMove: transformManager.handleMouseMove,
  onMouseUp: transformManager.handleMouseUp,
};
