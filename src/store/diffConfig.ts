import { useEditorStore } from './editorStore';
import microdiff from 'microdiff';
import isEqual from 'fast-deep-equal';

// Global flag to temporarily disable diff during problematic operations
let isDiffTemporarilyDisabled = false;
let isRedoOperation = false;

/**
 * Sanitize a state to ensure it doesn't contain invalid references or structural diff metadata
 */
export function sanitizeState(state: any): any {
  if (!state || typeof state !== 'object') {
    return state;
  }
  
  // Create a clean copy
  const cleanState = { ...state };
  
  // Remove any diff metadata that shouldn't be in the actual state
  if (cleanState.__diffMetadata) {
    delete cleanState.__diffMetadata;
  }
  
  // Validate and clean arrays
  if (cleanState.paths && Array.isArray(cleanState.paths)) {
    cleanState.paths = cleanState.paths.filter((path: any) => path && typeof path === 'object' && path.id);
  }
  
  if (cleanState.texts && Array.isArray(cleanState.texts)) {
    cleanState.texts = cleanState.texts.filter((text: any) => text && typeof text === 'object' && text.id);
  }
  
  // Clean selection state
  if (cleanState.selection) {
    const selection = { ...cleanState.selection };
    
    // Ensure arrays are valid
    if (selection.selectedPaths && Array.isArray(selection.selectedPaths)) {
      selection.selectedPaths = selection.selectedPaths.filter((id: any) => typeof id === 'string' && id.length > 0);
    }
    
    if (selection.selectedTexts && Array.isArray(selection.selectedTexts)) {
      selection.selectedTexts = selection.selectedTexts.filter((id: any) => typeof id === 'string' && id.length > 0);
    }
    
    if (selection.selectedCommands && Array.isArray(selection.selectedCommands)) {
      selection.selectedCommands = selection.selectedCommands.filter((cmd: any) => cmd && typeof cmd === 'object');
    }
    
    cleanState.selection = selection;
  }
  
  return cleanState;
}

/**
 * Mark that we're about to perform a redo operation
 */
export function markRedoOperation() {
  isRedoOperation = true;
  console.log('🔄 Redo operation marked - will use full state storage');
  
  // Clear the flag after a short delay
  setTimeout(() => {
    isRedoOperation = false;
    console.log('✅ Redo operation completed');
  }, 100);
}

/**
 * Check if we're currently in a redo operation
 */
export function isInRedoOperation(): boolean {
  return isRedoOperation;
}

/**
 * Temporarily disable diff calculation to prevent issues during redo operations
 */
export function temporarilyDisableDiff() {
  isDiffTemporarilyDisabled = true;
  console.warn('🚨 Diff calculation temporarily disabled');
  
  // Re-enable after a shorter delay to minimize impact on normal operations
  setTimeout(() => {
    isDiffTemporarilyDisabled = false;
    console.log('✅ Diff calculation re-enabled');
  }, 200); // Reduced from 1000ms to 200ms
}

/**
 * Check if diff is currently disabled
 */
export function isDiffDisabled(): boolean {
  return isDiffTemporarilyDisabled;
}

/**
 * Fields and paths that should be excluded from diff tracking and storage
 * These are typically UI-only states that don't need to be preserved in undo/redo
 */
const EXCLUDED_FIELDS = new Set([
  'debugPanel',                    // Debug UI state
  'renderVersion',                 // Internal render counter
  'floatingToolbarUpdateTimestamp', // UI update timestamp
  'history',                       // Zundo history state - don't track its changes
  'deepSelection',                 // Deep selection state - UI only
  '__diffMetadata'                 // CRITICAL: Prevent recursive metadata inclusion
]);

const EXCLUDED_PATHS = new Set([
  'selection.selectionBox'         // Selection box coordinates - UI state only
]);

/**
 * Check if a change path should be excluded from diff tracking
 */
function shouldExcludeChange(changePath: string): boolean {
  // Check if this change path should be excluded
  for (const excludedPath of EXCLUDED_PATHS) {
    if (changePath.startsWith(excludedPath)) {
      return true;
    }
  }
  return false;
}

/**
 * Filter state object to exclude non-trackable fields
 */
