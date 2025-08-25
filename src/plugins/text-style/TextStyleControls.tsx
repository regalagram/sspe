import React, { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { PluginButton } from '../../components/PluginButton';
import { Type, Palette, Circle } from 'lucide-react';
import { TextElementType, GradientOrPattern, LinearGradient, RadialGradient, Pattern } from '../../types';
import { getStyleValue, extractGradientsFromPaths } from '../../utils/gradient-utils';
import { parseColorWithOpacity } from '../../utils/color-utils';

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

  // Use only gradients extracted from existing paths
  const allAvailableGradients = gradients;

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
  
  // Typography properties
  const commonFontSize = getCommonValue(text => text.style?.fontSize);
  const commonLetterSpacing = getCommonValue(text => text.style?.letterSpacing);
  const commonWordSpacing = getCommonValue(text => text.style?.wordSpacing);
  const commonLineHeight = getCommonValue(text => text.style?.lineHeight);
  const commonTextAnchor = getCommonValue(text => text.style?.textAnchor);
  const commonDominantBaseline = getCommonValue(text => text.style?.dominantBaseline);
  const commonFontWeight = getCommonValue(text => text.style?.fontWeight);
  const commonFontStyle = getCommonValue(text => text.style?.fontStyle);
  const commonTextDecoration = getCommonValue(text => text.style?.textDecoration);
  const commonFontVariant = getCommonValue(text => text.style?.fontVariant);
  const commonFontStretch = getCommonValue(text => text.style?.fontStretch);
  const commonDirection = getCommonValue(text => text.style?.direction);
  const commonWritingMode = getCommonValue(text => text.style?.writingMode);
  const commonTextRendering = getCommonValue(text => text.style?.textRendering);
  const commonOpacity = getCommonValue(text => text.style?.opacity);
  const commonStrokeDasharray = getCommonValue(text => text.style?.strokeDasharray);
  const commonStrokeDashoffset = getCommonValue(text => text.style?.strokeDashoffset);
  const commonStrokeLinecap = getCommonValue(text => text.style?.strokeLinecap);
  const commonStrokeLinejoin = getCommonValue(text => text.style?.strokeLinejoin);

  const handleColorChange = (property: 'fill' | 'stroke', value: string | GradientOrPattern) => {
    onApplyStyle({ [property]: value });
  };

  const handleNumberChange = (property: string, value: number) => {
    onApplyStyle({ [property]: value });
  };

  const handleSelectChange = (property: string, value: string) => {
    onApplyStyle({ [property]: value });
  };

  // Analyze fill opacity state
  const getFillOpacityState = () => {
    const hasExplicitOpacity = commonFillOpacity !== undefined;
    let hasEmbeddedOpacity = false;
    let embeddedOpacity = 1;
    
    if (typeof commonFill === 'string') {
      const parsed = parseColorWithOpacity(commonFill);
      if (parsed.opacity !== undefined) {
        hasEmbeddedOpacity = true;
        embeddedOpacity = parsed.opacity;
      }
    }
    
    return {
      hasExplicitOpacity,
      hasEmbeddedOpacity,
      explicitOpacity: commonFillOpacity || 1,
      embeddedOpacity,
      effectiveOpacity: hasEmbeddedOpacity ? embeddedOpacity : (commonFillOpacity || 1)
    };
  };

  // Analyze stroke opacity state
  const getStrokeOpacityState = () => {
    const hasExplicitOpacity = commonStrokeOpacity !== undefined;
    let hasEmbeddedOpacity = false;
    let embeddedOpacity = 1;
    
    if (typeof commonStroke === 'string') {
      const parsed = parseColorWithOpacity(commonStroke);
      if (parsed.opacity !== undefined) {
        hasEmbeddedOpacity = true;
        embeddedOpacity = parsed.opacity;
      }
    }
    
    return {
      hasExplicitOpacity,
      hasEmbeddedOpacity,
      explicitOpacity: commonStrokeOpacity || 1,
      embeddedOpacity,
      effectiveOpacity: hasEmbeddedOpacity ? embeddedOpacity : (commonStrokeOpacity || 1)
    };
  };

  // Apply explicit fill opacity changes
  const applyExplicitFillOpacity = (newOpacity: number) => {
    const clampedOpacity = Math.max(0, Math.min(1, newOpacity));
    onApplyStyle({ fillOpacity: clampedOpacity });
  };

  // Apply embedded fill opacity changes (RGBA/HSLA)
  const applyEmbeddedFillOpacity = (newOpacity: number) => {
    const clampedOpacity = Math.max(0, Math.min(1, newOpacity));
    
    if (typeof commonFill === 'string') {
      // Check if it's RGBA format
      const rgbaMatch = commonFill.match(/rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)/);
      if (rgbaMatch) {
        const r = rgbaMatch[1];
        const g = rgbaMatch[2];
        const b = rgbaMatch[3];
        onApplyStyle({ fill: `rgba(${r},${g},${b},${clampedOpacity})` });
        return;
      }

      // Check if it's HSLA format
      const hslaMatch = commonFill.match(/hsla\s*\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*,\s*([0-9.]+)\s*\)/);
      if (hslaMatch) {
        const h = hslaMatch[1];
        const s = hslaMatch[2];
        const l = hslaMatch[3];
        onApplyStyle({ fill: `hsla(${h},${s}%,${l}%,${clampedOpacity})` });
        return;
      }
    }
  };

  // Apply explicit stroke opacity changes
  const applyExplicitStrokeOpacity = (newOpacity: number) => {
    const clampedOpacity = Math.max(0, Math.min(1, newOpacity));
    onApplyStyle({ strokeOpacity: clampedOpacity });
  };

  // Apply embedded stroke opacity changes (RGBA/HSLA)
  const applyEmbeddedStrokeOpacity = (newOpacity: number) => {
    const clampedOpacity = Math.max(0, Math.min(1, newOpacity));
    
    if (typeof commonStroke === 'string') {
      // Check if it's RGBA format
      const rgbaMatch = commonStroke.match(/rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)/);
      if (rgbaMatch) {
        const r = rgbaMatch[1];
        const g = rgbaMatch[2];
        const b = rgbaMatch[3];
        onApplyStyle({ stroke: `rgba(${r},${g},${b},${clampedOpacity})` });
        return;
      }

      // Check if it's HSLA format
      const hslaMatch = commonStroke.match(/hsla\s*\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*,\s*([0-9.]+)\s*\)/);
      if (hslaMatch) {
        const h = hslaMatch[1];
        const s = hslaMatch[2];
        const l = hslaMatch[3];
        onApplyStyle({ stroke: `hsla(${h},${s}%,${l}%,${clampedOpacity})` });
        return;
      }
    }
  };

  if (selectedTexts.length === 0) {
    return (
      <div style={{ padding: '12px', textAlign: 'center', color: '#666' }}>
        Select text elements to edit style
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px'}}>
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
          Fill Opacity:
        </label>
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
                    onChange={(e) => applyEmbeddedFillOpacity(parseFloat(e.target.value))}
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
                    onChange={(e) => applyExplicitFillOpacity(parseFloat(e.target.value))}
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
                  onChange={(e) => applyEmbeddedFillOpacity(parseFloat(e.target.value))}
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
                  onChange={(e) => applyExplicitFillOpacity(parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
            );
          }
        })()}
      </div>

      {/* Typography Controls */}
      <div style={{ 
        borderTop: '1px solid #eee',
        paddingTop: '12px',
        marginTop: '8px'
      }}>
        <div style={{ 
          fontSize: '13px', 
          fontWeight: 'bold', 
          color: '#333',
          marginBottom: '12px'
        }}>
          Typography
        </div>

        {/* Font Size */}
        <div>
          <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>
            Font Size: {(commonFontSize ?? 16).toFixed(0)}px
          </label>
          <input
            type="range"
            min="8"
            max="72"
            step="1"
            value={commonFontSize ?? 16}
            onChange={(e) => handleNumberChange('fontSize', parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        {/* Letter Spacing */}
        <div>
          <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>
            Letter Spacing: {(commonLetterSpacing ?? 0).toFixed(1)}px
          </label>
          <input
            type="range"
            min="-2"
            max="5"
            step="0.1"
            value={commonLetterSpacing ?? 0}
            onChange={(e) => handleNumberChange('letterSpacing', parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        {/* Word Spacing */}
        <div>
          <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>
            Word Spacing: {(commonWordSpacing ?? 0).toFixed(1)}px
          </label>
          <input
            type="range"
            min="-5"
            max="10"
            step="0.1"
            value={commonWordSpacing ?? 0}
            onChange={(e) => handleNumberChange('wordSpacing', parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        {/* Line Height */}
        <div>
          <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>
            Line Height: {(commonLineHeight ?? 1.2).toFixed(1)}
          </label>
          <input
            type="range"
            min="0.8"
            max="3"
            step="0.1"
            value={commonLineHeight ?? 1.2}
            onChange={(e) => handleNumberChange('lineHeight', parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        {/* Font Weight */}
        <div>
          <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>
            Font Weight
          </label>
          <select
            value={commonFontWeight ?? 'normal'}
            onChange={(e) => handleSelectChange('fontWeight', e.target.value)}
            style={{
              width: '100%',
              padding: '4px 8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          >
            <option value="100">Thin (100)</option>
            <option value="200">Extra Light (200)</option>
            <option value="300">Light (300)</option>
            <option value="400">Normal (400)</option>
            <option value="500">Medium (500)</option>
            <option value="600">Semi Bold (600)</option>
            <option value="700">Bold (700)</option>
            <option value="800">Extra Bold (800)</option>
            <option value="900">Black (900)</option>
            <option value="normal">Normal</option>
            <option value="bold">Bold</option>
          </select>
        </div>

        {/* Font Style */}
        <div>
          <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>
            Font Style
          </label>
          <select
            value={commonFontStyle ?? 'normal'}
            onChange={(e) => handleSelectChange('fontStyle', e.target.value)}
            style={{
              width: '100%',
              padding: '4px 8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          >
            <option value="normal">Normal</option>
            <option value="italic">Italic</option>
            <option value="oblique">Oblique</option>
          </select>
        </div>

        {/* Text Decoration */}
        <div>
          <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>
            Text Decoration
          </label>
          <select
            value={commonTextDecoration ?? 'none'}
            onChange={(e) => handleSelectChange('textDecoration', e.target.value)}
            style={{
              width: '100%',
              padding: '4px 8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          >
            <option value="none">None</option>
            <option value="underline">Underline</option>
            <option value="overline">Overline</option>
            <option value="line-through">Line Through</option>
          </select>
        </div>

        {/* Text Anchor */}
        <div>
          <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>
            Text Anchor (Horizontal Alignment)
          </label>
          <select
            value={commonTextAnchor ?? 'start'}
            onChange={(e) => handleSelectChange('textAnchor', e.target.value)}
            style={{
              width: '100%',
              padding: '4px 8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          >
            <option value="start">Start</option>
            <option value="middle">Middle</option>
            <option value="end">End</option>
          </select>
        </div>

        {/* Dominant Baseline */}
        <div>
          <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>
            Dominant Baseline (Vertical Alignment)
          </label>
          <select
            value={commonDominantBaseline ?? 'auto'}
            onChange={(e) => handleSelectChange('dominantBaseline', e.target.value)}
            style={{
              width: '100%',
              padding: '4px 8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          >
            <option value="auto">Auto</option>
            <option value="text-bottom">Text Bottom</option>
            <option value="alphabetic">Alphabetic</option>
            <option value="ideographic">Ideographic</option>
            <option value="middle">Middle</option>
            <option value="central">Central</option>
            <option value="mathematical">Mathematical</option>
            <option value="hanging">Hanging</option>
            <option value="text-top">Text Top</option>
          </select>
        </div>

        {/* Additional Typography Properties */}
        <div style={{ marginTop: '12px' }}>
          {/* Font Variant */}
          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>
              Font Variant
            </label>
            <select
              value={commonFontVariant ?? 'normal'}
              onChange={(e) => handleSelectChange('fontVariant', e.target.value)}
              style={{
                width: '100%',
                padding: '4px 8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            >
              <option value="normal">Normal</option>
              <option value="small-caps">Small Caps</option>
            </select>
          </div>

          {/* Font Stretch */}
          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>
              Font Stretch
            </label>
            <select
              value={commonFontStretch ?? 'normal'}
              onChange={(e) => handleSelectChange('fontStretch', e.target.value)}
              style={{
                width: '100%',
                padding: '4px 8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            >
              <option value="ultra-condensed">Ultra Condensed</option>
              <option value="extra-condensed">Extra Condensed</option>
              <option value="condensed">Condensed</option>
              <option value="semi-condensed">Semi Condensed</option>
              <option value="normal">Normal</option>
              <option value="semi-expanded">Semi Expanded</option>
              <option value="expanded">Expanded</option>
              <option value="extra-expanded">Extra Expanded</option>
              <option value="ultra-expanded">Ultra Expanded</option>
            </select>
          </div>

          {/* Direction */}
          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>
              Text Direction
            </label>
            <select
              value={commonDirection ?? 'ltr'}
              onChange={(e) => handleSelectChange('direction', e.target.value)}
              style={{
                width: '100%',
                padding: '4px 8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            >
              <option value="ltr">Left to Right (LTR)</option>
              <option value="rtl">Right to Left (RTL)</option>
            </select>
          </div>

          {/* Writing Mode */}
          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>
              Writing Mode
            </label>
            <select
              value={commonWritingMode ?? 'lr-tb'}
              onChange={(e) => handleSelectChange('writingMode', e.target.value)}
              style={{
                width: '100%',
                padding: '4px 8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            >
              <option value="lr-tb">Horizontal (lr-tb)</option>
              <option value="rl-tb">Horizontal RTL (rl-tb)</option>
              <option value="tb-rl">Vertical (tb-rl)</option>
              <option value="lr">Horizontal Legacy (lr)</option>
              <option value="rl">Horizontal RTL Legacy (rl)</option>
              <option value="tb">Vertical Legacy (tb)</option>
            </select>
          </div>

          {/* Text Rendering */}
          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>
              Text Rendering
            </label>
            <select
              value={commonTextRendering ?? 'auto'}
              onChange={(e) => handleSelectChange('textRendering', e.target.value)}
              style={{
                width: '100%',
                padding: '4px 8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            >
              <option value="auto">Auto</option>
              <option value="optimizeSpeed">Optimize Speed</option>
              <option value="optimizeLegibility">Optimize Legibility</option>
              <option value="geometricPrecision">Geometric Precision</option>
            </select>
          </div>

          {/* Opacity */}
          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>
              Text Opacity: {((commonOpacity ?? 1) * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={commonOpacity ?? 1}
              onChange={(e) => handleNumberChange('opacity', parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </div>
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
              Stroke Opacity:
            </label>
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
                        onChange={(e) => applyEmbeddedStrokeOpacity(parseFloat(e.target.value))}
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
                        onChange={(e) => applyExplicitStrokeOpacity(parseFloat(e.target.value))}
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
                      onChange={(e) => applyEmbeddedStrokeOpacity(parseFloat(e.target.value))}
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
                      onChange={(e) => applyExplicitStrokeOpacity(parseFloat(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>
                );
              }
            })()}
          </div>

          {/* Stroke Dasharray */}
          <div>
            <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>
              Stroke Dash Pattern
            </label>
            <select
              value={Array.isArray(commonStrokeDasharray) ? commonStrokeDasharray.join(',') : commonStrokeDasharray ?? 'none'}
              onChange={(e) => {
                const value = e.target.value;
                if (value === 'none') {
                  handleSelectChange('strokeDasharray', 'none');
                } else {
                  const dashArray = value.split(',').map(v => parseFloat(v.trim()));
                  onApplyStyle({ strokeDasharray: dashArray });
                }
              }}
              style={{
                width: '100%',
                padding: '4px 8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            >
              <option value="none">None (Solid)</option>
              <option value="5,5">Short Dash (5,5)</option>
              <option value="10,5">Medium Dash (10,5)</option>
              <option value="15,5">Long Dash (15,5)</option>
              <option value="5,5,1,5">Dash Dot (5,5,1,5)</option>
              <option value="10,5,1,5">Dash Dot Long (10,5,1,5)</option>
              <option value="1,3">Dotted (1,3)</option>
            </select>
          </div>

          {/* Stroke Dashoffset */}
          <div>
            <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>
              Stroke Dash Offset: {(commonStrokeDashoffset ?? 0).toFixed(1)}px
            </label>
            <input
              type="range"
              min="0"
              max="20"
              step="0.5"
              value={commonStrokeDashoffset ?? 0}
              onChange={(e) => handleNumberChange('strokeDashoffset', parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          {/* Stroke Linecap */}
          <div>
            <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>
              Stroke Line Cap
            </label>
            <select
              value={commonStrokeLinecap ?? 'butt'}
              onChange={(e) => handleSelectChange('strokeLinecap', e.target.value)}
              style={{
                width: '100%',
                padding: '4px 8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            >
              <option value="butt">Butt</option>
              <option value="round">Round</option>
              <option value="square">Square</option>
            </select>
          </div>

          {/* Stroke Linejoin */}
          <div>
            <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>
              Stroke Line Join
            </label>
            <select
              value={commonStrokeLinejoin ?? 'miter'}
              onChange={(e) => handleSelectChange('strokeLinejoin', e.target.value)}
              style={{
                width: '100%',
                padding: '4px 8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            >
              <option value="miter">Miter</option>
              <option value="round">Round</option>
              <option value="bevel">Bevel</option>
            </select>
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