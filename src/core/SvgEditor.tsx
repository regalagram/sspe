import React, { useState, MouseEvent, WheelEvent, useEffect, useRef } from 'react';
import { useEditorStore } from '../store/editorStore';
import { pathToString, subPathToString, snapToGrid, getCommandPosition } from '../utils/path-utils';
import { pluginManager } from './PluginSystem';
import { ZoomPlugin } from '../plugins/zoom/Zoom';
import { GridPlugin, FullScreenGridOverlay } from '../plugins/grid/Grid';
import { UndoRedoPlugin } from '../plugins/undo-redo/UndoRedo';
import { CreationToolsPlugin } from '../plugins/creation-tools/CreationTools';
import { FullscreenPlugin } from '../plugins/fullscreen/Fullscreen';
import { PathStylePlugin } from '../plugins/path-style/PathStyle';
import { ControlPointsPlugin } from '../plugins/control-points/ControlPoints';
import { SelectionToolsPlugin } from '../plugins/selection-tools/SelectionTools';
import { SVGPlugin } from '../plugins/svg-editor/SVGEditor';
import { SubPathListPlugin } from '../plugins/subpath-list/SubPathList';

export const SvgEditor: React.FC = () => {
  const {
    paths,
    selection,
    viewport,
    grid,
    mode,
    isFullscreen,
    enabledFeatures,
    selectPath,
    selectCommand,
    selectSubPath,
    selectMultiple,
    clearSelection,
    moveCommand,
    updateCommand,
    removeCommand,
    setZoom,
    pan,
    pushToHistory,
    addCommand,
  } = useEditorStore();

  const [draggingCommand, setDraggingCommand] = useState<string | null>(null);
  const [draggingControlPoint, setDraggingControlPoint] = useState<{ commandId: string; point: 'x1y1' | 'x2y2' } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePosition, setLastMousePosition] = useState({ x: 0, y: 0 });
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionRect, setSelectionRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragStartPositions, setDragStartPositions] = useState<{ [id: string]: { x: number; y: number } }>({});
  const [dragOrigin, setDragOrigin] = useState<{ x: number; y: number } | null>(null);

  // Initialize plugins
  useEffect(() => {
    pluginManager.registerPlugin(ZoomPlugin);
    pluginManager.registerPlugin(GridPlugin);
    pluginManager.registerPlugin(UndoRedoPlugin);
    pluginManager.registerPlugin(CreationToolsPlugin);
    pluginManager.registerPlugin(FullscreenPlugin);
    pluginManager.registerPlugin(PathStylePlugin);
    pluginManager.registerPlugin(ControlPointsPlugin);
    pluginManager.registerPlugin(SelectionToolsPlugin);
    pluginManager.registerPlugin(SVGPlugin);
    pluginManager.registerPlugin(SubPathListPlugin);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (pluginManager.handleKeyDown(e)) {
        return; // Shortcut was handled by plugin
      }
      
      // Handle other editor shortcuts
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selection.selectedCommands.length > 0) {
          // Eliminar comandos seleccionados
          selection.selectedCommands.forEach(commandId => {
            removeCommand(commandId);
          });
          clearSelection();
          pushToHistory();
          e.preventDefault();
        }
      }
      
      if (e.key === 'Escape') {
        clearSelection();
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection.selectedCommands, clearSelection]);

  const getSVGPoint = (e: MouseEvent<SVGElement>) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPoint = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    
    // Transform point to account for zoom and pan
    return {
      x: (svgPoint.x - viewport.pan.x) / viewport.zoom,
      y: (svgPoint.y - viewport.pan.y) / viewport.zoom,
    };
  };

  const handleMouseDown = (e: MouseEvent<SVGElement>, commandId?: string, controlPoint?: 'x1y1' | 'x2y2') => {
    e.stopPropagation();
    
    if (e.button === 1) { // Middle mouse button for panning
      setIsPanning(true);
      setLastMousePosition({ x: e.clientX, y: e.clientY });
      return;
    }

    if (commandId && controlPoint) {
      // Arrastrando punto de control
      setDraggingControlPoint({ commandId, point: controlPoint });
      pushToHistory();
    } else if (commandId) {
      // Selecting/dragging a command point
      if (e.ctrlKey || e.metaKey) {
        // Selección múltiple
        if (selection.selectedCommands.includes(commandId)) {
          // Deseleccionar si ya está seleccionado
          const newSelection = selection.selectedCommands.filter(id => id !== commandId);
          selectMultiple(newSelection, 'commands');
        } else {
          // Agregar a la selección
          selectMultiple([...selection.selectedCommands, commandId], 'commands');
        }
      } else {
        // Selección simple
        if (!selection.selectedCommands.includes(commandId)) {
          selectCommand(commandId);
        }
      }
      setDraggingCommand(commandId);
      // Guardar posiciones iniciales de todos los comandos seleccionados
      const selectedIds = selection.selectedCommands.includes(commandId)
        ? selection.selectedCommands
        : [commandId];
      const positions: { [id: string]: { x: number; y: number } } = {};
      paths.forEach((path) => {
        path.subPaths.forEach((subPath) => {
          subPath.commands.forEach((cmd) => {
            if (selectedIds.includes(cmd.id)) {
              const pos = getCommandPosition(cmd);
              if (pos) positions[cmd.id] = { x: pos.x, y: pos.y };
            }
          });
        });
      });
      setDragStartPositions(positions);
      setDragOrigin(getSVGPoint(e));
      pushToHistory();
    } else if (mode.current === 'create' && mode.createMode) {
      // Creating a new command
      const point = getSVGPoint(e);
      
      if (grid.snapToGrid) {
        const snappedPoint = snapToGrid(point, grid.size);
        point.x = snappedPoint.x;
        point.y = snappedPoint.y;
      }
      
      // Find the active path and sub-path (last sub-path of last path or create new)
      let activeSubPath = null;
      if (paths.length > 0) {
        const lastPath = paths[paths.length - 1];
        if (lastPath.subPaths.length > 0) {
          activeSubPath = lastPath.subPaths[lastPath.subPaths.length - 1];
        }
      }
      if (activeSubPath) {
        const commandType = mode.createMode.commandType;
        const newCommand: any = {
          command: commandType,
          x: point.x,
          y: point.y,
        };
        
        // Add more properties based on command type
        if (commandType === 'C') {
          // For cubic bezier, we need control points
          newCommand.x1 = point.x - 20;
          newCommand.y1 = point.y - 20;
          newCommand.x2 = point.x + 20;
          newCommand.y2 = point.y + 20;
        } else if (commandType === 'Q') {
          // For quadratic bezier, we need one control point
          newCommand.x1 = point.x;
          newCommand.y1 = point.y - 20;
        } else if (commandType === 'A') {
          // For arc, we need radius and flags
          newCommand.rx = 20;
          newCommand.ry = 20;
          newCommand.xAxisRotation = 0;
          newCommand.largeArcFlag = 0;
          newCommand.sweepFlag = 1;
        }
        
        addCommand(activeSubPath.id, newCommand);
        pushToHistory();
      }
    } else if (!commandId && !controlPoint && e.button === 0 && !(e.ctrlKey || e.metaKey)) {
      // Iniciar selección múltiple con drag
      const svgPoint = getSVGPoint(e);
      setIsSelecting(true);
      setSelectionStart(svgPoint);
      setSelectionRect(null);
      return;
    } else {
      // Clear selection if clicking on empty space
      clearSelection();
    }
  };

  const handleMouseMove = (e: MouseEvent<SVGElement>) => {
    if (isPanning) {
      const dx = e.clientX - lastMousePosition.x;
      const dy = e.clientY - lastMousePosition.y;
      pan({ x: dx, y: dy });
      setLastMousePosition({ x: e.clientX, y: e.clientY });
      return;
    }

    if (draggingControlPoint) {
      const point = getSVGPoint(e);
      
      if (grid.snapToGrid) {
        const snappedPoint = snapToGrid(point, grid.size);
        point.x = snappedPoint.x;
        point.y = snappedPoint.y;
      }
      
      // Actualizar punto de control
      if (draggingControlPoint.point === 'x1y1') {
        updateCommand(draggingControlPoint.commandId, { x1: point.x, y1: point.y });
      } else if (draggingControlPoint.point === 'x2y2') {
        updateCommand(draggingControlPoint.commandId, { x2: point.x, y2: point.y });
      }
      return;
    }

    if (draggingCommand && dragOrigin && Object.keys(dragStartPositions).length > 0) {
      const point = getSVGPoint(e);
      const dx = point.x - dragOrigin.x;
      const dy = point.y - dragOrigin.y;
      // Mover todos los comandos seleccionados
      selection.selectedCommands.forEach((cmdId) => {
        const start = dragStartPositions[cmdId];
        if (start) {
          let newX = start.x + dx;
          let newY = start.y + dy;
          if (grid.snapToGrid) {
            const snapped = snapToGrid({ x: newX, y: newY }, grid.size);
            newX = snapped.x;
            newY = snapped.y;
          }
          moveCommand(cmdId, { x: newX, y: newY });
        }
      });
      return;
    }
    
    if (isSelecting && selectionStart) {
      const svgPoint = getSVGPoint(e);
      const x = Math.min(selectionStart.x, svgPoint.x);
      const y = Math.min(selectionStart.y, svgPoint.y);
      const width = Math.abs(selectionStart.x - svgPoint.x);
      const height = Math.abs(selectionStart.y - svgPoint.y);
      setSelectionRect({ x, y, width, height });
      return;
    }
  };

  const handleMouseUp = () => {
    setDraggingCommand(null);
    setDraggingControlPoint(null);
    setIsPanning(false);
    setDragStartPositions({});
    setDragOrigin(null);
    if (isSelecting && selectionRect) {
      // Seleccionar todos los comandos dentro del rectángulo
      const selectedIds: string[] = [];
      paths.forEach((path) => {
        path.subPaths.forEach((subPath) => {
          subPath.commands.forEach((command) => {
            const pos = getCommandPosition(command);
            if (!pos) return;
            if (
              pos.x >= selectionRect.x &&
              pos.x <= selectionRect.x + selectionRect.width &&
              pos.y >= selectionRect.y &&
              pos.y <= selectionRect.y + selectionRect.height
            ) {
              selectedIds.push(command.id);
            }
          });
        });
      });
      if (selectedIds.length > 0) {
        selectMultiple(selectedIds, 'commands');
      } else {
        clearSelection();
      }
    }
    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionRect(null);
  };

  const handleWheel = (e: WheelEvent<SVGElement>) => {
    e.preventDefault();
    const point = getSVGPoint(e);
    const zoomFactor = 1 - e.deltaY * 0.001;
    setZoom(viewport.zoom * zoomFactor, point);
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
      
      {/* Full-screen grid overlay */}
      {grid.enabled && (
        <FullScreenGridOverlay
          size={grid.size}
          color={grid.color}
          opacity={grid.opacity}
          zoom={viewport.zoom}
          pan={viewport.pan}
        />
      )}
      
      {/* Main SVG canvas */}
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{ 
          cursor: isPanning ? 'grabbing' : (draggingCommand || draggingControlPoint) ? 'grabbing' : isSelecting ? 'crosshair' : 'default',
          background: 'white'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <g transform={`translate(${viewport.pan.x}, ${viewport.pan.y}) scale(${viewport.zoom})`}>
          {/* Render paths first (background layer) */}
          {paths.map((path) => {
            const isPathSelected = selection.selectedPaths.includes(path.id);
            // Unir todos los sub-paths en un solo string d
            const d = path.subPaths.map(subPathToString).join(' ');
            return (
              <path
                key={`path-${path.id}`}
                d={d}
                fill={path.style.fill}
                stroke={path.style.stroke}
                strokeWidth={(path.style.strokeWidth || 1) / viewport.zoom}
                strokeDasharray={path.style.strokeDasharray}
                strokeLinecap={path.style.strokeLinecap}
                strokeLinejoin={path.style.strokeLinejoin}
                fillOpacity={path.style.fillOpacity}
                strokeOpacity={path.style.strokeOpacity}
                fillRule={path.style.fillRule || 'nonzero'}
                style={{
                  cursor: 'pointer',
                  filter: isPathSelected ? 'drop-shadow(0 0 2px #4488cc)' : 'none',
                  pointerEvents: 'all',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  selectPath(path.id);
                }}
              />
            );
          })}
          
          {/* Render control points second (middle layer) */}
{enabledFeatures.has('control-points') && paths.map((path) => 
  path.subPaths.map((subPath) => 
    subPath.commands.map((command, commandIndex) => {
      const position = getCommandPosition(command);
      if (!position) return null;
      
      const radius = Math.max(6 / viewport.zoom, 6); // Minimum 6px for visibility
      
      // Find previous command position for connecting control points
      const prevCommand = commandIndex > 0 ? subPath.commands[commandIndex - 1] : null;
      const prevPosition = prevCommand ? getCommandPosition(prevCommand) : null;
      
      return (
        <g key={`control-${command.id}`}>
          {/* Render control points for cubic curves */}
          {(command.command === 'C' || command.command === 'c') && (
            <>
              {/* First control point connects to previous command position */}
              {command.x1 !== undefined && command.y1 !== undefined && prevPosition && (
                <>
                  <line
                    x1={prevPosition.x}
                    y1={prevPosition.y}
                    x2={command.x1}
                    y2={command.y1}
                    stroke="#999"
                    strokeWidth={1 / viewport.zoom}
                    strokeDasharray={`${2 / viewport.zoom},${2 / viewport.zoom}`}
                    pointerEvents="none"
                  />
                  <circle
                    cx={command.x1}
                    cy={command.y1}
                    r={radius * 0.7}
                    fill="#999"
                    stroke="#666"
                    strokeWidth={1 / viewport.zoom}
                    style={{ cursor: 'grab' }}
                    onMouseDown={(e) => handleMouseDown(e, command.id, 'x1y1')}
                  />
                </>
              )}
              {/* Second control point connects to current command position */}
              {command.x2 !== undefined && command.y2 !== undefined && (
                <>
                  <line
                    x1={position.x}
                    y1={position.y}
                    x2={command.x2}
                    y2={command.y2}
                    stroke="#999"
                    strokeWidth={1 / viewport.zoom}
                    strokeDasharray={`${2 / viewport.zoom},${2 / viewport.zoom}`}
                    pointerEvents="none"
                  />
                  <circle
                    cx={command.x2}
                    cy={command.y2}
                    r={radius * 0.7}
                    fill="#999"
                    stroke="#666"
                    strokeWidth={1 / viewport.zoom}
                    style={{ cursor: 'grab' }}
                    onMouseDown={(e) => handleMouseDown(e, command.id, 'x2y2')}
                  />
                </>
              )}
            </>
          )}
          
          {/* Render control point for quadratic curves */}
          {(command.command === 'Q' || command.command === 'q') && command.x1 !== undefined && command.y1 !== undefined && (
            <>
              <line
                x1={position.x}
                y1={position.y}
                x2={command.x1}
                y2={command.y1}
                stroke="#999"
                strokeWidth={1 / viewport.zoom}
                strokeDasharray={`${2 / viewport.zoom},${2 / viewport.zoom}`}
                pointerEvents="none"
              />
              <circle
                cx={command.x1}
                cy={command.y1}
                r={radius * 0.7}
                fill="#999"
                stroke="#666"
                strokeWidth={1 / viewport.zoom}
                style={{ cursor: 'grab' }}
                onMouseDown={(e) => handleMouseDown(e, command.id, 'x1y1')}
              />
            </>
          )}
        </g>
      );
    })
  )
)}
          {/* Render command points last (top layer) */}
          {paths.map((path) => 
            path.subPaths.map((subPath) => 
              subPath.commands.map((command) => {
                const position = getCommandPosition(command);
                if (!position) return null;

                const isSelected = selection.selectedCommands.includes(command.id);
                const radius = Math.max(6 / viewport.zoom, 6); // Minimum 6px for visibility

                return (
                  <circle
                    key={`command-${command.id}`}
                    cx={position.x}
                    cy={position.y}
                    r={radius}
                    fill={isSelected ? '#007acc' : '#ff4444'}
                    stroke={isSelected ? '#005299' : '#cc0000'}
                    strokeWidth={2 / viewport.zoom}
                    style={{ 
                      cursor: 'grab',
                      pointerEvents: 'all',
                      opacity: 0.9
                    }}
                    onMouseDown={(e) => {
                      handleMouseDown(e, command.id);
                    }}
                  />
                );
              })
            )
          )}
          
          {/* Render preview for create mode */}
          {mode.current === 'create' && mode.createMode?.previewCommand && (
            <circle
              cx={mode.createMode.previewCommand.x}
              cy={mode.createMode.previewCommand.y}
              r={4 / viewport.zoom}
              fill="rgba(0, 122, 204, 0.5)"
              stroke="#007acc"
              strokeWidth={1 / viewport.zoom}
            />
          )}
          
          {/* Rectángulo de selección múltiple */}
          {isSelecting && selectionRect && (
            <rect
              x={selectionRect.x}
              y={selectionRect.y}
              width={selectionRect.width}
              height={selectionRect.height}
              fill="rgba(0, 120, 204, 0.15)"
              stroke="#007acc"
              strokeWidth={1 / viewport.zoom}
              style={{ pointerEvents: 'none' }}
            />
          )}
        </g>
      </svg>
      
      {/* Render sidebar plugins */}
      {renderPluginUI('sidebar')}
    </div>
  );
};
