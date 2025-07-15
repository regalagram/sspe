import React, { useState, useEffect } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { guidelinesManager } from './GuidelinesManager';
import { SnappingConfig } from '../../types';

export const GuidelinesControls: React.FC = () => {
  const { enabledFeatures, toggleFeature } = useEditorStore();
  const [config, setConfig] = useState<SnappingConfig>(guidelinesManager.getConfig());

  // Update local config when it changes
  useEffect(() => {
    const updateConfig = () => {
      setConfig(guidelinesManager.getConfig());
    };
    
    // Listen for config changes
    const unsubscribe = guidelinesManager.subscribe(() => {
      updateConfig();
    });

    return unsubscribe;
  }, []);

  const handleConfigChange = (updates: Partial<SnappingConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    guidelinesManager.updateConfig(updates);
  };

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    cursor: 'pointer',
    marginBottom: 8
  };

  const checkboxStyle: React.CSSProperties = {
    cursor: 'pointer',
    accentColor: '#2196f3',
    marginRight: 4
  };

  const inputStyle: React.CSSProperties = {
    padding: '4px 8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '11px',
    width: '60px',
    textAlign: 'center'
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

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#333'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Main Toggle */}
      <div style={sectionStyle}>
        <label style={labelStyle}>
          <input
            type="checkbox"
            checked={enabledFeatures.guidelinesEnabled ?? false}
            onChange={() => toggleFeature('guidelinesEnabled')}
            style={checkboxStyle}
          />
          Enable Guidelines & Snapping
        </label>
      </div>

      {/* Configuration Options */}
      {enabledFeatures.guidelinesEnabled && (
        <>
          {/* Guide Types */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Guide Types</div>
            
            <label style={labelStyle}>
              <input
                type="checkbox"
                checked={config.showDynamicGuides}
                onChange={(e) => handleConfigChange({ showDynamicGuides: e.target.checked })}
                style={checkboxStyle}
              />
              Dynamic Guides (Elements)
            </label>

            <label style={labelStyle}>
              <input
                type="checkbox"
                checked={config.showGridGuides}
                onChange={(e) => handleConfigChange({ showGridGuides: e.target.checked })}
                style={checkboxStyle}
              />
              Grid Guides
            </label>

            <label style={labelStyle}>
              <input
                type="checkbox"
                checked={config.showDistanceGuides}
                onChange={(e) => handleConfigChange({ showDistanceGuides: e.target.checked })}
                style={checkboxStyle}
              />
              Distance Guides
            </label>

            <label style={labelStyle}>
              <input
                type="checkbox"
                checked={config.showStaticGuides}
                onChange={(e) => handleConfigChange({ showStaticGuides: e.target.checked })}
                style={checkboxStyle}
              />
              Static Guides (Future)
            </label>
          </div>

          {/* Detection Settings */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Detection Settings</div>
            
            <div style={{ marginBottom: '8px' }}>
              <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '4px' }}>
                Detection Radius: {config.detectionRadius}px
              </label>
              <input
                type="range"
                min="3"
                max="20"
                step="1"
                value={config.detectionRadius}
                onChange={(e) => handleConfigChange({ detectionRadius: parseInt(e.target.value) })}
                style={sliderStyle}
              />
            </div>

            <div style={{ marginBottom: '8px' }}>
              <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '4px' }}>
                Snap Duration: {config.snapDuration}ms
              </label>
              <input
                type="range"
                min="100"
                max="1000"
                step="50"
                value={config.snapDuration}
                onChange={(e) => handleConfigChange({ snapDuration: parseInt(e.target.value) })}
                style={sliderStyle}
              />
            </div>
          </div>

          {/* Grid Settings */}
          {config.showGridGuides && (
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>Grid Settings</div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '11px', color: '#666' }}>
                  Grid Size:
                </label>
                <input
                  type="number"
                  min="5"
                  max="50"
                  value={config.gridSize}
                  onChange={(e) => handleConfigChange({ gridSize: parseInt(e.target.value) || 10 })}
                  style={inputStyle}
                />
                <span style={{ fontSize: '11px', color: '#666' }}>px</span>
              </div>
            </div>
          )}

          {/* Distance Settings */}
          {config.showDistanceGuides && (
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>Distance Settings</div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <label style={{ fontSize: '11px', color: '#666' }}>
                  Distance Tolerance:
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={config.distanceTolerance}
                  onChange={(e) => handleConfigChange({ distanceTolerance: parseInt(e.target.value) || 5 })}
                  style={inputStyle}
                />
                <span style={{ fontSize: '11px', color: '#666' }}>px</span>
              </div>
            </div>
          )}

          {/* Visual Settings */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Visual Settings</div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <label style={{ fontSize: '11px', color: '#666' }}>
                Guideline Color:
              </label>
              <input
                type="color"
                value={config.guidelineColor}
                onChange={(e) => handleConfigChange({ guidelineColor: e.target.value })}
                style={{
                  width: '40px',
                  height: '25px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              />
            </div>
            
            {config.showDistanceGuides && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '11px', color: '#666' }}>
                  Distance Color:
                </label>
                <input
                  type="color"
                  value={config.distanceGuideColor}
                  onChange={(e) => handleConfigChange({ distanceGuideColor: e.target.value })}
                  style={{
                    width: '40px',
                    height: '25px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};