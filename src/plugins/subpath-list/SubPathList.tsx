import React, { useEffect, useState, useRef } from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { DraggablePanel } from '../../components/DraggablePanel';
import { getAllSubPaths } from '../../utils/subpath-utils';
import { List, Eye, EyeOff } from 'lucide-react';
import { SVGPath, SVGSubPath } from '../../types';

interface SubPathListItemProps {
  path: SVGPath;
  subPath: SVGSubPath;
  isSelected: boolean;
  onSelect: () => void;
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
        padding: '8px 12px',
        borderRadius: '4px',
        cursor: 'pointer',
        backgroundColor: isSelected ? '#e3f2fd' : 'transparent',
        border: isSelected ? '1px solid #2196f3' : '1px solid transparent',
        marginBottom: '4px',
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
        <List size={12} color={isSelected ? '#2196f3' : '#666'} />
        <span style={{ 
          fontWeight: '500', 
          color: isSelected ? '#2196f3' : '#333' 
        }}>
          Sub-Path {subPath.id.slice(-6)}
        </span>
      </div>
      
      <div style={{ color: '#666', fontSize: '11px', marginLeft: '18px' }}>
        <div>Start: {firstCommand?.command} {firstCommand?.x?.toFixed(0)},{firstCommand?.y?.toFixed(0)}</div>
        <div>{commandCount} command{commandCount !== 1 ? 's' : ''}</div>
        <div style={{ color: '#999' }}>Path: {path.id.slice(-6)}</div>
      </div>
    </div>
  );
};

export const SubPathListComponent: React.FC = () => {
  const { paths, selection, selectSubPath, clearSelection, zoomToSubPath } = useEditorStore();
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

  const handleSubPathSelect = (subPathId: string) => {
    if (selection.selectedSubPaths.includes(subPathId)) {
      clearSelection();
    } else {
      selectSubPath(subPathId);
      if (autoZoom) {
        // Timeout para asegurar que el estado de selección se actualice antes del zoom
        if (zoomTimeout.current) clearTimeout(zoomTimeout.current);
        zoomTimeout.current = setTimeout(() => {
          zoomToSubPath();
        }, 50);
      }
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
              onSelect={() => handleSubPathSelect(subPath.id)}
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
