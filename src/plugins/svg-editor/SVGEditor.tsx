import React, { useState, useEffect, useRef } from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { subPathToString } from '../../utils/path-utils';
import { parseSVGToSubPaths, parseCompleteSVG } from '../../utils/svg-parser';
import { calculateViewBoxFromSVGString } from '../../utils/viewbox-utils';
import { extractGradientsFromPaths } from '../../utils/gradient-utils';
import { PluginButton } from '../../components/PluginButton';
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
  const { paths, texts, gradients, viewport, replacePaths, replaceTexts, clearAllTexts, resetViewportCompletely, precision, setPrecision, setGradients, clearGradients } = useEditorStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Generate path elements
    const pathElements = paths.map((path) => {
      const pathData = path.subPaths.map(subPath => subPathToString(subPath)).join(' ');
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
      ].filter(Boolean).join(' ');
      
      return `  <path ${attributes} />`;
    }).join('\n');

    // Generate text elements
    const textElements = texts.map((text) => {
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
      ].filter(Boolean).join(' ');

      if (text.type === 'multiline') {
        const spans = text.spans.map((span, index) => {
          const spanFillValue = span.style?.fill ? convertStyleValue(span.style.fill) : '';
          
          const spanAttributes = [
            `x="${text.x}"`,
            `dy="${index === 0 ? 0 : (style.fontSize || 16) * 1.2}"`,
            spanFillValue && spanFillValue !== textFillValue ? `fill="${spanFillValue}"` : '',
            span.style?.fontWeight && span.style.fontWeight !== style.fontWeight ? `font-weight="${span.style.fontWeight}"` : '',
          ].filter(Boolean).join(' ');
          
          return `    <tspan ${spanAttributes}>${span.content}</tspan>`;
        }).join('\n');
        
        return `  <text ${attributes}>\n${spans}\n  </text>`;
      } else {
        return `  <text ${attributes}>${text.content}</text>`;
      }
    }).join('\n');

    // Extract gradients and patterns from paths and text elements
    const pathGradients = extractGradientsFromPaths(paths);
    const textGradients = texts.flatMap(text => {
      const gradients = [];
      if (text.style?.fill && typeof text.style.fill === 'string' && text.style.fill.startsWith('url(#')) {
        // This would need to be extracted from the actual gradient definitions
        // For now, we'll include the predefined gradients
      }
      if (text.style?.stroke && typeof text.style.stroke === 'string' && text.style.stroke.startsWith('url(#')) {
        // Similar for stroke gradients
      }
      return gradients;
    });

    // Add predefined gradients for text styling
    const predefinedGradients = [
      {
        id: 'text-gradient-1',
        type: 'linear' as const,
        x1: 0, y1: 0, x2: 100, y2: 0,
        stops: [
          { id: 'stop-1', offset: 0, color: '#ff6b6b', opacity: 1 },
          { id: 'stop-2', offset: 1, color: '#4ecdc4', opacity: 1 }
        ]
      },
      {
        id: 'text-gradient-2',
        type: 'linear' as const,
        x1: 0, y1: 0, x2: 100, y2: 100,
        stops: [
          { id: 'stop-3', offset: 0, color: '#667eea', opacity: 1 },
          { id: 'stop-4', offset: 1, color: '#764ba2', opacity: 1 }
        ]
      },
      {
        id: 'text-gradient-3',
        type: 'radial' as const,
        cx: 50, cy: 50, r: 50,
        stops: [
          { id: 'stop-5', offset: 0, color: '#ffeaa7', opacity: 1 },
          { id: 'stop-6', offset: 1, color: '#fab1a0', opacity: 1 }
        ]
      }
    ];

    // Only include predefined gradients if there are actually texts or paths that might use them
    const shouldIncludePredefined = paths.length > 0 || texts.length > 0;
    const gradientsToInclude = shouldIncludePredefined ? predefinedGradients : [];
    
    // Deduplicate gradients by id to avoid duplicates
    const allGradientsArray = [...pathGradients, ...textGradients, ...gradientsToInclude, ...gradients];
    const allGradients = allGradientsArray.filter((gradient, index, array) => 
      array.findIndex(g => g.id === gradient.id) === index
    );

    // Generate gradient and pattern definitions
    const generateDefinitions = () => {
      if (allGradients.length === 0) return '';
      
      const defs = allGradients.map(gradient => {
        switch (gradient.type) {
          case 'linear':
            const linearStops = gradient.stops.map(stop => 
              `    <stop offset="${stop.offset}%" stop-color="${stop.color}" stop-opacity="${stop.opacity}" />`
            ).join('\n');
            return `  <linearGradient id="${gradient.id}" x1="${gradient.x1}" y1="${gradient.y1}" x2="${gradient.x2}" y2="${gradient.y2}" gradientUnits="${gradient.gradientUnits || 'objectBoundingBox'}">\n${linearStops}\n  </linearGradient>`;
          
          case 'radial':
            const radialStops = gradient.stops.map(stop => 
              `    <stop offset="${stop.offset}%" stop-color="${stop.color}" stop-opacity="${stop.opacity}" />`
            ).join('\n');
            // Only include fx/fy if they exist and are different from cx/cy
            const fxAttr = (gradient.fx !== undefined && gradient.fx !== gradient.cx) ? ` fx="${gradient.fx}"` : '';
            const fyAttr = (gradient.fy !== undefined && gradient.fy !== gradient.cy) ? ` fy="${gradient.fy}"` : '';
            return `  <radialGradient id="${gradient.id}" cx="${gradient.cx}" cy="${gradient.cy}" r="${gradient.r}"${fxAttr}${fyAttr} gradientUnits="${gradient.gradientUnits || 'objectBoundingBox'}">\n${radialStops}\n  </radialGradient>`;
          
          case 'pattern':
            return `  <pattern id="${gradient.id}" width="${gradient.width}" height="${gradient.height}" patternUnits="${gradient.patternUnits || 'userSpaceOnUse'}"${gradient.patternContentUnits ? ` patternContentUnits="${gradient.patternContentUnits}"` : ''}${gradient.patternTransform ? ` patternTransform="${gradient.patternTransform}"` : ''}>\n    ${gradient.content}\n  </pattern>`;
          
          default:
            return '';
        }
      }).filter(Boolean).join('\n');
      
      return `  <defs>\n${defs}\n  </defs>\n`;
    };

    const definitions = generateDefinitions();

    // Combine all elements for viewBox calculation
    const allElements = [pathElements, textElements].filter(Boolean).join('\n');

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
      // Parse the complete SVG including paths, texts, gradients, and patterns
      const { paths: newPaths, texts: newTexts, gradients } = parseCompleteSVG(svgCode);
      
      const totalElements = newPaths.length + newTexts.length + gradients.length;
      
      if (totalElements === 0) {
        alert('No valid elements found in the SVG code. Make sure your SVG contains paths, text, gradients, or patterns.');
        return;
      }
      
      // Show confirmation for destructive action
      const elementsInfo = [
        newPaths.length > 0 ? `${newPaths.length} path(s)` : '',
        newTexts.length > 0 ? `${newTexts.length} text element(s)` : '',
        gradients.length > 0 ? `${gradients.length} gradient(s)/pattern(s)` : ''
      ].filter(Boolean).join(', ');
      
      const confirmMessage = `This will replace all current content with: ${elementsInfo}. Continue?`;
      if (!confirm(confirmMessage)) {
        return;
      }
      
      // Update the store with the new content
      replacePaths(newPaths);
      replaceTexts(newTexts);
      setGradients(gradients);
      
      console.log(`Imported: ${newPaths.length} paths, ${newTexts.length} texts, ${gradients.length} gradients/patterns`);
      
    } catch (error) {
      console.error('Error parsing SVG:', error);
      alert(`Error parsing SVG code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleClearAll = () => {
    const pathCount = paths.length;
    const textCount = texts.length;
    const totalElements = pathCount + textCount;
    
    if (totalElements === 0) {
      alert('No content to clear.');
      return;
    }
    
    // Clear all content by replacing with empty arrays (no confirmation needed)
    replacePaths([]);
    clearAllTexts();
    clearGradients();
    
    // Reset viewport completely to default state (zoom 1, pan 0,0, and default viewBox)
    resetViewportCompletely();
    
  };

  const handleUploadSVG = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'image/svg+xml' && !file.name.toLowerCase().endsWith('.svg')) {
      alert('Please select a valid SVG file.');
      return;
    }

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
            background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: (paths.length === 0 && texts.length === 0) ? 'not-allowed' : 'pointer', width: '100%', opacity: (paths.length === 0 && texts.length === 0) ? 0.6 : 1
          }}
          onClick={handleDownloadSVG}
          disabled={paths.length === 0 && texts.length === 0}
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