function filterStateForDiff(state: any): any {
  return Object.fromEntries(
    Object.entries(state).filter(([key, value]) => {
      // Exclude predefined fields
      if (EXCLUDED_FIELDS.has(key)) return false;
      
      // CRITICAL: Exclude all functions from diff tracking
      // Zustand stores include action functions that should never be diffed
      if (typeof value === 'function') return false;
      
      // CRITICAL: Additional safety check for metadata recursion
      // Prevent any metadata-related fields from being included
      if (key.includes('diffMetadata') || key.includes('__diff')) return false;
      
      return true;
    })
  );
}

/**
 * Configuration for Zundo's diff storage system
 * 
 * ZUNDO v2 SUPPORTS DIFF STORAGE natively.
 * This configuration controls whether complete states or only differences are stored.
 * Diff storage significantly reduces memory usage.
 */
export interface ZundoDiffConfig {
  enabled: boolean;
  mode: 'full' | 'diff';
}

// Global state for diff storage configuration
let diffConfig: ZundoDiffConfig = {
  enabled: true,
  mode: 'diff' // Controls whether Zundo stores diffs or complete states
};


// Removed complex diff functions - using simple field-level diff approach now

/**
 * Function to calculate granular differences between states using microdiff
 * Used by Zundo to store only the fields that changed
 */
