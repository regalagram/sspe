import { StateCreator } from 'zustand';
import { EditorState, PathStyle, SVGImage } from '../types';

export interface ImageFormatCopyState {
  isActive: boolean;
  copiedStyle: Partial<PathStyle> | null;
  sourceImageId: string | null;
}

export interface ImageFormatCopyActions {
  // State accessors
  getImageFormatCopyState: () => ImageFormatCopyState;
  isImageFormatCopyActive: () => boolean;
  
  // Copy format actions
  startImageFormatCopy: (sourceImageId: string) => void;
  applyImageFormatToImage: (targetImageId: string) => void;
  cancelImageFormatCopy: () => void;
}

export const createImageFormatCopyActions: StateCreator<
  EditorState & ImageFormatCopyActions,
  [],
  [],
  ImageFormatCopyActions
> = (set, get, api) => ({
  // State accessors
  getImageFormatCopyState: () => {
    const state = get();
    return {
      isActive: state.imageFormatCopyState?.isActive ?? false,
      copiedStyle: state.imageFormatCopyState?.copiedStyle ?? null,
      sourceImageId: state.imageFormatCopyState?.sourceImageId ?? null,
    };
  },

  isImageFormatCopyActive: () => {
    const state = get();
    return state.imageFormatCopyState?.isActive ?? false;
  },

  // Start image format copy mode
  startImageFormatCopy: (sourceImageId: string) => {
    const state = get();
    
    // Find the source image
    const sourceImage = state.images.find(image => image.id === sourceImageId);
    if (!sourceImage) {
      console.warn('Source image not found:', sourceImageId);
      return;
    }

    // Copy the style properties that make sense for images
    const copiedStyle: Partial<PathStyle> = {
      // Opacity and fill properties
      opacity: sourceImage.style?.opacity,
      fillOpacity: sourceImage.style?.fillOpacity,
      
      // Stroke properties
      stroke: sourceImage.style?.stroke,
      strokeWidth: sourceImage.style?.strokeWidth,
      strokeOpacity: sourceImage.style?.strokeOpacity,
      strokeDasharray: sourceImage.style?.strokeDasharray,
      strokeDashoffset: sourceImage.style?.strokeDashoffset,
      strokeLinecap: sourceImage.style?.strokeLinecap,
      strokeLinejoin: sourceImage.style?.strokeLinejoin,
      strokeMiterlimit: sourceImage.style?.strokeMiterlimit,
      
      // Effects
      filter: sourceImage.style?.filter,
      clipPath: sourceImage.style?.clipPath,
      mask: sourceImage.style?.mask,
      
      // Other properties
      visibility: sourceImage.style?.visibility,
      pointerEvents: sourceImage.style?.pointerEvents,
      cursor: sourceImage.style?.cursor,
      display: sourceImage.style?.display,
    };

    set((state) => ({
      ...state,
      imageFormatCopyState: {
        isActive: true,
        copiedStyle: copiedStyle,
        sourceImageId: sourceImageId,
      },
      floatingToolbarUpdateTimestamp: Date.now(),
    }));
  },

  // Apply copied format to target image
  applyImageFormatToImage: (targetImageId: string) => {
    const state = get();
    const formatState = state.imageFormatCopyState;
    
    if (!formatState?.isActive || !formatState.copiedStyle) {
      console.warn('No image format to apply - image format copy not active');
      return;
    }

    // Find target image
    const targetImage = state.images.find(image => image.id === targetImageId);
    if (!targetImage) {
      console.warn('Target image not found:', targetImageId);
      return;
    }

    // Don't apply to the same image
    if (targetImageId === formatState.sourceImageId) {
      console.warn('Cannot apply format to the same image');
      return;
    }

    // Push to history before making changes
    (get() as any).pushToHistory();

    // Apply the copied style
    (get() as any).updateImage(targetImageId, {
      style: {
        ...targetImage.style,
        ...formatState.copiedStyle
      }
    });

    // Cancel image format copy mode
    get().cancelImageFormatCopy();
  },

  // Cancel image format copy mode
  cancelImageFormatCopy: () => {
    set((state) => ({
      ...state,
      imageFormatCopyState: {
        isActive: false,
        copiedStyle: null,
        sourceImageId: null,
      },
      floatingToolbarUpdateTimestamp: Date.now(),
    }));
  },
});