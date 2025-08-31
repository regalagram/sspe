/**
 * Efficient object comparison utilities
 * 
 * Replaces expensive JSON.stringify comparisons with shallow comparison
 * for better performance in React components and state management.
 */

/**
 * Shallow equality comparison for objects
 * Much faster than JSON.stringify for most use cases
 */
export function shallowEqual<T extends Record<string, any>>(
  obj1: T | null | undefined,
  obj2: T | null | undefined
): boolean {
  if (obj1 === obj2) {
    return true;
  }

  if (!obj1 || !obj2) {
    return false;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const key of keys1) {
    if (!keys2.includes(key) || obj1[key] !== obj2[key]) {
      return false;
    }
  }

  return true;
}

/**
 * Deep equality comparison for specific known shapes
 * More efficient than JSON.stringify but handles nested objects
 */
export function deepEqual<T>(a: T, b: T): boolean {
  if (a === b) return true;
  
  if (a == null || b == null) return a === b;
  
  if (typeof a !== typeof b) return false;
  
  if (typeof a !== 'object') return a === b;
  
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  
  if (Array.isArray(a)) {
    const arrA = a as unknown as any[];
    const arrB = b as unknown as any[];
    
    if (arrA.length !== arrB.length) return false;
    
    for (let i = 0; i < arrA.length; i++) {
      if (!deepEqual(arrA[i], arrB[i])) return false;
    }
    
    return true;
  }
  
  const objA = a as Record<string, any>;
  const objB = b as Record<string, any>;
  
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(objA[key], objB[key])) return false;
  }
  
  return true;
}

/**
 * Optimized comparison for selection state objects
 * Knows the structure and compares efficiently
 */
export function compareSelectionState(
  state1: any,
  state2: any
): boolean {
  if (state1 === state2) return true;
  if (!state1 || !state2) return false;

  // Compare primitive properties first (fastest)
  if (state1.mode !== state2.mode ||
      state1.toolMode !== state2.toolMode ||
      state1.isActive !== state2.isActive) {
    return false;
  }

  // Compare arrays by length first, then content
  const arrays = ['selectedCommands', 'selectedSubPaths', 'selectedTexts', 'selectedImages', 'selectedUses', 'selectedGroups'];
  
  for (const prop of arrays) {
    const arr1 = state1[prop] || [];
    const arr2 = state2[prop] || [];
    
    if (arr1.length !== arr2.length) return false;
    
    // For ID arrays, sort and compare (order usually doesn't matter for selection)
    const sorted1 = [...arr1].sort();
    const sorted2 = [...arr2].sort();
    
    for (let i = 0; i < sorted1.length; i++) {
      if (sorted1[i] !== sorted2[i]) return false;
    }
  }

  return true;
}

/**
 * Fast style object comparison for fill/stroke properties
 */
export function compareStyles(
  style1: any,
  style2: any
): boolean {
  if (style1 === style2) return true;
  if (!style1 || !style2) return false;

  // Compare common style properties
  const styleProps = ['fill', 'stroke', 'strokeWidth', 'opacity', 'fillOpacity', 'strokeOpacity'];
  
  for (const prop of styleProps) {
    if (style1[prop] !== style2[prop]) return false;
  }

  return true;
}

/**
 * Memoization utility for expensive comparisons
 */
export class ComparisonCache<T> {
  private cache = new Map<string, { value: T; timestamp: number }>();
  private maxAge: number;
  private maxSize: number;

  constructor(maxAge = 5000, maxSize = 100) {
    this.maxAge = maxAge;
    this.maxSize = maxSize;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.value;
  }

  set(key: string, value: T): void {
    // Clean old entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

// Shared instances
export const selectionCache = new ComparisonCache(3000, 50);
export const styleCache = new ComparisonCache(5000, 100);
