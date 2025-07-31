import React from 'react';
import { UIComponentDefinition } from '../core/PluginSystem';
import { MobileUndoRedoControls } from '../plugins/undo-redo/MobileUndoRedo';
import { MobileZoomControls } from '../plugins/zoom/MobileZoom';
import { MobileCreationTools } from '../plugins/creation/MobileCreation';
import { MobileFullscreenControl } from '../plugins/fullscreen/MobileFullscreen';
import { MobileDeleteControl } from '../plugins/delete/MobileDelete';

interface MobileToolbarProps {
  toolbarPlugins: UIComponentDefinition[];
  isMobile: boolean;
}

export const MobileToolbar: React.FC<MobileToolbarProps> = ({ 
  toolbarPlugins, 
  isMobile 
}) => {
  if (!isMobile) {
    // Return regular toolbar for desktop
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        background: '#f8f9fa',
        borderBottom: '1px solid #e5e7eb',
        minHeight: '48px'
      }}>
        {toolbarPlugins.map(plugin => (
          <div key={plugin.id}>
            <plugin.component />
          </div>
        ))}
      </div>
    );
  }

  // Mobile-optimized toolbar with sections
  const mobileToolbarStyle: React.CSSProperties = {
    background: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    overflowX: 'auto',
    overflowY: 'hidden',
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none', // Firefox
    msOverflowStyle: 'none', // IE/Edge
  };

  const toolbarContentStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '0px', // No padding for maximum space optimization
    minHeight: '60px',
    gap: '0px', // No gap, separators handle spacing
    minWidth: 'fit-content', // Allow horizontal scrolling
  };

  // CSS to hide scrollbar in WebKit browsers
  const scrollbarHideStyle: React.CSSProperties = {
    scrollbarWidth: 'none',
  };

  return (
    <div style={{ ...mobileToolbarStyle, ...scrollbarHideStyle }}>
      <style>
        {`
          .mobile-toolbar-container::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>
      <div 
        className="mobile-toolbar-container"
        style={toolbarContentStyle}
      >
        {/* Section 1: Undo/Redo */}
        <MobileUndoRedoControls />

        {/* Section 2: Zoom Controls */}
        <MobileZoomControls />

        {/* Section 3: Creation Tools */}
        <MobileCreationTools />

        {/* Section 4: Actions */}
        <MobileDeleteControl />

        {/* Section 5: Display */}
        <MobileFullscreenControl />
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