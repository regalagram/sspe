import React from 'react';
import { useEditorStore } from '../../store/editorStore';
import { pencilManager } from './PencilManager';

export const PencilCursor: React.FC = () => {
  const { mode } = useEditorStore();
  const [cursorPosition, setCursorPosition] = React.useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = React.useState(false);
  const [strokeStyle, setStrokeStyle] = React.useState(pencilManager.getStrokeStyle());
  
  const isPencilActive = mode.current === 'create' && mode.createMode?.commandType === 'PENCIL';
  
  // Update stroke style when pencil becomes active
  React.useEffect(() => {
    if (isPencilActive) {
      setStrokeStyle(pencilManager.getStrokeStyle());
    }
  }, [isPencilActive]);
  
  React.useEffect(() => {
    if (!isPencilActive) {
      setIsVisible(false);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {

      const svg = document.querySelector('.svg-editor svg');
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const isOverSVG = e.clientX >= rect.left && e.clientX <= rect.right &&
                       e.clientY >= rect.top && e.clientY <= rect.bottom;
      
      setIsVisible(isOverSVG);
      if (isOverSVG) {
        setCursorPosition({ x: e.clientX, y: e.clientY });
      }
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isPencilActive]);

  if (!isPencilActive || !isVisible) return null;

  const cursorSize = Math.max(strokeStyle.strokeWidth * 2, 12);

  return (
    <div
      style={{
        position: 'fixed',
        left: cursorPosition.x,
        top: cursorPosition.y,
        width: `${cursorSize}px`,
        height: `${cursorSize}px`,
        borderRadius: '50%',
        border: `2px solid ${strokeStyle.stroke}`,
        backgroundColor: `${strokeStyle.stroke}20`,
        pointerEvents: 'none',
        zIndex: 10000,
        transform: 'translate(-50%, -50%)',
        transition: 'width 0.1s ease, height 0.1s ease',
        boxShadow: '0 0 4px rgba(0,0,0,0.3)'
      }}
    />
  );
};
