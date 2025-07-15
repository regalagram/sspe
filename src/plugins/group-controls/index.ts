import { Plugin } from '../../core/PluginSystem';
import { GroupControls } from './GroupControls';
import { useEditorStore } from '../../store/editorStore';

export const GroupControlsPlugin: Plugin = {
  id: 'group-controls',
  name: 'Groups',
  version: '1.0.0',
  enabled: true,
  
  shortcuts: [
    {
      key: 'g',
      modifiers: ['ctrl'],
      description: 'Group selected elements',
      action: () => {
        const store = useEditorStore.getState();
        store.createGroupFromSelection();
      }
    },
    {
      key: 'g',
      modifiers: ['ctrl', 'shift'],
      description: 'Ungroup selected groups',
      action: () => {
        const store = useEditorStore.getState();
        store.selection.selectedGroups.forEach(groupId => {
          store.ungroupElements(groupId);
        });
      }
    }
  ],
  
  ui: [
    {
      id: 'group-controls',
      component: GroupControls,
      position: 'sidebar',
      order: 8
    }
  ]
};