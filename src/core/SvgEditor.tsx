import React, { useEffect, useRef } from 'react';
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

// Register plugins immediately during module loading
const initializePlugins = () => {
  // Register all plugins before any component renders
  pluginManager.registerPlugin(PencilPlugin); // Register pencil plugin FIRST for priority
  pluginManager.registerPlugin(MouseInteractionPlugin);
  pluginManager.registerPlugin(SelectionPlugin);
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
  pluginManager.registerPlugin(SubPathTransformPlugin);
  pluginManager.registerPlugin(PointTransformPlugin);
};

// Initialize plugins during module load
initializePlugins();

export const SvgEditor: React.FC = () => {
  const editorStore = useEditorStore();
  const { isFullscreen } = editorStore;
  const svgRef = useRef<SVGSVGElement>(null);
  
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

  // Handle mouse events through plugin system
  const handleMouseDown = (e: React.MouseEvent<SVGElement>) => {
    // Extract command ID and control point from data attributes
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

  // Render plugin UI components
  const renderPluginUI = (position: string) => {
    return pluginManager.getEnabledPlugins()
      .flatMap(plugin => plugin.ui || [])
      .filter(ui => ui.position === position)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(ui => <ui.component key={ui.id} />);
  };

  const editorStyle: React.CSSProperties = {
    width: '100%',
    height: '100vh',
    position: 'relative',
    overflow: 'hidden',
    background: '#f5f5f5',
    ...(isFullscreen ? {
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 9999,
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
          background: 'white'
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
    </div>
  );
};
