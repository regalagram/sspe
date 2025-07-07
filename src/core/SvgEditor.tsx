import React, { useRef } from 'react';
import { useEditorStore } from '../store/editorStore';
import { getSafeTransform } from '../utils/transform-utils';
import { usePanelModeStore } from '../plugins/panelmode/PanelManager';
import { initializePlugins } from './PluginInitializer';
import { useCombinedCursor } from '../hooks/useCombinedCursor';
import { useGlobalKeyboard } from '../hooks/useGlobalKeyboard';
import { useGlobalMouseEvents } from '../hooks/useGlobalMouseEvents';
import { useEditorStyles } from '../hooks/useEditorStyles';
import { usePluginInitialization } from '../hooks/usePluginInitialization';
import { useMouseEventHandlers } from '../hooks/useMouseEventHandlers';
import { PluginUIRenderer } from '../components/PluginUIRenderer';
import { AccordionToggleButton } from '../components/AccordionToggleButton';

// Register plugins immediately during module loading

// Initialize plugins during module load
initializePlugins();

export const SvgEditor: React.FC = () => {
  const editorStore = useEditorStore();
  const { isFullscreen } = editorStore;
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Get panel mode from store
  const { mode: panelMode, accordionVisible, toggleAccordionVisible } = usePanelModeStore();
  
  // Use custom hooks for cleaner separation of concerns
  const { getCursor } = useCombinedCursor();
  const { editorStyle, svgStyle } = useEditorStyles({ isFullscreen, panelMode, accordionVisible });
  
  // Initialize global event handlers
  useGlobalKeyboard();
  useGlobalMouseEvents();
  
  // Initialize plugins
  usePluginInitialization(editorStore, svgRef);
  
  // Mouse event handlers
  const { handleMouseDown, handleMouseMove, handleMouseUp, handleWheel } = useMouseEventHandlers();

  return (
    <div className="svg-editor" style={editorStyle}>
      {/* Render toolbar plugins */}
      <PluginUIRenderer position="toolbar" />
      
      {/* Main SVG canvas */}
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{ 
          cursor: getCursor(),
          ...svgStyle
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <g transform={getSafeTransform(editorStore.viewport)}>
          {/* Render SVG content through plugins */}
          <PluginUIRenderer position="svg-content" />
        </g>
      </svg>
      
      {/* Render sidebar plugins */}
      <PluginUIRenderer position="sidebar" />

      {/* Accordion toggle button - only show in accordion mode */}
      {panelMode === 'accordion' && (
        <AccordionToggleButton
          accordionVisible={accordionVisible}
          toggleAccordionVisible={toggleAccordionVisible}
          isFullscreen={isFullscreen}
        />
      )}
    </div>
  );
};
