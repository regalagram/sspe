import { Plugin } from '../../core/PluginSystem';
import { ViewportDebugPanel } from './ViewportDebugPanel';

export const ViewportDebugPlugin: Plugin = {
  id: 'viewport-debug',
  name: 'Viewport Debug',
  version: '1.0.0',
  enabled: true,
  
  ui: [
    {
      id: 'viewport-debug-panel',
      component: ViewportDebugPanel,
      position: 'sidebar',
      order: 999 // Put at the end
    }
  ]
};