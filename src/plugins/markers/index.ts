import { Plugin } from '../../core/PluginSystem';
import { MarkerControls } from './MarkerControls';
import { MarkerRenderer } from './MarkerRenderer';

export const MarkerPlugin: Plugin = {
  id: 'markers',
  name: 'Markers',
  version: '1.0.0',
  enabled: true,
  
  ui: [
    {
      id: 'marker-controls',
      component: MarkerControls,
      position: 'sidebar',
      order: 23
    },
    {
      id: 'marker-renderer',
      component: MarkerRenderer,
      position: 'svg-content',
      order: 10
    }
  ],
  
  shortcuts: [
    {
      key: 'a',
      modifiers: ['ctrl', 'shift'],
      description: 'Add arrow markers to selected path',
      action: () => {
        const markersControls = document.querySelector('[data-plugin="markers"]');
        if (markersControls) {
          const endArrowBtn = markersControls.querySelector('[data-action="quick-end-arrow"]');
          if (endArrowBtn) {
            (endArrowBtn as HTMLButtonElement).click();
          }
        }
      }
    }
  ]
};