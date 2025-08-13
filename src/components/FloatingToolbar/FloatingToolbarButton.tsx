import React, { useState } from 'react';
import { MoreVertical, ChevronDown } from 'lucide-react';
import { ToolbarAction, DropdownOption } from '../../types/floatingToolbar';
import { useMobileDetection } from '../../hooks/useMobileDetection';

interface FloatingToolbarButtonProps {
  action: ToolbarAction;
  size?: number;
  compact?: boolean;
}

export const FloatingToolbarButton: React.FC<FloatingToolbarButtonProps> = ({
  action,
  size,
  compact = false
}) => {
  const { isMobile, isTablet } = useMobileDetection();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  const isMobileDevice = isMobile || isTablet;
  const buttonSize = size || (isMobileDevice ? 44 : 32);
  const iconSize = Math.floor(buttonSize * 0.5);

  const buttonStyle: React.CSSProperties = {
    width: `${buttonSize}px`,
    height: `${buttonSize}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: getButtonBackground(),
    color: getButtonColor(),
    border: action.destructive ? '1px solid #ef4444' : '1px solid #e5e7eb',
    borderRadius: '6px',
    cursor: action.disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s ease',
    position: 'relative',
    opacity: action.disabled ? 0.5 : 1,
    touchAction: 'manipulation'
  };

  function getButtonBackground(): string {
    if (action.disabled) return '#f9fafb';
    if (action.type === 'toggle' && action.toggle?.isActive()) return '#374151';
    if (action.destructive) return '#fef2f2';
    return 'white';
  }

  function getButtonColor(): string {
    if (action.disabled) return '#9ca3af';
    if (action.type === 'toggle' && action.toggle?.isActive()) return 'white';
    if (action.destructive) return '#ef4444';
    return '#374151';
  }

  const handleClick = (e: React.PointerEvent) => {
    if (action.disabled) return;
    
    // Stop propagation only for single touch/click interactions
    // Allow multi-touch gestures to pass through
    e.stopPropagation();

    switch (action.type) {
      case 'button':
        action.action?.();
        break;
      case 'toggle':
        action.toggle?.onToggle();
        break;
      case 'dropdown':
        setShowDropdown(!showDropdown);
        break;
      case 'color':
        setShowColorPicker(!showColorPicker);
        break;
      default:
        action.action?.();
    }
  };

  const handlePointerEnter = (e: React.PointerEvent) => {
    if (!action.disabled && action.type !== 'toggle') {
      (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6';
    }
  };

  const handlePointerLeave = (e: React.PointerEvent) => {
    if (!action.disabled && action.type !== 'toggle') {
      (e.currentTarget as HTMLButtonElement).style.background = getButtonBackground();
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        style={buttonStyle}
        onPointerDown={handleClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        disabled={action.disabled}
        title={action.tooltip || action.label}
        aria-label={action.label}
      >
        <action.icon size={iconSize} />
        {action.type === 'dropdown' && (
          <ChevronDown 
            size={iconSize * 0.6} 
            style={{ 
              marginLeft: '2px',
              transform: showDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }} 
          />
        )}
      </button>

      {/* Dropdown Menu */}
      {showDropdown && action.dropdown && (
        <div
          style={{
            position: 'absolute',
            top: `${buttonSize + 4}px`,
            left: '0',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            zIndex: 1001,
            minWidth: '150px',
            maxWidth: '250px'
          }}
          onPointerLeave={() => setShowDropdown(false)}
        >
          {action.dropdown.options.map(option => (
            <DropdownItem 
              key={option.id} 
              option={option} 
              onSelect={() => {
                option.action();
                setShowDropdown(false);
              }}
            />
          ))}
        </div>
      )}

      {/* Color Picker */}
      {showColorPicker && action.color && (
        <div
          style={{
            position: 'absolute',
            top: `${buttonSize + 4}px`,
            left: '0',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            zIndex: 1001,
            padding: '8px'
          }}
          onPointerLeave={() => setShowColorPicker(false)}
        >
          <ColorPickerContent 
            currentColor={action.color.currentColor}
            onChange={(color) => {
              action.color?.onChange(color);
              setShowColorPicker(false);
            }}
          />
        </div>
      )}
    </div>
  );
};

interface DropdownItemProps {
  option: DropdownOption;
  onSelect: () => void;
}

const DropdownItem: React.FC<DropdownItemProps> = ({ option, onSelect }) => {
  const handlePointerEnter = (e: React.PointerEvent) => {
    if (!option.disabled) {
      (e.currentTarget as HTMLDivElement).style.background = '#f3f4f6';
    }
  };

  const handlePointerLeave = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLDivElement).style.background = 'transparent';
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 12px',
        cursor: option.disabled ? 'not-allowed' : 'pointer',
        opacity: option.disabled ? 0.5 : 1,
        fontSize: '14px',
        color: '#374151',
        transition: 'background 0.15s ease'
      }}
      onPointerDown={option.disabled ? undefined : onSelect}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      {option.icon && (
        <div style={{ marginRight: '8px' }}>
          <option.icon size={16} />
        </div>
      )}
      <span>{option.label}</span>
    </div>
  );
};

interface ColorPickerContentProps {
  currentColor: string;
  onChange: (color: string) => void;
}

const ColorPickerContent: React.FC<ColorPickerContentProps> = ({ currentColor, onChange }) => {
  const commonColors = [
    '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
    '#ffff00', '#ff00ff', '#00ffff', '#ff8800', '#8800ff',
    '#374151', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb'
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
      {commonColors.map(color => (
        <button
          key={color}
          style={{
            width: '24px',
            height: '24px',
            background: color,
            border: currentColor === color ? '2px solid #374151' : '1px solid #e5e7eb',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'transform 0.1s ease'
          }}
          onPointerDown={() => onChange(color)}
          onPointerEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
          }}
          onPointerLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          }}
        />
      ))}
    </div>
  );
};