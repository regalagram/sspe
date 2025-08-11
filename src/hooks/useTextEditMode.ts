import { useState, useEffect } from 'react';
import { textEditManager, TextEditState } from '../managers/TextEditManager';

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
    stopTextEdit: (save: boolean = true) => textEditManager.stopTextEdit(save),
    isTextBeingEdited: (textId: string) => {
      const result = textEditManager.isTextBeingEdited(textId);
            return result;
    },
    updateTextContent: (content: string | string[]) => {
            textEditManager.updateTextContent(content);
    }
  };
};