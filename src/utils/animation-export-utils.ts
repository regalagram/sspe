import { SVGAnimation, AnimationState, AnimationChain, AnimationEvent } from '../types';

export interface AnimationExportData {
  animations: SVGAnimation[];
  animationState: Omit<AnimationState, 'isPlaying' | 'currentTime' | 'startTime'> & {
    isPlaying: false;
    currentTime: 0;
    startTime: 0;
  };
  animationSync: {
    chains: AnimationChain[];
    events: AnimationEvent[];
  };
  exportTimestamp: number;
  version: string;
}

/**
 * Validates imported animation data structure
 */
export function validateAnimationImportData(data: any): {
  valid: boolean;
  error?: string;
  warnings?: string[];
} {
  const warnings: string[] = [];
  
  // Check if data is an object
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid animation data: not an object' };
  }
  
  // Check for required animations array
  if (!data.animations || !Array.isArray(data.animations)) {
    return { valid: false, error: 'Invalid animation data: missing or invalid animations array' };
  }
  
  // Validate each animation object
  for (let i = 0; i < data.animations.length; i++) {
    const animation = data.animations[i];
    if (!animation.id) {
      warnings.push(`Animation at index ${i} is missing ID`);
    }
    if (!animation.type) {
      warnings.push(`Animation at index ${i} is missing type`);
    }
    if (!animation.targetElementId) {
      warnings.push(`Animation at index ${i} is missing targetElementId`);
    }
  }
  
  // Check animation sync structure
  if (data.animationSync) {
    if (!Array.isArray(data.animationSync.chains)) {
      warnings.push('animationSync.chains is not an array, using empty array');
    }
    if (!Array.isArray(data.animationSync.events)) {
      warnings.push('animationSync.events is not an array, using empty array');
    }
  }
  
  // Check version compatibility
  if (data.version && data.version !== '1.0.0') {
    warnings.push(`Animation data version ${data.version} may not be fully compatible with current version 1.0.0`);
  }
  
  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Sanitizes and prepares animation data for import
 */
export function sanitizeAnimationImportData(data: any): {
  animations: SVGAnimation[];
  animationSync: {
    chains: AnimationChain[];
    events: AnimationEvent[];
  };
} {
  // Ensure animations array is valid
  const animations = Array.isArray(data.animations) ? data.animations : [];
  
  // Ensure animationSync structure
  const animationSync = {
    chains: Array.isArray(data.animationSync?.chains) ? data.animationSync.chains : [],
    events: Array.isArray(data.animationSync?.events) ? data.animationSync.events : []
  };
  
  return { animations, animationSync };
}

/**
 * Prepares animation data for export with proper serialization
 */
export function prepareAnimationExportData(
  animations: SVGAnimation[],
  animationState: AnimationState,
  animationSync: { chains: AnimationChain[]; events: AnimationEvent[] }
): AnimationExportData {
  return {
    animations: animations.map(animation => {
      // Ensure all required fields are present with proper typing
      const baseAnimation = {
        ...animation,
        id: animation.id || `animation-${Date.now()}-${Math.random()}`,
        dur: animation.dur || '2s'
      };
      
      // Return the animation with proper typing preserved
      return baseAnimation as SVGAnimation;
    }),
    animationState: {
      ...animationState,
      isPlaying: false,
      currentTime: 0,
      startTime: 0
    },
    animationSync: {
      chains: animationSync.chains || [],
      events: animationSync.events || []
    },
    exportTimestamp: Date.now(),
    version: '1.0.0'
  };
}

/**
 * Generates a summary of animation data for user confirmation
 */
export function generateAnimationSummary(data: AnimationExportData): string {
  const animationsCount = data.animations.length;
  const chainsCount = data.animationSync.chains.length;
  const eventsCount = data.animationSync.events.length;
  
  const animationTypes = data.animations.reduce((acc, animation) => {
    acc[animation.type] = (acc[animation.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  let summary = `${animationsCount} animation(s)`;
  
  if (Object.keys(animationTypes).length > 0) {
    const typesSummary = Object.entries(animationTypes)
      .map(([type, count]) => `${count} ${type}`)
      .join(', ');
    summary += ` (${typesSummary})`;
  }
  
  if (chainsCount > 0) {
    summary += `, ${chainsCount} animation chain(s)`;
  }
  
  if (eventsCount > 0) {
    summary += `, ${eventsCount} animation event(s)`;
  }
  
  return summary;
}