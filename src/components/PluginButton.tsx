import React from 'react';

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
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '4px 20px',
        background: active ? color : '#f5f5f5',
        color: active ? 'white' : color,
        border: 'none',
        borderRadius: '18px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '12px',
        fontWeight: 800,
        opacity: disabled ? 0.6 : 1,
        boxShadow: active ? '0 2px 8px rgba(0,0,0,0.08)' : undefined,
        transition: 'all 0.2s',
        outline: active ? `2px solid ${color}` : 'none',
        width: fullWidth ? '100%' : 'auto',
      }}
      title={text}
      type="button"
    >
      {icon}
      {text}
    </button>
  );
};
