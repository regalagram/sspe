import { 
  Copy, 
  Trash2, 
  Download, 
  Layers, 
  ArrowUp, 
  ArrowDown, 
  Lock, 
  LockKeyhole,
  Ungroup
} from 'lucide-react';
import { ToolbarAction } from '../../../types/floatingToolbar';
import { useEditorStore } from '../../../store/editorStore';
import { ReorderManager } from '../../../plugins/reorder/ReorderManager';
import { duplicatePath } from '../../../utils/duplicate-utils';
import { generateId } from '../../../utils/id-utils';
import { duplicateSelected, deleteSelected } from './commonActions';

// Calculate group bounds
const calculateGroupBounds = (group: any) => {
  const store = useEditorStore.getState();
  const { paths, texts, images } = store;
  
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let hasContent = false;

  group.children.forEach((child: any) => {
    switch (child.type) {
      case 'path': {
        const path = paths.find((p: any) => p.id === child.id);
        if (path) {
          path.subPaths.forEach((subPath: any) => {
            subPath.commands.forEach((command: any) => {
              if (command.x !== undefined && command.y !== undefined) {
                minX = Math.min(minX, command.x);
                maxX = Math.max(maxX, command.x);
                minY = Math.min(minY, command.y);
                maxY = Math.max(maxY, command.y);
                hasContent = true;
              }
            });
          });
        }
        break;
      }
      case 'text': {
        const text = texts.find((t: any) => t.id === child.id);
        if (text) {
          minX = Math.min(minX, text.x);
          maxX = Math.max(maxX, text.x + 100);
          minY = Math.min(minY, text.y);
          maxY = Math.max(maxY, text.y + 20);
          hasContent = true;
        }
        break;
      }
      case 'image': {
        const image = images.find((img: any) => img.id === child.id);
        if (image) {
          minX = Math.min(minX, image.x);
          maxX = Math.max(maxX, image.x + image.width);
          minY = Math.min(minY, image.y);
          maxY = Math.max(maxY, image.y + image.height);
          hasContent = true;
        }
        break;
      }
    }
  });

  if (!hasContent) {
    return null;
  }

  const padding = Math.max(2, Math.max(maxX - minX, maxY - minY) * 0.05);
  const actualX = minX + padding;
  const actualY = minY + padding;
  const actualWidth = (maxX - minX) - padding * 2;
  const actualHeight = (maxY - minY) - padding * 2;

  return {
    x: actualX,
    y: actualY,
    width: actualWidth,
    height: actualHeight
  };
};

// Duplicate groups
const duplicateGroups = () => {
  const store = useEditorStore.getState();
  const selectedGroupIds = [...store.selection.selectedGroups];
  const newGroupIds: string[] = [];
  
  // Save history state before making changes
  store.pushToHistory();
  
  selectedGroupIds.forEach(groupId => {
    const group = store.getGroupById(groupId);
    if (!group) return;
    
    // Calculate group bounds for intelligent offset
    const groupBounds = calculateGroupBounds(group);
    const offsetX = groupBounds ? Math.max(groupBounds.width + 20, 40) : 40;
    const offsetY = groupBounds ? Math.max(groupBounds.height + 20, 40) : 40;
    
    // Duplicate all child elements first
    const newChildIds: string[] = [];
    const newChildTypes: string[] = [];
    
    group.children.forEach(child => {
      let newChildId: string | null = null;
      
      switch (child.type) {
        case 'path':
          // Duplicate path with offset using existing path duplication
          const pathIndex = store.paths.findIndex(p => p.id === child.id);
          if (pathIndex !== -1) {
            const path = store.paths[pathIndex];
            const newPath = duplicatePath(path);
            // Apply offset to all commands in the path
            newPath.subPaths.forEach(subPath => {
              subPath.commands.forEach(command => {
                if (command.x !== undefined) command.x += offsetX;
                if (command.y !== undefined) command.y += offsetY;
                if (command.x1 !== undefined) command.x1 += offsetX;
                if (command.y1 !== undefined) command.y1 += offsetY;
                if (command.x2 !== undefined) command.x2 += offsetX;
                if (command.y2 !== undefined) command.y2 += offsetY;
              });
            });
            
            // Add path using set function
            useEditorStore.setState(state => ({
              paths: [...state.paths, newPath]
            }));
            newChildId = newPath.id;
          }
          break;
          
        case 'text':
          // Duplicate text with offset
          const originalTextId = child.id;
          newChildId = store.duplicateText(originalTextId);
          if (newChildId) {
            store.moveText(newChildId, { x: offsetX, y: offsetY });
          }
          break;
          
        case 'image':
          // Duplicate image with offset using state update
          const imageIndex = store.images.findIndex(img => img.id === child.id);
          if (imageIndex !== -1) {
            const image = store.images[imageIndex];
            const newImage = {
              ...image,
              id: generateId(),
              x: image.x + offsetX,
              y: image.y + offsetY
            };
            
            useEditorStore.setState(state => ({
              images: [...state.images, newImage]
            }));
            newChildId = newImage.id;
          }
          break;
          
        case 'use':
          // Duplicate use element with offset using state update
          const useIndex = store.uses.findIndex(u => u.id === child.id);
          if (useIndex !== -1) {
            const use = store.uses[useIndex];
            const newUse = {
              ...use,
              id: generateId(),
              x: (use.x || 0) + offsetX,
              y: (use.y || 0) + offsetY
            };
            
            useEditorStore.setState(state => ({
              uses: [...state.uses, newUse]
            }));
            newChildId = newUse.id;
          }
          break;
          
        default:
          console.warn(`Unsupported child type for group duplication: ${child.type}`);
          break;
      }
      
      if (newChildId) {
        newChildIds.push(newChildId);
        newChildTypes.push(child.type);
      }
    });
    
    // Create new group with duplicated children
    if (newChildIds.length > 0) {
      const newGroupId = store.createGroup(
        `${group.name} Copy`,
        newChildIds,
        newChildTypes as ('path' | 'text' | 'group')[]
      );
      
      newGroupIds.push(newGroupId);
    }
  });
  
  // Select the new groups
  if (newGroupIds.length > 0) {
    store.clearSelection();
    newGroupIds.forEach((groupId, index) => {
      store.selectGroup(groupId, index > 0);
    });
  }
};

