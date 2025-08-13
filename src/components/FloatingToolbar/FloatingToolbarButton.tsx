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
  const [showInputField, setShowInputField] = useState(false);
  const [inputValue, setInputValue] = useState(action.input?.currentValue?.toString() || '');
  
  // Check if this is a complex stroke action (has strokeOptions)
  const isComplexStroke = action.type === 'input' && (action as any).strokeOptions;
  
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
      case 'input':
        setShowInputField(!showInputField);
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
        {action.type === 'input' && (
          <ChevronDown 
            size={iconSize * 0.6} 
            style={{ 
              marginLeft: '2px',
              transform: showInputField ? 'rotate(180deg)' : 'rotate(0deg)',
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

      {/* Input Field */}
      {showInputField && action.input && (
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
            padding: '8px',
            minWidth: '120px'
          }}
          onPointerLeave={() => setShowInputField(false)}
        >
          {isComplexStroke ? (
            <StrokeOptionsContent 
              action={action}
              onClose={() => setShowInputField(false)}
            />
          ) : (
            <InputFieldContent 
              action={action}
              value={inputValue}
              onChange={(value) => {
                setInputValue(value);
                action.input?.onChange(value);
              }}
              onClose={() => setShowInputField(false)}
            />
          )}
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

interface InputFieldContentProps {
  action: ToolbarAction;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}

interface StrokeOptionsContentProps {
  action: ToolbarAction;
  onClose: () => void;
}

const InputFieldContent: React.FC<InputFieldContentProps> = ({ action, value, onChange, onClose }) => {
  const { isMobile, isTablet } = useMobileDetection();
  const isMobileDevice = isMobile || isTablet;
  
  // Predefined stroke width values
  const predefinedValues = [0.5, 1, 2, 4, 6, 8, 12, 16, 20, 24];
  const currentNumericValue = parseFloat(value) || 1;
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handlePredefinedValueClick = (val: number) => {
    onChange(val.toString());
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '12px',
      minWidth: isMobileDevice ? '200px' : '180px',
      padding: '4px'
    }}>
      <label style={{ 
        fontSize: '12px', 
        color: '#6b7280', 
        fontWeight: '500',
        textAlign: 'center'
      }}>
        {action.label}: {currentNumericValue}px
      </label>
      
      {/* Predefined Values */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500' }}>
          Quick Select:
        </div>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(5, 1fr)', 
          gap: '4px' 
        }}>
          {predefinedValues.map(val => (
            <button
              key={val}
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handlePredefinedValueClick(val);
              }}
              style={{
                padding: '6px 4px',
                fontSize: '11px',
                border: currentNumericValue === val ? '2px solid #3b82f6' : '1px solid #d1d5db',
                borderRadius: '4px',
                background: currentNumericValue === val ? '#eff6ff' : 'white',
                color: currentNumericValue === val ? '#3b82f6' : '#374151',
                cursor: 'pointer',
                fontWeight: currentNumericValue === val ? '600' : '400',
                transition: 'all 0.15s ease',
                touchAction: 'manipulation'
              }}
              onPointerEnter={(e) => {
                if (currentNumericValue !== val) {
                  (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6';
                }
              }}
              onPointerLeave={(e) => {
                if (currentNumericValue !== val) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'white';
                }
              }}
            >
              {val}
            </button>
          ))}
        </div>
      </div>

      {/* Slider for mobile, input for desktop */}
      {isMobileDevice ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500' }}>
            Custom Value:
          </div>
          <input
            type="range"
            min="0.5"
            max="30"
            step="0.5"
            value={currentNumericValue}
            onChange={handleSliderChange}
            style={{
              width: '100%',
              height: '6px',
              background: '#e5e7eb',
              borderRadius: '3px',
              outline: 'none',
              cursor: 'pointer',
              touchAction: 'manipulation'
            }}
          />
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            fontSize: '10px', 
            color: '#9ca3af' 
          }}>
            <span>0.5</span>
            <span>30</span>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500' }}>
            Custom Value:
          </div>
          <input
            type={action.input?.type || 'number'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={action.input?.placeholder}
            min="0.1"
            max="100"
            step="0.1"
            style={{
              padding: '6px 8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '14px',
              outline: 'none',
              minWidth: '80px'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#3b82f6';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#d1d5db';
            }}
          />
        </form>
      )}
      
      {/* Close button for mobile */}
      {isMobileDevice && (
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          style={{
            padding: '8px',
            background: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#374151',
            cursor: 'pointer',
            touchAction: 'manipulation'
          }}
        >
          Done
        </button>
      )}
    </div>
  );
};

