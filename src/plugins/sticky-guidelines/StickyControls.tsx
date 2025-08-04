import React, { useState, useEffect } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { stickyManager, StickyConfig } from './StickyManager';

export const StickyControls: React.FC = () => {
  console.log('StickyControls: Component rendered');
  const { enabledFeatures, toggleFeature } = useEditorStore();
  const [config, setConfig] = useState<StickyConfig>(stickyManager.getConfig());

  useEffect(() => {
    const updateConfig = () => {
      setConfig(stickyManager.getConfig());
    };
    
    const unsubscribe = stickyManager.subscribe(() => {
      updateConfig();
    });

    return unsubscribe;
  }, []);

  const handleConfigChange = (updates: Partial<StickyConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    stickyManager.updateConfig(updates);
  };

  // Sync enabled state with store
  useEffect(() => {
    stickyManager.updateConfig({ enabled: enabledFeatures.stickyGuidelinesEnabled ?? false });
  }, [enabledFeatures.stickyGuidelinesEnabled]);

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    cursor: 'pointer',
    marginBottom: 12
  };

  const checkboxStyle: React.CSSProperties = {
    cursor: 'pointer',
    accentColor: '#2196f3',
    marginRight: 4
  };

  const sliderStyle: React.CSSProperties = {
    width: '100%',
    marginTop: '4px'
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid #eee'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Main Toggle */}
      <div style={sectionStyle}>
        <label style={labelStyle}>
          <input
            type="checkbox"
            checked={enabledFeatures.stickyGuidelinesEnabled ?? false}
            onChange={() => toggleFeature('stickyGuidelinesEnabled')}
            style={checkboxStyle}
          />
          Enable Sticky Guidelines
        </label>
      </div>

      {/* Configuration Options */}
      {enabledFeatures.stickyGuidelinesEnabled && (
        <>
          {/* Show Guidelines Toggle */}
          <div style={sectionStyle}>
            <label style={labelStyle}>
              <input
                type="checkbox"
                checked={config.showGuidelines}
                onChange={(e) => handleConfigChange({ showGuidelines: e.target.checked })}
                style={checkboxStyle}
              />
              Show Visual Guidelines
            </label>
          </div>

          {/* Snap Distance */}
          <div>
            <div style={{ marginBottom: '8px' }}>
              <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '4px' }}>
                Snap Distance: {config.snapDistance}px
              </label>
              <input
                type="range"
                min="3"
                max="20"
                step="1"
                value={config.snapDistance}
                onChange={(e) => handleConfigChange({ snapDistance: parseInt(e.target.value) })}
                style={sliderStyle}
              />
            </div>

            {/* Alignment Options */}
            <div style={{ marginTop: '12px' }}>
              <label style={labelStyle}>
                <input
                  type="checkbox"
                  checked={config.enableEdgeSnapping}
                  onChange={(e) => handleConfigChange({ enableEdgeSnapping: e.target.checked })}
                  style={checkboxStyle}
                />
                Edge Alignment
              </label>
              
              <label style={labelStyle}>
                <input
                  type="checkbox"
                  checked={config.enableCenterSnapping}
                  onChange={(e) => handleConfigChange({ enableCenterSnapping: e.target.checked })}
                  style={checkboxStyle}
                />
                Center Alignment
              </label>
              
              <label style={labelStyle}>
                <input
                  type="checkbox"
                  checked={config.enableMidpointSnapping}
                  onChange={(e) => handleConfigChange({ enableMidpointSnapping: e.target.checked })}
                  style={checkboxStyle}
                />
                Midpoint Alignment
              </label>

              {/* Debug Mode Toggle */}
              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #eee' }}>
                <label style={{ ...labelStyle, color: '#00aa00', fontWeight: 'bold' }}>
                  <input
                    type="checkbox"
                    checked={config.debugMode}
                    onChange={(e) => handleConfigChange({ debugMode: e.target.checked })}
                    style={{ ...checkboxStyle, accentColor: '#00aa00' }}
                  />
                  🐛 Debug Mode
                </label>
                {config.debugMode && (
                  <div style={{ fontSize: '10px', color: '#666', marginTop: '4px', paddingLeft: '20px' }}>
                    Shows all bbox projections for debugging
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};