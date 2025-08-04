import React, { useEffect } from 'react';
import { useEditorStore } from '../store/editorStore';
import { executeDelete } from '../plugins/delete/Delete';
import { arrangeManager } from '../plugins/arrange/ArrangeManager';
import { reorderManager } from '../plugins/reorder/ReorderManager';
import { generateId } from '../utils/id-utils';
import { parseCompleteSVG } from '../utils/svg-parser';
import { generateSVGCode, downloadSVGFile } from '../utils/svg-export';
import { 
  generateSmoothPath, 
  areCommandsInSameSubPath,
  simplifySegmentWithPointsOnPath
} from '../utils/path-simplification-utils';
import { 
  Copy, 
  Trash2, 
  Group, 
  Ungroup,
  Layers, 
  ArrowUp, 
  ArrowDown, 
  RotateCcw, 
  RotateCw,
  Circle,
  Droplets,
  Sun,
  Play,
  Lock,
  Unlock,
  ZoomIn,
  Grid,
  Eye,
  EyeOff,
  Download,
  Upload,
  Waves,
  Minimize2
} from 'lucide-react';

interface ContextAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  action: () => void;
  disabled?: boolean;
  condition?: () => boolean;
}

interface ContextActionsCarouselProps {
  className?: string;
}

export const ContextActionsCarousel: React.FC<ContextActionsCarouselProps> = ({ className = '' }) => {
  const { 
    selection, 
    paths, 
    texts, 
    groups, 
    images,
    filters,
    animations,
    grid,
    toggleGrid,
    toggleSnapToGrid,
    updatePathStyle,
    updateText,
    addFilter,
    removeFilter,
    addAnimation,
    removeAnimation,
    createAnimationChain,
    addImage,
    removeImage,
    replaceImages,
    createGroupFromSelection,
    ungroupElements,
    zoomToSelection,
    duplicateSelection,
    resetViewportCompletely,
    replacePaths,
    replaceTexts,
    replaceTextPaths,
    setGradients,
    replaceGroups,
    updateImage,
    updateSubPath,
    replaceSubPathCommands,
    pushToHistory
  } = useEditorStore();

  // Initialize managers with editor store
  useEffect(() => {
    const editorState = useEditorStore.getState();
    arrangeManager.setEditorStore(editorState);
    reorderManager.setEditorStore(editorState);
  }, []);

  // Get selected counts
  const selectedCount = selection.selectedPaths.length + 
                       selection.selectedSubPaths.length + 
                       selection.selectedCommands.length + 
                       selection.selectedTexts.length + 
                       selection.selectedGroups.length + 
                       selection.selectedImages.length;

  const hasSelection = selectedCount > 0;
  const hasSubPaths = selection.selectedSubPaths.length > 0;

  // Action definitions
  const getActions = (): ContextAction[] => {
    const actions: ContextAction[] = [];

    if (hasSelection) {
      // Selection-specific actions
      actions.push(
        {
          id: 'duplicate',
          icon: <Copy size={24} />,
          label: 'Duplicate',
          action: () => duplicateSelection()
        },
        {
          id: 'group',
          icon: <Group size={24} />,
          label: 'Group',
          action: () => createGroupFromSelection(),
          condition: () => {
            // Show group when we have groupable items but no groups selected
            const hasGroupableItems = selection.selectedPaths.length > 0 || 
                                     selection.selectedTexts.length > 0 || 
                                     selection.selectedSubPaths.length > 0 ||
                                     selection.selectedImages.length > 0;
            const hasSelectedGroups = selection.selectedGroups.length > 0;
            return hasGroupableItems && !hasSelectedGroups;
          }
        },
        {
          id: 'ungroup',
          icon: <Ungroup size={24} />,
          label: 'Ungroup',
          action: () => {
            // Ungroup all selected groups
            selection.selectedGroups.forEach(groupId => {
              ungroupElements(groupId);
            });
          },
          condition: () => selection.selectedGroups.length > 0
        },
        {
          id: 'bring-front',
          icon: <ArrowUp size={24} />,
          label: 'To Front',
          action: () => reorderManager.bringToFront()
        },
        {
          id: 'send-back',
          icon: <ArrowDown size={24} />,
          label: 'To Back',
          action: () => reorderManager.sendToBack()
        },
        {
          id: 'blur',
          icon: <Circle size={24} />,
          label: 'Blur',
          action: () => applyBlurFilter()
        },
        {
          id: 'shadow',
          icon: <Droplets size={24} />,
          label: 'Shadow',
          action: () => applyDropShadowFilter()
        },
        {
          id: 'animate',
          icon: <Play size={24} />,
          label: 'Animate',
          action: () => applyOpacityAnimation()
        },
        {
          id: 'zoom-to',
          icon: <ZoomIn size={24} />,
          label: 'Zoom To',
          action: () => zoomToSelection()
        },
        {
          id: 'delete',
          icon: <Trash2 size={24} />,
          label: 'Delete',
          action: () => executeDelete()
        }
      );

      // Lock/Unlock for sub-paths
      if (hasSubPaths) {
        actions.splice(-1, 0, {
          id: 'lock-subpath',
          icon: <Lock size={24} />,
          label: 'Lock',
          action: () => {
            selection.selectedSubPaths.forEach(subPathId => {
              updateSubPath(subPathId, { locked: true });
            });
          }
        });

        // Add Smooth button for sub-paths
        actions.splice(-1, 0, {
          id: 'smooth-subpath',
          icon: <Waves size={24} />,
          label: 'Smooth',
          action: handleSmooth
        });

        // Add Simplify button for sub-paths
        actions.splice(-1, 0, {
          id: 'simplify-subpath',
          icon: <Minimize2 size={24} />,
          label: 'Simplify',
          action: handleSimplify
        });
      }
    } else {
      // Canvas actions (no selection)
      actions.push(
        {
          id: 'toggle-grid',
          icon: <Grid size={24} />,
          label: grid.enabled ? 'Hide Grid' : 'Show Grid',
          action: () => toggleGrid()
        },
        {
          id: 'snap-grid',
          icon: grid.snapToGrid ? <EyeOff size={24} /> : <Eye size={24} />,
          label: grid.snapToGrid ? 'Snap Off' : 'Snap On',
          action: () => toggleSnapToGrid()
        },
        {
          id: 'export-svg',
          icon: <Download size={24} />,
          label: 'Export',
          action: () => exportSVG()
        },
        {
          id: 'import-svg',
          icon: <Upload size={24} />,
          label: 'Import',
          action: () => importSVG()
        },
        {
          id: 'reset-view',
          icon: <RotateCcw size={24} />,
          label: 'Reset View',
          action: () => resetViewportCompletely()
        }
      );
    }

    return actions;
  };

  // Smoothing functionality for mobile context menu
  const handleSmooth = () => {
    const { selectedSubPaths } = selection;
    
    if (selectedSubPaths.length === 0) return;
    
    // Save current state to history before making changes
    pushToHistory();
    
    // Process each selected subpath
    selectedSubPaths.forEach(subPathId => {
      for (const path of paths) {
        const subPath = path.subPaths.find((sp: any) => sp.id === subPathId);
        if (subPath && subPath.commands.length >= 2) {
          const subPathCommands = subPath.commands;
          
          // Apply smoothing to entire subpath
          const segmentToSmooth = [...subPathCommands];
          
          // Helper function to update this specific subpath
          const updateSubPath = (newCommands: any[]) => {
            // CRITICAL: Ensure the subpath ALWAYS starts with M
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
          break;
        }
      }
    });
  };

  // Simplification functionality for mobile context menu
  const handleSimplify = () => {
    const { selectedSubPaths } = selection;
    
    if (selectedSubPaths.length === 0) return;
    
    // Save current state to history before making changes
    pushToHistory();
    
    // Use default simplification parameters
    const simplifyTolerance = 0.1;
    const simplifyDistance = 10;
    
    // Process each selected subpath
    selectedSubPaths.forEach(subPathId => {
      for (const path of paths) {
        const subPath = path.subPaths.find((sp: any) => sp.id === subPathId);
        if (subPath && subPath.commands.length >= 2) {
          const commands = subPath.commands;
          
          // Use points-on-path algorithm for simplification (Ramer-Douglas-Peucker)
          const simplifiedCommands = simplifySegmentWithPointsOnPath(
            commands, 
            simplifyTolerance, 
            simplifyDistance, 
            grid.snapToGrid ? grid.size : 0
          );

          if (simplifiedCommands.length === 0) continue;

          // CRITICAL: Ensure the subpath ALWAYS starts with M
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
          break;
        }
      }
    });
  };

  // Helper functions
  const applyBlurFilter = () => {
    // Create a blur filter (addFilter will generate the ID automatically)
    const blurFilter = {
      type: 'filter' as const,
      filterUnits: 'objectBoundingBox' as const,
      primitives: [{
        id: generateId(),
        type: 'feGaussianBlur' as const,
        stdDeviation: 2,
        in: 'SourceGraphic',
        result: 'blur'
      }]
    };
    
    // Add filter and get the generated ID  
    addFilter(blurFilter);
    
    // Get the ID of the newly added filter
    const updatedState = useEditorStore.getState();
    const blurFilterId = updatedState.filters[updatedState.filters.length - 1]?.id;
    
    if (!blurFilterId) {
      console.error('❌ Failed to create blur filter - no ID returned');
      return;
    }
    
    // Apply filter to selected paths
    for (const pathId of selection.selectedPaths) {
      updatePathStyle(pathId, { filter: `url(#${blurFilterId})` });
    }
    
    // Apply filter to selected texts
    for (const textId of selection.selectedTexts) {
      updateText(textId, { 
        style: { filter: `url(#${blurFilterId})` } 
      });
    }
    
    // If we have selected subpaths but no selected paths, we need to find the parent paths
    if (selection.selectedPaths.length === 0 && selection.selectedSubPaths.length > 0) {
      const parentPaths = new Set<string>();
      
      for (const subPathId of selection.selectedSubPaths) {
        for (const path of paths) {
          if (path.subPaths.some(sp => sp.id === subPathId)) {
            parentPaths.add(path.id);
            break;
          }
        }
      }
      
      // Apply filter to parent paths
      for (const pathId of parentPaths) {
        updatePathStyle(pathId, { filter: `url(#${blurFilterId})` });
      }
    }
  };

  const applyDropShadowFilter = () => {
    // Create a drop shadow filter (addFilter will generate the ID automatically)
    const shadowFilter = {
      type: 'filter' as const,
      filterUnits: 'objectBoundingBox' as const,
      primitives: [
        {
          id: generateId(),
          type: 'feDropShadow' as const,
          dx: 2,
          dy: 2,
          stdDeviation: 2,
          floodColor: '#000000',
          floodOpacity: 0.3,
          result: 'shadow'
        }
      ]
    };
    
    // Add filter and get the generated ID
    addFilter(shadowFilter);
    
    // Get the ID of the newly added filter
    const updatedState = useEditorStore.getState();
    const shadowFilterId = updatedState.filters[updatedState.filters.length - 1]?.id;
    
    if (!shadowFilterId) {
      console.error('❌ Failed to create shadow filter - no ID returned');
      return;
    }
    
    // Apply filter to selected paths
    for (const pathId of selection.selectedPaths) {
      updatePathStyle(pathId, { filter: `url(#${shadowFilterId})` });
    }
    
    // Apply filter to selected texts
    for (const textId of selection.selectedTexts) {
      updateText(textId, { 
        style: { filter: `url(#${shadowFilterId})` } 
      });
    }
    
    // If we have selected subpaths but no selected paths, we need to find the parent paths
    if (selection.selectedPaths.length === 0 && selection.selectedSubPaths.length > 0) {
      const parentPaths = new Set<string>();
      
      for (const subPathId of selection.selectedSubPaths) {
        for (const path of paths) {
          if (path.subPaths.some(sp => sp.id === subPathId)) {
            parentPaths.add(path.id);
            break;
          }
        }
      }
      
      // Apply filter to parent paths
      for (const pathId of parentPaths) {
        updatePathStyle(pathId, { filter: `url(#${shadowFilterId})` });
      }
    }
  };

  const applyOpacityAnimation = () => {
    // Create opacity fade animation for selected elements
    const selectedItems = [
      ...selection.selectedPaths,
      ...selection.selectedTexts,
      ...selection.selectedGroups,
      ...selection.selectedImages
    ];
    
    // If we have selected subpaths but no selected paths, find parent paths
    if (selection.selectedPaths.length === 0 && selection.selectedSubPaths.length > 0) {
      const parentPaths = new Set<string>();
      
      for (const subPathId of selection.selectedSubPaths) {
        for (const path of paths) {
          if (path.subPaths.some(sp => sp.id === subPathId)) {
            parentPaths.add(path.id);
            break;
          }
        }
      }
      
      // Add parent paths to selected items
      selectedItems.push(...Array.from(parentPaths));
    }
    
    selectedItems.forEach(itemId => {
      const opacityAnimation = {
        targetElementId: itemId,
        type: 'animate' as const,
        attributeName: 'opacity',
        from: '1',
        to: '0.2',
        dur: '2s',
        repeatCount: 'indefinite'
      };
      
      addAnimation(opacityAnimation);
    });
  };

  const exportSVG = () => {
    // Use the unified SVG export function (same as other export locations)
    const editorState = useEditorStore.getState();
    
    const svgContent = generateSVGCode(editorState);
    downloadSVGFile(svgContent, 'mobile-export.svg');
  };

  const importSVG = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.svg,image/svg+xml';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        if (file.type !== 'image/svg+xml' && !file.name.toLowerCase().endsWith('.svg')) {
          alert('Please select a valid SVG file.');
          return;
        }
        
        const reader = new FileReader();
        reader.onload = (event) => {
          const svgContent = event.target?.result as string;
          if (svgContent) {
            try {
              console.log('🔄 Starting SVG import process...');
              // Import SVG using the same functionality as context menu
              const { paths: newPaths, texts: newTexts, textPaths: newTextPaths, images: newImages, gradients: newGradients, filters: newFilters, groups: newGroups, animations: newAnimations, animationChains: newAnimationChains } = parseCompleteSVG(svgContent);
              
              console.log('📊 Parsed SVG content:', { 
                paths: newPaths.length, 
                texts: newTexts.length, 
                images: newImages.length, 
                animations: newAnimations.length,
                animationChains: (newAnimationChains || []).length 
              });
              
              const totalElements = newPaths.length + newTexts.length + newTextPaths.length + newImages.length + newGradients.length + newFilters.length + newGroups.length + newAnimations.length;
              
              if (totalElements === 0) {
                alert('No valid elements found in the SVG file.');
                return;
              }
              
              // Show confirmation dialog
              const elementsInfo = [
                newPaths.length > 0 ? `${newPaths.length} path(s)` : '',
                newTexts.length > 0 ? `${newTexts.length} text element(s)` : '',
                newTextPaths.length > 0 ? `${newTextPaths.length} textPath element(s)` : '',
                newImages.length > 0 ? `${newImages.length} image(s)` : '',
                newGradients.length > 0 ? `${newGradients.length} gradient(s)/pattern(s)` : '',
                newFilters.length > 0 ? `${newFilters.length} filter(s)` : '',
                newGroups.length > 0 ? `${newGroups.length} group(s)` : '',
                newAnimations.length > 0 ? `${newAnimations.length} animation(s)` : '',
                (newAnimationChains || []).length > 0 ? `${(newAnimationChains || []).length} animation chain(s)` : ''
              ].filter(Boolean).join(', ');
              
              const confirmMessage = `Import SVG with: ${elementsInfo}?\n\nThis will replace all current content.`;
              
              if (!confirm(confirmMessage)) {
                return;
              }
              
              // Get editor store and import content
              const editorState = useEditorStore.getState();
              
              // Create filter ID mapping for reference updates
              const filterIdMapping: Record<string, string> = {};
              
              // Helper function to update filter references
              const updateFilterReferences = <T extends { style?: { filter?: string } }>(elements: T[]): T[] => {
                return elements.map(element => {
                  if (element.style?.filter) {
                    const match = element.style.filter.match(/^url\(#(.+)\)$/);
                    if (match && match[1]) {
                      const originalId = match[1];
                      const newId = filterIdMapping[originalId];
                      if (newId) {
                        return {
                          ...element,
                          style: {
                            ...element.style,
                            filter: `url(#${newId})`
                          }
                        };
                      }
                    }
                  }
                  return element;
                });
              };
              
              // Clear existing filters and add new ones with ID mapping
              const currentFilters = [...filters];
              currentFilters.forEach(filter => removeFilter(filter.id));
              
              newFilters.forEach(filter => {
                const originalId = filter.id;
                addFilter(filter);
                const storeState = useEditorStore.getState();
                const addedFilter = storeState.filters[storeState.filters.length - 1];
                if (addedFilter && addedFilter.id) {
                  filterIdMapping[originalId] = addedFilter.id;
                }
              });
              
              // Clear existing animations and add new ones
              const currentAnimations = [...animations];
              currentAnimations.forEach(animation => removeAnimation(animation.id));
              newAnimations.forEach((animation: any) => {
                addAnimation(animation);
              });

              // Create auto-generated animation chains if any were detected
              if (newAnimationChains && newAnimationChains.length > 0) {
                console.log(`🔗 Creating ${newAnimationChains.length} auto-generated animation chains from begin times`);
                newAnimationChains.forEach((chain: any) => {
                  console.log(`🔗 Creating chain: ${chain.name} with ${chain.animations.length} animations`);
                  console.log(`🔗 Chain animations:`, chain.animations.map((a: any) => ({ id: a.animationId, delay: a.delay, trigger: a.trigger })));
                  createAnimationChain(chain.name, chain.animations);
                });
              } else {
                console.log('🔗 No auto-generated animation chains to create');
              }
              
              // Update filter references in elements before importing
              const updatedPaths = updateFilterReferences(newPaths);
              const updatedTexts = updateFilterReferences(newTexts);
              const updatedGroups = updateFilterReferences(newGroups);
              const updatedImages = updateFilterReferences(newImages);
              
              console.log(`➕ Original images:`, newImages.length);
              console.log(`➕ Updated images:`, updatedImages.length);
              console.log(`➕ Replacing ${updatedImages.length} images in store`);
              updatedImages.forEach((image: any) => {
                console.log(`➕ Image: ${image.id}, href: ${image.href.substring(0, 50)}...`);
              });
              
              // Replace content with updated references
              replacePaths(updatedPaths);
              replaceTexts(updatedTexts);
              replaceTextPaths(newTextPaths);
              setGradients(newGradients);
              replaceGroups(updatedGroups);
              replaceImages(updatedImages);
              
              // Verify images were stored correctly
              const storeAfterReplace = useEditorStore.getState();
              console.log(`✅ Images in store after replace: ${storeAfterReplace.images.length}`);
              storeAfterReplace.images.forEach((img: any) => {
                console.log(`✅ Stored image: ${img.id}, href: ${img.href.substring(0, 50)}...`);
              });
              
              // Reset viewport to fit new content
              resetViewportCompletely();
              
            } catch (error) {
              console.error('Error importing SVG:', error);
              alert(`Error importing SVG: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        };
        reader.onerror = () => {
          alert('Error reading the file.');
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const actions = getActions().filter(action => !action.condition || action.condition());

  return (
    <div className={`context-actions-carousel ${className}`}>
      <div className="carousel-container">
        <div className="carousel-scroll">
          {actions.map((action) => (
            <button
              key={action.id}
              className={`carousel-action ${action.disabled ? 'disabled' : ''}`}
              onClick={action.action}
              disabled={action.disabled}
              title={action.label}
            >
              <div className="action-icon">
                {action.icon}
              </div>
              <span className="action-label">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};