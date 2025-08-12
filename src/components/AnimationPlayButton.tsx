import React from 'react';
import { Play, Square } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { MobileToolbarButton, MobileToolbarSection } from './ToolbarButton';

export const AnimationPlayButton: React.FC = () => {
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
          icon={<Play />}
          onClick={handlePlay}
          color="#374151"
          title="Play Animations"
          size="medium"
        />
      ) : (
        <MobileToolbarButton
          icon={<Square />}
          onClick={handleStop}
          color="#dc3545"
          title="Stop Animations"
          size="medium"
        />
      )}
    </MobileToolbarSection>
  );
};