// Delete groups
const deleteGroups = () => {
  const store = useEditorStore.getState();
  
  // Save to history before deleting
  store.pushToHistory();
  
  store.selection.selectedGroups.forEach(groupId => {
    store.deleteGroup(groupId, true); // Delete with children
  });
  
  store.clearSelection();
};

// Export group as SVG
const exportGroupSVG = () => {
  const store = useEditorStore.getState();
  
  store.selection.selectedGroups.forEach(groupId => {
    store.exportGroupSVG(groupId, true); // Auto download
  });
};

// Bring groups to front
const bringGroupsToFront = () => {
  const store = useEditorStore.getState();
  store.pushToHistory();
  
  const reorderManager = new ReorderManager();
  reorderManager.setEditorStore(store);
  
  reorderManager.bringToFront();
};

// Send groups to back
const sendGroupsToBack = () => {
  const store = useEditorStore.getState();
  store.pushToHistory();
  
  const reorderManager = new ReorderManager();
  reorderManager.setEditorStore(store);
  
  reorderManager.sendToBack();
};

// Group arrange options
const groupArrangeOptions = [
  { 
    id: 'group-bring-front', 
    label: 'Bring to Front', 
    icon: ArrowUp,
    action: bringGroupsToFront 
  },
  { 
    id: 'group-send-back', 
    label: 'Send to Back', 
    icon: ArrowDown,
    action: sendGroupsToBack 
  }
];

// Group lock level options
const groupLockOptions = [
  { 
    id: 'group-lock-none', 
    label: 'Unlock', 
    action: () => {
      const store = useEditorStore.getState();
      store.pushToHistory();
      store.selection.selectedGroups.forEach(groupId => {
        store.setGroupLockLevel(groupId, 'none');
      });
    }
  },
  { 
    id: 'group-lock-selection', 
    label: 'Lock Selection', 
    action: () => {
      const store = useEditorStore.getState();
      store.pushToHistory();
      store.selection.selectedGroups.forEach(groupId => {
        store.setGroupLockLevel(groupId, 'selection');
      });
    }
  },
  { 
    id: 'group-lock-editing', 
    label: 'Lock Editing', 
    action: () => {
      const store = useEditorStore.getState();
      store.pushToHistory();
      store.selection.selectedGroups.forEach(groupId => {
        store.setGroupLockLevel(groupId, 'editing');
      });
    }
  },
  { 
    id: 'group-lock-movement', 
    label: 'Lock Movement', 
    action: () => {
      const store = useEditorStore.getState();
      store.pushToHistory();
      store.selection.selectedGroups.forEach(groupId => {
        store.setGroupLockLevel(groupId, 'movement-sync');
      });
    }
  },
  { 
    id: 'group-lock-full', 
    label: 'Lock All', 
    action: () => {
      const store = useEditorStore.getState();
      store.pushToHistory();
      store.selection.selectedGroups.forEach(groupId => {
        store.setGroupLockLevel(groupId, 'full');
      });
    }
  }
];

