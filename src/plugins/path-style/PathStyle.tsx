import React, { useState } from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { PathStyle, SVGPath } from '../../types';
import { convertRgbToHex } from '../../utils/color-utils';
import { isGradientOrPattern } from '../../utils/gradient-utils';
import { StylePresets } from './StylePresets';
import { PluginButton } from '../../components/PluginButton';
import { Settings, Palette } from 'lucide-react';

// Helper function to convert colors to hex format for color inputs
const colorToHex = (color: string | any): string => {
  if (!color || color === 'none') return '#000000';
  
  // If it's a gradient or pattern, return a default color
  if (isGradientOrPattern(color)) return '#000000';
  
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
  const [viewMode, setViewMode] = useState<'manual' | 'presets'>('manual');

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'manual' ? 'presets' : 'manual');
  };

  return (
    <div className="path-style-controls" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* View Toggle Button */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
        <PluginButton
          icon=""
          text="Manual"
          color="#007bff"
          active={viewMode === 'manual'}
          onPointerDown={() => setViewMode('manual')}
        />
        <PluginButton
          icon=""
          text="Presets"
          color="#007bff"
          active={viewMode === 'presets'}
          onPointerDown={() => setViewMode('presets')}
        />
      </div>

      {/* Conditional Content */}
      {viewMode === 'presets' ? (
        <StylePresets onPresetApply={onStyleChange} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
          Fill Color:
        </div>
        <div style={{ display: 'flex', gap: '5px' }}>
          <input
            type="color"
            value={colorToHex(pathStyle.fill)}
            onChange={(e) => onStyleChange({ fill: e.target.value })}
            disabled={pathStyle.fill === 'none' || isGradientOrPattern(pathStyle.fill)}
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
            disabled={pathStyle.fill === 'none' || isGradientOrPattern(pathStyle.fill)}
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
            disabled={pathStyle.stroke === 'none' || isGradientOrPattern(pathStyle.stroke)}
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
            disabled={pathStyle.stroke === 'none' || isGradientOrPattern(pathStyle.stroke)}
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
            disabled={pathStyle.stroke === 'none' || isGradientOrPattern(pathStyle.stroke)}
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
      )}
    </div>
  );
};

export const PathStyleComponent: React.FC = () => {
  const { paths, selection, updatePathStyle } = useEditorStore();
  
  // Helper function to compare two style objects
  const areStylesEqual = (style1: PathStyle, style2: PathStyle): boolean => {
    const keys1 = Object.keys(style1);
    const keys2 = Object.keys(style2);
    
    if (keys1.length !== keys2.length) return false;
    
    return keys1.every(key => {
      const val1 = style1[key as keyof PathStyle];
      const val2 = style2[key as keyof PathStyle];
      return val1 === val2;
    });
  };
  
  // Find all paths that contain selected sub-paths
  const getPathsWithSelectedSubPaths = () => {
    const pathsWithSubPaths = new Map<string, SVGPath>();
    
    // Check selected sub-paths
    if (selection.selectedSubPaths.length > 0) {
      for (const subPathId of selection.selectedSubPaths) {
        for (const path of paths) {
          const foundSubPath = path.subPaths.find(sp => sp.id === subPathId);
          if (foundSubPath) {
            pathsWithSubPaths.set(path.id, path);
            break;
          }
        }
      }
    }
    // Check selected paths directly
    else if (selection.selectedPaths.length > 0) {
      for (const pathId of selection.selectedPaths) {
        const path = paths.find(p => p.id === pathId);
        if (path) {
          pathsWithSubPaths.set(path.id, path);
        }
      }
    }
    // Check selected commands
    else if (selection.selectedCommands.length > 0) {
      for (const commandId of selection.selectedCommands) {
        for (const path of paths) {
          let found = false;
          for (const subPath of path.subPaths) {
            if (subPath.commands.some(cmd => cmd.id === commandId)) {
              pathsWithSubPaths.set(path.id, path);
              found = true;
              break;
            }
          }
          if (found) break;
        }
      }
    }
    
    return Array.from(pathsWithSubPaths.values());
  };
  
  const selectedPaths = getPathsWithSelectedSubPaths();
  
  // Don't show if no selection
  if (selectedPaths.length === 0) {
    return null;
  }
  
  // Check if all selected paths have the same style
  const firstPathStyle = selectedPaths[0]?.style || {};
  const allPathsHaveSameStyle = selectedPaths.every(path => 
    areStylesEqual(path.style || {}, firstPathStyle)
  );
  
  // Only show the panel when all paths have the same style
  if (!allPathsHaveSameStyle) {
    return null;
  }
  
  // Force re-render when selection changes by creating a key that changes
  const pathIds = selectedPaths.map(p => p.id).sort().join(',');
  const renderKey = `${pathIds}-${selection.selectedSubPaths.join(',')}-${selection.selectedCommands.join(',')}-${JSON.stringify(firstPathStyle)}`;
  
  const handleStyleChange = (styleUpdates: Partial<PathStyle>) => {
    // Apply style changes to all paths that contain selected sub-paths
    selectedPaths.forEach(path => {
      updatePathStyle(path.id, styleUpdates);
    });
  };

  return (
    <div>
      <div style={{ 
        fontSize: '10px', 
        color: '#999', 
        textAlign: 'center',
        marginBottom: '8px',
        fontStyle: 'italic'
      }}>
        Editing {selectedPaths.length} path{selectedPaths.length !== 1 ? 's' : ''} with matching styles
      </div>
      <PathStyleControls
        hasSelection={true}
        pathStyle={firstPathStyle}
        onStyleChange={handleStyleChange}
      />
    </div>
  );
};

export const PathStylePlugin: Plugin = {
  id: 'path-style',
  name: 'Style',
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