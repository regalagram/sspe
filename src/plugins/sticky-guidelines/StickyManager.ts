import { Point, BoundingBox } from '../../types';
import { useEditorStore } from '../../store/editorStore';
import { 
  getPathBoundingBox, 
  getTextBoundingBox, 
  getImageBoundingBox, 
  getGroupBoundingBox,
  getBoundingBoxAlignmentPoints
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
  type: 'path' | 'text' | 'image' | 'group' | 'use';
  bounds: ElementBounds;
}

export class StickyManager {
  private static instance: StickyManager;
  private config: StickyConfig = {
    enabled: true,
    snapDistance: 12, // Practical value - not too small, not too large
    showGuidelines: true,
    enableEdgeSnapping: true,
    enableCenterSnapping: true,
    enableMidpointSnapping: true,
    debugMode: false // Debug mode disabled by default
  };
  private activeGuidelines: AlignmentGuide[] = [];
  private activeDebugProjections: DebugProjection[] = [];
  private listeners: Array<(guidelines: AlignmentGuide[], debugProjections: DebugProjection[]) => void> = [];

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
    
    switch (elementType) {
      case 'path': {
        const path = store.paths.find(p => p.id === elementId);
        if (!path) return null;
        bbox = getPathBoundingBox(path);
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

  private getAllOtherElements(excludeElements: Set<string>): CanvasElement[] {
    const store = useEditorStore.getState();
    const elements: CanvasElement[] = [];
    
    // Add paths
    store.paths.forEach(path => {
      if (!excludeElements.has(path.id)) {
        const bounds = this.getElementBounds(path.id, 'path');
        if (bounds) {
          elements.push({ id: path.id, type: 'path', bounds });
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
      return [];
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
      addMovingProjections(movingBounds, movingElementId);
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
    console.log('StickyManager: handleSelectionMoving', {
      targetSelectionPosition,
      originalBounds,
      enabled: this.config.enabled,
      movement: {
        dx: targetSelectionPosition.x - originalBounds.x,
        dy: targetSelectionPosition.y - originalBounds.y
      }
    });

    if (!this.config.enabled) {
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

    const selectedElements = this.getSelectedElementsIds();
    const otherElements = this.getAllOtherElements(selectedElements);
    console.log('StickyManager: otherElements found:', otherElements.length);
    
    const guidelines: AlignmentGuide[] = [];
    const snappedElements: string[] = [];
    
    // Calculate where the selection bounds would be at the target position
    const newBounds = {
      x: targetSelectionPosition.x,
      y: targetSelectionPosition.y,
      width: originalBounds.width,
      height: originalBounds.height,
      centerX: targetSelectionPosition.x + originalBounds.width / 2,
      centerY: targetSelectionPosition.y + originalBounds.height / 2,
      left: targetSelectionPosition.x,
      right: targetSelectionPosition.x + originalBounds.width,
      top: targetSelectionPosition.y,
      bottom: targetSelectionPosition.y + originalBounds.height,
      topCenter: targetSelectionPosition.x + originalBounds.width / 2,
      bottomCenter: targetSelectionPosition.x + originalBounds.width / 2,
      leftCenter: targetSelectionPosition.y + originalBounds.height / 2,
      rightCenter: targetSelectionPosition.y + originalBounds.height / 2
    };

    // These will hold the snapped selection bounds
    let snappedBounds = { ...newBounds };

    console.log('StickyManager: Original bounds:', originalBounds);
    console.log('StickyManager: Target position:', targetSelectionPosition);
    console.log('StickyManager: Projected bounds:', newBounds);

    // Check alignment with each other element
    for (const element of otherElements) {
      const other = element.bounds;
      console.log(`StickyManager: Checking alignment with element ${element.id}`);

      // Vertical alignment checks
      if (this.config.enableCenterSnapping && this.isNearPosition(newBounds.centerX, other.centerX)) {
        console.log('StickyManager: Vertical center alignment detected!');
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
        console.log('StickyManager: Vertical left alignment detected!');
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
        console.log('StickyManager: Vertical right alignment detected!');
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
        console.log('StickyManager: Horizontal center alignment detected!');
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
        console.log('StickyManager: Horizontal top alignment detected!');
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
        console.log('StickyManager: Horizontal bottom alignment detected!');
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
    console.log('StickyManager: Debug projections using newBounds:', {
      newBounds: { x: newBounds.x, y: newBounds.y, centerX: newBounds.centerX, centerY: newBounds.centerY },
      originalBounds: { x: originalBounds.x, y: originalBounds.y, centerX: originalBounds.centerX, centerY: originalBounds.centerY },
      targetSelectionPosition: { x: targetSelectionPosition.x, y: targetSelectionPosition.y }
    });
    const debugProjections = this.generateDebugProjections(newBounds, 'selection', filteredOtherElements);
    this.activeDebugProjections = debugProjections;

    this.activeGuidelines = guidelines;
    console.log('StickyManager: Final guidelines created:', guidelines);
    this.notifyListeners();

    // Return the snapped selection bounds directly
    // The caller should use these bounds to position the elements
    const result = {
      snappedPoint: { x: snappedBounds.x, y: snappedBounds.y },
      guidelines,
      snappedElements,
      snappedBounds: snappedBounds,  // Return the complete snapped bounds
      debugProjections
    };
    
    console.log('StickyManager: Returning result:', {
      originalBounds: { x: originalBounds.x, y: originalBounds.y },
      snappedBounds: { x: snappedBounds.x, y: snappedBounds.y },
      selectionMoved: snappedBounds.x !== newBounds.x || snappedBounds.y !== newBounds.y
    });
    
    return result;
  }

  public handleElementMoving(
    elementId: string,
    elementType: string,
    currentBounds: ElementBounds,
    newPosition: Point
  ): StickyResult {
    console.log('StickyManager: handleElementMoving', {
      elementId,
      elementType,
      currentBounds: { x: currentBounds.x, y: currentBounds.y, centerX: currentBounds.centerX, centerY: currentBounds.centerY },
      newPosition,
      movement: {
        dx: newPosition.x - currentBounds.x,
        dy: newPosition.y - currentBounds.y
      },
      enabled: this.config.enabled
    });

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
        
        console.log('StickyManager: Delegating to handleSelectionMoving', {
          elementMovement: { dx: elementDx, dy: elementDy },
          originalSelectionBounds: { x: selectionBounds.x, y: selectionBounds.y },
          targetSelectionPosition
        });
        
        return this.handleSelectionMoving(targetSelectionPosition, selectionBounds);
      }
    }

    const excludeElements = new Set([elementId]);
    const otherElements = this.getAllOtherElements(excludeElements);
    console.log('StickyManager: otherElements found:', otherElements.length);
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

    console.log('StickyManager: Using newBounds for both projections and snapping:', newBounds);

    // Check alignment with each other element using newBounds (same as projections)
    for (const element of otherElements) {
      const other = element.bounds;
      console.log(`StickyManager: Checking alignment with element ${element.id}:`, {
        newBounds: { centerX: newBounds.centerX, centerY: newBounds.centerY, left: newBounds.left, right: newBounds.right, top: newBounds.top, bottom: newBounds.bottom },
        other: { centerX: other.centerX, centerY: other.centerY, left: other.left, right: other.right, top: other.top, bottom: other.bottom },
        snapDistance: this.config.snapDistance,
        distances: {
          centerX: Math.abs(newBounds.centerX - other.centerX),
          centerY: Math.abs(newBounds.centerY - other.centerY),
          left: Math.abs(newBounds.left - other.left),
          right: Math.abs(newBounds.right - other.right),
          top: Math.abs(newBounds.top - other.top),
          bottom: Math.abs(newBounds.bottom - other.bottom)
        }
      });

      // Vertical alignment checks (use separate ifs to allow multiple alignments)
      if (this.config.enableCenterSnapping && this.isNearPosition(newBounds.centerX, other.centerX)) {
        console.log('StickyManager: Vertical center alignment detected!');
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
        console.log('StickyManager: Vertical left alignment detected!');
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
        console.log('StickyManager: Vertical right alignment detected!');
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
        console.log('StickyManager: Horizontal center alignment detected!');
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
        console.log('StickyManager: Horizontal top alignment detected!');
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
        console.log('StickyManager: Horizontal bottom alignment detected!');
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
    // For debug projections, we need to calculate where the element would visually appear to the user
    // The newBounds represents where the element should be mathematically, but visually it moves incrementally
    const filteredOtherElements = otherElements.filter(element => element.id !== elementId);
    
    // Calculate visual position for debug projections (where user sees the element)
    const movementDelta = {
      dx: newPosition.x - currentBounds.x,
      dy: newPosition.y - currentBounds.y
    };
    
    // For debug projections, use the current visual position plus the incremental movement
    const visualBounds = {
      ...currentBounds,
      x: currentBounds.x + movementDelta.dx,
      y: currentBounds.y + movementDelta.dy,
      centerX: currentBounds.centerX + movementDelta.dx,
      centerY: currentBounds.centerY + movementDelta.dy,
      left: currentBounds.left + movementDelta.dx,
      right: currentBounds.right + movementDelta.dx,
      top: currentBounds.top + movementDelta.dy,
      bottom: currentBounds.bottom + movementDelta.dy,
      topCenter: currentBounds.topCenter + movementDelta.dx,
      bottomCenter: currentBounds.bottomCenter + movementDelta.dx,
      leftCenter: currentBounds.leftCenter + movementDelta.dy,
      rightCenter: currentBounds.rightCenter + movementDelta.dy
    };
    
    console.log('StickyManager: Debug projection details:', {
      elementId,
      newBounds: { x: newBounds.x, y: newBounds.y, centerX: newBounds.centerX, centerY: newBounds.centerY },
      currentBounds: { x: currentBounds.x, y: currentBounds.y, centerX: currentBounds.centerX, centerY: currentBounds.centerY },
      visualBounds: { x: visualBounds.x, y: visualBounds.y, centerX: visualBounds.centerX, centerY: visualBounds.centerY },
      movement: movementDelta,
      projectionUsing: 'visualBounds for 1:1 movement with mouse'
    });
    
    const debugProjections = this.generateDebugProjections(visualBounds, elementId, filteredOtherElements);
    this.activeDebugProjections = debugProjections;

    this.activeGuidelines = guidelines;
    console.log('StickyManager: Final guidelines created:', guidelines);
    this.notifyListeners();

    const result = {
      snappedPoint: { x: snapX, y: snapY },
      guidelines,
      debugProjections
    };
    
    console.log('StickyManager: Returning result:', {
      originalPosition: newPosition,
      snappedPoint: result.snappedPoint,
      wasSnapped: snapX !== newPosition.x || snapY !== newPosition.y
    });
    
    return result;
  }

  public clearGuidelines(): void {
    console.log('StickyManager: clearGuidelines called');
    this.activeGuidelines = [];
    
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
   */
  public handleDragMovement(newPosition: Point, elementId?: string, elementType?: string): StickyResult {
    const store = useEditorStore.getState();
    
    // If we have a selection, use the selection movement handler
    if (this.hasSelection(store.selection)) {
      const selectionBounds = this.calculateSelectionBounds();
      if (selectionBounds) {
        return this.handleSelectionMoving(newPosition, selectionBounds);
      }
    }
    
    // If single element specified, use element movement handler
    if (elementId && elementType) {
      const currentBounds = this.getElementBounds(elementId, elementType);
      if (currentBounds) {
        return this.handleElementMoving(elementId, elementType, currentBounds, newPosition);
      }
    }
    
    // Fallback - no guidelines
    return {
      snappedPoint: newPosition,
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