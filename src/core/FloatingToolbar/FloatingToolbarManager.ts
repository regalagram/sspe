import { 
  FloatingActionDefinition, 
  ToolbarAction, 
  ElementType, 
  SelectionType,
  FloatingToolbarConfig 
} from '../../types/floatingToolbar';
import { SelectionState } from '../../types';
import { Plugin } from '../PluginSystem';
import { useEditorStore } from '../../store/editorStore';

export class FloatingToolbarManager {
  private static instance: FloatingToolbarManager;
  private plugins: Map<string, Plugin> = new Map();
  private actionDefinitions: FloatingActionDefinition[] = [];
  
  private config: FloatingToolbarConfig = {
    desktop: {
      maxVisibleButtons: 10,
      buttonSize: 32,
      layout: 'horizontal',
      spacing: 4
    },
    mobile: {
      maxVisibleButtons: 10,
      buttonSize: 28,
      layout: 'adaptive',
      spacing: 4
    }
  };

  static getInstance(): FloatingToolbarManager {
    if (!FloatingToolbarManager.instance) {
      FloatingToolbarManager.instance = new FloatingToolbarManager();
    }
    return FloatingToolbarManager.instance;
  }

  registerPlugin(plugin: Plugin): void {
    this.plugins.set(plugin.id, plugin);
    
    if (plugin.floatingActions) {
            this.actionDefinitions.push(...plugin.floatingActions);
      // Sort by priority
      this.actionDefinitions.sort((a, b) => (b.priority || 0) - (a.priority || 0));
          }
  }

  unregisterPlugin(pluginId: string): void {
    this.plugins.delete(pluginId);
    this.actionDefinitions = this.actionDefinitions.filter(
      def => !this.isDefinitionFromPlugin(def, pluginId)
    );
  }

  getActionsForSelection(selection: SelectionState): ToolbarAction[] {
        
    if (!this.hasValidSelection(selection)) {
            return [];
    }

    const elementTypes = this.detectElementTypes(selection);
    const selectionType = this.getSelectionType(selection);
    
    let actions: ToolbarAction[] = [];
    
    for (const definition of this.actionDefinitions) {
      if (this.matchesDefinition(definition, elementTypes, selectionType)) {
                // Filter out disabled and invisible actions
        const validActions = definition.actions.filter(action => {
          if (action.disabled) return false;
          
          // Check visibility
          if (action.visible === false) return false;
          if (typeof action.visible === 'function' && !action.visible()) return false;
          
          return true;
        });
        actions.push(...validActions);
      }
    }
    
    const processedActions = this.processActions(actions);
    
    return processedActions;
  }

  getConfig(): FloatingToolbarConfig {
    return this.config;
  }

