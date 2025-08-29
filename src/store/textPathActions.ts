import { StateCreator } from 'zustand';
import { EditorState, SVGTextPath, TextStyle, Point } from '../types';
import { generateId } from '../utils/id-utils';
import { clearAllSelectionsExcept, notifyTransformManager, completeSelectionUpdate } from './selectionActions';

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
  EditorState & TextPathActions & { moveGroup: (groupId: string, delta: Point) => void; shouldMoveSyncGroup: (elementId: string, elementType: 'path' | 'text' | 'textPath' | 'group' | 'image' | 'clipPath' | 'mask' | 'use') => any; moveSyncGroupByElement: (elementId: string, elementType: 'path' | 'text' | 'textPath' | 'group' | 'image' | 'clipPath' | 'mask' | 'use', delta: Point) => boolean; },
  [],
  [],
  TextPathActions
> = (set, get) => ({
  addTextPath: (pathRef, content = 'Text on path', startOffset = 0) => {
    // Get current state to access shared tool settings
    const state = get();
    const toolSettings = state.toolSettings?.shared;
    
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
        // Use values from store if available, otherwise fallback to defaults
        fontFamily: toolSettings?.fontFamily || 'Arial, sans-serif',
        fontSize: toolSettings?.fontSize || 16,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textAnchor: 'start',
        fill: toolSettings?.fill || '#000000',
        stroke: toolSettings?.strokeColor || undefined,
        strokeWidth: toolSettings?.strokeWidth || undefined,
        strokeOpacity: toolSettings?.strokeOpacity || undefined,
        strokeDasharray: toolSettings?.strokeDasharray === 'none' ? undefined : toolSettings?.strokeDasharray,
        strokeLinecap: toolSettings?.strokeLinecap || undefined,
        strokeLinejoin: toolSettings?.strokeLinejoin || undefined,
        fillOpacity: toolSettings?.fillOpacity || undefined
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

  updateTextPathContent: (textPathId, content) => {
    set((state) => ({
      textPaths: state.textPaths.map(tp => 
        tp.id === textPathId ? { ...tp, content } : tp
      ),
      renderVersion: state.renderVersion + 1
    }));
  },

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

  // TextPath movement implementation - handles group sync for textPath elements
  // Even though textPaths follow their path, we need group sync for consistency
  moveTextPath: (textPathId: string, delta: { x: number; y: number }, skipGroupSync = false) => {
    set(state => {
      // Check if the textPath is in a movement-sync group (only if not skipping)
      if (!skipGroupSync && typeof state.moveSyncGroupByElement === 'function') {
        const syncGroup = state.shouldMoveSyncGroup(textPathId, 'textPath');
        if (syncGroup) {
          // Check if multiple elements of the same group are being moved
          // If so, only move the group once (when processing the first element)
          const groupElements = syncGroup.children.filter((child: any) => child.type === 'textPath').map((child: any) => child.id);
          const selectedGroupElements = state.selection.selectedTextPaths.filter(textPathId => groupElements.includes(textPathId));
          
          if (selectedGroupElements.length > 1) {
            // Multiple elements of the same group are selected
            // Only move the group if this is the first element being processed
            const isFirstElement = selectedGroupElements[0] === textPathId;
            if (isFirstElement) {
              state.moveGroup(syncGroup.id, delta);
            }
            return {}; // Don't move individual element
          } else {
            // Single element, move the whole group
            const wasMoved = state.moveSyncGroupByElement(textPathId, 'textPath', delta);
            if (wasMoved) {
              return {}; // Group was moved instead
            }
          }
        }
      }
      
      // For individual textPath movement, we apply a transform since textPaths follow their path
      // The transform will offset the textPath relative to its path
      const textPath = state.textPaths.find(tp => tp.id === textPathId);
      if (textPath) {
        const currentTransform = textPath.transform || '';
        const translateMatch = currentTransform.match(/translate\(([^)]+)\)/);
        
        let newTransform: string;
        if (translateMatch) {
          const [, coords] = translateMatch;
          const [currentX = 0, currentY = 0] = coords.split(/[,\s]+/).map(Number);
          newTransform = currentTransform.replace(
            /translate\([^)]+\)/,
            `translate(${currentX + delta.x}, ${currentY + delta.y})`
          );
        } else {
          newTransform = currentTransform + ` translate(${delta.x}, ${delta.y})`;
        }
        
        return {
          textPaths: state.textPaths.map(tp => 
            tp.id === textPathId ? { ...tp, transform: newTransform.trim() } : tp
          ),
          renderVersion: state.renderVersion + 1
        };
      }
      
      return {};
    });
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
    set((state) => {
      const newSelection = clearAllSelectionsExcept(state.selection, {
        selectedTextPaths: [textPathId],
      });
      
      const finalState = completeSelectionUpdate(state, newSelection);
      return finalState;
    }),

  selectMultipleTextPaths: (textPathIds, addToSelection = false) =>
    set((state) => {
      const newSelection = addToSelection ? {
        ...state.selection,
        selectedTextPaths: [...new Set([...state.selection.selectedTextPaths, ...textPathIds])]
      } : clearAllSelectionsExcept(state.selection, {
        selectedTextPaths: textPathIds,
      });
      
      const finalState = completeSelectionUpdate(state, newSelection);
      return finalState;
    }),

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