export function calculateStateDiff(
  currentState: any, 
  pastState: any
): any | null {
  try {
    if (!currentState || !pastState) return currentState;
    
    // CRITICAL: Check if we're dealing with structural diffs from previous operations
    // If currentState is already a structural diff, don't process it again
    if (currentState.__diffMetadata?.type === 'structural') {
      console.warn('🚨 Attempted to diff a structural diff - returning full state to preserve history');
      return currentState; // Return full state to preserve history
    }
    
    // If pastState is a structural diff, we need to reconstruct it first
    if (pastState.__diffMetadata?.type === 'structural') {
      console.warn('🚨 Past state is a structural diff - returning full state to preserve history');
      return currentState; // Return full state to preserve history
    }
  if (!currentState || !pastState) return currentState;
  
  // CRITICAL: Check if we're dealing with structural diffs from previous operations
  // If currentState is already a structural diff, don't process it again
  if (currentState.__diffMetadata?.type === 'structural') {
    console.warn('🚨 Attempted to diff a structural diff - this indicates a Zundo configuration issue, returning null');
    return null; // Return null to prevent storing invalid diffs
  }
  
  // If pastState is a structural diff, we need to reconstruct it first
  if (pastState.__diffMetadata?.type === 'structural') {
    console.warn('� Past state is a structural diff - this indicates a Zundo configuration issue, returning null');
    return null; // Return null to prevent storing invalid diffs
  }
  
  // Create filtered states excluding fields that shouldn't be tracked
  const filteredCurrent = filterStateForDiff(currentState);
  const filteredPast = filterStateForDiff(pastState);
  
  // Use microdiff to get granular changes
  const changes = microdiff(filteredPast, filteredCurrent);
  
  // Filter out changes to excluded nested paths
  const filteredChanges = changes.filter((change: any) => {
    const changePath = change.path.join('.');
    return !shouldExcludeChange(changePath);
  });
  
  if (filteredChanges.length === 0) {
    return null; // No changes after filtering - Zundo won't store this
  }
  
  // CRITICAL: If too many fields changed, return null to prevent corruption
  const affectedTopLevelFields = new Set(
    filteredChanges
      .map((c: any) => c.path[0])
      .filter(field => field && typeof field === 'string') // Ensure valid field names
  );
  const totalStateFields = Object.keys(filteredCurrent).length;
  
  // Safety check: ensure we have valid data before comparison
  if (affectedTopLevelFields.size === 0 || totalStateFields === 0) {
    console.warn(`🚨 WARNING: Invalid state data - affectedFields: ${affectedTopLevelFields.size}, totalFields: ${totalStateFields}`);
    return currentState; // Fallback to full state
  }
  
  if (affectedTopLevelFields.size > totalStateFields * 0.8) {
    console.warn(`🚨 WARNING: ${affectedTopLevelFields.size}/${totalStateFields} top-level fields changed - skipping this state`);
    return null; // Skip storing this state to prevent corruption
  }
  
  // Advanced deep diff implementation using microdiff
  // Instead of storing only top-level fields, create a structural diff
  const structuralDiff: any = {};
  
  for (const change of filteredChanges) {
    const path = change.path;
    const { type } = change;
    
    // Get the appropriate value based on change type
    let value: any;
    let oldValue: any;
    
    switch (type) {
      case 'CREATE':
        value = (change as any).value;
        break;
      case 'CHANGE':
        value = (change as any).value;
        oldValue = (change as any).oldValue;
        break;
      case 'REMOVE':
        oldValue = (change as any).value;
        break;
    }
    
    // Build nested structure based on the path
    let current = structuralDiff;
    
    // Navigate/create the path structure
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (!(key in current)) {
        // Determine if next level should be array or object
        const nextKey = path[i + 1];
        current[key] = typeof nextKey === 'number' || /^\d+$/.test(String(nextKey)) ? [] : {};
      }
      current = current[key];
    }
    
    // Set the final value
    const finalKey = path[path.length - 1];
    
    switch (type) {
      case 'CREATE':
      case 'CHANGE':
        current[finalKey] = value;
        break;
      case 'REMOVE':
        // For removal, we need to track this explicitly
        // We'll use a special marker for removed values
        current[finalKey] = { __ZUNDO_REMOVED__: true, __oldValue__: oldValue };
        break;
    }
  }
  
  // Add metadata for reconstruction
  structuralDiff.__diffMetadata = {
    type: 'structural',
    changesCount: filteredChanges.length,
    affectedFields: Array.from(affectedTopLevelFields),
    timestamp: Date.now()
  };
  
  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    const fullSize = JSON.stringify(filteredCurrent).length;
    const diffSize = JSON.stringify(structuralDiff).length;
    const savings = fullSize > 0 ? Math.max(0, Math.round(((fullSize - diffSize) / fullSize) * 100)) : 0;
    
    // Safety check - if diff is larger than original, fall back to field-level diff
    if (diffSize > fullSize) {
      console.warn(`📊 Structural diff larger than original, falling back to field-level diff`);
      
      // Fall back to simple field-level diff
      const simpleDiff: any = {};
      for (const field of affectedTopLevelFields) {
        simpleDiff[field] = filteredCurrent[field];
      }
      
      const simpleDiffSize = JSON.stringify(simpleDiff).length;
      if (simpleDiffSize < fullSize) {
        updateMetrics(simpleDiffSize, fullSize, 'field-level');
        console.log(`📦 Zundo field-level diff fallback: ${simpleDiffSize} bytes`);
        return simpleDiff;
      } else {
        updateMetrics(0, fullSize, 'skipped');
        console.error(`🚨 EMERGENCY: Both diff methods larger than original - skipping state`);
        return null;
      }
    }
    
    updateMetrics(diffSize, fullSize, 'structural');
    console.log(`📦 Zundo structural diff: ${diffSize} bytes (${savings}% smaller than full state)`);
    console.log(`🔍 Granular changes: ${filteredChanges.length} changes across [${Array.from(affectedTopLevelFields).join(', ')}]`);
    
    // Log performance metrics every 10 operations
    if (diffMetrics.totalOperations % 10 === 0) {
      console.log(`📊 Diff Performance Metrics:`, {
        avgSavings: `${diffMetrics.averageSavings}%`,
        totalOps: diffMetrics.totalOperations,
        structural: diffMetrics.structuralDiffs,
        fieldLevel: diffMetrics.fieldLevelDiffs,
        skipped: diffMetrics.skippedStates
      });
    }
    
    if (filteredChanges.length <= 20) {
      console.log(`🔬 Change details:`, filteredChanges.map((c: any) => `${c.path.join('.')}: ${c.type}`));
    }
  }
  
  return structuralDiff;
  } catch (error) {
    console.error('🚨 Error in calculateStateDiff:', error);
    return currentState; // Return current state on error instead of null to prevent Zundo errors
  }
}

/**
 * Hook to control diff storage configuration
 * This configuration directly affects how Zundo stores states
 */
