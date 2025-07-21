import React from 'react';
import { useEditorStore } from '../../store/editorStore';
import { TextElementType, TextElement, MultilineTextElement } from '../../types';
import { getStyleValue } from '../../utils/gradient-utils';
import { getContrastColor } from '../../utils/path-utils';
import { calculateTextBoundsDOM } from '../../utils/text-utils';

export const TextRenderer: React.FC = () => {
  const { 
    texts, 
    selection, 
    viewport, 
    renderVersion,
    enabledFeatures
  } = useEditorStore();


  const renderTextElement = (text: TextElement) => {
    const isSelected = selection.selectedTexts.includes(text.id);
    const isWireframeMode = enabledFeatures.wireframeEnabled;
    
    return (
      <g key={`text-group-${text.id}`}>
        {/* Main text element */}
        <text
          x={text.x}
          y={text.y}
          fontFamily={text.style.fontFamily}
          fontSize={text.style.fontSize}
          fontWeight={text.style.fontWeight}
          fontStyle={text.style.fontStyle}
          fontVariant={text.style.fontVariant}
          fontStretch={text.style.fontStretch}
          textDecoration={text.style.textDecoration}
          textAnchor={text.style.textAnchor}
          dominantBaseline={text.style.dominantBaseline}
          alignmentBaseline={text.style.alignmentBaseline}
          baselineShift={text.style.baselineShift}
          direction={text.style.direction}
          writingMode={text.style.writingMode}
          textRendering={text.style.textRendering}
          fill={isWireframeMode ? 'none' : (text.style.fill ? getStyleValue(text.style.fill) : '#000000')}
          fillOpacity={isWireframeMode ? 0 : text.style.fillOpacity}
          stroke={isWireframeMode ? '#000000' : (text.style.stroke ? getStyleValue(text.style.stroke) : undefined)}
          strokeWidth={isWireframeMode ? (1 / viewport.zoom) : text.style.strokeWidth}
          strokeOpacity={isWireframeMode ? 1 : text.style.strokeOpacity}
          strokeDasharray={Array.isArray(text.style.strokeDasharray) 
            ? text.style.strokeDasharray.join(',') 
            : text.style.strokeDasharray}
          strokeDashoffset={text.style.strokeDashoffset}
          strokeLinecap={text.style.strokeLinecap}
          strokeLinejoin={text.style.strokeLinejoin}
          strokeMiterlimit={text.style.strokeMiterlimit}
          letterSpacing={text.style.letterSpacing}
          wordSpacing={text.style.wordSpacing}
          textLength={text.style.textLength}
          lengthAdjust={text.style.lengthAdjust}
          opacity={text.style.opacity}
          transform={text.transform}
          filter={text.style.filter}
          clipPath={text.style.clipPath}
          mask={text.style.mask}
          style={{
            cursor: text.locked ? 'default' : 'grab',
            pointerEvents: text.locked ? 'none' : 'all',
            userSelect: 'none'
          }}
          data-element-type="text"
          data-element-id={text.id}
        >
          {text.content}
        </text>

        {/* Selection indicator */}
        {isSelected && (
          <g key={`selected-text-${text.id}-v${renderVersion}`}>
            {/* Calculate consistent text bounds using DOM */}
            {(() => {
              const bounds = calculateTextBoundsDOM(text);
              if (!bounds) return null; // Skip if bounds calculation failed
              const margin = 4 / viewport.zoom;
              
              const primaryColor = typeof text.style.fill === 'string' ? text.style.fill : '#000000';
              const contrastColor = getContrastColor(primaryColor || '#000000');
              
              return (
                <>
                  {/* Background glow */}
                  <rect
                    x={bounds.x - margin}
                    y={bounds.y - margin}
                    width={bounds.width + margin * 2}
                    height={bounds.height + margin * 2}
                    fill="none"
                    stroke={contrastColor}
                    strokeWidth={3 / viewport.zoom}
                    strokeOpacity={0.3}
                    style={{
                      pointerEvents: 'none',
                      filter: `blur(${2 / viewport.zoom}px)`,
                    }}
                  />
                  {/* Main selection border */}
                  <rect
                    x={bounds.x - margin}
                    y={bounds.y - margin}
                    width={bounds.width + margin * 2}
                    height={bounds.height + margin * 2}
                    fill="none"
                    stroke={contrastColor}
                    strokeWidth={1.5 / viewport.zoom}
                    strokeDasharray={`${4 / viewport.zoom},${3 / viewport.zoom}`}
                    style={{
                      pointerEvents: 'all',
                      cursor: 'grab',
                      filter: `drop-shadow(0 0 ${2 / viewport.zoom}px ${contrastColor})`,
                    }}
                    data-element-type="text"
                    data-element-id={text.id}
                  />
                  
                </>
              );
            })()}
          </g>
        )}
      </g>
    );
  };

  const renderMultilineTextElement = (text: MultilineTextElement) => {
    const isSelected = selection.selectedTexts.includes(text.id);
    const isWireframeMode = enabledFeatures.wireframeEnabled;
    
    return (
      <g key={`multiline-text-group-${text.id}`}>
        {/* Main multiline text element */}
        <text
          x={text.x}
          y={text.y}
          fontFamily={text.style.fontFamily}
          fontSize={text.style.fontSize}
          fontWeight={text.style.fontWeight}
          fontStyle={text.style.fontStyle}
          fontVariant={text.style.fontVariant}
          fontStretch={text.style.fontStretch}
          textDecoration={text.style.textDecoration}
          textAnchor={text.style.textAnchor}
          dominantBaseline={text.style.dominantBaseline}
          alignmentBaseline={text.style.alignmentBaseline}
          baselineShift={text.style.baselineShift}
          direction={text.style.direction}
          writingMode={text.style.writingMode}
          textRendering={text.style.textRendering}
          fill={isWireframeMode ? 'none' : (text.style.fill ? getStyleValue(text.style.fill) : '#000000')}
          fillOpacity={isWireframeMode ? 0 : text.style.fillOpacity}
          stroke={isWireframeMode ? '#000000' : (text.style.stroke ? getStyleValue(text.style.stroke) : undefined)}
          strokeWidth={isWireframeMode ? (1 / viewport.zoom) : text.style.strokeWidth}
          strokeOpacity={isWireframeMode ? 1 : text.style.strokeOpacity}
          strokeDasharray={Array.isArray(text.style.strokeDasharray) 
            ? text.style.strokeDasharray.join(',') 
            : text.style.strokeDasharray}
          strokeDashoffset={text.style.strokeDashoffset}
          strokeLinecap={text.style.strokeLinecap}
          strokeLinejoin={text.style.strokeLinejoin}
          strokeMiterlimit={text.style.strokeMiterlimit}
          letterSpacing={text.style.letterSpacing}
          wordSpacing={text.style.wordSpacing}
          textLength={text.style.textLength}
          lengthAdjust={text.style.lengthAdjust}
          opacity={text.style.opacity}
          transform={text.transform}
          style={{
            cursor: text.locked ? 'default' : 'grab',
            pointerEvents: text.locked ? 'none' : 'all',
            userSelect: 'none'
          }}
          data-element-type="multiline-text"
          data-element-id={text.id}
        >
          {text.spans.map((span, index, spans) => {
            // Calculate the actual line number for dy (count non-empty spans before this one)
            const lineNumber = spans.slice(0, index).filter(s => s.content && s.content.trim()).length;
            
            // Don't render empty spans
            if (!span.content || !span.content.trim()) return null;
            
            return (
              <tspan
                key={span.id}
                x={text.x}
                dy={lineNumber === 0 ? 0 : (text.style?.fontSize || 16) * (text.style?.lineHeight || 1.2)}
                data-span-id={span.id}
              >
                {span.content}
              </tspan>
            );
          })}
        </text>

        {/* Selection indicator for multiline text */}
        {isSelected && (
          <g key={`selected-multiline-text-${text.id}-v${renderVersion}`}>
            {/* Consistent bounding box for multiline text using DOM */}
            {(() => {
              const bounds = calculateTextBoundsDOM(text);
              if (!bounds) return null; // Skip if bounds calculation failed
              const margin = 4 / viewport.zoom;
              
              const primaryColor = typeof text.style.fill === 'string' ? text.style.fill : '#000000';
              const contrastColor = getContrastColor(primaryColor || '#000000');
              
              return (
                <rect
                  x={bounds.x - margin}
                  y={bounds.y - margin}
                  width={bounds.width + margin * 2}
                  height={bounds.height + margin * 2}
                  fill="none"
                  stroke={contrastColor}
                  strokeWidth={1.5 / viewport.zoom}
                  strokeDasharray={`${4 / viewport.zoom},${3 / viewport.zoom}`}
                  style={{
                    pointerEvents: 'all',
                    cursor: 'grab',
                  }}
                  data-element-type="multiline-text"
                  data-element-id={text.id}
                />
              );
            })()}
          </g>
        )}
      </g>
    );
  };

  return (
    <>
      {texts.map((text) => {
        if (text.type === 'text') {
          return renderTextElement(text);
        } else if (text.type === 'multiline-text') {
          return renderMultilineTextElement(text);
        }
        return null;
      })}
    </>
  );
};