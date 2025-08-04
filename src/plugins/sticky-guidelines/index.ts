import { Plugin } from '../../core/PluginSystem';
import { StickyControls } from './StickyControls';
import { StickyRenderer } from './StickyRenderer';
import { useEditorStore } from '../../store/editorStore';

export const StickyGuidelinesPlugin: Plugin = {
  id: 'sticky-guidelines',
  name: 'Sticky Guidelines',
  version: '1.0.0',
  enabled: true,
  
  shortcuts: [
    {
      key: 'g',
      modifiers: ['ctrl'],
      description: 'Toggle Sticky Guidelines',
      action: () => {
        const store = useEditorStore.getState();
        store.toggleFeature('stickyGuidelinesEnabled');
      }
    }
  ],
  
  ui: [
    {
      id: 'sticky-guidelines-controls',
      component: StickyControls,
      position: 'sidebar',
      order: 50
    },
    {
      id: 'sticky-guidelines-renderer',
      component: StickyRenderer,
      position: 'svg-content',
      order: 25
    }
  ]
};

export { StickyControls } from './StickyControls';
export { StickyRenderer } from './StickyRenderer';
export { stickyManager, StickyManager } from './StickyManager';