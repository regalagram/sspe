import React from 'react';

interface PluginButtonProps {
  icon: React.ReactNode;
  text: string;
  color: string; // background color
  active?: boolean;
  disabled?: boolean;
  onPointerDown?: () => void;
  fullWidth?: boolean;
  tooltip?: string; // Custom tooltip text
}

export const PluginButton: React.FC<PluginButtonProps> = ({
  icon,
  text,
  color,
  active = false,
  disabled = false,
  onPointerDown,
  fullWidth = false,
  tooltip,
}) => {
  // Fixed sizes for desktop
  const buttonHeight = 32;
  const fontSize = 12;
  const padding = '4px 20px';
  const borderRadius = 18;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    onPointerDown?.();
  };

  return (
    <button
      onPointerDown={handlePointerDown}
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
        transition: 'all 0.2s',
        outline: 'none',
        width: fullWidth ? '100%' : 'auto',
        userSelect: 'none',
      }}
      title={tooltip || text}
      type="button"
    >
      {icon}
      {text}
    </button>
  );
};
