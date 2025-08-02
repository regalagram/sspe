import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useContextMenuStore } from '../store/contextMenuStore';
import { useEditorStore } from '../store/editorStore';
import { executeDelete } from '../plugins/delete/Delete';
import { arrangeManager } from '../plugins/arrange/ArrangeManager';
import { reorderManager } from '../plugins/reorder/ReorderManager';
import { generateSmoothPath, simplifySegmentWithPointsOnPath, areCommandsInSameSubPath } from '../utils/path-simplification-utils';
import { snapToGrid } from '../utils/path-utils';
import { generateId } from '../utils/id-utils';
import { parseCompleteSVG } from '../utils/svg-parser';

interface ContextMenuOption {
  id: string;
  label: string;
  action: () => void;
  separator?: boolean;
  disabled?: boolean;
  submenu?: ContextMenuOption[];
}

export const ContextMenuComponent: React.FC = () => {
  const { isVisible, position, type, selectedItems, hideContextMenu } = useContextMenuStore();
  const menuRef = useRef<HTMLDivElement>(null);
  
  const {
    selection,
    enabledFeatures,
    animationState,
    grid,
    createGroupFromSelection,
    viewport,
    paths,
    texts,
    groups,
    toggleGrid,
    toggleSnapToGrid,
    toggleFeature,
    playAnimations,
    pauseAnimations,
    stopAnimations,
    zoomToSelection
  } = useEditorStore();

  // Initialize managers with editor store
  useEffect(() => {
    const editorState = useEditorStore.getState();
    arrangeManager.setEditorStore(editorState);
    reorderManager.setEditorStore(editorState);
  }, []);

  // Click outside handling is now managed by the ContextMenuPlugin pointer handler

  // Prevent default context menu globally when our context menu is visible
  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      // Always prevent default context menu on SVG elements and their children
      const target = event.target as Element;
      if (target.closest('svg') || target.tagName === 'svg') {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    // Use capture phase to ensure we prevent the browser menu before other handlers
    document.addEventListener('contextmenu', handleContextMenu, true);
    return () => document.removeEventListener('contextmenu', handleContextMenu, true);
  }, []);

  const getSelectionOptions = (): ContextMenuOption[] => {
    const options: ContextMenuOption[] = [];
    
    // Use the selectedItems from context menu state (captured when menu was shown)
    // instead of current editor selection which might have been cleared
    const contextSelection = selectedItems;
    
    // Helper function to execute action with preserved selection
    const executeWithSelection = (actionFn: () => void, actionName: string) => {
            
      // Temporarily restore selection before calling action
      const editorState = useEditorStore.getState();
      const currentSelection = editorState.selection;
      
      // Set the selection to what was captured when menu was shown
      currentSelection.selectedSubPaths = [...contextSelection.subPaths];
      currentSelection.selectedPaths = [...contextSelection.paths];
      currentSelection.selectedCommands = [...contextSelection.commands];
      currentSelection.selectedTexts = [...contextSelection.texts];
      currentSelection.selectedGroups = [...contextSelection.groups];
      currentSelection.selectedImages = [...contextSelection.images];
      
      actionFn();
      setTimeout(() => hideContextMenu(), 50);
    };
    
    // Reorder submenu
    options.push({
      id: 'reorder',
      label: 'Reorder',
      action: () => {},
      submenu: [
        { id: 'bring-to-front', label: 'Bring to Front', action: () => executeWithSelection(() => reorderManager.bringToFront(), 'Bring to Front') },
        { id: 'bring-forward', label: 'Bring Forward', action: () => executeWithSelection(() => reorderManager.bringForward(), 'Bring Forward') },
        { id: 'send-backward', label: 'Send Backward', action: () => executeWithSelection(() => reorderManager.sendBackward(), 'Send Backward') },
        { id: 'send-to-back', label: 'Send to Back', action: () => executeWithSelection(() => reorderManager.sendToBack(), 'Send to Back') }
      ]
    });

    // Arrange submenu
    options.push({
      id: 'arrange',
      label: 'Arrange',
      action: () => {},
      submenu: [
        { id: 'align-left', label: 'Align Left', action: () => executeWithSelection(() => arrangeManager.alignLeft(), 'Align Left') },
        { id: 'align-center', label: 'Align Center', action: () => executeWithSelection(() => arrangeManager.alignCenter(), 'Align Center') },
        { id: 'align-right', label: 'Align Right', action: () => executeWithSelection(() => arrangeManager.alignRight(), 'Align Right') },
        { id: 'separator-arrange-1', label: '', action: () => {}, separator: true },
        { id: 'align-top', label: 'Align Top', action: () => executeWithSelection(() => arrangeManager.alignTop(), 'Align Top') },
        { id: 'align-middle', label: 'Align Middle', action: () => executeWithSelection(() => arrangeManager.alignMiddle(), 'Align Middle') },
        { id: 'align-bottom', label: 'Align Bottom', action: () => executeWithSelection(() => arrangeManager.alignBottom(), 'Align Bottom') }
      ]
    });

    options.push({ id: 'separator-1', label: '', action: () => {}, separator: true });

    // Smooth/Simplify for sub-paths
    if (contextSelection.subPaths.length > 0) {
      options.push(
        { id: 'smooth-path', label: 'Smooth Path', action: () => executeWithSelection(() => {
          const editorState = useEditorStore.getState();
          const { paths, selection, updateSubPath, grid } = editorState;
          
          // Use current selection (which was restored by executeWithSelection)
          for (const subPathId of selection.selectedSubPaths) {
            for (const path of paths) {
              const subPath = path.subPaths.find(sp => sp.id === subPathId);
              if (subPath && subPath.commands.length > 2) {
                generateSmoothPath(
                  subPath.commands,
                  subPath.commands,
                  (newCommands) => updateSubPath(subPathId, { commands: newCommands }),
                  (val) => grid.snapToGrid ? snapToGrid({ x: val, y: val }, grid.size).x : Math.round(val)
                );
              }
            }
          }
        }, 'Smooth Path') },
        { id: 'simplify-path', label: 'Simplify Path', action: () => executeWithSelection(() => {
          const editorState = useEditorStore.getState();
          const { paths, selection, updateSubPath, grid } = editorState;
          
          // Use current selection (which was restored by executeWithSelection)
          for (const subPathId of selection.selectedSubPaths) {
            for (const path of paths) {
              const subPath = path.subPaths.find(sp => sp.id === subPathId);
              if (subPath && subPath.commands.length > 2) {
                const simplified = simplifySegmentWithPointsOnPath(
                  subPath.commands,
                  0.5, // tolerance
                  5,   // distance
                  grid?.size || 1
                );
                if (simplified.length >= 2) {
                  updateSubPath(subPathId, { commands: simplified });
                }
              }
            }
          }
        }, 'Simplify Path') },
        { id: 'separator-2', label: '', action: () => {}, separator: true }
      );
    }

    // Filters section
    options.push(
      { id: 'filters', label: 'Filters', action: () => {}, submenu: [
        { id: 'blur', label: 'Blur', action: () => executeWithSelection(() => {
          const editorState = useEditorStore.getState();
          const { selection, addFilter, paths, updatePathStyle, updateText } = editorState;
          
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
          const filtersBeforeAdd = editorState.filters.length;
          addFilter(blurFilter);
          
          // Get the ID of the newly added filter
          const updatedState = useEditorStore.getState();
          const blurFilterId = updatedState.filters[updatedState.filters.length - 1]?.id;
          
                    
          if (!blurFilterId) {
            console.error('❌ Failed to create blur filter - no ID returned');
            return;
          }
          
                    
          // Apply filter to selected paths (using restored selection)
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
        }, 'Blur Filter') },
        { id: 'drop-shadow', label: 'Drop Shadow', action: () => executeWithSelection(() => {
          const editorState = useEditorStore.getState();
          const { selection, addFilter, paths, updatePathStyle, updateText } = editorState;
          
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
          
                    
                    
          // Apply filter to selected paths (using restored selection)
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
        }, 'Drop Shadow Filter') },
        { id: 'brightness', label: 'Brightness', action: () => executeWithSelection(() => {
          const editorState = useEditorStore.getState();
          const { selection, addFilter, paths, updatePathStyle, updateText } = editorState;
          
          // Create a brightness filter using feColorMatrix (addFilter will generate the ID automatically)
          const brightnessFilter = {
            type: 'filter' as const,
            filterUnits: 'objectBoundingBox' as const,
            primitives: [{
              id: generateId(),
              type: 'feColorMatrix' as const,
              colorMatrixType: 'matrix' as const,
              values: '1.5 0 0 0 0  0 1.5 0 0 0  0 0 1.5 0 0  0 0 0 1 0', // Increase brightness
              in: 'SourceGraphic',
              result: 'brightness'
            }]
          };
          
                    
          // Add filter and get the generated ID
          addFilter(brightnessFilter);
          
          // Get the ID of the newly added filter
          const updatedState = useEditorStore.getState();
          const brightnessFilterId = updatedState.filters[updatedState.filters.length - 1]?.id;
          
                    
                    
          // Apply filter to selected paths (using restored selection)
          for (const pathId of selection.selectedPaths) {
                        updatePathStyle(pathId, { filter: `url(#${brightnessFilterId})` });
          }
          
          // Apply filter to selected texts
          for (const textId of selection.selectedTexts) {
                        updateText(textId, { 
              style: { filter: `url(#${brightnessFilterId})` } 
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
                            updatePathStyle(pathId, { filter: `url(#${brightnessFilterId})` });
            }
          }
        }, 'Brightness Filter') }
      ]}
    );

    // Animations section
    options.push(
      { id: 'animations', label: 'Animations', action: () => {}, submenu: [
        { id: 'animate-opacity', label: 'Animate Opacity', action: () => executeWithSelection(() => {
          const editorState = useEditorStore.getState();
          const { selection, addAnimation, paths } = editorState;
          
                    
          // Create opacity fade animation for selected elements (using restored selection)
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
              targetElementId: itemId, // Remove id, addAnimation will generate it
              type: 'animate' as const,
              attributeName: 'opacity',
              from: '1',
              to: '0.2',
              dur: '2s',
              repeatCount: 'indefinite'
            };
            
                        addAnimation(opacityAnimation);
          });
        }, 'Animate Opacity') },
        { id: 'animate-transform', label: 'Animate Transform', action: () => executeWithSelection(() => {
          const editorState = useEditorStore.getState();
          const { selection, addAnimation, paths } = editorState;
          
                    
          // Create rotation animation for selected elements (using restored selection)
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
            const rotationAnimation = {
              targetElementId: itemId, // Remove id, addAnimation will generate it
              type: 'animateTransform' as const,
              attributeName: 'transform',
              transformType: 'rotate',
              from: '0 200 200',
              to: '360 200 200',
              dur: '3s',
              repeatCount: 'indefinite'
            };
            
                        addAnimation(rotationAnimation);
          });
        }, 'Animate Transform') },
        { id: 'animate-path', label: 'Animate Path', action: () => executeWithSelection(() => {
          const editorState = useEditorStore.getState();
          const { selection, addAnimation, paths } = editorState;
          
                    
          // Create path morphing animation for selected paths (using restored selection)
          let pathsToAnimate = [...selection.selectedPaths];
          
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
            
            pathsToAnimate = Array.from(parentPaths);
          }
          
                    
          pathsToAnimate.forEach(pathId => {
            const path = paths.find(p => p.id === pathId);
            if (path && path.subPaths.length > 0) {
              const originalPath = path.subPaths.map(sp => 
                sp.commands.map(cmd => {
                  switch (cmd.command) {
                    case 'M': return `M ${cmd.x || 0} ${cmd.y || 0}`;
                    case 'L': return `L ${cmd.x || 0} ${cmd.y || 0}`;
                    case 'C': return `C ${cmd.x1 || 0} ${cmd.y1 || 0} ${cmd.x2 || 0} ${cmd.y2 || 0} ${cmd.x || 0} ${cmd.y || 0}`;
                    case 'Z': return 'Z';
                    default: return '';
                  }
                }).join(' ')
              ).join(' ');
              
              // Create a slightly modified version for animation
              const modifiedPath = path.subPaths.map(sp => 
                sp.commands.map(cmd => {
                  switch (cmd.command) {
                    case 'M': return `M ${(cmd.x || 0) + 10} ${(cmd.y || 0) + 10}`;
                    case 'L': return `L ${(cmd.x || 0) + 10} ${(cmd.y || 0) + 10}`;
                    case 'C': return `C ${(cmd.x1 || 0) + 5} ${(cmd.y1 || 0) + 5} ${(cmd.x2 || 0) + 5} ${(cmd.y2 || 0) + 5} ${(cmd.x || 0) + 10} ${(cmd.y || 0) + 10}`;
                    case 'Z': return 'Z';
                    default: return '';
                  }
                }).join(' ')
              ).join(' ');
              
              const pathAnimation = {
                targetElementId: pathId, // Remove id, addAnimation will generate it
                type: 'animate' as const,
                attributeName: 'd',
                from: originalPath,
                to: modifiedPath,
                dur: '2s',
                repeatCount: 'indefinite'
              };
              
                            addAnimation(pathAnimation);
            }
          });
        }, 'Animate Path') }
      ]},
      { id: 'separator-3', label: '', action: () => {}, separator: true }
    );

    // Lock for sub-paths
    if (contextSelection.subPaths.length > 0) {
      options.push(
        { id: 'lock-subpath', label: 'Lock Sub-path', action: () => executeWithSelection(() => {
          const editorState = useEditorStore.getState();
          const { selection, updateSubPath } = editorState;
          
          // Lock selected subpaths (using restored selection)
          for (const subPathId of selection.selectedSubPaths) {
            updateSubPath(subPathId, { locked: true });
          }
        }, 'Lock Sub-path') },
        { id: 'separator-4', label: '', action: () => {}, separator: true }
      );
    }

    // Group and Delete actions
    options.push(
      { id: 'group', label: 'Group Selection', action: () => executeWithSelection(() => createGroupFromSelection(), 'Group Selection') },
      { id: 'separator-5', label: '', action: () => {}, separator: true },
      { id: 'delete', label: 'Delete', action: () => executeWithSelection(() => {
                executeDelete(); 
              }, 'Delete') },
      { id: 'separator-6', label: '', action: () => {}, separator: true }
    );

    // Zoom to selection
    options.push(
      { id: 'zoom-to-selection', label: 'Zoom to Selection', action: () => executeWithSelection(() => {
                zoomToSelection(); 
              }, 'Zoom to Selection') }
    );

    return options;
  };

  const getCanvasOptions = (): ContextMenuOption[] => {
    const options: ContextMenuOption[] = [];
    
    // Grid options
    options.push(
      { id: 'toggle-grid', label: grid.enabled ? 'Hide Grid' : 'Show Grid', action: () => { 
                toggleGrid(); 
                setTimeout(() => hideContextMenu(), 50);
              }},
      { id: 'snap-to-grid', label: grid.snapToGrid ? 'Disable Snap to Grid' : 'Enable Snap to Grid', action: () => { 
        toggleSnapToGrid(); 
        setTimeout(() => hideContextMenu(), 50); 
      }},
      { id: 'separator-1', label: '', action: () => {}, separator: true }
    );

    // Visual debug
    options.push(
      { id: 'visual-debug', label: 'Visual Debug', action: () => {}, submenu: [
        { id: 'command-points', label: enabledFeatures.commandPointsEnabled ? 'Hide Command Points' : 'Show Command Points', action: () => { toggleFeature('commandPointsEnabled'); setTimeout(() => hideContextMenu(), 50); }},
        { id: 'control-points', label: enabledFeatures.controlPointsEnabled ? 'Hide Control Points' : 'Show Control Points', action: () => { toggleFeature('controlPointsEnabled'); setTimeout(() => hideContextMenu(), 50); }},
        { id: 'wireframe', label: enabledFeatures.wireframeEnabled ? 'Hide Wireframe' : 'Show Wireframe', action: () => { toggleFeature('wireframeEnabled'); setTimeout(() => hideContextMenu(), 50); }}
      ]},
      { id: 'separator-2', label: '', action: () => {}, separator: true }
    );

    // Animation controls
    const animationLabel = animationState.isPlaying ? 'Pause' : 'Play';
    options.push(
      { id: 'animation-control', label: `${animationLabel} Animations`, action: () => { 
        if (animationState.isPlaying) {
          pauseAnimations();
        } else {
          playAnimations();
        }
        setTimeout(() => hideContextMenu(), 50); 
      }},
      { id: 'stop-animations', label: 'Stop Animations', action: () => { 
        stopAnimations(); 
        setTimeout(() => hideContextMenu(), 50); 
      }, disabled: !animationState.isPlaying },
      { id: 'separator-3', label: '', action: () => {}, separator: true }
    );

    // Import/Export
    options.push(
      { id: 'export-svg', label: 'Export SVG', action: () => { 
        // Generate SVG using the same function as SVGEditor
        const generateSVGCode = () => {
          const editorState = useEditorStore.getState();
          const { paths, texts, textPaths, groups, gradients, images, symbols, markers, clipPaths, masks, filters, uses, animations, precision } = editorState;
          
          // Helper function to convert fill/stroke values to SVG format
          const convertStyleValue = (value: any): string => {
            if (!value || value === 'none') return 'none';
            if (typeof value === 'string') return value;
            if (typeof value === 'object' && value.id) {
              return `url(#${value.id})`;
            }
            return 'none';
          };

          // Helper function to render paths
          const renderPath = (path: any) => {
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
            const fillValue = convertStyleValue(style.fill);
            const strokeValue = convertStyleValue(style.stroke);
            
            const attributes = [
              `id="${path.id}"`,
              `d="${pathData}"`,
              fillValue !== 'none' ? `fill="${fillValue}"` : 'fill="none"',
              strokeValue !== 'none' ? `stroke="${strokeValue}"` : '',
              style.strokeWidth ? `stroke-width="${style.strokeWidth}"` : '',
            ].filter(Boolean).join(' ');
            
            return `<path ${attributes} />`;
          };

          // Generate path elements
          const pathElements = paths.map(path => `  ${renderPath(path)}`).join('\\n');
          
          const finalSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
${pathElements}
</svg>`;
          return finalSVG;
        };
        
        const svgContent = generateSVGCode();
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'exported-svg.svg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        setTimeout(() => hideContextMenu(), 50); 
      }},
      { id: 'import-svg', label: 'Import SVG', action: () => { 
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
                  console.log('🔄 Starting SVG import process via context menu...');
                  // Import SVG using the same functionality as SVGEditor plugin
                  const { paths: newPaths, texts: newTexts, textPaths: newTextPaths, images: newImages, gradients: newGradients, filters: newFilters, groups: newGroups, animations: newAnimations, animationChains: newAnimationChains } = parseCompleteSVG(svgContent);
                  
                  console.log('📊 Parsed SVG content via context menu:', { 
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
                  const { replacePaths, replaceTexts, replaceTextPaths, setGradients, replaceGroups, replaceImages, resetViewportCompletely, addFilter, removeFilter, addAnimation, removeAnimation, createAnimationChain, updateImage, filters, animations, images } = editorState;
                  
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
                    console.log(`🔗 Creating ${newAnimationChains.length} auto-generated animation chains from begin times (context menu)`);
                    newAnimationChains.forEach((chain: any) => {
                      console.log(`🔗 Creating chain: ${chain.name} with ${chain.animations.length} animations`);
                      console.log(`🔗 Chain animations:`, chain.animations.map((a: any) => ({ id: a.animationId, delay: a.delay, trigger: a.trigger })));
                      createAnimationChain(chain.name, chain.animations);
                    });
                  } else {
                    console.log('🔗 No auto-generated animation chains to create (context menu)');
                  }
                  
                  // Update filter references in elements before importing
                  const updatedPaths = updateFilterReferences(newPaths);
                  const updatedTexts = updateFilterReferences(newTexts);
                  const updatedGroups = updateFilterReferences(newGroups);
                  const updatedImages = updateFilterReferences(newImages); // Use newImages, not existing images
                  
                  console.log(`➕ Original images (context menu):`, newImages.length);
                  console.log(`➕ Updated images (context menu):`, updatedImages.length);
                  console.log(`➕ Replacing ${updatedImages.length} images in store (context menu)`);
                  updatedImages.forEach((image: any) => {
                    console.log(`➕ Image (context menu): ${image.id}, href: ${image.href.substring(0, 50)}...`);
                  });
                  
                  // Replace content with updated references
                  replacePaths(updatedPaths);
                  replaceTexts(updatedTexts);
                  replaceTextPaths(newTextPaths);
                  setGradients(newGradients);
                  replaceGroups(updatedGroups);
                  replaceImages(updatedImages); // Use replaceImages instead of individual updates
                  
                  // Verify images were stored correctly
                  const storeAfterReplace = useEditorStore.getState();
                  console.log(`✅ Images in store after replace (context menu): ${storeAfterReplace.images.length}`);
                  storeAfterReplace.images.forEach((img: any) => {
                    console.log(`✅ Stored image (context menu): ${img.id}, href: ${img.href.substring(0, 50)}...`);
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
        setTimeout(() => hideContextMenu(), 50); 
      }}
    );

    return options;
  };

  const renderMenuItem = (option: ContextMenuOption) => {
    if (option.separator) {
      return <div key={option.id} className="context-menu-separator" />;
    }

    const handleClick = (e: React.MouseEvent) => {
            
      e.preventDefault();
      e.stopPropagation();
      
      if (!option.disabled) {
                
        // CRITICAL: Capture current selection state before any events can clear it
        const currentSelection = useEditorStore.getState().selection;
                
        try {
          option.action();
        } catch (error) {
          console.error(`❌ Error executing action for ${option.label}:`, error);
        }
      } else {
        console.warn(`⚠️ Action disabled for: ${option.label}`);
      }
    };

    return (
      <div
        key={option.id}
        className={`context-menu-item ${option.disabled ? 'disabled' : ''}`}
        onClick={handleClick}
      >
        <span>{option.label}</span>
        {option.submenu && <span className="context-menu-arrow">▶</span>}
        {option.submenu && (
          <div className="context-menu-submenu">
            {option.submenu.map(renderMenuItem)}
          </div>
        )}
      </div>
    );
  };

  const options = type === 'selection' ? getSelectionOptions() : getCanvasOptions();

  // Calculate menu position to keep it within viewport bounds
  const getMenuStyle = () => {
    const menuWidth = 180; // min-width from CSS
    const menuHeight = options.length * 32; // approximate height per item
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let { x, y } = position;
    
    // Adjust horizontal position if menu would overflow right edge
    if (x + menuWidth > viewportWidth) {
      x = viewportWidth - menuWidth - 10;
    }
    
    // Adjust vertical position if menu would overflow bottom edge
    if (y + menuHeight > viewportHeight) {
      y = viewportHeight - menuHeight - 10;
    }
    
    // Ensure menu doesn't go off left or top edges
    x = Math.max(10, x);
    y = Math.max(10, y);
    
    return {
      position: 'fixed' as const,
      left: x,
      top: y,
      zIndex: 10000,
    };
  };

  if (!isVisible) return null;

  // Use portal to render outside of SVG
  return createPortal(
    <div
      ref={menuRef}
      className="context-menu"
      style={getMenuStyle()}
    >
      {options.map(renderMenuItem)}
    </div>,
    document.body
  );
};