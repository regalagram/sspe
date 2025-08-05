import { Point, BoundingBox } from '../../types';
import { useEditorStore } from '../../store/editorStore';
import { 
  getPathBoundingBox, 
  getTextBoundingBox, 
  getImageBoundingBox, 
  getGroupBoundingBox,
  getBoundingBoxAlignmentPoints,
  getSubPathBoundingBox
} from '../../utils/bbox-utils';
import { calculateTextBoundsDOM } from '../../utils/text-utils';

export interface StickyConfig {
  enabled: boolean;
  snapDistance: number; // pixels
  showGuidelines: boolean;
  enableEdgeSnapping: boolean; // Snap to edges (left, right, top, bottom)
  enableCenterSnapping: boolean; // Snap to centers
  enableMidpointSnapping: boolean; // Snap to edge midpoints
  debugMode: boolean; // Show all bbox projections for debugging
}

export interface AlignmentGuide {
  id: string;
  type: 'horizontal' | 'vertical';
  position: number;
  color: string;
  alignmentType: 'center' | 'edge' | 'midpoint';
}

export interface DebugProjection {
  id: string;
  elementId: string;
  type: 'horizontal' | 'vertical';
  position: number;
  projectionType: 'edge' | 'center' | 'midpoint';
  isMovingElement: boolean;
}

export interface StickyResult {
  snappedPoint: Point;
  guidelines: AlignmentGuide[];
  snappedElements?: string[]; // IDs of elements that provided alignment
  snappedBounds?: ElementBounds; // Complete bounds after snapping (for selections)
  debugProjections?: DebugProjection[]; // Debug projections for all elements
}

interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  // Additional alignment points
  topCenter: number;
  bottomCenter: number;
  leftCenter: number;
  rightCenter: number;
}

interface CanvasElement {
  id: string;
  type: 'path' | 'text' | 'image' | 'group' | 'use' | 'subpath';
  bounds: ElementBounds;
}

export class StickyManager {
  private static instance: StickyManager;
  private config: StickyConfig = {
    enabled: true,
    snapDistance: 8, // Reduced to half for more subtle sticky effect
    showGuidelines: true,
    enableEdgeSnapping: true,
    enableCenterSnapping: true,
    enableMidpointSnapping: true,
    debugMode: true // Debug mode ENABLED by default for debugging
  };
  private activeGuidelines: AlignmentGuide[] = [];
  private activeDebugProjections: DebugProjection[] = [];
  private listeners: Array<(guidelines: AlignmentGuide[], debugProjections: DebugProjection[]) => void> = [];
  
  // NEW: Store original bounds for elements during drag operations
  private originalElementBounds: Map<string, ElementBounds> = new Map();
  private isDragActive: boolean = false;

  private constructor() {}

  public static getInstance(): StickyManager {
    if (!StickyManager.instance) {
      StickyManager.instance = new StickyManager();
    }
    return StickyManager.instance;
  }

  public updateConfig(updates: Partial<StickyConfig>): void {
    const oldDebugMode = this.config.debugMode;
    const oldEdgeSnapping = this.config.enableEdgeSnapping;
    const oldCenterSnapping = this.config.enableCenterSnapping;
    const oldMidpointSnapping = this.config.enableMidpointSnapping;
    
    this.config = { ...this.config, ...updates };
    
    // If debug mode changed, update debug projections
    if ('debugMode' in updates && updates.debugMode !== oldDebugMode) {
      this.updateDebugProjections();
    }
    
    // If any alignment settings changed while debug mode is on, update projections
    else if (this.config.debugMode && (
      ('enableEdgeSnapping' in updates && updates.enableEdgeSnapping !== oldEdgeSnapping) ||
      ('enableCenterSnapping' in updates && updates.enableCenterSnapping !== oldCenterSnapping) ||
      ('enableMidpointSnapping' in updates && updates.enableMidpointSnapping !== oldMidpointSnapping)
    )) {
      this.updateDebugProjections();
    }
  }

  public getConfig(): StickyConfig {
    return { ...this.config };
  }

  public subscribe(listener: (guidelines: AlignmentGuide[], debugProjections: DebugProjection[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.activeGuidelines, this.activeDebugProjections));
  }

  public getActiveGuidelines(): AlignmentGuide[] {
    return this.activeGuidelines;
  }

  public getActiveDebugProjections(): DebugProjection[] {
    return this.activeDebugProjections;
  }

  /**
   * Initialize drag operation - capture original bounds for all elements
   * This should be called at the start of any drag operation
   */
  public startDragOperation(draggedElementId?: string, draggedElementType?: string): void {
    console.log('StickyManager: Starting drag operation', { draggedElementId, draggedElementType });
    
    this.isDragActive = true;
    this.originalElementBounds.clear();
    
    const store = useEditorStore.getState();
    
    // Capture bounds for the dragged element(s)
    if (this.hasSelection(store.selection)) {
      // Multi-selection: capture bounds for all selected elements
      const selectedIds = this.getSelectedElementsIds();
      selectedIds.forEach(elementId => {
        // Try to determine element type and get bounds
        let elementType: string | null = null;
        let bounds: ElementBounds | null = null;
        
        // Check each element type
        if (store.paths.some(p => p.id === elementId)) {
          elementType = 'path';
          bounds = this.getElementBounds(elementId, 'path');
        } else if (store.texts.some(t => t.id === elementId)) {
          elementType = 'text';
          bounds = this.getElementBounds(elementId, 'text');
        } else if (store.images.some(i => i.id === elementId)) {
          elementType = 'image';
          bounds = this.getElementBounds(elementId, 'image');
        } else if (store.groups.some(g => g.id === elementId)) {
          elementType = 'group';
          bounds = this.getElementBounds(elementId, 'group');
        } else if (store.uses.some(u => u.id === elementId)) {
          elementType = 'use';
          bounds = this.getElementBounds(elementId, 'use');
        } else {
          // Check if it's a subpath
          for (const path of store.paths) {
            if (path.subPaths.some(sp => sp.id === elementId)) {
              elementType = 'subpath';
              bounds = this.getElementBounds(elementId, 'subpath');
              break;
            }
          }
        }
        
        if (bounds) {
          this.originalElementBounds.set(elementId, bounds);
          console.log('StickyManager: Captured original bounds for selected element', { elementId, elementType, bounds });
        }
      });
    } else if (draggedElementId && draggedElementType) {
      // Single element: capture bounds for the dragged element
      const bounds = this.getElementBounds(draggedElementId, draggedElementType);
      if (bounds) {
        this.originalElementBounds.set(draggedElementId, bounds);
        console.log('StickyManager: Captured original bounds for single element', { draggedElementId, draggedElementType, bounds });
      }
    }
    
    // Also capture bounds for selection if it exists
    if (this.hasSelection(store.selection)) {
      const selectionBounds = this.calculateSelectionBounds();
      if (selectionBounds) {
        this.originalElementBounds.set('selection', selectionBounds);
        console.log('StickyManager: Captured original selection bounds', { selectionBounds });
      }
    }
  }
  
  /**
   * End drag operation - clear original bounds cache
   * This should be called when drag operation ends
   */
  public endDragOperation(): void {
    console.log('StickyManager: Ending drag operation');
    this.isDragActive = false;
    this.originalElementBounds.clear();
  }
  
  /**
   * Get original bounds for an element (captured at drag start) - private method
   */
  private getOriginalBounds(elementId: string): ElementBounds | null {
    return this.originalElementBounds.get(elementId) || null;
  }

  /**
   * Public method to get original bounds for selection (used by PointerInteraction)
   */
  public getOriginalSelectionBounds(): ElementBounds | null {
    return this.getOriginalBounds('selection');
  }

