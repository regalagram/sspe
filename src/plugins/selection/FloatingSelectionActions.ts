import { 
  Palette, 
  Brush,
  LineSquiggle, 
  Copy, 
  Trash2,
  Group,
  Ungroup,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowUp,
  ArrowDown,
  Lock,
  Unlock,
  Layers,
  Filter,
  Play,
  Compass,
  Eye,
  EyeOff,
  Waves,
  Minimize2,
  AlignVerticalJustifyCenter,
  AlignHorizontalJustifyCenter,
  AlignVerticalSpaceAround,
  AlignHorizontalSpaceAround,
  RotateCcw
} from 'lucide-react';
import { FloatingActionDefinition, ToolbarAction } from '../../types/floatingToolbar';
import { useEditorStore } from '../../store/editorStore';
import { ReorderManager } from '../reorder/ReorderManager';
import { SVGCommand } from '../../types';
import { generateId } from '../../utils/id-utils';
import { duplicatePath } from '../../utils/duplicate-utils';
import { calculateTextBoundsDOM } from '../../utils/text-utils';
import { calculateGlobalViewBox } from '../../utils/viewbox-utils';
import { subPathToString } from '../../utils/path-utils';
import { getTextBoundingBox, getImageBoundingBox, getPathBoundingBox, getGroupBoundingBox } from '../../utils/bbox-utils';
import { BoundingBox } from '../../types';
import { 
  generateSmoothPath, 
  areCommandsInSameSubPath,
  simplifySegmentWithPointsOnPath
} from '../../utils/path-simplification-utils';
import {
  createDropShadowFilter,
  createBlurFilter,
  createGrayscaleFilter,
  createSepiaFilter,
  createInvertFilter,
  createBrightnessFilter,
  createContrastFilter,
  createSaturateFilter,
  createHueRotateFilter,
  createEmbossFilter,
  createSharpenFilter,
  createEdgeDetectFilter,
  createGlowFilter,
  createBevelFilter,
  createMotionBlurFilter,
  createNoiseFilter,
  createWaveDistortionFilter,
  createPosterizeFilter,
  createOilPaintingFilter,
  createWatercolorFilter,
  createVintageFilter,
  createChromaticAberrationFilter,
  createNeonGlowFilter,
  createMosaicFilter,
  createGlitchFilter,
  createPixelateFilter,
  createDancingStrokeFilter,
  createSmokeFilter,
  createWavesFilter,
  createPaperTextureFilter,
  createZebraFilter,
  createNetFilter,
  createDustFilter,
  createColoredStripesFilter,
  createColoredSpotsFilter,
  createColoredFlameFilter,
  createAdvancedWatercolorFilter,
  formatSVGReference
} from '../../utils/svg-elements-utils';

// Utility functions for getting current selection state
const getSelectedPaths = () => {
  const store = useEditorStore.getState();
  return store.selection.selectedPaths.map(id => 
    store.paths.find(p => p.id === id)
  ).filter((path): path is NonNullable<typeof path> => Boolean(path));
};

const getSelectedSubPaths = () => {
  const store = useEditorStore.getState();
  const selectedSubPaths: any[] = [];
  
  store.selection.selectedSubPaths.forEach(subPathId => {
    store.paths.forEach(path => {
      const subPath = path.subPaths.find(sp => sp.id === subPathId);
      if (subPath) {
        selectedSubPaths.push({ path, subPath });
      }
    });
  });
  
  return selectedSubPaths;
};

const getSelectedGroups = () => {
  const store = useEditorStore.getState();
  return store.selection.selectedGroups.map(id => 
    store.groups.find(g => g.id === id)
  ).filter((group): group is NonNullable<typeof group> => Boolean(group));
};

// Get common fill color
const getCommonFillColor = (): string | any => {
  const paths = getSelectedPaths();
  if (paths.length === 0) return '#000000';
  
  const firstFill = paths[0]?.style?.fill;
  if (!firstFill) return '#000000';
  
  // Check if all paths have the same fill value (could be string color or gradient object)
  const allSame = paths.every(p => {
    const pathFill = p?.style?.fill;
    if (typeof firstFill === 'string' && typeof pathFill === 'string') {
      return pathFill === firstFill;
    } else if (typeof firstFill === 'object' && typeof pathFill === 'object') {
      // For gradient objects, compare by id
      return pathFill?.id === firstFill?.id;
    }
    return false;
  });
  
  return allSame ? firstFill : '#000000';
};

// Get common stroke color
const getCommonStrokeColor = (): string | any => {
  const paths = getSelectedPaths();
  if (paths.length === 0) return '#000000';
  
  const firstStroke = paths[0]?.style?.stroke;
  if (!firstStroke) return '#000000';
  
  // Check if all paths have the same stroke value (could be string color or gradient object)
  const allSame = paths.every(p => {
    const pathStroke = p?.style?.stroke;
    if (typeof firstStroke === 'string' && typeof pathStroke === 'string') {
      return pathStroke === firstStroke;
    } else if (typeof firstStroke === 'object' && typeof pathStroke === 'object') {
      // For gradient objects, compare by id
      return pathStroke?.id === firstStroke?.id;
    }
    return false;
  });
  
  return allSame ? firstStroke : '#000000';
};

// Apply fill color to selected elements
const applyFillColor = (color: string | any) => {
  const store = useEditorStore.getState();
  
  store.selection.selectedPaths.forEach(pathId => {
    store.updatePathStyle(pathId, { fill: color });
  });
  
  store.selection.selectedTexts.forEach(textId => {
    store.updateTextStyle(textId, { fill: color });
  });
};

// Apply stroke color to selected elements
const applyStrokeColor = (color: string | any) => {
  const store = useEditorStore.getState();
  
  store.selection.selectedPaths.forEach(pathId => {
    store.updatePathStyle(pathId, { stroke: color });
  });
  
  store.selection.selectedTexts.forEach(textId => {
    store.updateTextStyle(textId, { stroke: color });
  });
};

// Group selected elements
const groupSelected = () => {
  const store = useEditorStore.getState();
  const hasSelection = store.selection.selectedPaths.length > 0 || 
                      store.selection.selectedTexts.length > 0 ||
                      store.selection.selectedSubPaths.length > 0;
  
  if (hasSelection) {
    // Push to history before making changes
    store.pushToHistory();
    
    // Use the built-in createGroupFromSelection method
    const groupId = store.createGroupFromSelection();
    
    if (groupId) {
      console.log(`✅ Created group with ID: ${groupId}`);
    } else {
      console.log('❌ Failed to create group');
    }
  }
};

// Ungroup selected groups
const ungroupSelected = () => {
  const store = useEditorStore.getState();
  
  store.selection.selectedGroups.forEach(groupId => {
    store.ungroupElements(groupId);
  });
};

// Calculate bounding box of all selected elements
const getSelectedElementsBounds = (): BoundingBox | null => {
  const store = useEditorStore.getState();
  const { selection, paths, texts, images, uses, groups } = store;
  
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let hasElements = false;

  // Include selected paths
  selection.selectedPaths.forEach(pathId => {
    const path = paths.find(p => p.id === pathId);
    if (path) {
      const bbox = getPathBoundingBox(path);
      if (bbox) {
        minX = Math.min(minX, bbox.x);
        maxX = Math.max(maxX, bbox.x + bbox.width);
        minY = Math.min(minY, bbox.y);
        maxY = Math.max(maxY, bbox.y + bbox.height);
        hasElements = true;
      }
    }
  });

  // Include selected texts
  selection.selectedTexts.forEach(textId => {
    const text = texts.find(t => t.id === textId);
    if (text) {
      const bbox = getTextBoundingBox(text);
      minX = Math.min(minX, bbox.x);
      maxX = Math.max(maxX, bbox.x + bbox.width);
      minY = Math.min(minY, bbox.y);
      maxY = Math.max(maxY, bbox.y + bbox.height);
      hasElements = true;
    }
  });

  // Include selected images
  selection.selectedImages.forEach(imageId => {
    const image = images.find(img => img.id === imageId);
    if (image) {
      const bbox = getImageBoundingBox(image);
      minX = Math.min(minX, bbox.x);
      maxX = Math.max(maxX, bbox.x + bbox.width);
      minY = Math.min(minY, bbox.y);
      maxY = Math.max(maxY, bbox.y + bbox.height);
      hasElements = true;
    }
  });

  // Include selected use elements
  selection.selectedUses.forEach(useId => {
    const use = uses.find(u => u.id === useId);
    if (use) {
      const bbox = {
        x: use.x || 0,
        y: use.y || 0,
        width: use.width || 50,
        height: use.height || 50
      };
      minX = Math.min(minX, bbox.x);
      maxX = Math.max(maxX, bbox.x + bbox.width);
      minY = Math.min(minY, bbox.y);
      maxY = Math.max(maxY, bbox.y + bbox.height);
      hasElements = true;
    }
  });

  // Include selected groups
  selection.selectedGroups.forEach(groupId => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      const bbox = getGroupBoundingBox(group, paths, texts, images, groups);
      minX = Math.min(minX, bbox.x);
      maxX = Math.max(maxX, bbox.x + bbox.width);
      minY = Math.min(minY, bbox.y);
      maxY = Math.max(maxY, bbox.y + bbox.height);
      hasElements = true;
    }
  });

  if (!hasElements) {
    return null;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
};

// Duplicate selected elements
const duplicateSelected = () => {
  const store = useEditorStore.getState();
  
  // Push to history before making changes
  store.pushToHistory();
  
  // Calculate dynamic offset based on all selected elements
  const bounds = getSelectedElementsBounds();
  const OFFSET = 32;
  const dx = bounds ? (bounds.width > 0 ? bounds.width + OFFSET : OFFSET) : OFFSET;
  const dy = bounds ? (bounds.height > 0 ? bounds.height + OFFSET : OFFSET) : OFFSET;
  
  // Duplicate texts with dynamic offset
  const newTextIds: string[] = [];
  store.selection.selectedTexts.forEach(textId => {
    const newTextId = store.duplicateText(textId);
    if (newTextId) {
      newTextIds.push(newTextId);
      // Update position with dynamic offset instead of the default 20px
      const newText = store.texts.find(t => t.id === newTextId);
      if (newText) {
        store.updateText(newTextId, {
          x: newText.x - 20 + dx, // Remove default 20px offset and apply dynamic offset
          y: newText.y - 20 + dy
        });
      }
    }
  });

  // Duplicate images with dynamic offset
  store.selection.selectedImages.forEach(imageId => {
    store.duplicateImage(imageId, { x: dx, y: dy });
  });

  // Duplicate use elements with dynamic offset
  store.selection.selectedUses.forEach(useId => {
    store.duplicateUse(useId, { x: dx, y: dy });
  });

  // Duplicate groups with dynamic offset (avoiding duplicate history call)
  if (store.selection.selectedGroups.length > 0) {
    const selectedGroupIds = [...store.selection.selectedGroups];
    
    selectedGroupIds.forEach(groupId => {
      const group = store.getGroupById(groupId);
      if (!group) return;
      
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
                  if (command.x !== undefined) command.x += dx;
                  if (command.y !== undefined) command.y += dy;
                  if (command.x1 !== undefined) command.x1 += dx;
                  if (command.y1 !== undefined) command.y1 += dy;
                  if (command.x2 !== undefined) command.x2 += dx;
                  if (command.y2 !== undefined) command.y2 += dy;
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
              store.moveText(newChildId, { x: dx, y: dy });
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
                x: image.x + dx,
                y: image.y + dy
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
                x: (use.x || 0) + dx,
                y: (use.y || 0) + dy
              };
              
              useEditorStore.setState(state => ({
                uses: [...state.uses, newUse]
              }));
              newChildId = newUse.id;
            }
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
      }
    });
  }

  // Use existing duplicateSelection for paths/subpaths/commands (it already uses dynamic offset)
  if (store.selection.selectedPaths.length > 0 || store.selection.selectedSubPaths.length > 0 || store.selection.selectedCommands.length > 0) {
    store.duplicateSelection();
  }

  // Select newly duplicated texts if we only duplicated individual elements (not path selections)
  if (newTextIds.length > 0 && 
      store.selection.selectedPaths.length === 0 && 
      store.selection.selectedSubPaths.length === 0 && 
      store.selection.selectedCommands.length === 0) {
    store.clearSelection();
    
    // Select new texts
    newTextIds.forEach((textId, index) => {
      store.selectText(textId, index > 0);
    });
  }
};

// Delete selected elements
const deleteSelected = () => {
  const store = useEditorStore.getState();
  
  // Push to history before making changes
  store.pushToHistory();

  // Delete texts
  store.selection.selectedTexts.forEach(textId => {
    store.deleteText(textId);
  });

  // Delete paths using removePath
  store.selection.selectedPaths.forEach(pathId => {
    store.removePath(pathId);
  });

  // Delete subpaths using removeSubPath
  store.selection.selectedSubPaths.forEach(subPathId => {
    store.removeSubPath(subPathId);
  });

  // For commands, we need to remove them from their subpaths
  store.selection.selectedCommands.forEach(commandId => {
    const pathWithCommand = store.paths.find(path => 
      path.subPaths.some(subPath => 
        subPath.commands.some(cmd => cmd.id === commandId)
      )
    );
    
    if (pathWithCommand) {
      const subPathWithCommand = pathWithCommand.subPaths.find(subPath => 
        subPath.commands.some(cmd => cmd.id === commandId)
      );
      
      if (subPathWithCommand) {
        const updatedCommands = subPathWithCommand.commands.filter(cmd => cmd.id !== commandId);
        store.replaceSubPathCommands(subPathWithCommand.id, updatedCommands.map(cmd => ({
          command: cmd.command,
          x: cmd.x,
          y: cmd.y,
          x1: cmd.x1,
          y1: cmd.y1,
          x2: cmd.x2,
          y2: cmd.y2
        })));
      }
    }
  });

  // Delete groups
  store.selection.selectedGroups.forEach(groupId => {
    store.deleteGroup(groupId, true); // Delete with children
  });
  
  // Clear selection after deletion
  store.clearSelection();
};

