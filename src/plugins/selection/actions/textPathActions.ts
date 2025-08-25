import { Copy, Trash2, Lock, PaintBucket } from 'lucide-react';
import { ToolbarAction } from '../../../types/floatingToolbar';
import { useEditorStore } from '../../../store/editorStore';
import { duplicateSelected, deleteSelected } from './commonActions';

// Check if selected textPaths are locked
const areTextPathsLocked = (): boolean => {
  const store = useEditorStore.getState();
  const selectedTextPaths = store.selection.selectedTextPaths;
  
  if (selectedTextPaths.length === 0) return false;
  
  return selectedTextPaths.some(textPathId => {
    const textPath = store.textPaths.find(tp => tp.id === textPathId);
    return textPath?.locked === true;
  });
};

// Toggle textPath lock
const toggleTextPathLock = () => {
  const store = useEditorStore.getState();
  const selectedTextPaths = store.selection.selectedTextPaths;
  
  if (selectedTextPaths.length === 0) return;
  
  store.pushToHistory();
  
  // Determine if we should lock or unlock based on the first selected textPath
  const firstTextPath = store.textPaths.find(tp => tp.id === selectedTextPaths[0]);
  const shouldLock = !firstTextPath?.locked;
  
  // Apply lock/unlock to all selected textPaths
  selectedTextPaths.forEach(textPathId => {
    store.lockTextPath(textPathId, shouldLock);
  });
  
  // If locking, clear selection as locked textPaths shouldn't be selectable
  if (shouldLock) {
    store.clearSelection();
  }
};

// Check if text format copy is active
const isTextFormatCopyActive = (): boolean => {
  const store = useEditorStore.getState();
  return store.isTextFormatCopyActive ? store.isTextFormatCopyActive() : false;
};

// Start text format copy from textPath
const startTextFormatCopy = () => {
  const store = useEditorStore.getState();
  
  // Check if text format copy is already active - if so, cancel it
  if (store.isTextFormatCopyActive && store.isTextFormatCopyActive()) {
    store.cancelTextFormatCopy();
    return;
  }
  
  const selectedTextPaths = store.selection.selectedTextPaths;
  
  if (selectedTextPaths.length > 0) {
    store.startTextFormatCopy(selectedTextPaths[0]);
  }
};

// Check if selected textPaths are compatible for format copying
const areTextPathsCompatibleForFormatCopy = (): boolean => {
  const store = useEditorStore.getState();
  const selectedTextPaths = store.selection.selectedTextPaths;
  
  // Must have at least one textPath selected
  return selectedTextPaths.length > 0;
};

export const textPathActions: ToolbarAction[] = [
  {
    id: 'copy-textpath-format',
    icon: PaintBucket,
    label: 'Copy Format',
    type: 'toggle',
    toggle: {
      isActive: isTextFormatCopyActive,
      onToggle: startTextFormatCopy
    },
    priority: 1000,
    tooltip: 'Copy textPath format (font, style, effects)',
    visible: areTextPathsCompatibleForFormatCopy
  },
  {
    id: 'duplicate-textpath',
    icon: Copy,
    label: 'Duplicate',
    type: 'button',
    action: duplicateSelected, // Use unified duplicate function
    priority: 80,
    tooltip: 'Duplicate textPath'
  },
  {
    id: 'textpath-lock',
    icon: Lock,
    label: 'Lock/Unlock',
    type: 'toggle',
    toggle: {
      isActive: areTextPathsLocked,
      onToggle: toggleTextPathLock
    },
    priority: 90,
    tooltip: 'Toggle textPath lock state'
  },
  {
    id: 'delete-textpath',
    icon: Trash2,
    label: 'Delete',
    type: 'button',
    action: deleteSelected, // Use unified delete function
    priority: 10,
    destructive: true,
    tooltip: 'Delete textPath'
  }
];