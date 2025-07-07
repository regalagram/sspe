import { MouseEvent } from 'react';
import { MouseEventHandler, MouseEventContext } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { SVGCommand, Point, BoundingBox } from '../../types';
import { calculateGlobalViewBox } from '../../utils/viewbox-utils';
import { pathToString, subPathToString } from '../../utils/path-utils';
import { getControlPointSize, getMobileDetectionValues } from '../../hooks/useMobileDetection';

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
  currentPoint: Point | null; // Track current mouse position during transform
  initialBounds: TransformBounds | null;
  initialCommands: { [commandId: string]: SVGCommand };
  onStateChange?: () => void; // Callback for state changes
  isMoving: boolean; // Track if selection is being moved (drag & drop)
}

export class TransformManager {
  private state: TransformState = {
    isTransforming: false,
    mode: null,
    activeHandle: null,
    bounds: null,
    handles: [],
    dragStart: null,
    currentPoint: null,
    initialBounds: null,
    initialCommands: {},
    onStateChange: undefined,
    isMoving: false
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

  // Calculate bounds from selected commands or subpaths using DOM-based calculation
  calculateBounds(): TransformBounds | null {
    const store = this.editorStore || useEditorStore.getState();
    const { selection, paths } = store;
    
    
    // Create a temporary SVG element to calculate bounds using DOM
    const tempSvg = this.createTempSVGForSelection(paths, selection);
    if (!tempSvg) {
      return null;
    }

    // Use the DOM-based viewbox calculation
    const viewBoxResult = calculateGlobalViewBox(tempSvg);
    
    // Clean up
    if (tempSvg.parentNode) {
      tempSvg.parentNode.removeChild(tempSvg);
    }

    if (!viewBoxResult || viewBoxResult.width <= 0 || viewBoxResult.height <= 0) {
      return null;
    }

    // Parse the viewBox to get coordinates
    const viewBoxParts = viewBoxResult.viewBox.split(' ').map(Number);
    const [x, y, width, height] = viewBoxParts;

    // Convert to TransformBounds (remove padding that calculateGlobalViewBox adds)
    const padding = Math.max(2, Math.max(width, height) * 0.05);
    const actualX = x + padding;
    const actualY = y + padding;
    const actualWidth = width - padding * 2;
    const actualHeight = height - padding * 2;

    const transformBounds: TransformBounds = {
      x: actualX,
      y: actualY,
      width: actualWidth,
      height: actualHeight,
      center: {
        x: actualX + actualWidth / 2,
        y: actualY + actualHeight / 2
      }
    };

    return transformBounds;
  }

  // Create a temporary SVG element containing only the selected elements
  private createTempSVGForSelection(paths: any[], selection: any): SVGSVGElement | null {
    if (typeof document === 'undefined') return null;

    const svgNS = 'http://www.w3.org/2000/svg';
    const tempSvg = document.createElementNS(svgNS, 'svg') as SVGSVGElement;
    tempSvg.style.position = 'absolute';
    tempSvg.style.top = '-9999px';
    tempSvg.style.left = '-9999px';
    tempSvg.style.width = '1px';
    tempSvg.style.height = '1px';
    document.body.appendChild(tempSvg);

    let hasContent = false;

    // For selected commands (only if multiple commands for meaningful transformation)
    if (selection.selectedCommands.length > 1) {
      
      // Group commands by subpath to create proper path elements
      const commandsBySubPath = new Map();
      
      for (const commandId of selection.selectedCommands) {
        const command = this.findCommandById(commandId, paths);
        if (command) {
          // Find which subpath this command belongs to
          for (const path of paths) {
            for (const subPath of path.subPaths) {
              if (subPath.commands.some((cmd: any) => cmd.id === commandId)) {
                if (!commandsBySubPath.has(subPath.id)) {
                  commandsBySubPath.set(subPath.id, []);
                }
                commandsBySubPath.get(subPath.id).push(command);
                break;
              }
            }
          }
        }
      }

      // Create path elements for each subpath that has selected commands
      for (const [subPathId, commands] of commandsBySubPath) {
        const pathElement = document.createElementNS(svgNS, 'path');
        
        // Ensure the first command is always a move-to command for valid SVG
        let processedCommands = [...commands];
        if (processedCommands.length > 0 && processedCommands[0].command !== 'M') {
          // If the first command is not a move-to, create one from the first command's position
          const firstCommand = processedCommands[0];
          let x = 0, y = 0;
          
          // Extract position from the first command
          if (firstCommand.command === 'L' || firstCommand.command === 'C') {
            x = firstCommand.x;
            y = firstCommand.y;
          }
          
          // Create a move-to command and prepend it
          const moveCommand = {
            id: firstCommand.id + '_move',
            command: 'M' as const,
            x: x,
            y: y
          };
          processedCommands = [moveCommand, ...processedCommands];
        }
        
        // Create a temporary subpath with the processed commands
        const tempSubPath = { 
          id: subPathId + '_temp', 
          commands: processedCommands,
          closed: false // Default value for temporary subpath
        };
        const pathData = subPathToString(tempSubPath);
        if (pathData) {
          pathElement.setAttribute('d', pathData);
          tempSvg.appendChild(pathElement);
          hasContent = true;
        }
      }
    }
    // For selected subpaths
    else if (selection.selectedSubPaths.length > 0) {
      
      for (const subPathId of selection.selectedSubPaths) {
        const subPath = this.findSubPathById(subPathId, paths);
        if (subPath) {
          const pathElement = document.createElementNS(svgNS, 'path');
          const pathData = subPathToString(subPath);
          if (pathData) {
            pathElement.setAttribute('d', pathData);
            tempSvg.appendChild(pathElement);
            hasContent = true;
          }
        }
      }
    }

    if (!hasContent) {
      document.body.removeChild(tempSvg);
      return null;
    }

    return tempSvg;
  }

  // Generate transform handles based on current bounds
  generateHandles(): TransformHandle[] {
    if (!this.state.bounds) return [];

    const store = this.editorStore || useEditorStore.getState();
    const { viewport, visualDebugSizes } = store;
    const { x, y, width, height } = this.state.bounds;
    
    // Get device detection for responsive handle size
    const { isMobile, isTablet } = getMobileDetectionValues();
    
    // Use responsive handle size with size factors like in TransformHandles.tsx
    const baseHandleSize = getControlPointSize(isMobile, isTablet);
    
    // Calculate sizes for each handle type using factors
    const resizeHandleSize = (baseHandleSize * visualDebugSizes.globalFactor * visualDebugSizes.transformResizeFactor) / viewport.zoom;
    const rotateHandleSize = (baseHandleSize * visualDebugSizes.globalFactor * visualDebugSizes.transformRotateFactor) / viewport.zoom;
    const rotationHandleOffset = 30 / viewport.zoom; // Distance above the bounding box

    const handles: TransformHandle[] = [
      // Corner handles for scaling
      {
        id: 'nw',
        type: 'corner',
        position: { x: x - resizeHandleSize / 2, y: y - resizeHandleSize / 2 },
        cursor: 'nw-resize'
      },
      {
        id: 'ne',
        type: 'corner',
        position: { x: x + width - resizeHandleSize / 2, y: y - resizeHandleSize / 2 },
        cursor: 'ne-resize'
      },
      {
        id: 'sw',
        type: 'corner',
        position: { x: x - resizeHandleSize / 2, y: y + height - resizeHandleSize / 2 },
        cursor: 'sw-resize'
      },
      {
        id: 'se',
        type: 'corner',
        position: { x: x + width - resizeHandleSize / 2, y: y + height - resizeHandleSize / 2 },
        cursor: 'se-resize'
      },
      // Rotation handle - positioned above the center of the top edge
      {
        id: 'rotation',
        type: 'rotation',
        position: { 
          x: x + width / 2 - rotateHandleSize / 2, 
          y: y - rotationHandleOffset - rotateHandleSize / 2 
        },
        cursor: 'crosshair'
      }
    ];

    return handles;
  }

  // Update transform state
  updateTransformState() {
    
    // Ensure we have the latest store state
    if (!this.editorStore) {
      console.warn('TransformManager: No editor store available');
      return;
    }
    
    this.state.bounds = this.calculateBounds();
    this.state.handles = this.generateHandles();
    
    

    // Call the state change callback if defined
    if (this.state.onStateChange) {
      this.state.onStateChange();
    }
  }

  // Set callback for state changes (useful for React components)
  setStateChangeCallback(callback: () => void) {
    this.state.onStateChange = callback;
  }

  // Clear the state change callback
  clearStateChangeCallback() {
    this.state.onStateChange = undefined;
  }

  // Trigger state change callback if set
  private triggerStateChange() {
    if (this.state.onStateChange) {
      this.state.onStateChange();
    }
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
    

    
    return hasValidSelection;
  }

  // Check if a point is within the current bounds
  private isPointInBounds(point: Point): boolean {
    if (!this.state.bounds) return false;
    
    const { x, y, width, height } = this.state.bounds;
    return point.x >= x && 
           point.x <= x + width && 
           point.y >= y && 
           point.y <= y + height;
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

  // Get current mirror state (useful for visual feedback)
  getMirrorStatus(): { mirrorX: boolean; mirrorY: boolean } {
    return this.getMirrorState(this.state.currentPoint || undefined);
  }

  // Check if any mirroring is currently active
  isMirroring(): boolean {
    const { mirrorX, mirrorY } = this.getMirrorState(this.state.currentPoint || undefined);
    return mirrorX || mirrorY;
  }

  // Mouse event handlers
  handleMouseDown = (e: MouseEvent<SVGElement>, context: MouseEventContext): boolean => {
    if (!this.hasValidSelection()) {
      return false;
    }

    // Check if clicking on a transform handle
    const clickPoint = context.svgPoint;
    const handle = this.getHandleAtPoint(clickPoint, e.target as Element);
    
    if (handle) {
      this.startTransform(handle, clickPoint);
      return true;
    }

    // Check if clicking within the bounds (for potential move operation)
    if (this.isPointInBounds(clickPoint)) {
      // Don't handle the event here, but prepare for potential movement
      // The actual movement will be handled by other plugins (like mouse-interaction)
      // We just need to be ready to hide handles when movement starts
      return false; // Let other plugins handle the movement
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

  // Check if handles should be visible (hidden during movement, but keep visible during transform with opacity)
  shouldShowHandles(): boolean {
    return !this.state.isMoving;
  }

  // Methods to control movement state (called by other plugins like mouse-interaction)
  setMoving(isMoving: boolean) {
    if (this.state.isMoving !== isMoving) {
   
      this.state.isMoving = isMoving;
      this.triggerStateChange();
    }
  }

  // Check if currently moving selection
  isMoving(): boolean {
    return this.state.isMoving;
  }

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

  private getHandleAtPoint(point: Point, targetElement?: Element): TransformHandle | null {
    const store = this.editorStore || useEditorStore.getState();
    const { viewport, visualDebugSizes } = store;
    
    // First, try to get handle from target element data attributes (more reliable)
    if (targetElement) {
      const handleId = targetElement.getAttribute('data-handle-id');
      const handleType = targetElement.getAttribute('data-handle-type');
      
      if (handleId && (handleType === 'transform' || handleType === 'rotation')) {
        const handle = this.state.handles.find(h => h.id === handleId);
        if (handle) {
          return handle;
        }
      }
    }
    
    // Fallback to position-based detection
    // Get device detection (need to instantiate since this is not in a React component)
    const { isMobile, isTablet } = getMobileDetectionValues();
    
    // Use responsive handle size like in TransformHandles.tsx
    const baseHandleSize = getControlPointSize(isMobile, isTablet);
    
    const baseTolerance = 12;

    for (const handle of this.state.handles) {
      // Calcular tamaño específico para cada tipo de handle
      const sizeFactor = handle.type === 'corner' 
        ? visualDebugSizes.transformResizeFactor 
        : visualDebugSizes.transformRotateFactor;
      
      const handleSize = (baseHandleSize * visualDebugSizes.globalFactor * sizeFactor) / viewport.zoom;
      const tolerance = (baseTolerance * visualDebugSizes.globalFactor * sizeFactor) / viewport.zoom;
      
      // Calculate the center of the handle using the same logic as the render
      const handleCenterX = handle.position.x + handleSize / 2;
      const handleCenterY = handle.position.y + handleSize / 2;
      
      const dx = point.x - handleCenterX;
      const dy = point.y - handleCenterY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= tolerance) {
        return handle;
      }
    }

    return null;
  }

  private startTransform(handle: TransformHandle, startPoint: Point) {
    const store = this.editorStore || useEditorStore.getState();
    
    this.state.isTransforming = true;
    this.state.activeHandle = handle.id;
    this.state.mode = handle.type === 'rotation' ? 'rotate' : 'scale';
    this.state.dragStart = startPoint;
    this.state.initialBounds = { ...this.state.bounds! };
    
    // Store initial command positions
    this.state.initialCommands = {};
    this.storeInitialCommands();

    // Save to history
    store.pushToHistory();
    
   

    // Trigger state change to hide handles
    this.triggerStateChange();
  }

  private updateTransform(currentPoint: Point) {
    if (!this.state.dragStart || !this.state.initialBounds) return;

    // Store current point for mirror state calculation
    this.state.currentPoint = currentPoint;

    if (this.state.mode === 'scale') {
      this.applyScale(currentPoint);
    } else if (this.state.mode === 'rotate') {
      this.applyRotation(currentPoint);
    }

    // Update bounds after transformation and normalize if mirroring occurred (only for scale)
    this.updateTransformState();
    
    // Normalize bounds to handle negative scaling (mirroring) - only for scale mode
    if (this.state.mode === 'scale' && this.state.bounds) {
      this.state.bounds = this.normalizeBounds(this.state.bounds);
      // Regenerate handles with normalized bounds
      this.state.handles = this.generateHandles();
    }
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

    // Allow negative scaling for mirror effect (remove minimum scale restriction)
    // Only apply minimum scale to prevent collapse to zero, but allow mirroring
    const minScale = 0.01; // Very small but not zero to prevent division issues
    if (Math.abs(scaleX) < minScale) {
      scaleX = scaleX < 0 ? -minScale : minScale;
    }
    if (Math.abs(scaleY) < minScale) {
      scaleY = scaleY < 0 ? -minScale : minScale;
    }

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

    // Log mirroring state for debugging
    const mirrorState = this.getMirrorState(currentPoint);
    const isMirroredX = mirrorState.mirrorX;
    const isMirroredY = mirrorState.mirrorY;


    // Apply scaling to all selected commands
    this.applyTransformToCommands((x: number, y: number) => {
      const newX = originX + (x - originX) * scaleX;
      const newY = originY + (y - originY) * scaleY;
      return { x: newX, y: newY };
    });
  }

  private applyRotation(currentPoint: Point) {
    if (!this.state.dragStart || !this.state.initialBounds || !this.state.activeHandle) return;

    const store = this.editorStore || useEditorStore.getState();
    const { updateCommand } = store;

    // Calculate rotation angle based on mouse movement
    const center = this.state.initialBounds.center;
    
    // Vector from center to initial point
    const initialVector = {
      x: this.state.dragStart.x - center.x,
      y: this.state.dragStart.y - center.y
    };
    
    // Vector from center to current point
    const currentVector = {
      x: currentPoint.x - center.x,
      y: currentPoint.y - center.y
    };
    
    // Calculate angle between vectors
    const initialAngle = Math.atan2(initialVector.y, initialVector.x);
    const currentAngle = Math.atan2(currentVector.y, currentVector.x);
    const rotationAngle = currentAngle - initialAngle;

    

    // Apply rotation to all selected commands
    this.applyTransformToCommands((x: number, y: number) => {
      // Translate to origin (center)
      const dx = x - center.x;
      const dy = y - center.y;
      
      // Apply rotation
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
    this.state.currentPoint = null;
    this.state.initialBounds = null;
    this.state.initialCommands = {};

    // Trigger state change to show handles again
    this.triggerStateChange();
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

  // Helper method to check if mirroring is active
  private getMirrorState(currentPoint?: Point): { mirrorX: boolean; mirrorY: boolean } {
    if (!this.state.dragStart || !this.state.initialBounds || !this.state.activeHandle) {
      return { mirrorX: false, mirrorY: false };
    }

    // Use provided point or fall back to drag start (for when not actively transforming)
    const point = currentPoint || this.state.dragStart;
    const deltaX = point.x - this.state.dragStart.x;
    const deltaY = point.y - this.state.dragStart.y;

    const { width: initialWidth, height: initialHeight } = this.state.initialBounds;

    let scaleX = 1;
    let scaleY = 1;

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

    return {
      mirrorX: scaleX < 0,
      mirrorY: scaleY < 0
    };
  }

  // Helper method to normalize bounds that may have negative width/height due to mirroring
  private normalizeBounds(bounds: TransformBounds): TransformBounds {
    let { x, y, width, height } = bounds;

    // If width is negative, we need to flip the x coordinate
    if (width < 0) {
      x = x + width;
      width = Math.abs(width);
    }

    // If height is negative, we need to flip the y coordinate
    if (height < 0) {
      y = y + height;
      height = Math.abs(height);
    }

    return {
      x,
      y,
      width,
      height,
      center: {
        x: x + width / 2,
        y: y + height / 2
      }
    };
  }
}

export const transformManager = new TransformManager();

// Mouse event handlers for the plugin system
export const transformMouseHandlers: MouseEventHandler = {
  onMouseDown: transformManager.handleMouseDown,
  onMouseMove: transformManager.handleMouseMove,
  onMouseUp: transformManager.handleMouseUp,
};
