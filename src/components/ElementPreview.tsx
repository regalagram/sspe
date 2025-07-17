import React from 'react';
import { useEditorStore } from '../store/editorStore';

interface ElementPreviewProps {
  elementId: string;
  elementType: 'symbol' | 'marker' | 'clipPath' | 'mask';
  size?: number;
  className?: string;
}

export const ElementPreview: React.FC<ElementPreviewProps> = ({ 
  elementId, 
  elementType, 
  size = 40,
  className = ''
}) => {
  const { symbols, markers, clipPaths, masks } = useEditorStore();

  const getElement = () => {
    switch (elementType) {
      case 'symbol':
        return symbols.find(s => s.id === elementId);
      case 'marker':
        return markers.find(m => m.id === elementId);
      case 'clipPath':
        return clipPaths.find(c => c.id === elementId);
      case 'mask':
        return masks.find(m => m.id === elementId);
      default:
        return null;
    }
  };

  const element = getElement();
  
  if (!element) {
    return (
      <div 
        className={className}
        style={{
          width: size,
          height: size,
          backgroundColor: '#f8f9fa',
          border: '1px solid #e9ecef',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          color: '#999'
        }}
      >
        Empty
      </div>
    );
  }

  const renderChildren = (children: any[]) => {
    return children.map((child, index) => {
      switch (child.type) {
        case 'path':
          const pathData = child.subPaths?.map((subPath: any) => 
            subPath.commands?.map((cmd: any) => {
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
          ).join(' ') || 'M 0 0';

          return (
            <path
              key={`${child.id}-${index}`}
              d={pathData}
              fill={child.style?.fill || '#000'}
              stroke={child.style?.stroke || 'none'}
              strokeWidth={child.style?.strokeWidth || 0}
              fillOpacity={child.style?.fillOpacity ?? 1}
              strokeOpacity={child.style?.strokeOpacity ?? 1}
            />
          );
        case 'circle':
          return (
            <circle
              key={`${child.id}-${index}`}
              cx={child.cx || 0}
              cy={child.cy || 0}
              r={child.r || 1}
              fill={child.style?.fill || '#000'}
              stroke={child.style?.stroke || 'none'}
              strokeWidth={child.style?.strokeWidth || 0}
            />
          );
        case 'rect':
          return (
            <rect
              key={`${child.id}-${index}`}
              x={child.x || 0}
              y={child.y || 0}
              width={child.width || 1}
              height={child.height || 1}
              fill={child.style?.fill || '#000'}
              stroke={child.style?.stroke || 'none'}
              strokeWidth={child.style?.strokeWidth || 0}
            />
          );
        default:
          return null;
      }
    });
  };

  const getViewBox = () => {
    switch (elementType) {
      case 'symbol':
        return (element as any).viewBox || '0 0 100 100';
      case 'marker':
        return `0 0 ${(element as any).markerWidth || 6} ${(element as any).markerHeight || 6}`;
      case 'clipPath':
      case 'mask':
        return '0 0 100 100';
      default:
        return '0 0 100 100';
    }
  };

  return (
    <div 
      className={className}
      style={{
        width: size,
        height: size,
        backgroundColor: elementType === 'mask' ? '#f0f0f0' : '#fff',
        border: '1px solid #e9ecef',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}
    >
      <svg
        width={size - 4}
        height={size - 4}
        viewBox={getViewBox()}
        style={{
          maxWidth: '100%',
          maxHeight: '100%'
        }}
      >
        {elementType === 'marker' && (
          <defs>
            <marker
              id={`preview-${elementId}`}
              markerWidth={(element as any).markerWidth || 6}
              markerHeight={(element as any).markerHeight || 6}
              refX={(element as any).refX || 0}
              refY={(element as any).refY || 0}
              orient={(element as any).orient || 'auto'}
            >
              {renderChildren((element as any).children || [])}
            </marker>
          </defs>
        )}
        
        {elementType === 'clipPath' && (
          <defs>
            <clipPath id={`preview-${elementId}`}>
              {renderChildren((element as any).children || [])}
            </clipPath>
          </defs>
        )}
        
        {elementType === 'mask' && (
          <defs>
            <mask id={`preview-${elementId}`}>
              {renderChildren((element as any).children || [])}
            </mask>
          </defs>
        )}

        {elementType === 'symbol' && renderChildren((element as any).children || [])}
        
        {elementType === 'marker' && (
          <>
            {renderChildren((element as any).children || [])}
            <line 
              x1={0} 
              y1={(element as any).markerHeight / 2 || 3} 
              x2={(element as any).markerWidth || 6} 
              y2={(element as any).markerHeight / 2 || 3}
              stroke="#ccc"
              strokeWidth="0.5"
              markerEnd={`url(#preview-${elementId})`}
            />
          </>
        )}

        {elementType === 'clipPath' && (
          <>
            <rect 
              width="100%" 
              height="100%" 
              fill="#e3f2fd" 
              clipPath={`url(#preview-${elementId})`}
            />
            {renderChildren((element as any).children || []).map((child, idx) => 
              child ? React.cloneElement(child as React.ReactElement, { 
                key: `outline-${idx}`,
                ...{ fill: 'none', stroke: '#1976d2', strokeWidth: 1, strokeDasharray: '2,2' }
              } as any) : null
            )}
          </>
        )}

        {elementType === 'mask' && (
          <>
            <rect 
              width="100%" 
              height="100%" 
              fill="#666"
              mask={`url(#preview-${elementId})`}
            />
            {renderChildren((element as any).children || []).map((child, idx) => 
              child ? React.cloneElement(child as React.ReactElement, { 
                key: `outline-${idx}`,
                ...{ fill: 'none', stroke: '#999', strokeWidth: 1, strokeDasharray: '2,2' }
              } as any) : null
            )}
          </>
        )}
      </svg>
    </div>
  );
};