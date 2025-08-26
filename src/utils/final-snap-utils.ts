import { useEditorStore } from '../store/editorStore';
import { Point } from '../types';

/**
 * Utility to apply final snap to grid when drag ends
 */

function snapToGrid(point: Point, size: number): Point {
  return {
    x: Math.round(point.x / size) * size,
    y: Math.round(point.y / size) * size
  };
}

/**
 * Applies snap to grid to all selected elements when drag ends
 */
export function applyFinalSnapToGrid() {
  const store = useEditorStore.getState();
  const { grid, selection } = store;
  
  // Only apply if snap to grid is enabled
  if (!grid.snapToGrid) {
    return;
  }
  
  const gridSize = grid.size;
  
  // Special handling for groups: snap all elements within the group consistently
  if (selection.selectedGroups.length > 0) {
    selection.selectedGroups.forEach(groupId => {
      const group = store.groups.find(grp => grp.id === groupId);
      if (group && group.children && group.children.length > 0) {
        // Find a reference element to calculate snap delta
        // We'll use the first element with a position as reference
        let referenceElement = null;
        let referencePos = null;
        
        // Look for the first positioned element in the group
        for (const child of group.children) {
          if (child.type === 'image') {
            const image = store.images.find(img => img.id === child.id);
            if (image) {
              referenceElement = { type: 'image', element: image };
              referencePos = { x: image.x, y: image.y };
              break;
            }
          } else if (child.type === 'text') {
            const text = store.texts.find(txt => txt.id === child.id);
            if (text) {
              referenceElement = { type: 'text', element: text };
              referencePos = { x: text.x, y: text.y };
              break;
            }
          } else if (child.type === 'use') {
            const useElement = store.uses.find(use => use.id === child.id);
            if (useElement) {
              referenceElement = { type: 'use', element: useElement };
              referencePos = { x: useElement.x || 0, y: useElement.y || 0 };
              break;
            }
          } else if (child.type === 'path') {
            // For paths, find the first command with position
            const path = store.paths.find(p => p.id === child.id);
            if (path && path.subPaths && path.subPaths.length > 0) {
              const firstSubPath = path.subPaths[0];
              if (firstSubPath.commands && firstSubPath.commands.length > 0) {
                const firstCommand = firstSubPath.commands[0];
                if (firstCommand.x !== undefined && firstCommand.y !== undefined) {
                  referenceElement = { type: 'path', element: path };
                  referencePos = { x: firstCommand.x, y: firstCommand.y };
                  break;
                }
              }
            }
          }
        }
        
        // If we found a reference element, calculate snap delta and apply to entire group
        if (referenceElement && referencePos) {
          const snappedPos = snapToGrid(referencePos, gridSize);
          const delta = { x: snappedPos.x - referencePos.x, y: snappedPos.y - referencePos.y };
          
          // Only apply if there's a meaningful snap adjustment
          if (Math.abs(delta.x) > 0.001 || Math.abs(delta.y) > 0.001) {
            // Move the entire group by the snap delta
            store.moveGroup(groupId, delta);
          }
        }
      }
    });
    
    // If we have groups selected, don't snap individual elements that belong to those groups
    return;
  }

  // For individual elements (not in groups), snap each type individually
  
  // Snap all selected images
  if (selection.selectedImages.length > 0) {
    selection.selectedImages.forEach(imageId => {
      const image = store.images.find(img => img.id === imageId);
      if (image) {
        const snappedPos = snapToGrid({ x: image.x, y: image.y }, gridSize);
        if (Math.abs(image.x - snappedPos.x) > 0.001 || Math.abs(image.y - snappedPos.y) > 0.001) {
          const delta = { x: snappedPos.x - image.x, y: snappedPos.y - image.y };
          store.moveImage(imageId, delta, true); // skipGroupSync = true to avoid recursion
        }
      }
    });
  }

  // Snap all selected texts
  if (selection.selectedTexts.length > 0) {
    selection.selectedTexts.forEach(textId => {
      const text = store.texts.find(txt => txt.id === textId);
      if (text) {
        const snappedPos = snapToGrid({ x: text.x, y: text.y }, gridSize);
        if (Math.abs(text.x - snappedPos.x) > 0.001 || Math.abs(text.y - snappedPos.y) > 0.001) {
          const delta = { x: snappedPos.x - text.x, y: snappedPos.y - text.y };
          store.moveText(textId, delta, true); // skipGroupSync = true to avoid recursion
        }
      }
    });
  }

  // Snap all selected use elements
  if (selection.selectedUses.length > 0) {
    selection.selectedUses.forEach(useId => {
      const useElement = store.uses.find(use => use.id === useId);
      if (useElement) {
        const snappedPos = snapToGrid({ x: useElement.x || 0, y: useElement.y || 0 }, gridSize);
        const currentX = useElement.x || 0;
        const currentY = useElement.y || 0;
        if (Math.abs(currentX - snappedPos.x) > 0.001 || Math.abs(currentY - snappedPos.y) > 0.001) {
          const delta = { x: snappedPos.x - currentX, y: snappedPos.y - currentY };
          store.moveUse(useId, delta);
        }
      }
    });
  }

  // Skip group snapping if we already handled groups above
  // This section was moved to the top to handle groups first

  // Snap all selected commands
  if (selection.selectedCommands.length > 0) {
    selection.selectedCommands.forEach(commandId => {
      // Find the command in all paths
      let foundCommand = null;
      let commandPos = null;
      
      for (const path of store.paths) {
        for (const subPath of path.subPaths) {
          const command = subPath.commands.find(cmd => cmd.id === commandId);
          if (command && command.x !== undefined && command.y !== undefined) {
            foundCommand = command;
            commandPos = { x: command.x, y: command.y };
            break;
          }
        }
        if (foundCommand) break;
      }
      
      if (foundCommand && commandPos) {
        const snappedPos = snapToGrid(commandPos, gridSize);
        if (Math.abs(commandPos.x - snappedPos.x) > 0.001 || Math.abs(commandPos.y - snappedPos.y) > 0.001) {
          store.moveCommand(commandId, snappedPos);
        }
      }
    });
  }

  // Snap all selected subpaths
  if (selection.selectedSubPaths.length > 0) {
    selection.selectedSubPaths.forEach(subPathId => {
      // For subpaths, we need to snap all their commands
      let foundSubPath = null;
      
      for (const path of store.paths) {
        const subPath = path.subPaths.find(sp => sp.id === subPathId);
        if (subPath) {
          foundSubPath = subPath;
          break;
        }
      }
      
      if (foundSubPath && foundSubPath.commands.length > 0) {
        // Calculate the delta needed to snap the first command, then apply to all commands
        const firstCommand = foundSubPath.commands[0];
        if (firstCommand && firstCommand.x !== undefined && firstCommand.y !== undefined) {
          const currentPos = { x: firstCommand.x, y: firstCommand.y };
          const snappedPos = snapToGrid(currentPos, gridSize);
          
          if (Math.abs(currentPos.x - snappedPos.x) > 0.001 || Math.abs(currentPos.y - snappedPos.y) > 0.001) {
            const delta = { x: snappedPos.x - currentPos.x, y: snappedPos.y - currentPos.y };
            store.translateSubPath(subPathId, delta);
          }
        }
      }
    });
  }
}
