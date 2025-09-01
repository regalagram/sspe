import React, { useState, useEffect, useRef } from 'react';
import { UIComponentDefinition } from '../core/PluginSystem';
import { useMobileDetection } from '../hooks/useMobileDetection';
import { BottomSheet } from './BottomSheet';
import { MobilePluginMenu } from './MobilePluginMenu';
import { Toolbar } from './Toolbar';

interface MobileContainerProps {
  sidebarPlugins: UIComponentDefinition[];
  toolbarPlugins: UIComponentDefinition[];
  children: React.ReactNode; // SVG canvas content
  onBottomSheetStateChange?: (isOpen: boolean) => void;
  onToggleBottomSheet?: (toggle: () => void) => void;
  onPluginSelect?: (selectFn: (pluginId: string) => void) => void;
  onOpenVisualDebugPanel?: () => void;
}

// Load saved bottom sheet state from localStorage
const loadSavedBottomSheetState = (): boolean => {
  try {
    const saved = localStorage.getItem('sspe-mobile-bottom-sheet-open');
    return saved === 'true';
  } catch {
    return false;
  }
};

// Load saved selected plugin from localStorage
const loadSavedSelectedPlugin = (plugins: UIComponentDefinition[]): UIComponentDefinition | null => {
  try {
    const saved = localStorage.getItem('sspe-mobile-selected-plugin');
    if (saved) {
      return plugins.find(plugin => plugin.id === saved) || null;
    }
  } catch {}
  return null;
};

export const MobileContainer: React.FC<MobileContainerProps> = ({
  sidebarPlugins,
  toolbarPlugins,
  children,
  onBottomSheetStateChange,
  onToggleBottomSheet,
  onPluginSelect,
  onOpenVisualDebugPanel
}) => {
  const { isMobile, isTablet } = useMobileDetection();
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(() => loadSavedBottomSheetState());
  const [selectedPlugin, setSelectedPlugin] = useState<UIComponentDefinition | null>(() => 
    loadSavedSelectedPlugin(sidebarPlugins)
  );

  // Use refs to store latest callback functions to prevent unnecessary re-renders
  const onBottomSheetStateChangeRef = useRef(onBottomSheetStateChange);
  const onToggleBottomSheetRef = useRef(onToggleBottomSheet);
  const onPluginSelectRef = useRef(onPluginSelect);

  // Update refs when props change
  useEffect(() => {
    onBottomSheetStateChangeRef.current = onBottomSheetStateChange;
  }, [onBottomSheetStateChange]);

  useEffect(() => {
    onToggleBottomSheetRef.current = onToggleBottomSheet;
  }, [onToggleBottomSheet]);

  useEffect(() => {
    onPluginSelectRef.current = onPluginSelect;
  }, [onPluginSelect]);

  // Persist bottom sheet state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('sspe-mobile-bottom-sheet-open', isBottomSheetOpen ? 'true' : 'false');
    } catch {}
  }, [isBottomSheetOpen]);

  // Persist selected plugin to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('sspe-mobile-selected-plugin', selectedPlugin?.id || '');
    } catch {}
  }, [selectedPlugin]);

  const handleToggleBottomSheet = React.useCallback(() => {
    setIsBottomSheetOpen(prev => !prev);
  }, []); // Remove dependency on isBottomSheetOpen, use functional update instead

  const handlePluginSelect = (plugin: UIComponentDefinition) => {
    setSelectedPlugin(plugin);
  };

  // Programmatic plugin selection by ID - stabilize with useRef
  const handlePluginSelectById = React.useCallback((pluginId: string) => {
    const plugin = sidebarPlugins.find(p => p.id === pluginId);
    if (plugin) {
      setSelectedPlugin(plugin);
      setIsBottomSheetOpen(prev => {
        if (!prev) {
          return true; // Open if closed
        }
        return prev; // Keep current state if already open
      });
    }
  }, [sidebarPlugins]); // Only depend on sidebarPlugins

  const handleBackToMenu = () => {
    setSelectedPlugin(null);
  };

  const handleCloseBottomSheet = () => {
    setIsBottomSheetOpen(false);
    // Don't reset selectedPlugin - preserve it for next opening
  };

  // Notify parent of bottom sheet state changes
  useEffect(() => {
    if (onBottomSheetStateChangeRef.current) {
      onBottomSheetStateChangeRef.current(isBottomSheetOpen);
    }
  }, [isBottomSheetOpen]); // Only depend on the actual state, not the callback

  // Provide toggle function to parent - only call when mounted or when callback changes
  useEffect(() => {
    if (onToggleBottomSheetRef.current) {
      onToggleBottomSheetRef.current(handleToggleBottomSheet);
    }
  }, [onToggleBottomSheet]); // Only when the prop function changes

  // Provide plugin selection function to parent - only call when mounted or when callback changes
  useEffect(() => {
    if (onPluginSelectRef.current) {
      onPluginSelectRef.current(handlePluginSelectById);
    }
  }, [onPluginSelect]); // Only when the prop function changes

  const isMobileDevice = isMobile || isTablet;

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Always visible optimized Toolbar */}
      <Toolbar 
        toolbarPlugins={toolbarPlugins}
        onMobileToggle={handleToggleBottomSheet}
        isMobileBottomSheetOpen={isBottomSheetOpen}
        onOpenVisualDebugPanel={onOpenVisualDebugPanel}
      />
      
      {/* Main Content Area - Full background canvas */}
      <div style={{ 
        flex: 1, 
        position: 'relative',
        overflow: 'hidden'
        // No margin/padding - let canvas fill entire background
      }}>
        {children}
        
        {/* Mobile-only: Bottom Sheet */}
        {isMobileDevice && (
          <BottomSheet
            isOpen={isBottomSheetOpen}
            onClose={handleCloseBottomSheet}
            snapPoints={[0.5, 0.75, 0.95]}
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