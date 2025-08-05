import React, { PointerEvent, WheelEvent } from 'react';
import { Plugin, PointerEventContext } from '../../core/PluginSystem';
import { snapToGrid, getCommandPosition } from '../../utils/path-utils';
import { getSVGPoint } from '../../utils/transform-utils';
import { moveAllCapturedElementsByDelta, captureAllSelectedElementsPositions, DraggedElementsData } from '../../utils/drag-utils';
import { useEditorStore } from '../../store/editorStore';
import { 
  ElementType, 
  SelectionContext, 
  isElementSelected, 
  hasMultiSelection, 
  isElementInSelectedGroup, 
  shouldPreserveSelection,
  logSelectionDebug 
} from '../../utils/selection-utils';
import { transformManager } from '../transform/TransformManager';
import { handleManager } from '../handles/HandleManager';
import { stickyManager } from '../sticky-guidelines/StickyManager';

// ================== TYPES & INTERFACES ==================

interface Point {
  x: number;
  y: number;
}

interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ControlPoint {
  commandId: string;
  point: string;
}

interface DraggedElement {
  id: string;
  type: ElementType;
  initialBounds?: ElementBounds;
}

interface KeyModifiers {
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
  meta: boolean;
}

interface ElementSnapshot {
  id: string;
  type: ElementType;
  initialPosition: Point;
  currentPosition: Point;
  bounds?: ElementBounds;
}

interface SelectedElements {
  commands: string[];
  texts: string[];
  images: string[];
  uses: string[];
  textPaths: string[];
  groups: string[];
  subPaths: string[];
}

interface PointerInteractionConfig {
  snapToGrid: boolean;
  gridSize: number;
  enableStickyGuidelines: boolean;
  doubleClickThreshold: number;
  dragThreshold: number;
  debugMode: boolean;
}

interface DragState {
  isDragging: boolean;
  draggedElements: Map<string, ElementSnapshot>;
  origin: Point | null;
  current: Point | null;
  type: 'command' | 'element' | 'controlPoint' | null;
}

type DragAction = 
  | { type: 'START_DRAG'; elements: SelectedElements; origin: Point; dragType: 'command' | 'element' | 'controlPoint' }
  | { type: 'UPDATE_DRAG'; position: Point }
  | { type: 'END_DRAG' }
  | { type: 'RESET' };

interface PointerInteractionState {
  draggingCommand: string | null;
  draggingControlPoint: ControlPoint | null;
  draggingElement: DraggedElement | null;
  isPanning: boolean;
  isSpacePressed: boolean;
  lastPointerPosition: Point;
  dragState: DragState;
  selectionBounds: ElementBounds | null;
}

// ================== UTILITY FUNCTIONS ==================

function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

function createInitialDragState(): DragState {
  return {
    isDragging: false,
    draggedElements: new Map(),
    origin: null,
    current: null,
    type: null,
  };
}

function dragReducer(state: DragState, action: DragAction): DragState {
  switch (action.type) {
    case 'START_DRAG':
      return {
        ...state,
        isDragging: true,
        origin: action.origin,
        current: action.origin,
        type: action.dragType,
      };
    case 'UPDATE_DRAG':
      return {
        ...state,
        current: action.position,
      };
    case 'END_DRAG':
    case 'RESET':
      return createInitialDragState();
    default:
      return state;
  }
}

// ================== SPECIALIZED CLASSES ==================

class ElementSelector {
  private editorStore: any;
  private config: PointerInteractionConfig;
  private debugManager: DebugManager;

  constructor(editorStore: any, config: PointerInteractionConfig, debugManager: DebugManager) {
    this.editorStore = editorStore;
    this.config = config;
    this.debugManager = debugManager;
  }

  updateStore(store: any): void {
    this.editorStore = store;
  }

  selectElement(elementId: string, elementType: ElementType, modifiers: KeyModifiers): void {
    const { selection } = this.editorStore;
    
    this.debugManager.logSelection('ElementSelector.selectElement called with', {
      elementId,
      elementType,
      currentSelection: {
        texts: selection.selectedTexts || [],
        images: selection.selectedImages || [],
        uses: selection.selectedUses || [],
        groups: selection.selectedGroups || []
      }
    });

    if (modifiers.shift) {
      this.handleShiftSelection(elementId, elementType);
    } else {
      this.handleNormalSelection(elementId, elementType);
    }
    
    // Log selection after operation
    const newSelection = this.editorStore.selection;
    this.debugManager.logSelection('Selection after operation', {
      texts: newSelection.selectedTexts || [],
      images: newSelection.selectedImages || [],
      uses: newSelection.selectedUses || [],
      groups: newSelection.selectedGroups || []
    });
  }

  private handleShiftSelection(elementId: string, elementType: ElementType): void {
    const context: SelectionContext = {
      selection: this.editorStore.selection,
      groups: this.editorStore.groups,
      paths: this.editorStore.paths
    };
    
    const isSelected = isElementSelected(elementId, elementType, context.selection);
    
    if (isSelected) {
      this.removeFromSelection(elementId, elementType);
    } else {
      this.addToSelection(elementId, elementType);
    }
  }