  updateConfig(config: Partial<FloatingToolbarConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private hasValidSelection(selection: SelectionState): boolean {
    return (
      selection.selectedPaths.length > 0 ||
      selection.selectedSubPaths.length > 0 ||
      selection.selectedCommands.length > 0 ||
      selection.selectedTexts.length > 0 ||
      selection.selectedTextSpans.length > 0 ||
      selection.selectedTextPaths.length > 0 ||
      selection.selectedGroups.length > 0 ||
      selection.selectedImages.length > 0 ||
      selection.selectedClipPaths.length > 0 ||
      selection.selectedMasks.length > 0 ||
      selection.selectedFilters.length > 0 ||
      selection.selectedFilterPrimitives.length > 0 ||
      selection.selectedMarkers.length > 0 ||
      selection.selectedSymbols.length > 0 ||
      selection.selectedUses.length > 0 ||
      selection.selectedAnimations.length > 0 ||
      selection.selectedGradients.length > 0 ||
      selection.selectedGradientStops.length > 0
    );
  }

  private detectElementTypes(selection: SelectionState): ElementType[] {
    const types: Set<ElementType> = new Set();
    
    if (selection.selectedTexts.length > 0) types.add('text');
    if (selection.selectedSubPaths.length > 0) types.add('subpath');
    if (selection.selectedCommands.length > 0) types.add('command');
    if (selection.selectedGroups.length > 0) types.add('group');
    if (selection.selectedUses.length > 0) types.add('use');
    if (selection.selectedImages.length > 0) types.add('image');
    
    // Only add 'path' type if there are paths selected BUT no subpaths
    // This is for legacy support when working with full paths directly
    if (selection.selectedPaths.length > 0 && selection.selectedSubPaths.length === 0) {
      types.add('path');
    }
    
    // If multiple different types are selected, add 'mixed'
    if (types.size > 1) {
      types.add('mixed');
    }
    
    return Array.from(types);
  }

  private getSelectionType(selection: SelectionState): SelectionType {
    const totalSelected = 
      selection.selectedPaths.length +
      selection.selectedSubPaths.length +
      selection.selectedCommands.length +
      selection.selectedTexts.length +
      selection.selectedGroups.length +
      selection.selectedUses.length +
      selection.selectedImages.length;
    
    return totalSelected > 1 ? 'multiple' : 'single';
  }

  private matchesDefinition(
    definition: FloatingActionDefinition,
    elementTypes: ElementType[],
    selectionType: SelectionType
  ): boolean {
    // Check if selection type matches
    if (!definition.selectionTypes.includes(selectionType)) {
      return false;
    }
    
    // If this is a mixed selection and the definition is for 'mixed', it should match
    if (elementTypes.includes('mixed') && definition.elementTypes.includes('mixed')) {
      return true;
    }
    
    // If this is a mixed selection but the definition is NOT for 'mixed', it should NOT match
    // This ensures that mixed selection actions take precedence over individual element type actions
    if (elementTypes.includes('mixed') && !definition.elementTypes.includes('mixed')) {
      return false;
    }
    
    // For non-mixed selections, check if any element type matches
    return definition.elementTypes.some(defType => elementTypes.includes(defType));
  }

  private processActions(actions: ToolbarAction[]): ToolbarAction[] {
    // First consolidate similar actions for mixed selections
    const consolidatedActions = this.consolidateSimilarActions(actions);
    
    // Remove duplicates based on action id
    const uniqueActions = new Map<string, ToolbarAction>();
    
    for (const action of consolidatedActions) {
      if (!uniqueActions.has(action.id) || (action.priority || 0) > (uniqueActions.get(action.id)?.priority || 0)) {
        uniqueActions.set(action.id, action);
      }
    }
    
    // Sort by priority, then by type (destructive actions last)
    const sortedActions = Array.from(uniqueActions.values()).sort((a, b) => {
      // Destructive actions go to the end
      if (a.destructive && !b.destructive) return 1;
      if (!a.destructive && b.destructive) return -1;
      
      // Then by priority
      return (b.priority || 0) - (a.priority || 0);
    });
    
    return sortedActions;
  }

  private consolidateSimilarActions(actions: ToolbarAction[]): ToolbarAction[] {
    // Group actions by their semantic function (not ID)
    const actionGroups = new Map<string, ToolbarAction[]>();
    const otherActions: ToolbarAction[] = [];

    for (const action of actions) {
      const semanticType = this.getSemanticActionType(action.id);
      if (semanticType) {
        if (!actionGroups.has(semanticType)) {
          actionGroups.set(semanticType, []);
        }
        actionGroups.get(semanticType)!.push(action);
      } else {
        otherActions.push(action);
      }
    }

    const consolidatedActions: ToolbarAction[] = [...otherActions];

    // For each group, create a unified action or pick the best one
    for (const [semanticType, groupActions] of actionGroups) {
      if (groupActions.length > 1) {
        const unifiedAction = this.createUnifiedAction(semanticType, groupActions);
        consolidatedActions.push(unifiedAction);
      } else {
        consolidatedActions.push(groupActions[0]);
      }
    }
    return consolidatedActions;
  }

  private getSemanticActionType(actionId: string): string | null {
    if (actionId.includes('duplicate')) return 'duplicate';
    if (actionId.includes('delete')) return 'delete';
    if (actionId.includes('copy')) return 'copy';
    
    // Clear style actions
    if (actionId.includes('clear-style') || actionId.includes('clear-text-style') || actionId.includes('subpath-clear-style') || actionId.includes('mixed-clear-style')) return 'clear-style';
    
    // Lock actions
    if (actionId.includes('lock') && (actionId.includes('subpath') || actionId.includes('mixed') || actionId.includes('text') || actionId.includes('image') || actionId.includes('symbol') || actionId.includes('use') || actionId.includes('command') || actionId.includes('path') || actionId.includes('group'))) return 'lock';
    
    // Color and fill actions
    if (actionId.includes('fill-color') || actionId.includes('text-color')) return 'fill-color';
    if (actionId.includes('stroke-color')) return 'stroke-color';
    
    // Stroke properties
    if (actionId.includes('stroke-options') || actionId.includes('stroke-width')) return 'stroke-options';
    
    // Filters
    if (actionId.includes('filter')) return 'filters';
    
    // Animations
    if (actionId.includes('animation')) return 'animations';
    
    // Arrange actions
    if (actionId.includes('arrange') || actionId.includes('align') || actionId.includes('distribute')) return 'arrange';
    
    // Group actions
    if (actionId.includes('group-selected') || actionId.includes('mixed-group')) return 'group';
    if (actionId.includes('ungroup')) return 'ungroup';
    
    return null;
  }

  private createUnifiedAction(semanticType: string, groupActions: ToolbarAction[]): ToolbarAction {
    // Sort by priority to get the highest priority action as base
    const sortedActions = groupActions.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    const baseAction = sortedActions[0];

    // Create specialized unified actions based on semantic type
    if (semanticType === 'fill-color' || semanticType === 'stroke-color') {
      return this.createUnifiedColorAction(semanticType, baseAction, groupActions);
    } else if (semanticType === 'stroke-options') {
      return this.createUnifiedStrokeAction(baseAction, groupActions);
    } else if (semanticType === 'filters') {
      return this.createUnifiedFilterAction(baseAction, groupActions);
    } else if (semanticType === 'animations') {
      return this.createUnifiedAnimationAction(baseAction, groupActions);
    } else if (semanticType === 'arrange') {
      return this.createUnifiedArrangeAction(baseAction, groupActions);
    } else if (semanticType === 'clear-style') {
      return this.createUnifiedClearStyleAction(baseAction, groupActions);
    } else if (semanticType === 'lock') {
      return this.createUnifiedLockAction(baseAction, groupActions);
    }

    // Create specialized unified actions for basic operations
    if (semanticType === 'duplicate') {
      return this.createUnifiedDuplicateAction(baseAction);
    } else if (semanticType === 'delete') {
      return this.createUnifiedDeleteAction(baseAction);
    } else if (semanticType === 'copy') {
      return this.createUnifiedCopyAction(baseAction);
    } else if (semanticType === 'group') {
      return this.createUnifiedGroupAction(baseAction, groupActions);
    } else if (semanticType === 'ungroup') {
      return this.createUnifiedUngroupAction(baseAction, groupActions);
    }

    // Fallback for unknown semantic types
    const unifiedAction: ToolbarAction = {
      ...baseAction,
      id: `unified-${semanticType}`,
      label: this.getUnifiedLabel(semanticType),
      tooltip: this.getUnifiedTooltip(semanticType),
      type: 'button',
      action: () => {
        // Execute all individual actions as fallback
        groupActions.forEach(action => {
          if (action.action && typeof action.action === 'function') {
            try {
              action.action();
            } catch (error) {
              console.warn(`Error executing ${action.id}:`, error);
            }
          } else if (action.toggle?.onToggle && typeof action.toggle.onToggle === 'function') {
            try {
              action.toggle.onToggle();
            } catch (error) {
              console.warn(`Error executing toggle ${action.id}:`, error);
            }
          }
        });
      }
    };

    return unifiedAction;
  }

  private createUnifiedColorAction(semanticType: string, baseAction: ToolbarAction, groupActions: ToolbarAction[]): ToolbarAction {
    return {
      ...baseAction,
      id: `unified-${semanticType}`,
      label: this.getUnifiedLabel(semanticType),
      tooltip: this.getUnifiedTooltip(semanticType),
      type: 'color',
      color: {
        currentColor: baseAction.color?.currentColor || '#000000',
        onChange: (color: string) => {
          // Apply color to all selected elements based on selection state
          this.applyColorToAllSelected(semanticType, color);
        }
      }
    };
  }

  private createUnifiedStrokeAction(baseAction: ToolbarAction, groupActions: ToolbarAction[]): ToolbarAction {
    // Get stroke options from the base action or provide defaults
    const baseStrokeOptions = baseAction.strokeOptions;
    
    return {
      ...baseAction,
      id: 'unified-stroke-options',
      label: this.getUnifiedLabel('stroke-options'),
      tooltip: this.getUnifiedTooltip('stroke-options'),
      type: 'input',
      input: baseAction.input,
      strokeOptions: {
        getCurrentStrokeWidth: baseStrokeOptions?.getCurrentStrokeWidth || (() => 1),
        getCurrentStrokeDash: baseStrokeOptions?.getCurrentStrokeDash || (() => 'none'),
        getCurrentStrokeLinecap: baseStrokeOptions?.getCurrentStrokeLinecap || (() => 'butt'),
        getCurrentStrokeLinejoin: baseStrokeOptions?.getCurrentStrokeLinejoin || (() => 'miter'),
        onStrokeWidthChange: (width: number) => {
          this.applyStrokeWidthToAllSelected(width);
        },
        onStrokeDashChange: (dash: string) => {
          this.applyStrokeDashToAllSelected(dash);
        },
        onStrokeLinecapChange: (linecap: string) => {
          this.applyStrokeLinecapToAllSelected(linecap);
        },
        onStrokeLinejoinChange: (linejoin: string) => {
          this.applyStrokeLinejoinToAllSelected(linejoin);
        }
      }
    };
  }

  private createUnifiedFilterAction(baseAction: ToolbarAction, groupActions: ToolbarAction[]): ToolbarAction {
    // Combine all filter options from different actions and remove duplicates
    const allFilterOptions: any[] = [];
    const seenFilterIds = new Set<string>();
    
    groupActions.forEach(action => {
      if (action.dropdown?.options) {
        action.dropdown.options.forEach(option => {
          // Use a normalized ID for deduplication (remove prefixes like 'text-' or 'subpath-')
          const normalizedId = option.id.replace(/^(text-|subpath-)/, '');
          
          if (!seenFilterIds.has(normalizedId)) {
            seenFilterIds.add(normalizedId);
            allFilterOptions.push({
              ...option,
              id: normalizedId // Use the normalized ID
            });
          }
        });
      }
    });

    return {
      ...baseAction,
      id: 'unified-filters',
      label: this.getUnifiedLabel('filters'),
      tooltip: this.getUnifiedTooltip('filters'),
      type: 'dropdown',
      dropdown: {
        options: allFilterOptions.map(option => ({
          ...option,
          action: () => {
            this.applyFilterToAllSelected(option);
          }
        }))
      }
    };
  }

  private createUnifiedAnimationAction(baseAction: ToolbarAction, groupActions: ToolbarAction[]): ToolbarAction {
    // Combine all animation options from different actions and remove duplicates
    const allAnimationOptions: any[] = [];
    const seenAnimationIds = new Set<string>();
    
    groupActions.forEach(action => {
      if (action.dropdown?.options) {
        action.dropdown.options.forEach(option => {
          // Use a normalized ID for deduplication (remove prefixes like 'text-' or 'subpath-')
          const normalizedId = option.id.replace(/^(text-|subpath-)/, '');
          
          if (!seenAnimationIds.has(normalizedId)) {
            seenAnimationIds.add(normalizedId);
            allAnimationOptions.push({
              ...option,
              id: normalizedId // Use the normalized ID
            });
          }
        });
      }
    });

    return {
      ...baseAction,
      id: 'unified-animations',
      label: this.getUnifiedLabel('animations'),
      tooltip: this.getUnifiedTooltip('animations'),
      type: 'dropdown',
      dropdown: {
        options: allAnimationOptions.map(option => ({
          ...option,
          action: () => {
            this.applyAnimationToAllSelected(option);
          }
        }))
      }
    };
  }

  private applyColorToAllSelected(colorType: string, color: string): void {
    // Import dynamically to avoid circular dependencies
    import('../../store/editorStore').then(({ useEditorStore }) => {
      const store = useEditorStore.getState();
      const selection = store.selection;

      // Apply to texts
      if (selection.selectedTexts.length > 0) {
        selection.selectedTexts.forEach(textId => {
          if (colorType === 'fill-color') {
            store.updateTextStyle(textId, { fill: color });
          } else if (colorType === 'stroke-color') {
            store.updateTextStyle(textId, { stroke: color });
          }
        });
      }

      // Apply to paths/subpaths
      if (selection.selectedPaths.length > 0 || selection.selectedSubPaths.length > 0) {
        const pathIds = new Set<string>();
        
        // Get unique path IDs from selected paths and subpaths
        selection.selectedPaths.forEach(pathId => pathIds.add(pathId));
        selection.selectedSubPaths.forEach(subPathId => {
          const path = store.paths.find(p => p.subPaths.some(sp => sp.id === subPathId));
          if (path) pathIds.add(path.id);
        });

        pathIds.forEach(pathId => {
          if (colorType === 'fill-color') {
            store.updatePathStyle(pathId, { fill: color });
          } else if (colorType === 'stroke-color') {
            store.updatePathStyle(pathId, { stroke: color });
          }
        });
      }
    });
  }

  private applyStrokeWidthToAllSelected(width: number): void {
    import('../../store/editorStore').then(({ useEditorStore }) => {
      const store = useEditorStore.getState();
      const selection = store.selection;
      if (isNaN(width) || width < 0) return;

      // Apply to texts
      selection.selectedTexts.forEach(textId => {
        store.updateTextStyle(textId, { strokeWidth: width });
      });

      // Apply to paths
      const pathIds = new Set<string>();
      selection.selectedPaths.forEach(pathId => pathIds.add(pathId));
      selection.selectedSubPaths.forEach(subPathId => {
        const path = store.paths.find(p => p.subPaths.some(sp => sp.id === subPathId));
        if (path) pathIds.add(path.id);
      });

      pathIds.forEach(pathId => {
        store.updatePathStyle(pathId, { strokeWidth: width });
      });
    });
  }

  private applyStrokeDashToAllSelected(dash: string): void {
    import('../../store/editorStore').then(({ useEditorStore }) => {
      const store = useEditorStore.getState();
      const selection = store.selection;

      // Apply to texts
      selection.selectedTexts.forEach(textId => {
        store.updateTextStyle(textId, { strokeDasharray: dash });
      });

      // Apply to paths
      const pathIds = new Set<string>();
      selection.selectedPaths.forEach(pathId => pathIds.add(pathId));
      selection.selectedSubPaths.forEach(subPathId => {
        const path = store.paths.find(p => p.subPaths.some(sp => sp.id === subPathId));
        if (path) pathIds.add(path.id);
      });

      pathIds.forEach(pathId => {
        store.updatePathStyle(pathId, { strokeDasharray: dash });
      });
    });
  }

  private applyStrokeLinecapToAllSelected(linecap: string): void {
    import('../../store/editorStore').then(({ useEditorStore }) => {
      const store = useEditorStore.getState();
      const selection = store.selection;

      // Apply to texts
      selection.selectedTexts.forEach(textId => {
        store.updateTextStyle(textId, { strokeLinecap: linecap as 'butt' | 'round' | 'square' });
      });

      // Apply to paths
      const pathIds = new Set<string>();
      selection.selectedPaths.forEach(pathId => pathIds.add(pathId));
      selection.selectedSubPaths.forEach(subPathId => {
        const path = store.paths.find(p => p.subPaths.some(sp => sp.id === subPathId));
        if (path) pathIds.add(path.id);
      });

      pathIds.forEach(pathId => {
        store.updatePathStyle(pathId, { strokeLinecap: linecap as 'butt' | 'round' | 'square' });
      });
    });
  }

  private applyStrokeLinejoinToAllSelected(linejoin: string): void {
    import('../../store/editorStore').then(({ useEditorStore }) => {
      const store = useEditorStore.getState();
      const selection = store.selection;

      // Apply to texts
      selection.selectedTexts.forEach(textId => {
        store.updateTextStyle(textId, { strokeLinejoin: linejoin as 'miter' | 'round' | 'bevel' });
      });

      // Apply to paths
      const pathIds = new Set<string>();
      selection.selectedPaths.forEach(pathId => pathIds.add(pathId));
      selection.selectedSubPaths.forEach(subPathId => {
        const path = store.paths.find(p => p.subPaths.some(sp => sp.id === subPathId));
        if (path) pathIds.add(path.id);
      });

      pathIds.forEach(pathId => {
        store.updatePathStyle(pathId, { strokeLinejoin: linejoin as 'miter' | 'round' | 'bevel' });
      });
    });
  }

  private applyFilterToAllSelected(filterOption: any): void {
    // Create a unified filter application that works for all element types
    import('../../store/editorStore').then(({ useEditorStore }) => {
      import('../../utils/svg-elements-utils').then((filterUtils) => {
        const store = useEditorStore.getState();
        const selection = store.selection;

        // Push to history before making changes
        store.pushToHistory();

        try {
          // Create the filter manually based on the filterOption.id
          let filterCreatorFn: (() => any) | null = null;
          
          // Map filter option IDs to their creator functions
          // Support both prefixed and normalized IDs
          const filterId = filterOption.id;
          switch (filterId) {
            // Text filters
            case 'text-blur': 
            case 'blur': 
              filterCreatorFn = filterUtils.createBlurFilter; break;
              
            case 'text-shadow': 
            case 'shadow': 
              filterCreatorFn = filterUtils.createDropShadowFilter; break;
              
            case 'text-glow': 
            case 'glow': 
              filterCreatorFn = filterUtils.createGlowFilter; break;
              
            case 'text-grayscale': 
            case 'grayscale': 
              filterCreatorFn = filterUtils.createGrayscaleFilter; break;
              
            case 'text-sepia': 
            case 'sepia': 
              filterCreatorFn = filterUtils.createSepiaFilter; break;
              
            case 'text-emboss': 
            case 'emboss': 
              filterCreatorFn = filterUtils.createEmbossFilter; break;
              
            case 'text-neon-glow': 
            case 'neon-glow': 
              filterCreatorFn = filterUtils.createNeonGlowFilter; break;
            
            // Subpath/Path filters (same creators, different IDs)
            case 'subpath-blur': 
              filterCreatorFn = filterUtils.createBlurFilter; break;
              
            case 'subpath-shadow': 
              filterCreatorFn = filterUtils.createDropShadowFilter; break;
              
            case 'subpath-glow': 
              filterCreatorFn = filterUtils.createGlowFilter; break;
              
            case 'subpath-grayscale': 
              filterCreatorFn = filterUtils.createGrayscaleFilter; break;
              
            case 'subpath-sepia': 
              filterCreatorFn = filterUtils.createSepiaFilter; break;
              
            case 'subpath-emboss': 
              filterCreatorFn = filterUtils.createEmbossFilter; break;
              
            case 'subpath-neon-glow': 
              filterCreatorFn = filterUtils.createNeonGlowFilter; break;
            
            default:
              // Fallback: try to execute the original action if we don't recognize the filter
              if (filterOption.action && typeof filterOption.action === 'function') {
                filterOption.action();
                return;
              }
          }

          if (filterCreatorFn) {
            // Create the filter
            const filterData = filterCreatorFn();
            store.addFilter(filterData);
            
            // Get the filter that was just added (it will have the generated ID)
            const storeState = useEditorStore.getState();
            const addedFilter = storeState.filters[storeState.filters.length - 1];
            
            // Apply the filter to all selected elements
            const filterRef = filterUtils.formatSVGReference(addedFilter.id);
            
            // Apply to all selected texts
            selection.selectedTexts.forEach(textId => {
              store.updateTextStyle(textId, { filter: filterRef });
            });
            
            // Apply to all selected paths/subpaths
            const pathIds = new Set<string>();
            selection.selectedPaths.forEach(pathId => pathIds.add(pathId));
            selection.selectedSubPaths.forEach(subPathId => {
              const path = store.paths.find(p => p.subPaths.some(sp => sp.id === subPathId));
              if (path) {
                pathIds.add(path.id);
              }
            });
            
            pathIds.forEach(pathId => {
              store.updatePathStyle(pathId, { filter: filterRef });
            });

            // Apply to groups (if any are selected)
            selection.selectedGroups.forEach(groupId => {
              const group = store.groups.find(g => g.id === groupId);
              if (group) {
                // Apply filter to all children in the group
                group.children.forEach(child => {
                  if (child.type === 'text') {
                    store.updateTextStyle(child.id, { filter: filterRef });
                  } else if (child.type === 'path') {
                    store.updatePathStyle(child.id, { filter: filterRef });
                  }
                });
              }
            });
          }
        } catch (error) {
          console.warn(`Error applying filter ${filterOption.id}:`, error);
        }
      });
    });
  }

  private applyAnimationToAllSelected(animationOption: any): void {
    // Create a unified animation application that works for all element types
    import('../../store/editorStore').then(({ useEditorStore }) => {
      const store = useEditorStore.getState();
      const selection = store.selection;

      // Push to history before making changes
      store.pushToHistory();

      try {
        // Apply animations based on the normalized animation option ID
        const animationId = animationOption.id;
        
        // Apply to all selected texts
        selection.selectedTexts.forEach(textId => {
          const text = store.texts.find(t => t.id === textId);
          if (text) {
            this.addAnimationToElement(animationId, textId, 'text', text, store);
          }
        });
        
        // Apply to all selected paths/subpaths
        const pathIds = new Set<string>();
        selection.selectedPaths.forEach(pathId => pathIds.add(pathId));
        selection.selectedSubPaths.forEach(subPathId => {
          const path = store.paths.find(p => p.subPaths.some(sp => sp.id === subPathId));
          if (path) {
            pathIds.add(path.id);
          }
        });
        
        pathIds.forEach(pathId => {
          this.addAnimationToElement(animationId, pathId, 'path', null, store);
        });

        // Apply to groups (if any are selected)
        selection.selectedGroups.forEach(groupId => {
          const group = store.groups.find(g => g.id === groupId);
          if (group) {
            // Apply animation to all children in the group
            group.children.forEach(child => {
              if (child.type === 'text') {
                const text = store.texts.find(t => t.id === child.id);
                if (text) {
                  this.addAnimationToElement(animationId, child.id, 'text', text, store);
                }
              } else if (child.type === 'path') {
                this.addAnimationToElement(animationId, child.id, 'path', null, store);
              }
            });
          }
        });
      } catch (error) {
        console.warn(`Error applying animation ${animationOption.id}:`, error);
      }
    });
  }

  private addAnimationToElement(animationId: string, elementId: string, elementType: 'text' | 'path', elementData: any, store: any): void {
    switch (animationId) {
      case 'fade':
        store.addAnimation({
          targetElementId: elementId,
          type: 'animate',
          attributeName: 'opacity',
          from: '1',
          to: '0.2',
          dur: '2s',
          repeatCount: 'indefinite'
        });
        break;
        
      case 'rotate':
        if (elementType === 'text' && elementData) {
          store.addAnimation({
            targetElementId: elementId,
            type: 'animateTransform',
            attributeName: 'transform',
            transformType: 'rotate',
            from: `0 ${elementData.x} ${elementData.y}`,
            to: `360 ${elementData.x} ${elementData.y}`,
            dur: '3s',
            repeatCount: 'indefinite'
          });
        } else {
          // For paths, use center of bounding box (simplified)
          store.addAnimation({
            targetElementId: elementId,
            type: 'animateTransform',
            attributeName: 'transform',
            transformType: 'rotate',
            from: '0 200 200',
            to: '360 200 200',
            dur: '3s',
            repeatCount: 'indefinite'
          });
        }
        break;
        
      case 'scale':
        store.addAnimation({
          targetElementId: elementId,
          type: 'animateTransform',
          attributeName: 'transform',
          transformType: 'scale',
          from: '1 1',
          to: '1.2 1.2',
          dur: '1s',
          repeatCount: 'indefinite'
        });
        break;
    }
  }

  private createUnifiedArrangeAction(baseAction: ToolbarAction, groupActions: ToolbarAction[]): ToolbarAction {
    // Combine all arrange options from different actions and remove duplicates
    const allArrangeOptions: any[] = [];
    const seenArrangeIds = new Set<string>();
    
    groupActions.forEach(action => {
      if (action.dropdown?.options) {
        action.dropdown.options.forEach(option => {
          // Use a normalized ID for deduplication (remove prefixes like 'text-', 'subpath-', 'mixed-')
          const normalizedId = option.id.replace(/^(text-|subpath-|mixed-)/, '');
          
          if (!seenArrangeIds.has(normalizedId)) {
            seenArrangeIds.add(normalizedId);
            allArrangeOptions.push({
              ...option,
              id: normalizedId // Use the normalized ID
            });
          }
        });
      }
    });

    return {
      ...baseAction,
      id: 'unified-arrange',
      label: this.getUnifiedLabel('arrange'),
      tooltip: this.getUnifiedTooltip('arrange'),
      type: 'dropdown',
      dropdown: {
        options: allArrangeOptions.map(option => ({
          ...option,
          action: () => {
            this.applyArrangeToAllSelected(option);
          }
        }))
      }
    };
  }

  private createUnifiedClearStyleAction(baseAction: ToolbarAction, groupActions: ToolbarAction[]): ToolbarAction {
    return {
      ...baseAction,
      id: 'unified-clear-style',
      label: 'Clear Style',
      tooltip: 'Reset all elements to default style',
      type: 'button',
      action: () => {
        this.applyClearStyleToAllSelected();
      }
    };
  }

  private applyClearStyleToAllSelected(): void {
    import('../../store/editorStore').then(({ useEditorStore }) => {
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
    }).catch(error => {
      console.warn('Error applying clear style:', error);
    });
  }

  private createUnifiedLockAction(baseAction: ToolbarAction, groupActions: ToolbarAction[]): ToolbarAction {    
    return {
      ...baseAction,
      id: 'unified-lock',
      label: 'Lock All',
      tooltip: 'Toggle lock state for all selected elements',
      type: 'toggle',
      toggle: {
        isActive: () => {
          try {
            // Use dynamic import in a way that works synchronously for the current state
            return this.checkAnyElementsLocked();
          } catch (error) {
            console.warn('Error checking lock state:', error);
            return false;
          }
        },
        onToggle: () => {
          this.applyUnifiedLockToAllSelected();
        }
      }
    };
  }

  private checkAnyElementsLocked(): boolean {
    try {
      const store = useEditorStore.getState();
      const selection = store.selection;
      
      let hasAnyLocked = false;
      
      // Check locked state across all selected element types
      selection.selectedTexts.forEach(textId => {
        const text = store.texts.find(t => t.id === textId);
        if (text?.locked) hasAnyLocked = true;
      });
      
      selection.selectedSubPaths.forEach(subPathId => {
        const subPath = store.paths
          .flatMap(path => path.subPaths)
          .find(sp => sp.id === subPathId);
        if (subPath?.locked) hasAnyLocked = true;
      });
      
      selection.selectedCommands.forEach(commandId => {
        const command = store.paths
          .flatMap(path => path.subPaths)
          .flatMap(subPath => subPath.commands)
          .find(cmd => cmd.id === commandId);
        if (command?.locked) hasAnyLocked = true;
      });
      
      selection.selectedGroups.forEach(groupId => {
        const group = store.groups.find(g => g.id === groupId);
        if (group?.locked) hasAnyLocked = true;
      });
      
      selection.selectedImages.forEach(imageId => {
        const image = store.images.find(i => i.id === imageId);
        if (image?.locked) hasAnyLocked = true;
      });
      
      selection.selectedUses.forEach(useId => {
        const use = store.uses.find(u => u.id === useId);
        if (use?.locked) hasAnyLocked = true;
      });
      
      selection.selectedSymbols.forEach(symbolId => {
        const symbol = store.symbols.find(s => s.id === symbolId);
        if (symbol?.locked) hasAnyLocked = true;
      });
      
      return hasAnyLocked;
    } catch (error) {
      console.warn('Error checking lock state:', error);
      return false;
    }
  }

  private applyUnifiedLockToAllSelected(): void {
    // Import the recursive lock functions
    import('../../plugins/selection/ModularFloatingActions').then(({ recursivelyLockGroup, recursivelyLockPath, recursivelyLockSubPath }) => {
      const store = useEditorStore.getState();
      const selection = store.selection;
      
      // Check if any selection exists
      const totalSelected = selection.selectedTexts.length + 
                           selection.selectedSubPaths.length + 
                           selection.selectedCommands.length +
                           selection.selectedGroups.length +
                           selection.selectedImages.length +
                           selection.selectedUses.length +
                           selection.selectedSymbols.length;
      
      if (totalSelected === 0) return;
      
      store.pushToHistory();
      
      // Determine lock state based on the first available element
      let shouldLock = true;
      
      // Check first available element to determine toggle direction
      if (selection.selectedTexts.length > 0) {
        const firstText = store.texts.find(t => t.id === selection.selectedTexts[0]);
        shouldLock = !firstText?.locked;
      } else if (selection.selectedSubPaths.length > 0) {
        const firstSubPath = store.paths
          .flatMap(path => path.subPaths)
          .find(sp => sp.id === selection.selectedSubPaths[0]);
        shouldLock = !firstSubPath?.locked;
      } else if (selection.selectedCommands.length > 0) {
        const firstCommand = store.paths
          .flatMap(path => path.subPaths)
          .flatMap(subPath => subPath.commands)
          .find(cmd => cmd.id === selection.selectedCommands[0]);
        shouldLock = !firstCommand?.locked;
      } else if (selection.selectedGroups.length > 0) {
        const firstGroup = store.groups.find(g => g.id === selection.selectedGroups[0]);
        shouldLock = !firstGroup?.locked;
      } else if (selection.selectedImages.length > 0) {
        const firstImage = store.images.find(i => i.id === selection.selectedImages[0]);
        shouldLock = !firstImage?.locked;
      } else if (selection.selectedUses.length > 0) {
        const firstUse = store.uses.find(u => u.id === selection.selectedUses[0]);
        shouldLock = !firstUse?.locked;
      } else if (selection.selectedSymbols.length > 0) {
        const firstSymbol = store.symbols.find(s => s.id === selection.selectedSymbols[0]);
        shouldLock = !firstSymbol?.locked;
      }
      
      // Apply lock/unlock to all selected elements using recursive methods where appropriate
      
      // Lock groups recursively
      selection.selectedGroups.forEach(groupId => {
        recursivelyLockGroup(groupId, shouldLock);
      });
      
      // Lock texts (handle both single and multiline texts)
      selection.selectedTexts.forEach(textId => {
        const textElement = store.texts.find(t => t.id === textId);
        if (textElement) {
          if (textElement.type === 'text') {
            store.updateText(textId, { locked: shouldLock });
          } else if (textElement.type === 'multiline-text') {
            store.updateMultilineText(textId, { locked: shouldLock });
          }
        }
      });
      
      // Lock subpaths recursively (will lock all commands)
      selection.selectedSubPaths.forEach(subPathId => {
        recursivelyLockSubPath(subPathId, shouldLock);
      });
      
      // Lock individual commands
      selection.selectedCommands.forEach(commandId => {
        store.updateCommand(commandId, { locked: shouldLock });
      });
      
      // Lock images
      selection.selectedImages.forEach(imageId => {
        store.updateImage(imageId, { locked: shouldLock });
      });
      
      // Lock uses
      selection.selectedUses.forEach(useId => {
        store.updateUse(useId, { locked: shouldLock });
      });
      
      // Lock symbols
      selection.selectedSymbols.forEach(symbolId => {
        store.updateSymbol(symbolId, { locked: shouldLock });
      });
      
      // If locking, clear the entire selection as locked elements shouldn't be selectable
      if (shouldLock) {
        store.clearSelection();
      }
    }).catch(error => {
      console.warn('Error importing lock functions:', error);
    });
  }
  
  // Keep the old method for backwards compatibility
  private applyLockToAllSelected(): void {
    this.applyUnifiedLockToAllSelected();
  }

  private applyArrangeToAllSelected(arrangeOption: any): void {
    // Create a unified arrange application that works for all element types
    import('../../store/editorStore').then(({ useEditorStore }) => {
      const store = useEditorStore.getState();
      const selection = store.selection;

      // Push to history before making changes
      store.pushToHistory();

      try {
        // Execute the appropriate arrange function based on the option ID
        const arrangeId = arrangeOption.id;
        
        // Check if we have mixed selections to use the mixed functions
        const hasMixed = (selection.selectedTexts.length > 0 ? 1 : 0) +
                        (selection.selectedSubPaths.length > 0 ? 1 : 0) +
                        (selection.selectedPaths.length > 0 ? 1 : 0) > 1;
        
        if (hasMixed) {
          // Use mixed arrange functions for cross-element-type arrangements
          switch (arrangeId) {
            case 'align-left':
              // Import and call the mixed align functions
              import('../../plugins/selection/ModularFloatingActions').then(module => {
                // We need to access the internal functions - for now we'll execute the original action
                if (arrangeOption.action && typeof arrangeOption.action === 'function') {
                  arrangeOption.action();
                }
              });
              break;
            case 'align-center':
            case 'align-top':
              // Similar pattern for other arrangements
              if (arrangeOption.action && typeof arrangeOption.action === 'function') {
                arrangeOption.action();
              }
              break;
            default:
              // Fallback to original action
              if (arrangeOption.action && typeof arrangeOption.action === 'function') {
                arrangeOption.action();
              }
          }
        } else {
          // Single element type - execute original action
          if (arrangeOption.action && typeof arrangeOption.action === 'function') {
            arrangeOption.action();
          }
        }
      } catch (error) {
        console.warn(`Error applying arrange ${arrangeOption.id}:`, error);
      }
    });
  }

  private createUnifiedDuplicateAction(baseAction: ToolbarAction): ToolbarAction {
    return {
      ...baseAction,
      id: 'unified-duplicate',
      label: 'Duplicate',
      tooltip: 'Duplicate all selected elements',
      type: 'button',
      action: () => {
        // Use the unified duplicate function from commonActions
        import('../../plugins/selection/actions/commonActions').then(({ duplicateSelected }) => {
          duplicateSelected();
        });
      }
    };
  }

  private createUnifiedDeleteAction(baseAction: ToolbarAction): ToolbarAction {
    return {
      ...baseAction,
      id: 'unified-delete',
      label: 'Delete',
      tooltip: 'Delete all selected elements',
      type: 'button',
      destructive: true,
      action: () => {
        import('../../store/editorStore').then(({ useEditorStore }) => {
          const store = useEditorStore.getState();
          const selection = store.selection;

          // Push to history before making changes
          store.pushToHistory();

          // Delete texts
          selection.selectedTexts.forEach(textId => {
            store.deleteText(textId);
          });

          // Delete paths using removePath
          selection.selectedPaths.forEach(pathId => {
            store.removePath(pathId);
          });

          // Delete subpaths using removeSubPath
          selection.selectedSubPaths.forEach(subPathId => {
            store.removeSubPath(subPathId);
          });

          // Delete commands using the proper removeCommand method
          // This ensures M->next transformation and M-Z edge case handling
          selection.selectedCommands.forEach(commandId => {
            store.removeCommand(commandId);
          });

          // Delete selected images
          if (selection.selectedImages && selection.selectedImages.length > 0) {
            selection.selectedImages.forEach(imageId => {
              try {
                store.removeImage(imageId);
              } catch (e) {
                console.warn('Error removing image', imageId, e);
              }
            });
          }

          // Delete selected use elements
          if (selection.selectedUses && selection.selectedUses.length > 0) {
            selection.selectedUses.forEach(useId => {
              try {
                store.removeUse(useId);
              } catch (e) {
                console.warn('Error removing use', useId, e);
              }
            });
          }

          // Delete selected groups (delete children as well)
          if (selection.selectedGroups && selection.selectedGroups.length > 0) {
            selection.selectedGroups.forEach(groupId => {
              try {
                store.deleteGroup(groupId, true);
              } catch (e) {
                console.warn('Error deleting group', groupId, e);
              }
            });
          }

          // Clear selection after deletion
          store.clearSelection();
        });
      }
    };
  }

  private createUnifiedCopyAction(baseAction: ToolbarAction): ToolbarAction {
    return {
      ...baseAction,
      id: 'unified-copy',
      label: 'Copy',
      tooltip: 'Copy all selected elements to clipboard',
      type: 'button',
      action: () => {
        import('../../store/editorStore').then(({ useEditorStore }) => {
          const store = useEditorStore.getState();
          const selection = store.selection;

          // Create a data structure with all selected elements
          const copyData = {
            texts: selection.selectedTexts.map(textId => 
              store.texts.find(t => t.id === textId)
            ).filter(Boolean),
            paths: selection.selectedPaths.map(pathId => 
              store.paths.find(p => p.id === pathId)
            ).filter(Boolean),
            subPaths: selection.selectedSubPaths.map(subPathId => {
              const path = store.paths.find(p => p.subPaths.some(sp => sp.id === subPathId));
              const subPath = path?.subPaths.find(sp => sp.id === subPathId);
              return subPath ? { path, subPath } : null;
            }).filter(Boolean)
          };

          // Copy to clipboard as JSON
          try {
            navigator.clipboard.writeText(JSON.stringify(copyData, null, 2));
          } catch (error) {
            console.warn('Failed to copy to clipboard:', error);
          }
        });
      }
    };
  }

  private createUnifiedGroupAction(baseAction: ToolbarAction, groupActions: ToolbarAction[]): ToolbarAction {
    return {
      ...baseAction,
      id: 'unified-group',
      label: 'Group',
      tooltip: 'Group selected elements',
      type: 'button',
      action: () => {
        import('../../store/editorStore').then(({ useEditorStore }) => {
          const store = useEditorStore.getState();
          const selection = store.selection;

          // Push to history before making changes
          store.pushToHistory();

          // Check if we have elements to group
          const hasElements = selection.selectedTexts.length > 0 || 
                              selection.selectedPaths.length > 0 || 
                              selection.selectedSubPaths.length > 0 ||
                              selection.selectedGroups.length > 0;

          if (!hasElements) {
            return;
          }

          // Use the built-in createGroupFromSelection method
          store.createGroupFromSelection();
        });
      }
    };
  }

  private createUnifiedUngroupAction(baseAction: ToolbarAction, groupActions: ToolbarAction[]): ToolbarAction {
    return {
      ...baseAction,
      id: 'unified-ungroup',
      label: 'Ungroup',
      tooltip: 'Ungroup selected groups',
      type: 'button',
      action: () => {
        import('../../store/editorStore').then(({ useEditorStore }) => {
          const store = useEditorStore.getState();
          const selection = store.selection;

          // Push to history before making changes
          store.pushToHistory();

          // Ungroup selected groups using the built-in method
          selection.selectedGroups.forEach(groupId => {
            store.ungroupElements(groupId);
          });
        });
      }
    };
  }

  private getUnifiedLabel(semanticType: string): string {
    switch (semanticType) {
      case 'duplicate': return 'Duplicate';
      case 'delete': return 'Delete';
      case 'copy': return 'Copy';
      case 'clear-style': return 'Clear Style';
      case 'lock': return 'Lock SubPaths';
      case 'fill-color': return 'Fill Color';
      case 'stroke-color': return 'Stroke Color';
      case 'stroke-options': return 'Stroke Options';
      case 'filters': return 'Filters';
      case 'animations': return 'Animations';
      case 'arrange': return 'Arrange';
      case 'group': return 'Group';
      case 'ungroup': return 'Ungroup';
      default: return 'Action';
    }
  }

  private getUnifiedTooltip(semanticType: string): string {
    switch (semanticType) {
      case 'duplicate': return 'Duplicate selected elements';
      case 'delete': return 'Delete selected elements';
      case 'copy': return 'Copy selected elements';
      case 'clear-style': return 'Reset all elements to default style';
      case 'lock': return 'Toggle lock state for subpaths';
      case 'fill-color': return 'Change fill color of selected elements';
      case 'stroke-color': return 'Change stroke color of selected elements';
      case 'stroke-options': return 'Configure stroke properties of selected elements';
      case 'filters': return 'Apply filters to selected elements';
      case 'animations': return 'Add animations to selected elements';
      case 'arrange': return 'Arrange and align selected elements';
      case 'group': return 'Group selected elements';
      case 'ungroup': return 'Ungroup selected elements';
      default: return 'Perform action on selected elements';
    }
  }

  private isDefinitionFromPlugin(definition: FloatingActionDefinition, pluginId: string): boolean {
    // This is a simplified check - in a real implementation, you might want to track
    // which plugin registered which definition
    return false;
  }
}