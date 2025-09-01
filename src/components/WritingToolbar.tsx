import React from 'react';
import { UIComponentDefinition } from '../core/PluginSystem';
import { WritingConsolidatedTools } from './WritingConsolidatedTools';
import { WritingShapeTools } from './WritingShapeTools';
import { WritingTextTools } from './WritingTextTools';
import { useMobileDetection } from '../hooks/useMobileDetection';
import { UI_CONSTANTS } from '../config/constants';

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
    height: isMobileDevice ? `${UI_CONSTANTS.TOOLBAR.MOBILE_BUTTON_SIZE}px` : `${UI_CONSTANTS.TOOLBAR.DESKTOP_BUTTON_SIZE}px`,
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
        {/* Section 1: Consolidated Drawing Tools (Creation, Pencil, Curves) */}
        <WritingConsolidatedTools />

        {/* Section 2: Shapes */}
        <WritingShapeTools />

        {/* Section 3: Text Tools */}
        <WritingTextTools />
      </div>
    </div>
  );
};

// Export for compatibility
export const MobileWritingToolbar = WritingToolbar;