import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { getDistance, getMidpoint, PointerInfo } from '../../utils/gesture-utils';
import { ResourceManager, Disposable } from '../../core/ResourceManager';

// Gesture manager class to handle touch gestures with proper cleanup
class GestureManager implements Disposable {
  private resourceManager = new ResourceManager();
  private pointers: Map<number, PointerInfo> = new Map();
  private initialDistance: number | null = null;
  private initialMidpoint: { x: number; y: number } | null = null;
  private initialZoom: number | null = null;
  private initialPan: { x: number; y: number } | null = null;
  private isProcessingGesture = false;
  private _gestureBlocked = false;

  constructor() {
    this.setupEventListeners();
  }

  get gestureBlocked(): boolean {
    return this._gestureBlocked;
  }

  private setupEventListeners(): void {
    if (typeof document === 'undefined') return;

    this.resourceManager.addEventListener(document, 'pointerdown', this.handlePointerDown, { capture: true });
    this.resourceManager.addEventListener(document, 'pointermove', this.handlePointerMove, { capture: true });
    this.resourceManager.addEventListener(document, 'pointerup', this.handlePointerUp, { capture: true });
    this.resourceManager.addEventListener(document, 'pointercancel', this.handlePointerCancel, { capture: true });
  }

  private handlePointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'touch') {
      const svg = document.querySelector('.svg-editor svg') as SVGSVGElement;
      if (!svg) return;
      
      this.pointers.set(e.pointerId, { pointerId: e.pointerId, x: e.clientX, y: e.clientY });
      
      if (this.pointers.size >= 2) {
        this.isProcessingGesture = true;
        e.preventDefault();
        e.stopPropagation();
        this._gestureBlocked = true;
      }
    }
  };

  private handlePointerMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch' && this.pointers.has(e.pointerId)) {
      this.pointers.set(e.pointerId, { pointerId: e.pointerId, x: e.clientX, y: e.clientY });
      
      if (this.pointers.size >= 2 && this.isProcessingGesture) {
        e.preventDefault();
        e.stopPropagation();
        
        const pointersArray = Array.from(this.pointers.values());
        const currentDistance = getDistance(pointersArray[0], pointersArray[1]);
        const currentMidpoint = getMidpoint(pointersArray[0], pointersArray[1]);
        
        if (this.initialDistance === null) {
          this.initialDistance = currentDistance;
          this.initialMidpoint = currentMidpoint;
          const state = useEditorStore.getState();
          this.initialZoom = state.viewport?.zoom || 1;
          this.initialPan = { x: state.viewport?.pan?.x || 0, y: state.viewport?.pan?.y || 0 };
        } else {
          const scaleRatio = currentDistance / this.initialDistance;
          const newZoom = Math.max(0.1, Math.min(10, this.initialZoom! * scaleRatio));
          
          const panDelta = {
            x: (currentMidpoint.x - this.initialMidpoint!.x) * 0.5,
            y: (currentMidpoint.y - this.initialMidpoint!.y) * 0.5
          };
          
          const newPanX = this.initialPan!.x + panDelta.x;
          const newPanY = this.initialPan!.y + panDelta.y;
          
          // Use the correct viewport update methods
          const store = useEditorStore.getState();
          store.setZoom(newZoom);
          store.setPan({ x: newPanX, y: newPanY });
        }
      }
    }
  };

  private handlePointerUp = (e: PointerEvent) => {
    if (e.pointerType === 'touch') {
      this.pointers.delete(e.pointerId);
      
      if (this.pointers.size < 2) {
        this.isProcessingGesture = false;
        this.initialDistance = null;
        this.initialMidpoint = null;
        this.initialZoom = null;
        this.initialPan = null;
        
        setTimeout(() => {
          this._gestureBlocked = false;
        }, 50);
      }
    }
  };

  private handlePointerCancel = (e: PointerEvent) => {
    if (e.pointerType === 'touch') {
      this.pointers.delete(e.pointerId);
      
      if (this.pointers.size < 2) {
        this.isProcessingGesture = false;
        this.initialDistance = null;
        this.initialMidpoint = null;
        this.initialZoom = null;
        this.initialPan = null;
        
        setTimeout(() => {
          this._gestureBlocked = false;
        }, 50);
      }
    }
  };

  dispose(): void {
    this.resourceManager.dispose();
    this.pointers.clear();
    this._gestureBlocked = false;
  }
}

// Global gesture manager instance - singleton pattern
let gestureManager: GestureManager | null = null;

// Initialize gesture manager only once
const getGestureManager = (): GestureManager => {
  if (!gestureManager) {
    gestureManager = new GestureManager();
  }
  return gestureManager;
};

// Export for backward compatibility
export const isGestureBlocked = (): boolean => getGestureManager().gestureBlocked;

// Track if plugin has been initialized
let isInitialized = false;

// Main plugin export that PluginInitializer expects
export const GesturesPlugin: Plugin = {
  id: 'gestures',
  name: 'Gestures',
  version: '1.0.0',
  enabled: true,

  initialize: (editorStore) => {
    // Prevent multiple initializations
    if (isInitialized) {
      return;
    }
    
    isInitialized = true;
    
    // Initialize gesture manager (will only create once due to singleton)
    getGestureManager();
  },

  destroy: () => {
    if (gestureManager) {
      gestureManager.dispose();
      gestureManager = null;
      isInitialized = false;
    }
  },
};
