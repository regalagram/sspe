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
          textDecoration={text.style.textDecoration}
          textAnchor={text.style.textAnchor}
          dominantBaseline={text.style.dominantBaseline}
          fill={isWireframeMode ? 'none' : (text.style.fill ? getStyleValue(text.style.fill) : '#000000')}
          fillOpacity={isWireframeMode ? 0 : text.style.fillOpacity}
          stroke={isWireframeMode ? '#000000' : (text.style.stroke ? getStyleValue(text.style.stroke) : undefined)}
          strokeWidth={isWireframeMode ? (1 / viewport.zoom) : text.style.strokeWidth}
          strokeOpacity={isWireframeMode ? 1 : text.style.strokeOpacity}
          letterSpacing={text.style.letterSpacing}
          wordSpacing={text.style.wordSpacing}
          transform={text.transform}
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
          textDecoration={text.style.textDecoration}
          textAnchor={text.style.textAnchor}
          dominantBaseline={text.style.dominantBaseline}
          fill={isWireframeMode ? 'none' : (text.style.fill ? getStyleValue(text.style.fill) : '#000000')}
          fillOpacity={isWireframeMode ? 0 : text.style.fillOpacity}
          stroke={isWireframeMode ? '#000000' : (text.style.stroke ? getStyleValue(text.style.stroke) : undefined)}
          strokeWidth={isWireframeMode ? (1 / viewport.zoom) : text.style.strokeWidth}
          strokeOpacity={isWireframeMode ? 1 : text.style.strokeOpacity}
          letterSpacing={text.style.letterSpacing}
          wordSpacing={text.style.wordSpacing}
          transform={text.transform}
          style={{
            cursor: text.locked ? 'default' : 'grab',
            pointerEvents: text.locked ? 'none' : 'all',
            userSelect: 'none'
          }}
          data-element-type="multiline-text"
          data-element-id={text.id}
        >
          {text.spans.map((span, index) => (
            <tspan
              key={span.id}
              x={span.x}
              y={span.y}
              dx={span.dx}
              dy={span.dy}
              data-span-id={span.id}
            >
              {span.content}
            </tspan>
          ))}
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