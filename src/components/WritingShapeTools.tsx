import React, { useState, useEffect } from 'react';
import { Square, Circle, Triangle, Star, Diamond, Hexagon, ChevronDown, ArrowRight, ArrowLeft, ArrowUp, ArrowDown, Heart, Cloud, Dot, X } from 'lucide-react';
import { ToolbarSection } from './ToolbarButton';
import { ToolbarSubmenu, SubmenuItem } from './ToolbarSubmenu';
import { toolModeManager } from '../core/ToolModeManager';
import { shapeManager } from '../plugins/shapes/ShapeManager';
import { SHAPE_TEMPLATES } from '../plugins/shapes/ShapeDefinitions';
import { useMobileDetection } from '../hooks/useMobileDetection';
import { CONFIG } from '../config/constants';

export const WritingShapeTools: React.FC = () => {
  const { isMobile } = useMobileDetection();
  const [isShapeSubmenuOpen, setIsShapeSubmenuOpen] = useState(false);
  const [toolModeState, setToolModeState] = useState(toolModeManager.getState());

  // Use CONFIG constants for consistent sizing
  const buttonSize = isMobile ? CONFIG.UI.TOOLBAR.MOBILE_BUTTON_SIZE : CONFIG.UI.TOOLBAR.DESKTOP_BUTTON_SIZE;
  const iconSize = isMobile ? CONFIG.UI.ICONS.MOBILE_SIZE : CONFIG.UI.ICONS.DESKTOP_SIZE;
  const strokeWidth = isMobile ? CONFIG.UI.ICONS.MOBILE_STROKE_WIDTH : CONFIG.UI.ICONS.DESKTOP_STROKE_WIDTH;
  const chevronSize = isMobile ? 8 : 9; // Keep chevron sizes for now

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
  const getShapeIcon = (templateId: string, size?: number): React.ReactElement => {
    const iconSizeToUse = size || iconSize;
    const iconMap: Record<string, React.ReactElement> = {
      'debug-dot': <Dot size={iconSizeToUse} strokeWidth={strokeWidth} />,
      'rectangle': <Square size={iconSizeToUse} strokeWidth={strokeWidth} />,
      'square': <Square size={iconSizeToUse} strokeWidth={strokeWidth} />,
      'circle': <Circle size={iconSizeToUse} strokeWidth={strokeWidth} />,
      'ellipse': <Circle size={iconSizeToUse} strokeWidth={strokeWidth} />,
      'triangle': <Triangle size={iconSizeToUse} strokeWidth={strokeWidth} />,
      'diamond': <Diamond size={iconSizeToUse} strokeWidth={strokeWidth} />,
      'pentagon': <Hexagon size={iconSizeToUse} strokeWidth={strokeWidth} />, // Using hexagon as closest available
      'hexagon': <Hexagon size={iconSizeToUse} strokeWidth={strokeWidth} />,
      'octagon': <Hexagon size={iconSizeToUse} strokeWidth={strokeWidth} />, // Using hexagon as closest available
      'star': <Star size={iconSizeToUse} strokeWidth={strokeWidth} />,
      'arrow-right': <ArrowRight size={iconSizeToUse} strokeWidth={strokeWidth} />,
      'arrow-left': <ArrowLeft size={iconSizeToUse} strokeWidth={strokeWidth} />,
      'arrow-up': <ArrowUp size={iconSizeToUse} strokeWidth={strokeWidth} />,
      'arrow-down': <ArrowDown size={iconSizeToUse} strokeWidth={strokeWidth} />,
      'heart': <Heart size={iconSizeToUse} strokeWidth={strokeWidth} />,
      'cloud': <Cloud size={iconSizeToUse} strokeWidth={strokeWidth} />,
    };
    return iconMap[templateId] || <Square size={iconSizeToUse} strokeWidth={strokeWidth} />;
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
              { size: iconSize, strokeWidth: strokeWidth }
            )}
          </div>
        }
        isOpen={isShapeSubmenuOpen}
        onToggle={() => setIsShapeSubmenuOpen(!isShapeSubmenuOpen)}
      >
        {isShapeActive && (
          <>
            <SubmenuItem
              icon={<X size={iconSize} strokeWidth={strokeWidth} />}
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