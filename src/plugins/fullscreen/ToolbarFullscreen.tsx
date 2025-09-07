import React from 'react';
import { Maximize, Minimize } from 'lucide-react';
import { MobileToolbarButton, MobileToolbarSection } from '../../components/ToolbarButton';
import { useEditorStore } from '../../store/editorStore';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { CONFIG } from '../../config/constants';

export const ToolbarFullscreenControl: React.FC = () => {
  const { isFullscreen, toggleFullscreen } = useEditorStore();
  const { isMobile } = useMobileDetection();
  const iconSize = isMobile ? CONFIG.UI.ICONS.MOBILE_SIZE : CONFIG.UI.ICONS.DESKTOP_SIZE;
  const strokeWidth = isMobile ? CONFIG.UI.ICONS.MOBILE_STROKE_WIDTH : CONFIG.UI.ICONS.DESKTOP_STROKE_WIDTH;

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