import { useSyncExternalStore } from 'react';
import { toolModeManager } from '../managers/ToolModeManager';

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
      // Cache snapshot to avoid infinite loop
      const snap = toolModeManager.getState();
      if (lastSnapshot && JSON.stringify(lastSnapshot) === JSON.stringify(snap)) {
        return lastSnapshot;
      }
      lastSnapshot = snap;
      return snap;
    }
  );
}
