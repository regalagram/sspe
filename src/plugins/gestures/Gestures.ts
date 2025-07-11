import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { getDistance, getMidpoint, PointerInfo } from '../../utils/gesture-utils';

// No UI, only canvas gesture handling

let pointers: Map<number, PointerInfo> = new Map();
let initialDistance: number | null = null;
let initialMidpoint: { x: number; y: number } | null = null;
let initialZoom: number | null = null;
let initialPan: { x: number; y: number } | null = null;

function handlePointerDown(e: PointerEvent) {
  pointers.set(e.pointerId, { pointerId: e.pointerId, x: e.clientX, y: e.clientY });
}

function handlePointerMove(e: PointerEvent) {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { pointerId: e.pointerId, x: e.clientX, y: e.clientY });

  if (pointers.size === 2) {
    const pointerArr = Array.from(pointers.values());
    const store = useEditorStore.getState();
    const viewport = store.viewport;

    // Pinch zoom
    const dist = getDistance(pointerArr[0], pointerArr[1]);
    const midpoint = getMidpoint(pointerArr[0], pointerArr[1]);

    if (initialDistance === null) {
      initialDistance = dist;
      initialMidpoint = midpoint;
      initialZoom = viewport.zoom;
      initialPan = { ...viewport.pan };
      return;
    }

    // Zoom factor
    const zoomFactor = dist / initialDistance;
    store.setZoom(Math.max(0.1, Math.min(initialZoom! * zoomFactor, 20)));

    // Pan (move midpoint)
    const dx = midpoint.x - initialMidpoint!.x;
    const dy = midpoint.y - initialMidpoint!.y;
    store.setPan({ x: initialPan!.x + dx / viewport.zoom, y: initialPan!.y + dy / viewport.zoom });
  }
}

function handlePointerUp(e: PointerEvent) {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) {
    initialDistance = null;
    initialMidpoint = null;
    initialZoom = null;
    initialPan = null;
  }
}

function handlePointerCancel(e: PointerEvent) {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) {
    initialDistance = null;
    initialMidpoint = null;
    initialZoom = null;
    initialPan = null;
  }
}

export const GesturesPlugin: Plugin = {
  id: 'gestures',
  name: 'Gestures',
  version: '1.0.0',
  enabled: true,
  ui: [], // No UI
  pointerHandlers: {
    onPointerDown: (e: React.PointerEvent<SVGElement>, _context) => {
      handlePointerDown(e.nativeEvent);
      // Solo capturar si hay dos o más pointers activos después de agregar el nuevo pointer
      return pointers.size >= 2;
    },
    onPointerMove: (e: React.PointerEvent<SVGElement>, _context) => {
      handlePointerMove(e.nativeEvent);
      // Si hay dos pointers activos, capturar el evento
      return pointers.size >= 2;
    },
    onPointerUp: (e: React.PointerEvent<SVGElement>, _context) => {
      handlePointerUp(e.nativeEvent);
      // Si hay dos pointers activos, capturar el evento
      return pointers.size >= 2;
    },
  },
};
