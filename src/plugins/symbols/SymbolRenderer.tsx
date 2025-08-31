import React from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useAnimationsForElement } from '../../components/AnimationRenderer';
import { isGradientOrPattern } from '../../utils/gradient-utils';
import { getAllElementsByZIndex } from '../../utils/z-index-manager';

// Helper function to convert gradient/pattern objects to URL references
const styleValueToCSS = (value: any): string | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object' && value !== null && value.id) {
    // It's a gradient or pattern object, convert to URL reference
    return `url(#${value.id})`;
  }
  return String(value);
};

// Individual Use Element Component that can use hooks
const UseElementComponent: React.FC<{ use: any }> = ({ use }) => {
  const { symbols, selection, viewport, enabledFeatures } = useEditorStore();
  const animations = useAnimationsForElement(use.id);
  
  const isSelected = selection.selectedUses.includes(use.id);
  const isWireframeMode = enabledFeatures.wireframeEnabled;
  const strokeWidth = 1 / viewport.zoom;

  // Calculate effective position considering transform and current transformation state
  const getEffectivePosition = () => {
    // Always use x,y coordinates for consistent positioning
    // The transform matrix will handle any additional transformations
    return { x: use.x || 0, y: use.y || 0 };
  };

  const { x: effectiveX, y: effectiveY } = getEffectivePosition();

  return (
    <g key={use.id} data-use-id={use.id}>
      {/* Invisible interaction rectangle for better pointer event detection */}
      <rect
        x={effectiveX}
        y={effectiveY}
        width={use.width || 100}
        height={use.height || 100}
        transform={use.transform}
        fill="transparent"
        stroke="none"
        pointerEvents="all"
        data-element-type="use"
        data-element-id={use.id}
        style={{ cursor: 'pointer' }}
      />
      
      {/* Render as wireframe or normal use element depending on mode */}
      {isWireframeMode ? (
        // Wireframe mode: render as outlined rectangle with symbol label
        <g>
          <rect
            x={effectiveX}
            y={effectiveY}
            width={use.width || 100}
            height={use.height || 100}
            fill="none"
            stroke="#000000"
            strokeWidth={strokeWidth * 2}
            transform={use.transform}
            pointerEvents="none"
            data-element-type="use-visual"
            data-element-id={use.id}
            style={{
              opacity: use.style?.opacity ?? 1,
            }}
          />
          {/* Diagonal lines to indicate it's a symbol instance */}
          <line
            x1={effectiveX}
            y1={effectiveY}
            x2={effectiveX + (use.width || 100)}
            y2={effectiveY + (use.height || 100)}
            stroke="#000000"
            strokeWidth={strokeWidth}
            transform={use.transform}
            style={{
              opacity: 0.3,
              pointerEvents: 'none'
            }}
          />
          <line
            x1={effectiveX + (use.width || 100)}
            y1={effectiveY}
            x2={effectiveX}
            y2={effectiveY + (use.height || 100)}
            stroke="#000000"
            strokeWidth={strokeWidth}
            transform={use.transform}
            style={{
              opacity: 0.3,
              pointerEvents: 'none'
            }}
          />
          {/* Symbol reference label */}
          <text
            x={effectiveX + 4}
            y={effectiveY + 12}
            fontSize={10 / viewport.zoom}
            fill="#000000"
            style={{
              opacity: 0.7,
              pointerEvents: 'none',
              fontFamily: 'monospace'
            }}
            transform={use.transform}
          >
            {use.href?.replace('#', '') || 'SYM'}
          </text>
        </g>
      ) : (
        // Normal mode: render actual use element
        <use
          id={use.id}
          href={use.href}
          x={effectiveX}
          y={effectiveY}
          width={use.width}
          height={use.height}
          transform={use.transform}
          style={{
            opacity: use.style?.opacity ?? 1,
            clipPath: styleValueToCSS(use.style?.clipPath),
            mask: styleValueToCSS(use.style?.mask),
            filter: styleValueToCSS(use.style?.filter),
            fill: styleValueToCSS(use.style?.fill) || '#000000',
            stroke: styleValueToCSS(use.style?.stroke) || 'none',
            strokeWidth: use.style?.strokeWidth ?? 1,
            strokeOpacity: use.style?.strokeOpacity ?? 1,
            fillOpacity: use.style?.fillOpacity ?? 1,
            strokeDasharray: use.style?.strokeDasharray || 'none',
            strokeLinecap: use.style?.strokeLinecap || 'butt',
            strokeLinejoin: use.style?.strokeLinejoin || 'miter',
          }}
          pointerEvents="none"
          data-element-type="use-visual"
          data-element-id={use.id}
        />
      )}
      {/* Include animations as siblings that target the use element */}
      {animations}
      
      {/* Selection outline */}
      {isSelected && (() => {
        // Try to get the symbol to determine proper bounds
        const symbol = symbols.find(s => use.href === `#${s.id}`);
        let selectionWidth = use.width || 100;
        let selectionHeight = use.height || 100;
        
        // If the symbol has a viewBox and no explicit width/height on use, use viewBox dimensions
        if (symbol && symbol.viewBox && !use.width && !use.height) {
          const viewBoxMatch = symbol.viewBox.match(/^[\d\s.,-]+$/);
          if (viewBoxMatch) {
            const viewBoxParts = symbol.viewBox.split(/[\s,]+/).map(Number);
            if (viewBoxParts.length === 4) {
              selectionWidth = viewBoxParts[2]; // width from viewBox
              selectionHeight = viewBoxParts[3]; // height from viewBox
            }
          }
        }
        
        return (
          <rect
            x={use.x || 0}
            y={use.y || 0}
            width={selectionWidth}
            height={selectionHeight}
            fill="none"
            stroke="#007ACC"
            strokeWidth={strokeWidth}
            strokeDasharray={`${4 / viewport.zoom} ${4 / viewport.zoom}`}
            pointerEvents="none"
            data-element-type="use-selection"
            data-element-id={use.id}
          />
        );
      })()}
    </g>
  );
};

