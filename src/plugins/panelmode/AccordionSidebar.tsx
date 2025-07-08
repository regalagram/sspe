import React, { useRef, useEffect } from 'react';
import { UIComponentDefinition } from '../../core/PluginSystem';
import { usePanelModeStore } from './PanelManager';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { useToolModeState } from '../../hooks/useToolMode';

interface AccordionSidebarProps {
  plugins: UIComponentDefinition[];
}

export const AccordionSidebar: React.FC<AccordionSidebarProps> = ({ plugins }) => {
  const { 
    accordionExpandedPanel, 
    setAccordionExpanded, 
    getVisiblePanels,
    setAccordionVisible
  } = usePanelModeStore();

  const panelsContainerRef = useRef<HTMLDivElement>(null);
  const toolMode = useToolModeState();
  
  const visiblePanels = getVisiblePanels();
  
  // Auto-scroll when a panel is expanded
  useEffect(() => {
    if (accordionExpandedPanel && panelsContainerRef.current) {
      const expandedPanelElement = panelsContainerRef.current.querySelector(
        `[data-panel-id="${accordionExpandedPanel}"]`
      );
      
      if (expandedPanelElement) {
        // Small delay to ensure the panel content is fully rendered
        setTimeout(() => {
          expandedPanelElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
          });
        }, 100);
      }
    }
  }, [accordionExpandedPanel]);
  
  // Filter plugins based on visible panels
  const visiblePlugins = plugins.filter(plugin => 
    visiblePanels.some(panel => panel.id === plugin.id)
  );

  // Sort plugins alphabetically, keeping Panel Mode first
  const sortedPlugins = visiblePlugins.sort((a, b) => {
    const panelA = visiblePanels.find(p => p.id === a.id);
    const panelB = visiblePanels.find(p => p.id === b.id);
    
    // Panel Mode should always be first
    if (a.id === 'panel-mode-ui') return -1;
    if (b.id === 'panel-mode-ui') return 1;
    
    // Sort all other plugins alphabetically by name
    const nameA = panelA?.name || a.id;
    const nameB = panelB?.name || b.id;
    
    return nameA.localeCompare(nameB);
  });

  const handleCloseAccordion = () => {
    setAccordionVisible(false);
    setAccordionExpanded(null);
  };

  const handlePanelToggle = (panelId: string) => {
    if (accordionExpandedPanel === panelId) {
      setAccordionExpanded(null);
    } else {
      setAccordionExpanded(panelId);
    }
  };

  // Get Panel Mode plugin and all others
  const panelModePlugin = sortedPlugins.find(p => p.id === 'panel-mode-ui');
  const otherPlugins = sortedPlugins.filter(p => p.id !== 'panel-mode-ui');

  const sidebarStyle: React.CSSProperties = {
    width: '200px',
    maxWidth: '200px',
    minWidth: '200px',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
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

  const closeButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#666',
    transition: 'background-color 0.2s ease',
  };

  const panelsContainerStyle: React.CSSProperties = {
    flex: 1,
    overflow: 'auto'
  };

  return (
    <div className="accordion-sidebar" style={sidebarStyle}>
      <div style={headerStyle}>
        <span>
          Panels
          <span
            style={{
              display: 'inline-block',
              marginLeft: 10,
              padding: '2px 2px',
              borderRadius: 12,
              background: '#e3eaff',
              color: '#2563eb',
              fontWeight: 700,
              fontSize: 10,
              letterSpacing: 1,
              border: '1px solid #b6c6f5',
              boxShadow: '0 1px 2px rgba(80,120,255,0.04)',
              verticalAlign: 'middle',
              minWidth: 60,
              textAlign: 'center',
              transition: 'background 0.2s',
            }}
            title="Active tool mode"
          >
            {toolMode.activeMode?.toUpperCase() || '—'}
          </span>
        </span>
        <button
          style={closeButtonStyle}
          onClick={handleCloseAccordion}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#e0e0e0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="Close panels"
        >
          <X size={16} />
        </button>
      </div>
      
      <div ref={panelsContainerRef} style={panelsContainerStyle}>
        {/* Panel Mode - Always first */}
        {panelModePlugin && (
          <>
            <AccordionPanel
              key={panelModePlugin.id}
              plugin={panelModePlugin}
              panel={visiblePanels.find(p => p.id === panelModePlugin.id)}
              isExpanded={accordionExpandedPanel === panelModePlugin.id}
              onToggle={() => handlePanelToggle(panelModePlugin.id)}
              panelId={panelModePlugin.id}
            />
            {otherPlugins.length > 0 && (
              <div style={{ 
                height: '1px',
                background: '#e0e0e0',
                margin: '4px 0'
              }} />
            )}
          </>
        )}

        {/* All other plugins in alphabetical order */}
        {otherPlugins.map((plugin) => {
          const panel = visiblePanels.find(p => p.id === plugin.id);
          const isExpanded = accordionExpandedPanel === plugin.id;
          
          return (
            <AccordionPanel
              key={plugin.id}
              plugin={plugin}
              panel={panel}
              isExpanded={isExpanded}
              onToggle={() => handlePanelToggle(plugin.id)}
              panelId={plugin.id}
            />
          );
        })}
      </div>
    </div>
  );
};

interface AccordionPanelProps {
  plugin: UIComponentDefinition;
  panel?: { id: string; name: string; enabled: boolean; order: number; pluginId: string };
  isExpanded: boolean;
  onToggle: () => void;
  panelId: string;
}

const AccordionPanel: React.FC<AccordionPanelProps> = ({ 
  plugin, 
  panel, 
  isExpanded, 
  onToggle,
  panelId
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
    padding: '8px 8px',
    borderBottom: '1px solid #e0e0e0',
    background: 'white',
    maxHeight: isExpanded ? '400px' : '0',
    overflow: 'auto',
    transition: 'max-height 0.3s ease',
  };

  const iconStyle: React.CSSProperties = {
    transition: 'transform 0.2s ease',
    width: '16px',
    height: '16px',
  };

  const handleClick = (e: React.MouseEvent) => {
    onToggle();
  };

  return (
    <div data-panel-id={panelId}>
      <div 
        data-accordion-panel-header="true"
        data-clickable="true"
        style={headerStyle}
        onClick={handleClick}
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
        <div 
          style={contentStyle}
          className="accordion-panel-content-container"
        >
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

const AccordionContext = React.createContext(false);

const AccordionModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AccordionContext.Provider value={true}>
      {children}
    </AccordionContext.Provider>
  );
};

export const useAccordionMode = () => React.useContext(AccordionContext);
