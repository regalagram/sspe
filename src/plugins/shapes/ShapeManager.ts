import { PointerEvent } from 'react';
import { PointerEventHandler, PointerEventContext, pluginManager } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { getShapeById } from './ShapeDefinitions';
import { snapToGrid } from '../../utils/path-utils';
import { toolModeManager } from '../../core/ToolModeManager';

interface ShapeCreationState {
  isCreating: boolean;
  shapeId: string | null;
  startPoint: { x: number; y: number } | null;
  currentSize: number;
  isDragging: boolean;
  dragStartPoint: { x: number; y: number } | null;
  dragCurrentPoint: { x: number; y: number } | null;
  previewSize: number;
}

export interface ShapeSettings {
  strokeColor: string;
  strokeWidth: number;
  strokeOpacity: number;
  fill: string;
  fillOpacity: number;
  strokeDasharray?: string; // Dash pattern
  strokeLinecap?: 'butt' | 'round' | 'square'; // Line cap style
  strokeLinejoin?: 'miter' | 'round' | 'bevel'; // Line join style
  fillRule?: 'nonzero' | 'evenodd'; // Fill rule
}

export class ShapeManager {
  private state: ShapeCreationState = {
    isCreating: false,
    shapeId: null,
    startPoint: null,
    currentSize: 50, // Default size
    isDragging: false,
    dragStartPoint: null,
    dragCurrentPoint: null,
    previewSize: 50
  };

  private settings: ShapeSettings = {
    strokeColor: '#0000ff',
    strokeWidth: 2,
    strokeOpacity: 1.0,
    fill: '#0078cc',
    fillOpacity: 0.3,
    strokeDasharray: 'none',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    fillRule: 'nonzero'
  };

  private editorStore: any = null;

  constructor() {
    // Registrar este manager con ToolModeManager
    toolModeManager.setShapeManager(this);
  }

  getSettings(): ShapeSettings {
    return { ...this.settings };
  }

  updateSettings(newSettings: ShapeSettings) {
    this.settings = { ...newSettings };
  }

  setEditorStore(store: any) {
    this.editorStore = store;
  }

  startShapeCreation(shapeId: string) {
        
    // Solo verificar si ya tenemos el mismo shapeId activo
    if (this.state.isCreating && this.state.shapeId === shapeId) {
            return;
    }
    
    this.state.isCreating = true;
    this.state.shapeId = shapeId;
    this.state.startPoint = null;
    // Don't reset currentSize - keep the existing size
    
    // Notify the plugin manager about shape creation mode
    pluginManager.setShapeCreationMode(true);
    
      }

  stopShapeCreation() {
    this.state.isCreating = false;
    this.state.shapeId = null;
    this.state.startPoint = null;
    this.state.isDragging = false;
    this.state.dragStartPoint = null;
    this.state.dragCurrentPoint = null;
    
    // Notify the plugin manager that shape creation mode is off
    pluginManager.setShapeCreationMode(false);
  }

  isInShapeCreationMode(): boolean {
    return this.state.isCreating && this.state.shapeId !== null;
  }

  getCurrentShapeId(): string | null {
    return this.state.shapeId;
  }

  getCurrentSize(): number {
    return this.state.currentSize;
  }

  setCurrentSize(size: number) {
    this.state.currentSize = Math.max(10, Math.min(300, size));
  }

  isDragInProgress(): boolean {
    return this.state.isDragging;
  }

  getDragStartPoint(): { x: number; y: number } | null {
    return this.state.dragStartPoint;
  }

  getDragCurrentPoint(): { x: number; y: number } | null {
    return this.state.dragCurrentPoint;
  }

  getPreviewSize(): number {
    return this.state.previewSize;
  }

  getCursor(): string {
    if (this.isInShapeCreationMode()) {
      return 'crosshair';
    }
    return 'default';
  }

  /**
   * Método para desactivación externa por ToolModeManager
   * No notifica de vuelta para evitar loops
   */
  deactivateExternally = () => {
    this.state.isCreating = false;
    this.state.shapeId = null;
    this.state.startPoint = null;
    this.state.isDragging = false;
    this.state.dragStartPoint = null;
    this.state.dragCurrentPoint = null;
    
    // Notify the plugin manager that shape creation mode is off
    pluginManager.setShapeCreationMode(false);
  };

