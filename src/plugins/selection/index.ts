import { Plugin } from '../../core/PluginSystem';
import { SelectionToolsComponent, SelectionRectRenderer } from './Selection';
import { 
  subPathFloatingActionDefinition,
  updatedPathFloatingActionDefinition, 
  groupFloatingActionDefinition,
  mixedSelectionFloatingActionDefinition,
  imageFloatingActionDefinition,
  symbolFloatingActionDefinition,
  useFloatingActionDefinition,
  commandFloatingActionDefinition
} from './FloatingSelectionActions';

export const SelectionPlugin: Plugin = {
  id: 'selection',
  name: 'Selection',
  version: '1.0.0',
  enabled: true,

  ui: [
    {
      id: 'selection-renderer',
      component: SelectionToolsComponent,
      position: 'svg-content',
      order: 10
    },
    {
      id: 'selection-rect-renderer',
      component: SelectionRectRenderer,
      position: 'svg-content',
      order: 100
    }
  ],

  floatingActions: [
    subPathFloatingActionDefinition,
    updatedPathFloatingActionDefinition,
    mixedSelectionFloatingActionDefinition,
    groupFloatingActionDefinition,
    imageFloatingActionDefinition,
    symbolFloatingActionDefinition,
    useFloatingActionDefinition,
    commandFloatingActionDefinition
  ]
};