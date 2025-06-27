import React, { useRef } from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { subPathToString, getContrastColor } from '../../utils/path-utils';

export const PathRenderer: React.FC = () => {
  const { paths, selection, viewport, selectSubPathByPoint } = useEditorStore();
  const svgRef = useRef<SVGSVGElement>(null);

  const getSVGPoint = (e: React.MouseEvent, svgElement: SVGSVGElement) => {
    const pt = svgElement.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPoint = pt.matrixTransform(svgElement.getScreenCTM()?.inverse());
    
    // Transform point to account for zoom and pan
    return {
      x: (svgPoint.x - viewport.pan.x) / viewport.zoom,
      y: (svgPoint.y - viewport.pan.y) / viewport.zoom,
    };
  };

  return (
    <>
      {paths.map((path) => {
        // Check if any subpath of this path is selected
        const hasSelectedSubPath = path.subPaths.some(subPath => 
          selection.selectedSubPaths.includes(subPath.id)
        );
        
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
              pointerEvents: 'all',
            }}
            onClick={(e) => {
              e.stopPropagation();
              
              // Get the SVG element from the path's parent
              const svgElement = (e.target as SVGPathElement).closest('svg');
              if (svgElement) {
                const point = getSVGPoint(e, svgElement);
                selectSubPathByPoint(path.id, point);
              }
            }}
          />
        );
      })}

      {/* Render selected subpaths with visual feedback */}
      {paths.map((path) => 
        path.subPaths.map((subPath) => {
          const isSelected = selection.selectedSubPaths.includes(subPath.id);
          if (!isSelected) return null;

          const d = subPathToString(subPath);
          
          // Determine the primary color of this path for contrast calculation
          const pathStroke = path.style.stroke || '#000000';
          const pathFill = path.style.fill;
          
          // Use stroke color if available, otherwise use fill color
          const primaryColor = (pathStroke && pathStroke !== 'none') ? pathStroke : 
                              (pathFill && pathFill !== 'none') ? pathFill : '#000000';
          
          const contrastColor = getContrastColor(primaryColor);
          
          return (
            <g key={`selected-subpath-${subPath.id}`}>
              {/* Background glow */}
              <path
                d={d}
                fill="none"
                stroke={contrastColor}
                strokeWidth={(5) / viewport.zoom}
                strokeOpacity={0.3}
                style={{
                  pointerEvents: 'none',
                  filter: `blur(${2 / viewport.zoom}px)`,
                }}
              />
              {/* Main selection border */}
              <path
                d={d}
                fill="none"
                stroke={contrastColor}
                strokeWidth={(2.5) / viewport.zoom}
                strokeDasharray={`${6 / viewport.zoom},${4 / viewport.zoom}`}
                style={{
                  pointerEvents: 'none',
                  filter: `drop-shadow(0 0 ${3 / viewport.zoom}px ${contrastColor})`,
                }}
              />
            </g>
          );
        })
      )}
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