  /**
   * Public method to get original bounds for any element (used by PathRenderer)
   */
  public getOriginalElementBounds(elementId: string): ElementBounds | null {
    return this.originalElementBounds.get(elementId) || null;
  }

  /**
   * Public method to refresh debug projections (e.g., when elements are added/removed)
   */
  public refreshDebugProjections(): void {
    if (this.config.debugMode) {
      this.updateDebugProjections();
    }
  }

  /**
   * Update debug projections for all elements when debug mode is enabled
   */
  private updateDebugProjections(): void {
    if (!this.config.debugMode) {
      this.activeDebugProjections = [];
      this.notifyListeners();
      return;
    }

    // Generate debug projections for all canvas elements
    const allElements = this.getAllOtherElements(new Set()); // Empty set to get all elements
    const projections: DebugProjection[] = [];

    allElements.forEach((element: CanvasElement) => {
      const bounds = element.bounds;
      
      // Edge projections (only if edge snapping is enabled)
      if (this.config.enableEdgeSnapping) {
        // Vertical edges (left, right)
        projections.push({
          id: `debug-v-left-${element.id}`,
          elementId: element.id,
          type: 'vertical',
          position: bounds.left,
          projectionType: 'edge',
          isMovingElement: false
        });
        projections.push({
          id: `debug-v-right-${element.id}`,
          elementId: element.id,
          type: 'vertical',
          position: bounds.right,
          projectionType: 'edge',
          isMovingElement: false
        });

        // Horizontal edges (top, bottom)
        projections.push({
          id: `debug-h-top-${element.id}`,
          elementId: element.id,
          type: 'horizontal',
          position: bounds.top,
          projectionType: 'edge',
          isMovingElement: false
        });
        projections.push({
          id: `debug-h-bottom-${element.id}`,
          elementId: element.id,
          type: 'horizontal',
          position: bounds.bottom,
          projectionType: 'edge',
          isMovingElement: false
        });
      }

      // Center projections (only if center snapping is enabled)
      if (this.config.enableCenterSnapping) {
        projections.push({
          id: `debug-v-center-${element.id}`,
          elementId: element.id,
          type: 'vertical',
          position: bounds.centerX,
          projectionType: 'center',
          isMovingElement: false
        });
        projections.push({
          id: `debug-h-center-${element.id}`,
          elementId: element.id,
          type: 'horizontal',
          position: bounds.centerY,
          projectionType: 'center',
          isMovingElement: false
        });
      }

      // Midpoint projections (only if midpoint snapping is enabled)
      if (this.config.enableMidpointSnapping) {
        const midLeft = bounds.left + (bounds.centerX - bounds.left) / 2;
        const midRight = bounds.centerX + (bounds.right - bounds.centerX) / 2;
        const midTop = bounds.top + (bounds.centerY - bounds.top) / 2;
        const midBottom = bounds.centerY + (bounds.bottom - bounds.centerY) / 2;

        projections.push({
          id: `debug-v-midleft-${element.id}`,
          elementId: element.id,
          type: 'vertical',
          position: midLeft,
          projectionType: 'midpoint',
          isMovingElement: false
        });
        projections.push({
          id: `debug-v-midright-${element.id}`,
          elementId: element.id,
          type: 'vertical',
          position: midRight,
          projectionType: 'midpoint',
          isMovingElement: false
        });
        projections.push({
          id: `debug-h-midtop-${element.id}`,
          elementId: element.id,
          type: 'horizontal',
          position: midTop,
          projectionType: 'midpoint',
          isMovingElement: false
        });
        projections.push({
          id: `debug-h-midbottom-${element.id}`,
          elementId: element.id,
          type: 'horizontal',
          position: midBottom,
          projectionType: 'midpoint',
          isMovingElement: false
        });
      }
    });

    this.activeDebugProjections = projections;
    this.notifyListeners();
  }

  private getElementBounds(elementId: string, elementType: string): ElementBounds | null {
    const store = useEditorStore.getState();
    let bbox: BoundingBox | null = null;
    
    console.log('getElementBounds called:', {
      elementId,
      elementType,
      pathsInStore: store.paths.length,
      pathIds: store.paths.map(p => p.id)
    });
    
    switch (elementType) {
      case 'subpath': {
        // Find the subpath in any of the paths
        let foundSubPath = null;
        for (const path of store.paths) {
          foundSubPath = path.subPaths.find(sp => sp.id === elementId);
          if (foundSubPath) break;
        }
        console.log('getElementBounds subpath search:', {
          elementId,
          subPathFound: !!foundSubPath,
          subPath: foundSubPath ? { id: foundSubPath.id, commandsCount: foundSubPath.commands.length } : null
        });
        if (!foundSubPath) return null;
        bbox = getSubPathBoundingBox(foundSubPath);
        console.log('getSubPathBoundingBox result:', bbox);
        break;
      }
      
      case 'path': {
        const path = store.paths.find(p => p.id === elementId);
        console.log('getElementBounds path search:', {
          elementId,
          pathFound: !!path,
          path: path ? { id: path.id, subPathsCount: path.subPaths.length } : null
        });
        if (!path) return null;
        bbox = getPathBoundingBox(path);
        console.log('getPathBoundingBox result:', bbox);
        break;
      }
      
      case 'text': {
        const text = store.texts.find(t => t.id === elementId);
        if (!text) return null;
        // Try DOM-based calculation first, fallback to basic calculation
        bbox = calculateTextBoundsDOM(text) || getTextBoundingBox(text);
        break;
      }
      
      case 'image': {
        const image = store.images.find(i => i.id === elementId);
        if (!image) return null;
        bbox = getImageBoundingBox(image);
        break;
      }
      
      case 'group': {
        const group = store.groups.find(g => g.id === elementId);
        if (!group) return null;
        bbox = this.calculateGroupBounds(group, store);
        break;
      }
      
      case 'use': {
        const use = store.uses.find(u => u.id === elementId);
        if (!use) return null;
        bbox = {
          x: use.x || 0,
          y: use.y || 0,
          width: use.width || 100,
          height: use.height || 100
        };
        break;
      }
      
      default:
        return null;
    }
    
    if (!bbox) return null;
    
    // Convert to ElementBounds with all alignment points
    const centerX = bbox.x + bbox.width / 2;
    const centerY = bbox.y + bbox.height / 2;
    
    return {
      x: bbox.x,
      y: bbox.y,
      width: bbox.width,
      height: bbox.height,
      centerX,
      centerY,
      left: bbox.x,
      right: bbox.x + bbox.width,
      top: bbox.y,
      bottom: bbox.y + bbox.height,
      topCenter: centerX,
      bottomCenter: centerX,
      leftCenter: centerY,
      rightCenter: centerY
    };
  }

