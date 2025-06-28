import React, { useState } from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { SVGCommandType } from '../../types';
import { DraggablePanel } from '../../components/DraggablePanel';
import SVGCommandIcon from '../../components/SVGCommandIcons';
import { ToggleLeft, ToggleRight } from 'lucide-react';

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
        padding: '6px 8px',
        margin: '1px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        background: isActive ? '#007acc' : 'white',
        color: isActive ? 'white' : 'black',
        cursor: 'pointer',
        fontSize: '10px',
        fontFamily: 'monospace',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        minWidth: '50px',
        minHeight: '50px'
      }}
    >
      <SVGCommandIcon 
        command={command} 
        size={16} 
        color={isActive ? 'white' : '#333'} 
      />
      <span style={{ fontSize: '9px', fontWeight: 'bold' }}>
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

  // Reorganizar herramientas en grupos para la grilla
  const toolGroups = [
    {
      title: 'Start & End',
      tools: tools.filter(tool => ['M', 'm', 'Z', 'z'].includes(tool.command))
    },
    {
      title: 'Lines',
      tools: tools.filter(tool => ['L', 'l', 'H', 'h', 'V', 'v'].includes(tool.command))
    },
    {
      title: 'Curves',
      tools: tools.filter(tool => ['C', 'c', 'S', 's', 'Q', 'q', 'T', 't'].includes(tool.command))
    },
    {
      title: 'Arcs',
      tools: tools.filter(tool => ['A', 'a'].includes(tool.command))
    }
  ];

  return (
    <div className="creation-tools" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
    }}>
      {/* Grilla de herramientas - disposición vertical por filas */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Start & End */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '4px'
        }}>
          <div style={{ 
            fontSize: '10px', 
            color: '#666', 
            fontWeight: '500',
            textAlign: 'left'
          }}>
            Start & End
          </div>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'row',
            gap: '2px'
          }}>
            {toolGroups[0].tools.map(tool => (
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

        {/* Lines */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '4px'
        }}>
          <div style={{ 
            fontSize: '10px', 
            color: '#666', 
            fontWeight: '500',
            textAlign: 'left'
          }}>
            Lines
          </div>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'row',
            gap: '2px'
          }}>
            {toolGroups[1].tools.map(tool => (
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

        {/* Curves */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '4px'
        }}>
          <div style={{ 
            fontSize: '10px', 
            color: '#666', 
            fontWeight: '500',
            textAlign: 'left'
          }}>
            Curves
          </div>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'row',
            gap: '2px'
          }}>
            {toolGroups[2].tools.map(tool => (
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

        {/* Arcs */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '4px'
        }}>
          <div style={{ 
            fontSize: '10px', 
            color: '#666', 
            fontWeight: '500',
            textAlign: 'left'
          }}>
            Arcs
          </div>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'row',
            gap: '2px'
          }}>
            {toolGroups[3].tools.map(tool => (
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

        {/* Mode */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '4px'
        }}>
          <div style={{ 
            fontSize: '10px', 
            color: '#666', 
            fontWeight: '500',
            textAlign: 'left'
          }}>
            Mode
          </div>
          <div>
            <button
              onClick={() => setUseRelativeCommands(!useRelativeCommands)}
              style={{
                padding: '8px 12px',
                background: useRelativeCommands ? '#007acc' : '#e9ecef',
                color: useRelativeCommands ? 'white' : '#495057',
                border: '1px solid #ccc',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '10px',
                fontWeight: '500',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s ease',
                minWidth: '50px',
                minHeight: '50px'
              }}
              title={useRelativeCommands ? 'Switch to Absolute Commands' : 'Switch to Relative Commands'}
            >
              {useRelativeCommands ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
              <span style={{ fontSize: '9px' }}>
                {useRelativeCommands ? 'REL' : 'ABS'}
              </span>
            </button>
          </div>
        </div>
      </div>
      
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
            transition: 'background 0.2s ease',
            alignSelf: 'center'
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
