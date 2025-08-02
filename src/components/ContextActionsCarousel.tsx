import React, { useEffect } from 'react';
import { useEditorStore } from '../store/editorStore';
import { executeDelete } from '../plugins/delete/Delete';
import { arrangeManager } from '../plugins/arrange/ArrangeManager';
import { reorderManager } from '../plugins/reorder/ReorderManager';
import { generateId } from '../utils/id-utils';
import { parseCompleteSVG } from '../utils/svg-parser';
import { 
  Copy, 
  Trash2, 
  Group, 
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
  Upload
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
    createGroupFromSelection,
    zoomToSelection,
    duplicateSelection,
    resetViewportCompletely,
    replacePaths,
    replaceTexts,
    replaceTextPaths,
    setGradients,
    replaceGroups,
    updateImage,
    updateSubPath
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
          action: () => createGroupFromSelection()
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
    // Import the complete SVG generation function from SVGEditor
    // This will include all elements with their animations
    const editorState = useEditorStore.getState();
    
    // Use a more complete SVG generation similar to SVGEditor
    const generateCompleteSVG = () => {
      const { paths, texts, textPaths, groups, gradients, images, symbols, markers, clipPaths, masks, filters, uses, animations, calculateChainDelays } = editorState;
      
      // For now, use a simplified version that includes the main elements
      // In a production environment, you'd want to extract the full generateSVGCode function
      // into a shared utility module to avoid duplication
      
      const viewBox = "0 0 800 600"; // Default viewBox
      
      // Basic SVG structure with main elements
      const pathElements = paths.map(path => {
        const pathData = path.subPaths.map((subPath: any) => {
          return subPath.commands.map((cmd: any) => {
            switch (cmd.command) {
              case 'M': return `M ${cmd.x} ${cmd.y}`;
              case 'L': return `L ${cmd.x} ${cmd.y}`;
              case 'C': return `C ${cmd.x1} ${cmd.y1} ${cmd.x2} ${cmd.y2} ${cmd.x} ${cmd.y}`;
              case 'Z': return 'Z';
              default: return '';
            }
          }).join(' ');
        }).join(' ');
        
        const style = path.style;
        const fillValue = style.fill && typeof style.fill === 'object' && style.fill.id ? 
          `url(#${style.fill.id})` : (style.fill || 'none');
        const strokeValue = style.stroke && typeof style.stroke === 'object' && style.stroke.id ? 
          `url(#${style.stroke.id})` : (style.stroke || 'none');
        
        const attributes = [
          `id="${path.id}"`,
          `d="${pathData}"`,
          fillValue !== 'none' ? `fill="${fillValue}"` : 'fill="none"',
          strokeValue !== 'none' ? `stroke="${strokeValue}"` : '',
          style.strokeWidth ? `stroke-width="${style.strokeWidth}"` : '',
        ].filter(Boolean).join(' ');
        
        // Include animations for this path
        const pathAnimations = animations.filter(anim => anim.targetElementId === path.id);
        if (pathAnimations.length > 0) {
          const animationsHTML = pathAnimations.map(anim => {
            if (anim.type === 'animate') {
              return `    <animate attributeName="${anim.attributeName}" from="${anim.from || ''}" to="${anim.to || ''}" dur="${anim.dur || '2s'}" fill="freeze" />`;
            } else if (anim.type === 'animateTransform') {
              return `    <animateTransform attributeName="transform" type="${anim.transformType}" from="${anim.from || ''}" to="${anim.to || ''}" dur="${anim.dur || '2s'}" fill="freeze" />`;
            }
            return '';
          }).filter(Boolean).join('\n');
          return `  <path ${attributes}>\n${animationsHTML}\n  </path>`;
        } else {
          return `  <path ${attributes} />`;
        }
      }).join('\n');
      
      // Include basic text elements
      const textElements = texts.map(text => {
        const style = text.style || {};
        const attributes = [
          `id="${text.id}"`,
          `x="${text.x}"`,
          `y="${text.y}"`,
          style.fontSize ? `font-size="${style.fontSize}"` : '',
          style.fill ? `fill="${style.fill}"` : '',
        ].filter(Boolean).join(' ');
        
        // Include animations for this text
        const textAnimations = animations.filter(anim => anim.targetElementId === text.id);
        const textContent = (text as any).content || '';
        
        if (textAnimations.length > 0) {
          const animationsHTML = textAnimations.map(anim => {
            if (anim.type === 'animate') {
              return `    <animate attributeName="${anim.attributeName}" from="${anim.from || ''}" to="${anim.to || ''}" dur="${anim.dur || '2s'}" fill="freeze" />`;
            }
            return '';
          }).filter(Boolean).join('\n');
          return `  <text ${attributes}>\n    ${textContent}\n${animationsHTML}\n  </text>`;
        } else {
          return `  <text ${attributes}>${textContent}</text>`;
        }
      }).join('\n');
      
      // Include basic group elements
      const groupElements = groups.map(group => {
        const groupContent = group.children.map((child: any) => {
          if (child.type === 'path') {
            const path = paths.find(p => p.id === child.id);
            if (path) {
              // Similar logic as standalone paths but with proper indentation
              const pathData = path.subPaths.map((subPath: any) => {
                return subPath.commands.map((cmd: any) => {
                  switch (cmd.command) {
                    case 'M': return `M ${cmd.x} ${cmd.y}`;
                    case 'L': return `L ${cmd.x} ${cmd.y}`;
                    case 'C': return `C ${cmd.x1} ${cmd.y1} ${cmd.x2} ${cmd.y2} ${cmd.x} ${cmd.y}`;
                    case 'Z': return 'Z';
                    default: return '';
                  }
                }).join(' ');
              }).join(' ');
              
              const style = path.style;
              const fillValue = style.fill && typeof style.fill === 'object' && style.fill.id ? 
                `url(#${style.fill.id})` : (style.fill || 'none');
              
              const attributes = [
                `id="${path.id}"`,
                `d="${pathData}"`,
                fillValue !== 'none' ? `fill="${fillValue}"` : 'fill="none"',
              ].filter(Boolean).join(' ');
              
              const pathAnimations = animations.filter(anim => anim.targetElementId === path.id);
              if (pathAnimations.length > 0) {
                const animationsHTML = pathAnimations.map(anim => {
                  if (anim.type === 'animate') {
                    return `      <animate attributeName="${anim.attributeName}" from="${anim.from || ''}" to="${anim.to || ''}" dur="${anim.dur || '2s'}" fill="freeze" />`;
                  }
                  return '';
                }).filter(Boolean).join('\n');
                return `    <path ${attributes}>\n${animationsHTML}\n    </path>`;
              } else {
                return `    <path ${attributes} />`;
              }
            }
          }
          return '';
        }).filter(Boolean).join('\n');
        
        // Include animations for the group itself
        const groupAnimations = animations.filter(anim => anim.targetElementId === group.id);
        if (groupAnimations.length > 0) {
          const animationsHTML = groupAnimations.map(anim => {
            if (anim.type === 'animateTransform') {
              return `    <animateTransform attributeName="transform" type="${anim.transformType}" from="${anim.from || ''}" to="${anim.to || ''}" dur="${anim.dur || '2s'}" fill="freeze" />`;
            }
            return '';
          }).filter(Boolean).join('\n');
          
          return `  <g id="${group.id}">\n${groupContent}\n${animationsHTML}\n  </g>`;
        } else {
          return `  <g id="${group.id}">\n${groupContent}\n  </g>`;
        }
      }).join('\n');
      
      // Combine all elements
      const allElements = [pathElements, textElements, groupElements].filter(Boolean).join('\n');
      
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
${allElements}
</svg>`;
    };
    
    const svgContent = generateCompleteSVG();
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'exported-svg.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
              // Import SVG using the same functionality as context menu
              const { paths: newPaths, texts: newTexts, textPaths: newTextPaths, gradients: newGradients, filters: newFilters, groups: newGroups, animations: newAnimations } = parseCompleteSVG(svgContent);
              
              const totalElements = newPaths.length + newTexts.length + newTextPaths.length + newGradients.length + newFilters.length + newGroups.length + newAnimations.length;
              
              if (totalElements === 0) {
                alert('No valid elements found in the SVG file.');
                return;
              }
              
              // Show confirmation dialog
              const elementsInfo = [
                newPaths.length > 0 ? `${newPaths.length} path(s)` : '',
                newTexts.length > 0 ? `${newTexts.length} text element(s)` : '',
                newTextPaths.length > 0 ? `${newTextPaths.length} textPath element(s)` : '',
                newGradients.length > 0 ? `${newGradients.length} gradient(s)/pattern(s)` : '',
                newFilters.length > 0 ? `${newFilters.length} filter(s)` : '',
                newGroups.length > 0 ? `${newGroups.length} group(s)` : '',
                newAnimations.length > 0 ? `${newAnimations.length} animation(s)` : ''
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
              
              // Update filter references in elements before importing
              const updatedPaths = updateFilterReferences(newPaths);
              const updatedTexts = updateFilterReferences(newTexts);
              const updatedGroups = updateFilterReferences(newGroups);
              const updatedImages = updateFilterReferences([...images]);
              
              // Replace content with updated references
              replacePaths(updatedPaths);
              replaceTexts(updatedTexts);
              replaceTextPaths(newTextPaths);
              setGradients(newGradients);
              replaceGroups(updatedGroups);
              
              // Update images if filter references changed
              updatedImages.forEach(image => {
                updateImage(image.id, image);
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

  const actions = getActions();

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