export const SymbolRenderer: React.FC = () => {
  const { symbols, uses, paths, groups } = useEditorStore();

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
          />
        );

      case 'group':
        const group = groups.find(g => g.id === childId);
        if (!group) return null;
        
        return (
          <g key={childId} transform={group.transform}>
            {group.children.map(child => renderChildContent(child.id, child.type)).filter(Boolean)}
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
                  const subPaths = (child as any).subPaths;
                  if (!subPaths || !Array.isArray(subPaths)) {
                    console.warn('Symbol child has invalid subPaths:', child);
                    return null;
                  }
                  
                  const pathData = subPaths.map((subPath: any) => {
                    if (!subPath.commands || !Array.isArray(subPath.commands)) {
                      return '';
                    }
                    return subPath.commands.map((cmd: any) => {
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
                    }).join(' ');
                  }).join(' ');

                  // Only render if we have valid path data
                  if (!pathData || pathData.trim() === '') {
                    console.warn('Symbol child generated empty path data:', child);
                    return null;
                  }

                  // Create path without explicit styles to allow inheritance from <use>
                  return (
                    <path
                      key={`${symbol.id}-child-${index}`}
                      d={pathData}
                    />
                  );
                }
                
                // Handle reference-based children (existing logic)
                if ((child as any).id && child.type) {
                  return renderChildContent((child as any).id, child.type);
                }
                
                // Skip unhandled children
                return null;
              }).filter(Boolean)}
            </symbol>
          ))}
        </defs>
      )}

      {/* Render Use Instances */}
      {getAllElementsByZIndex()
        .filter(({ type }) => type === 'use')
        .map(({ element }) => {
          const use = element as any; // Type assertion since we filtered by 'use'
          return <UseElementComponent key={use.id} use={use} />;
        }).length > 0 && (
        <g data-layer="symbol-instances">
          {getAllElementsByZIndex()
            .filter(({ type }) => type === 'use')
            .map(({ element }) => {
              const use = element as any; // Type assertion since we filtered by 'use'
              return <UseElementComponent key={use.id} use={use} />;
            })}
        </g>
      )}
    </>
  );
};