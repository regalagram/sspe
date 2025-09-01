import { Plugin } from '../../core/PluginSystem';
import { shapeManager, shapePointerHandlers } from './ShapeManager';
import { ShapesUI } from './ShapesUI';
import { ShapePreview } from '../../components/ShapePreview';

export const ShapesPlugin: Plugin = {
  id: 'shapes',
  name: 'Shapes',
  version: '1.0.0',
  enabled: true,
  initialize: (editor) => {
    shapeManager.setEditorStore(editor);
  },
  destroy: () => {
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
    {
      id: 'shapes-preview',
      component: ShapePreview,
      position: 'svg-content',
      order: 100
    }
  ]
};
