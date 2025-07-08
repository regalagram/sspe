import { Plugin } from '../../core/PluginSystem';
import { ShortcutsPanel } from './ShortcutsPanel';

export const ShortcutsPlugin: Plugin = {
  id: 'shortcuts',
  name: 'Shortcuts',
  version: '1.0.0',
  enabled: true,
  ui: [
    {
      id: 'shortcuts',
      component: ShortcutsPanel,
      position: 'sidebar',
      order: 100
    }
  ]
};
