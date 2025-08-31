/**
 * ElementRefManager - React-compatible element reference management
 * 
 * Replaces direct DOM manipulation (getElementById) with ref-based access
 * that plays nicely with React's virtual DOM and provides type safety.
 */

import React, { RefObject } from 'react';

interface ElementRef {
  id: string;
  type: 'path' | 'text' | 'image' | 'use' | 'group' | 'clipPath' | 'mask' | 'filter' | 'marker' | 'symbol';
  ref: RefObject<SVGElement | null>;
  element?: SVGElement;
}

class ElementRefManager {
  private refs = new Map<string, ElementRef>();
  private elementCache = new Map<string, SVGElement>();
  
  /**
   * Register a React ref for an SVG element
   */
  registerRef(
    id: string, 
    type: ElementRef['type'], 
    ref: RefObject<SVGElement | null>
  ): void {
    this.refs.set(id, { id, type, ref });
    
    // Clear cache when ref changes
    this.elementCache.delete(id);
  }

  /**
   * Unregister a ref (for cleanup)
   */
  unregisterRef(id: string): void {
    this.refs.delete(id);
    this.elementCache.delete(id);
  }

  /**
   * Get element by ID using React refs (preferred method)
   */
  getElementByRef(id: string): SVGElement | null {
    const refEntry = this.refs.get(id);
    if (!refEntry?.ref.current) {
      return null;
    }
    
    return refEntry.ref.current;
  }

  /**
   * Get element by ID with fallback to DOM query (for migration period)
   * @deprecated Use getElementByRef instead
   */
  getElementById(id: string): SVGElement | null {
    // Try ref-based access first
    const refElement = this.getElementByRef(id);
    if (refElement) {
      return refElement;
    }

    // Check cache
    const cached = this.elementCache.get(id);
    if (cached && cached.parentNode) {
      return cached;
    }

    // Fallback to DOM query (will be removed after migration)
    const element = document.getElementById(id);
    if (element && element instanceof SVGElement) {
      this.elementCache.set(id, element);
      return element;
    }

    return null;
  }

  /**
   * Get all registered elements of a specific type
   */
  getElementsByType(type: ElementRef['type']): SVGElement[] {
    const elements: SVGElement[] = [];
    
    for (const refEntry of this.refs.values()) {
      if (refEntry.type === type && refEntry.ref.current) {
        elements.push(refEntry.ref.current);
      }
    }
    
    return elements;
  }

  /**
   * Check if an element is registered
   */
  hasElement(id: string): boolean {
    return this.refs.has(id) || this.elementCache.has(id);
  }

  /**
   * Clear all caches (useful for testing)
   */
  clearCache(): void {
    this.elementCache.clear();
  }

  /**
   * Get element with type safety
   */
  getTypedElement<T extends SVGElement>(
    id: string, 
    expectedType: ElementRef['type']
  ): T | null {
    const refEntry = this.refs.get(id);
    
    if (refEntry?.type !== expectedType) {
      console.warn(`ElementRefManager: Type mismatch for ${id}. Expected ${expectedType}, got ${refEntry?.type}`);
      return null;
    }

    const element = this.getElementByRef(id);
    return element as T | null;
  }

  /**
   * Safely set transform on an element
   */
  setElementTransform(id: string, transform: string): boolean {
    const element = this.getElementById(id);
    if (!element) {
      console.warn(`ElementRefManager: Element ${id} not found for transform`);
      return false;
    }

    element.setAttribute('transform', transform);
    return true;
  }

  /**
   * Safely remove transform from an element
   */
  removeElementTransform(id: string): boolean {
    const element = this.getElementById(id);
    if (!element) {
      console.warn(`ElementRefManager: Element ${id} not found for transform removal`);
      return false;
    }

    element.removeAttribute('transform');
    return true;
  }

  /**
   * Get element bounds safely
   */
  getElementBounds(id: string): DOMRect | null {
    const element = this.getElementById(id);
    if (!element) {
      return null;
    }

    try {
      return element.getBoundingClientRect();
    } catch (error) {
      console.warn(`ElementRefManager: Failed to get bounds for ${id}:`, error);
      return null;
    }
  }

  /**
   * Debug info for development
   */
  getDebugInfo(): { refsCount: number; cacheCount: number; refs: string[] } {
    return {
      refsCount: this.refs.size,
      cacheCount: this.elementCache.size,
      refs: Array.from(this.refs.keys())
    };
  }
}

// Singleton instance
export const elementRefManager = new ElementRefManager();

// React hook for registering element refs
export function useElementRef(
  id: string, 
  type: ElementRef['type']
): RefObject<SVGElement | null> {
  const ref = React.useRef<SVGElement | null>(null);
  
  React.useEffect(() => {
    elementRefManager.registerRef(id, type, ref);
    
    return () => {
      elementRefManager.unregisterRef(id);
    };
  }, [id, type]);

  return ref;
}

// Type exports
export type { ElementRef };
