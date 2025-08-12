import React from 'react';
import { Maximize, Minimize } from 'lucide-react';
import { MobileToolbarButton, MobileToolbarSection } from '../../components/ToolbarButton';
import { useEditorStore } from '../../store/editorStore';
import { useMobileDetection } from '../../hooks/useMobileDetection';

export const ToolbarFullscreenControl: React.FC = () => {
  const { isFullscreen, toggleFullscreen } = useEditorStore();
  const { isMobile } = useMobileDetection();

  // Always show toolbar fullscreen control (removed mobile-only restriction)

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
        icon={isFullscreen ? <Minimize /> : <Maximize />}
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