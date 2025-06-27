import React from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { subPathToString } from '../../utils/path-utils';

export const PathRenderer: React.FC = () => {
  const { paths, selection, viewport, selectPath } = useEditorStore();

  return (
    <>
      {paths.map((path) => {
        const isPathSelected = selection.selectedPaths.includes(path.id);
        // Join all sub-paths into a single d string
        const d = path.subPaths.map(subPathToString).join(' ');
        
        return (
          <path
            key={`path-${path.id}`}
            d={d}
            fill={path.style.fill}
            stroke={path.style.stroke}
            strokeWidth={(path.style.strokeWidth || 1) / viewport.zoom}
            strokeDasharray={path.style.strokeDasharray}
            strokeLinecap={path.style.strokeLinecap}
            strokeLinejoin={path.style.strokeLinejoin}
            fillOpacity={path.style.fillOpacity}
            strokeOpacity={path.style.strokeOpacity}
            fillRule={path.style.fillRule || 'nonzero'}
            style={{
              cursor: 'pointer',
              filter: isPathSelected ? 'drop-shadow(0 0 2px #4488cc)' : 'none',
              pointerEvents: 'all',
            }}
            onClick={(e) => {
              e.stopPropagation();
              selectPath(path.id);
            }}
          />
        );
      })}
    </>
  );
};

export const PathRendererPlugin: Plugin = {
  id: 'path-renderer',
  name: 'Path Renderer',
  version: '1.0.0',
  enabled: true,
  ui: [
    {
      id: 'path-renderer',
      component: PathRenderer,
      position: 'svg-content',
      order: 10, // Render paths in background
    },
  ],
};
