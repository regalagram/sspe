import React, { useState, useEffect } from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { SVGCommandType } from '../../types';
import { DraggablePanel } from '../../components/DraggablePanel';
import SVGCommandIcon from '../../components/SVGCommandIcons';
import { ToggleLeft, ToggleRight } from 'lucide-react';
import { loadPreferences, savePreferences } from '../../utils/persistence';
import { PluginButton } from '../../components/PluginButton';
import { LogOut } from 'lucide-react';

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

  // Load the relative commands preference from localStorage on component mount
  useEffect(() => {
    const preferences = loadPreferences();
    setUseRelativeCommands(preferences.useRelativeCommands);
  }, []);

  // Save preference to localStorage when it changes
  const handleToggleRelativeCommands = () => {
    const newValue = !useRelativeCommands;
    setUseRelativeCommands(newValue);
    
    const preferences = loadPreferences();
    savePreferences({
      ...preferences,
      useRelativeCommands: newValue
    });
  };

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

  // Colores para los botones de herramientas
  const toolColor = '#007acc';

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
            gap: '6px'
          }}>
            {toolGroups[0].tools.map(tool => (
              <PluginButton
                key={tool.command}
                icon={<SVGCommandIcon command={tool.command} size={14} color={currentMode === 'create' && createMode?.commandType === tool.command ? 'white' : '#333'} />}
                text={tool.command}
                color={toolColor}
                active={currentMode === 'create' && createMode?.commandType === tool.command}
                disabled={false}
                onClick={() => onSelectTool(tool.command)}
              />
            ))}
          </div>
        </div>

        {/* Lines */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '4px',
          marginTop: '8px'
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
            flexDirection: 'column',
            gap: '4px'
          }}>
            {Array.from({ length: Math.ceil(toolGroups[1].tools.length / 2) }, (_, rowIndex) => (
              <div key={rowIndex} style={{ 
                display: 'flex', 
                flexDirection: 'row',
                gap: '6px'
              }}>
                {toolGroups[1].tools.slice(rowIndex * 2, (rowIndex + 1) * 2).map(tool => (
                  <PluginButton
                    key={tool.command}
                    icon={<SVGCommandIcon command={tool.command} size={14} color={currentMode === 'create' && createMode?.commandType === tool.command ? 'white' : '#333'} />}
                    text={tool.command}
                    color={toolColor}
                    active={currentMode === 'create' && createMode?.commandType === tool.command}
                    disabled={false}
                    onClick={() => onSelectTool(tool.command)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Curves */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '4px',
          marginTop: '8px'
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
            flexDirection: 'column',
            gap: '4px'
          }}>
            {Array.from({ length: Math.ceil(toolGroups[2].tools.length / 2) }, (_, rowIndex) => (
              <div key={rowIndex} style={{ 
                display: 'flex', 
                flexDirection: 'row',
                gap: '6px'
              }}>
                {toolGroups[2].tools.slice(rowIndex * 2, (rowIndex + 1) * 2).map(tool => (
                  <PluginButton
                    key={tool.command}
                    icon={<SVGCommandIcon command={tool.command} size={14} color={currentMode === 'create' && createMode?.commandType === tool.command ? 'white' : '#333'} />}
                    text={tool.command}
                    color={toolColor}
                    active={currentMode === 'create' && createMode?.commandType === tool.command}
                    disabled={false}
                    onClick={() => onSelectTool(tool.command)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Arcs */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '4px',
          marginTop: '8px'
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
            gap: '6px'
          }}>
            {toolGroups[3].tools.map(tool => (
              <PluginButton
                key={tool.command}
                icon={<SVGCommandIcon command={tool.command} size={14} color={currentMode === 'create' && createMode?.commandType === tool.command ? 'white' : '#333'} />}
                text={tool.command}
                color={toolColor}
                active={currentMode === 'create' && createMode?.commandType === tool.command}
                disabled={false}
                onClick={() => onSelectTool(tool.command)}
              />
            ))}
          </div>
        </div>

        {/* Mode */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '4px',
          marginTop: '8px'
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
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={useRelativeCommands}
                onChange={handleToggleRelativeCommands}
                style={{ accentColor: '#2196f3', marginRight: 4, cursor: 'pointer' }}
              />
              Relative
            </label>
          </div>
        </div>
      </div>
      
      {currentMode === 'create' && (
        <div style={{ marginTop: '8px' }}>
        <PluginButton
          icon={<LogOut size={16} />}
          text="Exit Create Mode"
          color="#dc3545"
          active={false}
          disabled={false}
          onClick={onExitCreateMode}
        />
        </div>
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
