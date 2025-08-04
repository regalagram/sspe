import { StateCreator } from 'zustand';
import { EditorState, SVGImage, SVGClipPath, SVGMask, SVGFilter, SVGMarker, SVGSymbol, SVGUse, Point } from '../types';
import { generateId } from '../utils/id-utils';
import { HistoryActions } from './historyActions';

export interface SVGElementActions {
  // Image actions
  addImage: (image: Omit<SVGImage, 'id'>) => void;
  updateImage: (id: string, updates: Partial<SVGImage>) => void;
  removeImage: (id: string) => void;
  replaceImages: (images: SVGImage[]) => void;
  duplicateImage: (id: string, offset?: Point) => void;
  moveImage: (id: string, delta: Point, skipGroupSync?: boolean) => void;
  resizeImage: (id: string, newWidth: number, newHeight: number) => void;
  scaleImage: (id: string, scaleX: number, scaleY: number, center?: Point) => void;
  
  // ClipPath actions
  addClipPath: (clipPath: Omit<SVGClipPath, 'id'>) => void;
  updateClipPath: (id: string, updates: Partial<SVGClipPath>) => void;
  removeClipPath: (id: string) => void;
  
  // Mask actions
  addMask: (mask: Omit<SVGMask, 'id'>) => void;
  updateMask: (id: string, updates: Partial<SVGMask>) => void;
  removeMask: (id: string) => void;
  
  // Filter actions
  addFilter: (filter: Omit<SVGFilter, 'id'>) => void;
  updateFilter: (id: string, updates: Partial<SVGFilter>) => void;
  removeFilter: (id: string) => void;
  duplicateFilter: (id: string) => void;
  
  // Marker actions
  addMarker: (marker: Omit<SVGMarker, 'id'>) => void;
  updateMarker: (id: string, updates: Partial<SVGMarker>) => void;
  removeMarker: (id: string) => void;
  
  // Symbol actions
  addSymbol: (symbol: Omit<SVGSymbol, 'id'>) => void;
  updateSymbol: (id: string, updates: Partial<SVGSymbol>) => void;
  removeSymbol: (id: string) => void;
  
  // Use actions
  addUse: (use: Omit<SVGUse, 'id'>) => void;
  updateUse: (id: string, updates: Partial<SVGUse>) => void;
  removeUse: (id: string) => void;
  duplicateUse: (id: string, offset?: Point) => void;
  moveUse: (id: string, delta: Point) => void;
  resizeUse: (id: string, newWidth: number, newHeight: number) => void;
  scaleUse: (id: string, scaleX: number, scaleY: number, center?: Point) => void;
  
  // Batch transform operations
  moveSelectedElements: (delta: Point) => void;
  scaleSelectedElements: (scaleX: number, scaleY: number, center?: Point) => void;
  
  // Utility actions
  getElementById: (id: string, type: 'image' | 'clipPath' | 'mask' | 'filter' | 'marker' | 'symbol' | 'use') => any | null;
  clearAllSVGElements: () => void;
}

export const createSVGElementActions: StateCreator<
  EditorState & SVGElementActions & HistoryActions & { moveGroup: (groupId: string, delta: Point) => void; shouldMoveSyncGroup: (elementId: string, elementType: 'path' | 'text' | 'textPath' | 'group' | 'image' | 'clipPath' | 'mask' | 'use') => any; moveSyncGroupByElement: (elementId: string, elementType: 'path' | 'text' | 'textPath' | 'group' | 'image' | 'clipPath' | 'mask' | 'use', delta: Point) => boolean; },
  [],
  [],
  SVGElementActions
