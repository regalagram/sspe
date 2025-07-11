import React from 'react';
import { usePanelModeStore } from './PanelManager';
import { 
  Eye, 
  EyeOff, 
  Settings,
} from 'lucide-react';

export const PanelModeUI: React.FC = () => {
  const { 
    getPanelsList,
    togglePanel,
    enablePanel,
    disablePanel
  } = usePanelModeStore();

  const panels = getPanelsList()
    .filter(panel => panel.id !== 'panel-mode-ui') // Exclude Panel Mode itself
    .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically by name

  // Check if all panels are enabled or disabled
  const allPanelsEnabled = panels.length > 0 && panels.every(panel => panel.enabled);
  const allPanelsDisabled = panels.length > 0 && panels.every(panel => !panel.enabled);

  const handleShowAll = () => {
    panels.forEach(panel => {
      if (!panel.enabled) {
        enablePanel(panel.id);
      }
    });
  };

  const handleHideAll = () => {
    panels.forEach(panel => {
      if (panel.enabled) {
        disablePanel(panel.id);
      }
    });
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    // Remove fixed width to allow full width in accordion mode
  };

  const sectionStyle: React.CSSProperties = {
    borderTop: '1px solid #e0e0e0',
    paddingTop: '12px',
    marginTop: '6px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 600,
    color: '#666',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const panelItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    background: 'white',
    border: '1px solid #e0e0e0',
    margin: '2px 4px', // Small margin for scroll area
  };

  const toggleButtonStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '2px',
    borderRadius: '3px',
    color: '#666',
    transition: 'color 0.2s ease',
  };

  const statusStyle: React.CSSProperties = {
    fontSize: '11px',
    color: '#666',
    textAlign: 'center',
    padding: '4px',
    background: '#f0f8ff',
    borderRadius: '4px',
    border: '1px solid #e0e8f0',
  };

  const buttonStyle: React.CSSProperties = {
    background: 'transparent',
    border: '1px solid #e0e0e0',
    cursor: 'pointer',
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#666',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  };

  const enabledButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: '#22c55e',
    color: 'white',
    border: '1px solid #22c55e',
  };

  const disabledButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: '#ef4444',
    color: 'white',
    border: '1px solid #ef4444',
  };

  return (
    <div style={containerStyle}>
      {/* Panel Management Section */}
      <div>
        {/* Hide/Show All Buttons */}
        <div style={{
          display: 'flex',
          gap: '6px',
          marginBottom: '8px'
        }}>
          <button
            style={allPanelsEnabled ? { ...buttonStyle, opacity: 0.5 } : enabledButtonStyle}
            disabled={allPanelsEnabled}
            onPointerDown={handleShowAll}
            onPointerEnter={(e) => {
              if (!allPanelsEnabled) {
                e.currentTarget.style.background = '#16a34a';
              }
            }}
            onPointerLeave={(e) => {
              if (!allPanelsEnabled) {
                e.currentTarget.style.background = '#22c55e';
              }
            }}
          >
            Show All
          </button>
          <button
            style={allPanelsDisabled ? { ...buttonStyle, opacity: 0.5 } : disabledButtonStyle}
            disabled={allPanelsDisabled}
            onPointerDown={handleHideAll}
            onPointerEnter={(e) => {
              if (!allPanelsDisabled) {
                e.currentTarget.style.background = '#dc2626';
              }
            }}
            onPointerLeave={(e) => {
              if (!allPanelsDisabled) {
                e.currentTarget.style.background = '#ef4444';
              }
            }}
          >
            Hide All
          </button>
        </div>
        
        <div 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            maxHeight: '340px',
            overflowY: 'auto',
          }}
        >
          {panels.length === 0 ? (
            <div style={{ 
              fontSize: '11px', 
              color: '#999', 
              textAlign: 'center',
              padding: '12px',
              fontStyle: 'italic'
            }}>
              Loading panels...
            </div>
          ) : (
            panels.map((panel) => (
              <div key={panel.id} style={panelItemStyle}>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <span style={{ 
                    color: panel.enabled ? '#333' : '#999',
                    fontWeight: panel.enabled ? 500 : 400
                  }}>
                    {panel.name}
                  </span>
                </div>
                <button
                  style={{
                    ...toggleButtonStyle,
                    color: panel.enabled ? '#22c55e' : '#ef4444'
                  }}
                  onPointerDown={() => togglePanel(panel.id)}
                  title={panel.enabled ? 'Hide panel' : 'Show panel'}
                  onPointerEnter={(e) => {
                    e.currentTarget.style.background = '#e5e7eb';
                  }}
                  onPointerLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {panel.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
