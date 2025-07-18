import React from 'react';
import { Plugin } from '../../core/PluginSystem';
import { TextPathControls } from './TextPathControls';
import { TextPathRenderer } from './TextPathRenderer';

export const TextPathPlugin: Plugin = {
  id: 'textpath',
  name: 'TextPath',
  version: '1.0.0',
  enabled: true,
  
  shortcuts: [
    {
      key: 't',
      modifiers: ['ctrl', 'shift'],
      description: 'Create TextPath on selected path',
      action: () => {
        const store = (window as any).__editorStore__;
        if (store) {
          const state = store.getState();
          const selectedSubPaths = state.selection.selectedSubPaths;
          
          if (selectedSubPaths.length > 0) {
            const textPathId = state.addTextPath(selectedSubPaths[0], 'Text on path', 0);
            state.selectTextPath(textPathId);
          } else {
            alert('Please select a path first to create a TextPath');
          }
        }
      }
    },
    {
      key: 'Delete',
      modifiers: [],
      description: 'Delete selected TextPath elements',
      action: () => {
        const store = (window as any).__editorStore__;
        if (store) {
          const state = store.getState();
          const selectedTextPaths = state.selection.selectedTextPaths;
          
          if (selectedTextPaths.length > 0) {
            selectedTextPaths.forEach((id: string) => state.removeTextPath(id));
            state.clearSelection();
          }
        }
      }
    }
  ],
  
  ui: [
    {
      id: 'textpath-controls',
      component: TextPathControls,
      position: 'sidebar',
      order: 15
    },
    {
      id: 'textpath-renderer',
      component: TextPathRenderer,
      position: 'svg-content',
      order: 25
    }
  ]
};