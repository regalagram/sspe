import { useState, useEffect } from 'react';
import { textEditManager, TextEditState } from '../managers/TextEditManager';

export const useTextEditMode = () => {
  const [textEditState, setTextEditState] = useState<TextEditState>(textEditManager.getState());

  useEffect(() => {
    console.log('📝 useTextEditMode: Setting up listener');
    const unsubscribe = textEditManager.addListener((newState) => {
      console.log('📝 useTextEditMode: Received state update:', newState);
      setTextEditState(newState);
    });
    return unsubscribe;
  }, []);

  console.log('📝 useTextEditMode: Current state:', textEditState);

  return {
    ...textEditState,
    startTextEdit: (textId: string) => textEditManager.startTextEdit(textId),
    stopTextEdit: (save: boolean = true) => textEditManager.stopTextEdit(save),
    isTextBeingEdited: (textId: string) => {
      const result = textEditManager.isTextBeingEdited(textId);
      console.log('📝 useTextEditMode: isTextBeingEdited for', textId, ':', result);
      return result;
    },
    updateTextContent: (content: string | string[]) => {
      console.log('📝 useTextEditMode: updateTextContent called with:', content);
      textEditManager.updateTextContent(content);
    }
  };
};