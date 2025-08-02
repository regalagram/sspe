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
        onPointerDown={onDelete}
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

// Método reutilizable para ejecutar la secuencia de borrado
export function executeDelete(editorState?: any) {
  // Si se pasa un estado, usarlo; si no, usar el hook actual
  const state = editorState ?? useEditorStore.getState();

  const hasSelection =
    state.selection.selectedPaths.length > 0 ||
    state.selection.selectedSubPaths.length > 0 ||
    state.selection.selectedCommands.length > 0 ||
    state.selection.selectedTexts?.length > 0 ||
    state.selection.selectedTextPaths?.length > 0 ||
    state.selection.selectedGroups?.length > 0 ||
    state.selection.selectedImages?.length > 0 ||
    state.selection.selectedUses?.length > 0;
  if (!hasSelection) return;

  // Save current state to history before deletion
  state.pushToHistory();

  // Collect all element IDs that will be deleted for cleanup
  const elementsToDelete = new Set<string>([
    ...state.selection.selectedPaths,
    ...state.selection.selectedTexts || [],
    ...state.selection.selectedGroups || [],
    ...state.selection.selectedImages || [],
    ...state.selection.selectedUses || []
  ]);

  // Delete selected paths
  state.selection.selectedPaths.forEach((pathId: string) => {
    state.removePath(pathId);
  });

  // Delete selected subpaths
  state.selection.selectedSubPaths.forEach((subPathId: string) => {
    state.removeSubPath(subPathId);
  });

  // Delete selected commands
  state.selection.selectedCommands.forEach((commandId: string) => {
    state.removeCommand(commandId);
  });

  // Delete selected texts
  if (state.selection.selectedTexts) {
    state.selection.selectedTexts.forEach((textId: string) => {
      state.deleteText(textId);
    });
  }

  // Delete selected textPaths
  if (state.selection.selectedTextPaths) {
    state.selection.selectedTextPaths.forEach((textPathId: string) => {
      state.removeTextPath(textPathId);
    });
  }

  // Delete selected groups
  if (state.selection.selectedGroups) {
    state.selection.selectedGroups.forEach((groupId: string) => {
      state.removeGroup(groupId);
    });
  }

  // Delete selected images
  if (state.selection.selectedImages) {
    state.selection.selectedImages.forEach((imageId: string) => {
      state.removeImage(imageId);
    });
  }

  // Delete selected use elements
  if (state.selection.selectedUses) {
    state.selection.selectedUses.forEach((useId: string) => {
      state.removeUse(useId);
    });
  }

  // Eliminar paths vacíos
  setTimeout(() => {
    const current = useEditorStore.getState();
    current.paths.forEach((path: any) => {
      if (path.subPaths.length === 0) {
        current.removePath(path.id);
      }
    });
  }, 500);

  // Clean up orphaned references after deletion
  cleanupOrphanedReferences(state, elementsToDelete);

  // Clear selection after deletion
  state.clearSelection();
}

// Function to clean up orphaned references in animations and filters
function cleanupOrphanedReferences(state: any, deletedElementIds: Set<string>) {
  // Clean up orphaned animations
  const orphanedAnimations = state.animations.filter((animation: any) => 
    deletedElementIds.has(animation.targetElementId)
  );
  
  orphanedAnimations.forEach((animation: any) => {
    console.log(`🧹 Cleaning up orphaned animation ${animation.id} for deleted element ${animation.targetElementId}`);
    state.removeAnimation(animation.id);
  });

  // Clean up filters that are only referenced by deleted elements
  // This is more complex as filters might be shared between elements
  // For now, we'll log the filters that might need cleanup
  const potentialOrphanedFilters = state.filters.filter((filter: any) => {
    // Check if this filter is only used by deleted elements
    const allElements = [
      ...state.paths,
      ...state.texts,
      ...state.groups,
      ...state.images
    ];
    
    const elementsUsingFilter = allElements.filter((element: any) => 
      element.style?.filter === `url(#${filter.id})`
    );
    
    // If no elements are using this filter, it might be orphaned
    return elementsUsingFilter.length === 0;
  });
  
  potentialOrphanedFilters.forEach((filter: any) => {
    console.log(`🧹 Found potentially orphaned filter ${filter.id}, consider cleanup`);
    // For safety, we won't auto-delete filters as they might be used elsewhere
    // Users can manually clean them up if needed
  });
}

export const DeleteComponent: React.FC = () => {
  const { selection } = useEditorStore();
  const hasSelection = 
    selection.selectedPaths.length > 0 || 
    selection.selectedSubPaths.length > 0 || 
    selection.selectedCommands.length > 0 ||
    (selection.selectedTexts?.length || 0) > 0 ||
    (selection.selectedTextPaths?.length || 0) > 0 ||
    (selection.selectedGroups?.length || 0) > 0 ||
    (selection.selectedImages?.length || 0) > 0 ||
    (selection.selectedUses?.length || 0) > 0;

  const handleDelete = () => {
    executeDelete();
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
        // @ts-ignore
        executeDelete(useEditorStore.getState());
      }
    },
    {
      key: 'Backspace',
      description: 'Delete selected elements (Alternative)',
      action: () => {
        // @ts-ignore
        executeDelete(useEditorStore.getState());
      }
    },
    {
      key: 'd',
      modifiers: ['ctrl'],
      description: 'Delete selected elements (Ctrl+D)',
      action: () => {
        // @ts-ignore
        executeDelete(useEditorStore.getState());
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
