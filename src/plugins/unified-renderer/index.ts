import { Plugin } from '../../core/PluginSystem';
import { UnifiedRenderer } from '../../core/UnifiedRenderer';

export const UnifiedRendererPlugin: Plugin = {
  id: 'unified-renderer',
  name: 'Unified Renderer',
  version: '1.0.0',
  enabled: true,
  ui: [
    {
      id: 'unified-renderer',
      component: UnifiedRenderer,
      position: 'svg-content',
      order: 5, // Render in middle layer
    },
  ],
};
