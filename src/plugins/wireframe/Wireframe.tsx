import React from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { DraggablePanel } from '../../components/DraggablePanel';

interface WireframeControlsProps {
  enabled: boolean;
  onToggle: () => void;
}

const WireframeControls: React.FC<WireframeControlsProps> = ({ enabled, onToggle }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={onToggle}
          style={{ accentColor: '#2196f3', marginRight: 4, cursor: 'pointer' }}
        />
        View wireframe
      </label>
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
