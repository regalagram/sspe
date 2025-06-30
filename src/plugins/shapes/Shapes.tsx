import React from 'react';
import { Plugin } from '../../core/PluginSystem';
import { shapeManager, shapeMouseHandlers } from './ShapeManager';
import { ShapesUI } from './ShapesUI';
import { ShapePreview, useShapeCursor } from './ShapeCursor';

// Component that combines the cursor functionality
const ShapeCursorWrapper: React.FC = () => {
  useShapeCursor();
  return null; // No DOM element needed, just the hook
};

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
      key: 's',
      modifiers: ['shift'],
      description: 'Focus Shapes Panel',
      action: () => {
        // Focus the shapes panel or bring it to front
        const shapesPanel = document.querySelector('[data-panel-id="shapes-panel"]') as HTMLElement;
        if (shapesPanel) {
          shapesPanel.click(); // This will bring it to front via the panel's click handler
        }
      }
    },
    {
      key: 'Escape',
      description: 'Exit Shape Creation Mode',
      action: () => {
        if (shapeManager.isInShapeCreationMode()) {
          shapeManager.stopShapeCreation();
        }
      }
    }
  ],

  mouseHandlers: shapeMouseHandlers,

  ui: [
    {
      id: 'shapes-panel',
      component: ShapesUI,
      position: 'sidebar',
      order: 3
    },
    {
      id: 'shape-cursor-hook',
      component: ShapeCursorWrapper,
      position: 'sidebar',
      order: 999 // Hidden component for cursor management
    },
    {
      id: 'shape-preview',
      component: ShapePreview,
      position: 'svg-content',
      order: 1000 // Render on top of everything in SVG
    }
  ]
};
