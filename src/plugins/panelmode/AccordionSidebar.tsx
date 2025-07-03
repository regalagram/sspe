import React from 'react';
import { UIComponentDefinition } from '../../core/PluginSystem';
import { usePanelModeStore } from './PanelManager';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useMobileDetection, getButtonSize } from '../../hooks/useMobileDetection';
import { useMobileFormFocusFix } from '../../hooks/useMobileFormFocusFix';
import { useAndroidTouchEnhancements } from '../../hooks/useAndroidTouchEnhancements';
import { useMobileControlsEnhancement } from '../../hooks/useMobileControlsEnhancement';

interface AccordionSidebarProps {
  plugins: UIComponentDefinition[];
}

export const AccordionSidebar: React.FC<AccordionSidebarProps> = ({ plugins }) => {
  const { 
    accordionExpandedPanel, 
    setAccordionExpanded, 
    getVisiblePanels 
  } = usePanelModeStore();

  const { isMobile, isTablet } = useMobileDetection();
  
  // Apply mobile form focus fix for iOS and Android (safe version that excludes checkboxes)
  useMobileFormFocusFix();
  
  // Apply Android-specific touch enhancements
  useAndroidTouchEnhancements();
  
  // Apply NON-INVASIVE controls enhancements for mobile (checkboxes, sliders, etc.)
  useMobileControlsEnhancement();
  
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
    width: '200px', // Ancho fijo y adecuado para accordion
    maxWidth: '200px', // Asegurar que no se expanda más
    minWidth: '200px', // Asegurar que no se contraiga menos
    // Using CSS class for additional styles
  };

  const headerStyle: React.CSSProperties = {
    padding: isMobile ? '16px 20px' : '12px 16px', // Más padding en móviles
    borderBottom: '1px solid #e0e0e0',
    background: '#f8f9fa',
    fontSize: isMobile ? '16px' : '14px', // Texto más grande en móviles
    fontWeight: 600,
    color: '#333',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: isMobile ? '48px' : 'auto', // Altura mínima para touch targets
  };

  const panelsContainerStyle: React.CSSProperties = {
    flex: 1,
    overflow: 'auto',
    WebkitOverflowScrolling: 'touch', // Smooth scrolling en iOS
    touchAction: 'auto', // Permitir scroll táctil
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
  const { isMobile, isTablet } = useMobileDetection();
  const isPanelMode = plugin.id === 'panel-mode-ui';
  
  const headerStyle: React.CSSProperties = {
    padding: isMobile ? '16px 20px' : '12px 16px', // Más padding en móviles
    borderBottom: '1px solid #e0e0e0',
    cursor: 'pointer',
    background: isExpanded ? '#f0f8ff' : (isPanelMode ? '#f8f9fa' : '#fafafa'),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: isMobile ? '15px' : '13px', // Texto más grande en móviles
    fontWeight: isPanelMode ? 600 : 500,
    color: isPanelMode ? '#007acc' : '#666',
    transition: 'background 0.2s ease',
    minHeight: isMobile ? '48px' : 'auto', // Altura mínima para touch targets
    touchAction: 'manipulation', // Mejorar respuesta táctil
  };

  const contentStyle: React.CSSProperties = {
    display: isExpanded ? 'block' : 'none',
    padding: isMobile ? '20px' : '16px', // Más padding en móviles
    borderBottom: '1px solid #e0e0e0',
    background: 'white',
    maxHeight: isExpanded ? (isMobile ? '60vh' : '400px') : '0', // Más altura disponible en móviles
    overflow: 'auto',
    transition: 'max-height 0.3s ease',
    WebkitOverflowScrolling: 'touch', // Smooth scrolling en iOS
    touchAction: 'auto', // Permitir scroll táctil
  };

  const iconStyle: React.CSSProperties = {
    transition: 'transform 0.2s ease',
    width: isMobile ? '20px' : '16px', // Iconos más grandes en móviles
    height: isMobile ? '20px' : '16px',
  };

  // Handle touch events explicitly for better mobile support
  const handleTouchStart = (e: React.TouchEvent) => {
    console.log('AccordionPanel touchstart:', plugin.id);
    // Add visual feedback for touch
    if (!isExpanded) {
      (e.currentTarget as HTMLElement).style.background = '#f0f0f0';
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    console.log('AccordionPanel touchend:', plugin.id);
    e.preventDefault();
    e.stopPropagation();
    
    // Remove visual feedback
    if (!isExpanded) {
      (e.currentTarget as HTMLElement).style.background = '#fafafa';
    }
    
    // Trigger the toggle action immediately
    onToggle();
  };

  const handleClick = (e: React.MouseEvent) => {
    console.log('AccordionPanel click:', plugin.id, 'isTrusted:', (e as any).isTrusted);
    // For desktop, handle all clicks normally
    // For mobile, only handle if it's NOT a synthetic click from touch
    if (!isMobile || (e as any).isTrusted) {
      onToggle();
    }
  };

  return (
    <div>
      <div 
        data-accordion-panel-header="true"
        data-clickable="true"
        style={headerStyle}
        onClick={handleClick}
        onTouchStart={isMobile ? handleTouchStart : undefined}
        onTouchEnd={isMobile ? handleTouchEnd : undefined}
        onMouseEnter={!isMobile ? (e) => {
          if (!isExpanded) {
            e.currentTarget.style.background = '#f5f5f5';
          }
        } : undefined}
        onMouseLeave={!isMobile ? (e) => {
          if (!isExpanded) {
            e.currentTarget.style.background = '#fafafa';
          }
        } : undefined}
      >
        <span>{panel?.name || plugin.id}</span>
        <div style={iconStyle}>
          {isExpanded ? (
            <ChevronDown size={isMobile ? 20 : 16} />
          ) : (
            <ChevronRight size={isMobile ? 20 : 16} />
          )}
        </div>
      </div>
      
      {isExpanded && (
        <div 
          style={contentStyle}
          className="accordion-panel-content-container"
          data-mobile-scrollable="true"
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
      data-mobile-scrollable="true"
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
