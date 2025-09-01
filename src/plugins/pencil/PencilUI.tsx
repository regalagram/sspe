import React, { useState, useEffect } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { pencilManager } from './PencilManager';
import { PluginButton } from '../../components/PluginButton';
import { Edit3, LogOut } from 'lucide-react';
import { toolModeManager } from '../../core/ToolModeManager';

export const PencilUI: React.FC = () => {
  const { mode } = useEditorStore();
  const [settings, setSettings] = useState(pencilManager.getSettings());
  
  const ispencilActive = mode.current === 'create' && mode.createMode?.commandType === 'PENCIL';

  useEffect(() => {
    setSettings(pencilManager.getSettings());
  }, []);

  const handleSimplifyEpsChange = (value: number) => {
    const newSettings = { ...settings, simplifyEps: value };
    setSettings(newSettings);
    pencilManager.updateSettings(newSettings);
  };

  const handleStrokeWidthChange = (value: number) => {
    const newSettings = { ...settings, strokeWidth: value };
    setSettings(newSettings);
    pencilManager.updateSettings(newSettings);
  };

  const handleStrokeOpacityChange = (value: number) => {
    const newSettings = { ...settings, strokeOpacity: value };
    setSettings(newSettings);
    pencilManager.updateSettings(newSettings);
  };

  const handlepencilActivate = () => {
    toolModeManager.setMode('pencil');
  };

  const handleExitpencil = () => {
    toolModeManager.setMode('select');
  };

  return (
    <div className="control-panel">
      <h3>Pencil Drawing v2</h3>
      
      {/* Tool buttons */}
      <div style={{ marginBottom: '12px' }}>
        {!ispencilActive && (
          <PluginButton
            icon={<Edit3 size={14} color="#333" />}
            text="Activate Pencil v2"
            color="#007acc"
            active={false}
            disabled={false}
            onPointerDown={handlepencilActivate}
          />
        )}
        {ispencilActive && (
          <PluginButton
            icon={<LogOut size={16} />}
            text="Exit Pencil Mode"
            color="#dc3545"
            active={false}
            disabled={false}
            onPointerDown={handleExitpencil}
          />
        )}
      </div>
      
      {/* Controls - Only show when pencil is active */}
      {ispencilActive && (
        <>
          <div className="control-group">
            <label htmlFor="pencil-simplify">
              Simplicity: {settings.simplifyEps}
            </label>
        <input
          id="pencil-simplify"
          type="range"
          min="0"
          max="32"
          step="0.5"
          value={settings.simplifyEps}
          onChange={(e) => handleSimplifyEpsChange(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
        <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
          {settings.simplifyEps === 0 ? 'No simplification' : 'Higher values = more simplification'}
        </div>
      </div>

      <div className="control-group">
        <label htmlFor="pencil-stroke-width">
          Stroke Width: {settings.strokeWidth}px
        </label>
        <input
          id="pencil-stroke-width"
          type="range"
          min="1"
          max="20"
          step="1"
          value={settings.strokeWidth}
          onChange={(e) => handleStrokeWidthChange(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
          </div>

          <div className="control-group">
            <label htmlFor="pencil-stroke-opacity">
              Opacity: {Math.round(settings.strokeOpacity * 100)}%
            </label>
            <input
              id="pencil-stroke-opacity"
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={settings.strokeOpacity}
              onChange={(e) => handleStrokeOpacityChange(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div className="control-group">
            <div style={{ fontSize: '11px', color: '#666', lineHeight: '1.3' }}>
              <strong>How it works:</strong><br />
              • Draw freely with your pointer<br />
              • When simplicity {'>'} 0, shows animation from original to simplified path<br />
              • Higher simplicity = fewer points in final path<br />
              • Use floating toolbar above for quick color, width & opacity changes
            </div>
          </div>
        </>
      )}
    </div>
  );
};