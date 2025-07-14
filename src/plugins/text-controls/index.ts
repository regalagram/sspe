import { Plugin } from '../../core/PluginSystem';
import { TextControls } from './TextControls';

export const TextControlsPlugin: Plugin = {
  id: 'text-controls',
  name: 'Text',
  version: '1.0.0',
  enabled: true,
  
  ui: [
    {
      id: 'text-controls',
      component: TextControls,
      position: 'sidebar',
      order: 20
    }
  ]
};