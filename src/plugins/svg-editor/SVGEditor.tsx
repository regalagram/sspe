import React, { useState, useEffect, useRef } from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { subPathToString } from '../../utils/path-utils';
import { parseSVGToSubPaths } from '../../utils/svg-parser';
import { calculateViewBoxFromSVGString } from '../../utils/viewbox-utils';
import { PluginButton } from '../../components/PluginButton';
import { RotateCcw, CheckCircle2, Trash2, Upload, Download } from 'lucide-react';
import { savePreferences, loadPreferences } from '../../utils/persistence';

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
            onClick={handleRevert}
          />
          <PluginButton
            icon={<CheckCircle2 size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />}
            text="Apply"
            color="#28a745"
            active={false}
            disabled={false}
            onClick={handleApplyChanges}
          />
        </div>
      )}
    </div>
  );
};

export const SVGComponent: React.FC = () => {
  const { paths, viewport, replacePaths, resetViewportCompletely, precision, setPrecision } = useEditorStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate SVG string from current paths
  const generateSVGCode = (): string => {
    // First, generate a basic SVG to calculate the proper viewBox
    const pathElements = paths.map((path) => {
      // Crear una cadena con todos los sub-paths del path
      const pathData = path.subPaths.map(subPath => subPathToString(subPath)).join(' ');
      const style = path.style;
      
      const attributes = [
        `d="${pathData}"`,
        style.fill && style.fill !== 'none' ? `fill="${style.fill}"` : 'fill="none"',
        style.stroke && style.stroke !== 'none' ? `stroke="${style.stroke}"` : '',
        style.strokeWidth ? `stroke-width="${style.strokeWidth}"` : '',
        style.strokeDasharray ? `stroke-dasharray="${style.strokeDasharray}"` : '',
        style.strokeLinecap ? `stroke-linecap="${style.strokeLinecap}"` : '',
        style.strokeLinejoin ? `stroke-linejoin="${style.strokeLinejoin}"` : '',
        style.fillOpacity !== undefined && style.fillOpacity !== 1 ? `fill-opacity="${style.fillOpacity}"` : '',
        style.strokeOpacity !== undefined && style.strokeOpacity !== 1 ? `stroke-opacity="${style.strokeOpacity}"` : '',
      ].filter(Boolean).join(' ');
      
      return `  <path ${attributes} />`;
    }).join('\n');

    // Create a temporary SVG with default viewBox to calculate proper bounds
    const tempSvgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
${pathElements}
</svg>`;

    // Calculate the proper viewBox using DOM-based method with precision
    const viewBoxData = calculateViewBoxFromSVGString(tempSvgContent, precision);
    
    // Use calculated viewBox or fallback to default
    const viewBoxString = viewBoxData ? viewBoxData.viewBox : "0 0 800 600";

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBoxString}">
${pathElements}
</svg>`;
  };

  const handleSVGChange = (svgCode: string) => {
    try {
      // Parse the SVG string into SVGPath array
      const newPaths = parseSVGToSubPaths(svgCode);
      
      if (newPaths.length === 0) {
        alert('No valid paths found in the SVG code. Make sure your SVG contains <path> elements.');
        return;
      }
      
      // Show confirmation for destructive action
      const confirmMessage = `This will replace all current paths with ${newPaths.length} new path(s). Continue?`;
      if (!confirm(confirmMessage)) {
        return;
      }
      
      // Update the store with the new paths
      replacePaths(newPaths);
      
      
    } catch (error) {
      console.error('Error parsing SVG:', error);
      alert(`Error parsing SVG code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleClearAll = () => {
    const pathCount = paths.length;
    
    if (pathCount === 0) {
      alert('No paths to clear.');
      return;
    }
    
    // Clear all paths by replacing with empty array (no confirmation needed)
    replacePaths([]);
    
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
        <PluginButton
          icon={<Upload size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />}
          text="Upload"
          color="#007bff"
          active={false}
          disabled={false}
          onClick={handleUploadSVG}
          fullWidth={true}
        />
        <PluginButton
          icon={<Download size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />}
          text="Download"
          color="#28a745"
          active={false}
          disabled={paths.length === 0}
          onClick={handleDownloadSVG}
          fullWidth={true}
        />
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
          onClick={handleClearAll}
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
