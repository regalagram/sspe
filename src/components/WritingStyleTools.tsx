import React, { useState } from 'react';
import { Palette, PaintBucket, Brush, ChevronDown, Zap, Grid3X3 } from 'lucide-react';
import { ToolbarButton, ToolbarSection } from './ToolbarButton';
import { ToolbarSubmenu, SubmenuItem } from './ToolbarSubmenu';
import { useEditorStore } from '../store/editorStore';
import { createLinearGradient, createRadialGradient, createGradientStop } from '../utils/gradient-utils';
import { createPatternFromPreset, patternPresets } from '../plugins/gradients/patternPresets';

export const WritingStyleTools: React.FC = () => {
  const { 
    selection, 
    updatePathStyle, 
    updateTextStyle, 
    updateUseStyle,
    paths, 
    texts, 
    groups, 
    addGradient 
  } = useEditorStore();
  const [isStyleSubmenuOpen, setIsStyleSubmenuOpen] = useState(false);

  const hasSelection = selection.selectedPaths.length > 0 || 
                      selection.selectedSubPaths.length > 0 || 
                      selection.selectedCommands.length > 0 ||
                      selection.selectedTexts.length > 0 ||
                      selection.selectedGroups.length > 0 ||
                      selection.selectedUses.length > 0;

  // Get all affected element IDs for styling
  const getAllAffectedElements = () => {
    const result = {
      pathIds: new Set(selection.selectedPaths),
      textIds: new Set(selection.selectedTexts),
      groupIds: new Set(selection.selectedGroups),
      useIds: new Set(selection.selectedUses)
    };
    
    // Add parent paths of selected subpaths
    selection.selectedSubPaths.forEach(subPathId => {
      const parentPath = paths.find(path => 
        path.subPaths.some(subPath => subPath.id === subPathId)
      );
      if (parentPath) {
        result.pathIds.add(parentPath.id);
      }
    });

    // Add parent paths of selected commands
    selection.selectedCommands.forEach(commandId => {
      paths.forEach(path => {
        path.subPaths.forEach(subPath => {
          if (subPath.commands.some(cmd => cmd.id === commandId)) {
            result.pathIds.add(path.id);
          }
        });
      });
    });

    // TODO: Add logic for groups that contain selected elements
    // For now, we'll apply styles directly to selected groups
    
    return {
      pathIds: Array.from(result.pathIds),
      textIds: Array.from(result.textIds),
      groupIds: Array.from(result.groupIds),
      useIds: Array.from(result.useIds)
    };
  };

  const handleFillColor = (color: string) => {
    if (hasSelection) {
      const { pathIds, textIds, groupIds, useIds } = getAllAffectedElements();
      
      // Apply to paths
      pathIds.forEach(pathId => {
        updatePathStyle(pathId, { fill: color });
      });
      
      // Apply to texts
      textIds.forEach(textId => {
        updateTextStyle(textId, { fill: color });
      });
      
      // Apply to use elements (symbol instances)
      useIds.forEach(useId => {
        updateUseStyle(useId, { fill: color });
      });
      
      // TODO: Apply to groups (groups don't have direct styles, would need to apply to children)
      // For now, skip groups as they would need recursive application to children
    }
  };

  const handleStrokeColor = (color: string) => {
    if (hasSelection) {
      const { pathIds, textIds, groupIds, useIds } = getAllAffectedElements();
      
      // Apply to paths
      pathIds.forEach(pathId => {
        updatePathStyle(pathId, { stroke: color });
      });
      
      // Apply to texts  
      textIds.forEach(textId => {
        updateTextStyle(textId, { stroke: color });
      });
      
      // Apply to use elements (symbol instances)  
      useIds.forEach(useId => {
        updateUseStyle(useId, { stroke: color });
      });
    }
  };

  const handleStrokeWidth = (width: number) => {
    if (hasSelection) {
      const { pathIds, textIds, groupIds, useIds } = getAllAffectedElements();
      
      // Apply to paths
      pathIds.forEach(pathId => {
        updatePathStyle(pathId, { strokeWidth: width });
      });
      
      // Apply to texts
      textIds.forEach(textId => {
        updateTextStyle(textId, { strokeWidth: width });
      });
      
      // Apply to use elements (symbol instances)
      useIds.forEach(useId => {
        updateUseStyle(useId, { strokeWidth: width });
      });
    }
  };

  const handleRemoveFill = () => {
    if (hasSelection) {
      const { pathIds, textIds, groupIds, useIds } = getAllAffectedElements();
      
      // Apply to paths
      pathIds.forEach(pathId => {
        updatePathStyle(pathId, { fill: 'none' });
      });
      
      // Apply to texts
      textIds.forEach(textId => {
        updateTextStyle(textId, { fill: 'none' });
      });
      
      // Apply to use elements (symbol instances)
      useIds.forEach(useId => {
        updateUseStyle(useId, { fill: 'none' });
      });
    }
  };

  const handleRemoveStroke = () => {
    if (hasSelection) {
      const { pathIds, textIds, groupIds, useIds } = getAllAffectedElements();
      
      // Apply to paths
      pathIds.forEach(pathId => {
        updatePathStyle(pathId, { stroke: 'none' });
      });
      
      // Apply to texts
      textIds.forEach(textId => {
        updateTextStyle(textId, { stroke: 'none' });
      });
      
      // Apply to use elements (symbol instances)
      useIds.forEach(useId => {
        updateUseStyle(useId, { stroke: 'none' });
      });
    }
  };

  const handleApplyGradient = (gradientType: 'linear' | 'radial', colors: string[], target: 'fill' | 'stroke' = 'fill') => {
    if (!hasSelection) return;

    // Create gradient stops
    const stops = colors.map((color, index) => 
      createGradientStop((index / (colors.length - 1)) * 100, color, 1)
    );

    // Create gradient with proper normalized coordinates (0-1 range for objectBoundingBox)
    const gradient = gradientType === 'linear' 
      ? createLinearGradient(0, 0, 1, 0, stops)
      : createRadialGradient(0.5, 0.5, 0.5, stops);

    // Add gradient to store
    addGradient(gradient);

    // Apply to all selected elements
    const { pathIds, textIds, groupIds, useIds } = getAllAffectedElements();
    
    // Apply to paths
    pathIds.forEach(pathId => {
      updatePathStyle(pathId, { [target]: gradient });
    });
    
    // Apply to texts
    textIds.forEach(textId => {
      updateTextStyle(textId, { [target]: gradient });
    });
    
    // Apply to use elements (symbol instances)
    useIds.forEach(useId => {
      updateUseStyle(useId, { [target]: gradient });
    });
  };

  const handleApplyPattern = (patternId: string, target: 'fill' | 'stroke' = 'fill') => {
    if (!hasSelection) return;

    const preset = patternPresets.find(p => p.id === patternId);
    if (!preset) return;

    const pattern = createPatternFromPreset(preset);
    
    // Add pattern to store (assuming addGradient also handles patterns)
    addGradient(pattern);

    // Apply to all selected elements
    const { pathIds, textIds, groupIds, useIds } = getAllAffectedElements();
    
    // Apply to paths
    pathIds.forEach(pathId => {
      updatePathStyle(pathId, { [target]: pattern });
    });
    
    // Apply to texts
    textIds.forEach(textId => {
      updateTextStyle(textId, { [target]: pattern });
    });
    
    // Apply to use elements (symbol instances)
    useIds.forEach(useId => {
      updateUseStyle(useId, { [target]: pattern });
    });
  };

  const colors = [
    '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', 
    '#ffff00', '#ff00ff', '#00ffff', '#ff8800', '#8800ff'
  ];
  const strokeWidths = [1, 2, 3, 5, 8, 12, 16, 20];

  // Predefined gradients
  const predefinedGradients = [
    { name: 'Sunset', colors: ['#ff6b6b', '#feca57'], type: 'linear' as const },
    { name: 'Ocean', colors: ['#54a0ff', '#2e86de'], type: 'linear' as const },
    { name: 'Forest', colors: ['#26de81', '#20bf6b'], type: 'linear' as const },
    { name: 'Purple', colors: ['#a55eea', '#8b5cf6'], type: 'linear' as const },
    { name: 'Fire', colors: ['#ff9ff3', '#f368e0'], type: 'radial' as const },
    { name: 'Sky', colors: ['#74b9ff', '#0984e3'], type: 'radial' as const },
  ];

  // Popular patterns (limit to a few for the toolbar)
  const popularPatterns = [
    'dots',
    'stripes-diagonal',
    'checkerboard',
    'waves'
  ].map(id => patternPresets.find(p => p.id === id)).filter((pattern): pattern is NonNullable<typeof pattern> => pattern !== undefined);

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
            Select elements to style
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

            {/* Gradients */}
            <div style={{ padding: '8px 12px', fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>
              Gradients
            </div>
            {predefinedGradients.map(gradient => (
              <SubmenuItem
                key={gradient.name}
                icon={
                  <div style={{ 
                    width: '16px', 
                    height: '16px', 
                    borderRadius: '50%',
                    background: gradient.type === 'linear' 
                      ? `linear-gradient(45deg, ${gradient.colors.join(', ')})`
                      : `radial-gradient(circle, ${gradient.colors.join(', ')})`,
                    border: '1px solid #e5e7eb'
                  }} />
                }
                label={gradient.name}
                onClick={() => {
                  handleApplyGradient(gradient.type, gradient.colors, 'fill');
                  setIsStyleSubmenuOpen(false);
                }}
              />
            ))}

            <div style={{ 
              height: '1px', 
              background: '#e5e7eb', 
              margin: '4px 0' 
            }} />

            {/* Patterns */}
            <div style={{ padding: '8px 12px', fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>
              Patterns
            </div>
            {popularPatterns.map(pattern => (
              <SubmenuItem
                key={pattern.id}
                icon={<Grid3X3 size={16} />}
                label={pattern.name}
                onClick={() => {
                  handleApplyPattern(pattern.id, 'fill');
                  setIsStyleSubmenuOpen(false);
                }}
              />
            ))}

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