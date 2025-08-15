import { useEditorStore } from '../../store/editorStore';

interface SplitPointState {
  bothSelected: boolean;
  lastClickedHalf: 'initial' | 'final' | null;
  clickCount: number;
  commandIds: { initial: string; final: string };
  lastClickTime: number;
}

interface Point {
  x: number;
  y: number;
}

export class SplitPointManager {
  private splitStates: Map<string, SplitPointState> = new Map();

  /**
   * Handle click on a split point element
   */
  handleSplitPointClick(element: Element, clickPosition: Point): boolean {
    const commandId = element.getAttribute('data-command-id');
    if (!commandId) return false;

    // Determine if this is a split point by checking if it's a path element
    const isSplitElement = element.tagName.toLowerCase() === 'path';
    if (!isSplitElement) return false;

    // Find the counterpart command
    const counterpartId = this.findCounterpartCommand(commandId);
    if (!counterpartId) return false;


    // Determine which half was clicked (red or green)
    const clickedHalf = this.determineClickedHalf(element, clickPosition, commandId, counterpartId);

    // Get or create split state
    const stateKey = this.getSplitStateKey(commandId, counterpartId);
    let currentState = this.splitStates.get(stateKey);
    const isNewState = !currentState;

    if (!currentState) {
      currentState = this.createInitialState(commandId, counterpartId);
      this.splitStates.set(stateKey, currentState);
    }

    // Handle the click logic
    const now = Date.now();
    const timeSinceLastClick = now - currentState.lastClickTime;

    // Determine which actual command ID corresponds to the clicked half
    const actualClickedCommandId = clickedHalf === 'initial' ? currentState.commandIds.initial : currentState.commandIds.final;

    // Check if this is the very first interaction with this split point pair
    const isFirstEverClick = isNewState || currentState.clickCount === 0;

    // Also check if enough time has passed to reset (treat as new interaction)
    const shouldReset = timeSinceLastClick > 2000; // 2 seconds

    if (isFirstEverClick || shouldReset) {
      // Very first click or after long pause - ALWAYS select both
      this.selectBoth(currentState);
    } else if (currentState.bothSelected && timeSinceLastClick > 200) {
      // Both are selected and enough time passed - select individual based on clicked half
      this.selectIndividual(actualClickedCommandId, currentState);
    } else if (!currentState.bothSelected) {
      // Individual is selected - check if clicking same or different half
      const store = useEditorStore.getState();
      const currentlySelectedCommands = store.selection.selectedCommands;
      const isClickingSameHalf = currentlySelectedCommands.includes(actualClickedCommandId);

      if (isClickingSameHalf) {
        // Clicking same half that's already selected - keep individual selection (allow drag)
        // Keep the current individual selection state
        currentState.bothSelected = false;
      } else {
        // Clicking different half - reassemble the pair
        this.selectBoth(currentState);
      }
    } else {
      // Default case - select both (safer fallback)
      this.selectBoth(currentState);
    }

    // Update state
    currentState.lastClickedHalf = clickedHalf;
    currentState.lastClickTime = now;
    currentState.clickCount++;
    this.splitStates.set(stateKey, currentState);

    console.log('isFirstEverClick', isFirstEverClick, currentState);

    return true; // Handled
  }

  /**
   * Determine which half of the split point was clicked
   */
  private determineClickedHalf(element: Element, clickPosition: Point, commandId: string, counterpartId: string): 'initial' | 'final' {
    // Get the command info to determine which is initial vs final
    const store = useEditorStore.getState();
    const commandInfo = this.findCommandInStore(commandId, store);

    if (!commandInfo) return 'initial';

    // The element has data-command-id, so we know which command this path represents
    // If this element's data-command-id is the initial command (index 0), it's the green side
    // If this element's data-command-id is the final command, it's the red side
    const isElementInitialCommand = commandInfo.commandIndex === 0;

    // In the visual rendering:
    // - Green path has data-command-id of initial command (index 0) 
    // - Red path has data-command-id of final command (last index)

    return isElementInitialCommand ? 'initial' : 'final';
  }

  /**
   * Find the counterpart command (initial <-> final)
   */
  private findCounterpartCommand(commandId: string): string | null {
    const store = useEditorStore.getState();
    const commandInfo = this.findCommandInStore(commandId, store);

    if (!commandInfo) return null;

    const { subPath, commandIndex } = commandInfo;

    // If this is initial command (index 0), counterpart is final (last)
    if (commandIndex === 0) {
      const finalCommand = subPath.commands[subPath.commands.length - 1];
      return finalCommand.id;
    }

    // If this is final command, counterpart is initial (first)
    if (commandIndex === subPath.commands.length - 1) {
      const initialCommand = subPath.commands[0];
      return initialCommand.id;
    }

    return null; // Not a split point scenario
  }

  /**
   * Find command information in the store
   */
  private findCommandInStore(commandId: string, store: any): {
    command: any;
    subPath: any;
    commandIndex: number;
  } | null {
    for (const path of store.paths) {
      for (const subPath of path.subPaths) {
        for (let i = 0; i < subPath.commands.length; i++) {
          const command = subPath.commands[i];
          if (command.id === commandId) {
            return { command, subPath, commandIndex: i };
          }
        }
      }
    }
    return null;
  }

  /**
   * Create initial state for a split point pair
   */
  private createInitialState(commandId: string, counterpartId: string): SplitPointState {
    const store = useEditorStore.getState();
    const commandInfo = this.findCommandInStore(commandId, store);

    // Determine which command is initial (index 0) and which is final
    let initialId = commandId;
    let finalId = counterpartId;

    if (commandInfo) {
      if (commandInfo.commandIndex === 0) {
        // commandId is initial, counterpartId is final
        initialId = commandId;
        finalId = counterpartId;
      } else {
        // commandId is final, counterpartId is initial
        initialId = counterpartId;
        finalId = commandId;
      }
    }

    return {
      bothSelected: false,
      lastClickedHalf: null,
      clickCount: 0,
      commandIds: { initial: initialId, final: finalId },
      lastClickTime: 0
    };
  }

  /**
   * Select both commands in the split point
   */
  private selectBoth(state: SplitPointState): void {
    const store = useEditorStore.getState();

    // Select both commands (clear other selections)
    const commandsToSelect = [state.commandIds.initial, state.commandIds.final];

    store.selectMultiple(commandsToSelect, 'commands');
    state.bothSelected = true;
  }

  /**
   * Select individual command
   */
  private selectIndividual(commandId: string, state: SplitPointState): void {
    const store = useEditorStore.getState();
    // Clear other selections and select only this command
    store.selectMultiple([commandId], 'commands');
    state.bothSelected = false;
  }

  /**
   * Get unique key for split state
   */
  private getSplitStateKey(commandId1: string, commandId2: string): string {
    // Always use same order for consistent key
    return [commandId1, commandId2].sort().join('-');
  }

  /**
   * Clear split states (useful for cleanup)
   */
  clearStates(): void {
    this.splitStates.clear();
  }

  /**
   * Clear states when selection changes externally
   */
  clearStatesOnSelectionChange(): void {
    this.splitStates.clear();
  }

  /**
   * Get current state for debugging
   */
  getSplitState(commandId1: string, commandId2: string): SplitPointState | null {
    const key = this.getSplitStateKey(commandId1, commandId2);
    return this.splitStates.get(key) || null;
  }
}

// Export singleton instance
export const splitPointManager = new SplitPointManager();