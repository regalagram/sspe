import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';
import { FloatingToolbarButton } from './FloatingToolbarButton';
import { ToolbarAction } from '../../types/floatingToolbar';
import { FloatingToolbarManager } from '../../core/FloatingToolbar/FloatingToolbarManager';
import { PositioningEngine } from '../../core/FloatingToolbar/PositioningEngine';
import { useEditorStore } from '../../store/editorStore';
import { useMobileDetection } from '../../hooks/useMobileDetection';

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
  const [showOverflow, setShowOverflow] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const [activeSubmenuId, setActiveSubmenuId] = useState<string | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  
  // Inject styles only once to prevent memory leaks
  useFloatingToolbarStyles();
  
  const isMobileDevice = isMobile || isTablet;
  const toolbarManager = FloatingToolbarManager.getInstance();
  const positioningEngine = PositioningEngine.getInstance();
  const config = toolbarManager.getConfig();
  const currentConfig = isMobileDevice ? config.mobile : config.desktop;

  // Handle submenu toggling - only one submenu can be open at a time
  const handleSubmenuToggle = (actionId: string) => {
    setActiveSubmenuId(prevActiveId => {
      if (prevActiveId === actionId) {
        // Close if clicking on the same button
        return null;
      } else {
        // Close any other submenu and open this one
        return actionId;
      }
    });
  };

  // Find the SVG container for the portal
  useEffect(() => {
    const svgContainer = document.querySelector('.svg-editor') as HTMLElement;
    if (svgContainer) {
      setPortalContainer(svgContainer);
    } else {
      // Fallback to body
      setPortalContainer(document.body);
    }
  }, []);

  useEffect(() => {
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

    
    if (hasSelection) {
      const toolbarActions = toolbarManager.getActionsForSelection(selection);
            setActions(toolbarActions);
      
      // Always calculate position, regardless of hidden state
      // This ensures position is updated when toolbar becomes visible again
      const toolbarSize = { width: 300, height: 44 };
      let toolbarPosition = positioningEngine.calculatePosition(
        selection,
        viewport,
        toolbarSize
      );
      
      // On mobile, force positioning at the top
      if (isMobileDevice && toolbarPosition) {
        toolbarPosition = {
          ...toolbarPosition,
          y: 8 // Position at top: env(safe-area-inset-top, 8px)
        };
      }
            
      if (toolbarPosition) {
                setPosition(toolbarPosition);
      } else {
        const fallbackPosition = isMobileDevice 
          ? { x: 100, y: 8 } // Mobile fallback at top position
          : { x: 100, y: 100 }; // Desktop fallback
                setPosition(fallbackPosition);
      }
    } else {
            setActions([]);
      setPosition(null);
      setShowOverflow(false);
      setActiveSubmenuId(null); // Reset active submenu when toolbar disappears
    }
  }, [selection, viewport, isFloatingToolbarHidden, paths, texts, groups, images, toolbarManager, positioningEngine, isMobileDevice]);

  // DEBUG: Log for development
    
  if (!position || actions.length === 0 || !portalContainer || isFloatingToolbarHidden) {
    return null;
  }

  const visibleActions = actions.slice(0, currentConfig.maxVisibleButtons - 1);
  const overflowActions = actions.slice(currentConfig.maxVisibleButtons - 1);
  const hasOverflow = overflowActions.length > 0;

  // No complex calculations needed for mobile - use simple fixed positioning

  const toolbarStyle: React.CSSProperties = {
    position: 'fixed',
    // On mobile, use fixed positioning at top
    left: isMobileDevice ? '50%' : `${position.x}px`,
    top: isMobileDevice ? 'env(safe-area-inset-top, 8px)' : `${position.y}px`,
    zIndex: isMobileDevice ? 9999 : 40,
    display: 'flex',
    alignItems: 'center',
    gap: '0px',
    background: 'white',
    padding: '0px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    userSelect: 'none',
    touchAction: 'manipulation',
    animation: isMobileDevice ? 'none' : 'fadeInScale 0.2s ease-out forwards',
    transformOrigin: getTransformOrigin((position as any).placement || 'top'),
    pointerEvents: 'auto',
    // Mobile-optimized properties
    overflowX: 'visible',
    overflowY: 'visible',
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    WebkitBackfaceVisibility: 'hidden',
    backfaceVisibility: 'hidden',
    transform: isMobileDevice ? 'translateX(-50%)' : 'none',
    WebkitTransform: isMobileDevice ? 'translate3d(-50%, 0, 0)' : 'none',
    width: 'fit-content',
    minHeight: 'fit-content'
  };

  function getTransformOrigin(placement: string): string {
    switch (placement) {
      case 'top': return 'center bottom';
      case 'bottom': return 'center top';
      case 'left': return 'right center';
      case 'right': return 'left center';
      default: return 'center';
    }
  }

  const toolbarContent = (
    <div 
        ref={toolbarRef} 
        style={toolbarStyle}
        className="floating-toolbar-content"
        onPointerDown={(e) => {
          // Only stop propagation for direct toolbar button interactions,
          // but allow gestures (multi-touch) to pass through
          const target = e.target as HTMLElement;
          const isButton = target.tagName === 'BUTTON' || target.closest('button');
          
          // Don't interfere with multi-touch gestures for pan/zoom
          // Also check if this is a multi-touch event (pointerType === 'touch' and multiple pointers)
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
                action: () => {
                  // Close any open submenus when opening/closing the overflow menu
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
                  flexDirection: 'column',
                  gap: '0px',
                  minWidth: `${currentConfig.buttonSize}px`,
                  userSelect: 'none',
                  touchAction: 'manipulation'
                }}
                onPointerLeave={() => setShowOverflow(false)}
                onPointerDown={(e) => {
                  // Only stop propagation on actual button clicks
                  const target = e.target as HTMLElement;
                  const isButton = target.tagName === 'BUTTON' || target.closest('button');
                  if (isButton) {
                    e.stopPropagation();
                  }
                }}
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

  return createPortal(toolbarContent, portalContainer);
};

// Memoized wrapper to prevent unnecessary re-renders that cause DOM element leaks
export const FloatingToolbarRenderer = React.memo(FloatingToolbarRendererCore, (prevProps, nextProps) => {
  // Since this component has no props, it should only re-render when Zustand state changes
  // Let the component's internal useEditorStore handle state change detection
  return false; // Always re-render, let internal memoization handle optimization
});