import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Palette, Minus, Droplets } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { useMobileDetection } from '../hooks/useMobileDetection';
import { toolModeManager } from '../managers/ToolModeManager';
import { pencilManager } from '../plugins/pencil/PencilManager';
import { curvesManager } from '../plugins/curves/CurvesManager';

// Types for different drawing tools
type DrawingToolType = 'pencil' | 'curves';

interface DrawingSettings {
  strokeColor: string;
  strokeWidth: number;
  strokeOpacity: number;
  fill?: string;
}

interface Manager {
  getSettings: () => DrawingSettings;
  updateSettings: (settings: DrawingSettings) => void;
}

interface DrawingFloatingToolbarProps {
  toolType: DrawingToolType;
}

// Soft color palette
const SOFT_COLORS = [
  '#6b7280', // Soft gray (default)
  '#ef4444', // Soft red
  '#f97316', // Soft orange  
  '#eab308', // Soft yellow
  '#22c55e', // Soft green
  '#06b6d4', // Soft cyan
  '#3b82f6', // Soft blue
  '#8b5cf6', // Soft purple
  '#ec4899', // Soft pink
  '#94a3b8', // Light gray
  '#64748b', // Medium gray
  '#1e293b'  // Dark gray
];

// Stroke width options
const STROKE_WIDTHS = [1, 2, 3, 5, 8, 12, 16, 20];

// Opacity options (as percentages for display, stored as 0-1)
const OPACITY_OPTIONS = [
  { label: '100%', value: 1.0 },
  { label: '90%', value: 0.9 },
  { label: '75%', value: 0.75 },
  { label: '50%', value: 0.5 },
  { label: '25%', value: 0.25 },
  { label: '10%', value: 0.1 }
];

// Manager mapping
const MANAGERS: Record<DrawingToolType, Manager> = {
  pencil: pencilManager,
  curves: curvesManager
};

// Tool mode mapping
const TOOL_MODES: Record<DrawingToolType, string> = {
  pencil: 'pencil',
  curves: 'curves'
};

