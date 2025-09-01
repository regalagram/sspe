import { Plugin } from '../../core/PluginSystem';
import { TextStyleControlsComponent } from './TextStyleControls';
import { textFloatingActionDefinition } from './FloatingTextActions';

export const TextStylePlugin: Plugin = {
  id: 'text-style',
  name: 'Text Style',
  version: '1.0.0',
  enabled: true,
  
  ui: [
    {
      id: 'text-style-controls',
      component: TextStyleControlsComponent,
      position: 'sidebar',
      order: 15
    }
  ],

  floatingActions: [textFloatingActionDefinition]
};