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
import { pluginManager } from './PluginSystem';
import { AccordionSidebar } from '../plugins/panelmode/AccordionSidebar';
import { AccordionToggleButton } from '../components/AccordionToggleButton';

// Register plugins immediately during module loading

// Initialize plugins during module load
initializePlugins();

export const SvgEditor: React.FC = () => {
  const editorStore = useEditorStore();
  const { isFullscreen } = editorStore;
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Get panel mode from store
  const { accordionVisible, toggleAccordionVisible, getVisiblePanels } = usePanelModeStore();
  
  // Use custom hooks for cleaner separation of concerns
  const { getCursor } = useCombinedCursor();
  const { editorStyle, svgStyle } = useEditorStyles({ isFullscreen, accordionVisible });

  // Get svg-content plugins
  const svgContentPlugins = pluginManager.getEnabledPlugins()
    .flatMap(plugin => plugin.ui || [])
    .filter(ui => ui.position === 'svg-content')
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  // Get all panels for accordion (sidebar + toolbar)
  const allPanels = pluginManager.getEnabledPlugins()
    .flatMap(plugin => plugin.ui || [])
    .filter(ui => ui.position === 'sidebar' || ui.position === 'toolbar')
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  
  // Initialize global event handlers
  useGlobalKeyboard();
  useGlobalMouseEvents();
  
  // Initialize plugins
  usePluginInitialization(editorStore, svgRef);
  
  // Mouse event handlers
  const { handleMouseDown, handleMouseMove, handleMouseUp, handleWheel } = useMouseEventHandlers();

  return (
    <div className="svg-editor" style={editorStyle}>
      {/* Toolbar is hidden in accordion mode */}
      
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
          {/* Render SVG content plugins */}
          {svgContentPlugins.map(ui => (
            <ui.component key={ui.id} />
          ))}
        </g>
      </svg>
      
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
