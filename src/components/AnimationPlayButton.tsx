import React from 'react';
import { Play, Pause, Square } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { MobileToolbarButton, MobileToolbarSection } from './ToolbarButton';

export const AnimationPlayButton: React.FC = () => {
  const { 
    animations, 
    animationState, 
    playAnimations, 
    pauseAnimations, 
    stopAnimations 
  } = useEditorStore();

  // Only show the button if there are animations
  if (animations.length === 0) {
    return null;
  }

  const handlePlayPause = () => {
    if (animationState.isPlaying) {
      pauseAnimations();
    } else {
      playAnimations();
    }
  };

  const handleStop = () => {
    stopAnimations();
  };

  return (
    <MobileToolbarSection title="Animation Controls">
      <MobileToolbarButton
        icon={animationState.isPlaying ? <Pause /> : <Play />}
        onClick={handlePlayPause}
        active={animationState.isPlaying}
        color="#007acc"
        title={animationState.isPlaying ? 'Pause Animations' : 'Play Animations'}
        size="medium"
      />
      
      {animationState.isPlaying && (
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