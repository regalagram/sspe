import React from 'react';
import { UIComponentDefinition } from '../core/PluginSystem';
import { MobileUndoRedoControls } from '../plugins/undo-redo/ToolbarUndoRedo';
import { ConsolidatedZoomControls } from './ConsolidatedZoomControls';
import { AnimationPlayButton } from './AnimationPlayButton';
import { SandwichButton } from './SandwichButton';
import { WritingConsolidatedTools } from './WritingConsolidatedTools';
import { WritingShapeTools } from './WritingShapeTools';
import { WritingTextTools } from './WritingTextTools';
import { UI_CONSTANTS } from '../config/constants';
import { FileActionsButton } from './FileActionsButton';
import { useMobileDetection } from '../hooks/useMobileDetection';

interface ToolbarProps {
  toolbarPlugins: UIComponentDefinition[];
  // For mobile bottom sheet control
  onMobileToggle?: () => void;
  isMobileBottomSheetOpen?: boolean;
  // For debug panel access
  onOpenVisualDebugPanel?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ 
  toolbarPlugins,
  onMobileToggle,
  isMobileBottomSheetOpen,
  onOpenVisualDebugPanel
}) => {
  const { isMobile, isTablet } = useMobileDetection();
  const isMobileDevice = isMobile || isTablet;
  
  // Match floating toolbar dimensions exactly
  const toolbarStyle: React.CSSProperties = {
    background: 'white',
    boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06)',
    position: 'fixed',
    bottom: 'env(safe-area-inset-bottom, 8px)',
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

        {/* Section 2: Writing Tools */}
        <WritingConsolidatedTools />
        <WritingShapeTools />
        <WritingTextTools />

        {/* Section 3: Zoom Controls */}
        <ConsolidatedZoomControls />

        {/* Section 4: Animation Controls */}
        <AnimationPlayButton />

        {/* Section 5: File Actions */}
        <FileActionsButton onOpenVisualDebugPanel={onOpenVisualDebugPanel} />

        {/* Section 6: Sandwich button for panels/sidebar */}
        <SandwichButton 
          onMobileToggle={onMobileToggle}
          isMobileBottomSheetOpen={isMobileBottomSheetOpen}
        />
      </div>
    </div>
  );
};

// Wrapper to enhance toolbar items for mobile
const MobileToolbarItemWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div 
      style={{
        minWidth: '28px',
        minHeight: '28px',
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
    minWidth: isMobile ? `${UI_CONSTANTS.TOOLBAR.MOBILE_BUTTON_SIZE}px` : `${UI_CONSTANTS.TOOLBAR.DESKTOP_BUTTON_SIZE}px`,
    minHeight: isMobile ? `${UI_CONSTANTS.TOOLBAR.MOBILE_BUTTON_SIZE}px` : `${UI_CONSTANTS.TOOLBAR.DESKTOP_BUTTON_SIZE}px`,
    padding: isMobile ? '4px' : '8px',
    fontSize: isMobile ? '12px' : '14px',
    borderRadius: isMobile ? '0px' : '6px',
    border: isMobile ? 'none' : '1px solid #d1d5db',
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