  private handleNormalSelection(elementId: string, elementType: ElementType): void {
    const context: SelectionContext = {
      selection: this.editorStore.selection,
      groups: this.editorStore.groups,
      paths: this.editorStore.paths
    };

    logSelectionDebug('handleNormalSelection', elementId, elementType, context, this.config.debugMode);

    if (shouldPreserveSelection(elementId, elementType, context)) {
      this.debugManager.logSelection('Selection preserved - element belongs to selected group or already selected', {});
      return;
    }

    const hasMulti = hasMultiSelection(context.selection);
    if (hasMulti) {
      // Add to existing multi-selection
      this.debugManager.logSelection('Adding to existing multi-selection', {});
      this.addToSelectionWithoutPromotion(elementId, elementType);
    } else {
      // Normal single selection
      this.debugManager.logSelection('Performing normal single selection', {});
      this.selectSingle(elementId, elementType);
    }
  }

  private addToSelection(elementId: string, elementType: ElementType): void {
    this.editorStore.addToSelection(elementId, elementType);
  }

  private removeFromSelection(elementId: string, elementType: ElementType): void {
    this.editorStore.removeFromSelection(elementId, elementType);
  }

  private selectSingle(elementId: string, elementType: ElementType): void {
    this.debugManager.logSelection('selectSingle called with', { elementId, elementType });
    
    switch (elementType) {
      case 'image': 
        this.debugManager.logSelection('Calling selectImage', {});
        this.editorStore.selectImage(elementId); 
        break;
      case 'use': 
        this.debugManager.logSelection('Calling selectUse', {});
        this.editorStore.selectUse(elementId); 
        break;
      case 'text': 
        this.debugManager.logSelection('Calling selectText', {});
        this.editorStore.selectText(elementId); 
        break;
      case 'textPath': 
        this.debugManager.logSelection('Calling selectTextPath', {});
        this.editorStore.selectTextPath(elementId); 
        break;
      case 'group': 
        this.debugManager.logSelection('Calling selectGroup', {});
        this.editorStore.selectGroup(elementId); 
        break;
      case 'command': 
        this.debugManager.logSelection('Calling selectCommand', {});
        this.editorStore.selectCommand(elementId); 
        break;
      case 'subpath': 
        this.debugManager.logSelection('Calling selectSubPath', {});
        this.editorStore.selectSubPath(elementId); 
        break;
    }
  }

  private addToSelectionWithoutPromotion(elementId: string, elementType: ElementType): void {
    const currentState = useEditorStore.getState();
    const newSelection = { ...currentState.selection };
    
    switch (elementType) {
      case 'image':
        if (!newSelection.selectedImages.includes(elementId)) {
          newSelection.selectedImages = [...newSelection.selectedImages, elementId];
        }
        break;
      case 'use':
        if (!newSelection.selectedUses.includes(elementId)) {
          newSelection.selectedUses = [...newSelection.selectedUses, elementId];
        }
        break;
      case 'text':
        if (!newSelection.selectedTexts.includes(elementId)) {
          newSelection.selectedTexts = [...newSelection.selectedTexts, elementId];
        }
        break;
      case 'textPath':
        if (!newSelection.selectedTextPaths.includes(elementId)) {
          newSelection.selectedTextPaths = [...newSelection.selectedTextPaths, elementId];
        }
        break;
      case 'group':
        if (!newSelection.selectedGroups.includes(elementId)) {
          newSelection.selectedGroups = [...newSelection.selectedGroups, elementId];
        }
        break;
      case 'command':
        if (!newSelection.selectedCommands.includes(elementId)) {
          newSelection.selectedCommands = [...newSelection.selectedCommands, elementId];
        }
        break;
      case 'subpath':
        if (!newSelection.selectedSubPaths.includes(elementId)) {
          newSelection.selectedSubPaths = [...newSelection.selectedSubPaths, elementId];
        }
        break;
    }
    
    useEditorStore.setState({ selection: newSelection });
  }
}

class DragManager {
  private editorStore: any;
  private config: PointerInteractionConfig;
  private elementSnapshots: Map<string, ElementSnapshot> = new Map();
  private capturedElementsData: DraggedElementsData | null = null;
  private lastDelta: Point = { x: 0, y: 0 }; // Track last applied delta
  private instanceId: string;
  private debugManager: DebugManager;

