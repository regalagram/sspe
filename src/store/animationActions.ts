import { StateCreator } from 'zustand';
import { EditorState, SVGAnimation, SVGAnimate, SVGAnimateMotion, SVGAnimateTransform, SVGSet, AnimationState, AnimationChain, AnimationEvent, FilterPrimitiveType, SVGFilter } from '../types';
import { generateId } from '../utils/id-utils';
import { elementRefManager } from '../core/ElementRefManager';
import { TypedSVGAnimation, removeStyleProperty, isAnimationElement, hasAttributeName } from '../types/animation-types';

export interface AnimationActions {
  // Animation CRUD operations
  addAnimation: (animation: any) => string;
  updateAnimation: (animationId: string, updates: Partial<SVGAnimation>) => void;
  removeAnimation: (animationId: string) => void;
  duplicateAnimation: (animationId: string) => void;
  
  // Animation playback control
  playAnimations: () => void;
  pauseAnimations: () => void;
  stopAnimations: () => void;
  resetAnimationsAfterCompletion: () => void;
  setCurrentTime: (time: number) => void;
  setAnimationTime: (time: number) => void;
  setPlaybackRate: (rate: number) => void;
  toggleLoop: () => void;
  
  // Animation selection (prefix to avoid conflict with SelectionActions)
  selectAnimationById: (animationId: string) => void;
  selectMultipleAnimations: (animationIds: string[]) => void;
  deselectAnimation: (animationId: string) => void;
  deselectAllAnimations: () => void;
  
  // Utility functions
  getAnimationsForElement: (elementId: string) => SVGAnimation[];
  getTotalAnimationDuration: () => number;
  calculateChainDelays: () => Map<string, number>;
  
  // Quick animation creators
  createFadeAnimation: (elementId: string, duration: string, fromOpacity?: string, toOpacity?: string) => void;
  createRotateAnimation: (elementId: string, duration: string, degrees: string) => void;
  createScaleAnimation: (elementId: string, duration: string, fromScale?: string, toScale?: string) => void;
  createMoveAnimation: (elementId: string, duration: string, fromX: number, fromY: number, toX: number, toY: number) => void;
  
  // Filter animation creators
  createFilterBlurAnimation: (elementId: string, duration: string, fromStdDev?: number, toStdDev?: number) => void;
  createFilterOffsetAnimation: (elementId: string, duration: string, fromDx?: number, fromDy?: number, toDx?: number, toDy?: number) => void;
  createFilterColorMatrixAnimation: (elementId: string, duration: string, fromValues?: string, toValues?: string) => void;
  createFilterFloodAnimation: (elementId: string, duration: string, fromColor?: string, toColor?: string) => void;
  
  // Set animation creator
  createSetAnimation: (elementId: string, attributeName: string, toValue: string, beginTime?: string) => void;
  
  // ViewBox animation creator (deprecated - poor browser support)
  createViewBoxAnimation: (duration: string, fromViewBox?: string, toViewBox?: string) => void;
  
  // Gradient animation creators
  createGradientStopAnimation: (stopId: string, duration: string, fromColor?: string, toColor?: string) => void;
  createGradientPositionAnimation: (gradientId: string, duration: string, attribute: string, fromValue: string, toValue: string) => void;
  createLinearGradientAnimation: (gradientId: string, duration: string, fromX1?: number, fromY1?: number, fromX2?: number, fromY2?: number, toX1?: number, toY1?: number, toX2?: number, toY2?: number) => void;
  createRadialGradientAnimation: (gradientId: string, duration: string, fromCx?: number, fromCy?: number, fromR?: number, toCx?: number, toCy?: number, toR?: number) => void;
  createGradientStopOffsetAnimation: (stopId: string, duration: string, fromOffset?: number, toOffset?: number) => void;
  createPatternAnimation: (patternId: string, duration: string, fromWidth?: number, fromHeight?: number, toWidth?: number, toHeight?: number) => void;
  createPatternTransformAnimation: (patternId: string, duration: string, fromTransform?: string, toTransform?: string) => void;
  
  // Synchronized animation support
  createAnimationChain: (name: string, animations: { animationId: string; delay?: number; trigger?: 'start' | 'end' | 'repeat'; dependsOn?: string }[]) => void;
  removeAnimationChain: (chainId: string) => void;
  updateAnimationChain: (chainId: string, updates: { name?: string; animations?: { animationId: string; delay?: number; trigger?: 'start' | 'end' | 'repeat'; dependsOn?: string }[] }) => void;
  updateChainAnimationDelay: (chainId: string, animationId: string, newDelay: number) => void;
  updateChainAnimationTrigger: (chainId: string, animationId: string, newTrigger: 'start' | 'end' | 'repeat') => void;
  addAnimationEvent: (event: AnimationEvent) => void;
  processAnimationEvents: () => void;
  
  // mpath support for animateMotion
  createAnimateMotionWithMPath: (elementId: string, pathElementId: string, duration: string, rotate?: 'auto' | 'auto-reverse' | number) => void;
  updateAnimationMPath: (animationId: string, pathElementId: string) => void;
  
  // Geometric animation creators
  createPositionAnimation: (elementId: string, duration: string, fromX?: number, fromY?: number, toX?: number, toY?: number) => void;
  createSizeAnimation: (elementId: string, duration: string, fromWidth?: number, fromHeight?: number, toWidth?: number, toHeight?: number) => void;
  createCircleAnimation: (elementId: string, duration: string, fromRadius?: number, toRadius?: number) => void;
  createPathDataAnimation: (elementId: string, duration: string, fromPath: string, toPath: string) => void;
  createLineAnimation: (elementId: string, duration: string, fromX1?: number, fromY1?: number, fromX2?: number, fromY2?: number, toX1?: number, toY1?: number, toX2?: number, toY2?: number) => void;
  
