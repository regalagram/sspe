import { StateCreator } from 'zustand';
import { EditorState, Point, ViewportState, BoundingBox } from '../types';
import { getAllPathsBounds, getSelectedElementsBounds, getSelectedSubPathsBounds } from '../utils/path-utils';
import { getTextBoundingBox } from '../utils/bbox-utils';
import { viewBoxManager, ViewBoxOptions } from '../core/ViewBoxManager';

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
  updateViewBox: (viewBox: BoundingBox, source?: string) => void;
  updateViewBoxFromContent: (options?: ViewBoxOptions) => void;
  updateViewBoxFromContainer: (options?: ViewBoxOptions) => void;
  recalculateViewBox: (options?: ViewBoxOptions) => void;
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
        zoom: Math.max(0.1, Math.min(20, zoom)),
        pan: newPan,
      });
      const newState = {
        viewport: newViewport,
      };
      return newState;
    }),

  zoomIn: (center) => {
    const { viewport } = get();
    const newZoom = viewport.zoom * 1.2;
    const clampedZoom = Math.max(0.1, Math.min(newZoom, 20));
    // Si el zoom llega al límite máximo, no aplicar pan automático
    const shouldApplyPan = clampedZoom < 20;
    get().setZoom(clampedZoom, shouldApplyPan ? center : undefined);
  },

  zoomOut: (center) => {
    const { viewport } = get();
    const newZoom = viewport.zoom / 1.2;
    const clampedZoom = Math.max(0.1, Math.min(newZoom, 20));
    // Si el zoom llega al límite mínimo, no aplicar pan automático
    const shouldApplyPan = clampedZoom > 0.1;
    get().setZoom(clampedZoom, shouldApplyPan ? center : undefined);
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
    newZoom = Math.max(0.1, Math.min(newZoom, 20));
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
    const { paths, texts, groups, images, viewport, selection } = state;
    
    // Get bounds for all types of selected elements
    let bounds = null;
    
    // If we have selected commands, use those
    if (selection.selectedCommands.length > 0) {
      bounds = getSelectedElementsBounds(paths, selection.selectedCommands);
    }
    // If we have selected subpaths, use those
    else if (selection.selectedSubPaths.length > 0) {
      bounds = getSelectedSubPathsBounds(paths, selection.selectedSubPaths);
    }
    // If we have selected paths, texts, groups, or images, calculate their bounds
    else if (selection.selectedPaths.length > 0 || selection.selectedTexts.length > 0 || 
             selection.selectedGroups.length > 0 || selection.selectedImages.length > 0) {
      // Calculate bounds for all selected elements
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      let hasValidBounds = false;
      
      // Add selected paths bounds
      selection.selectedPaths.forEach(pathId => {
        const path = paths.find(p => p.id === pathId);
        if (path) {
          const pathBounds = getAllPathsBounds([path]);
          if (pathBounds) {
            minX = Math.min(minX, pathBounds.x);
            minY = Math.min(minY, pathBounds.y);
            maxX = Math.max(maxX, pathBounds.x + pathBounds.width);
            maxY = Math.max(maxY, pathBounds.y + pathBounds.height);
            hasValidBounds = true;
          }
        }
      });
      
      // Add selected texts bounds using proper bounding box calculation with transforms
      selection.selectedTexts.forEach(textId => {
        const text = texts.find(t => t.id === textId);
        if (text && typeof text.x === 'number' && typeof text.y === 'number') {
          // Use the proper getTextBoundingBox function that handles transforms
          const textBBox = getTextBoundingBox(text);
          minX = Math.min(minX, textBBox.x);
          minY = Math.min(minY, textBBox.y);
          maxX = Math.max(maxX, textBBox.x + textBBox.width);
          maxY = Math.max(maxY, textBBox.y + textBBox.height);
          hasValidBounds = true;
        }
      });
      
      if (hasValidBounds) {
        bounds = {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY
        };
      }
    }
    
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
      return;
    }
    
    // Detect mobile viewport
    const isMobile = window.innerWidth <= 768;
    
    let viewportWidth = 800;
    let viewportHeight = 600;
    
    if (isMobile) {
      // On mobile, use the full screen dimensions with some padding
      viewportWidth = window.innerWidth;
      viewportHeight = window.innerHeight * 0.7; // Account for mobile UI elements (toolbars, etc.)
    } else {
      // Desktop behavior - try to get SVG element dimensions first
      const svgElement = document.querySelector('svg');
      if (svgElement) {
        const rect = svgElement.getBoundingClientRect();
        if (rect.width > 100 && rect.height > 100) {
          viewportWidth = rect.width;
          viewportHeight = rect.height;
        }
      }
      
      // If SVG dimensions are not available, try container dimensions
      if (viewportWidth < 100 || viewportHeight < 100) {
        const editorContainer = document.querySelector('.editor-container') || 
                               document.querySelector('.svg-editor') ||
                               document.querySelector('[data-editor-container]');
        if (editorContainer) {
          const containerRect = editorContainer.getBoundingClientRect();
          if (containerRect.width > 100 && containerRect.height > 100) {
            viewportWidth = containerRect.width;
            viewportHeight = containerRect.height;
          }
        }
      }
      
      // Final fallback for desktop - use a reasonable portion of screen
      if (viewportWidth < 100 || viewportHeight < 100) {
        viewportWidth = Math.min(window.innerWidth * 0.8, 1200);
        viewportHeight = Math.min(window.innerHeight * 0.8, 800);
      }
    }
    
    const selectionWidth = Math.max(bounds.width, 1);
    const selectionHeight = Math.max(bounds.height, 1);
    
    // Use smaller padding on mobile to maximize available space
    const padding = isMobile ? 10 : 20;
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
    
    // Detect mobile viewport
    const isMobile = window.innerWidth <= 768;
    
    let viewportWidth = 800;
    let viewportHeight = 600;
    
    if (isMobile) {
      // On mobile, use the full screen dimensions with some padding
      viewportWidth = window.innerWidth;
      viewportHeight = window.innerHeight * 0.7; // Account for mobile UI elements (toolbars, etc.)
    } else {
      // Desktop behavior - try to get SVG element dimensions first
      const svgElement = document.querySelector('svg');
      if (svgElement) {
        const rect = svgElement.getBoundingClientRect();
        if (rect.width > 100 && rect.height > 100) {
          viewportWidth = rect.width;
          viewportHeight = rect.height;
        }
      }
      
      // If SVG dimensions are not available, try container dimensions
      if (viewportWidth < 100 || viewportHeight < 100) {
        const editorContainer = document.querySelector('.editor-container') || 
                               document.querySelector('.svg-editor') ||
                               document.querySelector('[data-editor-container]');
        if (editorContainer) {
          const containerRect = editorContainer.getBoundingClientRect();
          if (containerRect.width > 100 && containerRect.height > 100) {
            viewportWidth = containerRect.width;
            viewportHeight = containerRect.height;
          }
        }
      }
      
      // Final fallback for desktop - use a reasonable portion of screen
      if (viewportWidth < 100 || viewportHeight < 100) {
        viewportWidth = Math.min(window.innerWidth * 0.8, 1200);
        viewportHeight = Math.min(window.innerHeight * 0.8, 800);
      }
    }
    
    const subPathWidth = Math.max(bounds.width, 1);
    const subPathHeight = Math.max(bounds.height, 1);
    
    // Use smaller padding on mobile to maximize available space
    const padding = isMobile ? 10 : 20;
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

  updateViewBox: (viewBox, source = 'manual') =>
    set((state) => {
      if (!viewBox || 
          !isFinite(viewBox.x) || !isFinite(viewBox.y) || 
          !isFinite(viewBox.width) || !isFinite(viewBox.height) ||
          viewBox.width <= 0 || viewBox.height <= 0) {
        console.warn('Invalid viewBox:', viewBox);
        return state;
      }

      const newViewport = validateViewport({
        ...state.viewport,
        viewBox: {
          x: viewBox.x,
          y: viewBox.y,
          width: viewBox.width,
          height: viewBox.height
        }
      });

      console.log(`ViewBox updated from ${source}:`, newViewport.viewBox);

      return {
        viewport: newViewport,
      };
    }),

  updateViewBoxFromContent: (options = {}) => {
    const state = get();
    const result = viewBoxManager.updateViewBoxFromContent(state, {
      padding: 20,
      minWidth: 200,
      minHeight: 150,
      maintainAspectRatio: true,
      ...options
    });

    if (result && result.changed) {
      get().updateViewBox(result.viewBox, result.source);
    }
  },

  updateViewBoxFromContainer: (options = {}) => {
    const result = viewBoxManager.updateViewBoxFromContainer({
      padding: 20,
      minWidth: 200,
      minHeight: 150,
      maintainAspectRatio: true,
      ...options
    });

    if (result && result.changed) {
      get().updateViewBox(result.viewBox, result.source);
    }
  },

  recalculateViewBox: (options = {}) => {
    const state = get();
    const result = viewBoxManager.recalculateViewBox(state, {
      padding: 20,
      minWidth: 200,
      minHeight: 150,
      maintainAspectRatio: true,
      useContentBounds: true,
      useContainerBounds: true,
      ...options
    });

    if (result && result.changed) {
      get().updateViewBox(result.viewBox, result.source);
    }
  },
});