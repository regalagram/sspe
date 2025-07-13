import { useToolModeState } from '../../hooks/useToolMode';

export const useTextCursor = () => {
  const { activeMode } = useToolModeState();

  const getCursor = (): string => {
    if (activeMode === 'text') {
      return 'text';
    }
    return 'default';
  };

  return { getCursor };
};
