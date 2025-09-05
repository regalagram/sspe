import { optimizedEquality, calculateStateDiff, sanitizeState, getCurrentDiffConfig } from './diffConfig';
import diff from 'microdiff';

// Flag to track when we're doing undo/redo operations - shared with useEditorHistory
let isUndoRedoOperation = false;

export const setUndoRedoFlag = (value: boolean) => {
  isUndoRedoOperation = value;
};

/**
 * Granular change entry using microdiff
 */
interface GranularChangeEntry {
  microDiff: any[]; // Array of microdiff operations
  reverseOperations: any[]; // Operations to undo this change
  timestamp: number;
  description: string;
  changedFields: string[];
  isFullState?: boolean; // For initial states or major changes
  fullState?: any; // Only stored when isFullState is true
}

/**
 * Simple and robust undo/redo system with granular microdiff storage
 * Designed specifically for optimal memory usage and performance
 */
export class SimpleUndoRedo {
  private changes: GranularChangeEntry[] = [];
  private currentIndex: number = -1; // Index of current state in changes array
  private maxHistory: number = 50;
  private mergeTimeWindow: number = 2000; // 2 seconds to merge similar changes
  private baseState: any = null; // The initial state from which all diffs are calculated
  
  constructor(maxHistory: number = 50) {
    this.maxHistory = maxHistory;
  }

  /**
   * Add a state to history with granular microdiff storage
   */
  pushState(state: any): void {
    if (isUndoRedoOperation) {
      console.log('⚠️ Ignoring pushState during undo/redo operation');
      return;
    }

    try {
      const currentTime = Date.now();
      
      // If this is the first state, store it as base
      if (this.changes.length === 0) {
        this.baseState = sanitizeState(state);
        const entry: GranularChangeEntry = {
          microDiff: [],
          reverseOperations: [],
          timestamp: currentTime,
          description: 'Initial state',
          changedFields: ['initial'],
          isFullState: true,
          fullState: this.baseState
        };
        this.changes.push(entry);
        this.currentIndex = 0;
        console.log('📋 Initial state stored');
        return;
      }

      // Get current state by applying all diffs up to currentIndex
      const currentState = this.getCurrentState();
      const sanitizedState = sanitizeState(state);
      
      // Calculate microdiff
      const microDiff = diff(currentState, sanitizedState);
      if (microDiff.length === 0) {
        console.log('⚠️ No changes detected, skipping');
        return;
      }

      // Calculate reverse operations for undo
      const reverseOperations = diff(sanitizedState, currentState);
      
      // Analyze what fields changed
      const changedFields = this.extractChangedFields(microDiff);
      
      // Check if we should merge with the last change
      const shouldMerge = this.shouldMergeWithLastChange(new Set(changedFields));
      
      if (shouldMerge && this.changes.length > 1) {
        // Remove future states beyond current index when merging
        this.changes = this.changes.slice(0, this.currentIndex + 1);
        
        console.log('🔄 Merging granular change with last entry');
        // Replace the last change with the new combined diff
        const lastEntry = this.changes[this.changes.length - 1];
        
        // Recalculate diff from the state before last entry to new state
        const stateBeforeLast = this.getStateAtIndex(this.currentIndex - 1);
        const newMicroDiff = diff(stateBeforeLast, sanitizedState);
        const newReverseOps = diff(sanitizedState, stateBeforeLast);
        
        this.changes[this.changes.length - 1] = {
          microDiff: newMicroDiff,
          reverseOperations: newReverseOps,
          timestamp: currentTime,
          description: this.generateChangeDescription(new Set(changedFields)),
          changedFields: changedFields,
          isFullState: false
        };
      } else {
        // Remove any future states beyond current index
        this.changes = this.changes.slice(0, this.currentIndex + 1);
        
        // Add new change entry
        const entry: GranularChangeEntry = {
          microDiff: microDiff,
          reverseOperations: reverseOperations,
          timestamp: currentTime,
          description: this.generateChangeDescription(new Set(changedFields)),
          changedFields: changedFields,
          isFullState: false
        };
        
        this.changes.push(entry);
        this.currentIndex++;
        
        console.log('📦 Granular diff stored:', {
          operations: microDiff.length,
          fields: changedFields
        });
      }

      // Trim history if needed
      if (this.changes.length > this.maxHistory) {
        const removeCount = this.changes.length - this.maxHistory;
        
        // When trimming, we need to store a full state at the new beginning
        const newBaseState = this.getStateAtIndex(removeCount);
        this.baseState = newBaseState;
        
        // Remove old entries and adjust indices
        this.changes = this.changes.slice(removeCount);
        this.currentIndex -= removeCount;
        
        // Update the first entry to be a full state
        if (this.changes.length > 0) {
          this.changes[0] = {
            ...this.changes[0],
            isFullState: true,
            fullState: newBaseState,
            microDiff: [],
            reverseOperations: []
          };
        }
      }

      console.log(`📚 Granular History: ${this.changes.length} entries, current index: ${this.currentIndex}`);
      
    } catch (error) {
      console.error('Error in granular pushState:', error);
      // Fallback: store as full state
      const entry: GranularChangeEntry = {
        microDiff: [],
        reverseOperations: [],
        timestamp: Date.now(),
        description: 'State (fallback)',
        changedFields: ['state'],
        isFullState: true,
        fullState: sanitizeState(state)
      };
      this.changes.push(entry);
      this.currentIndex = this.changes.length - 1;
    }
  }

