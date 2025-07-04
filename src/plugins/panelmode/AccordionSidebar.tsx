import React, { useRef, useEffect } from 'react';
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
  const panelsContainerRef = useRef<HTMLDivElement>(null);
  
  // Apply mobile form focus fix for iOS and Android (safe version that excludes checkboxes)
  useMobileFormFocusFix();
  
  // Apply Android-specific touch enhancements
  useAndroidTouchEnhancements();
  
  // Apply NON-INVASIVE controls enhancements for mobile (checkboxes, sliders, etc.)
  useMobileControlsEnhancement();
  
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
  const { isMobile, isTablet } = useMobileDetection();
  const isPanelMode = plugin.id === 'panel-mode-ui';
  
  // Touch scroll detection
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const scrollThreshold = 10; // pixels
  const timeThreshold = 300; // milliseconds
  
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
    
    // Record initial touch position and time
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
    
    // Add visual feedback for touch
    if (!isExpanded) {
      (e.currentTarget as HTMLElement).style.background = '#f0f0f0';
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Don't prevent default here to allow scrolling
    // This allows the container to scroll normally
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    console.log('AccordionPanel touchend:', plugin.id);
    e.preventDefault();
    e.stopPropagation();
    
    // Remove visual feedback
    if (!isExpanded) {
      (e.currentTarget as HTMLElement).style.background = '#fafafa';
    }
    
    // Check if this was a scroll gesture or an intentional tap
    if (touchStartRef.current) {
      const touch = e.changedTouches[0];
      const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
      const deltaTime = Date.now() - touchStartRef.current.time;
      
      // Only trigger if movement is minimal and time is reasonable
      const isIntentionalTap = deltaX < scrollThreshold && 
                               deltaY < scrollThreshold && 
                               deltaTime < timeThreshold;
      
      console.log('Touch analysis:', {
        deltaX,
        deltaY,
        deltaTime,
        isIntentionalTap,
        pluginId: plugin.id
      });
      
      if (isIntentionalTap) {
        onToggle();
      }
    }
    
    // Reset touch tracking
    touchStartRef.current = null;
  };

  const handleTouchCancel = (e: React.TouchEvent) => {
    console.log('AccordionPanel touchcancel:', plugin.id);
    
    // Remove visual feedback
    if (!isExpanded) {
      (e.currentTarget as HTMLElement).style.background = '#fafafa';
    }
    
    // Reset touch tracking
    touchStartRef.current = null;
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
    <div data-panel-id={panelId}>
      <div 
        data-accordion-panel-header="true"
        data-clickable="true"
        style={headerStyle}
        onClick={handleClick}
        onTouchStart={isMobile ? handleTouchStart : undefined}
        onTouchMove={isMobile ? handleTouchMove : undefined}
        onTouchEnd={isMobile ? handleTouchEnd : undefined}
        onTouchCancel={isMobile ? handleTouchCancel : undefined}
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
