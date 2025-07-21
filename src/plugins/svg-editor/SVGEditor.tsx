import React, { useState, useEffect, useRef } from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { subPathToString } from '../../utils/path-utils';
import { parseSVGToSubPaths, parseCompleteSVG } from '../../utils/svg-parser';
import { calculateViewBoxFromSVGString } from '../../utils/viewbox-utils';
import { extractGradientsFromPaths } from '../../utils/gradient-utils';
import { PluginButton } from '../../components/PluginButton';
import { SVGDropZone } from '../../components/SVGDropZone';
import { SVGImportOptions, ImportSettings } from '../../components/SVGImportOptions';
import { RotateCcw, CheckCircle2, Trash2, Upload, Download } from 'lucide-react';

interface PrecisionControlProps {
  precision: number;
  onPrecisionChange: (precision: number) => void;
}

const PrecisionControl: React.FC<PrecisionControlProps> = ({ precision, onPrecisionChange }) => {
  const [inputValue, setInputValue] = useState(precision);

  // Update input when precision prop changes
  useEffect(() => {
    setInputValue(precision);
  }, [precision]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 0) val = 0;
    if (val > 8) val = 8;
    setInputValue(val);
    
    // Auto-apply the change immediately
    onPrecisionChange(val);
  };

  const topRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    marginBottom: '8px',
    marginTop: '8px'
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    color: '#666',
    fontWeight: '500'
  };

  const inputStyle: React.CSSProperties = {
    padding: '4px 8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '12px',
    width: '50px',
    textAlign: 'center' as const
  };

  return (
    <div >
      <div style={topRowStyle}>
        <label style={labelStyle}>
          Precision
        </label>
        <input
          type="number"
          min={0}
          max={8}
          value={inputValue}
          onChange={handleChange}
          style={inputStyle}
        />
      </div>
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
  const { paths, texts, textPaths, groups, gradients, images, symbols, markers, clipPaths, masks, filters, uses, viewport, replacePaths, replaceTexts, replaceTextPaths, replaceGroups, clearAllTexts, resetViewportCompletely, precision, setPrecision, setGradients, clearGradients, addText, addGradient, addImage, addSymbol, addMarker, addClipPath, addMask, addFilter, addUse } = useEditorStore();
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
        `d="${pathData}"`,
        fillValue !== 'none' ? `fill="${fillValue}"` : 'fill="none"',
        strokeValue !== 'none' ? `stroke="${strokeValue}"` : '',
        style.strokeWidth ? `stroke-width="${style.strokeWidth}"` : '',
        style.strokeDasharray ? `stroke-dasharray="${style.strokeDasharray}"` : '',
        style.strokeLinecap ? `stroke-linecap="${style.strokeLinecap}"` : '',
        style.strokeLinejoin ? `stroke-linejoin="${style.strokeLinejoin}"` : '',
        style.fillOpacity !== undefined && style.fillOpacity !== 1 ? `fill-opacity="${style.fillOpacity}"` : '',
        style.strokeOpacity !== undefined && style.strokeOpacity !== 1 ? `stroke-opacity="${style.strokeOpacity}"` : '',
        style.markerStart ? `marker-start="${convertStyleValue(style.markerStart)}"` : '',
        style.markerMid ? `marker-mid="${convertStyleValue(style.markerMid)}"` : '',
        style.markerEnd ? `marker-end="${convertStyleValue(style.markerEnd)}"` : '',
        style.filter ? `filter="${convertStyleValue(style.filter)}"` : '',
        style.clipPath ? `clip-path="${convertStyleValue(style.clipPath)}"` : '',
        style.mask ? `mask="${convertStyleValue(style.mask)}"` : '',
      ].filter(Boolean).join(' ');
      
      return `<path ${attributes} />`;
    };

    const renderText = (text: any) => {
      const style = text.style || {};
      
      const textFillValue = convertStyleValue(style.fill);
      const textStrokeValue = convertStyleValue(style.stroke);
      
      const attributes = [
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
        
        return `<text ${attributes}>\n${spans}\n  </text>`;
      } else {
        return `<text ${attributes}>${text.content}</text>`;
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
      
      return `<image ${attributes} />`;
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
      
      return `<use ${attributes} />`;
    };

    // Render textPath elements
    const renderTextPath = (textPath: any) => {
      const style = textPath.style || {};
      const textFillValue = convertStyleValue(style.fill);
      const textStrokeValue = convertStyleValue(style.stroke);
      
      const textAttributes = [
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
      
      return `<text ${textAttributes}><textPath ${textPathAttributes}>${textPath.content}</textPath></text>`;
    };

    // Collect elements that are NOT in any group
    const elementsInGroups = new Set<string>();
    groups.forEach(group => {
      group.children.forEach((child: any) => {
        elementsInGroups.add(child.id);
      });
    });

    // Filter standalone elements (not in any group)
    const standalonePaths = paths.filter(path => !elementsInGroups.has(path.id));
    const standaloneTexts = texts.filter(text => !elementsInGroups.has(text.id));
    const standaloneTextPaths = textPaths.filter(textPath => !elementsInGroups.has(textPath.id));
    const standaloneImages = images.filter(image => !elementsInGroups.has(image.id));
    const standaloneUses = uses.filter(use => !elementsInGroups.has(use.id));

    // Generate standalone path elements
    const standalonePathElements = standalonePaths.map((path) => {
      return `  ${renderPath(path)}`;
    }).join('\n');

    // Generate standalone text elements
    const textElements = standaloneTexts.map((text) => {
      return `  ${renderText(text)}`;
    }).join('\n');

    // Generate standalone textPath elements
    const textPathElements = standaloneTextPaths.map((textPath) => {
      return `  ${renderTextPath(textPath)}`;
    }).join('\n');

    // Generate standalone image elements
    const imageElements = standaloneImages.map((image) => {
      return `  ${renderImage(image)}`;
    }).join('\n');

    // Generate standalone use elements
    const useElements = standaloneUses.map((use) => {
      return `  ${renderUse(use)}`;
    }).join('\n');

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
            groupElements.push(`    <g${nestedAttrStr}>\n${nestedContent}\n    </g>`);
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
      
      return `  <g${groupAttrStr}>\n${groupContent}\n  </g>`;
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

    // Collect all gradient IDs that are actually used
    const usedGradientIds = new Set<string>();

    // Check standalone paths
    standalonePaths.forEach(path => {
      extractGradientIds(path.style.fill).forEach(id => usedGradientIds.add(id));
      extractGradientIds(path.style.stroke).forEach(id => usedGradientIds.add(id));
    });

    // Check standalone texts
    standaloneTexts.forEach(text => {
      extractGradientIds(text.style?.fill).forEach(id => usedGradientIds.add(id));
      extractGradientIds(text.style?.stroke).forEach(id => usedGradientIds.add(id));
      // Check multiline text spans
      if (text.type === 'multiline-text') {
        text.spans.forEach(span => {
          extractGradientIds(span.style?.fill).forEach(id => usedGradientIds.add(id));
          extractGradientIds(span.style?.stroke).forEach(id => usedGradientIds.add(id));
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
          }
        } else if (child.type === 'text') {
          const text = texts.find(t => t.id === child.id);
          if (text) {
            extractGradientIds(text.style?.fill).forEach(id => usedGradientIds.add(id));
            extractGradientIds(text.style?.stroke).forEach(id => usedGradientIds.add(id));
            if (text.type === 'multiline-text') {
              text.spans.forEach(span => {
                extractGradientIds(span.style?.fill).forEach(id => usedGradientIds.add(id));
                extractGradientIds(span.style?.stroke).forEach(id => usedGradientIds.add(id));
              });
            }
          }
        }
      });
    });

    // Only include gradients that are actually used
    const allGradients = gradients.filter(gradient => usedGradientIds.has(gradient.id));

    // Generate all definitions (gradients, symbols, markers, filters, clip paths, masks)
    const generateDefinitions = () => {
      const allDefs: string[] = [];
      
      // Add gradients and patterns
      if (allGradients.length > 0) {
        const gradientDefs = allGradients.map(gradient => {
          switch (gradient.type) {
            case 'linear':
              const linearStops = gradient.stops.map(stop => 
                `    <stop offset="${stop.offset}%" stop-color="${stop.color}" stop-opacity="${stop.opacity ?? 1}" />`
              ).join('\n');
              return `  <linearGradient id="${gradient.id}" x1="${gradient.x1}%" y1="${gradient.y1}%" x2="${gradient.x2}%" y2="${gradient.y2}%" gradientUnits="${gradient.gradientUnits || 'objectBoundingBox'}">\n${linearStops}\n  </linearGradient>`;
            
            case 'radial':
              const radialStops = gradient.stops.map(stop => 
                `    <stop offset="${stop.offset}%" stop-color="${stop.color}" stop-opacity="${stop.opacity ?? 1}" />`
              ).join('\n');
              const fxAttr = (gradient.fx !== undefined && gradient.fx !== gradient.cx) ? ` fx="${gradient.fx}%"` : '';
              const fyAttr = (gradient.fy !== undefined && gradient.fy !== gradient.cy) ? ` fy="${gradient.fy}%"` : '';
              return `  <radialGradient id="${gradient.id}" cx="${gradient.cx}%" cy="${gradient.cy}%" r="${gradient.r}%"${fxAttr}${fyAttr} gradientUnits="${gradient.gradientUnits || 'objectBoundingBox'}">\n${radialStops}\n  </radialGradient>`;
            
            case 'pattern':
              return `  <pattern id="${gradient.id}" width="${gradient.width}" height="${gradient.height}" patternUnits="${gradient.patternUnits || 'userSpaceOnUse'}"${gradient.patternContentUnits ? ` patternContentUnits="${gradient.patternContentUnits}"` : ''}${gradient.patternTransform ? ` patternTransform="${gradient.patternTransform}"` : ''}>\n    ${gradient.content}\n  </pattern>`;
            
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
                `d="${pathData}"`,
                fillValue !== 'none' ? `fill="${fillValue}"` : 'fill="none"',
                strokeValue !== 'none' ? `stroke="${strokeValue}"` : '',
                style.strokeWidth ? `stroke-width="${style.strokeWidth}"` : '',
                style.fillOpacity !== undefined && style.fillOpacity !== 1 ? `fill-opacity="${style.fillOpacity}"` : '',
                style.strokeOpacity !== undefined && style.strokeOpacity !== 1 ? `stroke-opacity="${style.strokeOpacity}"` : '',
              ].filter(Boolean).join(' ');
              
              return `    <path ${pathAttrs} />`;
            }
            return '';
          }).filter(Boolean).join('\n');
          
          const symbolAttrs = [
            `id="${symbol.id}"`,
            symbol.viewBox ? `viewBox="${symbol.viewBox}"` : '',
            symbol.preserveAspectRatio ? `preserveAspectRatio="${symbol.preserveAspectRatio}"` : '',
          ].filter(Boolean).join(' ');
          
          return `  <symbol ${symbolAttrs}>\n${symbolContent}\n  </symbol>`;
        });
        allDefs.push(...symbolDefs);
      }
      
      // Add markers
      if (markers.length > 0) {
        const markerDefs = markers.map(marker => {
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
      if (filters.length > 0) {
        const filterDefs = filters.map(filter => {
          const primitiveContent = filter.primitives.map((primitive: any) => {
            switch (primitive.type) {
              case 'feGaussianBlur':
                return `    <feGaussianBlur stdDeviation="${primitive.stdDeviation}"${primitive.in ? ` in="${primitive.in}"` : ''}${primitive.result ? ` result="${primitive.result}"` : ''} />`;
              case 'feOffset':
                return `    <feOffset dx="${primitive.dx}" dy="${primitive.dy}"${primitive.in ? ` in="${primitive.in}"` : ''}${primitive.result ? ` result="${primitive.result}"` : ''} />`;
              case 'feFlood':
                return `    <feFlood flood-color="${primitive.floodColor}" flood-opacity="${primitive.floodOpacity ?? 1}"${primitive.result ? ` result="${primitive.result}"` : ''} />`;
              case 'feComposite':
                return `    <feComposite operator="${primitive.operator}"${primitive.in ? ` in="${primitive.in}"` : ''}${primitive.in2 ? ` in2="${primitive.in2}"` : ''}${primitive.result ? ` result="${primitive.result}"` : ''} />`;
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
                return `    <feDiffuseLighting surface-scale="${primitive.surfaceScale || 1}" diffuse-constant="${primitive.diffuseConstant || 1}" lighting-color="${primitive.lightColor || '#ffffff'}"${primitive.in ? ` in="${primitive.in}"` : ''}${primitive.result ? ` result="${primitive.result}"` : ''}>\n      ${diffuseLightSource}\n    </feDiffuseLighting>`;
              case 'feSpecularLighting':
                const specularLightSource = primitive.lightSource.type === 'feDistantLight' 
                  ? `<feDistantLight azimuth="${primitive.lightSource.azimuth || 45}" elevation="${primitive.lightSource.elevation || 45}" />`
                  : primitive.lightSource.type === 'fePointLight'
                  ? `<fePointLight x="${primitive.lightSource.x || 0}" y="${primitive.lightSource.y || 0}" z="${primitive.lightSource.z || 1}" />`
                  : `<feSpotLight x="${primitive.lightSource.x || 0}" y="${primitive.lightSource.y || 0}" z="${primitive.lightSource.z || 1}" pointsAtX="${primitive.lightSource.pointsAtX || 0}" pointsAtY="${primitive.lightSource.pointsAtY || 0}" pointsAtZ="${primitive.lightSource.pointsAtZ || 0}" />`;
                return `    <feSpecularLighting surface-scale="${primitive.surfaceScale || 1}" specular-constant="${primitive.specularConstant || 1}" specular-exponent="${primitive.specularExponent || 1}" lighting-color="${primitive.lightColor || '#ffffff'}"${primitive.in ? ` in="${primitive.in}"` : ''}${primitive.result ? ` result="${primitive.result}"` : ''}>\n      ${specularLightSource}\n    </feSpecularLighting>`;
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
      if (clipPaths.length > 0) {
        const clipPathDefs = clipPaths.map(clipPath => {
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
      if (masks.length > 0) {
        const maskDefs = masks.map(mask => {
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

    const definitions = generateDefinitions();

    // Combine all elements for viewBox calculation
    const allElements = [standalonePathElements, textElements, textPathElements, imageElements, useElements, groupElements].filter(Boolean).join('\n');

    // Create a temporary SVG with default viewBox to calculate proper bounds
    const tempSvgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
${definitions}${allElements}
</svg>`;

    // Calculate the proper viewBox using DOM-based method with precision
    const viewBoxData = calculateViewBoxFromSVGString(tempSvgContent, precision);
    
    // Use calculated viewBox or fallback to default
    const viewBoxString = viewBoxData ? viewBoxData.viewBox : "0 0 800 600";

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBoxString}">
${definitions}${allElements}
</svg>`;
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

      // Parse the complete SVG including paths, texts, gradients, patterns, and groups
      const { paths: newPaths, texts: newTexts, gradients: newGradients, groups: newGroups } = parseCompleteSVG(svgCode);
      
      const totalElements = newPaths.length + newTexts.length + newGradients.length + newGroups.length;
      
      if (totalElements === 0) {
        alert('No valid elements found in the SVG code. Make sure your SVG contains paths, text, gradients, patterns, or groups.');
        return;
      }
      
      // Show confirmation dialog if enabled
      if (importSettings.showConfirmation) {
        const elementsInfo = [
          newPaths.length > 0 ? `${newPaths.length} path(s)` : '',
          newTexts.length > 0 ? `${newTexts.length} text element(s)` : '',
          newGradients.length > 0 ? `${newGradients.length} gradient(s)/pattern(s)` : '',
          newGroups.length > 0 ? `${newGroups.length} group(s)` : ''
        ].filter(Boolean).join(', ');
        
        const action = importSettings.mode === 'replace' ? 'replace all current content' : 'append to existing content';
        const confirmMessage = `This will ${action} with: ${elementsInfo}. Continue?`;
        
        if (!confirm(confirmMessage)) {
          return;
        }
      }
      
      // Update the store based on import mode
      if (importSettings.mode === 'replace') {
        // Replace existing content
        replacePaths(newPaths);
        replaceTexts(newTexts);
        setGradients(newGradients);
        replaceGroups(newGroups);
      } else {
        // Append to existing content
        // For append mode, we need to merge the new content with existing content
        const currentPaths = [...paths];
        const currentTexts = [...texts];
        const currentGradients = [...gradients];
        const currentGroups = [...groups];
        
        // Merge paths
        replacePaths([...currentPaths, ...newPaths]);
        
        // Merge texts
        replaceTexts([...currentTexts, ...newTexts]);
        
        // Merge gradients  
        setGradients([...currentGradients, ...newGradients]);
        
        // Merge groups
        replaceGroups([...currentGroups, ...newGroups]);
      }
      
      // Auto-adjust viewport if enabled
      if (importSettings.autoAdjustViewport) {
        resetViewportCompletely();
      }
      
      console.log(`Imported (${importSettings.mode}): ${newPaths.length} paths, ${newTexts.length} texts, ${newGradients.length} gradients/patterns, ${newGroups.length} groups`);
      
    } catch (error) {
      console.error('Error parsing SVG:', error);
      alert(`Error parsing SVG code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleClearAll = () => {
    const pathCount = paths.length;
    const textCount = texts.length;
    const groupCount = groups.length;
    const totalElements = pathCount + textCount + groupCount;
    
    if (totalElements === 0) {
      alert('No content to clear.');
      return;
    }
    
    // Clear all content by replacing with empty arrays (no confirmation needed)
    replacePaths([]);
    clearAllTexts();
    clearGradients();
    replaceGroups([]);
    
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
    const svgContent = generateSVGCode();
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'svg-editor-export.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the object URL
    URL.revokeObjectURL(url);
  };

  const currentSVG = generateSVGCode();

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