  constructor(editorStore: any, config: PointerInteractionConfig, debugManager: DebugManager) {
    this.editorStore = editorStore;
    this.config = config;
    this.debugManager = debugManager;
    this.instanceId = `DragManager-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.debugManager.logDragManager('created with instanceId', this.instanceId);
  }

  updateStore(store: any): void {
    this.editorStore = store;
  }

  startDrag(elements: SelectedElements, origin: Point): void {
    this.debugManager.logDragOperation('Starting drag with elements', elements);
    this.debugManager.logDragManager('instanceId in startDrag', this.instanceId);
    
    // Use centralized utility to capture elements instead of individual snapshots
    this.capturedElementsData = captureAllSelectedElementsPositions();
    this.debugManager.logDragOperation('Captured elements data', this.capturedElementsData);
    
    // Reset last delta
    this.lastDelta = { x: 0, y: 0 };
    
    transformManager.setMoving(true);
    this.editorStore.pushToHistory();
  }

  updateDrag(delta: Point): void {
    this.debugManager.logDragOperation('Updating drag with delta', delta);
    this.debugManager.logDragManager('instanceId in updateDrag', this.instanceId);
    this.debugManager.logDragOperation('Element snapshots count', this.elementSnapshots.size);
    
    // Don't use sticky guidelines for now - just apply the raw delta
    // const snappedDelta = this.applyStickyGuidelines(delta);
    const snappedDelta = delta;
    
    // Calculate incremental delta (difference from last applied delta)
    const incrementalDelta = {
      x: snappedDelta.x - this.lastDelta.x,
      y: snappedDelta.y - this.lastDelta.y
    };
    
    this.debugManager.logDragOperation('Incremental delta', incrementalDelta);
    
    // Only apply movement if there's a meaningful change
    if (Math.abs(incrementalDelta.x) > 0.001 || Math.abs(incrementalDelta.y) > 0.001) {
      // Apply incremental movement directly using existing move functions
      // This is more efficient than the batch utility for real-time dragging
      const selection = this.editorStore.selection;
      
      // Move commands
      selection.selectedCommands?.forEach((commandId: string) => {
        // Find current command position
        let currentPosition: { x: number; y: number } | null = null;
        this.editorStore.paths.forEach((path: any) => {
          path.subPaths.forEach((subPath: any) => {
            const command = subPath.commands.find((cmd: any) => cmd.id === commandId);
            if (command && command.x !== undefined && command.y !== undefined) {
              currentPosition = { x: command.x, y: command.y };
            }
          });
        });
        
        if (currentPosition) {
          const newPosition = {
            x: (currentPosition as { x: number; y: number }).x + incrementalDelta.x,  
            y: (currentPosition as { x: number; y: number }).y + incrementalDelta.y
          };
          this.editorStore.moveCommand(commandId, newPosition);
        }
      });
      
      // For other element types, still use the batch utility since they handle deltas correctly
      const selectedElements = this.getSelectedElementsData();
      if (selectedElements && (
        Object.keys(selectedElements.images).length > 0 ||
        Object.keys(selectedElements.texts).length > 0 ||
        Object.keys(selectedElements.groups).length > 0 ||
        Object.keys(selectedElements.uses).length > 0
      )) {
        // Remove commands from the data since we handled them above
        const elementsWithoutCommands = {
          ...selectedElements,
          commands: {} // Clear commands to avoid double movement
        };
        moveAllCapturedElementsByDelta(
          elementsWithoutCommands,
          incrementalDelta,
          this.config.snapToGrid,
          this.config.gridSize
        );
      }
      
      // Update last applied delta for next frame
      this.lastDelta = { ...snappedDelta };
    }

    // Only update transform state if not currently moving to avoid infinite loops
    if (!transformManager.isMoving()) {
      transformManager.updateTransformState();
    }
  }

  endDrag(): void {
    this.debugManager.logDragOperation('endDrag called, clearing snapshots', this.elementSnapshots.size);
    this.debugManager.logDragManager('instanceId in endDrag', this.instanceId);
    this.elementSnapshots.clear();
    this.lastDelta = { x: 0, y: 0 }; // Reset delta tracking
    transformManager.setMoving(false);
    stickyManager.clearGuidelines();
  }

  private captureElementSnapshots(elements: SelectedElements): void {
    this.elementSnapshots.clear();
    
    this.debugManager.logElementProcessing('captureElementSnapshots called with', elements);
    
    // Get fresh store data
    const store = this.editorStore;
    const images = store.images || [];
    const uses = store.uses || [];
    const texts = store.texts || [];
    const textPaths = store.textPaths || [];
    const paths = store.paths || [];
    const groups = store.groups || [];
    
    this.debugManager.logElementProcessing('Available store data', {
      images: images.length,
      uses: uses.length,
      texts: texts.length,
      textPaths: textPaths.length,
      paths: paths.length,
      groups: groups.length
    });

    // Capture images
    if (elements.images && elements.images.length > 0) {
      elements.images.forEach(imageId => {
        this.debugManager.logElementProcessing('Processing image', imageId);
        const image = images.find((img: any) => img.id === imageId);
        this.debugManager.logElementProcessing('Looking for image', { imageId, found: !!image });
        if (image) {
          this.debugManager.logElementProcessing('Image data', { id: image.id, x: image.x, y: image.y });
          this.elementSnapshots.set(imageId, {
            id: imageId,
            type: 'image',
            initialPosition: { x: image.x, y: image.y },
            currentPosition: { x: image.x, y: image.y },
            bounds: { x: image.x, y: image.y, width: image.width, height: image.height }
          });
          this.debugManager.logElementProcessing('Added image snapshot, total snapshots', this.elementSnapshots.size);
        }
      });
    }

    // Capture use elements
    if (elements.uses && elements.uses.length > 0) {
      elements.uses.forEach(useId => {
        this.debugManager.logElementProcessing('Processing use', useId);
        const use = uses.find((u: any) => u.id === useId);
        this.debugManager.logElementProcessing('Looking for use', { useId, found: !!use });
        if (use) {
          this.debugManager.logElementProcessing('Use data', { id: use.id, x: use.x, y: use.y });
          this.elementSnapshots.set(useId, {
            id: useId,
            type: 'use',
            initialPosition: { x: use.x || 0, y: use.y || 0 },
            currentPosition: { x: use.x || 0, y: use.y || 0 },
            bounds: { x: use.x || 0, y: use.y || 0, width: use.width || 0, height: use.height || 0 }
          });
          this.debugManager.logElementProcessing('Added use snapshot, total snapshots', this.elementSnapshots.size);
        }
      });
    }

    // Capture texts
    if (elements.texts && elements.texts.length > 0) {
      elements.texts.forEach(textId => {
        this.debugManager.logElementProcessing('Processing text', textId);
        const text = texts.find((t: any) => t.id === textId);
        this.debugManager.logElementProcessing('Looking for text', { textId, found: !!text });
        if (text) {
          this.debugManager.logElementProcessing('Text data', { id: text.id, x: text.x, y: text.y });
          this.elementSnapshots.set(textId, {
            id: textId,
            type: 'text',
            initialPosition: { x: text.x, y: text.y },
            currentPosition: { x: text.x, y: text.y }
          });
          this.debugManager.logElementProcessing('Added text snapshot, total snapshots', this.elementSnapshots.size);
        }
      });
    }

    // Capture textPaths
    if (elements.textPaths && elements.textPaths.length > 0) {
      elements.textPaths.forEach(textPathId => {
        this.debugManager.logElementProcessing('Processing textPath', textPathId);
        const textPath = textPaths?.find((tp: any) => tp.id === textPathId);
        this.debugManager.logElementProcessing('Looking for textPath', { textPathId, found: !!textPath });
        this.debugManager.logElementProcessing('textPaths array', textPaths);
        if (textPath) {
          this.debugManager.logElementProcessing('TextPath data', { id: textPath.id });
          this.elementSnapshots.set(textPathId, {
            id: textPathId,
            type: 'textPath',
            initialPosition: { x: 0, y: 0 }, // TextPaths follow their path
            currentPosition: { x: 0, y: 0 }
          });
          this.debugManager.logElementProcessing('Added textPath snapshot, total snapshots', this.elementSnapshots.size);
        }
      });
    }

    // Capture groups
    elements.groups.forEach(groupId => {
      const group = groups.find((g: any) => g.id === groupId);
      if (group) {
        this.elementSnapshots.set(groupId, {
          id: groupId,
          type: 'group',
          initialPosition: { x: 0, y: 0 }, // Groups use transform
          currentPosition: { x: 0, y: 0 }
        });
      }
    });

    // Capture commands
    elements.commands.forEach(commandId => {
      const command = this.findCommandById(commandId, paths);
      this.debugManager.logElementProcessing('Looking for command', { commandId, found: !!command });
      if (command) {
        const pos = getCommandPosition(command);
        if (pos) {
          this.elementSnapshots.set(commandId, {
            id: commandId,
            type: 'command',
            initialPosition: { x: pos.x, y: pos.y },
            currentPosition: { x: pos.x, y: pos.y }
          });
        }
      }
    });
    
    this.debugManager.logElementProcessing('Total snapshots captured', this.elementSnapshots.size);
    this.debugManager.logElementProcessing('Snapshot keys', Array.from(this.elementSnapshots.keys()));
  }

  private getSelectedElementsData(): DraggedElementsData {
    return this.capturedElementsData || {
      images: {},
      uses: {},
      groups: {},
      texts: {},
      commands: {},
      subPaths: {}
    };
  }

  private applyStickyGuidelines(delta: Point): Point {
    if (!this.shouldUseSticky()) {
      return delta;
    }

    // Calculate selection bounds and apply sticky guidelines
    const selectionBounds = stickyManager.calculateSelectionBounds();
    if (selectionBounds) {
      const targetPosition = {
        x: selectionBounds.x + delta.x,
        y: selectionBounds.y + delta.y
      };

      const result = stickyManager.handleSelectionMoving(targetPosition, selectionBounds);
      if (result.snappedBounds) {
        return {
          x: result.snappedBounds.x - selectionBounds.x,
          y: result.snappedBounds.y - selectionBounds.y
        };
      }
    }

    return delta;
  }

  private shouldUseSticky(): boolean {
    if (!this.config.enableStickyGuidelines) return false;
    
    const { enabledFeatures, selection } = this.editorStore;
    if (!enabledFeatures?.guidelinesEnabled) return false;

    // Skip sticky guidelines if groups are involved in multi-selection
    const hasGroupsInSelection = selection.selectedGroups && selection.selectedGroups.length > 0;
    const hasMultiSelection = this.elementSnapshots.size > 1;
    
    return !(hasGroupsInSelection && hasMultiSelection);
  }

  private moveElement(snapshot: ElementSnapshot, delta: Point): void {
    let newX = snapshot.initialPosition.x + delta.x;
    let newY = snapshot.initialPosition.y + delta.y;

    this.debugManager.logMovement('Moving element', { id: snapshot.id, type: snapshot.type });
    this.debugManager.logMovement('Initial position', snapshot.initialPosition);
    this.debugManager.logMovement('Delta', delta);
    this.debugManager.logMovement('New position', { x: newX, y: newY });

    // Apply grid snapping if enabled
    if (this.config.snapToGrid) {
      const snapped = snapToGrid({ x: newX, y: newY }, this.config.gridSize);
      newX = snapped.x;
      newY = snapped.y;
    }

    // Update current position
    snapshot.currentPosition = { x: newX, y: newY };

    // Move the actual element
    this.moveElementInStore(snapshot, { x: newX, y: newY });
  }

  /**
   * Transform a delta point by applying the inverse of a rotation transform
   * This allows proper movement of rotated elements
   */
  private transformDeltaForRotation(delta: Point, transform: string): Point {
    if (!transform) return delta;
    
    // Handle rotate(angle, cx, cy) transform
    const rotateMatch = transform.match(/rotate\(([^,]+),\s*([^,]+),\s*([^)]+)\)/);
    if (rotateMatch) {
      const angle = parseFloat(rotateMatch[1]) * Math.PI / 180; // Convert to radians
      
      // Apply inverse rotation to the delta (rotate by -angle)
      const cos = Math.cos(-angle);
      const sin = Math.sin(-angle);
      
      return {
        x: delta.x * cos - delta.y * sin,
        y: delta.x * sin + delta.y * cos
      };
    }
    
    return delta;
  }

  private moveElementInStore(snapshot: ElementSnapshot, newPosition: Point): void {
    const { moveImage, moveUse, moveText, moveGroup, moveCommand } = this.editorStore;
    
    this.debugManager.logMovement('moveElementInStore called for', { id: snapshot.id, type: snapshot.type });

    switch (snapshot.type) {
      case 'image':
        const currentImage = this.editorStore.images.find((img: any) => img.id === snapshot.id);
        if (currentImage) {
          let delta = { x: newPosition.x - currentImage.x, y: newPosition.y - currentImage.y };
          
          // If image has rotation transform, apply inverse rotation to delta
          if (currentImage.transform) {
            delta = this.transformDeltaForRotation(delta, currentImage.transform);
          }
          
          this.debugManager.logMovement('Image delta', delta);
          if (Math.abs(delta.x) > 0.001 || Math.abs(delta.y) > 0.001) {
            moveImage(snapshot.id, delta);
          }
        } else {
          this.debugManager.logMovement('Image not found', snapshot.id);
        }
        break;

      case 'use':
        const currentUse = this.editorStore.uses.find((u: any) => u.id === snapshot.id);
        if (currentUse) {
          const deltaX = newPosition.x - (currentUse.x || 0);
          const deltaY = newPosition.y - (currentUse.y || 0);
          this.debugManager.logMovement('Use delta', { deltaX, deltaY });
          if (Math.abs(deltaX) > 0.001 || Math.abs(deltaY) > 0.001) {
            moveUse(snapshot.id, { x: deltaX, y: deltaY });
          }
        } else {
          this.debugManager.logMovement('Use not found', snapshot.id);
        }
        break;

      case 'text':
        const currentText = this.editorStore.texts.find((t: any) => t.id === snapshot.id);
        if (currentText) {
          const deltaX = newPosition.x - currentText.x;
          const deltaY = newPosition.y - currentText.y;
          this.debugManager.logMovement('Text delta', { deltaX, deltaY });
          if (Math.abs(deltaX) > 0.001 || Math.abs(deltaY) > 0.001) {
            moveText(snapshot.id, { x: deltaX, y: deltaY });
          }
        } else {
          this.debugManager.logMovement('Text not found', snapshot.id);
        }
        break;

      case 'group':
        // Groups use relative movement - calculate delta from last movement
        const deltaFromCurrent = {
          x: newPosition.x - snapshot.currentPosition.x,
          y: newPosition.y - snapshot.currentPosition.y
        };
        
        this.debugManager.logMovement('Group delta', deltaFromCurrent);
        if (Math.abs(deltaFromCurrent.x) > 0.001 || Math.abs(deltaFromCurrent.y) > 0.001) {
          moveGroup(snapshot.id, deltaFromCurrent);
        }
        break;

      case 'command':
        this.debugManager.logMovement('Command move to', newPosition);
        moveCommand(snapshot.id, newPosition);
        break;
        
      default:
        this.debugManager.logMovement('Unknown element type', snapshot.type);
    }
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
}

class PanZoomManager {
  private editorStore: any;
  private config: PointerInteractionConfig;

  constructor(editorStore: any, config: PointerInteractionConfig) {
    this.editorStore = editorStore;
    this.config = config;
  }

  updateStore(store: any): void {
    this.editorStore = store;
  }

  handlePan(delta: Point): void {
    this.editorStore.pan(delta);
  }

  handleZoom(factor: number, center: Point): void {
    const { setZoom, viewport } = this.editorStore;
    const newZoom = Math.max(0.1, Math.min(viewport.zoom * factor, 20));
    setZoom(newZoom, center);
  }
}

class DebugManager {
  private config: PointerInteractionConfig;

  constructor(config: PointerInteractionConfig) {
    this.config = config;
  }

  logElementDetection(data: any): void {
    if (this.config.debugMode) {
      console.log('[DEBUG] Element detected:', data);
    }
  }

  logDragOperation(operation: string, data: any): void {
    if (this.config.debugMode) {
      console.log(`[DEBUG] ${operation}:`, data);
    }
  }

  logSelection(operation: string, data: any): void {
    if (this.config.debugMode) {
      console.log(`[DEBUG] ${operation}:`, data);
    }
  }

  logDragManager(operation: string, data: any): void {
    if (this.config.debugMode) {
      console.log(`[DEBUG] DragManager ${operation}:`, data);
    }
  }

  logElementProcessing(operation: string, data: any): void {
    if (this.config.debugMode) {
      console.log(`[DEBUG] ${operation}:`, data);
    }
  }

  logMovement(operation: string, data: any): void {
    if (this.config.debugMode) {
      console.log(`[DEBUG] ${operation}:`, data);
    }
  }

  logGeneric(message: string, data?: any): void {
    if (this.config.debugMode) {
      if (data !== undefined) {
        console.log(`[DEBUG] ${message}:`, data);
      } else {
        console.log(`[DEBUG] ${message}`);
      }
    }
  }
}

// ================== MAIN MANAGER CLASS ==================

class PointerInteractionManager {
  private state: PointerInteractionState;
  private editorStore: any;
  private config: PointerInteractionConfig;
  
  // Specialized managers
  private elementSelector!: ElementSelector;
  private dragManager!: DragManager;
  private panZoomManager!: PanZoomManager;
  private debugManager!: DebugManager;
  
  // Performance optimizations
  private elementCache = new Map<string, SVGElement>();
  private updateStickyGuidelines!: ReturnType<typeof debounce>;

  constructor() {
    this.config = {
      snapToGrid: false,
      gridSize: 10,
      enableStickyGuidelines: true,
      doubleClickThreshold: 300,
      dragThreshold: 3,
      debugMode: false
    };

    this.state = {
      draggingCommand: null,
      draggingControlPoint: null,
      draggingElement: null,
      isPanning: false,
      isSpacePressed: false,
      lastPointerPosition: { x: 0, y: 0 },
      dragState: createInitialDragState(),
      selectionBounds: null,
    };

    // Initialize debounced function after config is set
    this.updateStickyGuidelines = debounce(this.doUpdateStickyGuidelines.bind(this), 16);

    this.setupKeyboardListeners();
    this.initializeManagers();
  }

  private initializeManagers(): void {
    // DebugManager can be initialized immediately
    this.debugManager = new DebugManager(this.config);
    // Other managers will be initialized when editorStore is set
  }

  setEditorStore(store: any): void {
    this.editorStore = store;
    
    // Only create managers if they don't exist yet to preserve state
    if (!this.elementSelector) {
      this.elementSelector = new ElementSelector(store, this.config, this.debugManager);
    } else {
      // Update the store reference in existing instance
      this.elementSelector.updateStore(store);
    }
    
    if (!this.dragManager) {
      this.dragManager = new DragManager(store, this.config, this.debugManager);
    } else {
      // Update the store reference in existing instance
      this.dragManager.updateStore(store);
    }
    
    if (!this.panZoomManager) {
      this.panZoomManager = new PanZoomManager(store, this.config);
    } else {
      // Update the store reference in existing instance
      this.panZoomManager.updateStore(store);
    }
  }

  private setupKeyboardListeners(): void {
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (this.isEditableElementFocused(e.target)) return;

    if (e.code === 'Space' && !e.repeat) {
      e.preventDefault();
      this.state.isSpacePressed = true;
      this.updateCursorForSpaceMode(true);
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    if (this.isEditableElementFocused(e.target)) return;

    if (e.code === 'Space') {
      e.preventDefault();
      this.state.isSpacePressed = false;
      this.state.isPanning = false;
      this.updateCursorForSpaceMode(false);
    }
  };

  private isEditableElementFocused(target: EventTarget | null): boolean {
    const element = target as HTMLElement | null;
    return Boolean(element && (
      element.tagName === 'INPUT' ||
      element.tagName === 'TEXTAREA' ||
      element.isContentEditable
    ));
  }

  private updateCursorForSpaceMode(isSpacePressed: boolean): void {
    const svgElements = document.querySelectorAll('svg');
    svgElements.forEach(svg => {
      svg.style.cursor = isSpacePressed ? 'grab' : 'default';
    });
  }

  private getKeyModifiers(e: PointerEvent<SVGElement>): KeyModifiers {
    return {
      shift: e.shiftKey,
      ctrl: e.ctrlKey,
      alt: e.altKey,
      meta: e.metaKey,
    };
  }

  private findElementWithData(element: SVGElement, svgRef: React.RefObject<SVGSVGElement | null>): { elementType: string | null; elementId: string | null } {
    let current: Element | null = element;
    
    const getClassName = (el: Element) => {
      if (el instanceof SVGElement && el.className && typeof el.className === 'object' && 'baseVal' in el.className) {
        return el.className.baseVal;
      }
      return (el as any).className || '';
    };
    
    this.debugManager.logGeneric('findElementWithData called with element', {
      tagName: element.tagName,
      className: getClassName(element),
      id: element.id,
      attributes: Array.from(element.attributes).map(attr => ({ name: attr.name, value: attr.value }))
    });
    
    // Special check for subpaths at the start
    if (current && current.getAttribute('data-element-type') === 'subpath') {
      this.debugManager.logGeneric('🔥 FOUND SUBPATH DIRECTLY!', {
        elementType: 'subpath',
        elementId: current.getAttribute('data-element-id'),
        tagName: current.tagName
      });
    }
    
    while (current && current !== svgRef.current) {
      const elementType = current.getAttribute('data-element-type');
      const elementId = current.getAttribute('data-element-id');
      
      this.debugManager.logGeneric('Checking element', {
        tagName: current.tagName,
        elementType,
        elementId,
        className: getClassName(current),
        id: current.id,
        attributes: Array.from(current.attributes).map(attr => ({ name: attr.name, value: attr.value }))
      });
      
      // Special logging for subpaths
      if (elementType === 'subpath') {
        this.debugManager.logGeneric('🔥 SUBPATH DETECTED!', { elementType, elementId });
      }
      
      if (elementType && elementId) {
        this.debugManager.logGeneric('Found element with data', { elementType, elementId });
        return { elementType, elementId };
      }
      
      current = current.parentElement;
    }
    
    this.debugManager.logGeneric('No element with data found');
    return { elementType: null, elementId: null };
  }

  private getSelectedElements(): SelectedElements {
    const { selection } = this.editorStore;
    return {
      commands: selection.selectedCommands || [],
      texts: selection.selectedTexts || [],
      images: selection.selectedImages || [],
      uses: selection.selectedUses || [],
      textPaths: selection.selectedTextPaths || [],
      groups: selection.selectedGroups || [],
      subPaths: selection.selectedSubPaths || [],
    };
  }

  private dispatchDragAction(action: DragAction): void {
    this.state.dragState = dragReducer(this.state.dragState, action);
  }

  private doUpdateStickyGuidelines(): void {
    // Implementation for sticky guidelines update
    if (this.config.enableStickyGuidelines && this.state.dragState.isDragging) {
      // Update sticky guidelines based on current drag state
    }
  }

  getSVGPoint(e: PointerEvent<SVGElement>, svgRef: React.RefObject<SVGSVGElement | null>): Point {
    return getSVGPoint(e, svgRef, this.editorStore.viewport);
  }

  // ================== EVENT HANDLERS ==================

  handlePointerDown = (e: PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
    const { commandId, controlPoint } = context;
    const target = e.target as SVGElement;
    const modifiers = this.getKeyModifiers(e);
    
    // Always log pointer down to verify the method is called
    this.debugManager.logGeneric('🔥 POINTER DOWN FIRED!', {
      targetTag: target.tagName,
      targetDataType: target.getAttribute('data-element-type'),
      targetDataId: target.getAttribute('data-element-id'),
      clickX: e.clientX,
      clickY: e.clientY
    });
    
    // DEBUG: Log the click target
    this.debugManager.logGeneric('Pointer down on target', {
      tagName: target.tagName,
      id: target.id,
      classList: Array.from(target.classList || []),
      dataAttributes: Array.from(target.attributes)
        .filter(attr => attr.name.startsWith('data-'))
        .map(attr => ({ name: attr.name, value: attr.value }))
    });
    
    // DEBUG: Log what elements are near the click point
    const point = this.getSVGPoint(e, context.svgRef);
    this.debugManager.logGeneric('SVG click coordinates', point);
    
    // DEBUG: Check what elements exist in the SVG
    if (context.svgRef.current) {
      const allImages = context.svgRef.current.querySelectorAll('image[data-element-id]');
      const allTexts = context.svgRef.current.querySelectorAll('text[data-element-id]');
      const allGroups = context.svgRef.current.querySelectorAll('g[data-element-id]');
      const allSubpaths = context.svgRef.current.querySelectorAll('path[data-element-type="subpath"]');
      
      this.debugManager.logGeneric('Elements in SVG', {
        images: allImages.length,
        texts: allTexts.length,
        groups: allGroups.length,
        subpaths: allSubpaths.length,
        imageIds: Array.from(allImages).map(img => img.getAttribute('data-element-id')),
        textIds: Array.from(allTexts).map(text => text.getAttribute('data-element-id')),
        subpathIds: Array.from(allSubpaths).map(sp => sp.getAttribute('data-element-id'))
      });
      
      // DEBUG: Check if any image/text is at the click coordinates
      const elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY);
      this.debugManager.logGeneric('Elements from point', {
        count: elementsAtPoint.length,
        elements: elementsAtPoint.map(el => ({
          tagName: el.tagName,
          id: el.id,
          className: el.className,
          dataType: el.getAttribute('data-element-type'),
          dataId: el.getAttribute('data-element-id')
        }))
      });
      
      // Special check for subpaths at point
      const subpathsAtPoint = elementsAtPoint.filter(el => el.getAttribute('data-element-type') === 'subpath');
      if (subpathsAtPoint.length > 0) {
        this.debugManager.logGeneric('🔥 SUBPATHS AT CLICK POINT!', {
          count: subpathsAtPoint.length,
          subpaths: subpathsAtPoint.map(sp => ({
            elementId: sp.getAttribute('data-element-id'),
            tagName: sp.tagName
          }))
        });
      }
    }
    
    // Handle space + click for panning
    if (this.state.isSpacePressed && e.button === 0) {
      e.stopPropagation();
      this.state.isPanning = true;
      this.state.lastPointerPosition = { x: e.clientX, y: e.clientY };
      const svg = target.closest('svg');
      if (svg) svg.style.cursor = 'grabbing';
      return true;
    }

    // Handle middle mouse button for panning
    if (e.button === 1) {
      e.stopPropagation();
      this.state.isPanning = true;
      this.state.lastPointerPosition = { x: e.clientX, y: e.clientY };
      return true;
    }

    // Handle control point dragging
    if (commandId && controlPoint && !this.state.isSpacePressed) {
      e.stopPropagation();
      this.state.draggingControlPoint = { commandId, point: controlPoint };
      const startPoint = this.getSVGPoint(e, context.svgRef);
      const handleType = controlPoint === 'x1y1' ? 'outgoing' : 'incoming';
      handleManager.startDragHandle(commandId, handleType, startPoint);
      transformManager.setMoving(true);
      this.editorStore.pushToHistory();
      return true;
    }

    // Find element under cursor
    const { elementType, elementId } = this.findElementWithData(target, context.svgRef);
    
    this.debugManager.logElementDetection({
      commandId,
      controlPoint,
      elementType,
      elementId,
      modifiers,
    });

    // Handle element selection and dragging
    if (elementType && elementId && !this.state.isSpacePressed) {
      e.stopPropagation();
      
      const elementTypeTyped = elementType as ElementType;
      
      // DEBUG: Log what's being detected and selected
      this.debugManager.logElementDetection({
        elementType: elementTypeTyped,
        elementId,
        modifiers
      });
      
      // Special logging for subpaths
      if (elementTypeTyped === 'subpath') {
        this.debugManager.logGeneric('🔥 SUBPATH SELECTION ATTEMPT!', {
          elementId,
          elementType: elementTypeTyped,
          modifiers
        });
      }
      
      // Handle shift-click for multi-selection
      if (modifiers.shift) {
        this.elementSelector.selectElement(elementId, elementTypeTyped, modifiers);
        return true;
      }

      // Normal selection and drag preparation
      this.elementSelector.selectElement(elementId, elementTypeTyped, modifiers);
      
      // DEBUG: Log selection after element selection
      const selectedElements = this.getSelectedElements();
      this.debugManager.logSelection('Selected elements after selection', selectedElements);
      
      this.state.draggingElement = { id: elementId, type: elementTypeTyped };
      
      // Start drag operation
      const origin = this.getSVGPoint(e, context.svgRef);
      
      this.dragManager.startDrag(selectedElements, origin);
      this.dispatchDragAction({
        type: 'START_DRAG',
        elements: selectedElements,
        origin,
        dragType: 'element'
      });

      return true;
    }

    // Handle command selection and dragging
    if (commandId && !this.state.isSpacePressed) {
      e.stopPropagation();
      
      this.elementSelector.selectElement(commandId, 'command', modifiers);
      this.state.draggingCommand = commandId;
      
      const selectedElements = this.getSelectedElements();
      const origin = this.getSVGPoint(e, context.svgRef);
      
      this.dragManager.startDrag(selectedElements, origin);
      this.dispatchDragAction({
        type: 'START_DRAG',
        elements: selectedElements,
        origin,
        dragType: 'command'
      });

      handleManager.onSelectionChanged();
      return true;
    }

    return false;
  };

  handlePointerMove = (e: PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
    if (!this.editorStore) return false;

    // Handle panning
    if (this.state.isPanning) {
      const dx = e.clientX - this.state.lastPointerPosition.x;
      const dy = e.clientY - this.state.lastPointerPosition.y;
      this.panZoomManager.handlePan({ x: dx, y: dy });
      this.state.lastPointerPosition = { x: e.clientX, y: e.clientY };
      return true;
    }

    // Handle control point dragging
    if (this.state.draggingControlPoint) {
      const point = this.getSVGPoint(e, context.svgRef);
      handleManager.updateDragHandle(point);
      return true;
    }

    // Handle element/command dragging
    if (this.state.dragState.isDragging && this.state.dragState.origin) {
      const currentPoint = this.getSVGPoint(e, context.svgRef);
      const delta = {
        x: currentPoint.x - this.state.dragState.origin.x,
        y: currentPoint.y - this.state.dragState.origin.y
      };

      this.dispatchDragAction({ type: 'UPDATE_DRAG', position: currentPoint });
      this.dragManager.updateDrag(delta);
      this.updateStickyGuidelines();

      return true;
    }

    return false;
  };

  handlePointerUp = (e: PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
    const wasHandling = this.state.isPanning || 
                       !!this.state.draggingControlPoint || 
                       this.state.dragState.isDragging;

    // End control point dragging
    if (this.state.draggingControlPoint) {
      handleManager.endDragHandle();
      this.state.draggingControlPoint = null;
      transformManager.setMoving(false);
    }

    // End element/command dragging
    if (this.state.dragState.isDragging) {
      this.dragManager.endDrag();
      this.dispatchDragAction({ type: 'END_DRAG' });
    }

    // Reset state
    this.state.draggingCommand = null;
    this.state.draggingElement = null;
    this.state.isPanning = false;

    // Update cursor for space mode
    if (this.state.isSpacePressed) {
      const svg = (e.target as Element).closest('svg');
      if (svg) svg.style.cursor = 'grab';
    }

    return wasHandling;
  };

  handleWheel = (e: WheelEvent<SVGElement>, context: PointerEventContext): boolean => {
    if (e.cancelable) {
      e.preventDefault();
    }

    const center = { x: e.clientX, y: e.clientY };
    const zoomFactor = 1 - e.deltaY * 0.001;
    this.panZoomManager.handleZoom(zoomFactor, center);
    
    return true;
  };

  getCursor(): string {
    if (this.state.isPanning) return 'grabbing';
    if (this.state.isSpacePressed) return 'grab';
    if (this.state.dragState.isDragging || this.state.draggingControlPoint) return 'grabbing';
    return 'default';
  }

  cleanup(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    this.elementCache.clear();
  }
}

// ================== EXPORTS ==================

const pointerManager = new PointerInteractionManager();

export const usePointerInteraction = () => {
  return {
    getCursor: () => pointerManager.getCursor(),
  };
};

export const PointerInteractionPlugin: Plugin = {
  id: 'pointer-interaction',
  name: 'Pointer Interaction',
  version: '2.0.0',
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
