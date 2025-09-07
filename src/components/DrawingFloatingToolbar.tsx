import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Palette, Brush, LineSquiggle, Type, Hash } from 'lucide-react';
import { FloatingToolbarButton } from './FloatingToolbar/FloatingToolbarButton';
import { useEditorStore } from '../store/editorStore';
import { useMobileDetection } from '../hooks/useMobileDetection';
import { toolModeManager } from '../core/ToolModeManager';
import { pencilManager } from '../plugins/pencil/PencilManager';
import { curvesManager } from '../plugins/curves/CurvesManager';
import { shapeManager } from '../plugins/shapes/ShapeManager';
import { ToolbarAction } from '../types/floatingToolbar';
import { CONFIG } from '../config/constants';

// Types for different drawing tools
type DrawingToolType = 'pencil' | 'curves' | 'shapes' | 'text';

interface DrawingSettings {
  color: string; // Unified color - used for stroke or fill depending on tool
  strokeWidth: number;
  strokeOpacity: number;
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
  // Always use the unified color as the primary color source
  const unifiedColor = settings.unifiedColor || settings.strokeColor || settings.fill || '#6b7280';

  // Unified opacity sharing logic:
  // - For Pencil/Curve: Use strokeOpacity, fallback to fillOpacity if not available
  // - For Shape/Text: Use fillOpacity, fallback to strokeOpacity if not available
  let strokeOpacityValue = 1.0;
  let fillOpacityValue = 1.0;

  if (toolType === 'pencil' || toolType === 'curves') {
    // For stroke-based tools, prefer strokeOpacity but fallback to fillOpacity
    strokeOpacityValue = settings.strokeOpacity !== undefined ? settings.strokeOpacity : (settings.fillOpacity || 1.0);
  } else {
    // For fill-based tools, prefer fillOpacity but fallback to strokeOpacity
    fillOpacityValue = settings.fillOpacity !== undefined ? settings.fillOpacity : (settings.strokeOpacity || 1.0);
  }

  const normalized: DrawingSettings = {
    color: unifiedColor,
    strokeWidth: settings.strokeWidth || 2,
    strokeOpacity: strokeOpacityValue,
    strokeDasharray: settings.strokeDasharray || 'none',
    strokeLinecap: settings.strokeLinecap || 'round',
    strokeLinejoin: settings.strokeLinejoin || 'round'
  };

  // Add opacity for shapes and text
  if (toolType === 'shapes') {
    normalized.fillOpacity = fillOpacityValue;
    normalized.fillRule = settings.fillRule || 'nonzero';
  } else if (toolType === 'text') {
    normalized.fillOpacity = fillOpacityValue;
    normalized.fontFamily = settings.fontFamily || 'Arial';
    normalized.fontSize = settings.fontSize || 16;
  }

  return normalized;
};

