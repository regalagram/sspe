import { usePointerInteraction } from '../plugins/pointer-interaction/PointerInteraction';
import { useRectSelection } from '../plugins/selection/Selection';
import { usePencilCursor } from '../plugins/pencil/usePencilCursor';
import { useTextCursor } from '../plugins/text/useTextCursor';

export const useCombinedCursor = () => {
  const mouseInteraction = usePointerInteraction();
  const rectSelection = useRectSelection();
  const pencilCursor = usePencilCursor();
  const textCursor = useTextCursor();
  
  const getCursor = (): string => {
    const mouseCursor = mouseInteraction.getCursor();
    const rectCursor = rectSelection.getCursor();
    const pencilCursorValue = pencilCursor.getCursor();
    const textCursorValue = textCursor.getCursor();
    
    if (pencilCursorValue !== 'default') return pencilCursorValue;
    if (textCursorValue !== 'default') return textCursorValue;
    if (mouseCursor !== 'default') return mouseCursor;
    if (rectCursor !== 'default') return rectCursor;
    return 'default';
  };

  return { getCursor };
};
