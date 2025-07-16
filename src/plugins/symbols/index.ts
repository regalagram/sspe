import { Plugin } from '../../core/PluginSystem';
import { SymbolControls } from './SymbolControls';
import { SymbolRenderer } from './SymbolRenderer';
import { useEditorStore } from '../../store/editorStore';

export const SymbolPlugin: Plugin = {
  id: 'symbols',
  name: 'Symbols & Library',
  version: '1.0.0',
  enabled: true,
  
  ui: [
    {
      id: 'symbol-controls',
      component: SymbolControls,
      position: 'sidebar',
      order: 24
    },
    {
      id: 'symbol-renderer',
      component: SymbolRenderer,
      position: 'svg-content',
      order: 15
    }
  ],
  
  shortcuts: [
    {
      key: 's',
      modifiers: ['ctrl', 'shift'],
      description: 'Create symbol from selection',
      action: () => {
        console.log('Create symbol from selection');
      }
    },
    {
      key: 'u',
      modifiers: ['ctrl'],
      description: 'Instance selected symbol',
      action: () => {
        console.log('Instance selected symbol');
      }
    }
  ],

};