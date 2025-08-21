import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMobileDetection } from '../hooks/useMobileDetection';

interface ToolbarSubmenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  position?: 'bottom' | 'top';
}

export const ToolbarSubmenu: React.FC<ToolbarSubmenuProps> = ({
  trigger,
  children,
  isOpen,
  onToggle,
  position = 'bottom'
}) => {
  const submenuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [submenuPosition, setSubmenuPosition] = useState({ top: 0, left: 0 });
  const { isMobile } = useMobileDetection();

  // Calculate submenu position when it opens
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      // Use a small delay to ensure the submenu is rendered in the DOM
      const calculatePosition = () => {
        const triggerRect = triggerRef.current!.getBoundingClientRect();
        const submenuWidth = 180;
        
        // Get actual submenu height from DOM if available, otherwise estimate
        let submenuHeight = 120; // Default fallback
        if (submenuRef.current) {
          submenuHeight = submenuRef.current.offsetHeight;
        } else {
          // More accurate height estimation accounting for different item types
          const visibleChildren = React.Children.toArray(children).filter(child => 
            child != null && Boolean(child)
          );
          // Estimate: 34px per item + extra padding for headers/dividers
          submenuHeight = Math.min(400, visibleChildren.length * 34 + 40);
        }
        
        // Position relative to the trigger button based on position prop
        const top = position === 'top' 
          ? triggerRect.top - 4 - submenuHeight
          : triggerRect.bottom + 4;
        
        // Center horizontally on the trigger
        let left = triggerRect.left + (triggerRect.width / 2) - (submenuWidth / 2);
        
        // Ensure submenu doesn't go off-screen
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const padding = 16;
        
        // Horizontal bounds check
        if (left < padding) {
          left = padding;
        } else if (left + submenuWidth > viewportWidth - padding) {
          left = viewportWidth - submenuWidth - padding;
        }
        
        // Vertical bounds check - if submenu would go off screen, flip position
        let finalTop = top;
        if (position === 'top' && top < padding) {
          // Flip to bottom if not enough space above
          finalTop = triggerRect.bottom + 4;
        } else if (position === 'bottom' && top + submenuHeight > viewportHeight - padding) {
          // Flip to top if not enough space below
          finalTop = triggerRect.top - 4 - submenuHeight;
        }
        
        setSubmenuPosition({ top: finalTop, left });
      };

      // Small delay to ensure DOM is updated
      const timer = setTimeout(calculatePosition, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, position, children]);

  // Recalculate position on window resize or scroll
  useEffect(() => {
    if (!isOpen) return;
    
    const handleReposition = () => {
      if (triggerRef.current) {
        const triggerRect = triggerRef.current.getBoundingClientRect();
        const submenuWidth = 180;
        
        // Get actual submenu height from DOM if available, otherwise estimate
        let submenuHeight = 120; // Default fallback
        if (submenuRef.current) {
          submenuHeight = submenuRef.current.offsetHeight;
        } else {
          // More accurate height estimation accounting for different item types
          const visibleChildren = React.Children.toArray(children).filter(child => 
            child != null && Boolean(child)
          );
          // Estimate: 34px per item + extra padding for headers/dividers
          submenuHeight = Math.min(400, visibleChildren.length * 34 + 40);
        }
        
        const top = position === 'top' 
          ? triggerRect.top - 4 - submenuHeight
          : triggerRect.bottom + 4;
        
        let left = triggerRect.left + (triggerRect.width / 2) - (submenuWidth / 2);
        
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const padding = 16;
        
        if (left < padding) {
          left = padding;
        } else if (left + submenuWidth > viewportWidth - padding) {
          left = viewportWidth - submenuWidth - padding;
        }
        
        let finalTop = top;
        if (position === 'top' && top < padding) {
          finalTop = triggerRect.bottom + 4;
        } else if (position === 'bottom' && top + submenuHeight > viewportHeight - padding) {
          finalTop = triggerRect.top - 4 - submenuHeight;
        }
        
        setSubmenuPosition({ top: finalTop, left });
      }
    };

    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true); // Use capture for all scroll events
    
    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isOpen, position, children]);

  // Recalculate position after submenu is rendered (for more accurate height)
  useEffect(() => {
    if (isOpen && submenuRef.current && triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const submenuWidth = 180;
      const submenuHeight = submenuRef.current.offsetHeight || 350; // Actual DOM height with fallback
      
      const top = position === 'top' 
        ? triggerRect.top - 4 - submenuHeight
        : triggerRect.bottom + 4;
      
      let left = triggerRect.left + (triggerRect.width / 2) - (submenuWidth / 2);
      
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const padding = 16;
      
      if (left < padding) {
        left = padding;
      } else if (left + submenuWidth > viewportWidth - padding) {
        left = viewportWidth - submenuWidth - padding;
      }
      
      let finalTop = top;
      if (position === 'top' && top < padding) {
        finalTop = triggerRect.bottom + 4;
      } else if (position === 'bottom' && top + submenuHeight > viewportHeight - padding) {
        finalTop = triggerRect.top - 4 - submenuHeight;
      }
      
      setSubmenuPosition({ top: finalTop, left });
    }
  }, [isOpen, position]); // Only depend on isOpen and position, not children

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (submenuRef.current && !submenuRef.current.contains(event.target as Node) && 
          triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        if (isOpen) {
          onToggle();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, onToggle]);

  // Always show toolbar submenu (removed mobile-only restriction)

  const submenuStyle: React.CSSProperties = {
    position: 'fixed',
    top: `${submenuPosition.top}px`,
    left: `${submenuPosition.left}px`,
    backgroundColor: 'white',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    zIndex: 99999,
    minWidth: '180px',
    maxWidth: '220px',
    padding: '0px',
    display: isOpen ? 'block' : 'none',
    maxHeight: '400px',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    opacity: 1,
    visibility: 'visible',
    pointerEvents: 'auto',
    userSelect: 'none',
    touchAction: 'manipulation'
  };

  return (
    <>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <div ref={triggerRef} onClick={onToggle} style={{ cursor: 'pointer' }}>
          {trigger}
        </div>
      </div>
      
      {/* Render submenu in a portal to escape overflow constraints */}
      {isOpen && createPortal(
        <div ref={submenuRef} style={submenuStyle}>
          {children}
        </div>,
        document.body
      )}
    </>
  );
};

interface SubmenuItemProps {
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}

export const SubmenuItem: React.FC<SubmenuItemProps> = ({
  icon,
  label,
  onClick,
  disabled = false,
  active = false
}) => {
  const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    borderRadius: '0px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    backgroundColor: active ? '#374151' : 'transparent',
    color: disabled ? '#9ca3af' : active ? 'white' : '#374151',
    fontSize: '14px',
    fontWeight: active ? 600 : 400,
    transition: 'all 0.15s ease',
    touchAction: 'manipulation',
    border: 'none',
    width: '100%',
    textAlign: 'left',
    whiteSpace: 'nowrap',
    opacity: disabled ? 0.5 : 1
  };

  const handleClick = () => {
    if (!disabled) {
      onClick();
    }
  };

  return (
    <button
      style={itemStyle}
      onClick={handleClick}
      disabled={disabled}
      onPointerEnter={(e) => {
        if (!disabled && !active) {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f3f4f6';
        }
      }}
      onPointerLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
        }
      }}
    >
      {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
      <span>{label}</span>
    </button>
  );
};

// Backward compatibility exports
export const MobileToolbarSubmenu = ToolbarSubmenu;
export const MobileSubmenuItem = SubmenuItem;