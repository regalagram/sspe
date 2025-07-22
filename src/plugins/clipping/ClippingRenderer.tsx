import React from 'react';
import { useEditorStore } from '../../store/editorStore';
export const ClippingRenderer: React.FC = () => {
  const { clipPaths, masks, paths, groups } = useEditorStore();
  if (clipPaths.length === 0 && masks.length === 0) return null;
  
  const renderChildContent = (child: any) => {
    switch (child.type) {
      case 'path':
        
        const pathData = child.subPaths.map((subPath: any) => 
          subPath.commands.map((cmd: any) => {
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
            key={child.id}
            d={pathData}
            fill={typeof child.style?.fill === 'string' ? child.style.fill : 'black'}
            stroke={typeof child.style?.stroke === 'string' ? child.style.stroke : 'none'}
            strokeWidth={child.style?.strokeWidth || 0}
          />
        );
      case 'group':
        return (
          <g key={child.id} transform={child.transform}>
            {child.children?.map((grandChild: any) => renderChildContent(grandChild))}
          </g>
        );
      default:
        return null;
    }
  };
  return (
    <defs>
      {clipPaths.map((clipPath) => (
        <clipPath
          key={clipPath.id}
          id={clipPath.id}
          clipPathUnits={clipPath.clipPathUnits || 'userSpaceOnUse'}
          transform={clipPath.transform}
        >
          {clipPath.children.map(child => renderChildContent(child))}
        </clipPath>
      ))}
      {masks.map((mask) => {
        return (
          <mask
            key={mask.id}
            id={mask.id}
            maskUnits="userSpaceOnUse"
            transform={mask.transform}
          >
            {mask.children.map(child => {
              
              if (child.type === 'path') {
                const pathData = (child as any).subPaths?.map((subPath: any) => 
                  subPath.commands?.map((cmd: any) => {
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
                    key={child.id}
                    d={pathData}
                    fill="white" 
                    stroke="none" 
                    strokeWidth={0}
                  />
                );
              }
              
              if (child.type === 'group') {
                return (
                  <g key={child.id} transform={(child as any).transform}>
                    {(child as any).children?.map((grandChild: any) => {
                      if (grandChild.type === 'path') {
                        const pathData = (grandChild as any).subPaths?.map((subPath: any) => 
                          subPath.commands?.map((cmd: any) => {
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
                            key={grandChild.id}
                            d={pathData}
                            fill="white" 
                            stroke="none" 
                            strokeWidth={0}
                          />
                        );
                      }
                      return null;
                    })}
                  </g>
                );
              }
              return null; 
            })}
          </mask>
        );
      })}
    </defs>
  );
};
