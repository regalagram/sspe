import React, { useState } from 'react';
import { UIComponentDefinition } from '../core/PluginSystem';
import { useMobileDetection } from '../hooks/useMobileDetection';
import { BottomSheet } from './BottomSheet';
import { MobilePluginMenu } from './MobilePluginMenu';
import { MobileToolbar, MobileFloatingButton } from './MobileToolbar';

interface MobileContainerProps {
  sidebarPlugins: UIComponentDefinition[];
  toolbarPlugins: UIComponentDefinition[];
  children: React.ReactNode; // SVG canvas content
}

export const MobileContainer: React.FC<MobileContainerProps> = ({
  sidebarPlugins,
  toolbarPlugins,
  children
}) => {
  const { isMobile, isTablet } = useMobileDetection();
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<UIComponentDefinition | null>(null);

  const handleToggleBottomSheet = () => {
    if (isBottomSheetOpen && selectedPlugin) {
      // If a plugin is selected, first go back to menu
      setSelectedPlugin(null);
    } else {
      // Toggle bottom sheet
      setIsBottomSheetOpen(!isBottomSheetOpen);
      if (!isBottomSheetOpen) {
        setSelectedPlugin(null); // Reset selection when opening
      }
    }
  };

  const handlePluginSelect = (plugin: UIComponentDefinition) => {
    setSelectedPlugin(plugin);
  };

  const handleBackToMenu = () => {
    setSelectedPlugin(null);
  };

  const handleCloseBottomSheet = () => {
    setIsBottomSheetOpen(false);
    setSelectedPlugin(null);
  };

  const isMobileDevice = isMobile || isTablet;

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Mobile/Desktop Toolbar */}
      <MobileToolbar 
        toolbarPlugins={toolbarPlugins} 
        isMobile={isMobileDevice}
      />
      
      {/* Main Content Area */}
      <div style={{ 
        flex: 1, 
        position: 'relative',
        overflow: 'hidden'
      }}>
        {children}
        
        {/* Mobile-only: Floating Action Button */}
        {isMobileDevice && (
          <MobileFloatingButton
            onToggleBottomSheet={handleToggleBottomSheet}
            isBottomSheetOpen={isBottomSheetOpen}
          />
        )}
        
        {/* Mobile-only: Bottom Sheet */}
        {isMobileDevice && (
          <BottomSheet
            isOpen={isBottomSheetOpen}
            onClose={handleCloseBottomSheet}
            snapPoints={[0.4, 0.7, 0.9]}
            initialSnap={1}
          >
            <MobilePluginMenu
              plugins={sidebarPlugins}
              onPluginSelect={handlePluginSelect}
              onBack={handleBackToMenu}
              selectedPlugin={selectedPlugin}
            />
          </BottomSheet>
        )}
      </div>
    </div>
  );
};

// Hook for mobile-aware styling
export const useMobileStyles = () => {
  const { isMobile, isTablet } = useMobileDetection();
  const isMobileDevice = isMobile || isTablet;

  return {
    isMobile,
    isTablet,
    isMobileDevice,
    
    // Standard mobile-friendly dimensions
    touchTargetSize: isMobile ? 48 : isTablet ? 40 : 32,
    controlPointSize: isMobile ? 12 : isTablet ? 10 : 6,
    margin: isMobile ? 8 : isTablet ? 6 : 4,
    padding: isMobile ? 12 : isTablet ? 10 : 8,
    fontSize: isMobile ? 16 : isTablet ? 15 : 14,
    
    // CSS media queries for responsive design
    mobileQuery: '(max-width: 768px)',
    tabletQuery: '(min-width: 769px) and (max-width: 1024px)',
    desktopQuery: '(min-width: 1025px)',
    
    // Helper function for conditional styles
    responsive: <T extends any>(mobile: T, tablet?: T, desktop?: T): T => {
      if (isMobile) return mobile;
      if (isTablet && tablet !== undefined) return tablet;
      return desktop !== undefined ? desktop : mobile;
    }
  };
};