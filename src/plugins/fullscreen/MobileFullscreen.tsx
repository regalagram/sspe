import React from 'react';
import { Maximize, Minimize } from 'lucide-react';
import { MobileToolbarButton, MobileToolbarSection } from '../../components/MobileToolbarButton';
import { useEditorStore } from '../../store/editorStore';
import { useMobileDetection } from '../../hooks/useMobileDetection';

export const MobileFullscreenControl: React.FC = () => {
  const { isFullscreen, toggleFullscreen } = useEditorStore();
  const { isMobile } = useMobileDetection();

  if (!isMobile) {
    // Return null for desktop - use original component
    return null;
  }

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
        color="#007acc"
        title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        size="medium"
      />
    </MobileToolbarSection>
  );
};