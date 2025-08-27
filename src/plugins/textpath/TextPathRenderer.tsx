import React, { useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { SVGTextPath } from '../../types';
import { subPathToString } from '../../utils/path-utils';
import { useAnimationsForElement } from '../../components/AnimationRenderer';
import { useTextEditMode } from '../../hooks/useTextEditMode';
import { TextPathEditOverlay } from '../../components/TextPathEditOverlay';

// Individual TextPath component that handles its own hooks
const TextPathItem: React.FC<{ textPath: SVGTextPath }> = ({ textPath }) => {
  const { paths, selection, renderVersion, viewport } = useEditorStore();
  const { isTextBeingEdited, updateTextContent: updateTextContentLive, stopTextEdit } = useTextEditMode();
  
  // This hook is now called at the component level, not inside a render function
  const animations = useAnimationsForElement(textPath.id);
  
  // Check if this textpath is being edited
  const isBeingEdited = isTextBeingEdited(textPath.id);

  // Handle content changes during editing (memoized to prevent TextPathEditOverlay remount)
  const handleContentChange = useCallback((content: string) => {
    updateTextContentLive(content);
  }, [updateTextContentLive]);
  
  // Handle finishing editing (memoized to prevent TextPathEditOverlay remount)
  const handleFinishEditing = useCallback((save: boolean, finalContent?: string) => {
    // Pass final content directly to stopTextEdit
    stopTextEdit(save, finalContent);
  }, [stopTextEdit]);

  // Find the referenced path by path ID (not subPath ID)
  const referencedPath = paths.find(path => path.id === textPath.pathRef);

  if (!referencedPath) {
    // If referenced path doesn't exist, don't render
    console.warn(`TextPath ${textPath.id} references non-existent path: ${textPath.pathRef}`);
    return null;
  }

  // Generate the path data for the entire path (all subPaths)
  const pathData = referencedPath.subPaths.map(subPath => subPathToString(subPath)).join(' ');
  const pathId = `textpath-path-${textPath.id}`;

  // Determine selection state
  const isSelected = selection.selectedTextPaths.includes(textPath.id);

  // Style processing
  const style = textPath.style || {};
  const fontSize = style.fontSize || 16;
  const fontFamily = style.fontFamily || 'Arial, sans-serif';
  const fill = style.fill || '#000000';
  const textAnchor = style.textAnchor || 'start';

  // Convert style values to strings for SVG
  const convertStyleValue = (value: any): string => {
    if (!value || value === 'none') return 'none';
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value.id) {
      return `url(#${value.id})`;
    }
    return 'none';
  };

  const fillValue = convertStyleValue(fill);
  const strokeValue = convertStyleValue(style.stroke);

  // Build text attributes
  const textAttributes: Record<string, any> = {
    fontSize,
    fontFamily,
    textAnchor,
  };

  if (fillValue !== 'none') textAttributes.fill = fillValue;
  if (strokeValue !== 'none') textAttributes.stroke = strokeValue;
  if (style.strokeWidth) textAttributes.strokeWidth = style.strokeWidth;
  if (style.fillOpacity !== undefined) textAttributes.fillOpacity = style.fillOpacity;
  if (style.strokeOpacity !== undefined) textAttributes.strokeOpacity = style.strokeOpacity;
  if (style.fontWeight) textAttributes.fontWeight = style.fontWeight;
  if (style.fontStyle) textAttributes.fontStyle = style.fontStyle;
  if (style.fontVariant) textAttributes.fontVariant = style.fontVariant;
  if (style.fontStretch) textAttributes.fontStretch = style.fontStretch;
  if (style.textDecoration) textAttributes.textDecoration = style.textDecoration;
  if (style.dominantBaseline) textAttributes.dominantBaseline = style.dominantBaseline;
  if (style.alignmentBaseline) textAttributes.alignmentBaseline = style.alignmentBaseline;
  if (style.baselineShift) textAttributes.baselineShift = style.baselineShift;
  if (style.direction) textAttributes.direction = style.direction;
  if (style.writingMode) textAttributes.writingMode = style.writingMode;
  if (style.textRendering) textAttributes.textRendering = style.textRendering;
  if (style.letterSpacing) textAttributes.letterSpacing = style.letterSpacing;
  if (style.wordSpacing) textAttributes.wordSpacing = style.wordSpacing;
  if (style.textLength) textAttributes.textLength = style.textLength;
  if (style.lengthAdjust) textAttributes.lengthAdjust = style.lengthAdjust;
  if (style.opacity !== undefined) textAttributes.opacity = style.opacity;
  if (style.filter) textAttributes.filter = style.filter;
  if (style.clipPath) textAttributes.clipPath = style.clipPath;
  if (style.mask) textAttributes.mask = style.mask;
  if (Array.isArray(style.strokeDasharray)) {
    textAttributes.strokeDasharray = style.strokeDasharray.join(',');
  } else if (style.strokeDasharray) {
    textAttributes.strokeDasharray = style.strokeDasharray;
  }
  if (style.strokeDashoffset) textAttributes.strokeDashoffset = style.strokeDashoffset;
  if (style.strokeLinecap) textAttributes.strokeLinecap = style.strokeLinecap;
  if (style.strokeLinejoin) textAttributes.strokeLinejoin = style.strokeLinejoin;
  if (style.strokeMiterlimit) textAttributes.strokeMiterlimit = style.strokeMiterlimit;

  // Build textPath attributes
  const textPathAttributes: Record<string, any> = {
    href: `#${pathId}`
  };

  if (textPath.startOffset !== undefined) {
    textPathAttributes.startOffset = typeof textPath.startOffset === 'string' 
      ? textPath.startOffset 
      : `${textPath.startOffset}`;
  }
  if (textPath.method) textPathAttributes.method = textPath.method;
  if (textPath.spacing) textPathAttributes.spacing = textPath.spacing;
  if (textPath.side) textPathAttributes.side = textPath.side;
  if (textPath.textLength) textPathAttributes.textLength = textPath.textLength;
  if (textPath.lengthAdjust) textPathAttributes.lengthAdjust = textPath.lengthAdjust;

  let cursorValue = 'pointer';
  if (textPath.locked) {
    cursorValue = 'default';
  } else if (isBeingEdited) {
    cursorValue = 'text';
  }

  return (
    <g key={`textpath-${textPath.id}-v${renderVersion}`}>
      {/* Hidden path for text to follow */}
      <defs>
        <path id={pathId} d={pathData} />
      </defs>

      {/* Text following the path */}
      <text
        {...textAttributes}
        x={0}
        y={0}
        transform={textPath.transform}
        data-element-type="textPath"
        data-element-id={textPath.id}
        style={{
          pointerEvents: textPath.locked ? 'none' : 'all',
          cursor: cursorValue,
          userSelect: isBeingEdited ? 'text' : 'none',
          opacity: isBeingEdited ? 0 : 1, // Hide during editing to prevent duplication
          clipPath: style.clipPath,
          mask: style.mask,
          filter: style.filter
        }}
      >
        <textPath {...textPathAttributes}>
          {textPath.content}
        </textPath>
        {animations}
      </text>

      {/* Selection indicator */}
      {isSelected && !isBeingEdited && (
        <text
          {...textAttributes}
          x={0}
          y={0}
          transform={textPath.transform}
          style={{
            pointerEvents: 'none',
            userSelect: 'none'
          }}
        >
          <textPath {...textPathAttributes}>
            <tspan
              fill="none"
              stroke="#007bff"
              strokeWidth="3"
              strokeOpacity="0.5"
            >
              {textPath.content}
            </tspan>
          </textPath>
        </text>
      )}

      {/* TextPath Edit Overlay */}
      {isBeingEdited && (
        <TextPathEditOverlay
          textPath={textPath}
          viewport={viewport}
          onContentChange={handleContentChange}
          onFinishEditing={handleFinishEditing}
        />
      )}
    </g>
  );
};

export const TextPathRenderer: React.FC = () => {
  const { textPaths } = useEditorStore();

  // Don't render anything if there are no textPaths
  if (textPaths.length === 0) {
    return null;
  }

  return (
    <>
      {textPaths.map(textPath => (
        <TextPathItem key={textPath.id} textPath={textPath} />
      ))}
    </>
  );
};