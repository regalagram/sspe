import React, { PointerEvent, WheelEvent } from 'react';
import { Plugin, PointerEventContext } from '../../core/PluginSystem';
import { snapToGrid, getCommandPosition } from '../../utils/path-utils';
import { getSVGPoint } from '../../utils/transform-utils';
import { transformManager } from '../transform/TransformManager';
import { handleManager } from '../handles/HandleManager';
import { stickyManager } from '../sticky-guidelines/StickyManager';

// ================== TYPES & INTERFACES ==================

type ElementType = 'image' | 'use' | 'text' | 'textPath' | 'group' | 'command';

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
    const isSelected = this.isElementSelected(elementId, elementType);
    
    if (isSelected) {
      this.removeFromSelection(elementId, elementType);
    } else {
      this.addToSelection(elementId, elementType);
    }
  }

  private handleNormalSelection(elementId: string, elementType: ElementType): void {
    const isSelected = this.isElementSelected(elementId, elementType);
    const hasMultiSelection = this.hasMultiSelection();
    const belongsToSelectedGroup = this.isElementInSelectedGroup(elementId, elementType);

    this.debugManager.logSelection('handleNormalSelection', {
      elementId,
      elementType,
      isSelected,
      hasMultiSelection,
      belongsToSelectedGroup
    });

    if (!isSelected) {
      if (belongsToSelectedGroup) {
        // Element belongs to selected group, don't change selection
        this.debugManager.logSelection('Element belongs to selected group, not changing selection', {});
        return;
      } else if (hasMultiSelection) {
        // Add to existing multi-selection
        this.debugManager.logSelection('Adding to existing multi-selection', {});
        this.addToSelectionWithoutPromotion(elementId, elementType);
      } else {
        // Normal single selection
        this.debugManager.logSelection('Performing normal single selection', {});
        this.selectSingle(elementId, elementType);
      }
    } else {
      this.debugManager.logSelection('Element already selected, no action taken', {});
    }
  }

  private isElementSelected(elementId: string, elementType: ElementType): boolean {
    const { selection } = this.editorStore;
    
    switch (elementType) {
      case 'image': return selection.selectedImages?.includes(elementId) || false;
      case 'use': return selection.selectedUses?.includes(elementId) || false;
      case 'text': return selection.selectedTexts?.includes(elementId) || false;
      case 'textPath': return selection.selectedTextPaths?.includes(elementId) || false;
      case 'group': return selection.selectedGroups?.includes(elementId) || false;
      case 'command': return selection.selectedCommands?.includes(elementId) || false;
      default: return false;
    }
  }

  private hasMultiSelection(): boolean {
    const { selection } = this.editorStore;
    const totalSelected = (selection.selectedCommands?.length || 0) + 
                         (selection.selectedSubPaths?.length || 0) + 
                         (selection.selectedPaths?.length || 0) +
                         (selection.selectedTexts?.length || 0) +
                         (selection.selectedTextPaths?.length || 0) +
                         (selection.selectedImages?.length || 0) +
                         (selection.selectedUses?.length || 0) +
                         (selection.selectedGroups?.length || 0);
    return totalSelected > 1;
  }

  private isElementInSelectedGroup(elementId: string, elementType: ElementType): boolean {
    const { selection, groups } = this.editorStore;
    
    for (const groupId of selection.selectedGroups || []) {
      const group = groups.find((g: any) => g.id === groupId);
      if (group?.children?.some((child: any) => 
        child.id === elementId && child.type === elementType)) {
        return true;
      }
    }
    return false;
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
    }
  }

  private addToSelectionWithoutPromotion(elementId: string, elementType: ElementType): void {
    const currentState = this.editorStore.getState();
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
    }
    
    this.editorStore.setState({ selection: newSelection });
  }
}

class DragManager {
  private editorStore: any;
  private config: PointerInteractionConfig;
  private elementSnapshots: Map<string, ElementSnapshot> = new Map();
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
    this.captureElementSnapshots(elements);
    this.debugManager.logDragOperation('Captured snapshots', Array.from(this.elementSnapshots.keys()));
    this.debugManager.logDragOperation('Snapshots size after capture', this.elementSnapshots.size);
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
    
    this.elementSnapshots.forEach((snapshot, elementId) => {
      this.debugManager.logMovement('Moving element', { elementId, type: snapshot.type });
      this.moveElement(snapshot, snappedDelta);
    });

    transformManager.updateTransformState();
  }

  endDrag(): void {
    this.debugManager.logDragOperation('endDrag called, clearing snapshots', this.elementSnapshots.size);
    this.debugManager.logDragManager('instanceId in endDrag', this.instanceId);
    this.elementSnapshots.clear();
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

  private moveElementInStore(snapshot: ElementSnapshot, newPosition: Point): void {
    const { moveImage, moveUse, moveText, moveGroup, moveCommand } = this.editorStore;
    
    this.debugManager.logMovement('moveElementInStore called for', { id: snapshot.id, type: snapshot.type });

    switch (snapshot.type) {
      case 'image':
        const currentImage = this.editorStore.images.find((img: any) => img.id === snapshot.id);
        if (currentImage) {
          const deltaX = newPosition.x - currentImage.x;
          const deltaY = newPosition.y - currentImage.y;
          this.debugManager.logMovement('Image delta', { deltaX, deltaY });
          if (Math.abs(deltaX) > 0.001 || Math.abs(deltaY) > 0.001) {
            moveImage(snapshot.id, { x: deltaX, y: deltaY });
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
    
    while (current && current !== svgRef.current) {
      const elementType = current.getAttribute('data-element-type');
      const elementId = current.getAttribute('data-element-id');
      
      if (elementType && elementId) {
        return { elementType, elementId };
      }
      
      current = current.parentElement;
    }
    
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
