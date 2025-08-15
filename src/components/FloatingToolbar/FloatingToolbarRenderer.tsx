import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';
import { FloatingToolbarButton } from './FloatingToolbarButton';
import { ToolbarAction } from '../../types/floatingToolbar';
import { FloatingToolbarManager } from '../../core/FloatingToolbar/FloatingToolbarManager';
import { PositioningEngine } from '../../core/FloatingToolbar/PositioningEngine';
import { useEditorStore } from '../../store/editorStore';
import { useMobileDetection } from '../../hooks/useMobileDetection';

interface FloatingToolbarRendererProps {
  onVisibilityChange?: (isVisible: boolean) => void;
}

export const FloatingToolbarRenderer: React.FC<FloatingToolbarRendererProps> = ({
  onVisibilityChange
}) => {
  const { selection, viewport, isFloatingToolbarHidden, paths, texts, groups, images, floatingToolbarUpdateTimestamp } = useEditorStore();
  const { isMobile, isTablet } = useMobileDetection();
  const [actions, setActions] = useState<ToolbarAction[]>([]);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [showOverflow, setShowOverflow] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  
  const isMobileDevice = isMobile || isTablet;
  const toolbarManager = FloatingToolbarManager.getInstance();
  const positioningEngine = PositioningEngine.getInstance();
  const config = toolbarManager.getConfig();
  const currentConfig = isMobileDevice ? config.mobile : config.desktop;

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
      
      // On mobile, force positioning at the top - same position as WritingToolbar
      if (isMobileDevice && toolbarPosition) {
        toolbarPosition = {
          ...toolbarPosition,
          y: 8 // Same position as WritingToolbar: env(safe-area-inset-top, 8px)
        };
      }
            
      if (toolbarPosition) {
                setPosition(toolbarPosition);
      } else {
        const fallbackPosition = isMobileDevice 
          ? { x: 100, y: 8 } // Mobile fallback at same position as WritingToolbar
          : { x: 100, y: 100 }; // Desktop fallback
                setPosition(fallbackPosition);
      }
      
      // Notify visibility change
      if (onVisibilityChange) {
        onVisibilityChange(true);
      }
    } else {
            setActions([]);
      setPosition(null);
      setShowOverflow(false);
      
      // Notify visibility change
      if (onVisibilityChange) {
        onVisibilityChange(false);
      }
    }
  }, [selection, viewport, isFloatingToolbarHidden, paths, texts, groups, images, toolbarManager, positioningEngine, onVisibilityChange, isMobileDevice]);

  // DEBUG: Log for development
    
  if (!position || actions.length === 0 || !portalContainer || isFloatingToolbarHidden) {
    return null;
  }

  const visibleActions = actions.slice(0, currentConfig.maxVisibleButtons - 1);
  const overflowActions = actions.slice(currentConfig.maxVisibleButtons - 1);
  const hasOverflow = overflowActions.length > 0;

  // Calculate toolbar width for mobile centering
  const estimatedToolbarWidth = isMobileDevice ? 
    (visibleActions.length + (hasOverflow ? 1 : 0)) * (currentConfig.buttonSize + currentConfig.spacing) + 12 : // 12px for padding
    300; // Default width for desktop

  // Calculate safe left position for mobile
  const calculateMobileLeft = () => {
    if (!isMobileDevice) return position.x;
    
    const screenWidth = window.innerWidth;
    const margin = 8; // 8px margin from edges
    const centeredPosition = (screenWidth - estimatedToolbarWidth) / 2;
    
    // Ensure it doesn't go beyond screen bounds
    return Math.max(margin, Math.min(centeredPosition, screenWidth - estimatedToolbarWidth - margin));
  };

  const toolbarStyle: React.CSSProperties = {
    position: 'fixed',
    // On mobile, center within screen bounds, otherwise use calculated position
    left: isMobileDevice ? `${calculateMobileLeft()}px` : `${position.x}px`,
    // On mobile, use same top position as WritingToolbar, otherwise use calculated position
    top: isMobileDevice ? 'env(safe-area-inset-top, 8px)' : `${position.y}px`,
    zIndex: isMobileDevice ? 9999 : 40, // Higher z-index on mobile to be above WritingToolbar
    display: 'flex',
    alignItems: 'center',
    gap: `${currentConfig.spacing}px`,
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '6px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    userSelect: 'none',
    touchAction: 'manipulation',
    animation: 'fadeInScale 0.2s ease-out forwards',
    transformOrigin: getTransformOrigin((position as any).placement || 'top'),
    pointerEvents: 'auto' // Ensure toolbar can be interacted with
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
    <>
      <style>{`
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
      `}</style>
      
      <div 
        ref={toolbarRef} 
        style={{
          ...toolbarStyle,
          // On mobile, make it less intrusive
          ...(isMobileDevice && {
            touchAction: 'none', // Prevent default touch behaviors on the toolbar itself
          })
        }}
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
                action: () => setShowOverflow(!showOverflow),
                tooltip: 'More actions'
              }}
              size={currentConfig.buttonSize}
            />
            
            {showOverflow && (
              <div
                style={{
                  position: 'absolute',
                  top: `${currentConfig.buttonSize + 4}px`,
                  right: '0',
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  zIndex: 41, // Slightly higher than main toolbar
                  padding: '4px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  minWidth: `${currentConfig.buttonSize}px`
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
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );

  return createPortal(toolbarContent, portalContainer);
};