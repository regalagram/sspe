import { useEffect } from 'react';
import { pluginManager } from '../core/PluginSystem';

/**
 * Hook for initializing plugins with editor store and SVG ref
 * Following the principle: "Separation of logic and presentation"
 */
export const usePluginInitialization = (editorStore: any, svgRef: React.RefObject<SVGSVGElement | null>) => {
  useEffect(() => {
    // Set up editor store and SVG ref for plugin manager
    pluginManager.setEditorStore(editorStore);
    pluginManager.setSVGRef(svgRef);
    
    // Initialize plugins with editor store (plugins are already registered)
    pluginManager.getEnabledPlugins().forEach(plugin => {
      plugin.initialize?.(editorStore);
    });
  }, [editorStore, svgRef]);
};
