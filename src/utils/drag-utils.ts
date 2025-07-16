import { Point } from '../types';
import { useEditorStore } from '../store/editorStore';

export interface DraggedElementsData {
  images: { [id: string]: { x: number; y: number; width: number; height: number } };
  uses: { [id: string]: { x: number; y: number; width?: number; height?: number } };
  groups: { [id: string]: { transform: string } };
  texts: { [id: string]: { x: number; y: number } };
  commands: { [id: string]: { x: number; y: number } };
  subPaths: { [id: string]: string[] }; // Track which commands belong to each subpath
}

/**
 * Captures the initial positions of all selected elements when drag starts
 */
export function captureAllSelectedElementsPositions(): DraggedElementsData {
  const store = useEditorStore.getState();
  const { selection, images, uses, groups, texts, paths } = store;
  
  // Capture image positions
  const imagePositions: { [id: string]: { x: number; y: number; width: number; height: number } } = {};
  selection.selectedImages?.forEach((imageId: string) => {
    const image = images.find((img: any) => img.id === imageId);
    if (image) {
      imagePositions[imageId] = { 
        x: image.x, 
        y: image.y, 
        width: image.width, 
        height: image.height 
      };
    }
  });

  // Capture use positions
  const usePositions: { [id: string]: { x: number; y: number; width?: number; height?: number } } = {};
  selection.selectedUses?.forEach((useId: string) => {
    const use = uses.find((u: any) => u.id === useId);
    if (use) {
      usePositions[useId] = { 
        x: use.x || 0, 
        y: use.y || 0, 
        width: use.width, 
        height: use.height 
      };
    }
  });

  // Capture group positions (transform)
  const groupPositions: { [id: string]: { transform: string } } = {};
  selection.selectedGroups?.forEach((groupId: string) => {
    const group = groups.find((g: any) => g.id === groupId);
    if (group) {
      groupPositions[groupId] = { 
        transform: group.transform || ''
      };
    }
  });

  // Capture text positions
  const textPositions: { [id: string]: { x: number; y: number } } = {};
  selection.selectedTexts?.forEach((textId: string) => {
    const text = texts.find((t: any) => t.id === textId);
    if (text) {
      textPositions[textId] = { 
        x: text.x, 
        y: text.y 
      };
    }
  });

  // Capture command positions
  const commandPositions: { [id: string]: { x: number; y: number } } = {};
  const subPathCommands: { [subPathId: string]: string[] } = {};
  
  // First, capture explicitly selected commands
  selection.selectedCommands?.forEach((commandId: string) => {
    paths.forEach(path => {
      path.subPaths.forEach(subPath => {
        const command = subPath.commands.find(cmd => cmd.id === commandId);
        if (command) {
          const pos = getCommandPosition(command);
          if (pos) {
            commandPositions[commandId] = { x: pos.x, y: pos.y };
          }
        }
      });
    });
  });
  
  // Then, capture commands from selected sub-paths
  selection.selectedSubPaths?.forEach((subPathId: string) => {
    paths.forEach(path => {
      const subPath = path.subPaths.find(sp => sp.id === subPathId);
      if (subPath) {
        const commandIds: string[] = [];
        subPath.commands.forEach(command => {
          // Only add if not already captured from selectedCommands
          if (!commandPositions[command.id]) {
            const pos = getCommandPosition(command);
            if (pos) {
              commandPositions[command.id] = { x: pos.x, y: pos.y };
              commandIds.push(command.id);
            }
          } else {
            // Still track the command ID for this subpath even if position already captured
            commandIds.push(command.id);
          }
        });
        subPathCommands[subPathId] = commandIds;
      }
    });
  });

  return {
    images: imagePositions,
    uses: usePositions,
    groups: groupPositions,
    texts: textPositions,
    commands: commandPositions,
    subPaths: subPathCommands
  };
}

/**
 * Moves all captured elements by the specified total offset from their initial positions
 */