// Lock/unlock mixed selections (affects all selected elements)
const toggleMixedLock = () => {
  const store = useEditorStore.getState();
  const { selectedTexts, selectedSubPaths, selectedPaths, selectedImages, selectedSymbols, selectedUses, selectedCommands } = store.selection;
  
  // Check if any elements are selected
  const hasSelection = selectedTexts.length > 0 || selectedSubPaths.length > 0 || selectedPaths.length > 0 || 
                      selectedImages.length > 0 || selectedSymbols.length > 0 || selectedUses.length > 0 || selectedCommands.length > 0;
  
  if (!hasSelection) return;
  
  store.pushToHistory();
  
  // Determine lock state based on first available element
  let shouldLock = true;
  
  if (selectedTexts.length > 0) {
    const firstText = store.texts.find(text => text.id === selectedTexts[0]);
    shouldLock = !firstText?.locked;
  } else if (selectedSubPaths.length > 0) {
    const firstSubPath = store.paths.flatMap(path => path.subPaths).find(subPath => subPath.id === selectedSubPaths[0]);
    shouldLock = !firstSubPath?.locked;
  } else if (selectedPaths.length > 0) {
    const firstPath = store.paths.find(path => path.id === selectedPaths[0]);
    shouldLock = !firstPath?.locked;
  } else if (selectedImages.length > 0) {
    const firstImage = store.images.find(img => img.id === selectedImages[0]);
    shouldLock = !firstImage?.locked;
  } else if (selectedSymbols.length > 0) {
    const firstSymbol = store.symbols.find(sym => sym.id === selectedSymbols[0]);
    shouldLock = !firstSymbol?.locked;
  } else if (selectedUses.length > 0) {
    const firstUse = store.uses.find(use => use.id === selectedUses[0]);
    shouldLock = !firstUse?.locked;
  }
  
  // Apply lock to all selected elements
  selectedTexts.forEach(textId => {
    store.updateText(textId, { locked: shouldLock });
  });
  
  selectedSubPaths.forEach(subPathId => {
    const pathWithSubPath = store.paths.find(path => 
      path.subPaths.some(sp => sp.id === subPathId)
    );
    
    if (pathWithSubPath) {
      const subPathIndex = pathWithSubPath.subPaths.findIndex(sp => sp.id === subPathId);
      if (subPathIndex >= 0) {
        const updatedSubPath = {
          ...pathWithSubPath.subPaths[subPathIndex],
          locked: shouldLock
        };
        
        store.updateSubPath(subPathId, updatedSubPath);
      }
    }
  });
  
  selectedPaths.forEach(pathId => {
    const pathIndex = store.paths.findIndex(p => p.id === pathId);
    if (pathIndex >= 0) {
      const updatedPath = { ...store.paths[pathIndex], locked: shouldLock };
      const newPaths = [...store.paths];
      newPaths[pathIndex] = updatedPath;
      store.replacePaths(newPaths);
    }
  });
  
  selectedImages.forEach(imageId => {
    store.updateImage(imageId, { locked: shouldLock });
  });
  
  selectedSymbols.forEach(symbolId => {
    store.updateSymbol(symbolId, { locked: shouldLock });
  });
  
  selectedUses.forEach(useId => {
    store.updateUse(useId, { locked: shouldLock });
  });
  
  selectedCommands.forEach(commandId => {
    for (const path of store.paths) {
      for (const subPath of path.subPaths) {
        const commandIndex = subPath.commands.findIndex(cmd => cmd.id === commandId);
        if (commandIndex >= 0) {
          const updatedCommands = [...subPath.commands];
          updatedCommands[commandIndex] = {
            ...updatedCommands[commandIndex],
            locked: shouldLock
          };
          store.replaceSubPathCommands(subPath.id, updatedCommands);
        }
      }
    }
  });
  
  // If locking, clear the entire selection
  if (shouldLock) {
    store.clearSelection();
  }
};

// Check if any elements in mixed selection are locked
const areMixedElementsLocked = (): boolean => {
  const store = useEditorStore.getState();
  const { selectedTexts, selectedSubPaths, selectedPaths, selectedImages, selectedSymbols, selectedUses, selectedCommands } = store.selection;
  
  // Check texts
  if (selectedTexts.some(textId => {
    const text = store.texts.find(t => t.id === textId);
    return text?.locked === true;
  })) return true;
  
  // Check subpaths
  if (selectedSubPaths.some(subPathId => {
    const subPath = store.paths.flatMap(path => path.subPaths).find(sp => sp.id === subPathId);
    return subPath?.locked === true;
  })) return true;
  
  // Check paths
  if (selectedPaths.some(pathId => {
    const path = store.paths.find(p => p.id === pathId);
    return path?.locked === true;
  })) return true;
  
  // Check images
  if (selectedImages.some(imageId => {
    const image = store.images.find(img => img.id === imageId);
    return image?.locked === true;
  })) return true;
  
  // Check symbols
  if (selectedSymbols.some(symbolId => {
    const symbol = store.symbols.find(sym => sym.id === symbolId);
    return symbol?.locked === true;
  })) return true;
  
  // Check uses
  if (selectedUses.some(useId => {
    const use = store.uses.find(u => u.id === useId);
    return use?.locked === true;
  })) return true;
  
  // Check commands
  if (selectedCommands.some(commandId => {
    for (const path of store.paths) {
      for (const subPath of path.subPaths) {
        const command = subPath.commands.find(cmd => cmd.id === commandId);
        if (command?.locked === true) return true;
      }
    }
    return false;
  })) return true;
  
  return false;
};

// Lock/unlock functions for different element types

// Lock/unlock selected images
const toggleImageLock = () => {
  const store = useEditorStore.getState();
  const selectedImages = store.selection.selectedImages;
  
  if (selectedImages.length === 0) return;
  
  store.pushToHistory();
  
  // Determine if we should lock or unlock based on the first selected image
  const firstImage = store.images.find(img => img.id === selectedImages[0]);
  const shouldLock = !firstImage?.locked;
  
  // Apply lock/unlock to all selected images
  selectedImages.forEach(imageId => {
    store.updateImage(imageId, { locked: shouldLock });
  });
  
  // If locking, clear selection
  if (shouldLock) {
    store.clearSelection();
  }
};

// Check if selected images are locked
const areImagesLocked = (): boolean => {
  const store = useEditorStore.getState();
  const selectedImages = store.selection.selectedImages;
  
  if (selectedImages.length === 0) return false;
  
  return selectedImages.some(imageId => {
    const image = store.images.find(img => img.id === imageId);
    return image?.locked === true;
  });
};

// Lock/unlock selected symbols
const toggleSymbolLock = () => {
  const store = useEditorStore.getState();
  const selectedSymbols = store.selection.selectedSymbols;
  
  if (selectedSymbols.length === 0) return;
  
  store.pushToHistory();
  
  const firstSymbol = store.symbols.find(sym => sym.id === selectedSymbols[0]);
  const shouldLock = !firstSymbol?.locked;
  
  selectedSymbols.forEach(symbolId => {
    store.updateSymbol(symbolId, { locked: shouldLock });
  });
  
  if (shouldLock) {
    store.clearSelection();
  }
};

// Lock/unlock selected uses
const toggleUseLock = () => {
  const store = useEditorStore.getState();
  const selectedUses = store.selection.selectedUses;
  
  if (selectedUses.length === 0) return;
  
  store.pushToHistory();
  
  const firstUse = store.uses.find(use => use.id === selectedUses[0]);
  const shouldLock = !firstUse?.locked;
  
  selectedUses.forEach(useId => {
    store.updateUse(useId, { locked: shouldLock });
  });
  
  if (shouldLock) {
    store.clearSelection();
  }
};

// Lock/unlock selected paths
const togglePathLock = () => {
  const store = useEditorStore.getState();
  const selectedPaths = store.selection.selectedPaths;
  
  if (selectedPaths.length === 0) return;
  
  store.pushToHistory();
  
  const firstPath = store.paths.find(path => path.id === selectedPaths[0]);
  const shouldLock = !firstPath?.locked;
  
  selectedPaths.forEach(pathId => {
    const pathIndex = store.paths.findIndex(p => p.id === pathId);
    if (pathIndex >= 0) {
      const updatedPath = { ...store.paths[pathIndex], locked: shouldLock };
      const newPaths = [...store.paths];
      newPaths[pathIndex] = updatedPath;
      store.replacePaths(newPaths);
    }
  });
  
  if (shouldLock) {
    store.clearSelection();
  }
};

// Lock/unlock selected commands
const toggleCommandLock = () => {
  const store = useEditorStore.getState();
  const selectedCommands = store.selection.selectedCommands;
  
  if (selectedCommands.length === 0) return;
  
  store.pushToHistory();
  
  // Find first command to determine lock state
  let firstCommand = null;
  for (const path of store.paths) {
    for (const subPath of path.subPaths) {
      firstCommand = subPath.commands.find(cmd => cmd.id === selectedCommands[0]);
      if (firstCommand) break;
    }
    if (firstCommand) break;
  }
  
  const shouldLock = !firstCommand?.locked;
  
  // Apply lock to all selected commands
  selectedCommands.forEach(commandId => {
    for (const path of store.paths) {
      for (const subPath of path.subPaths) {
        const commandIndex = subPath.commands.findIndex(cmd => cmd.id === commandId);
        if (commandIndex >= 0) {
          const updatedCommands = [...subPath.commands];
          updatedCommands[commandIndex] = {
            ...updatedCommands[commandIndex],
            locked: shouldLock
          };
          store.replaceSubPathCommands(subPath.id, updatedCommands);
        }
      }
    }
  });
  
  if (shouldLock) {
    store.clearSelection();
  }
};

// Check lock states for different element types
const areElementsLocked = (elementType: 'images' | 'symbols' | 'uses' | 'paths' | 'commands'): boolean => {
  const store = useEditorStore.getState();
  
  switch (elementType) {
    case 'images':
      return store.selection.selectedImages.some(id => 
        store.images.find(img => img.id === id)?.locked === true
      );
    case 'symbols':
      return store.selection.selectedSymbols.some(id => 
        store.symbols.find(sym => sym.id === id)?.locked === true
      );
    case 'uses':
      return store.selection.selectedUses.some(id => 
        store.uses.find(use => use.id === id)?.locked === true
      );
    case 'paths':
      return store.selection.selectedPaths.some(id => 
        store.paths.find(path => path.id === id)?.locked === true
      );
    case 'commands':
      return store.selection.selectedCommands.some(commandId => {
        for (const path of store.paths) {
          for (const subPath of path.subPaths) {
            const command = subPath.commands.find(cmd => cmd.id === commandId);
            if (command?.locked === true) return true;
          }
        }
        return false;
      });
    default:
      return false;
  }
};

// Clear style for mixed selections - reset to default values
const clearMixedStyle = () => {
  const store = useEditorStore.getState();
  const { selectedTexts, selectedSubPaths } = store.selection;
  
  if (selectedTexts.length === 0 && selectedSubPaths.length === 0) return;
  
  store.pushToHistory();
  
  // Define default style values for texts
  const defaultTextStyle = {
    fill: '#000000',
    stroke: undefined,
    strokeWidth: undefined,
    strokeDasharray: undefined,
    strokeLinecap: undefined,
    strokeLinejoin: undefined,
    filter: undefined,
    fontFamily: 'Arial',
    fontSize: 16,
    fontWeight: 'normal' as const,
    fontStyle: 'normal' as const,
    textAnchor: 'start' as const,
    opacity: undefined,
    fillOpacity: undefined,
    strokeOpacity: undefined
  };
  
  // Define default style values for subpaths
  const defaultSubPathStyle = {
    fill: '#000000',
    stroke: undefined,
    strokeWidth: undefined,
    strokeDasharray: undefined,
    strokeLinecap: undefined,
    strokeLinejoin: undefined,
    fillRule: undefined,
    filter: undefined,
    opacity: undefined,
    fillOpacity: undefined,
    strokeOpacity: undefined
  };
  
  // Apply default style to all selected texts
  selectedTexts.forEach(textId => {
    store.updateTextStyle(textId, defaultTextStyle);
  });
  
  // Apply default style to all selected subpaths (via their parent paths)
  const pathsToUpdate = new Set<string>();
  
  selectedSubPaths.forEach(subPathId => {
    const path = store.paths.find(p => 
      p.subPaths.some(sp => sp.id === subPathId)
    );
    if (path) {
      pathsToUpdate.add(path.id);
    }
  });
  
  pathsToUpdate.forEach(pathId => {
    store.updatePathStyle(pathId, defaultSubPathStyle);
  });
};

// Arrange functions for subpaths
const alignSubPathsLeft = () => {
  const store = useEditorStore.getState();
  const selectedSubPaths = getSelectedSubPaths();
  
  if (selectedSubPaths.length < 2) return;
  
  store.pushToHistory();
  
  // Get all subpath bounds and find leftmost position
  const subPathBounds = selectedSubPaths.map(({ subPath }) => {
    const commands = subPath.commands;
    const xs = commands.filter((cmd: SVGCommand) => cmd.x !== undefined).map((cmd: SVGCommand) => cmd.x!);
    return {
      subPath,
      leftX: Math.min(...xs),
      rightX: Math.max(...xs)
    };
  });
  
  const leftmostX = Math.min(...subPathBounds.map(b => b.leftX));
  
  // Calculate offset for each subpath and apply transform
  subPathBounds.forEach(({ subPath, leftX }) => {
    if (leftX !== leftmostX) {
      const deltaX = leftmostX - leftX;
      
      // Update all commands in the subpath
      const updatedCommands = subPath.commands.map((cmd: SVGCommand) => ({
        ...cmd,
        x: cmd.x !== undefined ? cmd.x + deltaX : cmd.x,
        x1: cmd.x1 !== undefined ? cmd.x1 + deltaX : cmd.x1,
        x2: cmd.x2 !== undefined ? cmd.x2 + deltaX : cmd.x2
      }));
      
      store.replaceSubPathCommands(subPath.id, updatedCommands);
    }
  });
};

const alignSubPathsCenter = () => {
  const store = useEditorStore.getState();
  const selectedSubPaths = getSelectedSubPaths();
  
  if (selectedSubPaths.length < 2) return;
  
  store.pushToHistory();
  
  // Get all subpath bounds and find center position
  const subPathBounds = selectedSubPaths.map(({ subPath }) => {
    const commands = subPath.commands;
    const xs = commands.filter((cmd: SVGCommand) => cmd.x !== undefined).map((cmd: SVGCommand) => cmd.x!);
    return {
      subPath,
      leftX: Math.min(...xs),
      rightX: Math.max(...xs),
      centerX: (Math.min(...xs) + Math.max(...xs)) / 2
    };
  });
  
  const leftmostX = Math.min(...subPathBounds.map(b => b.leftX));
  const rightmostX = Math.max(...subPathBounds.map(b => b.rightX));
  const targetCenterX = (leftmostX + rightmostX) / 2;
  
  // Calculate offset for each subpath and apply transform
  subPathBounds.forEach(({ subPath, centerX }) => {
    const deltaX = targetCenterX - centerX;
    
    if (Math.abs(deltaX) > 0.001) {
      // Update all commands in the subpath
      const updatedCommands = subPath.commands.map((cmd: SVGCommand) => ({
        ...cmd,
        x: cmd.x !== undefined ? cmd.x + deltaX : cmd.x,
        x1: cmd.x1 !== undefined ? cmd.x1 + deltaX : cmd.x1,
        x2: cmd.x2 !== undefined ? cmd.x2 + deltaX : cmd.x2
      }));
      
      store.replaceSubPathCommands(subPath.id, updatedCommands);
    }
  });
};

