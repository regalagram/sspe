import { textManager } from '../managers/TextManager';

export const useTextCursor = () => {
  const getCursor = (): string => {
    return textManager.getCursor();
  };

  return { getCursor };
};