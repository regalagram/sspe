import { StateCreator } from 'zustand';
import { EditorState, PathStyle, SVGUse } from '../types';

export interface UseFormatCopyState {
  isActive: boolean;
  copiedStyle: Partial<PathStyle> | null;
  sourceUseId: string | null;
}

export interface UseFormatCopyActions {
  // State accessors
  getUseFormatCopyState: () => UseFormatCopyState;
  isUseFormatCopyActive: () => boolean;
  
  // Copy format actions
  startUseFormatCopy: (sourceUseId: string) => void;
  applyUseFormatToUse: (targetUseId: string) => void;
  cancelUseFormatCopy: () => void;
}

export const createUseFormatCopyActions: StateCreator<
  EditorState & UseFormatCopyActions,
  [],
  [],
  UseFormatCopyActions
> = (set, get, api) => ({
  // State accessors
  getUseFormatCopyState: () => {
    const state = get();
    return {
      isActive: state.useFormatCopyState?.isActive ?? false,
      copiedStyle: state.useFormatCopyState?.copiedStyle ?? null,
      sourceUseId: state.useFormatCopyState?.sourceUseId ?? null,
    };
  },

  isUseFormatCopyActive: () => {
    const state = get();
    return state.useFormatCopyState?.isActive ?? false;
  },

  // Start use format copy mode
  startUseFormatCopy: (sourceUseId: string) => {
    const state = get();
    
    // Find the source use element
    const sourceUse = state.uses.find(use => use.id === sourceUseId);
    if (!sourceUse) {
      console.warn('Source use element not found:', sourceUseId);
      return;
    }

    // Copy the style properties that make sense for use elements
    const copiedStyle: Partial<PathStyle> = {
      // Fill properties
      fill: sourceUse.style?.fill,
      fillOpacity: sourceUse.style?.fillOpacity,
      fillRule: sourceUse.style?.fillRule,
      
      // Stroke properties
      stroke: sourceUse.style?.stroke,
      strokeWidth: sourceUse.style?.strokeWidth,
      strokeOpacity: sourceUse.style?.strokeOpacity,
      strokeDasharray: sourceUse.style?.strokeDasharray,
      strokeDashoffset: sourceUse.style?.strokeDashoffset,
      strokeLinecap: sourceUse.style?.strokeLinecap,
      strokeLinejoin: sourceUse.style?.strokeLinejoin,
      strokeMiterlimit: sourceUse.style?.strokeMiterlimit,
      
      // Opacity and effects
      opacity: sourceUse.style?.opacity,
      
      // Effects
      filter: sourceUse.style?.filter,
      clipPath: sourceUse.style?.clipPath,
      mask: sourceUse.style?.mask,
      
      // Other visual properties
      visibility: sourceUse.style?.visibility,
      pointerEvents: sourceUse.style?.pointerEvents,
      cursor: sourceUse.style?.cursor,
      display: sourceUse.style?.display,
      
      // Color properties
      color: sourceUse.style?.color,
      colorInterpolation: sourceUse.style?.colorInterpolation,
      colorRendering: sourceUse.style?.colorRendering,
    };

    set((state) => ({
      ...state,
      useFormatCopyState: {
        isActive: true,
        copiedStyle: copiedStyle,
        sourceUseId: sourceUseId,
      },
      floatingToolbarUpdateTimestamp: Date.now(),
    }));
  },

  // Apply copied format to target use element
  applyUseFormatToUse: (targetUseId: string) => {
    const state = get();
    const formatState = state.useFormatCopyState;
    
    if (!formatState?.isActive || !formatState.copiedStyle) {
      console.warn('No use format to apply - use format copy not active');
      return;
    }

    // Find target use element
    const targetUse = state.uses.find(use => use.id === targetUseId);
    if (!targetUse) {
      console.warn('Target use element not found:', targetUseId);
      return;
    }

    // Don't apply to the same use element
    if (targetUseId === formatState.sourceUseId) {
      console.warn('Cannot apply format to the same use element');
      return;
    }

    // Push to history before making changes
    (get() as any).pushToHistory();

    // Apply the copied style
    (get() as any).updateUse(targetUseId, {
      style: {
        ...targetUse.style,
        ...formatState.copiedStyle
      }
    });

    // Cancel use format copy mode
    get().cancelUseFormatCopy();
  },

  // Cancel use format copy mode
  cancelUseFormatCopy: () => {
    set((state) => ({
      ...state,
      useFormatCopyState: {
        isActive: false,
        copiedStyle: null,
        sourceUseId: null,
      },
      floatingToolbarUpdateTimestamp: Date.now(),
    }));
  },
});
