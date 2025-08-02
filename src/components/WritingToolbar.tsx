import React from 'react';
import { UIComponentDefinition } from '../core/PluginSystem';
import { WritingCreationTools } from './WritingCreationTools';
import { WritingPencilTools } from './WritingPencilTools';
import { WritingShapeTools } from './WritingShapeTools';
import { WritingCurveTools } from './WritingCurveTools';
import { WritingStyleTools } from './WritingStyleTools';
import { WritingDeleteTools } from './WritingDeleteTools';
import { SandwichButton } from './SandwichButton';

interface WritingToolbarProps {
  toolbarPlugins?: UIComponentDefinition[];
  // For mobile bottom sheet control
  onMobileToggle?: () => void;
  isMobileBottomSheetOpen?: boolean;
}

export const WritingToolbar: React.FC<WritingToolbarProps> = ({ 
  toolbarPlugins = [],
  onMobileToggle,
  isMobileBottomSheetOpen
}) => {
  // Always use the optimized toolbar with dropdown buttons and fixed positioning
  const toolbarStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.95)', // Semi-transparent for overlay effect
    backdropFilter: 'blur(10px)', // Blur effect for modern look
    WebkitBackdropFilter: 'blur(10px)', // Safari support
    border: '1px solid rgba(229, 231, 235, 0.5)', // Border all around
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.15)',
    position: 'fixed', // Fixed position instead of sticky
    top: 'env(safe-area-inset-top, 8px)', // Top margin with safe area support
    left: '50%', // Center horizontally
    transform: 'translateX(-50%)', // Center alignment
    zIndex: 9998, // Very high z-index to stay above everything
    overflowX: 'visible',
    overflowY: 'visible', // Allow dropdowns to be visible
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none', // Firefox
    msOverflowStyle: 'none', // IE/Edge
    // iOS Safari specific fixes
    WebkitBackfaceVisibility: 'hidden',
    backfaceVisibility: 'hidden',
    WebkitTransform: 'translate3d(-50%, 0, 0)', // Combine transforms
    // Compact sizing - only what's needed
    width: 'fit-content',
    minHeight: 'fit-content',
  };

  const toolbarContentStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center', // Center all buttons horizontally
    padding: '0px', // No vertical padding
    gap: '0px', // Optimized gap between sections
    minHeight: 'fit-content', // Natural height based on button size
    overflow: 'visible', // Allow submenus to overflow
    position: 'relative', // Establish positioning context
    whiteSpace: 'nowrap', // Prevent wrapping
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

        {/* Section 5: Style Tools */}
        <WritingStyleTools />

        {/* Section 6: Delete Tools */}
        <WritingDeleteTools />

        {/* Section 7: Sandwich button for panels/sidebar */}
        <SandwichButton 
          onMobileToggle={onMobileToggle}
          isMobileBottomSheetOpen={isMobileBottomSheetOpen}
        />
      </div>
    </div>
  );
};

// Export for compatibility
export const MobileWritingToolbar = WritingToolbar;