const alignSubPathsRight = () => {
  const store = useEditorStore.getState();
  const selectedSubPaths = getSelectedSubPaths();
  
  if (selectedSubPaths.length < 2) return;
  
  store.pushToHistory();
  
  // Get all subpath bounds and find rightmost position
  const subPathBounds = selectedSubPaths.map(({ subPath }) => {
    const commands = subPath.commands;
    const xs = commands.filter((cmd: SVGCommand) => cmd.x !== undefined).map((cmd: SVGCommand) => cmd.x!);
    return {
      subPath,
      leftX: Math.min(...xs),
      rightX: Math.max(...xs)
    };
  });
  
  const rightmostX = Math.max(...subPathBounds.map(b => b.rightX));
  
  // Calculate offset for each subpath and apply transform
  subPathBounds.forEach(({ subPath, rightX }) => {
    if (rightX !== rightmostX) {
      const deltaX = rightmostX - rightX;
      
      // Update all commands in the subpath
      const updatedCommands = subPath.commands.map((cmd: SVGCommand) => ({
        ...cmd,
        x: cmd.x !== undefined ? cmd.x + deltaX : cmd.x,
        x1: cmd.x1 !== undefined ? cmd.x1 + deltaX : cmd.x1,
        x2: cmd.x2 !== undefined ? cmd.x2 + deltaX : cmd.x2
      }));
      
      store.replaceSubPathCommands(subPath.id, updatedCommands);
    }
  });
};

const alignSubPathsTop = () => {
  const store = useEditorStore.getState();
  const selectedSubPaths = getSelectedSubPaths();
  
  if (selectedSubPaths.length < 2) return;
  
  store.pushToHistory();
  
  // Get all subpath bounds and find topmost position
  const subPathBounds = selectedSubPaths.map(({ subPath }) => {
    const commands = subPath.commands;
    const ys = commands.filter((cmd: SVGCommand) => cmd.y !== undefined).map((cmd: SVGCommand) => cmd.y!);
    return {
      subPath,
      topY: Math.min(...ys),
      bottomY: Math.max(...ys)
    };
  });
  
  const topmostY = Math.min(...subPathBounds.map(b => b.topY));
  
  // Calculate offset for each subpath and apply transform
  subPathBounds.forEach(({ subPath, topY }) => {
    if (topY !== topmostY) {
      const deltaY = topmostY - topY;
      
      // Update all commands in the subpath
      const updatedCommands = subPath.commands.map((cmd: SVGCommand) => ({
        ...cmd,
        y: cmd.y !== undefined ? cmd.y + deltaY : cmd.y,
        y1: cmd.y1 !== undefined ? cmd.y1 + deltaY : cmd.y1,
        y2: cmd.y2 !== undefined ? cmd.y2 + deltaY : cmd.y2
      }));
      
      store.replaceSubPathCommands(subPath.id, updatedCommands);
    }
  });
};

const alignSubPathsMiddle = () => {
  const store = useEditorStore.getState();
  const selectedSubPaths = getSelectedSubPaths();
  
  if (selectedSubPaths.length < 2) return;
  
  store.pushToHistory();
  
  // Get all subpath bounds and find middle position
  const subPathBounds = selectedSubPaths.map(({ subPath }) => {
    const commands = subPath.commands;
    const ys = commands.filter((cmd: SVGCommand) => cmd.y !== undefined).map((cmd: SVGCommand) => cmd.y!);
    return {
      subPath,
      topY: Math.min(...ys),
      bottomY: Math.max(...ys),
      centerY: (Math.min(...ys) + Math.max(...ys)) / 2
    };
  });
  
  const topmostY = Math.min(...subPathBounds.map(b => b.topY));
  const bottommostY = Math.max(...subPathBounds.map(b => b.bottomY));
  const targetCenterY = (topmostY + bottommostY) / 2;
  
  // Calculate offset for each subpath and apply transform
  subPathBounds.forEach(({ subPath, centerY }) => {
    const deltaY = targetCenterY - centerY;
    
    if (Math.abs(deltaY) > 0.001) {
      // Update all commands in the subpath
      const updatedCommands = subPath.commands.map((cmd: SVGCommand) => ({
        ...cmd,
        y: cmd.y !== undefined ? cmd.y + deltaY : cmd.y,
        y1: cmd.y1 !== undefined ? cmd.y1 + deltaY : cmd.y1,
        y2: cmd.y2 !== undefined ? cmd.y2 + deltaY : cmd.y2
      }));
      
      store.replaceSubPathCommands(subPath.id, updatedCommands);
    }
  });
};

const alignSubPathsBottom = () => {
  const store = useEditorStore.getState();
  const selectedSubPaths = getSelectedSubPaths();
  
  if (selectedSubPaths.length < 2) return;
  
  store.pushToHistory();
  
  // Get all subpath bounds and find bottommost position
  const subPathBounds = selectedSubPaths.map(({ subPath }) => {
    const commands = subPath.commands;
    const ys = commands.filter((cmd: SVGCommand) => cmd.y !== undefined).map((cmd: SVGCommand) => cmd.y!);
    return {
      subPath,
      topY: Math.min(...ys),
      bottomY: Math.max(...ys)
    };
  });
  
  const bottommostY = Math.max(...subPathBounds.map(b => b.bottomY));
  
  // Calculate offset for each subpath and apply transform
  subPathBounds.forEach(({ subPath, bottomY }) => {
    if (bottomY !== bottommostY) {
      const deltaY = bottommostY - bottomY;
      
      // Update all commands in the subpath
      const updatedCommands = subPath.commands.map((cmd: SVGCommand) => ({
        ...cmd,
        y: cmd.y !== undefined ? cmd.y + deltaY : cmd.y,
        y1: cmd.y1 !== undefined ? cmd.y1 + deltaY : cmd.y1,
        y2: cmd.y2 !== undefined ? cmd.y2 + deltaY : cmd.y2
      }));
      
      store.replaceSubPathCommands(subPath.id, updatedCommands);
    }
  });
};

const distributeSubPathsHorizontally = () => {
  const store = useEditorStore.getState();
  const selectedSubPaths = getSelectedSubPaths();
  
  if (selectedSubPaths.length < 3) return;
  
  store.pushToHistory();
  
  // Get all subpath bounds and sort by center position
  const subPathBounds = selectedSubPaths.map(({ subPath }) => {
    const commands = subPath.commands;
    const xs = commands.filter((cmd: SVGCommand) => cmd.x !== undefined).map((cmd: SVGCommand) => cmd.x!);
    return {
      subPath,
      leftX: Math.min(...xs),
      rightX: Math.max(...xs),
      centerX: (Math.min(...xs) + Math.max(...xs)) / 2
    };
  });
  
  // Sort by center position
  const sortedBounds = subPathBounds.sort((a, b) => a.centerX - b.centerX);
  
  const leftmostCenter = sortedBounds[0].centerX;
  const rightmostCenter = sortedBounds[sortedBounds.length - 1].centerX;
  const spacing = (rightmostCenter - leftmostCenter) / (sortedBounds.length - 1);
  
  // Distribute subpaths evenly (skip first and last)
  sortedBounds.forEach((bound, index) => {
    if (index > 0 && index < sortedBounds.length - 1) {
      const targetCenterX = leftmostCenter + spacing * index;
      const deltaX = targetCenterX - bound.centerX;
      
      if (Math.abs(deltaX) > 0.001) {
        // Update all commands in the subpath
        const updatedCommands = bound.subPath.commands.map((cmd: SVGCommand) => ({
          ...cmd,
          x: cmd.x !== undefined ? cmd.x + deltaX : cmd.x,
          x1: cmd.x1 !== undefined ? cmd.x1 + deltaX : cmd.x1,
          x2: cmd.x2 !== undefined ? cmd.x2 + deltaX : cmd.x2
        }));
        
        store.replaceSubPathCommands(bound.subPath.id, updatedCommands);
      }
    }
  });
};

const distributeSubPathsVertically = () => {
  const store = useEditorStore.getState();
  const selectedSubPaths = getSelectedSubPaths();
  
  if (selectedSubPaths.length < 3) return;
  
  store.pushToHistory();
  
  // Get all subpath bounds and sort by center position
  const subPathBounds = selectedSubPaths.map(({ subPath }) => {
    const commands = subPath.commands;
    const ys = commands.filter((cmd: SVGCommand) => cmd.y !== undefined).map((cmd: SVGCommand) => cmd.y!);
    return {
      subPath,
      topY: Math.min(...ys),
      bottomY: Math.max(...ys),
      centerY: (Math.min(...ys) + Math.max(...ys)) / 2
    };
  });
  
  // Sort by center position
  const sortedBounds = subPathBounds.sort((a, b) => a.centerY - b.centerY);
  
  const topmostCenter = sortedBounds[0].centerY;
  const bottommostCenter = sortedBounds[sortedBounds.length - 1].centerY;
  const spacing = (bottommostCenter - topmostCenter) / (sortedBounds.length - 1);
  
  // Distribute subpaths evenly (skip first and last)
  sortedBounds.forEach((bound, index) => {
    if (index > 0 && index < sortedBounds.length - 1) {
      const targetCenterY = topmostCenter + spacing * index;
      const deltaY = targetCenterY - bound.centerY;
      
      if (Math.abs(deltaY) > 0.001) {
        // Update all commands in the subpath
        const updatedCommands = bound.subPath.commands.map((cmd: SVGCommand) => ({
          ...cmd,
          y: cmd.y !== undefined ? cmd.y + deltaY : cmd.y,
          y1: cmd.y1 !== undefined ? cmd.y1 + deltaY : cmd.y1,
          y2: cmd.y2 !== undefined ? cmd.y2 + deltaY : cmd.y2
        }));
        
        store.replaceSubPathCommands(bound.subPath.id, updatedCommands);
      }
    }
  });
};

const bringToFront = () => {
  const store = useEditorStore.getState();
  
  store.selection.selectedPaths.forEach(pathId => {
    // TODO: Implement bring to front functionality
      });
};

const sendToBack = () => {
  const store = useEditorStore.getState();
  
  store.selection.selectedPaths.forEach(pathId => {
    // TODO: Implement send to back functionality
      });
};

// Generic function to apply filters to selected paths
const applyFilterToPaths = (filterCreatorFn: () => any) => {
  const store = useEditorStore.getState();
  const selectedPaths = getSelectedPaths();
  
  if (selectedPaths.length === 0) return;
  
  // Create the filter
  const filterData = filterCreatorFn();
  store.addFilter(filterData);
  
  // Apply using a timeout to ensure the store is updated
  setTimeout(() => {
    // Access filters from the store directly to get the most current state
    const storeState = useEditorStore.getState();
    const currentFilters = storeState.filters;
    const newFilter = currentFilters[currentFilters.length - 1]; // Get the last added filter
    
    if (newFilter && newFilter.id) {
      const filterRef = formatSVGReference(newFilter.id);
      
      // Apply filter to each selected path
      selectedPaths.forEach(path => {
        if (path && path.id) {
          storeState.updatePathStyle(path.id, { 
            filter: filterRef
          });
        }
      });
    }
  }, 0);
};

// Alignment options
const alignmentOptions = [
  { 
    id: 'align-left', 
    label: 'Align Left', 
    icon: AlignLeft,
    action: () => console.warn('Align left - needs implementation') 
  },
  { 
    id: 'align-center', 
    label: 'Align Center', 
    icon: AlignCenter,
    action: () => console.warn('Align center - needs implementation') 
  },
  { 
    id: 'align-right', 
    label: 'Align Right', 
    icon: AlignRight,
    action: () => console.warn('Align right - needs implementation') 
  }
];

// Arrange options for regular elements
const arrangeOptions = [
  { 
    id: 'bring-front', 
    label: 'Bring to Front', 
    icon: ArrowUp,
    action: bringToFront 
  },
  { 
    id: 'send-back', 
    label: 'Send to Back', 
    icon: ArrowDown,
    action: sendToBack 
  }
];

// Specific filter functions for paths (using the generic function)
const applyBlurFilterToPaths = () => applyFilterToPaths(createBlurFilter);
const applyDropShadowToPaths = () => applyFilterToPaths(createDropShadowFilter);
const applyGlowFilterToPaths = () => applyFilterToPaths(createGlowFilter);
const applyGrayscaleFilterToPaths = () => applyFilterToPaths(createGrayscaleFilter);
const applySepiaFilterToPaths = () => applyFilterToPaths(createSepiaFilter);
const applyEmbossFilterToPaths = () => applyFilterToPaths(createEmbossFilter);
const applyNeonGlowFilterToPaths = () => applyFilterToPaths(createNeonGlowFilter);

// Filter options for regular elements
const filterOptions = [
  { 
    id: 'blur', 
    label: 'Blur', 
    action: applyBlurFilterToPaths 
  },
  { 
    id: 'shadow', 
    label: 'Drop Shadow', 
    action: applyDropShadowToPaths 
  },
  { 
    id: 'glow', 
    label: 'Glow', 
    action: applyGlowFilterToPaths 
  },
  { 
    id: 'grayscale', 
    label: 'Grayscale', 
    action: applyGrayscaleFilterToPaths 
  },
  { 
    id: 'sepia', 
    label: 'Sepia', 
    action: applySepiaFilterToPaths 
  },
  { 
    id: 'emboss', 
    label: 'Emboss', 
    action: applyEmbossFilterToPaths 
  },
  { 
    id: 'neon-glow', 
    label: 'Neon Glow', 
    action: applyNeonGlowFilterToPaths 
  }
];

// Animation options for regular elements
const animationOptions = [
  { 
    id: 'fade', 
    label: 'Fade In/Out', 
    action: () => console.warn('Add fade animation - needs implementation') 
  },
  { 
    id: 'move', 
    label: 'Move', 
    action: () => console.warn('Add move animation - needs implementation') 
  }
];

// Single element actions (paths, subpaths)
export const singleElementActions: ToolbarAction[] = [
  {
    id: 'fill-color',
    icon: Palette,
    label: 'Fill Color',
    type: 'color',
    color: {
      currentColor: getCommonFillColor(),
      onChange: applyFillColor
    },
    priority: 100,
    tooltip: 'Change fill color'
  },
  {
    id: 'stroke-color',
    icon: Brush,
    label: 'Stroke Color',
    type: 'color',
    color: {
      currentColor: getCommonStrokeColor(),
      onChange: applyStrokeColor
    },
    priority: 90,
    tooltip: 'Change stroke color'
  },
  {
    id: 'arrange',
    icon: Layers,
    label: 'Arrange',
    type: 'dropdown',
    dropdown: {
      options: arrangeOptions
    },
    priority: 70,
    tooltip: 'Arrange layer order'
  },
  {
    id: 'filters',
    icon: Filter,
    label: 'Filters',
    type: 'dropdown',
    dropdown: {
      options: filterOptions
    },
    priority: 60,
    tooltip: 'Apply filters'
  },
  {
    id: 'animations',
    icon: Play,
    label: 'Animations',
    type: 'dropdown',
    dropdown: {
      options: animationOptions
    },
    priority: 50,
    tooltip: 'Add animations'
  },
  {
    id: 'duplicate-element',
    icon: Copy,
    label: 'Duplicate',
    type: 'button',
    action: duplicateSelected,
    priority: 20,
    tooltip: 'Duplicate element'
  },
  {
    id: 'delete-element',
    icon: Trash2,
    label: 'Delete',
    type: 'button',
    action: deleteSelected,
    priority: 10,
    destructive: true,
    tooltip: 'Delete element'
  }
];