// Helper function to update settings based on tool type
const updateManagerSettings = (manager: BaseManager, newSettings: DrawingSettings, toolType: DrawingToolType) => {
  if (toolType === 'shapes') {
    // For shapes, use color as fill and exclude stroke properties
    const shapeSettings = {
      fill: newSettings.color,
      fillOpacity: newSettings.fillOpacity,
      fillRule: newSettings.fillRule
    };
    manager.updateSettings(shapeSettings);
  } else if (toolType === 'text') {
    // For text, use color as fill and include font properties
    const textSettings = {
      fill: newSettings.color,
      fillOpacity: newSettings.fillOpacity,
      fontFamily: newSettings.fontFamily,
      fontSize: newSettings.fontSize
    };
    manager.updateSettings(textSettings);
  } else {
    // For pencil and curves, use color as stroke
    const strokeSettings = {
      strokeColor: newSettings.color,
      strokeWidth: newSettings.strokeWidth,
      strokeOpacity: newSettings.strokeOpacity,
      strokeDasharray: newSettings.strokeDasharray,
      strokeLinecap: newSettings.strokeLinecap,
      strokeLinejoin: newSettings.strokeLinejoin
    };
    manager.updateSettings(strokeSettings);
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
    // Always update the unified color and sync to both strokeColor and fill
    const storeUpdates: any = {};
    
    if (newSettings.color) {
      storeUpdates.unifiedColor = newSettings.color;
      storeUpdates.strokeColor = newSettings.color; // Keep stroke in sync
      storeUpdates.fill = newSettings.color; // Keep fill in sync
    }
    
    // Unified opacity sharing: sync strokeOpacity and fillOpacity
    if (newSettings.strokeOpacity !== undefined) {
      storeUpdates.strokeOpacity = newSettings.strokeOpacity;
      storeUpdates.fillOpacity = newSettings.strokeOpacity; // Sync fill opacity too
    }
    if (newSettings.fillOpacity !== undefined) {
      storeUpdates.fillOpacity = newSettings.fillOpacity;
      storeUpdates.strokeOpacity = newSettings.fillOpacity; // Sync stroke opacity too
    }
    
    // Copy other settings as-is
    Object.keys(newSettings).forEach(key => {
      if (key !== 'color' && key !== 'strokeOpacity' && key !== 'fillOpacity') {
        storeUpdates[key] = (newSettings as any)[key];
      }
    });

    // Update the store
    updateDrawingSettings(storeUpdates);
    
    // Also update the individual manager to keep them in sync
    const currentNormalized = normalizeSettings(toolSettings, toolType);
    const completeSettings = { ...currentNormalized, ...newSettings };
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
      const normalizedSettings = normalizeSettings(toolSettings, toolType);
      updateManagerSettings(manager, normalizedSettings, toolType);
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

    // Get current normalized settings for this tool type
    const currentSettings = normalizeSettings(toolSettings, toolType);

    // Universal Color Action - used for stroke (pencil/curves) or fill (shapes/text)
    const colorLabel = (toolType === 'pencil' || toolType === 'curves') ? 'Stroke Color' : 'Fill Color';
    const colorTooltip = (toolType === 'pencil' || toolType === 'curves') ? 'Change stroke color' : 'Change fill color';
    const colorIcon = (toolType === 'pencil' || toolType === 'curves') ? Brush : Palette;
    const colorId = (toolType === 'pencil' || toolType === 'curves') ? 'stroke-color' : 'fill-color';
    
    actions.push({
      id: colorId,
      icon: colorIcon,
      label: colorLabel,
      tooltip: colorTooltip,
      type: 'color',
      color: {
        currentColor: currentSettings.color,
        ...(toolType === 'pencil' || toolType === 'curves' ? {
          getCurrentStrokeOpacity: () => currentSettings.strokeOpacity,
          onStrokeOpacityChange: (opacity: number) => {
            updateSettings({ strokeOpacity: opacity });
          }
        } : {
          getCurrentFillOpacity: () => currentSettings.fillOpacity || 1.0,
          onFillOpacityChange: (opacity: number) => {
            updateSettings({ fillOpacity: opacity });
          }
        }),
        onChange: (color: string) => {
          updateSettings({ color });
        }
      }
    });

    // Stroke options for pencil and curves only
    if (toolType === 'pencil' || toolType === 'curves') {
      actions.push({
        id: 'stroke-options',
        icon: LineSquiggle,
        label: 'Stroke Options',
        tooltip: 'Configure stroke width and style',
        type: 'input',
        input: {
          currentValue: currentSettings.strokeWidth,
          onChange: (value: string | number) => {
            const width = typeof value === 'number' ? value : parseFloat(value.toString());
            if (!isNaN(width) && width >= 0) {
              updateSettings({ strokeWidth: width });
            }
          },
          type: 'number',
          placeholder: '2'
        },
        strokeOptions: {
          getCurrentStrokeWidth: () => currentSettings.strokeWidth,
          getCurrentStrokeDash: () => currentSettings.strokeDasharray || 'none',
          getCurrentStrokeLinecap: () => currentSettings.strokeLinecap || 'round',
          getCurrentStrokeLinejoin: () => currentSettings.strokeLinejoin || 'round',
          onStrokeWidthChange: (width: number) => {
            updateSettings({ strokeWidth: width });
          },
          onStrokeDashChange: (dash: string) => {
            updateSettings({ strokeDasharray: dash });
          },
          onStrokeLinecapChange: (linecap: string) => {
            updateSettings({ strokeLinecap: linecap as 'butt' | 'round' | 'square' });
          },
          onStrokeLinejoinChange: (linejoin: string) => {
            updateSettings({ strokeLinejoin: linejoin as 'miter' | 'round' | 'bevel' });
          }
        }
      });
    }

    // Font options for text only
    if (toolType === 'text') {
      // Font Family Action
      actions.push({
        id: 'font-family',
        icon: Type,
        label: 'Font',
        tooltip: 'Change font family',
        type: 'dropdown',
        dropdown: {
          currentValue: currentSettings.fontFamily || 'Arial',
          options: [
            { id: 'arial', label: 'Arial', action: () => updateSettings({ fontFamily: 'Arial, sans-serif' }) },
            { id: 'helvetica', label: 'Helvetica', action: () => updateSettings({ fontFamily: 'Helvetica, sans-serif' }) },
            { id: 'times', label: 'Times New Roman', action: () => updateSettings({ fontFamily: 'Times New Roman, serif' }) },
            { id: 'georgia', label: 'Georgia', action: () => updateSettings({ fontFamily: 'Georgia, serif' }) },
            { id: 'verdana', label: 'Verdana', action: () => updateSettings({ fontFamily: 'Verdana, sans-serif' }) },
            { id: 'courier', label: 'Courier New', action: () => updateSettings({ fontFamily: 'Courier New, monospace' }) },
            { id: 'monospace', label: 'Monospace', action: () => updateSettings({ fontFamily: 'monospace' }) },
            { id: 'serif', label: 'Serif', action: () => updateSettings({ fontFamily: 'serif' }) },
            { id: 'sans-serif', label: 'Sans-serif', action: () => updateSettings({ fontFamily: 'sans-serif' }) }
          ]
        }
      });

      // Font Size Action
      actions.push({
        id: 'font-size',
        icon: Hash,
        label: 'Font Size',
        tooltip: 'Change font size',
        type: 'input',
        input: {
          currentValue: currentSettings.fontSize || 16,
          onChange: (value: string | number) => {
            const size = typeof value === 'number' ? value : parseFloat(value.toString());
            if (!isNaN(size) && size > 0) {
              updateSettings({ fontSize: size });
            }
          },
          type: 'number',
          placeholder: '16'
        },
        opacityOptions: {
          getCurrentOpacity: () => currentSettings.fontSize || 16,
          onOpacityChange: (size: number) => {
            updateSettings({ fontSize: size });
          },
          quickValues: [8, 12, 16, 20, 24, 32, 48, 64, 96],
          unit: 'px'
        }
      });
    }

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
  // Use CONFIG constants for consistent sizing
  const buttonSize = isMobileDevice ? CONFIG.UI.TOOLBAR.MOBILE_BUTTON_SIZE : CONFIG.UI.TOOLBAR.DESKTOP_BUTTON_SIZE;
  
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
          size={buttonSize}
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
