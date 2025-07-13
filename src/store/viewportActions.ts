import { StateCreator } from 'zustand';
import { EditorState, Point, ViewportState } from '../types';
import { getAllPathsBounds, getSelectedElementsBounds, getSelectedSubPathsBounds } from '../utils/path-utils';

export interface ViewportActions {
  setZoom: (zoom: number, center?: Point) => void;
  zoomIn: (center?: Point) => void;
  zoomOut: (center?: Point) => void;
  zoomToFit: () => void;
  zoomToSelection: () => void;
  zoomToSubPath: () => void;
  pan: (delta: Point) => void;
  setPan: (pan: Point) => void;
  resetView: () => void;
  resetViewportCompletely: () => void;
}

const validateViewport = (viewport: ViewportState) => {
  return {
    ...viewport,
    zoom: isFinite(viewport.zoom) && viewport.zoom > 0 ? viewport.zoom : 1,
    pan: {
      x: isFinite(viewport.pan.x) ? viewport.pan.x : 0,
      y: isFinite(viewport.pan.y) ? viewport.pan.y : 0,
    },
  };
};

export const createViewportActions: StateCreator<
  EditorState & ViewportActions,
  [],
  [],
  ViewportActions
> = (set, get) => ({
  setZoom: (zoom, center) =>
    set((state) => {
      if (!isFinite(zoom) || zoom <= 0) {
        console.warn('Invalid zoom value:', zoom);
        return state;
      }
      let newPan = state.viewport.pan;
      if (center && isFinite(center.x) && isFinite(center.y)) {
        const zoomRatio = zoom / state.viewport.zoom;
        if (isFinite(zoomRatio)) {
          newPan = {
            x: center.x - (center.x - state.viewport.pan.x) * zoomRatio,
            y: center.y - (center.y - state.viewport.pan.y) * zoomRatio,
          };
        }
      }
      const newViewport = validateViewport({
        ...state.viewport,
        zoom: Math.max(0.1, Math.min(10, zoom)),
        pan: newPan,
      });
      const newState = {
        viewport: newViewport,
      };
      return newState;
    }),

  zoomIn: (center) => {
    const { viewport } = get();
    get().setZoom(viewport.zoom * 1.2, center);
  },

  zoomOut: (center) => {
    const { viewport } = get();
    get().setZoom(viewport.zoom / 1.2, center);
  },

  zoomToFit: () => {
    const state = get();
    const { paths, viewport } = state;
    const bounds = getAllPathsBounds(paths);
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
      set({
        viewport: validateViewport({
          ...viewport,
          zoom: 1,
          pan: { x: 0, y: 0 },
        }),
      });
      return;
    }
    let viewportWidth = 800;
    let viewportHeight = 600;
    const svgElement = document.querySelector('svg');
    if (svgElement) {
      const rect = svgElement.getBoundingClientRect();
      if (rect.width > 100 && rect.height > 100) {
        viewportWidth = rect.width;
        viewportHeight = rect.height;
      }
    }
    if (viewportWidth < 100 || viewportHeight < 100) {
      viewportWidth = window.innerWidth * 0.8;
      viewportHeight = window.innerHeight * 0.8;
    }
    if (!isFinite(viewportWidth) || !isFinite(viewportHeight) || viewportWidth <= 0 || viewportHeight <= 0) {
      console.warn('Invalid viewport dimensions:', viewportWidth, viewportHeight);
      return;
    }
    const contentWidth = Math.max(bounds.width, 1);
    const contentHeight = Math.max(bounds.height, 1);
    const padding = 20;
    const availableWidth = Math.max(viewportWidth - padding * 2, 50);
    const availableHeight = Math.max(viewportHeight - padding * 2, 50);
    const zoomX = availableWidth / contentWidth;
    const zoomY = availableHeight / contentHeight;
    let newZoom = Math.min(zoomX, zoomY);
    if (!isFinite(newZoom) || newZoom <= 0) {
      console.warn('Invalid zoom calculation:', newZoom);
      return;
    }
    newZoom = Math.max(0.1, Math.min(newZoom, 10));
    const contentCenterX = bounds.x + bounds.width / 2;
    const contentCenterY = bounds.y + bounds.height / 2;
    if (!isFinite(contentCenterX) || !isFinite(contentCenterY)) {
      console.warn('Invalid content center:', contentCenterX, contentCenterY);
      return;
    }
    const viewportCenterX = viewportWidth / 2;
    const viewportCenterY = viewportHeight / 2;
    const newPanX = viewportCenterX - contentCenterX * newZoom;
    const newPanY = viewportCenterY - contentCenterY * newZoom;
    if (!isFinite(newPanX) || !isFinite(newPanY)) {
      console.warn('Invalid pan calculation:', newPanX, newPanY);
      return;
    }
    set({
      viewport: validateViewport({
        ...viewport,
        zoom: newZoom,
        pan: { x: newPanX, y: newPanY },
      }),
    });
  },

  zoomToSelection: () => {
    const state = get();
    const { paths, viewport, selection } = state;
    const bounds = getSelectedElementsBounds(paths, selection.selectedCommands);
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
      return;
    }
    let viewportWidth = 800;
    let viewportHeight = 600;
    const svgElement = document.querySelector('svg');
    if (svgElement) {
      const rect = svgElement.getBoundingClientRect();
      if (rect.width > 100 && rect.height > 100) {
        viewportWidth = rect.width;
        viewportHeight = rect.height;
      }
    }
    if (viewportWidth < 100 || viewportHeight < 100) {
      viewportWidth = window.innerWidth * 0.8;
      viewportHeight = window.innerHeight * 0.8;
    }
    const selectionWidth = Math.max(bounds.width, 1);
    const selectionHeight = Math.max(bounds.height, 1);
    const padding = 20;
    const availableWidth = Math.max(viewportWidth - padding * 2, 50);
    const availableHeight = Math.max(viewportHeight - padding * 2, 50);
    const zoomX = availableWidth / selectionWidth;
    const zoomY = availableHeight / selectionHeight;
    let newZoom = Math.min(zoomX, zoomY);
    if (!isFinite(newZoom) || newZoom <= 0) {
      console.warn('Invalid zoom calculation in zoomToSelection:', newZoom);
      return;
    }
    newZoom = Math.max(0.1, Math.min(newZoom, 20));
    const selectionCenterX = bounds.x + bounds.width / 2;
    const selectionCenterY = bounds.y + bounds.height / 2;
    if (!isFinite(selectionCenterX) || !isFinite(selectionCenterY)) {
      console.warn('Invalid selection center:', selectionCenterX, selectionCenterY);
      return;
    }
    const viewportCenterX = viewportWidth / 2;
    const viewportCenterY = viewportHeight / 2;
    const newPanX = viewportCenterX - selectionCenterX * newZoom;
    const newPanY = viewportCenterY - selectionCenterY * newZoom;
    if (!isFinite(newPanX) || !isFinite(newPanY)) {
      console.warn('Invalid pan calculation in zoomToSelection:', newPanX, newPanY);
      return;
    }
    set({
      viewport: validateViewport({
        ...viewport,
        zoom: newZoom,
        pan: { x: newPanX, y: newPanY },
      }),
    });
  },

  zoomToSubPath: () => {
    const state = get();
    const { paths, viewport, selection } = state;
    const bounds = getSelectedSubPathsBounds(paths, selection.selectedSubPaths);
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
      return;
    }
    let viewportWidth = 800;
    let viewportHeight = 600;
    const svgElement = document.querySelector('svg');
    if (svgElement) {
      const rect = svgElement.getBoundingClientRect();
      if (rect.width > 100 && rect.height > 100) {
        viewportWidth = rect.width;
        viewportHeight = rect.height;
      }
    }
    if (viewportWidth < 100 || viewportHeight < 100) {
      viewportWidth = window.innerWidth * 0.8;
      viewportHeight = window.innerHeight * 0.8;
    }
    const subPathWidth = Math.max(bounds.width, 1);
    const subPathHeight = Math.max(bounds.height, 1);
    const padding = 40;
    const availableWidth = Math.max(viewportWidth - padding * 2, 50);
    const availableHeight = Math.max(viewportHeight - padding * 2, 50);
    const zoomX = availableWidth / subPathWidth;
    const zoomY = availableHeight / subPathHeight;
    let newZoom = Math.min(zoomX, zoomY);
    if (!isFinite(newZoom) || newZoom <= 0) {
      console.warn('Invalid zoom calculation in zoomToSubPath:', newZoom);
      return;
    }
    newZoom = Math.max(0.1, Math.min(newZoom, 20));
    const subPathCenterX = bounds.x + bounds.width / 2;
    const subPathCenterY = bounds.y + bounds.height / 2;
    if (!isFinite(subPathCenterX) || !isFinite(subPathCenterY)) {
      console.warn('Invalid subpath center:', subPathCenterX, subPathCenterY);
      return;
    }
    const viewportCenterX = viewportWidth / 2;
    const viewportCenterY = viewportHeight / 2;
    const newPanX = viewportCenterX - subPathCenterX * newZoom;
    const newPanY = viewportCenterY - subPathCenterY * newZoom;
    if (!isFinite(newPanX) || !isFinite(newPanY)) {
      console.warn('Invalid pan calculation in zoomToSubPath:', newPanX, newPanY);
      return;
    }
    set({
      viewport: validateViewport({
        ...viewport,
        zoom: newZoom,
        pan: { x: newPanX, y: newPanY },
      }),
    });
  },

  pan: (delta) =>
    set((state) => {
      const safeDelta = {
        x: isFinite(delta.x) ? delta.x : 0,
        y: isFinite(delta.y) ? delta.y : 0,
      };
      return {
        viewport: validateViewport({
          ...state.viewport,
          pan: {
            x: state.viewport.pan.x + safeDelta.x,
            y: state.viewport.pan.y + safeDelta.y,
          },
        }),
      };
    }),

  setPan: (pan) =>
    set((state) => ({
      viewport: validateViewport({
        ...state.viewport,
        pan: {
          x: isFinite(pan.x) ? pan.x : 0,
          y: isFinite(pan.y) ? pan.y : 0,
        },
      }),
    })),

  resetView: () =>
    set((state) => {
      const newState = {
        viewport: validateViewport({
          ...state.viewport,
          zoom: 1,
          pan: { x: 0, y: 0 },
        }),
      };
      return newState;
    }),

  resetViewportCompletely: () =>
    set((state) => {
      const newState = {
        viewport: validateViewport({
          zoom: 1,
          pan: { x: 0, y: 0 },
          viewBox: { x: 0, y: 0, width: 800, height: 600 },
        }),
      };
      return newState;
    }),
});