import { Plugin } from '../../core/PluginSystem';
import { StructureTreePanel } from './StructureTreePanel';

export const StructureTreePlugin: Plugin = {
  id: 'structure-tree',
  name: 'Structure Tree',
  version: '1.0.0',
  enabled: true,

  ui: [
    {
      id: 'structure-tree-panel',
      component: StructureTreePanel,
      position: 'sidebar',
      order: 15
    }
  ]
};