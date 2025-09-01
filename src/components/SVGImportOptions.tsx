import React, { useState } from 'react';
import { Settings, RotateCcw, FileText } from 'lucide-react';

export interface ImportSettings {
  mode: 'replace' | 'append';
  preserveViewBox: boolean;
  autoAdjustViewport: boolean;
  validateBeforeImport: boolean;
  showConfirmation: boolean;
}

interface SVGImportOptionsProps {
  settings: ImportSettings;
  onSettingsChange: (settings: ImportSettings) => void;
  onApplyDefaults: () => void;
  className?: string;
}

export const SVGImportOptions: React.FC<SVGImportOptionsProps> = ({
  settings,
  onSettingsChange,
  onApplyDefaults,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSettingChange = (key: keyof ImportSettings, value: any) => {
    onSettingsChange({
      ...settings,
      [key]: value
    });
  };

  const containerStyle: React.CSSProperties = {
    border: '1px solid #dee2e6',
    borderRadius: '6px',
    overflow: 'hidden',
    backgroundColor: '#ffffff'
  };

  const headerStyle: React.CSSProperties = {
    padding: '12px 16px',
    backgroundColor: '#f8f9fa',
    borderBottom: isExpanded ? '1px solid #dee2e6' : 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    userSelect: 'none',
    fontSize: '14px',
    fontWeight: '500',
    color: '#495057'
  };

  const contentStyle: React.CSSProperties = {
    padding: '16px',
    display: isExpanded ? 'block' : 'none',
    backgroundColor: '#ffffff'
  };

  const optionGroupStyle: React.CSSProperties = {
    marginBottom: '16px',
    paddingBottom: '16px',
    borderBottom: '1px solid #f1f3f4'
  };

  const optionGroupTitleStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: '600',
    color: '#343a40',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  };

  const optionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px'
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#495057',
    cursor: 'pointer',
    flex: 1
  };

  const checkboxStyle: React.CSSProperties = {
    margin: 0,
    cursor: 'pointer'
  };

  const radioStyle: React.CSSProperties = {
    margin: 0,
    cursor: 'pointer'
  };

  const buttonStyle: React.CSSProperties = {
    padding: '6px 12px',
    fontSize: '12px',
    border: '1px solid #dee2e6',
    borderRadius: '4px',
    backgroundColor: '#ffffff',
    color: '#495057',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'all 0.2s ease'
  };

  const modeDescriptions = {
    replace: 'Replace all existing content with imported SVG',
    append: 'Add imported content to existing elements'
  };

  return (
    <div className={className} style={containerStyle}>
      <div style={headerStyle} onClick={() => setIsExpanded(!isExpanded)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Settings size={16} />
          <span>Import Options</span>
        </div>
        <span style={{ 
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease'
        }}>
          ▼
        </span>
      </div>
      
      <div style={contentStyle}>
        {/* Import Mode */}
        <div style={optionGroupStyle}>
          <div style={optionGroupTitleStyle}>
            <FileText size={14} />
            Import Mode
          </div>
          
          <div style={optionStyle}>
            <input
              type="radio"
              id="mode-replace"
              name="import-mode"
              checked={settings.mode === 'replace'}
              onChange={() => handleSettingChange('mode', 'replace')}
              style={radioStyle}
            />
            <label htmlFor="mode-replace" style={labelStyle}>
              Replace existing content
            </label>
          </div>
          
          <div style={optionStyle}>
            <input
              type="radio"
              id="mode-append"
              name="import-mode"
              checked={settings.mode === 'append'}
              onChange={() => handleSettingChange('mode', 'append')}
              style={radioStyle}
            />
            <label htmlFor="mode-append" style={labelStyle}>
              Append to existing content
            </label>
          </div>
          
          <div style={{ 
            fontSize: '11px', 
            color: '#6c757d', 
            marginTop: '4px',
            paddingLeft: '20px'
          }}>
            {modeDescriptions[settings.mode]}
          </div>
        </div>

        {/* ViewBox Settings */}
        <div style={optionGroupStyle}>
          <div style={optionGroupTitleStyle}>
            <Settings size={14} />
            ViewBox & Viewport
          </div>
          
          <div style={optionStyle}>
            <input
              type="checkbox"
              id="preserve-viewbox"
              checked={settings.preserveViewBox}
              onChange={(e) => handleSettingChange('preserveViewBox', e.target.checked)}
              style={checkboxStyle}
            />
            <label htmlFor="preserve-viewbox" style={labelStyle}>
              Preserve original viewBox
            </label>
          </div>
          
          <div style={optionStyle}>
            <input
              type="checkbox"
              id="auto-adjust-viewport"
              checked={settings.autoAdjustViewport}
              onChange={(e) => handleSettingChange('autoAdjustViewport', e.target.checked)}
              style={checkboxStyle}
            />
            <label htmlFor="auto-adjust-viewport" style={labelStyle}>
              Auto-adjust viewport to fit content
            </label>
          </div>
        </div>

        {/* Validation Settings */}
        <div style={optionGroupStyle}>
          <div style={optionGroupTitleStyle}>
            <Settings size={14} />
            Validation & Confirmation
          </div>
          
          <div style={optionStyle}>
            <input
              type="checkbox"
              id="validate-before-import"
              checked={settings.validateBeforeImport}
              onChange={(e) => handleSettingChange('validateBeforeImport', e.target.checked)}
              style={checkboxStyle}
            />
            <label htmlFor="validate-before-import" style={labelStyle}>
              Validate SVG before import
            </label>
          </div>
          
          <div style={optionStyle}>
            <input
              type="checkbox"
              id="show-confirmation"
              checked={settings.showConfirmation}
              onChange={(e) => handleSettingChange('showConfirmation', e.target.checked)}
              style={checkboxStyle}
            />
            <label htmlFor="show-confirmation" style={labelStyle}>
              Show confirmation dialog
            </label>
          </div>
        </div>

        {/* Reset Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            style={buttonStyle}
            onClick={onApplyDefaults}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f8f9fa';
              e.currentTarget.style.borderColor = '#adb5bd';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.borderColor = '#dee2e6';
            }}
          >
            <RotateCcw size={12} />
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
};