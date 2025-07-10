import React from 'react';
import { Trash2 } from 'lucide-react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { PluginButton } from '../../components/PluginButton';

interface DeleteControlProps {
  onDelete: () => void;
  hasSelection: boolean;
}

export const DeleteControl: React.FC<DeleteControlProps> = ({
  onDelete,
  hasSelection,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <PluginButton
        icon={<Trash2 size={16} />}
        text="Delete"
        color="#ff4444"
        active={hasSelection}
        disabled={!hasSelection}
        onClick={onDelete}
        fullWidth={true}
      />
      {hasSelection && (
        <div style={{ fontSize: '10px', color: '#666', textAlign: 'center' }}>
          Press Delete key or click button
        </div>
      )}
    </div>
  );
};

export const DeleteComponent: React.FC = () => {
  const { 
    selection, 
    removePath, 
    removeSubPath, 
    removeCommand, 
    clearSelection,
    pushToHistory 
  } = useEditorStore();

  const hasSelection = 
    selection.selectedPaths.length > 0 || 
    selection.selectedSubPaths.length > 0 || 
    selection.selectedCommands.length > 0;

  const handleDelete = () => {
    if (!hasSelection) return;

    // Save current state to history before deletion
    pushToHistory();

    // Delete selected paths
    selection.selectedPaths.forEach(pathId => {
      removePath(pathId);
    });

    // Delete selected subpaths
    selection.selectedSubPaths.forEach(subPathId => {
      removeSubPath(subPathId);
    });

    // Delete selected commands
    selection.selectedCommands.forEach(commandId => {
      removeCommand(commandId);
    });

    // Eliminar paths vacíos
    setTimeout(() => {
      const state = useEditorStore.getState();
      state.paths.forEach(path => {
        if (path.subPaths.length === 0) {
          state.removePath(path.id);
        }
      });
    }, 0);

    // Clear selection after deletion
    clearSelection();
  };

  return (
    <div>
      <DeleteControl
        onDelete={handleDelete}
        hasSelection={hasSelection}
      />
    </div>
  );
};

export const DeletePlugin: Plugin = {
  id: 'delete',
  name: 'Delete',
  version: '1.0.0',
  enabled: true,
  
  shortcuts: [
    {
      key: 'Delete',
      description: 'Delete selected elements',
      action: () => {
        const state = useEditorStore.getState();
        const hasSelection = 
          state.selection.selectedPaths.length > 0 || 
          state.selection.selectedSubPaths.length > 0 || 
          state.selection.selectedCommands.length > 0;

        if (!hasSelection) return;

        // Save current state to history before deletion
        state.pushToHistory();

        // Delete selected paths
        state.selection.selectedPaths.forEach(pathId => {
          state.removePath(pathId);
        });

        // Delete selected subpaths
        state.selection.selectedSubPaths.forEach(subPathId => {
          state.removeSubPath(subPathId);
        });

        // Delete selected commands
        state.selection.selectedCommands.forEach(commandId => {
          state.removeCommand(commandId);
        });

        // Eliminar paths vacíos
        setTimeout(() => {
          const current = useEditorStore.getState();
          current.paths.forEach(path => {
            if (path.subPaths.length === 0) {
              current.removePath(path.id);
            }
          });
        }, 0);

        // Clear selection after deletion
        state.clearSelection();
      }
    },
    {
      key: 'Backspace',
      description: 'Delete selected elements (Alternative)',
      action: () => {
        const state = useEditorStore.getState();
        const hasSelection = 
          state.selection.selectedPaths.length > 0 || 
          state.selection.selectedSubPaths.length > 0 || 
          state.selection.selectedCommands.length > 0;

        if (!hasSelection) return;

        // Save current state to history before deletion
        state.pushToHistory();

        // Delete selected paths
        state.selection.selectedPaths.forEach(pathId => {
          state.removePath(pathId);
        });

        // Delete selected subpaths
        state.selection.selectedSubPaths.forEach(subPathId => {
          state.removeSubPath(subPathId);
        });

        // Delete selected commands
        state.selection.selectedCommands.forEach(commandId => {
          state.removeCommand(commandId);
        });

        // Clear selection after deletion
        state.clearSelection();
      }
    },
    {
      key: 'd',
      modifiers: ['ctrl'],
      description: 'Delete selected elements (Ctrl+D)',
      action: () => {
        const state = useEditorStore.getState();
        const hasSelection = 
          state.selection.selectedPaths.length > 0 || 
          state.selection.selectedSubPaths.length > 0 || 
          state.selection.selectedCommands.length > 0;

        if (!hasSelection) return;

        // Save current state to history before deletion
        state.pushToHistory();

        // Delete selected paths
        state.selection.selectedPaths.forEach(pathId => {
          state.removePath(pathId);
        });

        // Delete selected subpaths
        state.selection.selectedSubPaths.forEach(subPathId => {
          state.removeSubPath(subPathId);
        });

        // Delete selected commands
        state.selection.selectedCommands.forEach(commandId => {
          state.removeCommand(commandId);
        });

        // Clear selection after deletion
        state.clearSelection();
      }
    }
  ],
  
  ui: [
    {
      id: 'delete-control',
      component: DeleteComponent,
      position: 'toolbar',
      order: 5
    }
  ]
};
