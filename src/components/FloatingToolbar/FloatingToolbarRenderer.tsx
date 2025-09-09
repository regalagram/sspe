import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { FloatingToolbarButton } from './FloatingToolbarButton';
import { ToolbarAction, ToolbarPosition } from '../../types/floatingToolbar';
import { FloatingToolbarManager } from '../../core/FloatingToolbar/FloatingToolbarManager';
import { PositioningEngine } from '../../core/FloatingToolbar/PositioningEngine';
import { useEditorStore } from '../../store/editorStore';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { useFloatingToolbar } from '../../hooks/useFloatingToolbar';

// Global reference counter for style management
let styleReferenceCount = 0;
const STYLE_ELEMENT_ID = 'floating-toolbar-styles';

// Hook to inject styles with proper reference counting - prevents memory leaks
const useFloatingToolbarStyles = () => {
  useEffect(() => {
    styleReferenceCount++;
    
    // Create style element only if it doesn't exist
    let styleElement = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = STYLE_ELEMENT_ID;
      styleElement.textContent = `
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
      
      document.head.appendChild(styleElement);
    }
    
    // Cleanup function - only remove when reference count reaches zero
    return () => {
      styleReferenceCount--;
      
      if (styleReferenceCount === 0) {
        const existingStyle = document.getElementById(STYLE_ELEMENT_ID);
        if (existingStyle) {
          existingStyle.remove();
        }
      }
    };
  }, []);
};

interface FloatingToolbarRendererProps {}

const FloatingToolbarRendererCore: React.FC<FloatingToolbarRendererProps> = () => {
  const { selection, viewport, isFloatingToolbarHidden } = useEditorStore();
  const { isMobile, isTablet } = useMobileDetection();
  const [actions, setActions] = useState<ToolbarAction[]>([]);
  const [position, setPosition] = useState<ToolbarPosition | null>(null);
  const [showOverflow, setShowOverflow] = useState(true);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const [activeSubmenuId, setActiveSubmenuId] = useState<string | null>(null);
  
  // Inject styles only once to prevent memory leaks
  useFloatingToolbarStyles();
  
  const isMobileDevice = isMobile || isTablet;
  const toolbarManager = FloatingToolbarManager.getInstance();
  const positioningEngine = PositioningEngine.getInstance();
  const config = toolbarManager.getConfig();
  const currentConfig = isMobileDevice ? config.mobile : config.desktop;

  // Memoize hasSelection to prevent unnecessary re-renders
  const hasSelection = useMemo(() => (
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
  ), [selection]);

  // Memoize isToolbarVisible to prevent unnecessary re-renders
  const isToolbarVisible = useMemo(() => (
    hasSelection && !isFloatingToolbarHidden && actions.length > 0 && !!position && !!portalContainer
  ), [hasSelection, isFloatingToolbarHidden, actions.length, position, portalContainer]);

  // Memoize handleSubmenuToggle to prevent unnecessary re-renders
  const handleSubmenuToggle = useCallback((actionId: string) => {
    setActiveSubmenuId(prevActiveId => {
      if (prevActiveId === actionId) {
        return null;
      } else {
        return actionId;
      }
    });
  }, []);

  // Use simplified toolbar hook with portals
  const { renderPortal } = useFloatingToolbar({
    isVisible: isToolbarVisible,
    portalContainer,
    position,
    isMobile: isMobileDevice,
    buttonSize: currentConfig.buttonSize
  });

  // Find the SVG container for the portal
  useEffect(() => {
    const svgContainer = document.querySelector('.svg-editor') as HTMLElement;
    if (svgContainer) {
      setPortalContainer(svgContainer);
    } else {
      setPortalContainer(document.body);
    }
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
          y: 0, // Fixed top position - no space from top
          placement: 'top'
        };
      }
            
      if (toolbarPosition) {
        setPosition(toolbarPosition);
      } else {
        const fallbackPosition = isMobileDevice 
          ? { x: window.innerWidth / 2, y: 0, placement: 'top' as const }
          : { x: 100, y: 100, placement: 'top' as const };
        setPosition(fallbackPosition);
      }
    } else {
      // Clean up when no selection
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

  // Render toolbar content using portal - much simpler than before!
  return renderPortal(
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '0px',
        width: 'fit-content'
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

export const FloatingToolbarRenderer: React.FC = () => {
  return <FloatingToolbarRendererCore />;
};