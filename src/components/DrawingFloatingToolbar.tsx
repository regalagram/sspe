import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Palette, Brush, LineSquiggle } from 'lucide-react';
import { FloatingToolbarButton } from './FloatingToolbar/FloatingToolbarButton';
import { useEditorStore } from '../store/editorStore';
import { useMobileDetection } from '../hooks/useMobileDetection';
import { toolModeManager } from '../managers/ToolModeManager';
import { pencilManager } from '../plugins/pencil/PencilManager';
import { curvesManager } from '../plugins/curves/CurvesManager';
import { shapeManager } from '../plugins/shapes/ShapeManager';
import { ToolbarAction } from '../types/floatingToolbar';

// Types for different drawing tools
type DrawingToolType = 'pencil' | 'curves' | 'shapes';

interface DrawingSettings {
  strokeColor: string;
  strokeWidth: number;
  strokeOpacity: number;
  fill?: string;
  fillOpacity?: number;
  strokeDasharray?: string;
  strokeLinecap?: 'butt' | 'round' | 'square';
  strokeLinejoin?: 'miter' | 'round' | 'bevel';
  fillRule?: 'nonzero' | 'evenodd';
}

interface BaseManager {
  getSettings: () => any;
  updateSettings: (settings: any) => void;
}

interface DrawingFloatingToolbarProps {
  toolType: DrawingToolType;
}

// Manager mapping
const MANAGERS: Record<DrawingToolType, BaseManager> = {
  pencil: pencilManager,
  curves: curvesManager,
  shapes: shapeManager
};

// Tool mode mapping
const TOOL_MODES: Record<DrawingToolType, string> = {
  pencil: 'pencil',
  curves: 'curves',
  shapes: 'shapes'
};

// Helper function to normalize settings across different managers
const normalizeSettings = (settings: any, toolType: DrawingToolType): DrawingSettings => {
  const normalized: DrawingSettings = {
    strokeColor: settings.strokeColor || '#6b7280',
    strokeWidth: settings.strokeWidth || 2,
    strokeOpacity: settings.strokeOpacity || 1.0,
    strokeDasharray: settings.strokeDasharray || 'none',
    strokeLinecap: settings.strokeLinecap || 'round',
    strokeLinejoin: settings.strokeLinejoin || 'round'
  };

  // Add fill properties for shapes and curves
  if (toolType === 'shapes' || toolType === 'curves') {
    normalized.fill = settings.fill || (toolType === 'shapes' ? '#0078cc' : 'none');
    if (toolType === 'shapes') {
      normalized.fillOpacity = settings.fillOpacity || 0.3;
    }
    normalized.fillRule = settings.fillRule || 'nonzero';
  }

  return normalized;
};

// Helper function to update settings based on tool type
const updateManagerSettings = (manager: BaseManager, newSettings: DrawingSettings, toolType: DrawingToolType) => {
  if (toolType === 'shapes') {
    // For shapes, include all properties
    manager.updateSettings(newSettings);
  } else {
    // For pencil and curves, exclude fill properties
    const { fill, fillOpacity, ...restSettings } = newSettings;
    manager.updateSettings(restSettings);
  }
};

