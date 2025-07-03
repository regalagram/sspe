import React from 'react';
import { useMobileDetection, getButtonSize } from '../hooks/useMobileDetection';

interface PluginButtonProps {
  icon: React.ReactNode;
  text: string;
  color: string; // background color
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  fullWidth?: boolean;
}

export const PluginButton: React.FC<PluginButtonProps> = ({
  icon,
  text,
  color,
  active = false,
  disabled = false,
  onClick,
  fullWidth = false,
}) => {
  const { isMobile, isTablet } = useMobileDetection();
  
  // Calcular tamaños responsivos
  const buttonHeight = getButtonSize(isMobile, isTablet);
  const fontSize = isMobile ? 14 : 12;
  const padding = isMobile ? '8px 24px' : '4px 20px';
  const borderRadius = isMobile ? 24 : 18;

  // Handle touch events for better mobile support
  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return;
    onClick?.();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (disabled) return;
    
    e.preventDefault();
    e.stopPropagation();
    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      onTouchEnd={isMobile ? handleTouchEnd : undefined}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding,
        minHeight: buttonHeight,
        background: active ? color : '#f5f5f5',
        color: active ? 'white' : color,
        border: 'none',
        borderRadius: `${borderRadius}px`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: `${fontSize}px`,
        fontWeight: 800,
        opacity: disabled ? 0.6 : 1,
        boxShadow: active ? '0 2px 8px rgba(0,0,0,0.08)' : undefined,
        transition: 'all 0.2s',
        outline: active ? `2px solid ${color}` : 'none',
        width: fullWidth ? '100%' : 'auto',
        touchAction: 'manipulation', // Mejorar respuesta táctil
        WebkitTapHighlightColor: 'rgba(0,0,0,0.1)', // Subtle tap highlight for iOS
      }}
      title={text}
      type="button"
    >
      {icon}
      {text}
    </button>
  );
};
