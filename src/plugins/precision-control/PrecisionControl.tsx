import React, { useState } from 'react';
import { Plugin } from '../../core/PluginSystem';
import { DraggablePanel } from '../../components/DraggablePanel';
import { useEditorStore } from '../../store/editorStore';
import { savePreferences, loadPreferences } from '../../utils/persistence';
import { PluginButton } from '../../components/PluginButton';
import { List } from 'lucide-react';

const controlStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  marginBottom: '8px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#666',
  fontWeight: '500',
};

const inputStyle: React.CSSProperties = {
  padding: '4px 8px',
  border: '1px solid #ddd',
  borderRadius: '4px',
  fontSize: '12px',
};

export const PrecisionControlPanel: React.FC = () => {
  const precision = useEditorStore(s => s.precision);
  const setPrecision = useEditorStore(s => s.setPrecision);
  const [inputValue, setInputValue] = useState(precision);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 0) val = 0;
    if (val > 8) val = 8;
    setInputValue(val);
  };

  const handleReset = () => {
    setInputValue(2);
  };

  const handleApply = () => {
    setPrecision(inputValue);
    try {
      const prefs = loadPreferences();
      savePreferences({ ...prefs, precision: inputValue });
    } catch {}
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={controlStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ ...labelStyle, minWidth: 50 }}>
            Precision
          </label>
          <input
            type="number"
            min={0}
            max={8}
            value={inputValue}
            onChange={handleChange}
            style={{ ...inputStyle, width: 60 }}
          />
          <button
            onClick={handleReset}
            style={{
              fontSize: '10px',
              padding: '2px 6px',
              border: '1px solid #ddd',
              borderRadius: '3px',
              background: '#f8f9fa',
              cursor: 'pointer',
              marginLeft: 1
            }}
            title="Reset to default (2)"
          >
            Reset
          </button>
        </div>
      </div>
      <PluginButton
        icon={<List size={14} />}
        text="Apply"
        color="#2196f3"
        onClick={handleApply}
        disabled={inputValue === precision}
        active={inputValue !== precision}
      />
    </div>
  );
};

export const PrecisionControlPlugin: Plugin = {
  id: 'precision-control',
  name: 'Precision',
  version: '1.0.0',
  enabled: true,
  ui: [
    {
      id: 'precision-control-panel',
      component: () => (
        <DraggablePanel
          title="Precision"
          initialPosition={{ x: 980, y: 400 }}
          id="precision-control-panel"
        >
          <PrecisionControlPanel />
        </DraggablePanel>
      ),
      position: 'sidebar',
      order: 10,
    },
  ],
};
