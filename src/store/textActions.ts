import { StateCreator } from 'zustand';
import { EditorState, TextElementType, TextElement, MultilineTextElement, TextStyle, Point } from '../types';
import { generateId } from '../utils/id-utils';

export interface TextActions {
  // Text creation
  addText: (x: number, y: number, content?: string) => string;
  addMultilineText: (x: number, y: number, spans?: string[]) => string;
  
  // Text manipulation
  updateText: (textId: string, updates: Partial<Omit<TextElement, 'id' | 'type'>>) => void;
  updateMultilineText: (textId: string, updates: Partial<Omit<MultilineTextElement, 'id' | 'type'>>) => void;
  updateTextContent: (textId: string, content: string) => void;
  updateTextPosition: (textId: string, x: number, y: number) => void;
  updateTextTransform: (textId: string, transform: string) => void;
  updateTextStyle: (textId: string, style: Partial<TextStyle>) => void;
  
  // Text operations
  duplicateText: (textId: string) => string | null;
  deleteText: (textId: string) => void;
  moveText: (textId: string, delta: Point) => void;
  
  // Multi-line text specific
  addTextSpan: (textId: string, content: string, index?: number) => string | null;
  updateTextSpan: (textId: string, spanId: string, updates: any) => void;
  deleteTextSpan: (textId: string, spanId: string) => void;
  
  // Selection helpers
  getTextById: (textId: string) => TextElementType | null;
  getAllTexts: () => TextElementType[];
  getSelectedTexts: () => TextElementType[];
  
  // Utility
  lockText: (textId: string, locked?: boolean) => void;
  clearAllTexts: () => void;
  replaceTexts: (texts: TextElementType[]) => void;
}

export const createTextActions: StateCreator<
  EditorState & TextActions,
  [],
  [],
  TextActions
