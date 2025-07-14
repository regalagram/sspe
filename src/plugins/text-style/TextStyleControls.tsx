import React, { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { PluginButton } from '../../components/PluginButton';
import { Type, Palette, Circle } from 'lucide-react';
import { TextElementType, GradientOrPattern, LinearGradient, RadialGradient, Pattern } from '../../types';
import { getStyleValue, extractGradientsFromPaths } from '../../utils/gradient-utils';

interface TextStyleControlsProps {
  onApplyStyle: (styleUpdates: any) => void;
  selectedTexts: TextElementType[];
}

export const TextStyleControls: React.FC<TextStyleControlsProps> = ({
  onApplyStyle,
  selectedTexts,
}) => {
  const { paths } = useEditorStore();
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Extract gradients and patterns from existing paths
  const allGradients = extractGradientsFromPaths(paths);
  const gradients = allGradients.filter(g => g.type === 'linear' || g.type === 'radial') as (LinearGradient | RadialGradient)[];
  const patterns = allGradients.filter(g => g.type === 'pattern') as Pattern[];

  // Common predefined gradients for quick access
  const predefinedGradients: (LinearGradient | RadialGradient)[] = [
    {
      id: 'text-gradient-1',
      type: 'linear',
      x1: 0, y1: 0, x2: 100, y2: 0,
      stops: [
        { id: 'stop-1', offset: 0, color: '#ff6b6b', opacity: 1 },
        { id: 'stop-2', offset: 1, color: '#4ecdc4', opacity: 1 }
      ]
    },
    {
      id: 'text-gradient-2',
      type: 'linear',
      x1: 0, y1: 0, x2: 100, y2: 100,
      stops: [
        { id: 'stop-3', offset: 0, color: '#667eea', opacity: 1 },
        { id: 'stop-4', offset: 1, color: '#764ba2', opacity: 1 }
      ]
    },
    {
      id: 'text-gradient-3',
      type: 'radial',
      cx: 50, cy: 50, r: 50,
      stops: [
        { id: 'stop-5', offset: 0, color: '#ffeaa7', opacity: 1 },
        { id: 'stop-6', offset: 1, color: '#fab1a0', opacity: 1 }
      ]
    }
  ];

  // Combine existing gradients with predefined ones
  const allAvailableGradients = [...gradients, ...predefinedGradients];

  // Get common style values from selected texts
  const getCommonValue = <T,>(getValue: (text: TextElementType) => T | undefined): T | undefined => {
    if (selectedTexts.length === 0) return undefined;
    const firstValue = getValue(selectedTexts[0]);
    const allSame = selectedTexts.every(text => getValue(text) === firstValue);
    return allSame ? firstValue : undefined;
  };

  const commonFill = getCommonValue(text => text.style?.fill);
  const commonStroke = getCommonValue(text => text.style?.stroke);
  const commonStrokeWidth = getCommonValue(text => text.style?.strokeWidth);
  const commonStrokeOpacity = getCommonValue(text => text.style?.strokeOpacity);
  const commonFillOpacity = getCommonValue(text => text.style?.fillOpacity);

  const handleColorChange = (property: 'fill' | 'stroke', value: string | GradientOrPattern) => {
    onApplyStyle({ [property]: value });
  };

  const handleNumberChange = (property: string, value: number) => {
    onApplyStyle({ [property]: value });
  };

  if (selectedTexts.length === 0) {
    return (
      <div style={{ padding: '12px', textAlign: 'center', color: '#666' }}>
        Select text elements to edit style
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '8px' }}>
      {/* Header */}
      <div style={{ 
        fontSize: '14px', 
        fontWeight: 'bold', 
        color: '#333',
        borderBottom: '1px solid #eee',
        paddingBottom: '8px'
      }}>
        Text Style ({selectedTexts.length} selected)
      </div>

      {/* Fill Color */}
      <div>
        <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>
          Fill Color
        </label>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {/* Solid colors */}
          {['#000000', '#333333', '#666666', '#999999', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'].map(color => (
            <button
              key={color}
              onClick={() => handleColorChange('fill', color)}
              style={{
                width: '24px',
                height: '24px',
                backgroundColor: color,
                border: commonFill === color ? '2px solid #007acc' : '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            />
          ))}
          
          {/* Gradients */}
          {allAvailableGradients.map((gradient: LinearGradient | RadialGradient) => (
            <button
              key={gradient.id}
              onClick={() => handleColorChange('fill', `url(#${gradient.id})`)}
              style={{
                width: '24px',
                height: '24px',
                background: gradient.type === 'linear' 
                  ? `linear-gradient(90deg, ${gradient.stops.map((s: any) => s.color).join(', ')})`
                  : `radial-gradient(${gradient.stops.map((s: any) => s.color).join(', ')})`,
                border: commonFill === `url(#${gradient.id})` ? '2px solid #007acc' : '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            />
          ))}

          {/* Patterns */}
          {patterns.map((pattern: Pattern) => (
            <button
              key={pattern.id}
              onClick={() => handleColorChange('fill', `url(#${pattern.id})`)}
              style={{
                width: '24px',
                height: '24px',
                backgroundColor: '#f0f0f0',
                border: commonFill === `url(#${pattern.id})` ? '2px solid #007acc' : '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              P
            </button>
          ))}

          {/* None option */}
          <button
            onClick={() => handleColorChange('fill', 'none')}
            style={{
              width: '24px',
              height: '24px',
              backgroundColor: 'transparent',
              border: commonFill === 'none' ? '2px solid #007acc' : '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666'
            }}
          >
            ∅
          </button>
        </div>
      </div>

      {/* Fill Opacity */}
      <div>
        <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>
          Fill Opacity: {((commonFillOpacity ?? 1) * 100).toFixed(0)}%
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={commonFillOpacity ?? 1}
          onChange={(e) => handleNumberChange('fillOpacity', parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {/* Advanced Controls Toggle */}
      <PluginButton
        icon={<Circle size={16} />}
        text={showAdvanced ? "Hide Stroke Controls" : "Show Stroke Controls"}
        color="#666"
        active={showAdvanced}
        disabled={false}
        onPointerDown={() => setShowAdvanced(!showAdvanced)}
      />

      {/* Advanced Stroke Controls */}
      {showAdvanced && (
        <>
          {/* Stroke Color */}
          <div>
            <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>
              Stroke Color
            </label>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {/* Solid colors */}
              {['#000000', '#333333', '#666666', '#999999', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'].map(color => (
                <button
                  key={color}
                  onClick={() => handleColorChange('stroke', color)}
                  style={{
                    width: '24px',
                    height: '24px',
                    backgroundColor: color,
                    border: commonStroke === color ? '2px solid #007acc' : '1px solid #ccc',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                />
              ))}
              
              {/* Gradients */}
              {allAvailableGradients.map((gradient: LinearGradient | RadialGradient) => (
                <button
                  key={gradient.id}
                  onClick={() => handleColorChange('stroke', `url(#${gradient.id})`)}
                  style={{
                    width: '24px',
                    height: '24px',
                    background: gradient.type === 'linear' 
                      ? `linear-gradient(90deg, ${gradient.stops.map((s: any) => s.color).join(', ')})`
                      : `radial-gradient(${gradient.stops.map((s: any) => s.color).join(', ')})`,
                    border: commonStroke === `url(#${gradient.id})` ? '2px solid #007acc' : '1px solid #ccc',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                />
              ))}

              {/* Patterns */}
              {patterns.map((pattern: Pattern) => (
                <button
                  key={pattern.id}
                  onClick={() => handleColorChange('stroke', `url(#${pattern.id})`)}
                  style={{
                    width: '24px',
                    height: '24px',
                    backgroundColor: '#f0f0f0',
                    border: commonStroke === `url(#${pattern.id})` ? '2px solid #007acc' : '1px solid #ccc',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  P
                </button>
              ))}

              {/* None option */}
              <button
                onClick={() => handleColorChange('stroke', 'none')}
                style={{
                  width: '24px',
                  height: '24px',
                  backgroundColor: 'transparent',
                  border: commonStroke === 'none' ? '2px solid #007acc' : '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#666'
                }}
              >
                ∅
              </button>
            </div>
          </div>

          {/* Stroke Width */}
          <div>
            <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>
              Stroke Width: {(commonStrokeWidth ?? 0).toFixed(1)}px
            </label>
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={commonStrokeWidth ?? 0}
              onChange={(e) => handleNumberChange('strokeWidth', parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          {/* Stroke Opacity */}
          <div>
            <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>
              Stroke Opacity: {((commonStrokeOpacity ?? 1) * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={commonStrokeOpacity ?? 1}
              onChange={(e) => handleNumberChange('strokeOpacity', parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </>
      )}
    </div>
  );
};

export const TextStyleControlsComponent: React.FC = () => {
  const { selection, texts, updateTextStyle } = useEditorStore();
  
  const selectedTexts = texts.filter(text => 
    selection.selectedTexts.includes(text.id)
  );

  const handleApplyStyle = (styleUpdates: any) => {
    selectedTexts.forEach(text => {
      updateTextStyle(text.id, styleUpdates);
    });
  };

  return (
    <TextStyleControls 
      onApplyStyle={handleApplyStyle}
      selectedTexts={selectedTexts}
    />
  );
};