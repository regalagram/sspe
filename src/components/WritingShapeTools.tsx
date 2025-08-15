import React, { useState, useEffect } from 'react';
import { Square, Circle, Triangle, Star, Diamond, Hexagon, ChevronDown, ArrowRight, ArrowLeft, ArrowUp, ArrowDown, Heart, Cloud, Dot, X } from 'lucide-react';
import { ToolbarButton, ToolbarSection } from './ToolbarButton';
import { ToolbarSubmenu, SubmenuItem } from './ToolbarSubmenu';
import { useEditorStore } from '../store/editorStore';
import { toolModeManager } from '../managers/ToolModeManager';
import { shapeManager } from '../plugins/shapes/ShapeManager';
import { SHAPE_TEMPLATES } from '../plugins/shapes/ShapeDefinitions';
import { useMobileDetection } from '../hooks/useMobileDetection';

export const WritingShapeTools: React.FC = () => {
  const { isMobile } = useMobileDetection();
  const [isShapeSubmenuOpen, setIsShapeSubmenuOpen] = useState(false);
  const [toolModeState, setToolModeState] = useState(toolModeManager.getState());

  // Match floating toolbar button sizing
  const buttonSize = isMobile ? 28 : 32;
  const iconSize = isMobile ? 12 : 13; // Fixed icon sizes: 12px mobile, 13px desktop
  const chevronSize = isMobile ? 8 : 9; // Fixed chevron sizes: 8px mobile, 9px desktop

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
  const getShapeIcon = (templateId: string): React.ReactElement => {
    const iconMap: Record<string, React.ReactElement> = {
      'debug-dot': <Dot />,
      'rectangle': <Square />,
      'square': <Square />,
      'circle': <Circle />,
      'ellipse': <Circle />,
      'triangle': <Triangle />,
      'diamond': <Diamond />,
      'pentagon': <Hexagon />, // Using hexagon as closest available
      'hexagon': <Hexagon />,
      'octagon': <Hexagon />, // Using hexagon as closest available
      'star': <Star />,
      'arrow-right': <ArrowRight />,
      'arrow-left': <ArrowLeft />,
      'arrow-up': <ArrowUp />,
      'arrow-down': <ArrowDown />,
      'heart': <Heart />,
      'cloud': <Cloud />,
    };
    return iconMap[templateId] || <Square />;
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
            width: `${buttonSize}px`,
            height: `${buttonSize}px`,
            background: isShapeActive ? '#374151' : (isShapeSubmenuOpen ? '#f3f4f6' : 'white'),
            fontSize: '12px',
            fontWeight: 600,
            color: isShapeActive ? 'white' : '#374151',
            border: 'none',
            borderRadius: '0px',
            gap: '2px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            position: 'relative',
            opacity: 1,
            touchAction: 'manipulation'
          }}>
            {React.cloneElement(
              isShapeActive && activeTemplate ? getShapeIcon(activeTemplate.id) : <Square />, 
              { size: iconSize }
            )}
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
    </ToolbarSection>
  );
};