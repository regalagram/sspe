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
  
  // Grupo prioritario de plugins por id
  const priorityIds = [
    'creation-tools',
    'curves-ui',
    'delete-control',
    'undo-redo-controls',
    'pencil-tools',
    'selection-tools',
    'shapes-panel',
    'path-style-controls',
    'zoom-controls',
  ];

    // Grupo prioritario de plugins por id
  const sandboxedIds = [
    'clipping-controls',
    'filter-controls',
    'marker-controls',
    'symbol-controls',
    'image-controls',
    'textpath-controls',
  ];

  // Filtrar plugins visibles
  const visiblePlugins = plugins.filter(plugin => 
    visiblePanels.some(panel => panel.id === plugin.id)
  );

  // Panel Mode plugin
  const panelModePlugin = visiblePlugins.find(p => p.id === 'panel-mode-ui');

  // Plugins prioritarios en el orden definido, tipados correctamente
  const priorityPlugins: UIComponentDefinition[] = priorityIds
    .map(id => visiblePlugins.find(p => p.id === id))
    .filter((p): p is UIComponentDefinition => !!p);
  
    // Plugins prioritarios en el orden definido, tipados correctamente
  const sandboxedPlugins: UIComponentDefinition[] = sandboxedIds
    .map(id => visiblePlugins.find(p => p.id === id))
    .filter((p): p is UIComponentDefinition => !!p);


  // Plugins restantes (excluyendo panelModePlugin y prioritarios), ordenados alfabéticamente
  const otherPlugins = visiblePlugins
    .filter(p => p.id !== 'panel-mode-ui' && !priorityIds.includes(p.id) && !sandboxedIds.includes(p.id))
    .sort((a, b) => {
      const panelA = visiblePanels.find(pan => pan.id === a.id);
      const panelB = visiblePanels.find(pan => pan.id === b.id);
      const nameA = panelA?.name || a.id;
      const nameB = panelB?.name || b.id;
      return nameA.localeCompare(nameB);
    });

  const handleCloseAccordion = () => {
    setAccordionVisible(false);
  };

  const handlePanelToggle = (panelId: string) => {
    if (accordionExpandedPanel === panelId) {
      setAccordionExpanded(null);
    } else {
      setAccordionExpanded(panelId);
    }
  };

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
          onPointerDown={handleCloseAccordion}
          onPointerEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#e0e0e0';
          }}
          onPointerLeave={(e) => {
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
            {/* Divider after Panel Mode */}
            {(priorityPlugins.length > 0 || otherPlugins.length > 0) && (
              <div style={{ 
                height: '1px',
                background: '#999',
                padding: '4px 0'
              }} />
            )}
          </>
        )}

        {/* Plugins prioritarios */}
        {priorityPlugins.map((plugin) => {
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

        {/* Divider after Panel Mode: entre prioritarios y otros si ambos existen */}
        {priorityPlugins.length > 0 && otherPlugins.length > 0 && (
          <div style={{ 
            height: '1px',
            background: '#999',
            padding: '4px 0'
          }} />
        )}

        {/* Plugins restantes en orden alfabético */}
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

                {/* Divider after Panel Mode: entre prioritarios y otros si ambos existen */}
        {sandboxedPlugins.length > 0 && (
          <div style={{ 
            height: '1px',
            background: '#999',
            padding: '4px 0'
          }} />
        )}

        {/* Plugins restantes en orden alfabético */}
        {sandboxedPlugins.map((plugin) => {
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
    padding: '2px 8px',
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


  // Pointer event logic to distinguish tap vs scroll
  const pointerStartY = useRef<number | null>(null);
  const pointerMoved = useRef<boolean>(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerStartY.current = e.clientY;
    pointerMoved.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (pointerStartY.current !== null) {
      if (Math.abs(e.clientY - pointerStartY.current) > 10) {
        pointerMoved.current = true;
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (pointerStartY.current !== null && !pointerMoved.current) {
      onToggle();
    }
    pointerStartY.current = null;
    pointerMoved.current = false;
  };

  return (
    <div data-panel-id={panelId}>
      <div 
        data-accordion-panel-header="true"
        style={headerStyle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerEnter={(e) => {
          if (!isExpanded) {
            e.currentTarget.style.background = '#f5f5f5';
          }
        }}
        onPointerLeave={(e) => {
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
