import { StateCreator } from 'zustand';
import { EditorState, SVGAnimation, SVGAnimate, SVGAnimateMotion, SVGAnimateTransform, AnimationState } from '../types';
import { generateId } from '../utils/id-utils';

export interface AnimationActions {
  // Animation CRUD operations
  addAnimation: (animation: any) => void;
  updateAnimation: (animationId: string, updates: Partial<SVGAnimation>) => void;
  removeAnimation: (animationId: string) => void;
  duplicateAnimation: (animationId: string) => void;
  
  // Animation playback control
  playAnimations: () => void;
  pauseAnimations: () => void;
  stopAnimations: () => void;
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
  
  // Quick animation creators
  createFadeAnimation: (elementId: string, duration: string, fromOpacity?: string, toOpacity?: string) => void;
  createRotateAnimation: (elementId: string, duration: string, degrees: string) => void;
  createScaleAnimation: (elementId: string, duration: string, fromScale?: string, toScale?: string) => void;
  createMoveAnimation: (elementId: string, duration: string, fromX: number, fromY: number, toX: number, toY: number) => void;
}

export const createAnimationActions = (set: any, get: any): AnimationActions => ({
  // Animation CRUD operations
  addAnimation: (animationData: any) => {
    const animation = {
      ...animationData,
      id: generateId(),
    };
    
    set((state: any) => ({
      animations: [...state.animations, animation],
    }));
  },

  updateAnimation: (animationId: string, updates: any) => {
    set((state: any) => ({
      animations: state.animations.map((animation: any) =>
        animation.id === animationId
          ? { ...animation, ...updates }
          : animation
      ),
    }));
  },

  removeAnimation: (animationId: string) => {
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
    set((state: any) => ({
      animationState: {
        ...state.animationState,
        isPlaying: true,
        startTime: Date.now(), // Record when playback started
      },
    }));
  },

  pauseAnimations: () => {
    set((state: any) => ({
      animationState: {
        ...state.animationState,
        isPlaying: false,
      },
    }));
  },

  stopAnimations: () => {
    set((state: any) => ({
      animationState: {
        ...state.animationState,
        isPlaying: false,
        currentTime: 0,
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
    
    const durations = state.animations.map((animation: any) => {
      const durMatch = animation.dur.match(/^(\d+(?:\.\d+)?)(s|ms)?$/);
      if (!durMatch) return 0;
      
      const value = parseFloat(durMatch[1]);
      const unit = durMatch[2] || 's';
      
      return unit === 'ms' ? value / 1000 : value;
    });
    
    return Math.max(...durations);
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
});