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
  // Remove throttling to fix mouse synchronization issues
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

    // Get current store state
    const store = useEditorStore.getState();

    // Collect all updates in a single batch
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

    // Perform a single batch update for all simple elements (images, texts, uses)
    useEditorStore.setState((state) => {
      let newState = { ...state };
      let hasChanges = false;

      // Update images
      if (imageIds.length > 0) {
        newState.images = state.images.map((img) => {
          if (imageIds.includes(img.id)) {
            let imageDelta = finalDelta;
            // If image has rotation transform, apply inverse rotation to delta
            if (img.transform) {
              imageDelta = transformDeltaForRotation(finalDelta, img.transform);
            }
            
            const newX = img.x + imageDelta.x;
            const newY = img.y + imageDelta.y;
            
            // Only update if there's a meaningful change
            if (Math.abs(img.x - newX) >= 0.001 || Math.abs(img.y - newY) >= 0.001) {
              hasChanges = true;
              return { ...img, x: newX, y: newY };
            }
          }
          return img;
        });
      }

      // Update texts
      if (textIds.length > 0) {
        newState.texts = state.texts.map((text) => {
          if (textIds.includes(text.id)) {
            const newX = text.x + finalDelta.x;
            const newY = text.y + finalDelta.y;
            
            // Handle rotation transforms properly
            let newTransform = text.transform;
            if (text.transform) {
              // Match rotate with center coordinates: rotate(angle, cx, cy)
              const rotateWithCenterMatch = text.transform.match(/rotate\(([^,]+),\s*([^,]+),\s*([^)]+)\)/);
              if (rotateWithCenterMatch) {
                const angle = rotateWithCenterMatch[1];
                const oldCx = parseFloat(rotateWithCenterMatch[2]);
                const oldCy = parseFloat(rotateWithCenterMatch[3]);
                
                // Calculate the relative offset between rotation center and text position
                const relativeOffsetX = oldCx - text.x;
                const relativeOffsetY = oldCy - text.y;
                
                // Update the rotation center to maintain the same relative position to the new text position
                const newCx = newX + relativeOffsetX;
                const newCy = newY + relativeOffsetY;
                
                newTransform = text.transform.replace(
                  /rotate\([^)]+\)/,
                  `rotate(${angle}, ${newCx}, ${newCy})`
                );
              }
            }
            
            if (Math.abs(text.x - newX) >= 0.001 || Math.abs(text.y - newY) >= 0.001) {
              hasChanges = true;
              return { ...text, x: newX, y: newY, transform: newTransform };
            }
          }
          return text;
        });
      }

      // Update uses
      if (useIds.length > 0) {
        newState.uses = state.uses.map((use) => {
          if (useIds.includes(use.id)) {
            const newX = (use.x || 0) + finalDelta.x;
            const newY = (use.y || 0) + finalDelta.y;
            
            if (Math.abs((use.x || 0) - newX) >= 0.001 || Math.abs((use.y || 0) - newY) >= 0.001) {
              hasChanges = true;
              return { ...use, x: newX, y: newY };
            }
          }
          return use;
        });
      }

      // Only return new state if there are actual changes
      return hasChanges ? newState : state;
    });

    // Handle complex elements (groups and subpaths) separately with their own logic
    // but use minimal calls to prevent loops
    if (groupIds.length > 0 || subPathIds.length > 0) {
      console.log('🎯 Complex elements detected:', { groupIds, subPathIds });
      
      // CRITICAL: Use a single state update for both group and external subpaths
      // to prevent state conflicts
      const store = useEditorStore.getState();
      
      // Move groups (only if delta is significant)
      if (Math.abs(finalDelta.x) > 0.001 || Math.abs(finalDelta.y) > 0.001) {
        console.log('🔧 Using combined state update approach');
        
        // Get all affected paths from groups
        const groups = store.groups;
        const movedGroupPathIds = new Set<string>();
        
        groupIds.forEach(groupId => {
          const group = groups.find((g: any) => g.id === groupId);
          if (group) {
            group.children.forEach((child: any) => {
              if (child.type === 'path') {
                movedGroupPathIds.add(child.id);
              }
            });
          }
        });
        
        console.log('📝 Group path IDs to move:', Array.from(movedGroupPathIds));
        
        // Filter external subpaths (ones NOT in groups)
        const paths = store.paths;
        const filteredSubPathIds = subPathIds.filter(subPathId => {
          const parentPath = paths.find((path: any) => 
            path.subPaths.some((sp: any) => sp.id === subPathId)
          );
          const shouldKeep = !parentPath || !movedGroupPathIds.has(parentPath.id);
          console.log(`🔍 SubPath ${subPathId}: parent=${parentPath?.id}, shouldKeep=${shouldKeep}`);
          return shouldKeep;
        });
        
        console.log('✅ External subpaths to move:', filteredSubPathIds);
        
        // Collect all group elements that need to be moved
        const groupTextsToMove = new Set<string>();
        const groupImagesToMove = new Set<string>();
        const groupUsesToMove = new Set<string>();
        
        groupIds.forEach(groupId => {
          const group = groups.find((g: any) => g.id === groupId);
          if (group) {
            console.log(`📋 Collecting elements from group ${groupId}:`, group.children);
            group.children.forEach((child: any) => {
              if (child.type === 'text') {
                groupTextsToMove.add(child.id);
              } else if (child.type === 'image') {
                groupImagesToMove.add(child.id);
              } else if (child.type === 'use') {
                groupUsesToMove.add(child.id);
              }
            });
          }
        });
        
        console.log('📝 Group elements to move:', {
          paths: Array.from(movedGroupPathIds),
          texts: Array.from(groupTextsToMove),
          images: Array.from(groupImagesToMove),
          uses: Array.from(groupUsesToMove)
        });
        
        // Filter external elements (ones NOT in groups being moved)
        const filteredTextIds = textIds.filter(textId => !groupTextsToMove.has(textId));
        const filteredImageIds = imageIds.filter(imageId => !groupImagesToMove.has(imageId));
        const filteredUseIds = useIds.filter(useId => !groupUsesToMove.has(useId));
        
        console.log('✅ External elements to move separately:', {
          subpaths: filteredSubPathIds,
          texts: filteredTextIds,
          images: filteredImageIds,
          uses: filteredUseIds
        });

        // Apply all changes in a SINGLE state update
        useEditorStore.setState((state) => {
          console.log('🚀 Applying combined state update for ALL element types');
          
          const newPaths = state.paths.map((path) => {
            let pathUpdated = false;
            let newSubPaths = path.subPaths;
            
            // Move ALL subpaths if this path belongs to a group
            if (movedGroupPathIds.has(path.id)) {
              console.log(`�️ Moving ALL subpaths in group path ${path.id}`);
              pathUpdated = true;
              newSubPaths = path.subPaths.map((subPath) => ({
                ...subPath,
                commands: subPath.commands.map((cmd) => {
                  let newX = cmd.x !== undefined ? cmd.x + finalDelta.x : cmd.x;
                  let newY = cmd.y !== undefined ? cmd.y + finalDelta.y : cmd.y;
                  let newX1 = cmd.x1 !== undefined ? cmd.x1 + finalDelta.x : cmd.x1;
                  let newY1 = cmd.y1 !== undefined ? cmd.y1 + finalDelta.y : cmd.y1;
                  let newX2 = cmd.x2 !== undefined ? cmd.x2 + finalDelta.x : cmd.x2;
                  let newY2 = cmd.y2 !== undefined ? cmd.y2 + finalDelta.y : cmd.y2;
                  
                  return {
                    ...cmd,
                    x: newX,
                    y: newY,
                    x1: newX1,
                    y1: newY1,
                    x2: newX2,
                    y2: newY2,
                  };
                }),
              }));
            } else {
              // Move only SELECTED external subpaths
              newSubPaths = path.subPaths.map((subPath) => {
                if (filteredSubPathIds.includes(subPath.id)) {
                  console.log(`🎯 Moving external subpath ${subPath.id}`);
                  pathUpdated = true;
                  return {
                    ...subPath,
                    commands: subPath.commands.map((cmd) => {
                      let newX = cmd.x !== undefined ? cmd.x + finalDelta.x : cmd.x;
                      let newY = cmd.y !== undefined ? cmd.y + finalDelta.y : cmd.y;
                      let newX1 = cmd.x1 !== undefined ? cmd.x1 + finalDelta.x : cmd.x1;
                      let newY1 = cmd.y1 !== undefined ? cmd.y1 + finalDelta.y : cmd.y1;
                      let newX2 = cmd.x2 !== undefined ? cmd.x2 + finalDelta.x : cmd.x2;
                      let newY2 = cmd.y2 !== undefined ? cmd.y2 + finalDelta.y : cmd.y2;
                      
                      // Apply grid snapping if enabled
                      if (enableGridSnapping) {
                        if (newX !== undefined && newY !== undefined) {
                          const snapped = snapToGrid({ x: newX, y: newY }, gridSize);
                          newX = snapped.x;
                          newY = snapped.y;
                        }
                        if (newX1 !== undefined && newY1 !== undefined) {
                          const snapped = snapToGrid({ x: newX1, y: newY1 }, gridSize);
                          newX1 = snapped.x;
                          newY1 = snapped.y;
                        }
                        if (newX2 !== undefined && newY2 !== undefined) {
                          const snapped = snapToGrid({ x: newX2, y: newY2 }, gridSize);
                          newX2 = snapped.x;
                          newY2 = snapped.y;
                        }
                      }
                      
                      return {
                        ...cmd,
                        x: newX,
                        y: newY,
                        x1: newX1,
                        y1: newY1,
                        x2: newX2,
                        y2: newY2,
                      };
                    }),
                  };
                }
                return subPath;
              });
            }
            
            return pathUpdated ? { ...path, subPaths: newSubPaths } : path;
          });
          
          // Update texts (both group and external)
          const newTexts = state.texts.map((text) => {
            // Move if it's in a group being moved
            if (groupTextsToMove.has(text.id)) {
              console.log(`📝 Moving group text ${text.id}`);
              return {
                ...text,
                x: text.x + finalDelta.x,
                y: text.y + finalDelta.y
              };
            }
            // Move if it's an external text being moved
            if (filteredTextIds.includes(text.id)) {
              console.log(`🎯 Moving external text ${text.id}`);
              return {
                ...text,
                x: text.x + finalDelta.x,
                y: text.y + finalDelta.y
              };
            }
            return text;
          });

          // Update images (both group and external)
          const newImages = state.images.map((image) => {
            // Move if it's in a group being moved
            if (groupImagesToMove.has(image.id)) {
              console.log(`🖼️ Moving group image ${image.id}`);
              let imageDelta = finalDelta;
              // If image has rotation transform, apply inverse rotation to delta
              if (image.transform) {
                imageDelta = transformDeltaForRotation(finalDelta, image.transform);
              }
              return {
                ...image,
                x: image.x + imageDelta.x,
                y: image.y + imageDelta.y
              };
            }
            // Move if it's an external image being moved
            if (filteredImageIds.includes(image.id)) {
              console.log(`🎯 Moving external image ${image.id}`);
              let imageDelta = finalDelta;
              if (image.transform) {
                imageDelta = transformDeltaForRotation(finalDelta, image.transform);
              }
              return {
                ...image,
                x: image.x + imageDelta.x,
                y: image.y + imageDelta.y
              };
            }
            return image;
          });

          // Update uses (both group and external)
          const newUses = state.uses.map((use) => {
            // Move if it's in a group being moved
            if (groupUsesToMove.has(use.id)) {
              console.log(`⚙️ Moving group use ${use.id}`);
              return {
                ...use,
                x: (use.x || 0) + finalDelta.x,
                y: (use.y || 0) + finalDelta.y
              };
            }
            // Move if it's an external use being moved
            if (filteredUseIds.includes(use.id)) {
              console.log(`🎯 Moving external use ${use.id}`);
              return {
                ...use,
                x: (use.x || 0) + finalDelta.x,
                y: (use.y || 0) + finalDelta.y
              };
            }
            return use;
          });
          
          console.log('✅ Combined update complete for all element types');
          return {
            paths: newPaths,
            texts: newTexts,
            images: newImages,
            uses: newUses,
            renderVersion: state.renderVersion + 1
          };
        });
      }
    }

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
