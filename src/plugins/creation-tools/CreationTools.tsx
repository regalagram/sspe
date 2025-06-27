import React, { useState } from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { SVGCommandType } from '../../types';
import { DraggablePanel } from '../../components/DraggablePanel';
import SVGCommandIcon from '../../components/SVGCommandIcons';

interface ToolButtonProps {
  command: SVGCommandType;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const ToolButton: React.FC<ToolButtonProps> = ({ command, label, isActive, onClick }) => {
  return (
    <button
      className={`tool-button ${isActive ? 'active' : ''}`}
      onClick={onClick}
      title={`${label} (${command})`}
      style={{
        padding: '8px 12px',
        margin: '2px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        background: isActive ? '#007acc' : 'white',
        color: isActive ? 'white' : 'black',
        cursor: 'pointer',
        fontSize: '12px',
        fontFamily: 'monospace',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        minWidth: '60px',
        minHeight: '50px'
      }}
    >
      <SVGCommandIcon 
        command={command} 
        size={20} 
        color={isActive ? 'white' : '#333'} 
      />
      <span style={{ fontSize: '10px', fontWeight: 'bold' }}>
        {command}
      </span>
    </button>
  );
};

interface CreationToolsProps {
  currentMode: string;
  createMode?: {
    commandType: SVGCommandType;
    isDrawing: boolean;
  };
  onSelectTool: (commandType: SVGCommandType) => void;
  onExitCreateMode: () => void;
}

export const CreationTools: React.FC<CreationToolsProps> = ({
  currentMode,
  createMode,
  onSelectTool,
  onExitCreateMode,
}) => {
  const [useRelativeCommands, setUseRelativeCommands] = useState(false);

  const baseTools: Array<{ command: SVGCommandType; label: string; category: string }> = [
    { command: 'M', label: 'Move To', category: 'Start & End' },
    { command: 'Z', label: 'Close Path', category: 'Start & End' },
    { command: 'L', label: 'Line To', category: 'Lines' },
    { command: 'H', label: 'Horizontal Line', category: 'Lines' },
    { command: 'V', label: 'Vertical Line', category: 'Lines' },
    { command: 'C', label: 'Cubic Bezier', category: 'Curves' },
    { command: 'S', label: 'Smooth Cubic', category: 'Curves' },
    { command: 'Q', label: 'Quadratic Bezier', category: 'Curves' },
    { command: 'T', label: 'Smooth Quadratic', category: 'Curves' },
    { command: 'A', label: 'Arc', category: 'Arcs' },
  ];

  // Convert commands to relative if toggle is enabled
  const tools = baseTools.map(tool => ({
    ...tool,
    command: (useRelativeCommands && tool.command !== 'Z') 
      ? tool.command.toLowerCase() as SVGCommandType 
      : tool.command,
    label: (useRelativeCommands && tool.command !== 'Z') 
      ? `${tool.label} (relative)` 
      : `${tool.label} (absolute)`
  }));

  const categories = ['Start & End', 'Lines', 'Curves', 'Arcs'];

  return (
    <div className="creation-tools" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Relative/Absolute Toggle */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        padding: '8px',
        background: '#f8f9fa',
        borderRadius: '4px',
        border: '1px solid #dee2e6'
      }}>
        <input
          type="checkbox"
          id="relative-commands"
          checked={useRelativeCommands}
          onChange={(e) => setUseRelativeCommands(e.target.checked)}
          style={{ cursor: 'pointer' }}
        />
        <label 
          htmlFor="relative-commands" 
          style={{ 
            fontSize: '12px', 
            color: '#495057', 
            fontWeight: '500',
            cursor: 'pointer',
            userSelect: 'none'
          }}
        >
          Use Relative Commands
        </label>
        <div style={{ 
          fontSize: '10px', 
          color: '#6c757d',
          marginLeft: 'auto'
        }}>
          {useRelativeCommands ? 'lowercase' : 'UPPERCASE'}
        </div>
      </div>

      {categories.map(category => (
        <div key={category} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
            {category}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {tools
              .filter(tool => tool.category === category)
              .map(tool => (
                <ToolButton
                  key={tool.command}
                  command={tool.command}
                  label={tool.label}
                  isActive={currentMode === 'create' && createMode?.commandType === tool.command}
                  onClick={() => onSelectTool(tool.command)}
                />
              ))}
          </div>
        </div>
      ))}
      
      {currentMode === 'create' && (
        <button
          onClick={onExitCreateMode}
          style={{
            padding: '8px 16px',
            background: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'background 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#c82333'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#dc3545'}
        >
          Exit Create Mode
        </button>
      )}
    </div>
  );
};

export const CreationToolsComponent: React.FC = () => {
  const { mode, setCreateMode, exitCreateMode } = useEditorStore();
  
  return (
    <DraggablePanel 
      title="Creation Tools"
      initialPosition={{ x: 980, y: 140 }}
      id="creation-tools"
    >
      <CreationTools
        currentMode={mode.current}
        createMode={mode.createMode}
        onSelectTool={setCreateMode}
        onExitCreateMode={exitCreateMode}
      />
    </DraggablePanel>
  );
};

export const CreationToolsPlugin: Plugin = {
  id: 'creation-tools',
  name: 'Creation Tools',
  version: '1.0.0',
  enabled: true,
  
  shortcuts: [
    {
      key: 'm',
      description: 'Move To Tool',
      action: () => {
        const store = useEditorStore.getState();
        store.setCreateMode('M');
      }
    },
    {
      key: 'l',
      description: 'Line To Tool',
      action: () => {
        const store = useEditorStore.getState();
        store.setCreateMode('L');
      }
    },
    {
      key: 'c',
      description: 'Cubic Bezier Tool',
      action: () => {
        const store = useEditorStore.getState();
        store.setCreateMode('C');
      }
    },
    {
      key: 'q',
      description: 'Quadratic Bezier Tool',
      action: () => {
        const store = useEditorStore.getState();
        store.setCreateMode('Q');
      }
    },
    {
      key: 'a',
      description: 'Arc Tool',
      action: () => {
        const store = useEditorStore.getState();
        store.setCreateMode('A');
      }
    },
    {
      key: 'Escape',
      description: 'Exit Create Mode',
      action: () => {
        const store = useEditorStore.getState();
        store.exitCreateMode();
      }
    }
  ],
  
  tools: [
    {
      id: 'move-to',
      name: 'Move To',
      category: 'create',
      shortcut: 'M',
      onActivate: () => {
        const store = useEditorStore.getState();
        store.setCreateMode('M');
      }
    },
    {
      id: 'line-to',
      name: 'Line To',
      category: 'create',
      shortcut: 'L',
      onActivate: () => {
        const store = useEditorStore.getState();
        store.setCreateMode('L');
      }
    },
    {
      id: 'cubic-bezier',
      name: 'Cubic Bezier',
      category: 'create',
      shortcut: 'C',
      onActivate: () => {
        const store = useEditorStore.getState();
        store.setCreateMode('C');
      }
    }
  ],
  
  ui: [
    {
      id: 'creation-tools',
      component: CreationToolsComponent,
      position: 'toolbar',
      order: 3
    }
  ]
};
