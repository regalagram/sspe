import { Plugin } from '../../core/PluginSystem';
import { ImageControls } from './ImageControls';
import { ImageRenderer } from './ImageRenderer';
import { useEditorStore } from '../../store/editorStore';

export const ImagePlugin: Plugin = {
  id: 'images',
  name: 'Images',
  version: '1.0.0',
  enabled: true,
  
  ui: [
    {
      id: 'image-controls',
      component: ImageControls,
      position: 'sidebar',
      order: 20
    },
    {
      id: 'image-renderer',
      component: ImageRenderer,
      position: 'svg-content',
      order: 30
    }
  ],
  
  shortcuts: [
    {
      key: 'i',
      modifiers: ['ctrl'],
      description: 'Add image',
      action: () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.click();
      }
    }
  ],

};