export function useDiffConfig() {
  return {
    config: diffConfig,
    metrics: getDiffMetrics(),
    setDiffMode: (mode: 'full' | 'diff') => {
      diffConfig.mode = mode;
      diffConfig.enabled = mode === 'diff';
      
      // Notify change for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔄 Zundo diff storage changed to: ${mode}`);
        console.log('💡 Note: This affects how states are stored in memory');
        if (mode === 'diff') {
          console.log('📉 Memory usage should decrease - storing only changes');
        } else {
          console.log('📈 Memory usage will increase - storing full states');
        }
      }
    },
    toggleDiffMode: () => {
      const newMode = diffConfig.mode === 'full' ? 'diff' : 'full';
      diffConfig.mode = newMode;
      diffConfig.enabled = newMode === 'diff';
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔄 Zundo diff storage toggled to: ${newMode}`);
        console.log('💡 Note: This affects real memory usage');
        if (newMode === 'diff') {
          console.log('📉 Now storing only differences between states');
        } else {
          console.log('📈 Now storing complete states');
        }
      }
      
      return newMode;
    },
    resetMetrics: resetDiffMetrics
  };
}

/**
 * Get current diff storage configuration (used by Zundo)
 */
export function getCurrentDiffConfig() {
  return diffConfig;
}

/**
 * Add additional fields to exclude from diff tracking
 * Useful for dynamically excluding UI-only states
 */
export function addExcludedField(fieldName: string) {
  EXCLUDED_FIELDS.add(fieldName);
}

/**
 * Add additional paths to exclude from diff tracking  
 * Useful for excluding nested properties like 'selection.selectionBox'
 */
export function addExcludedPath(pathPattern: string) {
  EXCLUDED_PATHS.add(pathPattern);
}

/**
 * Get current list of excluded fields and paths (for debugging)
 */
export function getExclusionConfig() {
  return {
    excludedFields: Array.from(EXCLUDED_FIELDS),
    excludedPaths: Array.from(EXCLUDED_PATHS)
  };
}

/**
 * Performance metrics for diff operations
 */
interface DiffMetrics {
  averageDiffSize: number;
  averageFullSize: number;
  averageSavings: number;
  totalOperations: number;
  structuralDiffs: number;
  fieldLevelDiffs: number;
  skippedStates: number;
}

let diffMetrics: DiffMetrics = {
  averageDiffSize: 0,
  averageFullSize: 0,
  averageSavings: 0,
  totalOperations: 0,
  structuralDiffs: 0,
  fieldLevelDiffs: 0,
  skippedStates: 0
};

/**
 * Update metrics tracking
 */
function updateMetrics(diffSize: number, fullSize: number, diffType: 'structural' | 'field-level' | 'skipped') {
  diffMetrics.totalOperations++;
  
  if (diffType === 'skipped') {
    diffMetrics.skippedStates++;
    return;
  }
  
  if (diffType === 'structural') {
    diffMetrics.structuralDiffs++;
  } else {
    diffMetrics.fieldLevelDiffs++;
  }
  
  // Update running averages
  const total = diffMetrics.totalOperations - diffMetrics.skippedStates;
  const prevAvgDiff = diffMetrics.averageDiffSize;
  const prevAvgFull = diffMetrics.averageFullSize;
  
  diffMetrics.averageDiffSize = ((prevAvgDiff * (total - 1)) + diffSize) / total;
  diffMetrics.averageFullSize = ((prevAvgFull * (total - 1)) + fullSize) / total;
  diffMetrics.averageSavings = diffMetrics.averageFullSize > 0 
    ? Math.round(((diffMetrics.averageFullSize - diffMetrics.averageDiffSize) / diffMetrics.averageFullSize) * 100)
    : 0;
}

/**
 * Get current performance metrics
 */
export function getDiffMetrics(): DiffMetrics {
  return { ...diffMetrics };
}

/**
 * Reset performance metrics
 */
export function resetDiffMetrics() {
  diffMetrics = {
    averageDiffSize: 0,
    averageFullSize: 0,
    averageSavings: 0,
    totalOperations: 0,
    structuralDiffs: 0,
    fieldLevelDiffs: 0,
    skippedStates: 0
  };
}

/**
 * Calculate difference between two specific states
 * Used to show only the fields that changed
 */
export function calculateInlineDiff(currentState: any, previousState: any) {
  if (!currentState || !previousState) return null;
  return calculateStateDiff(currentState, previousState);
}

/**
 * Reconstruct display data from field-level diff for rich context in UI  
 * For structural diffs, this applies the diff to reconstruct the full state
 */
export function reconstructDisplayData(diffData: any, currentState: any): any {
  // If no diff data, return empty object
  if (!diffData) return {};
  
  // Check if this is a structural diff
  if (diffData.__diffMetadata?.type === 'structural') {
    return reconstructFromStructuralDiff(diffData, currentState);
  }
  
  // With the simplified implementation, diffData is already in the right format
  // It contains only the top-level fields that changed, with their complete values
  return diffData;
}

/**
 * Reconstruct state from structural diff
 * This function applies a structural diff to a base state to reconstruct the full state
 */
function reconstructFromStructuralDiff(structuralDiff: any, baseState: any): any {
  if (!structuralDiff || !baseState) return baseState;
  
  try {
    // Clone the base state to avoid mutations
    const reconstructed = JSON.parse(JSON.stringify(baseState));
    
    // Remove metadata from diff before processing
    const { __diffMetadata, ...diff } = structuralDiff;
    
    // Apply the structural diff with error handling
    applyStructuralDiff(reconstructed, diff);
    
    return reconstructed;
  } catch (error) {
    console.warn('🚨 Error reconstructing from structural diff:', error);
    console.warn('Falling back to base state');
    return baseState;
  }
}

/**
 * Apply structural diff to an object
 */
function applyStructuralDiff(target: any, diff: any): void {
  if (!target || !diff || typeof diff !== 'object') return;
  
  for (const [key, value] of Object.entries(diff)) {
    try {
      if (value && typeof value === 'object') {
        // Check if this is a removal marker
        if ((value as any).__ZUNDO_REMOVED__) {
          delete target[key];
          continue;
        }
        
        // Check if this is a nested diff
        if (Array.isArray(value) || (typeof value === 'object' && value.constructor === Object)) {
          // Ensure target has the property as the correct type
          if (!(key in target)) {
            target[key] = Array.isArray(value) ? [] : {};
          }
          
          // Validate that target[key] is compatible with the diff
          if (typeof target[key] !== 'object') {
            target[key] = Array.isArray(value) ? [] : {};
          }
          
          // Recursively apply diff
          applyStructuralDiff(target[key], value);
        } else {
          // Direct assignment
          target[key] = value;
        }
      } else {
        // Direct assignment for primitives
        target[key] = value;
      }
    } catch (error) {
      console.warn(`🚨 Error applying diff for key "${key}":`, error);
      // Continue with other keys
    }
  }
}

/**
 * Optimized equality function for Zundo
 * Uses fast-deep-equal for performance with intelligent shallow checks first
 */
export function optimizedEquality(pastState: any, currentState: any): boolean {
  try {
    // Quick reference equality check
    if (pastState === currentState) return true;
    
    // Handle null/undefined cases
    if (!pastState || !currentState) return pastState === currentState;
    
    // CRITICAL: Check if we're dealing with structural diffs
    if (pastState.__diffMetadata?.type === 'structural' || currentState.__diffMetadata?.type === 'structural') {
      console.warn('🚨 Attempted to compare structural diff in equality function - treating as different');
      return false; // Treat structural diffs as different to prevent issues
    }
    
    // Type check
    if (typeof pastState !== typeof currentState) return false;
  
  // For non-objects, use strict equality
  if (typeof pastState !== 'object') return pastState === currentState;
  
  // Array check
  const pastIsArray = Array.isArray(pastState);
  const currentIsArray = Array.isArray(currentState);
  if (pastIsArray !== currentIsArray) return false;
  
  // Length/size check for arrays and objects
  if (pastIsArray) {
    if (pastState.length !== currentState.length) return false;
  } else {
    const pastKeys = Object.keys(pastState);
    const currentKeys = Object.keys(currentState);
    if (pastKeys.length !== currentKeys.length) return false;
    
    // Quick key comparison for objects
    for (let i = 0; i < pastKeys.length; i++) {
      if (pastKeys[i] !== currentKeys[i]) return false;
    }
  }
  
  // Try shallow comparison first for performance (most changes are shallow)
  let needsDeepComparison = false;
  
  if (pastIsArray) {
    for (let i = 0; i < pastState.length; i++) {
      if (pastState[i] !== currentState[i]) {
        // If shallow comparison fails, check if we need deep comparison
        if (typeof pastState[i] === 'object' && typeof currentState[i] === 'object') {
          needsDeepComparison = true;
          break;
        } else {
          return false; // Different primitives
        }
      }
    }
  } else {
    for (const key in pastState) {
      if (pastState[key] !== currentState[key]) {
        // If shallow comparison fails, check if we need deep comparison
        if (typeof pastState[key] === 'object' && typeof currentState[key] === 'object') {
          needsDeepComparison = true;
          break;
        } else {
          return false; // Different primitives
        }
      }
    }
  }
  
  // If shallow comparison passed completely, objects are equal
  if (!needsDeepComparison) return true;
  
  // Use fast-deep-equal for deep comparison when needed
  // This is much faster than JSON.stringify comparison
  return isEqual(pastState, currentState);
  } catch (error) {
    console.error('🚨 Error in optimizedEquality:', error);
    return false; // Return false on error to be safe
  }
}
