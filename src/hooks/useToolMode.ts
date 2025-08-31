import { useSyncExternalStore } from 'react';
import { toolModeManager } from '../managers/ToolModeManager';
import { shallowEqual } from '../utils/comparison-utils';

let lastSnapshot: any = null;
export function useToolModeState() {
  return useSyncExternalStore(
    (cb) => {
      toolModeManager['listeners'].push(cb);
      return () => {
        toolModeManager['listeners'] = toolModeManager['listeners'].filter(l => l !== cb);
      };
    },
    () => {
      // Cache snapshot to avoid infinite loop using efficient shallow comparison
      const snap = toolModeManager.getState();
      if (lastSnapshot && shallowEqual(lastSnapshot, snap)) {
        return lastSnapshot;
      }
      lastSnapshot = snap;
      return snap;
    }
  );
}
