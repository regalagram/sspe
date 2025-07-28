import React from 'react';
import { useEditorStore } from '../store/editorStore';
import { SVGAnimation } from '../types';

// Hook to manage animation timer
const useAnimationTimer = () => {
  const { animationState, setAnimationTime, animations } = useEditorStore();
  
  React.useEffect(() => {
    let intervalId: number | null = null;
    
    if (animationState.isPlaying && animationState.startTime) {
      intervalId = window.setInterval(() => {
        const elapsed = (Date.now() - animationState.startTime!) / 1000; // Convert to seconds
        const newTime = elapsed * animationState.playbackRate;
        
        // Calculate max duration from all animations
        const maxDuration = Math.max(5, ...animations.map(anim => parseFloat(anim.dur || '2s') || 2));
        
        if (newTime >= maxDuration && !animationState.loop) {
          // Animation finished
          useEditorStore.getState().stopAnimations();
        } else {
          // Update current time (with looping if enabled)
          const currentTime = animationState.loop ? newTime % maxDuration : Math.min(newTime, maxDuration);
          setAnimationTime(currentTime);
        }
      }, 16); // ~60 FPS updates
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [animationState.isPlaying, animationState.startTime, animationState.playbackRate, animationState.loop, animations, setAnimationTime]);
};

export const AnimationRenderer: React.FC = () => {
  const { animations } = useEditorStore();

  const renderAnimationElement = (animation: SVGAnimation): React.ReactElement => {
    const commonProps = {
      key: animation.id,
      dur: animation.dur || '2s',
      begin: animation.begin || '0s',
      end: animation.end,
      fill: animation.fill || 'freeze',
      repeatCount: animation.repeatCount || 1,
      calcMode: animation.calcMode || 'linear',
      keyTimes: animation.keyTimes,
      keySplines: animation.keySplines,
    };

    switch (animation.type) {
      case 'animate':
        return (
          <animate
            {...commonProps}
            attributeName={animation.attributeName}
            values={animation.values}
            from={animation.from}
            to={animation.to}
          />
        );

      case 'animateTransform':
        return (
          <animateTransform
            {...commonProps}
            attributeName={animation.attributeName}
            type={animation.transformType}
            values={animation.values}
            from={animation.from}
            to={animation.to}
            additive={animation.additive || 'replace'}
            accumulate={animation.accumulate || 'none'}
          />
        );

      case 'animateMotion':
        return (
          <animateMotion
            {...commonProps}
            path={animation.mpath ? undefined : animation.path} // Don't use path if mpath is specified
            rotate={animation.rotate || 'auto'}
            keyPoints={animation.keyPoints}
          >
            {animation.mpath && (
              <mpath href={`#${animation.mpath}`} />
            )}
          </animateMotion>
        );
      
      case 'set':
        return (
          <set
            key={animation.id}
            attributeName={animation.attributeName}
            to={animation.to}
            begin={animation.begin || '0s'}
            end={animation.end}
            fill={animation.fill || 'freeze'}
          />
        );

      default:
        return <></>;
    }
  };

  const getAnimationsForElement = (elementId: string): SVGAnimation[] => {
    return animations.filter(animation => animation.targetElementId === elementId);
  };

  // This component renders animations as children of SVG elements
  // It's called by other renderers when they need to include animations
  return (
    <>
      {/* This component doesn't render visible content directly */}
      {/* Instead, it provides a way for other components to get animation elements */}
    </>
  );
};

// Export utility function for other components to use
export const renderAnimationsForElement = (elementId: string, animations: SVGAnimation[], animationState?: { isPlaying: boolean; currentTime: number }): React.ReactElement[] => {
  const elementAnimations = animations.filter(animation => animation.targetElementId === elementId);
  
  return elementAnimations.map((animation) => {
    // Control playback based on animation state
    let beginValue = animation.begin || '0s';
    if (animationState) {
      if (animationState.isPlaying) {
        beginValue = '0s'; // Start immediately when playing
      } else {
        beginValue = 'indefinite'; // Don't start when not playing
      }
    }
    
    const commonProps = {
      key: animation.id,
      dur: animation.dur || '2s',
      begin: beginValue,
      end: animation.end,
      fill: animation.fill || 'freeze',
      repeatCount: animation.repeatCount || 1,
      calcMode: animation.calcMode || 'linear',
      keyTimes: animation.keyTimes,
      keySplines: animation.keySplines,
    };

    switch (animation.type) {
      case 'animate':
        return (
          <animate
            {...commonProps}
            attributeName={animation.attributeName}
            values={animation.values}
            from={animation.from}
            to={animation.to}
          />
        );

      case 'animateTransform':
        return (
          <animateTransform
            {...commonProps}
            attributeName={animation.attributeName}
            type={animation.transformType}
            values={animation.values}
            from={animation.from}
            to={animation.to}
            additive={animation.additive || 'replace'}
            accumulate={animation.accumulate || 'none'}
          />
        );

      case 'animateMotion':
        return (
          <animateMotion
            {...commonProps}
            path={animation.mpath ? undefined : animation.path} // Don't use path if mpath is specified
            rotate={animation.rotate || 'auto'}
            keyPoints={animation.keyPoints}
          >
            {animation.mpath && (
              <mpath href={`#${animation.mpath}`} />
            )}
          </animateMotion>
        );

      default:
        return <React.Fragment key={`empty-${Math.random()}`}></React.Fragment>;
    }
  });
};

// Global component to manage animation timing - should be rendered once
export const AnimationTimer: React.FC = () => {
  useAnimationTimer();
  return null; // This component doesn't render anything
};

// Hook for components to easily get animation elements with playback control
export const useAnimationsForElement = (elementId: string) => {
  const { animations, animationState } = useEditorStore();
  const [animationKey, setAnimationKey] = React.useState(0);
  
  // Force re-render of animations when playback state changes
  React.useEffect(() => {
    setAnimationKey(prev => prev + 1);
  }, [animationState.isPlaying]);
  
  const createAnimationElement = React.useCallback((animation: SVGAnimation) => {
    // Control playback based on animation state - use direct timing instead of refs
    let beginValue: string;
    
    if (animationState.isPlaying) {
      // Start immediately when playing
      beginValue = '0s';
    } else {
      // Don't start when not playing
      beginValue = 'indefinite';
    }
    
    const commonProps = {
      dur: animation.dur || '2s',
      begin: beginValue,
      end: animation.end,
      fill: animation.fill || 'freeze',
      repeatCount: animation.repeatCount || 'indefinite',
      calcMode: animation.calcMode || 'linear',
      keyTimes: animation.keyTimes,
      keySplines: animation.keySplines,
    };

    switch (animation.type) {
      case 'animate':
        return (
          <animate
            key={`${animation.id}-${animationKey}`}
            {...commonProps}
            attributeName={animation.attributeName}
            values={animation.values}
            from={animation.from}
            to={animation.to}
          />
        );

      case 'animateTransform':
        return (
          <animateTransform
            key={`${animation.id}-${animationKey}`}
            {...commonProps}
            attributeName={animation.attributeName}
            type={animation.transformType}
            values={animation.values}
            from={animation.from}
            to={animation.to}
            additive={animation.additive || 'replace'}
            accumulate={animation.accumulate || 'none'}
          />
        );

      case 'animateMotion':
        return (
          <animateMotion
            key={`${animation.id}-${animationKey}`}
            {...commonProps}
            path={animation.mpath ? undefined : animation.path} // Don't use path if mpath is specified
            rotate={animation.rotate || 'auto'}
            keyPoints={animation.keyPoints}
          >
            {animation.mpath && (
              <mpath href={`#${animation.mpath}`} />
            )}
          </animateMotion>
        );
        
      case 'set':
        return (
          <set
            key={`${animation.id}-${animationKey}`}
            attributeName={animation.attributeName}
            to={animation.to}
            begin={beginValue}
            end={animation.end}
            fill={animation.fill || 'freeze'}
          />
        );

      default:
        return <React.Fragment key={`empty-${(animation as any).id}-${animationKey}`}></React.Fragment>;
    }
  }, [animationState.isPlaying, animationKey]);
  
  return React.useMemo(() => {
    const elementAnimations = animations.filter(animation => animation.targetElementId === elementId);
    return elementAnimations.map(createAnimationElement);
  }, [elementId, animations, createAnimationElement, animationKey]);
};