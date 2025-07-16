import React, { PointerEvent, WheelEvent } from 'react';
import { Plugin, PointerEventContext } from '../../core/PluginSystem';
import { snapToGrid, getCommandPosition } from '../../utils/path-utils';
import { getSVGPoint } from '../../utils/transform-utils';
import { transformManager } from '../transform/TransformManager';
import { figmaHandleManager } from '../figma-handles/FigmaHandleManager';
import { guidelinesManager } from '../guidelines/GuidelinesManager';

interface PointerInteractionState {
  draggingCommand: string | null;
  draggingControlPoint: { commandId: string; point: 'x1y1' | 'x2y2' } | null;
  draggingElement: { id: string; type: 'text' | 'image' | 'use' } | null;
  isPanning: boolean;
  isSpacePressed: boolean;
  lastPointerPosition: { x: number; y: number };
  dragStartPositions: { [id: string]: { x: number; y: number } };
  dragStartTextPositions: { [id: string]: { x: number; y: number } };
  dragStartImagePositions: { [id: string]: { x: number; y: number; width: number; height: number } };
  dragStartUsePositions: { [id: string]: { x: number; y: number; width?: number; height?: number } };
  dragStartGroupPositions: { [id: string]: { transform?: string } };
  dragOrigin: { x: number; y: number } | null;
}

class PointerInteractionManager {
  private state: PointerInteractionState = {
    draggingCommand: null,
    draggingControlPoint: null,
    draggingElement: null,
    isPanning: false,
    isSpacePressed: false,
    lastPointerPosition: { x: 0, y: 0 },
    dragStartPositions: {},
    dragStartTextPositions: {},
    dragStartImagePositions: {},
    dragStartUsePositions: {},
    dragStartGroupPositions: {},
    dragOrigin: null,
  };

  private editorStore: any;

  constructor() {
    this.setupKeyboardListeners();
  }