// Multiple selection actions
export const multipleSelectionActions: ToolbarAction[] = [
  {
    id: 'group-selected',
    icon: Group,
    label: 'Group',
    type: 'button',
    action: groupSelected,
    priority: 100,
    tooltip: 'Group selected elements'
  },
  {
    id: 'align-multiple',
    icon: AlignCenter,
    label: 'Align',
    type: 'dropdown',
    dropdown: {
      options: alignmentOptions
    },
    priority: 90,
    tooltip: 'Align elements'
  },
  {
    id: 'common-fill',
    icon: Palette,
    label: 'Fill Color',
    type: 'color',
    color: {
      currentColor: getCommonFillColor(),
      onChange: applyFillColor
    },
    priority: 80,
    tooltip: 'Change fill color'
  },
  {
    id: 'common-stroke',
    icon: Brush,
    label: 'Stroke Color',
    type: 'color',
    color: {
      currentColor: getCommonStrokeColor(),
      onChange: applyStrokeColor
    },
    priority: 70,
    tooltip: 'Change stroke color'
  },
  {
    id: 'arrange-multiple',
    icon: Layers,
    label: 'Arrange',
    type: 'dropdown',
    dropdown: {
      options: arrangeOptions
    },
    priority: 60,
    tooltip: 'Arrange layer order'
  },
  {
    id: 'duplicate-multiple',
    icon: Copy,
    label: 'Duplicate All',
    type: 'button',
    action: duplicateSelected,
    priority: 20,
    tooltip: 'Duplicate all selected'
  },
  {
    id: 'delete-multiple',
    icon: Trash2,
    label: 'Delete All',
    type: 'button',
    action: deleteSelected,
    priority: 10,
    destructive: true,
    tooltip: 'Delete all selected'
  }
];

// Group utility functions
const getSelectedGroupsData = () => {
  const store = useEditorStore.getState();
  return store.selection.selectedGroups.map(id => 
    store.getGroupById(id)
  ).filter((group): group is NonNullable<typeof group> => Boolean(group));
};

const getCommonGroupVisibility = (): boolean => {
  const groups = getSelectedGroupsData();
  if (groups.length === 0) return true;
  
  const firstVisibility = groups[0]?.visible !== false;
  return groups.every(group => (group?.visible !== false) === firstVisibility) ? firstVisibility : true;
};

const getCommonGroupLockLevel = (): 'none' | 'selection' | 'editing' | 'movement-sync' | 'full' => {
  const groups = getSelectedGroupsData();
  if (groups.length === 0) return 'none';
  
  const firstLockLevel = groups[0]?.lockLevel || (groups[0]?.locked ? 'full' : 'none');
  const allSame = groups.every(group => {
    const lockLevel = group?.lockLevel || (group?.locked ? 'full' : 'none');
    return lockLevel === firstLockLevel;
  });
  
  return allSame ? firstLockLevel : 'none';
};

// Group action functions
const toggleGroupVisibility = () => {
  const store = useEditorStore.getState();
  
  store.selection.selectedGroups.forEach(groupId => {
    store.toggleGroupVisibility(groupId);
  });
};

const toggleGroupLock = () => {
  const store = useEditorStore.getState();
  const currentLockLevel = getCommonGroupLockLevel();
  const newLockLevel = currentLockLevel === 'none' ? 'full' : 'none';
  
  store.selection.selectedGroups.forEach(groupId => {
    store.setGroupLockLevel(groupId, newLockLevel);
  });
};

// Helper function to calculate group bounds (similar to GroupRenderer)
const calculateGroupBounds = (group: any) => {
  if (typeof document === 'undefined') return null;

  const store = useEditorStore.getState();
  const { paths, texts, images } = store;

  const svgNS = 'http://www.w3.org/2000/svg';
  const tempSvg = document.createElementNS(svgNS, 'svg') as SVGSVGElement;
  let hasContent = false;

  // Add all children of the group to the temp SVG
  for (const child of group.children) {
    switch (child.type) {
      case 'path': {
        const path = paths.find((p: any) => p.id === child.id);
        if (path) {
          for (const subPath of path.subPaths) {
            const pathElement = document.createElementNS(svgNS, 'path');
            const pathData = subPathToString(subPath);
            if (pathData) {
              pathElement.setAttribute('d', pathData);
              tempSvg.appendChild(pathElement);
              hasContent = true;
            }
          }
        }
        break;
      }
      case 'text': {
        const text = texts.find((t: any) => t.id === child.id);
        if (text) {
          const bounds = calculateTextBoundsDOM(text);
          if (bounds) {
            const pathElement = document.createElementNS(svgNS, 'path');
            const pathData = `M ${bounds.x},${bounds.y} L ${bounds.x + bounds.width},${bounds.y} L ${bounds.x + bounds.width},${bounds.y + bounds.height} L ${bounds.x},${bounds.y + bounds.height} Z`;
            pathElement.setAttribute('d', pathData);
            pathElement.setAttribute('fill', 'none');
            pathElement.setAttribute('stroke', 'none');
            tempSvg.appendChild(pathElement);
            hasContent = true;
          }
        }
        break;
      }
      case 'image': {
        const image = images.find((img: any) => img.id === child.id);
        if (image) {
          const imageElement = document.createElementNS(svgNS, 'image');
          imageElement.setAttribute('x', image.x.toString());
          imageElement.setAttribute('y', image.y.toString());
          imageElement.setAttribute('width', image.width.toString());
          imageElement.setAttribute('height', image.height.toString());
          if (image.transform) {
            imageElement.setAttribute('transform', image.transform);
          }
          tempSvg.appendChild(imageElement);
          hasContent = true;
        }
        break;
      }
    }
  }

  if (!hasContent) {
    return null;
  }

  const viewBoxResult = calculateGlobalViewBox(tempSvg);
  
  // Clean up
  if (tempSvg.parentNode) {
    tempSvg.parentNode.removeChild(tempSvg);
  }

  if (!viewBoxResult || viewBoxResult.width <= 0 || viewBoxResult.height <= 0) {
    return null;
  }

  const viewBoxParts = viewBoxResult.viewBox.split(' ').map(Number);
  const [x, y, width, height] = viewBoxParts;

  const padding = Math.max(2, Math.max(width, height) * 0.05);
  const actualX = x + padding;
  const actualY = y + padding;
  const actualWidth = width - padding * 2;
  const actualHeight = height - padding * 2;

  return {
    x: actualX,
    y: actualY,
    width: actualWidth,
    height: actualHeight
  };
};

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

const deleteGroups = () => {
  const store = useEditorStore.getState();
  
  store.selection.selectedGroups.forEach(groupId => {
    store.deleteGroup(groupId, true); // Delete with children
  });
  
  store.clearSelection();
};

const exportGroupSVG = () => {
  const store = useEditorStore.getState();
  
  store.selection.selectedGroups.forEach(groupId => {
    store.exportGroupSVG(groupId, true); // Auto download
  });
};

const bringGroupsToFront = () => {
  const reorderManager = new ReorderManager();
  const store = useEditorStore.getState();
  reorderManager.setEditorStore(store);
  
  reorderManager.bringToFront();
};

const sendGroupsToBack = () => {
  const reorderManager = new ReorderManager();
  const store = useEditorStore.getState();
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
            uses: state.uses.map((use, index) => 
              index === useIndex ? { ...use, locked: shouldLock } : use
            )
          }));
        }
        break;
        
      case 'group':
        // Recursively lock/unlock nested groups
        recursivelyLockGroup(child.id, shouldLock);
        break;
        
      case 'textPath':
        // Lock/unlock textPath element
        const textPathIndex = store.textPaths.findIndex(tp => tp.id === child.id);
        if (textPathIndex !== -1) {
          useEditorStore.setState(state => ({
            textPaths: state.textPaths.map((tp, index) => 
              index === textPathIndex ? { ...tp, locked: shouldLock } : tp
            )
          }));
        }
        break;
        
        
      default:
        console.warn(`Unsupported child type for recursive lock: ${child.type}`);
        break;
    }
  });
};

// Helper function to recursively lock/unlock a path and all its subpaths and commands
export const recursivelyLockPath = (pathId: string, shouldLock: boolean) => {
  const store = useEditorStore.getState();
  const pathIndex = store.paths.findIndex(p => p.id === pathId);
  
  if (pathIndex === -1) return;
  
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
};

// Helper function to recursively lock/unlock a subpath and all its commands
export const recursivelyLockSubPath = (subPathId: string, shouldLock: boolean) => {
  const store = useEditorStore.getState();
  
  // Find the path that contains this subpath
  for (let pathIndex = 0; pathIndex < store.paths.length; pathIndex++) {
    const path = store.paths[pathIndex];
    const subPathIndex = path.subPaths.findIndex(sp => sp.id === subPathId);
    
    if (subPathIndex !== -1) {
      const updatedSubPath = {
        ...path.subPaths[subPathIndex],
        locked: shouldLock,
        commands: path.subPaths[subPathIndex].commands.map(command => ({
          ...command,
          locked: shouldLock
        }))
      };
      
      const updatedPath = {
        ...path,
        subPaths: path.subPaths.map((sp, index) => 
          index === subPathIndex ? updatedSubPath : sp
        )
      };
      
      // Update the path in the store
      useEditorStore.setState(state => ({
        paths: state.paths.map((p, index) => 
          index === pathIndex ? updatedPath : p
        )
      }));
      return;
    }
  }
};

// Check if groups are recursively locked
const areGroupsRecursivelyLocked = (): boolean => {
  const store = useEditorStore.getState();
  const selectedGroupIds = store.selection.selectedGroups;
  
  if (selectedGroupIds.length === 0) return false;
  
  return selectedGroupIds.every(groupId => {
    return isGroupRecursivelyLocked(groupId);
  });
};

// Helper function to check if a group and all its children are locked
const isGroupRecursivelyLocked = (groupId: string): boolean => {
  const store = useEditorStore.getState();
  const group = store.getGroupById(groupId);
  
  if (!group) return false;
  
  // Check if group itself is locked
  const isGroupLocked = group.locked || group.lockLevel === 'full';
  if (!isGroupLocked) return false;
  
  // Check if all children are locked
  return group.children.every(child => {
    switch (child.type) {
      case 'path':
        const path = store.paths.find(p => p.id === child.id);
        if (!path || !path.locked) return false;
        
        // Check if all subpaths and commands are locked
        return path.subPaths.every(subPath => {
          if (!subPath.locked) return false;
          return subPath.commands.every(command => command.locked);
        });
        
      case 'text':
        const text = store.texts.find(t => t.id === child.id);
        return text?.locked === true;
        
      case 'image':
        const image = store.images.find(img => img.id === child.id);
        return image?.locked === true;
        
      case 'use':
        const use = store.uses.find(u => u.id === child.id);
        return use?.locked === true;
        
      case 'group':
        // Recursively check nested groups
        return isGroupRecursivelyLocked(child.id);
        
      case 'textPath':
        const textPath = store.textPaths.find(tp => tp.id === child.id);
        return textPath?.locked === true;
        
        
      default:
        return true; // Unknown types are considered "locked"
    }
  });
};

// Enhanced Group actions
export const groupActions: ToolbarAction[] = [
  {
    id: 'group-recursive-lock',
    get icon() {
      return areGroupsRecursivelyLocked() ? Lock : Unlock;
    },
    get label() {
      return areGroupsRecursivelyLocked() ? 'Unlock All' : 'Lock All';
    },
    type: 'button',
    action: toggleGroupRecursiveLock,
    priority: 105,
    get tooltip() {
      return areGroupsRecursivelyLocked() 
        ? 'Unlock group and all its elements recursively' 
        : 'Lock group and all its elements recursively';
    }
  },
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
    id: 'group-arrange',
    icon: Layers,
    label: 'Arrange',
    type: 'dropdown',
    dropdown: {
      options: groupArrangeOptions
    },
    priority: 80,
    tooltip: 'Arrange group order'
  },
  {
    id: 'group-export',
    icon: Compass,
    label: 'Export SVG',
    type: 'button',
    action: exportGroupSVG,
    priority: 70,
    tooltip: 'Export group as SVG file'
  },
  {
    id: 'duplicate-group',
    icon: Copy,
    label: 'Duplicate',
    type: 'button',
    action: duplicateGroups,
    priority: 20,
    tooltip: 'Duplicate group'
  },
  {
    id: 'delete-group',
    icon: Trash2,
    label: 'Delete',
    type: 'button',
    action: deleteGroups,
    priority: 10,
    destructive: true,
    tooltip: 'Delete group'
  }
];

// SubPath-specific utility functions
const getCommonSubPathFillColor = (): string | any => {
  const store = useEditorStore.getState();
  const selectedSubPaths = getSelectedSubPaths();
  if (selectedSubPaths.length === 0) return '#000000';
  
  const firstSubPath = selectedSubPaths[0];
  const firstFill = firstSubPath?.path?.style?.fill;
  if (!firstFill) return '#000000';
  
  // Check if all subpaths have the same fill value (could be string color or gradient object)
  const allSame = selectedSubPaths.every(sp => {
    const pathFill = sp?.path?.style?.fill;
    if (typeof firstFill === 'string' && typeof pathFill === 'string') {
      return pathFill === firstFill;
    } else if (typeof firstFill === 'object' && typeof pathFill === 'object') {
      // For gradient objects, compare by id
      return pathFill?.id === firstFill?.id;
    }
    return false;
  });
  
  return allSame ? firstFill : '#000000';
};

const getCommonSubPathStrokeColor = (): string | any => {
  const store = useEditorStore.getState();
  const selectedSubPaths = getSelectedSubPaths();
  if (selectedSubPaths.length === 0) return '#000000';
  
  const firstSubPath = selectedSubPaths[0];
  const firstStroke = firstSubPath?.path?.style?.stroke;
  if (!firstStroke) return '#000000';
  
  // Check if all subpaths have the same stroke value (could be string color or gradient object)
  const allSame = selectedSubPaths.every(sp => {
    const pathStroke = sp?.path?.style?.stroke;
    if (typeof firstStroke === 'string' && typeof pathStroke === 'string') {
      return pathStroke === firstStroke;
    } else if (typeof firstStroke === 'object' && typeof pathStroke === 'object') {
      // For gradient objects, compare by id
      return pathStroke?.id === firstStroke?.id;
    }
    return false;
  });
  
  return allSame ? firstStroke : '#000000';
};

