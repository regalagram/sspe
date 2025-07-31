import React, { useRef } from 'react';
import { useEditorStore } from '../store/editorStore';
import { getSafeTransform } from '../utils/transform-utils';
import { usePanelModeStore } from '../plugins/panelmode/PanelManager';
import { initializePlugins } from './PluginInitializer';
import { useCombinedCursor } from '../hooks/useCombinedCursor';
import { useGlobalKeyboard } from '../hooks/useGlobalKeyboard';
import { useGlobalPointerEvents } from '../hooks/useGlobalPointerEvents';
import { useEditorStyles } from '../hooks/useEditorStyles';
import { usePluginInitialization } from '../hooks/usePluginInitialization';
import { usePointerEventHandlers } from '../hooks/usePointerEventHandlers';
import { useMobileDetection } from '../hooks/useMobileDetection';
import { pluginManager } from './PluginSystem';
import { AccordionSidebar } from '../plugins/panelmode/AccordionSidebar';
import { AccordionToggleButton } from '../components/AccordionToggleButton';
import { SVGDefinitions } from '../components/SVGDefinitions';
import { MobileContainer } from '../components/MobileContainer';
import { Toolbar } from '../components/Toolbar';
import { extractGradientsFromPaths } from '../utils/gradient-utils';

// Register plugins immediately during module loading

// Initialize plugins during module load
initializePlugins();

export const SvgEditor: React.FC = () => {
  const editorStore = useEditorStore();
  const { isFullscreen, paths, gradients: storeGradients } = editorStore;
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Get panel mode from store
  const { accordionVisible, toggleAccordionVisible, getVisiblePanels } = usePanelModeStore();
  
  // Mobile detection
  const { isMobile, isTablet } = useMobileDetection();
  const isMobileDevice = isMobile || isTablet;
  
  // Use custom hooks for cleaner separation of concerns
  const { getCursor } = useCombinedCursor();
  const { editorStyle, svgStyle } = useEditorStyles({ isFullscreen, accordionVisible });

  // Get svg-content plugins
  const svgContentPlugins = pluginManager.getEnabledPlugins()
    .flatMap(plugin => plugin.ui || [])
    .filter(ui => ui.position === 'svg-content')
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  // Get sidebar panels for mobile/accordion
  const sidebarPanels = pluginManager.getEnabledPlugins()
    .flatMap(plugin => plugin.ui || [])
    .filter(ui => ui.position === 'sidebar')
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  // Get toolbar panels  
  const toolbarPanels = pluginManager.getEnabledPlugins()
    .flatMap(plugin => plugin.ui || [])
    .filter(ui => ui.position === 'toolbar')
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  // Get all panels for accordion (sidebar + toolbar) - for desktop
  const allPanels = [...sidebarPanels, ...toolbarPanels];
  
  // Initialize global event handlers
  useGlobalKeyboard();
  useGlobalPointerEvents();
  
  // Initialize plugins
  usePluginInitialization(editorStore, svgRef);
  
  // Mouse event handlers
  const { handlePointerDown, handlePointerMove, handlePointerUp, handleWheel } = usePointerEventHandlers();

  // Extract gradients and patterns from paths
  const pathGradients = extractGradientsFromPaths(paths);
  
  // Add predefined gradients for text styling
  const predefinedGradients = [
    {
      id: 'text-gradient-1',
      type: 'linear' as const,
      x1: 0, y1: 0, x2: 100, y2: 0,
      stops: [
        { id: 'stop-1', offset: 0, color: '#ff6b6b', opacity: 1 },
        { id: 'stop-2', offset: 100, color: '#4ecdc4', opacity: 1 }
      ]
    },
    {
      id: 'text-gradient-2',
      type: 'linear' as const,
      x1: 0, y1: 0, x2: 100, y2: 100,
      stops: [
        { id: 'stop-3', offset: 0, color: '#667eea', opacity: 1 },
        { id: 'stop-4', offset: 100, color: '#764ba2', opacity: 1 }
      ]
    },
    {
      id: 'text-gradient-3',
      type: 'radial' as const,
      cx: 50, cy: 50, r: 50,
      stops: [
        { id: 'stop-5', offset: 0, color: '#ffeaa7', opacity: 1 },
        { id: 'stop-6', offset: 100, color: '#fab1a0', opacity: 1 }
      ]
    }
  ];
  
  // Deduplicate gradients by id to avoid React key conflicts
  const allGradientsArray = [...pathGradients, ...predefinedGradients, ...storeGradients];
  const gradients = allGradientsArray.filter((gradient, index, array) => 
    array.findIndex(g => g.id === gradient.id) === index
  );

  // SVG Canvas component
  const svgCanvas = (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      style={{ 
        cursor: getCursor(),
        ...svgStyle
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
    >
      {/* SVG Definitions for gradients and patterns */}
      <SVGDefinitions gradients={gradients} />
      
      <g transform={getSafeTransform(editorStore.viewport)}>
        {/* Render SVG content plugins */}
        {svgContentPlugins.map(ui => (
          <ui.component key={ui.id} />
        ))}
      </g>
    </svg>
  );

  // Mobile version with bottom sheet
  if (isMobileDevice) {
    return (
      <div className="svg-editor" style={editorStyle}>
        <MobileContainer
          sidebarPlugins={allPanels} // Use all panels like desktop
          toolbarPlugins={toolbarPanels}
        >
          {svgCanvas}
        </MobileContainer>
      </div>
    );
  }

  // Desktop version with accordion sidebar and toolbar
  return (
    <div className="svg-editor" style={editorStyle}>
      {/* Always visible toolbar for desktop */}
      <Toolbar toolbarPlugins={toolbarPanels} />
      
      {svgCanvas}
      
      {/* Render sidebar as accordion */}
      {accordionVisible && <AccordionSidebar plugins={allPanels} />}

      {/* Accordion toggle button - solo mostrar cuando el acordeón NO está visible */}
      {!accordionVisible && (
        <AccordionToggleButton
          accordionVisible={accordionVisible}
          toggleAccordionVisible={toggleAccordionVisible}
          isFullscreen={isFullscreen}
        />
      )}
    </div>
  );
};
