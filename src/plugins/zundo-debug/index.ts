import { Plugin } from '../../core/PluginSystem';
import { ZundoDebugPanel } from '../../components/ZundoDebugPanel';

export const ZundoDebugPlugin: Plugin = {
  id: 'zundo-debug',
  name: 'Zundo Debug',
  version: '1.0.0',
  enabled: true,

  ui: [
    {
      id: 'zundo-debug-panel',
      component: ZundoDebugPanel,
      position: 'sidebar',
      order: 20
    }
  ]
};