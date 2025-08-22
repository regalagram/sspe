import React, { useState, useEffect } from 'react';
import { pencil2Manager } from './Pencil2Manager';

export const Pencil2UI: React.FC = () => {
  const [settings, setSettings] = useState(pencil2Manager.getSettings());

  useEffect(() => {
    setSettings(pencil2Manager.getSettings());
  }, []);

  const handleSimplifyEpsChange = (value: number) => {
    const newSettings = { ...settings, simplifyEps: value };
    setSettings(newSettings);
    pencil2Manager.updateSettings(newSettings);
  };

  const handleStrokeWidthChange = (value: number) => {
    const newSettings = { ...settings, strokeWidth: value };
    setSettings(newSettings);
    pencil2Manager.updateSettings(newSettings);
  };

  return (
    <div className="control-panel">
      <h3>Pencil Drawing</h3>
      
      <div className="control-group">
        <label htmlFor="pencil2-simplify">
          Simplicity: {settings.simplifyEps}
        </label>
        <input
          id="pencil2-simplify"
          type="range"
          min="0"
          max="10"
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
        <label htmlFor="pencil2-stroke-width">
          Stroke Width: {settings.strokeWidth}px
        </label>
        <input
          id="pencil2-stroke-width"
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
        <div style={{ fontSize: '11px', color: '#666', lineHeight: '1.3' }}>
          <strong>How it works:</strong><br />
          • Draw freely with your pointer<br />
          • When simplicity {'>'} 0, shows animation from original to simplified path<br />
          • Higher simplicity = fewer points in final path
        </div>
      </div>
    </div>
  );
};