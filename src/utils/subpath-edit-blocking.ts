/**
 * Subpath Edit Mode Event Blocking Utilities
 * 
 * Provides centralized logic for blocking interactions with elements
 * when in subpath-edit mode, while allowing only command/control points
 * and selection box functionality.
 */

import React from 'react';
import { useEditorStore } from '../store/editorStore';

interface BlockingContext {
  isDoubleClick?: boolean;
}

/**
 * Determines if an event should be blocked in subpath-edit mode
 * 
 * @param e - The pointer event to evaluate (DOM native or React synthetic)
 * @param context - Additional context (e.g., isDoubleClick)
 * @returns true if event should be blocked, false if it should be allowed
 */
export const isSubpathEditModeBlocked = (
  e: any, 
  context?: BlockingContext
): boolean => {
  const state = useEditorStore.getState();
  
  // Only block if we're in subpath-edit mode
  if (state.mode?.current !== 'subpath-edit') {
    return false;
  }
  
  const target = e.target as Element;
  
  // ✅ ALWAYS ALLOW: Command points and control points
  if (target.hasAttribute('data-command-id') || 
      target.hasAttribute('data-control-point') ||
      target.closest('[data-command-id]') ||
      target.closest('[data-control-point]')) {
    return false; // Don't block
  }
  
  // ✅ ALWAYS ALLOW: Selection box (SVG background without element data)
  if (target.tagName.toLowerCase() === 'svg' && 
      !target.hasAttribute('data-element-type') &&
      !target.closest('[data-element-type]')) {
    return false; // Don't block
  }
  
  // ✅ ALWAYS ALLOW: UI controls and toolbar elements
  if (target.closest('[data-zoom-control]') || 
      target.closest('[data-pan-control]') ||
      target.closest('.toolbar') ||
      target.closest('.sidebar') ||
      target.closest('[data-ui-element]')) {
    return false; // Don't block
  }
  
  // Helper function to safely prevent event propagation
  const preventEvent = () => {
    try {
      // Try preventDefault first (both native and synthetic have this)
      if (typeof e.preventDefault === 'function') {
        e.preventDefault();
      }
      
      // Try stopImmediatePropagation for native events
      if (typeof (e as any).stopImmediatePropagation === 'function') {
        (e as any).stopImmediatePropagation();
      }
      // Try stopPropagation as fallback for synthetic events
      else if (typeof e.stopPropagation === 'function') {
        e.stopPropagation();
      }
    } catch (error) {
      console.warn('[SubpathEdit] Failed to prevent event:', error);
    }
  };
  
  // ❌ SPECIAL BLOCKING: Double clicks on text elements (prevents text editing)
  if (context?.isDoubleClick) {
    const elementType = target.getAttribute('data-element-type');
    if (elementType === 'text' || 
        elementType === 'multiline-text' || 
        elementType === 'textPath') {
      preventEvent();
      return true; // Block this event
    }
  }
  
  // ❌ GENERAL BLOCKING: Any element with data-element-type
  const elementType = target.getAttribute('data-element-type');
  if (elementType) {
    preventEvent();
    return true; // Block this event
  }
  
  // Check if target is part of an element by traversing up
  const elementParent = target.closest('[data-element-type]');
  if (elementParent) {
    const parentElementType = elementParent.getAttribute('data-element-type');
    preventEvent();
    return true; // Block this event
  }
  
  // ✅ DEFAULT: Allow everything else
  return false;
};

/**
 * Utility to check if we're currently in subpath-edit mode
 */
export const isInSubpathEditMode = (): boolean => {
  const state = useEditorStore.getState();
  return state.mode?.current === 'subpath-edit';
};

/**
 * Debug utility to get information about what would be blocked
 */
export const getBlockingInfo = (target: Element): {
  wouldBlock: boolean;
  reason: string;
  elementType: string | null;
} => {
  const state = useEditorStore.getState();
  
  if (state.mode?.current !== 'subpath-edit') {
    return {
      wouldBlock: false,
      reason: 'Not in subpath-edit mode',
      elementType: null
    };
  }
  
  // Check allowed elements
  if (target.hasAttribute('data-command-id') || 
      target.hasAttribute('data-control-point') ||
      target.closest('[data-command-id]') ||
      target.closest('[data-control-point]')) {
    return {
      wouldBlock: false,
      reason: 'Command/control point - allowed',
      elementType: null
    };
  }
  
  if (target.tagName.toLowerCase() === 'svg' && 
      !target.hasAttribute('data-element-type')) {
    return {
      wouldBlock: false,
      reason: 'SVG background - allowed for selection box',
      elementType: null
    };
  }
  
  if (target.closest('.toolbar') || target.closest('.sidebar')) {
    return {
      wouldBlock: false,
      reason: 'UI element - allowed',
      elementType: null
    };
  }
  
  // Check blocked elements
  const elementType = target.getAttribute('data-element-type') ||
                      target.closest('[data-element-type]')?.getAttribute('data-element-type');
                      
  if (elementType) {
    return {
      wouldBlock: true,
      reason: `Element type blocked: ${elementType}`,
      elementType
    };
  }
  
  return {
    wouldBlock: false,
    reason: 'No blocking rule applies',
    elementType: null
  };
};

// Make debug utilities available globally in development
if (process.env.NODE_ENV === 'development') {
  (window as any).subpathEditBlocking = {
    isInSubpathEditMode,
    getBlockingInfo,
    checkElement: (selector: string) => {
      const element = document.querySelector(selector);
      if (element) {
        return getBlockingInfo(element);
      }
      return { wouldBlock: false, reason: 'Element not found', elementType: null };
    }
  };
}