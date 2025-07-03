import { useMouseInteraction } from '../plugins/mouse-interaction/MouseInteraction';
import { useRectSelection } from '../plugins/selection/Selection';
import { usePencilCursor } from '../plugins/pencil/usePencilCursor';

/**
 * Hook to combine cursors from different plugins
 * Following the composition over inheritance principle from README.md
 */
export const useCombinedCursor = () => {
  const mouseInteraction = useMouseInteraction();
  const rectSelection = useRectSelection();
  const pencilCursor = usePencilCursor();
  
  const getCursor = (): string => {
    const mouseCursor = mouseInteraction.getCursor();
    const rectCursor = rectSelection.getCursor();
    const pencilCursorValue = pencilCursor.getCursor();
    
    if (pencilCursorValue !== 'default') return pencilCursorValue;
    if (mouseCursor !== 'default') return mouseCursor;
    if (rectCursor !== 'default') return rectCursor;
    return 'default';
  };

  return { getCursor };
};
