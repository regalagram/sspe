import React, { ReactNode } from 'react';
import { useDraggable } from '../hooks/useDraggable';
import { usePanelStorage, resetAllPanelsToDefault } from '../hooks/usePanelStorage';
import { Pin, ChevronDown, ChevronUp } from 'lucide-react';

// Hook to check if we're in accordion mode - avoiding circular imports
const useAccordionMode = (): boolean => {
  const [isAccordion, setIsAccordion] = React.useState(() => {
    try {
      const saved = localStorage.getItem('sspe-panel-mode');
      return saved === 'accordion';
    } catch {
      return false;
    }
  });

  React.useEffect(() => {
    const checkMode = () => {
      try {
        const saved = localStorage.getItem('sspe-panel-mode');
        const newMode = saved === 'accordion';
        if (newMode !== isAccordion) {
          setIsAccordion(newMode);
        }
      } catch {
        if (isAccordion) {
          setIsAccordion(false);
        }
      }
    };

    // Listen for storage changes
    window.addEventListener('storage', checkMode);
    
    // Check mode periodically (reduced frequency)
    const interval = setInterval(checkMode, 500);

    return () => {
      window.removeEventListener('storage', checkMode);
      clearInterval(interval);
    };
  }, [isAccordion]);

  return isAccordion;
};

interface DraggablePanelProps {
  children: ReactNode;
  title: string;
  initialPosition?: { x: number; y: number };
  className?: string;
  style?: React.CSSProperties;
  id?: string; // Used for storage identification
}

// Temporary Reset Button Component
const ResetPositionsButton: React.FC = () => (
  <button
    onClick={() => {
      resetAllPanelsToDefault();
      window.location.reload();
    }}
    style={{
      position: 'fixed',
      top: '10px',
      left: '10px',
      zIndex: 9999,
      padding: '8px 12px',
      background: '#ff6b6b',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px'
    }}
    title="Reset all panel positions to default"
  >
    Reset Panels
  </button>
);

export const DraggablePanel: React.FC<DraggablePanelProps> = ({
  children,
  title,
  initialPosition = { x: 10, y: 10 },
  className = '',
  style = {},
  id = title.toLowerCase().replace(/\s+/g, '-')
}) => {
  const isAccordionMode = useAccordionMode();
  
  // In accordion mode, just render the children without draggable functionality
  if (isAccordionMode) {
    return (
      <div className="accordion-panel-wrapper" style={{ width: '100%' }}>
        {children}
      </div>
    );
  }

  // Normal draggable mode
  const {
    panelState,
    updatePosition,
    togglePin,
    toggleCollapse,
    bringToFront,
  } = usePanelStorage(id, initialPosition);

  const { elementProps, dragHandleProps, isDragging } = useDraggable({
    initialPosition: panelState.position,
    constrainToParent: true,
    handle: '.drag-handle',
    onPositionChange: updatePosition,
    disabled: panelState.isPinned
  });

  const handlePanelClick = () => {
    bringToFront();
  };

  const panelStyle: React.CSSProperties = {
    ...elementProps.style,
    ...style,
    background: 'white',
    borderRadius: '8px',
    boxShadow: isDragging 
      ? '0 8px 25px rgba(0,0,0,0.3)' 
      : '0 2px 8px rgba(0,0,0,0.15)',
    border: '1px solid #e0e0e0',
    minWidth: '200px',
    maxWidth: '300px', // Standard max width for draggable panels
    width: 'auto', // Allow panels to size themselves within constraints
    transition: isDragging ? 'none' : 'box-shadow 0.2s ease',
    zIndex: panelState.zIndex,
    opacity: panelState.isCollapsed ? 0.9 : 1,
  };

  const headerStyle: React.CSSProperties = {
    ...dragHandleProps.style,
    padding: '8px 12px',
    borderBottom: panelState.isCollapsed ? 'none' : '1px solid #e0e0e0',
    background: panelState.isPinned ? '#e8f5e8' : '#f8f9fa',
    borderRadius: panelState.isCollapsed ? '8px' : '8px 8px 0 0',
    fontSize: '12px',
    fontWeight: 600,
    color: '#666',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    justifyContent: 'space-between',
    cursor: panelState.isPinned ? 'default' : 'grab',
  };

  const contentStyle: React.CSSProperties = {
    padding: '12px',
    display: panelState.isCollapsed ? 'none' : 'block',
  };

  const iconButtonStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '2px 4px',
    borderRadius: '3px',
    fontSize: '12px',
    color: '#666',
    transition: 'all 0.2s ease',
  };

  return (
    <div 
      className={`draggable-panel ${className}`}
      style={panelStyle}
      onClick={handlePanelClick}
    >
      {/* Render reset button only for the first panel - Temporarily disabled */}
      {/* {id === 'zoom' && <ResetPositionsButton />} */}
      
      <div 
        className="drag-handle"
        style={headerStyle}
        onMouseDown={dragHandleProps.onMouseDown}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg 
            width="8" 
            height="8" 
            viewBox="0 0 8 8"
            style={{ opacity: panelState.isPinned ? 0.3 : 0.5 }}
          >
            <circle cx="2" cy="2" r="1" fill="currentColor" />
            <circle cx="6" cy="2" r="1" fill="currentColor" />
            <circle cx="2" cy="6" r="1" fill="currentColor" />
            <circle cx="6" cy="6" r="1" fill="currentColor" />
          </svg>
          <span>{title}</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Pin/Unpin Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              bringToFront();
              togglePin();
            }}
            title={panelState.isPinned ? 'Unpin panel' : 'Pin panel position'}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 4px',
              borderRadius: '3px',
              fontSize: '12px',
              color: panelState.isPinned ? '#155724' : '#666',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!panelState.isPinned) {
                e.currentTarget.style.background = '#e9ecef';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            {panelState.isPinned ? 
              <Pin size={14} fill="currentColor" strokeWidth={2} /> : 
              <Pin size={14} fill="none" strokeWidth={1} />
            }
          </button>

          {/* Collapse/Expand Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              bringToFront();
              toggleCollapse();
            }}
            title={panelState.isCollapsed ? 'Expand panel' : 'Collapse panel'}
            style={iconButtonStyle}
            onMouseEnter={(e) => e.currentTarget.style.background = '#e9ecef'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            {panelState.isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>
      
      {!panelState.isCollapsed && (
        <div style={contentStyle}>
          {children}
        </div>
      )}
    </div>
  );
};
