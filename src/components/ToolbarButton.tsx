import React from 'react';
import { useMobileDetection } from '../hooks/useMobileDetection';

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label?: string; // Optional single letter or short text
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  color?: string;
  size?: 'small' | 'medium' | 'large';
  title?: string; // Tooltip text
}

export const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  icon,
  label,
  onClick,
  disabled = false,
  active = false,
  color = '#007acc',
  size = 'medium',
  title
}) => {
  const { isMobile, isTablet } = useMobileDetection();
  const isMobileDevice = isMobile || isTablet;

  const sizes = {
    small: isMobileDevice ? 32 : 28,
    medium: isMobileDevice ? 40 : 32,
    large: isMobileDevice ? 48 : 40
  };

  const buttonSize = sizes[size];
  const iconSize = Math.floor(buttonSize * 0.45);
  const fontSize = Math.floor(buttonSize * 0.25);

  const buttonStyle: React.CSSProperties = {
    width: `${buttonSize}px`,
    height: `${buttonSize}px`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    borderRadius: isMobileDevice ? '8px' : '6px',
    background: active ? color : 'white',
    color: active ? 'white' : (disabled ? '#9ca3af' : color),
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s ease',
    gap: '1px',
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
    outline: 'none',
    position: 'relative',
    overflow: 'hidden'
  };

  const handlePointerDown = () => {
    if (!disabled) {
      onClick();
    }
  };

  const handlePointerEnter = (e: React.PointerEvent) => {
    if (!disabled && !active) {
      (e.currentTarget as HTMLButtonElement).style.background = `${color}10`;
    }
  };

  const handlePointerLeave = (e: React.PointerEvent) => {
    if (!active) {
      (e.currentTarget as HTMLButtonElement).style.background = 'white';
    }
  };

  return (
    <button
      style={buttonStyle}
      onPointerDown={handlePointerDown}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      disabled={disabled}
      title={title}
      aria-label={title}
    >
      <div style={{ 
        width: `${iconSize}px`, 
        height: `${iconSize}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {React.cloneElement(icon as React.ReactElement, { 
          size: iconSize
        } as any)}
      </div>
      {label && (
        <div style={{
          fontSize: `${fontSize}px`,
          fontWeight: 600,
          lineHeight: 1,
          marginTop: '1px',
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {label}
        </div>
      )}
    </button>
  );
};

interface ToolbarSeparatorProps {
  height?: number;
}

export const ToolbarSeparator: React.FC<ToolbarSeparatorProps> = ({ 
  height = 32 
}) => {
  return (
    <div style={{
      width: '1px',
      height: `${height}px`,
      background: '#e5e7eb',
      margin: '0 6px', // Reduced margin for more compact spacing
      flexShrink: 0
    }} />
  );
};

interface ToolbarSectionProps {
  children: React.ReactNode;
  title?: string;
}

export const ToolbarSection: React.FC<ToolbarSectionProps> = ({ 
  children, 
  title 
}) => {
  return (
    <div 
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '2px', // Reduced gap within sections
        flexShrink: 0
      }}
      title={title}
    >
      {children}
    </div>
  );
};

// Backward compatibility exports
export const MobileToolbarButton = ToolbarButton;
export const MobileToolbarSeparator = ToolbarSeparator;
export const MobileToolbarSection = ToolbarSection;