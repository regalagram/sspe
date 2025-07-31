import React, { useState } from 'react';
import { Palette, PaintBucket, Brush, ChevronDown } from 'lucide-react';
import { ToolbarButton, ToolbarSection } from './ToolbarButton';
import { ToolbarSubmenu, SubmenuItem } from './ToolbarSubmenu';
import { useEditorStore } from '../store/editorStore';

export const WritingStyleTools: React.FC = () => {
  const { selection, updatePathStyle, paths } = useEditorStore();
  const [isStyleSubmenuOpen, setIsStyleSubmenuOpen] = useState(false);

  const hasSelection = selection.selectedPaths.length > 0 || selection.selectedSubPaths.length > 0;

  // Get all affected path IDs (directly selected paths + parent paths of selected subpaths)
  const getAffectedPathIds = () => {
    const pathIds = new Set(selection.selectedPaths);
    
    // Add parent paths of selected subpaths
    selection.selectedSubPaths.forEach(subPathId => {
      const parentPath = paths.find(path => 
        path.subPaths.some(subPath => subPath.id === subPathId)
      );
      if (parentPath) {
        pathIds.add(parentPath.id);
      }
    });
    
    return Array.from(pathIds);
  };

  const handleFillColor = (color: string) => {
    if (hasSelection) {
      const pathIds = getAffectedPathIds();
      pathIds.forEach(pathId => {
        updatePathStyle(pathId, { fill: color });
      });
    }
  };

  const handleStrokeColor = (color: string) => {
    if (hasSelection) {
      const pathIds = getAffectedPathIds();
      pathIds.forEach(pathId => {
        updatePathStyle(pathId, { stroke: color });
      });
    }
  };

  const handleStrokeWidth = (width: number) => {
    if (hasSelection) {
      const pathIds = getAffectedPathIds();
      pathIds.forEach(pathId => {
        updatePathStyle(pathId, { strokeWidth: width });
      });
    }
  };

  const handleRemoveFill = () => {
    if (hasSelection) {
      const pathIds = getAffectedPathIds();
      pathIds.forEach(pathId => {
        updatePathStyle(pathId, { fill: 'none' });
      });
    }
  };

  const handleRemoveStroke = () => {
    if (hasSelection) {
      const pathIds = getAffectedPathIds();
      pathIds.forEach(pathId => {
        updatePathStyle(pathId, { stroke: 'none' });
      });
    }
  };

  const colors = [
    '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', 
    '#ffff00', '#ff00ff', '#00ffff', '#ff8800', '#8800ff'
  ];
  const strokeWidths = [1, 2, 3, 5, 8, 12, 16, 20];

  return (
    <ToolbarSection title="Style Tools">
      <ToolbarSubmenu
        trigger={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '40px',
            background: isStyleSubmenuOpen ? '#e5e7eb' : 'white',
            fontSize: '12px',
            fontWeight: 600,
            color: '#007acc',
            border: 'none',
            gap: '4px',
            padding: '0 4px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            position: 'relative',
            opacity: hasSelection ? 1 : 0.5
          }}>
            <Palette size={16} />
            <ChevronDown size={12} style={{ 
              marginLeft: '2px',
              transform: isStyleSubmenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }} />
          </div>
        }
        isOpen={isStyleSubmenuOpen}
        onToggle={() => setIsStyleSubmenuOpen(!isStyleSubmenuOpen)}
      >
        {!hasSelection ? (
          <div style={{ 
            padding: '12px', 
            fontSize: '14px', 
            color: '#6b7280',
            textAlign: 'center'
          }}>
            Select a path to style
          </div>
        ) : (
          <>
            {/* Fill Colors */}
            <div style={{ padding: '8px 12px', fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>
              Fill Colors
            </div>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(5, 1fr)', 
              gap: '4px', 
              padding: '4px 12px',
              marginBottom: '4px'
            }}>
              {colors.map(color => (
                <button
                  key={`fill-${color}`}
                  style={{
                    width: '24px',
                    height: '24px',
                    background: color,
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'transform 0.1s ease'
                  }}
                  onClick={() => {
                    handleFillColor(color);
                    setIsStyleSubmenuOpen(false);
                  }}
                  onPointerEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
                  }}
                  onPointerLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                  }}
                />
              ))}
            </div>
            <SubmenuItem
              icon={<div style={{ width: '16px', height: '16px', border: '1px solid #ccc', background: 'transparent' }} />}
              label="No Fill"
              onClick={() => {
                handleRemoveFill();
                setIsStyleSubmenuOpen(false);
              }}
            />

            <div style={{ 
              height: '1px', 
              background: '#e5e7eb', 
              margin: '4px 0' 
            }} />

            {/* Stroke Colors */}
            <div style={{ padding: '8px 12px', fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>
              Stroke Colors
            </div>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(5, 1fr)', 
              gap: '4px', 
              padding: '4px 12px',
              marginBottom: '4px'
            }}>
              {colors.map(color => (
                <button
                  key={`stroke-${color}`}
                  style={{
                    width: '24px',
                    height: '24px',
                    background: color,
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'transform 0.1s ease'
                  }}
                  onClick={() => {
                    handleStrokeColor(color);
                    setIsStyleSubmenuOpen(false);
                  }}
                  onPointerEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
                  }}
                  onPointerLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                  }}
                />
              ))}
            </div>
            <SubmenuItem
              icon={<div style={{ width: '16px', height: '16px', border: '1px solid #ccc', background: 'transparent' }} />}
              label="No Stroke"
              onClick={() => {
                handleRemoveStroke();
                setIsStyleSubmenuOpen(false);
              }}
            />

            <div style={{ 
              height: '1px', 
              background: '#e5e7eb', 
              margin: '4px 0' 
            }} />

            {/* Stroke Width */}
            <div style={{ padding: '8px 12px', fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>
              Stroke Width
            </div>
            {strokeWidths.map(width => (
              <SubmenuItem
                key={width}
                icon={<div style={{ 
                  width: '16px', 
                  height: '2px', 
                  background: '#374151',
                  transform: `scaleY(${Math.min(width / 2, 4)})`
                }} />}
                label={`${width}px`}
                onClick={() => {
                  handleStrokeWidth(width);
                  setIsStyleSubmenuOpen(false);
                }}
              />
            ))}
          </>
        )}
      </ToolbarSubmenu>
    </ToolbarSection>
  );
};