// Apply fill color to selected subpaths
const applySubPathFillColor = (color: string | any) => {
  const store = useEditorStore.getState();
  const selectedSubPaths = getSelectedSubPaths();
  
  selectedSubPaths.forEach(({ path }) => {
    if (path && path.id) {
      store.updatePathStyle(path.id, { fill: color });
    }
  });
};

// Apply stroke color to selected subpaths
const applySubPathStrokeColor = (color: string | any) => {
  const store = useEditorStore.getState();
  const selectedSubPaths = getSelectedSubPaths();
  
  selectedSubPaths.forEach(({ path }) => {
    if (path && path.id) {
      store.updatePathStyle(path.id, { stroke: color });
    }
  });
};

// Duplicate selected subpaths
const duplicateSubPaths = () => {
  const store = useEditorStore.getState();
  
  // Use the existing duplicateSelection method which handles subpaths
  if (store.selection.selectedSubPaths.length > 0) {
    store.duplicateSelection();
  }
};

// Delete selected subpaths
const deleteSubPaths = () => {
  const store = useEditorStore.getState();
  
  // Delete each selected subpath using removeSubPath
  const subPathIds = [...store.selection.selectedSubPaths]; // Copy array to avoid mutation issues
  subPathIds.forEach(subPathId => {
    store.removeSubPath(subPathId);
  });
  
  // Selection is automatically cleared by removeSubPath
};

// Lock/unlock selected subpaths
const toggleSubPathLock = () => {
  const store = useEditorStore.getState();
  const selectedSubPaths = store.selection.selectedSubPaths;
  
  if (selectedSubPaths.length === 0) return;
  
  store.pushToHistory();
  
  // Determine if we should lock or unlock based on the first selected subpath
  const firstSubPath = store.paths
    .flatMap(path => path.subPaths)
    .find(subPath => subPath.id === selectedSubPaths[0]);
  
  const shouldLock = !firstSubPath?.locked;
  
  // Apply lock/unlock to all selected subpaths
  selectedSubPaths.forEach(subPathId => {
    const pathWithSubPath = store.paths.find(path => 
      path.subPaths.some(sp => sp.id === subPathId)
    );
    
    if (pathWithSubPath) {
      const subPathIndex = pathWithSubPath.subPaths.findIndex(sp => sp.id === subPathId);
      if (subPathIndex >= 0) {
        const updatedSubPath = {
          ...pathWithSubPath.subPaths[subPathIndex],
          locked: shouldLock
        };
        
        store.updateSubPath(subPathId, updatedSubPath);
      }
    }
  });
  
  // If locking, clear selection as locked subpaths shouldn't be selectable
  if (shouldLock) {
    store.clearSelection();
  }
};

// Check if selected subpaths are locked
const areSubPathsLocked = (): boolean => {
  const store = useEditorStore.getState();
  const selectedSubPaths = store.selection.selectedSubPaths;
  
  if (selectedSubPaths.length === 0) return false;
  
  // Check if any of the selected subpaths are locked
  return selectedSubPaths.some(subPathId => {
    const subPath = store.paths
      .flatMap(path => path.subPaths)
      .find(sp => sp.id === subPathId);
    return subPath?.locked === true;
  });
};

// Clear style for selected subpaths - reset to default values
const clearSubPathStyle = () => {
  const store = useEditorStore.getState();
  const selectedSubPaths = store.selection.selectedSubPaths;
  
  if (selectedSubPaths.length === 0) return;
  
  store.pushToHistory();
  
  // Define default subpath style values
  const defaultStyle = {
    fill: '#000000',
    stroke: undefined,
    strokeWidth: undefined,
    strokeDasharray: undefined,
    strokeLinecap: undefined,
    strokeLinejoin: undefined,
    fillRule: undefined,
    filter: undefined,
    opacity: undefined,
    fillOpacity: undefined,
    strokeOpacity: undefined
  };
  
  // Find the unique paths that contain the selected subpaths and update their styles
  const pathsToUpdate = new Set<string>();
  
  selectedSubPaths.forEach(subPathId => {
    const path = store.paths.find(p => 
      p.subPaths.some(sp => sp.id === subPathId)
    );
    if (path) {
      pathsToUpdate.add(path.id);
    }
  });
  
  // Apply default style to all paths containing selected subpaths
  pathsToUpdate.forEach(pathId => {
    store.updatePathStyle(pathId, defaultStyle);
  });
};

// Bring subpaths to front
const bringSubPathsToFront = () => {
  const reorderManager = new ReorderManager();
  const store = useEditorStore.getState();
  reorderManager.setEditorStore(store);
  
  reorderManager.bringToFront();
  };

// Send subpaths to back
const sendSubPathsToBack = () => {
  const reorderManager = new ReorderManager();
  const store = useEditorStore.getState();
  reorderManager.setEditorStore(store);
  
  reorderManager.sendToBack();
  };

// Get common stroke width for subpaths
const getCommonSubPathStrokeWidth = (): number => {
  const selectedSubPaths = getSelectedSubPaths();
  if (selectedSubPaths.length === 0) return 1;
  
  const firstStrokeWidth = selectedSubPaths[0]?.path?.style?.strokeWidth;
  const strokeWidth = typeof firstStrokeWidth === 'number' ? firstStrokeWidth : 1;
  const allSame = selectedSubPaths.every(({ path }) => {
    const pathStrokeWidth = path?.style?.strokeWidth;
    return typeof pathStrokeWidth === 'number' && pathStrokeWidth === strokeWidth;
  });
  
  return allSame ? strokeWidth : 1;
};

// Apply stroke width to subpaths
const applySubPathStrokeWidth = (width: string | number) => {
  const strokeWidth = typeof width === 'number' ? width : parseFloat(width);
  if (isNaN(strokeWidth) || strokeWidth < 0) return;
  
  const store = useEditorStore.getState();
  const selectedSubPaths = getSelectedSubPaths();
  
  selectedSubPaths.forEach(({ path }) => {
    if (path && path.id) {
      store.updatePathStyle(path.id, { strokeWidth });
    }
  });
};

// Get common stroke dash for subpaths
const getCommonSubPathStrokeDash = (): string => {
  const selectedSubPaths = getSelectedSubPaths();
  if (selectedSubPaths.length === 0) return 'none';
  
  const firstStrokeDash = selectedSubPaths[0]?.path?.style?.strokeDasharray;
  const strokeDash = typeof firstStrokeDash === 'string' ? firstStrokeDash : 'none';
  const allSame = selectedSubPaths.every(({ path }) => {
    const pathStrokeDash = path?.style?.strokeDasharray;
    return typeof pathStrokeDash === 'string' && pathStrokeDash === strokeDash;
  });
  
  return allSame ? strokeDash : 'none';
};

// Get common stroke linecap for subpaths
const getCommonSubPathStrokeLinecap = (): string => {
  const selectedSubPaths = getSelectedSubPaths();
  if (selectedSubPaths.length === 0) return 'butt';
  
  const firstStrokeLinecap = selectedSubPaths[0]?.path?.style?.strokeLinecap;
  const strokeLinecap = typeof firstStrokeLinecap === 'string' ? firstStrokeLinecap : 'butt';
  const allSame = selectedSubPaths.every(({ path }) => {
    const pathStrokeLinecap = path?.style?.strokeLinecap;
    return typeof pathStrokeLinecap === 'string' && pathStrokeLinecap === strokeLinecap;
  });
  
  return allSame ? strokeLinecap : 'butt';
};

// Get common stroke linejoin for subpaths
const getCommonSubPathStrokeLinejoin = (): string => {
  const selectedSubPaths = getSelectedSubPaths();
  if (selectedSubPaths.length === 0) return 'miter';
  
  const firstStrokeLinejoin = selectedSubPaths[0]?.path?.style?.strokeLinejoin;
  const strokeLinejoin = typeof firstStrokeLinejoin === 'string' ? firstStrokeLinejoin : 'miter';
  const allSame = selectedSubPaths.every(({ path }) => {
    const pathStrokeLinejoin = path?.style?.strokeLinejoin;
    return typeof pathStrokeLinejoin === 'string' && pathStrokeLinejoin === strokeLinejoin;
  });
  
  return allSame ? strokeLinejoin : 'miter';
};

// Apply stroke dash to subpaths
const applySubPathStrokeDash = (dashValue: string) => {
  const store = useEditorStore.getState();
  const selectedSubPaths = getSelectedSubPaths();
  
  selectedSubPaths.forEach(({ path }) => {
    if (path && path.id) {
      const strokeDasharray = dashValue === 'none' ? undefined : dashValue;
      store.updatePathStyle(path.id, { strokeDasharray });
    }
  });
};

// Apply stroke linecap to subpaths
const applySubPathStrokeLinecap = (linecap: string) => {
  const store = useEditorStore.getState();
  const selectedSubPaths = getSelectedSubPaths();
  
  selectedSubPaths.forEach(({ path }) => {
    if (path && path.id) {
      store.updatePathStyle(path.id, { strokeLinecap: linecap as 'butt' | 'round' | 'square' });
    }
  });
};

// Apply stroke linejoin to subpaths
const applySubPathStrokeLinejoin = (linejoin: string) => {
  const store = useEditorStore.getState();
  const selectedSubPaths = getSelectedSubPaths();
  
  selectedSubPaths.forEach(({ path }) => {
    if (path && path.id) {
      store.updatePathStyle(path.id, { strokeLinejoin: linejoin as 'miter' | 'round' | 'bevel' });
    }
  });
};

// Smooth subpaths - based on SubPathTransformControls implementation
const smoothSubPaths = () => {
  const store = useEditorStore.getState();
  const { selection, paths, grid, replaceSubPathCommands, pushToHistory } = store;
  const { selectedSubPaths } = selection;
  
  if (selectedSubPaths.length === 0) return;
  
  // Save current state to history before making changes
  pushToHistory();
  
  // Find target subpaths that can be smoothed
  const targetSubPaths: any[] = [];
  for (const subPathId of selectedSubPaths) {
    for (const path of paths) {
      const subPath = path.subPaths.find((sp: any) => sp.id === subPathId);
      if (subPath && subPath.commands.length >= 2) {
        targetSubPaths.push(subPath);
      }
    }
  }
  
  if (targetSubPaths.length === 0) return;
  
  // Apply smoothing to each subpath
  targetSubPaths.forEach((subPath) => {
    const subPathCommands = subPath.commands;
    
    if (subPathCommands.length < 2) return;
    
    // Apply smoothing to entire subpath
    const segmentToSmooth = [...subPathCommands];
    
    // Helper function to update this specific subpath
    const updateSubPath = (newCommands: any[]) => {
      // Ensure the subpath ALWAYS starts with M
      if (newCommands.length > 0 && newCommands[0].command !== 'M') {
        const firstCmd = newCommands[0];
        if ('x' in firstCmd && 'y' in firstCmd) {
          newCommands[0] = {
            ...firstCmd,
            command: 'M'
          };
        }
      }
      
      // Replace all commands in this subpath
      replaceSubPathCommands(subPath.id, newCommands);
    };
    
    // Apply smoothing using the generateSmoothPath function
    generateSmoothPath(
      segmentToSmooth,
      subPathCommands,
      updateSubPath,
      grid.snapToGrid ? (value: number) => Math.round(value / grid.size) * grid.size : (value: number) => value
    );
  });
};

// Simplify subpaths - based on SubPathTransformControls implementation
const simplifySubPaths = () => {
  const store = useEditorStore.getState();
  const { selection, paths, grid, replaceSubPathCommands, pushToHistory } = store;
  const { selectedSubPaths } = selection;
  
  if (selectedSubPaths.length === 0) return;
  
  // Default simplification parameters
  const simplifyTolerance = 0.1;
  const simplifyDistance = 10;
  
  // Save current state to history before making changes
  pushToHistory();
  
  // Find target subpaths that can be simplified
  const targetSubPaths: any[] = [];
  for (const subPathId of selectedSubPaths) {
    for (const path of paths) {
      const subPath = path.subPaths.find((sp: any) => sp.id === subPathId);
      if (subPath && subPath.commands.length >= 2) {
        targetSubPaths.push(subPath);
      }
    }
  }
  
  if (targetSubPaths.length === 0) return;
  
  // Apply simplification to each subpath
  for (const subPath of targetSubPaths) {
    if (subPath.commands.length < 2) continue;
    
    const commands = subPath.commands;
    
    // Use points-on-path algorithm for simplification (Ramer-Douglas-Peucker)
    const simplifiedCommands = simplifySegmentWithPointsOnPath(
      commands, 
      simplifyTolerance, 
      simplifyDistance, 
      grid.snapToGrid ? grid.size : 0
    );

    if (simplifiedCommands.length === 0) continue;

    // Ensure the subpath ALWAYS starts with M
    if (simplifiedCommands.length > 0 && simplifiedCommands[0].command !== 'M') {
      const firstCmd = simplifiedCommands[0];
      if ('x' in firstCmd && 'y' in firstCmd) {
        simplifiedCommands[0] = {
          ...firstCmd,
          command: 'M'
        };
      }
    }
    
    // Replace all commands in this subpath
    replaceSubPathCommands(subPath.id, simplifiedCommands);
  }
};

// Generic function to apply filters to subpaths
const applyFilterToSubPaths = (filterCreatorFn: () => any) => {
  const store = useEditorStore.getState();
  const selectedSubPaths = getSelectedSubPaths();
  
  if (selectedSubPaths.length === 0) return;
  
  // Create the filter
  const filterData = filterCreatorFn();
  store.addFilter(filterData);
  
  // Apply using a timeout to ensure the store is updated
  setTimeout(() => {
    // Access filters from the store directly to get the most current state
    const storeState = useEditorStore.getState();
    const currentFilters = storeState.filters;
    const newFilter = currentFilters[currentFilters.length - 1]; // Get the last added filter
    
    if (newFilter && newFilter.id) {
      const filterRef = formatSVGReference(newFilter.id);
      
      // Apply filter to each selected subpath's parent path
      selectedSubPaths.forEach(({ path }) => {
        if (path && path.id) {
          storeState.updatePathStyle(path.id, { 
            filter: filterRef
          });
        }
      });
    }
  }, 0);
};

