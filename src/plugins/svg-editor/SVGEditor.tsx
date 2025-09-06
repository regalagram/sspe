import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { subPathToString } from '../../utils/path-utils';
import { parseCompleteSVG } from '../../utils/svg-parser';
import { SVGAnimation } from '../../types';
import { calculateViewBoxFromSVGString } from '../../utils/viewbox-utils';
import { PluginButton } from '../../components/PluginButton';
import { SVGDropZone } from '../../components/SVGDropZone';
import { SVGImportOptions, ImportSettings } from '../../components/SVGImportOptions';
import { RotateCcw, CheckCircle2, Trash2, Upload, Download } from 'lucide-react';
import { generateSVGCode as generateUnifiedSVG, downloadSVGFile } from '../../utils/svg-export';
import { getAllElementsByZIndex, initializeZIndexes } from '../../utils/z-index-manager';

// Utility function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

interface PrecisionControlProps {
  precision: number;
  onPrecisionChange: (precision: number) => void;
}

const PrecisionControl: React.FC<PrecisionControlProps> = ({ precision, onPrecisionChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    onPrecisionChange(val);
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '8px',
    marginTop: '8px'
  };

  const topRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px'
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    color: '#666',
    fontWeight: '500'
  };

  const valueStyle: React.CSSProperties = {
    fontSize: '11px',
    color: '#333',
    fontWeight: '600',
    minWidth: '20px',
    textAlign: 'center' as const
  };

  const sliderStyle: React.CSSProperties = {
    width: '100%',
    height: '4px',
    borderRadius: '2px',
    background: '#e0e0e0',
    outline: 'none',
    cursor: 'pointer'
  };

  return (
    <div style={containerStyle}>
      <div style={topRowStyle}>
        <label style={labelStyle}>
          Precision
        </label>
        <span style={valueStyle}>{precision}</span>
      </div>
      <input
        type="range"
        min={0}
        max={5}
        value={precision}
        onChange={handleChange}
        style={sliderStyle}
      />
    </div>
  );
};

interface SVGEditorProps {
  svgCode: string;
  onSVGChange: (svg: string) => void;
}

export const SVGEditor: React.FC<SVGEditorProps> = ({ svgCode, onSVGChange }) => {
  const [localSVG, setLocalSVG] = useState(svgCode);
  const [isEditing, setIsEditing] = useState(false);

  // Update local state when external SVG changes
  useEffect(() => {
    if (!isEditing) {
      setLocalSVG(svgCode);
    }
  }, [svgCode, isEditing]);

  const handleSVGChange = (value: string) => {
    setLocalSVG(value);
    setIsEditing(true);
  };

  const handleApplyChanges = () => {
    onSVGChange(localSVG);
    setIsEditing(false);
  };

  const handleRevert = () => {
    setLocalSVG(svgCode);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Permitir siempre la tecla espacio y teclas de edición normales
    // Solo interceptar Ctrl+Enter y Escape
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      handleApplyChanges();
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      handleRevert();
      return;
    }
    // No hacer preventDefault para ninguna otra tecla
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <textarea
          value={localSVG}
          onChange={(e) => handleSVGChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="SVG code will appear here..."
          style={{
            width: '100%',
            minHeight: '200px',
            maxHeight: '400px',
            padding: '8px',
            fontSize: '11px',
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", consolas, "source-code-pro", monospace',
            border: '1px solid #e0e0e0',
            borderRadius: '4px',
            resize: 'vertical',
            lineHeight: '1.4',
            background: isEditing ? '#fffbf0' : 'white',
            borderColor: isEditing ? '#ffa726' : '#e0e0e0',
          }}
        />
      </div>

      {/* SVG Size Information */}
      <div style={{ 
        fontSize: '11px', 
        color: '#666', 
        marginTop: '4px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '4px 0'
      }}>
        <span>Size: {formatFileSize(new Blob([svgCode]).size)}</span>
        <span>{svgCode.length} characters</span>
      </div>

      {isEditing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <PluginButton
            icon={<RotateCcw size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />}
            text="Revert"
            color="#6c757d"
            active={false}
            disabled={false}
            onPointerDown={handleRevert}
          />
          <PluginButton
            icon={<CheckCircle2 size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />}
            text="Apply"
            color="#28a745"
            active={false}
            disabled={false}
            onPointerDown={handleApplyChanges}
          />
        </div>
      )}
    </div>
  );
};