  private calculateGroupBounds(group: any, store: any): BoundingBox | null {
    if (!group.children || group.children.length === 0) return null;
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let hasValidBounds = false;
    
    for (const child of group.children) {
      const childBounds = this.getElementBounds(child.id, child.type);
      if (childBounds) {
        minX = Math.min(minX, childBounds.left);
        minY = Math.min(minY, childBounds.top);
        maxX = Math.max(maxX, childBounds.right);
        maxY = Math.max(maxY, childBounds.bottom);
        hasValidBounds = true;
      }
    }
    
    if (!hasValidBounds) return null;
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  // Public method to get current element bounds (for PathRenderer integration)
  public getCurrentElementBounds(elementId: string, elementType: string): ElementBounds | null {
    return this.getElementBounds(elementId, elementType);
  }

  private getAllOtherElements(excludeElements: Set<string>): CanvasElement[] {
    const store = useEditorStore.getState();
    const elements: CanvasElement[] = [];
    
    console.log('getAllOtherElements called:', {
      excludeElements: Array.from(excludeElements),
      storePaths: store.paths.length,
      storeTexts: store.texts.length,
      storeImages: store.images.length,
      storeGroups: store.groups.length,
      storeUses: store.uses.length
    });
    
    // Add sub-paths (this is the key innovation of this app)
    store.paths.forEach(path => {
      path.subPaths.forEach(subPath => {
        if (!excludeElements.has(subPath.id)) {
          const bounds = this.getElementBounds(subPath.id, 'subpath');
          if (bounds) {
            elements.push({ id: subPath.id, type: 'subpath', bounds });
            console.log('Added subpath element:', { id: subPath.id, bounds });
          } else {
            console.log('SubPath bounds not found:', subPath.id);
          }
        }
      });
    });
    
    // Only add full paths if they don't have sub-paths, or if we're excluding specific sub-paths
    // This prevents duplication in debug mode when showing projections
    store.paths.forEach(path => {
      if (!excludeElements.has(path.id)) {
        // Check if any of this path's sub-paths are being excluded (meaning they're being moved)
        const hasExcludedSubPaths = path.subPaths.some(sp => excludeElements.has(sp.id));
        
        // For debug mode when nothing is being moved (excludeElements is empty),
        // we want to show either sub-paths OR the full path, not both
        const isDebugModeWithNoMovement = excludeElements.size === 0 && this.config.debugMode;
        
        // Only add the full path if:
        // 1. It has no sub-paths (empty path), OR
        // 2. None of its sub-paths are being moved AND it's not debug mode with no movement, OR
        // 3. It's debug mode with no movement and the path has no sub-paths
        if (path.subPaths.length === 0 || (!hasExcludedSubPaths && !isDebugModeWithNoMovement)) {
          const bounds = this.getElementBounds(path.id, 'path');
          if (bounds) {
            elements.push({ id: path.id, type: 'path', bounds });
            console.log('Added path element:', { id: path.id, bounds });
          } else {
            console.log('Path bounds not found:', path.id);
          }
        } else {
          console.log('Skipping path element to avoid duplication:', { 
            pathId: path.id, 
            reason: hasExcludedSubPaths ? 'has excluded sub-paths' : 'debug mode with sub-paths',
            excludedSubPaths: path.subPaths.filter(sp => excludeElements.has(sp.id)).map(sp => sp.id),
            subPathsCount: path.subPaths.length
          });
        }
      }
    });
    
    // Add texts
    store.texts.forEach(text => {
      if (!excludeElements.has(text.id)) {
        const bounds = this.getElementBounds(text.id, 'text');
        if (bounds) {
          elements.push({ id: text.id, type: 'text', bounds });
        }
      }
    });
    
    // Add images
    store.images.forEach(image => {
      if (!excludeElements.has(image.id)) {
        const bounds = this.getElementBounds(image.id, 'image');
        if (bounds) {
          elements.push({ id: image.id, type: 'image', bounds });
        }
      }
    });
    
    // Add groups
    store.groups.forEach(group => {
      if (!excludeElements.has(group.id)) {
        const bounds = this.getElementBounds(group.id, 'group');
        if (bounds) {
          elements.push({ id: group.id, type: 'group', bounds });
        }
      }
    });
    
    // Add use elements
    store.uses.forEach(use => {
      if (!excludeElements.has(use.id)) {
        const bounds = this.getElementBounds(use.id, 'use');
        if (bounds) {
          elements.push({ id: use.id, type: 'use', bounds });
        }
      }
    });
    
    return elements;
  }

  private isNearPosition(pos1: number, pos2: number): boolean {
    return Math.abs(pos1 - pos2) <= this.config.snapDistance;
  }

  private generateDebugProjections(
    movingBounds: ElementBounds, 
    movingElementId: string,
    otherElements: CanvasElement[]
  ): DebugProjection[] {
    if (!this.config.debugMode) {
      console.log('generateDebugProjections: debug mode disabled, returning empty array');
      return [];
    }

    console.log('generateDebugProjections called:', {
      movingElementId,
      debugModeEnabled: this.config.debugMode,
      movingBounds: {
        x: movingBounds.x,
        y: movingBounds.y,
        width: movingBounds.width,
        height: movingBounds.height,
        centerX: movingBounds.centerX,
        centerY: movingBounds.centerY,
        left: movingBounds.left,
        right: movingBounds.right,
        top: movingBounds.top,
        bottom: movingBounds.bottom
      },
      otherElementsCount: otherElements.length
    });

    // For non-selection elements, verify the bounds are correct by getting actual position
    let actualMovingBounds = movingBounds;
    if (movingElementId !== 'selection') {
      const store = useEditorStore.getState();
      
      // Try to get actual bounds from different element types
      let actualBounds = null;
      
      // Try subpath first (most common case for the issue)
      actualBounds = this.getElementBounds(movingElementId, 'subpath');
      if (!actualBounds) {
        actualBounds = this.getElementBounds(movingElementId, 'path');
      }
      if (!actualBounds) {
        actualBounds = this.getElementBounds(movingElementId, 'text');
      }
      if (!actualBounds) {
        actualBounds = this.getElementBounds(movingElementId, 'image');
      }
      if (!actualBounds) {
        actualBounds = this.getElementBounds(movingElementId, 'group');
      }
      
      if (actualBounds) {
        const deltaX = movingBounds.x - actualBounds.x;
        const deltaY = movingBounds.y - actualBounds.y;
        
        console.log('COORDINATE COMPARISON:', {
          movingElementId,
          calculatedBounds: movingBounds,
          actualElementBounds: actualBounds,
          deltaX,
          deltaY
        });
        
        // CRITICAL DEBUG: Check if this is where the alignment issue comes from
        console.log('STICKY DEBUG - bounds alignment check:', {
          movingElementId,
          'calculatedBounds.centerX': movingBounds.centerX,
          'calculatedBounds.centerY': movingBounds.centerY,
          'actualBounds.centerX': actualBounds.centerX,
          'actualBounds.centerY': actualBounds.centerY,
          'center deltaX': movingBounds.centerX - actualBounds.centerX,
          'center deltaY': movingBounds.centerY - actualBounds.centerY,
          'position deltaX': deltaX,
          'position deltaY': deltaY
        });
        
        // Only use actual bounds if they are significantly different
        // This handles cases where the element hasn't been updated yet in the store
        // but the visual position (movingBounds) is correct
        if (Math.abs(deltaX) > 0.1 || Math.abs(deltaY) > 0.1) {
          console.log('Using calculated movingBounds for debug projections due to delta');
          // Keep using movingBounds as they represent the intended visual position
          actualMovingBounds = movingBounds;
        } else {
          // Use actual bounds when they are close to ensure perfect alignment
          actualMovingBounds = actualBounds;
        }
      }
    } else {
      // For selections, we need to recalculate the bounds to ensure they reflect 
      // the current visual state of all selected elements
      const currentSelectionBounds = this.calculateSelectionBounds();
      if (currentSelectionBounds) {
        // Calculate the delta from the original bounds to the current position
        const deltaX = movingBounds.x - currentSelectionBounds.x;
        const deltaY = movingBounds.y - currentSelectionBounds.y;
        
        console.log('SELECTION BOUNDS COMPARISON:', {
          movingBounds,
          currentSelectionBounds,
          deltaX,
          deltaY
        });
        
        // For selections, always use the moving bounds as they represent the intended position
        // during drag operations. The currentSelectionBounds may be outdated during movement.
        actualMovingBounds = movingBounds;
      }
    }

    const projections: DebugProjection[] = [];

    // Add projections for the moving element - only show types that are enabled
    const addMovingProjections = (bounds: ElementBounds, elementId: string) => {
      // Edge projections (only if edge snapping is enabled)
      if (this.config.enableEdgeSnapping) {
        // Vertical edges (left, right)
        projections.push({
          id: `debug-v-left-moving-${elementId}`,
          elementId,
          type: 'vertical',
          position: bounds.left,
          projectionType: 'edge',
          isMovingElement: true
        });
        projections.push({
          id: `debug-v-right-moving-${elementId}`,
          elementId,
          type: 'vertical',
          position: bounds.right,
          projectionType: 'edge',
          isMovingElement: true
        });

        // Horizontal edges (top, bottom)
        projections.push({
          id: `debug-h-top-moving-${elementId}`,
          elementId,
          type: 'horizontal',
          position: bounds.top,
          projectionType: 'edge',
          isMovingElement: true
        });
        projections.push({
          id: `debug-h-bottom-moving-${elementId}`,
          elementId,
          type: 'horizontal',
          position: bounds.bottom,
          projectionType: 'edge',
          isMovingElement: true
        });
      }

      // Center projections (only if center snapping is enabled)
      if (this.config.enableCenterSnapping) {
        projections.push({
          id: `debug-v-center-moving-${elementId}`,
          elementId,
          type: 'vertical',
          position: bounds.centerX,
          projectionType: 'center',
          isMovingElement: true
        });
        projections.push({
          id: `debug-h-center-moving-${elementId}`,
          elementId,
          type: 'horizontal',
          position: bounds.centerY,
          projectionType: 'center',
          isMovingElement: true
        });
      }

      // Midpoint projections (only if midpoint snapping is enabled)
      if (this.config.enableMidpointSnapping) {
        const midLeft = bounds.left + (bounds.centerX - bounds.left) / 2;
        const midRight = bounds.centerX + (bounds.right - bounds.centerX) / 2;
        const midTop = bounds.top + (bounds.centerY - bounds.top) / 2;
        const midBottom = bounds.centerY + (bounds.bottom - bounds.centerY) / 2;

        projections.push({
          id: `debug-v-midleft-moving-${elementId}`,
          elementId,
          type: 'vertical',
          position: midLeft,
          projectionType: 'midpoint',
          isMovingElement: true
        });
        projections.push({
          id: `debug-v-midright-moving-${elementId}`,
          elementId,
          type: 'vertical',
          position: midRight,
          projectionType: 'midpoint',
          isMovingElement: true
        });
        projections.push({
          id: `debug-h-midtop-moving-${elementId}`,
          elementId,
          type: 'horizontal',
          position: midTop,
          projectionType: 'midpoint',
          isMovingElement: true
        });
        projections.push({
          id: `debug-h-midbottom-moving-${elementId}`,
          elementId,
          type: 'horizontal',
          position: midBottom,
          projectionType: 'midpoint',
          isMovingElement: true
        });
      }
    };

    // Add projections for static elements - only show types that are enabled
    // NOTE: otherElements already excludes the moving element, so no duplicates should occur
    const addStaticProjections = (element: CanvasElement) => {
      const bounds = element.bounds;
      
      // Edge projections (only if edge snapping is enabled)
      if (this.config.enableEdgeSnapping) {
        // Vertical edges (left, right)
        projections.push({
          id: `debug-v-left-static-${element.id}`,
          elementId: element.id,
          type: 'vertical',
          position: bounds.left,
          projectionType: 'edge',
          isMovingElement: false
        });
        projections.push({
          id: `debug-v-right-static-${element.id}`,
          elementId: element.id,
          type: 'vertical',
          position: bounds.right,
          projectionType: 'edge',
          isMovingElement: false
        });

        // Horizontal edges (top, bottom)
        projections.push({
          id: `debug-h-top-static-${element.id}`,
          elementId: element.id,
          type: 'horizontal',
          position: bounds.top,
          projectionType: 'edge',
          isMovingElement: false
        });
        projections.push({
          id: `debug-h-bottom-static-${element.id}`,
          elementId: element.id,
          type: 'horizontal',
          position: bounds.bottom,
          projectionType: 'edge',
          isMovingElement: false
        });
      }

      // Center projections (only if center snapping is enabled)
      if (this.config.enableCenterSnapping) {
        projections.push({
          id: `debug-v-center-static-${element.id}`,
          elementId: element.id,
          type: 'vertical',
          position: bounds.centerX,
          projectionType: 'center',
          isMovingElement: false
        });
        projections.push({
          id: `debug-h-center-static-${element.id}`,
          elementId: element.id,
          type: 'horizontal',
          position: bounds.centerY,
          projectionType: 'center',
          isMovingElement: false
        });
      }

      // Midpoint projections (only if midpoint snapping is enabled)
      if (this.config.enableMidpointSnapping) {
        const midLeft = bounds.left + (bounds.centerX - bounds.left) / 2;
        const midRight = bounds.centerX + (bounds.right - bounds.centerX) / 2;
        const midTop = bounds.top + (bounds.centerY - bounds.top) / 2;
        const midBottom = bounds.centerY + (bounds.bottom - bounds.centerY) / 2;

        projections.push({
          id: `debug-v-midleft-static-${element.id}`,
          elementId: element.id,
          type: 'vertical',
          position: midLeft,
          projectionType: 'midpoint',
          isMovingElement: false
        });
        projections.push({
          id: `debug-v-midright-static-${element.id}`,
          elementId: element.id,
          type: 'vertical',
          position: midRight,
          projectionType: 'midpoint',
          isMovingElement: false
        });
        projections.push({
          id: `debug-h-midtop-static-${element.id}`,
          elementId: element.id,
          type: 'horizontal',
          position: midTop,
          projectionType: 'midpoint',
          isMovingElement: false
        });
        projections.push({
          id: `debug-h-midbottom-static-${element.id}`,
          elementId: element.id,
          type: 'horizontal',
          position: midBottom,
          projectionType: 'midpoint',
          isMovingElement: false
        });
      }
    };

    // Generate projections for moving element or selection
    if (movingElementId === 'selection') {
      // For selection movement, generate projections for the entire selection bounds
      addMovingProjections(movingBounds, 'selection');
    } else {
      // For single element movement, generate projections for that element
      // Use actual bounds to ensure debug lines align with the element's current position
      addMovingProjections(actualMovingBounds, movingElementId);
    }

    // Generate projections for all static elements
    otherElements.forEach(addStaticProjections);

    return projections;
  }

  private getSelectedElementsIds(): Set<string> {
    const store = useEditorStore.getState();
    const selectedIds = new Set<string>();
    
    // Add all selected elements
    store.selection.selectedPaths?.forEach(id => selectedIds.add(id));
    store.selection.selectedTexts?.forEach(id => selectedIds.add(id));
    store.selection.selectedImages?.forEach(id => selectedIds.add(id));
    store.selection.selectedGroups?.forEach(id => selectedIds.add(id));
    store.selection.selectedUses?.forEach(id => selectedIds.add(id));
    
    return selectedIds;
  }

  public calculateSelectionBounds(): ElementBounds | null {
    const store = useEditorStore.getState();
    const selection = store.selection;
    
    if (!this.hasSelection(selection)) return null;
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let hasValidBounds = false;
    
    // Calculate bounds for all selected elements
    const elementTypes = [
      { ids: selection.selectedPaths || [], type: 'path' as const },
      { ids: selection.selectedTexts || [], type: 'text' as const },
      { ids: selection.selectedImages || [], type: 'image' as const },
      { ids: selection.selectedGroups || [], type: 'group' as const },
      { ids: selection.selectedUses || [], type: 'use' as const }
    ];
    
    for (const { ids, type } of elementTypes) {
      for (const id of ids) {
        const bounds = this.getElementBounds(id, type);
        if (bounds) {
          minX = Math.min(minX, bounds.left);
          minY = Math.min(minY, bounds.top);
          maxX = Math.max(maxX, bounds.right);
          maxY = Math.max(maxY, bounds.bottom);
          hasValidBounds = true;
        }
      }
    }
    
    if (!hasValidBounds) return null;
    
    const width = maxX - minX;
    const height = maxY - minY;
    const centerX = minX + width / 2;
    const centerY = minY + height / 2;
    
    return {
      x: minX,
      y: minY,
      width,
      height,
      centerX,
      centerY,
      left: minX,
      right: maxX,
      top: minY,
      bottom: maxY,
      topCenter: centerX,
      bottomCenter: centerX,
      leftCenter: centerY,
      rightCenter: centerY
    };
  }

  private hasSelection(selection: any): boolean {
    return (selection.selectedPaths?.length > 0) ||
           (selection.selectedTexts?.length > 0) ||
           (selection.selectedImages?.length > 0) ||
           (selection.selectedGroups?.length > 0) ||
           (selection.selectedUses?.length > 0);
  }

  public handleSelectionMoving(
    targetSelectionPosition: Point, 
    originalBounds: ElementBounds
  ): StickyResult {
    
    console.log('StickyManager.handleSelectionMoving called:', {
      enabled: this.config.enabled,
      targetPosition: targetSelectionPosition,
      originalBounds,
      isDragActive: this.isDragActive,
      hasOriginalSelectionBounds: this.originalElementBounds.has('selection')
    });
    
    if (!this.config.enabled) {
      console.log('StickyManager disabled, returning original position');
      return {
        snappedPoint: targetSelectionPosition,
        guidelines: [],
        snappedBounds: {
          ...originalBounds,
          x: targetSelectionPosition.x,
          y: targetSelectionPosition.y,
          left: targetSelectionPosition.x,
          right: targetSelectionPosition.x + originalBounds.width,
          top: targetSelectionPosition.y,
          bottom: targetSelectionPosition.y + originalBounds.height,
          centerX: targetSelectionPosition.x + originalBounds.width / 2,
          centerY: targetSelectionPosition.y + originalBounds.height / 2,
          topCenter: targetSelectionPosition.x + originalBounds.width / 2,
          bottomCenter: targetSelectionPosition.x + originalBounds.width / 2,
          leftCenter: targetSelectionPosition.y + originalBounds.height / 2,
          rightCenter: targetSelectionPosition.y + originalBounds.height / 2
        }
      };
    }

    // CRITICAL FIX: Use original selection bounds if available, otherwise fallback to passed originalBounds
    let selectionOriginalBounds = this.getOriginalBounds('selection');
    if (!selectionOriginalBounds) {
      console.warn('StickyManager: Original selection bounds not found, using provided bounds. This may cause amplification.');
      selectionOriginalBounds = originalBounds;
    }

    console.log('STICKY DEBUG - handleSelectionMoving USING ORIGINAL BOUNDS:', {
      targetSelectionPosition,
      selectionOriginalBounds,
      providedOriginalBounds: originalBounds,
      usingCapturedBounds: !!this.getOriginalBounds('selection')
    });

    const selectedElements = this.getSelectedElementsIds();
    const otherElements = this.getAllOtherElements(selectedElements);
    
    console.log('handleSelectionMoving otherElements:', {
      selectedElementsCount: selectedElements.size,
      selectedElements: Array.from(selectedElements),
      otherElementsCount: otherElements.length,
      otherElements: otherElements.map(e => ({ id: e.id, type: e.type }))
    });
    
    const guidelines: AlignmentGuide[] = [];
    const snappedElements: string[] = [];
    
    // Calculate where the selection bounds would be at the target position using ORIGINAL bounds
    const newBounds = {
      x: targetSelectionPosition.x,
      y: targetSelectionPosition.y,
      width: selectionOriginalBounds.width,
      height: selectionOriginalBounds.height,
      centerX: targetSelectionPosition.x + selectionOriginalBounds.width / 2,
      centerY: targetSelectionPosition.y + selectionOriginalBounds.height / 2,
      left: targetSelectionPosition.x,
      right: targetSelectionPosition.x + selectionOriginalBounds.width,
      top: targetSelectionPosition.y,
      bottom: targetSelectionPosition.y + selectionOriginalBounds.height,
      topCenter: targetSelectionPosition.x + selectionOriginalBounds.width / 2,
      bottomCenter: targetSelectionPosition.x + selectionOriginalBounds.width / 2,
      leftCenter: targetSelectionPosition.y + selectionOriginalBounds.height / 2,
      rightCenter: targetSelectionPosition.y + selectionOriginalBounds.height / 2
    };

    // These will hold the snapped selection bounds
    let snappedBounds = { ...newBounds };

            
    // Check alignment with each other element
    for (const element of otherElements) {
      const other = element.bounds;
      
      // Vertical alignment checks
      if (this.config.enableCenterSnapping && this.isNearPosition(newBounds.centerX, other.centerX)) {
                snappedBounds.centerX = other.centerX;
        // Adjust all horizontal positions based on center snap
        const centerOffset = other.centerX - newBounds.centerX;
        snappedBounds.x = newBounds.x + centerOffset;
        snappedBounds.left = newBounds.left + centerOffset;
        snappedBounds.right = newBounds.right + centerOffset;
        snappedBounds.topCenter = other.centerX;
        snappedBounds.bottomCenter = other.centerX;
        
        guidelines.push({
          id: `v-center-${element.id}`,
          type: 'vertical',
          position: other.centerX,
          color: '#ff5f5f',
          alignmentType: 'center'
        });
        snappedElements.push(element.id);
      }
      if (this.config.enableEdgeSnapping && this.isNearPosition(newBounds.left, other.left)) {
                const leftOffset = other.left - newBounds.left;
        snappedBounds.x = newBounds.x + leftOffset;
        snappedBounds.left = other.left;
        snappedBounds.right = newBounds.right + leftOffset;
        snappedBounds.centerX = newBounds.centerX + leftOffset;
        snappedBounds.topCenter = newBounds.topCenter + leftOffset;
        snappedBounds.bottomCenter = newBounds.bottomCenter + leftOffset;
        
        guidelines.push({
          id: `v-left-${element.id}`,
          type: 'vertical',
          position: other.left,
          color: '#2196f3',
          alignmentType: 'edge'
        });
        snappedElements.push(element.id);
      }
      if (this.config.enableEdgeSnapping && this.isNearPosition(newBounds.right, other.right)) {
                const rightOffset = other.right - newBounds.right;
        snappedBounds.x = newBounds.x + rightOffset;
        snappedBounds.left = newBounds.left + rightOffset;
        snappedBounds.right = other.right;
        snappedBounds.centerX = newBounds.centerX + rightOffset;
        snappedBounds.topCenter = newBounds.topCenter + rightOffset;
        snappedBounds.bottomCenter = newBounds.bottomCenter + rightOffset;
        
        guidelines.push({
          id: `v-right-${element.id}`,
          type: 'vertical',
          position: other.right,
          color: '#2196f3',
          alignmentType: 'edge'
        });
        snappedElements.push(element.id);
      }

      // Horizontal alignment checks
      if (this.config.enableCenterSnapping && this.isNearPosition(newBounds.centerY, other.centerY)) {
                snappedBounds.centerY = other.centerY;
        // Adjust all vertical positions based on center snap
        const centerOffset = other.centerY - newBounds.centerY;
        snappedBounds.y = newBounds.y + centerOffset;
        snappedBounds.top = newBounds.top + centerOffset;
        snappedBounds.bottom = newBounds.bottom + centerOffset;
        snappedBounds.leftCenter = other.centerY;
        snappedBounds.rightCenter = other.centerY;
        
        guidelines.push({
          id: `h-center-${element.id}`,
          type: 'horizontal',
          position: other.centerY,
          color: '#ff5f5f',
          alignmentType: 'center'
        });
        snappedElements.push(element.id);
      }
      if (this.config.enableEdgeSnapping && this.isNearPosition(newBounds.top, other.top)) {
                const topOffset = other.top - newBounds.top;
        snappedBounds.y = newBounds.y + topOffset;
        snappedBounds.top = other.top;
        snappedBounds.bottom = newBounds.bottom + topOffset;
        snappedBounds.centerY = newBounds.centerY + topOffset;
        snappedBounds.leftCenter = newBounds.leftCenter + topOffset;
        snappedBounds.rightCenter = newBounds.rightCenter + topOffset;
        
        guidelines.push({
          id: `h-top-${element.id}`,
          type: 'horizontal',
          position: other.top,
          color: '#2196f3',
          alignmentType: 'edge'
        });
        snappedElements.push(element.id);
      }
      if (this.config.enableEdgeSnapping && this.isNearPosition(newBounds.bottom, other.bottom)) {
                const bottomOffset = other.bottom - newBounds.bottom;
        snappedBounds.y = newBounds.y + bottomOffset;
        snappedBounds.top = newBounds.top + bottomOffset;
        snappedBounds.bottom = other.bottom;
        snappedBounds.centerY = newBounds.centerY + bottomOffset;
        snappedBounds.leftCenter = newBounds.leftCenter + bottomOffset;
        snappedBounds.rightCenter = newBounds.rightCenter + bottomOffset;
        
        guidelines.push({
          id: `h-bottom-${element.id}`,
          type: 'horizontal',
          position: other.bottom,
          color: '#2196f3',
          alignmentType: 'edge'
        });
        snappedElements.push(element.id);
      }

      // Midpoint snapping (optional)
      if (this.config.enableMidpointSnapping) {
        // Vertical midpoint between left and center
        const otherMidLeft = other.left + (other.centerX - other.left) / 2;
        const newMidLeft = newBounds.left + (newBounds.centerX - newBounds.left) / 2;
        if (this.isNearPosition(newMidLeft, otherMidLeft)) {
          const midLeftOffset = otherMidLeft - newMidLeft;
          snappedBounds.x = newBounds.x + midLeftOffset;
          snappedBounds.left = newBounds.left + midLeftOffset;
          snappedBounds.right = newBounds.right + midLeftOffset;
          snappedBounds.centerX = newBounds.centerX + midLeftOffset;
          snappedBounds.topCenter = newBounds.topCenter + midLeftOffset;
          snappedBounds.bottomCenter = newBounds.bottomCenter + midLeftOffset;
          
          guidelines.push({
            id: `v-midleft-${element.id}`,
            type: 'vertical',
            position: otherMidLeft,
            color: '#4CAF50',
            alignmentType: 'midpoint'
          });
          snappedElements.push(element.id);
        }

        // Horizontal midpoint between top and center
        const otherMidTop = other.top + (other.centerY - other.top) / 2;
        const newMidTop = newBounds.top + (newBounds.centerY - newBounds.top) / 2;
        if (this.isNearPosition(newMidTop, otherMidTop)) {
          const midTopOffset = otherMidTop - newMidTop;
          snappedBounds.y = newBounds.y + midTopOffset;
          snappedBounds.top = newBounds.top + midTopOffset;
          snappedBounds.bottom = newBounds.bottom + midTopOffset;
          snappedBounds.centerY = newBounds.centerY + midTopOffset;
          snappedBounds.leftCenter = newBounds.leftCenter + midTopOffset;
          snappedBounds.rightCenter = newBounds.rightCenter + midTopOffset;
          
          guidelines.push({
            id: `h-midtop-${element.id}`,
            type: 'horizontal',
            position: otherMidTop,
            color: '#4CAF50',
            alignmentType: 'midpoint'
          });
          snappedElements.push(element.id);
        }
      }
    }

    // Generate debug projections if debug mode is enabled
    // Use the exact position where the selection should be (no additional calculations)
    const selectedElementIds = this.getSelectedElementsIds();
    const filteredOtherElements = otherElements.filter(element => !selectedElementIds.has(element.id));
        const debugProjections = this.generateDebugProjections(newBounds, 'selection', filteredOtherElements);
    this.activeDebugProjections = debugProjections;

    this.activeGuidelines = guidelines;
    this.notifyListeners();

    console.log('StickyManager handleSelectionMoving RESULT:', {
      guidelinesCount: guidelines.length,
      guidelines: guidelines.map(g => ({ type: g.type, position: g.position, alignmentType: g.alignmentType })),
      snappedElements: snappedElements.length,
      debugProjectionsCount: debugProjections.length,
      debugMode: this.config.debugMode,
      hasDebugProjections: debugProjections.length > 0,
      firstDebugProjection: debugProjections.length > 0 ? debugProjections[0] : null,
      newBounds,
      targetSelectionPosition
    });

    // Return the snapped selection bounds directly
    // The caller should use these bounds to position the elements
    const result = {
      snappedPoint: { x: snappedBounds.x, y: snappedBounds.y },
      guidelines,
      snappedElements,
      snappedBounds: snappedBounds,  // Return the complete snapped bounds
      debugProjections
    };
    
    return result;
  }

  public handleElementMoving(
    elementId: string,
    elementType: string,
    currentBounds: ElementBounds,
    newPosition: Point
  ): StickyResult {
    
    if (!this.config.enabled) {
      return {
        snappedPoint: newPosition,
        guidelines: []
      };
    }

    // For multi-selection, delegate to handleSelectionMoving
    const store = useEditorStore.getState();
    if (this.hasSelection(store.selection)) {
      const selectionBounds = this.calculateSelectionBounds();
      if (selectionBounds) {
        // Calculate how much the individual element moved
        const elementDx = newPosition.x - currentBounds.x;
        const elementDy = newPosition.y - currentBounds.y;
        
        // Apply the same movement to the entire selection
        const targetSelectionPosition = {
          x: selectionBounds.x + elementDx,
          y: selectionBounds.y + elementDy
        };
        
                
        return this.handleSelectionMoving(targetSelectionPosition, selectionBounds);
      }
    }

    const excludeElements = new Set([elementId]);
    const otherElements = this.getAllOtherElements(excludeElements);
        const guidelines: AlignmentGuide[] = [];
    
    // Calculate new bounds at proposed position for snapping logic
    const newBounds = {
      ...currentBounds,
      x: newPosition.x,
      y: newPosition.y,
      centerX: newPosition.x + currentBounds.width / 2,
      centerY: newPosition.y + currentBounds.height / 2,
      left: newPosition.x,
      right: newPosition.x + currentBounds.width,
      top: newPosition.y,
      bottom: newPosition.y + currentBounds.height,
      topCenter: newPosition.x + currentBounds.width / 2,
      bottomCenter: newPosition.x + currentBounds.width / 2,
      leftCenter: newPosition.y + currentBounds.height / 2,
      rightCenter: newPosition.y + currentBounds.height / 2
    };

    // For snapping detection, use the new position coordinates
    const boundsForSnapping = newBounds;

    let snapX = newPosition.x;
    let snapY = newPosition.y;

    
    // Check alignment with each other element using newBounds (same as projections)
    for (const element of otherElements) {
      const other = element.bounds;
      
      // Vertical alignment checks (use separate ifs to allow multiple alignments)
      if (this.config.enableCenterSnapping && this.isNearPosition(newBounds.centerX, other.centerX)) {
                // Snap to center alignment - adjust the element's position so its center aligns
        const targetCenterX = other.centerX;
        snapX = targetCenterX - currentBounds.width / 2;
        guidelines.push({
          id: `v-center-${element.id}`,
          type: 'vertical',
          position: other.centerX,
          color: '#ff5f5f',
          alignmentType: 'center'
        });
      }
      if (this.config.enableEdgeSnapping && this.isNearPosition(newBounds.left, other.left)) {
                // Snap to left edge alignment
        snapX = other.left;
        guidelines.push({
          id: `v-left-${element.id}`,
          type: 'vertical',
          position: other.left,
          color: '#ff5f5f',
          alignmentType: 'edge'
        });
      }
      if (this.config.enableEdgeSnapping && this.isNearPosition(newBounds.right, other.right)) {
                // Snap to right edge alignment  
        snapX = other.right - currentBounds.width;
        guidelines.push({
          id: `v-right-${element.id}`,
          type: 'vertical',
          position: other.right,
          color: '#ff5f5f',
          alignmentType: 'edge'
        });
      }

      // Horizontal alignment checks (use separate ifs to allow multiple alignments)
      if (this.config.enableCenterSnapping && this.isNearPosition(newBounds.centerY, other.centerY)) {
                // Snap to center alignment - adjust the element's position so its center aligns
        const targetCenterY = other.centerY;
        snapY = targetCenterY - currentBounds.height / 2;
        guidelines.push({
          id: `h-center-${element.id}`,
          type: 'horizontal',
          position: other.centerY,
          color: '#ff5f5f',
          alignmentType: 'center'
        });
      }
      if (this.config.enableEdgeSnapping && this.isNearPosition(newBounds.top, other.top)) {
                // Snap to top edge alignment
        snapY = other.top;
        guidelines.push({
          id: `h-top-${element.id}`,
          type: 'horizontal',
          position: other.top,
          color: '#ff5f5f',
          alignmentType: 'edge'
        });
      }
      if (this.config.enableEdgeSnapping && this.isNearPosition(newBounds.bottom, other.bottom)) {
                // Snap to bottom edge alignment
        snapY = other.bottom - currentBounds.height;
        guidelines.push({
          id: `h-bottom-${element.id}`,
          type: 'horizontal',
          position: other.bottom,
          color: '#ff5f5f',
          alignmentType: 'edge'
        });
      }
    }

    // Calculate the final snapped bounds for debug projections
    const snappedBounds = {
      ...newBounds,
      x: snapX,
      y: snapY,
      centerX: snapX + currentBounds.width / 2,
      centerY: snapY + currentBounds.height / 2,
      left: snapX,
      right: snapX + currentBounds.width,
      top: snapY,
      bottom: snapY + currentBounds.height,
      topCenter: snapX + currentBounds.width / 2,
      bottomCenter: snapX + currentBounds.width / 2,
      leftCenter: snapY + currentBounds.height / 2,
      rightCenter: snapY + currentBounds.height / 2
    };

    // Generate debug projections if debug mode is enabled
    const filteredOtherElements = otherElements.filter(element => element.id !== elementId);
    
    // For debug projections, use the snapped bounds which represent where the element actually is
    // This should align with the visual position of the element
    console.log('Debug projections bounds calculation:', {
      elementId,
      elementType,
      newPosition,
      currentBounds,
      snappedBounds
    });
    
    const debugProjections = this.generateDebugProjections(snappedBounds, elementId, filteredOtherElements);
    this.activeDebugProjections = debugProjections;

    this.activeGuidelines = guidelines;
        this.notifyListeners();

    const result = {
      snappedPoint: { x: snapX, y: snapY },
      guidelines,
      debugProjections
    };
    
        
    return result;
  }

  public clearGuidelines(): void {
    this.activeGuidelines = [];
    
    // End drag operation when clearing guidelines
    if (this.isDragActive) {
      this.endDragOperation();
    }
    
    // In debug mode, maintain debug projections instead of clearing them
    if (this.config.debugMode) {
      this.updateDebugProjections();
    } else {
      this.activeDebugProjections = [];
      this.notifyListeners();
    }
  }

  /**
   * Enhanced method for integration with drag operations
   * Automatically detects if it's a single element or multi-selection
   * newPosition should be the intended position of the element (not cursor position)
   */
  public handleDragMovement(newPosition: Point, elementId?: string, elementType?: string): StickyResult {
    const store = useEditorStore.getState();
    
    console.log('handleDragMovement called:', {
      newPosition,
      elementId,
      elementType,
      hasSelection: this.hasSelection(store.selection),
      selectionPaths: store.selection.selectedPaths?.length || 0,
      selectionTexts: store.selection.selectedTexts?.length || 0,
      selectionImages: store.selection.selectedImages?.length || 0,
      selectionGroups: store.selection.selectedGroups?.length || 0,
      selectionUses: store.selection.selectedUses?.length || 0
    });
    
    // If we have a selection, use the selection movement handler
    if (this.hasSelection(store.selection)) {
      const selectionBounds = this.calculateSelectionBounds();
      console.log('Using selection movement, selectionBounds:', selectionBounds);
      if (selectionBounds) {
        return this.handleSelectionMoving(newPosition, selectionBounds);
      }
    }
    
    // If single element specified, use element movement handler
    if (elementId && elementType) {
      const currentBounds = this.getElementBounds(elementId, elementType);
      console.log('Using element movement:', { elementId, elementType, currentBounds });
      if (currentBounds) {
        // For single element movement, newPosition should represent where the element would be positioned
        // If newPosition is cursor position, we need to convert it to element position
        // But the caller should pass the element's intended position, not cursor position
        return this.handleElementMoving(elementId, elementType, currentBounds, newPosition);
      }
    }
    
    console.log('handleDragMovement fallback - no guidelines');
    // Fallback - no guidelines
    return {
      snappedPoint: newPosition,
      guidelines: []
    };
  }

  /**
   * Handle drag based on cursor movement - converts cursor position to element position
   * This method is designed for PathRenderer and similar cases where cursor position is available
   */
  public handleCursorDragMovement(
    cursorPosition: Point, 
    dragStartPoint: Point,
    elementId?: string, 
    elementType?: string
  ): StickyResult {
    const store = useEditorStore.getState();
    
    console.log('handleCursorDragMovement called:', {
      cursorPosition,
      dragStartPoint,
      elementId,
      elementType,
      hasSelection: this.hasSelection(store.selection)
    });
    
    // Calculate movement delta from the start point to current cursor position
    const moveDelta = {
      x: cursorPosition.x - dragStartPoint.x,
      y: cursorPosition.y - dragStartPoint.y
    };
    
    // If we have a selection, calculate where the selection would move to
    if (this.hasSelection(store.selection)) {
      const selectionBounds = this.calculateSelectionBounds();
      if (selectionBounds) {
        const targetSelectionPosition = {
          x: selectionBounds.x + moveDelta.x,
          y: selectionBounds.y + moveDelta.y
        };
        console.log('Cursor drag: using selection movement', { 
          selectionBounds, 
          moveDelta, 
          targetSelectionPosition 
        });
        const result = this.handleSelectionMoving(targetSelectionPosition, selectionBounds);
        
        // Convert snapped element position back to cursor position
        if (result.snappedBounds) {
          const snappedDelta = {
            x: result.snappedBounds.x - selectionBounds.x,
            y: result.snappedBounds.y - selectionBounds.y
          };
          return {
            ...result,
            snappedPoint: {
              x: dragStartPoint.x + snappedDelta.x,
              y: dragStartPoint.y + snappedDelta.y
            }
          };
        }
        return result;
      }
    }
    
    // If single element specified, calculate where the element would move to
    if (elementId && elementType) {
      // CRITICAL FIX: Use original bounds captured at drag start
      let originalBounds = this.getOriginalBounds(elementId);
      
      // Fallback to current bounds if original bounds not available (shouldn't happen in normal flow)
      if (!originalBounds) {
        console.warn('StickyManager: Original bounds not found, using current bounds. This may cause amplification.', { elementId, elementType });
        originalBounds = this.getElementBounds(elementId, elementType);
      }
      
      if (originalBounds) {
        // Calculate where the element should be based on the cursor movement from drag start
        const targetElementPosition = {
          x: originalBounds.x + moveDelta.x,
          y: originalBounds.y + moveDelta.y
        };
        
        console.log('STICKY DEBUG - handleCursorDragMovement USING ORIGINAL BOUNDS:', {
          elementId,
          elementType,
          cursorPosition,
          dragStartPoint,
          moveDelta,
          originalBounds,
          targetElementPosition,
          'targetElementPosition.centerX': targetElementPosition.x + originalBounds.width / 2,
          'targetElementPosition.centerY': targetElementPosition.y + originalBounds.height / 2,
          isDragActive: this.isDragActive,
          hasOriginalBounds: !!this.getOriginalBounds(elementId)
        });
        
        // Create bounds that represent where the element SHOULD be visually
        const targetBounds = {
          ...originalBounds,
          x: targetElementPosition.x,
          y: targetElementPosition.y,
          centerX: targetElementPosition.x + originalBounds.width / 2,
          centerY: targetElementPosition.y + originalBounds.height / 2,
          left: targetElementPosition.x,
          right: targetElementPosition.x + originalBounds.width,
          top: targetElementPosition.y,
          bottom: targetElementPosition.y + originalBounds.height,
          topCenter: targetElementPosition.x + originalBounds.width / 2,
          bottomCenter: targetElementPosition.x + originalBounds.width / 2,
          leftCenter: targetElementPosition.y + originalBounds.height / 2,
          rightCenter: targetElementPosition.y + originalBounds.height / 2
        };
        
        // Use our direct snapping logic instead of handleElementMoving to avoid double conversion
        const excludeElements = new Set([elementId]);
        const otherElements = this.getAllOtherElements(excludeElements);
        const guidelines: AlignmentGuide[] = [];
        
        let snapX = targetElementPosition.x;
        let snapY = targetElementPosition.y;
        
        // Check alignment with each other element
        for (const element of otherElements) {
          const other = element.bounds;
          
          // Vertical alignment checks
          if (this.config.enableCenterSnapping && this.isNearPosition(targetBounds.centerX, other.centerX)) {
            snapX = other.centerX - originalBounds.width / 2;
            guidelines.push({
              id: `v-center-${element.id}`,
              type: 'vertical',
              position: other.centerX,
              color: '#ff5f5f',
              alignmentType: 'center'
            });
          }
          if (this.config.enableEdgeSnapping && this.isNearPosition(targetBounds.left, other.left)) {
            snapX = other.left;
            guidelines.push({
              id: `v-left-${element.id}`,
              type: 'vertical',
              position: other.left,
              color: '#ff5f5f',
              alignmentType: 'edge'
            });
          }
          if (this.config.enableEdgeSnapping && this.isNearPosition(targetBounds.right, other.right)) {
            snapX = other.right - originalBounds.width;
            guidelines.push({
              id: `v-right-${element.id}`,
              type: 'vertical',
              position: other.right,
              color: '#ff5f5f',
              alignmentType: 'edge'
            });
          }

          // Horizontal alignment checks
          if (this.config.enableCenterSnapping && this.isNearPosition(targetBounds.centerY, other.centerY)) {
            snapY = other.centerY - originalBounds.height / 2;
            guidelines.push({
              id: `h-center-${element.id}`,
              type: 'horizontal',
              position: other.centerY,
              color: '#ff5f5f',
              alignmentType: 'center'
            });
          }
          if (this.config.enableEdgeSnapping && this.isNearPosition(targetBounds.top, other.top)) {
            snapY = other.top;
            guidelines.push({
              id: `h-top-${element.id}`,
              type: 'horizontal',
              position: other.top,
              color: '#ff5f5f',
              alignmentType: 'edge'
            });
          }
          if (this.config.enableEdgeSnapping && this.isNearPosition(targetBounds.bottom, other.bottom)) {
            snapY = other.bottom - originalBounds.height;
            guidelines.push({
              id: `h-bottom-${element.id}`,
              type: 'horizontal',
              position: other.bottom,
              color: '#ff5f5f',
              alignmentType: 'edge'
            });
          }
        }
        
        // Calculate final snapped bounds for debug projections
        const snappedBounds = {
          ...targetBounds,
          x: snapX,
          y: snapY,
          centerX: snapX + originalBounds.width / 2,
          centerY: snapY + originalBounds.height / 2,
          left: snapX,
          right: snapX + originalBounds.width,
          top: snapY,
          bottom: snapY + originalBounds.height,
          topCenter: snapX + originalBounds.width / 2,
          bottomCenter: snapX + originalBounds.width / 2,
          leftCenter: snapY + originalBounds.height / 2,
          rightCenter: snapY + originalBounds.height / 2
        };
        
        // Generate debug projections with the correct snapped bounds
        const filteredOtherElements = otherElements.filter(element => element.id !== elementId);
        const debugProjections = this.generateDebugProjections(snappedBounds, elementId, filteredOtherElements);
        this.activeDebugProjections = debugProjections;
        this.activeGuidelines = guidelines;
        this.notifyListeners();
        
        // CRITICAL FIX: Calculate proper cursor position adjustment for smooth snapping
        const originalMoveDelta = {
          x: cursorPosition.x - dragStartPoint.x,
          y: cursorPosition.y - dragStartPoint.y
        };
        
        const finalMoveDelta = {
          x: snapX - originalBounds.x,
          y: snapY - originalBounds.y
        };
        
        // Calculate the adjustment needed for smooth snapping
        // If snapping occurred, adjust the cursor position by the snap difference
        const snapAdjustment = {
          x: finalMoveDelta.x - originalMoveDelta.x,
          y: finalMoveDelta.y - originalMoveDelta.y
        };
        
        const snappedCursorPosition = {
          x: cursorPosition.x + snapAdjustment.x,
          y: cursorPosition.y + snapAdjustment.y
        };
        
        console.log('STICKY DEBUG - SMOOTH movement delta conversion:', {
          elementId,
          originalCursorPosition: cursorPosition,
          dragStartPoint,
          originalBounds,
          snappedElementPosition: { x: snapX, y: snapY },
          originalMoveDelta,
          finalMoveDelta,
          snapAdjustment,
          snappedCursorPosition,
          hasSnapping: snapAdjustment.x !== 0 || snapAdjustment.y !== 0
        });
        
        return {
          snappedPoint: snappedCursorPosition,
          guidelines,
          debugProjections
        };
      }
    }
    
    console.log('handleCursorDragMovement fallback - no guidelines');
    // Fallback - no guidelines
    return {
      snappedPoint: cursorPosition,
      guidelines: []
    };
  }

  /**
   * Get information about elements that would provide alignment
   * Useful for previewing alignment without actually moving
   */
  public getAlignmentInfo(position: Point): { 
    hasAlignment: boolean; 
    elementCount: number;
    alignmentTypes: string[];
  } {
    if (!this.config.enabled) {
      return { hasAlignment: false, elementCount: 0, alignmentTypes: [] };
    }

    const result = this.handleDragMovement(position);
    return {
      hasAlignment: result.guidelines.length > 0,
      elementCount: result.snappedElements?.length || 0,
      alignmentTypes: result.guidelines.map(g => g.alignmentType)
    };
  }
}

export const stickyManager = StickyManager.getInstance();