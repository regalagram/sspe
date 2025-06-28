import React from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { DraggablePanel } from '../../components/DraggablePanel';
import { ToggleLeft, ToggleRight } from 'lucide-react';

interface WireframeControlsProps {
  enabled: boolean;
  onToggle: () => void;
}

const WireframeControls: React.FC<WireframeControlsProps> = ({ enabled, onToggle }) => {
  const buttonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s ease',
    width: '100%',
    justifyContent: 'center',
    background: enabled ? '#007acc' : 'white',
    color: enabled ? 'white' : 'black',
    borderColor: enabled ? '#005299' : '#ddd',
  };

  const hoverStyle: React.CSSProperties = {
    ...buttonStyle,
    background: enabled ? '#005299' : '#f5f5f5',
  };

  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <button
        onClick={onToggle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={isHovered ? hoverStyle : buttonStyle}
        title={enabled ? 'Disable wireframe mode' : 'Enable wireframe mode'}
      >
        {enabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
        Wireframe
      </button>
    </div>
  );
};

export const WireframeComponent: React.FC = () => {
  const { enabledFeatures, toggleFeature } = useEditorStore();
  
  return (
    <DraggablePanel 
      title="Wireframe"
      initialPosition={{ x: 980, y: 580 }}
      id="wireframe"
    >
      <WireframeControls
        enabled={enabledFeatures.has('wireframe')}
        onToggle={() => toggleFeature('wireframe')}
      />
    </DraggablePanel>
  );
};

export const WireframePlugin: Plugin = {
  id: 'wireframe',
  name: 'Wireframe',
  version: '1.0.0',
  enabled: true,
  
  shortcuts: [
    {
      key: 'w',
      modifiers: ['ctrl'],
      description: 'Toggle Wireframe Mode',
      action: () => {
        const store = useEditorStore.getState();
        store.toggleFeature('wireframe');
      }
    }
  ],
  
  ui: [
    {
      id: 'wireframe-controls',
      component: WireframeComponent,
      position: 'sidebar',
      order: 8
    }
  ]
};
