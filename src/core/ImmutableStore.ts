/**
 * Immutable Store Pattern Enforcement
 * 
 * Provides utilities and patterns to ensure consistent immutable state updates
 * across the entire application store system.
 */

import { produce, Draft, enableMapSet } from 'immer';

// Enable Immer support for Map and Set
enableMapSet();

/**
 * Type helper to ensure immutable updates
 */
export type ImmutableUpdate<T> = (draft: Draft<T>) => void;

/**
 * Immutable state updater using Immer
 */
export function createImmutableUpdate<T>(
  currentState: T,
  updater: ImmutableUpdate<T>
): T {
  return produce(currentState, updater);
}

/**
 * Store action wrapper that enforces immutable patterns
 */
export function createImmutableAction<TState, TPayload = void>(
  actionName: string,
  updater: (state: Draft<TState>, payload: TPayload) => void
) {
  return (state: TState, payload: TPayload): TState => {
    try {
      return produce(state, (draft: Draft<TState>) => {
        updater(draft, payload);
      });
    } catch (error) {
      console.error(`Immutable action "${actionName}" failed:`, error);
      // Return original state if update fails
      return state;
    }
  };
}

/**
 * Validation helper to ensure no direct mutations
 */
export function validateImmutableState<T>(
  original: T,
  updated: T,
  actionName: string
): void {
  if (process.env.NODE_ENV === 'development') {
    if (original === updated) {
      console.warn(
        `Potential mutation detected in action "${actionName}": ` +
        'State object reference is the same. Use immutable update patterns.'
      );
    }
  }
}

/**
 * Lock state utility for atomic operations
 */
export interface LockState {
  isLocked: boolean;
  lockedBy: string | null;
  lockTime: number | null;
  operationId: string | null;
}

export interface AtomicLockManager {
  acquireLock: (operationId: string, lockedBy: string) => boolean;
  releaseLock: (operationId: string) => boolean;
  isLocked: () => boolean;
  getLockInfo: () => LockState;
  forceRelease: () => void;
}

/**
 * Create atomic lock manager for preventing race conditions
 */
export function createAtomicLockManager(): AtomicLockManager {
  let lockState: LockState = {
    isLocked: false,
    lockedBy: null,
    lockTime: null,
    operationId: null
  };

  return {
    acquireLock: (operationId: string, lockedBy: string): boolean => {
      if (lockState.isLocked) {
        // Check for stale locks (older than 5 seconds)
        const now = Date.now();
        if (lockState.lockTime && (now - lockState.lockTime) > 5000) {
          console.warn(`Force releasing stale lock from "${lockState.lockedBy}"`);
          lockState = {
            isLocked: false,
            lockedBy: null,
            lockTime: null,
            operationId: null
          };
        } else {
          return false; // Lock is active
        }
      }

      lockState = {
        isLocked: true,
        lockedBy,
        lockTime: Date.now(),
        operationId
      };
      return true;
    },

    releaseLock: (operationId: string): boolean => {
      if (!lockState.isLocked || lockState.operationId !== operationId) {
        return false;
      }

      lockState = {
        isLocked: false,
        lockedBy: null,
        lockTime: null,
        operationId: null
      };
      return true;
    },

    isLocked: (): boolean => lockState.isLocked,

    getLockInfo: (): LockState => ({ ...lockState }),

    forceRelease: (): void => {
      lockState = {
        isLocked: false,
        lockedBy: null,
        lockTime: null,
        operationId: null
      };
    }
  };
}

/**
 * Transactional state updates with rollback capability
 */
export interface Transaction<T> {
  id: string;
  originalState: T;
  operations: Array<{
    name: string;
    updater: ImmutableUpdate<T>;
  }>;
  result?: T;
}

export class TransactionalStateManager<T> {
  private transactions = new Map<string, Transaction<T>>();
  private lockManager = createAtomicLockManager();

  /**
   * Start a new transaction
   */
  startTransaction(state: T, transactionId: string = this.generateId()): string {
    if (this.transactions.has(transactionId)) {
      throw new Error(`Transaction ${transactionId} already exists`);
    }

    const transaction: Transaction<T> = {
      id: transactionId,
      originalState: structuredClone(state),
      operations: []
    };

    this.transactions.set(transactionId, transaction);
    return transactionId;
  }

  /**
   * Add operation to transaction
   */
  addOperation(
    transactionId: string,
    operationName: string,
    updater: ImmutableUpdate<T>
  ): void {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    transaction.operations.push({
      name: operationName,
      updater
    });
  }

