import React from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { SVGCommandType } from '../../types';
import { DraggablePanel } from '../../components/DraggablePanel';
import SVGCommandIcon from '../../components/SVGCommandIcons';
import { ToggleLeft, ToggleRight } from 'lucide-react';
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
  const tools: Array<{ command: SVGCommandType; label: string; description: string }> = [
    { command: 'M', label: 'M', description: 'Start' },
    { command: 'L', label: 'L', description: 'Line' },
    { command: 'C', label: 'C', description: 'Curve' },
    { command: 'Z', label: 'Z', description: 'End' },
  ];

  // Colores para los botones de herramientas
  const toolColor = '#007acc';

  return (
    <div className="creation-tools" style={{
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Tools arranged vertically, one per line */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
        {tools.map(tool => (
          <PluginButton
            key={tool.command}
            icon={<SVGCommandIcon command={tool.command} size={14} color={currentMode === 'create' && createMode?.commandType === tool.command ? 'white' : '#333'} />}
            text={`${tool.label} - ${tool.description}`}
            color={toolColor}
            active={currentMode === 'create' && createMode?.commandType === tool.command}
            disabled={false}
            onClick={() => onSelectTool(tool.command)}
          />
        ))}
        {currentMode === 'create' && (
          <PluginButton
            icon={<LogOut size={16} />}
            text="Exit Create Mode"
            color="#dc3545"
            active={false}
            disabled={false}
            onClick={onExitCreateMode}
          />
        )}
      </div>


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
      key: 'z',
      description: 'Close Path Tool',
      action: () => {
        const store = useEditorStore.getState();
        store.setCreateMode('Z');
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
    },
    {
      id: 'close-path',
      name: 'Close Path',
      category: 'create',
      shortcut: 'Z',
      onActivate: () => {
        const store = useEditorStore.getState();
        store.setCreateMode('Z');
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
