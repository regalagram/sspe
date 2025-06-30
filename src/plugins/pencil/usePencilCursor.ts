import { useEditorStore } from '../../store/editorStore';

export const usePencilCursor = () => {
  const { mode } = useEditorStore();
  
  const getCursor = (): string => {
    if (mode.current === 'create' && mode.createMode?.commandType === 'PENCIL') {
      return 'crosshair';
    }
    return 'default';
  };

  return { getCursor };
};
