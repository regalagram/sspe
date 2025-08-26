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

  // Snap all selected groups (apply to group transform)
  if (selection.selectedGroups.length > 0) {
    selection.selectedGroups.forEach(groupId => {
      const group = store.groups.find(grp => grp.id === groupId);
      if (group && group.transform) {
        // Parse the transform string to extract translate values
        const transformStr = group.transform as string;
        const translateMatch = transformStr.match(/translate\s*\(\s*([^)]+)\s*\)/);
        
        if (translateMatch) {
          const coords = translateMatch[1].split(/[,\s]+/).map(Number);
          const currentX = coords[0] || 0;
          const currentY = coords[1] || 0;
          
          const snappedPos = snapToGrid({ x: currentX, y: currentY }, gridSize);
          if (Math.abs(currentX - snappedPos.x) > 0.001 || Math.abs(currentY - snappedPos.y) > 0.001) {
            const delta = { x: snappedPos.x - currentX, y: snappedPos.y - currentY };
            store.moveGroup(groupId, delta);
          }
        }
      }
    });
  }

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
