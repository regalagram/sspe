import React from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { PathStyle } from '../../types';
import { DraggablePanel } from '../../components/DraggablePanel';
import { convertRgbToHex } from '../../utils/color-utils';

// Helper function to convert colors to hex format for color inputs
const colorToHex = (color: string | undefined): string => {
  if (!color || color === 'none') return '#000000';
  
  // Use the improved color conversion function
  const converted = convertRgbToHex(color);
  
  // If conversion failed or returned non-hex, fallback to black
  if (!converted || converted === color && !color.startsWith('#')) {
    return '#000000';
  }
  
  return converted;
};

interface PathStyleControlsProps {
  hasSelection: boolean;
  pathStyle: PathStyle;
  onStyleChange: (style: Partial<PathStyle>) => void;
}

export const PathStyleControls: React.FC<PathStyleControlsProps> = ({
  hasSelection,
  pathStyle,
  onStyleChange,
}) => {
  return (
    <div className="path-style-controls" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
          Fill Color:
        </div>
        <div style={{ display: 'flex', gap: '5px' }}>
          <input
            type="color"
            value={colorToHex(pathStyle.fill)}
            onChange={(e) => onStyleChange({ fill: e.target.value })}
            disabled={pathStyle.fill === 'none'}
          />
          <label style={{ fontSize: '12px' }}>
            <input
              type="checkbox"
              checked={pathStyle.fill === 'none'}
              onChange={(e) => onStyleChange({ 
                fill: e.target.checked ? 'none' : '#000000'
              })}
            />
            None
          </label>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
          Fill Opacity:
        </div>
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={pathStyle.fillOpacity || 1}
            onChange={(e) => onStyleChange({ fillOpacity: Number(e.target.value) })}
            disabled={pathStyle.fill === 'none'}
            style={{ flex: 1 }}
          />
          <span style={{ fontSize: '12px', minWidth: '35px' }}>{Math.round((pathStyle.fillOpacity || 1) * 100)}%</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
          Stroke Color:
        </div>
        <div style={{ display: 'flex', gap: '5px' }}>
          <input
            type="color"
            value={colorToHex(pathStyle.stroke)}
            onChange={(e) => onStyleChange({ stroke: e.target.value })}
            disabled={pathStyle.stroke === 'none'}
          />
          <label style={{ fontSize: '12px' }}>
            <input
              type="checkbox"
              checked={pathStyle.stroke === 'none'}
              onChange={(e) => onStyleChange({ 
                stroke: e.target.checked ? 'none' : '#000000'
              })}
            />
            None
          </label>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
          Stroke Width:
        </div>
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          <input
            type="range"
            min="0.5"
            max="10"
            step="0.5"
            value={pathStyle.strokeWidth || 1}
            onChange={(e) => onStyleChange({ strokeWidth: Number(e.target.value) })}
            disabled={pathStyle.stroke === 'none'}
            style={{ flex: 1 }}
          />
          <span style={{ fontSize: '12px', minWidth: '35px' }}>{pathStyle.strokeWidth || 1}px</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
          Stroke Opacity:
        </div>
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={pathStyle.strokeOpacity || 1}
            onChange={(e) => onStyleChange({ strokeOpacity: Number(e.target.value) })}
            disabled={pathStyle.stroke === 'none'}
            style={{ flex: 1 }}
          />
          <span style={{ fontSize: '12px', minWidth: '35px' }}>{Math.round((pathStyle.strokeOpacity || 1) * 100)}%</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
          Stroke Dash:
        </div>
        <input
          type="text"
          placeholder="e.g., 5,5 or 10,2,2,2"
          value={pathStyle.strokeDasharray || ''}
          onChange={(e) => onStyleChange({ strokeDasharray: e.target.value || undefined })}
          disabled={pathStyle.stroke === 'none'}
          style={{ width: '100%', padding: '4px', fontSize: '12px' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
          Stroke Line Cap:
        </div>
        <select
          value={pathStyle.strokeLinecap || 'butt'}
          onChange={(e) => onStyleChange({ strokeLinecap: e.target.value as any })}
          disabled={pathStyle.stroke === 'none'}
          style={{ width: '100%', padding: '4px', fontSize: '12px' }}
        >
          <option value="butt">Butt</option>
          <option value="round">Round</option>
          <option value="square">Square</option>
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
          Stroke Line Join:
        </div>
        <select
          value={pathStyle.strokeLinejoin || 'miter'}
          onChange={(e) => onStyleChange({ strokeLinejoin: e.target.value as any })}
          disabled={pathStyle.stroke === 'none'}
          style={{ width: '100%', padding: '4px', fontSize: '12px' }}
        >
          <option value="miter">Miter</option>
          <option value="round">Round</option>
          <option value="bevel">Bevel</option>
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
          Fill Rule:
        </div>
        <select
          value={pathStyle.fillRule || 'nonzero'}
          onChange={e => onStyleChange({ fillRule: e.target.value as 'nonzero' | 'evenodd' })}
          style={{ fontSize: '12px', padding: '2px 6px', width: '120px' }}
        >
          <option value="nonzero">nonzero (default)</option>
          <option value="evenodd">evenodd</option>
        </select>
      </div>
    </div>
  );
};

export const PathStyleComponent: React.FC = () => {
  const { paths, selection, updatePathStyle } = useEditorStore();
  
  // Find the selected sub-path and its parent path
  let selectedSubPath = selection.selectedSubPaths[0] || null;
  let selectedPath = selection.selectedPaths[0] || null;
  let pathId = null;
  
  // Si hay un sub-path seleccionado, encontrar su path padre
  if (selectedSubPath) {
    for (const path of paths) {
      const foundSubPath = path.subPaths.find(sp => sp.id === selectedSubPath);
      if (foundSubPath) {
        pathId = path.id;
        break;
      }
    }
  } else if (selectedPath) {
    pathId = selectedPath;
  } else if (selection.selectedCommands.length > 0) {
    const selectedCommandId = selection.selectedCommands[0];
    for (const path of paths) {
      let found = false;
      for (const subPath of path.subPaths) {
        if (subPath.commands.some(cmd => cmd.id === selectedCommandId)) {
          pathId = path.id;
          selectedSubPath = subPath.id;
          found = true;
          break;
        }
      }
      if (found) break;
    }
  }
  const path = pathId ? paths.find(p => p.id === pathId) : null;
  const hasSelection = !!pathId;
  
  // Only show the panel when there's a selection
  if (!hasSelection) {
    return null;
  }
  
  // Force re-render when selection changes by creating a key that changes
  const renderKey = `${pathId}-${selectedSubPath}-${selection.selectedCommands.join(',')}-${selection.selectedSubPaths.join(',')}-${JSON.stringify(path?.style)}`;
  const handleStyleChange = (styleUpdates: Partial<PathStyle>) => {
    if (!pathId) return;
    updatePathStyle(pathId, styleUpdates);
  };
  return (
    <DraggablePanel 
      title="Path Style"
      initialPosition={{ x: 980, y: 220 }}
      id="path-style"
    >
      <PathStyleControls
        key={renderKey}
        hasSelection={hasSelection}
        pathStyle={path?.style || {}}
        onStyleChange={handleStyleChange}
      />
    </DraggablePanel>
  );
};

export const PathStylePlugin: Plugin = {
  id: 'path-style',
  name: 'Path Style',
  version: '1.0.0',
  enabled: true,
  
  ui: [
    {
      id: 'path-style-controls',
      component: PathStyleComponent,
      position: 'sidebar',
      order: 1
    }
  ]
};