  // Text animation creators
  createFontSizeAnimation: (elementId: string, duration: string, fromSize?: number, toSize?: number) => void;
  createTextPositionAnimation: (elementId: string, duration: string, fromX?: number, fromY?: number, toX?: number, toY?: number) => void;
  createFontWeightAnimation: (elementId: string, duration: string, fromWeight?: string, toWeight?: string) => void;
  createLetterSpacingAnimation: (elementId: string, duration: string, fromSpacing?: number, toSpacing?: number) => void;
}

export const createAnimationActions = (set: any, get: any): AnimationActions => ({
  // Animation CRUD operations
  addAnimation: (animationData: any) => {
    const state = get();
    state.pushToHistory();
    
    const animation = {
      ...animationData,
      id: generateId(),
    };
    
    set((state: any) => {
      // Remove existing animations of the same type on the same element to prevent duplicates
      const filteredAnimations = state.animations.filter((existingAnim: any) => {
        const sameElement = existingAnim.targetElementId === animation.targetElementId;
        const sameType = existingAnim.type === animation.type;
        const sameAttribute = existingAnim.attributeName === animation.attributeName;
        const sameTransformType = animation.type === 'animateTransform' ? 
          existingAnim.transformType === animation.transformType : true;
        
        // Remove if it's the same element, type, attribute, and transform type (for animateTransform)
        return !(sameElement && sameType && sameAttribute && sameTransformType);
      });
      
      return {
        animations: [...filteredAnimations, animation],
      };
    });
    
    // Return the new animation ID
    return animation.id;
  },

  updateAnimation: (animationId: string, updates: any) => {
    const state = get();
    state.pushToHistory();
    
    set((state: any) => ({
      animations: state.animations.map((animation: any) =>
        animation.id === animationId
          ? { ...animation, ...updates }
          : animation
      ),
    }));
  },

  removeAnimation: (animationId: string) => {
    const state = get();
    state.pushToHistory();
    
    set((state: any) => ({
      animations: state.animations.filter((animation: any) => animation.id !== animationId),
      selection: {
        ...state.selection,
        selectedAnimations: state.selection.selectedAnimations.filter((id: string) => id !== animationId),
      },
    }));
  },

  duplicateAnimation: (animationId: string) => {
    const state = get();
    state.pushToHistory();
    
    const animation = state.animations.find((a: any) => a.id === animationId);
    
    if (animation) {
      const duplicatedAnimation = {
        ...animation,
        id: generateId(),
      };
      
      set((state: any) => ({
        animations: [...state.animations, duplicatedAnimation],
      }));
    }
  },

  // Animation playback control
  playAnimations: () => {
    const state = get();
    const currentTime = Date.now();
    
    // Check if we're resuming from a pause (chain delays exist and we have a current time)
    const isResuming = state.animationState.chainDelays && 
                      state.animationState.chainDelays.size > 0 && 
                      !state.animationState.isPlaying;
    
    if (!isResuming) {
      // Fresh start - clear any existing chain delays and recalculate
      set((state: any) => ({
        animationState: {
          ...state.animationState,
          chainDelays: new Map(),
          restartKey: (state.animationState.restartKey || 0) + 1, // Increment restart key to force re-render
        },
      }));
      
      // Calculate chain delays using the helper function
      const calculateChainDelays = get().calculateChainDelays;
      const processedAnimations = calculateChainDelays();
      
      // Calculate total duration to set up auto-reset
      const totalDuration = get().getTotalAnimationDuration();
      
      set((state: any) => ({
        animationState: {
          ...state.animationState,
          isPlaying: true,
          startTime: currentTime,
          chainDelays: processedAnimations, // Store calculated delays
          duration: totalDuration,
          manualStop: false, // Clear manual stop flag when starting
          autoResetTimerId: null, // Clear any existing timer ID
        },
      }));
      
      // Set up auto-reset timer for when animations finish naturally
      // Wait a small amount to ensure animations have actually started
      if (totalDuration > 0) {
        setTimeout(() => {
          const currentState = get();
          // Only set the timer if we're still playing and haven't been manually stopped
          if (currentState.animationState.isPlaying && !currentState.animationState.manualStop) {
            const timerId = setTimeout(() => {
              const latestState = get();
              // Only reset if animations are still playing and haven't been manually stopped
              if (latestState.animationState.isPlaying && !latestState.animationState.manualStop) {
                get().resetAnimationsAfterCompletion();
              }
            }, (totalDuration + 0.1) * 1000); // Add small buffer
            
            // Store timer ID to be able to cancel it later
            set((state: any) => ({
              animationState: {
                ...state.animationState,
                autoResetTimerId: timerId,
              },
            }));
          }
        }, 50); // Wait 50ms before setting up the reset timer
      }
    } else {
      // Resuming from pause - adjust timing to continue from where we paused
      const pausedAtSeconds = state.animationState.currentTime; // Time where we paused
      const adjustedStartTime = currentTime - (pausedAtSeconds * 1000); // Adjust start time to account for elapsed time
      
      // Calculate remaining duration for auto-reset
      const totalDuration = state.animationState.duration || get().getTotalAnimationDuration();
      const remainingDuration = Math.max(0, totalDuration - pausedAtSeconds);
      
      set((state: any) => ({
        animationState: {
          ...state.animationState,
          isPlaying: true,
          startTime: adjustedStartTime, // This allows animations to continue from correct time
          manualStop: false, // Clear manual stop flag when resuming
          // DON'T increment restartKey on resume - keep same animation instances to maintain state
        },
      }));
      
      // Set up auto-reset timer for remaining duration
      // Wait a small amount to ensure animations have actually resumed
      if (remainingDuration > 0) {
        setTimeout(() => {
          const currentState = get();
          // Only set the timer if we're still playing and haven't been manually stopped
          if (currentState.animationState.isPlaying && !currentState.animationState.manualStop) {
            const timerId = setTimeout(() => {
              const latestState = get();
              // Only reset if animations are still playing and haven't been manually stopped
              if (latestState.animationState.isPlaying && !latestState.animationState.manualStop) {
                get().resetAnimationsAfterCompletion();
              }
            }, (remainingDuration + 0.1) * 1000); // Add small buffer
            
            // Store timer ID to be able to cancel it later
            set((state: any) => ({
              animationState: {
                ...state.animationState,
                autoResetTimerId: timerId,
              },
            }));
          }
        }, 50); // Wait 50ms before setting up the reset timer
      }
    }
  },

  pauseAnimations: () => {
    const state = get();
    const currentTime = Date.now();
    
    // Cancel auto-reset timer when pausing
    if (state.animationState.autoResetTimerId) {
      clearTimeout(state.animationState.autoResetTimerId);
    }
    
    // Calculate how much time has elapsed since animations started
    let elapsedSeconds = 0;
    if (state.animationState.startTime) {
      elapsedSeconds = (currentTime - state.animationState.startTime) / 1000;
    }
    
    set((state: any) => ({
      animationState: {
        ...state.animationState,
        isPlaying: false,
        currentTime: elapsedSeconds, // Capture current playback position
        autoResetTimerId: null, // Clear timer ID
        // DON'T clear chain delays when pausing - keep them for resume
        // DON'T increment restartKey when pausing - keep same animation instances
        // DON'T clear startTime when pausing - we need it for resume calculations
      },
    }));
  },

  stopAnimations: () => {
    // Get current state before making changes
    const currentState = get();
    
    // Cancel auto-reset timer when stopping manually
    if (currentState.animationState.autoResetTimerId) {
      clearTimeout(currentState.animationState.autoResetTimerId);
    }
    
    // Reset all animated elements to their initial state
    const resetAnimatedElements = () => {
      currentState.animations.forEach((animation: TypedSVGAnimation) => {
        try {
          const targetElement = elementRefManager.getElementById(animation.targetElementId);
          if (targetElement && hasAttributeName(animation)) {
            // Remove any animated attribute transformations
            if (animation.attributeName === 'transform') {
              elementRefManager.removeElementTransform(animation.targetElementId);
            } else if (animation.attributeName === 'opacity') {
              targetElement.removeAttribute('opacity');
            } else if (animation.attributeName) {
              // Remove other animated attributes (x, y, width, height, etc.)
              targetElement.removeAttribute(animation.attributeName);
            }
            
            // Reset style attributes if they were animated
            if (animation.attributeName && targetElement.style) {
              removeStyleProperty(targetElement, animation.attributeName);
            }
            
            // For animateTransform, ensure transform is completely reset
            if (animation.type === 'animateTransform') {
              targetElement.removeAttribute('transform');
              if (targetElement.style) {
                (targetElement.style as any).removeProperty('transform');
              }
            }
            
            // For filter-related animations, reset filter-related attributes
            if (animation.attributeName && animation.attributeName.includes('filter')) {
              targetElement.removeAttribute('filter');
              if (targetElement.style) {
                (targetElement.style as any).removeProperty('filter');
              }
            }
          }
        } catch (error) {
          console.warn(`Failed to reset element ${animation.targetElementId}:`, error);
        }
      });
    };
    
    // Reset elements after a short delay to ensure animations have stopped
    setTimeout(resetAnimatedElements, 100);
    
    set((state: any) => ({
      animationState: {
        ...state.animationState,
        isPlaying: false,
        currentTime: 0,
        startTime: null, // Reset start time for clean restart
        chainDelays: new Map(), // Clear chain delays when stopping
        restartKey: (state.animationState.restartKey || 0) + 1, // Force re-render to reset animations
        manualStop: true, // Flag to indicate this was a manual stop
        autoResetTimerId: null, // Clear timer ID
      },
    }));
  },

  // Function to reset animations when they finish naturally
  resetAnimationsAfterCompletion: () => {
    // Get current state before making changes
    const currentState = get();
    
    // Cancel any existing auto-reset timer
    if (currentState.animationState.autoResetTimerId) {
      clearTimeout(currentState.animationState.autoResetTimerId);
    }
    
    // Reset all animated elements to their initial state (same as stopAnimations)
    const resetAnimatedElements = () => {
      currentState.animations.forEach((animation: TypedSVGAnimation) => {
        try {
          const targetElement = elementRefManager.getElementById(animation.targetElementId);
          if (targetElement && hasAttributeName(animation)) {
            // Remove any animated attribute transformations
            if (animation.attributeName === 'transform') {
              elementRefManager.removeElementTransform(animation.targetElementId);
            } else if (animation.attributeName === 'opacity') {
              targetElement.removeAttribute('opacity');
            } else if (animation.attributeName) {
              // Remove other animated attributes (x, y, width, height, etc.)
              targetElement.removeAttribute(animation.attributeName);
            }
            
            // Reset style attributes if they were animated
            if (animation.attributeName && targetElement.style) {
              removeStyleProperty(targetElement, animation.attributeName);
            }
            
            // For animateTransform, ensure transform is completely reset
            if (animation.type === 'animateTransform') {
              targetElement.removeAttribute('transform');
              if (targetElement.style) {
                removeStyleProperty(targetElement, 'transform');
              }
            }
            
            // For filter-related animations, reset filter-related attributes
            if (animation.attributeName && animation.attributeName.includes('filter')) {
              targetElement.removeAttribute('filter');
              if (targetElement.style) {
                removeStyleProperty(targetElement, 'filter');
              }
            }
          }
        } catch (error) {
          console.warn(`Failed to reset element ${animation.targetElementId}:`, error);
        }
      });
    };
    
    // Stop all SVG animation elements first
    currentState.animations.forEach((animation: TypedSVGAnimation) => {
      try {
        const animationElement = document.querySelector(`[id*="${animation.id}"]`);
        if (isAnimationElement(animationElement)) {
          animationElement.endElement();
        }
      } catch (error) {
        // Ignore errors
      }
    });
    
    // Reset elements after a short delay to ensure animations have stopped
    setTimeout(resetAnimatedElements, 100);
    
    // Use the same mechanism as the timeline - set time to 0
    // This will trigger the same reset behavior that works for the timeline indicator
    get().setAnimationTime(0);
    
    // Reset animation state like stopAnimations does
    set((state: any) => ({
      animationState: {
        ...state.animationState,
        isPlaying: false,
        currentTime: 0, // Reset to beginning of timeline
        startTime: null,
        chainDelays: new Map(), // Clear chain delays to indicate full stop
        restartKey: (state.animationState.restartKey || 0) + 1, // Force re-render to reset animations
        autoResetTimerId: null, // Clear timer ID
      },
    }));
  },

  setCurrentTime: (time: number) => {
    set((state: any) => ({
      animationState: {
        ...state.animationState,
        currentTime: Math.max(0, Math.min(time, state.animationState.duration)),
      },
    }));
  },

  setAnimationTime: (time: number) => {
    set((state: any) => ({
      animationState: {
        ...state.animationState,
        currentTime: Math.max(0, time),
      },
    }));
  },

  setPlaybackRate: (rate: number) => {
    set((state: any) => ({
      animationState: {
        ...state.animationState,
        playbackRate: Math.max(0.1, Math.min(rate, 4.0)),
      },
    }));
  },

  toggleLoop: () => {
    set((state: any) => ({
      animationState: {
        ...state.animationState,
        loop: !state.animationState.loop,
      },
    }));
  },

  // Animation selection (prefix to avoid conflict with SelectionActions)
  selectAnimationById: (animationId: string) => {
    set((state: any) => ({
      selection: {
        ...state.selection,
        selectedAnimations: [animationId],
      },
    }));
  },

  selectMultipleAnimations: (animationIds: string[]) => {
    set((state: any) => ({
      selection: {
        ...state.selection,
        selectedAnimations: [...new Set([...state.selection.selectedAnimations, ...animationIds])],
      },
    }));
  },

  deselectAnimation: (animationId: string) => {
    set((state: any) => ({
      selection: {
        ...state.selection,
        selectedAnimations: state.selection.selectedAnimations.filter((id: string) => id !== animationId),
      },
    }));
  },

  deselectAllAnimations: () => {
    set((state: any) => ({
      selection: {
        ...state.selection,
        selectedAnimations: [],
      },
    }));
  },

  // Utility functions
  getAnimationsForElement: (elementId: string) => {
    const state = get();
    return state.animations.filter((animation: any) => animation.targetElementId === elementId);
  },

  getTotalAnimationDuration: () => {
    const state = get();
    if (state.animations.length === 0) return 0;
    
    // Calculate delays from chains
    const chainDelays = get().calculateChainDelays();
    
    let maxEndTime = 0;
    
    state.animations.forEach((animation: any) => {
      // Parse animation duration
      const durMatch = (animation.dur || '2s').match(/^(\d+(?:\.\d+)?)(s|ms)?$/);
      if (!durMatch) return;
      
      const value = parseFloat(durMatch[1]);
      const unit = durMatch[2] || 's';
      const durationInSeconds = unit === 'ms' ? value / 1000 : value;
      
      // Get delay from chain (convert from ms to seconds)
      const delayInSeconds = (chainDelays.get(animation.id) || 0) / 1000;
      
      // Calculate when this animation ends
      const endTime = delayInSeconds + durationInSeconds;
      
      maxEndTime = Math.max(maxEndTime, endTime);
    });
    
    return maxEndTime;
  },

  // Calculate chain delays for export (without starting playback)
  calculateChainDelays: () => {
    const state = get();
    const processedAnimations = new Map<string, number>(); // animationId -> begin time in ms
    
    state.animationSync.chains.forEach((chain: any) => {
      // Sort animations by their dependencies to ensure proper processing order
      const sortedAnimations = [...chain.animations].sort((a, b) => {
        if (a.dependsOn && !b.dependsOn) return 1;
        if (!a.dependsOn && b.dependsOn) return -1;
        return 0;
      });
      
      sortedAnimations.forEach((chainAnim: any, index: number) => {
        let beginTime = 0;
        
        if (chainAnim.dependsOn) {
          // If this animation depends on another, calculate when it should start
          const dependencyDelay = processedAnimations.get(chainAnim.dependsOn) || 0;
          const dependencyAnimation = state.animations.find((a: any) => a.id === chainAnim.dependsOn);
          if (dependencyAnimation) {
            // Parse duration more robustly
            const durValue = dependencyAnimation.dur || '2s';
            const durMatch = durValue.match(/^(\d+(?:\.\d+)?)(s|ms)?$/i);
            const durNumber = durMatch ? parseFloat(durMatch[1]) : 2;
            const durUnit = durMatch ? (durMatch[2] || 's').toLowerCase() : 's';
            const dependencyDuration = (durUnit === 'ms' ? durNumber : durNumber * 1000);
            
            // Calculate begin time based on trigger type
            switch (chainAnim.trigger) {
              case 'end':
                beginTime = dependencyDelay + dependencyDuration;
                break;
              case 'start':
              default:
                beginTime = dependencyDelay;
                break;
            }
            
            // Add any additional delay specified in the chain
            beginTime += (chainAnim.delay || 0) * 1000;
          }
        } else {
          // For auto-generated chains without dependencies, delay is absolute time from start
          beginTime = (chainAnim.delay || 0) * 1000;
        }
        
        processedAnimations.set(chainAnim.animationId, beginTime);
      });
    });
    
    return processedAnimations;
  },

  // Quick animation creators
  createFadeAnimation: (elementId: string, duration: string, fromOpacity = '1', toOpacity = '0') => {
    const addAnimation = get().addAnimation;
    addAnimation({
      type: 'animate',
      targetElementId: elementId,
      attributeName: 'opacity',
      from: fromOpacity,
      to: toOpacity,
      dur: duration,
      fill: 'freeze',
    });
  },

  createRotateAnimation: (elementId: string, duration: string, degrees: string) => {
    const addAnimation = get().addAnimation;
    addAnimation({
      type: 'animateTransform',
      targetElementId: elementId,
      attributeName: 'transform',
      transformType: 'rotate',
      from: '0',
      to: degrees,
      dur: duration,
      fill: 'freeze',
    });
  },

  createScaleAnimation: (elementId: string, duration: string, fromScale = '1', toScale = '1.5') => {
    const addAnimation = get().addAnimation;
    addAnimation({
      type: 'animateTransform',
      targetElementId: elementId,
      attributeName: 'transform',
      transformType: 'scale',
      from: fromScale,
      to: toScale,
      dur: duration,
      fill: 'freeze',
    });
  },

  createMoveAnimation: (elementId: string, duration: string, fromX: number, fromY: number, toX: number, toY: number) => {
    const addAnimation = get().addAnimation;
    addAnimation({
      type: 'animateTransform',
      targetElementId: elementId,
      attributeName: 'transform',
      transformType: 'translate',
      from: `${fromX} ${fromY}`,
      to: `${toX} ${toY}`,
      dur: duration,
      fill: 'freeze',
    });
  },
  
  // Filter animation creators
  createFilterBlurAnimation: (elementId: string, duration: string, fromStdDev = 0, toStdDev = 5) => {
    const { texts, addFilter, updateTextStyle, updatePathStyle } = get();
    const addAnimation = get().addAnimation;
    
    // Check if the target is a text element
    const isTextElement = texts.some((text: any) => text.id === elementId);
    
    if (isTextElement) {
      // For text elements, create a filter and apply it to the text
      const primitiveId = `blur-primitive-${elementId}`;
      
      // Create the blur filter (addFilter will generate the ID)
      const blurFilter = {
        primitives: [{
          id: primitiveId,
          type: 'feGaussianBlur' as const,
          stdDeviation: fromStdDev,
          in: 'SourceGraphic',
          result: 'blur'
        }]
      };
      
      // Add the filter to the editor and get the generated ID
      const state = get();
      addFilter(blurFilter);
      
      // Get the newly created filter (it will be the last one added)
      const newState = get();
      const newFilter = newState.filters[newState.filters.length - 1];
      const filterId = newFilter.id;
      
      // Apply the filter to the text element
      updateTextStyle(elementId, {
        filter: `url(#${filterId})`
      });
      
      // Create animation for the filter primitive
      addAnimation({
        type: 'animate',
        targetElementId: primitiveId,
        attributeName: 'stdDeviation',
        from: fromStdDev.toString(),
        to: toStdDev.toString(),
        dur: duration,
        fill: 'freeze',
      });
    } else {
      // For non-text elements (filter primitives), animate directly
      addAnimation({
        type: 'animate',
        targetElementId: elementId,
        attributeName: 'stdDeviation',
        from: fromStdDev.toString(),
        to: toStdDev.toString(),
        dur: duration,
        fill: 'freeze',
      });
    }
  },
  
  createFilterOffsetAnimation: (elementId: string, duration: string, fromDx = 0, fromDy = 0, toDx = 10, toDy = 10) => {
    const { texts, addFilter, updateTextStyle } = get();
    const addAnimation = get().addAnimation;
    
    // Check if the target is a text element
    const isTextElement = texts.some((text: any) => text.id === elementId);
    
    if (isTextElement) {
      // For text elements, create a filter and apply it to the text
      const primitiveId = `offset-primitive-${elementId}`;
      
      // Create the offset filter (addFilter will generate the ID)
      const offsetFilter = {
        primitives: [{
          id: primitiveId,
          type: 'feOffset' as const,
          dx: fromDx,
          dy: fromDy,
          in: 'SourceGraphic',
          result: 'offset'
        }]
      };
      
      // Add the filter to the editor and get the generated ID
      addFilter(offsetFilter);
      
      // Get the newly created filter (it will be the last one added)
      const newState = get();
      const newFilter = newState.filters[newState.filters.length - 1];
      const filterId = newFilter.id;
      
      // Apply the filter to the text element
      updateTextStyle(elementId, {
        filter: `url(#${filterId})`
      });
      
      // Create animations for the filter primitive
      addAnimation({
        type: 'animate',
        targetElementId: primitiveId,
        attributeName: 'dx',
        from: fromDx.toString(),
        to: toDx.toString(),
        dur: duration,
        fill: 'freeze',
      });
      addAnimation({
        type: 'animate',
        targetElementId: primitiveId,
        attributeName: 'dy',
        from: fromDy.toString(),
        to: toDy.toString(),
        dur: duration,
        fill: 'freeze',
      });
    } else {
      // For non-text elements (filter primitives), animate directly
      addAnimation({
        type: 'animate',
        targetElementId: elementId,
        attributeName: 'dx',
        from: fromDx.toString(),
        to: toDx.toString(),
        dur: duration,
        fill: 'freeze',
      });
      addAnimation({
        type: 'animate',
        targetElementId: elementId,
        attributeName: 'dy',
        from: fromDy.toString(),
        to: toDy.toString(),
        dur: duration,
        fill: 'freeze',
      });
    }
  },
  
  createFilterColorMatrixAnimation: (elementId: string, duration: string, fromValues = '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0', toValues = '0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0') => {
    const { texts, addFilter, updateTextStyle } = get();
    const addAnimation = get().addAnimation;
    
    // Check if the target is a text element
    const isTextElement = texts.some((text: any) => text.id === elementId);
    
    if (isTextElement) {
      // For text elements, create a filter and apply it to the text
      const primitiveId = `colorMatrix-primitive-${elementId}`;
      
      // Create the colorMatrix filter (addFilter will generate the ID)
      const colorMatrixFilter = {
        primitives: [{
          id: primitiveId,
          type: 'feColorMatrix' as const,
          values: fromValues,
          in: 'SourceGraphic',
          result: 'colorMatrix'
        }]
      };
      
      // Add the filter to the editor and get the generated ID
      addFilter(colorMatrixFilter);
      
      // Get the newly created filter (it will be the last one added)
      const newState = get();
      const newFilter = newState.filters[newState.filters.length - 1];
      const filterId = newFilter.id;
      
      // Apply the filter to the text element
      updateTextStyle(elementId, {
        filter: `url(#${filterId})`
      });
      
      // Create animation for the filter primitive
      addAnimation({
        type: 'animate',
        targetElementId: primitiveId,
        attributeName: 'values',
        from: fromValues,
        to: toValues,
        dur: duration,
        fill: 'freeze',
      });
    } else {
      // For non-text elements (filter primitives), animate directly
      addAnimation({
        type: 'animate',
        targetElementId: elementId,
        attributeName: 'values',
        from: fromValues,
        to: toValues,
        dur: duration,
        fill: 'freeze',
      });
    }
  },
  
  createFilterFloodAnimation: (elementId: string, duration: string, fromColor = '#ff0000', toColor = '#0000ff') => {
    const { texts, addFilter, updateTextStyle } = get();
    const addAnimation = get().addAnimation;
    
    // Check if the target is a text element
    const isTextElement = texts.some((text: any) => text.id === elementId);
    
    if (isTextElement) {
      // For text elements, create a filter and apply it to the text
      const primitiveId = `flood-primitive-${elementId}`;
      
      // Create the flood filter (addFilter will generate the ID)
      const floodFilter = {
        primitives: [{
          id: primitiveId,
          type: 'feFlood' as const,
          floodColor: fromColor,
          in: 'SourceGraphic',
          result: 'flood'
        }]
      };
      
      // Add the filter to the editor and get the generated ID
      addFilter(floodFilter);
      
      // Get the newly created filter (it will be the last one added)
      const newState = get();
      const newFilter = newState.filters[newState.filters.length - 1];
      const filterId = newFilter.id;
      
      // Apply the filter to the text element
      updateTextStyle(elementId, {
        filter: `url(#${filterId})`
      });
      
      // Create animation for the filter primitive
      addAnimation({
        type: 'animate',
        targetElementId: primitiveId,
        attributeName: 'flood-color',
        from: fromColor,
        to: toColor,
        dur: duration,
        fill: 'freeze',
      });
    } else {
      // For non-text elements (filter primitives), animate directly
      addAnimation({
        type: 'animate',
        targetElementId: elementId,
        attributeName: 'flood-color',
        from: fromColor,
        to: toColor,
        dur: duration,
        fill: 'freeze',
      });
    }
  },
  
  // Set animation creator
  createSetAnimation: (elementId: string, attributeName: string, toValue: string, beginTime = '0s') => {
    const addAnimation = get().addAnimation;
    addAnimation({
      type: 'set',
      targetElementId: elementId,
      attributeName,
      to: toValue,
      begin: beginTime,
      fill: 'freeze',
    });
  },
  
  // ViewBox animation creator (deprecated - poor browser support)
  createViewBoxAnimation: (duration: string, fromViewBox = '0 0 100 100', toViewBox = '0 0 200 200') => {
    const addAnimation = get().addAnimation;
    addAnimation({
      type: 'animate',
      targetElementId: 'svg-root', // Special target for SVG root
      attributeName: 'viewBox',
      from: fromViewBox,
      to: toViewBox,
      dur: duration,
      fill: 'freeze',
    });
  },
  
  // Gradient animation creators
  createGradientStopAnimation: (stopId: string, duration: string, fromColor = '#ff0000', toColor = '#0000ff') => {
    const addAnimation = get().addAnimation;
    addAnimation({
      type: 'animate',
      targetElementId: stopId,
      attributeName: 'stop-color',
      from: fromColor,
      to: toColor,
      dur: duration,
      fill: 'freeze',
    });
  },
  
  createGradientPositionAnimation: (gradientId: string, duration: string, attribute: string, fromValue: string, toValue: string) => {
    const addAnimation = get().addAnimation;
    addAnimation({
      type: 'animate',
      targetElementId: gradientId,
      attributeName: attribute,
      from: fromValue,
      to: toValue,
      dur: duration,
      fill: 'freeze',
    });
  },
  
  // Enhanced gradient and pattern animations
  createLinearGradientAnimation: (gradientId: string, duration: string, fromX1 = 0, fromY1 = 0, fromX2 = 100, fromY2 = 0, toX1 = 100, toY1 = 100, toX2 = 0, toY2 = 100) => {
    const addAnimation = get().addAnimation;
    // Animate all gradient coordinates
    ['x1', 'y1', 'x2', 'y2'].forEach((attr, index) => {
      const fromValues = [fromX1, fromY1, fromX2, fromY2];
      const toValues = [toX1, toY1, toX2, toY2];
      
      addAnimation({
        type: 'animate',
        targetElementId: gradientId,
        attributeName: attr,
        from: `${fromValues[index]}%`,
        to: `${toValues[index]}%`,
        dur: duration,
        fill: 'freeze',
      });
    });
  },
  
  createRadialGradientAnimation: (gradientId: string, duration: string, fromCx = 50, fromCy = 50, fromR = 25, toCx = 25, toCy = 25, toR = 75) => {
    const addAnimation = get().addAnimation;
    // Animate radial gradient properties
    const props = [{ attr: 'cx', from: fromCx, to: toCx }, { attr: 'cy', from: fromCy, to: toCy }, { attr: 'r', from: fromR, to: toR }];
    
    props.forEach(({ attr, from, to }) => {
      addAnimation({
        type: 'animate',
        targetElementId: gradientId,
        attributeName: attr,
        from: `${from}%`,
        to: `${to}%`,
        dur: duration,
        fill: 'freeze',
      });
    });
  },
  
  createGradientStopOffsetAnimation: (stopId: string, duration: string, fromOffset = 0, toOffset = 100) => {
    const addAnimation = get().addAnimation;
    addAnimation({
      type: 'animate',
      targetElementId: stopId,
      attributeName: 'offset',
      from: `${fromOffset}%`,
      to: `${toOffset}%`,
      dur: duration,
      fill: 'freeze',
    });
  },
  
  createPatternAnimation: (patternId: string, duration: string, fromWidth = 10, fromHeight = 10, toWidth = 50, toHeight = 50) => {
    const addAnimation = get().addAnimation;
    // Animate pattern size
    ['width', 'height'].forEach((attr, index) => {
      const fromValues = [fromWidth, fromHeight];
      const toValues = [toWidth, toHeight];
      
      addAnimation({
        type: 'animate',
        targetElementId: patternId,
        attributeName: attr,
        from: fromValues[index].toString(),
        to: toValues[index].toString(),
        dur: duration,
        fill: 'freeze',
      });
    });
  },
  
  createPatternTransformAnimation: (patternId: string, duration: string, fromTransform = 'rotate(0)', toTransform = 'rotate(360)') => {
    const addAnimation = get().addAnimation;
    addAnimation({
      type: 'animateTransform',
      targetElementId: patternId,
      attributeName: 'patternTransform',
      transformType: 'rotate',
      from: '0',
      to: '360',
      dur: duration,
      fill: 'freeze',
    });
  },
  
  // Synchronized animation support
  createAnimationChain: (name: string, animations: { animationId: string; delay?: number; trigger?: 'start' | 'end' | 'repeat'; dependsOn?: string }[]) => {
    const chainId = generateId();
    set((state: any) => ({
      animationSync: {
        ...state.animationSync,
        chains: [...state.animationSync.chains, {
          id: chainId,
          name,
          animations,
        }],
      },
    }));
  },
  
  removeAnimationChain: (chainId: string) => {
    set((state: any) => ({
      animationSync: {
        ...state.animationSync,
        chains: state.animationSync.chains.filter((chain: any) => chain.id !== chainId),
      },
    }));
  },
  
  updateAnimationChain: (chainId: string, updates: { name?: string; animations?: { animationId: string; delay?: number; trigger?: 'start' | 'end' | 'repeat'; dependsOn?: string }[] }) => {
    set((state: any) => ({
      animationSync: {
        ...state.animationSync,
        chains: state.animationSync.chains.map((chain: any) => 
          chain.id === chainId ? { ...chain, ...updates } : chain
        ),
      },
    }));
  },
  
  updateChainAnimationDelay: (chainId: string, animationId: string, newDelay: number) => {
    set((state: any) => ({
      animationSync: {
        ...state.animationSync,
        chains: state.animationSync.chains.map((chain: any) => {
          if (chain.id !== chainId) return chain;
          
          return {
            ...chain,
            animations: chain.animations.map((chainAnim: any) => 
              chainAnim.animationId === animationId 
                ? { ...chainAnim, delay: newDelay }
                : chainAnim
            )
          };
        }),
      },
    }));
  },
  
  updateChainAnimationTrigger: (chainId: string, animationId: string, newTrigger: 'start' | 'end' | 'repeat') => {
    set((state: any) => ({
      animationSync: {
        ...state.animationSync,
        chains: state.animationSync.chains.map((chain: any) => {
          if (chain.id !== chainId) return chain;
          
          return {
            ...chain,
            animations: chain.animations.map((chainAnim: any) => 
              chainAnim.animationId === animationId 
                ? { ...chainAnim, trigger: newTrigger }
                : chainAnim
            )
          };
        }),
      },
    }));
  },
  
  addAnimationEvent: (event: AnimationEvent) => {
    set((state: any) => ({
      animationSync: {
        ...state.animationSync,
        events: [...state.animationSync.events, event],
      },
    }));
  },
  
  processAnimationEvents: () => {
    const state = get();
    const unhandledEvents = state.animationSync.events.filter((event: any) => !event.handled);
    
    // Process each unhandled event
    unhandledEvents.forEach((event: any) => {
      // Mark event as handled
      set((state: any) => ({
        animationSync: {
          ...state.animationSync,
          events: state.animationSync.events.map((e: any) => 
            e.id === event.id ? { ...e, handled: true } : e
          ),
        },
      }));
    });
  },
  
  // mpath support for animateMotion
  createAnimateMotionWithMPath: (elementId: string, pathElementId: string, duration: string, rotate = 'auto') => {
    const addAnimation = get().addAnimation;
    addAnimation({
      type: 'animateMotion',
      targetElementId: elementId,
      mpath: pathElementId,
      dur: duration,
      rotate,
      fill: 'freeze',
    });
  },
  
  updateAnimationMPath: (animationId: string, pathElementId: string) => {
    const updateAnimation = get().updateAnimation;
    updateAnimation(animationId, {
      mpath: pathElementId,
      path: undefined, // Clear direct path data when using mpath
    });
  },
  
  // Geometric animation creators
  createPositionAnimation: (elementId: string, duration: string, fromX = 0, fromY = 0, toX = 100, toY = 100) => {
    const addAnimation = get().addAnimation;
    // Create X animation
    addAnimation({
      type: 'animate',
      targetElementId: elementId,
      attributeName: 'x',
      from: fromX.toString(),
      to: toX.toString(),
      dur: duration,
      fill: 'freeze',
    });
    // Create Y animation
    addAnimation({
      type: 'animate',
      targetElementId: elementId,
      attributeName: 'y',
      from: fromY.toString(),
      to: toY.toString(),
      dur: duration,
      fill: 'freeze',
    });
  },
  
  createSizeAnimation: (elementId: string, duration: string, fromWidth = 50, fromHeight = 50, toWidth = 100, toHeight = 100) => {
    const addAnimation = get().addAnimation;
    // Create width animation
    addAnimation({
      type: 'animate',
      targetElementId: elementId,
      attributeName: 'width',
      from: fromWidth.toString(),
      to: toWidth.toString(),
      dur: duration,
      fill: 'freeze',
    });
    // Create height animation
    addAnimation({
      type: 'animate',
      targetElementId: elementId,
      attributeName: 'height',
      from: fromHeight.toString(),
      to: toHeight.toString(),
      dur: duration,
      fill: 'freeze',
    });
  },
  
  createCircleAnimation: (elementId: string, duration: string, fromRadius = 10, toRadius = 50) => {
    const addAnimation = get().addAnimation;
    addAnimation({
      type: 'animate',
      targetElementId: elementId,
      attributeName: 'r',
      from: fromRadius.toString(),
      to: toRadius.toString(),
      dur: duration,
      fill: 'freeze',
    });
  },
  
  createPathDataAnimation: (elementId: string, duration: string, fromPath: string, toPath: string) => {
    const addAnimation = get().addAnimation;
    addAnimation({
      type: 'animate',
      targetElementId: elementId,
      attributeName: 'd',
      from: fromPath,
      to: toPath,
      dur: duration,
      fill: 'freeze',
    });
  },
  
  createLineAnimation: (elementId: string, duration: string, fromX1 = 0, fromY1 = 0, fromX2 = 50, fromY2 = 50, toX1 = 100, toY1 = 100, toX2 = 150, toY2 = 150) => {
    const addAnimation = get().addAnimation;
    // Create animations for all line coordinates
    ['x1', 'y1', 'x2', 'y2'].forEach((attr, index) => {
      const fromValues = [fromX1, fromY1, fromX2, fromY2];
      const toValues = [toX1, toY1, toX2, toY2];
      
      addAnimation({
        type: 'animate',
        targetElementId: elementId,
        attributeName: attr,
        from: fromValues[index].toString(),
        to: toValues[index].toString(),
        dur: duration,
        fill: 'freeze',
      });
    });
  },
  
  // Text animation creators
  createFontSizeAnimation: (elementId: string, duration: string, fromSize = 16, toSize = 32) => {
    const addAnimation = get().addAnimation;
    addAnimation({
      type: 'animate',
      targetElementId: elementId,
      attributeName: 'font-size',
      from: fromSize.toString(),
      to: toSize.toString(),
      dur: duration,
      fill: 'freeze',
    });
  },
  
  createTextPositionAnimation: (elementId: string, duration: string, fromX = 0, fromY = 0, toX = 100, toY = 100) => {
    const addAnimation = get().addAnimation;
    // Create X animation
    addAnimation({
      type: 'animate',
      targetElementId: elementId,
      attributeName: 'x',
      from: fromX.toString(),
      to: toX.toString(),
      dur: duration,
      fill: 'freeze',
    });
    // Create Y animation
    addAnimation({
      type: 'animate',
      targetElementId: elementId,
      attributeName: 'y',
      from: fromY.toString(),
      to: toY.toString(),
      dur: duration,
      fill: 'freeze',
    });
  },
  
  createFontWeightAnimation: (elementId: string, duration: string, fromWeight = 'normal', toWeight = 'bold') => {
    const addAnimation = get().addAnimation;
    addAnimation({
      type: 'animate',
      targetElementId: elementId,
      attributeName: 'font-weight',
      from: fromWeight,
      to: toWeight,
      dur: duration,
      fill: 'freeze',
    });
  },
  
  createLetterSpacingAnimation: (elementId: string, duration: string, fromSpacing = 0, toSpacing = 5) => {
    const addAnimation = get().addAnimation;
    addAnimation({
      type: 'animate',
      targetElementId: elementId,
      attributeName: 'letter-spacing',
      from: `${fromSpacing}px`,
      to: `${toSpacing}px`,
      dur: duration,
      fill: 'freeze',
    });
  },
});