export const DrawingFloatingToolbar: React.FC<DrawingFloatingToolbarProps> = ({ toolType }) => {
  const { isMobile, isTablet } = useMobileDetection();
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const [settings, setSettings] = useState(normalizeSettings(MANAGERS[toolType].getSettings(), toolType));
  const [activeSubmenuId, setActiveSubmenuId] = useState<string | null>(null);
  
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

  // Update settings when manager settings change
  useEffect(() => {
    const updateSettings = () => {
      setSettings(normalizeSettings(manager.getSettings(), toolType));
    };
    
    // Listen for settings changes
    const interval = setInterval(updateSettings, 100);
    
    return () => clearInterval(interval);
  }, [manager, toolType]);

  // Handle submenu toggling - only one submenu can be open at a time
  const handleSubmenuToggle = (actionId: string) => {
    setActiveSubmenuId(prevActiveId => {
      if (prevActiveId === actionId) {
        return null; // Close if clicking on the same button
      } else {
        return actionId; // Close any other submenu and open this one
      }
    });
  };

  // Create toolbar actions based on tool type
  const createToolbarActions = (): ToolbarAction[] => {
    const actions: ToolbarAction[] = [];

    // Stroke Color Action (for all tools)
    actions.push({
      id: 'stroke-color',
      icon: Brush,
      label: 'Stroke Color',
      tooltip: 'Change stroke color',
      type: 'color',
      color: {
        currentColor: settings.strokeColor,
        onChange: (color: string) => {
          const newSettings = { ...settings, strokeColor: color };
          setSettings(newSettings);
          updateManagerSettings(manager, newSettings, toolType);
        }
      }
    });

    // Stroke Options Action (for all tools)
    actions.push({
      id: 'stroke-options',
      icon: LineSquiggle,
      label: 'Stroke Options',
      tooltip: 'Configure stroke properties',
      type: 'input',
      input: {
        currentValue: settings.strokeWidth,
        onChange: (value: string | number) => {
          const width = typeof value === 'number' ? value : parseFloat(value.toString());
          if (!isNaN(width) && width >= 0) {
            const newSettings = { ...settings, strokeWidth: width };
            setSettings(newSettings);
            updateManagerSettings(manager, newSettings, toolType);
          }
        },
        type: 'number',
        placeholder: '1'
      },
      strokeOptions: {
        getCurrentStrokeWidth: () => settings.strokeWidth,
        getCurrentStrokeDash: () => settings.strokeDasharray || 'none',
        getCurrentStrokeLinecap: () => settings.strokeLinecap || 'round',
        getCurrentStrokeLinejoin: () => settings.strokeLinejoin || 'round',
        getCurrentFillRule: toolType === 'pencil' ? undefined : (() => settings.fillRule || 'nonzero'),
        onStrokeWidthChange: (width: number) => {
          const newSettings = { ...settings, strokeWidth: width };
          setSettings(newSettings);
          updateManagerSettings(manager, newSettings, toolType);
        },
        onStrokeDashChange: (dash: string) => {
          const newSettings = { ...settings, strokeDasharray: dash };
          setSettings(newSettings);
          updateManagerSettings(manager, newSettings, toolType);
        },
        onStrokeLinecapChange: (linecap: string) => {
          const newSettings = { ...settings, strokeLinecap: linecap as 'butt' | 'round' | 'square' };
          setSettings(newSettings);
          updateManagerSettings(manager, newSettings, toolType);
        },
        onStrokeLinejoinChange: (linejoin: string) => {
          const newSettings = { ...settings, strokeLinejoin: linejoin as 'miter' | 'round' | 'bevel' };
          setSettings(newSettings);
          updateManagerSettings(manager, newSettings, toolType);
        },
        onFillRuleChange: toolType === 'pencil' ? undefined : ((fillRule: string) => {
          const newSettings = { ...settings, fillRule: fillRule as 'nonzero' | 'evenodd' };
          setSettings(newSettings);
          updateManagerSettings(manager, newSettings, toolType);
        })
      }
    });

    // Fill Color Action (only for shapes)
    if (toolType === 'shapes') {
      actions.push({
        id: 'fill-color',
        icon: Palette,
        label: 'Fill Color',
        tooltip: 'Change fill color',
        type: 'color',
        color: {
          currentColor: settings.fill || '#0078cc',
          onChange: (color: string) => {
            const newSettings = { ...settings, fill: color };
            setSettings(newSettings);
            updateManagerSettings(manager, newSettings, toolType);
          }
        }
      });
    }

    return actions;
  };

  // Don't render if tool mode is not active or no portal container
  if (!isToolActive || !portalContainer) {
    return null;
  }

  const actions = createToolbarActions();
  const buttonSize = isMobileDevice ? 28 : 32;
  
  return createPortal(
    <div
      {...{[`data-${toolType}-toolbar`]: true}}
      style={{
        position: 'fixed',
        top: isMobileDevice ? 'env(safe-area-inset-top, 8px)' : '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: isMobileDevice ? 9999 : 40,
        display: 'flex',
        alignItems: 'center',
        gap: '0px',
        background: 'white',
        padding: '0px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        userSelect: 'none',
        touchAction: 'manipulation',
        pointerEvents: 'auto',
        overflowX: 'visible',
        overflowY: 'visible',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitBackfaceVisibility: 'hidden',
        backfaceVisibility: 'hidden'
      }}
    >
      {actions.map((action) => (
        <FloatingToolbarButton
          key={action.id}
          action={action}
          isSubmenuOpen={activeSubmenuId === action.id}
          onSubmenuToggle={() => handleSubmenuToggle(action.id)}
        />
      ))}
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

export const ShapeFloatingToolbar: React.FC = () => (
  <DrawingFloatingToolbar toolType="shapes" />
);