  // Pointer event handlers
  handlePointerDown = (e: PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
    if (!this.isInShapeCreationMode() || !this.state.shapeId) {
      return false;
    }

    // Don't handle if clicking on an existing command
    if (context.commandId) {
      return false;
    }

    const point = context.svgPoint;
    const store = this.editorStore || useEditorStore.getState();
    const { grid } = store;

    // Apply grid snapping if enabled
    let finalPoint = point;
    if (grid.snapToGrid) {
      finalPoint = snapToGrid(point, grid.size);
    }

    // Start drag operation
    this.state.isDragging = true;
    this.state.dragStartPoint = finalPoint;
    this.state.dragCurrentPoint = finalPoint;
    this.state.previewSize = this.state.currentSize; // Initialize with current size

    return true;
  };

  handlePointerMove = (e: PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
    if (!this.isInShapeCreationMode() || !this.state.isDragging || !this.state.dragStartPoint) {
      return false;
    }

    const point = context.svgPoint;
    const store = this.editorStore || useEditorStore.getState();
    const { grid } = store;

    // Apply grid snapping if enabled
    let finalPoint = point;
    if (grid.snapToGrid) {
      finalPoint = snapToGrid(point, grid.size);
    }

    // Update current drag point
    this.state.dragCurrentPoint = finalPoint;

    // Calculate size based on drag distance
    const deltaX = finalPoint.x - this.state.dragStartPoint.x;
    const deltaY = finalPoint.y - this.state.dragStartPoint.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Use drag distance as size, with minimum of 10
    this.state.previewSize = Math.max(10, distance);

    return true;
  };

  handlePointerUp = (e: PointerEvent<SVGElement>, context: PointerEventContext): boolean => {
    if (!this.isInShapeCreationMode() || !this.state.isDragging || !this.state.dragStartPoint) {
      return false;
    }

    const point = context.svgPoint;
    const store = this.editorStore || useEditorStore.getState();
    const { grid } = store;

    // Apply grid snapping if enabled
    let finalPoint = point;
    if (grid.snapToGrid) {
      finalPoint = snapToGrid(point, grid.size);
    }

    // Calculate final distance
    const deltaX = finalPoint.x - this.state.dragStartPoint.x;
    const deltaY = finalPoint.y - this.state.dragStartPoint.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Determine size to use: drag distance or fallback to parameter size
    let finalSize: number;
    if (distance < 10) {
      // Use parameter size as fallback for very small drags
      finalSize = this.state.currentSize;
    } else {
      // Use drag distance as size
      finalSize = distance;
    }

    // Insert shape at drag start point with calculated size
    this.insertShape(this.state.dragStartPoint, finalSize);

    // Reset drag state
    this.state.isDragging = false;
    this.state.dragStartPoint = null;
    this.state.dragCurrentPoint = null;
    this.state.previewSize = this.state.currentSize;

    return true;
  };

  private insertShape(point: { x: number; y: number }, size?: number) {
    if (!this.state.shapeId) {
      return;
    }

    const shapeTemplate = getShapeById(this.state.shapeId);
    if (!shapeTemplate) {
      return;
    }

    const store = this.editorStore || useEditorStore.getState();
    const { addPath, replaceSubPathCommands, pushToHistory } = store;

    // Save current state to history before making changes
    pushToHistory();

    try {
      // Use provided size or fallback to current size
      const finalSize = size !== undefined ? size : this.state.currentSize;
      
      // Generate the shape commands
      const commands = shapeTemplate.generateCommands(point, finalSize);
      
      // Create a new path for the shape
      // addPath automatically creates a path with one subpath containing M 100,100
      // We'll replace those commands with our shape commands
      const pathId = addPath({
        fill: this.settings.fill,
        fillOpacity: this.settings.fillOpacity,
        stroke: 'none', // Always create shapes with no stroke
        strokeWidth: undefined,
        strokeOpacity: undefined,
        strokeLinecap: undefined,
        strokeLinejoin: undefined,
        strokeDasharray: undefined,
        fillRule: this.settings.fillRule || 'nonzero'
      });

      
      // Get the automatically created subpath ID
      const currentStore = useEditorStore.getState();
      const createdPath = currentStore.paths.find(p => p.id === pathId);
      const subPathId = createdPath?.subPaths[0]?.id;
      
            
      if (!subPathId) {
        throw new Error('Failed to find created subpath');
      }

      // Replace the default M 100,100 command with our shape commands
      replaceSubPathCommands(subPathId, commands);

      // After successfully creating the shape, return to select mode
      toolModeManager.setMode('select');
          } catch (error) {
      console.error('🔷 ShapeManager: Error inserting shape:', error);
    }
  }
}

export const shapeManager = new ShapeManager();

// Pointer event handlers for the plugin system
export const shapePointerHandlers: PointerEventHandler = {
  onPointerDown: shapeManager.handlePointerDown,
  onPointerMove: shapeManager.handlePointerMove,
  onPointerUp: shapeManager.handlePointerUp,
};