// Specific filter functions
const applyBlurFilter = () => applyFilterToSubPaths(createBlurFilter);
const applyDropShadow = () => applyFilterToSubPaths(createDropShadowFilter);
const applyGrayscaleFilter = () => applyFilterToSubPaths(createGrayscaleFilter);
const applySepiaFilter = () => applyFilterToSubPaths(createSepiaFilter);
const applyInvertFilter = () => applyFilterToSubPaths(createInvertFilter);
const applyBrightnessFilter = () => applyFilterToSubPaths(createBrightnessFilter);
const applyContrastFilter = () => applyFilterToSubPaths(createContrastFilter);
const applySaturateFilter = () => applyFilterToSubPaths(createSaturateFilter);
const applyHueRotateFilter = () => applyFilterToSubPaths(createHueRotateFilter);
const applyEmbossFilter = () => applyFilterToSubPaths(createEmbossFilter);
const applySharpenFilter = () => applyFilterToSubPaths(createSharpenFilter);
const applyEdgeDetectFilter = () => applyFilterToSubPaths(createEdgeDetectFilter);
const applyGlowFilter = () => applyFilterToSubPaths(createGlowFilter);
const applyBevelFilter = () => applyFilterToSubPaths(createBevelFilter);
const applyMotionBlurFilter = () => applyFilterToSubPaths(createMotionBlurFilter);
const applyNoiseFilter = () => applyFilterToSubPaths(createNoiseFilter);
const applyWaveDistortionFilter = () => applyFilterToSubPaths(createWaveDistortionFilter);
const applyPosterizeFilter = () => applyFilterToSubPaths(createPosterizeFilter);
const applyOilPaintingFilter = () => applyFilterToSubPaths(createOilPaintingFilter);
const applyWatercolorFilter = () => applyFilterToSubPaths(createWatercolorFilter);
const applyVintageFilter = () => applyFilterToSubPaths(createVintageFilter);
const applyChromaticAberrationFilter = () => applyFilterToSubPaths(createChromaticAberrationFilter);
const applyNeonGlowFilter = () => applyFilterToSubPaths(createNeonGlowFilter);
const applyMosaicFilter = () => applyFilterToSubPaths(createMosaicFilter);
const applyGlitchFilter = () => applyFilterToSubPaths(createGlitchFilter);
const applyPixelateFilter = () => applyFilterToSubPaths(createPixelateFilter);
const applyDancingStrokeFilter = () => applyFilterToSubPaths(createDancingStrokeFilter);
const applySmokeFilter = () => applyFilterToSubPaths(createSmokeFilter);
const applyWavesFilter = () => applyFilterToSubPaths(createWavesFilter);
const applyPaperTextureFilter = () => applyFilterToSubPaths(createPaperTextureFilter);
const applyZebraFilter = () => applyFilterToSubPaths(createZebraFilter);
const applyNetFilter = () => applyFilterToSubPaths(createNetFilter);
const applyDustFilter = () => applyFilterToSubPaths(createDustFilter);
const applyColoredStripesFilter = () => applyFilterToSubPaths(createColoredStripesFilter);
const applyColoredSpotsFilter = () => applyFilterToSubPaths(createColoredSpotsFilter);
const applyColoredFlameFilter = () => applyFilterToSubPaths(createColoredFlameFilter);
const applyAdvancedWatercolorFilter = () => applyFilterToSubPaths(createAdvancedWatercolorFilter);

// Add fade animation to subpaths
const addFadeAnimation = () => {
  const store = useEditorStore.getState();
  const selectedSubPaths = getSelectedSubPaths();
  
  selectedSubPaths.forEach(({ path }) => {
    if (path && path.id) {
      const opacityAnimation = {
        targetElementId: path.id,
        type: 'animate' as const,
        attributeName: 'opacity',
        from: '1',
        to: '0.2',
        dur: '2s',
        repeatCount: 'indefinite'
      };
      
      store.addAnimation(opacityAnimation);
    }
  });
  
  };

// Add rotation animation to subpaths
const addRotateAnimation = () => {
  const store = useEditorStore.getState();
  const selectedSubPaths = getSelectedSubPaths();
  
  selectedSubPaths.forEach(({ path }) => {
    if (path && path.id) {
      const rotationAnimation = {
        targetElementId: path.id,
        type: 'animateTransform' as const,
        attributeName: 'transform',
        transformType: 'rotate',
        from: '0 200 200',
        to: '360 200 200', 
        dur: '3s',
        repeatCount: 'indefinite'
      };
      
      store.addAnimation(rotationAnimation);
    }
  });
  
  };

// SubPath-specific options (defined after functions to avoid hoisting issues)
const subPathArrangeOptions = [
  { 
    id: 'subpath-align-left', 
    label: 'Align Left', 
    icon: AlignLeft,
    action: alignSubPathsLeft 
  },
  { 
    id: 'subpath-align-center', 
    label: 'Align Center', 
    icon: AlignCenter,
    action: alignSubPathsCenter 
  },
  { 
    id: 'subpath-align-right', 
    label: 'Align Right', 
    icon: AlignRight,
    action: alignSubPathsRight 
  },
  { 
    id: 'subpath-align-top', 
    label: 'Align Top', 
    icon: ArrowUp,
    action: alignSubPathsTop 
  },
  { 
    id: 'subpath-align-middle', 
    label: 'Align Middle', 
    icon: AlignVerticalJustifyCenter,
    action: alignSubPathsMiddle 
  },
  { 
    id: 'subpath-align-bottom', 
    label: 'Align Bottom', 
    icon: ArrowDown,
    action: alignSubPathsBottom 
  },
  { 
    id: 'subpath-distribute-horizontal', 
    label: 'Distribute Horizontally', 
    icon: AlignHorizontalSpaceAround,
    action: distributeSubPathsHorizontally 
  },
  { 
    id: 'subpath-distribute-vertical', 
    label: 'Distribute Vertically', 
    icon: AlignVerticalSpaceAround,
    action: distributeSubPathsVertically 
  },
  { 
    id: 'subpath-bring-front', 
    label: 'Bring to Front', 
    icon: ArrowUp,
    action: bringSubPathsToFront 
  },
  { 
    id: 'subpath-send-back', 
    label: 'Send to Back', 
    icon: ArrowDown,
    action: sendSubPathsToBack 
  }
];

const subPathFilterOptions = [
  { id: 'subpath-blur', label: 'Blur', action: applyBlurFilter },
  { id: 'subpath-shadow', label: 'Drop Shadow', action: applyDropShadow },
  { id: 'subpath-glow', label: 'Glow', action: applyGlowFilter },
  { id: 'subpath-grayscale', label: 'Grayscale', action: applyGrayscaleFilter },
  { id: 'subpath-sepia', label: 'Sepia', action: applySepiaFilter },
  { id: 'subpath-emboss', label: 'Emboss', action: applyEmbossFilter },
  { id: 'subpath-neon-glow', label: 'Neon Glow', action: applyNeonGlowFilter }
];

const subPathAnimationOptions = [
  { 
    id: 'subpath-fade', 
    label: 'Fade In/Out', 
    action: addFadeAnimation 
  },
  { 
    id: 'subpath-rotate', 
    label: 'Rotate', 
    action: addRotateAnimation 
  }
];

// SubPath-specific actions (complete set based on singleElementActions)
export const subPathActions: ToolbarAction[] = [
  {
    id: 'subpath-fill-color',
    icon: Palette,
    label: 'Fill Color',
    type: 'color',
    color: {
      currentColor: getCommonSubPathFillColor(),
      onChange: applySubPathFillColor
    },
    priority: 100,
    tooltip: 'Change subpath fill color'
  },
  {
    id: 'subpath-stroke-color',
    icon: Brush,
    label: 'Stroke Color',
    type: 'color',
    color: {
      currentColor: getCommonSubPathStrokeColor(),
      onChange: applySubPathStrokeColor
    },
    priority: 95,
    tooltip: 'Change subpath stroke color'
  },
  {
    id: 'subpath-stroke-options',
    icon: LineSquiggle,
    label: 'Stroke Options',
    type: 'input',
    input: {
      currentValue: getCommonSubPathStrokeWidth(),
      onChange: applySubPathStrokeWidth,
      type: 'number',
      placeholder: '1'
    },
    strokeOptions: {
      getCurrentStrokeWidth: getCommonSubPathStrokeWidth,
      getCurrentStrokeDash: getCommonSubPathStrokeDash,
      getCurrentStrokeLinecap: getCommonSubPathStrokeLinecap,
      getCurrentStrokeLinejoin: getCommonSubPathStrokeLinejoin,
      onStrokeWidthChange: applySubPathStrokeWidth,
      onStrokeDashChange: applySubPathStrokeDash,
      onStrokeLinecapChange: applySubPathStrokeLinecap,
      onStrokeLinejoinChange: applySubPathStrokeLinejoin
    },
    priority: 90,
    tooltip: 'Configure stroke width, dash pattern, line cap, and line join'
  },
  {
    id: 'subpath-smooth',
    icon: Waves,
    label: 'Smooth',
    type: 'button',
    action: smoothSubPaths,
    priority: 85,
    tooltip: 'Apply smoothing to subpath curves'
  },
  {
    id: 'subpath-simplify',
    icon: Minimize2,
    label: 'Simplify',
    type: 'button',
    action: simplifySubPaths,
    priority: 80,
    tooltip: 'Simplify subpath by reducing points'
  },
  {
    id: 'subpath-arrange',
    icon: Layers,
    label: 'Arrange',
    type: 'dropdown',
    dropdown: {
      options: subPathArrangeOptions
    },
    priority: 70,
    tooltip: 'Arrange and align subpaths',
    visible: () => {
      // Only show when multiple subpaths are selected
      const store = useEditorStore.getState();
      return store.selection.selectedSubPaths.length >= 2;
    }
  },
  {
    id: 'subpath-filters',
    icon: Filter,
    label: 'Filters',
    type: 'dropdown',
    dropdown: {
      options: subPathFilterOptions
    },
    priority: 60,
    tooltip: 'Apply filters'
  },
  {
    id: 'subpath-animations',
    icon: Play,
    label: 'Animations',
    type: 'dropdown',
    dropdown: {
      options: subPathAnimationOptions
    },
    priority: 50,
    tooltip: 'Add animations'
  },
  {
    id: 'subpath-duplicate',
    icon: Copy,
    label: 'Duplicate',
    type: 'button',
    action: duplicateSubPaths,
    priority: 20,
    tooltip: 'Duplicate subpath'
  },
  {
    id: 'subpath-clear-style',
    icon: RotateCcw,
    label: 'Clear Style',
    type: 'button',
    action: clearSubPathStyle,
    priority: 15,
    tooltip: 'Reset subpath to default style'
  },
  {
    id: 'subpath-lock',
    icon: Lock,
    label: 'Lock/Unlock',
    type: 'toggle',
    toggle: {
      isActive: areSubPathsLocked,
      onToggle: toggleSubPathLock
    },
    priority: 12,
    tooltip: 'Toggle subpath lock state'
  },
  {
    id: 'subpath-delete',
    icon: Trash2,
    label: 'Delete',
    type: 'button',
    action: deleteSubPaths,
    priority: 10,
    destructive: true,
    tooltip: 'Delete subpath'
  }
];

// Floating action definitions
export const subPathFloatingActionDefinition: FloatingActionDefinition = {
  elementTypes: ['subpath'],
  selectionTypes: ['single', 'multiple'],
  actions: subPathActions,
  priority: 95  // Higher priority than paths
};

export const pathFloatingActionDefinition: FloatingActionDefinition = {
  elementTypes: ['path'],
  selectionTypes: ['single', 'multiple'], 
  actions: singleElementActions,
  priority: 85  // Lower priority than subpaths
};

// Mixed selection arrange functions - work with texts, subpaths, and paths together
const alignMixedLeft = () => {
  const store = useEditorStore.getState();
  const { selectedTexts, selectedSubPaths, selectedPaths } = store.selection;
  
  if (selectedTexts.length + selectedSubPaths.length + selectedPaths.length < 2) return;
  
  store.pushToHistory();
  
  // Get all element positions
  const allPositions: Array<{ type: 'text' | 'subpath' | 'path'; id: string; leftX: number }> = [];
  
  // Add text positions
  selectedTexts.forEach(textId => {
    const text = store.texts.find(t => t.id === textId);
    if (text) {
      allPositions.push({ type: 'text', id: textId, leftX: text.x });
    }
  });
  
  // Add subpath positions
  selectedSubPaths.forEach(subPathId => {
    const subPathData = getSelectedSubPaths().find(sp => sp.subPath.id === subPathId);
    if (subPathData) {
      const commands = subPathData.subPath.commands;
      const xs = commands.filter((cmd: SVGCommand) => cmd.x !== undefined).map((cmd: SVGCommand) => cmd.x!);
      if (xs.length > 0) {
        allPositions.push({ type: 'subpath', id: subPathId, leftX: Math.min(...xs) });
      }
    }
  });
  
  // Add path positions
  selectedPaths.forEach(pathId => {
    const path = store.paths.find(p => p.id === pathId);
    if (path) {
      const allXs: number[] = [];
      path.subPaths.forEach(sp => {
        sp.commands.forEach((cmd: SVGCommand) => {
          if (cmd.x !== undefined) allXs.push(cmd.x);
        });
      });
      if (allXs.length > 0) {
        allPositions.push({ type: 'path', id: pathId, leftX: Math.min(...allXs) });
      }
    }
  });
  
  if (allPositions.length < 2) return;
  
  const leftmostX = Math.min(...allPositions.map(p => p.leftX));
  
  // Apply alignment to each element type
  allPositions.forEach(({ type, id, leftX }) => {
    const deltaX = leftmostX - leftX;
    if (Math.abs(deltaX) > 0.001) {
      if (type === 'text') {
        const text = store.texts.find(t => t.id === id);
        if (text) {
          store.updateText(id, { x: text.x + deltaX });
        }
      } else if (type === 'subpath') {
        const subPathData = getSelectedSubPaths().find(sp => sp.subPath.id === id);
        if (subPathData) {
          const updatedCommands = subPathData.subPath.commands.map((cmd: SVGCommand) => ({
            ...cmd,
            x: cmd.x !== undefined ? cmd.x + deltaX : cmd.x,
            x1: cmd.x1 !== undefined ? cmd.x1 + deltaX : cmd.x1,
            x2: cmd.x2 !== undefined ? cmd.x2 + deltaX : cmd.x2
          }));
          store.replaceSubPathCommands(id, updatedCommands);
        }
      }
      // For paths, we'd need to update all subpaths - not implemented for now
    }
  });
};

