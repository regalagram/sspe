import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { AnimationControls } from '../../components/AnimationControls';
import { AnimationTimeline } from '../../components/AnimationTimeline';
import { AnimationRenderer, AnimationTimer } from '../../components/AnimationRenderer';

export const AnimationSystemPlugin: Plugin = {
  id: 'animation-system',
  name: 'Animation System',
  version: '1.0.0',
  enabled: true,
  
  ui: [
    {
      id: 'animation-controls',
      component: AnimationControls,
      position: 'sidebar',
      order: 15
    },
    {
      id: 'animation-timeline',
      component: AnimationTimeline,
      position: 'sidebar',
      order: 16
    },
    {
      id: 'animation-renderer',
      component: AnimationRenderer,
      position: 'svg-content',
      order: 25
    },
    {
      id: 'animation-timer',
      component: AnimationTimer,
      position: 'svg-content',
      order: 26
    }
  ],
  
  shortcuts: [
    {
      key: 'space',
      description: 'Play/Pause animation',
      action: () => {
        const store = useEditorStore.getState();
        if (store.animationState.isPlaying) {
          store.pauseAnimations();
        } else {
          store.playAnimations();
        }
      }
    },
    {
      key: 'a',
      modifiers: ['ctrl'],
      description: 'Add animation to selected element',
      action: () => {
        const store = useEditorStore.getState();
        const selection = store.selection;
        
        // Get first selected element
        let targetElementId: string | null = null;
        
        if (selection.selectedPaths.length > 0) {
          targetElementId = selection.selectedPaths[0];
        } else if (selection.selectedTexts.length > 0) {
          targetElementId = selection.selectedTexts[0];
        } else if (selection.selectedGroups.length > 0) {
          targetElementId = selection.selectedGroups[0];
        }
        
        if (targetElementId) {
          store.createFadeAnimation(targetElementId, '2s', '1', '0.5');
        }
      }
    },
    {
      key: 'r',
      modifiers: ['ctrl'],
      description: 'Add rotate animation to selected element',
      action: () => {
        const store = useEditorStore.getState();
        const selection = store.selection;
        
        let targetElementId: string | null = null;
        
        if (selection.selectedPaths.length > 0) {
          targetElementId = selection.selectedPaths[0];
        } else if (selection.selectedTexts.length > 0) {
          targetElementId = selection.selectedTexts[0];
        } else if (selection.selectedGroups.length > 0) {
          targetElementId = selection.selectedGroups[0];
        }
        
        if (targetElementId) {
          store.createRotateAnimation(targetElementId, '2s', '360');
        }
      }
    }
  ],
  
  initialize: () => {
    // Plugin initialization - animation duration will be calculated dynamically
  },
  
  pointerHandlers: {
    onPointerDown: (e, context) => {
      const element = e.target as SVGElement;
      const elementType = element.dataset.elementType;
      
      if (elementType === 'animation-control') {
        // Handle animation control interactions
        return true;
      }
      
      return false;
    }
  }
};