  /**
   * Undo operation using granular diffs
   */
  undo(currentState: any): any | null {
    if (this.currentIndex <= 0) {
      console.log('⚠️ No more states to undo');
      return null;
    }

    try {
      console.log('↶ Granular undo operation');
      setUndoRedoFlag(true);
      
      // Move to previous state
      this.currentIndex--;
      
      // Get the state at the new current index
      const undoState = this.getCurrentState();
      
      setUndoRedoFlag(false);
      console.log('🔧 Undo successful, moved to index:', this.currentIndex);
      return undoState;
      
    } catch (error) {
      setUndoRedoFlag(false);
      console.error('Error in undo:', error);
      return null;
    }
  }

  /**
   * Redo operation using granular diffs
   */
  redo(currentState: any): any | null {
    if (this.currentIndex >= this.changes.length - 1) {
      console.log('⚠️ No more states to redo');
      return null;
    }

    try {
      console.log('↷ Granular redo operation');
      setUndoRedoFlag(true);
      
      // Move to next state
      this.currentIndex++;
      
      // Get the state at the new current index
      const redoState = this.getCurrentState();
      
      setUndoRedoFlag(false);
      console.log('🔧 Redo successful, moved to index:', this.currentIndex);
      return redoState;
      
    } catch (error) {
      setUndoRedoFlag(false);
      console.error('Error in redo:', error);
      return null;
    }
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.changes = [];
    this.currentIndex = -1;
    this.baseState = null;
    console.log('🗑️ Granular history cleared');
  }

  /**
   * Get current state information
   */
  getState() {
    return {
      canUndo: this.currentIndex > 0,
      canRedo: this.currentIndex < this.changes.length - 1,
      pastCount: this.currentIndex + 1,
      futureCount: this.changes.length - 1 - this.currentIndex
    };
  }

  /**
   * Get current state by applying all diffs up to currentIndex
   */
  private getCurrentState(): any {
    if (this.changes.length === 0) return null;
    
    let state = this.baseState;
    
    // Apply all diffs up to current index
    for (let i = 1; i <= this.currentIndex; i++) {
      const entry = this.changes[i];
      if (entry.isFullState) {
        state = entry.fullState;
      } else {
        state = this.applyMicroDiff(state, entry.microDiff);
      }
    }
    
    return state;
  }

  /**
   * Get state at specific index
   */
  private getStateAtIndex(index: number): any {
    if (index < 0 || index >= this.changes.length) return null;
    
    let state = this.baseState;
    
    // Apply all diffs up to specified index
    for (let i = 1; i <= index; i++) {
      const entry = this.changes[i];
      if (entry.isFullState) {
        state = entry.fullState;
      } else {
        state = this.applyMicroDiff(state, entry.microDiff);
      }
    }
    
    return state;
  }

  /**
   * Apply microdiff operations to a state
   */
  private applyMicroDiff(state: any, microDiff: any[]): any {
    let newState = JSON.parse(JSON.stringify(state)); // Deep clone
    
    for (const operation of microDiff) {
      const { type, path, value } = operation;
      
      if (type === 'CREATE' || type === 'CHANGE') {
        this.setValueAtPath(newState, path, value);
      } else if (type === 'REMOVE') {
        this.removeValueAtPath(newState, path);
      }
    }
    
    return newState;
  }