  private setupKeyboardListeners() {
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    const isEditable = target && (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      (target as HTMLElement).isContentEditable
    );
    if (e.code === 'Space' && !e.repeat && !isEditable) {
      e.preventDefault();
      this.state.isSpacePressed = true;
      this.updateCursorForSpaceMode(true);
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    const isEditable = target && (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      (target as HTMLElement).isContentEditable
    );
    if (e.code === 'Space' && !isEditable) {
      e.preventDefault();
      this.state.isSpacePressed = false;
      this.state.isPanning = false;
      this.updateCursorForSpaceMode(false);
    }
  };

  private updateCursorForSpaceMode(isSpacePressed: boolean) {
    const svgElements = document.querySelectorAll('svg');
    svgElements.forEach(svg => {
      if (isSpacePressed) {
        svg.style.cursor = 'grab';
      } else {
        svg.style.cursor = 'default';
      }
    });
  }

  setEditorStore(store: any) {
    this.editorStore = store;
  }

  private hasAnySelection(): boolean {
    if (!this.editorStore) return false;
    const { selection } = this.editorStore;
    return selection.selectedCommands.length > 0 || 
           selection.selectedSubPaths.length > 0 || 
           selection.selectedPaths.length > 0 ||
           selection.selectedTexts.length > 0 ||
           selection.selectedImages?.length > 0 ||
           selection.selectedUses?.length > 0 ||
           selection.selectedGroups?.length > 0;
  }

  getSVGPoint(e: PointerEvent<SVGElement>, svgRef: React.RefObject<SVGSVGElement | null>): { x: number; y: number } {
    return getSVGPoint(e, svgRef, this.editorStore.viewport);
  }

  private captureAllSelectedPositions() {
    const { selection, images, uses, texts, paths, groups } = this.editorStore;
    
    // Capture image positions
    const imagePositions: { [id: string]: { x: number; y: number; width: number; height: number } } = {};
    selection.selectedImages?.forEach((imageId: string) => {
      const image = images.find((img: any) => img.id === imageId);
      if (image) {
        imagePositions[imageId] = { 
          x: image.x, 
          y: image.y, 
          width: image.width, 
          height: image.height 
        };
      }
    });
    this.state.dragStartImagePositions = imagePositions;
    console.log('captureAllSelectedPositions - Images captured:', Object.keys(imagePositions).length, selection.selectedImages?.length);

    // Capture use positions
    const usePositions: { [id: string]: { x: number; y: number; width?: number; height?: number } } = {};
    selection.selectedUses?.forEach((useId: string) => {
      const use = uses.find((u: any) => u.id === useId);
      if (use) {
        usePositions[useId] = { 
          x: use.x || 0, 
          y: use.y || 0, 
          width: use.width, 
          height: use.height 
        };
      }
    });
    this.state.dragStartUsePositions = usePositions;

    // Capture text positions
    const textPositions: { [id: string]: { x: number; y: number } } = {};
    selection.selectedTexts?.forEach((textId: string) => {
      const text = texts.find((t: any) => t.id === textId);
      if (text) {
        textPositions[textId] = { x: text.x, y: text.y };
      }
    });
    this.state.dragStartTextPositions = textPositions;

    // Capture command positions (from selected commands and selected subpaths)
    const commandPositions: { [id: string]: { x: number; y: number } } = {};
    
    // Direct command selections
    selection.selectedCommands?.forEach((commandId: string) => {
      const command = this.findCommandById(commandId, paths);
      if (command) {
        const pos = getCommandPosition(command);
        if (pos) commandPositions[commandId] = { x: pos.x, y: pos.y };
      }
    });
    
    // Commands from selected subpaths
    selection.selectedSubPaths?.forEach((subPathId: string) => {
      paths.forEach((path: any) => {
        const subPath = path.subPaths.find((sp: any) => sp.id === subPathId);
        if (subPath) {
          subPath.commands.forEach((cmd: any) => {
            if (!commandPositions[cmd.id]) {
              const pos = getCommandPosition(cmd);
              if (pos) commandPositions[cmd.id] = { x: pos.x, y: pos.y };
            }
          });
        }
      });
    });
    
    this.state.dragStartPositions = commandPositions;

    // Capture group positions
    const groupPositions: { [id: string]: { transform?: string } } = {};
    selection.selectedGroups?.forEach((groupId: string) => {
      const group = groups.find((g: any) => g.id === groupId);
      if (group) {
        groupPositions[groupId] = { 
          transform: group.transform 
        };
      }
    });
    this.state.dragStartGroupPositions = groupPositions;
  }

  private findCommandById(commandId: string, paths: any[]): any {
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

  handlePointerDown = (e: PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
    const { commandId, controlPoint } = context;
    const { selection, viewport, grid, mode, paths, texts, images, uses, selectCommand, selectMultiple, clearSelection, pushToHistory, selectImage, selectUse, addToSelection } = this.editorStore;
    
    // Only handle specific cases, don't block all pointer events
    const target = e.target as SVGElement;
    const elementType = target.dataset.elementType;
    const elementId = target.dataset.elementId;
    const isEmptySpaceClick = !commandId && !controlPoint && !elementType && !this.state.isSpacePressed && e.button === 0;
    if (this.state.draggingControlPoint && !controlPoint && !this.state.isSpacePressed) {
      figmaHandleManager.endDragHandle();
      this.state.draggingControlPoint = null;
      transformManager.setMoving(false);
    }
    // Note: Don't clear selection on empty space click here
    // Let the SelectionPlugin handle rectangle selection first
    // Selection clearing will be handled by SelectionPlugin if no drag occurs
    if (this.state.isSpacePressed && e.button === 0) {
      e.stopPropagation();
      this.state.isPanning = true;
      this.state.lastPointerPosition = { x: e.clientX, y: e.clientY };
      const svg = (e.target as Element).closest('svg');
      if (svg) svg.style.cursor = 'grabbing';
      return true;
    }
    if (e.button === 1) {
      e.stopPropagation();
      this.state.isPanning = true;
      this.state.lastPointerPosition = { x: e.clientX, y: e.clientY };
      return true;
    }
    if (commandId && controlPoint && !this.state.isSpacePressed) {
      e.stopPropagation();
      this.state.draggingControlPoint = { commandId, point: controlPoint };
      const startPoint = this.getSVGPoint(e, context.svgRef);
      const handleType = controlPoint === 'x1y1' ? 'outgoing' : 'incoming';
      figmaHandleManager.startDragHandle(commandId, handleType, startPoint);
      transformManager.setMoving(true);
      pushToHistory();
      return true;
    }
    
    // Check for image or use element clicks
    if (elementType === 'image' && elementId && !this.state.isSpacePressed) {
      e.stopPropagation();
      // Handle image selection and dragging
      if (e.shiftKey) {
        if (selection.selectedImages?.includes(elementId)) {
          // Remove from selection
          this.editorStore.removeFromSelection(elementId, 'image');
        } else {
          // Add to selection
          addToSelection(elementId, 'image');
        }
        // For shift-click, only change selection, don't start dragging
        return true;
      } else {
        if (!selection.selectedImages?.includes(elementId)) {
          selectImage(elementId);
        }
        
        // Only prepare for dragging if not shift-clicking
        this.state.draggingElement = { id: elementId, type: 'image' };
        this.captureAllSelectedPositions();
        this.state.dragOrigin = this.getSVGPoint(e, context.svgRef);
        transformManager.setMoving(true);
        pushToHistory();
        return true;
      }
    } else if (elementType === 'use' && elementId && !this.state.isSpacePressed) {
      e.stopPropagation();
      // Handle use element selection and dragging
      if (e.shiftKey) {
        if (selection.selectedUses?.includes(elementId)) {
          // Remove from selection
          this.editorStore.removeFromSelection(elementId, 'use');
        } else {
          // Add to selection
          addToSelection(elementId, 'use');
        }
        // For shift-click, only change selection, don't start dragging
        return true;
      } else {
        if (!selection.selectedUses?.includes(elementId)) {
          selectUse(elementId);
        }
        
        // Only prepare for dragging if not shift-clicking
        this.state.draggingElement = { id: elementId, type: 'use' };
        this.captureAllSelectedPositions();
        this.state.dragOrigin = this.getSVGPoint(e, context.svgRef);
        transformManager.setMoving(true);
        pushToHistory();
        return true;
      }
    } else if ((elementType === 'text' || elementType === 'multiline-text') && elementId && !this.state.isSpacePressed) {
      e.stopPropagation();
      // Handle text selection and dragging
      if (e.shiftKey) {
        if (selection.selectedTexts?.includes(elementId)) {
          // Remove from selection
          this.editorStore.removeFromSelection(elementId, 'text');
        } else {
          // Add to selection
          addToSelection(elementId, 'text');
        }
        // For shift-click, only change selection, don't start dragging
        return true;
      } else {
        if (!selection.selectedTexts?.includes(elementId)) {
          this.editorStore.selectText(elementId);
        }
        
        // Only prepare for dragging if not shift-clicking
        this.state.draggingElement = { id: elementId, type: 'text' };
        this.captureAllSelectedPositions();
        this.state.dragOrigin = this.getSVGPoint(e, context.svgRef);
        transformManager.setMoving(true);
        pushToHistory();
        return true;
      }
    } else if (elementType === 'group' && elementId && !this.state.isSpacePressed) {
      e.stopPropagation();
      // Handle group selection and dragging
      if (e.shiftKey) {
        if (selection.selectedGroups?.includes(elementId)) {
          // Remove from selection
          this.editorStore.removeFromSelection(elementId, 'group');
        } else {
          // Add to selection
          addToSelection(elementId, 'group');
        }
        // For shift-click, only change selection, don't start dragging
        return true;
      } else {
        if (!selection.selectedGroups?.includes(elementId)) {
          this.editorStore.selectGroup(elementId);
        }
        
        // Only prepare for dragging if not shift-clicking
        this.state.draggingElement = { id: elementId, type: 'group' };
        this.captureAllSelectedPositions();
        this.state.dragOrigin = this.getSVGPoint(e, context.svgRef);
        transformManager.setMoving(true);
        pushToHistory();
        return true;
      }
    }
    
    if (commandId && !this.state.isSpacePressed) {
      e.stopPropagation();
      // Check if this command belongs to a selected sub-path
      let belongsToSelectedSubPath = false;
      let parentSubPathId: string | null = null;
      
      paths.forEach((path: any) => {
        path.subPaths.forEach((subPath: any) => {
          if (selection.selectedSubPaths.includes(subPath.id)) {
            if (subPath.commands.some((cmd: any) => cmd.id === commandId)) {
              belongsToSelectedSubPath = true;
              parentSubPathId = subPath.id;
            }
          }
        });
      });
      
      let finalSelectedIds: string[] = [];
      if (e.shiftKey) {
        if (selection.selectedCommands.includes(commandId)) {
          finalSelectedIds = selection.selectedCommands.filter((id: string) => id !== commandId);
          selectMultiple(finalSelectedIds, 'commands');
        } else {
          finalSelectedIds = [...selection.selectedCommands, commandId];
          selectMultiple(finalSelectedIds, 'commands');
          figmaHandleManager.onSelectionChanged();
        }
      } else {
        if (belongsToSelectedSubPath) {
          // Command belongs to selected sub-path - treat as sub-path drag
          const hasMixedSelection = selection.selectedTexts.length > 0 || 
                                  selection.selectedPaths.length > 0 ||
                                  selection.selectedCommands.length > 0;
          
          if (hasMixedSelection) {
            // Don't change selection, use all selected commands (including from sub-paths)
            finalSelectedIds = [...selection.selectedCommands];
            // Add all commands from selected sub-paths if not already included
            selection.selectedSubPaths.forEach((subPathId: string) => {
              paths.forEach((path: any) => {
                const subPath = path.subPaths.find((sp: any) => sp.id === subPathId);
                if (subPath) {
                  subPath.commands.forEach((cmd: any) => {
                    if (!finalSelectedIds.includes(cmd.id)) {
                      finalSelectedIds.push(cmd.id);
                    }
                  });
                }
              });
            });
          } else {
            // Just sub-path selection - include all commands from selected sub-paths
            finalSelectedIds = [];
            selection.selectedSubPaths.forEach((subPathId: string) => {
              paths.forEach((path: any) => {
                const subPath = path.subPaths.find((sp: any) => sp.id === subPathId);
                if (subPath) {
                  subPath.commands.forEach((cmd: any) => {
                    finalSelectedIds.push(cmd.id);
                  });
                }
              });
            });
          }
        } else if (selection.selectedCommands.includes(commandId)) {
          // Already selected command - check if we have mixed selection
          const hasMixedSelection = selection.selectedTexts.length > 0 || 
                                  selection.selectedSubPaths.length > 0 || 
                                  selection.selectedPaths.length > 0;
          
          if (hasMixedSelection) {
            // Don't change selection, just prepare for dragging
            finalSelectedIds = selection.selectedCommands;
          } else {
            // Single command selection
            finalSelectedIds = selection.selectedCommands;
            selectMultiple(finalSelectedIds, 'commands');
          }
        } else {
          // New command selection
          finalSelectedIds = [commandId];
          selectCommand(commandId);
        }
      }
      figmaHandleManager.onSelectionChanged();
      this.state.draggingCommand = commandId;
      
      // Capture positions of all selected elements
      this.captureAllSelectedPositions();
      
      this.state.dragOrigin = this.getSVGPoint(e, context.svgRef);
      transformManager.setMoving(true);
      pushToHistory();
      return true;
    } else if (mode.current === 'create' && mode.createMode && !this.state.isSpacePressed) {
      return false;
    } else if (isEmptySpaceClick && !e.shiftKey) {
      return false;
    } else if (isEmptySpaceClick && e.shiftKey) {
      return false;
    }
    return false;
  };

  handlePointerMove = (e: PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
    const { grid, selection, pan, updateCommand, moveCommand, moveText, moveImage, moveUse } = this.editorStore;
    if (this.state.isPanning) {
      const dx = e.clientX - this.state.lastPointerPosition.x;
      const dy = e.clientY - this.state.lastPointerPosition.y;
      pan({ x: dx, y: dy });
      this.state.lastPointerPosition = { x: e.clientX, y: e.clientY };
      return true;
    }
    if (this.state.draggingControlPoint) {
      const point = this.getSVGPoint(e, context.svgRef);
      figmaHandleManager.updateDragHandle(point);
      return true;
    }
    if ((this.state.draggingCommand || this.state.draggingElement) && this.state.dragOrigin) {
      const point = this.getSVGPoint(e, context.svgRef);
      const dx = point.x - this.state.dragOrigin.x;
      const dy = point.y - this.state.dragOrigin.y;
      
      // Move selected commands
      Object.keys(this.state.dragStartPositions).forEach((cmdId: string) => {
        const start = this.state.dragStartPositions[cmdId];
        if (start) {
          let newX = start.x + dx;
          let newY = start.y + dy;
          if (grid.snapToGrid) {
            const snapped = snapToGrid({ x: newX, y: newY }, grid.size);
            newX = snapped.x;
            newY = snapped.y;
          }
          moveCommand(cmdId, { x: newX, y: newY });
        }
      });
      
      // Move selected texts
      Object.keys(this.state.dragStartTextPositions).forEach((textId: string) => {
        const start = this.state.dragStartTextPositions[textId];
        if (start) {
          let newX = start.x + dx;
          let newY = start.y + dy;
          
          // Apply grid snapping if enabled
          if (grid.snapToGrid) {
            const snapped = snapToGrid({ x: newX, y: newY }, grid.size);
            newX = snapped.x;
            newY = snapped.y;
          }
          
          // Apply guidelines snapping if enabled
          const { enabledFeatures, paths, texts, groups, viewport } = this.editorStore;
          if (enabledFeatures.guidelinesEnabled) {
            const snappedPoint = guidelinesManager.updateSnap(
              { x: newX, y: newY },
              paths,
              texts,
              groups,
              viewport.viewBox,
              textId,
              'text'
            );
            newX = snappedPoint.x;
            newY = snappedPoint.y;
          }
          
          // Calculate delta from current position to apply movement
          const currentText = texts.find((t: any) => t.id === textId);
          if (currentText) {
            const deltaX = newX - currentText.x;
            const deltaY = newY - currentText.y;
            if (Math.abs(deltaX) > 0.001 || Math.abs(deltaY) > 0.001) {
              moveText(textId, { x: deltaX, y: deltaY });
            }
          }
        }
      });
      
      // Move selected images
      console.log('handlePointerMove - Attempting to move images:', Object.keys(this.state.dragStartImagePositions).length);
      Object.keys(this.state.dragStartImagePositions).forEach((imageId: string) => {
        const start = this.state.dragStartImagePositions[imageId];
        if (start) {
          let newX = start.x + dx;
          let newY = start.y + dy;
          
          // Apply grid snapping if enabled
          if (grid.snapToGrid) {
            const snapped = snapToGrid({ x: newX, y: newY }, grid.size);
            newX = snapped.x;
            newY = snapped.y;
          }
          
          // Calculate delta for moveImage function
          const currentImage = this.editorStore.images.find((img: any) => img.id === imageId);
          if (currentImage) {
            const deltaX = newX - currentImage.x;
            const deltaY = newY - currentImage.y;
            if (Math.abs(deltaX) > 0.001 || Math.abs(deltaY) > 0.001) {
              moveImage(imageId, { x: deltaX, y: deltaY });
            }
          }
        }
      });
      
      // Move selected use elements
      Object.keys(this.state.dragStartUsePositions).forEach((useId: string) => {
        const start = this.state.dragStartUsePositions[useId];
        if (start) {
          let newX = start.x + dx;
          let newY = start.y + dy;
          
          // Apply grid snapping if enabled
          if (grid.snapToGrid) {
            const snapped = snapToGrid({ x: newX, y: newY }, grid.size);
            newX = snapped.x;
            newY = snapped.y;
          }
          
          // Calculate delta for moveUse function
          const currentUse = this.editorStore.uses.find((u: any) => u.id === useId);
          if (currentUse) {
            const deltaX = newX - (currentUse.x || 0);
            const deltaY = newY - (currentUse.y || 0);
            if (Math.abs(deltaX) > 0.001 || Math.abs(deltaY) > 0.001) {
              moveUse(useId, { x: deltaX, y: deltaY });
            }
          }
        }
      });
      
      // Move selected groups by updating their transform
      Object.keys(this.state.dragStartGroupPositions).forEach((groupId: string) => {
        const start = this.state.dragStartGroupPositions[groupId];
        if (start) {
          // Apply translation to the group's transform
          let currentTransform = start.transform || '';
          
          // Parse existing transform or create new one
          let translationX = dx;
          let translationY = dy;
          
          // If there's already a translate in the transform, we need to add to it
          const translateMatch = currentTransform.match(/translate\(([^,)]+)[,\s]+([^)]+)\)/);
          if (translateMatch) {
            const existingX = parseFloat(translateMatch[1]) || 0;
            const existingY = parseFloat(translateMatch[2]) || 0;
            translationX = existingX + dx;
            translationY = existingY + dy;
            
            // Replace existing translate
            currentTransform = currentTransform.replace(/translate\([^)]+\)/, `translate(${translationX}, ${translationY})`);
          } else {
            // Add new translate at the beginning
            currentTransform = `translate(${translationX}, ${translationY}) ${currentTransform}`.trim();
          }
          
          // Apply grid snapping if enabled
          if (grid.snapToGrid) {
            const snapped = snapToGrid({ x: translationX, y: translationY }, grid.size);
            translationX = snapped.x;
            translationY = snapped.y;
            
            // Update transform with snapped values
            if (translateMatch) {
              currentTransform = currentTransform.replace(/translate\([^)]+\)/, `translate(${translationX}, ${translationY})`);
            } else {
              currentTransform = `translate(${translationX}, ${translationY}) ${currentTransform.replace(/^translate\([^)]+\)\s*/, '')}`.trim();
            }
          }
          
          // Update group transform
          const { moveGroup } = this.editorStore;
          if (moveGroup) {
            moveGroup(groupId, { transform: currentTransform });
          }
        }
      });
      
