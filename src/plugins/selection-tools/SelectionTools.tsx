import React from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { DraggablePanel } from '../../components/DraggablePanel';
import { PluginButton } from '../../components/PluginButton';
import { MousePointer2, XCircle } from 'lucide-react';

interface SelectionToolsProps {
  currentMode: string;
  onSetSelectionMode: () => void;
  onClearSelection: () => void;
  selectedCount: number;
}

export const SelectionTools: React.FC<SelectionToolsProps> = ({
  currentMode,
  onSetSelectionMode,
  onClearSelection,
  selectedCount,
}) => {
  return (
    <div className="selection-tools" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <PluginButton
        icon={<MousePointer2 size={16} />}
        text="Selection Mode"
        color="#007acc"
        active={currentMode === 'select'}
        disabled={false}
        onClick={onSetSelectionMode}
      />
      <PluginButton
        icon={<XCircle size={16} />}
        text="Clear Selection"
        color="#dc3545"
        active={false}
        disabled={selectedCount === 0}
        onClick={onClearSelection}
      />
      <div style={{ 
        fontSize: '12px', 
        color: '#666', 
        textAlign: 'center',
        padding: '8px',
        background: '#f0f0f0',
        borderRadius: '4px',
        border: '1px solid #ddd'
      }}>
        <strong>{selectedCount}</strong> item{selectedCount !== 1 ? 's' : ''} selected
      </div>
    </div>
  );
};

export const SelectionToolsComponent: React.FC = () => {
  const { mode, selection, setMode, clearSelection } = useEditorStore();
  
  const selectedCount = 
    selection.selectedPaths.length + 
    selection.selectedSubPaths.length + 
    selection.selectedCommands.length;
  
  return (
    <DraggablePanel 
      title="Selection Tools"
      initialPosition={{ x: 980, y: 300 }}
      id="selection-tools"
    >
      <SelectionTools
        currentMode={mode.current}
        onSetSelectionMode={() => setMode('select')}
        onClearSelection={clearSelection}
        selectedCount={selectedCount}
      />
    </DraggablePanel>
  );
};

export const SelectionToolsPlugin: Plugin = {
  id: 'selection-tools',
  name: 'Selection Tools',
  version: '1.0.0',
  enabled: true,
  
  shortcuts: [
    {
      key: 'v',
      description: 'Selection Tool',
      action: () => {
        const store = useEditorStore.getState();
        store.setMode('select');
      }
    },
    {
      key: 'a',
      modifiers: ['ctrl'],
      description: 'Select All',
      action: () => {
        const store = useEditorStore.getState();
        
        // Get all command IDs from all paths and their subpaths
        const allCommandIds = store.paths.flatMap(path => 
          path.subPaths.flatMap(subPath => 
            subPath.commands.map(cmd => cmd.id)
          )
        );
        
        store.selectMultiple(allCommandIds, 'commands');
      }
    },
    {
      key: 'd',
      modifiers: ['ctrl'],
      description: 'Deselect All',
      action: () => {
        const store = useEditorStore.getState();
        store.clearSelection();
      }
    }
  ],
  
  ui: [
    {
      id: 'selection-tools',
      component: SelectionToolsComponent,
      position: 'sidebar',
      order: 0
    }
  ]
};
