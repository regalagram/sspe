import { PointerEvent } from 'react';
import { PointerEventHandler, PointerEventContext } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { SVGCommand, Point } from '../../types';
import { calculateGlobalViewBox } from '../../utils/viewbox-utils';
import { subPathToString } from '../../utils/path-utils';
import { getControlPointSize, getMobileDetectionValues } from '../../hooks/useMobileDetection';
import { calculateTextBoundsDOM } from '../../utils/text-utils';

export interface TransformBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  center: Point;
}

export interface TransformHandle {
  id: string;
  type: 'corner' | 'edge' | 'rotation';
  position: Point;
  cursor: string;
}

// Transformation matrix interface for robust matrix operations
interface TransformMatrix {
  a: number; b: number; c: number; d: number; e: number; f: number;
}

interface TransformOperation {
  type: 'scale' | 'rotate';
  scaleX?: number;
  scaleY?: number;
  originX?: number;
  originY?: number;
  angle?: number;
  centerX?: number;
  centerY?: number;
}

interface FinalValues {
  x: number;
  y: number;
  scale: number;
  rotation: number; // in degrees
}

export type TransformMode = 'scale' | 'rotate' | null;

interface TransformState {
  isTransforming: boolean;
  mode: TransformMode;
  activeHandle: string | null;
  bounds: TransformBounds | null;
  handles: TransformHandle[];
  dragStart: Point | null;
  currentPoint: Point | null; // Track current pointer position during transform
  initialBounds: TransformBounds | null;
  initialCommands: { [commandId: string]: SVGCommand };
  initialTexts: { [textId: string]: any }; // Store initial text positions and properties
  initialTextPaths: { [textPathId: string]: any }; // Store initial textPath positions and properties
  initialImages: { [imageId: string]: any }; // Store initial image positions and properties
  initialUses: { [useId: string]: any }; // Store initial use element positions and properties
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
    initialTexts: {},
    initialTextPaths: {},
    initialImages: {},
    initialUses: {},
    onStateChange: undefined,
    isMoving: false
  };

  private editorStore: any = null;

  setEditorStore(store: any) {
    this.editorStore = store;
  }

  cleanup() {
    // No cleanup needed anymore since we removed keyboard listeners
  }

  // Calculate bounds from selected commands or subpaths using DOM-based calculation
  calculateBounds(): TransformBounds | null {
    const store = this.editorStore || useEditorStore.getState();
    const { selection, paths, texts, textPaths, images, uses } = store;
    
    // Create a temporary SVG element to calculate bounds using DOM
    const tempSvg = this.createTempSVGForSelection(paths, selection, texts, textPaths, images, uses);
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
  private createTempSVGForSelection(paths: any[], selection: any, texts?: any[], textPaths?: any[], images?: any[], uses?: any[]): SVGSVGElement | null {
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
    
    // For selected subpaths (changed from else if to if)
    if (selection.selectedSubPaths.length > 0) {
      
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

    // For selected text elements - use calculateTextBoundsDOM to get exact bounds
    if (selection.selectedTexts?.length > 0 && texts) {
      for (const textId of selection.selectedTexts) {
        const text = texts.find((t: any) => t.id === textId);
        if (text) {
          // Use the same method as the yellow selection rectangle
          const bounds = calculateTextBoundsDOM(text);
          if (bounds) {
            // Create a rectangle path that represents the text bounds
            const pathElement = document.createElementNS(svgNS, 'path');
            const pathData = `M ${bounds.x},${bounds.y} L ${bounds.x + bounds.width},${bounds.y} L ${bounds.x + bounds.width},${bounds.y + bounds.height} L ${bounds.x},${bounds.y + bounds.height} Z`;
            pathElement.setAttribute('d', pathData);
            pathElement.setAttribute('fill', 'none');
            pathElement.setAttribute('stroke', 'none');
            tempSvg.appendChild(pathElement);
            hasContent = true;
          }
        }
      }
    }

    // For selected textPaths
    if (selection.selectedTextPaths?.length > 0 && textPaths) {
      for (const textPathId of selection.selectedTextPaths) {
        const textPath = textPaths.find((tp: any) => tp.id === textPathId);
        if (textPath) {
          // Find the path that this textPath references
          const referencedPath = paths.find((path: any) => path.id === textPath.pathRef);
          if (referencedPath) {
            // Create a path element for the textPath to follow
            const pathElement = document.createElementNS(svgNS, 'path');
            pathElement.setAttribute('id', `temp-path-${textPath.pathRef}`);
            
            // Build path data from subPaths
            let pathData = '';
            for (const subPath of referencedPath.subPaths) {
              pathData += subPathToString(subPath);
            }
            pathElement.setAttribute('d', pathData);
            
            // Create textPath element
            const textElement = document.createElementNS(svgNS, 'text');
            const textPathElement = document.createElementNS(svgNS, 'textPath');
            
            textPathElement.setAttribute('href', `#temp-path-${textPath.pathRef}`);
            textPathElement.textContent = textPath.content;
            
            if (textPath.startOffset !== undefined) {
              textPathElement.setAttribute('startOffset', textPath.startOffset.toString());
            }
            if (textPath.method) {
              textPathElement.setAttribute('method', textPath.method);
            }
            if (textPath.spacing) {
              textPathElement.setAttribute('spacing', textPath.spacing);
            }
            if (textPath.side) {
              textPathElement.setAttribute('side', textPath.side);
            }
            
            // Apply text styles
            if (textPath.style?.fontSize) {
              textElement.setAttribute('font-size', textPath.style.fontSize.toString());
            }
            if (textPath.style?.fontFamily) {
              textElement.setAttribute('font-family', textPath.style.fontFamily);
            }
            
            // Apply transform if present
            if (textPath.transform) {
              textElement.setAttribute('transform', textPath.transform);
            }
            
            textElement.appendChild(textPathElement);
            tempSvg.appendChild(pathElement);
            tempSvg.appendChild(textElement);
            hasContent = true;
          }
        }
      }
    }

    // For selected images
    if (selection.selectedImages?.length > 0 && images) {
      for (const imageId of selection.selectedImages) {
        const image = images.find((img: any) => img.id === imageId);
        if (image) {
          const imageElement = document.createElementNS(svgNS, 'image');
          imageElement.setAttribute('x', image.x.toString());
          imageElement.setAttribute('y', image.y.toString());
          imageElement.setAttribute('width', image.width.toString());
          imageElement.setAttribute('height', image.height.toString());
          imageElement.setAttribute('href', image.href);
          
          if (image.opacity !== undefined) {
            imageElement.setAttribute('opacity', image.opacity.toString());
          }
          
          // Apply transform if the image has one
          if (image.transform) {
            imageElement.setAttribute('transform', image.transform);
          }
          
          tempSvg.appendChild(imageElement);
          hasContent = true;
        }
      }
    }

    // For selected use elements
    if (selection.selectedUses?.length > 0 && uses) {
      for (const useId of selection.selectedUses) {
        const use = uses.find((u: any) => u.id === useId);
        if (use) {
          const useElement = document.createElementNS(svgNS, 'use');
          useElement.setAttribute('href', use.href);
          if (use.x !== undefined) useElement.setAttribute('x', use.x.toString());
          if (use.y !== undefined) useElement.setAttribute('y', use.y.toString());
          if (use.width !== undefined) useElement.setAttribute('width', use.width.toString());
          if (use.height !== undefined) useElement.setAttribute('height', use.height.toString());
          
          tempSvg.appendChild(useElement);
          hasContent = true;
        }
      }
    }

    // For selected groups - add all children of selected groups to the bounds calculation
    if (selection.selectedGroups?.length > 0) {
      const store = this.editorStore || useEditorStore.getState();
      const { groups } = store;
      
      for (const groupId of selection.selectedGroups) {
        const group = groups.find((g: any) => g.id === groupId);
        if (group && group.children) {
          // Add all children of the group to the temp SVG
          for (const child of group.children) {
            switch (child.type) {
              case 'path': {
                const path = paths.find((p: any) => p.id === child.id);
                if (path) {
                  // Add all subpaths from this path
                  for (const subPath of path.subPaths) {
                    const pathElement = document.createElementNS(svgNS, 'path');
                    const pathData = subPathToString(subPath);
                    if (pathData) {
                      pathElement.setAttribute('d', pathData);
                      tempSvg.appendChild(pathElement);
                      hasContent = true;
                    }
                  }
                }
                break;
              }
              case 'text': {
                const text = texts?.find((t: any) => t.id === child.id);
                if (text) {
                  // Use the same method as the yellow selection rectangle for groups too
                  const bounds = calculateTextBoundsDOM(text);
                  if (bounds) {
                    // Create a rectangle path that represents the text bounds
                    const pathElement = document.createElementNS(svgNS, 'path');
                    const pathData = `M ${bounds.x},${bounds.y} L ${bounds.x + bounds.width},${bounds.y} L ${bounds.x + bounds.width},${bounds.y + bounds.height} L ${bounds.x},${bounds.y + bounds.height} Z`;
                    pathElement.setAttribute('d', pathData);
                    pathElement.setAttribute('fill', 'none');
                    pathElement.setAttribute('stroke', 'none');
                    tempSvg.appendChild(pathElement);
                    hasContent = true;
                  }
                }
                break;
              }
              case 'image': {
                const image = images?.find((img: any) => img.id === child.id);
                if (image) {
                  const imageElement = document.createElementNS(svgNS, 'image');
                  imageElement.setAttribute('x', image.x.toString());
                  imageElement.setAttribute('y', image.y.toString());
                  imageElement.setAttribute('width', image.width.toString());
                  imageElement.setAttribute('height', image.height.toString());
                  imageElement.setAttribute('href', image.href);
                  
                  if (image.opacity !== undefined) {
                    imageElement.setAttribute('opacity', image.opacity.toString());
                  }
                  
                  tempSvg.appendChild(imageElement);
                  hasContent = true;
                }
                break;
              }
              case 'use': {
                const use = uses?.find((u: any) => u.id === child.id);
                if (use) {
                  const useElement = document.createElementNS(svgNS, 'use');
                  useElement.setAttribute('href', use.href);
                  if (use.x !== undefined) useElement.setAttribute('x', use.x.toString());
                  if (use.y !== undefined) useElement.setAttribute('y', use.y.toString());
                  if (use.width !== undefined) useElement.setAttribute('width', use.width.toString());
                  if (use.height !== undefined) useElement.setAttribute('height', use.height.toString());
                  
                  tempSvg.appendChild(useElement);
                  hasContent = true;
                }
                break;
              }
              // Note: Nested groups could be handled here recursively if needed
            }
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
      // Corner handles for proportional scaling
      {
        id: 'nw',
        type: 'corner',
        position: { x: x , y: y  },
        cursor: 'nw-resize'
      },
      {
        id: 'ne',
        type: 'corner',
        position: { x: x + width , y: y  },
        cursor: 'ne-resize'
      },
      {
        id: 'sw',
        type: 'corner',
        position: { x: x , y: y + height  },
        cursor: 'sw-resize'
      },
      {
        id: 'se',
        type: 'corner',
        position: { x: x + width, y: y + height },
        cursor: 'se-resize'
      },
      // Edge handles for non-proportional scaling
      {
        id: 'n',
        type: 'edge',
        position: { x: x + width / 2, y: y },
        cursor: 'n-resize'
      },
      {
        id: 's',
        type: 'edge',
        position: { x: x + width / 2, y: y + height },
        cursor: 's-resize'
      },
      {
        id: 'e',
        type: 'edge',
        position: { x: x + width, y: y + height / 2 },
        cursor: 'e-resize'
      },
      {
        id: 'w',
        type: 'edge',
        position: { x: x, y: y + height / 2 },
        cursor: 'w-resize'
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
    
    // Need at least one element to show transform controls
    // Single point selection doesn't make sense for transformation
    const hasValidSelection = (
      selection.selectedSubPaths.length > 0 || 
      selection.selectedCommands.length > 1 ||
      selection.selectedTexts?.length > 0 ||
      selection.selectedTextPaths?.length > 0 ||
      selection.selectedImages?.length > 0 ||
      selection.selectedUses?.length > 0 ||
      // Mixed selections are also valid
      (selection.selectedSubPaths.length > 0 && selection.selectedTexts?.length > 0) ||
      (selection.selectedCommands.length > 0 && selection.selectedTexts?.length > 0) ||
      (selection.selectedImages?.length > 0 && selection.selectedTexts?.length > 0) ||
      (selection.selectedUses?.length > 0 && selection.selectedTexts?.length > 0) ||
      (selection.selectedTextPaths?.length > 0 && selection.selectedTexts?.length > 0) ||
      (selection.selectedTextPaths?.length > 0 && selection.selectedSubPaths.length > 0) ||
      (selection.selectedTextPaths?.length > 0 && selection.selectedCommands.length > 0) ||
      (selection.selectedImages?.length > 0 && selection.selectedSubPaths.length > 0) ||
      (selection.selectedUses?.length > 0 && selection.selectedSubPaths.length > 0)
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

  // Get current mirror state (useful for visual feedback)
  getMirrorStatus(): { mirrorX: boolean; mirrorY: boolean } {
    return this.getMirrorState(this.state.currentPoint || undefined);
  }

  // Check if any mirroring is currently active
  isMirroring(): boolean {
    const { mirrorX, mirrorY } = this.getMirrorState(this.state.currentPoint || undefined);
    return mirrorX || mirrorY;
  }

  // pointer event handlers
  handlePointerDown = (e: PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
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
      // The actual movement will be handled by other plugins (like pointer-interaction)
      // We just need to be ready to hide handles when movement starts
      return false; // Let other plugins handle the movement
    }

    return false;
  };

  handlePointerMove = (e: PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
    if (!this.state.isTransforming) return false;

    this.updateTransform(context.svgPoint);
    return true;
  };

  handlePointerUp = (e: PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
    if (!this.state.isTransforming) return false;

    this.endTransform();
    return true;
  };

  // Check if handles should be visible (hidden during movement, but keep visible during transform with opacity)
  shouldShowHandles(): boolean {
    return !this.state.isMoving;
  }

  // Methods to control movement state (called by other plugins like pointer-interaction)
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
      // Corner handles - always proportional scaling
      case 'nw':
        scaleX = (initialWidth - deltaX) / initialWidth;
        scaleY = (initialHeight - deltaY) / initialHeight;
        // Force proportional scaling for corners
        const scaleNW = Math.min(Math.abs(scaleX), Math.abs(scaleY));
        scaleX = scaleX < 0 ? -scaleNW : scaleNW;
        scaleY = scaleY < 0 ? -scaleNW : scaleNW;
        break;
      case 'ne':
        scaleX = (initialWidth + deltaX) / initialWidth;
        scaleY = (initialHeight - deltaY) / initialHeight;
        // Force proportional scaling for corners
        const scaleNE = Math.min(Math.abs(scaleX), Math.abs(scaleY));
        scaleX = scaleX < 0 ? -scaleNE : scaleNE;
        scaleY = scaleY < 0 ? -scaleNE : scaleNE;
        break;
      case 'sw':
        scaleX = (initialWidth - deltaX) / initialWidth;
        scaleY = (initialHeight + deltaY) / initialHeight;
        // Force proportional scaling for corners
        const scaleSW = Math.min(Math.abs(scaleX), Math.abs(scaleY));
        scaleX = scaleX < 0 ? -scaleSW : scaleSW;
        scaleY = scaleY < 0 ? -scaleSW : scaleSW;
        break;
      case 'se':
        scaleX = (initialWidth + deltaX) / initialWidth;
        scaleY = (initialHeight + deltaY) / initialHeight;
        // Force proportional scaling for corners
        const scaleSE = Math.min(Math.abs(scaleX), Math.abs(scaleY));
        scaleX = scaleX < 0 ? -scaleSE : scaleSE;
        scaleY = scaleY < 0 ? -scaleSE : scaleSE;
        break;
      
      // Edge handles - non-proportional scaling (only one dimension)
      case 'n': // Top edge - only height
        scaleX = 1; // No horizontal scaling
        scaleY = (initialHeight - deltaY) / initialHeight;
        break;
      case 's': // Bottom edge - only height
        scaleX = 1; // No horizontal scaling
        scaleY = (initialHeight + deltaY) / initialHeight;
        break;
      case 'e': // Right edge - only width
        scaleX = (initialWidth + deltaX) / initialWidth;
        scaleY = 1; // No vertical scaling
        break;
      case 'w': // Left edge - only width
        scaleX = (initialWidth - deltaX) / initialWidth;
        scaleY = 1; // No vertical scaling
        break;
    }

    // Edge handles always scale in one dimension only
    // Corner handles always scale proportionally
    
    // Allow negative scaling for mirror effect (remove minimum scale restriction)
    // Only apply minimum scale to prevent collapse to zero, but allow mirroring
    const minScale = 0.01; // Very small but not zero to prevent division issues
    if (Math.abs(scaleX) < minScale) {
      scaleX = scaleX < 0 ? -minScale : minScale;
    }
    if (Math.abs(scaleY) < minScale) {
      scaleY = scaleY < 0 ? -minScale : minScale;
    }

    // Calculate transform origin based on the active handle
    let originX = initialX;
    let originY = initialY;

    switch (this.state.activeHandle) {
      // Corner handles
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
      
      // Edge handles
      case 'n': // Top edge - origin at bottom center
        originX = initialX + initialWidth / 2;
        originY = initialY + initialHeight;
        break;
      case 's': // Bottom edge - origin at top center
        originX = initialX + initialWidth / 2;
        originY = initialY;
        break;
      case 'e': // Right edge - origin at left center
        originX = initialX;
        originY = initialY + initialHeight / 2;
        break;
      case 'w': // Left edge - origin at right center
        originX = initialX + initialWidth;
        originY = initialY + initialHeight / 2;
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

    // Calculate rotation angle based on pointer movement
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
    const { updateCommand, updateText, updateTextPathStyle, updateImage, updateUse } = store;

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

    // Transform selected texts using a robust matrix-based system
    for (const textId of Object.keys(this.state.initialTexts)) {
      const initialText = this.state.initialTexts[textId];
      
      // Build transformation matrix step by step for predictable results
      let transformString = '';
      
      if (this.state.mode === 'scale') {
        // Get scale factors and origin
        const { scaleX, scaleY, originX, originY } = this.getScaleParams();
        
        // Create current transformation matrix
        const currentMatrix = this.buildTransformMatrix(
          initialText.x,
          initialText.y, 
          1, // base scale X
          1, // base scale Y
          0, // base rotation
          initialText.transform || ''
        );
        
        // Apply new scale transformation
        const newMatrix = this.combineTransformations(
          currentMatrix,
          { 
            type: 'scale', 
            scaleX, 
            scaleY, 
            originX, 
            originY 
          }
        );
        
        transformString = this.matrixToString(newMatrix);
        
      } else if (this.state.mode === 'rotate') {
        // Get rotation angle and center
        const { angle, centerX, centerY } = this.getRotationParams();
        
        // Create current transformation matrix
        const currentMatrix = this.buildTransformMatrix(
          initialText.x,
          initialText.y,
          1, // base scale X  
          1, // base scale Y
          0, // base rotation
          initialText.transform || ''
        );
        
        // Apply new rotation transformation
        const newMatrix = this.combineTransformations(
          currentMatrix,
          { 
            type: 'rotate', 
            angle, 
            centerX, 
            centerY 
          }
        );
        
        transformString = this.matrixToString(newMatrix);
      }
      
      // Apply the transform
      const { updateTextTransform } = store;
      updateTextTransform(textId, transformString);
    }

    // Transform selected textPaths - only scale fontSize, no position/rotation changes
    for (const textPathId of Object.keys(this.state.initialTextPaths)) {
      if (this.state.mode === 'scale') {
        // Calculate scale based on initial fontSize, not current
        const initialTextPath = this.state.initialTextPaths[textPathId];
        if (initialTextPath.style?.fontSize) {
          const { scaleX, scaleY } = this.getScaleParams();
          const avgScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;
          const newFontSize = Math.max(1, initialTextPath.style.fontSize * avgScale);
          
          // Apply the calculated fontSize directly, not as a scale factor
          updateTextPathStyle(textPathId, { fontSize: newFontSize });
        }
      }
      // No rotation or translation transforms for textPath - they follow the path
    }

    // Transform selected images using a robust matrix-based system
    for (const imageId of Object.keys(this.state.initialImages)) {
      const initialImage = this.state.initialImages[imageId];
      
      // Build transformation matrix step by step for predictable results
      let transformString = '';
      
      if (this.state.mode === 'scale') {
        // Get scale factors and origin
        const { scaleX, scaleY, originX, originY } = this.getScaleParams();
        
        // Create current transformation matrix
        const currentMatrix = this.buildTransformMatrix(
          initialImage.x + initialImage.width / 2,  // use image center
          initialImage.y + initialImage.height / 2,
          1, // base scale X
          1, // base scale Y
          0, // base rotation
          initialImage.transform || ''
        );
        
        // Apply new scale transformation
        const newMatrix = this.combineTransformations(
          currentMatrix,
          { 
            type: 'scale', 
            scaleX, 
            scaleY, 
            originX, 
            originY 
          }
        );
        
        transformString = this.matrixToString(newMatrix);
        
      } else if (this.state.mode === 'rotate') {
        // Get rotation angle and center
        const { angle, centerX, centerY } = this.getRotationParams();
        
        // Create current transformation matrix
        const currentMatrix = this.buildTransformMatrix(
          initialImage.x + initialImage.width / 2,  // use image center
          initialImage.y + initialImage.height / 2,
          1, // base scale X
          1, // base scale Y
          0, // base rotation
          initialImage.transform || ''
        );
        
        // Apply new rotation transformation
        const newMatrix = this.combineTransformations(
          currentMatrix,
          { 
            type: 'rotate', 
            angle, 
            centerX, 
            centerY 
          }
        );
        
        transformString = this.matrixToString(newMatrix);
      }
      
      // Apply the transform using updateImage
      const { updateImage } = store;
      updateImage(imageId, { transform: transformString });
    }

    // Transform selected use elements
    for (const useId of Object.keys(this.state.initialUses)) {
      const initialUse = this.state.initialUses[useId];
      
      if (this.state.mode === 'scale') {
        // For scaling, transform all corners if use has dimensions
        const width = initialUse.width || 100;
        const height = initialUse.height || 100;
        const x = initialUse.x || 0;
        const y = initialUse.y || 0;
        
        const topLeft = transform(x, y);
        const bottomRight = transform(x + width, y + height);
        
        const newX = Math.min(topLeft.x, bottomRight.x);
        const newY = Math.min(topLeft.y, bottomRight.y);
        const newWidth = Math.abs(bottomRight.x - topLeft.x);
        const newHeight = Math.abs(bottomRight.y - topLeft.y);
        
        updateUse(useId, {
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight
        });
      } else if (this.state.mode === 'rotate') {
        // For rotation, transform the position
        const x = initialUse.x || 0;
        const y = initialUse.y || 0;
        const transformedPos = transform(x, y);
        
        updateUse(useId, {
          x: transformedPos.x,
          y: transformedPos.y
        });
      }
    }
  }

  private endTransform() {
    const store = this.editorStore || useEditorStore.getState();
    
    // Apply final transformations by consolidating the matrix into permanent properties
    // This prevents accumulation of complex transforms and ensures clean state for future transforms
    
    // Apply final transformations permanently to text elements
    for (const textId of Object.keys(this.state.initialTexts)) {
      const initialText = this.state.initialTexts[textId];
      
      // Get the current text element with the applied transform
      const currentText = store.texts?.find((t: any) => t.id === textId);
      if (currentText && currentText.transform) {
        // Extract the final consolidated values from the transform matrix
        const finalValues = this.extractFinalValues(
          currentText.transform,
          initialText.x,
          initialText.y,
          1, // initial scale
          0  // initial rotation
        );
        
        // Apply the consolidated values as permanent properties
        const { updateTextPosition, updateTextTransform } = store;
        updateTextPosition(textId, finalValues.x, finalValues.y);
        
        // Only keep rotation as transform, everything else becomes permanent properties
        if (Math.abs(finalValues.rotation) > 0.01) {
          const rotationTransform = `rotate(${finalValues.rotation}, ${finalValues.x}, ${finalValues.y})`;
          updateTextTransform(textId, rotationTransform);
        } else {
          updateTextTransform(textId, ''); // Clear transform if no significant rotation
        }
        
        // Apply scaling to font size for better text rendering
        if (this.state.mode === 'scale' && initialText.style?.fontSize && Math.abs(finalValues.scale - 1) > 0.01) {
          const newFontSize = initialText.style.fontSize * finalValues.scale;
          store.updateTextStyle(textId, { fontSize: Math.max(1, newFontSize) });
        }
      }
    }

    // Apply final transformations permanently to images
    for (const imageId of Object.keys(this.state.initialImages)) {
      const initialImage = this.state.initialImages[imageId];
      
      // Get the current image element with the applied transform
      const currentImage = store.images?.find((img: any) => img.id === imageId);
      if (currentImage && currentImage.transform) {
        // Extract the final consolidated values from the transform matrix
        const finalValues = this.extractFinalValues(
          currentImage.transform,
          initialImage.x + initialImage.width / 2,  // image center
          initialImage.y + initialImage.height / 2,
          1, // initial scale
          0  // initial rotation
        );
        
        // Calculate new image properties based on the transformation
        const newWidth = initialImage.width * finalValues.scale;
        const newHeight = initialImage.height * finalValues.scale;
        const newX = finalValues.x - newWidth / 2;  // back to top-left corner
        const newY = finalValues.y - newHeight / 2;
        
        // Apply the consolidated values as permanent properties
        const { updateImage } = store;
        
        // Only keep rotation as transform, everything else becomes permanent properties
        if (Math.abs(finalValues.rotation) > 0.01) {
          const rotationTransform = `rotate(${finalValues.rotation}, ${finalValues.x}, ${finalValues.y})`;
          updateImage(imageId, { 
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight,
            transform: rotationTransform 
          });
        } else {
          updateImage(imageId, { 
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight,
            transform: '' // Clear transform if no significant rotation
          });
        }
      }
    }

    // Apply final transformations permanently to textPath elements
    for (const textPathId of Object.keys(this.state.initialTextPaths)) {
      const initialTextPath = this.state.initialTextPaths[textPathId];
      
      if (this.state.mode === 'scale') {
        // For textPath, only scale the font size - no position/rotation transforms
        if (initialTextPath.style?.fontSize) {
          const { scaleX, scaleY } = this.getScaleParams();
          const avgScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;
          const newFontSize = initialTextPath.style.fontSize * avgScale;
          
          const { updateTextPathStyle } = store;
          updateTextPathStyle(textPathId, { fontSize: Math.max(1, newFontSize) });
        }
      }
      // No rotation transforms for textPath - they follow the path
      // Any transformations should be applied to the path itself
    }

    this.state.isTransforming = false;
    this.state.mode = null;
    this.state.activeHandle = null;
    this.state.dragStart = null;
    this.state.currentPoint = null;
    this.state.initialBounds = null;
    this.state.initialCommands = {};
    this.state.initialTexts = {};
    this.state.initialTextPaths = {};
    this.state.initialImages = {};
    this.state.initialUses = {};

    // Trigger state change to show handles again
    this.triggerStateChange();
  }

  private storeInitialCommands() {
    const store = this.editorStore || useEditorStore.getState();
    const { selection, paths, texts, textPaths, images, uses } = store;

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

    // Store selected texts
    if (selection.selectedTexts) {
      for (const textId of selection.selectedTexts) {
        const text = texts?.find((t: any) => t.id === textId);
        if (text) {
          this.state.initialTexts[textId] = { 
            ...text,
            // Deep copy spans for multiline text
            spans: text.spans ? text.spans.map((span: any) => ({ ...span })) : undefined
          };
        }
      }
    }

    // Store selected textPaths
    if (selection.selectedTextPaths && textPaths) {
      for (const textPathId of selection.selectedTextPaths) {
        const textPath = textPaths.find((tp: any) => tp.id === textPathId);
        if (textPath) {
          this.state.initialTextPaths[textPathId] = { ...textPath };
        }
      }
    }

    // Store selected images
    if (selection.selectedImages && images) {
      for (const imageId of selection.selectedImages) {
        const image = images.find((img: any) => img.id === imageId);
        if (image) {
          this.state.initialImages[imageId] = { ...image };
        }
      }
    }

    // Store selected use elements
    if (selection.selectedUses && uses) {
      for (const useId of selection.selectedUses) {
        const use = uses.find((u: any) => u.id === useId);
        if (use) {
          this.state.initialUses[useId] = { ...use };
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
      // Corner handles
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
      
      // Edge handles
      case 'n':
        scaleX = 1; // No horizontal mirroring for vertical edges
        scaleY = (initialHeight - deltaY) / initialHeight;
        break;
      case 's':
        scaleX = 1; // No horizontal mirroring for vertical edges
        scaleY = (initialHeight + deltaY) / initialHeight;
        break;
      case 'e':
        scaleX = (initialWidth + deltaX) / initialWidth;
        scaleY = 1; // No vertical mirroring for horizontal edges
        break;
      case 'w':
        scaleX = (initialWidth - deltaX) / initialWidth;
        scaleY = 1; // No vertical mirroring for horizontal edges
        break;
    }

    return {
      mirrorX: scaleX < 0,
      mirrorY: scaleY < 0
    };
  }

  // Helper methods for transformation parameters
  private getScaleParams() {
    if (!this.state.dragStart || !this.state.initialBounds || !this.state.activeHandle || !this.state.currentPoint) {
      return { scaleX: 1, scaleY: 1, originX: 0, originY: 0 };
    }

    const deltaX = this.state.currentPoint.x - this.state.dragStart.x;
    const deltaY = this.state.currentPoint.y - this.state.dragStart.y;
    const { width: initialWidth, height: initialHeight, x: initialX, y: initialY } = this.state.initialBounds;

    let scaleX = 1;
    let scaleY = 1;
    let originX = initialX;
    let originY = initialY;

    // Calculate scale factors based on active handle
    switch (this.state.activeHandle) {
      // Corner handles
      case 'nw':
        scaleX = (initialWidth - deltaX) / initialWidth;
        scaleY = (initialHeight - deltaY) / initialHeight;
        originX = initialX + initialWidth;
        originY = initialY + initialHeight;
        // Force proportional scaling for corners
        const scaleNW = Math.min(Math.abs(scaleX), Math.abs(scaleY));
        scaleX = scaleX < 0 ? -scaleNW : scaleNW;
        scaleY = scaleY < 0 ? -scaleNW : scaleNW;
        break;
      case 'ne':
        scaleX = (initialWidth + deltaX) / initialWidth;
        scaleY = (initialHeight - deltaY) / initialHeight;
        originX = initialX;
        originY = initialY + initialHeight;
        // Force proportional scaling for corners
        const scaleNE = Math.min(Math.abs(scaleX), Math.abs(scaleY));
        scaleX = scaleX < 0 ? -scaleNE : scaleNE;
        scaleY = scaleY < 0 ? -scaleNE : scaleNE;
        break;
      case 'sw':
        scaleX = (initialWidth - deltaX) / initialWidth;
        scaleY = (initialHeight + deltaY) / initialHeight;
        originX = initialX + initialWidth;
        originY = initialY;
        // Force proportional scaling for corners
        const scaleSW = Math.min(Math.abs(scaleX), Math.abs(scaleY));
        scaleX = scaleX < 0 ? -scaleSW : scaleSW;
        scaleY = scaleY < 0 ? -scaleSW : scaleSW;
        break;
      case 'se':
        scaleX = (initialWidth + deltaX) / initialWidth;
        scaleY = (initialHeight + deltaY) / initialHeight;
        originX = initialX;
        originY = initialY;
        // Force proportional scaling for corners
        const scaleSE = Math.min(Math.abs(scaleX), Math.abs(scaleY));
        scaleX = scaleX < 0 ? -scaleSE : scaleSE;
        scaleY = scaleY < 0 ? -scaleSE : scaleSE;
        break;
      
      // Edge handles
      case 'n':
        scaleX = 1; // No horizontal scaling
        scaleY = (initialHeight - deltaY) / initialHeight;
        originX = initialX + initialWidth / 2;
        originY = initialY + initialHeight;
        break;
      case 's':
        scaleX = 1; // No horizontal scaling
        scaleY = (initialHeight + deltaY) / initialHeight;
        originX = initialX + initialWidth / 2;
        originY = initialY;
        break;
      case 'e':
        scaleX = (initialWidth + deltaX) / initialWidth;
        scaleY = 1; // No vertical scaling
        originX = initialX;
        originY = initialY + initialHeight / 2;
        break;
      case 'w':
        scaleX = (initialWidth - deltaX) / initialWidth;
        scaleY = 1; // No vertical scaling
        originX = initialX + initialWidth;
        originY = initialY + initialHeight / 2;
        break;
    }

    // Edge handles always scale in one dimension only
    // Corner handles always scale proportionally
    
    // Prevent collapse to zero
    const minScale = 0.01;
    if (Math.abs(scaleX) < minScale) {
      scaleX = scaleX < 0 ? -minScale : minScale;
    }
    if (Math.abs(scaleY) < minScale) {
      scaleY = scaleY < 0 ? -minScale : minScale;
    }

    return { scaleX, scaleY, originX, originY };
  }

  private getRotationParams() {
    if (!this.state.dragStart || !this.state.initialBounds || !this.state.currentPoint) {
      return { angle: 0, centerX: 0, centerY: 0 };
    }

    const center = this.state.initialBounds.center;
    
    // Vector from center to initial point
    const initialVector = {
      x: this.state.dragStart.x - center.x,
      y: this.state.dragStart.y - center.y
    };
    
    // Vector from center to current point
    const currentVector = {
      x: this.state.currentPoint.x - center.x,
      y: this.state.currentPoint.y - center.y
    };
    
    // Calculate angle between vectors
    const initialAngle = Math.atan2(initialVector.y, initialVector.x);
    const currentAngle = Math.atan2(currentVector.y, currentVector.x);
    const angle = currentAngle - initialAngle;

    return { angle, centerX: center.x, centerY: center.y };
  }

  // Helper method to parse existing rotation from transform string
  private parseExistingRotation(transform: string): number {
    if (!transform) return 0;
    
    // Look for rotate(angle, cx, cy) or rotate(angle)
    const rotateMatch = transform.match(/rotate\(([^,)]+)/);
    if (rotateMatch) {
      return parseFloat(rotateMatch[1]) || 0;
    }
    
    return 0;
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

  // Helper methods to extract transformation components from SVG transform strings
  private extractPositionFromTransform(transform: string, originalX: number, originalY: number): { x: number; y: number } {
    if (!transform) return { x: originalX, y: originalY };

    // Create a temporary SVG element to compute the transform
    if (typeof document === 'undefined') return { x: originalX, y: originalY };

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const element = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    element.setAttribute('transform', transform);
    svg.appendChild(element);
    document.body.appendChild(svg);

    try {
      const matrix = element.transform.baseVal.consolidate()?.matrix;
      if (matrix) {
        // Apply the transform to the original position
        const transformedX = matrix.a * originalX + matrix.c * originalY + matrix.e;
        const transformedY = matrix.b * originalX + matrix.d * originalY + matrix.f;
        return { x: transformedX, y: transformedY };
      }
    } catch (e) {
      console.warn('Failed to extract position from transform:', e);
    } finally {
      document.body.removeChild(svg);
    }

    return { x: originalX, y: originalY };
  }

  private extractRotationFromTransform(transform: string): { angle: number } {
    if (!transform) return { angle: 0 };

    // Look for rotate() function in the transform string
    const rotateMatch = transform.match(/rotate\(([^,)]+)/);
    if (rotateMatch) {
      const angle = parseFloat(rotateMatch[1]) || 0;
      return { angle };
    }

    // If no explicit rotate(), try to extract from matrix
    if (typeof document === 'undefined') return { angle: 0 };

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const element = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    element.setAttribute('transform', transform);
    svg.appendChild(element);
    document.body.appendChild(svg);

    try {
      const matrix = element.transform.baseVal.consolidate()?.matrix;
      if (matrix) {
        // Extract rotation angle from matrix
        const angle = Math.atan2(matrix.b, matrix.a) * 180 / Math.PI;
        return { angle };
      }
    } catch (e) {
      console.warn('Failed to extract rotation from transform:', e);
    } finally {
      document.body.removeChild(svg);
    }

    return { angle: 0 };
  }

  private extractScaleFromTransform(transform: string): { x: number; y: number } {
    if (!transform) return { x: 1, y: 1 };

    if (typeof document === 'undefined') return { x: 1, y: 1 };

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const element = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    element.setAttribute('transform', transform);
    svg.appendChild(element);
    document.body.appendChild(svg);

    try {
      const matrix = element.transform.baseVal.consolidate()?.matrix;
      if (matrix) {
        // Extract scale from matrix
        const scaleX = Math.sqrt(matrix.a * matrix.a + matrix.b * matrix.b);
        const scaleY = Math.sqrt(matrix.c * matrix.c + matrix.d * matrix.d);
        return { x: scaleX, y: scaleY };
      }
    } catch (e) {
      console.warn('Failed to extract scale from transform:', e);
    } finally {
      document.body.removeChild(svg);
    }

    return { x: 1, y: 1 };
  }

  private calculateTransformedBounds(x: number, y: number, width: number, height: number, transform: string): { x: number; y: number; width: number; height: number } {
    if (!transform) return { x, y, width, height };

    if (typeof document === 'undefined') return { x, y, width, height };

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const element = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    element.setAttribute('transform', transform);
    svg.appendChild(element);
    document.body.appendChild(svg);

    try {
      const matrix = element.transform.baseVal.consolidate()?.matrix;
      if (matrix) {
        // Transform all four corners of the rectangle
        const corners = [
          { x: x, y: y },
          { x: x + width, y: y },
          { x: x + width, y: y + height },
          { x: x, y: y + height }
        ];

        const transformedCorners = corners.map(corner => ({
          x: matrix.a * corner.x + matrix.c * corner.y + matrix.e,
          y: matrix.b * corner.x + matrix.d * corner.y + matrix.f
        }));

        // Find the bounding box of the transformed corners
        const minX = Math.min(...transformedCorners.map(c => c.x));
        const maxX = Math.max(...transformedCorners.map(c => c.x));
        const minY = Math.min(...transformedCorners.map(c => c.y));
        const maxY = Math.max(...transformedCorners.map(c => c.y));

        return {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY
        };
      }
    } catch (e) {
      console.warn('Failed to calculate transformed bounds:', e);
    } finally {
      document.body.removeChild(svg);
    }

    return { x, y, width, height };
  }

  // Robust transformation system methods for multiple applications support

  // Build a transformation matrix from current element state
  private buildTransformMatrix(
    elementX: number, 
    elementY: number, 
    baseScaleX: number, 
    baseScaleY: number, 
    baseRotation: number, 
    existingTransform: string
  ): TransformMatrix {
    // Start with identity matrix
    let matrix: TransformMatrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

    // If there's an existing transform, extract its matrix
    if (existingTransform && existingTransform.trim()) {
      const extractedMatrix = this.parseTransformToMatrix(existingTransform);
      if (extractedMatrix) {
        matrix = extractedMatrix;
      }
    }

    return matrix;
  }

  // Combine two transformations properly
  private combineTransformations(
    currentMatrix: TransformMatrix, 
    operation: TransformOperation
  ): TransformMatrix {
    let newMatrix: TransformMatrix;

    if (operation.type === 'scale') {
      const { scaleX = 1, scaleY = 1, originX = 0, originY = 0 } = operation;
      
      // Create scale matrix with proper origin handling
      const translateToOrigin = { a: 1, b: 0, c: 0, d: 1, e: -originX, f: -originY };
      const scale = { a: scaleX, b: 0, c: 0, d: scaleY, e: 0, f: 0 };
      const translateBack = { a: 1, b: 0, c: 0, d: 1, e: originX, f: originY };
      
      // Combine: translateBack * scale * translateToOrigin * currentMatrix
      const temp1 = this.multiplyMatrices(translateToOrigin, currentMatrix);
      const temp2 = this.multiplyMatrices(scale, temp1);
      newMatrix = this.multiplyMatrices(translateBack, temp2);
      
    } else if (operation.type === 'rotate') {
      const { angle = 0, centerX = 0, centerY = 0 } = operation;
      
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      
      // Create rotation matrix with proper center handling
      const translateToCenter = { a: 1, b: 0, c: 0, d: 1, e: -centerX, f: -centerY };
      const rotate = { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
      const translateBack = { a: 1, b: 0, c: 0, d: 1, e: centerX, f: centerY };
      
      // Combine: translateBack * rotate * translateToCenter * currentMatrix
      const temp1 = this.multiplyMatrices(translateToCenter, currentMatrix);
      const temp2 = this.multiplyMatrices(rotate, temp1);
      newMatrix = this.multiplyMatrices(translateBack, temp2);
      
    } else {
      newMatrix = currentMatrix;
    }

    return newMatrix;
  }

  // Convert matrix to SVG transform string
  private matrixToString(matrix: TransformMatrix): string {
    return `matrix(${matrix.a}, ${matrix.b}, ${matrix.c}, ${matrix.d}, ${matrix.e}, ${matrix.f})`;
  }

  // Extract final consolidated values from a transform matrix
  private extractFinalValues(
    transformString: string,
    originalX: number,
    originalY: number,
    originalScale: number,
    originalRotation: number
  ): FinalValues {
    const matrix = this.parseTransformToMatrix(transformString);
    
    if (!matrix) {
      return {
        x: originalX,
        y: originalY,
        scale: originalScale,
        rotation: originalRotation
      };
    }

    // Extract final position by applying matrix to original position
    const finalX = matrix.a * originalX + matrix.c * originalY + matrix.e;
    const finalY = matrix.b * originalX + matrix.d * originalY + matrix.f;

    // Extract scale (average of X and Y scales)
    const scaleX = Math.sqrt(matrix.a * matrix.a + matrix.b * matrix.b);
    const scaleY = Math.sqrt(matrix.c * matrix.c + matrix.d * matrix.d);
    const finalScale = (scaleX + scaleY) / 2;

    // Extract rotation (in degrees)
    const finalRotation = Math.atan2(matrix.b, matrix.a) * 180 / Math.PI;

    return {
      x: finalX,
      y: finalY,
      scale: finalScale,
      rotation: finalRotation
    };
  }

  // Parse SVG transform string to matrix
  private parseTransformToMatrix(transform: string): TransformMatrix | null {
    if (!transform || typeof document === 'undefined') return null;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const element = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    element.setAttribute('transform', transform);
    svg.appendChild(element);
    document.body.appendChild(svg);

    try {
      const svgMatrix = element.transform.baseVal.consolidate()?.matrix;
      if (svgMatrix) {
        const matrix: TransformMatrix = {
          a: svgMatrix.a,
          b: svgMatrix.b,
          c: svgMatrix.c,
          d: svgMatrix.d,
          e: svgMatrix.e,
          f: svgMatrix.f
        };
        return matrix;
      }
    } catch (e) {
      console.warn('Failed to parse transform to matrix:', e);
    } finally {
      document.body.removeChild(svg);
    }

    return null;
  }

  // Multiply two transformation matrices
  private multiplyMatrices(m1: TransformMatrix, m2: TransformMatrix): TransformMatrix {
    return {
      a: m1.a * m2.a + m1.c * m2.b,
      b: m1.b * m2.a + m1.d * m2.b,
      c: m1.a * m2.c + m1.c * m2.d,
      d: m1.b * m2.c + m1.d * m2.d,
      e: m1.a * m2.e + m1.c * m2.f + m1.e,
      f: m1.b * m2.e + m1.d * m2.f + m1.f
    };
  }
}

export const transformManager = new TransformManager();

// Pointer event handlers for the plugin system
export const transformPointerHandlers: PointerEventHandler = {
  onPointerDown: transformManager.handlePointerDown,
  onPointerMove: transformManager.handlePointerMove,
  onPointerUp: transformManager.handlePointerUp,
};
