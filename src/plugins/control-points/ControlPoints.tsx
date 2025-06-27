import React from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { DraggablePanel } from '../../components/DraggablePanel';

interface ControlPointsProps {
  enabled: boolean;
  onToggle: () => void;
}

export const ControlPointsControls: React.FC<ControlPointsProps> = ({
  enabled,
  onToggle,
}) => {
  return (
    <div className="control-points-controls" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        fontSize: '14px',
        cursor: 'pointer'
      }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={onToggle}
          style={{ cursor: 'pointer' }}
        />
        Show Control Points
      </label>
      <div style={{ 
        fontSize: '12px', 
        color: '#666', 
        padding: '8px',
        background: '#f8f9fa',
        borderRadius: '4px',
        border: '1px solid #dee2e6'
      }}>
        {enabled ? '✅ Control points are visible for curves' : '❌ Control points are hidden'}
      </div>
    </div>
  );
};

export const ControlPointsComponent: React.FC = () => {
  const { enabledFeatures, toggleFeature } = useEditorStore();
  
  return (
    <DraggablePanel 
      title="Control Points"
      initialPosition={{ x: 980, y: 260 }}
      id="control-points"
    >
      <ControlPointsControls
        enabled={enabledFeatures.has('control-points')}
        onToggle={() => toggleFeature('control-points')}
      />
    </DraggablePanel>
  );
};

export const ControlPointsPlugin: Plugin = {
  id: 'control-points',
  name: 'Control Points',
  version: '1.0.0',
  enabled: true,
  
  shortcuts: [
    {
      key: 'p',
      modifiers: ['ctrl'],
      description: 'Toggle Control Points',
      action: () => {
        const store = useEditorStore.getState();
        store.toggleFeature('control-points');
      }
    }
  ],
  
  ui: [
    {
      id: 'control-points-controls',
      component: ControlPointsComponent,
      position: 'sidebar',
      order: 3
    }
  ]
};
