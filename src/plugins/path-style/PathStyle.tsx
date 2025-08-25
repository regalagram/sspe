import React, { useState } from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { PathStyle, SVGPath } from '../../types';
import { convertRgbToHex, parseColorWithOpacity } from '../../utils/color-utils';
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

  // Analyze fill opacity state
  const getFillOpacityState = () => {
    const hasExplicitOpacity = pathStyle.fillOpacity !== undefined;
    let hasEmbeddedOpacity = false;
    let embeddedOpacity = 1;
    
    if (typeof pathStyle.fill === 'string') {
      const parsed = parseColorWithOpacity(pathStyle.fill);
      if (parsed.opacity !== undefined) {
        hasEmbeddedOpacity = true;
        embeddedOpacity = parsed.opacity;
      }
    }
    
    return {
      hasExplicitOpacity,
      hasEmbeddedOpacity,
      explicitOpacity: pathStyle.fillOpacity || 1,
      embeddedOpacity,
      effectiveOpacity: hasEmbeddedOpacity ? embeddedOpacity : (pathStyle.fillOpacity || 1)
    };
  };

  // Analyze stroke opacity state
  const getStrokeOpacityState = () => {
    const hasExplicitOpacity = pathStyle.strokeOpacity !== undefined;
    let hasEmbeddedOpacity = false;
    let embeddedOpacity = 1;
    
    if (typeof pathStyle.stroke === 'string') {
      const parsed = parseColorWithOpacity(pathStyle.stroke);
      if (parsed.opacity !== undefined) {
        hasEmbeddedOpacity = true;
        embeddedOpacity = parsed.opacity;
      }
    }
    
    return {
      hasExplicitOpacity,
      hasEmbeddedOpacity,
      explicitOpacity: pathStyle.strokeOpacity || 1,
      embeddedOpacity,
      effectiveOpacity: hasEmbeddedOpacity ? embeddedOpacity : (pathStyle.strokeOpacity || 1)
    };
  };

  // Apply explicit fill opacity changes
  const applyExplicitFillOpacity = (newOpacity: number) => {
    const clampedOpacity = Math.max(0, Math.min(1, newOpacity));
    onStyleChange({ fillOpacity: clampedOpacity });
  };

  // Apply embedded fill opacity changes (RGBA/HSLA)
  const applyEmbeddedFillOpacity = (newOpacity: number) => {
    const clampedOpacity = Math.max(0, Math.min(1, newOpacity));
    
    if (typeof pathStyle.fill === 'string') {
      // Check if it's RGBA format
      const rgbaMatch = pathStyle.fill.match(/rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)/);
      if (rgbaMatch) {
        const r = rgbaMatch[1];
        const g = rgbaMatch[2];
        const b = rgbaMatch[3];
        onStyleChange({ fill: `rgba(${r},${g},${b},${clampedOpacity})` });
        return;
      }

      // Check if it's HSLA format
      const hslaMatch = pathStyle.fill.match(/hsla\s*\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*,\s*([0-9.]+)\s*\)/);
      if (hslaMatch) {
        const h = hslaMatch[1];
        const s = hslaMatch[2];
        const l = hslaMatch[3];
        onStyleChange({ fill: `hsla(${h},${s}%,${l}%,${clampedOpacity})` });
        return;
      }
    }
  };

  // Apply explicit stroke opacity changes
  const applyExplicitStrokeOpacity = (newOpacity: number) => {
    const clampedOpacity = Math.max(0, Math.min(1, newOpacity));
    onStyleChange({ strokeOpacity: clampedOpacity });
  };

  // Apply embedded stroke opacity changes (RGBA/HSLA)
  const applyEmbeddedStrokeOpacity = (newOpacity: number) => {
    const clampedOpacity = Math.max(0, Math.min(1, newOpacity));
    
    if (typeof pathStyle.stroke === 'string') {
      // Check if it's RGBA format
      const rgbaMatch = pathStyle.stroke.match(/rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)/);
      if (rgbaMatch) {
        const r = rgbaMatch[1];
        const g = rgbaMatch[2];
        const b = rgbaMatch[3];
        onStyleChange({ stroke: `rgba(${r},${g},${b},${clampedOpacity})` });
        return;
      }

      // Check if it's HSLA format
      const hslaMatch = pathStyle.stroke.match(/hsla\s*\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*,\s*([0-9.]+)\s*\)/);
      if (hslaMatch) {
        const h = hslaMatch[1];
        const s = hslaMatch[2];
        const l = hslaMatch[3];
        onStyleChange({ stroke: `hsla(${h},${s}%,${l}%,${clampedOpacity})` });
        return;
      }
    }
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
        {(() => {
          const fillState = getFillOpacityState();
          
          // Case 1: Both RGBA and explicit opacity
          if (fillState.hasEmbeddedOpacity && fillState.hasExplicitOpacity) {
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: '#888', marginBottom: '2px' }}>
                    RGBA: {Math.round(fillState.embeddedOpacity * 100)}%
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={fillState.embeddedOpacity}
                    onChange={(e) => applyEmbeddedFillOpacity(Number(e.target.value))}
                    disabled={pathStyle.fill === 'none' || isGradientOrPattern(pathStyle.fill)}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#888', marginBottom: '2px' }}>
                    Opacity: {Math.round(fillState.explicitOpacity * 100)}%
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={fillState.explicitOpacity}
                    onChange={(e) => applyExplicitFillOpacity(Number(e.target.value))}
                    disabled={pathStyle.fill === 'none' || isGradientOrPattern(pathStyle.fill)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            );
          }
          // Case 2: Only RGBA
          else if (fillState.hasEmbeddedOpacity && !fillState.hasExplicitOpacity) {
            return (
              <div>
                <div style={{ fontSize: '10px', color: '#888', marginBottom: '2px' }}>
                  RGBA: {Math.round(fillState.embeddedOpacity * 100)}%
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={fillState.embeddedOpacity}
                  onChange={(e) => applyEmbeddedFillOpacity(Number(e.target.value))}
                  disabled={pathStyle.fill === 'none' || isGradientOrPattern(pathStyle.fill)}
                  style={{ width: '100%' }}
                />
              </div>
            );
          }
          // Case 3 & 4: Only explicit opacity or none (show explicit opacity slider)
          else {
            return (
              <div>
                <div style={{ fontSize: '10px', color: '#888', marginBottom: '2px' }}>
                  {Math.round(fillState.explicitOpacity * 100)}%
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={fillState.explicitOpacity}
                  onChange={(e) => applyExplicitFillOpacity(Number(e.target.value))}
                  disabled={pathStyle.fill === 'none' || isGradientOrPattern(pathStyle.fill)}
                  style={{ width: '100%' }}
                />
              </div>
            );
          }
        })()}
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
        {(() => {
          const strokeState = getStrokeOpacityState();
          
          // Case 1: Both RGBA and explicit opacity
          if (strokeState.hasEmbeddedOpacity && strokeState.hasExplicitOpacity) {
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: '#888', marginBottom: '2px' }}>
                    RGBA: {Math.round(strokeState.embeddedOpacity * 100)}%
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={strokeState.embeddedOpacity}
                    onChange={(e) => applyEmbeddedStrokeOpacity(Number(e.target.value))}
                    disabled={pathStyle.stroke === 'none' || isGradientOrPattern(pathStyle.stroke)}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#888', marginBottom: '2px' }}>
                    Opacity: {Math.round(strokeState.explicitOpacity * 100)}%
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={strokeState.explicitOpacity}
                    onChange={(e) => applyExplicitStrokeOpacity(Number(e.target.value))}
                    disabled={pathStyle.stroke === 'none' || isGradientOrPattern(pathStyle.stroke)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            );
          }
          // Case 2: Only RGBA
          else if (strokeState.hasEmbeddedOpacity && !strokeState.hasExplicitOpacity) {
            return (
              <div>
                <div style={{ fontSize: '10px', color: '#888', marginBottom: '2px' }}>
                  RGBA: {Math.round(strokeState.embeddedOpacity * 100)}%
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={strokeState.embeddedOpacity}
                  onChange={(e) => applyEmbeddedStrokeOpacity(Number(e.target.value))}
                  disabled={pathStyle.stroke === 'none' || isGradientOrPattern(pathStyle.stroke)}
                  style={{ width: '100%' }}
                />
              </div>
            );
          }
          // Case 3 & 4: Only explicit opacity or none (show explicit opacity slider)
          else {
            return (
              <div>
                <div style={{ fontSize: '10px', color: '#888', marginBottom: '2px' }}>
                  {Math.round(strokeState.explicitOpacity * 100)}%
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={strokeState.explicitOpacity}
                  onChange={(e) => applyExplicitStrokeOpacity(Number(e.target.value))}
                  disabled={pathStyle.stroke === 'none' || isGradientOrPattern(pathStyle.stroke)}
                  style={{ width: '100%' }}
                />
              </div>
            );
          }
        })()}
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
  const { paths, uses, selection, updatePathStyle, updateUseStyle } = useEditorStore();
  
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
  
  // Find all elements with styles (paths and uses)
  const getElementsWithStyles = () => {
    const elements: Array<{ id: string; style: any; type: 'path' | 'use' }> = [];
    
    // Check selected sub-paths
    if (selection.selectedSubPaths.length > 0) {
      for (const subPathId of selection.selectedSubPaths) {
        for (const path of paths) {
          const foundSubPath = path.subPaths.find(sp => sp.id === subPathId);
          if (foundSubPath) {
            elements.push({ id: path.id, style: path.style, type: 'path' });
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
          elements.push({ id: path.id, style: path.style, type: 'path' });
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
              elements.push({ id: path.id, style: path.style, type: 'path' });
              found = true;
              break;
            }
          }
          if (found) break;
        }
      }
    }
    
    // Check selected use elements (symbol instances)
    if (selection.selectedUses.length > 0) {
      for (const useId of selection.selectedUses) {
        const use = uses.find(u => u.id === useId);
        if (use) {
          elements.push({ id: use.id, style: use.style || {}, type: 'use' });
        }
      }
    }
    
    return elements;
  };
  
  const selectedElements = getElementsWithStyles();
  
  // Don't show if no selection
  if (selectedElements.length === 0) {
    return null;
  }
  
  // Check if all selected elements have the same style
  const firstElementStyle = selectedElements[0]?.style || {};
  const allElementsHaveSameStyle = selectedElements.every(element => 
    areStylesEqual(element.style || {}, firstElementStyle)
  );
  
  // Only show the panel when all elements have the same style
  if (!allElementsHaveSameStyle) {
    return null;
  }
  
  // Force re-render when selection changes by creating a key that changes
  const elementIds = selectedElements.map(e => e.id).sort().join(',');
  const renderKey = `${elementIds}-${selection.selectedSubPaths.join(',')}-${selection.selectedCommands.join(',')}-${selection.selectedUses.join(',')}-${JSON.stringify(firstElementStyle)}`;
  
  const handleStyleChange = (styleUpdates: Partial<PathStyle>) => {
    // Apply style changes to all selected elements
    selectedElements.forEach(element => {
      if (element.type === 'path') {
        updatePathStyle(element.id, styleUpdates);
      } else if (element.type === 'use') {
        updateUseStyle(element.id, styleUpdates);
      }
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
        Editing {selectedElements.length} element{selectedElements.length !== 1 ? 's' : ''} with matching styles
      </div>
      <PathStyleControls
        hasSelection={true}
        pathStyle={firstElementStyle}
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