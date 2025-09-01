import React from 'react';
import { Play, Square } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { MobileToolbarButton, MobileToolbarSection } from './ToolbarButton';
import { useMobileDetection } from '../hooks/useMobileDetection';
import { UI_CONSTANTS } from '../config/constants';

export const AnimationPlayButton: React.FC = () => {
  const { isMobile } = useMobileDetection();
  const iconSize = isMobile ? UI_CONSTANTS.TOOLBAR.MOBILE_ICON_SIZE : UI_CONSTANTS.TOOLBAR.DESKTOP_ICON_SIZE;
  const strokeWidth = isMobile ? UI_CONSTANTS.TOOLBAR.MOBILE_ICON_STROKE_WIDTH : UI_CONSTANTS.TOOLBAR.DESKTOP_ICON_STROKE_WIDTH;
  
  const { 
    animations, 
    animationState, 
    playAnimations, 
    stopAnimations 
  } = useEditorStore();

  // Only show the button if there are animations
  if (animations.length === 0) {
    return null;
  }

  const handlePlay = () => {
    playAnimations();
  };

  const handleStop = () => {
    stopAnimations();
  };

  return (
    <MobileToolbarSection title="Animation Controls">
      {!animationState.isPlaying ? (
        <MobileToolbarButton
          icon={<Play size={iconSize} strokeWidth={strokeWidth} />}
          onClick={handlePlay}
          color="#374151"
          title="Play Animations"
          size="medium"
        />
      ) : (
        <MobileToolbarButton
          icon={<Square size={iconSize} strokeWidth={strokeWidth} />}
          onClick={handleStop}
          color="#dc3545"
          title="Stop Animations"
          size="medium"
        />
      )}
    </MobileToolbarSection>
  );
};