export const SVGComponent: React.FC = () => {
  const { paths, texts, textPaths, groups, gradients, images, symbols, markers, clipPaths, masks, filters, uses, viewport, replacePaths, replaceTexts, replaceTextPaths, replaceGroups, replaceImages, clearAllTexts, resetViewportCompletely, precision, setPrecision, setGradients, clearGradients, addText, addGradient, addImage, addSymbol, addMarker, addClipPath, addMask, addFilter, removeFilter, clearAllSVGElements, addUse, updateImage, animations, animationState, animationSync, addAnimation, removeAnimation, createAnimationChain, calculateChainDelays } = useEditorStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Import settings state
  const [importSettings, setImportSettings] = useState<ImportSettings>({
    mode: 'replace',
    preserveViewBox: true,
    autoAdjustViewport: true,
    validateBeforeImport: true,
    showConfirmation: true
  });

  const handleImportSettingsChange = (settings: ImportSettings) => {
    setImportSettings(settings);
  };

  const handleApplyDefaultSettings = () => {
    setImportSettings({
      mode: 'replace',
      preserveViewBox: true,
      autoAdjustViewport: true,
      validateBeforeImport: true,
      showConfirmation: true
    });
  };

  // Generate SVG string from current paths and texts
  const generateSVGCode = (): string => {
    // Calculate chain delays for proper animation timing
    const chainDelays = calculateChainDelays();
    
    // Helper function to convert fill/stroke values to SVG format
    const convertStyleValue = (value: any): string => {
      if (!value || value === 'none') return 'none';
      if (typeof value === 'string') return value;
      if (typeof value === 'object' && value.id) {
        return `url(#${value.id})`;
      }
      return 'none';
    };

    // Helper function to render a single element (without grouping)
    const renderPath = (path: any) => {
      const pathData = path.subPaths.map((subPath: any) => subPathToString(subPath)).join(' ');
      const style = path.style;
      
      const fillValue = convertStyleValue(style.fill);
      const strokeValue = convertStyleValue(style.stroke);
      
      const attributes = [
        `id="${path.id}"`,
        `d="${pathData}"`,
        fillValue !== 'none' ? `fill="${fillValue}"` : 'fill="none"',
        strokeValue !== 'none' ? `stroke="${strokeValue}"` : '',
        style.strokeWidth ? `stroke-width="${style.strokeWidth}"` : '',
        style.strokeDasharray ? `stroke-dasharray="${style.strokeDasharray}"` : '',
        style.strokeLinecap ? `stroke-linecap="${style.strokeLinecap}"` : '',
        style.strokeLinejoin ? `stroke-linejoin="${style.strokeLinejoin}"` : '',
        style.fillRule ? `fill-rule="${style.fillRule}"` : '',
        style.fillOpacity !== undefined && style.fillOpacity !== 1 ? `fill-opacity="${style.fillOpacity}"` : '',
        style.strokeOpacity !== undefined && style.strokeOpacity !== 1 ? `stroke-opacity="${style.strokeOpacity}"` : '',
        style.markerStart ? `marker-start="${convertStyleValue(style.markerStart)}"` : '',
        style.markerMid ? `marker-mid="${convertStyleValue(style.markerMid)}"` : '',
        style.markerEnd ? `marker-end="${convertStyleValue(style.markerEnd)}"` : '',
        style.filter ? `filter="${convertStyleValue(style.filter)}"` : '',
        style.clipPath ? `clip-path="${convertStyleValue(style.clipPath)}"` : '',
        style.mask ? `mask="${convertStyleValue(style.mask)}"` : '',
      ].filter(Boolean).join(' ');
      
      // Get animations for this path
      const pathAnimations = renderAnimationsForElement(path.id, chainDelays);
      
      if (pathAnimations) {
        return `<path ${attributes}>\n${pathAnimations}\n    </path>`;
      } else {
        return `<path ${attributes} />`;
      }
    };

    const renderText = (text: any) => {
      const style = text.style || {};
      
      const textFillValue = convertStyleValue(style.fill);
      const textStrokeValue = convertStyleValue(style.stroke);
      
      const attributes = [
        `id="${text.id}"`,
        `x="${text.x}"`,
        `y="${text.y}"`,
        text.transform ? `transform="${text.transform}"` : '',
        style.fontSize ? `font-size="${style.fontSize}"` : '',
        style.fontFamily ? `font-family="${style.fontFamily}"` : '',
        style.fontWeight ? `font-weight="${style.fontWeight}"` : '',
        style.fontStyle ? `font-style="${style.fontStyle}"` : '',
        style.textAnchor ? `text-anchor="${style.textAnchor}"` : '',
        textFillValue !== 'none' ? `fill="${textFillValue}"` : '',
        textStrokeValue !== 'none' ? `stroke="${textStrokeValue}"` : '',
        style.strokeWidth ? `stroke-width="${style.strokeWidth}"` : '',
        style.fillOpacity !== undefined && style.fillOpacity !== 1 ? `fill-opacity="${style.fillOpacity}"` : '',
        style.strokeOpacity !== undefined && style.strokeOpacity !== 1 ? `stroke-opacity="${style.strokeOpacity}"` : '',
        style.filter ? `filter="${convertStyleValue(style.filter)}"` : '',
        style.clipPath ? `clip-path="${convertStyleValue(style.clipPath)}"` : '',
        style.mask ? `mask="${convertStyleValue(style.mask)}"` : '',
      ].filter(Boolean).join(' ');

      // Get animations for this text
      const textAnimations = renderAnimationsForElement(text.id, chainDelays);

      if (text.type === 'multiline-text') {
        const spans = text.spans.map((span: any, index: number) => {
          const spanFillValue = span.style?.fill ? convertStyleValue(span.style.fill) : '';
          
          const spanAttributes = [
            `x="${text.x}"`,
            `dy="${index === 0 ? 0 : (style.fontSize || 16) * 1.2}"`,
            spanFillValue && spanFillValue !== textFillValue ? `fill="${spanFillValue}"` : '',
            span.style?.fontWeight && span.style.fontWeight !== style.fontWeight ? `font-weight="${span.style.fontWeight}"` : '',
          ].filter(Boolean).join(' ');
          
          return `    <tspan ${spanAttributes}>${span.content}</tspan>`;
        }).join('\n');
        
        if (textAnimations) {
          return `<text ${attributes}>\n${spans}\n${textAnimations}\n  </text>`;
        } else {
          return `<text ${attributes}>\n${spans}\n  </text>`;
        }
      } else {
        if (textAnimations) {
          return `<text ${attributes}>${text.content}\n${textAnimations}\n    </text>`;
        } else {
          return `<text ${attributes}>${text.content}</text>`;
        }
      }
    };

    // Render image elements
    const renderImage = (image: any) => {
      const attributes = [
        `x="${image.x}"`,
        `y="${image.y}"`,
        `width="${image.width}"`,
        `height="${image.height}"`,
        `href="${image.href}"`,
        image.preserveAspectRatio ? `preserveAspectRatio="${image.preserveAspectRatio}"` : '',
        image.transform ? `transform="${image.transform}"` : '',
        image.style?.clipPath ? `clip-path="${convertStyleValue(image.style.clipPath)}"` : '',
        image.style?.mask ? `mask="${convertStyleValue(image.style.mask)}"` : '',
        image.style?.filter ? `filter="${convertStyleValue(image.style.filter)}"` : '',
      ].filter(Boolean).join(' ');
      
      // Get animations for this image
      const imageAnimations = renderAnimationsForElement(image.id, chainDelays);
      
      if (imageAnimations) {
        return `<image ${attributes}>\n${imageAnimations}\n    </image>`;
      } else {
        return `<image ${attributes} />`;
      }
    };

    // Render use elements (symbol instances)
    const renderUse = (use: any) => {
      const attributes = [
        `href="#${use.href.replace('#', '')}"`,
        `x="${use.x}"`,
        `y="${use.y}"`,
        use.width ? `width="${use.width}"` : '',
        use.height ? `height="${use.height}"` : '',
        use.transform ? `transform="${use.transform}"` : '',
        use.style?.clipPath ? `clip-path="${convertStyleValue(use.style.clipPath)}"` : '',
        use.style?.mask ? `mask="${convertStyleValue(use.style.mask)}"` : '',
        use.style?.filter ? `filter="${convertStyleValue(use.style.filter)}"` : '',
      ].filter(Boolean).join(' ');
      
      // Get animations for this use element (symbol instance)
      const useAnimations = renderAnimationsForElement(use.id, chainDelays);
      
      if (useAnimations) {
        return `<use ${attributes}>\n${useAnimations}\n    </use>`;
      } else {
        return `<use ${attributes} />`;
      }
    };

    // Render textPath elements
    const renderTextPath = (textPath: any) => {
      const style = textPath.style || {};
      const textFillValue = convertStyleValue(style.fill);
      const textStrokeValue = convertStyleValue(style.stroke);
      
      const textAttributes = [
        `id="${textPath.id}"`,
        style.fontSize ? `font-size="${style.fontSize}"` : '',
        style.fontFamily ? `font-family="${style.fontFamily}"` : '',
        style.fontWeight ? `font-weight="${style.fontWeight}"` : '',
        style.fontStyle ? `font-style="${style.fontStyle}"` : '',
        style.textAnchor ? `text-anchor="${style.textAnchor}"` : '',
        textFillValue !== 'none' ? `fill="${textFillValue}"` : '',
        textStrokeValue !== 'none' ? `stroke="${textStrokeValue}"` : '',
        style.strokeWidth ? `stroke-width="${style.strokeWidth}"` : '',
        style.fillOpacity !== undefined && style.fillOpacity !== 1 ? `fill-opacity="${style.fillOpacity}"` : '',
        style.strokeOpacity !== undefined && style.strokeOpacity !== 1 ? `stroke-opacity="${style.strokeOpacity}"` : '',
        textPath.transform ? `transform="${textPath.transform}"` : '',
        style.filter ? `filter="${convertStyleValue(style.filter)}"` : '',
        style.clipPath ? `clip-path="${convertStyleValue(style.clipPath)}"` : '',
        style.mask ? `mask="${convertStyleValue(style.mask)}"` : '',
      ].filter(Boolean).join(' ');

      const textPathAttributes = [
        `href="#${textPath.pathRef}"`,
        textPath.startOffset !== undefined ? `startOffset="${textPath.startOffset}"` : '',
        textPath.method ? `method="${textPath.method}"` : '',
        textPath.spacing ? `spacing="${textPath.spacing}"` : '',
        textPath.side ? `side="${textPath.side}"` : '',
        textPath.textLength ? `textLength="${textPath.textLength}"` : '',
        textPath.lengthAdjust ? `lengthAdjust="${textPath.lengthAdjust}"` : '',
      ].filter(Boolean).join(' ');
      
      // Get animations for this textPath
      const textPathAnimations = renderAnimationsForElement(textPath.id, chainDelays);
      
      if (textPathAnimations) {
        return `<text ${textAttributes}><textPath ${textPathAttributes}>${textPath.content}</textPath>\n${textPathAnimations}\n  </text>`;
      } else {
        return `<text ${textAttributes}><textPath ${textPathAttributes}>${textPath.content}</textPath></text>`;
      }
    };

    // Collect elements that are NOT in any group
    const elementsInGroups = new Set<string>();
    groups.forEach(group => {
      group.children.forEach((child: any) => {
        elementsInGroups.add(child.id);
      });
    });

    // Filter standalone elements (not in any group)
    const standaloneTextPaths = textPaths.filter(textPath => !elementsInGroups.has(textPath.id));

    // Helper function to recursively render group contents
    const renderGroupContents = (group: any): string => {
      const groupElements: string[] = [];
      
      group.children.forEach((child: any) => {
        if (child.type === 'path') {
          const path = paths.find(p => p.id === child.id);
          if (path) {
            groupElements.push(`    ${renderPath(path)}`);
          }
        } else if (child.type === 'text') {
          const text = texts.find(t => t.id === child.id);
          if (text) {
            groupElements.push(`    ${renderText(text)}`);
          }
        } else if (child.type === 'textPath') {
          const textPath = textPaths.find(tp => tp.id === child.id);
          if (textPath) {
            groupElements.push(`    ${renderTextPath(textPath)}`);
          }
        } else if (child.type === 'image') {
          const image = images.find(i => i.id === child.id);
          if (image) {
            groupElements.push(`    ${renderImage(image)}`);
          }
        } else if (child.type === 'use') {
          const use = uses.find(u => u.id === child.id);
          if (use) {
            groupElements.push(`    ${renderUse(use)}`);
          }
        } else if (child.type === 'group') {
          const nestedGroup = groups.find(g => g.id === child.id);
          if (nestedGroup) {
            const nestedContent = renderGroupContents(nestedGroup);
            const nestedAttrs = [];
            if (nestedGroup.transform) nestedAttrs.push(`transform="${nestedGroup.transform}"`);
            const nestedAttrStr = nestedAttrs.length > 0 ? ` ${nestedAttrs.join(' ')}` : '';
            
            // Get animations for this nested group
            const nestedGroupAnimations = renderAnimationsForElement(nestedGroup.id, chainDelays);
            
            if (nestedGroupAnimations) {
              groupElements.push(`    <g${nestedAttrStr}>\n${nestedContent}\n${nestedGroupAnimations}\n    </g>`);
            } else {
              groupElements.push(`    <g${nestedAttrStr}>\n${nestedContent}\n    </g>`);
            }
          }
        }
      });
      
      return groupElements.join('\n');
    };

    // Generate group elements
    const groupElements = groups.map((group) => {
      const groupContent = renderGroupContents(group);
      if (!groupContent.trim()) return '';
      
      const groupAttrs = [];
      if (group.transform) groupAttrs.push(`transform="${group.transform}"`);
      if (group.name) groupAttrs.push(`data-name="${group.name}"`);
      
      const groupAttrStr = groupAttrs.length > 0 ? ` ${groupAttrs.join(' ')}` : '';
      
      // Get animations for this group
      const groupAnimations = renderAnimationsForElement(group.id, chainDelays);
      
      if (groupAnimations) {
        return `  <g${groupAttrStr}>\n${groupContent}\n${groupAnimations}\n  </g>`;
      } else {
        return `  <g${groupAttrStr}>\n${groupContent}\n  </g>`;
      }
    }).filter(Boolean).join('\n');

    // Helper function to extract gradient IDs from style values
    const extractGradientIds = (value: any): string[] => {
      if (!value) return [];
      // Check for string format url(#id)
      if (typeof value === 'string' && value.startsWith('url(#')) {
        const match = value.match(/url\(#([^)]+)\)/);
        return match ? [match[1]] : [];
      }
      // Check for gradient/pattern object format
      if (typeof value === 'object' && value.id) {
        return [value.id];
      }
      return [];
    };

    // Helper function to extract marker IDs from marker references
    const extractMarkerIds = (value: any): string[] => {
      if (!value) return [];
      // Check for string format url(#id)
      if (typeof value === 'string' && value.startsWith('url(#')) {
        const match = value.match(/url\(#([^)]+)\)/);
        return match ? [match[1]] : [];
      }
      // Check for object format
      if (typeof value === 'object' && value.id) {
        return [value.id];
      }
      return [];
    };

    // Helper function to extract clipPath/mask/filter IDs from references
    const extractEffectIds = (value: any): string[] => {
      if (!value) return [];
      // Check for string format url(#id)
      if (typeof value === 'string' && value.startsWith('url(#')) {
        const match = value.match(/url\(#([^)]+)\)/);
        return match ? [match[1]] : [];
      }
      // Check for object format
      if (typeof value === 'object' && value.id) {
        return [value.id];
      }
      return [];
    };

    // Collect all gradient IDs that are actually used
    const usedGradientIds = new Set<string>();
    // Collect all marker IDs that are actually used
    const usedMarkerIds = new Set<string>();
    // Collect all clipPath, mask, and filter IDs that are actually used
    const usedClipPathIds = new Set<string>();
    const usedMaskIds = new Set<string>();
    const usedFilterIds = new Set<string>();

    // Re-create standalone element lists for dependency tracking
    const standalonePaths = paths.filter(path => !elementsInGroups.has(path.id));
    const standaloneTexts = texts.filter(text => !elementsInGroups.has(text.id));
    const standaloneImages = images.filter(image => !elementsInGroups.has(image.id));
    const standaloneUses = uses.filter(use => !elementsInGroups.has(use.id));

    // Check standalone paths
    standalonePaths.forEach(path => {
      extractGradientIds(path.style.fill).forEach(id => usedGradientIds.add(id));
      extractGradientIds(path.style.stroke).forEach(id => usedGradientIds.add(id));
      // Extract marker IDs
      extractMarkerIds(path.style.markerStart).forEach(id => usedMarkerIds.add(id));
      extractMarkerIds(path.style.markerMid).forEach(id => usedMarkerIds.add(id));
      extractMarkerIds(path.style.markerEnd).forEach(id => usedMarkerIds.add(id));
      // Extract effect IDs
      extractEffectIds(path.style.clipPath).forEach(id => usedClipPathIds.add(id));
      extractEffectIds(path.style.mask).forEach(id => usedMaskIds.add(id));
      extractEffectIds(path.style.filter).forEach(id => usedFilterIds.add(id));
    });

    // Check standalone texts
    standaloneTexts.forEach(text => {
      extractGradientIds(text.style?.fill).forEach(id => usedGradientIds.add(id));
      extractGradientIds(text.style?.stroke).forEach(id => usedGradientIds.add(id));
      // Extract effect IDs
      extractEffectIds(text.style?.clipPath).forEach(id => usedClipPathIds.add(id));
      extractEffectIds(text.style?.mask).forEach(id => usedMaskIds.add(id));
      extractEffectIds(text.style?.filter).forEach(id => usedFilterIds.add(id));
      // Check multiline text spans
      if (text.type === 'multiline-text') {
        text.spans.forEach(span => {
          extractGradientIds(span.style?.fill).forEach(id => usedGradientIds.add(id));
          extractGradientIds(span.style?.stroke).forEach(id => usedGradientIds.add(id));
          // Extract effect IDs from spans
          extractEffectIds(span.style?.clipPath).forEach(id => usedClipPathIds.add(id));
          extractEffectIds(span.style?.mask).forEach(id => usedMaskIds.add(id));
          extractEffectIds(span.style?.filter).forEach(id => usedFilterIds.add(id));
        });
      }
    });

    // Check elements in groups
    groups.forEach(group => {
      group.children.forEach(child => {
        if (child.type === 'path') {
          const path = paths.find(p => p.id === child.id);
          if (path) {
            extractGradientIds(path.style.fill).forEach(id => usedGradientIds.add(id));
            extractGradientIds(path.style.stroke).forEach(id => usedGradientIds.add(id));
            // Extract marker IDs
            extractMarkerIds(path.style.markerStart).forEach(id => usedMarkerIds.add(id));
            extractMarkerIds(path.style.markerMid).forEach(id => usedMarkerIds.add(id));
            extractMarkerIds(path.style.markerEnd).forEach(id => usedMarkerIds.add(id));
            // Extract effect IDs
            extractEffectIds(path.style.clipPath).forEach(id => usedClipPathIds.add(id));
            extractEffectIds(path.style.mask).forEach(id => usedMaskIds.add(id));
            extractEffectIds(path.style.filter).forEach(id => usedFilterIds.add(id));
          }
        } else if (child.type === 'text') {
          const text = texts.find(t => t.id === child.id);
          if (text) {
            extractGradientIds(text.style?.fill).forEach(id => usedGradientIds.add(id));
            extractGradientIds(text.style?.stroke).forEach(id => usedGradientIds.add(id));
            // Extract effect IDs
            extractEffectIds(text.style?.clipPath).forEach(id => usedClipPathIds.add(id));
            extractEffectIds(text.style?.mask).forEach(id => usedMaskIds.add(id));
            extractEffectIds(text.style?.filter).forEach(id => usedFilterIds.add(id));
            if (text.type === 'multiline-text') {
              text.spans.forEach(span => {
                extractGradientIds(span.style?.fill).forEach(id => usedGradientIds.add(id));
                extractGradientIds(span.style?.stroke).forEach(id => usedGradientIds.add(id));
                // Extract effect IDs from spans
                extractEffectIds(span.style?.clipPath).forEach(id => usedClipPathIds.add(id));
                extractEffectIds(span.style?.mask).forEach(id => usedMaskIds.add(id));
                extractEffectIds(span.style?.filter).forEach(id => usedFilterIds.add(id));
              });
            }
          }
        } else if (child.type === 'image') {
          const image = images.find(i => i.id === child.id);
          if (image) {
            // Extract effect IDs from images
            extractEffectIds(image.style?.clipPath).forEach(id => usedClipPathIds.add(id));
            extractEffectIds(image.style?.mask).forEach(id => usedMaskIds.add(id));
            extractEffectIds(image.style?.filter).forEach(id => usedFilterIds.add(id));
          }
        } else if (child.type === 'use') {
          const use = uses.find(u => u.id === child.id);
          if (use) {
            // Extract effect IDs from uses
            extractEffectIds(use.style?.clipPath).forEach(id => usedClipPathIds.add(id));
            extractEffectIds(use.style?.mask).forEach(id => usedMaskIds.add(id));
            extractEffectIds(use.style?.filter).forEach(id => usedFilterIds.add(id));
          }
        }
      });
    });

    // Check standalone images and uses
    images.filter(image => !elementsInGroups.has(image.id)).forEach(image => {
      extractEffectIds(image.style?.clipPath).forEach(id => usedClipPathIds.add(id));
      extractEffectIds(image.style?.mask).forEach(id => usedMaskIds.add(id));
      extractEffectIds(image.style?.filter).forEach(id => usedFilterIds.add(id));
    });

    uses.filter(use => !elementsInGroups.has(use.id)).forEach(use => {
      extractEffectIds(use.style?.clipPath).forEach(id => usedClipPathIds.add(id));
      extractEffectIds(use.style?.mask).forEach(id => usedMaskIds.add(id));
      extractEffectIds(use.style?.filter).forEach(id => usedFilterIds.add(id));
    });

    // TEMPORARY: Include ALL markers and clipPaths (bypass filtering for debugging)
    const allGradients = gradients.filter(gradient => usedGradientIds.has(gradient.id));
    const allMarkers = markers; // Include ALL markers temporarily
    const allClipPaths = clipPaths; // Include ALL clipPaths temporarily
    const allMasks = masks.filter(mask => usedMaskIds.has(mask.id));
    const allFilters = filters.filter(filter => usedFilterIds.has(filter.id));

    // Generate all definitions (gradients, symbols, markers, filters, clip paths, masks)
    const generateDefinitions = () => {
      const allDefs: string[] = [];
      
      // Calculate chain delays for proper synchronization in SVG export
      const chainDelays = calculateChainDelays();
      
      // Add gradients and patterns
      if (allGradients.length > 0) {
        const gradientDefs = allGradients.map(gradient => {
          // Find animations that target this gradient
          const gradientAnimations = animations.filter(anim => 
            anim.targetElementId === gradient.id
          );
          
          const gradientAnimationsHtml = gradientAnimations.length > 0 ? gradientAnimations.map(animation => {
            // Calculate begin time including chain delays
            let beginValue = getAnimationProperty(animation, 'begin') || '';
            const chainDelay = chainDelays.get(animation.id);
            if (chainDelay !== undefined && chainDelay > 0) {
              // Convert from ms to seconds for SVG
              const delayInSeconds = chainDelay / 1000;
              beginValue = `${delayInSeconds}s`;
            } else if (!beginValue) {
              beginValue = '0s'; // Default begin time
            }

            const commonAttrs = [
              animation.dur ? `dur="${animation.dur}"` : 'dur="2s"',
              beginValue ? `begin="${beginValue}"` : '',
              getAnimationProperty(animation, 'end') ? `end="${getAnimationProperty(animation, 'end')}"` : '',
              getAnimationProperty(animation, 'repeatCount') ? `repeatCount="${getAnimationProperty(animation, 'repeatCount')}"` : '',
              getAnimationProperty(animation, 'fill') ? `fill="${getAnimationProperty(animation, 'fill')}"` : '',
            ].filter(Boolean).join(' ');

            switch ((animation as any).type) {
              case 'animate':
                const animateAttrs = [
                  `attributeName="${(animation as any).attributeName}"`,
                  (animation as any).from ? `from="${(animation as any).from}"` : '',
                  (animation as any).to ? `to="${(animation as any).to}"` : '',
                  (animation as any).values ? `values="${(animation as any).values}"` : '',
                  commonAttrs
                ].filter(Boolean).join(' ');
                return `    <animate ${animateAttrs} />`;
              case 'animateTransform':
                const transformAttrs = [
                  `attributeName="${(animation as any).attributeName}"`,
                  `type="${(animation as any).transformType}"`,
                  (animation as any).from ? `from="${(animation as any).from}"` : '',
                  (animation as any).to ? `to="${(animation as any).to}"` : '',
                  (animation as any).values ? `values="${(animation as any).values}"` : '',
                  commonAttrs
                ].filter(Boolean).join(' ');
                return `    <animateTransform ${transformAttrs} />`;
              default:
                return '';
            }
          }).join('\n') : '';
          
          switch (gradient.type) {
            case 'linear':
              // Handle stop animations
              const linearStops = gradient.stops.map(stop => {
                const stopAnimations = animations.filter(anim => anim.targetElementId === stop.id);
                const stopAnimationsHtml = stopAnimations.length > 0 ? stopAnimations.map(animation => {
                  // Calculate begin time including chain delays
                  let beginValue = getAnimationProperty(animation, 'begin') || '';
                  const chainDelay = chainDelays.get(animation.id);
                  if (chainDelay !== undefined && chainDelay > 0) {
                    // Convert from ms to seconds for SVG
                    const delayInSeconds = chainDelay / 1000;
                    beginValue = `${delayInSeconds}s`;
                  } else if (!beginValue) {
                    beginValue = '0s'; // Default begin time
                  }

                  const commonAttrs = [
                    animation.dur ? `dur="${animation.dur}"` : 'dur="2s"',
                    beginValue ? `begin="${beginValue}"` : '',
                    getAnimationProperty(animation, 'fill') ? `fill="${getAnimationProperty(animation, 'fill')}"` : '',
                  ].filter(Boolean).join(' ');
                  const animateAttrs = [
                    `attributeName="${(animation as any).attributeName}"`,
                    (animation as any).from ? `from="${(animation as any).from}"` : '',
                    (animation as any).to ? `to="${(animation as any).to}"` : '',
                    commonAttrs
                  ].filter(Boolean).join(' ');
                  return `      <animate ${animateAttrs} />`;
                }).join('\n') : '';
                
                return stopAnimationsHtml
                  ? `    <stop offset="${stop.offset}%" stop-color="${stop.color}" stop-opacity="${stop.opacity ?? 1}">\n${stopAnimationsHtml}\n    </stop>`
                  : `    <stop offset="${stop.offset}%" stop-color="${stop.color}" stop-opacity="${stop.opacity ?? 1}" />`;
              }).join('\n');
              
              const linearContent = gradientAnimationsHtml ? `\n${linearStops}\n${gradientAnimationsHtml}\n  ` : `\n${linearStops}\n  `;
              return `  <linearGradient id="${gradient.id}" x1="${gradient.x1}%" y1="${gradient.y1}%" x2="${gradient.x2}%" y2="${gradient.y2}%" gradientUnits="${gradient.gradientUnits || 'objectBoundingBox'}">${linearContent}</linearGradient>`;
            
            case 'radial':
              // Handle stop animations for radial gradient
              const radialStops = gradient.stops.map(stop => {
                const stopAnimations = animations.filter(anim => anim.targetElementId === stop.id);
                const stopAnimationsHtml = stopAnimations.length > 0 ? stopAnimations.map(animation => {
                  // Calculate begin time including chain delays
                  let beginValue = getAnimationProperty(animation, 'begin') || '';
                  const chainDelay = chainDelays.get(animation.id);
                  if (chainDelay !== undefined && chainDelay > 0) {
                    // Convert from ms to seconds for SVG
                    const delayInSeconds = chainDelay / 1000;
                    beginValue = `${delayInSeconds}s`;
                  } else if (!beginValue) {
                    beginValue = '0s'; // Default begin time
                  }

                  const commonAttrs = [
                    animation.dur ? `dur="${animation.dur}"` : 'dur="2s"',
                    beginValue ? `begin="${beginValue}"` : '',
                    getAnimationProperty(animation, 'fill') ? `fill="${getAnimationProperty(animation, 'fill')}"` : '',
                  ].filter(Boolean).join(' ');
                  const animateAttrs = [
                    `attributeName="${(animation as any).attributeName}"`,
                    (animation as any).from ? `from="${(animation as any).from}"` : '',
                    (animation as any).to ? `to="${(animation as any).to}"` : '',
                    commonAttrs
                  ].filter(Boolean).join(' ');
                  return `      <animate ${animateAttrs} />`;
                }).join('\n') : '';
                
                return stopAnimationsHtml
                  ? `    <stop offset="${stop.offset}%" stop-color="${stop.color}" stop-opacity="${stop.opacity ?? 1}">\n${stopAnimationsHtml}\n    </stop>`
                  : `    <stop offset="${stop.offset}%" stop-color="${stop.color}" stop-opacity="${stop.opacity ?? 1}" />`;
              }).join('\n');
              
              const fxAttr = (gradient.fx !== undefined && gradient.fx !== gradient.cx) ? ` fx="${gradient.fx}%"` : '';
              const fyAttr = (gradient.fy !== undefined && gradient.fy !== gradient.cy) ? ` fy="${gradient.fy}%"` : '';
              const radialContent = gradientAnimationsHtml ? `\n${radialStops}\n${gradientAnimationsHtml}\n  ` : `\n${radialStops}\n  `;
              return `  <radialGradient id="${gradient.id}" cx="${gradient.cx}%" cy="${gradient.cy}%" r="${gradient.r}%"${fxAttr}${fyAttr} gradientUnits="${gradient.gradientUnits || 'objectBoundingBox'}">${radialContent}</radialGradient>`;
            
            case 'pattern':
              const patternAnimations = animations.filter(anim => anim.targetElementId === gradient.id);
              const patternAnimationsHtml = patternAnimations.length > 0 ? patternAnimations.map(animation => {
                // Calculate begin time including chain delays
                let beginValue = getAnimationProperty(animation, 'begin') || '';
                const chainDelay = chainDelays.get(animation.id);
                if (chainDelay !== undefined && chainDelay > 0) {
                  // Convert from ms to seconds for SVG
                  const delayInSeconds = chainDelay / 1000;
                  beginValue = `${delayInSeconds}s`;
                } else if (!beginValue) {
                  beginValue = '0s'; // Default begin time
                }

                const commonAttrs = [
                  animation.dur ? `dur="${animation.dur}"` : 'dur="2s"',
                  beginValue ? `begin="${beginValue}"` : '',
                  getAnimationProperty(animation, 'fill') ? `fill="${getAnimationProperty(animation, 'fill')}"` : '',
                ].filter(Boolean).join(' ');
                const animateAttrs = [
                  `attributeName="${(animation as any).attributeName}"`,
                  (animation as any).from ? `from="${(animation as any).from}"` : '',
                  (animation as any).to ? `to="${(animation as any).to}"` : '',
                  commonAttrs
                ].filter(Boolean).join(' ');
                return `    <animate ${animateAttrs} />`;
              }).join('\n') : '';
              
              const patternContent = patternAnimationsHtml ? `\n    ${gradient.content}\n${patternAnimationsHtml}\n  ` : `\n    ${gradient.content}\n  `;
              return `  <pattern id="${gradient.id}" width="${gradient.width}" height="${gradient.height}" patternUnits="${gradient.patternUnits || 'userSpaceOnUse'}"${gradient.patternContentUnits ? ` patternContentUnits="${gradient.patternContentUnits}"` : ''}${gradient.patternTransform ? ` patternTransform="${gradient.patternTransform}"` : ''}>${patternContent}</pattern>`;
            
            default:
              return '';
          }
        }).filter(Boolean);
        allDefs.push(...gradientDefs);
      }
      
      // Add symbols
      if (symbols.length > 0) {
        const symbolDefs = symbols.map(symbol => {
          const symbolContent = symbol.children.map((child: any) => {
            if (child.type === 'path') {
              const pathData = child.subPaths.map((subPath: any) => subPathToString(subPath)).join(' ');
              const style = child.style || {};
              const fillValue = convertStyleValue(style.fill);
              const strokeValue = convertStyleValue(style.stroke);
              
              const pathAttrs = [
                `id="${child.id}"`,
                `d="${pathData}"`,
                fillValue !== 'none' ? `fill="${fillValue}"` : 'fill="none"',
                strokeValue !== 'none' ? `stroke="${strokeValue}"` : '',
                style.strokeWidth ? `stroke-width="${style.strokeWidth}"` : '',
                style.fillOpacity !== undefined && style.fillOpacity !== 1 ? `fill-opacity="${style.fillOpacity}"` : '',
                style.strokeOpacity !== undefined && style.strokeOpacity !== 1 ? `stroke-opacity="${style.strokeOpacity}"` : '',
              ].filter(Boolean).join(' ');
              
              // Get animations for this path within the symbol
              const pathAnimations = renderAnimationsForElement(child.id, chainDelays);
              
              if (pathAnimations) {
                return `    <path ${pathAttrs}>\n${pathAnimations}\n    </path>`;
              } else {
                return `    <path ${pathAttrs} />`;
              }
            }
            return '';
          }).filter(Boolean).join('\n');
          
          // Get animations for the symbol itself
          const symbolAnimations = renderAnimationsForElement(symbol.id, chainDelays);
          
          const symbolAttrs = [
            `id="${symbol.id}"`,
            symbol.viewBox ? `viewBox="${symbol.viewBox}"` : '',
            symbol.preserveAspectRatio ? `preserveAspectRatio="${symbol.preserveAspectRatio}"` : '',
          ].filter(Boolean).join(' ');
          
          if (symbolAnimations) {
            return `  <symbol ${symbolAttrs}>\n${symbolContent}\n${symbolAnimations}\n  </symbol>`;
          } else {
            return `  <symbol ${symbolAttrs}>\n${symbolContent}\n  </symbol>`;
          }
        });
        allDefs.push(...symbolDefs);
      }
      
      // Add markers
      if (allMarkers.length > 0) {
        const markerDefs = allMarkers.map(marker => {
          const markerContent = marker.children.length > 0 
            ? marker.children.map((child: any) => {
                if (child.type === 'path') {
                  const pathData = child.subPaths.map((subPath: any) => subPathToString(subPath)).join(' ');
                  const style = { ...child.style, ...marker.style };
                  const fillValue = convertStyleValue(style.fill);
                  const strokeValue = convertStyleValue(style.stroke);
                  
                  const pathAttrs = [
                    `d="${pathData}"`,
                    fillValue !== 'none' ? `fill="${fillValue}"` : 'fill="none"',
                    strokeValue !== 'none' ? `stroke="${strokeValue}"` : '',
                    style.strokeWidth ? `stroke-width="${style.strokeWidth}"` : '',
                  ].filter(Boolean).join(' ');
                  
                  return `    <path ${pathAttrs} />`;
                }
                return '';
              }).filter(Boolean).join('\n')
            : `    <path d="M 0 0 L 8 4 L 0 8 Z" fill="${marker.style?.fill || '#000000'}" />`;
          
          const markerAttrs = [
            `id="${marker.id}"`,
            `markerUnits="${marker.markerUnits || 'strokeWidth'}"`,
            `refX="${marker.refX || 0}"`,
            `refY="${marker.refY || 4}"`,
            `markerWidth="${marker.markerWidth || 8}"`,
            `markerHeight="${marker.markerHeight || 8}"`,
            `orient="${marker.orient || 'auto'}"`,
            marker.viewBox ? `viewBox="${marker.viewBox}"` : '',
          ].filter(Boolean).join(' ');
          
          return `  <marker ${markerAttrs}>\n${markerContent}\n  </marker>`;
        });
        allDefs.push(...markerDefs);
      }
      
      // Add filters
      if (allFilters.length > 0) {
        const filterDefs = allFilters.map(filter => {
          const primitiveContent = filter.primitives.map((primitive: any) => {
            // Find animations that target this primitive
            const primitiveAnimations = animations.filter(anim => 
              anim.targetElementId === primitive.id || 
              anim.targetElementId === filter.id
            );
            
            const primitiveAnimationsHtml = primitiveAnimations.length > 0 ? primitiveAnimations.map(animation => {
              // Calculate begin time including chain delays
              let beginValue = getAnimationProperty(animation, 'begin') || '';
              const chainDelay = chainDelays.get(animation.id);
              if (chainDelay !== undefined && chainDelay > 0) {
                // Convert from ms to seconds for SVG
                const delayInSeconds = chainDelay / 1000;
                beginValue = `${delayInSeconds}s`;
              } else if (!beginValue) {
                beginValue = '0s'; // Default begin time
              }

              const commonAttrs = [
                animation.dur ? `dur="${animation.dur}"` : 'dur="2s"',
                beginValue ? `begin="${beginValue}"` : '',
                getAnimationProperty(animation, 'end') ? `end="${getAnimationProperty(animation, 'end')}"` : '',
                getAnimationProperty(animation, 'repeatCount') ? `repeatCount="${getAnimationProperty(animation, 'repeatCount')}"` : '',
                getAnimationProperty(animation, 'fill') ? `fill="${getAnimationProperty(animation, 'fill')}"` : '',
              ].filter(Boolean).join(' ');

              switch ((animation as any).type) {
                case 'animate':
                  const animateAttrs = [
                    `attributeName="${(animation as any).attributeName}"`,
                    (animation as any).from ? `from="${(animation as any).from}"` : '',
                    (animation as any).to ? `to="${(animation as any).to}"` : '',
                    commonAttrs
                  ].filter(Boolean).join(' ');
                  return `      <animate ${animateAttrs} />`;
                default:
                  return '';
              }
            }).join('\n') : '';
            
            switch (primitive.type) {
              case 'feGaussianBlur':
                const blurContent = primitiveAnimationsHtml ? `\n${primitiveAnimationsHtml}\n    ` : '';
                return primitiveAnimationsHtml
                  ? `    <feGaussianBlur stdDeviation="${primitive.stdDeviation}"${primitive.in ? ` in="${primitive.in}"` : ''}${primitive.result ? ` result="${primitive.result}"` : ''}>${blurContent}</feGaussianBlur>`
                  : `    <feGaussianBlur stdDeviation="${primitive.stdDeviation}"${primitive.in ? ` in="${primitive.in}"` : ''}${primitive.result ? ` result="${primitive.result}"` : ''} />`;
              case 'feOffset':
                const offsetContent = primitiveAnimationsHtml ? `\n${primitiveAnimationsHtml}\n    ` : '';
                return primitiveAnimationsHtml
                  ? `    <feOffset dx="${primitive.dx}" dy="${primitive.dy}"${primitive.in ? ` in="${primitive.in}"` : ''}${primitive.result ? ` result="${primitive.result}"` : ''}>${offsetContent}</feOffset>`
                  : `    <feOffset dx="${primitive.dx}" dy="${primitive.dy}"${primitive.in ? ` in="${primitive.in}"` : ''}${primitive.result ? ` result="${primitive.result}"` : ''} />`;
              case 'feFlood':
                const floodContent = primitiveAnimationsHtml ? `\n${primitiveAnimationsHtml}\n    ` : '';
                return primitiveAnimationsHtml
                  ? `    <feFlood flood-color="${primitive.floodColor}" flood-opacity="${primitive.floodOpacity ?? 1}"${primitive.result ? ` result="${primitive.result}"` : ''}>${floodContent}</feFlood>`
                  : `    <feFlood flood-color="${primitive.floodColor}" flood-opacity="${primitive.floodOpacity ?? 1}"${primitive.result ? ` result="${primitive.result}"` : ''} />`;
              case 'feComposite':
                const compositeAttrs = [
                  `operator="${primitive.operator}"`,
                  primitive.in ? `in="${primitive.in}"` : '',
                  primitive.in2 ? `in2="${primitive.in2}"` : '',
                  primitive.result ? `result="${primitive.result}"` : ''
                ];
                
                // Add arithmetic coefficients if operator is arithmetic
                if (primitive.operator === 'arithmetic') {
                  compositeAttrs.push(
                    `k1="${primitive.k1 ?? 0}"`,
                    `k2="${primitive.k2 ?? 1}"`,
                    `k3="${primitive.k3 ?? 1}"`,
                    `k4="${primitive.k4 ?? 0}"`
                  );
                }
                
                return `    <feComposite ${compositeAttrs.filter(Boolean).join(' ')} />`;
              case 'feColorMatrix':
                return `    <feColorMatrix type="${primitive.colorMatrixType}" values="${primitive.values}"${primitive.in ? ` in="${primitive.in}"` : ''}${primitive.result ? ` result="${primitive.result}"` : ''} />`;
              case 'feDropShadow':
                return `    <feDropShadow dx="${primitive.dx}" dy="${primitive.dy}" stdDeviation="${primitive.stdDeviation}" flood-color="${primitive.floodColor}" flood-opacity="${primitive.floodOpacity ?? 1}"${primitive.result ? ` result="${primitive.result}"` : ''} />`;
              case 'feBlend':
                return `    <feBlend mode="${primitive.mode}"${primitive.in ? ` in="${primitive.in}"` : ''}${primitive.in2 ? ` in2="${primitive.in2}"` : ''}${primitive.result ? ` result="${primitive.result}"` : ''} />`;
              case 'feMorphology':
                return `    <feMorphology operator="${primitive.operator}" radius="${primitive.radius}"${primitive.in ? ` in="${primitive.in}"` : ''}${primitive.result ? ` result="${primitive.result}"` : ''} />`;
              case 'feConvolveMatrix':
                return `    <feConvolveMatrix order="${primitive.order}" kernelMatrix="${primitive.kernelMatrix}"${primitive.in ? ` in="${primitive.in}"` : ''}${primitive.result ? ` result="${primitive.result}"` : ''} />`;
              case 'feComponentTransfer':
                return `    <feComponentTransfer${primitive.in ? ` in="${primitive.in}"` : ''}${primitive.result ? ` result="${primitive.result}"` : ''} />`;
              case 'feDiffuseLighting':
                const diffuseLightSource = primitive.lightSource.type === 'feDistantLight' 
                  ? `<feDistantLight azimuth="${primitive.lightSource.azimuth || 45}" elevation="${primitive.lightSource.elevation || 45}" />`
                  : primitive.lightSource.type === 'fePointLight'
                  ? `<fePointLight x="${primitive.lightSource.x || 0}" y="${primitive.lightSource.y || 0}" z="${primitive.lightSource.z || 1}" />`
                  : `<feSpotLight x="${primitive.lightSource.x || 0}" y="${primitive.lightSource.y || 0}" z="${primitive.lightSource.z || 1}" pointsAtX="${primitive.lightSource.pointsAtX || 0}" pointsAtY="${primitive.lightSource.pointsAtY || 0}" pointsAtZ="${primitive.lightSource.pointsAtZ || 0}" />`;
                return `    <feDiffuseLighting surface-scale="${primitive.surfaceScale || 1}" diffuse-constant="${primitive.diffuseConstant || 1}" lighting-color="${primitive.lightingColor || '#ffffff'}"${primitive.in ? ` in="${primitive.in}"` : ''}${primitive.result ? ` result="${primitive.result}"` : ''}>\n      ${diffuseLightSource}\n    </feDiffuseLighting>`;
              case 'feSpecularLighting':
                const specularLightSource = primitive.lightSource.type === 'feDistantLight' 
                  ? `<feDistantLight azimuth="${primitive.lightSource.azimuth || 45}" elevation="${primitive.lightSource.elevation || 45}" />`
                  : primitive.lightSource.type === 'fePointLight'
                  ? `<fePointLight x="${primitive.lightSource.x || 0}" y="${primitive.lightSource.y || 0}" z="${primitive.lightSource.z || 1}" />`
                  : `<feSpotLight x="${primitive.lightSource.x || 0}" y="${primitive.lightSource.y || 0}" z="${primitive.lightSource.z || 1}" pointsAtX="${primitive.lightSource.pointsAtX || 0}" pointsAtY="${primitive.lightSource.pointsAtY || 0}" pointsAtZ="${primitive.lightSource.pointsAtZ || 0}" />`;
                return `    <feSpecularLighting surface-scale="${primitive.surfaceScale || 1}" specular-constant="${primitive.specularConstant || 1}" specular-exponent="${primitive.specularExponent || 1}" lighting-color="${primitive.lightingColor || '#ffffff'}"${primitive.in ? ` in="${primitive.in}"` : ''}${primitive.result ? ` result="${primitive.result}"` : ''}>\n      ${specularLightSource}\n    </feSpecularLighting>`;
              case 'feDisplacementMap':
                return `    <feDisplacementMap scale="${primitive.scale || 0}" xChannelSelector="${primitive.xChannelSelector || 'A'}" yChannelSelector="${primitive.yChannelSelector || 'A'}"${primitive.in ? ` in="${primitive.in}"` : ''}${primitive.in2 ? ` in2="${primitive.in2}"` : ''}${primitive.result ? ` result="${primitive.result}"` : ''} />`;
              case 'feTurbulence':
                return `    <feTurbulence baseFrequency="${primitive.baseFrequency}" numOctaves="${primitive.numOctaves || 4}" seed="${primitive.seed || 2}" stitchTiles="${primitive.stitchTiles || 'noStitch'}" type="${primitive.turbulenceType || 'turbulence'}"${primitive.result ? ` result="${primitive.result}"` : ''} />`;
              case 'feImage':
                return `    <feImage href="${primitive.href || ''}"${primitive.preserveAspectRatio ? ` preserveAspectRatio="${primitive.preserveAspectRatio}"` : ''}${primitive.crossorigin ? ` crossorigin="${primitive.crossorigin}"` : ''}${primitive.result ? ` result="${primitive.result}"` : ''} />`;
              case 'feTile':
                return `    <feTile${primitive.in ? ` in="${primitive.in}"` : ''}${primitive.result ? ` result="${primitive.result}"` : ''} />`;
              case 'feMerge':
                const mergeNodes = primitive.feMergeNodes?.map((node: any) => `      <feMergeNode in="${node.in}" />`).join('\n') || '';
                return `    <feMerge${primitive.result ? ` result="${primitive.result}"` : ''}>\n${mergeNodes}\n    </feMerge>`;
              default:
                return `    <!-- Unsupported primitive: ${primitive.type} -->`;
            }
          }).filter(Boolean).join('\n');
          
          const filterAttrs = [
            `id="${filter.id}"`,
            `filterUnits="${filter.filterUnits || 'objectBoundingBox'}"`,
            filter.primitiveUnits ? `primitiveUnits="${filter.primitiveUnits}"` : '',
          ].filter(Boolean).join(' ');
          
          return `  <filter ${filterAttrs}>\n${primitiveContent}\n  </filter>`;
        });
        allDefs.push(...filterDefs);
      }
      
      // Add clip paths
      if (allClipPaths.length > 0) {
        const clipPathDefs = allClipPaths.map(clipPath => {
          const clipContent = clipPath.children.map((child: any) => {
            if (child.type === 'path') {
              const pathData = child.subPaths.map((subPath: any) => subPathToString(subPath)).join(' ');
              return `    <path d="${pathData}" />`;
            }
            return '';
          }).filter(Boolean).join('\n');
          
          const clipAttrs = [
            `id="${clipPath.id}"`,
            clipPath.clipPathUnits ? `clipPathUnits="${clipPath.clipPathUnits}"` : '',
          ].filter(Boolean).join(' ');
          
          return `  <clipPath ${clipAttrs}>\n${clipContent}\n  </clipPath>`;
        });
        allDefs.push(...clipPathDefs);
      }
      
      // Add masks
      if (allMasks.length > 0) {
        const maskDefs = allMasks.map(mask => {
          const maskContent = mask.children.map((child: any) => {
            if (child.type === 'path') {
              const pathData = child.subPaths.map((subPath: any) => subPathToString(subPath)).join(' ');
              const style = child.style || {};
              const fillValue = convertStyleValue(style.fill);
              
              const pathAttrs = [
                `d="${pathData}"`,
                fillValue !== 'none' ? `fill="${fillValue}"` : 'fill="white"',
              ].filter(Boolean).join(' ');
              
              return `    <path ${pathAttrs} />`;
            }
            return '';
          }).filter(Boolean).join('\n');
          
          const maskAttrs = [
            `id="${mask.id}"`,
            mask.maskUnits ? `maskUnits="${mask.maskUnits}"` : '',
            mask.maskContentUnits ? `maskContentUnits="${mask.maskContentUnits}"` : '',
            mask.x !== undefined ? `x="${mask.x}"` : '',
            mask.y !== undefined ? `y="${mask.y}"` : '',
            mask.width !== undefined ? `width="${mask.width}"` : '',
            mask.height !== undefined ? `height="${mask.height}"` : '',
          ].filter(Boolean).join(' ');
          
          return `  <mask ${maskAttrs}>\n${maskContent}\n  </mask>`;
        });
        allDefs.push(...maskDefs);
      }
      
      if (allDefs.length === 0) return '';
      
      return `  <defs>\n${allDefs.join('\n')}\n  </defs>\n`;
    };

    // Helper function to safely get animation properties
    function getAnimationProperty(animation: SVGAnimation, property: string): string | undefined {
      return (animation as any)[property];
    }

    const definitions = generateDefinitions();

    // Generate animation elements
    const generateAnimations = (): string => {
      if (animations.length === 0) return '';
      
      const animationElements = animations.map(animation => {
        const commonAttrs = [
          animation.id ? `id="${animation.id}"` : '',
          animation.dur ? `dur="${animation.dur}"` : 'dur="2s"',
          getAnimationProperty(animation, 'begin') ? `begin="${getAnimationProperty(animation, 'begin')}"` : '',
          getAnimationProperty(animation, 'end') ? `end="${getAnimationProperty(animation, 'end')}"` : '',
          getAnimationProperty(animation, 'repeatCount') ? `repeatCount="${getAnimationProperty(animation, 'repeatCount')}"` : '',
          getAnimationProperty(animation, 'repeatDur') ? `repeatDur="${getAnimationProperty(animation, 'repeatDur')}"` : '',
          getAnimationProperty(animation, 'fill') ? `fill="${getAnimationProperty(animation, 'fill')}"` : '',
          getAnimationProperty(animation, 'restart') ? `restart="${getAnimationProperty(animation, 'restart')}"` : '',
          getAnimationProperty(animation, 'calcMode') ? `calcMode="${getAnimationProperty(animation, 'calcMode')}"` : '',
          getAnimationProperty(animation, 'keyTimes') ? `keyTimes="${getAnimationProperty(animation, 'keyTimes')}"` : '',
          getAnimationProperty(animation, 'keySplines') ? `keySplines="${getAnimationProperty(animation, 'keySplines')}"` : '',
          getAnimationProperty(animation, 'values') ? `values="${getAnimationProperty(animation, 'values')}"` : '',
          getAnimationProperty(animation, 'additive') ? `additive="${getAnimationProperty(animation, 'additive')}"` : '',
          getAnimationProperty(animation, 'accumulate') ? `accumulate="${getAnimationProperty(animation, 'accumulate')}"` : '',
        ].filter(Boolean).join(' ');

        switch ((animation as any).type) {
          case 'animate':
            const animateAttrs = [
              `attributeName="${(animation as any).attributeName}"`,
              (animation as any).attributeType ? `attributeType="${(animation as any).attributeType}"` : '',
              (animation as any).from ? `from="${(animation as any).from}"` : '',
              (animation as any).to ? `to="${(animation as any).to}"` : '',
              (animation as any).by ? `by="${(animation as any).by}"` : '',
              commonAttrs
            ].filter(Boolean).join(' ');
            return `    <animate ${animateAttrs} />`;
            
          case 'animateTransform':
            const transformAttrs = [
              `attributeName="${(animation as any).attributeName}"`,
              (animation as any).attributeType ? `attributeType="${(animation as any).attributeType}"` : '',
              `type="${(animation as any).transformType}"`,
              (animation as any).from ? `from="${(animation as any).from}"` : '',
              (animation as any).to ? `to="${(animation as any).to}"` : '',
              (animation as any).by ? `by="${(animation as any).by}"` : '',
              commonAttrs
            ].filter(Boolean).join(' ');
            return `    <animateTransform ${transformAttrs} />`;
            
          case 'animateMotion':
            const motionAttrs = [
              (animation as any).path ? `path="${(animation as any).path}"` : '',
              (animation as any).keyPoints ? `keyPoints="${(animation as any).keyPoints}"` : '',
              (animation as any).rotate !== undefined ? `rotate="${(animation as any).rotate}"` : '',
              commonAttrs
            ].filter(Boolean).join(' ');
            
            // Handle mpath element if present
            const mpathElement = (animation as any).mpath ? `\n      <mpath href="#${(animation as any).mpath}" />` : '';
            const closingTag = (animation as any).mpath ? `${mpathElement}\n    </animateMotion>` : ' />';
            
            return (animation as any).mpath 
              ? `    <animateMotion ${motionAttrs}>${closingTag}`
              : `    <animateMotion ${motionAttrs} />`;
              
          case 'set':
            const setAttrs = [
              `attributeName="${(animation as any).attributeName}"`,
              (animation as any).attributeType ? `attributeType="${(animation as any).attributeType}"` : '',
              `to="${(animation as any).to}"`,
              getAnimationProperty(animation, 'begin') ? `begin="${getAnimationProperty(animation, 'begin')}"` : 'begin="0s"',
              animation.dur ? `dur="${animation.dur}"` : '',
              getAnimationProperty(animation, 'end') ? `end="${getAnimationProperty(animation, 'end')}"` : '',
              getAnimationProperty(animation, 'fill') ? `fill="${getAnimationProperty(animation, 'fill')}"` : '',
              getAnimationProperty(animation, 'restart') ? `restart="${getAnimationProperty(animation, 'restart')}"` : '',
            ].filter(Boolean).join(' ');
            return `    <set ${setAttrs} />`;
            
          default:
            return `    <!-- Unknown animation type: ${(animation as any).type} -->`;
        }
      });
      
      return animationElements.join('\n');
    };

    // Helper function to inject animations into elements
    const injectAnimationsIntoElements = (elementsHtml: string): string => {
      if (animations.length === 0) return elementsHtml;
      
      // Calculate chain delays for proper synchronization in SVG export
      const chainDelays = calculateChainDelays();
      
      // Group animations by target element
      const animationsByTarget = animations.reduce((acc, animation) => {
        const targetId = animation.targetElementId;
        if (!acc[targetId]) acc[targetId] = [];
        acc[targetId].push(animation);
        return acc;
      }, {} as Record<string, typeof animations>);
      
      let modifiedHtml = elementsHtml;
      
      // For each target element, inject its animations
      Object.entries(animationsByTarget).forEach(([targetId, elementAnimations]) => {
        // Handle special case for SVG root animations (viewBox, etc.)
        if (targetId === 'svg-root') return;
        
        // Filter out animations that target filter primitives or gradients (they're handled in their respective definitions)
        const nonFilterAnimations = elementAnimations.filter(animation => {
          // Check if this animation targets a filter primitive
          const isFilterAnimation = allFilters.some(filter => 
            filter.primitives.some((primitive: any) => primitive.id === targetId) ||
            filter.id === targetId
          );
          
          // Check if this animation targets a gradient or gradient stop
          const isGradientAnimation = allGradients.some(gradient => {
            if (gradient.id === targetId) return true;
            // Check stops only for linear and radial gradients (patterns don't have stops)
            if ((gradient.type === 'linear' || gradient.type === 'radial') && gradient.stops) {
              return gradient.stops.some((stop: any) => stop.id === targetId);
            }
            return false;
          });
          
          return !isFilterAnimation && !isGradientAnimation;
        });
        
        // If no non-filter animations remain, skip this element
        if (nonFilterAnimations.length === 0) return;
        
        const animationsHtml = nonFilterAnimations.map(animation => {
          // Calculate begin time including chain delays
          let beginValue = getAnimationProperty(animation, 'begin') || '';
          const chainDelay = chainDelays.get(animation.id);
          if (chainDelay !== undefined && chainDelay > 0) {
            // Convert from ms to seconds for SVG
            const delayInSeconds = chainDelay / 1000;
            beginValue = `${delayInSeconds}s`;
          } else if (!beginValue) {
            beginValue = '0s'; // Default begin time
          }

          const commonAttrs = [
            animation.dur ? `dur="${animation.dur}"` : 'dur="2s"',
            beginValue ? `begin="${beginValue}"` : '',
            getAnimationProperty(animation, 'end') ? `end="${getAnimationProperty(animation, 'end')}"` : '',
            getAnimationProperty(animation, 'repeatCount') ? `repeatCount="${getAnimationProperty(animation, 'repeatCount')}"` : '',
            getAnimationProperty(animation, 'repeatDur') ? `repeatDur="${getAnimationProperty(animation, 'repeatDur')}"` : '',
            getAnimationProperty(animation, 'fill') ? `fill="${getAnimationProperty(animation, 'fill')}"` : '',
            getAnimationProperty(animation, 'restart') ? `restart="${getAnimationProperty(animation, 'restart')}"` : '',
            getAnimationProperty(animation, 'calcMode') ? `calcMode="${getAnimationProperty(animation, 'calcMode')}"` : '',
            getAnimationProperty(animation, 'keyTimes') ? `keyTimes="${getAnimationProperty(animation, 'keyTimes')}"` : '',
            getAnimationProperty(animation, 'keySplines') ? `keySplines="${getAnimationProperty(animation, 'keySplines')}"` : '',
            getAnimationProperty(animation, 'values') ? `values="${getAnimationProperty(animation, 'values')}"` : '',
            getAnimationProperty(animation, 'additive') ? `additive="${getAnimationProperty(animation, 'additive')}"` : '',
            getAnimationProperty(animation, 'accumulate') ? `accumulate="${getAnimationProperty(animation, 'accumulate')}"` : '',
          ].filter(Boolean).join(' ');

          switch ((animation as any).type) {
            case 'animate':
              const animateAttrs = [
                `attributeName="${(animation as any).attributeName}"`,
                (animation as any).attributeType ? `attributeType="${(animation as any).attributeType}"` : '',
                (animation as any).from ? `from="${(animation as any).from}"` : '',
                (animation as any).to ? `to="${(animation as any).to}"` : '',
                (animation as any).by ? `by="${(animation as any).by}"` : '',
                commonAttrs
              ].filter(Boolean).join(' ');
              return `      <animate ${animateAttrs} />`;
              
            case 'animateTransform':
              const transformAttrs = [
                `attributeName="${(animation as any).attributeName}"`,
                (animation as any).attributeType ? `attributeType="${(animation as any).attributeType}"` : '',
                `type="${(animation as any).transformType}"`,
                (animation as any).from ? `from="${(animation as any).from}"` : '',
                (animation as any).to ? `to="${(animation as any).to}"` : '',
                (animation as any).by ? `by="${(animation as any).by}"` : '',
                commonAttrs
              ].filter(Boolean).join(' ');
              return `      <animateTransform ${transformAttrs} />`;
              
            case 'animateMotion':
              const motionAttrs = [
                (animation as any).path ? `path="${(animation as any).path}"` : '',
                (animation as any).keyPoints ? `keyPoints="${(animation as any).keyPoints}"` : '',
                (animation as any).rotate !== undefined ? `rotate="${(animation as any).rotate}"` : '',
                commonAttrs
              ].filter(Boolean).join(' ');
              
              // Handle mpath element if present
              const mpathElement = (animation as any).mpath ? `\n        <mpath href="#${(animation as any).mpath}" />` : '';
              const closingTag = (animation as any).mpath ? `${mpathElement}\n      </animateMotion>` : ' />';
              
              return (animation as any).mpath 
                ? `      <animateMotion ${motionAttrs}>${closingTag}`
                : `      <animateMotion ${motionAttrs} />`;
                
            case 'set':
              const setAttrs = [
                `attributeName="${(animation as any).attributeName}"`,
                (animation as any).attributeType ? `attributeType="${(animation as any).attributeType}"` : '',
                `to="${(animation as any).to}"`,
                getAnimationProperty(animation, 'begin') ? `begin="${getAnimationProperty(animation, 'begin')}"` : 'begin="0s"',
                animation.dur ? `dur="${animation.dur}"` : '',
                getAnimationProperty(animation, 'end') ? `end="${getAnimationProperty(animation, 'end')}"` : '',
                getAnimationProperty(animation, 'fill') ? `fill="${getAnimationProperty(animation, 'fill')}"` : '',
                getAnimationProperty(animation, 'restart') ? `restart="${getAnimationProperty(animation, 'restart')}"` : '',
              ].filter(Boolean).join(' ');
              return `      <set ${setAttrs} />`;
              
            default:
              return `      <!-- Unknown animation type: ${(animation as any).type} -->`;
          }
        }).join('\n');
        
        // Replace self-closing tags with opening/closing tags to inject animations
        const selfClosingRegex = new RegExp(`<(\\w+)([^>]*id="${targetId}"[^>]*) />`, 'g');
        const openCloseRegex = new RegExp(`<(\\w+)([^>]*id="${targetId}"[^>]*?)>([\\s\\S]*?)<\\/\\1>`, 'g');
        
        // Handle self-closing tags
        modifiedHtml = modifiedHtml.replace(selfClosingRegex, (match, tagName, attributes) => {
          return `<${tagName}${attributes}>\n${animationsHtml}\n    </${tagName}>`;
        });
        
        // Handle open/close tags - inject animations before closing tag
        modifiedHtml = modifiedHtml.replace(openCloseRegex, (match, tagName, attributes, content) => {
          return `<${tagName}${attributes}>${content}\n${animationsHtml}\n    </${tagName}>`;
        });
      });
      
      return modifiedHtml;
    };

    // Helper function to render animations for an element
    function renderAnimationsForElement(elementId: string, chainDelays: Map<string, number>): string {
      const elementAnimations = animations.filter(anim => anim.targetElementId === elementId);
      if (elementAnimations.length === 0) return '';
      
      const result = elementAnimations.map(animation => {
        // For SVG export, calculate proper begin times for sequential playback
        let beginValue = '0s';
        const chainDelay = chainDelays.get(animation.id);
        
        if (chainDelay !== undefined && chainDelay > 0) {
          // Convert from ms to seconds for SVG
          const delayInSeconds = chainDelay / 1000;
          beginValue = `${delayInSeconds}s`;
        } else {
          // Use original begin time or default to 0s
          beginValue = getAnimationProperty(animation, 'begin') || '0s';
        }

        const dur = getAnimationProperty(animation, 'dur') || '2s';
        const repeatCount = getAnimationProperty(animation, 'repeatCount') || '1';
        const fill = getAnimationProperty(animation, 'fill') || 'freeze';
        
        if (animation.type === 'animate') {
          const from = getAnimationProperty(animation, 'from') || '';
          const to = getAnimationProperty(animation, 'to') || '';
          const values = getAnimationProperty(animation, 'values') || '';
          const attributeName = getAnimationProperty(animation, 'attributeName') || '';
          
          const animateAttrs = [
            `attributeName="${attributeName}"`,
            from ? `from="${from}"` : '',
            to ? `to="${to}"` : '',
            values ? `values="${values}"` : '',
            `dur="${dur}"`,
            `begin="${beginValue}"`,
            `repeatCount="${repeatCount}"`,
            `fill="${fill}"`,
          ].filter(Boolean).join(' ');
          
          return `      <animate ${animateAttrs} />`;
        } else if (animation.type === 'animateTransform') {
          const from = getAnimationProperty(animation, 'from') || '';
          const to = getAnimationProperty(animation, 'to') || '';
          const values = getAnimationProperty(animation, 'values') || '';
          const transformType = getAnimationProperty(animation, 'transformType') || 'translate';
          
          const animateTransformAttrs = [
            `attributeName="transform"`,
            `type="${transformType}"`,
            from ? `from="${from}"` : '',
            to ? `to="${to}"` : '',
            values ? `values="${values}"` : '',
            `dur="${dur}"`,
            `begin="${beginValue}"`,
            `repeatCount="${repeatCount}"`,
            `fill="${fill}"`,
          ].filter(Boolean).join(' ');
          
          return `      <animateTransform ${animateTransformAttrs} />`;
        } else if (animation.type === 'animateMotion') {
          const path = getAnimationProperty(animation, 'path') || '';
          const rotate = getAnimationProperty(animation, 'rotate') || 'auto';
          const mpath = getAnimationProperty(animation, 'mpath') || '';
          
          const animateMotionAttrs = [
            path ? `path="${path}"` : '',
            `dur="${dur}"`,
            `begin="${beginValue}"`,
            `repeatCount="${repeatCount}"`,
            `fill="${fill}"`,
            `rotate="${rotate}"`,
          ].filter(Boolean).join(' ');
          
          const mpathElement = mpath ? `\n        <mpath href="#${mpath}" />` : '';
          
          return `      <animateMotion ${animateMotionAttrs}>${mpathElement}\n      </animateMotion>`;
        } else if (animation.type === 'set') {
          const to = getAnimationProperty(animation, 'to') || '';
          const attributeName = getAnimationProperty(animation, 'attributeName') || '';
          
          const setAttrs = [
            `attributeName="${attributeName}"`,
            `to="${to}"`,
            `begin="${beginValue}"`,
            `fill="${fill}"`,
          ].filter(Boolean).join(' ');
          
          return `      <set ${setAttrs} />`;
        }
        
        return '';
      }).filter(Boolean).join('\n');
      
      return result;
    }

    // Initialize z-indexes for elements that don't have them
    initializeZIndexes();

    // Function to render standalone elements ordered by z-index
    const renderElementsByZIndex = () => {
      const elementsInGroups = new Set<string>();
      groups.forEach(group => {
        group.children.forEach(child => {
          elementsInGroups.add(child.id);
        });
      });

      // Get standalone elements (not in any group) sorted by z-index
      const allOrderedElements = getAllElementsByZIndex();
      const standaloneElements = allOrderedElements.filter(el => !elementsInGroups.has(el.id));

      // Render each element according to its type
      const renderedElements = standaloneElements.map(({ type, element }) => {
        switch (type) {
          case 'path':
            return `  ${renderPath(element as any)}`;
          case 'text':
            return `  ${renderText(element as any)}`;
          case 'image':
            return `  ${renderImage(element as any)}`;
          case 'use':
            return `  ${renderUse(element as any)}`;
          default:
            return '';
        }
      }).filter(Boolean);

      return renderedElements.join('\n');
    };

    // Render standalone elements ordered by z-index
    const standaloneElementsByZIndex = renderElementsByZIndex();

    // Generate standalone textPath elements (these don't have z-index yet)
    const textPathElements = standaloneTextPaths.map((textPath) => {
      return `  ${renderTextPath(textPath)}`;
    }).join('\n');

    // Combine all elements for viewBox calculation
    const baseElements = [standaloneElementsByZIndex, textPathElements, groupElements].filter(Boolean).join('\n');
    
    // Animations are already injected by renderAnimationsForElement, so use baseElements directly
    const allElements = baseElements;

    // Create a temporary SVG with default viewBox to calculate proper bounds
    const tempSvgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
${definitions}${allElements}
</svg>`;

    // Calculate the proper viewBox using DOM-based method with precision
    const viewBoxData = calculateViewBoxFromSVGString(tempSvgContent, precision);
    
    // Use calculated viewBox or fallback to default
    const viewBoxString = viewBoxData ? viewBoxData.viewBox : "0 0 800 600";

    // Handle SVG root animations (viewBox animations, etc.)
    const svgRootAnimations = animations.filter(animation => animation.targetElementId === 'svg-root');
    const svgRootAnimationsHtml = svgRootAnimations.length > 0 ? svgRootAnimations.map(animation => {
      // Calculate begin time including chain delays for SVG root animations
      const chainDelays = calculateChainDelays();
      let beginValue = getAnimationProperty(animation, 'begin') || '';
      const chainDelay = chainDelays.get(animation.id);
      if (chainDelay !== undefined && chainDelay > 0) {
        // Convert from ms to seconds for SVG
        const delayInSeconds = chainDelay / 1000;
        beginValue = `${delayInSeconds}s`;
      } else if (!beginValue) {
        beginValue = '0s'; // Default begin time
      }

      const commonAttrs = [
        animation.dur ? `dur="${animation.dur}"` : 'dur="2s"',
        beginValue ? `begin="${beginValue}"` : '',
        getAnimationProperty(animation, 'end') ? `end="${getAnimationProperty(animation, 'end')}"` : '',
        getAnimationProperty(animation, 'repeatCount') ? `repeatCount="${getAnimationProperty(animation, 'repeatCount')}"` : '',
        getAnimationProperty(animation, 'repeatDur') ? `repeatDur="${getAnimationProperty(animation, 'repeatDur')}"` : '',
        getAnimationProperty(animation, 'fill') ? `fill="${getAnimationProperty(animation, 'fill')}"` : '',
        getAnimationProperty(animation, 'restart') ? `restart="${getAnimationProperty(animation, 'restart')}"` : '',
        getAnimationProperty(animation, 'calcMode') ? `calcMode="${getAnimationProperty(animation, 'calcMode')}"` : '',
        getAnimationProperty(animation, 'keyTimes') ? `keyTimes="${getAnimationProperty(animation, 'keyTimes')}"` : '',
        getAnimationProperty(animation, 'keySplines') ? `keySplines="${getAnimationProperty(animation, 'keySplines')}"` : '',
        getAnimationProperty(animation, 'values') ? `values="${getAnimationProperty(animation, 'values')}"` : '',
        getAnimationProperty(animation, 'additive') ? `additive="${getAnimationProperty(animation, 'additive')}"` : '',
        getAnimationProperty(animation, 'accumulate') ? `accumulate="${getAnimationProperty(animation, 'accumulate')}"` : '',
      ].filter(Boolean).join(' ');

      switch ((animation as any).type) {
        case 'animate':
          const animateAttrs = [
            `attributeName="${(animation as any).attributeName}"`,
            (animation as any).attributeType ? `attributeType="${(animation as any).attributeType}"` : '',
            (animation as any).from ? `from="${(animation as any).from}"` : '',
            (animation as any).to ? `to="${(animation as any).to}"` : '',
            (animation as any).by ? `by="${(animation as any).by}"` : '',
            commonAttrs
          ].filter(Boolean).join(' ');
          return `  <animate ${animateAttrs} />`;
          
        case 'animateTransform':
          const transformAttrs = [
            `attributeName="${(animation as any).attributeName}"`,
            (animation as any).attributeType ? `attributeType="${(animation as any).attributeType}"` : '',
            `type="${(animation as any).transformType}"`,
            (animation as any).from ? `from="${(animation as any).from}"` : '',
            (animation as any).to ? `to="${(animation as any).to}"` : '',
            (animation as any).by ? `by="${(animation as any).by}"` : '',
            commonAttrs
          ].filter(Boolean).join(' ');
          return `  <animateTransform ${transformAttrs} />`;
          
        case 'set':
          const setAttrs = [
            `attributeName="${(animation as any).attributeName}"`,
            (animation as any).attributeType ? `attributeType="${(animation as any).attributeType}"` : '',
            `to="${(animation as any).to}"`,
            getAnimationProperty(animation, 'begin') ? `begin="${getAnimationProperty(animation, 'begin')}"` : 'begin="0s"',
            animation.dur ? `dur="${animation.dur}"` : '',
            getAnimationProperty(animation, 'end') ? `end="${getAnimationProperty(animation, 'end')}"` : '',
            getAnimationProperty(animation, 'fill') ? `fill="${getAnimationProperty(animation, 'fill')}"` : '',
            getAnimationProperty(animation, 'restart') ? `restart="${getAnimationProperty(animation, 'restart')}"` : '',
          ].filter(Boolean).join(' ');
          return `  <set ${setAttrs} />`;
          
        default:
          return `  <!-- Unknown SVG root animation type: ${(animation as any).type} -->`;
      }
    }).join('\n') : '';

    const finalSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBoxString}">
${svgRootAnimationsHtml ? svgRootAnimationsHtml + '\n' : ''}${definitions}${allElements}
</svg>`;

    return finalSVG;
  };

  const handleSVGChange = (svgCode: string) => {
    try {
      // Validate SVG before parsing if enabled
      if (importSettings.validateBeforeImport) {
        if (!svgCode.trim()) {
          alert('SVG code is empty.');
          return;
        }
        
        if (!svgCode.includes('<svg')) {
          alert('Invalid SVG: Missing <svg> tag.');
          return;
        }
      }

      // Parse the complete SVG including paths, texts, textPaths, images, gradients, patterns, filters, groups, and animations
      const { paths: newPaths, texts: newTexts, textPaths: newTextPaths, images: newImages, gradients: newGradients, filters: newFilters, groups: newGroups, animations: newAnimations, animationChains: newAnimationChains } = parseCompleteSVG(svgCode);
      
      
      // Create a mapping of original filter IDs to new IDs for reference updates
      const filterIdMapping: Record<string, string> = {};
      
      // Helper function to update filter references in elements
      const updateFilterReferences = <T extends { style?: { filter?: string } }>(elements: T[]): T[] => {
        return elements.map(element => {
          if (element.style?.filter) {
            // Extract filter ID from url(#filterId) format
            const match = element.style.filter.match(/^url\(#(.+)\)$/);
            if (match && match[1]) {
              const originalId = match[1];
              const newId = filterIdMapping[originalId];
              if (newId) {
                return {
                  ...element,
                  style: {
                    ...element.style,
                    filter: `url(#${newId})`
                  }
                };
              }
            }
          }
          return element;
        });
      };
      
      const totalElements = newPaths.length + newTexts.length + newTextPaths.length + newGradients.length + newFilters.length + newGroups.length + newAnimations.length;
      
      if (totalElements === 0) {
        alert('No valid elements found in the SVG code. Make sure your SVG contains paths, text, textPaths, gradients, patterns, or groups.');
        return;
      }
      
      // Show confirmation dialog if enabled
      if (importSettings.showConfirmation) {
        const elementsInfo = [
          newPaths.length > 0 ? `${newPaths.length} path(s)` : '',
          newTexts.length > 0 ? `${newTexts.length} text element(s)` : '',
          newTextPaths.length > 0 ? `${newTextPaths.length} textPath element(s)` : '',
          newGradients.length > 0 ? `${newGradients.length} gradient(s)/pattern(s)` : '',
          newFilters.length > 0 ? `${newFilters.length} filter(s)` : '',
          newGroups.length > 0 ? `${newGroups.length} group(s)` : '',
          newAnimations.length > 0 ? `${newAnimations.length} animation(s)` : ''
        ].filter(Boolean).join(', ');
        
        const action = importSettings.mode === 'replace' ? 'replace all current content' : 'append to existing content';
        const confirmMessage = `This will ${action} with: ${elementsInfo}. Continue?`;
        
        if (!confirm(confirmMessage)) {
          return;
        }
      }
      
      // Update the store based on import mode
      if (importSettings.mode === 'replace') {
        // Clear existing filters first and add new ones to create ID mapping
        const currentFilters = [...filters];
        currentFilters.forEach(filter => removeFilter(filter.id));
        
        // Add new filters and create ID mapping
        newFilters.forEach(filter => {
          const originalId = filter.id;
          const newFilter = addFilter(filter);
          // Get the new filter ID from the store
          const storeState = useEditorStore.getState();
          const addedFilter = storeState.filters[storeState.filters.length - 1];
          if (addedFilter && addedFilter.id) {
            filterIdMapping[originalId] = addedFilter.id;
          }
        });
        
        
        // Update filter references in all elements before importing
        const updatedPaths = updateFilterReferences(newPaths);
        const updatedTexts = updateFilterReferences(newTexts);
        const updatedGroups = updateFilterReferences(newGroups);
        const updatedImages = updateFilterReferences(newImages); // Use newImages, not existing images
        
        
        // Clear existing animations and import new ones
        const currentAnimations = [...animations];
        currentAnimations.forEach(animation => removeAnimation(animation.id));
        
        // Create element ID mapping to track original -> final IDs
        const elementIdMapping: { [key: string]: string } = {};
        
        // Map element IDs from imported content to final IDs
        newPaths.forEach(path => {
          elementIdMapping[path.id] = path.id; // For now, paths keep their IDs
        });
        newTexts.forEach(text => {
          elementIdMapping[text.id] = text.id; // For now, texts keep their IDs  
        });
        newGroups.forEach(group => {
          elementIdMapping[group.id] = group.id; // For now, groups keep their IDs
        });
        

        // Create animation ID mapping for chains
        const animationIdMapping: { [key: string]: string } = {};
        
        // Import new animations with deduplication and track ID mapping
        newAnimations.forEach((animation: any) => {
          // Update target element ID if it exists in our element mapping
          const updatedAnimation = { ...animation };
          if (elementIdMapping[animation.targetElementId]) {
            updatedAnimation.targetElementId = elementIdMapping[animation.targetElementId];
          }
          
          // Also update mpath reference if it exists and is in our mapping
          if (updatedAnimation.mpath && elementIdMapping[updatedAnimation.mpath]) {
            const originalMpath = updatedAnimation.mpath;
            updatedAnimation.mpath = elementIdMapping[updatedAnimation.mpath];
          }
          
          // Remove the parsed ID to allow addAnimation to generate a new one and apply deduplication
          const { id: originalId, ...animationWithoutId } = updatedAnimation;
          const newId = addAnimation(animationWithoutId);
          animationIdMapping[originalId] = newId;
        });

        // Create auto-generated animation chains if any were detected, updating with new IDs
        if (newAnimationChains && newAnimationChains.length > 0) {
          newAnimationChains.forEach((chain: any) => {
            
            // Update animation IDs in the chain
            const updatedChainAnimations = chain.animations.map((chainAnim: any) => ({
              ...chainAnim,
              animationId: animationIdMapping[chainAnim.animationId] || chainAnim.animationId,
              dependsOn: chainAnim.dependsOn ? animationIdMapping[chainAnim.dependsOn] || chainAnim.dependsOn : chainAnim.dependsOn
            }));
            
            createAnimationChain(chain.name, updatedChainAnimations);
          });
        }
        
        // Replace existing content with updated references
        replacePaths(updatedPaths);
        replaceTexts(updatedTexts);
        replaceTextPaths(newTextPaths);
        setGradients(newGradients);
        replaceGroups(updatedGroups);
        replaceImages(updatedImages); // Replace images instead of updating existing ones
        
      } else {
        // Append to existing content
        // First add new filters and create ID mapping
        newFilters.forEach(filter => {
          const originalId = filter.id;
          const newFilter = addFilter(filter);
          // Get the new filter ID from the store
          const storeState = useEditorStore.getState();
          const addedFilter = storeState.filters[storeState.filters.length - 1];
          if (addedFilter && addedFilter.id) {
            filterIdMapping[originalId] = addedFilter.id;
          }
        });
        
        
        // Update filter references in all elements before merging
        const updatedPaths = updateFilterReferences(newPaths);
        const updatedTexts = updateFilterReferences(newTexts);
        const updatedGroups = updateFilterReferences(newGroups);
        const updatedNewImages = updateFilterReferences(newImages); // Update new images for filter references
        
        // For append mode, we need to merge the new content with existing content
        const currentPaths = [...paths];
        const currentTexts = [...texts];
        const currentTextPaths = [...textPaths];
        const currentGradients = [...gradients];
        const currentGroups = [...groups];
        const currentImages = [...images];
        
        
        // Create element ID mapping to track original -> final IDs (append mode)
        const elementIdMapping: { [key: string]: string } = {};
        
        // Map element IDs from imported content to final IDs
        newPaths.forEach(path => {
          elementIdMapping[path.id] = path.id; // For now, paths keep their IDs
        });
        newTexts.forEach(text => {
          elementIdMapping[text.id] = text.id; // For now, texts keep their IDs  
        });
        newGroups.forEach(group => {
          elementIdMapping[group.id] = group.id; // For now, groups keep their IDs
        });
        

        // Create animation ID mapping for chains  
        const animationIdMapping: { [key: string]: string } = {};
        
        // Import new animations (append mode doesn't clear existing animations) with deduplication
        newAnimations.forEach((animation: any) => {
          // Update target element ID if it exists in our element mapping
          const updatedAnimation = { ...animation };
          if (elementIdMapping[animation.targetElementId]) {
            updatedAnimation.targetElementId = elementIdMapping[animation.targetElementId];
          }
          
          // Also update mpath reference if it exists and is in our mapping
          if (updatedAnimation.mpath && elementIdMapping[updatedAnimation.mpath]) {
            const originalMpath = updatedAnimation.mpath;
            updatedAnimation.mpath = elementIdMapping[updatedAnimation.mpath];
          }
          
          // Remove the parsed ID to allow addAnimation to generate a new one and apply deduplication
          const { id: originalId, ...animationWithoutId } = updatedAnimation;
          const newId = addAnimation(animationWithoutId);
          animationIdMapping[originalId] = newId;
        });

        // Create auto-generated animation chains if any were detected, updating with new IDs
        if (newAnimationChains && newAnimationChains.length > 0) {
          newAnimationChains.forEach((chain: any) => {
            
            // Update animation IDs in the chain
            const updatedChainAnimations = chain.animations.map((chainAnim: any) => ({
              ...chainAnim,
              animationId: animationIdMapping[chainAnim.animationId] || chainAnim.animationId,
              dependsOn: chainAnim.dependsOn ? animationIdMapping[chainAnim.dependsOn] || chainAnim.dependsOn : chainAnim.dependsOn
            }));
            
            createAnimationChain(chain.name, updatedChainAnimations);
          });
        }
        
        // Merge with updated references
        replacePaths([...currentPaths, ...updatedPaths]);
        replaceTexts([...currentTexts, ...updatedTexts]);
        replaceTextPaths([...currentTextPaths, ...newTextPaths]);
        setGradients([...currentGradients, ...newGradients]);
        replaceGroups([...currentGroups, ...updatedGroups]);
        replaceImages([...currentImages, ...updatedNewImages]); // Merge existing and new images
        
      }
      
      // Auto-adjust viewport if enabled
      if (importSettings.autoAdjustViewport) {
        resetViewportCompletely();
      }
      
      
    } catch (error) {
      console.error('Error parsing SVG:', error);
      alert(`Error parsing SVG code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleClearAll = () => {
    const pathCount = paths.length;
    const textCount = texts.length;
    const groupCount = groups.length;
    const imageCount = images.length;
    const useCount = uses.length;
    const symbolCount = symbols.length;
    const totalElements = pathCount + textCount + groupCount + imageCount + useCount + symbolCount;
    
    if (totalElements === 0) {
      alert('No content to clear.');
      return;
    }
    
    // Clear all content by replacing with empty arrays (no confirmation needed)
    replacePaths([]);
    clearAllTexts();
    clearGradients();
    replaceGroups([]);
    clearAllSVGElements(); // This clears images, uses, symbols, etc.
    
    // Reset viewport completely to default state (zoom 1, pan 0,0, and default viewBox)
    resetViewportCompletely();
    
  };

  const handleUploadSVG = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const svgContent = e.target?.result as string;
      if (svgContent) {
        handleSVGChange(svgContent);
      }
    };
    reader.onerror = () => {
      alert('Error reading the file.');
    };
    reader.readAsText(file);
  };

  const handleSVGCodeDrop = (svgCode: string) => {
    handleSVGChange(svgCode);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'image/svg+xml' && !file.name.toLowerCase().endsWith('.svg')) {
      alert('Please select a valid SVG file.');
      return;
    }

    handleFileUpload(file);
    
    // Reset the input value so the same file can be selected again
    event.target.value = '';
  };

  const handleDownloadSVG = () => {
    // Use the unified SVG export function
    const editorState = { 
      paths, texts, textPaths, groups, gradients, images, symbols, markers, 
      clipPaths, masks, filters, uses, animations, precision, calculateChainDelays 
    };
    
    const svgContent = generateUnifiedSVG(editorState);
    downloadSVGFile(svgContent, 'svg-editor-export.svg');
  };


  const currentSVG = useMemo(() => {
    const editorState = { 
      paths, texts, textPaths, groups, gradients, images, symbols, markers, 
      clipPaths, masks, filters, uses, animations, precision, calculateChainDelays 
    };
    return generateUnifiedSVG(editorState);
  }, [paths, texts, textPaths, groups, gradients, images, symbols, markers, clipPaths, masks, filters, uses, animations, precision]);

  return (
    <div>
      {/* Import Options */}
      <div style={{ marginBottom: '16px' }}>
        <SVGImportOptions
          settings={importSettings}
          onSettingsChange={handleImportSettingsChange}
          onApplyDefaults={handleApplyDefaultSettings}
        />
      </div>

      {/* Drag & Drop Zone */}
      <div style={{ marginBottom: '16px' }}>
        <SVGDropZone
          onFileUpload={handleFileUpload}
          onSVGCodeDrop={handleSVGCodeDrop}
          disabled={false}
        />
      </div>

      {/* Upload/Download buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
        <button
          type="button"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px', fontSize: '13px', fontWeight: 500,
            background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%'
          }}
          onClick={handleUploadSVG}
        >
          <Upload size={16} style={{ verticalAlign: 'middle' }} /> Upload
        </button>
        <button
          type="button"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px', fontSize: '13px', fontWeight: 500,
            background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: (paths.length === 0 && texts.length === 0 && groups.length === 0) ? 'not-allowed' : 'pointer', width: '100%', opacity: (paths.length === 0 && texts.length === 0 && groups.length === 0) ? 0.6 : 1
          }}
          onClick={handleDownloadSVG}
          disabled={paths.length === 0 && texts.length === 0 && groups.length === 0}
        >
          <Download size={16} style={{ verticalAlign: 'middle' }} /> Download
        </button>
      </div>

      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".svg,image/svg+xml"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      
      <SVGEditor
        svgCode={currentSVG}
        onSVGChange={handleSVGChange}
      />
      
      <PrecisionControl
        precision={precision}
        onPrecisionChange={setPrecision}
      />
      
      <div style={{ marginTop: '8px' }}>
        <PluginButton
          icon={<Trash2 size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />}
          text="Clear All"
          color="#dc3545"
          active={false}
          disabled={false}
          onPointerDown={handleClearAll}
          fullWidth={true}
        />
      </div>
    </div>
  );
};

export const SVGPlugin: Plugin = {
  id: 'svg-editor',
  name: 'SVG',
  version: '1.0.0',
  enabled: true,
  
  shortcuts: [
    {
      key: 's',
      modifiers: ['ctrl', 'shift'],
      description: 'Focus SVG Editor',
      action: () => {
        // Focus the SVG textarea if visible
        const textarea = document.querySelector('#svg-editor textarea') as HTMLTextAreaElement;
        if (textarea) {
          textarea.focus();
        }
      }
    }
  ],
  
  ui: [
    {
      id: 'svg-editor',
      component: SVGComponent,
      position: 'sidebar',
      order: 4
    }
  ]
};
