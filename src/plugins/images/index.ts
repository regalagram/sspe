import { Plugin } from '../../core/PluginSystem';
import { ImageControls } from './ImageControls';

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
        input.onchange = (event) => {
          const file = (event.target as HTMLInputElement).files?.[0];
          if (file) {
            // This will be handled by the ImageControls component
            console.log('Image file selected via shortcut:', file.name);
          }
        };
        input.click();
      }
    }
  ],
};