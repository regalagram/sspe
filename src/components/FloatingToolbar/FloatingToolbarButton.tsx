import React, { useState, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';
import { ToolbarAction, DropdownOption } from '../../types/floatingToolbar';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { createLinearGradient, createRadialGradient, createGradientStop } from '../../utils/gradient-utils';
import { useEditorStore } from '../../store/editorStore';
import { parseColorWithOpacity } from '../../utils/color-utils';

interface FloatingToolbarButtonProps {
  action: ToolbarAction;
  size?: number;
  compact?: boolean;
  isSubmenuOpen?: boolean;
  onSubmenuToggle?: () => void;
}

export const FloatingToolbarButton: React.FC<FloatingToolbarButtonProps> = ({
  action,
  size,
  compact = false,
  isSubmenuOpen = false,
  onSubmenuToggle
}) => {
  const { isMobile, isTablet } = useMobileDetection();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showInputField, setShowInputField] = useState(false);
  const [inputValue, setInputValue] = useState(action.input?.currentValue?.toString() || '');
  
  // Check if this is a complex stroke action (has strokeOptions)
  const isComplexStroke = action.type === 'input' && (action as any).strokeOptions;
  
  // Check if this is an opacity action (has opacityOptions)
  const isOpacityControl = action.type === 'input' && (action as any).opacityOptions;
  
  const isMobileDevice = isMobile || isTablet;
  const buttonSize = size || (isMobileDevice ? 44 : 32);
  const iconSize = isMobileDevice ? 12 : 13; // Fixed icon sizes: 12px mobile, 13px desktop

  // Helper function to close submenu
  const closeSubmenu = () => {
    if (onSubmenuToggle && isSubmenuOpen) {
      onSubmenuToggle();
    } else {
      // Fallback to local state for backwards compatibility
      setShowDropdown(false);
      setShowColorPicker(false);
      setShowInputField(false);
    }
  };

  const buttonStyle: React.CSSProperties = {
    width: `${buttonSize}px`,
    height: `${buttonSize}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: getButtonBackground(),
    color: getButtonColor(),
    border: 'none',
    borderRadius: '0px',
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
    // Add background feedback when submenu is open (like WritingToolbar)
    if (isSubmenuOpen && (action.type === 'dropdown' || action.type === 'input' || action.type === 'color')) return '#f3f4f6';
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
        if (onSubmenuToggle) {
          onSubmenuToggle();
        } else {
          setShowDropdown(!showDropdown);
        }
        break;
      case 'color':
        if (onSubmenuToggle) {
          onSubmenuToggle();
        } else {
          setShowColorPicker(!showColorPicker);
        }
        break;
      case 'input':
        if (onSubmenuToggle) {
          onSubmenuToggle();
        } else {
          setShowInputField(!showInputField);
        }
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
      </button>

      {/* Dropdown Menu */}
      {isSubmenuOpen && action.dropdown && (
        <div
          style={{
            position: 'absolute',
            top: `${buttonSize + 4}px`,
            left: '0',
            background: 'white',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            zIndex: 1001,
            minWidth: '150px',
            maxWidth: '250px',
            padding: '0px'
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
                // Also close via external handler if provided
                if (onSubmenuToggle) {
                  onSubmenuToggle();
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Input Field */}
      {isSubmenuOpen && action.input && (
        <div
          style={{
            position: 'absolute',
            top: `${buttonSize + 4}px`,
            left: '0',
            background: 'white',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            zIndex: 1001,
            padding: '0px',
            minWidth: '120px'
          }}
          onPointerLeave={closeSubmenu}
        >
          {isComplexStroke ? (
            <StrokeOptionsContent 
              action={action}
              onClose={closeSubmenu}
            />
          ) : isOpacityControl ? (
            <OpacityOptionsContent 
              action={action}
              onClose={closeSubmenu}
            />
          ) : (
            <InputFieldContent 
              action={action}
              value={inputValue}
              onChange={(value) => {
                setInputValue(value);
                action.input?.onChange(value);
              }}
              onClose={closeSubmenu}
            />
          )}
        </div>
      )}

      {/* Color Picker */}
      {isSubmenuOpen && action.color && (
        <div
          style={{
            position: 'absolute',
            top: `${buttonSize + 4}px`,
            left: '0',
            background: 'white',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            zIndex: 1001,
            padding: '0px'
          }}
          onPointerLeave={isMobileDevice ? undefined : closeSubmenu}
        >
          <ColorPickerContent 
            currentColor={action.color.currentColor}
            onChange={(color) => {
              action.color?.onChange(color);
              closeSubmenu();
            }}
            actionId={action.id}
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
  const { isMobile, isTablet } = useMobileDetection();
  const isMobileDevice = isMobile || isTablet;
  
  // Evaluate disabled state - could be boolean or function
  const isDisabled = typeof option.disabled === 'function' ? option.disabled() : !!option.disabled;
  
  // Evaluate active state - could be boolean or function  
  const isActive = typeof option.active === 'function' ? option.active() : !!option.active;
  
  const handlePointerEnter = (e: React.PointerEvent) => {
    if (!isDisabled) {
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
        padding: '6px 12px',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.5 : 1,
        fontSize: '14px',
        color: isActive ? '#1f2937' : '#374151',
        fontWeight: isActive ? '600' : '400',
        transition: 'background 0.15s ease'
      }}
      onPointerDown={isDisabled ? undefined : onSelect}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      {option.icon && (
        <div style={{ marginRight: '8px' }}>
          <option.icon size={isMobileDevice ? 12 : 13} />
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

interface OpacityOptionsContentProps {
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
      padding: '6px 12px'
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
                borderRadius: '0px',
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
              borderRadius: '0px',
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
  const currentFillRule = strokeOptions?.getCurrentFillRule?.() || 'nonzero';
  const currentStrokeOpacity = strokeOptions?.getCurrentStrokeOpacity?.() || 1;
  
  // Compact stroke width values - reduced set
  const predefinedWidths = [0.5, 1, 2, 4, 8, 16];
  
  // Compact dash patterns - visual icons instead of text
  const dashPatterns = [
    { id: 'none', label: '—', value: 'none', title: 'Solid' },
    { id: 'short-dash', label: '- -', value: '5,5', title: 'Short Dash' },
    { id: 'long-dash', label: '— —', value: '10,5', title: 'Long Dash' },
    { id: 'dot', label: '• •', value: '2,3', title: 'Dotted' },
    { id: 'dash-dot', label: '—•', value: '8,3,2,3', title: 'Dash Dot' }
  ];
  
  // Compact cap/join options - single letters
  const linecapOptions = [
    { id: 'butt', label: 'B', value: 'butt', title: 'Butt' },
    { id: 'round', label: 'R', value: 'round', title: 'Round' },
    { id: 'square', label: 'S', value: 'square', title: 'Square' }
  ];
  
  const linejoinOptions = [
    { id: 'miter', label: 'M', value: 'miter', title: 'Miter' },
    { id: 'round', label: 'R', value: 'round', title: 'Round' },
    { id: 'bevel', label: 'B', value: 'bevel', title: 'Bevel' }
  ];

  // Fill Rule options
  const fillRuleOptions = [
    { id: 'nonzero', label: 'NZ', value: 'nonzero', title: 'Non-zero' },
    { id: 'evenodd', label: 'EO', value: 'evenodd', title: 'Even-odd' }
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

  const handleFillRuleChange = (fillRule: string) => {
    strokeOptions?.onFillRuleChange?.(fillRule);
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '8px',
      minWidth: isMobileDevice ? '180px' : '160px',
      maxWidth: '200px',
      padding: '6px 12px'
    }}>
      {/* Header - more compact */}
      <div style={{ 
        fontSize: '11px', 
        fontWeight: '600',
        color: '#374151',
        textAlign: 'center',
        marginBottom: '2px'
      }}>
        Stroke: {currentWidth}px
      </div>
      
      {/* Stroke Width - single row */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(6, 1fr)', 
        gap: '2px' 
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
              padding: '4px 2px',
              fontSize: '9px',
              border: currentWidth === width ? '2px solid #3b82f6' : '1px solid #d1d5db',
              borderRadius: '0px',
              background: currentWidth === width ? '#eff6ff' : 'white',
              color: currentWidth === width ? '#3b82f6' : '#374151',
              cursor: 'pointer',
              fontWeight: currentWidth === width ? '600' : '400',
              touchAction: 'manipulation',
              minHeight: '24px'
            }}
            title={`${width}px`}
          >
            {width}
          </button>
        ))}
      </div>

      {/* Dash Pattern - horizontal row */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '2px'
      }}>
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
              padding: '4px 2px',
              fontSize: '8px',
              border: currentDash === pattern.value ? '2px solid #3b82f6' : '1px solid #d1d5db',
              borderRadius: '0px',
              background: currentDash === pattern.value ? '#eff6ff' : 'white',
              color: currentDash === pattern.value ? '#3b82f6' : '#374151',
              cursor: 'pointer',
              fontWeight: currentDash === pattern.value ? '600' : '400',
              touchAction: 'manipulation',
              fontFamily: 'monospace',
              minHeight: '24px'
            }}
            title={pattern.title}
          >
            {pattern.label}
          </button>
        ))}
      </div>

      {/* Cap & Join - combined in single row */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {/* Line Cap */}
        <div style={{ flex: 1, display: 'flex', gap: '2px' }}>
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
                padding: '4px 2px',
                fontSize: '9px',
                border: currentLinecap === option.value ? '2px solid #3b82f6' : '1px solid #d1d5db',
                borderRadius: '0px',
                background: currentLinecap === option.value ? '#eff6ff' : 'white',
                color: currentLinecap === option.value ? '#3b82f6' : '#374151',
                cursor: 'pointer',
                fontWeight: currentLinecap === option.value ? '600' : '400',
                touchAction: 'manipulation',
                minHeight: '24px'
              }}
              title={`Cap: ${option.title}`}
            >
              {option.label}
            </button>
          ))}
        </div>
        
        {/* Divider */}
        <div style={{ width: '1px', background: '#e5e7eb', margin: '2px 0' }} />
        
        {/* Line Join */}
        <div style={{ flex: 1, display: 'flex', gap: '2px' }}>
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
                padding: '4px 2px',
                fontSize: '9px',
                border: currentLinejoin === option.value ? '2px solid #3b82f6' : '1px solid #d1d5db',
                borderRadius: '0px',
                background: currentLinejoin === option.value ? '#eff6ff' : 'white',
                color: currentLinejoin === option.value ? '#3b82f6' : '#374151',
                cursor: 'pointer',
                fontWeight: currentLinejoin === option.value ? '600' : '400',
                touchAction: 'manipulation',
                minHeight: '24px'
              }}
              title={`Join: ${option.title}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fill Rule - only show if fillRule options are available */}
      {strokeOptions?.getCurrentFillRule && strokeOptions?.onFillRuleChange && (
        <div style={{ display: 'flex', gap: '2px' }}>
          <div style={{ 
            fontSize: '9px', 
            color: '#6b7280', 
            alignSelf: 'center',
            minWidth: '25px',
            fontWeight: '500'
          }}>
            Rule:
          </div>
          <div style={{ display: 'flex', gap: '2px', flex: 1 }}>
            {fillRuleOptions.map(option => (
              <button
                key={option.id}
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleFillRuleChange(option.value);
                }}
                style={{
                  flex: 1,
                  padding: '4px 2px',
                  fontSize: '9px',
                  border: currentFillRule === option.value ? '2px solid #3b82f6' : '1px solid #d1d5db',
                  borderRadius: '0px',
                  background: currentFillRule === option.value ? '#eff6ff' : 'white',
                  color: currentFillRule === option.value ? '#3b82f6' : '#374151',
                  cursor: 'pointer',
                  fontWeight: currentFillRule === option.value ? '600' : '400',
                  touchAction: 'manipulation',
                  minHeight: '24px'
                }}
                title={`Fill Rule: ${option.title}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
      
      
      {/* Close button for mobile - more compact */}
      {isMobileDevice && (
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          style={{
            padding: '6px',
            background: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '0px',
            fontSize: '10px',
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

const OpacityOptionsContent: React.FC<OpacityOptionsContentProps> = ({ action, onClose }) => {
  const { isMobile, isTablet } = useMobileDetection();
  const isMobileDevice = isMobile || isTablet;
  const opacityOptions = (action as any).opacityOptions;
  
  // Get current values from opacityOptions
  const currentOpacity = opacityOptions?.getCurrentOpacity?.() || 100;
  const quickValues = opacityOptions?.quickValues || [0, 25, 50, 75, 100];
  const unit = opacityOptions?.unit || '%';
  
  return (
    <div style={{ padding: '8px', width: '160px' }}>
      {/* Quick select buttons */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500', marginBottom: '6px' }}>
          Quick Select:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {quickValues.map((value: number) => (
            <button
              key={value}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                opacityOptions?.onOpacityChange?.(value);
                if (!isMobileDevice) onClose();
              }}
              style={{
                padding: '4px 8px',
                fontSize: '10px',
                border: '1px solid #d1d5db',
                background: currentOpacity === value ? '#3b82f6' : 'white',
                color: currentOpacity === value ? 'white' : '#374151',
                cursor: 'pointer',
                borderRadius: '4px',
                fontWeight: currentOpacity === value ? '600' : '500',
                minWidth: '32px',
                touchAction: 'manipulation'
              }}
              title={`${value}${unit}`}
            >
              {value}{unit}
            </button>
          ))}
        </div>
      </div>

      {/* Slider */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ 
          fontSize: '11px', 
          color: '#9ca3af', 
          fontWeight: '500', 
          marginBottom: '6px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>Custom Value:</span>
          <span style={{ fontWeight: '600', color: '#374151' }}>{Math.round(currentOpacity)}{unit}</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={Math.round(currentOpacity)}
          onChange={(e) => {
            const value = parseInt(e.target.value);
            opacityOptions?.onOpacityChange?.(value);
          }}
          style={{
            width: '100%',
            height: '6px',
            background: '#e5e7eb',
            borderRadius: '0px',
            outline: 'none',
            cursor: 'pointer',
            touchAction: 'manipulation'
          }}
        />
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          fontSize: '10px', 
          color: '#9ca3af',
          marginTop: '4px'
        }}>
          <span>0{unit}</span>
          <span>100{unit}</span>
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
            width: '100%',
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

interface ColorPickerContentProps {
  currentColor: string | any; // Can be string color or GradientOrPattern object
  onChange: (color: string | any) => void; // Can return string color or GradientOrPattern object
  actionId?: string; // Add action ID to determine context
}

const ColorPickerContent: React.FC<ColorPickerContentProps> = ({ currentColor, onChange, actionId }) => {
  const { isMobile, isTablet } = useMobileDetection();
  const isMobileDevice = isMobile || isTablet;

  // Import the store to get real-time data
  const { paths, texts, images, uses, selection } = useEditorStore();

  // Get the actual current style value dynamically
  const getCurrentStyleValue = (): any => {
    // Determine if we're dealing with fill or stroke based on action ID
    const isStroke = actionId?.includes('stroke') || false;
    
    // Check if we're dealing with subpaths specifically
    const isSubpathAction = actionId?.includes('subpath');
    
    // Get currently selected elements
    const selectedPaths = selection.selectedPaths.map(id => paths.find(p => p.id === id)).filter(Boolean);
    const selectedTexts = selection.selectedTexts.map(id => texts.find(t => t.id === id)).filter(Boolean);
    const selectedImages = selection.selectedImages.map(id => images.find(img => img.id === id)).filter(Boolean);
    const selectedUses = selection.selectedUses.map(id => uses.find(u => u.id === id)).filter(Boolean);
    
    // Handle subpath selection
    if (isSubpathAction && selection.selectedSubPaths.length > 0) {
      // Find the path that contains the selected subpath
      for (const subPathId of selection.selectedSubPaths) {
        for (const path of paths) {
          const foundSubPath = path.subPaths.find(sp => sp.id === subPathId);
          if (foundSubPath) {
            const styleValue = isStroke ? path.style.stroke : path.style.fill;
            return styleValue;
          }
        }
      }
    }
    
    // Check paths
    if (selectedPaths.length > 0) {
      const firstPath = selectedPaths[0];
      const styleValue = isStroke ? firstPath?.style?.stroke : firstPath?.style?.fill;
      return styleValue;
    }
    
    // Check texts
    if (selectedTexts.length > 0) {
      const firstText = selectedTexts[0];
      const styleValue = isStroke ? firstText?.style?.stroke : firstText?.style?.fill;
      return styleValue;
    }
    
    // Check images
    if (selectedImages.length > 0) {
      const firstImage = selectedImages[0];
      const styleValue = isStroke ? firstImage?.style?.stroke : firstImage?.style?.fill;
      return styleValue;
    }
    
    // Check uses
    if (selectedUses.length > 0) {
      const firstUse = selectedUses[0];
      const styleValue = isStroke ? firstUse?.style?.stroke : firstUse?.style?.fill;
      return styleValue;
    }
    
    return currentColor; // fallback
  };

  // Get the current opacity value from the selected elements
  const getCurrentOpacity = (): number => {
    // Determine if we're dealing with fill or stroke based on action ID
    const isStroke = actionId?.includes('stroke') || false;
    
    // Check if we're dealing with subpaths specifically
    const isSubpathAction = actionId?.includes('subpath');
    
    // Get currently selected elements
    const selectedPaths = selection.selectedPaths.map(id => paths.find(p => p.id === id)).filter(Boolean);
    const selectedTexts = selection.selectedTexts.map(id => texts.find(t => t.id === id)).filter(Boolean);
    const selectedImages = selection.selectedImages.map(id => images.find(img => img.id === id)).filter(Boolean);
    const selectedUses = selection.selectedUses.map(id => uses.find(u => u.id === id)).filter(Boolean);
    
    let opacityValue: number | undefined = undefined;
    let colorValue: string | any = undefined;
    
    // Helper function to extract opacity from color or style
    const extractOpacityFromElement = (element: any) => {
      const color = isStroke ? element?.style?.stroke : element?.style?.fill;
      const explicitOpacity = isStroke ? element?.style?.strokeOpacity : element?.style?.fillOpacity;
      
      // First check if there's an explicit opacity value
      if (explicitOpacity !== undefined) {
        return explicitOpacity;
      }
      
      // Then check if the color itself contains opacity (RGBA, HSLA)
      if (typeof color === 'string') {
        const parsed = parseColorWithOpacity(color);
        if (parsed.opacity !== undefined) {
          return parsed.opacity;
        }
      }
      
      return undefined;
    };
    
    // Handle subpath selection
    if (isSubpathAction && selection.selectedSubPaths.length > 0) {
      // Find the path that contains the selected subpath
      for (const subPathId of selection.selectedSubPaths) {
        for (const path of paths) {
          const foundSubPath = path.subPaths.find(sp => sp.id === subPathId);
          if (foundSubPath) {
            opacityValue = extractOpacityFromElement(path);
            break;
          }
        }
        if (opacityValue !== undefined) break;
      }
    }
    
    // Check paths if no opacity found yet
    if (opacityValue === undefined && selectedPaths.length > 0) {
      const firstPath = selectedPaths[0];
      opacityValue = extractOpacityFromElement(firstPath);
    }
    
    // Check texts if no opacity found yet
    if (opacityValue === undefined && selectedTexts.length > 0) {
      const firstText = selectedTexts[0];
      opacityValue = extractOpacityFromElement(firstText);
    }
    
    // Check images if no opacity found yet
    if (opacityValue === undefined && selectedImages.length > 0) {
      const firstImage = selectedImages[0];
      opacityValue = extractOpacityFromElement(firstImage);
    }
    
    // Check uses if no opacity found yet
    if (opacityValue === undefined && selectedUses.length > 0) {
      const firstUse = selectedUses[0];
      opacityValue = extractOpacityFromElement(firstUse);
    }
    
    // Return the found opacity value or default to 1 (fully opaque)
    return opacityValue !== undefined ? opacityValue : 1;
  };

  // Analyze opacity state for dual slider system
  const getOpacityState = () => {
    const isStroke = actionId?.includes('stroke') || false;
    const isSubpathAction = actionId?.includes('subpath');
    
    // Get currently selected elements
    const selectedPaths = selection.selectedPaths.map(id => paths.find(p => p.id === id)).filter(Boolean);
    const selectedTexts = selection.selectedTexts.map(id => texts.find(t => t.id === id)).filter(Boolean);
    const selectedImages = selection.selectedImages.map(id => images.find(img => img.id === img.id)).filter(Boolean);
    const selectedUses = selection.selectedUses.map(id => uses.find(u => u.id === id)).filter(Boolean);
    
    let hasRGBAOpacity = false;
    let hasExplicitOpacity = false;
    let rgbaOpacity = 1;
    let explicitOpacity = 1;
    
    // Helper function to analyze element opacity
    const analyzeElementOpacity = (element: any) => {
      const color = isStroke ? element?.style?.stroke : element?.style?.fill;
      const explicitOp = isStroke ? element?.style?.strokeOpacity : element?.style?.fillOpacity;
      
      // Check for explicit opacity
      if (explicitOp !== undefined) {
        hasExplicitOpacity = true;
        explicitOpacity = explicitOp;
      }
      
      // Check for embedded RGBA/HSLA opacity
      if (typeof color === 'string') {
        const parsed = parseColorWithOpacity(color);
        if (parsed.opacity !== undefined) {
          hasRGBAOpacity = true;
          rgbaOpacity = parsed.opacity;
        }
      }
    };
    
    // Analyze all selected elements
    if (isSubpathAction && selection.selectedSubPaths.length > 0) {
      for (const subPathId of selection.selectedSubPaths) {
        for (const path of paths) {
          const foundSubPath = path.subPaths.find(sp => sp.id === subPathId);
          if (foundSubPath) {
            analyzeElementOpacity(path);
            break;
          }
        }
      }
    }
    
    selectedPaths.forEach(analyzeElementOpacity);
    selectedTexts.forEach(analyzeElementOpacity);
    selectedImages.forEach(analyzeElementOpacity);
    selectedUses.forEach(analyzeElementOpacity);
    
    return { hasRGBAOpacity, hasExplicitOpacity, rgbaOpacity, explicitOpacity };
  };

  // Determine initial tab based on actual current style value
  const getInitialTab = (): 'colors' | 'gradients' | 'patterns' => {
    const actualValue = getCurrentStyleValue();
    
    if (typeof actualValue === 'object' && actualValue && actualValue !== null) {
      if (actualValue.type === 'linear' || actualValue.type === 'radial') {
        return 'gradients';
      } else if (actualValue.type === 'pattern') {
        return 'patterns';
      }
    }
    return 'colors';
  };

  const [activeTab, setActiveTab] = useState<'colors' | 'gradients' | 'patterns'>(getInitialTab());
  const [opacity, setOpacity] = useState<number>(getCurrentOpacity());
  const [rgbaOpacity, setRgbaOpacity] = useState<number>(1);
  const [explicitOpacity, setExplicitOpacity] = useState<number>(1);

  // Update active tab when selection changes
  useEffect(() => {
    const newTab = getInitialTab();
    setActiveTab(newTab);
  }, [selection.selectedPaths, selection.selectedTexts, selection.selectedSubPaths, selection.selectedImages, selection.selectedUses]);

  // Update opacity when selection changes
  useEffect(() => {
    const newOpacity = getCurrentOpacity();
    // Only update if the value is significantly different to avoid unnecessary re-renders
    if (Math.abs(newOpacity - opacity) > 0.01) {
      setOpacity(newOpacity);
    }
    
    // Update dual opacity states
    const opacityState = getOpacityState();
    setRgbaOpacity(opacityState.rgbaOpacity);
    setExplicitOpacity(opacityState.explicitOpacity);
  }, [selection.selectedPaths, selection.selectedTexts, selection.selectedSubPaths, selection.selectedImages, selection.selectedUses, paths, texts, actionId]);

  // Also update when the actual style values change
  useEffect(() => {
    const newOpacity = getCurrentOpacity();
    if (Math.abs(newOpacity - opacity) > 0.01) {
      setOpacity(newOpacity);
    }
    
    // Update dual opacity states
    const opacityState = getOpacityState();
    setRgbaOpacity(opacityState.rgbaOpacity);
    setExplicitOpacity(opacityState.explicitOpacity);
  }, [paths.map(p => `${p.id}-${p.style.fillOpacity}-${p.style.strokeOpacity}`).join(','), 
      texts.map(t => `${t.id}-${t.style?.fillOpacity}-${t.style?.strokeOpacity}`).join(','),
      uses.map(u => `${u.id}-${u.style?.fillOpacity}-${u.style?.strokeOpacity}`).join(',')]);

  // Soft color palette - 70 colors in 10x7 grid
  const softColors = [
    // Neutrals & grays
    '#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b',
    // Soft blues
    '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a', '#172554',
    // Soft greens
    '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d', '#052e16',
    // Soft purples
    '#f3e8ff', '#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7', '#9333ea', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95',
    // Soft pinks
    '#fdf2f8', '#fce7f3', '#fbcfe8', '#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843',
    // Soft oranges
    '#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12',
    // Soft reds
    '#fef2f2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d', '#450a0a'
  ];

  // Working gradients based on GradientControls plugin presets
  const createWorkingGradients = () => {
    const linearPresets = [
      { name: 'Sunset', angle: 90, stops: [{ offset: 0, color: '#ff7b7b' }, { offset: 100, color: '#ff6b35' }] },
      { name: 'Ocean', angle: 135, stops: [{ offset: 0, color: '#667eea' }, { offset: 100, color: '#764ba2' }] },
      { name: 'Forest', angle: 45, stops: [{ offset: 0, color: '#11998e' }, { offset: 100, color: '#38ef7d' }] },
      { name: 'Purple Dream', angle: 180, stops: [{ offset: 0, color: '#c471ed' }, { offset: 100, color: '#f64f59' }] },
      { name: 'Cool Blue', angle: 0, stops: [{ offset: 0, color: '#2193b0' }, { offset: 100, color: '#6dd5ed' }] },
      { name: 'Fire', angle: 45, stops: [{ offset: 0, color: '#ff9a9e' }, { offset: 50, color: '#fecfef' }, { offset: 100, color: '#fecfef' }] },
      { name: 'Warm Flame', angle: 0, stops: [{ offset: 0, color: '#ff9a9e' }, { offset: 100, color: '#fad0c4' }] },
      { name: 'Juicy Peach', angle: 90, stops: [{ offset: 0, color: '#ffecd2' }, { offset: 100, color: '#fcb69f' }] },
      { name: 'Lady Lips', angle: 45, stops: [{ offset: 0, color: '#ff9a9e' }, { offset: 100, color: '#fecfef' }] },
      { name: 'Winter Neva', angle: 135, stops: [{ offset: 0, color: '#a1c4fd' }, { offset: 100, color: '#c2e9fb' }] },
      { name: 'Heavy Rain', angle: 0, stops: [{ offset: 0, color: '#cfd9df' }, { offset: 100, color: '#e2ebf0' }] },
      { name: 'Saint Petersburg', angle: 90, stops: [{ offset: 0, color: '#f5f7fa' }, { offset: 100, color: '#c3cfe2' }] },
      { name: 'Happy Fisher', angle: 45, stops: [{ offset: 0, color: '#89f7fe' }, { offset: 100, color: '#66a6ff' }] },
      { name: 'Fly High', angle: 135, stops: [{ offset: 0, color: '#48c6ef' }, { offset: 100, color: '#6f86d6' }] },
      { name: 'Fresh Milk', angle: 0, stops: [{ offset: 0, color: '#feada6' }, { offset: 100, color: '#f5efef' }] },
      { name: 'Aqua Splash', angle: 90, stops: [{ offset: 0, color: '#13547a' }, { offset: 100, color: '#80d0c7' }] },
      { name: 'Passionate Bed', angle: 135, stops: [{ offset: 0, color: '#ff758c' }, { offset: 100, color: '#ff7eb3' }] },
      { name: 'Mountain Rock', angle: 0, stops: [{ offset: 0, color: '#868f96' }, { offset: 100, color: '#596164' }] },
      { name: 'Desert Hump', angle: 90, stops: [{ offset: 0, color: '#c79081' }, { offset: 100, color: '#dfa579' }] },
      { name: 'Eternal Constance', angle: 45, stops: [{ offset: 0, color: '#09203f' }, { offset: 100, color: '#537895' }] },
      { name: 'Healthy Water', angle: 135, stops: [{ offset: 0, color: '#96deda' }, { offset: 100, color: '#50c9c3' }] },
      { name: 'Vicious Stance', angle: 0, stops: [{ offset: 0, color: '#29323c' }, { offset: 100, color: '#485563' }] },
      { name: 'Night Sky', angle: 90, stops: [{ offset: 0, color: '#1e3c72' }, { offset: 100, color: '#2a5298' }] },
      { name: 'Gentle Care', angle: 45, stops: [{ offset: 0, color: '#ffc3a0' }, { offset: 100, color: '#ffafbd' }] },
      { name: 'Morning Salad', angle: 135, stops: [{ offset: 0, color: '#b7f8db' }, { offset: 100, color: '#50a7c2' }] },
      { name: 'Summer Breeze', angle: 0, stops: [{ offset: 0, color: '#ffeaa7' }, { offset: 100, color: '#fab1a0' }] }
    ];

    const radialPresets = [
      { name: 'Sun', stops: [{ offset: 0, color: '#ffeaa7' }, { offset: 100, color: '#fab1a0' }] },
      { name: 'Moon', stops: [{ offset: 0, color: '#ddd6fe' }, { offset: 100, color: '#818cf8' }] },
      { name: 'Emerald', stops: [{ offset: 0, color: '#d299c2' }, { offset: 100, color: '#fef9d3' }] },
      { name: 'Rose', stops: [{ offset: 0, color: '#ff9a9e' }, { offset: 100, color: '#fad0c4' }] }
    ];

    const createGradientFromPreset = (preset: any, isLinear: boolean = true) => {
      const gradientStops = preset.stops.map((stop: any) => 
        createGradientStop(stop.offset, stop.color, 1)
      );

      if (isLinear) {
        // Convert angle to x1,y1,x2,y2 coordinates (same as in GradientControls)
        const angle = preset.angle || 0;
        const radians = (angle * Math.PI) / 180;
        const x1 = 0.5 + 0.5 * Math.cos(radians + Math.PI);
        const y1 = 0.5 + 0.5 * Math.sin(radians + Math.PI);
        const x2 = 0.5 + 0.5 * Math.cos(radians);
        const y2 = 0.5 + 0.5 * Math.sin(radians);
        
        return createLinearGradient(x1, y1, x2, y2, gradientStops);
      } else {
        return createRadialGradient(0.5, 0.5, 0.5, gradientStops);
      }
    };

    // Create CSS preview for gradients
    const createPreview = (preset: any, isLinear: boolean = true) => {
      const colorStops = preset.stops.map((stop: any) => `${stop.color} ${stop.offset}%`).join(', ');
      if (isLinear) {
        return `linear-gradient(${preset.angle || 0}deg, ${colorStops})`;
      } else {
        return `radial-gradient(circle, ${colorStops})`;
      }
    };

    return [
      ...linearPresets.map(preset => ({
        ...createGradientFromPreset(preset, true),
        preview: createPreview(preset, true),
        name: preset.name
      })),
      ...radialPresets.map(preset => ({
        ...createGradientFromPreset(preset, false),
        preview: createPreview(preset, false),
        name: preset.name
      }))
    ];
  };

  const predefinedGradients = createWorkingGradients();

  // Predefined patterns that match the existing system
  const predefinedPatterns = [
    {
      id: 'pattern-dots',
      name: 'Dots',
      type: 'pattern' as const,
      width: 20, height: 20,
      content: '<circle cx="10" cy="10" r="3" fill="#374151"/>',
      preview: '• • •'
    },
    {
      id: 'pattern-lines',
      name: 'Lines',
      type: 'pattern' as const,
      width: 10, height: 10,
      content: '<rect x="0" y="0" width="2" height="10" fill="#374151"/>',
      preview: '|||'
    },
    {
      id: 'pattern-diagonal',
      name: 'Diagonal',
      type: 'pattern' as const,
      width: 10, height: 10,
      content: '<path d="M0,10 L10,0" stroke="#374151" stroke-width="2"/>',
      preview: '///'
    },
    {
      id: 'pattern-cross',
      name: 'Cross',
      type: 'pattern' as const,
      width: 20, height: 20,
      content: '<rect x="9" y="0" width="2" height="20" fill="#374151"/><rect x="0" y="9" width="20" height="2" fill="#374151"/>',
      preview: '+++'
    },
    {
      id: 'pattern-grid',
      name: 'Grid',
      type: 'pattern' as const,
      width: 20, height: 20,
      content: '<rect width="20" height="20" fill="none" stroke="#374151" stroke-width="1"/>',
      preview: '⚏'
    },
    {
      id: 'pattern-waves',
      name: 'Waves',
      type: 'pattern' as const,
      width: 24, height: 12,
      content: '<path d="M0,6 Q6,0 12,6 T24,6" stroke="#374151" stroke-width="2" fill="none"/>',
      preview: '~~~'
    },
    {
      id: 'pattern-zigzag',
      name: 'ZigZag',
      type: 'pattern' as const,
      width: 16, height: 16,
      content: '<path d="M0,8 L4,0 L8,8 L12,0 L16,8" stroke="#374151" stroke-width="2" fill="none"/>',
      preview: 'ΛΛΛ'
    },
    {
      id: 'pattern-checkerboard',
      name: 'Checkerboard',
      type: 'pattern' as const,
      width: 20, height: 20,
      content: '<rect x="0" y="0" width="10" height="10" fill="#374151"/><rect x="10" y="10" width="10" height="10" fill="#374151"/>',
      preview: '▣▣'
    },
    {
      id: 'pattern-scales',
      name: 'Scales',
      type: 'pattern' as const,
      width: 20, height: 20,
      content: '<path d="M10,0 Q20,10 10,20 Q0,10 10,0" fill="none" stroke="#374151" stroke-width="1.5"/>',
      preview: '◐◑'
    },
    {
      id: 'pattern-hexagon',
      name: 'Hexagon',
      type: 'pattern' as const,
      width: 24, height: 21,
      content: '<polygon points="12,2 20,7 20,14 12,19 4,14 4,7" fill="none" stroke="#374151" stroke-width="1.5"/>',
      preview: '⬡⬢'
    },
    {
      id: 'pattern-stars',
      name: 'Stars',
      type: 'pattern' as const,
      width: 20, height: 20,
      content: '<path d="M10,2 L12,8 L18,8 L13,12 L15,18 L10,14 L5,18 L7,12 L2,8 L8,8 Z" fill="#374151"/>',
      preview: '★★'
    },
    {
      id: 'pattern-triangles',
      name: 'Triangles',
      type: 'pattern' as const,
      width: 20, height: 17,
      content: '<polygon points="10,2 18,16 2,16" fill="none" stroke="#374151" stroke-width="1.5"/>',
      preview: '△△'
    }
  ];

  // Function to apply opacity changes to selected elements
  const applyOpacityToSelected = (newOpacity: number) => {
    import('../../store/editorStore').then(({ useEditorStore }) => {
      const store = useEditorStore.getState();
      const selection = store.selection;
      const isStroke = actionId?.includes('stroke') || false;

      // Clamp opacity value between 0 and 1
      const clampedOpacity = Math.max(0, Math.min(1, newOpacity));

      // Helper function to update color with new opacity
      const updateColorWithOpacity = (currentColor: string | any, newOpacity: number): any => {
        // If it's not a string, return opacity as separate property
        if (typeof currentColor !== 'string') {
          return { 
            color: currentColor, 
            opacity: newOpacity 
          };
        }

        // Parse current color to check if it has embedded opacity
        const parsed = parseColorWithOpacity(currentColor);
        
        // If the color has embedded opacity (RGBA, HSLA), update it
        if (parsed.opacity !== undefined) {
          // Check if it's RGBA format
          const rgbaMatch = currentColor.match(/rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)/);
          if (rgbaMatch) {
            const r = rgbaMatch[1];
            const g = rgbaMatch[2];
            const b = rgbaMatch[3];
            return `rgba(${r},${g},${b},${newOpacity})`;
          }

          // Check if it's HSLA format
          const hslaMatch = currentColor.match(/hsla\s*\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*,\s*([0-9.]+)\s*\)/);
          if (hslaMatch) {
            const h = hslaMatch[1];
            const s = hslaMatch[2];
            const l = hslaMatch[3];
            return `hsla(${h},${s}%,${l}%,${newOpacity})`;
          }
        }

        // If no embedded opacity, return color and separate opacity
        return { 
          color: parsed.color || currentColor, 
          opacity: newOpacity 
        };
      };

      // Apply to texts
      selection.selectedTexts.forEach(textId => {
        const text = store.texts.find(t => t.id === textId);
        if (text) {
          const currentColor = isStroke ? text.style?.stroke : text.style?.fill;
          const result = updateColorWithOpacity(currentColor, clampedOpacity);
          
          if (typeof result === 'string') {
            // Update with new RGBA/HSLA string
            if (isStroke) {
              store.updateTextStyle(textId, { stroke: result });
            } else {
              store.updateTextStyle(textId, { fill: result });
            }
          } else {
            // Update color and opacity separately
            const updates: any = {};
            if (result.color !== currentColor) {
              updates[isStroke ? 'stroke' : 'fill'] = result.color;
            }
            if (isStroke) {
              updates.strokeOpacity = result.opacity;
            } else {
              updates.fillOpacity = result.opacity;
            }
            store.updateTextStyle(textId, updates);
          }
        }
      });

      // Apply to paths (including subpaths)
      const pathIds = new Set<string>();
      selection.selectedPaths.forEach(pathId => pathIds.add(pathId));
      selection.selectedSubPaths.forEach(subPathId => {
        const path = store.paths.find(p => p.subPaths.some(sp => sp.id === subPathId));
        if (path) pathIds.add(path.id);
      });

      pathIds.forEach(pathId => {
        const path = store.paths.find(p => p.id === pathId);
        if (path) {
          const currentColor = isStroke ? path.style?.stroke : path.style?.fill;
          const result = updateColorWithOpacity(currentColor, clampedOpacity);
          
          if (typeof result === 'string') {
            // Update with new RGBA/HSLA string
            if (isStroke) {
              store.updatePathStyle(pathId, { stroke: result });
            } else {
              store.updatePathStyle(pathId, { fill: result });
            }
          } else {
            // Update color and opacity separately
            const updates: any = {};
            if (result.color !== currentColor) {
              updates[isStroke ? 'stroke' : 'fill'] = result.color;
            }
            if (isStroke) {
              updates.strokeOpacity = result.opacity;
            } else {
              updates.fillOpacity = result.opacity;
            }
            store.updatePathStyle(pathId, updates);
          }
        }
      });

      // Apply to images
      selection.selectedImages.forEach(imageId => {
        const image = store.images.find(img => img.id === imageId);
        if (image) {
          const currentColor = isStroke ? image.style?.stroke : image.style?.fill;
          const result = updateColorWithOpacity(currentColor, clampedOpacity);
          
          if (typeof result === 'string') {
            // Update with new RGBA/HSLA string
            const updates: any = {
              ...image.style
            };
            updates[isStroke ? 'stroke' : 'fill'] = result;
            store.updateImage(imageId, { style: updates });
          } else {
            // Update color and opacity separately
            const updates: any = {
              ...image.style
            };
            if (result.color !== currentColor) {
              updates[isStroke ? 'stroke' : 'fill'] = result.color;
            }
            if (isStroke) {
              updates.strokeOpacity = result.opacity;
            } else {
              updates.opacity = result.opacity; // For images, use opacity for fill-like behavior
            }
            store.updateImage(imageId, { style: updates });
          }
        }
      });

      // Apply to uses
      selection.selectedUses.forEach(useId => {
        const use = store.uses.find(u => u.id === useId);
        if (use) {
          const currentColor = isStroke ? use.style?.stroke : use.style?.fill;
          const result = updateColorWithOpacity(currentColor, clampedOpacity);
          
          if (typeof result === 'string') {
            // Update with new RGBA/HSLA string
            const updates: any = {
              ...use.style
            };
            updates[isStroke ? 'stroke' : 'fill'] = result;
            store.updateUse(useId, { style: updates });
          } else {
            // Update color and opacity separately
            const updates: any = {
              ...use.style
            };
            if (result.color !== currentColor) {
              updates[isStroke ? 'stroke' : 'fill'] = result.color;
            }
            if (isStroke) {
              updates.strokeOpacity = result.opacity;
            } else {
              updates.fillOpacity = result.opacity;
            }
            store.updateUse(useId, { style: updates });
          }
        }
      });
    });
  };

  // Apply explicit opacity (separate opacity property)
  const applyExplicitOpacity = (newOpacity: number) => {
    import('../../store/editorStore').then(({ useEditorStore }) => {
      const store = useEditorStore.getState();
      const selection = store.selection;
      const isStroke = actionId?.includes('stroke') || false;
      const clampedOpacity = Math.max(0, Math.min(1, newOpacity));

      // Apply to texts
      selection.selectedTexts.forEach(textId => {
        const updates: any = {};
        if (isStroke) {
          updates.strokeOpacity = clampedOpacity;
        } else {
          updates.fillOpacity = clampedOpacity;
        }
        store.updateTextStyle(textId, updates);
      });

      // Apply to paths
      const pathIds = new Set<string>();
      selection.selectedPaths.forEach(pathId => pathIds.add(pathId));
      selection.selectedSubPaths.forEach(subPathId => {
        const path = store.paths.find(p => p.subPaths.some(sp => sp.id === subPathId));
        if (path) pathIds.add(path.id);
      });

      pathIds.forEach(pathId => {
        const updates: any = {};
        if (isStroke) {
          updates.strokeOpacity = clampedOpacity;
        } else {
          updates.fillOpacity = clampedOpacity;
        }
        store.updatePathStyle(pathId, updates);
      });

      // Apply to images
      selection.selectedImages.forEach(imageId => {
        const image = store.images.find(img => img.id === imageId);
        if (image) {
          const updates: any = {
            ...image.style
          };
          if (isStroke) {
            updates.strokeOpacity = clampedOpacity;
          } else {
            updates.opacity = clampedOpacity; // For images, use opacity for fill-like behavior
          }
          store.updateImage(imageId, { style: updates });
        }
      });

      // Apply to uses
      selection.selectedUses.forEach(useId => {
        const use = store.uses.find(u => u.id === useId);
        if (use) {
          const updates: any = {
            ...use.style
          };
          if (isStroke) {
            updates.strokeOpacity = clampedOpacity;
          } else {
            updates.fillOpacity = clampedOpacity;
          }
          store.updateUse(useId, { style: updates });
        }
      });
    });
  };

  // Apply embedded opacity (RGBA/HSLA opacity)
  const applyEmbeddedOpacity = (newOpacity: number) => {
    import('../../store/editorStore').then(({ useEditorStore }) => {
      const store = useEditorStore.getState();
      const selection = store.selection;
      const isStroke = actionId?.includes('stroke') || false;
      const clampedOpacity = Math.max(0, Math.min(1, newOpacity));

      // Helper function to update embedded opacity in color
      const updateEmbeddedOpacity = (currentColor: string | any): string | any => {
        if (typeof currentColor !== 'string') {
          return currentColor;
        }

        // Check if it's RGBA format
        const rgbaMatch = currentColor.match(/rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)/);
        if (rgbaMatch) {
          const r = rgbaMatch[1];
          const g = rgbaMatch[2];
          const b = rgbaMatch[3];
          return `rgba(${r},${g},${b},${clampedOpacity})`;
        }

        // Check if it's HSLA format
        const hslaMatch = currentColor.match(/hsla\s*\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*,\s*([0-9.]+)\s*\)/);
        if (hslaMatch) {
          const h = hslaMatch[1];
          const s = hslaMatch[2];
          const l = hslaMatch[3];
          return `hsla(${h},${s}%,${l}%,${clampedOpacity})`;
        }

        // If no embedded opacity, convert to RGBA
        const parsed = parseColorWithOpacity(currentColor);
        if (parsed.color) {
          // Convert to RGB values for RGBA format
          const tempDiv = document.createElement('div');
          tempDiv.style.color = parsed.color;
          document.body.appendChild(tempDiv);
          const computedColor = window.getComputedStyle(tempDiv).color;
          document.body.removeChild(tempDiv);
          
          const rgbMatch = computedColor.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
          if (rgbMatch) {
            const r = rgbMatch[1];
            const g = rgbMatch[2];
            const b = rgbMatch[3];
            return `rgba(${r},${g},${b},${clampedOpacity})`;
          }
        }

        return currentColor;
      };

      // Apply to texts
      selection.selectedTexts.forEach(textId => {
        const text = store.texts.find(t => t.id === textId);
        if (text) {
          const currentColor = isStroke ? text.style?.stroke : text.style?.fill;
          const newColor = updateEmbeddedOpacity(currentColor);
          
          if (newColor !== currentColor) {
            const updates: any = {};
            updates[isStroke ? 'stroke' : 'fill'] = newColor;
            store.updateTextStyle(textId, updates);
          }
        }
      });

      // Apply to paths
      const pathIds = new Set<string>();
      selection.selectedPaths.forEach(pathId => pathIds.add(pathId));
      selection.selectedSubPaths.forEach(subPathId => {
        const path = store.paths.find(p => p.subPaths.some(sp => sp.id === subPathId));
        if (path) pathIds.add(path.id);
      });

      pathIds.forEach(pathId => {
        const path = store.paths.find(p => p.id === pathId);
        if (path) {
          const currentColor = isStroke ? path.style?.stroke : path.style?.fill;
          const newColor = updateEmbeddedOpacity(currentColor);
          
          if (newColor !== currentColor) {
            const updates: any = {};
            updates[isStroke ? 'stroke' : 'fill'] = newColor;
            store.updatePathStyle(pathId, updates);
          }
        }
      });

      // Apply to images
      selection.selectedImages.forEach(imageId => {
        const image = store.images.find(img => img.id === imageId);
        if (image) {
          const currentColor = isStroke ? image.style?.stroke : image.style?.fill;
          const newColor = updateEmbeddedOpacity(currentColor);
          
          if (newColor !== currentColor) {
            const updates: any = {
              ...image.style
            };
            updates[isStroke ? 'stroke' : 'fill'] = newColor;
            store.updateImage(imageId, { style: updates });
          }
        }
      });

      // Apply to uses
      selection.selectedUses.forEach(useId => {
        const use = store.uses.find(u => u.id === useId);
        if (use) {
          const currentColor = isStroke ? use.style?.stroke : use.style?.fill;
          const newColor = updateEmbeddedOpacity(currentColor);
          
          if (newColor !== currentColor) {
            const updates: any = {
              ...use.style
            };
            updates[isStroke ? 'stroke' : 'fill'] = newColor;
            store.updateUse(useId, { style: updates });
          }
        }
      });
    });
  };

  // Function to handle opacity slider changes
  const handleOpacityChange = (newOpacity: number) => {
    setOpacity(newOpacity);
    applyOpacityToSelected(newOpacity);
  };

  // Handle RGBA opacity changes
  const handleRgbaOpacityChange = (newOpacity: number) => {
    setRgbaOpacity(newOpacity);
    applyEmbeddedOpacity(newOpacity);
  };

  // Handle explicit opacity changes
  const handleExplicitOpacityChange = (newOpacity: number) => {
    setExplicitOpacity(newOpacity);
    applyExplicitOpacity(newOpacity);
  };

  // Helper functions to check if current item is selected
  const isColorSelected = (color: string): boolean => {
    const actualValue = getCurrentStyleValue();
    return typeof actualValue === 'string' && actualValue === color;
  };

  const isGradientSelected = (gradient: any): boolean => {
    const actualValue = getCurrentStyleValue();
    
    if (typeof actualValue === 'object' && actualValue && gradient) {
      // First try exact ID match
      if (actualValue.id === gradient.id) {
        return true;
      }
      
      // Then try similarity match for gradients of same type
      if (actualValue.type === gradient.type) {
        if (actualValue.type === 'linear') {
          // Compare coordinates and stops for linear gradients
          const coordsMatch = Math.abs(actualValue.x1 - gradient.x1) < 0.1 &&
                             Math.abs(actualValue.y1 - gradient.y1) < 0.1 &&
                             Math.abs(actualValue.x2 - gradient.x2) < 0.1 &&
                             Math.abs(actualValue.y2 - gradient.y2) < 0.1;
          
          const stopsMatch = actualValue.stops && gradient.stops &&
                            actualValue.stops.length === gradient.stops.length &&
                            actualValue.stops.every((stop: any, i: number) => 
                              gradient.stops[i] && 
                              stop.color === gradient.stops[i].color &&
                              Math.abs(stop.offset - gradient.stops[i].offset) < 0.01
                            );
          
          return coordsMatch && stopsMatch;
        } else if (actualValue.type === 'radial') {
          // Compare center and radius for radial gradients
          const centerMatch = Math.abs(actualValue.cx - gradient.cx) < 0.1 &&
                             Math.abs(actualValue.cy - gradient.cy) < 0.1 &&
                             Math.abs(actualValue.r - gradient.r) < 0.1;
          
          const stopsMatch = actualValue.stops && gradient.stops &&
                            actualValue.stops.length === gradient.stops.length &&
                            actualValue.stops.every((stop: any, i: number) => 
                              gradient.stops[i] && 
                              stop.color === gradient.stops[i].color &&
                              Math.abs(stop.offset - gradient.stops[i].offset) < 0.01
                            );
          
          return centerMatch && stopsMatch;
        }
      }
    }
    
    return false;
  };

  const isPatternSelected = (pattern: any): boolean => {
    const actualValue = getCurrentStyleValue();
    return typeof actualValue === 'object' && 
           actualValue && 
           actualValue.id === pattern.id;
  };

  const handleColorSelect = (color: string) => {
    onChange(color);
  };

  const handleGradientSelect = (gradient: any) => {
    // Return the gradient object directly, not a URL string
    onChange(gradient);
  };

  const handlePatternSelect = (pattern: any) => {
    // Return the pattern object directly, not a URL string
    onChange(pattern);
  };

  return (
    <div style={{ 
      padding: '6px 12px',
      minWidth: isMobileDevice ? '240px' : '220px'
    }}>
      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        marginBottom: '8px',
        borderBottom: '1px solid #e5e7eb'
      }}>
        {(['colors', 'gradients', 'patterns'] as const).map(tab => (
          <button
            key={tab}
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setActiveTab(tab);
            }}
            style={{
              flex: 1,
              padding: '6px 8px',
              fontSize: '10px',
              fontWeight: '500',
              border: 'none',
              borderRadius: '0px',
              background: activeTab === tab ? '#f3f4f6' : 'transparent',
              color: activeTab === tab ? '#000000' : '#6b7280',
              cursor: 'pointer',
              textTransform: 'capitalize',
              borderBottom: activeTab === tab ? '2px solid #000000' : '2px solid transparent',
              transition: 'all 0.15s ease'
            }}
          >
            {tab === 'colors' ? 'Colors' : tab === 'gradients' ? 'Gradients' : 'Patterns'}
          </button>
        ))}
      </div>

      {/* Colors Tab */}
      {activeTab === 'colors' && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(10, 1fr)', 
          gap: '2px'
        }}>
          {softColors.map(color => (
            <button
              key={color}
              style={{
                aspectRatio: '1',
                background: color,
                border: isColorSelected(color) ? '2px solid #000000' : '1px solid #e5e7eb',
                borderRadius: '3px',
                cursor: 'pointer',
                transition: 'all 0.1s ease'
              }}
              onPointerDown={() => handleColorSelect(color)}
              onPointerEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
                (e.currentTarget as HTMLButtonElement).style.zIndex = '10';
              }}
              onPointerLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                (e.currentTarget as HTMLButtonElement).style.zIndex = '1';
              }}
              title={color}
            />
          ))}
        </div>
      )}

      {/* Gradients Tab */}
      {activeTab === 'gradients' && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(6, 1fr)', 
          gap: '2px'
        }}>
          {predefinedGradients.map(gradient => (
            <button
              key={gradient.id}
              style={{
                aspectRatio: '1.5/1',
                background: gradient.preview,
                border: isGradientSelected(gradient) ? '2px solid #000000' : '1px solid #e5e7eb',
                borderRadius: '3px',
                cursor: 'pointer',
                transition: 'all 0.1s ease',
                position: 'relative'
              }}
              onPointerDown={() => handleGradientSelect(gradient)}
              onPointerEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
                (e.currentTarget as HTMLButtonElement).style.zIndex = '10';
              }}
              onPointerLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                (e.currentTarget as HTMLButtonElement).style.zIndex = '1';
              }}
              title={gradient.name}
            />
          ))}
        </div>
      )}

      {/* Patterns Tab */}
      {activeTab === 'patterns' && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(50px, 1fr))', 
          gap: '3px'
        }}>
          {predefinedPatterns.map(pattern => (
            <button
              key={pattern.id}
              style={{
                aspectRatio: '2/1',
                background: '#f8fafc',
                border: isPatternSelected(pattern) ? '2px solid #000000' : '1px solid #e5e7eb',
                borderRadius: '3px',
                cursor: 'pointer',
                transition: 'all 0.1s ease',
                fontSize: '10px',
                fontFamily: 'monospace',
                color: '#374151',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: '0.8'
              }}
              onPointerDown={() => handlePatternSelect(pattern)}
              onPointerEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
                (e.currentTarget as HTMLButtonElement).style.background = '#f1f5f9';
                (e.currentTarget as HTMLButtonElement).style.zIndex = '10';
              }}
              onPointerLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                (e.currentTarget as HTMLButtonElement).style.background = '#f8fafc';
                (e.currentTarget as HTMLButtonElement).style.zIndex = '1';
              }}
              title={pattern.name}
            >
              {pattern.preview}
            </button>
          ))}
        </div>
      )}

      {/* Transparency Sliders */}
      <div style={{ 
        marginTop: '8px', 
        paddingTop: '6px', 
        borderTop: '1px solid #e5e7eb'
      }}>
        {(() => {
          const opacityState = getOpacityState();
          const { hasRGBAOpacity, hasExplicitOpacity } = opacityState;
          
          // Case 1: Both RGBA and explicit opacity exist
          if (hasRGBAOpacity && hasExplicitOpacity) {
            return (
              <>
                {/* RGBA Opacity Slider */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '9px', color: '#6b7280', marginBottom: '2px' }}>
                    RGBA Opacity
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '3px'
                  }}>
                    <div style={{
                      position: 'relative',
                      width: 'calc(100% - 35px)',
                      height: '14px',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      <div style={{
                        position: 'absolute',
                        width: '100%',
                        height: '4px',
                        background: 'linear-gradient(to right, rgba(128,128,128,0.3) 0%, rgba(64,64,64,1) 100%)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '2px'
                      }} />
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={rgbaOpacity}
                        onChange={(e) => handleRgbaOpacityChange(parseFloat(e.target.value))}
                        style={{
                          position: 'relative',
                          width: '100%',
                          height: '14px',
                          background: 'transparent',
                          appearance: 'none',
                          cursor: 'pointer',
                          zIndex: 2,
                          margin: 0,
                          padding: 0
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                      />
                    </div>
                    <span style={{
                      fontSize: '9px',
                      color: '#6b7280',
                      minWidth: '32px',
                      textAlign: 'right'
                    }}>
                      {Math.round(rgbaOpacity * 100)}%
                    </span>
                  </div>
                </div>

                {/* Explicit Opacity Slider */}
                <div>
                  <div style={{ fontSize: '9px', color: '#6b7280', marginBottom: '2px' }}>
                    Explicit Opacity
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '3px'
                  }}>
                    <div style={{
                      position: 'relative',
                      width: 'calc(100% - 35px)',
                      height: '14px',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      <div style={{
                        position: 'absolute',
                        width: '100%',
                        height: '4px',
                        background: 'linear-gradient(to right, rgba(128,128,128,0.3) 0%, rgba(64,64,64,1) 100%)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '2px'
                      }} />
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={explicitOpacity}
                        onChange={(e) => handleExplicitOpacityChange(parseFloat(e.target.value))}
                        style={{
                          position: 'relative',
                          width: '100%',
                          height: '14px',
                          background: 'transparent',
                          appearance: 'none',
                          cursor: 'pointer',
                          zIndex: 2,
                          margin: 0,
                          padding: 0
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                      />
                    </div>
                    <span style={{
                      fontSize: '9px',
                      color: '#6b7280',
                      minWidth: '32px',
                      textAlign: 'right'
                    }}>
                      {Math.round(explicitOpacity * 100)}%
                    </span>
                  </div>
                </div>
              </>
            );
          }
          
          // Case 2: Only RGBA opacity exists
          if (hasRGBAOpacity && !hasExplicitOpacity) {
            return (
              <div>
                <div style={{ fontSize: '9px', color: '#6b7280', marginBottom: '2px' }}>
                  RGBA Opacity
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '3px'
                }}>
                  <div style={{
                    position: 'relative',
                    width: 'calc(100% - 35px)',
                    height: '14px',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <div style={{
                      position: 'absolute',
                      width: '100%',
                      height: '4px',
                      background: 'linear-gradient(to right, rgba(128,128,128,0.3) 0%, rgba(64,64,64,1) 100%)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '2px'
                    }} />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={rgbaOpacity}
                      onChange={(e) => handleRgbaOpacityChange(parseFloat(e.target.value))}
                      style={{
                        position: 'relative',
                        width: '100%',
                        height: '14px',
                        background: 'transparent',
                        appearance: 'none',
                        cursor: 'pointer',
                        zIndex: 2,
                        margin: 0,
                        padding: 0
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                    />
                  </div>
                  <span style={{
                    fontSize: '9px',
                    color: '#6b7280',
                    minWidth: '32px',
                    textAlign: 'right'
                  }}>
                    {Math.round(rgbaOpacity * 100)}%
                  </span>
                </div>
              </div>
            );
          }
          
          // Case 3: Only explicit opacity exists
          if (!hasRGBAOpacity && hasExplicitOpacity) {
            return (
              <div>
                <div style={{ fontSize: '9px', color: '#6b7280', marginBottom: '2px' }}>
                  Opacity
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '3px'
                }}>
                  <div style={{
                    position: 'relative',
                    width: 'calc(100% - 35px)',
                    height: '14px',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <div style={{
                      position: 'absolute',
                      width: '100%',
                      height: '4px',
                      background: 'linear-gradient(to right, rgba(128,128,128,0.3) 0%, rgba(64,64,64,1) 100%)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '2px'
                    }} />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={explicitOpacity}
                      onChange={(e) => handleExplicitOpacityChange(parseFloat(e.target.value))}
                      style={{
                        position: 'relative',
                        width: '100%',
                        height: '14px',
                        background: 'transparent',
                        appearance: 'none',
                        cursor: 'pointer',
                        zIndex: 2,
                        margin: 0,
                        padding: 0
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                    />
                  </div>
                  <span style={{
                    fontSize: '9px',
                    color: '#6b7280',
                    minWidth: '32px',
                    textAlign: 'right'
                  }}>
                    {Math.round(explicitOpacity * 100)}%
                  </span>
                </div>
              </div>
            );
          }
          
          // Case 4: No opacity exists - show basic opacity control
          return (
            <div>
              <div style={{ fontSize: '9px', color: '#6b7280', marginBottom: '2px' }}>
                Opacity
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '3px'
              }}>
                <div style={{
                  position: 'relative',
                  width: 'calc(100% - 35px)',
                  height: '14px',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <div style={{
                    position: 'absolute',
                    width: '100%',
                    height: '4px',
                    background: 'linear-gradient(to right, rgba(128,128,128,0.3) 0%, rgba(64,64,64,1) 100%)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '2px'
                  }} />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={opacity}
                    onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '14px',
                      background: 'transparent',
                      appearance: 'none',
                      cursor: 'pointer',
                      zIndex: 2,
                      margin: 0,
                      padding: 0
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                  />
                </div>
                <span style={{
                  fontSize: '9px',
                  color: '#6b7280',
                  minWidth: '32px',
                  textAlign: 'right'
                }}>
                  {Math.round(opacity * 100)}%
                </span>
              </div>
            </div>
          );
        })()}
        <style>{`
          input[type="range"]::-webkit-slider-thumb {
            appearance: none;
            width: 12px;
            height: 12px;
            background: white;
            border: 2px solid #374151;
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          
          input[type="range"]::-moz-range-thumb {
            width: 12px;
            height: 12px;
            background: white;
            border: 2px solid #374151;
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            appearance: none;
          }
          
          input[type="range"]::-webkit-slider-track {
            background: transparent;
          }
          
          input[type="range"]::-moz-range-track {
            background: transparent;
          }
        `}</style>
      </div>


      {/* Quick Actions */}
      <div style={{ 
        marginTop: '8px', 
        paddingTop: '6px', 
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        gap: '4px'
      }}>
        <button
          onPointerDown={() => handleColorSelect('none')}
          style={{
            flex: 1,
            padding: '4px 6px',
            fontSize: '9px',
            border: '1px solid #e5e7eb',
            background: isColorSelected('none') ? '#f3f4f6' : 'white',
            color: '#6b7280',
            cursor: 'pointer',
            borderRadius: '2px',
            fontWeight: '500'
          }}
          title="No fill/stroke"
        >
          None
        </button>
        <button
          onPointerDown={() => handleColorSelect('transparent')}
          style={{
            flex: 1,
            padding: '4px 6px',
            fontSize: '9px',
            border: '1px solid #e5e7eb',
            background: isColorSelected('transparent') ? '#f3f4f6' : 'white',
            color: '#6b7280',
            cursor: 'pointer',
            borderRadius: '2px',
            fontWeight: '500'
          }}
          title="Transparent"
        >
          Clear
        </button>
      </div>
    </div>
  );
};