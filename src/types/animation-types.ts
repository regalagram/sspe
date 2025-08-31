/**
 * Enhanced type definitions for animations and related operations
 * 
 * This file provides strict typing to replace `any` usages in animation-related code
 */

import { SVGAnimate, SVGAnimateMotion, SVGAnimateTransform, SVGSet } from '../types';

/**
 * Union type for all SVG animations
 */
export type SVGAnimation = SVGAnimate | SVGAnimateMotion | SVGAnimateTransform | SVGSet;

/**
 * Enhanced animation interface with required targetElementId
 */
export type TypedSVGAnimation = SVGAnimation & {
  targetElementId: string;
};

/**
 * Type guard for animations with attributeName
 */
export function hasAttributeName(
  animation: SVGAnimation
): animation is (SVGAnimate | SVGAnimateTransform | SVGSet) {
  return 'attributeName' in animation;
}

/**
 * Type guard for motion animations
 */
export function isMotionAnimation(
  animation: SVGAnimation
): animation is SVGAnimateMotion {
  return animation.type === 'animateMotion';
}

/**
 * Animation element with DOM methods
 */
export interface AnimationDOMElement extends SVGAnimationElement {
  endElement(): void;
  beginElement(): void;
}

/**
 * Style property removal utility
 */
export interface TypedCSSStyleDeclaration extends CSSStyleDeclaration {
  removeProperty(property: string): string;
}

/**
 * Type-safe style property removal
 */
export function removeStyleProperty(
  element: Element, 
  property: string
): void {
  if (element instanceof HTMLElement || element instanceof SVGElement) {
    const style = element.style as TypedCSSStyleDeclaration;
    style.removeProperty(property);
  }
}

/**
 * Type guard for animation DOM elements
 */
export function isAnimationElement(
  element: Element | null
): element is AnimationDOMElement {
  return element instanceof SVGAnimationElement && 
         typeof (element as any).endElement === 'function';
}

/**
 * Type-safe animation state management
 */
export interface AnimationState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  autoResetTimerId?: number;
}

/**
 * Animation chain configuration
 */
export interface AnimationChain {
  animations: TypedSVGAnimation[];
  delay: number;
  totalDuration: number;
}

/**
 * Animation timeline entry with calculated delays
 */
export interface AnimationTimelineEntry {
  animation: TypedSVGAnimation;
  startDelay: number;
  endTime: number;
  chainIndex: number;
}

/**
 * Animation format copy state
 */
export interface AnimationFormatCopyState {
  isActive: boolean;
  sourceAnimation: TypedSVGAnimation | null;
  copiedProperties: Partial<TypedSVGAnimation>;
}

// Type exports for better organization
export type {
  TypedSVGAnimation as EnhancedAnimation,
  AnimationDOMElement as DOMAnimationElement,
  TypedCSSStyleDeclaration as SafeCSSStyle
};
