import React, { useEffect, useRef } from 'react';
import { enableGlobalTouchToMouse } from '../utils/touch-to-mouse-global';
import { useEditorStore } from '../store/editorStore';
import { pluginManager } from './PluginSystem';
import { getSafeTransform } from '../utils/transform-utils';
import { ZoomPlugin } from '../plugins/zoom/Zoom';
import { GridPlugin } from '../plugins/grid/Grid';
import { UndoRedoPlugin } from '../plugins/undo-redo/UndoRedo';
import { CreationPlugin } from '../plugins/creation/Creation';
import { FullscreenPlugin } from '../plugins/fullscreen/Fullscreen';
import { PathStylePlugin } from '../plugins/path-style/PathStyle';
import { SelectionPlugin, useRectSelection } from '../plugins/selection/Selection';
import { SVGPlugin } from '../plugins/svg-editor/SVGEditor';
import { SubPathListPlugin } from '../plugins/subpath-list/SubPathList';
import { MouseInteractionPlugin, useMouseInteraction } from '../plugins/mouse-interaction/MouseInteraction';
import { PathRendererPlugin } from '../plugins/path-renderer/PathRenderer';
import { CommandPlugin } from '../plugins/command/Command';
import { GlobalKeyboardPlugin } from '../plugins/global-keyboard/GlobalKeyboard';
import { VisualDebugPlugin } from '../plugins/visual-debug/VisualDebug';
import { SubPathTransformPlugin } from '../plugins/subpath-transform/SubPathTransform';
import { PointTransformPlugin } from '../plugins/point-transform/PointTransform';
import { PencilPlugin } from '../plugins/pencil/Pencil';
import { usePencilCursor } from '../plugins/pencil/usePencilCursor';
import { ShapesPlugin } from '../plugins/shapes/Shapes';
import { Transform } from '../plugins/transform/Transform';
import { ArrangePlugin } from '../plugins/arrange/Arrange';
import { ReorderPlugin } from '../plugins/reorder/Reorder';
import { PanelModePlugin } from '../plugins/panelmode/PanelMode';
import { usePanelModeStore } from '../plugins/panelmode/PanelManager';
import { AccordionSidebar } from '../plugins/panelmode/AccordionSidebar';
import { Menu, X } from 'lucide-react';

// Register plugins immediately during module loading
enableGlobalTouchToMouse(); // Sistema global simple: touch→mouse
const initializePlugins = () => {
  // Register base dependencies first
  pluginManager.registerPlugin(MouseInteractionPlugin); // Required by pencil
  pluginManager.registerPlugin(SelectionPlugin); // Required by subpath-transform and point-transform
  
  // Register other core plugins
  pluginManager.registerPlugin(PathRendererPlugin);
  pluginManager.registerPlugin(VisualDebugPlugin);
  pluginManager.registerPlugin(CommandPlugin);
  pluginManager.registerPlugin(CreationPlugin);
  pluginManager.registerPlugin(GlobalKeyboardPlugin);
  pluginManager.registerPlugin(ZoomPlugin);
  pluginManager.registerPlugin(GridPlugin);
  pluginManager.registerPlugin(UndoRedoPlugin);
  pluginManager.registerPlugin(FullscreenPlugin);
  pluginManager.registerPlugin(PathStylePlugin);
  pluginManager.registerPlugin(SVGPlugin);
  pluginManager.registerPlugin(SubPathListPlugin);
  
  // Register plugins that depend on others
  pluginManager.registerPlugin(PencilPlugin); // Depends on mouse-interaction
  pluginManager.registerPlugin(SubPathTransformPlugin); // Depends on selection
  pluginManager.registerPlugin(PointTransformPlugin); // Depends on selection
  
  // Register remaining plugins
  pluginManager.registerPlugin(ShapesPlugin);
  pluginManager.registerPlugin(Transform);
  pluginManager.registerPlugin(ArrangePlugin);
  pluginManager.registerPlugin(ReorderPlugin);
  pluginManager.registerPlugin(PanelModePlugin);
};

// Initialize plugins during module load
initializePlugins();

