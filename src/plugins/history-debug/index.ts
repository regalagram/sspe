import { Plugin } from '../../core/PluginSystem';
import { HistoryDebugPanel } from './HistoryDebugPanel';

export const HistoryDebugPlugin: Plugin = {
  id: 'history-debug',
  name: 'History Debug',
  version: '1.0.0',
  enabled: true,

  ui: [
    {
      id: 'history-debug-panel',
      component: HistoryDebugPanel,
      position: 'sidebar',
      order: 20
    }
  ]
};
