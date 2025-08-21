import { StateCreator } from 'zustand';
import { EditorState, TextStyle, TextElementType, SVGTextPath } from '../types';

export interface TextFormatCopyState {
  isActive: boolean;
  copiedStyle: TextStyle | null;
  sourceTextId: string | null;
  sourceTextType: 'text' | 'multiline-text' | 'textPath' | null;
}

export interface TextFormatCopyActions {
  // State accessors
  getTextFormatCopyState: () => TextFormatCopyState;
  isTextFormatCopyActive: () => boolean;
  
  // Copy format actions
  startTextFormatCopy: (sourceTextId: string) => void;
  applyTextFormatToText: (targetTextId: string) => void;
  applyTextFormatToTextPath: (targetTextPathId: string) => void;
  cancelTextFormatCopy: () => void;
}

export const createTextFormatCopyActions: StateCreator<
  EditorState & TextFormatCopyActions,
  [],
  [],
  TextFormatCopyActions
> = (set, get, api) => ({
  // State accessors
  getTextFormatCopyState: () => {
    const state = get();
    return {
      isActive: state.textFormatCopyState?.isActive ?? false,
      copiedStyle: state.textFormatCopyState?.copiedStyle ?? null,
      sourceTextId: state.textFormatCopyState?.sourceTextId ?? null,
      sourceTextType: state.textFormatCopyState?.sourceTextType ?? null,
    };
  },

  isTextFormatCopyActive: () => {
    const state = get();
    return state.textFormatCopyState?.isActive ?? false;
  },

  // Start text format copy mode
  startTextFormatCopy: (sourceTextId: string) => {
    const state = get();
    
    // First check in regular texts
    let sourceText: TextElementType | SVGTextPath | null = state.texts.find(text => text.id === sourceTextId) || null;
    let sourceType: 'text' | 'multiline-text' | 'textPath' = 'text';
    
    // If not found in texts, check textPaths
    if (!sourceText) {
      const textPath = state.textPaths.find(tp => tp.id === sourceTextId);
      if (textPath) {
        sourceText = textPath;
        sourceType = 'textPath';
      }
    } else {
      sourceType = sourceText.type as 'text' | 'multiline-text';
    }
    
    if (!sourceText) {
      console.warn('Source text not found:', sourceTextId);
      return;
    }

    // Create filtered style based on source type
    const createFilteredTextStyle = (source: TextElementType | SVGTextPath): TextStyle => {
      const baseStyle = { ...source.style };
      
      // For multiline text, we copy the base style (not individual span styles)
      if (source.type === 'multiline-text') {
        // Base style is already what we want
        return baseStyle;
      }
      
      // For textPath, we include all properties - filtering happens during application
      if (source.type === 'textPath') {
        return baseStyle;
      }
      
      // For regular text, copy everything
      return baseStyle;
    };

    const copiedStyle = createFilteredTextStyle(sourceText);

    set((state) => ({
      ...state,
      textFormatCopyState: {
        isActive: true,
        copiedStyle: copiedStyle,
        sourceTextId: sourceTextId,
        sourceTextType: sourceType,
      },
      floatingToolbarUpdateTimestamp: Date.now(),
    }));
  },

  // Apply copied format to regular text (TextElement or MultilineTextElement)
  applyTextFormatToText: (targetTextId: string) => {
    const state = get();
    const formatState = state.textFormatCopyState;
    
    if (!formatState?.isActive || !formatState.copiedStyle) {
      console.warn('No text format to apply - text format copy not active');
      return;
    }

    // Find target text
    const targetText = state.texts.find(text => text.id === targetTextId);
    if (!targetText) {
      console.warn('Target text not found:', targetTextId);
      return;
    }

    // Don't apply to the same text
    if (targetTextId === formatState.sourceTextId) {
      console.warn('Cannot apply format to the same text');
      return;
    }

    // Filter style for application based on target type
    const createApplicableStyle = (copiedStyle: TextStyle, targetType: 'text' | 'multiline-text'): TextStyle => {
      const filtered = { ...copiedStyle };
      
      // If source was textPath, remove textPath-specific properties
      if (formatState.sourceTextType === 'textPath') {
        // Remove properties that don't make sense for regular text
        // Note: startOffset, method, spacing, side are not part of TextStyle, 
        // they're properties of SVGTextPath itself, so they won't be in the style
      }
      
      return filtered;
    };

    const applicableStyle = createApplicableStyle(formatState.copiedStyle, targetText.type as 'text' | 'multiline-text');

    // Push to history before making changes
    (get() as any).pushToHistory();

    // Apply the style using existing actions
    (get() as any).updateTextStyle(targetTextId, applicableStyle);

    // Cancel format copy mode
    get().cancelTextFormatCopy();
  },

  // Apply copied format to textPath
  applyTextFormatToTextPath: (targetTextPathId: string) => {
    const state = get();
    const formatState = state.textFormatCopyState;
    
    if (!formatState?.isActive || !formatState.copiedStyle) {
      console.warn('No text format to apply - text format copy not active');
      return;
    }

    // Find target textPath
    const targetTextPath = state.textPaths.find(tp => tp.id === targetTextPathId);
    if (!targetTextPath) {
      console.warn('Target textPath not found:', targetTextPathId);
      return;
    }

    // Don't apply to the same textPath
    if (targetTextPathId === formatState.sourceTextId) {
      console.warn('Cannot apply format to the same textPath');
      return;
    }

    // For textPath targets, we can apply the full style
    const applicableStyle = { ...formatState.copiedStyle };

    // Push to history before making changes
    (get() as any).pushToHistory();

    // Apply the style using existing textPath actions
    (get() as any).updateTextPathStyle(targetTextPathId, applicableStyle);

    // Cancel format copy mode
    get().cancelTextFormatCopy();
  },

  // Cancel text format copy mode
  cancelTextFormatCopy: () => {
    set((state) => ({
      ...state,
      textFormatCopyState: {
        isActive: false,
        copiedStyle: null,
        sourceTextId: null,
        sourceTextType: null,
      },
      floatingToolbarUpdateTimestamp: Date.now(),
    }));
  },
});