  /**
   * Commit transaction atomically
   */
  commitTransaction(transactionId: string, currentState: T): T {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    // Acquire lock
    if (!this.lockManager.acquireLock(transactionId, 'transaction-commit')) {
      throw new Error(`Cannot acquire lock for transaction ${transactionId}`);
    }

    try {
      // Apply all operations sequentially
      let result = currentState;
      for (const operation of transaction.operations) {
        result = createImmutableUpdate(result, operation.updater);
      }

      transaction.result = result;
      this.transactions.delete(transactionId);
      
      return result;
    } catch (error) {
      console.error(`Transaction ${transactionId} failed:`, error);
      throw error;
    } finally {
      this.lockManager.releaseLock(transactionId);
    }
  }

  /**
   * Rollback transaction
   */
  rollbackTransaction(transactionId: string): T {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    const originalState = transaction.originalState;
    this.transactions.delete(transactionId);
    return originalState;
  }

  private generateId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
}

/**
 * Immutable array helpers
 */
export const ImmutableArrayUtils = {
  /**
   * Add item to array immutably
   */
  add: <T>(array: T[], item: T): T[] => [...array, item],

  /**
   * Remove item by index immutably
   */
  removeAt: <T>(array: T[], index: number): T[] => [
    ...array.slice(0, index),
    ...array.slice(index + 1)
  ],

  /**
   * Remove item by predicate immutably
   */
  removeWhere: <T>(array: T[], predicate: (item: T) => boolean): T[] =>
    array.filter(item => !predicate(item)),

  /**
   * Update item at index immutably
   */
  updateAt: <T>(array: T[], index: number, updater: (item: T) => T): T[] => [
    ...array.slice(0, index),
    updater(array[index]),
    ...array.slice(index + 1)
  ],

  /**
   * Update item by predicate immutably
   */
  updateWhere: <T>(
    array: T[],
    predicate: (item: T) => boolean,
    updater: (item: T) => T
  ): T[] => array.map(item => predicate(item) ? updater(item) : item),

  /**
   * Toggle item in array (add if not present, remove if present)
   */
  toggle: <T>(array: T[], item: T, compareFn?: (a: T, b: T) => boolean): T[] => {
    const compare = compareFn || ((a, b) => a === b);
    const exists = array.some(existing => compare(existing, item));
    
    if (exists) {
      return array.filter(existing => !compare(existing, item));
    } else {
      return [...array, item];
    }
  }
};

/**
 * Immutable object helpers
 */
export const ImmutableObjectUtils = {
  /**
   * Deep merge objects immutably
   */
  merge: <T extends Record<string, any>>(target: T, source: Partial<T>): T => ({
    ...target,
    ...source
  }),

  /**
   * Deep merge with custom merger function
   */
  mergeWith: <T extends Record<string, any>>(
    target: T,
    source: Partial<T>,
    merger: (targetValue: any, sourceValue: any, key: string) => any
  ): T => {
    const result = { ...target };
    
    for (const [key, sourceValue] of Object.entries(source)) {
      const targetValue = result[key as keyof T];
      result[key as keyof T] = merger(targetValue, sourceValue, key);
    }
    
    return result;
  },

  /**
   * Set nested property immutably
   */
  setIn: <T>(
    obj: T,
    path: string[],
    value: any
  ): T => {
    return createImmutableUpdate(obj, draft => {
      let current: any = draft;
      for (let i = 0; i < path.length - 1; i++) {
        if (!(path[i] in current)) {
          current[path[i]] = {};
        }
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
    });
  },

  /**
   * Delete nested property immutably
   */
  deleteIn: <T>(obj: T, path: string[]): T => {
    return createImmutableUpdate(obj, draft => {
      let current: any = draft;
      for (let i = 0; i < path.length - 1; i++) {
        if (!(path[i] in current)) {
          return; // Path doesn't exist
        }
        current = current[path[i]];
      }
      delete current[path[path.length - 1]];
    });
  }
};

/**
 * Development-only state mutation detector
 */
export function createMutationDetector<T>(
  initialState: T,
  stateName: string
): (newState: T) => void {
  if (process.env.NODE_ENV !== 'development') {
    return () => {}; // No-op in production
  }

  let previousState = structuredClone(initialState);

  return (newState: T) => {
    try {
      // Deep comparison to detect mutations
      const serializedPrevious = JSON.stringify(previousState);
      const serializedNew = JSON.stringify(newState);
      
      if (serializedPrevious !== serializedNew) {
        // State changed, which is expected
        previousState = structuredClone(newState);
      } else if (previousState === newState) {
        console.warn(
          `Potential mutation in ${stateName}: ` +
          'State reference is identical but content should have changed'
        );
      }
    } catch (error) {
      console.warn(`Mutation detection failed for ${stateName}:`, error);
    }
  };
}
