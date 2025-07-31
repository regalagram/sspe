import React, { useState, useEffect } from 'react';
import { Square, Circle, Triangle, Star, Diamond, Hexagon, ChevronDown, ArrowRight, ArrowLeft, ArrowUp, ArrowDown, Heart, Cloud, Dot, X } from 'lucide-react';
import { ToolbarButton, ToolbarSection } from './ToolbarButton';
import { ToolbarSubmenu, SubmenuItem } from './ToolbarSubmenu';
import { useEditorStore } from '../store/editorStore';
import { toolModeManager } from '../managers/ToolModeManager';
import { shapeManager } from '../plugins/shapes/ShapeManager';
import { SHAPE_TEMPLATES } from '../plugins/shapes/ShapeDefinitions';

export const WritingShapeTools: React.FC = () => {
  const [isShapeSubmenuOpen, setIsShapeSubmenuOpen] = useState(false);
  const [toolModeState, setToolModeState] = useState(toolModeManager.getState());

  // Subscribe to tool mode changes
  useEffect(() => {
    const unsubscribe = toolModeManager.addListener(setToolModeState);
    return unsubscribe;
  }, []);

  const isShapeActive = toolModeState.activeMode === 'shapes';
  const activeShapeId = toolModeState.shapeId;

  const handleShapeSelect = (templateId: string) => {
    toolModeManager.setMode('shapes', { shapeId: templateId });
  };

  const handleExitShapeMode = () => {
    shapeManager.stopShapeCreation();
    toolModeManager.setMode('select');
  };

  // Icon mapping for shapes
  const getShapeIcon = (templateId: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'debug-dot': <Dot size={16} />,
      'rectangle': <Square size={16} />,
      'square': <Square size={16} />,
      'circle': <Circle size={16} />,
      'ellipse': <Circle size={16} />,
      'triangle': <Triangle size={16} />,
      'diamond': <Diamond size={16} />,
      'pentagon': <Hexagon size={16} />, // Using hexagon as closest available
      'hexagon': <Hexagon size={16} />,
      'octagon': <Hexagon size={16} />, // Using hexagon as closest available
      'star': <Star size={16} />,
      'arrow-right': <ArrowRight size={16} />,
      'arrow-left': <ArrowLeft size={16} />,
      'arrow-up': <ArrowUp size={16} />,
      'arrow-down': <ArrowDown size={16} />,
      'heart': <Heart size={16} />,
      'cloud': <Cloud size={16} />,
    };
    return iconMap[templateId] || <Square size={16} />;
  };

  // Get popular shapes for quick access
  const popularShapes = ['rectangle', 'circle', 'triangle', 'star'];
  const popularTemplates = SHAPE_TEMPLATES.filter(template => 
    popularShapes.includes(template.id)
  );

  // Get current active shape template
  const activeTemplate = SHAPE_TEMPLATES.find(t => t.id === activeShapeId);

  return (
    <ToolbarSection title="Shape Tools">
      <ToolbarSubmenu
        trigger={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '40px',
            background: isShapeActive ? '#007acc' : (isShapeSubmenuOpen ? '#e0f2fe' : '#f8f9fa'),
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600,
            color: isShapeActive ? 'white' : '#007acc',
            border: isShapeActive ? '2px solid #007acc' : '1px solid #e5e7eb',
            gap: '4px',
            padding: '0 4px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            position: 'relative'
          }}>
            {isShapeActive && activeTemplate ? getShapeIcon(activeTemplate.id) : <Square size={16} />}
            <ChevronDown size={12} style={{ 
              marginLeft: '2px',
              transform: isShapeSubmenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }} />
          </div>
        }
        isOpen={isShapeSubmenuOpen}
        onToggle={() => setIsShapeSubmenuOpen(!isShapeSubmenuOpen)}
      >
        {isShapeActive && (
          <>
            <SubmenuItem
              icon={<X size={16} />}
              label="Exit Shape Mode"
              onClick={() => {
                handleExitShapeMode();
                setIsShapeSubmenuOpen(false);
              }}
              active={true}
            />
            <div style={{ 
              height: '1px', 
              background: '#e5e7eb', 
              margin: '4px 0' 
            }} />
          </>
        )}

        {/* Popular Shapes */}
        <div style={{ padding: '8px 12px', fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>
          Popular Shapes
        </div>
        {popularTemplates.map(template => (
          <SubmenuItem
            key={template.id}
            icon={getShapeIcon(template.id)}
            label={template.name}
            onClick={() => {
              handleShapeSelect(template.id);
              setIsShapeSubmenuOpen(false);
            }}
            active={activeShapeId === template.id}
          />
        ))}

        <div style={{ 
          height: '1px', 
          background: '#e5e7eb', 
          margin: '4px 0' 
        }} />

        {/* All Shapes by Category */}
        {['basic', 'geometric', 'arrows', 'symbols'].map(category => {
          const categoryTemplates = SHAPE_TEMPLATES.filter(t => t.category === category);
          if (categoryTemplates.length === 0) return null;

          return (
            <div key={category}>
              <div style={{ padding: '8px 12px', fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </div>
              {categoryTemplates.map(template => (
                <SubmenuItem
                  key={template.id}
                  icon={getShapeIcon(template.id)}
                  label={template.name}
                  onClick={() => {
                    handleShapeSelect(template.id);
                    setIsShapeSubmenuOpen(false);
                  }}
                  active={activeShapeId === template.id}
                />
              ))}
            </div>
          );
        })}
      </ToolbarSubmenu>
      
      {/* Small spacing after shape tools */}
      <div style={{ width: '4px' }} />
    </ToolbarSection>
  );
};