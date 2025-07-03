import React, { useEffect, useRef } from 'react';
import { enableGlobalTouchToMouse } from '../utils/touch-to-mouse-global';
import { useEditorStore } from '../store/editorStore';
import { pluginManager } from './PluginSystem';
import { getSafeTransform } from '../utils/transform-utils';
import { usePanelModeStore } from '../plugins/panelmode/PanelManager';
import { initializePlugins } from './PluginInitializer';
import { useCombinedCursor } from '../hooks/useCombinedCursor';
import { useGlobalKeyboard } from '../hooks/useGlobalKeyboard';
import { useGlobalMouseEvents } from '../hooks/useGlobalMouseEvents';
import { useEditorStyles } from '../hooks/useEditorStyles';
import { PluginUIRenderer } from '../components/PluginUIRenderer';
import { AccordionToggleButton } from '../components/AccordionToggleButton';

// Register plugins immediately during module loading
enableGlobalTouchToMouse(); // Sistema global simple: touch→mouse

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

  // Initialize plugins with editor store and SVG ref
  useEffect(() => {
    // Set up editor store and SVG ref for plugin manager
    pluginManager.setEditorStore(editorStore);
    pluginManager.setSVGRef(svgRef);
    
    // Initialize plugins with editor store (plugins are already registered)
    pluginManager.getEnabledPlugins().forEach(plugin => {
      plugin.initialize?.(editorStore);
    });
  }, [editorStore]);

  // Handle mouse events through plugin system (React events)
  const handleMouseDown = (e: React.MouseEvent<SVGElement>) => {
    console.log('📱 SvgEditor: handleMouseDown called');
    const target = e.target as SVGElement;
    const commandId = target.getAttribute('data-command-id') || undefined;
    const controlPoint = target.getAttribute('data-control-point') as 'x1y1' | 'x2y2' | undefined;
    pluginManager.handleMouseEvent('mouseDown', e, commandId, controlPoint);
  };
  
  const handleMouseMove = (e: React.MouseEvent<SVGElement>) => {
    console.log('📱 SvgEditor: handleMouseMove called');
    pluginManager.handleMouseEvent('mouseMove', e);
  };
  
  const handleMouseUp = (e: React.MouseEvent<SVGElement>) => {
    console.log('📱 SvgEditor: handleMouseUp called');
    pluginManager.handleMouseEvent('mouseUp', e);
  };
  
  const handleWheel = (e: React.WheelEvent<SVGElement>) => {
    pluginManager.handleMouseEvent('wheel', e);
  };

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
