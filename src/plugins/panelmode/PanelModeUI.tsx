import React from 'react';
import { usePanelModeStore } from './PanelManager';
import { DraggablePanel } from '../../components/DraggablePanel';
import { PluginButton } from '../../components/PluginButton';
import { 
  Layout, 
  Sidebar, 
  Eye, 
  EyeOff, 
  Settings,
  ArrowUpDown
} from 'lucide-react';

export const PanelModeUI: React.FC = () => {
  const { 
    mode, 
    toggleMode, 
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
    margin: '2px', // Small margin for scroll area
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
    padding: '8px',
    background: '#f0f8ff',
    borderRadius: '4px',
    border: '1px solid #e0e8f0',
  };

  return (
    <DraggablePanel
      title="Panel Mode"
      initialPosition={{ x: 20, y: 80 }}
      id="panel-mode-controls"
    >
      <div style={containerStyle}>
        
        {/* Mode Toggle */}
        <div>
          <PluginButton
            icon={mode === 'draggable' ? <Layout size={16} /> : <Sidebar size={16} />}
            text={mode === 'draggable' ? 'Switch to Accordion' : 'Switch to Draggable'}
            color="#007acc"
            active={false}
            disabled={false}
            onClick={toggleMode}
            fullWidth={true}
          />
        </div>



        {/* Panel Management Section */}
        <div style={sectionStyle}>
          <div style={titleStyle}>
            <Settings size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            Panel Visibility
            {panels.length > 6 && (
              <span style={{ 
                fontSize: '9px', 
                color: '#888', 
                fontWeight: 400,
                marginLeft: '4px'
              }}>
              </span>
            )}
          </div>

          {/* Hide/Show All Buttons */}
          <div style={{
            display: 'flex',
            gap: '6px',
            marginBottom: '8px'
          }}>
            <PluginButton
              icon={<Eye size={14} />}
              text="Show All"
              color="#22c55e"
              active={false}
              disabled={allPanelsEnabled}
              onClick={handleShowAll}
              fullWidth={true}
            />
            <PluginButton
              icon={<EyeOff size={14} />}
              text="Hide All"
              color="#ef4444"
              active={false}
              disabled={allPanelsDisabled}
              onClick={handleHideAll}
              fullWidth={true}
            />
          </div>
          
          <div 
            className="panel-visibility-scroll"
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '4px',
              maxHeight: '200px', // Limit height for scroll
              overflowY: 'auto',   // Enable vertical scroll
              padding: '4px',      // Small padding for scroll area
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              background: '#fafafa'
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
                    <span style={{ 
                      fontSize: '10px', 
                      color: '#888',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {panel.originalPosition || 'unknown'}
                    </span>
                  </div>
                  <button
                    style={{
                      ...toggleButtonStyle,
                      color: panel.enabled ? '#22c55e' : '#ef4444'
                    }}
                    onClick={() => togglePanel(panel.id)}
                    title={panel.enabled ? 'Hide panel' : 'Show panel'}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#e5e7eb';
                    }}
                    onMouseLeave={(e) => {
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
    </DraggablePanel>
  );
};