      // Update transform bounds in real-time during movement
      transformManager.updateTransformState();
      
      return true;
    }
    return false;
  };

  handlePointerUp = (e: PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
    const wasHandling = !!(this.state.draggingCommand || this.state.draggingControlPoint || this.state.draggingElement || this.state.isPanning);
    const wasDraggingCommand = !!this.state.draggingCommand;
    const wasDraggingControlPoint = !!this.state.draggingControlPoint;
    const wasDraggingElement = !!this.state.draggingElement;
    if (wasDraggingControlPoint && this.state.draggingControlPoint) {
      figmaHandleManager.endDragHandle();
    }
    this.state.draggingCommand = null;
    this.state.draggingControlPoint = null;
    this.state.draggingElement = null;
    this.state.isPanning = false;
    this.state.dragStartPositions = {};
    this.state.dragStartTextPositions = {};
    this.state.dragStartImagePositions = {};
    this.state.dragStartUsePositions = {};
    this.state.dragStartGroupPositions = {};
    this.state.dragOrigin = null;
    
    // Clear guidelines when dragging stops
    const { enabledFeatures } = this.editorStore;
    if (enabledFeatures?.guidelinesEnabled) {
      guidelinesManager.clearSnap();
    }
    
    if (wasDraggingCommand || wasDraggingControlPoint || wasDraggingElement) {
      transformManager.setMoving(false);
    }
    if (this.state.isSpacePressed) {
      const svg = (e.target as Element).closest('svg');
      if (svg) svg.style.cursor = 'grab';
    }
    return wasHandling;
  };

  handleWheel = (e: WheelEvent<SVGElement>, context: PointerEventContext): boolean => {
    const { setZoom, viewport } = this.editorStore;
    
    // Only preventDefault if the event is cancelable (not in a passive listener)
    if (e.cancelable) {
      e.preventDefault();
    }
    
    // Usar clientX/clientY del WheelEvent para calcular el punto
    const point = { x: e.clientX, y: e.clientY };
    const zoomFactor = 1 - e.deltaY * 0.001;
    setZoom(viewport.zoom * zoomFactor, point);
    return true;
  };

  getCursor(): string {
    if (this.state.isPanning) return 'grabbing';
    if (this.state.isSpacePressed) return 'grab';
    if (this.state.draggingCommand || this.state.draggingControlPoint || this.state.draggingElement) return 'grabbing';
    return 'default';
  }

  cleanup() {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
  }
}

const pointerManager = new PointerInteractionManager();

export const usePointerInteraction = () => {
  return {
    getCursor: () => pointerManager.getCursor(),
  };
};

export const PointerInteractionPlugin: Plugin = {
  id: 'pointer-interaction',
  name: 'Pointer Interaction',
  version: '1.0.0',
  enabled: true,
  initialize: (editor) => {
    pointerManager.setEditorStore(editor);
  },
  pointerHandlers: {
    onPointerDown: pointerManager.handlePointerDown,
    onPointerMove: pointerManager.handlePointerMove,
    onPointerUp: pointerManager.handlePointerUp,
    onWheel: pointerManager.handleWheel,
  },
};
