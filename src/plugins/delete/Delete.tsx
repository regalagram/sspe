import React from 'react';
import { Trash2 } from 'lucide-react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { DraggablePanel } from '../../components/DraggablePanel';

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
      <button
        onClick={onDelete}
        disabled={!hasSelection}
        style={{
          padding: '8px 16px',
          backgroundColor: hasSelection ? '#ff4444' : '#cccccc',
          color: hasSelection ? 'white' : '#666666',
          border: 'none',
          borderRadius: '4px',
          cursor: hasSelection ? 'pointer' : 'not-allowed',
          fontSize: '12px',
          fontWeight: 'bold',
          transition: 'background-color 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title={hasSelection ? 'Delete selected elements' : 'No elements selected'}
      >
        <Trash2 size={16} style={{ marginRight: '8px' }} />
        Delete
      </button>
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

    // Clear selection after deletion
    clearSelection();
  };

  return (
    <DraggablePanel 
      title="Delete"
      initialPosition={{ x: 980, y: 240 }}
      id="delete-control"
    >
      <DeleteControl
        onDelete={handleDelete}
        hasSelection={hasSelection}
      />
    </DraggablePanel>
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