> = (set, get) => ({
  
  addText: (x: number, y: number, content = 'Text') => {
    const newText: TextElement = {
      id: generateId(),
      type: 'text',
      content,
      x,
      y,
      style: {
        fontFamily: 'Arial, sans-serif',
        fontSize: 16,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textAnchor: 'start',
        fill: '#000000'
      }
    };
    
    set(state => ({
      texts: [...state.texts, newText]
    }));
    
    return newText.id;
  },

  addMultilineText: (x: number, y: number, spans = ['Text']) => {
    const textSpans = spans.map((content, index) => ({
      id: generateId(),
      content,
      x: index === 0 ? undefined : 0,
      y: index === 0 ? undefined : index * 20,
      dx: 0,
      dy: index === 0 ? 0 : 20
    }));

    const newText: MultilineTextElement = {
      id: generateId(),
      type: 'multiline-text',
      x,
      y,
      spans: textSpans,
      style: {
        fontFamily: 'Arial, sans-serif',
        fontSize: 16,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textAnchor: 'start',
        fill: '#000000'
      }
    };
    
    set(state => ({
      texts: [...state.texts, newText]
    }));
    
    return newText.id;
  },

  updateText: (textId: string, updates: Partial<Omit<TextElement, 'id' | 'type'>>) => {
    set(state => ({
      texts: state.texts.map(text => 
        text.id === textId && text.type === 'text'
          ? { ...text, ...updates }
          : text
      )
    }));
  },

  updateMultilineText: (textId: string, updates: Partial<Omit<MultilineTextElement, 'id' | 'type'>>) => {
    set(state => ({
      texts: state.texts.map(text => 
        text.id === textId && text.type === 'multiline-text'
          ? { ...text, ...updates }
          : text
      )
    }));
  },

  updateTextContent: (textId: string, content: string) => {
    set(state => ({
      texts: state.texts.map(text => 
        text.id === textId && text.type === 'text'
          ? { ...text, content }
          : text
      )
    }));
  },

  updateTextPosition: (textId: string, x: number, y: number) => {
    set(state => ({
      texts: state.texts.map(text => 
        text.id === textId ? { ...text, x, y } : text
      )
    }));
  },

  updateTextTransform: (textId: string, transform: string) => {
    set(state => ({
      texts: state.texts.map(text => 
        text.id === textId ? { ...text, transform } : text
      )
    }));
  },

  updateTextStyle: (textId: string, style: Partial<TextStyle>) => {
    set(state => ({
      texts: state.texts.map(text => 
        text.id === textId 
          ? { ...text, style: { ...text.style, ...style } }
          : text
      )
    }));
  },

  duplicateText: (textId: string) => {
    const state = get();
    const text = state.texts.find(t => t.id === textId);
    if (!text) return null;
    
    const newText: TextElementType = {
      ...text,
      id: generateId(),
      x: text.x + 20,
      y: text.y + 20
    };
    
    set(state => ({
      texts: [...state.texts, newText]
    }));
    
    return newText.id;
  },

  deleteText: (textId: string) => {
    set(state => ({
      texts: state.texts.filter(text => text.id !== textId),
      selection: {
        ...state.selection,
        selectedTexts: state.selection.selectedTexts.filter(id => id !== textId)
      }
    }));
  },

  moveText: (textId: string, delta: Point) => {
    set(state => ({
      texts: state.texts.map(text => {
        if (text.id !== textId) return text;
        
        const newX = text.x + delta.x;
        const newY = text.y + delta.y;
        
        // Check if the transform has rotation with specific center point
        let newTransform = text.transform;
        if (text.transform) {
          // Match rotate with center coordinates: rotate(angle, cx, cy)
          const rotateWithCenterMatch = text.transform.match(/rotate\(([^,]+),\s*([^,]+),\s*([^)]+)\)/);
          if (rotateWithCenterMatch) {
            const angle = rotateWithCenterMatch[1];
            const oldCx = parseFloat(rotateWithCenterMatch[2]);
            const oldCy = parseFloat(rotateWithCenterMatch[3]);
            
            // Update the rotation center to match the new text position
            const newCx = oldCx + delta.x;
            const newCy = oldCy + delta.y;
            
            newTransform = text.transform.replace(
              /rotate\([^)]+\)/,
              `rotate(${angle}, ${newCx}, ${newCy})`
            );
          }
        }
        
        return { 
          ...text, 
          x: newX, 
          y: newY,
          transform: newTransform
        };
      })
    }));
  },

  addTextSpan: (textId: string, content: string, index?: number) => {
    const state = get();
    const text = state.texts.find(t => t.id === textId);
    if (!text || text.type !== 'multiline-text') return null;
    
    const newSpan = {
      id: generateId(),
      content,
      x: 0,
      y: 0,
      dx: 0,
      dy: 20
    };
    
    const spans = [...text.spans];
    if (index !== undefined) {
      spans.splice(index, 0, newSpan);
    } else {
      spans.push(newSpan);
    }
    
    set(state => ({
      texts: state.texts.map(t => 
        t.id === textId && t.type === 'multiline-text'
          ? { ...t, spans }
          : t
      )
    }));
    
    return newSpan.id;
  },

  updateTextSpan: (textId: string, spanId: string, updates: any) => {
    set(state => ({
      texts: state.texts.map(text => 
        text.id === textId && text.type === 'multiline-text'
          ? {
              ...text,
              spans: text.spans.map(span => 
                span.id === spanId ? { ...span, ...updates } : span
              )
            }
          : text
      )
    }));
  },

  deleteTextSpan: (textId: string, spanId: string) => {
    set(state => ({
      texts: state.texts.map(text => 
        text.id === textId && text.type === 'multiline-text'
          ? {
              ...text,
              spans: text.spans.filter(span => span.id !== spanId)
            }
          : text
      )
    }));
  },

  getTextById: (textId: string) => {
    const state = get();
    return state.texts.find(text => text.id === textId) || null;
  },

  getAllTexts: () => {
    const state = get();
    return state.texts;
  },

  getSelectedTexts: () => {
    const state = get();
    return state.texts.filter(text => 
      state.selection.selectedTexts.includes(text.id)
    );
  },

  lockText: (textId: string, locked = true) => {
    set(state => ({
      texts: state.texts.map(text => 
        text.id === textId ? { ...text, locked } : text
      )
    }));
  },

  clearAllTexts: () => {
    set(state => ({
      texts: [],
      selection: {
        ...state.selection,
        selectedTexts: [],
        selectedTextSpans: []
      }
    }));
  },

  replaceTexts: (texts: TextElementType[]) => {
    set(state => ({
      texts: texts,
      selection: {
        ...state.selection,
        selectedTexts: [],
        selectedTextSpans: []
      }
    }));
  }
});