const alignMixedCenter = () => {
  const store = useEditorStore.getState();
  const { selectedTexts, selectedSubPaths, selectedPaths } = store.selection;
  
  if (selectedTexts.length + selectedSubPaths.length + selectedPaths.length < 2) return;
  
  store.pushToHistory();
  
  // Get all element bounds
  const allBounds: Array<{ type: 'text' | 'subpath' | 'path'; id: string; leftX: number; rightX: number; centerX: number }> = [];
  
  // Add text bounds
  selectedTexts.forEach(textId => {
    const text = store.texts.find(t => t.id === textId);
    if (text) {
      // For text, we approximate bounds (actual bounds would need DOM measurement)
      const approxWidth = (text.type === 'text' ? text.content || '' : 'text').length * 8; // Rough estimate
      allBounds.push({ 
        type: 'text', 
        id: textId, 
        leftX: text.x, 
        rightX: text.x + approxWidth,
        centerX: text.x + approxWidth / 2
      });
    }
  });
  
  // Add subpath bounds
  selectedSubPaths.forEach(subPathId => {
    const subPathData = getSelectedSubPaths().find(sp => sp.subPath.id === subPathId);
    if (subPathData) {
      const commands = subPathData.subPath.commands;
      const xs = commands.filter((cmd: SVGCommand) => cmd.x !== undefined).map((cmd: SVGCommand) => cmd.x!);
      if (xs.length > 0) {
        const leftX = Math.min(...xs);
        const rightX = Math.max(...xs);
        allBounds.push({ 
          type: 'subpath', 
          id: subPathId, 
          leftX, 
          rightX,
          centerX: (leftX + rightX) / 2
        });
      }
    }
  });
  
  if (allBounds.length < 2) return;
  
  const leftmostX = Math.min(...allBounds.map(b => b.leftX));
  const rightmostX = Math.max(...allBounds.map(b => b.rightX));
  const targetCenterX = (leftmostX + rightmostX) / 2;
  
  // Apply alignment to each element
  allBounds.forEach(({ type, id, centerX }) => {
    const deltaX = targetCenterX - centerX;
    if (Math.abs(deltaX) > 0.001) {
      if (type === 'text') {
        const text = store.texts.find(t => t.id === id);
        if (text) {
          store.updateText(id, { x: text.x + deltaX });
        }
      } else if (type === 'subpath') {
        const subPathData = getSelectedSubPaths().find(sp => sp.subPath.id === id);
        if (subPathData) {
          const updatedCommands = subPathData.subPath.commands.map((cmd: SVGCommand) => ({
            ...cmd,
            x: cmd.x !== undefined ? cmd.x + deltaX : cmd.x,
            x1: cmd.x1 !== undefined ? cmd.x1 + deltaX : cmd.x1,
            x2: cmd.x2 !== undefined ? cmd.x2 + deltaX : cmd.x2
          }));
          store.replaceSubPathCommands(id, updatedCommands);
        }
      }
    }
  });
};

const alignMixedTop = () => {
  const store = useEditorStore.getState();
  const { selectedTexts, selectedSubPaths, selectedPaths } = store.selection;
  
  if (selectedTexts.length + selectedSubPaths.length + selectedPaths.length < 2) return;
  
  store.pushToHistory();
  
  // Get all element positions
  const allPositions: Array<{ type: 'text' | 'subpath' | 'path'; id: string; topY: number }> = [];
  
  // Add text positions
  selectedTexts.forEach(textId => {
    const text = store.texts.find(t => t.id === textId);
    if (text) {
      allPositions.push({ type: 'text', id: textId, topY: text.y });
    }
  });
  
  // Add subpath positions
  selectedSubPaths.forEach(subPathId => {
    const subPathData = getSelectedSubPaths().find(sp => sp.subPath.id === subPathId);
    if (subPathData) {
      const commands = subPathData.subPath.commands;
      const ys = commands.filter((cmd: SVGCommand) => cmd.y !== undefined).map((cmd: SVGCommand) => cmd.y!);
      if (ys.length > 0) {
        allPositions.push({ type: 'subpath', id: subPathId, topY: Math.min(...ys) });
      }
    }
  });
  
  if (allPositions.length < 2) return;
  
  const topmostY = Math.min(...allPositions.map(p => p.topY));
  
  // Apply alignment to each element type
  allPositions.forEach(({ type, id, topY }) => {
    const deltaY = topmostY - topY;
    if (Math.abs(deltaY) > 0.001) {
      if (type === 'text') {
        const text = store.texts.find(t => t.id === id);
        if (text) {
          store.updateText(id, { y: text.y + deltaY });
        }
      } else if (type === 'subpath') {
        const subPathData = getSelectedSubPaths().find(sp => sp.subPath.id === id);
        if (subPathData) {
          const updatedCommands = subPathData.subPath.commands.map((cmd: SVGCommand) => ({
            ...cmd,
            y: cmd.y !== undefined ? cmd.y + deltaY : cmd.y,
            y1: cmd.y1 !== undefined ? cmd.y1 + deltaY : cmd.y1,
            y2: cmd.y2 !== undefined ? cmd.y2 + deltaY : cmd.y2
          }));
          store.replaceSubPathCommands(id, updatedCommands);
        }
      }
    }
  });
};

const alignMixedMiddle = () => {
  const store = useEditorStore.getState();
  const { selectedTexts, selectedSubPaths, selectedPaths } = store.selection;
  
  if (selectedTexts.length + selectedSubPaths.length + selectedPaths.length < 2) return;
  
  store.pushToHistory();
  
  // Get all element bounds
  const allBounds: Array<{ type: 'text' | 'subpath' | 'path'; id: string; topY: number; bottomY: number; centerY: number }> = [];
  
  // Add text bounds
  selectedTexts.forEach(textId => {
    const text = store.texts.find(t => t.id === textId);
    if (text) {
      // For text, we approximate bounds (actual bounds would need DOM measurement)
      const approxHeight = 16; // Rough estimate for text height
      allBounds.push({ 
        type: 'text', 
        id: textId, 
        topY: text.y, 
        bottomY: text.y + approxHeight,
        centerY: text.y + approxHeight / 2
      });
    }
  });
  
  // Add subpath bounds
  selectedSubPaths.forEach(subPathId => {
    const subPathData = getSelectedSubPaths().find(sp => sp.subPath.id === subPathId);
    if (subPathData) {
      const commands = subPathData.subPath.commands;
      const ys = commands.filter((cmd: SVGCommand) => cmd.y !== undefined).map((cmd: SVGCommand) => cmd.y!);
      if (ys.length > 0) {
        const topY = Math.min(...ys);
        const bottomY = Math.max(...ys);
        allBounds.push({ 
          type: 'subpath', 
          id: subPathId, 
          topY, 
          bottomY,
          centerY: (topY + bottomY) / 2
        });
      }
    }
  });
  
  if (allBounds.length < 2) return;
  
  const topmostY = Math.min(...allBounds.map(b => b.topY));
  const bottommostY = Math.max(...allBounds.map(b => b.bottomY));
  const targetCenterY = (topmostY + bottommostY) / 2;
  
  // Apply alignment to each element
  allBounds.forEach(({ type, id, centerY }) => {
    const deltaY = targetCenterY - centerY;
    if (Math.abs(deltaY) > 0.001) {
      if (type === 'text') {
        const text = store.texts.find(t => t.id === id);
        if (text) {
          store.updateText(id, { y: text.y + deltaY });
        }
      } else if (type === 'subpath') {
        const subPathData = getSelectedSubPaths().find(sp => sp.subPath.id === id);
        if (subPathData) {
          const updatedCommands = subPathData.subPath.commands.map((cmd: SVGCommand) => ({
            ...cmd,
            y: cmd.y !== undefined ? cmd.y + deltaY : cmd.y,
            y1: cmd.y1 !== undefined ? cmd.y1 + deltaY : cmd.y1,
            y2: cmd.y2 !== undefined ? cmd.y2 + deltaY : cmd.y2
          }));
          store.replaceSubPathCommands(id, updatedCommands);
        }
      }
    }
  });
};

const alignMixedBottom = () => {
  const store = useEditorStore.getState();
  const { selectedTexts, selectedSubPaths, selectedPaths } = store.selection;
  
  if (selectedTexts.length + selectedSubPaths.length + selectedPaths.length < 2) return;
  
  store.pushToHistory();
  
  // Get all element positions
  const allPositions: Array<{ type: 'text' | 'subpath' | 'path'; id: string; bottomY: number }> = [];
  
  // Add text positions
  selectedTexts.forEach(textId => {
    const text = store.texts.find(t => t.id === textId);
    if (text) {
      // For text, approximate the bottom position
      const approxHeight = 16; // Rough estimate for text height
      allPositions.push({ type: 'text', id: textId, bottomY: text.y + approxHeight });
    }
  });
  
  // Add subpath positions
  selectedSubPaths.forEach(subPathId => {
    const subPathData = getSelectedSubPaths().find(sp => sp.subPath.id === subPathId);
    if (subPathData) {
      const commands = subPathData.subPath.commands;
      const ys = commands.filter((cmd: SVGCommand) => cmd.y !== undefined).map((cmd: SVGCommand) => cmd.y!);
      if (ys.length > 0) {
        allPositions.push({ type: 'subpath', id: subPathId, bottomY: Math.max(...ys) });
      }
    }
  });
  
  if (allPositions.length < 2) return;
  
  const bottommostY = Math.max(...allPositions.map(p => p.bottomY));
  
  // Apply alignment to each element type
  allPositions.forEach(({ type, id, bottomY }) => {
    const deltaY = bottommostY - bottomY;
    if (Math.abs(deltaY) > 0.001) {
      if (type === 'text') {
        const text = store.texts.find(t => t.id === id);
        if (text) {
          // For text, we need to adjust for the height difference
          const approxHeight = 16;
          store.updateText(id, { y: text.y + deltaY });
        }
      } else if (type === 'subpath') {
        const subPathData = getSelectedSubPaths().find(sp => sp.subPath.id === id);
        if (subPathData) {
          const updatedCommands = subPathData.subPath.commands.map((cmd: SVGCommand) => ({
            ...cmd,
            y: cmd.y !== undefined ? cmd.y + deltaY : cmd.y,
            y1: cmd.y1 !== undefined ? cmd.y1 + deltaY : cmd.y1,
            y2: cmd.y2 !== undefined ? cmd.y2 + deltaY : cmd.y2
          }));
          store.replaceSubPathCommands(id, updatedCommands);
        }
      }
    }
  });
};

const alignMixedRight = () => {
  const store = useEditorStore.getState();
  const { selectedTexts, selectedSubPaths, selectedPaths } = store.selection;
  
  if (selectedTexts.length + selectedSubPaths.length + selectedPaths.length < 2) return;
  
  store.pushToHistory();
  
  // Get all element bounds
  const allBounds: Array<{ type: 'text' | 'subpath' | 'path'; id: string; leftX: number; rightX: number }> = [];
  
  // Add text bounds
  selectedTexts.forEach(textId => {
    const text = store.texts.find(t => t.id === textId);
    if (text) {
      // For text, we approximate bounds (actual bounds would need DOM measurement)
      const approxWidth = (text.type === 'text' ? text.content || '' : 'text').length * 8; // Rough estimate
      allBounds.push({ 
        type: 'text', 
        id: textId, 
        leftX: text.x, 
        rightX: text.x + approxWidth
      });
    }
  });
  
  // Add subpath bounds
  selectedSubPaths.forEach(subPathId => {
    const subPathData = getSelectedSubPaths().find(sp => sp.subPath.id === subPathId);
    if (subPathData) {
      const commands = subPathData.subPath.commands;
      const xs = commands.filter((cmd: SVGCommand) => cmd.x !== undefined).map((cmd: SVGCommand) => cmd.x!);
      if (xs.length > 0) {
        const leftX = Math.min(...xs);
        const rightX = Math.max(...xs);
        allBounds.push({ 
          type: 'subpath', 
          id: subPathId, 
          leftX, 
          rightX
        });
      }
    }
  });
  
  if (allBounds.length < 2) return;
  
  const rightmostX = Math.max(...allBounds.map(b => b.rightX));
  
  // Apply alignment to each element
  allBounds.forEach(({ type, id, rightX }) => {
    const deltaX = rightmostX - rightX;
    if (Math.abs(deltaX) > 0.001) {
      if (type === 'text') {
        const text = store.texts.find(t => t.id === id);
        if (text) {
          store.updateText(id, { x: text.x + deltaX });
        }
      } else if (type === 'subpath') {
        const subPathData = getSelectedSubPaths().find(sp => sp.subPath.id === id);
        if (subPathData) {
          const updatedCommands = subPathData.subPath.commands.map((cmd: SVGCommand) => ({
            ...cmd,
            x: cmd.x !== undefined ? cmd.x + deltaX : cmd.x,
            x1: cmd.x1 !== undefined ? cmd.x1 + deltaX : cmd.x1,
            x2: cmd.x2 !== undefined ? cmd.x2 + deltaX : cmd.x2
          }));
          store.replaceSubPathCommands(id, updatedCommands);
        }
      }
    }
  });
};

const distributeMixedHorizontally = () => {
  const store = useEditorStore.getState();
  const { selectedTexts, selectedSubPaths, selectedPaths } = store.selection;
  
  if (selectedTexts.length + selectedSubPaths.length + selectedPaths.length < 3) return;
  
  store.pushToHistory();
  
  // Get all element bounds
  const allBounds: Array<{ type: 'text' | 'subpath' | 'path'; id: string; leftX: number; rightX: number; centerX: number }> = [];
  
  // Add text bounds
  selectedTexts.forEach(textId => {
    const text = store.texts.find(t => t.id === textId);
    if (text) {
      const approxWidth = (text.type === 'text' ? text.content || '' : 'text').length * 8;
      allBounds.push({ 
        type: 'text', 
        id: textId, 
        leftX: text.x, 
        rightX: text.x + approxWidth,
        centerX: text.x + approxWidth / 2
      });
    }
  });
  
  // Add subpath bounds
  selectedSubPaths.forEach(subPathId => {
    const subPathData = getSelectedSubPaths().find(sp => sp.subPath.id === subPathId);
    if (subPathData) {
      const commands = subPathData.subPath.commands;
      const xs = commands.filter((cmd: SVGCommand) => cmd.x !== undefined).map((cmd: SVGCommand) => cmd.x!);
      if (xs.length > 0) {
        const leftX = Math.min(...xs);
        const rightX = Math.max(...xs);
        allBounds.push({ 
          type: 'subpath', 
          id: subPathId, 
          leftX, 
          rightX,
          centerX: (leftX + rightX) / 2
        });
      }
    }
  });
  
  if (allBounds.length < 3) return;
  
  // Sort by center position
  const sortedBounds = allBounds.sort((a, b) => a.centerX - b.centerX);
  
  const leftmostCenter = sortedBounds[0].centerX;
  const rightmostCenter = sortedBounds[sortedBounds.length - 1].centerX;
  const spacing = (rightmostCenter - leftmostCenter) / (sortedBounds.length - 1);
  
  // Distribute elements evenly (skip first and last)
  sortedBounds.forEach((bound, index) => {
    if (index > 0 && index < sortedBounds.length - 1) {
      const targetCenterX = leftmostCenter + spacing * index;
      const deltaX = targetCenterX - bound.centerX;
      
      if (Math.abs(deltaX) > 0.001) {
        if (bound.type === 'text') {
          const text = store.texts.find(t => t.id === bound.id);
          if (text) {
            store.updateText(bound.id, { x: text.x + deltaX });
          }
        } else if (bound.type === 'subpath') {
          const subPathData = getSelectedSubPaths().find(sp => sp.subPath.id === bound.id);
          if (subPathData) {
            const updatedCommands = subPathData.subPath.commands.map((cmd: SVGCommand) => ({
              ...cmd,
              x: cmd.x !== undefined ? cmd.x + deltaX : cmd.x,
              x1: cmd.x1 !== undefined ? cmd.x1 + deltaX : cmd.x1,
              x2: cmd.x2 !== undefined ? cmd.x2 + deltaX : cmd.x2
            }));
            store.replaceSubPathCommands(bound.id, updatedCommands);
          }
        }
      }
    }
  });
};

