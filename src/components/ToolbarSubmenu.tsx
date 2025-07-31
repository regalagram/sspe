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
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const submenuWidth = 180;
      
      // Position relative to the trigger button based on position prop
      const top = position === 'top' 
        ? triggerRect.top - 8 - 200 // Approximate height of submenu
        : triggerRect.bottom + 8;
      
      // Center horizontally on the trigger
      let left = triggerRect.left + (triggerRect.width / 2) - (submenuWidth / 2);
      
      // Ensure submenu doesn't go off-screen
      const viewportWidth = window.innerWidth;
      const padding = 16;
      
      if (left < padding) {
        left = padding;
      } else if (left + submenuWidth > viewportWidth - padding) {
        left = viewportWidth - submenuWidth - padding;
      }
      
      setSubmenuPosition({ top, left });
    }
  }, [isOpen, position]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (submenuRef.current && !submenuRef.current.contains(event.target as Node)) {
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
    position: 'fixed', // Use fixed for portal
    top: `${submenuPosition.top}px`,
    left: `${submenuPosition.left}px`,
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    zIndex: 99999,
    minWidth: '180px',
    maxWidth: '220px',
    padding: '8px',
    display: isOpen ? 'block' : 'none',
    maxHeight: '300px',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    // Force visibility
    opacity: 1,
    visibility: 'visible',
    pointerEvents: 'auto',
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
    padding: '8px 12px',
    borderRadius: '6px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    backgroundColor: active ? '#e0f2fe' : 'transparent',
    color: disabled ? '#9ca3af' : active ? '#0277bd' : '#374151',
    fontSize: '14px',
    fontWeight: active ? 600 : 400,
    transition: 'all 0.15s ease',
    touchAction: 'manipulation',
    border: 'none',
    width: '100%',
    textAlign: 'left',
    whiteSpace: 'nowrap',
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