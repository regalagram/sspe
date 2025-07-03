import { useMemo } from 'react';

interface UseEditorStylesProps {
  isFullscreen: boolean;
  panelMode: 'draggable' | 'accordion';
  accordionVisible: boolean;
}

/**
 * Hook for computing editor styles based on state
 * Following the separation of logic and presentation principle from README.md
 */
export const useEditorStyles = ({ isFullscreen, panelMode, accordionVisible }: UseEditorStylesProps) => {
  const editorStyle: React.CSSProperties = useMemo(() => ({
    width: '100%',
    height: '100vh',
    position: 'relative',
    overflow: 'hidden',
    background: '#f5f5f5',
    // Adjust right margin when accordion mode is active and visible
    marginRight: (panelMode === 'accordion' && accordionVisible) ? '320px' : '0',
    transition: 'margin-right 0.3s ease',
    ...(isFullscreen ? {
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 9999,
      marginRight: 0, // No margin in fullscreen
    } : {})
  }), [isFullscreen, panelMode, accordionVisible]);

  const svgStyle: React.CSSProperties = useMemo(() => ({
    background: 'white',
    touchAction: 'none' // Prevenir comportamientos nativos de touch
  }), []);

  return { editorStyle, svgStyle };
};
