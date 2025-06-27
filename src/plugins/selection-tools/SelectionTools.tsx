import React from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { DraggablePanel } from '../../components/DraggablePanel';
import { MousePointer2 } from 'lucide-react';

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
  const buttonStyle: React.CSSProperties = {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s ease',
    width: '100%',
  };

  const activeButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: '#007acc',
    color: 'white',
    borderColor: '#005299',
  };

  const inactiveButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: '#f8f9fa',
    color: '#333',
  };

  return (
    <div className="selection-tools" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <button
        className={currentMode === 'select' ? 'active' : ''}
        onClick={onSetSelectionMode}
        title="Selection Mode (V)"
        style={currentMode === 'select' ? activeButtonStyle : inactiveButtonStyle}
        onMouseEnter={(e) => {
          if (currentMode !== 'select') {
            e.currentTarget.style.background = '#e9ecef';
          }
        }}
        onMouseLeave={(e) => {
          if (currentMode !== 'select') {
            e.currentTarget.style.background = '#f8f9fa';
          }
        }}
      >
        <MousePointer2 size={16} /> Selection Mode
      </button>
      
      <button
        onClick={onClearSelection}
        disabled={selectedCount === 0}
        title="Clear Selection (Escape)"
        style={{
          ...buttonStyle,
          opacity: selectedCount === 0 ? 0.5 : 1,
          background: selectedCount === 0 ? '#f0f0f0' : '#dc3545',
          color: selectedCount === 0 ? '#666' : 'white',
          cursor: selectedCount === 0 ? 'not-allowed' : 'pointer',
        }}
        onMouseEnter={(e) => {
          if (selectedCount > 0) {
            e.currentTarget.style.background = '#c82333';
          }
        }}
        onMouseLeave={(e) => {
          if (selectedCount > 0) {
            e.currentTarget.style.background = '#dc3545';
          }
        }}
      >
        ❌ Clear Selection
      </button>
      
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
