import React from 'react';
import { useEditorStore } from '../../store/editorStore';
import { getSafeTransform } from '../../utils/transform-utils';

export const ClippingRenderer: React.FC = () => {
  const { clipPaths, masks, paths, groups } = useEditorStore();

  if (clipPaths.length === 0 && masks.length === 0) return null;

  // Helper function to render child content directly from data
  const renderChildContent = (child: any) => {
    switch (child.type) {
      case 'path':
        // Convert path to SVG path string
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
      {/* Render Clip Paths */}
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

      {/* Render Masks */}
      {masks.map((mask) => {
        console.log('Rendering mask:', mask.id, 'with transform:', mask.transform);
        return (
          <mask
            key={mask.id}
            id={mask.id}
            maskUnits="userSpaceOnUse"
            transform={mask.transform}
          >
            {mask.children.map(child => {
              // For masks, we need to override the child rendering to ensure white fill
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

                console.log('🎭 MASK PATH DEBUG:', {
                  maskId: mask.id,
                  childId: child.id,
                  pathData: pathData,
                  subPaths: (child as any).subPaths,
                  pathLength: pathData?.length || 0
                });

                return (
                  <path
                    key={child.id}
                    d={pathData}
                    fill="white" // Force white fill for masks
                    stroke="none" // No stroke for masks
                    strokeWidth={0}
                  />
                );
              }
              
              // For other child types in masks, we need to force white fill too
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
                            fill="white" // Force white fill for masks
                            stroke="none" // No stroke for masks
                            strokeWidth={0}
                          />
                        );
                      }
                      return null;
                    })}
                  </g>
                );
              }
              
              return null; // Fallback for unknown types
            })}
          </mask>
        );
      })}
    </defs>
  );
};

// Separate debug component that renders outside of defs
export const ClippingDebugRenderer: React.FC = () => {
  const { masks, images, selection, viewport } = useEditorStore();

  return (
    <g data-layer="clipping-debug" transform={getSafeTransform(viewport)}>
      {/* Show where masks are positioned */}
      {masks.map((mask) => 
        mask.transform ? (
          <rect
            key={`debug-mask-${mask.id}`}
            x={0}
            y={0}
            width={100}
            height={100}
            fill="red"
            fillOpacity={0.3}
            stroke="red"
            strokeWidth={3}
            strokeDasharray="10,5"
            transform={mask.transform}
            pointerEvents="none"
          />
        ) : null
      )}
      
      {/* Show where the selected image is for comparison */}
      {selection.selectedImages.map(imageId => {
        const image = images.find(img => img.id === imageId);
        return image ? (
          <rect
            key={`debug-image-${image.id}`}
            x={image.x}
            y={image.y}
            width={image.width}
            height={image.height}
            fill="blue"
            fillOpacity={0.1}
            stroke="blue"
            strokeWidth={3}
            strokeDasharray="5,5"
            pointerEvents="none"
          />
        ) : null;
      })}
    </g>
  );
};
