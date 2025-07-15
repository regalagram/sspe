import { Plugin } from '../../core/PluginSystem';
import { GroupRenderer } from './GroupRenderer';

export const GroupRendererPlugin: Plugin = {
  id: 'group-renderer',
  name: 'Group Renderer',
  version: '1.0.0',
  enabled: true,
  
  ui: [
    {
      id: 'group-renderer',
      component: GroupRenderer,
      position: 'svg-content',
      order: 15 // Render groups before individual elements
    }
  ]
};