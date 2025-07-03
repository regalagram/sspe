import { MouseEvent } from 'react';
import { MouseEventHandler, MouseEventContext, pluginManager } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { SHAPE_TEMPLATES, ShapeTemplate, getShapeById } from './ShapeDefinitions';
import { snapToGrid } from '../../utils/path-utils';
import { getSVGPoint } from '../../utils/transform-utils';

interface ShapeCreationState {
  isCreating: boolean;
  shapeId: string | null;
  startPoint: { x: number; y: number } | null;
  currentSize: number;
}

export class ShapeManager {
  private state: ShapeCreationState = {
    isCreating: false,
    shapeId: null,
    startPoint: null,
    currentSize: 50 // Default size
  };

  private editorStore: any = null;

  setEditorStore(store: any) {
    this.editorStore = store;
  }

  startShapeCreation(shapeId: string) {
    console.log('🔷 ShapeManager.startShapeCreation called with shapeId:', shapeId);
    this.state.isCreating = true;
    this.state.shapeId = shapeId;
    this.state.startPoint = null;
    // Don't reset currentSize - keep the existing size
    
    // Notify the plugin manager about shape creation mode
    pluginManager.setShapeCreationMode(true);
    
    console.log('🔷 ShapeManager: Shape creation state updated:', this.state);
  }

  stopShapeCreation() {
    console.log('🔷 ShapeManager.stopShapeCreation called');
    this.state.isCreating = false;
    this.state.shapeId = null;
    this.state.startPoint = null;
    
    // Notify the plugin manager that shape creation mode is off
    pluginManager.setShapeCreationMode(false);
    
    console.log('🔷 ShapeManager: Shape creation stopped, state:', this.state);
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

  getCursor(): string {
    if (this.isInShapeCreationMode()) {
      return 'crosshair';
    }
    return 'default';
  }

  // Mouse event handlers
  handleMouseDown = (e: MouseEvent<SVGElement>, context: MouseEventContext): boolean => {
    console.log('🔷 ShapeManager.handleMouseDown called', {
      isInShapeCreationMode: this.isInShapeCreationMode(),
      shapeId: this.state.shapeId,
      commandId: context.commandId,
      svgPoint: context.svgPoint
    });

    if (!this.isInShapeCreationMode() || !this.state.shapeId) {
      console.log('🔷 ShapeManager: Not in shape creation mode or no shape selected');
      return false;
    }

    // Don't handle if clicking on an existing command
    if (context.commandId) {
      console.log('🔷 ShapeManager: Clicked on existing command, ignoring');
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

    console.log('🔷 ShapeManager: Inserting shape at point:', finalPoint);
    this.insertShape(finalPoint);
    this.stopShapeCreation();
    
    return true;
  };

  handleMouseMove = (e: MouseEvent<SVGElement>, context: MouseEventContext): boolean => {
    if (!this.isInShapeCreationMode()) {
      return false;
    }

    // Update preview or cursor behavior if needed
    return false; // Don't consume the event
  };

  handleMouseUp = (e: MouseEvent<SVGElement>, context: MouseEventContext): boolean => {
    // Shape insertion is handled in mouseDown for single-click shapes
    return false;
  };

  private insertShape(point: { x: number; y: number }) {
    console.log('🔷 ShapeManager.insertShape called with point:', point);
    console.log('🔷 ShapeManager: Current shapeId:', this.state.shapeId);
    
    if (!this.state.shapeId) {
      console.log('🔷 ShapeManager: No shapeId, returning early');
      return;
    }

    const shapeTemplate = getShapeById(this.state.shapeId);
    if (!shapeTemplate) {
      console.log('🔷 ShapeManager: No shape template found for shapeId:', this.state.shapeId);
      return;
    }

    console.log('🔷 ShapeManager: Found shape template:', shapeTemplate.name);
    
    const store = this.editorStore || useEditorStore.getState();
    const { addPath, replaceSubPathCommands, pushToHistory } = store;

    console.log('🔷 ShapeManager: Got store functions:', { addPath: !!addPath, replaceSubPathCommands: !!replaceSubPathCommands, pushToHistory: !!pushToHistory });

    // Save current state to history before making changes
    pushToHistory();

    try {
      // Generate the shape commands
      const commands = shapeTemplate.generateCommands(point, this.state.currentSize);
      console.log('🔷 ShapeManager: Generated commands:', commands);

      // Create a new path for the shape
      // addPath automatically creates a path with one subpath containing M 100,100
      // We'll replace those commands with our shape commands
      const pathId = addPath({
        fill: '#0078cc',
        fillOpacity: 0.3,
        stroke: '#0000ff',
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round'
      });

      console.log('🔷 ShapeManager: Created path with ID:', pathId);

      // Get the automatically created subpath ID
      const currentStore = useEditorStore.getState();
      const createdPath = currentStore.paths.find(p => p.id === pathId);
      const subPathId = createdPath?.subPaths[0]?.id;
      
      console.log('🔷 ShapeManager: Found subpath ID:', subPathId);
      
      if (!subPathId) {
        throw new Error('Failed to find created subpath');
      }

      // Replace the default M 100,100 command with our shape commands
      replaceSubPathCommands(subPathId, commands);
      console.log('🔷 ShapeManager: Successfully replaced subpath commands');
    } catch (error) {
      console.error('🔷 ShapeManager: Error inserting shape:', error);
    }
  }
}

export const shapeManager = new ShapeManager();

// Mouse event handlers for the plugin system
export const shapeMouseHandlers: MouseEventHandler = {
  onMouseDown: shapeManager.handleMouseDown,
  onMouseMove: shapeManager.handleMouseMove,
  onMouseUp: shapeManager.handleMouseUp,
};
