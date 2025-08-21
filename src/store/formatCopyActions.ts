import { StateCreator } from 'zustand';
import { EditorState, PathStyle } from '../types';

export interface FormatCopyState {
  isActive: boolean;
  copiedStyle: PathStyle | null;
  sourcePathId: string | null;
}

export interface FormatCopyActions {
  // State accessors
  getFormatCopyState: () => FormatCopyState;
  isFormatCopyActive: () => boolean;
  
  // Copy format actions
  startFormatCopy: (sourcePathId: string) => void;
  applyFormatToPath: (targetPathId: string) => void;
  cancelFormatCopy: () => void;
}

export const createFormatCopyActions: StateCreator<
  EditorState & FormatCopyActions,
  [],
  [],
  FormatCopyActions
> = (set, get, api) => ({
  // State accessors
  getFormatCopyState: () => {
    const state = get();
    return {
      isActive: state.formatCopyState?.isActive ?? false,
      copiedStyle: state.formatCopyState?.copiedStyle ?? null,
      sourcePathId: state.formatCopyState?.sourcePathId ?? null,
    };
  },

  isFormatCopyActive: () => {
    const state = get();
    return state.formatCopyState?.isActive ?? false;
  },

  // Start format copy mode
  startFormatCopy: (sourcePathId: string) => {
    const state = get();
    
    // Find the source path
    const sourcePath = state.paths.find(path => path.id === sourcePathId);
    if (!sourcePath) {
      console.warn('Source path not found:', sourcePathId);
      return;
    }

    // Copy the complete style
    const copiedStyle: PathStyle = {
      // Fill & Stroke properties
      fill: sourcePath.style.fill,
      fillOpacity: sourcePath.style.fillOpacity,
      fillRule: sourcePath.style.fillRule,
      stroke: sourcePath.style.stroke,
      strokeWidth: sourcePath.style.strokeWidth,
      strokeOpacity: sourcePath.style.strokeOpacity,
      strokeDasharray: sourcePath.style.strokeDasharray,
      strokeDashoffset: sourcePath.style.strokeDashoffset,
      strokeLinecap: sourcePath.style.strokeLinecap,
      strokeLinejoin: sourcePath.style.strokeLinejoin,
      strokeMiterlimit: sourcePath.style.strokeMiterlimit,
      
      // Visibility and effects
      opacity: sourcePath.style.opacity,
      visibility: sourcePath.style.visibility,
      
      // SVG references (reused directly, no cloning)
      clipPath: sourcePath.style.clipPath,
      clipRule: sourcePath.style.clipRule,
      mask: sourcePath.style.mask,
      filter: sourcePath.style.filter,
      markerStart: sourcePath.style.markerStart,
      markerMid: sourcePath.style.markerMid,
      markerEnd: sourcePath.style.markerEnd,
      
      // Additional properties from PathStyle
      color: sourcePath.style.color,
      colorInterpolation: sourcePath.style.colorInterpolation,
      colorInterpolationFilters: sourcePath.style.colorInterpolationFilters,
      colorProfile: sourcePath.style.colorProfile,
      colorRendering: sourcePath.style.colorRendering,
      
      // Text properties (in case they exist in PathStyle)
      fontFamily: sourcePath.style.fontFamily,
      fontSize: sourcePath.style.fontSize,
      fontWeight: sourcePath.style.fontWeight,
      fontStyle: sourcePath.style.fontStyle,
      
      // Shape rendering
      shapeRendering: sourcePath.style.shapeRendering,
      imageRendering: sourcePath.style.imageRendering,
      
      // Interaction properties
      pointerEvents: sourcePath.style.pointerEvents,
      cursor: sourcePath.style.cursor,
      
      // Display properties
      display: sourcePath.style.display,
      overflow: sourcePath.style.overflow,
    };

    set((state) => ({
      ...state,
      formatCopyState: {
        isActive: true,
        copiedStyle: copiedStyle,
        sourcePathId: sourcePathId,
      },
      floatingToolbarUpdateTimestamp: Date.now(),
    }));
  },

  // Apply copied format to target path
  applyFormatToPath: (targetPathId: string) => {
    const state = get();
    const formatState = state.formatCopyState;
    
    if (!formatState?.isActive || !formatState.copiedStyle) {
      console.warn('No format to apply - format copy not active');
      return;
    }

    // Find target path
    const targetPath = state.paths.find(path => path.id === targetPathId);
    if (!targetPath) {
      console.warn('Target path not found:', targetPathId);
      return;
    }

    // Don't apply to the same path
    if (targetPathId === formatState.sourcePathId) {
      console.warn('Cannot apply format to the same path');
      return;
    }

    // Push to history before making changes
    (get() as any).pushToHistory();

    // Apply the copied style directly
    (get() as any).updatePathStyle(targetPathId, formatState.copiedStyle);

    // Cancel format copy mode
    get().cancelFormatCopy();
  },

  // Cancel format copy mode
  cancelFormatCopy: () => {
    set((state) => ({
      ...state,
      formatCopyState: {
        isActive: false,
        copiedStyle: null,
        sourcePathId: null,
      },
      floatingToolbarUpdateTimestamp: Date.now(),
    }));
  },
});