> = (set, get) => ({
  // Image actions
  addImage: (imageData) =>
    set((state) => ({
      images: [...state.images, { ...imageData, id: generateId() }],
      renderVersion: state.renderVersion + 1,
    })),

  updateImage: (id, updates) =>
    set((state) => ({
      images: state.images.map((img) =>
        img.id === id ? { ...img, ...updates } : img
      ),
      renderVersion: state.renderVersion + 1,
    })),

  removeImage: (id) =>
    set((state) => ({
      images: state.images.filter((img) => img.id !== id),
      selection: {
        ...state.selection,
        selectedImages: state.selection.selectedImages.filter((imgId) => imgId !== id),
      },
      renderVersion: state.renderVersion + 1,
    })),

  replaceImages: (images) =>
    set((state) => ({
      images: images,
      selection: {
        ...state.selection,
        selectedImages: [],
      },
      renderVersion: state.renderVersion + 1,
    })),

  duplicateImage: (id, offset = { x: 20, y: 20 }) => {
    const state = get();
    const image = state.images.find((img) => img.id === id);
    if (image) {
      state.addImage({
        ...image,
        x: image.x + offset.x,
        y: image.y + offset.y,
      });
    }
  },

  // ClipPath actions
  addClipPath: (clipPathData) =>
    set((state) => ({
      clipPaths: [...state.clipPaths, { ...clipPathData, id: generateId() }],
      renderVersion: state.renderVersion + 1,
    })),

  updateClipPath: (id, updates) =>
    set((state) => ({
      clipPaths: state.clipPaths.map((clip) =>
        clip.id === id ? { ...clip, ...updates } : clip
      ),
      renderVersion: state.renderVersion + 1,
    })),

  removeClipPath: (id) =>
    set((state) => ({
      clipPaths: state.clipPaths.filter((clip) => clip.id !== id),
      selection: {
        ...state.selection,
        selectedClipPaths: state.selection.selectedClipPaths.filter((clipId) => clipId !== id),
      },
      renderVersion: state.renderVersion + 1,
    })),

  // Mask actions
  addMask: (maskData) =>
    set((state) => ({
      masks: [...state.masks, { ...maskData, id: generateId() }],
      renderVersion: state.renderVersion + 1,
    })),

  updateMask: (id, updates) =>
    set((state) => ({
      masks: state.masks.map((mask) =>
        mask.id === id ? { ...mask, ...updates } : mask
      ),
      renderVersion: state.renderVersion + 1,
    })),

  removeMask: (id) =>
    set((state) => ({
      masks: state.masks.filter((mask) => mask.id !== id),
      selection: {
        ...state.selection,
        selectedMasks: state.selection.selectedMasks.filter((maskId) => maskId !== id),
      },
      renderVersion: state.renderVersion + 1,
    })),

  // Filter actions
  addFilter: (filterData) => {
    const state = get();
    state.pushToHistory();
    set((state) => ({
      filters: [...state.filters, { ...filterData, id: generateId() }],
      renderVersion: state.renderVersion + 1,
    }));
  },

  updateFilter: (id, updates) => {
    const state = get();
    state.pushToHistory();
    set((state) => ({
      filters: state.filters.map((filter) =>
        filter.id === id ? { ...filter, ...updates } : filter
      ),
      renderVersion: state.renderVersion + 1,
    }));
  },

  removeFilter: (id) => {
    const state = get();
    state.pushToHistory();
    set((state) => ({
      filters: state.filters.filter((filter) => filter.id !== id),
      selection: {
        ...state.selection,
        selectedFilters: state.selection.selectedFilters.filter((filterId) => filterId !== id),
      },
      renderVersion: state.renderVersion + 1,
    }));
  },

  duplicateFilter: (id) => {
    const state = get();
    const filter = state.filters.find((f) => f.id === id);
    if (filter) {
      state.pushToHistory();
      const { id: _, ...filterData } = filter;
      state.addFilter(filterData);
    }
  },

  // Marker actions
  addMarker: (markerData) =>
    set((state) => ({
      markers: [...state.markers, { ...markerData, id: generateId() }],
      renderVersion: state.renderVersion + 1,
    })),

  updateMarker: (id, updates) =>
    set((state) => ({
      markers: state.markers.map((marker) =>
        marker.id === id ? { ...marker, ...updates } : marker
      ),
      renderVersion: state.renderVersion + 1,
    })),

  removeMarker: (id) =>
    set((state) => ({
      markers: state.markers.filter((marker) => marker.id !== id),
      selection: {
        ...state.selection,
        selectedMarkers: state.selection.selectedMarkers.filter((markerId) => markerId !== id),
      },
      renderVersion: state.renderVersion + 1,
    })),

  // Symbol actions
  addSymbol: (symbolData) =>
    set((state) => ({
      symbols: [...state.symbols, { ...symbolData, id: generateId() }],
      renderVersion: state.renderVersion + 1,
    })),

  updateSymbol: (id, updates) =>
    set((state) => ({
      symbols: state.symbols.map((symbol) =>
        symbol.id === id ? { ...symbol, ...updates } : symbol
      ),
      renderVersion: state.renderVersion + 1,
    })),

  removeSymbol: (id) =>
    set((state) => ({
      symbols: state.symbols.filter((symbol) => symbol.id !== id),
      selection: {
        ...state.selection,
        selectedSymbols: state.selection.selectedSymbols.filter((symbolId) => symbolId !== id),
      },
      renderVersion: state.renderVersion + 1,
    })),

  // Use actions
  addUse: (useData) =>
    set((state) => ({
      uses: [...state.uses, { ...useData, id: generateId() }],
      renderVersion: state.renderVersion + 1,
    })),

  updateUse: (id, updates) =>
    set((state) => ({
      uses: state.uses.map((use) =>
        use.id === id ? { ...use, ...updates } : use
      ),
      renderVersion: state.renderVersion + 1,
    })),

  removeUse: (id) =>
    set((state) => ({
      uses: state.uses.filter((use) => use.id !== id),
      selection: {
        ...state.selection,
        selectedUses: state.selection.selectedUses.filter((useId) => useId !== id),
      },
      renderVersion: state.renderVersion + 1,
    })),

  duplicateUse: (id, offset = { x: 20, y: 20 }) => {
    const state = get();
    const use = state.uses.find((u) => u.id === id);
    if (use) {
      state.addUse({
        ...use,
        x: (use.x || 0) + offset.x,
        y: (use.y || 0) + offset.y,
      });
    }
  },

  // Transform actions for images
  moveImage: (id, delta, skipGroupSync = false) => {
    set(state => {
      // Check if the image is in a movement-sync group (only if not skipping)
      if (!skipGroupSync && typeof state.moveSyncGroupByElement === 'function') {
        const syncGroup = state.shouldMoveSyncGroup(id, 'image');
        if (syncGroup) {
          // Check if multiple elements of the same group are being moved
          // If so, only move the group once (when processing the first element)
          const groupElements = syncGroup.children.filter((child: any) => child.type === 'image').map((child: any) => child.id);
          const selectedGroupElements = state.selection.selectedImages.filter(imageId => groupElements.includes(imageId));
          
          if (selectedGroupElements.length > 1) {
            // Multiple elements of the same group are selected
            // Only move the group if this is the first element being processed
            const isFirstElement = selectedGroupElements[0] === id;
            if (isFirstElement) {
              state.moveGroup(syncGroup.id, delta);
            }
            return {}; // Don't move individual element
          } else {
            // Single element, move the whole group
            const wasMoved = state.moveSyncGroupByElement(id, 'image', delta);
            if (wasMoved) {
              return {}; // Group was moved instead
            }
          }
        }
      }
      
      // Move individual image
      const image = state.images.find(img => img.id === id);
      if (image) {
        return {
          images: state.images.map((img) =>
            img.id === id 
              ? { ...img, x: img.x + delta.x, y: img.y + delta.y }
              : img
          ),
          renderVersion: state.renderVersion + 1
        };
      }
      
      return {};
    });
  },

  resizeImage: (id, newWidth, newHeight) => {
    const state = get();
    state.updateImage(id, {
      width: newWidth,
      height: newHeight
    });
  },

  scaleImage: (id, scaleX, scaleY, center) => {
    const state = get();
    const image = state.images.find(img => img.id === id);
    if (image) {
      const centerX = center?.x ?? (image.x + image.width / 2);
      const centerY = center?.y ?? (image.y + image.height / 2);
      
      const newWidth = image.width * scaleX;
      const newHeight = image.height * scaleY;
      const newX = centerX - (newWidth / 2);
      const newY = centerY - (newHeight / 2);
      
      state.updateImage(id, {
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight
      });
    }
  },

  // Transform actions for use elements
  moveUse: (id, delta) => {
    const state = get();
    const use = state.uses.find(u => u.id === id);
    if (use) {
      state.updateUse(id, {
        x: (use.x || 0) + delta.x,
        y: (use.y || 0) + delta.y
      });
    }
  },

  resizeUse: (id, newWidth, newHeight) => {
    const state = get();
    state.updateUse(id, {
      width: newWidth,
      height: newHeight
    });
  },

  scaleUse: (id, scaleX, scaleY, center) => {
    const state = get();
    const use = state.uses.find(u => u.id === id);
    if (use) {
      const width = use.width || 100;
      const height = use.height || 100;
      const x = use.x || 0;
      const y = use.y || 0;
      
      const centerX = center?.x ?? (x + width / 2);
      const centerY = center?.y ?? (y + height / 2);
      
      const newWidth = width * scaleX;
      const newHeight = height * scaleY;
      const newX = centerX - (newWidth / 2);
      const newY = centerY - (newHeight / 2);
      
      state.updateUse(id, {
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight
      });
    }
  },

  // Batch transform operations
  moveSelectedElements: (delta) => {
    const state = get();
    
    // Move images
    state.selection.selectedImages.forEach(id => {
      state.moveImage(id, delta);
    });
    
    // Move use elements
    state.selection.selectedUses.forEach(id => {
      state.moveUse(id, delta);
    });
  },

  scaleSelectedElements: (scaleX, scaleY, center) => {
    const state = get();
    
    // Scale images
    state.selection.selectedImages.forEach(id => {
      state.scaleImage(id, scaleX, scaleY, center);
    });
    
    // Scale use elements
    state.selection.selectedUses.forEach(id => {
      state.scaleUse(id, scaleX, scaleY, center);
    });
  },

  // Utility actions
  getElementById: (id, type) => {
    const state = get();
    switch (type) {
      case 'image':
        return state.images.find((img) => img.id === id) || null;
      case 'clipPath':
        return state.clipPaths.find((clip) => clip.id === id) || null;
      case 'mask':
        return state.masks.find((mask) => mask.id === id) || null;
      case 'filter':
        return state.filters.find((filter) => filter.id === id) || null;
      case 'marker':
        return state.markers.find((marker) => marker.id === id) || null;
      case 'symbol':
        return state.symbols.find((symbol) => symbol.id === id) || null;
      case 'use':
        return state.uses.find((use) => use.id === id) || null;
      default:
        return null;
    }
  },

  clearAllSVGElements: () =>
    set((state) => ({
      images: [],
      clipPaths: [],
      masks: [],
      filters: [],
      markers: [],
      symbols: [],
      uses: [],
      selection: {
        ...state.selection,
        selectedImages: [],
        selectedClipPaths: [],
        selectedMasks: [],
        selectedFilters: [],
        selectedMarkers: [],
        selectedSymbols: [],
        selectedUses: [],
      },
      renderVersion: state.renderVersion + 1,
    })),
});