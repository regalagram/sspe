import React from 'react';
import { UIComponentDefinition } from '../core/PluginSystem';
import { WritingCreationTools } from './WritingCreationTools';
import { WritingPencilTools } from './WritingPencilTools';
import { WritingShapeTools } from './WritingShapeTools';
import { WritingCurveTools } from './WritingCurveTools';
import { WritingTextTools } from './WritingTextTools';
import { useMobileDetection } from '../hooks/useMobileDetection';

interface WritingToolbarProps {
  toolbarPlugins?: UIComponentDefinition[];
}

export const WritingToolbar: React.FC<WritingToolbarProps> = ({ 
  toolbarPlugins = []
}) => {
  const { isMobile, isTablet } = useMobileDetection();
  const isMobileDevice = isMobile || isTablet;
  
  // Match floating toolbar dimensions exactly
  const toolbarStyle: React.CSSProperties = {
    background: 'white',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    position: 'fixed',
    top: 'env(safe-area-inset-top, 8px)',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 9998,
    overflowX: 'visible',
    overflowY: 'visible',
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    WebkitBackfaceVisibility: 'hidden',
    backfaceVisibility: 'hidden',
    WebkitTransform: 'translate3d(-50%, 0, 0)',
    width: 'fit-content',
    minHeight: 'fit-content',
    userSelect: 'none',
    touchAction: 'manipulation'
  };

  const toolbarContentStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0px',
    gap: '0px',
    height: isMobileDevice ? '28px' : '32px', // Match button sizes exactly
    overflow: 'visible',
    position: 'relative',
    whiteSpace: 'nowrap'
  };

  // CSS to hide scrollbar in WebKit browsers
  const scrollbarHideStyle: React.CSSProperties = {
    scrollbarWidth: 'none',
  };

  return (
    <div style={{ ...toolbarStyle, ...scrollbarHideStyle }}>
      <style>
        {`
          .top-toolbar-content::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>
      <div 
        className="top-toolbar-content"
        style={toolbarContentStyle}
      >
        {/* Section 1: Creation Tools (M, L, C, Z, New Path) */}
        <WritingCreationTools />

        {/* Section 2: Pencil Drawing */}
        <WritingPencilTools />

        {/* Section 3: Shapes */}
        <WritingShapeTools />

        {/* Section 4: Curve Tools */}
        <WritingCurveTools />

        {/* Section 5: Text Tools */}
        <WritingTextTools />
      </div>
    </div>
  );
};

// Export for compatibility
export const MobileWritingToolbar = WritingToolbar;