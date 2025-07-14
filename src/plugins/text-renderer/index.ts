import { Plugin } from '../../core/PluginSystem';
import { TextRenderer } from './TextRenderer';

export const TextRendererPlugin: Plugin = {
  id: 'text-renderer',
  name: 'Text Renderer',
  version: '1.0.0',
  enabled: true,
  ui: [
    {
      id: 'text-renderer',
      component: TextRenderer,
      position: 'svg-content',
      order: 15, // Render after paths
    },
  ],
};