const StrokeOptionsContent: React.FC<StrokeOptionsContentProps> = ({ action, onClose }) => {
  const { isMobile, isTablet } = useMobileDetection();
  const isMobileDevice = isMobile || isTablet;
  const strokeOptions = (action as any).strokeOptions;
  
  // Get current values from strokeOptions
  const currentWidth = strokeOptions?.getCurrentStrokeWidth?.() || 1;
  const currentDash = strokeOptions?.getCurrentStrokeDash?.() || 'none';
  const currentLinecap = strokeOptions?.getCurrentStrokeLinecap?.() || 'butt';
  const currentLinejoin = strokeOptions?.getCurrentStrokeLinejoin?.() || 'miter';
  
  // Predefined stroke width values
  const predefinedWidths = [0.5, 1, 2, 4, 6, 8, 12, 16, 20, 24];
  
  // Predefined dash patterns
  const dashPatterns = [
    { id: 'none', label: 'Solid', value: 'none', preview: '————————' },
    { id: 'short-dash', label: 'Short Dash', value: '5,5', preview: '— — — —' },
    { id: 'long-dash', label: 'Long Dash', value: '10,5', preview: '——— ———' },
    { id: 'dot', label: 'Dotted', value: '2,3', preview: '• • • • •' },
    { id: 'dash-dot', label: 'Dash Dot', value: '8,3,2,3', preview: '—•—•—•' },
    { id: 'dash-dot-dot', label: 'Dash Dot Dot', value: '8,3,2,3,2,3', preview: '—••—••' }
  ];
  
  // Line cap options
  const linecapOptions = [
    { id: 'butt', label: 'Butt', value: 'butt' },
    { id: 'round', label: 'Round', value: 'round' },
    { id: 'square', label: 'Square', value: 'square' }
  ];
  
  // Line join options
  const linejoinOptions = [
    { id: 'miter', label: 'Miter', value: 'miter' },
    { id: 'round', label: 'Round', value: 'round' },
    { id: 'bevel', label: 'Bevel', value: 'bevel' }
  ];

  const handleWidthChange = (width: number) => {
    strokeOptions?.onStrokeWidthChange?.(width);
  };

  const handleDashChange = (dashValue: string) => {
    strokeOptions?.onStrokeDashChange?.(dashValue);
  };

  const handleLinecapChange = (linecap: string) => {
    strokeOptions?.onStrokeLinecapChange?.(linecap);
  };

  const handleLinejoinChange = (linejoin: string) => {
    strokeOptions?.onStrokeLinejoinChange?.(linejoin);
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '16px',
      minWidth: isMobileDevice ? '280px' : '260px',
      maxWidth: '320px',
      padding: '8px'
    }}>
      <div style={{ 
        fontSize: '14px', 
        fontWeight: '600',
        color: '#374151',
        textAlign: 'center',
        borderBottom: '1px solid #e5e7eb',
        paddingBottom: '8px'
      }}>
        Stroke Options
      </div>
      
      {/* Stroke Width Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
          Width: {currentWidth}px
        </div>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(5, 1fr)', 
          gap: '4px' 
        }}>
          {predefinedWidths.map(width => (
            <button
              key={width}
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleWidthChange(width);
              }}
              style={{
                padding: '6px 4px',
                fontSize: '10px',
                border: currentWidth === width ? '2px solid #3b82f6' : '1px solid #d1d5db',
                borderRadius: '4px',
                background: currentWidth === width ? '#eff6ff' : 'white',
                color: currentWidth === width ? '#3b82f6' : '#374151',
                cursor: 'pointer',
                fontWeight: currentWidth === width ? '600' : '400',
                touchAction: 'manipulation'
              }}
            >
              {width}
            </button>
          ))}
        </div>
      </div>

      {/* Stroke Dash Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
          Dash Pattern
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {dashPatterns.map(pattern => (
            <button
              key={pattern.id}
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDashChange(pattern.value);
              }}
              style={{
                padding: '8px 12px',
                fontSize: '11px',
                border: currentDash === pattern.value ? '2px solid #3b82f6' : '1px solid #d1d5db',
                borderRadius: '4px',
                background: currentDash === pattern.value ? '#eff6ff' : 'white',
                color: currentDash === pattern.value ? '#3b82f6' : '#374151',
                cursor: 'pointer',
                fontWeight: currentDash === pattern.value ? '600' : '400',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                touchAction: 'manipulation'
              }}
            >
              <span>{pattern.label}</span>
              <span style={{ fontFamily: 'monospace', fontSize: '10px' }}>{pattern.preview}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Line Cap Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
          Line Cap
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {linecapOptions.map(option => (
            <button
              key={option.id}
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleLinecapChange(option.value);
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '10px',
                border: currentLinecap === option.value ? '2px solid #3b82f6' : '1px solid #d1d5db',
                borderRadius: '4px',
                background: currentLinecap === option.value ? '#eff6ff' : 'white',
                color: currentLinecap === option.value ? '#3b82f6' : '#374151',
                cursor: 'pointer',
                fontWeight: currentLinecap === option.value ? '600' : '400',
                touchAction: 'manipulation'
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Line Join Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
          Line Join
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {linejoinOptions.map(option => (
            <button
              key={option.id}
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleLinejoinChange(option.value);
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '10px',
                border: currentLinejoin === option.value ? '2px solid #3b82f6' : '1px solid #d1d5db',
                borderRadius: '4px',
                background: currentLinejoin === option.value ? '#eff6ff' : 'white',
                color: currentLinejoin === option.value ? '#3b82f6' : '#374151',
                cursor: 'pointer',
                fontWeight: currentLinejoin === option.value ? '600' : '400',
                touchAction: 'manipulation'
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Close button for mobile */}
      {isMobileDevice && (
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          style={{
            padding: '10px',
            background: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#374151',
            cursor: 'pointer',
            fontWeight: '500',
            touchAction: 'manipulation'
          }}
        >
          Done
        </button>
      )}
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