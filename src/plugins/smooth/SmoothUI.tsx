import React, { useState, useEffect } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { smoothManager } from './SmoothManager';
import { PluginButton } from '../../components/PluginButton';
import { Brush, LogOut } from 'lucide-react';
import { toolModeManager } from '../../core/ToolModeManager';

export const SmoothUI: React.FC = () => {
  const { mode } = useEditorStore();
  const [settings, setSettings] = useState(smoothManager.getSettings());
  
  const isSmoothActive = mode.current === 'smooth';

  useEffect(() => {
    setSettings(smoothManager.getSettings());
  }, []);

  const handleRadiusChange = (value: number) => {
    const newSettings = { ...settings, radius: value };
    setSettings(newSettings);
    smoothManager.updateSettings(newSettings);
  };

  const handleStrengthChange = (value: number) => {
    const newSettings = { ...settings, strength: value };
    setSettings(newSettings);
    smoothManager.updateSettings(newSettings);
  };

  const handleToleranceChange = (value: number) => {
    const newSettings = { ...settings, tolerance: value };
    setSettings(newSettings);
    smoothManager.updateSettings(newSettings);
  };

  const handleActivateSmooth = () => {
    toolModeManager.setMode('smooth' as any);
  };

  const handleExitSmooth = () => {
    toolModeManager.setMode('select');
  };

  return (
    <div className="control-panel">
      <h3>Smooth Tool</h3>
      
      {/* Tool buttons */}
      <div style={{ marginBottom: '12px' }}>
        {!isSmoothActive && (
          <PluginButton
            icon={<Brush size={14} color="#333" />}
            text="Activate Smooth"
            color="#007acc"
            active={false}
            disabled={false}
            onPointerDown={handleActivateSmooth}
          />
        )}
        {isSmoothActive && (
          <PluginButton
            icon={<LogOut size={16} />}
            text="Exit Smooth Mode"
            color="#dc3545"
            active={false}
            disabled={false}
            onPointerDown={handleExitSmooth}
          />
        )}
      </div>
      
      {/* Controls - Only show when smooth is active */}
      {isSmoothActive && (
        <>
          <div className="control-group">
            <label htmlFor="smooth-radius">
              Brush radius: {settings.radius.toFixed(1)}px
            </label>
            <input
              id="smooth-radius"
              type="range"
              min="0.1"
              max="60"
              step="0.1"
              value={settings.radius}
              onChange={(e) => handleRadiusChange(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
              Size of the smoothing influence area
            </div>
          </div>

          <div className="control-group">
            <label htmlFor="smooth-strength">
              Strength: {(settings.strength * 100).toFixed(0)}%
            </label>
            <input
              id="smooth-strength"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={settings.strength}
              onChange={(e) => handleStrengthChange(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
              Intensity of applied smoothing
            </div>
          </div>

          <div className="control-group">
            <label htmlFor="smooth-tolerance">
              Curve tolerance: {settings.tolerance.toFixed(1)}px
            </label>
            <input
              id="smooth-tolerance"
              type="range"
              min="0.5"
              max="5.0"
              step="0.1"
              value={settings.tolerance}
              onChange={(e) => handleToleranceChange(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
              Precision of Bézier fitting after smoothing
            </div>
          </div>

          <div style={{ 
            fontSize: '11px', 
            color: '#666', 
            lineHeight: '1.3',
            padding: '8px',
            background: '#f9f9f9',
            borderRadius: '4px',
            marginTop: '12px'
          }}>
            <strong>How to use:</strong><br />
            • Activate the Smooth tool<br />
            • Click on any point of a subpath to smooth it<br />
            • The influence area is shown as a circle<br />
            • Adjust radius, strength and tolerance as needed<br />
            • Large radius + low strength = subtle smoothing
          </div>
        </>
      )}
    </div>
  );
};
