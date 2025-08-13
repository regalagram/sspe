import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { getDistance, getMidpoint, PointerInfo } from '../../utils/gesture-utils';

// Estrategia simple: manejar gestures completamente a través de eventos globales
// No depender del sistema de plugins para multi-touch

let pointers: Map<number, PointerInfo> = new Map();
let initialDistance: number | null = null;
let initialMidpoint: { x: number; y: number } | null = null;
let initialZoom: number | null = null;
let initialPan: { x: number; y: number } | null = null;

// Simplificar: solo usar eventos globales directamente
if (typeof document !== 'undefined') {
  let isProcessingGesture = false;
  
  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') {
      const svg = document.querySelector('.svg-editor svg') as SVGSVGElement;
      if (!svg) return;
      
      const rect = svg.getBoundingClientRect();
      const svgPoint = {
        x: (e.clientX - rect.left) / rect.width * svg.viewBox.baseVal.width,
        y: (e.clientY - rect.top) / rect.height * svg.viewBox.baseVal.height
      };
      
      pointers.set(e.pointerId, { pointerId: e.pointerId, x: e.clientX, y: e.clientY });
      
      // Si hay 2+ dedos, comenzar gesto
      if (pointers.size >= 2) {
        isProcessingGesture = true;
        e.preventDefault();
        e.stopPropagation();
        
        // Bloquear selección
        if (typeof window !== 'undefined') {
          (window as any).gestureBlocked = true;
        }
      }
    }
  }, { capture: true });
  
  document.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch' && pointers.has(e.pointerId)) {
      pointers.set(e.pointerId, { pointerId: e.pointerId, x: e.clientX, y: e.clientY });
      
      if (pointers.size >= 2 && isProcessingGesture) {
        e.preventDefault();
        e.stopPropagation();
        
        const pointerArr = Array.from(pointers.values());
        const twoPointers = [pointerArr[0], pointerArr[1]];
        
        const store = useEditorStore.getState();
        const viewport = store.viewport;

        const dist = getDistance(twoPointers[0], twoPointers[1]);
        const midpoint = getMidpoint(twoPointers[0], twoPointers[1]);

        if (initialDistance === null) {
          initialDistance = dist;
          initialMidpoint = midpoint;
          initialZoom = viewport.zoom;
          initialPan = { ...viewport.pan };
          return;
        }

        const zoomFactor = dist / initialDistance;
        const newZoom = Math.max(0.1, Math.min(initialZoom! * zoomFactor, 20));
        
        const dx = midpoint.x - initialMidpoint!.x;
        const dy = midpoint.y - initialMidpoint!.y;
        const newPan = { 
          x: initialPan!.x + dx / viewport.zoom, 
          y: initialPan!.y + dy / viewport.zoom 
        };
        
        store.setZoom(newZoom);
        store.setPan(newPan);
      }
    }
  }, { capture: true });
  
  document.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'touch') {
      pointers.delete(e.pointerId);
      
      if (pointers.size < 2) {
        isProcessingGesture = false;
        initialDistance = null;
        initialMidpoint = null;
        initialZoom = null;
        initialPan = null;
        
        // Desbloquear selección
        if (typeof window !== 'undefined') {
          (window as any).gestureBlocked = false;
        }
      }
    }
  }, { capture: true });
  
  document.addEventListener('pointercancel', (e) => {
    if (e.pointerType === 'touch') {
      pointers.delete(e.pointerId);
      
      if (pointers.size < 2) {
        isProcessingGesture = false;
        initialDistance = null;
        initialMidpoint = null;
        initialZoom = null;
        initialPan = null;
        
        if (typeof window !== 'undefined') {
          (window as any).gestureBlocked = false;
        }
      }
    }
  }, { capture: true });
}

export const GesturesPlugin: Plugin = {
  id: 'gestures',
  name: 'Gestures',
  version: '1.0.0',
  enabled: true,
  ui: [], // No UI
  // No pointer handlers - todo se maneja via eventos globales
};
