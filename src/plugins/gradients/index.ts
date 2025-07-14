import { Plugin } from '../../core/PluginSystem';
import { GradientControls } from './GradientControls';

export const GradientPlugin: Plugin = {
  id: 'gradients',
  name: 'Gradients & Patterns',
  version: '1.0.0',
  enabled: true,
  
  ui: [
    {
      id: 'gradient-controls',
      component: GradientControls,
      position: 'sidebar',
      order: 15
    }
  ]
};