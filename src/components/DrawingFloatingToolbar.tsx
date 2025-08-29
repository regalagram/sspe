import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Palette, Brush, LineSquiggle, Type, Hash } from 'lucide-react';
import { FloatingToolbarButton } from './FloatingToolbar/FloatingToolbarButton';
import { useEditorStore } from '../store/editorStore';
import { useMobileDetection } from '../hooks/useMobileDetection';
import { toolModeManager } from '../managers/ToolModeManager';
import { pencilManager } from '../plugins/pencil/PencilManager';
import { curvesManager } from '../plugins/curves/CurvesManager';
import { shapeManager } from '../plugins/shapes/ShapeManager';
import { ToolbarAction } from '../types/floatingToolbar';

// Types for different drawing tools
type DrawingToolType = 'pencil' | 'curves' | 'shapes' | 'text';

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
  fontFamily?: string;
  fontSize?: number;
}

interface BaseManager {
  getSettings: () => any;
  updateSettings: (settings: any) => void;
}

interface DrawingFloatingToolbarProps {
  toolType: DrawingToolType;
}

// Dummy manager for text (since text doesn't need stroke settings management like drawing tools)
const textManager = {
  getSettings: () => ({}),
  updateSettings: () => {}
};

// Manager mapping
const MANAGERS: Record<DrawingToolType, BaseManager> = {
  pencil: pencilManager,
  curves: curvesManager,
  shapes: shapeManager,
  text: textManager
};

