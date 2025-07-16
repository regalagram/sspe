import React from 'react';
import { useEditorStore } from '../../store/editorStore';

export const MarkerRenderer: React.FC = () => {
  const { markers, paths, groups } = useEditorStore();

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
  const createDefaultArrowPath = () => (
    <path
      d="M 0 0 L 10 3 L 0 6 z"
      fill="currentColor"
    />
  );

  return (
    <defs>
      {markers.map((marker) => (
        <marker
          key={marker.id}
          id={marker.id}
          markerUnits={marker.markerUnits || 'strokeWidth'}
          refX={marker.refX || 0}
          refY={marker.refY || 3}
          markerWidth={marker.markerWidth || 10}
          markerHeight={marker.markerHeight || 6}
          orient={marker.orient || 'auto'}
          viewBox={marker.viewBox || '0 0 10 6'}
          preserveAspectRatio={marker.preserveAspectRatio}
        >
          {marker.children.length > 0 
            ? marker.children.map(child => renderChildContent(child.id, child.type))
            : createDefaultArrowPath()
          }
        </marker>
      ))}
    </defs>
  );
};