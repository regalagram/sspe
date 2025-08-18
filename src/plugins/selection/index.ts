import { Plugin } from '../../core/PluginSystem';
import { SelectionPlugin as BaseSelectionPlugin } from './Selection';
import { 
  subPathFloatingActionDefinition,
  pathFloatingActionDefinition, 
  groupFloatingActionDefinition,
  mixedSelectionFloatingActionDefinition,
  imageFloatingActionDefinition,
  symbolFloatingActionDefinition,
  textFloatingActionDefinition
} from './ModularFloatingActions';

// Extend the base selection plugin with floating actions
export const SelectionPlugin: Plugin = {
  ...BaseSelectionPlugin,
  floatingActions: [
    subPathFloatingActionDefinition,
    pathFloatingActionDefinition,
    mixedSelectionFloatingActionDefinition,
    groupFloatingActionDefinition,
    imageFloatingActionDefinition,
    symbolFloatingActionDefinition,
    textFloatingActionDefinition
  ]
};