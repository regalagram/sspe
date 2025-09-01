import React from 'react';
import { Maximize, Minimize } from 'lucide-react';
import { MobileToolbarButton, MobileToolbarSection } from '../../components/ToolbarButton';
import { useEditorStore } from '../../store/editorStore';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { UI_CONSTANTS } from '../../config/constants';

export const ToolbarFullscreenControl: React.FC = () => {
  const { isMobile } = useMobileDetection();
  const iconSize = isMobile ? UI_CONSTANTS.TOOLBAR.MOBILE_ICON_SIZE : UI_CONSTANTS.TOOLBAR.DESKTOP_ICON_SIZE;
  const strokeWidth = isMobile ? UI_CONSTANTS.TOOLBAR.MOBILE_ICON_STROKE_WIDTH : UI_CONSTANTS.TOOLBAR.DESKTOP_ICON_STROKE_WIDTH;
  
  const { isFullscreen, toggleFullscreen } = useEditorStore();

  const handleToggle = async () => {
    try {
      if (!isFullscreen) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.warn('Fullscreen API not supported or failed:', error);
      // Fallback: just toggle the store state for CSS-based fullscreen
      toggleFullscreen();
    }
  };

  return (
    <MobileToolbarSection title="Display">
      <MobileToolbarButton
        icon={isFullscreen ? <Minimize size={iconSize} strokeWidth={strokeWidth} /> : <Maximize size={iconSize} strokeWidth={strokeWidth} />}
        onClick={handleToggle}
        active={isFullscreen}
        color="#374151"
        title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        size="medium"
      />
    </MobileToolbarSection>
  );
};

// Backward compatibility export
export const MobileFullscreenControl = ToolbarFullscreenControl;