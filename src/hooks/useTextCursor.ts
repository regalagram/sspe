import { textManager } from '../core/TextManager';

export const useTextCursor = () => {
  const getCursor = (): string => {
    return textManager.getCursor();
  };

  return { getCursor };
};