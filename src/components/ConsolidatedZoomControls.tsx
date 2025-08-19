import React, { useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Target, Grid3X3, Expand, Minimize, Navigation } from 'lucide-react';
import { ToolbarSection } from './ToolbarButton';
import { ToolbarSubmenu, SubmenuItem } from './ToolbarSubmenu';
import { useEditorStore } from '../store/editorStore';
import { useMobileDetection } from '../hooks/useMobileDetection';

export const ConsolidatedZoomControls: React.FC = () => {
  const { isMobile } = useMobileDetection();
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const [forceRerender, setForceRerender] = useState(0);
  const { 
    viewport, 
    selection, 
    grid,
    isFullscreen,
    enabledFeatures,
    zoomIn, 
    zoomOut, 
    zoomToFit, 
    zoomToSelection, 
    zoomToSubPath, 
    resetView,
    toggleGrid,
    toggleSnapToGrid,
    toggleGridLabels,
    toggleFullscreen,
    toggleFeature
  } = useEditorStore();

  // Match floating toolbar button sizing
  const buttonSize = isMobile ? 28 : 32;

  const hasSelection = selection.selectedCommands.length > 0 || 
                       selection.selectedPaths.length > 0 || 
                       selection.selectedTexts.length > 0 || 
                       selection.selectedGroups.length > 0 || 
                       selection.selectedImages.length > 0;
  const hasSubPathSelection = selection.selectedSubPaths.length > 0;
  
  // Force re-calculation when selection changes
  const selectionKey = `${hasSelection}-${hasSubPathSelection}`;
  
  // Close submenu when selection changes to force position recalculation
  useEffect(() => {
    if (isSubmenuOpen) {
      setIsSubmenuOpen(false);
    }
    // Force rerender to ensure fresh component state
    setForceRerender(prev => prev + 1);
  }, [selectionKey]);

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

  const handleFullscreenToggle = async () => {
    try {
      if (!isFullscreen) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
      toggleFullscreen();
    } catch (error) {
      console.error('Fullscreen toggle failed:', error);
    }
  };

  return (
    <ToolbarSection title="View Controls">
      <ToolbarSubmenu
        key={`${selectionKey}-${forceRerender}`}
        trigger={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: `${buttonSize}px`,
            height: `${buttonSize}px`,
            background: isSubmenuOpen ? '#f3f4f6' : 'white',
            fontSize: '11px',
            fontWeight: 600,
            color: '#374151',
            border: 'none',
            borderRadius: '0px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            position: 'relative',
            opacity: 1,
            touchAction: 'manipulation'
          }}>
            {Math.round(viewport.zoom * 100)}
            {/* Snap indicator dot */}
            {grid.snapToGrid && (
              <div style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                backgroundColor: '#6b7280',
                pointerEvents: 'none'
              }} />
            )}
          </div>
        }
        isOpen={isSubmenuOpen}
        onToggle={() => setIsSubmenuOpen(!isSubmenuOpen)}
      >
        {/* Zoom Controls */}
        <div style={{ padding: '8px 12px', fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>
          Zoom Options
        </div>
        <SubmenuItem
          icon={<ZoomIn size={isMobile ? 12 : 13} />}
          label="Zoom In"
          onClick={() => {
            handleZoomIn();
            setIsSubmenuOpen(false);
          }}
        />
        <SubmenuItem
          icon={<ZoomOut size={isMobile ? 12 : 13} />}
          label="Zoom Out"
          onClick={() => {
            handleZoomOut();
            setIsSubmenuOpen(false);
          }}
        />
        <SubmenuItem
          icon={<Maximize2 size={isMobile ? 12 : 13} />}
          label="Fit to Screen"
          onClick={() => {
            zoomToFit();
            setIsSubmenuOpen(false);
          }}
        />
        <SubmenuItem
          icon={<RotateCcw size={isMobile ? 12 : 13} />}
          label="Reset View"
          onClick={() => {
            resetView();
            setIsSubmenuOpen(false);
          }}
        />
        {hasSelection && (
          <SubmenuItem
            icon={<Target size={isMobile ? 12 : 13} />}
            label="Fit Selection"
            onClick={() => {
              zoomToSelection();
              setIsSubmenuOpen(false);
            }}
          />
        )}
        {hasSubPathSelection && (
          <SubmenuItem
            icon={<Target size={isMobile ? 12 : 13} />}
            label="Fit SubPath"
            onClick={() => {
              zoomToSubPath();
              setIsSubmenuOpen(false);
            }}
          />
        )}
        
        <div style={{ 
          height: '1px', 
          background: '#e5e7eb', 
          margin: '4px 0' 
        }} />
        
        {/* Grid Controls */}
        <div style={{ padding: '8px 12px', fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>
          Grid Options
        </div>
        <SubmenuItem
          icon={<Grid3X3 size={isMobile ? 12 : 13} />}
          label={grid.enabled ? "Hide Grid" : "Show Grid"}
          onClick={() => {
            toggleGrid();
            setIsSubmenuOpen(false);
          }}
          active={!grid.enabled}
        />
        <SubmenuItem
          icon={<Grid3X3 size={isMobile ? 12 : 13} />}
          label={grid.snapToGrid ? "Disable Snap" : "Enable Snap"}
          onClick={() => {
            toggleSnapToGrid();
            setIsSubmenuOpen(false);
          }}
          active={grid.snapToGrid}
        />
        <SubmenuItem
          icon={<Grid3X3 size={isMobile ? 12 : 13} />}
          label={grid.showLabels ? "Hide Ruler Labels" : "Show Ruler Labels"}
          onClick={() => {
            toggleGridLabels();
            setIsSubmenuOpen(false);
          }}
          active={!grid.showLabels}
        />
        
        <div style={{ 
          height: '1px', 
          background: '#e5e7eb', 
          margin: '4px 0' 
        }} />
        
        <SubmenuItem
          icon={<Navigation size={isMobile ? 12 : 13} />}
          label={enabledFeatures.stickyGuidelinesEnabled ? "Disable Sticky Guidelines" : "Enable Sticky Guidelines"}
          onClick={() => {
            toggleFeature('stickyGuidelinesEnabled');
            setIsSubmenuOpen(false);
          }}
          active={enabledFeatures.stickyGuidelinesEnabled}
        />
        
        <div style={{ 
          height: '1px', 
          background: '#e5e7eb', 
          margin: '4px 0' 
        }} />
        
        {/* Fullscreen Control */}
        <SubmenuItem
          icon={isFullscreen ? <Minimize size={isMobile ? 12 : 13} /> : <Expand size={isMobile ? 12 : 13} />}
          label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          onClick={() => {
            handleFullscreenToggle();
            setIsSubmenuOpen(false);
          }}
          active={isFullscreen}
        />
      </ToolbarSubmenu>
    </ToolbarSection>
  );
};