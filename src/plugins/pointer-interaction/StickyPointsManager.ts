import { useEditorStore } from '../../store/editorStore';
import { getAbsoluteCommandPosition } from '../../utils/path-utils';

interface Point {
  x: number;
  y: number;
}

interface StickyCandidate {
  commandId: string;
  position: Point;
  isInitial: boolean;
  isFinal: boolean;
}

interface StickyState {
  isActive: boolean;
  targetCommandId: string | null;
  targetPosition: Point | null;
  breakThreshold: number;
}

export class StickyPointsManager {
  private stickyRadius: number = 20; // pixels
  private breakThreshold: number = 35; // pixels to break sticky
  private currentStickyState: StickyState = {
    isActive: false,
    targetCommandId: null,
    targetPosition: null,
    breakThreshold: 35
  };

  /**
   * Check if a dragging command should stick to its counterpart
   * @param draggingCommandId - ID of the command being dragged
   * @param currentPosition - Current mouse position
   * @returns Object with sticky info or null
   */
  checkStickyBehavior(draggingCommandId: string, currentPosition: Point): {
    shouldStick: boolean;
    stickyPosition?: Point;
    targetCommandId?: string;
  } {
    const store = useEditorStore.getState();
    const { paths } = store;

    // Find the command and its subpath
    const commandInfo = this.findCommandInfo(draggingCommandId, paths);
    if (!commandInfo) return { shouldStick: false };

    const { command, subPath, commandIndex } = commandInfo;
    
    // Only apply sticky to initial/final commands
    const isInitialCommand = commandIndex === 0;
    const isFinalCommand = commandIndex === subPath.commands.length - 1;
    
    if (!isInitialCommand && !isFinalCommand) {
      return { shouldStick: false };
    }

    // Find the counterpart command
    const targetCommand = this.findCounterpartCommand(subPath, isInitialCommand);
    if (!targetCommand) return { shouldStick: false };

    // Get target position
    const targetPosition = getAbsoluteCommandPosition(targetCommand, subPath, [{ subPaths: [subPath] }]);
    if (!targetPosition) return { shouldStick: false };

    // Calculate distance to target
    const distance = this.calculateDistance(currentPosition, targetPosition);

    // Check if we should stick or break existing sticky
    if (this.currentStickyState.isActive) {
      // Already sticky - check if we should break
      if (distance > this.breakThreshold) {
        this.clearSticky();
        return { shouldStick: false };
      }
      // Stay sticky
      return {
        shouldStick: true,
        stickyPosition: this.currentStickyState.targetPosition!,
        targetCommandId: this.currentStickyState.targetCommandId!
      };
    } else {
      // Not sticky - check if we should stick
      if (distance <= this.stickyRadius) {
        this.activateSticky(targetCommand.id, targetPosition);
        return {
          shouldStick: true,
          stickyPosition: targetPosition,
          targetCommandId: targetCommand.id
        };
      }
    }

    return { shouldStick: false };
  }

  /**
   * Clear sticky state
   */
  clearSticky(): void {
    const wasActive = this.currentStickyState.isActive;
    this.currentStickyState = {
      isActive: false,
      targetCommandId: null,
      targetPosition: null,
      breakThreshold: this.breakThreshold
    };
    
    // Force re-render if sticky was active
    if (wasActive) {
      const store = useEditorStore.getState();
      store.forceRender();
    }
  }

  /**
   * Get current sticky state for visual feedback
   */
  getStickyState(): StickyState {
    return { ...this.currentStickyState };
  }

  private findCommandInfo(commandId: string, paths: any[]): {
    command: any;
    subPath: any;
    commandIndex: number;
  } | null {
    for (const path of paths) {
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

  private findCounterpartCommand(subPath: any, isDraggingInitial: boolean): any | null {
    if (subPath.commands.length < 2) return null;

    if (isDraggingInitial) {
      // Dragging initial, target is final
      return subPath.commands[subPath.commands.length - 1];
    } else {
      // Dragging final, target is initial
      return subPath.commands[0];
    }
  }

  private calculateDistance(point1: Point, point2: Point): number {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private activateSticky(targetCommandId: string, targetPosition: Point): void {
    const wasActive = this.currentStickyState.isActive;
    this.currentStickyState = {
      isActive: true,
      targetCommandId,
      targetPosition: { ...targetPosition },
      breakThreshold: this.breakThreshold
    };
    
    // Force re-render when activating sticky
    if (!wasActive) {
      const store = useEditorStore.getState();
      store.forceRender();
    }
  }
}

// Export singleton instance
export const stickyPointsManager = new StickyPointsManager();