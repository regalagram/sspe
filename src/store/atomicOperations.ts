// store/atomicOperations.ts
/**
 * Atomic state operations to prevent race conditions
 */

export interface FormatCopyState {
  isFormatCopyActive?: () => boolean;
  isTextFormatCopyActive?: () => boolean;
  isImageFormatCopyActive?: () => boolean;
  isUseFormatCopyActive?: () => boolean;
  // Add other format copy state properties as needed
}

/**
 * Atomic check for any format copy activity
 * Prevents race conditions by checking state in a single atomic operation
 */
export const atomicFormatCopyCheck = (state: FormatCopyState): boolean => {
  // Capture state snapshot atomically
  const formatCopyActive = state.isFormatCopyActive?.() ?? false;
  const textFormatCopyActive = state.isTextFormatCopyActive?.() ?? false;
  const imageFormatCopyActive = state.isImageFormatCopyActive?.() ?? false;
  const useFormatCopyActive = state.isUseFormatCopyActive?.() ?? false;
  
  return formatCopyActive || textFormatCopyActive || imageFormatCopyActive || useFormatCopyActive;
};

/**
 * Atomic state transaction wrapper
 * Ensures multiple state operations happen atomically
 */
export class StateTransaction {
  private operations: Array<() => void> = [];
  private rollbacks: Array<() => void> = [];

  /**
   * Add an operation to the transaction
   */
  addOperation(operation: () => void, rollback?: () => void): void {
    this.operations.push(operation);
    if (rollback) {
      this.rollbacks.unshift(rollback); // Add to front for reverse order
    }
  }

  /**
   * Execute all operations atomically
   */
  commit(): void {
    try {
      this.operations.forEach(op => op());
      this.operations = [];
      this.rollbacks = [];
    } catch (error) {
      // Rollback on error
      this.rollback();
      throw error;
    }
  }

  /**
   * Rollback all operations
   */
  rollback(): void {
    this.rollbacks.forEach(rollback => {
      try {
        rollback();
      } catch (rollbackError) {
        console.error('Error during rollback:', rollbackError);
      }
    });
    this.operations = [];
    this.rollbacks = [];
  }
}

/**
 * Lock manager for preventing concurrent state modifications
 */
export class StateLockManager {
  private locks = new Map<string, boolean>();
  private waitQueue = new Map<string, Array<() => void>>();

  /**
   * Acquire a lock for a resource
   */
  async acquireLock(resourceId: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.locks.get(resourceId)) {
        this.locks.set(resourceId, true);
        resolve();
      } else {
        // Add to wait queue
        if (!this.waitQueue.has(resourceId)) {
          this.waitQueue.set(resourceId, []);
        }
        this.waitQueue.get(resourceId)!.push(resolve);
      }
    });
  }

  /**
   * Release a lock for a resource
   */
  releaseLock(resourceId: string): void {
    this.locks.set(resourceId, false);
    
    // Process wait queue
    const waiters = this.waitQueue.get(resourceId);
    if (waiters && waiters.length > 0) {
      const nextWaiter = waiters.shift()!;
      this.locks.set(resourceId, true);
      nextWaiter();
    }
  }

  /**
   * Execute a function with exclusive lock
   */
  async withLock<T>(resourceId: string, operation: () => Promise<T> | T): Promise<T> {
    await this.acquireLock(resourceId);
    try {
      return await operation();
    } finally {
      this.releaseLock(resourceId);
    }
  }

  /**
   * Check if a resource is currently locked
   */
  isLocked(resourceId: string): boolean {
    return this.locks.get(resourceId) ?? false;
  }
}

/**
 * Global lock manager instance
 */
export const globalLockManager = new StateLockManager();
