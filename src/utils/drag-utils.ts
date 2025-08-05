import { Point } from '../types';
import { useEditorStore } from '../store/editorStore';

/**
 * Transform a delta point by applying the inverse of a rotation transform
 * This allows proper movement of rotated elements
 */
function transformDeltaForRotation(delta: Point, transform: string): Point {
  if (!transform) return delta;
  
  // Handle rotate(angle, cx, cy) transform
  const rotateMatch = transform.match(/rotate\(([^,]+),\s*([^,]+),\s*([^)]+)\)/);
  if (rotateMatch) {
    const angle = parseFloat(rotateMatch[1]) * Math.PI / 180; // Convert to radians
    
    // Apply inverse rotation to the delta (rotate by -angle)
    const cos = Math.cos(-angle);
    const sin = Math.sin(-angle);
    
    return {
      x: delta.x * cos - delta.y * sin,
      y: delta.x * sin + delta.y * cos
    };
  }
  
  return delta;
}

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

  // TextPaths are not captured for dragging - they follow their paths
  // Any movement should be applied to the path that the textPath references

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
  
  // Move images (batch update to prevent loops)
  const imageIds = Object.keys(capturedData.images);
  if (imageIds.length > 0) {
    const imageUpdates: Array<{id: string, newX: number, newY: number}> = [];
    
    // Calculate all new positions first
    imageIds.forEach((imageId: string) => {
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
        
        const currentImage = images.find((img: any) => img.id === imageId);
        if (currentImage) {
          let delta = { x: newX - currentImage.x, y: newY - currentImage.y };
          
          // If image has rotation transform, apply inverse rotation to delta
          if (currentImage.transform) {
            delta = transformDeltaForRotation(delta, currentImage.transform);
          }
          
          if (Math.abs(delta.x) > 0.001 || Math.abs(delta.y) > 0.001) {
            const finalX = currentImage.x + delta.x;
            const finalY = currentImage.y + delta.y;
            imageUpdates.push({id: imageId, newX: finalX, newY: finalY});
          }
        }
      }
    });
    
    // Apply all updates in a single setState call
    if (imageUpdates.length > 0) {
      // Check if any image would actually change to avoid unnecessary updates
      let hasRealChanges = false;
      
      for (const update of imageUpdates) {
        const img = images.find(i => i.id === update.id);
        if (img && (Math.abs(img.x - update.newX) >= 0.001 || Math.abs(img.y - update.newY) >= 0.001)) {
          hasRealChanges = true;
          break;
        }
      }
      
      // Only update if there are real changes
      if (hasRealChanges) {
        useEditorStore.setState((state) => ({
          images: state.images.map((img) => {
            const update = imageUpdates.find(u => u.id === img.id);
            if (update) {
              // Check if position would actually change
              if (Math.abs(img.x - update.newX) < 0.001 && Math.abs(img.y - update.newY) < 0.001) {
                return img; // No change
              }
              return { ...img, x: update.newX, y: update.newY };
            }
            return img;
          })
          // Don't increment renderVersion during frequent drag operations to prevent loops
          // renderVersion: state.renderVersion + 1
        }));
      }
    }
  }
  
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
  
  // TextPaths are not moved directly - they follow their paths
  // Any movement should be applied to the path that the textPath references
  
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

// Robust execution guard to prevent infinite loops
let isExecuting = false;

/**
 * Moves all captured elements by the specified delta from their current positions
 */
export function moveAllCapturedElementsByDelta(
  capturedData: DraggedElementsData,
  delta: Point,
  enableGridSnapping: boolean = false,
  gridSize: number = 10,
  disableThrottling: boolean = false
) {
  // Skip update if delta is too small to prevent unnecessary calls
  if (Math.abs(delta.x) < 0.001 && Math.abs(delta.y) < 0.001) {
    return;
  }

  // Keep only essential protection against concurrent execution
  if (isExecuting) {
    return;
  }

  isExecuting = true;

  try {
    // Apply grid snapping if enabled
    let finalDelta = delta;
    if (enableGridSnapping) {
      finalDelta = {
        x: Math.round(delta.x / gridSize) * gridSize,
        y: Math.round(delta.y / gridSize) * gridSize,
      };
    }

    // Get current store state and methods
    const store = useEditorStore.getState();
    const { moveText, moveImage, moveUse, moveGroup, translateSubPath } = store;

    // Collect all element IDs to move
    const imageIds = Object.keys(capturedData.images);
    const textIds = Object.keys(capturedData.texts);
    const useIds = Object.keys(capturedData.uses);
    const groupIds = Object.keys(capturedData.groups);
    const subPathIds = Object.keys(capturedData.subPaths);

    // Only proceed if there are elements to move
    if (imageIds.length === 0 && textIds.length === 0 && useIds.length === 0 && 
        groupIds.length === 0 && subPathIds.length === 0) {
      return;
    }

    // Move texts using proper moveText method which handles group synchronization
    textIds.forEach((textId: string) => {
      if (Math.abs(finalDelta.x) > 0.001 || Math.abs(finalDelta.y) > 0.001) {
        // skipGroupSync = true to prevent recursive loops during batch movement
        moveText(textId, finalDelta, true);
      }
    });

    // Move images using proper moveImage method which handles group synchronization
    imageIds.forEach((imageId: string) => {
      if (Math.abs(finalDelta.x) > 0.001 || Math.abs(finalDelta.y) > 0.001) {
        // skipGroupSync = true to prevent recursive loops during batch movement
        moveImage(imageId, finalDelta, true);
      }
    });

    // Move use elements using proper moveUse method
    useIds.forEach((useId: string) => {
      if (Math.abs(finalDelta.x) > 0.001 || Math.abs(finalDelta.y) > 0.001) {
        moveUse(useId, finalDelta);
      }
    });

    // Move groups using proper moveGroup method
    groupIds.forEach((groupId: string) => {
      if (Math.abs(finalDelta.x) > 0.001 || Math.abs(finalDelta.y) > 0.001) {
        moveGroup(groupId, finalDelta);
      }
    });

    // Move individual subpaths using proper translateSubPath method
    subPathIds.forEach((subPathId: string) => {
      if (Math.abs(finalDelta.x) > 0.001 || Math.abs(finalDelta.y) > 0.001) {
        translateSubPath(subPathId, finalDelta);
      }
    });

  } finally {
    isExecuting = false;
  }
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
