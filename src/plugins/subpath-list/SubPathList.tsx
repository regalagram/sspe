import React, { useEffect, useState, useRef } from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { DraggablePanel } from '../../components/DraggablePanel';
import { getAllSubPaths } from '../../utils/subpath-utils';
import { subPathToString } from '../../utils/path-utils';
import { Eye, EyeOff } from 'lucide-react';
import { SVGPath, SVGSubPath } from '../../types';

interface SubPathWireframeProps {
  subPath: SVGSubPath;
  isSelected: boolean;
}

const SubPathWireframe: React.FC<SubPathWireframeProps> = ({ subPath, isSelected }) => {
  const pathData = subPathToString(subPath);
  
  if (!pathData || subPath.commands.length === 0) {
    return (
      <div style={{
        width: '100%',
        height: '50px',
        border: '1px solid #ddd',
        borderRadius: '2px',
        backgroundColor: '#f9f9f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '10px',
        color: '#999',
        flexShrink: 0
      }}>
        Empty
      </div>
    );
  }

  // Calculate rough bounds for scaling
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  subPath.commands.forEach(cmd => {
    // Main coordinates
    if (cmd.x !== undefined) {
      minX = Math.min(minX, cmd.x);
      maxX = Math.max(maxX, cmd.x);
    }
    if (cmd.y !== undefined) {
      minY = Math.min(minY, cmd.y);
      maxY = Math.max(maxY, cmd.y);
    }
    
    // Control points for curves
    if (cmd.x1 !== undefined) {
      minX = Math.min(minX, cmd.x1);
      maxX = Math.max(maxX, cmd.x1);
    }
    if (cmd.y1 !== undefined) {
      minY = Math.min(minY, cmd.y1);
      maxY = Math.max(maxY, cmd.y1);
    }
    if (cmd.x2 !== undefined) {
      minX = Math.min(minX, cmd.x2);
      maxX = Math.max(maxX, cmd.x2);
    }
    if (cmd.y2 !== undefined) {
      minY = Math.min(minY, cmd.y2);
      maxY = Math.max(maxY, cmd.y2);
    }
    
  });

  // Fallback if bounds couldn't be calculated
  if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
    return (
      <div style={{
        width: '100%',
        height: '50px',
        border: '1px solid #ddd',
        borderRadius: '2px',
        backgroundColor: '#f9f9f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '10px',
        color: '#999',
        flexShrink: 0
      }}>
        Path
      </div>
    );
  }

  const width = Math.max(maxX - minX, 5); // Minimum width
  const height = Math.max(maxY - minY, 5); // Minimum height
  const padding = Math.max(width * 0.15, height * 0.15, 2); // Increased padding for better visibility
  
  // Calculate aspect ratio and dynamic height
  const aspectRatio = height / width;
  const maxPreviewHeight = 120; // Maximum height limit
  const minPreviewHeight = 30;  // Minimum height limit
  const baseWidth = 200; // Approximate container width for calculation
  
  // Calculate proportional height based on aspect ratio
  let previewHeight = Math.round(baseWidth * aspectRatio);
  
  // Apply height constraints
  previewHeight = Math.max(minPreviewHeight, Math.min(maxPreviewHeight, previewHeight));

  const viewBoxWidth = width + padding * 2;
  const viewBoxHeight = height + padding * 2;
  const viewBoxX = minX - padding;
  const viewBoxY = minY - padding;

  // Calculate stroke width based on the size of the path
  const avgDimension = (width + height) / 2;
  const strokeWidth = Math.max(avgDimension * 0.02, 0.5);

  return (
    <div style={{
      width: '100%',
      height: `${previewHeight}px`,
      border: isSelected ? '1px solid #2196f3' : '1px solid #ddd',
      borderRadius: '2px',
      backgroundColor: isSelected ? '#f3f9ff' : '#fafafa',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      flexShrink: 0
    }}>
      <svg
        width="100%"
        height="100%"
        viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`}
        style={{ display: 'block' }}
        preserveAspectRatio="xMidYMid meet"
      >
        <path
          d={pathData}
          fill="none"
          stroke={isSelected ? '#2196f3' : '#666'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

interface SubPathListItemProps {
  path: SVGPath;
  subPath: SVGSubPath;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
}

const SubPathListItem: React.FC<SubPathListItemProps> = ({
  path,
  subPath,
  isSelected,
  onSelect,
}) => {
  // Get first command for display info
  const firstCommand = subPath.commands[0];
  const commandCount = subPath.commands.length;
  
  return (
    <div
      onClick={onSelect}
      style={{
        padding: '6px 8px',
        borderRadius: '4px',
        cursor: 'pointer',
        backgroundColor: isSelected ? '#e3f2fd' : 'transparent',
        border: isSelected ? '1px solid #2196f3' : '1px solid transparent',
        marginBottom: '3px',
        fontSize: '12px',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          (e.target as HTMLElement).style.backgroundColor = '#f5f5f5';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          (e.target as HTMLElement).style.backgroundColor = 'transparent';
        }
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
        <SubPathWireframe subPath={subPath} isSelected={isSelected} />
        <div style={{ width: '100%', textAlign: 'center' }}>
          <div style={{ marginBottom: '4px' }}>
            <span style={{ 
              fontWeight: '500', 
              color: isSelected ? '#2196f3' : '#333',
              fontSize: '11px'
            }}>
              Sub-Path {subPath.id.slice(-6)}
            </span>
          </div>
          
          <div style={{ color: '#666', fontSize: '10px', lineHeight: '1.3' }}>
            <div>Start: {firstCommand?.command} {firstCommand?.x?.toFixed(0)},{firstCommand?.y?.toFixed(0)}</div>
            <div>{commandCount} command{commandCount !== 1 ? 's' : ''}</div>
            <div style={{ color: '#999' }}>Path: {path.id.slice(-6)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SubPathListComponent: React.FC = () => {
  const { 
    paths, 
    selection, 
    selectSubPath, 
    selectSubPathMultiple,
    clearSelection, 
    zoomToSubPath 
  } = useEditorStore();
  // Estado local para mantener la lista de sub-paths
  const [subPathsList, setSubPathsList] = useState<Array<{ path: SVGPath; subPath: SVGSubPath }>>([]);
  // Estado local para el toggle de auto-zoom
  const [autoZoom, setAutoZoom] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('sspe-auto-zoom');
      return stored ? JSON.parse(stored) : false;
    } catch {
      return false;
    }
  });
  // Ref para evitar doble zoom en doble click
  const zoomTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Refs para los elementos de la lista de sub-paths
  const subPathRefs = useRef<{ [subPathId: string]: HTMLDivElement | null }>({});

  // Actualizar la lista de sub-paths cuando cambian los paths
  useEffect(() => {
    if (paths && paths.length > 0) {
      const allSubPaths = getAllSubPaths(paths);
      setSubPathsList(allSubPaths);
    } else {
      setSubPathsList([]);
    }
  }, [paths]);

  // Hacer scroll automático al sub-path seleccionado
  useEffect(() => {
    if (selection.selectedSubPaths.length === 1) {
      const selectedId = selection.selectedSubPaths[0];
      const el = subPathRefs.current[selectedId];
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selection.selectedSubPaths, subPathsList]);

  const handleSubPathSelect = (subPathId: string, isShiftPressed = false) => {
    if (isShiftPressed) {
      // Use the new multiple selection logic
      selectSubPathMultiple(subPathId, true);
    } else if (selection.selectedSubPaths.includes(subPathId) && selection.selectedSubPaths.length === 1) {
      // Solo desmarcar si es el único seleccionado y no se mantiene shift
      clearSelection();
    } else {
      // Comportamiento normal de selección
      selectSubPathMultiple(subPathId, false);
    }
    
    if (autoZoom && !isShiftPressed) {
      // Timeout para asegurar que el estado de selección se actualice antes del zoom
      if (zoomTimeout.current) clearTimeout(zoomTimeout.current);
      zoomTimeout.current = setTimeout(() => {
        zoomToSubPath();
      }, 50);
    }
  };

  if (subPathsList.length === 0) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center', 
        color: '#999',
        fontSize: '12px'
      }}>
        No sub-paths available
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: '11px', color: '#666', fontWeight: 500 }}>
          {subPathsList.length} Sub-Path{subPathsList.length !== 1 ? 's' : ''} Available
        </span>
        {selection.selectedSubPaths.length > 1 && (
          <span style={{ 
            fontSize: '10px', 
            color: '#2196f3', 
            backgroundColor: '#e3f2fd',
            padding: '2px 6px',
            borderRadius: '3px',
            fontWeight: 500
          }}>
            {selection.selectedSubPaths.length} selected
          </span>
        )}
      </div>
      <div style={{ 
        fontSize: '10px', 
        color: '#999', 
        fontStyle: 'italic',
        marginBottom: '4px'
      }}>
        Hold Shift + Click to select multiple sub-paths
      </div>
      <div style={{ 
        maxHeight: '300px', 
        overflowY: 'auto',
        paddingRight: '4px'
      }}>
        {subPathsList.map(({ path, subPath }) => (
          <div
            key={subPath.id}
            ref={el => { subPathRefs.current[subPath.id] = el; }}
          >
            <SubPathListItem
              path={path}
              subPath={subPath}
              isSelected={selection.selectedSubPaths.includes(subPath.id)}
              onSelect={(e) => handleSubPathSelect(subPath.id, e.shiftKey)}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', marginTop: 12, marginBottom: 0, justifyContent: 'flex-start' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={autoZoom}
            onChange={e => {
              setAutoZoom(e.target.checked);
              try {
                localStorage.setItem('sspe-auto-zoom', JSON.stringify(e.target.checked));
              } catch {}
            }}
            style={{ accentColor: '#2196f3', marginRight: 4 }}
          />
          Auto-Zoom
        </label>
      </div>
    </div>
  );
};

export const SubPathListPlugin: Plugin = {
  id: 'subpath-list',
  name: 'Sub-Path List',
  version: '1.0.0',
  enabled: true,
  
  shortcuts: [
    {
      key: 'p',
      modifiers: ['ctrl', 'shift'],
      description: 'Focus Sub-Path List',
      action: () => {
        // Focus the sub-path list panel
        const panel = document.querySelector('#subpath-list');
        if (panel) {
          panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    },
    {
      key: 'a',
      modifiers: ['ctrl', 'shift'],
      description: 'Select All Sub-Paths',
      action: () => {
        const store = useEditorStore.getState();
        const allSubPathIds = getAllSubPaths(store.paths).map(({ subPath }) => subPath.id);
        if (allSubPathIds.length > 0) {
          store.selectMultiple(allSubPathIds, 'subpaths');
        }
      }
    }
  ],
  
  ui: [
    {
      id: 'subpath-list',
      component: () => (
        <DraggablePanel 
          title="Sub-Paths"
          initialPosition={{ x: 980, y: 80 }}
          id="subpath-list"
        >
          <SubPathListComponent />
        </DraggablePanel>
      ),
      position: 'sidebar',
      order: 0
    }
  ]
};
