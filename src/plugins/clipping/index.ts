import { Plugin } from '../../core/PluginSystem';
import { ClippingControls } from './ClippingControls';
import { ClippingRenderer } from './ClippingRenderer';

export const ClippingPlugin: Plugin = {
  id: 'clipping',
  name: 'Clipping & Masks',
  version: '1.0.0',
  enabled: true,
  
  ui: [
    {
      id: 'clipping-controls',
      component: ClippingControls,
      position: 'sidebar',
      order: 22
    },
    {
      id: 'clipping-renderer',
      component: ClippingRenderer,
      position: 'svg-content',
      order: 8
    }
  ],
  
  shortcuts: [
    {
      key: 'c',
      modifiers: ['ctrl', 'shift'],
      description: 'Create clip path from selection',
      action: () => {
        console.log('Create clip path from selection');
      }
    },
    {
      key: 'm',
      modifiers: ['ctrl', 'shift'],
      description: 'Create mask from selection',
      action: () => {
        console.log('Create mask from selection');
      }
    }
  ]
};