  /**
   * Set value at path in object
   */
  private setValueAtPath(obj: any, path: (string | number)[], value: any): void {
    let current = obj;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (!(key in current)) {
        current[key] = typeof path[i + 1] === 'number' ? [] : {};
      }
      current = current[key];
    }
    current[path[path.length - 1]] = value;
  }

  /**
   * Remove value at path in object
   */
  private removeValueAtPath(obj: any, path: (string | number)[]): void {
    let current = obj;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    
    const lastKey = path[path.length - 1];
    if (Array.isArray(current)) {
      current.splice(lastKey as number, 1);
    } else {
      delete current[lastKey];
    }
  }

  /**
   * Extract changed fields from microdiff operations
   */
  private extractChangedFields(microDiff: any[]): string[] {
    const fields = new Set<string>();
    
    for (const operation of microDiff) {
      const { path } = operation;
      
      if (path.length > 0) {
        const topLevel = path[0] as string;
        fields.add(topLevel);
        
        // For paths, also add specific path ID
        if (topLevel === 'paths' && path.length > 1) {
          fields.add(`paths.${path[1]}`);
        }
      }
    }
    
    return Array.from(fields);
  }

  /**
   * Check if current state should be merged with the last change
   */
  private shouldMergeWithLastChange(changedFields: Set<string>): boolean {
    if (this.changes.length <= 1) return false;
    
    const lastEntry = this.changes[this.changes.length - 1];
    
    const now = Date.now();
    const timeDiff = now - lastEntry.timestamp;
    
    // Only merge if within time window (2 seconds)
    if (timeDiff > this.mergeTimeWindow) return false;
    
    // Get fields from last change
    const lastFields = new Set(lastEntry.changedFields);
    
    // Calculate overlap
    const intersection = new Set([...changedFields].filter(x => lastFields.has(x)));
    const union = new Set([...changedFields, ...lastFields]);
    const overlapRatio = intersection.size / union.size;
    
    // Merge if significant overlap (50% or more) and it's a continuous operation
    if (overlapRatio >= 0.5) {
      // Special cases where we always want to merge:
      // 1. Both changes affect the same path
      // 2. Both are selection changes
      // 3. Both are viewport changes (panning/zooming)
      
      const bothHavePaths = [...changedFields].some(f => f.startsWith('paths.')) && 
                           [...lastFields].some(f => typeof f === 'string' && f.startsWith('paths.'));
      const bothHaveSelection = changedFields.has('selection') && lastFields.has('selection');
      const bothHaveViewport = changedFields.has('viewport') && lastFields.has('viewport');
      
      if (bothHavePaths || bothHaveSelection || bothHaveViewport) {
        return true;
      }
      
      // For other cases, require higher overlap
      return overlapRatio >= 0.7;
    }
    
    return false;
  }

  /**
   * Generate human-readable description of changes
   */
  private generateChangeDescription(changedFields: Set<string>): string {
    const fields = Array.from(changedFields);
    
    if (fields.includes('initial')) {
      return 'Initial state';
    }
    
    const descriptions: string[] = [];
    
    // Count path changes
    const pathFields = fields.filter(f => f.startsWith('paths.'));
    if (pathFields.length > 0) {
      if (pathFields.length === 1) {
        descriptions.push('1 path modified');
      } else {
        descriptions.push(`${pathFields.length} paths modified`);
      }
    }
    
    // Other specific changes
    if (fields.includes('selection')) {
      descriptions.push('selection changed');
    }
    
    if (fields.includes('viewport')) {
      descriptions.push('viewport changed');
    }
    
    if (fields.includes('ui')) {
      descriptions.push('UI updated');
    }
    
    if (fields.includes('texts')) {
      descriptions.push('text modified');
    }
    
    // Generic fallback
    if (descriptions.length === 0) {
      if (fields.length === 1) {
        descriptions.push(`${fields[0]} changed`);
      } else {
        descriptions.push(`${fields.length} properties changed`);
      }
    }
    
    return descriptions.join(', ');
  }

  /**
   * Get detailed history for debugging
   */
  getDetailedHistory(): Array<{
    timestamp: number;
    description: string;
    changedFields: Set<string>;
  }> {
    return this.changes.map(entry => ({
      timestamp: entry.timestamp,
      description: entry.description,
      changedFields: new Set(entry.changedFields)
    }));
  }

  /**
   * Get state details at specific index for debugging
   */
  getStateDetails(index: number): any {
    if (index < 0 || index >= this.changes.length) return null;
    
    const entry = this.changes[index];
    return {
      entry,
      state: this.getStateAtIndex(index),
      operations: entry.microDiff.length,
      size: JSON.stringify(entry.microDiff).length
    };
  }
}

// Global instance for use across the app
export const globalUndoRedo = new SimpleUndoRedo();