export const DrawingFloatingToolbar: React.FC<DrawingFloatingToolbarProps> = ({ toolType }) => {
  const { isMobile, isTablet } = useMobileDetection();
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const [settings, setSettings] = useState(MANAGERS[toolType].getSettings());
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showStrokeWidthPicker, setShowStrokeWidthPicker] = useState(false);
  const [showOpacityPicker, setShowOpacityPicker] = useState(false);
  
  const isMobileDevice = isMobile || isTablet;
  const toolModeState = toolModeManager.getState();
  const manager = MANAGERS[toolType];
  
  // Check if the specific tool mode is active
  const isToolActive = toolModeState.activeMode === TOOL_MODES[toolType];

  // Find the SVG container for the portal
  useEffect(() => {
    const svgContainer = document.querySelector('.svg-editor') as HTMLElement;
    if (svgContainer) {
      setPortalContainer(svgContainer);
    } else {
      setPortalContainer(document.body);
    }
  }, []);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      // Don't close if clicking inside the toolbar
      if (!target.closest(`[data-${toolType}-toolbar]`)) {
        setShowColorPicker(false);
        setShowStrokeWidthPicker(false);
        setShowOpacityPicker(false);
      }
    };
    
    if (showColorPicker || showStrokeWidthPicker || showOpacityPicker) {
      document.addEventListener('pointerdown', handleClickOutside);
      return () => document.removeEventListener('pointerdown', handleClickOutside);
    }
  }, [showColorPicker, showStrokeWidthPicker, showOpacityPicker, toolType]);

  // Update settings when manager settings change
  useEffect(() => {
    const updateSettings = () => {
      setSettings(manager.getSettings());
    };
    
    // Listen for settings changes
    const interval = setInterval(updateSettings, 100);
    
    return () => clearInterval(interval);
  }, [manager]);

  // Handle color change
  const handleColorChange = (color: string) => {
    const newSettings = { ...settings, strokeColor: color };
    setSettings(newSettings);
    manager.updateSettings(newSettings);
    setShowColorPicker(false);
  };

  // Handle stroke width change
  const handleStrokeWidthChange = (strokeWidth: number) => {
    const newSettings = { ...settings, strokeWidth };
    setSettings(newSettings);
    manager.updateSettings(newSettings);
    setShowStrokeWidthPicker(false);
  };

  // Handle opacity change
  const handleOpacityChange = (strokeOpacity: number) => {
    const newSettings = { ...settings, strokeOpacity };
    setSettings(newSettings);
    manager.updateSettings(newSettings);
    setShowOpacityPicker(false);
  };

  // Handle button interactions for mobile compatibility
  const handleColorPickerToggle = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Close other pickers when opening color picker
    if (!showColorPicker) {
      setShowStrokeWidthPicker(false);
      setShowOpacityPicker(false);
    }
    setShowColorPicker(!showColorPicker);
  };

  const handleStrokeWidthPickerToggle = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Close other pickers when opening stroke width picker
    if (!showStrokeWidthPicker) {
      setShowColorPicker(false);
      setShowOpacityPicker(false);
    }
    setShowStrokeWidthPicker(!showStrokeWidthPicker);
  };

  const handleOpacityPickerToggle = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Close other pickers when opening opacity picker
    if (!showOpacityPicker) {
      setShowColorPicker(false);
      setShowStrokeWidthPicker(false);
    }
    setShowOpacityPicker(!showOpacityPicker);
  };

  // Don't render if tool mode is not active or no portal container
  if (!isToolActive || !portalContainer) {
    return null;
  }

  // Use the same button sizes as the standard floating toolbar
  const buttonSize = isMobileDevice ? 28 : 32;
  
  return createPortal(
    <div
      {...{[`data-${toolType}-toolbar`]: true}}
      style={{
        position: 'fixed',
        // Use the same positioning as FloatingToolbarRenderer for mobile
        top: isMobileDevice ? 'env(safe-area-inset-top, 8px)' : '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: isMobileDevice ? 9999 : 40,
        display: 'flex',
        alignItems: 'center',
        gap: '0px', // Match FloatingToolbarRenderer
        background: 'white',
        padding: '0px', // Match FloatingToolbarRenderer
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', // Match FloatingToolbarRenderer
        userSelect: 'none',
        touchAction: 'manipulation',
        pointerEvents: 'auto',
        // Mobile-optimized properties to match FloatingToolbarRenderer
        overflowX: 'visible',
        overflowY: 'visible',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitBackfaceVisibility: 'hidden',
        backfaceVisibility: 'hidden'
      }}
    >
      {/* Color Picker Button */}
      <div style={{ position: 'relative' }}>
        <button
          onPointerDown={handleColorPickerToggle}
          style={{
            width: `${buttonSize}px`,
            height: `${buttonSize}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: showColorPicker ? '#f3f4f6' : settings.strokeColor,
            color: 'white',
            border: 'none',
            borderRadius: '0px', // Match FloatingToolbarButton
            cursor: 'pointer',
            transition: 'all 0.15s ease', // Match FloatingToolbarButton
            position: 'relative',
            touchAction: 'manipulation'
          }}
          title="Change stroke color"
        >
          <Palette size={isMobileDevice ? 12 : 13} color="white" style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))' }} />
        </button>

        {/* Color Picker Dropdown */}
        {showColorPicker && (
          <div
            style={{
              position: 'absolute',
              top: buttonSize + 8,
              left: 0,
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '8px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '4px',
              minWidth: '160px',
              zIndex: 1001
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {SOFT_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => handleColorChange(color)}
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: color,
                  border: settings.strokeColor === color ? '2px solid #007acc' : '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                title={color}
              />
            ))}
          </div>
        )}
      </div>

      {/* Stroke Width Picker Button */}
      <div style={{ position: 'relative' }}>
        <button
          onPointerDown={handleStrokeWidthPickerToggle}
          style={{
            width: `${buttonSize}px`,
            height: `${buttonSize}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: showStrokeWidthPicker ? '#f3f4f6' : 'white',
            color: '#374151',
            border: 'none',
            borderRadius: '0px', // Match FloatingToolbarButton
            cursor: 'pointer',
            transition: 'all 0.15s ease', // Match FloatingToolbarButton
            position: 'relative',
            touchAction: 'manipulation'
          }}
          title={`Change stroke width (current: ${settings.strokeWidth}px)`}
        >
          <div
            style={{
              width: '16px',
              height: `${Math.min(Math.max(settings.strokeWidth * 2, 2), 16)}px`,
              backgroundColor: settings.strokeColor,
              borderRadius: '1px'
            }}
          />
        </button>

        {/* Stroke Width Picker Dropdown */}
        {showStrokeWidthPicker && (
          <div
            style={{
              position: 'absolute',
              top: buttonSize + 8,
              left: 0,
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '8px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              minWidth: '120px',
              zIndex: 1001
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {STROKE_WIDTHS.map((width) => (
              <button
                key={width}
                onClick={() => handleStrokeWidthChange(width)}
                style={{
                  padding: '8px 12px',
                  border: settings.strokeWidth === width ? '2px solid #007acc' : '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: '4px',
                  backgroundColor: settings.strokeWidth === width ? '#f0f9ff' : 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease',
                  fontSize: '12px'
                }}
              >
                <span>{width}px</span>
                <div
                  style={{
                    width: '24px',
                    height: `${Math.max(width, 1)}px`,
                    backgroundColor: settings.strokeColor,
                    borderRadius: width > 4 ? '2px' : '0px'
                  }}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Opacity Picker Button */}
      <div style={{ position: 'relative' }}>
        <button
          onPointerDown={handleOpacityPickerToggle}
          style={{
            width: `${buttonSize}px`,
            height: `${buttonSize}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: showOpacityPicker ? '#f3f4f6' : 'white',
            color: '#374151',
            border: 'none',
            borderRadius: '0px', // Match FloatingToolbarButton
            cursor: 'pointer',
            transition: 'all 0.15s ease', // Match FloatingToolbarButton
            position: 'relative',
            touchAction: 'manipulation'
          }}
          title={`Change opacity (current: ${Math.round(settings.strokeOpacity * 100)}%)`}
        >
          <div style={{ position: 'relative' }}>
            <Droplets size={isMobileDevice ? 12 : 13} color={settings.strokeColor} style={{ opacity: settings.strokeOpacity }} />
          </div>
        </button>

        {/* Opacity Picker Dropdown */}
        {showOpacityPicker && (
          <div
            style={{
              position: 'absolute',
              top: buttonSize + 8,
              left: 0,
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '8px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              minWidth: '100px',
              zIndex: 1001
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {OPACITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleOpacityChange(option.value)}
                style={{
                  padding: '8px 12px',
                  border: Math.abs(settings.strokeOpacity - option.value) < 0.01 ? '2px solid #007acc' : '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: '4px',
                  backgroundColor: Math.abs(settings.strokeOpacity - option.value) < 0.01 ? '#f0f9ff' : 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease',
                  fontSize: '12px'
                }}
              >
                <span>{option.label}</span>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    backgroundColor: settings.strokeColor,
                    opacity: option.value,
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    borderRadius: '2px'
                  }}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    portalContainer
  );
};

// Convenience components for each tool type
export const PencilFloatingToolbar: React.FC = () => (
  <DrawingFloatingToolbar toolType="pencil" />
);

export const CurveFloatingToolbar: React.FC = () => (
  <DrawingFloatingToolbar toolType="curves" />
);
