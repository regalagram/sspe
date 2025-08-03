import { Plugin } from '../../core/PluginSystem';
import { KeyboardMovementControls } from '../../components/KeyboardMovementControls';

export const KeyboardMovementPlugin: Plugin = {
  id: 'keyboard-movement',
  name: 'Keyboard Movement',
  version: '1.0.0',
  enabled: true,

  ui: [
    {
      id: 'keyboard-movement-controls',
      component: KeyboardMovementControls,
      position: 'sidebar',
      order: 25
    }
  ],

  shortcuts: [
    {
      key: 'ArrowUp',
      description: 'Move selected elements up',
      action: () => {
        // Action is handled by the component
      }
    },
    {
      key: 'ArrowDown', 
      description: 'Move selected elements down',
      action: () => {
        // Action is handled by the component
      }
    },
    {
      key: 'ArrowLeft',
      description: 'Move selected elements left', 
      action: () => {
        // Action is handled by the component
      }
    },
    {
      key: 'ArrowRight',
      description: 'Move selected elements right',
      action: () => {
        // Action is handled by the component
      }
    },
    {
      key: 'Shift+ArrowUp',
      description: 'Move selected elements up (fast)',
      action: () => {
        // Action is handled by the component
      }
    },
    {
      key: 'Shift+ArrowDown',
      description: 'Move selected elements down (fast)', 
      action: () => {
        // Action is handled by the component
      }
    },
    {
      key: 'Shift+ArrowLeft',
      description: 'Move selected elements left (fast)',
      action: () => {
        // Action is handled by the component
      }
    },
    {
      key: 'Shift+ArrowRight', 
      description: 'Move selected elements right (fast)',
      action: () => {
        // Action is handled by the component
      }
    }
  ],

  handleKeyDown: (e: KeyboardEvent) => {
    // Arrow keys for movement
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      // Prevent default scrolling behavior
      e.preventDefault();
      
      // The actual movement logic is handled by KeyboardMovementControls
      // This just prevents default behavior and indicates we want to handle this key
      return true;
    }
    
    return false;
  }
};