import React, { useState, useEffect, useRef } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { FloatingToolbarButton } from './FloatingToolbarButton';
import { ToolbarAction } from '../../types/floatingToolbar';
import { FloatingToolbarManager } from '../../core/FloatingToolbar/FloatingToolbarManager';
import { PositioningEngine } from '../../core/FloatingToolbar/PositioningEngine';
import { useEditorStore } from '../../store/editorStore';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { useFloatingToolbarSingleton } from '../../hooks/useFloatingToolbarSingleton';
import { forceCleanupAllToolbars } from '../../utils/toolbar-singleton-manager';
import { forceCleanupAllButtons } from '../../utils/button-pool-manager';
import { forceCleanupAllSelectionRects } from '../../utils/selection-rect-manager';
import { FloatingToolbarErrorBoundary } from './FloatingToolbarErrorBoundary';

// Hook to inject styles only once - prevents style element memory leaks
const useFloatingToolbarStyles = () => {
  useEffect(() => {
    const styleId = 'floating-toolbar-styles';
    
    // Check if styles already exist
    if (document.getElementById(styleId)) {
      return;
    }
    
    // Create style element only once
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes fadeInScale {
        from {
          opacity: 0;
          transform: scale(0.95);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
      
      /* Ensure mobile transform is preserved */
      @media (max-width: 768px) {
        .floating-toolbar-content {
          animation: none !important;
        }
      }
    `;
    
    document.head.appendChild(style);
    
    // Cleanup function to remove styles when all toolbar instances are unmounted
    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);
};

interface FloatingToolbarRendererProps {}

const FloatingToolbarRendererCore: React.FC<FloatingToolbarRendererProps> = () => {
  const { selection, viewport, isFloatingToolbarHidden, paths, texts, groups, images, floatingToolbarUpdateTimestamp } = useEditorStore();
  const { isMobile, isTablet } = useMobileDetection();
  const [actions, setActions] = useState<ToolbarAction[]>([]);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [showOverflow, setShowOverflow] = useState(true);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const [activeSubmenuId, setActiveSubmenuId] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  
  // Inject styles only once to prevent memory leaks
  useFloatingToolbarStyles();
  
  const isMobileDevice = isMobile || isTablet;
  const toolbarManager = FloatingToolbarManager.getInstance();
  const positioningEngine = PositioningEngine.getInstance();
  const config = toolbarManager.getConfig();
  const currentConfig = isMobileDevice ? config.mobile : config.desktop;

  // Use singleton toolbar hook
  const hasSelection = (
    selection.selectedPaths.length > 0 ||
    selection.selectedSubPaths.length > 0 ||
    selection.selectedCommands.length > 0 ||
    selection.selectedTexts.length > 0 ||
    selection.selectedTextSpans.length > 0 ||
    selection.selectedTextPaths.length > 0 ||
    selection.selectedGroups.length > 0 ||
    selection.selectedImages.length > 0 ||
    selection.selectedClipPaths.length > 0 ||
    selection.selectedMasks.length > 0 ||
    selection.selectedFilters.length > 0 ||
    selection.selectedFilterPrimitives.length > 0 ||
    selection.selectedMarkers.length > 0 ||
    selection.selectedSymbols.length > 0 ||
    selection.selectedUses.length > 0 ||
    selection.selectedAnimations.length > 0 ||
    selection.selectedGradients.length > 0 ||
    selection.selectedGradientStops.length > 0
  );

  const isToolbarVisible = hasSelection && !isFloatingToolbarHidden && actions.length > 0 && position && portalContainer;
  
  const { renderPortal } = useFloatingToolbarSingleton({
    isVisible: isToolbarVisible,
    portalContainer,
    position,
    isMobile: isMobileDevice
  });

  // Handle submenu toggling - only one submenu can be open at a time
  const handleSubmenuToggle = (actionId: string) => {
    setActiveSubmenuId(prevActiveId => {
      if (prevActiveId === actionId) {
        return null;
      } else {
        return actionId;
      }
    });
  };

  // Find the SVG container for the portal
  useEffect(() => {
    console.log('[FloatingToolbar] Initializing with singleton system...');
    
    // Force cleanup of any existing detached toolbars and buttons
    forceCleanupAllToolbars();
    forceCleanupAllButtons();
    // Note: Not cleaning selection rects here to avoid interference with singleton

    const svgContainer = document.querySelector('.svg-editor') as HTMLElement;
    if (svgContainer) {
      setPortalContainer(svgContainer);
    } else {
      setPortalContainer(document.body);
    }

    return () => {
      console.log('[FloatingToolbar] Component unmounting');
      isMountedRef.current = false;
    };
  }, []);

  // Calculate actions and position based on selection
  useEffect(() => {
    if (hasSelection) {
      const toolbarActions = toolbarManager.getActionsForSelection(selection);
      setActions(toolbarActions);
      
      const toolbarSize = { width: 300, height: 44 };
      let toolbarPosition = positioningEngine.calculatePosition(
        selection,
        viewport,
        toolbarSize
      );
      
      if (isMobileDevice && toolbarPosition) {
        toolbarPosition = {
          x: window.innerWidth / 2, // Center horizontally
          y: 8 // Fixed top position
        };
      }
            
      if (toolbarPosition) {
        setPosition(toolbarPosition);
      } else {
        const fallbackPosition = isMobileDevice 
          ? { x: window.innerWidth / 2, y: 8 }
          : { x: 100, y: 100 };
        setPosition(fallbackPosition);
      }
    } else {
      // Clean up when no selection
      forceCleanupAllButtons();
      // Note: Not cleaning selection rects here to avoid interference during drag selection
      
      setActions([]);
      setPosition(null);
      setShowOverflow(false);
      setActiveSubmenuId(null);
    }
  }, [hasSelection, selection, viewport, toolbarManager, positioningEngine, isMobileDevice]);

  // Automatically show overflow when there are overflow actions
  useEffect(() => {
    const visibleActionsCount = actions.filter(action => {
      if (action.visible === undefined) return true;
      if (typeof action.visible === 'function') return action.visible();
      return action.visible;
    }).length;
    
    if (visibleActionsCount > currentConfig.maxVisibleButtons) {
      const singleOverflow = visibleActionsCount === currentConfig.maxVisibleButtons + 1;
      if (!singleOverflow) {
        setShowOverflow(true);
      }
    }
  }, [actions, currentConfig.maxVisibleButtons]);
    
  // Don't render if toolbar should not be visible
  if (!isToolbarVisible) {
    return null;
  }

  // Filter actions by visibility
  const getVisibleActions = (actionsArray: ToolbarAction[]): ToolbarAction[] => {
    return actionsArray.filter(action => {
      if (action.visible === undefined) return true;
      if (typeof action.visible === 'function') return action.visible();
      return action.visible;
    });
  };

  const allVisibleActions = getVisibleActions(actions);
  const wouldHaveOverflow = allVisibleActions.length > currentConfig.maxVisibleButtons;
  const singleOverflowAction = wouldHaveOverflow && allVisibleActions.length === currentConfig.maxVisibleButtons + 1;
  
  const visibleActions = singleOverflowAction 
    ? allVisibleActions.slice(0, currentConfig.maxVisibleButtons)
    : allVisibleActions.slice(0, currentConfig.maxVisibleButtons - 1);
  const overflowActions = singleOverflowAction 
    ? []
    : allVisibleActions.slice(currentConfig.maxVisibleButtons - 1);
  const hasOverflow = overflowActions.length > 0;

  // Render toolbar content using singleton portal
  return renderPortal(
    <div 
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '0px',
        width: 'fit-content'
      }}
      onPointerDown={(e) => {
        const target = e.target as HTMLElement;
        const isButton = target.tagName === 'BUTTON' || target.closest('button');
        const isMultiTouch = e.pointerType === 'touch' && (e as any).touches?.length > 1;
        
        if (isButton && !isMultiTouch) {
          e.stopPropagation();
        }
      }}
    >
      {visibleActions.map(action => (
        <FloatingToolbarButton
          key={action.id}
          action={action}
          size={currentConfig.buttonSize}
          isSubmenuOpen={activeSubmenuId === action.id}
          onSubmenuToggle={() => handleSubmenuToggle(action.id)}
        />
      ))}
      
      {hasOverflow && (
        <div style={{ position: 'relative' }}>
          <FloatingToolbarButton
            action={{
              id: 'overflow-menu',
              icon: MoreHorizontal,
              label: 'More actions',
              type: 'button',
              action: (e?: any) => {
                if (e) {
                  e.preventDefault();
                  e.stopPropagation();
                }
                setActiveSubmenuId(null);
                setShowOverflow(!showOverflow);
              },
              tooltip: 'More actions'
            }}
            size={currentConfig.buttonSize}
          />
          
          {showOverflow && (
            <div
              style={{
                position: 'absolute',
                top: `${currentConfig.buttonSize + 2}px`,
                right: '0',
                background: 'white',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                zIndex: 41,
                padding: '0px',
                display: 'flex',
                flexDirection: 'row',
                gap: '0px',
                width: `${overflowActions.length * currentConfig.buttonSize}px`,
                userSelect: 'none',
                touchAction: 'manipulation'
              }}
              onPointerLeave={isMobileDevice ? undefined : () => setShowOverflow(false)}
            >
              {overflowActions.map(action => (
                <FloatingToolbarButton
                  key={action.id}
                  action={action}
                  size={currentConfig.buttonSize}
                  compact
                  isSubmenuOpen={activeSubmenuId === action.id}
                  onSubmenuToggle={() => handleSubmenuToggle(action.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Memoized wrapper with error boundary protection
const FloatingToolbarRendererMemoized = React.memo(FloatingToolbarRendererCore, (prevProps, nextProps) => {
  // Since this component has no props, it should only re-render when Zustand state changes
  // Let the component's internal useEditorStore handle state change detection
  return false; // Always re-render, let internal memoization handle optimization
});

// Final export with error boundary
export const FloatingToolbarRenderer: React.FC = () => {
  return (
    <FloatingToolbarErrorBoundary>
      <FloatingToolbarRendererMemoized />
    </FloatingToolbarErrorBoundary>
  );
};