// Recursive lock function for groups
const toggleGroupRecursiveLock = () => {
  const store = useEditorStore.getState();
  const selectedGroupIds = [...store.selection.selectedGroups];
  
  if (selectedGroupIds.length === 0) return;
  
  // Save history state before making changes
  store.pushToHistory();
  
  // Check if any group is currently locked to determine action
  const isAnyGroupLocked = selectedGroupIds.some(groupId => {
    const group = store.getGroupById(groupId);
    return group?.locked || group?.lockLevel !== 'none';
  });
  
  const shouldLock = !isAnyGroupLocked;
  
  selectedGroupIds.forEach(groupId => {
    recursivelyLockGroup(groupId, shouldLock);
  });
};

// Helper function to recursively lock/unlock a group and all its children
export const recursivelyLockGroup = (groupId: string, shouldLock: boolean) => {
  const store = useEditorStore.getState();
  const group = store.getGroupById(groupId);
  
  if (!group) return;
  
  // Lock/unlock the group itself
  store.setGroupLockLevel(groupId, shouldLock ? 'full' : 'none');
  
  // Recursively lock/unlock all children
  group.children.forEach(child => {
    switch (child.type) {
      case 'path':
        // Lock the path and all its subpaths and commands
        const pathIndex = store.paths.findIndex(p => p.id === child.id);
        if (pathIndex !== -1) {
          const path = store.paths[pathIndex];
          const updatedPath = {
            ...path,
            locked: shouldLock,
            subPaths: path.subPaths.map(subPath => ({
              ...subPath,
              locked: shouldLock,
              commands: subPath.commands.map(command => ({
                ...command,
                locked: shouldLock
              }))
            }))
          };
          
          // Update the path in the store
          useEditorStore.setState(state => ({
            paths: state.paths.map((p, index) => 
              index === pathIndex ? updatedPath : p
            )
          }));
        }
        break;
        
      case 'text':
        // Lock/unlock text element
        store.updateText(child.id, { locked: shouldLock });
        break;
        
      case 'image':
        // Lock/unlock image element
        const imageIndex = store.images.findIndex(img => img.id === child.id);
        if (imageIndex !== -1) {
          useEditorStore.setState(state => ({
            images: state.images.map((img, index) => 
              index === imageIndex ? { ...img, locked: shouldLock } : img
            )
          }));
        }
        break;
        
      case 'use':
        // Lock/unlock use element
        const useIndex = store.uses.findIndex(u => u.id === child.id);
        if (useIndex !== -1) {
          useEditorStore.setState(state => ({
            uses: state.uses.map((u, index) => 
              index === useIndex ? { ...u, locked: shouldLock } : u
            )
          }));
        }
        break;
        
      case 'group':
        // Recursively lock/unlock nested groups
        recursivelyLockGroup(child.id, shouldLock);
        break;
    }
  });
};

// Ungroup selected groups
const ungroupSelected = () => {
  const store = useEditorStore.getState();
  
  store.pushToHistory();
  
  store.selection.selectedGroups.forEach(groupId => {
    store.ungroupElements(groupId);
  });
};

export const groupActions: ToolbarAction[] = [
  {
    id: 'ungroup',
    icon: Ungroup,
    label: 'Ungroup',
    type: 'button',
    action: ungroupSelected,
    priority: 100,
    tooltip: 'Ungroup elements'
  },
  {
    id: 'duplicate-group',
    icon: Copy,
    label: 'Duplicate',
    type: 'button',
    action: duplicateSelected, // Use unified duplicate function
    priority: 20,
    tooltip: 'Duplicate group'
  },
  {
    id: 'group-export',
    icon: Download,
    label: 'Export SVG',
    type: 'button',
    action: exportGroupSVG,
    priority: 15,
    tooltip: 'Export group as SVG'
  },
  {
    id: 'group-arrange',
    icon: Layers,
    label: 'Arrange',
    type: 'dropdown',
    dropdown: {
      options: groupArrangeOptions
    },
    priority: 14,
    tooltip: 'Arrange group'
  },
  {
    id: 'group-lock-level',
    icon: Lock,
    label: 'Lock Level',
    type: 'dropdown',
    dropdown: {
      options: groupLockOptions
    },
    priority: 13,
    tooltip: 'Set group lock level'
  },
  {
    id: 'group-recursive-lock',
    icon: LockKeyhole,
    label: 'Recursive Lock',
    type: 'button',
    action: toggleGroupRecursiveLock,
    priority: 12,
    tooltip: 'Toggle recursive lock for group and all children'
  },
  {
    id: 'delete-group',
    icon: Trash2,
    label: 'Delete',
    type: 'button',
    action: deleteSelected, // Use unified delete function
    priority: 10,
    destructive: true,
    tooltip: 'Delete group'
  }
];