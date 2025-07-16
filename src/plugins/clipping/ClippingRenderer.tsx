import React from 'react';
import { useEditorStore } from '../../store/editorStore';

export const ClippingRenderer: React.FC = () => {
  const { clipPaths, masks, paths, groups } = useEditorStore();

  if (clipPaths.length === 0 && masks.length === 0) return null;

  // Helper function to render path from group children
  const renderChildContent = (childId: string, childType: string) => {
    switch (childType) {
      case 'path':
        const path = paths.find(p => p.id === childId);
        if (!path) return null;
        
        // Convert path to SVG path string
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
            fill={typeof path.style.fill === 'string' ? path.style.fill : 'none'}
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

  return (
    <defs>
      {/* Render Clip Paths */}
      {clipPaths.map((clipPath) => (
        <clipPath
          key={clipPath.id}
          id={clipPath.id}
          clipPathUnits={clipPath.clipPathUnits || 'userSpaceOnUse'}
          transform={clipPath.transform}
        >
          {clipPath.children.map(child => renderChildContent(child.id, child.type))}
        </clipPath>
      ))}

      {/* Render Masks */}
      {masks.map((mask) => (
        <mask
          key={mask.id}
          id={mask.id}
          x={mask.x}
          y={mask.y}
          width={mask.width}
          height={mask.height}
          maskUnits={mask.maskUnits || 'objectBoundingBox'}
          maskContentUnits={mask.maskContentUnits || 'userSpaceOnUse'}
          transform={mask.transform}
        >
          {mask.children.map(child => renderChildContent(child.id, child.type))}
        </mask>
      ))}
    </defs>
  );
};