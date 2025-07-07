import { useMemo } from 'react';

interface UseEditorStylesProps {
  isFullscreen: boolean;
  accordionVisible: boolean;
}

/**
 * Hook for computing editor styles based on state
 * Following the separation of logic and presentation principle from README.md
 */
export const useEditorStyles = ({ isFullscreen, accordionVisible }: UseEditorStylesProps) => {
  const editorStyle: React.CSSProperties = useMemo(() => ({
    width: '100%',
    height: '100vh',
    position: 'relative',
    overflow: 'hidden',
    background: '#f5f5f5',
    // Adjust right margin when accordion is visible (always in accordion mode)
    marginRight: accordionVisible ? '320px' : '0',
    transition: 'margin-right 0.3s ease',
    ...(isFullscreen ? {
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 9999,
      marginRight: 0, // No margin in fullscreen
    } : {})
  }), [isFullscreen, accordionVisible]);

  const svgStyle: React.CSSProperties = useMemo(() => ({
    background: 'white',
    /* Prevent default browser behaviors */
  }), []);

  return { editorStyle, svgStyle };
};
