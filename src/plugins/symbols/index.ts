import { Plugin } from '../../core/PluginSystem';
import { SymbolControls } from './SymbolControls';
import { SymbolRenderer } from './SymbolRenderer';
import { symbolManager } from './SymbolManager';
import { useEditorStore } from '../../store/editorStore';

export const SymbolPlugin: Plugin = {
  id: 'symbols',
  name: 'Symbols & Library',
  version: '1.0.0',
  enabled: true,
  
  initialize: (editor) => {
    symbolManager.setEditorStore(editor);
  },
  
  pointerHandlers: {
    onPointerDown: symbolManager.handlePointerDown,
    onPointerMove: symbolManager.handlePointerMove,
    onPointerUp: symbolManager.handlePointerUp,
  },
  
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
        const symbolsControls = document.querySelector('[data-plugin="symbols"]');
        if (symbolsControls) {
          const createFromSelectionBtn = symbolsControls.querySelector('[data-action="create-from-selection"]');
          if (createFromSelectionBtn) {
            (createFromSelectionBtn as HTMLButtonElement).click();
          }
        }
      }
    },
    {
      key: 'u',
      modifiers: ['ctrl'],
      description: 'Instance selected symbol',
      action: () => {
        const symbolsControls = document.querySelector('[data-plugin="symbols"]');
        if (symbolsControls) {
          const firstUseBtn = symbolsControls.querySelector('[data-action="create-instance"]');
          if (firstUseBtn) {
            (firstUseBtn as HTMLButtonElement).click();
          }
        }
      }
    }
  ],

};