import { Point } from '../../types';
import { useEditorStore } from '../../store/editorStore';

export interface StickyConfig {
  enabled: boolean;
  snapDistance: number; // pixels
  showGuidelines: boolean;
}

export interface AlignmentGuide {
  id: string;
  type: 'horizontal' | 'vertical';
  position: number;
  color: string;
}

export interface StickyResult {
  snappedPoint: Point;
  guidelines: AlignmentGuide[];
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
}

export class StickyManager {
  private static instance: StickyManager;
  private config: StickyConfig = {
    enabled: true,
    snapDistance: 12, // Practical value - not too small, not too large
    showGuidelines: true
  };
  private activeGuidelines: AlignmentGuide[] = [];
  private listeners: Array<(guidelines: AlignmentGuide[]) => void> = [];

  private constructor() {}

  public static getInstance(): StickyManager {
    if (!StickyManager.instance) {
      StickyManager.instance = new StickyManager();
    }
    return StickyManager.instance;
  }

  public updateConfig(updates: Partial<StickyConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  public getConfig(): StickyConfig {
    return { ...this.config };
  }

  public subscribe(listener: (guidelines: AlignmentGuide[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.activeGuidelines));
  }

  public getActiveGuidelines(): AlignmentGuide[] {
    return this.activeGuidelines;
  }

  private getElementBounds(elementId: string, elementType: string): ElementBounds | null {
    const store = useEditorStore.getState();
    
    switch (elementType) {
      case 'path': {
        const path = store.paths.find(p => p.id === elementId);
        if (!path) return null;
        
        // Calculate bounding box from commands
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
          centerY: minY + height / 2,
          left: minX,
          right: maxX,
          top: minY,
          bottom: maxY
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
          centerY: text.y - fontSize * 0.3,
          left: text.x,
          right: text.x + width,
          top: text.y - fontSize * 0.8,
          bottom: text.y
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
          centerY: image.y + image.height / 2,
          left: image.x,
          right: image.x + image.width,
          top: image.y,
          bottom: image.y + image.height
        };
      }
      
      default:
        return null;
    }
  }

  private getAllOtherElements(excludeId: string, excludeType: string): Array<{ id: string; type: string; bounds: ElementBounds }> {
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
    
    return elements;
  }

  private isNearPosition(pos1: number, pos2: number): boolean {
    return Math.abs(pos1 - pos2) <= this.config.snapDistance;
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
      currentBounds,
      newPosition,
      enabled: this.config.enabled
    });

    if (!this.config.enabled) {
      return {
        snappedPoint: newPosition,
        guidelines: []
      };
    }

    const otherElements = this.getAllOtherElements(elementId, elementType);
    console.log('StickyManager: otherElements found:', otherElements.length);
    const guidelines: AlignmentGuide[] = [];
    
    // Calculate new bounds at proposed position
    const deltaX = newPosition.x - currentBounds.x;
    const deltaY = newPosition.y - currentBounds.y;
    
    const newBounds = {
      ...currentBounds,
      x: newPosition.x,
      y: newPosition.y,
      centerX: currentBounds.centerX + deltaX,
      centerY: currentBounds.centerY + deltaY,
      left: currentBounds.left + deltaX,
      right: currentBounds.right + deltaX,
      top: currentBounds.top + deltaY,
      bottom: currentBounds.bottom + deltaY
    };

    let snapX = newPosition.x;
    let snapY = newPosition.y;

    console.log('StickyManager: newBounds calculated:', newBounds);

    // Check alignment with each other element
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
      if (this.isNearPosition(newBounds.centerX, other.centerX)) {
        console.log('StickyManager: Vertical center alignment detected!');
        // Snap to center alignment - adjust the element's position so its center aligns
        const targetCenterX = other.centerX;
        snapX = targetCenterX - currentBounds.width / 2;
        guidelines.push({
          id: `v-center-${element.id}`,
          type: 'vertical',
          position: other.centerX,
          color: '#ff5f5f'
        });
      }
      if (this.isNearPosition(newBounds.left, other.left)) {
        console.log('StickyManager: Vertical left alignment detected!');
        // Snap to left edge alignment
        snapX = other.left;
        guidelines.push({
          id: `v-left-${element.id}`,
          type: 'vertical',
          position: other.left,
          color: '#ff5f5f'
        });
      }
      if (this.isNearPosition(newBounds.right, other.right)) {
        console.log('StickyManager: Vertical right alignment detected!');
        // Snap to right edge alignment  
        snapX = other.right - currentBounds.width;
        guidelines.push({
          id: `v-right-${element.id}`,
          type: 'vertical',
          position: other.right,
          color: '#ff5f5f'
        });
      }

      // Horizontal alignment checks (use separate ifs to allow multiple alignments)
      if (this.isNearPosition(newBounds.centerY, other.centerY)) {
        console.log('StickyManager: Horizontal center alignment detected!');
        // Snap to center alignment - adjust the element's position so its center aligns
        const targetCenterY = other.centerY;
        snapY = targetCenterY - currentBounds.height / 2;
        guidelines.push({
          id: `h-center-${element.id}`,
          type: 'horizontal',
          position: other.centerY,
          color: '#ff5f5f'
        });
      }
      if (this.isNearPosition(newBounds.top, other.top)) {
        console.log('StickyManager: Horizontal top alignment detected!');
        // Snap to top edge alignment
        snapY = other.top;
        guidelines.push({
          id: `h-top-${element.id}`,
          type: 'horizontal',
          position: other.top,
          color: '#ff5f5f'
        });
      }
      if (this.isNearPosition(newBounds.bottom, other.bottom)) {
        console.log('StickyManager: Horizontal bottom alignment detected!');
        // Snap to bottom edge alignment
        snapY = other.bottom - currentBounds.height;
        guidelines.push({
          id: `h-bottom-${element.id}`,
          type: 'horizontal',
          position: other.bottom,
          color: '#ff5f5f'
        });
      }
    }

    this.activeGuidelines = guidelines;
    console.log('StickyManager: Final guidelines created:', guidelines);
    this.notifyListeners();

    const result = {
      snappedPoint: { x: snapX, y: snapY },
      guidelines
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
    this.notifyListeners();
  }
}

export const stickyManager = StickyManager.getInstance();