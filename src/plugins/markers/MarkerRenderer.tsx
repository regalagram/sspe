import React from 'react';
import { useEditorStore } from '../../store/editorStore';

export const MarkerRenderer: React.FC = () => {
  const { markers, paths, groups, viewport } = useEditorStore();

  if (markers.length === 0) return null;

  // Helper function to render path from group children (simplified for markers)
  const renderChildContent = (childId: string, childType: string) => {
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

        return (
          <path
            key={childId}
            d={pathData}
            fill={typeof path.style.fill === 'string' ? path.style.fill : 'currentColor'}
            stroke={typeof path.style.stroke === 'string' ? path.style.stroke : 'none'}
            strokeWidth={path.style.strokeWidth}
          />
        );

      case 'group':
        const group = groups.find(g => g.id === childId);
        if (!group) return null;
        
        return (
          <g key={childId} transform={group.transform}>
            {group.children.map(child => renderChildContent(child.id, child.type))}
          </g>
        );

      default:
        return null;
    }
  };

  // Create default arrow path if marker has no children
  const createDefaultArrowPath = (zoomScale: number = 1) => {
    // Scale the path coordinates inversely with zoom to maintain visual size
    const scale = 1 / zoomScale;
    return (
      <path
        d={`M 0 0 L ${10 * scale} ${2.5 * scale} L 0 ${5 * scale} z`}
        fill="currentColor"
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
              : createDefaultArrowPath(viewport.zoom)
            }
          </marker>
        );
      })}
    </defs>
  );
};