import { PointerEvent } from 'react';
import { PointerEventHandler, PointerEventContext } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { SVGCommand, Point } from '../../types';
import { calculateGlobalViewBox } from '../../utils/viewbox-utils';
import { subPathToString } from '../../utils/path-utils';
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
  type: 'corner' | 'edge' | 'rotation';
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

    // For selected text elements
    if (selection.selectedTexts?.length > 0 && texts) {
      for (const textId of selection.selectedTexts) {
        const text = texts.find((t: any) => t.id === textId);
        if (text) {
          const textElement = document.createElementNS(svgNS, 'text');
          textElement.setAttribute('x', text.x.toString());
          textElement.setAttribute('y', text.y.toString());
          
          if (text.style?.fontSize) {
            textElement.setAttribute('font-size', text.style.fontSize.toString());
          }
          if (text.style?.fontFamily) {
            textElement.setAttribute('font-family', text.style.fontFamily);
          }
          
          // Apply transform if present
          if (text.transform) {
            textElement.setAttribute('transform', text.transform);
          }
          
          if (text.type === 'text') {
            textElement.textContent = text.content;
            tempSvg.appendChild(textElement);
            hasContent = true;
          } else if (text.type === 'multiline-text') {
            // For multiline text, use the exact same logic as calculateTextBoundsDOM
            // to ensure the transform bounds match the yellow selection rectangle
            const fontSize = text.style?.fontSize || 16;
            const lineHeight = fontSize * 1.2;
            
            // Create the same structure as calculateTextBoundsDOM
            text.spans.forEach((span: any, index: number, spans: any[]) => {
              // Only add spans with content
              if (span.content && span.content.trim()) {
                // Calculate the actual line number for dy (count non-empty spans before this one)
                const lineNumber = spans.slice(0, index).filter((s: any) => s.content && s.content.trim()).length;
                
                const tspanElement = document.createElementNS(svgNS, 'tspan');
                tspanElement.textContent = span.content;
                tspanElement.setAttribute('x', text.x.toString());
                if (lineNumber === 0) {
                  tspanElement.setAttribute('dy', '0');
                } else {
                  tspanElement.setAttribute('dy', lineHeight.toString());
                }
                textElement.appendChild(tspanElement);
              }
            });
            
            tempSvg.appendChild(textElement);
            
            // Now measure each tspan individually to get max width (same as calculateTextBoundsDOM)
            let maxWidth = 0;
            const tspans = textElement.querySelectorAll('tspan');
            const nonEmptySpansCount = tspans.length;
            
            // Measure each tspan individually
            tspans.forEach((tspan) => {
              try {
                const tspanBbox = tspan.getBBox();
                maxWidth = Math.max(maxWidth, tspanBbox.width);
              } catch (e) {
                // Fallback to text length estimation if getBBox fails
                const content = tspan.textContent || '';
                const estimatedWidth = content.length * fontSize * 0.6;
                maxWidth = Math.max(maxWidth, estimatedWidth);
              }
            });
            
            const totalHeight = nonEmptySpansCount * lineHeight;
            
            // Remove the text element and create a path element with the measured bounds
            tempSvg.removeChild(textElement);
            
            if (maxWidth > 0 && totalHeight > 0) {
              // Create a path element that represents a rectangle with the measured bounds
              const x = text.x;
              const y = text.y - fontSize;
              const width = maxWidth;
              const height = totalHeight;
              
              // Create rectangle path: M x,y L x+w,y L x+w,y+h L x,y+h Z
              const pathData = `M ${x},${y} L ${x + width},${y} L ${x + width},${y + height} L ${x},${y + height} Z`;
              
              const pathElement = document.createElementNS(svgNS, 'path');
              pathElement.setAttribute('d', pathData);
              pathElement.setAttribute('fill', 'none');
              pathElement.setAttribute('stroke', 'none');
              tempSvg.appendChild(pathElement);
              
              hasContent = true;
            }
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
                  const textElement = document.createElementNS(svgNS, 'text');
                  textElement.setAttribute('x', text.x.toString());
                  textElement.setAttribute('y', text.y.toString());
                  
                  if (text.style?.fontSize) {
                    textElement.setAttribute('font-size', text.style.fontSize.toString());
                  }
                  if (text.style?.fontFamily) {
                    textElement.setAttribute('font-family', text.style.fontFamily);
                  }
                  
                  if (text.transform) {
                    textElement.setAttribute('transform', text.transform);
                  }
                  
                  if (text.type === 'text') {
                    textElement.textContent = text.content;
                    tempSvg.appendChild(textElement);
                    hasContent = true;
                  } else if (text.type === 'multiline-text') {
                    // Handle multiline text for groups (same logic as above)
                    const fontSize = text.style?.fontSize || 16;
                    const lineHeight = fontSize * 1.2;
                    
                    text.spans.forEach((span: any, index: number, spans: any[]) => {
                      if (span.content && span.content.trim()) {
                        const lineNumber = spans.slice(0, index).filter((s: any) => s.content && s.content.trim()).length;
                        
                        const tspanElement = document.createElementNS(svgNS, 'tspan');
                        tspanElement.textContent = span.content;
                        tspanElement.setAttribute('x', text.x.toString());
                        if (lineNumber === 0) {
                          tspanElement.setAttribute('dy', '0');
                        } else {
                          tspanElement.setAttribute('dy', lineHeight.toString());
                        }
                        textElement.appendChild(tspanElement);
                      }
                    });
                    
                    tempSvg.appendChild(textElement);
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

    // Transform selected texts using SVG transform attribute
    for (const textId of Object.keys(this.state.initialTexts)) {
      const initialText = this.state.initialTexts[textId];
      
      // Calculate the transformation matrix for this text
      let transformString = '';
      
      if (this.state.mode === 'scale') {
        // Get scale factors and origin
        const { scaleX, scaleY, originX, originY } = this.getScaleParams();
        transformString = `matrix(${scaleX}, 0, 0, ${scaleY}, ${originX * (1 - scaleX)}, ${originY * (1 - scaleY)})`;
      } else if (this.state.mode === 'rotate') {
        // Get rotation angle and center
        const { angle, centerX, centerY } = this.getRotationParams();
        transformString = `rotate(${angle * 180 / Math.PI}, ${centerX}, ${centerY})`;
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

    // Transform selected images
    for (const imageId of Object.keys(this.state.initialImages)) {
      const initialImage = this.state.initialImages[imageId];
      
      if (this.state.mode === 'scale') {
        // For scaling, transform all corners of the image
        const { scaleX, scaleY, originX, originY } = this.getScaleParams();
        
        const topLeft = transform(initialImage.x, initialImage.y);
        const bottomRight = transform(initialImage.x + initialImage.width, initialImage.y + initialImage.height);
        
        const newX = Math.min(topLeft.x, bottomRight.x);
        const newY = Math.min(topLeft.y, bottomRight.y);
        const newWidth = Math.abs(bottomRight.x - topLeft.x);
        const newHeight = Math.abs(bottomRight.y - topLeft.y);
        
        // Use direct store update to avoid circular calls with updateImage
        useEditorStore.setState((state) => ({
          images: state.images.map((img: any) =>
            img.id === imageId 
              ? { ...img, x: newX, y: newY, width: newWidth, height: newHeight }
              : img
          ),
          renderVersion: state.renderVersion + 1
        }));
      } else if (this.state.mode === 'rotate') {
        // For rotation, transform the center and maintain size, plus add rotation transform
        const centerX = initialImage.x + initialImage.width / 2;
        const centerY = initialImage.y + initialImage.height / 2;
        const transformedCenter = transform(centerX, centerY);
        
        // Get rotation angle
        const { angle } = this.getRotationParams();
        const rotationDegrees = angle * 180 / Math.PI;
        
        // Calculate new position and create transform
        const newX = transformedCenter.x - initialImage.width / 2;
        const newY = transformedCenter.y - initialImage.height / 2;
        const transformString = `rotate(${rotationDegrees}, ${transformedCenter.x}, ${transformedCenter.y})`;
        
        // Use direct store update to avoid circular calls with updateImage
        useEditorStore.setState((state) => ({
          images: state.images.map((img: any) =>
            img.id === imageId 
              ? { ...img, x: newX, y: newY, transform: transformString }
              : img
          ),
          renderVersion: state.renderVersion + 1
        }));
      }
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
    
    // Apply final transformations permanently to text elements
    for (const textId of Object.keys(this.state.initialTexts)) {
      const initialText = this.state.initialTexts[textId];
      
      if (this.state.mode === 'scale') {
        // For scaling, update position and potentially font size
        const { scaleX, scaleY, originX, originY } = this.getScaleParams();
        const finalX = originX + (initialText.x - originX) * scaleX;
        const finalY = originY + (initialText.y - originY) * scaleY;
        
        const { updateTextPosition, updateTextTransform } = store;
        updateTextPosition(textId, finalX, finalY);
        
        // For text scaling, we might want to scale the font size instead of using transform
        // This makes the text clearer and behaves more like users expect
        if (initialText.style?.fontSize) {
          const avgScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;
          const newFontSize = initialText.style.fontSize * avgScale;
          store.updateTextStyle(textId, { fontSize: Math.max(1, newFontSize) });
        }
        
        updateTextTransform(textId, ''); // Clear transform after applying
      } else if (this.state.mode === 'rotate') {
        // For rotation, calculate the new position and apply rotation to the text coordinate system
        const { angle, centerX, centerY } = this.getRotationParams();
        
        // Calculate the new rotated position
        const dx = initialText.x - centerX;
        const dy = initialText.y - centerY;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const finalX = centerX + dx * cos - dy * sin;
        const finalY = centerY + dx * sin + dy * cos;
        
        // Update position to the rotated location
        const { updateTextPosition, updateTextTransform } = store;
        updateTextPosition(textId, finalX, finalY);
        
        // Calculate cumulative rotation including any existing rotation
        const existingRotation = this.parseExistingRotation(initialText.transform || '');
        const totalRotationDegrees = existingRotation + (angle * 180 / Math.PI);
        
        // Apply the cumulative rotation around the text's new position
        const rotationTransform = `rotate(${totalRotationDegrees}, ${finalX}, ${finalY})`;
        updateTextTransform(textId, rotationTransform);
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
}

export const transformManager = new TransformManager();

// Pointer event handlers for the plugin system
export const transformPointerHandlers: PointerEventHandler = {
  onPointerDown: transformManager.handlePointerDown,
  onPointerMove: transformManager.handlePointerMove,
  onPointerUp: transformManager.handlePointerUp,
};
