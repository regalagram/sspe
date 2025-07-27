import { Point, SnappingConfig, ActiveSnap } from '../../types';
import { generateId } from '../../utils/id-utils';
import { useEditorStore } from '../../store/editorStore';

interface VerticalLine {
  x: number;
  y1: number;
  y2: number;
}

interface HorizontalLine {
  x1: number;
  x2: number;
  y: number;
}

interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export class GuidelinesManager {
  private static instance: GuidelinesManager;
  private config: SnappingConfig;
  private activeSnap: ActiveSnap | null = null;
  private listeners: Array<(snap: ActiveSnap | null) => void> = [];
  private verticalLines: VerticalLine[] = [];
  private horizontalLines: HorizontalLine[] = [];
  private aligningLineOffset = 5;
  private aligningLineMargin = 4;

  private constructor() {
    this.config = {
      enabled: true,
      detectionRadius: 4,
      snapDuration: 200,
      guidelineColor: 'rgba(255,95,95,1)',
      showStaticGuides: true,
      showDynamicGuides: true,
      showGridGuides: false,
      showDistanceGuides: false,
      gridSize: 20,
      distanceGuideColor: '#00aa00',
      distanceTolerance: 5
    };
  }

  public static getInstance(): GuidelinesManager {
    if (!GuidelinesManager.instance) {
      GuidelinesManager.instance = new GuidelinesManager();
    }
    return GuidelinesManager.instance;
  }

  public updateConfig(updates: Partial<SnappingConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  public getConfig(): SnappingConfig {
    return { ...this.config };
  }

  public subscribe(listener: (snap: ActiveSnap | null) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.activeSnap));
  }

  public getActiveSnap(): ActiveSnap | null {
    return this.activeSnap;
  }

  public getVerticalLines(): VerticalLine[] {
    return this.verticalLines;
  }

  public getHorizontalLines(): HorizontalLine[] {
    return this.horizontalLines;
  }

  // Check if a value is within the snapping range
  private isInRange(value1: number, value2: number): boolean {
    value1 = Math.round(value1);
    value2 = Math.round(value2);
    for (let i = value1 - this.aligningLineMargin, len = value1 + this.aligningLineMargin; i <= len; i++) {
      if (i === value2) {
        return true;
      }
    }
    return false;
  }

  // Get bounds of an element - simplified implementation
  private getElementBounds(elementId: string, elementType: 'path' | 'text' | 'group' | 'image' | 'use'): ElementBounds | null {
    const store = useEditorStore.getState();
    
    switch (elementType) {
      case 'path': {
        const path = store.paths.find(p => p.id === elementId);
        if (!path) return null;
        
        // Calculate simple bounding box from commands
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let hasPoints = false;
        
        path.subPaths.forEach(subPath => {
          subPath.commands.forEach(cmd => {
            if (cmd.x !== undefined && cmd.y !== undefined) {
              minX = Math.min(minX, cmd.x);
              minY = Math.min(minY, cmd.y);
              maxX = Math.max(maxX, cmd.x);
              maxY = Math.max(maxY, cmd.y);
              hasPoints = true;
            }
          });
        });
        
        if (!hasPoints) return null;
        
        const width = maxX - minX;
        const height = maxY - minY;
        return {
          x: minX,
          y: minY,
          width,
          height,
          centerX: minX + width / 2,
          centerY: minY + height / 2
        };
      }
      
      case 'text': {
        const text = store.texts.find(t => t.id === elementId);
        if (!text) return null;
        
        const fontSize = text.style?.fontSize || 16;
        const width = 100; // Simplified
        const height = fontSize;
        
        return {
          x: text.x,
          y: text.y - fontSize * 0.8,
          width,
          height,
          centerX: text.x + width / 2,
          centerY: text.y - fontSize * 0.3
        };
      }
      
      case 'image': {
        const image = store.images.find(i => i.id === elementId);
        if (!image) return null;
        
        return {
          x: image.x,
          y: image.y,
          width: image.width,
          height: image.height,
          centerX: image.x + image.width / 2,
          centerY: image.y + image.height / 2
        };
      }
      
      case 'use': {
        const use = store.uses.find(u => u.id === elementId);
        if (!use) return null;
        
        const width = use.width || 100;
        const height = use.height || 100;
        const x = use.x || 0;
        const y = use.y || 0;
        
        return {
          x,
          y,
          width,
          height,
          centerX: x + width / 2,
          centerY: y + height / 2
        };
      }
      
      default:
        return null;
    }
  }

  // Get all other elements for guideline generation
  private getAllOtherElements(excludeId?: string, excludeType?: string): Array<{ id: string; type: string; bounds: ElementBounds }> {
    const store = useEditorStore.getState();
    const elements: Array<{ id: string; type: string; bounds: ElementBounds }> = [];
    
    // Add paths
    store.paths.forEach(path => {
      if (excludeId === path.id && excludeType === 'path') return;
      const bounds = this.getElementBounds(path.id, 'path');
      if (bounds) {
        elements.push({ id: path.id, type: 'path', bounds });
      }
    });
    
    // Add texts
    store.texts.forEach(text => {
      if (excludeId === text.id && excludeType === 'text') return;
      const bounds = this.getElementBounds(text.id, 'text');
      if (bounds) {
        elements.push({ id: text.id, type: 'text', bounds });
      }
    });
    
    // Add images
    store.images.forEach(image => {
      if (excludeId === image.id && excludeType === 'image') return;
      const bounds = this.getElementBounds(image.id, 'image');
      if (bounds) {
        elements.push({ id: image.id, type: 'image', bounds });
      }
    });
    
    // Add uses
    store.uses.forEach(use => {
      if (excludeId === use.id && excludeType === 'use') return;
      const bounds = this.getElementBounds(use.id, 'use');
      if (bounds) {
        elements.push({ id: use.id, type: 'use', bounds });
      }
    });
    
    return elements;
  }

  // Handle element moving event - This is the main guideline logic
  public handleElementMoving(
    activeElementId: string,
    activeElementType: string,
    activeElementBounds: ElementBounds,
    newPosition: Point
  ): Point {
    if (!this.config.enabled) {
      return newPosition;
    }

    // Get all other elements for comparison
    const otherElements = this.getAllOtherElements(activeElementId, activeElementType);
    
    // Clear previous guidelines
    this.verticalLines = [];
    this.horizontalLines = [];
    
    let horizontalInTheRange = false;
    let verticalInTheRange = false;
    
    // Current active element dimensions at new position
    const activeLeft = newPosition.x + activeElementBounds.width / 2;
    const activeTop = newPosition.y + activeElementBounds.height / 2;
    const activeWidth = activeElementBounds.width;
    const activeHeight = activeElementBounds.height;
    
    // Variables to track snapping positions
    let snapX = newPosition.x;
    let snapY = newPosition.y;

    // Check each other element for alignment
    for (const element of otherElements) {
      const objectLeft = element.bounds.centerX;
      const objectTop = element.bounds.centerY;
      const objectWidth = element.bounds.width;
      const objectHeight = element.bounds.height;

      // Snap by horizontal center line
      if (this.isInRange(objectLeft, activeLeft)) {
        verticalInTheRange = true;
        this.verticalLines = [{
          x: objectLeft,
          y1: objectTop < activeTop
            ? objectTop - objectHeight / 2 - this.aligningLineOffset
            : objectTop + objectHeight / 2 + this.aligningLineOffset,
          y2: activeTop > objectTop
            ? activeTop + activeHeight / 2 + this.aligningLineOffset
            : activeTop - activeHeight / 2 - this.aligningLineOffset,
        }];
        snapX = objectLeft - activeWidth / 2;
      }

      // Snap by vertical center line
      if (this.isInRange(objectTop, activeTop)) {
        horizontalInTheRange = true;
        this.horizontalLines = [{
          y: objectTop,
          x1: objectLeft < activeLeft
            ? objectLeft - objectWidth / 2 - this.aligningLineOffset
            : objectLeft + objectWidth / 2 + this.aligningLineOffset,
          x2: activeLeft > objectLeft
            ? activeLeft + activeWidth / 2 + this.aligningLineOffset
            : activeLeft - activeWidth / 2 - this.aligningLineOffset,
        }];
        snapY = objectTop - activeHeight / 2;
      }

      // Snap by left edge
      if (this.isInRange(objectLeft - objectWidth / 2, activeLeft - activeWidth / 2)) {
        verticalInTheRange = true;
        this.verticalLines = [{
          x: objectLeft - objectWidth / 2,
          y1: objectTop < activeTop
            ? objectTop - objectHeight / 2 - this.aligningLineOffset
            : objectTop + objectHeight / 2 + this.aligningLineOffset,
          y2: activeTop > objectTop
            ? activeTop + activeHeight / 2 + this.aligningLineOffset
            : activeTop - activeHeight / 2 - this.aligningLineOffset,
        }];
        snapX = (objectLeft - objectWidth / 2) - activeWidth / 2;
      }

      // Snap by right edge
      if (this.isInRange(objectLeft + objectWidth / 2, activeLeft + activeWidth / 2)) {
        verticalInTheRange = true;
        this.verticalLines = [{
          x: objectLeft + objectWidth / 2,
          y1: objectTop < activeTop
            ? objectTop - objectHeight / 2 - this.aligningLineOffset
            : objectTop + objectHeight / 2 + this.aligningLineOffset,
          y2: activeTop > objectTop
            ? activeTop + activeHeight / 2 + this.aligningLineOffset
            : activeTop - activeHeight / 2 - this.aligningLineOffset,
        }];
        snapX = (objectLeft + objectWidth / 2) - activeWidth / 2;
      }

      // Snap by top edge
      if (this.isInRange(objectTop - objectHeight / 2, activeTop - activeHeight / 2)) {
        horizontalInTheRange = true;
        this.horizontalLines = [{
          y: objectTop - objectHeight / 2,
          x1: objectLeft < activeLeft
            ? objectLeft - objectWidth / 2 - this.aligningLineOffset
            : objectLeft + objectWidth / 2 + this.aligningLineOffset,
          x2: activeLeft > objectLeft
            ? activeLeft + activeWidth / 2 + this.aligningLineOffset
            : activeLeft - activeWidth / 2 - this.aligningLineOffset,
        }];
        snapY = (objectTop - objectHeight / 2) - activeHeight / 2;
      }

      // Snap by bottom edge
      if (this.isInRange(objectTop + objectHeight / 2, activeTop + activeHeight / 2)) {
        horizontalInTheRange = true;
        this.horizontalLines = [{
          y: objectTop + objectHeight / 2,
          x1: objectLeft < activeLeft
            ? objectLeft - objectWidth / 2 - this.aligningLineOffset
            : objectLeft + objectWidth / 2 + this.aligningLineOffset,
          x2: activeLeft > objectLeft
            ? activeLeft + activeWidth / 2 + this.aligningLineOffset
            : activeLeft - activeWidth / 2 - this.aligningLineOffset,
        }];
        snapY = (objectTop + objectHeight / 2) - activeHeight / 2;
      }
    }

    // Clear guidelines if not in range
    if (!horizontalInTheRange) {
      this.horizontalLines = [];
    }
    if (!verticalInTheRange) {
      this.verticalLines = [];
    }

    // Update active snap for rendering
    const hasGuidelines = this.verticalLines.length > 0 || this.horizontalLines.length > 0;
    if (hasGuidelines) {
      this.activeSnap = {
        guidelines: [
          ...this.verticalLines.map(line => ({
            id: generateId(),
            type: 'vertical' as const,
            position: line.x,
            points: [],
            color: this.config.guidelineColor,
            visible: true
          })),
          ...this.horizontalLines.map(line => ({
            id: generateId(),
            type: 'horizontal' as const,
            position: line.y,
            points: [],
            color: this.config.guidelineColor,
            visible: true
          }))
        ],
        distanceGuidelines: [],
        distanceMarkers: [],
        snapPoint: { x: snapX, y: snapY },
        targetPoint: newPosition,
        snapTime: Date.now()
      };
    } else {
      this.activeSnap = null;
    }

    this.notifyListeners();
    
    // Return snapped position
    return { x: snapX, y: snapY };
  }

  // Clear snap state
  public clearSnap(): void {
    this.activeSnap = null;
    this.verticalLines = [];
    this.horizontalLines = [];
    this.notifyListeners();
  }

  // Clear guidelines after operation ends
  public endOperation(): void {
    this.clearSnap();
  }
}

export const guidelinesManager = GuidelinesManager.getInstance();