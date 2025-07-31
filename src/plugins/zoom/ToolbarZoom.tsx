import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Target } from 'lucide-react';
import { MobileToolbarButton, MobileToolbarSection } from '../../components/ToolbarButton';
import { MobileToolbarSubmenu, MobileSubmenuItem } from '../../components/ToolbarSubmenu';
import { useEditorStore } from '../../store/editorStore';
import { useMobileToolbarStore } from '../../store/toolbarStore';
import { useMobileDetection } from '../../hooks/useMobileDetection';

export const ToolbarZoomControls: React.FC = () => {
  const { viewport, selection, zoomIn, zoomOut, zoomToFit, zoomToSelection, zoomToSubPath, resetView } = useEditorStore();
  const { isMobile } = useMobileDetection();
  const { 
    isZoomSubmenuOpen, 
    setZoomSubmenuOpen 
  } = useMobileToolbarStore();

  // Always show toolbar zoom controls (removed mobile-only restriction)

  const hasSelection = selection.selectedCommands.length > 0;
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
        icon={<ZoomOut />}
        onClick={handleZoomOut}
        color="#007acc"
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
            minWidth: '46px',
            height: '40px',
            background: isZoomSubmenuOpen ? '#e5e7eb' : 'white',
            fontSize: '12px',
            fontWeight: 600,
            color: '#007acc',
            border: 'none',
            gap: '4px',
            padding: '0 8px',
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
          icon={<Maximize2 size={16} />}
          label="Fit to Screen"
          onClick={() => handleZoomAction(zoomToFit)}
        />
        {hasSelection && (
          <MobileSubmenuItem
            icon={<Target size={16} />}
            label="Fit Selection"
            onClick={() => handleZoomAction(zoomToSelection)}
          />
        )}
        {hasSubPathSelection && (
          <MobileSubmenuItem
            icon={<Target size={16} />}
            label="Fit SubPath"
            onClick={() => handleZoomAction(zoomToSubPath)}
          />
        )}
        <MobileSubmenuItem
          icon={<RotateCcw size={16} />}
          label="Reset View"
          onClick={() => handleZoomAction(resetView)}
        />
      </MobileToolbarSubmenu>
      
      <MobileToolbarButton
        icon={<ZoomIn />}
        onClick={handleZoomIn}
        color="#007acc"
        title="Zoom In (Ctrl++)"
        size="medium"
      />
    </MobileToolbarSection>
  );
};

// Backward compatibility export
export const MobileZoomControls = ToolbarZoomControls;