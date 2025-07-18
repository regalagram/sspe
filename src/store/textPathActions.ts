import { StateCreator } from 'zustand';
import { EditorState, SVGTextPath, TextStyle } from '../types';
import { generateId } from '../utils/id-utils';

export interface TextPathActions {
  // Basic CRUD operations
  addTextPath: (pathRef: string, content?: string, startOffset?: number) => string;
  removeTextPath: (textPathId: string) => void;
  updateTextPath: (textPathId: string, updates: Partial<Omit<SVGTextPath, 'id'>>) => void;
  
  // Content operations
  updateTextPathContent: (textPathId: string, content: string) => void;
  updateTextPathPath: (textPathId: string, pathRef: string) => void;
  
  // Style operations
  updateTextPathStyle: (textPathId: string, style: Partial<TextStyle>) => void;
  
  // Position and layout operations
  updateTextPathOffset: (textPathId: string, startOffset: number | string) => void;
  updateTextPathMethod: (textPathId: string, method: 'align' | 'stretch') => void;
  updateTextPathSpacing: (textPathId: string, spacing: 'auto' | 'exact') => void;
  updateTextPathSide: (textPathId: string, side: 'left' | 'right') => void;
  updateTextPathLength: (textPathId: string, textLength?: number, lengthAdjust?: 'spacing' | 'spacingAndGlyphs') => void;
  
  // Transform operations
  updateTextPathTransform: (textPathId: string, transform?: string) => void;
  moveTextPath: (textPathId: string, delta: { x: number; y: number }, skipGroupSync?: boolean) => void;
  scaleTextPathFont: (textPathId: string, scaleFactor: number) => void;
  
  // Lock operations
  lockTextPath: (textPathId: string, locked?: boolean) => void;
  
  // Bulk operations
  replaceTextPaths: (textPaths: SVGTextPath[]) => void;
  clearAllTextPaths: () => void;
  
  // Selection helpers
  selectTextPath: (textPathId: string) => void;
  selectMultipleTextPaths: (textPathIds: string[], addToSelection?: boolean) => void;
  
  // Utility functions
  getTextPathById: (textPathId: string) => SVGTextPath | null;
  getTextPathsByPathRef: (pathRef: string) => SVGTextPath[];
  duplicateTextPath: (textPathId: string, offsetX?: number, offsetY?: number) => string | null;
}

export const createTextPathActions: StateCreator<
  EditorState & TextPathActions,
  [],
  [],
  TextPathActions
