import { pluginManager } from '../core/PluginSystem';
import { usePanelModeStore } from '../plugins/panelmode/PanelManager';

/**
 * Hook for getting plugin UI configuration by position
 * Following the position-based UI system principle from README.md
 */
export const usePluginUI = () => {
  const { accordionVisible } = usePanelModeStore();

  const getPluginUIConfig = (position: string) => {
    const { getVisiblePanels } = usePanelModeStore.getState();
    const visiblePanels = getVisiblePanels();
    
    const plugins = pluginManager.getEnabledPlugins()
      .flatMap(plugin => plugin.ui || [])
      .filter(ui => ui.position === position)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    // Special handling for sidebar - always use accordion mode
    if (position === 'sidebar') {
      // Only show accordion if it's visible
      if (!accordionVisible) {
        return { type: 'hidden' as const };
      }
      
      // Get all panels (sidebar + toolbar) including panel-mode-ui
      const allPanels = pluginManager.getEnabledPlugins()
        .flatMap(plugin => plugin.ui || [])
        .filter(ui => 
          (ui.position === 'sidebar' || ui.position === 'toolbar')
          // Include all panels, including panel-mode-ui in accordion
        )
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      
      return { type: 'accordion' as const, plugins: allPanels };
    }
    
    // Hide toolbar panels since they're shown in the accordion
    if (position === 'toolbar') {
      return { type: 'hidden' as const };
    }
    
    // Default: return plugins as-is (for other positions)
    return { type: 'plugins' as const, plugins };
  };

  return { getPluginUIConfig, accordionVisible };
};