export const SvgEditor: React.FC = () => {
  const editorStore = useEditorStore();
  const { isFullscreen } = editorStore;
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Get panel mode from store
  const { mode: panelMode, accordionVisible, toggleAccordionVisible } = usePanelModeStore();
  
  // Get cursor from plugins
  const mouseInteraction = useMouseInteraction();
  const rectSelection = useRectSelection();
  const pencilCursor = usePencilCursor();
  
  // Combine cursors from different plugins
  const getCursor = () => {
    const mouseCursor = mouseInteraction.getCursor();
    const rectCursor = rectSelection.getCursor();
    const pencilCursorValue = pencilCursor.getCursor();
    
    if (pencilCursorValue !== 'default') return pencilCursorValue;
    if (mouseCursor !== 'default') return mouseCursor;
    if (rectCursor !== 'default') return rectCursor;
    return 'default';
  };

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

  // Handle keyboard shortcuts through plugin system
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      pluginManager.handleKeyDown(e);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);


  // Handle mouse events through plugin system (React events)
  const handleMouseDown = (e: React.MouseEvent<SVGElement>) => {
    const target = e.target as SVGElement;
    const commandId = target.getAttribute('data-command-id') || undefined;
    const controlPoint = target.getAttribute('data-control-point') as 'x1y1' | 'x2y2' | undefined;
    pluginManager.handleMouseEvent('mouseDown', e, commandId, controlPoint);
  };
  const handleMouseMove = (e: React.MouseEvent<SVGElement>) => {
    pluginManager.handleMouseEvent('mouseMove', e);
  };
  const handleMouseUp = (e: React.MouseEvent<SVGElement>) => {
    pluginManager.handleMouseEvent('mouseUp', e);
  };
  const handleWheel = (e: React.WheelEvent<SVGElement>) => {
    pluginManager.handleMouseEvent('wheel', e);
  };

  // Native listeners para eventos mouse que salen del SVG durante drag
  useEffect(() => {
    const handleNativeMove = (e: MouseEvent) => {
      if (e.buttons === 1) {
        const mouseEvent = {
          ...e,
          nativeEvent: e,
          currentTarget: e.target,
          target: e.target,
          clientX: e.clientX,
          clientY: e.clientY,
          buttons: e.buttons,
          button: e.button,
          preventDefault: () => e.preventDefault(),
          stopPropagation: () => e.stopPropagation(),
        } as any;
        pluginManager.handleMouseEvent('mouseMove', mouseEvent);
      }
    };
    const handleNativeUp = (e: MouseEvent) => {
      const mouseEvent = {
        ...e,
        nativeEvent: e,
        currentTarget: e.target,
        target: e.target,
        clientX: e.clientX,
        clientY: e.clientY,
        buttons: e.buttons,
        button: e.button,
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation(),
      } as any;
      pluginManager.handleMouseEvent('mouseUp', mouseEvent);
    };
    document.addEventListener('mousemove', handleNativeMove);
    document.addEventListener('mouseup', handleNativeUp);
    return () => {
      document.removeEventListener('mousemove', handleNativeMove);
      document.removeEventListener('mouseup', handleNativeUp);
    };
  }, []);

  // Render plugin UI components
  const renderPluginUI = (position: string) => {
    const { getVisiblePanels } = usePanelModeStore.getState();
    const visiblePanels = getVisiblePanels();
    
    const plugins = pluginManager.getEnabledPlugins()
      .flatMap(plugin => plugin.ui || [])
      .filter(ui => ui.position === position)
      .filter(ui => {
        // In draggable mode, respect visibility settings
        if (panelMode === 'draggable') {
          return visiblePanels.some(panel => panel.id === ui.id);
        }
        return true; // In accordion mode, filtering is handled by AccordionSidebar
      })
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    // Special handling for sidebar in accordion mode - include toolbar panels too
    if (position === 'sidebar' && panelMode === 'accordion') {
      // Only show accordion if it's visible
      if (!accordionVisible) {
        return null;
      }
      
      // Get all draggable panels (sidebar + toolbar) including panel-mode-ui
      const allDraggablePanels = pluginManager.getEnabledPlugins()
        .flatMap(plugin => plugin.ui || [])
        .filter(ui => 
          (ui.position === 'sidebar' || ui.position === 'toolbar')
          // Include all panels, including panel-mode-ui in accordion
        )
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      
      return <AccordionSidebar plugins={allDraggablePanels} />;
    }
    
    // In accordion mode, hide toolbar panels since they're shown in the accordion
    if (position === 'toolbar' && panelMode === 'accordion') {
      return null;
    }
    
    // Default draggable mode
    return plugins.map(ui => <ui.component key={ui.id} />);
  };

  const editorStyle: React.CSSProperties = {
    width: '100%',
    height: '100vh',
    position: 'relative',
    overflow: 'hidden',
    background: '#f5f5f5',
    // Adjust right margin when accordion mode is active and visible
    marginRight: (panelMode === 'accordion' && accordionVisible) ? '320px' : '0',
    transition: 'margin-right 0.3s ease',
    ...(isFullscreen ? {
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 9999,
      marginRight: 0, // No margin in fullscreen
    } : {})
  };

  return (
    <div className="svg-editor" style={editorStyle}>
      {/* Render toolbar plugins */}
      {renderPluginUI('toolbar')}
      
      {/* Main SVG canvas */}
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{ 
          cursor: getCursor(),
          background: 'white',
          touchAction: 'none' // Prevenir comportamientos nativos de touch
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <g transform={getSafeTransform(editorStore.viewport)}>
          {/* Render SVG content through plugins */}
          {renderPluginUI('svg-content')}
        </g>
      </svg>
      
      {/* Render sidebar plugins */}
      {renderPluginUI('sidebar')}

      {/* Accordion toggle button - only show in accordion mode and not in fullscreen */}
      {panelMode === 'accordion' && !isFullscreen && (
        <button
          onClick={toggleAccordionVisible}
          style={{
            position: 'fixed',
            top: '20px',
            right: accordionVisible ? '220px' : '20px', // Ajustado para el ancho de 200px + margen
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: '#007acc',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            transition: 'all 0.3s ease',
            color: 'white'
          }}
          title={accordionVisible ? 'Hide accordion sidebar' : 'Show accordion sidebar'}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#005a9e';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#007acc';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {accordionVisible ? <X size={24} /> : <Menu size={24} />}
        </button>
      )}
    </div>
  );
};
