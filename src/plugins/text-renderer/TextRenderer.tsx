import React, { useRef, useState, useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { TextElementType, TextElement, MultilineTextElement, Point } from '../../types';
import { getStyleValue } from '../../utils/gradient-utils';
import { getContrastColor } from '../../utils/path-utils';
import { getSVGPoint } from '../../utils/transform-utils';
import { calculateTextBoundsDOM } from '../../utils/text-utils';

export const TextRenderer: React.FC = () => {
  const { 
    texts, 
    selection, 
    viewport, 
    selectText, 
    selectTextMultiple,
    moveText,
    renderVersion,
    enabledFeatures
  } = useEditorStore();

  // Drag state for text elements
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    textId: string | null;
    startPoint: Point | null;
    lastPoint: Point | null;
    svgElement: SVGSVGElement | null;
    dragStarted: boolean;
  }>({
    isDragging: false,
    textId: null,
    startPoint: null,
    lastPoint: null,
    svgElement: null,
    dragStarted: false,
  });

  const getTransformedPoint = (e: React.PointerEvent<SVGElement>, svgElement: SVGSVGElement) => {
    const svgRef = { current: svgElement };
    return getSVGPoint(e, svgRef, viewport);
  };

  const handleTextPointerDown = useCallback((e: React.PointerEvent<SVGElement>, textId: string) => {
    e.stopPropagation();
    
    const svgElement = (e.target as SVGTextElement).closest('svg');
    if (svgElement) {
      // Ensure the text being dragged is selected
      if (!selection.selectedTexts.includes(textId)) {
        selectTextMultiple(textId, e.shiftKey);
      }
      
      const point = getTransformedPoint(e, svgElement);
      setDragState({
        isDragging: true,
        textId,
        startPoint: point,
        lastPoint: point,
        svgElement: svgElement,
        dragStarted: false,
      });
    }
  }, [viewport, selection.selectedTexts, selectTextMultiple]);

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGElement>) => {
    if (!dragState.isDragging || !dragState.textId || !dragState.startPoint || !dragState.svgElement) return;
    
    const currentPoint = getTransformedPoint(e, dragState.svgElement);
    
    // Check if we've moved enough to start actual dragging
    if (!dragState.dragStarted) {
      const distance = Math.sqrt(
        Math.pow(currentPoint.x - dragState.startPoint.x, 2) + 
        Math.pow(currentPoint.y - dragState.startPoint.y, 2)
      );
      
      const dragThreshold = 5;
      
      if (distance < dragThreshold) {
        return;
      }
      
      setDragState(prev => ({
        ...prev,
        dragStarted: true,
        lastPoint: currentPoint,
      }));
      
      return;
    }
    
    if (!dragState.lastPoint) return;
    
    const delta = {
      x: currentPoint.x - dragState.lastPoint.x,
      y: currentPoint.y - dragState.lastPoint.y,
    };
    
    // Move all selected texts
    const textsToMove = selection.selectedTexts.length > 0 
      ? selection.selectedTexts 
      : [dragState.textId];
    
    textsToMove.forEach(textId => {
      moveText(textId, delta);
    });
    
    setDragState(prev => ({
      ...prev,
      lastPoint: currentPoint,
    }));
  }, [dragState, moveText, selection.selectedTexts, viewport]);

  const handlePointerUp = useCallback(() => {
    setDragState({
      isDragging: false,
      textId: null,
      startPoint: null,
      lastPoint: null,
      svgElement: null,
      dragStarted: false,
    });
  }, []);

  // Global event listeners for dragging
  React.useEffect(() => {
    if (dragState.isDragging && dragState.svgElement) {
      const handleGlobalPointerMove = (e: PointerEvent) => {
        const mockEvent = {
          clientX: e.clientX,
          clientY: e.clientY,
          target: dragState.svgElement,
        } as any;
        handlePointerMove(mockEvent);
      };

      const handleGlobalPointerUp = () => {
        handlePointerUp();
      };

      document.addEventListener('pointermove', handleGlobalPointerMove);
      document.addEventListener('pointerup', handleGlobalPointerUp);

      return () => {
        document.removeEventListener('pointermove', handleGlobalPointerMove);
        document.removeEventListener('pointerup', handleGlobalPointerUp);
      };
    }
  }, [dragState.isDragging, dragState.svgElement, handlePointerMove, handlePointerUp]);

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
            pointerEvents: 'all',
            userSelect: 'none'
          }}
          onPointerDown={text.locked ? undefined : (e) => {
            if (e.button !== 0) return;
            e.stopPropagation();
            
            if (e.shiftKey) {
              // Use addToSelection for mixed selections
              const { addToSelection } = useEditorStore.getState();
              addToSelection(text.id, 'text');
            } else {
              handleTextPointerDown(e, text.id);
            }
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
                      cursor: dragState.isDragging && dragState.textId === text.id && dragState.dragStarted 
                        ? 'grabbing' 
                        : 'grab',
                      filter: `drop-shadow(0 0 ${2 / viewport.zoom}px ${contrastColor})`,
                    }}
                    onPointerDown={(e) => handleTextPointerDown(e, text.id)}
                  />
                  
                  {/* Multi-selection indicator */}
                  {dragState.isDragging && dragState.textId === text.id && selection.selectedTexts.length > 1 && (
                    <g transform={`translate(${bounds.x + bounds.width / 2}, ${bounds.y + bounds.height / 2})`}>
                      <circle
                        cx="0"
                        cy="0"
                        r={8 / viewport.zoom}
                        fill="rgba(33, 150, 243, 0.9)"
                        stroke="white"
                        strokeWidth={1 / viewport.zoom}
                      />
                      <text
                        x="0"
                        y={3 / viewport.zoom}
                        textAnchor="middle"
                        fill="white"
                        fontSize={10 / viewport.zoom}
                        fontWeight="bold"
                        style={{ pointerEvents: 'none' }}
                      >
                        {selection.selectedTexts.length}
                      </text>
                    </g>
                  )}
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
            pointerEvents: 'all',
            userSelect: 'none'
          }}
          onPointerDown={text.locked ? undefined : (e) => {
            if (e.button !== 0) return;
            e.stopPropagation();
            
            if (e.shiftKey) {
              // Use addToSelection for mixed selections
              const { addToSelection } = useEditorStore.getState();
              addToSelection(text.id, 'text');
            } else {
              handleTextPointerDown(e, text.id);
            }
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
                    cursor: dragState.isDragging && dragState.textId === text.id && dragState.dragStarted 
                      ? 'grabbing' 
                      : 'grab',
                  }}
                  onPointerDown={(e) => handleTextPointerDown(e, text.id)}
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