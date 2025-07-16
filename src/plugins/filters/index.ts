import { Plugin } from '../../core/PluginSystem';
import { FilterControls } from './FilterControls';
import { FilterRenderer } from './FilterRenderer';

export const FilterPlugin: Plugin = {
  id: 'filters',
  name: 'Filters & Effects',
  version: '1.0.0',
  enabled: true,
  
  ui: [
    {
      id: 'filter-controls',
      component: FilterControls,
      position: 'sidebar',
      order: 25
    },
    {
      id: 'filter-renderer',
      component: FilterRenderer,
      position: 'svg-content',
      order: 5
    }
  ],
  
  shortcuts: [
    {
      key: 'f',
      modifiers: ['ctrl', 'shift'],
      description: 'Toggle filters panel',
      action: () => {
        // This would toggle the filters panel if implemented
        console.log('Toggle filters panel');
      }
    }
  ]
};