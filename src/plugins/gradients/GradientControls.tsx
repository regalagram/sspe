import React, { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { LinearGradient, RadialGradient, Pattern, GradientOrPattern, SVGPath } from '../../types';
import { createLinearGradient, createRadialGradient, createPattern, createGradientStop, isGradientOrPattern } from '../../utils/gradient-utils';
import { GradientStopEditor } from '../../components/GradientStopEditor';
import { PatternPresetSelector } from '../../components/PatternPresetSelector';
import { PluginButton } from '../../components/PluginButton';
import { Paintbrush, CircleDot, Grid3X3, Plus, Trash2, Palette } from 'lucide-react';

export const GradientControls: React.FC = () => {
  const { paths, selection, updatePathStyle } = useEditorStore();
  const [gradientType, setGradientType] = useState<'linear' | 'radial' | 'pattern'>('linear');
  const [applyTo, setApplyTo] = useState<'fill' | 'stroke'>('fill');
  const [patternMode, setPatternMode] = useState<'manual' | 'presets'>('presets');

  // Find all paths that contain selected sub-paths or are selected
  const getPathsWithSelectedSubPaths = () => {
    const pathsWithSubPaths = new Map<string, SVGPath>();
    
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
    } else if (selection.selectedPaths.length > 0) {
      for (const pathId of selection.selectedPaths) {
        const path = paths.find(p => p.id === pathId);
        if (path) {
          pathsWithSubPaths.set(path.id, path);
        }
      }
    } else if (selection.selectedCommands.length > 0) {
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

  if (selectedPaths.length === 0) {
    return (
      <div style={{ padding: '12px', textAlign: 'center', color: '#666', fontSize: '12px' }}>
        Select a path to apply gradients or patterns
      </div>
    );
  }

  // Get current style value for the selected property
  const getCurrentStyleValue = () => {
    if (selectedPaths.length === 0) return null;
    const firstPath = selectedPaths[0];
    const value = firstPath.style[applyTo];
    return isGradientOrPattern(value) ? value : null;
  };

  const currentGradient = getCurrentStyleValue();

  const createNewGradient = () => {
    let newGradient: GradientOrPattern;
    
    switch (gradientType) {
      case 'linear':
        newGradient = createLinearGradient(0, 0, 1, 0, [
          createGradientStop(0, '#000000'),
          createGradientStop(1, '#ffffff')
        ]);
        break;
      case 'radial':
        newGradient = createRadialGradient(0.5, 0.5, 0.5, [
          createGradientStop(0, '#000000'),
          createGradientStop(1, '#ffffff')
        ]);
        break;
      case 'pattern':
        newGradient = createPattern(20, 20, 
          '<rect width="10" height="10" fill="#000" /><rect x="10" y="10" width="10" height="10" fill="#000" />'
        );
        break;
    }

    selectedPaths.forEach(path => {
      updatePathStyle(path.id, { [applyTo]: newGradient });
    });
  };

  const removeGradient = () => {
    selectedPaths.forEach(path => {
      updatePathStyle(path.id, { [applyTo]: applyTo === 'fill' ? 'none' : 'none' });
    });
  };

  const updateGradientStops = (stops: any[]) => {
    if (!currentGradient || currentGradient.type === 'pattern') return;
    
    const updatedGradient = { ...currentGradient, stops };
    selectedPaths.forEach(path => {
      updatePathStyle(path.id, { [applyTo]: updatedGradient });
    });
  };

  const updateLinearGradient = (updates: Partial<LinearGradient>) => {
    if (!currentGradient || currentGradient.type !== 'linear') return;
    
    const updatedGradient = { ...currentGradient, ...updates };
    selectedPaths.forEach(path => {
      updatePathStyle(path.id, { [applyTo]: updatedGradient });
    });
  };

  const updateRadialGradient = (updates: Partial<RadialGradient>) => {
    if (!currentGradient || currentGradient.type !== 'radial') return;
    
    const updatedGradient = { ...currentGradient, ...updates };
    selectedPaths.forEach(path => {
      updatePathStyle(path.id, { [applyTo]: updatedGradient });
    });
  };

  const updatePattern = (updates: Partial<Pattern>) => {
    if (!currentGradient || currentGradient.type !== 'pattern') return;
    
    const updatedGradient = { ...currentGradient, ...updates };
    selectedPaths.forEach(path => {
      updatePathStyle(path.id, { [applyTo]: updatedGradient });
    });
  };

  const applyPatternPreset = (pattern: Pattern) => {
    selectedPaths.forEach(path => {
      updatePathStyle(path.id, { [applyTo]: pattern });
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px' }}>
      {/* Apply To Selection */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
          Apply To:
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <PluginButton
            icon={<Paintbrush size={12} />}
            text="Fill"
            color="#007bff"
            active={applyTo === 'fill'}
            onPointerDown={() => setApplyTo('fill')}
          />
          <PluginButton
            icon={<Paintbrush size={12} />}
            text="Stroke"
            color="#007bff"
            active={applyTo === 'stroke'}
            onPointerDown={() => setApplyTo('stroke')}
          />
        </div>
      </div>

      {/* Gradient Type Selection */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
          Type:
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <PluginButton
            icon=""
            text="Linear"
            color="#28a745"
            active={gradientType === 'linear'}
            onPointerDown={() => setGradientType('linear')}
          />
          <PluginButton
            icon={<CircleDot size={12} />}
            text="Radial"
            color="#28a745"
            active={gradientType === 'radial'}
            onPointerDown={() => setGradientType('radial')}
          />
          <PluginButton
            icon={<Grid3X3 size={12} />}
            text="Pattern"
            color="#28a745"
            active={gradientType === 'pattern'}
            onPointerDown={() => setGradientType('pattern')}
          />
        </div>
      </div>

      {/* Create/Remove Buttons */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <PluginButton
          icon={<Plus size={12} />}
          text={currentGradient ? 'Update' : 'Create'}
          color="#17a2b8"
          onPointerDown={createNewGradient}
        />
        {currentGradient && (
          <PluginButton
            icon={<Trash2 size={12} />}
            text="Remove"
            color="#dc3545"
            onPointerDown={removeGradient}
          />
        )}
      </div>

      {/* Pattern Presets - Show when pattern type is selected but no current pattern */}
      {!currentGradient && gradientType === 'pattern' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
            Pattern Presets:
          </span>
          <PatternPresetSelector
            onPatternSelect={applyPatternPreset}
            disabled={selectedPaths.length === 0}
          />
        </div>
      )}

      {/* Current gradient info */}
      {currentGradient && (
        <div style={{ 
          padding: '8px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '4px',
          fontSize: '11px',
          color: '#666'
        }}>
          Current: {currentGradient.type} {currentGradient.type !== 'pattern' ? `(${currentGradient.stops.length} stops)` : ''}
        </div>
      )}

      {/* Gradient Controls */}
      {currentGradient && currentGradient.type === 'linear' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
            Linear Gradient:
          </span>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <div>
              <label style={{ fontSize: '10px', color: '#666' }}>X1:</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={currentGradient.x1}
                onChange={(e) => updateLinearGradient({ x1: Number(e.target.value) })}
                style={{ width: '100%', padding: '2px', fontSize: '11px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: '#666' }}>Y1:</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={currentGradient.y1}
                onChange={(e) => updateLinearGradient({ y1: Number(e.target.value) })}
                style={{ width: '100%', padding: '2px', fontSize: '11px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: '#666' }}>X2:</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={currentGradient.x2}
                onChange={(e) => updateLinearGradient({ x2: Number(e.target.value) })}
                style={{ width: '100%', padding: '2px', fontSize: '11px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: '#666' }}>Y2:</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={currentGradient.y2}
                onChange={(e) => updateLinearGradient({ y2: Number(e.target.value) })}
                style={{ width: '100%', padding: '2px', fontSize: '11px' }}
              />
            </div>
          </div>

          <GradientStopEditor
            stops={currentGradient.stops}
            onStopsChange={updateGradientStops}
          />
        </div>
      )}

      {currentGradient && currentGradient.type === 'radial' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
            Radial Gradient:
          </span>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
            <div>
              <label style={{ fontSize: '10px', color: '#666' }}>CX:</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={currentGradient.cx}
                onChange={(e) => updateRadialGradient({ cx: Number(e.target.value) })}
                style={{ width: '100%', padding: '2px', fontSize: '11px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: '#666' }}>CY:</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={currentGradient.cy}
                onChange={(e) => updateRadialGradient({ cy: Number(e.target.value) })}
                style={{ width: '100%', padding: '2px', fontSize: '11px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: '#666' }}>Radius:</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={currentGradient.r}
                onChange={(e) => updateRadialGradient({ r: Number(e.target.value) })}
                style={{ width: '100%', padding: '2px', fontSize: '11px' }}
              />
            </div>
          </div>

          <GradientStopEditor
            stops={currentGradient.stops}
            onStopsChange={updateGradientStops}
          />
        </div>
      )}

      {currentGradient && currentGradient.type === 'pattern' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
              Pattern:
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <PluginButton
                icon={<Palette size={10} />}
                text="Presets"
                color="#6c757d"
                active={patternMode === 'presets'}
                onPointerDown={() => setPatternMode('presets')}
              />
              <PluginButton
                icon={<Grid3X3 size={10} />}
                text="Manual"
                color="#6c757d"
                active={patternMode === 'manual'}
                onPointerDown={() => setPatternMode('manual')}
              />
            </div>
          </div>
          
          {patternMode === 'presets' ? (
            <PatternPresetSelector
              onPatternSelect={applyPatternPreset}
              disabled={selectedPaths.length === 0}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <div>
                  <label style={{ fontSize: '10px', color: '#666' }}>Width:</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={currentGradient.width}
                    onChange={(e) => updatePattern({ width: Number(e.target.value) })}
                    style={{ width: '100%', padding: '2px', fontSize: '11px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: '#666' }}>Height:</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={currentGradient.height}
                    onChange={(e) => updatePattern({ height: Number(e.target.value) })}
                    style={{ width: '100%', padding: '2px', fontSize: '11px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '10px', color: '#666' }}>SVG Content:</label>
                <textarea
                  value={currentGradient.content}
                  onChange={(e) => updatePattern({ content: e.target.value })}
                  placeholder="Enter SVG content (e.g., <rect width='10' height='10' fill='red' />)"
                  style={{ 
                    width: '100%', 
                    minHeight: '60px', 
                    padding: '4px', 
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};