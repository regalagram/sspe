import React from 'react';
import { useEditorStore } from '../store/editorStore';
import { animationFrameEmitter } from '../core/EventSystem';
import { CONFIG } from '../config/constants';
import { SVGAnimation } from '../types';

// Helper function to ensure chainDelays is always a Map
const ensureChainDelaysMap = (chainDelays: any): Map<string, number> => {
  if (chainDelays instanceof Map) {
    return chainDelays;
  }
  // If it's not a Map, create a new one (handles serialization issues)
  return new Map();
};

// Hook to manage animation timer and SVG time control
const useAnimationTimer = () => {
  const { animationState, setAnimationTime } = useEditorStore();
  const svgElementRef = React.useRef<SVGSVGElement | null>(null);
  
  // Find and store reference to the main SVG element
  React.useEffect(() => {
    const svgElement = document.querySelector('svg');
    svgElementRef.current = svgElement;
  }, []);
  
  React.useEffect(() => {
    if (!animationState.isPlaying || !animationState.startTime) {
      animationFrameEmitter.stop();
      return;
    }

    // Start RAF-based animation instead of polling
    animationFrameEmitter.start();

    const unsubscribe = animationFrameEmitter.on('frame', ({ timestamp }) => {
      const elapsed = (timestamp - animationState.startTime!) / 1000; // Convert to seconds
      const newTime = elapsed * animationState.playbackRate;
      
      // Control SVG time directly
      if (svgElementRef.current && typeof svgElementRef.current.setCurrentTime === 'function') {
        try {
          svgElementRef.current.setCurrentTime(newTime);
        } catch (error) {
          // Fallback if setCurrentTime fails
        }
      }
        
      // Just update current time - don't handle completion here
      // Let the main animation system in animationActions.ts handle auto-reset
      setAnimationTime(newTime);
    });

    return () => {
      unsubscribe();
      animationFrameEmitter.stop();
    };
  }, [animationState.isPlaying, animationState.startTime, animationState.playbackRate, animationState.currentTime, setAnimationTime]);
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
export const renderAnimationsForElement = (
  elementId: string, 
  animations: SVGAnimation[], 
  animationState?: { isPlaying: boolean; currentTime: number; chainDelays?: Map<string, number> }
): React.ReactElement[] => {
  const elementAnimations = animations.filter(animation => animation.targetElementId === elementId);
  
  return elementAnimations.map((animation) => {
    // Determine if this animation should be editor-controlled or run autonomously
    const isEditorControlled = animationState && animationState.isPlaying !== undefined;
    const beginValue = isEditorControlled ? 'indefinite' : (animation.begin || '0s');
    
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

// Individual Animation Component with programmatic control for proper pause support
const AnimationElement: React.FC<{ animation: SVGAnimation; animationKey: number }> = ({ animation, animationKey }) => {
  const { animationState } = useEditorStore();
  const animRef = React.useRef<any>(null);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const hasStartedRef = React.useRef<boolean>(false);
  
  // Reset started flag when animation key changes (full restart)
  React.useEffect(() => {
    hasStartedRef.current = false;
  }, [animationKey]);
  
  React.useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    const currentState = useEditorStore.getState();
    const chainDelaysMap = ensureChainDelaysMap(currentState.animationState.chainDelays);
    const isStop = chainDelaysMap.size === 0 && !animationState.isPlaying;
    
    // Handle full stop - reset everything
    if (isStop) {
      hasStartedRef.current = false;
      if (animRef.current) {
        try {
          animRef.current.endElement();
        } catch (error) {
          // Ignore errors
        }
      }
      return;
    }
    
    // Handle pause - use SVG pauseAnimations if available
    if (!animationState.isPlaying && chainDelaysMap.size > 0) {
      const svgElement = animRef.current?.closest('svg');
      if (svgElement && typeof (svgElement as any).pauseAnimations === 'function') {
        try {
          (svgElement as any).pauseAnimations();
        } catch (error) {
        }
      }
      return;
    }
    
    // Handle play/resume - start animations programmatically
    if (animationState.isPlaying && !hasStartedRef.current && animRef.current) {
      // Resume SVG animations if paused
      const svgElement = animRef.current.closest('svg');
      if (svgElement && typeof (svgElement as any).unpauseAnimations === 'function') {
        try {
          (svgElement as any).unpauseAnimations();
        } catch (error) {
        }
      }
      
      const chainDelay = chainDelaysMap.get((animation as any).originalAnimationId || animation.id) || 0;
      const currentTimeMs = animationState.currentTime * 1000;
      const adjustedDelay = Math.max(0, chainDelay - currentTimeMs);
      
      if (adjustedDelay > 0) {
        // Schedule to start after delay
        timeoutRef.current = setTimeout(() => {
          if (animRef.current && animationState.isPlaying && !hasStartedRef.current) {
            try {
              animRef.current.beginElement();
              hasStartedRef.current = true;
            } catch (error) {
            }
          }
        }, adjustedDelay);
      } else {
        // Start immediately
        try {
          animRef.current.beginElement();
          hasStartedRef.current = true;
        } catch (error) {
        }
      }
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [animationState.isPlaying, animationState.restartKey, animation.id]);
  
  // Determine if this animation should be editor-controlled or run autonomously
  const isEditorControlled = animationState && animationState.isPlaying !== undefined;
  const beginValue = isEditorControlled ? 'indefinite' : (animation.begin || '0s');
  
  // Add a key that includes animation key to force re-mount only when needed
  const stableKey = `${animation.id}-${animationKey}`;
  
  const commonProps = {
    dur: animation.dur || '2s',
    begin: beginValue, // Always indefinite - controlled programmatically
    end: animation.end,
    fill: 'freeze', // Keep the final state after animation ends
    repeatCount: animation.repeatCount || 1,
    calcMode: animation.calcMode || 'linear',
    keyTimes: animation.keyTimes,
    keySplines: animation.keySplines,
    restart: 'always',
  };

  switch (animation.type) {
    case 'animate':
      return (
        <animate
          ref={animRef}
          key={stableKey}
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
          ref={animRef}
          key={stableKey}
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
          ref={animRef}
          key={stableKey}
          {...commonProps}
          path={animation.mpath ? undefined : animation.path}
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
          ref={animRef}
          key={stableKey}
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
};

// Hook for components to easily get animation elements with playback control
export const useAnimationsForElement = (elementId: string) => {
  const { animations, animationState, groups } = useEditorStore();
  const [animationKey, setAnimationKey] = React.useState(0);
  
  // Only force re-render when we explicitly restart (not on pause/resume)
  // This is critical to prevent animations from resetting during pause
  React.useEffect(() => {
    setAnimationKey(prev => prev + 1);
  }, [animationState.restartKey]); // Removed isPlaying to prevent pause reset

  // Helper function to find parent groups of an element
  const findParentGroups = React.useCallback((targetElementId: string): string[] => {
    const parentGroups: string[] = [];
    
    groups.forEach(group => {
      const hasElement = group.children.some(child => child.id === targetElementId);
      if (hasElement) {
        parentGroups.push(group.id);
        // Recursively find parent groups of this group
        const grandParents = findParentGroups(group.id);
        parentGroups.push(...grandParents);
      }
    });
    
    return parentGroups;
  }, [groups]);

  const createAnimationElement = React.useCallback((animation: SVGAnimation) => {
    return <AnimationElement key={`${animation.id}-${animationKey}`} animation={animation} animationKey={animationKey} />;
  }, [animationKey]);
  
  return React.useMemo(() => {
    // Get direct animations for this element
    const directAnimations = animations.filter(animation => animation.targetElementId === elementId);
    
    // Get animations from parent groups (inherited animations)
    const parentGroupIds = findParentGroups(elementId);
    const inheritedAnimations = animations.filter(animation => 
      parentGroupIds.includes(animation.targetElementId)
    ).map(animation => ({
      ...animation,
      id: `${animation.id}-inherited-${elementId}`, // Make IDs unique for inherited animations
      targetElementId: elementId, // Retarget to current element
      originalAnimationId: animation.id // Keep reference to original for sync chain lookup
    }));
    
    const allAnimations = [...directAnimations, ...inheritedAnimations];
    
    return allAnimations.map(createAnimationElement);
  }, [elementId, animations, createAnimationElement, animationKey, findParentGroups]);
};