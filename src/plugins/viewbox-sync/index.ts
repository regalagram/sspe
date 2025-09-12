import { Plugin } from '../../core/PluginSystem';
import { viewBoxManager } from '../../core/ViewBoxManager';
import { useEditorStore } from '../../store/editorStore';

let isInitialized = false;
let unsubscribeFunction: (() => void) | null = null;

export const ViewBoxSyncPlugin: Plugin = {
  id: 'viewbox-sync',
  name: 'ViewBox Synchronization',
  version: '1.0.0',
  enabled: true,
  
  initialize: (editor) => {
    if (isInitialized) {
      return;
    }

    isInitialized = true;

    // Set up the ViewBoxManager callback to update the store
    viewBoxManager.setUpdateCallback((viewBox, source) => {
      const { updateViewBox } = useEditorStore.getState();
      updateViewBox(viewBox, source);
    });

    // Initialize ViewBoxManager with auto-detection
    // Small delay to ensure DOM is ready
    setTimeout(() => {
      try {
        viewBoxManager.initialize();
        console.log('ViewBoxSync: ViewBoxManager initialized');

        // Perform initial viewBox calculation based on existing content
        const state = useEditorStore.getState();
        if (state.paths && state.paths.length > 0) {
          const { recalculateViewBox } = useEditorStore.getState();
          recalculateViewBox({
            useContentBounds: true,
            useContainerBounds: true,
            padding: 50 // Larger initial padding
          });
          console.log('ViewBoxSync: Initial viewBox calculated from content');
        } else {
          // No content yet, calculate from container
          const { updateViewBoxFromContainer } = useEditorStore.getState();
          updateViewBoxFromContainer({
            padding: 50
          });
          console.log('ViewBoxSync: Initial viewBox calculated from container');
        }
      } catch (error) {
        console.warn('ViewBoxSync: Failed to initialize ViewBoxManager:', error);
      }
    }, 100);

    // Listen for content changes to trigger viewBox updates
    unsubscribeFunction = useEditorStore.subscribe(
      (state) => ({
        paths: state.paths,
        texts: state.texts,
        groups: state.groups,
        images: state.images
      }),
      (current, previous) => {
        // Check if content has changed
        const contentChanged = 
          current.paths !== previous.paths ||
          current.texts !== previous.texts ||
          current.groups !== previous.groups ||
          current.images !== previous.images;

        if (contentChanged) {
          // Debounce viewBox updates to avoid excessive recalculation
          clearTimeout((window as any).__viewBoxUpdateTimeout);
          (window as any).__viewBoxUpdateTimeout = setTimeout(() => {
            try {
              const { recalculateViewBox } = useEditorStore.getState();
              recalculateViewBox({
                useContentBounds: true,
                useContainerBounds: false, // Prioritize content when content changes
                padding: 20
              });
              console.log('ViewBoxSync: ViewBox updated due to content changes');
            } catch (error) {
              console.warn('ViewBoxSync: Failed to update viewBox after content change:', error);
            }
          }, 300);
        }
      },
      {
        equalityFn: (a, b) => a === b,
      }
    );
  },

  destroy: () => {
    if (!isInitialized) {
      return;
    }

    // Clear any pending timeout
    if ((window as any).__viewBoxUpdateTimeout) {
      clearTimeout((window as any).__viewBoxUpdateTimeout);
      delete (window as any).__viewBoxUpdateTimeout;
    }

    // Unsubscribe from store
    if (unsubscribeFunction) {
      unsubscribeFunction();
      unsubscribeFunction = null;
    }

    // Destroy ViewBoxManager
    viewBoxManager.destroy();

    isInitialized = false;
    console.log('ViewBoxSync: Plugin destroyed');
  },

  shortcuts: [
    {
      key: 'r',
      modifiers: ['ctrl'],
      description: 'Recalculate ViewBox',
      action: () => {
        try {
          const { recalculateViewBox } = useEditorStore.getState();
          recalculateViewBox({
            useContentBounds: true,
            useContainerBounds: true
          });
          console.log('ViewBoxSync: ViewBox recalculated manually (Ctrl+R)');
        } catch (error) {
          console.warn('ViewBoxSync: Failed to recalculate viewBox manually:', error);
        }
      }
    }
  ]
};