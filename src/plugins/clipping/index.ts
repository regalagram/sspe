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
        const clippingControls = document.querySelector('[data-plugin="clipping"]');
        if (clippingControls) {
          const createClipBtn = clippingControls.querySelector('[data-action="create-clip-from-selection"]');
          if (createClipBtn) {
            (createClipBtn as HTMLButtonElement).click();
          }
        }
      }
    },
    {
      key: 'm',
      modifiers: ['ctrl', 'shift'],
      description: 'Create mask from selection',
      action: () => {
        const clippingControls = document.querySelector('[data-plugin="clipping"]');
        if (clippingControls) {
          const createMaskBtn = clippingControls.querySelector('[data-action="create-mask-from-selection"]');
          if (createMaskBtn) {
            (createMaskBtn as HTMLButtonElement).click();
          }
        }
      }
    }
  ]
};