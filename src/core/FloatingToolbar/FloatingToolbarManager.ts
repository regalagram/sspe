import { 
  FloatingActionDefinition, 
  ToolbarAction, 
  ElementType, 
  SelectionType,
  FloatingToolbarConfig 
} from '../../types/floatingToolbar';
import { SelectionState } from '../../types';
import { Plugin } from '../PluginSystem';

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
      console.log(`[FloatingToolbarManager] Registering plugin ${plugin.id} with ${plugin.floatingActions.length} action definitions`);
      this.actionDefinitions.push(...plugin.floatingActions);
      // Sort by priority
      this.actionDefinitions.sort((a, b) => (b.priority || 0) - (a.priority || 0));
      console.log(`[FloatingToolbarManager] Total action definitions: ${this.actionDefinitions.length}`);
    }
  }

  unregisterPlugin(pluginId: string): void {
    this.plugins.delete(pluginId);
    this.actionDefinitions = this.actionDefinitions.filter(
      def => !this.isDefinitionFromPlugin(def, pluginId)
    );
  }

  getActionsForSelection(selection: SelectionState): ToolbarAction[] {
    console.log(`[FloatingToolbarManager] Getting actions for selection, total definitions: ${this.actionDefinitions.length}`);
    
    if (!this.hasValidSelection(selection)) {
      console.log('[FloatingToolbarManager] No valid selection');
      return [];
    }

    const elementTypes = this.detectElementTypes(selection);
    const selectionType = this.getSelectionType(selection);
    
    console.log(`[FloatingToolbarManager] Element types: ${elementTypes.join(', ')}, Selection type: ${selectionType}`);
    
    let actions: ToolbarAction[] = [];
    
    for (const definition of this.actionDefinitions) {
      if (this.matchesDefinition(definition, elementTypes, selectionType)) {
        console.log(`[FloatingToolbarManager] Matched definition with ${definition.actions.length} actions for types: ${definition.elementTypes.join(', ')}`);
        // Filter out disabled actions
        const validActions = definition.actions.filter(action => !action.disabled);
        actions.push(...validActions);
      }
    }
    
    const processedActions = this.processActions(actions);
    console.log(`[FloatingToolbarManager] Returning ${processedActions.length} processed actions`);
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
    
    // Check if any element type matches
    return definition.elementTypes.some(defType => elementTypes.includes(defType));
  }

  private processActions(actions: ToolbarAction[]): ToolbarAction[] {
    // Remove duplicates based on action id
    const uniqueActions = new Map<string, ToolbarAction>();
    
    for (const action of actions) {
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

  private isDefinitionFromPlugin(definition: FloatingActionDefinition, pluginId: string): boolean {
    // This is a simplified check - in a real implementation, you might want to track
    // which plugin registered which definition
    return false;
  }
}