// Tool mode mapping
const TOOL_MODES: Record<DrawingToolType, string> = {
  pencil: 'pencil',
  curves: 'curves',
  shapes: 'shapes',
  text: 'text'
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
  const [activeSubmenuId, setActiveSubmenuId] = useState<string | null>(null);
  
  // Get settings from store - now shared across all tools
  const toolSettings = useEditorStore((state) => state.toolSettings?.shared);
  const updateDrawingSettings = useEditorStore((state) => state.updateDrawingSettings);
  
  // Keep legacy methods for compatibility
  const updatePencilSettings = useEditorStore((state) => state.updatePencilSettings);
  const updateCurvesSettings = useEditorStore((state) => state.updateCurvesSettings);
  const updateShapesSettings = useEditorStore((state) => state.updateShapesSettings);
  
  const isMobileDevice = isMobile || isTablet;
  const toolModeState = toolModeManager.getState();
  const manager = MANAGERS[toolType];
  
  // Check if the specific tool mode is active
  const isToolActive = toolModeState.activeMode === TOOL_MODES[toolType];

  // Update function - now uses shared settings for all tools
  const updateSettings = (newSettings: Partial<DrawingSettings>) => {
    // Use the new unified update method
    updateDrawingSettings(newSettings);
    
    // Also update the individual manager to keep them in sync
    // Merge with current settings to ensure all required properties are present
    const completeSettings = { ...toolSettings, ...newSettings };
    updateManagerSettings(manager, completeSettings, toolType);
  };

  // Find the SVG container for the portal
  useEffect(() => {
    const svgContainer = document.querySelector('.svg-editor') as HTMLElement;
    if (svgContainer) {
      setPortalContainer(svgContainer);
    } else {
      setPortalContainer(document.body);
    }
  }, []);

  // Sync store settings with managers on tool activation
  useEffect(() => {
    if (isToolActive) {
      updateManagerSettings(manager, toolSettings, toolType);
    }
  }, [isToolActive, toolSettings, manager, toolType]);

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

    // Early return if toolSettings is not available
    if (!toolSettings) {
      return actions;
    }

    // Text tools have different actions (fill, stroke color, stroke config, font)
    if (toolType === 'text') {
      // Fill Color Action (for text)
      actions.push({
        id: 'fill-color',
        icon: Palette,
        label: 'Fill Color',
        tooltip: 'Change text fill color',
        type: 'color',
        color: {
          currentColor: toolSettings.fill || '#000000',
          getCurrentFillOpacity: () => toolSettings.fillOpacity || 1.0,
          onFillOpacityChange: (opacity: number) => {
            const newSettings = { ...toolSettings, fillOpacity: opacity };
            updateSettings(newSettings);
          },
          onChange: (color: string) => {
            const newSettings = { ...toolSettings, fill: color };
            updateSettings(newSettings);
          }
        }
      });

      // Stroke Color Action (for text)
      actions.push({
        id: 'stroke-color',
        icon: Brush,
        label: 'Stroke Color',
        tooltip: 'Change text stroke color',
        type: 'color',
        color: {
          currentColor: toolSettings.strokeColor,
          getCurrentStrokeOpacity: () => toolSettings.strokeOpacity || 1.0,
          onStrokeOpacityChange: (opacity: number) => {
            const newSettings = { ...toolSettings, strokeOpacity: opacity };
            updateSettings(newSettings);
          },
          onChange: (color: string) => {
            const newSettings = { ...toolSettings, strokeColor: color };
            updateSettings(newSettings);
          }
        }
      });

      // Stroke Options Action (for text)
      actions.push({
        id: 'stroke-options',
        icon: LineSquiggle,
        label: 'Stroke Options',
        tooltip: 'Configure stroke settings',
        type: 'input',
        input: {
          currentValue: toolSettings.strokeWidth,
          onChange: (value: string | number) => {
            const newSettings = { ...toolSettings, strokeWidth: Number(value) };
            updateSettings(newSettings);
          },
          type: 'number',
          placeholder: '1'
        },
        strokeOptions: {
          getCurrentStrokeWidth: () => toolSettings.strokeWidth,
          getCurrentStrokeDash: () => toolSettings.strokeDasharray || 'none',
          getCurrentStrokeLinecap: () => toolSettings.strokeLinecap || 'round',
          getCurrentStrokeLinejoin: () => toolSettings.strokeLinejoin || 'round',
          onStrokeWidthChange: (width: number) => {
            const newSettings = { ...toolSettings, strokeWidth: width };
            updateSettings(newSettings);
          },
          onStrokeDashChange: (dash: string) => {
            const newSettings = { ...toolSettings, strokeDasharray: dash };
            updateSettings(newSettings);
          },
          onStrokeLinecapChange: (linecap: string) => {
            const newSettings = { ...toolSettings, strokeLinecap: linecap as 'butt' | 'round' | 'square' };
            updateSettings(newSettings);
          },
          onStrokeLinejoinChange: (linejoin: string) => {
            const newSettings = { ...toolSettings, strokeLinejoin: linejoin as 'miter' | 'round' | 'bevel' };
            updateSettings(newSettings);
          }
        }
      });

      // Font Action (specific to text)
      actions.push({
        id: 'font-family',
        icon: Type,
        label: 'Font',
        tooltip: 'Change font family',
        type: 'dropdown',
        dropdown: {
          currentValue: toolSettings.fontFamily || 'Arial',
          options: [
            { id: 'arial', label: 'Arial', action: () => {
              const newSettings = { ...toolSettings, fontFamily: 'Arial, sans-serif' };
              updateSettings(newSettings);
            }},
            { id: 'helvetica', label: 'Helvetica', action: () => {
              const newSettings = { ...toolSettings, fontFamily: 'Helvetica, sans-serif' };
              updateSettings(newSettings);
            }},
            { id: 'times', label: 'Times New Roman', action: () => {
              const newSettings = { ...toolSettings, fontFamily: 'Times New Roman, serif' };
              updateSettings(newSettings);
            }},
            { id: 'georgia', label: 'Georgia', action: () => {
              const newSettings = { ...toolSettings, fontFamily: 'Georgia, serif' };
              updateSettings(newSettings);
            }},
            { id: 'verdana', label: 'Verdana', action: () => {
              const newSettings = { ...toolSettings, fontFamily: 'Verdana, sans-serif' };
              updateSettings(newSettings);
            }},
            { id: 'courier', label: 'Courier New', action: () => {
              const newSettings = { ...toolSettings, fontFamily: 'Courier New, monospace' };
              updateSettings(newSettings);
            }},
            { id: 'monospace', label: 'Monospace', action: () => {
              const newSettings = { ...toolSettings, fontFamily: 'monospace' };
              updateSettings(newSettings);
            }},
            { id: 'serif', label: 'Serif', action: () => {
              const newSettings = { ...toolSettings, fontFamily: 'serif' };
              updateSettings(newSettings);
            }},
            { id: 'sans-serif', label: 'Sans-serif', action: () => {
              const newSettings = { ...toolSettings, fontFamily: 'sans-serif' };
              updateSettings(newSettings);
            }}
          ]
        }
      });

      // Font Size Action (specific to text)
      actions.push({
        id: 'font-size',
        icon: Hash,
        label: 'Font Size',
        tooltip: 'Change font size',
        type: 'input',
        input: {
          currentValue: toolSettings.fontSize || 16,
          onChange: (value: string | number) => {
            const size = typeof value === 'number' ? value : parseFloat(value.toString());
            if (!isNaN(size) && size > 0) {
              const newSettings = { ...toolSettings, fontSize: size };
              updateSettings(newSettings);
            }
          },
          type: 'number',
          placeholder: '16'
        },
        opacityOptions: {
          getCurrentOpacity: () => toolSettings.fontSize || 16,
          onOpacityChange: (size: number) => {
            const newSettings = { ...toolSettings, fontSize: size };
            updateSettings(newSettings);
          },
          quickValues: [8, 12, 16, 20, 24, 32, 48, 64, 96],
          unit: 'px'
        }
      });

      return actions;
    }

    // Drawing tools actions (pencil, curves, shapes)
    // Fill Color Action (only for shapes) - Now first for shapes
    if (toolType === 'shapes') {
      actions.push({
        id: 'fill-color',
        icon: Palette,
        label: 'Fill Color',
        tooltip: 'Change fill color',
        type: 'color',
        color: {
          currentColor: toolSettings.fill || '#0078cc',
          getCurrentFillOpacity: () => toolSettings.fillOpacity || 0.3,
          onFillOpacityChange: (opacity: number) => {
            const newSettings = { ...toolSettings, fillOpacity: opacity };
            updateSettings(newSettings);
          },
          onChange: (color: string) => {
            const newSettings = { ...toolSettings, fill: color };
            updateSettings(newSettings);
          }
        }
      });
    }

    // Stroke Color Action (for all drawing tools) - Now second for shapes
    actions.push({
      id: 'stroke-color',
      icon: Brush,
      label: 'Stroke Color',
      tooltip: 'Change stroke color',
      type: 'color',
      color: {
        currentColor: toolSettings.strokeColor,
        getCurrentStrokeOpacity: () => toolSettings.strokeOpacity || 1.0,
        onStrokeOpacityChange: (opacity: number) => {
          const newSettings = { ...toolSettings, strokeOpacity: opacity };
          updateSettings(newSettings);
        },
        onChange: (color: string) => {
          const newSettings = { ...toolSettings, strokeColor: color };
          updateSettings(newSettings);
        }
      }
    });

    // Stroke Options Action (for all tools) - Now third for shapes
    actions.push({
      id: 'stroke-options',
      icon: LineSquiggle,
      label: 'Stroke Options',
      tooltip: 'Configure stroke properties',
      type: 'input',
      input: {
        currentValue: toolSettings.strokeWidth,
        onChange: (value: string | number) => {
          const width = typeof value === 'number' ? value : parseFloat(value.toString());
          if (!isNaN(width) && width >= 0) {
            const newSettings = { ...toolSettings, strokeWidth: width };
            updateSettings(newSettings);
          }
        },
        type: 'number',
        placeholder: '1'
      },
      strokeOptions: {
        getCurrentStrokeWidth: () => toolSettings.strokeWidth,
        getCurrentStrokeDash: () => toolSettings.strokeDasharray || 'none',
        getCurrentStrokeLinecap: () => toolSettings.strokeLinecap || 'round',
        getCurrentStrokeLinejoin: () => toolSettings.strokeLinejoin || 'round',
        getCurrentFillRule: toolType === 'pencil' ? undefined : (() => toolSettings.fillRule || 'nonzero'),
        onStrokeWidthChange: (width: number) => {
          const newSettings = { ...toolSettings, strokeWidth: width };
          updateSettings(newSettings);
        },
        onStrokeDashChange: (dash: string) => {
          const newSettings = { ...toolSettings, strokeDasharray: dash };
          updateSettings(newSettings);
        },
        onStrokeLinecapChange: (linecap: string) => {
          const newSettings = { ...toolSettings, strokeLinecap: linecap as 'butt' | 'round' | 'square' };
          updateSettings(newSettings);
        },
        onStrokeLinejoinChange: (linejoin: string) => {
          const newSettings = { ...toolSettings, strokeLinejoin: linejoin as 'miter' | 'round' | 'bevel' };
          updateSettings(newSettings);
        },
        onFillRuleChange: toolType === 'pencil' ? undefined : ((fillRule: string) => {
          const newSettings = { ...toolSettings, fillRule: fillRule as 'nonzero' | 'evenodd' };
          updateSettings(newSettings);
        })
      }
    });

    return actions;
  };

  // Don't render if tool mode is not active or no portal container
  if (!isToolActive || !portalContainer) {
    return null;
  }

  // Don't render if toolSettings is not yet available
  if (!toolSettings) {
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

export const TextFloatingToolbar: React.FC = () => (
  <DrawingFloatingToolbar toolType="text" />
);
