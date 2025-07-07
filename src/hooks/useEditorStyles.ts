import { useMemo } from 'react';

interface UseEditorStylesProps {
  isFullscreen: boolean;
  accordionVisible: boolean;
}

export const useEditorStyles = ({ isFullscreen, accordionVisible }: UseEditorStylesProps) => {
  const editorStyle: React.CSSProperties = useMemo(() => ({
    width: '100%',
    height: '100vh',
    position: 'relative',
    overflow: 'hidden',
    background: '#f5f5f5',
    marginRight: accordionVisible ? '320px' : '0',
    transition: 'margin-right 0.3s ease',
    ...(isFullscreen ? {
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 9999,
      marginRight: 0, 
    } : {})
  }), [isFullscreen, accordionVisible]);

  const svgStyle: React.CSSProperties = useMemo(() => ({
    background: 'white',
  }), []);

  return { editorStyle, svgStyle };
};
