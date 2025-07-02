import React from 'react';
import { UIComponentDefinition } from '../../core/PluginSystem';
import { usePanelModeStore } from './PanelManager';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface AccordionSidebarProps {
  plugins: UIComponentDefinition[];
}

export const AccordionSidebar: React.FC<AccordionSidebarProps> = ({ plugins }) => {
  const { 
    accordionExpandedPanel, 
    setAccordionExpanded, 
    getVisiblePanels 
  } = usePanelModeStore();

  const visiblePanels = getVisiblePanels();
  
  // Filter plugins based on visible panels
  const visiblePlugins = plugins.filter(plugin => 
    visiblePanels.some(panel => panel.id === plugin.id)
  );

  // Sort plugins by panel order and group by type
  const sortedPlugins = visiblePlugins.sort((a, b) => {
    const panelA = visiblePanels.find(p => p.id === a.id);
    const panelB = visiblePanels.find(p => p.id === b.id);
    
    // Panel Mode should always be first
    if (a.id === 'panel-mode-ui') return -1;
    if (b.id === 'panel-mode-ui') return 1;
    
    // Then sort by original position (toolbar first, then sidebar)
    const positionA = a.position === 'toolbar' ? 0 : 1;
    const positionB = b.position === 'toolbar' ? 0 : 1;
    
    if (positionA !== positionB) {
      return positionA - positionB;
    }
    
    // Then sort by order within the same position
    return (panelA?.order || 0) - (panelB?.order || 0);
  });

  const handlePanelToggle = (panelId: string) => {
    if (accordionExpandedPanel === panelId) {
      setAccordionExpanded(null);
    } else {
      setAccordionExpanded(panelId);
    }
  };

  // Group plugins by their original position
  const panelModePlugin = sortedPlugins.find(p => p.id === 'panel-mode-ui');
  const toolbarPlugins = sortedPlugins.filter(p => p.position === 'toolbar' && p.id !== 'panel-mode-ui');
  const sidebarPlugins = sortedPlugins.filter(p => p.position === 'sidebar' && p.id !== 'panel-mode-ui');

  const sidebarStyle: React.CSSProperties = {
    // Using CSS class instead of inline styles for better override capability
  };

  const headerStyle: React.CSSProperties = {
    padding: '12px 16px',
    borderBottom: '1px solid #e0e0e0',
    background: '#f8f9fa',
    fontSize: '14px',
    fontWeight: 600,
    color: '#333',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const panelsContainerStyle: React.CSSProperties = {
    flex: 1,
    overflow: 'auto',
  };

  return (
    <div className="accordion-sidebar" style={sidebarStyle}>
      <div style={headerStyle}>
        <span>Tools & Panels</span>
        <span style={{ 
          fontSize: '10px', 
          color: '#666',
          background: '#e8f5e8',
          padding: '2px 6px',
          borderRadius: '3px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Accordion
        </span>
      </div>
      
      <div style={panelsContainerStyle}>
        {/* Panel Mode - Always first */}
        {panelModePlugin && (
          <>
            <AccordionPanel
              key={panelModePlugin.id}
              plugin={panelModePlugin}
              panel={visiblePanels.find(p => p.id === panelModePlugin.id)}
              isExpanded={accordionExpandedPanel === panelModePlugin.id}
              onToggle={() => handlePanelToggle(panelModePlugin.id)}
            />
            {(toolbarPlugins.length > 0 || sidebarPlugins.length > 0) && (
              <div style={{ 
                height: '1px',
                background: '#e0e0e0',
                margin: '4px 0'
              }} />
            )}
          </>
        )}

        {/* Toolbar Section */}
        {toolbarPlugins.length > 0 && (
          <>
            <div style={{ 
              padding: '8px 16px', 
              fontSize: '11px', 
              fontWeight: 600, 
              color: '#888',
              background: '#f8f9fa',
              borderBottom: '1px solid #e0e0e0',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Tools
            </div>
            {toolbarPlugins.map((plugin) => {
              const panel = visiblePanels.find(p => p.id === plugin.id);
              const isExpanded = accordionExpandedPanel === plugin.id;
              
              return (
                <AccordionPanel
                  key={plugin.id}
                  plugin={plugin}
                  panel={panel}
                  isExpanded={isExpanded}
                  onToggle={() => handlePanelToggle(plugin.id)}
                />
              );
            })}
          </>
        )}

        {/* Sidebar Section */}
        {sidebarPlugins.length > 0 && (
          <>
            {toolbarPlugins.length > 0 && (
              <div style={{ 
                padding: '8px 16px', 
                fontSize: '11px', 
                fontWeight: 600, 
                color: '#888',
                background: '#f8f9fa',
                borderBottom: '1px solid #e0e0e0',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Panels
              </div>
            )}
            {sidebarPlugins.map((plugin) => {
              const panel = visiblePanels.find(p => p.id === plugin.id);
              const isExpanded = accordionExpandedPanel === plugin.id;
              
              return (
                <AccordionPanel
                  key={plugin.id}
                  plugin={plugin}
                  panel={panel}
                  isExpanded={isExpanded}
                  onToggle={() => handlePanelToggle(plugin.id)}
                />
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};

interface AccordionPanelProps {
  plugin: UIComponentDefinition;
  panel?: { id: string; name: string; enabled: boolean; order: number; pluginId: string };
  isExpanded: boolean;
  onToggle: () => void;
}

const AccordionPanel: React.FC<AccordionPanelProps> = ({ 
  plugin, 
  panel, 
  isExpanded, 
  onToggle 
}) => {
  const isPanelMode = plugin.id === 'panel-mode-ui';
  
  const headerStyle: React.CSSProperties = {
    padding: '12px 16px',
    borderBottom: '1px solid #e0e0e0',
    cursor: 'pointer',
    background: isExpanded ? '#f0f8ff' : (isPanelMode ? '#f8f9fa' : '#fafafa'),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '13px',
    fontWeight: isPanelMode ? 600 : 500,
    color: isPanelMode ? '#007acc' : '#666',
    transition: 'background 0.2s ease',
  };

  const contentStyle: React.CSSProperties = {
    display: isExpanded ? 'block' : 'none',
    padding: '16px',
    borderBottom: '1px solid #e0e0e0',
    background: 'white',
    maxHeight: isExpanded ? '400px' : '0',
    overflow: 'auto',
    transition: 'max-height 0.3s ease',
  };

  const iconStyle: React.CSSProperties = {
    transition: 'transform 0.2s ease',
  };

  return (
    <div>
      <div 
        style={headerStyle}
        onClick={onToggle}
        onMouseEnter={(e) => {
          if (!isExpanded) {
            e.currentTarget.style.background = '#f5f5f5';
          }
        }}
        onMouseLeave={(e) => {
          if (!isExpanded) {
            e.currentTarget.style.background = '#fafafa';
          }
        }}
      >
        <span>{panel?.name || plugin.id}</span>
        <div style={iconStyle}>
          {isExpanded ? (
            <ChevronDown size={16} />
          ) : (
            <ChevronRight size={16} />
          )}
        </div>
      </div>
      
      {isExpanded && (
        <div style={contentStyle}>
          <AccordionPanelContent plugin={plugin} />
        </div>
      )}
    </div>
  );
};

interface AccordionPanelContentProps {
  plugin: UIComponentDefinition;
}

const AccordionPanelContent: React.FC<AccordionPanelContentProps> = ({ plugin }) => {
  // Debug log to verify which plugins are being rendered
  React.useEffect(() => {
    console.log(`Accordion rendering plugin: ${plugin.id}`);
  }, [plugin.id]);

  return (
    <div 
      style={{ 
        fontSize: '12px',
        width: '100%',
      }}
      className="accordion-panel-content"
    >
      <AccordionModeProvider>
        <plugin.component />
      </AccordionModeProvider>
    </div>
  );
};

// Context provider to signal we're in accordion mode
const AccordionContext = React.createContext(false);

const AccordionModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AccordionContext.Provider value={true}>
      {children}
    </AccordionContext.Provider>
  );
};

export const useAccordionMode = () => React.useContext(AccordionContext);
