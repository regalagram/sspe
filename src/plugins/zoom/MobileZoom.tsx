import React from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Target, Search } from 'lucide-react';
import { MobileToolbarButton, MobileToolbarSection } from '../../components/MobileToolbarButton';
import { useEditorStore } from '../../store/editorStore';
import { useMobileDetection } from '../../hooks/useMobileDetection';

export const MobileZoomControls: React.FC = () => {
  const { viewport, selection, zoomIn, zoomOut, zoomToFit, zoomToSelection, zoomToSubPath, resetView } = useEditorStore();
  const { isMobile } = useMobileDetection();

  if (!isMobile) {
    // Return null for desktop - use original component
    return null;
  }

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

  return (
    <MobileToolbarSection title="Zoom Controls">
      <MobileToolbarButton
        icon={<ZoomOut />}
        label="-"
        onClick={handleZoomOut}
        color="#007acc"
        title="Zoom Out (Ctrl+-)"
        size="medium"
      />
      <MobileToolbarButton
        icon={<ZoomIn />}
        label="+"
        onClick={handleZoomIn}
        color="#007acc"
        title="Zoom In (Ctrl++)"
        size="medium"
      />
      <MobileToolbarButton
        icon={<Maximize2 />}
        onClick={zoomToFit}
        color="#007acc"
        title="Fit to Screen (Ctrl+0)"
        size="medium"
      />
      {hasSelection && (
        <MobileToolbarButton
          icon={<Target />}
          label="S"
          onClick={zoomToSelection}
          color="#007acc"
          title="Fit Selection (Ctrl+Shift+0)"
          size="medium"
        />
      )}
      {hasSubPathSelection && (
        <MobileToolbarButton
          icon={<Target />}
          label="P"
          onClick={zoomToSubPath}
          color="#007acc"
          title="Fit SubPath (Ctrl+Shift+S)"
          size="medium"
        />
      )}
      <MobileToolbarButton
        icon={<RotateCcw />}
        onClick={resetView}
        color="#6c757d"
        title="Reset View (Ctrl+R)"
        size="medium"
      />
      {/* Zoom percentage display */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '50px',
        height: '44px',
        background: '#f8f9fa',
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: 600,
        color: '#007acc',
        border: '1px solid #e5e7eb',
        gap: '4px',
        padding: '0 8px'
      }}>
        <Search size={12} />
        <span>{Math.round(viewport.zoom * 100)}%</span>
      </div>
    </MobileToolbarSection>
  );
};