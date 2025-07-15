import { Plugin } from '../../core/PluginSystem';
import { GuidelinesControls } from './GuidelinesControls';
import { GuidelinesRenderer } from './GuidelinesRenderer';
import { useEditorStore } from '../../store/editorStore';

export const GuidelinesPlugin: Plugin = {
  id: 'guidelines',
  name: 'Guidelines',
  version: '1.0.0',
  enabled: true,
  
  shortcuts: [
    {
      key: 'g',
      modifiers: ['ctrl'],
      description: 'Toggle Guidelines',
      action: () => {
        const store = useEditorStore.getState();
        store.toggleFeature('guidelinesEnabled');
      }
    },
    {
      key: 'g',
      modifiers: ['ctrl', 'shift'],
      description: 'Toggle Grid Snapping',
      action: () => {
        // This could be expanded to toggle specific guide types
        const store = useEditorStore.getState();
        store.toggleFeature('guidelinesEnabled');
      }
    }
  ],
  
  ui: [
    {
      id: 'guidelines-controls',
      component: GuidelinesControls,
      position: 'sidebar',
      order: 6
    },
    {
      id: 'guidelines-renderer',
      component: GuidelinesRenderer,
      position: 'svg-content',
      order: 25, // Render above paths but below control points
    }
  ]
};

// Export components for potential use elsewhere
export { GuidelinesControls } from './GuidelinesControls';
export { GuidelinesRenderer } from './GuidelinesRenderer';
export { guidelinesManager, GuidelinesManager } from './GuidelinesManager';