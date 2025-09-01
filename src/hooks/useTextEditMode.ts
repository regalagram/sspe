import { useState, useEffect } from 'react';
import { textEditManager, TextEditState } from '../core/TextEditManager';

export const useTextEditMode = () => {
  const [textEditState, setTextEditState] = useState<TextEditState>(textEditManager.getState());

  useEffect(() => {
        const unsubscribe = textEditManager.addListener((newState) => {
            setTextEditState(newState);
    });
    return unsubscribe;
  }, []);

  
  return {
    ...textEditState,
    startTextEdit: (textId: string) => textEditManager.startTextEdit(textId),
    stopTextEdit: (save: boolean = true, finalContent?: string) => {
      return textEditManager.stopTextEdit(save, finalContent);
    },
    isTextBeingEdited: (textId: string) => {
      const result = textEditManager.isTextBeingEdited(textId);
      return result;
    },
    updateTextContent: (content: string | string[]) => {
      textEditManager.updateTextContent(content);
    }
  };
};