const distributeMixedVertically = () => {
  const store = useEditorStore.getState();
  const { selectedTexts, selectedSubPaths, selectedPaths } = store.selection;
  
  if (selectedTexts.length + selectedSubPaths.length + selectedPaths.length < 3) return;
  
  store.pushToHistory();
  
  // Get all element bounds
  const allBounds: Array<{ type: 'text' | 'subpath' | 'path'; id: string; topY: number; bottomY: number; centerY: number }> = [];
  
  // Add text bounds
  selectedTexts.forEach(textId => {
    const text = store.texts.find(t => t.id === textId);
    if (text) {
      const approxHeight = 16; // Rough estimate for text height
      allBounds.push({ 
        type: 'text', 
        id: textId, 
        topY: text.y, 
        bottomY: text.y + approxHeight,
        centerY: text.y + approxHeight / 2
      });
    }
  });
  
  // Add subpath bounds
  selectedSubPaths.forEach(subPathId => {
    const subPathData = getSelectedSubPaths().find(sp => sp.subPath.id === subPathId);
    if (subPathData) {
      const commands = subPathData.subPath.commands;
      const ys = commands.filter((cmd: SVGCommand) => cmd.y !== undefined).map((cmd: SVGCommand) => cmd.y!);
      if (ys.length > 0) {
        const topY = Math.min(...ys);
        const bottomY = Math.max(...ys);
        allBounds.push({ 
          type: 'subpath', 
          id: subPathId, 
          topY, 
          bottomY,
          centerY: (topY + bottomY) / 2
        });
      }
    }
  });
  
  if (allBounds.length < 3) return;
  
  // Sort by center position
  const sortedBounds = allBounds.sort((a, b) => a.centerY - b.centerY);
  
  const topmostCenter = sortedBounds[0].centerY;
  const bottommostCenter = sortedBounds[sortedBounds.length - 1].centerY;
  const spacing = (bottommostCenter - topmostCenter) / (sortedBounds.length - 1);
  
  // Distribute elements evenly (skip first and last)
  sortedBounds.forEach((bound, index) => {
    if (index > 0 && index < sortedBounds.length - 1) {
      const targetCenterY = topmostCenter + spacing * index;
      const deltaY = targetCenterY - bound.centerY;
      
      if (Math.abs(deltaY) > 0.001) {
        if (bound.type === 'text') {
          const text = store.texts.find(t => t.id === bound.id);
          if (text) {
            store.updateText(bound.id, { y: text.y + deltaY });
          }
        } else if (bound.type === 'subpath') {
          const subPathData = getSelectedSubPaths().find(sp => sp.subPath.id === bound.id);
          if (subPathData) {
            const updatedCommands = subPathData.subPath.commands.map((cmd: SVGCommand) => ({
              ...cmd,
              y: cmd.y !== undefined ? cmd.y + deltaY : cmd.y,
              y1: cmd.y1 !== undefined ? cmd.y1 + deltaY : cmd.y1,
              y2: cmd.y2 !== undefined ? cmd.y2 + deltaY : cmd.y2
            }));
            store.replaceSubPathCommands(bound.id, updatedCommands);
          }
        }
      }
    }
  });
};

// Mixed arrange options
const mixedArrangeOptions = [
  { 
    id: 'mixed-align-left', 
    label: 'Align Left', 
    icon: AlignLeft,
    action: alignMixedLeft 
  },
  { 
    id: 'mixed-align-center', 
    label: 'Align Center', 
    icon: AlignCenter,
    action: alignMixedCenter 
  },
  { 
    id: 'mixed-align-right', 
    label: 'Align Right', 
    icon: AlignRight,
    action: alignMixedRight 
  },
  { 
    id: 'mixed-align-top', 
    label: 'Align Top', 
    icon: ArrowUp,
    action: alignMixedTop 
  },
  { 
    id: 'mixed-align-middle', 
    label: 'Align Middle', 
    icon: AlignVerticalJustifyCenter,
    action: alignMixedMiddle 
  },
  { 
    id: 'mixed-align-bottom', 
    label: 'Align Bottom', 
    icon: ArrowDown,
    action: alignMixedBottom 
  },
  { 
    id: 'mixed-distribute-horizontal', 
    label: 'Distribute Horizontally', 
    icon: AlignHorizontalSpaceAround,
    action: distributeMixedHorizontally 
  },
  { 
    id: 'mixed-distribute-vertical', 
    label: 'Distribute Vertically', 
    icon: AlignVerticalSpaceAround,
    action: distributeMixedVertically 
  }
];

// Mixed selection actions (text + subpath or other combinations)
// Only show selection-relevant actions and universal styling options
export const mixedSelectionActions: ToolbarAction[] = [
  {
    id: 'mixed-fill-color',
    icon: Palette,
    label: 'Fill Color',
    type: 'color',
    color: {
      currentColor: getCommonFillColor(),
      onChange: applyFillColor
    },
    priority: 100,
    tooltip: 'Change fill color'
  },
  {
    id: 'mixed-stroke-color',
    icon: Brush,
    label: 'Stroke Color',
    type: 'color',
    color: {
      currentColor: getCommonStrokeColor(),
      onChange: applyStrokeColor
    },
    priority: 90,
    tooltip: 'Change stroke color'
  },
  {
    id: 'mixed-stroke-width',
    icon: LineSquiggle,
    label: 'Stroke Width',
    type: 'input',
    input: {
      currentValue: 1, // Default value for mixed selections
      onChange: (value: string | number) => {
        const width = typeof value === 'number' ? value : parseFloat(value);
        if (!isNaN(width) && width >= 0) {
          const store = useEditorStore.getState();
          
          // Apply to all selected elements
          store.selection.selectedPaths.forEach(pathId => {
            store.updatePathStyle(pathId, { strokeWidth: width });
          });
          
          store.selection.selectedTexts.forEach(textId => {
            store.updateTextStyle(textId, { strokeWidth: width });
          });
        }
      },
      type: 'number',
      placeholder: '1'
    },
    priority: 85,
    tooltip: 'Change stroke width'
  },
  {
    id: 'mixed-arrange',
    icon: Layers,
    label: 'Arrange',
    type: 'dropdown',
    dropdown: {
      options: mixedArrangeOptions
    },
    priority: 75,
    tooltip: 'Arrange and align mixed elements',
    visible: () => {
      // Show when 2+ elements for alignment, or 3+ for distribution
      const store = useEditorStore.getState();
      const totalSelected = store.selection.selectedTexts.length + 
                           store.selection.selectedSubPaths.length + 
                           store.selection.selectedPaths.length;
      return totalSelected >= 2; // Most actions work with 2+, distribute needs 3+ (handled internally)
    }
  },
  {
    id: 'mixed-group',
    icon: Group,
    label: 'Group',
    type: 'button',
    action: groupSelected,
    priority: 70,
    tooltip: 'Group selected elements'
  },
  {
    id: 'mixed-duplicate',
    icon: Copy,
    label: 'Duplicate All',
    type: 'button',
    action: duplicateSelected,
    priority: 20,
    tooltip: 'Duplicate all selected elements'
  },
  {
    id: 'mixed-clear-style',
    icon: RotateCcw,
    label: 'Clear Style',
    type: 'button',
    action: clearMixedStyle,
    priority: 15,
    tooltip: 'Reset all elements to default style'
  },
  {
    id: 'mixed-lock',
    icon: Lock,
    label: 'Lock All',
    type: 'toggle',
    toggle: {
      isActive: areMixedElementsLocked,
      onToggle: toggleMixedLock
    },
    priority: 12,
    tooltip: 'Toggle lock state for all selected elements'
  },
  {
    id: 'mixed-delete',
    icon: Trash2,
    label: 'Delete All',
    type: 'button',
    action: deleteSelected,
    priority: 10,
    destructive: true,
    tooltip: 'Delete all selected elements'
  }
];

export const mixedSelectionFloatingActionDefinition: FloatingActionDefinition = {
  elementTypes: ['mixed'],
  selectionTypes: ['multiple'],
  actions: mixedSelectionActions,
  priority: 90  // High priority for mixed selections
};

export const groupFloatingActionDefinition: FloatingActionDefinition = {
  elementTypes: ['group'],
  selectionTypes: ['single', 'multiple'],
  actions: groupActions,
  priority: 80
};

// Image actions
export const imageActions: ToolbarAction[] = [
  {
    id: 'image-duplicate',
    icon: Copy,
    label: 'Duplicate',
    type: 'button',
    action: () => {
      const store = useEditorStore.getState();
      store.pushToHistory();
      
      // Calculate dynamic offset for images
      const bounds = getSelectedElementsBounds();
      const OFFSET = 32;
      const dx = bounds ? (bounds.width > 0 ? bounds.width + OFFSET : OFFSET) : OFFSET;
      const dy = bounds ? (bounds.height > 0 ? bounds.height + OFFSET : OFFSET) : OFFSET;
      
      store.selection.selectedImages.forEach(imageId => {
        store.duplicateImage(imageId, { x: dx, y: dy });
      });
    },
    priority: 80,
    tooltip: 'Duplicate image'
  },
  {
    id: 'image-lock',
    icon: Lock,
    label: 'Lock/Unlock',
    type: 'toggle',
    toggle: {
      isActive: () => areElementsLocked('images'),
      onToggle: toggleImageLock
    },
    priority: 90,
    tooltip: 'Toggle image lock state'
  },
  {
    id: 'image-delete',
    icon: Trash2,
    label: 'Delete',
    type: 'button',
    action: () => {
      const store = useEditorStore.getState();
      store.pushToHistory();
      store.selection.selectedImages.forEach(imageId => {
        store.removeImage(imageId);
      });
      store.clearSelection();
    },
    priority: 10,
    destructive: true,
    tooltip: 'Delete image'
  }
];

export const imageFloatingActionDefinition: FloatingActionDefinition = {
  elementTypes: ['image'],
  selectionTypes: ['single', 'multiple'],
  actions: imageActions,
  priority: 75
};

// Symbol actions
export const symbolActions: ToolbarAction[] = [
  {
    id: 'symbol-lock',
    icon: Lock,
    label: 'Lock/Unlock',
    type: 'toggle',
    toggle: {
      isActive: () => areElementsLocked('symbols'),
      onToggle: toggleSymbolLock
    },
    priority: 90,
    tooltip: 'Toggle symbol lock state'
  },
  {
    id: 'symbol-delete',
    icon: Trash2,
    label: 'Delete',
    type: 'button',
    action: () => {
      const store = useEditorStore.getState();
      store.pushToHistory();
      store.selection.selectedSymbols.forEach(symbolId => {
        store.removeSymbol(symbolId);
      });
      store.clearSelection();
    },
    priority: 10,
    destructive: true,
    tooltip: 'Delete symbol'
  }
];

export const symbolFloatingActionDefinition: FloatingActionDefinition = {
  elementTypes: ['symbol'],
  selectionTypes: ['single', 'multiple'],
  actions: symbolActions,
  priority: 70
};

// Use actions
export const useActions: ToolbarAction[] = [
  {
    id: 'use-duplicate',
    icon: Copy,
    label: 'Duplicate',
    type: 'button',
    action: () => {
      const store = useEditorStore.getState();
      store.pushToHistory();
      
      // Calculate dynamic offset for use elements
      const bounds = getSelectedElementsBounds();
      const OFFSET = 32;
      const dx = bounds ? (bounds.width > 0 ? bounds.width + OFFSET : OFFSET) : OFFSET;
      const dy = bounds ? (bounds.height > 0 ? bounds.height + OFFSET : OFFSET) : OFFSET;
      
      store.selection.selectedUses.forEach(useId => {
        store.duplicateUse(useId, { x: dx, y: dy });
      });
    },
    priority: 80,
    tooltip: 'Duplicate use element'
  },
  {
    id: 'use-lock',
    icon: Lock,
    label: 'Lock/Unlock',
    type: 'toggle',
    toggle: {
      isActive: () => areElementsLocked('uses'),
      onToggle: toggleUseLock
    },
    priority: 90,
    tooltip: 'Toggle use element lock state'
  },
  {
    id: 'use-delete',
    icon: Trash2,
    label: 'Delete',
    type: 'button',
    action: () => {
      const store = useEditorStore.getState();
      store.pushToHistory();
      store.selection.selectedUses.forEach(useId => {
        store.removeUse(useId);
      });
      store.clearSelection();
    },
    priority: 10,
    destructive: true,
    tooltip: 'Delete use element'
  }
];

export const useFloatingActionDefinition: FloatingActionDefinition = {
  elementTypes: ['use'],
  selectionTypes: ['single', 'multiple'],
  actions: useActions,
  priority: 65
};

// Command actions
export const commandActions: ToolbarAction[] = [
  {
    id: 'command-lock',
    icon: Lock,
    label: 'Lock/Unlock',
    type: 'toggle',
    toggle: {
      isActive: () => areElementsLocked('commands'),
      onToggle: toggleCommandLock
    },
    priority: 90,
    tooltip: 'Toggle command lock state'
  }
];

export const commandFloatingActionDefinition: FloatingActionDefinition = {
  elementTypes: ['command'],
  selectionTypes: ['single', 'multiple'],
  actions: commandActions,
  priority: 60
};

// Path actions (add lock to existing path actions)
export const pathActions: ToolbarAction[] = [
  {
    id: 'path-lock',
    icon: Lock,
    label: 'Lock/Unlock',
    type: 'toggle',
    toggle: {
      isActive: () => areElementsLocked('paths'),
      onToggle: togglePathLock
    },
    priority: 90,
    tooltip: 'Toggle path lock state'
  },
  ...singleElementActions
];

// Update the existing path floating action definition
export const updatedPathFloatingActionDefinition: FloatingActionDefinition = {
  elementTypes: ['path'],
  selectionTypes: ['single', 'multiple'],
  actions: pathActions,
  priority: 85
};