export function moveAllCapturedElements(
  capturedData: DraggedElementsData,
  totalOffset: Point,
  enableGridSnapping: boolean = false,
  gridSize: number = 10
) {
  const store = useEditorStore.getState();
  const { moveImage, moveUse, moveGroup, moveText, moveCommand, images, uses, groups, texts } = store;
  
  // Move images
  Object.keys(capturedData.images).forEach((imageId: string) => {
    const start = capturedData.images[imageId];
    if (start) {
      let newX = start.x + totalOffset.x;
      let newY = start.y + totalOffset.y;
      
      // Apply grid snapping if enabled
      if (enableGridSnapping) {
        const snapped = snapToGrid({ x: newX, y: newY }, gridSize);
        newX = snapped.x;
        newY = snapped.y;
      }
      
      // Calculate delta for moveImage function
      const currentImage = images.find((img: any) => img.id === imageId);
      if (currentImage) {
        const deltaX = newX - currentImage.x;
        const deltaY = newY - currentImage.y;
        if (Math.abs(deltaX) > 0.001 || Math.abs(deltaY) > 0.001) {
          moveImage(imageId, { x: deltaX, y: deltaY });
        }
      }
    }
  });
  
  // Move use elements
  Object.keys(capturedData.uses).forEach((useId: string) => {
    const start = capturedData.uses[useId];
    if (start) {
      let newX = start.x + totalOffset.x;
      let newY = start.y + totalOffset.y;
      
      // Apply grid snapping if enabled
      if (enableGridSnapping) {
        const snapped = snapToGrid({ x: newX, y: newY }, gridSize);
        newX = snapped.x;
        newY = snapped.y;
      }
      
      // Calculate delta for moveUse function
      const currentUse = uses.find((u: any) => u.id === useId);
      if (currentUse) {
        const deltaX = newX - (currentUse.x || 0);
        const deltaY = newY - (currentUse.y || 0);
        if (Math.abs(deltaX) > 0.001 || Math.abs(deltaY) > 0.001) {
          moveUse(useId, { x: deltaX, y: deltaY });
        }
      }
    }
  });
  
  // Move groups
  Object.keys(capturedData.groups).forEach((groupId: string) => {
    const start = capturedData.groups[groupId];
    if (start) {
      let offsetX = totalOffset.x;
      let offsetY = totalOffset.y;
      
      // Apply grid snapping if enabled
      if (enableGridSnapping) {
        const snapped = snapToGrid({ x: offsetX, y: offsetY }, gridSize);
        offsetX = snapped.x;
        offsetY = snapped.y;
      }
      
      // Get current group to calculate delta
      const currentGroup = groups.find((g: any) => g.id === groupId);
      if (currentGroup) {
        moveGroup(groupId, { x: offsetX, y: offsetY });
      }
    }
  });
  
  // Move texts
  Object.keys(capturedData.texts).forEach((textId: string) => {
    const start = capturedData.texts[textId];
    if (start) {
      let newX = start.x + totalOffset.x;
      let newY = start.y + totalOffset.y;
      
      // Apply grid snapping if enabled
      if (enableGridSnapping) {
        const snapped = snapToGrid({ x: newX, y: newY }, gridSize);
        newX = snapped.x;
        newY = snapped.y;
      }
      
      // Calculate delta for moveText function
      const currentText = texts.find((t: any) => t.id === textId);
      if (currentText) {
        const deltaX = newX - currentText.x;
        const deltaY = newY - currentText.y;
        if (Math.abs(deltaX) > 0.001 || Math.abs(deltaY) > 0.001) {
          moveText(textId, { x: deltaX, y: deltaY });
        }
      }
    }
  });
  
  // Move commands
  Object.keys(capturedData.commands).forEach((commandId: string) => {
    const start = capturedData.commands[commandId];
    if (start) {
      let newX = start.x + totalOffset.x;
      let newY = start.y + totalOffset.y;
      
      // Apply grid snapping if enabled
      if (enableGridSnapping) {
        const snapped = snapToGrid({ x: newX, y: newY }, gridSize);
        newX = snapped.x;
        newY = snapped.y;
      }
      
      moveCommand(commandId, { x: newX, y: newY });
    }
  });
  
  // Sub-paths should be moved with delta by the specific plugin handlers
  // since they need relative movement, not absolute positioning
}

/**
 * Moves all captured elements by the specified delta from their current positions
 */
export function moveAllCapturedElementsByDelta(
  capturedData: DraggedElementsData,
  delta: Point,
  enableGridSnapping: boolean = false,
  gridSize: number = 10
) {
  const store = useEditorStore.getState();
  const { moveImage, moveUse, moveGroup, moveText, moveSubPath } = store;
  
  // Apply grid snapping if enabled
  let finalDelta = delta;
  if (enableGridSnapping) {
    finalDelta = {
      x: Math.round(delta.x / gridSize) * gridSize,
      y: Math.round(delta.y / gridSize) * gridSize,
    };
  }

  // Move images using delta
  Object.keys(capturedData.images).forEach((imageId: string) => {
    moveImage(imageId, finalDelta);
  });

  // Move texts using delta
  Object.keys(capturedData.texts).forEach((textId: string) => {
    moveText(textId, finalDelta);
  });

  // Move use elements using delta
  Object.keys(capturedData.uses).forEach((useId: string) => {
    moveUse(useId, finalDelta);
  });

  // Move groups using delta
  Object.keys(capturedData.groups).forEach((groupId: string) => {
    moveGroup(groupId, finalDelta);
  });

  // Move sub-paths using delta
  Object.keys(capturedData.subPaths).forEach((subPathId: string) => {
    moveSubPath(subPathId, finalDelta);
  });
}

// Helper function to get command position (copied from existing code)
function getCommandPosition(command: any): Point | null {
  if (command.type === 'M' || command.type === 'L') {
    return { x: command.x, y: command.y };
  } else if (command.type === 'C') {
    return { x: command.x, y: command.y };
  } else if (command.type === 'Q') {
    return { x: command.x, y: command.y };
  } else if (command.type === 'A') {
    return { x: command.x, y: command.y };
  }
  return null;
}

// Helper function to check if grid utils exists
function snapToGrid(point: Point, size: number): Point {
  // Simple grid snapping implementation
  return {
    x: Math.round(point.x / size) * size,
    y: Math.round(point.y / size) * size
  };
}
