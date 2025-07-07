import { useEffect } from 'react';
import { pluginManager } from '../core/PluginSystem';

export const usePluginInitialization = (editorStore: any, svgRef: React.RefObject<SVGSVGElement | null>) => {
  useEffect(() => {
    pluginManager.setEditorStore(editorStore);
    pluginManager.setSVGRef(svgRef);
    
    pluginManager.getEnabledPlugins().forEach(plugin => {
      plugin.initialize?.(editorStore);
    });
  }, [editorStore, svgRef]);
};
