import React from 'react';
import { UIComponentDefinition } from '../core/PluginSystem';
import { MobileUndoRedoControls } from '../plugins/undo-redo/ToolbarUndoRedo';
import { MobileZoomControls } from '../plugins/zoom/ToolbarZoom';

interface ToolbarProps {
  toolbarPlugins: UIComponentDefinition[];
}

export const Toolbar: React.FC<ToolbarProps> = ({ 
  toolbarPlugins 
}) => {
  // Always use the optimized toolbar with dropdown buttons and fixed positioning
  const toolbarStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.95)', // Semi-transparent for overlay effect
    backdropFilter: 'blur(10px)', // Blur effect for modern look
    WebkitBackdropFilter: 'blur(10px)', // Safari support
    border: '1px solid rgba(229, 231, 235, 0.5)', // Border all around
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.15)',
    position: 'fixed', // Fixed position instead of sticky
    bottom: 'env(safe-area-inset-bottom, 8px)', // Bottom margin with safe area support
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
    gap: '4px', // Optimized gap between sections
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
          .bottom-toolbar-content::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>
      <div 
        className="bottom-toolbar-content"
        style={toolbarContentStyle}
      >
        {/* Section 1: Undo/Redo */}
        <MobileUndoRedoControls />

        {/* Section 2: Zoom Controls */}
        <MobileZoomControls />
      </div>
    </div>
  );
};

// Wrapper to enhance toolbar items for mobile
const MobileToolbarItemWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div 
      style={{
        minWidth: '48px',
        minHeight: '48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      className="mobile-toolbar-item"
    >
      {children}
    </div>
  );
};

// Floating Action Button for mobile controls
interface MobileFloatingButtonProps {
  onToggleBottomSheet: () => void;
  isBottomSheetOpen: boolean;
}

export const MobileFloatingButton: React.FC<MobileFloatingButtonProps> = ({
  onToggleBottomSheet,
  isBottomSheetOpen
}) => {
  const fabStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width: '56px',
    height: '56px',
    borderRadius: '28px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    boxShadow: '0 8px 20px rgba(102, 126, 234, 0.4)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '24px',
    zIndex: 9997,
    transform: isBottomSheetOpen ? 'rotate(45deg)' : 'rotate(0deg)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  const handlePress = () => {
    onToggleBottomSheet();
  };

  return (
    <button
      style={fabStyle}
      onPointerDown={handlePress}
      onPointerEnter={(e) => {
        if (!isBottomSheetOpen) {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 12px 25px rgba(102, 126, 234, 0.5)';
        }
      }}
      onPointerLeave={(e) => {
        if (!isBottomSheetOpen) {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.4)';
        }
      }}
      title={isBottomSheetOpen ? 'Close tools' : 'Open tools'}
    >
      {isBottomSheetOpen ? '×' : '☰'}
    </button>
  );
};

// Mobile-specific button enhancement
export const useMobileButtonStyle = (isMobile: boolean) => {
  const baseStyle: React.CSSProperties = {
    minWidth: isMobile ? '48px' : '32px',
    minHeight: isMobile ? '48px' : '32px',
    padding: isMobile ? '12px' : '8px',
    fontSize: isMobile ? '16px' : '14px',
    borderRadius: isMobile ? '12px' : '6px',
    border: isMobile ? '2px solid #e5e7eb' : '1px solid #d1d5db',
    background: '#ffffff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    touchAction: 'manipulation', // Prevents double-tap zoom on mobile
  };

  const hoverStyle: React.CSSProperties = isMobile ? {
    background: '#f3f4f6',
    transform: 'scale(1.05)',
  } : {
    background: '#f9fafb',
  };

  const activeStyle: React.CSSProperties = isMobile ? {
    background: '#e5e7eb',
    transform: 'scale(0.95)',
  } : {
    background: '#e5e7eb',
  };

  return {
    baseStyle,
    hoverStyle,
    activeStyle
  };
};