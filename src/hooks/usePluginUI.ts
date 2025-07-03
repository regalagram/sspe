import { pluginManager } from '../core/PluginSystem';
import { usePanelModeStore } from '../plugins/panelmode/PanelManager';

/**
 * Hook for getting plugin UI configuration by position
 * Following the position-based UI system principle from README.md
 */
export const usePluginUI = () => {
  const { mode: panelMode, accordionVisible } = usePanelModeStore();

  const getPluginUIConfig = (position: string) => {
    const { getVisiblePanels } = usePanelModeStore.getState();
    const visiblePanels = getVisiblePanels();
    
    const plugins = pluginManager.getEnabledPlugins()
      .flatMap(plugin => plugin.ui || [])
      .filter(ui => ui.position === position)
      .filter(ui => {
        // In draggable mode, respect visibility settings
        if (panelMode === 'draggable') {
          return visiblePanels.some(panel => panel.id === ui.id);
        }
        return true; // In accordion mode, filtering is handled by AccordionSidebar
      })
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    // Special handling for sidebar in accordion mode - include toolbar panels too
    if (position === 'sidebar' && panelMode === 'accordion') {
      // Only show accordion if it's visible
      if (!accordionVisible) {
        return { type: 'hidden' as const };
      }
      
      // Get all draggable panels (sidebar + toolbar) including panel-mode-ui
      const allDraggablePanels = pluginManager.getEnabledPlugins()
        .flatMap(plugin => plugin.ui || [])
        .filter(ui => 
          (ui.position === 'sidebar' || ui.position === 'toolbar')
          // Include all panels, including panel-mode-ui in accordion
        )
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      
      return { type: 'accordion' as const, plugins: allDraggablePanels };
    }
    
    // In accordion mode, hide toolbar panels since they're shown in the accordion
    if (position === 'toolbar' && panelMode === 'accordion') {
      return { type: 'hidden' as const };
    }
    
    // Default draggable mode
    return { type: 'plugins' as const, plugins };
  };

  return { getPluginUIConfig, panelMode, accordionVisible };
};
