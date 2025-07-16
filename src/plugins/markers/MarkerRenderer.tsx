import React from 'react';
import { useEditorStore } from '../../store/editorStore';
import { getStyleValue } from '../../utils/gradient-utils';

export const MarkerRenderer: React.FC = () => {
  const { markers, paths, groups, viewport } = useEditorStore();

  if (markers.length === 0) return null;

  // Helper function to render path from group children (simplified for markers)
  const renderChildContent = (childId: string, childType: string, markerStyle?: any) => {
    switch (childType) {
      case 'path':
        const path = paths.find(p => p.id === childId);
        if (!path) return null;
        
        // Convert path to SVG path string for marker content
        const pathData = path.subPaths.map(subPath => 
          subPath.commands.map(cmd => {
            switch (cmd.command) {
              case 'M':
                return `M ${cmd.x} ${cmd.y}`;
              case 'L':
                return `L ${cmd.x} ${cmd.y}`;
              case 'C':
                return `C ${cmd.x1} ${cmd.y1} ${cmd.x2} ${cmd.y2} ${cmd.x} ${cmd.y}`;
              case 'Z':
                return 'Z';
              default:
                return '';
            }
          }).join(' ')
        ).join(' ');

        // Use marker style if provided, otherwise use path's own style, using getStyleValue for gradients/patterns
        const fill = markerStyle?.fill 
          ? getStyleValue(markerStyle.fill) 
          : (path.style.fill ? getStyleValue(path.style.fill) : 'currentColor');
        const stroke = markerStyle?.stroke 
          ? (markerStyle.stroke !== 'none' ? getStyleValue(markerStyle.stroke) : 'none')
          : (path.style.stroke ? getStyleValue(path.style.stroke) : 'none');
        const strokeWidth = markerStyle?.strokeWidth ? (markerStyle.strokeWidth / viewport.zoom) : (path.style.strokeWidth || 0) / viewport.zoom;
        const fillOpacity = markerStyle?.fillOpacity ?? path.style.fillOpacity ?? 1;
        const strokeOpacity = markerStyle?.strokeOpacity ?? path.style.strokeOpacity ?? 1;

        return (
          <path
            key={childId}
            d={pathData}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            fillOpacity={fillOpacity}
            strokeOpacity={strokeOpacity}
          />
        );

      case 'group':
        const group = groups.find(g => g.id === childId);
        if (!group) return null;
        
        return (
          <g key={childId} transform={group.transform}>
            {group.children.map(child => renderChildContent(child.id, child.type, markerStyle))}
          </g>
        );

      default:
        return null;
    }
  };

  // Create default arrow path if marker has no children
  const createDefaultArrowPath = (zoomScale: number = 1, markerStyle?: any) => {
    // Scale the path coordinates inversely with zoom to maintain visual size
    const scale = 1 / zoomScale;
    
    // Apply marker styles or use defaults, using getStyleValue to handle gradients/patterns
    const fill = markerStyle?.fill ? getStyleValue(markerStyle.fill) : '#000000';
    const stroke = markerStyle?.stroke && markerStyle.stroke !== 'none' ? getStyleValue(markerStyle.stroke) : 'none';
    const strokeWidth = markerStyle?.strokeWidth ? (markerStyle.strokeWidth / zoomScale) : 0;
    const fillOpacity = markerStyle?.fillOpacity ?? 1;
    const strokeOpacity = markerStyle?.strokeOpacity ?? 1;
    
    return (
      <path
        d={`M 0 0 L ${10 * scale} ${2.5 * scale} L 0 ${5 * scale} z`}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        fillOpacity={fillOpacity}
        strokeOpacity={strokeOpacity}
      />
    );
  };

  return (
    <defs>
      {markers.map((marker) => {
        // Calculate zoom-independent dimensions
        const baseMarkerWidth = marker.markerWidth || 8;
        const baseMarkerHeight = marker.markerHeight || 8;
        const baseRefX = marker.refX || 0;
        const baseRefY = marker.refY || 2.5;
        
        // Scale inversely with zoom to maintain constant visual size
        const scaledMarkerWidth = baseMarkerWidth / viewport.zoom;
        const scaledMarkerHeight = baseMarkerHeight / viewport.zoom;
        const scaledRefX = baseRefX / viewport.zoom;
        const scaledRefY = baseRefY / viewport.zoom;
        
        return (
          <marker
            key={marker.id}
            id={marker.id}
            markerUnits="userSpaceOnUse"
            refX={scaledRefX}
            refY={scaledRefY}
            markerWidth={scaledMarkerWidth}
            markerHeight={scaledMarkerHeight}
            orient={marker.orient || 'auto'}
            viewBox={marker.viewBox || '0 0 10 5'}
            preserveAspectRatio={marker.preserveAspectRatio}
          >
            {marker.children.length > 0 
              ? marker.children.map(child => renderChildContent(child.id, child.type))
              : createDefaultArrowPath(viewport.zoom, marker.style)
            }
          </marker>
        );
      })}
    </defs>
  );
};