import React from 'react';
import { useEditorStore } from '../../store/editorStore';

export const SymbolRenderer: React.FC = () => {
  const { symbols, uses, paths, groups, selection, viewport } = useEditorStore();

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
            opacity={path.style.fillOpacity}
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
    <>
      {/* Render Symbol Definitions */}
      {symbols.length > 0 && (
        <defs>
          {symbols.map((symbol) => (
            <symbol
              key={symbol.id}
              id={symbol.id}
              viewBox={symbol.viewBox}
              preserveAspectRatio={symbol.preserveAspectRatio}
            >
              {symbol.children.map((child, index) => {
                // Handle direct child objects (created from selection)
                if (child.type === 'path' && (child as any).subPaths) {
                  const pathData = (child as any).subPaths.map((subPath: any) => 
                    subPath.commands.map((cmd: any) => {
                      switch (cmd.command) {
                        case 'M':
                          return `M ${cmd.x || 0} ${cmd.y || 0}`;
                        case 'L':
                          return `L ${cmd.x || 0} ${cmd.y || 0}`;
                        case 'C':
                          return `C ${cmd.x1 || 0} ${cmd.y1 || 0} ${cmd.x2 || 0} ${cmd.y2 || 0} ${cmd.x || 0} ${cmd.y || 0}`;
                        case 'Z':
                          return 'Z';
                        default:
                          return '';
                      }
                    }).join(' ')
                  ).join(' ');

                  return (
                    <path
                      key={`${symbol.id}-child-${index}`}
                      d={pathData}
                      fill={typeof (child as any).style?.fill === 'string' ? (child as any).style.fill : 'none'}
                      stroke={typeof (child as any).style?.stroke === 'string' ? (child as any).style.stroke : 'none'}
                      strokeWidth={(child as any).style?.strokeWidth || 0}
                      fillOpacity={(child as any).style?.fillOpacity ?? 1}
                      strokeOpacity={(child as any).style?.strokeOpacity ?? 1}
                    />
                  );
                }
                
                // Handle reference-based children (existing logic)
                if ((child as any).id && child.type) {
                  return renderChildContent((child as any).id, child.type);
                }
                
                return null;
              })}
            </symbol>
          ))}
        </defs>
      )}

      {/* Render Use Instances */}
      {uses.length > 0 && (
        <g data-layer="symbol-instances">
          {uses.map((use) => {
            if (use.locked) return null;
            
            const isSelected = selection.selectedUses.includes(use.id);
            const strokeWidth = 1 / viewport.zoom;
            
            return (
              <g key={use.id} data-use-id={use.id}>
                {/* Use element */}
                <use
                  href={use.href}
                  x={use.x}
                  y={use.y}
                  width={use.width}
                  height={use.height}
                  transform={use.transform}
                  style={{
                    opacity: use.style?.opacity ?? 1,
                    clipPath: use.style?.clipPath,
                    mask: use.style?.mask,
                    filter: use.style?.filter,
                  }}
                  data-element-type="use"
                  data-element-id={use.id}
                />
                
                {/* Selection outline */}
                {isSelected && (
                  <rect
                    x={use.x || 0}
                    y={use.y || 0}
                    width={use.width || 100}
                    height={use.height || 100}
                    fill="none"
                    stroke="#007ACC"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${4 / viewport.zoom} ${4 / viewport.zoom}`}
                    pointerEvents="none"
                    data-element-type="use-selection"
                    data-element-id={use.id}
                  />
                )}
                
                {/* Selection handles for transform */}
                {isSelected && (
                  <g data-element-type="use-handles" data-element-id={use.id}>
                    {/* Corner handles */}
                    {[
                      { x: use.x || 0, y: use.y || 0, cursor: 'nw-resize' },
                      { x: (use.x || 0) + (use.width || 100), y: use.y || 0, cursor: 'ne-resize' },
                      { x: (use.x || 0) + (use.width || 100), y: (use.y || 0) + (use.height || 100), cursor: 'se-resize' },
                      { x: use.x || 0, y: (use.y || 0) + (use.height || 100), cursor: 'sw-resize' },
                    ].map((handle, index) => (
                      <rect
                        key={index}
                        x={handle.x - 4 / viewport.zoom}
                        y={handle.y - 4 / viewport.zoom}
                        width={8 / viewport.zoom}
                        height={8 / viewport.zoom}
                        fill="#007ACC"
                        stroke="#ffffff"
                        strokeWidth={strokeWidth}
                        style={{ cursor: handle.cursor }}
                        data-element-type="use-handle"
                        data-element-id={use.id}
                        data-handle-type={`corner-${index}`}
                      />
                    ))}
                    
                    {/* Center handle for move */}
                    <circle
                      cx={(use.x || 0) + (use.width || 100) / 2}
                      cy={(use.y || 0) + (use.height || 100) / 2}
                      r={4 / viewport.zoom}
                      fill="#007ACC"
                      stroke="#ffffff"
                      strokeWidth={strokeWidth}
                      style={{ cursor: 'move' }}
                      data-element-type="use-handle"
                      data-element-id={use.id}
                      data-handle-type="move"
                    />
                  </g>
                )}
              </g>
            );
          })}
        </g>
      )}
    </>
  );
};