> = (set, get) => ({
  addTextPath: (pathRef, content = 'Text on path', startOffset = 0) => {
    const textPath: SVGTextPath = {
      id: generateId(),
      type: 'textPath',
      content,
      pathRef,
      startOffset,
      method: 'align',
      spacing: 'auto',
      side: 'left',
      style: {
        fontFamily: 'Arial, sans-serif',
        fontSize: 16,
        fill: '#000000',
        textAnchor: 'start'
      },
      locked: false
    };
    
    set((state) => ({
      textPaths: [...state.textPaths, textPath],
      renderVersion: state.renderVersion + 1
    }));
    
    return textPath.id;
  },

  removeTextPath: (textPathId) =>
    set((state) => ({
      textPaths: state.textPaths.filter(tp => tp.id !== textPathId),
      selection: {
        ...state.selection,
        selectedTextPaths: state.selection.selectedTextPaths.filter(id => id !== textPathId),
      },
      renderVersion: state.renderVersion + 1
    })),

  updateTextPath: (textPathId, updates) =>
    set((state) => ({
      textPaths: state.textPaths.map(tp => 
        tp.id === textPathId ? { ...tp, ...updates } : tp
      ),
      renderVersion: state.renderVersion + 1
    })),

  updateTextPathContent: (textPathId, content) =>
    set((state) => ({
      textPaths: state.textPaths.map(tp => 
        tp.id === textPathId ? { ...tp, content } : tp
      ),
      renderVersion: state.renderVersion + 1
    })),

  updateTextPathPath: (textPathId, pathRef) =>
    set((state) => ({
      textPaths: state.textPaths.map(tp => 
        tp.id === textPathId ? { ...tp, pathRef } : tp
      ),
      renderVersion: state.renderVersion + 1
    })),

  updateTextPathStyle: (textPathId, style) =>
    set((state) => ({
      textPaths: state.textPaths.map(tp => 
        tp.id === textPathId ? { ...tp, style: { ...tp.style, ...style } } : tp
      ),
      renderVersion: state.renderVersion + 1
    })),

  updateTextPathOffset: (textPathId, startOffset) =>
    set((state) => ({
      textPaths: state.textPaths.map(tp => 
        tp.id === textPathId ? { ...tp, startOffset } : tp
      ),
      renderVersion: state.renderVersion + 1
    })),

  updateTextPathMethod: (textPathId, method) =>
    set((state) => ({
      textPaths: state.textPaths.map(tp => 
        tp.id === textPathId ? { ...tp, method } : tp
      ),
      renderVersion: state.renderVersion + 1
    })),

  updateTextPathSpacing: (textPathId, spacing) =>
    set((state) => ({
      textPaths: state.textPaths.map(tp => 
        tp.id === textPathId ? { ...tp, spacing } : tp
      ),
      renderVersion: state.renderVersion + 1
    })),

  updateTextPathSide: (textPathId, side) =>
    set((state) => ({
      textPaths: state.textPaths.map(tp => 
        tp.id === textPathId ? { ...tp, side } : tp
      ),
      renderVersion: state.renderVersion + 1
    })),

  updateTextPathLength: (textPathId, textLength, lengthAdjust) =>
    set((state) => ({
      textPaths: state.textPaths.map(tp => 
        tp.id === textPathId ? { ...tp, textLength, lengthAdjust } : tp
      ),
      renderVersion: state.renderVersion + 1
    })),

  updateTextPathTransform: (textPathId, transform) =>
    set((state) => ({
      textPaths: state.textPaths.map(tp => 
        tp.id === textPathId ? { ...tp, transform } : tp
      ),
      renderVersion: state.renderVersion + 1
    })),

  // TextPath doesn't need movement - it follows the path
  // This function is kept for compatibility but does nothing for movement
  // TextPath transformations should be applied to the underlying path instead
  moveTextPath: (textPathId: string, delta: { x: number; y: number }, skipGroupSync = false) => {
    // TextPath elements don't move independently - they follow their path
    // Any movement should be applied to the path that the textPath references
    // This function is kept for API compatibility but performs no action
  },

  scaleTextPathFont: (textPathId: string, scaleFactor: number) =>
    set((state) => ({
      textPaths: state.textPaths.map(tp => {
        if (tp.id !== textPathId) return tp;
        
        const currentFontSize = tp.style?.fontSize || 16;
        const newFontSize = Math.max(1, currentFontSize * scaleFactor);
        
        return {
          ...tp,
          style: {
            ...tp.style,
            fontSize: newFontSize
          }
        };
      }),
      renderVersion: state.renderVersion + 1
    })),

  lockTextPath: (textPathId, locked = true) =>
    set((state) => ({
      textPaths: state.textPaths.map(tp => 
        tp.id === textPathId ? { ...tp, locked } : tp
      ),
      renderVersion: state.renderVersion + 1
    })),

  replaceTextPaths: (textPaths) =>
    set((state) => ({
      textPaths,
      selection: {
        ...state.selection,
        selectedTextPaths: [],
      },
      renderVersion: state.renderVersion + 1
    })),

  clearAllTextPaths: () =>
    set((state) => ({
      textPaths: [],
      selection: {
        ...state.selection,
        selectedTextPaths: [],
      },
      renderVersion: state.renderVersion + 1
    })),

  selectTextPath: (textPathId) =>
    set((state) => ({
      selection: {
        ...state.selection,
        selectedTextPaths: [textPathId],
        selectedPaths: [],
        selectedSubPaths: [],
        selectedCommands: [],
        selectedTexts: [],
        selectedGroups: [],
        selectedImages: [],
        selectedUses: [],
        selectedClipPaths: [],
        selectedMasks: [],
        selectedFilters: [],
        selectedMarkers: [],
        selectedSymbols: [],
      },
    })),

  selectMultipleTextPaths: (textPathIds, addToSelection = false) =>
    set((state) => ({
      selection: {
        ...state.selection,
        selectedTextPaths: addToSelection 
          ? [...new Set([...state.selection.selectedTextPaths, ...textPathIds])]
          : textPathIds,
        ...(addToSelection ? {} : {
          selectedPaths: [],
          selectedSubPaths: [],
          selectedCommands: [],
          selectedTexts: [],
          selectedGroups: [],
          selectedImages: [],
          selectedUses: [],
          selectedClipPaths: [],
          selectedMasks: [],
          selectedFilters: [],
          selectedMarkers: [],
          selectedSymbols: [],
        })
      },
    })),

  getTextPathById: (textPathId) => {
    const state = get();
    return state.textPaths.find(tp => tp.id === textPathId) || null;
  },

  getTextPathsByPathRef: (pathRef) => {
    const state = get();
    return state.textPaths.filter(tp => tp.pathRef === pathRef);
  },

  duplicateTextPath: (textPathId, offsetX = 0, offsetY = 0) => {
    const state = get();
    const textPath = state.textPaths.find(tp => tp.id === textPathId);
    
    if (!textPath) return null;
    
    const duplicated: SVGTextPath = {
      ...textPath,
      id: generateId(),
      content: textPath.content + ' (copy)',
      transform: textPath.transform ? 
        `${textPath.transform} translate(${offsetX}, ${offsetY})` :
        offsetX !== 0 || offsetY !== 0 ? `translate(${offsetX}, ${offsetY})` : undefined
    };
    
    set((state) => ({
      textPaths: [...state.textPaths, duplicated],
      renderVersion: state.renderVersion + 1
    }));
    
    return duplicated.id;
  }
});