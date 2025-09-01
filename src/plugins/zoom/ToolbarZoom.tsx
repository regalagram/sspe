import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Target } from 'lucide-react';
import { MobileToolbarButton, MobileToolbarSection } from '../../components/ToolbarButton';
import { MobileToolbarSubmenu, MobileSubmenuItem } from '../../components/ToolbarSubmenu';
import { useEditorStore } from '../../store/editorStore';
import { useMobileToolbarStore } from '../../store/toolbarStore';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { UI_CONSTANTS } from '../../config/constants';

export const ToolbarZoomControls: React.FC = () => {
  const { viewport, selection, zoomIn, zoomOut, zoomToFit, zoomToSelection, zoomToSubPath, resetView } = useEditorStore();
  const { isMobile } = useMobileDetection();
  const { 
    isZoomSubmenuOpen, 
    setZoomSubmenuOpen 
  } = useMobileToolbarStore();

  // Match toolbar height
  const toolbarHeight = isMobile ? UI_CONSTANTS.TOOLBAR.MOBILE_BUTTON_SIZE : UI_CONSTANTS.TOOLBAR.DESKTOP_BUTTON_SIZE;
  const iconSize = isMobile ? UI_CONSTANTS.TOOLBAR.MOBILE_ICON_SIZE : UI_CONSTANTS.TOOLBAR.DESKTOP_ICON_SIZE;

  // Always show toolbar zoom controls (removed mobile-only restriction)

  const hasSelection = selection.selectedCommands.length > 0 || 
                       selection.selectedPaths.length > 0 || 
                       selection.selectedTexts.length > 0 || 
                       selection.selectedGroups.length > 0 || 
                       selection.selectedImages.length > 0;
  const hasSubPathSelection = selection.selectedSubPaths.length > 0;

  // Calcula el centro visible en pantalla y lo convierte a coordenadas SVG
  const getViewportCenter = () => {
    const svgElement = document.querySelector('svg');
    if (svgElement) {
      const rect = svgElement.getBoundingClientRect();
      const screenCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
      const pt = (svgElement as SVGSVGElement).createSVGPoint();
      pt.x = screenCenter.x;
      pt.y = screenCenter.y;
      const screenCTM = (svgElement as SVGSVGElement).getScreenCTM();
      if (screenCTM) {
        const svgCenter = pt.matrixTransform(screenCTM.inverse());
        return { x: svgCenter.x, y: svgCenter.y };
      }
    }
    const { pan, viewBox } = viewport;
    return {
      x: pan.x + (viewBox.width / 2),
      y: pan.y + (viewBox.height / 2),
    };
  };

  const handleZoomIn = () => {
    zoomIn(getViewportCenter());
  };

  const handleZoomOut = () => {
    zoomOut(getViewportCenter());
  };

  const handleSubmenuClose = () => {
    setZoomSubmenuOpen(false);
  };

  const handleZoomAction = (action: () => void) => {
    action();
    setZoomSubmenuOpen(false);
  };

  return (
    <MobileToolbarSection title="Zoom Controls">
      <MobileToolbarButton
        icon={<ZoomOut size={iconSize} />}
        onClick={handleZoomOut}
        color="#374151"
        title="Zoom Out (Ctrl+-)"
        size="medium"
      />
      
      {/* Zoom percentage with submenu */}
      <MobileToolbarSubmenu
        trigger={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '30px',
            height: `${toolbarHeight}px`,
            background: isZoomSubmenuOpen ? '#e5e7eb' : 'white',
            fontSize: '12px',
            fontWeight: 400,
            color: '#374151',
            border: 'none',
            gap: '4px',
            padding: '0 0px',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}>
            <span>{Math.round(viewport.zoom * 100)}</span>
          </div>
        }
        isOpen={isZoomSubmenuOpen}
        onToggle={() => setZoomSubmenuOpen(!isZoomSubmenuOpen)}
        position="top"
      >
        <MobileSubmenuItem
          icon={<Maximize2 size={iconSize} />}
          label="Fit to Screen"
          onClick={() => handleZoomAction(zoomToFit)}
        />
        {hasSelection && (
          <MobileSubmenuItem
            icon={<Target size={iconSize} />}
            label="Fit Selection"
            onClick={() => handleZoomAction(zoomToSelection)}
          />
        )}
        {hasSubPathSelection && (
          <MobileSubmenuItem
            icon={<Target size={iconSize} />}
            label="Fit SubPath"
            onClick={() => handleZoomAction(zoomToSubPath)}
          />
        )}
        <MobileSubmenuItem
          icon={<RotateCcw size={iconSize} />}
          label="Reset View"
          onClick={() => handleZoomAction(resetView)}
        />
      </MobileToolbarSubmenu>
      
      <MobileToolbarButton
        icon={<ZoomIn size={iconSize} />}
        onClick={handleZoomIn}
        color="#374151"
        title="Zoom In (Ctrl++)"
        size="medium"
      />
    </MobileToolbarSection>
  );
};

// Backward compatibility export
export const MobileZoomControls = ToolbarZoomControls;