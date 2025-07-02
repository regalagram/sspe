import React, { useState, useEffect } from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { ReorderUI } from './ReorderUI';
import { reorderManager } from './ReorderManager';

const ReorderComponent: React.FC = () => {
  const [showPanel, setShowPanel] = useState(false);
  const selection = useEditorStore((state) => state.selection);
  const hasSelection = selection.selectedSubPaths.length > 0;

  // Initialize reorder manager with editor store
  useEffect(() => {
    reorderManager.setEditorStore(useEditorStore.getState());
    
    // Update reorder manager when store changes
    const unsubscribe = useEditorStore.subscribe((state) => {
      reorderManager.setEditorStore(state);
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
        <ReorderUI onClose={() => setShowPanel(false)} />
      )}
    </>
  );
};

export const ReorderPlugin: Plugin = {
  id: 'reorder',
  name: 'Reorder',
  version: '1.0.0',
  enabled: true,

  initialize: (editor) => {
    // Initialize the reorder manager with the editor store
    reorderManager.setEditorStore(editor);
  },

  destroy: () => {
    // Clean up when plugin is destroyed
  },

  shortcuts: [
    {
      key: ']',
      modifiers: ['shift'],
      description: 'Bring to Front',
      action: () => {
        if (reorderManager.hasValidSelection()) {
          reorderManager.bringToFront();
        }
      }
    },
    {
      key: ']',
      modifiers: [],
      description: 'Bring Forward',
      action: () => {
        if (reorderManager.hasValidSelection()) {
          reorderManager.bringForward();
        }
      }
    },
    {
      key: '[',
      modifiers: [],
      description: 'Send Backward',
      action: () => {
        if (reorderManager.hasValidSelection()) {
          reorderManager.sendBackward();
        }
      }
    },
    {
      key: '[',
      modifiers: ['shift'],
      description: 'Send to Back',
      action: () => {
        if (reorderManager.hasValidSelection()) {
          reorderManager.sendToBack();
        }
      }
    }
  ],

  ui: [
    {
      id: 'reorder-component',
      component: ReorderComponent,
      position: 'sidebar',
      order: 3
    }
  ]
};
