import React, { useState, useEffect } from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { ArrangeUI } from './ArrangeUI';
import { arrangeManager } from './ArrangeManager';

const ArrangeComponent: React.FC = () => {
  const [showPanel, setShowPanel] = useState(false);
  const selection = useEditorStore((state) => state.selection);
  const hasSelection = selection.selectedSubPaths.length > 0;

  // Initialize arrange manager with editor store
  useEffect(() => {
    arrangeManager.setEditorStore(useEditorStore.getState());
    
    // Update arrange manager when store changes
    const unsubscribe = useEditorStore.subscribe((state) => {
      arrangeManager.setEditorStore(state);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Show/hide panel based on selection
  useEffect(() => {
    setShowPanel(hasSelection);
  }, [hasSelection]);

  return (
    <>
      {showPanel && (
        <ArrangeUI onClose={() => setShowPanel(false)} />
      )}
    </>
  );
};

export const ArrangePlugin: Plugin = {
  id: 'arrange',
  name: 'Arrange',
  version: '1.0.0',
  enabled: true,

  initialize: (editor) => {
    // Initialize the arrange manager with the editor store
    arrangeManager.setEditorStore(editor);
  },

  destroy: () => {
    // Clean up when plugin is destroyed
  },

  shortcuts: [
    {
      key: 'a',
      modifiers: ['shift'],
      description: 'Focus First SubPath (shows Arrange panel)',
      action: () => {
        // Focus first available subpath to trigger arrange panel
        const store = useEditorStore.getState();
        if (store.paths.length > 0 && store.paths[0].subPaths.length > 0) {
          store.selectSubPath(store.paths[0].subPaths[0].id);
        }
      }
    },
    {
      key: 'l',
      modifiers: ['alt'],
      description: 'Align Left',
      action: () => {
        if (arrangeManager.hasValidSelection()) {
          arrangeManager.alignLeft();
        }
      }
    },
    {
      key: 'c',
      modifiers: ['alt'],
      description: 'Align Center',
      action: () => {
        if (arrangeManager.hasValidSelection()) {
          arrangeManager.alignCenter();
        }
      }
    },
    {
      key: 'r',
      modifiers: ['alt'],
      description: 'Align Right',
      action: () => {
        if (arrangeManager.hasValidSelection()) {
          arrangeManager.alignRight();
        }
      }
    },
    {
      key: 't',
      modifiers: ['alt'],
      description: 'Align Top',
      action: () => {
        if (arrangeManager.hasValidSelection()) {
          arrangeManager.alignTop();
        }
      }
    },
    {
      key: 'm',
      modifiers: ['alt'],
      description: 'Align Middle',
      action: () => {
        if (arrangeManager.hasValidSelection()) {
          arrangeManager.alignMiddle();
        }
      }
    },
    {
      key: 'b',
      modifiers: ['alt'],
      description: 'Align Bottom',
      action: () => {
        if (arrangeManager.hasValidSelection()) {
          arrangeManager.alignBottom();
        }
      }
    },
    {
      key: 'h',
      modifiers: ['alt', 'shift'],
      description: 'Flip Horizontally',
      action: () => {
        if (arrangeManager.hasValidSelection()) {
          arrangeManager.flipHorizontally();
        }
      }
    },
    {
      key: 'v',
      modifiers: ['alt', 'shift'],
      description: 'Flip Vertically',
      action: () => {
        if (arrangeManager.hasValidSelection()) {
          arrangeManager.flipVertically();
        }
      }
    }
  ],

  ui: [
    {
      id: 'arrange-ui',
      component: ArrangeComponent,
      position: 'sidebar',
      order: 4
    }
  ]
};
