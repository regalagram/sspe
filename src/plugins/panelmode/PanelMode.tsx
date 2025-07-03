import React, { useEffect } from 'react';
import { Plugin } from '../../core/PluginSystem';
import { PanelModeUI } from './PanelModeUI';
import { usePanelModeStore } from './PanelManager';
import { pluginManager } from '../../core/PluginSystem';

// Helper function to extract panel information from plugins
const extractPanelInfo = () => {
  const panels = pluginManager.getEnabledPlugins()
    .flatMap(plugin => plugin.ui || [])
    .filter(ui => ui.position === 'sidebar' || ui.position === 'toolbar') // Include both sidebar and toolbar
    .map(ui => ({
      id: ui.id,
      name: formatPanelName(ui.id),
      enabled: true, // Default to enabled
      order: ui.order || 0,
      pluginId: extractPluginId(ui.id),
      originalPosition: ui.position as 'sidebar' | 'toolbar', // Type assertion for filtered positions
    }));

  return panels;
};

// Helper to format panel names nicely
const formatPanelName = (id: string): string => {
  // Map of specific IDs to friendly names
  const nameMap: Record<string, string> = {
    'zoom-controls': 'Zoom',
    'creation-tools': 'Creation',
    'undo-redo-controls': 'History',
    'fullscreen-control': 'Fullscreen',
    'subpath-list': 'Sub-Paths',
    'grid-controls': 'Grid',
    'selection-tools': 'Selection',
    'visual-debug': 'Visual Debug',
    'visual-debug-controls': 'Visual Debug',
    'svg-editor': 'SVG',
    'arrange-ui': 'Arrange',
    'reorder-ui': 'Reorder',
    'reorder-component': 'Reorder',
    'pencil-tools': 'Pencil',
    'shapes-ui': 'Shapes',
    'shapes-panel': 'Shapes',
    'panel-mode-ui': 'Panel Mode',
    'command-info-panel': 'Point Info',
    'path-style-controls': 'Style',
    'point-transform-controls': 'Point Transform',
    'subpath-transform-controls': 'Sub-Path Transform',
  };

  // Return mapped name if available
  if (nameMap[id]) {
    return nameMap[id];
  }

  // Convert kebab-case to Title Case as fallback
  return id
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Helper to extract plugin ID from UI component ID
const extractPluginId = (uiId: string): string => {
  // Most UI components follow pattern: pluginId-componentType
  // e.g., "zoom-controls" -> "zoom", "subpath-list" -> "subpath"
  const parts = uiId.split('-');
  return parts[0];
};

// Component that handles panel registration
const PanelModeManager: React.FC = () => {
  const { registerPanel } = usePanelModeStore();

  useEffect(() => {
    // Register all existing sidebar panels
    const panels = extractPanelInfo();
    panels.forEach(panel => {
      registerPanel(panel);
    });

    // Set up a periodic check for new panels (in case plugins are loaded dynamically)
    const interval = setInterval(() => {
      const currentPanels = extractPanelInfo();
      currentPanels.forEach(panel => {
        registerPanel(panel);
      });
    }, 10000); // Check every 10 seconds instead of 2 seconds

    return () => clearInterval(interval);
  }, [registerPanel]);

  return null; // This component doesn't render anything
};

export const PanelModePlugin: Plugin = {
  id: 'panelmode',
  name: 'Panel Mode',
  version: '1.0.0',
  enabled: true,
  
  initialize: (editor) => {
    // Plugin initialization if needed
  },

  shortcuts: [
    {
      key: 'p',
      modifiers: ['ctrl', 'shift'],
      description: 'Toggle Panel Mode',
      action: () => {
        const store = usePanelModeStore.getState();
        store.toggleMode();
      }
    },
    {
      key: 'Tab',
      modifiers: ['ctrl'],
      description: 'Toggle Panel Visibility (Focus PanelMode)',
      action: () => {
        // Focus the panel mode UI if it exists
        const panelModeElement = document.querySelector('[data-panel-id="panel-mode-controls"]');
        if (panelModeElement) {
          (panelModeElement as HTMLElement).focus();
        }
      }
    }
  ],

  ui: [
    {
      id: 'panel-mode-ui',
      component: PanelModeUI,
      position: 'sidebar',
      order: -1, // Render first in sidebar
    },
    {
      id: 'panel-mode-manager',
      component: PanelModeManager,
      position: 'svg-content',
      order: -1, // Hidden component for management
    }
  ]
};
