import React from 'react';
import { Plugin } from '../../core/PluginSystem';
import { shapeManager, shapePointerHandlers } from './ShapeManager';
import { ShapesUI } from './ShapesUI';




export const ShapesPlugin: Plugin = {
  id: 'shapes',
  name: 'Shapes',
  version: '1.0.0',
  enabled: true,

  initialize: (editor) => {
    // Initialize the shape manager with the editor store
    shapeManager.setEditorStore(editor);
  },

  destroy: () => {
    // Clean up when plugin is destroyed
    shapeManager.stopShapeCreation();
  },

  shortcuts: [
    {
      key: 'Escape',
      description: 'Exit Shape Creation Mode',
      action: () => {
        shapeManager.stopShapeCreation();
      }
    }
  ],

  pointerHandlers: shapePointerHandlers,

  ui: [
    {
      id: 'shapes-panel',
      component: ShapesUI,
      position: 'sidebar',
      order: 3
    },

    // ...existing code...
  ]
};
