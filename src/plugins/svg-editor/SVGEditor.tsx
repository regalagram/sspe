import React, { useState, useEffect } from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { pathToString, subPathToString } from '../../utils/path-utils';
import { parseSVGToSubPaths } from '../../utils/svg-parser';
import { DraggablePanel } from '../../components/DraggablePanel';
import { PluginButton } from '../../components/PluginButton';
import { RotateCcw, CheckCircle2, Trash2 } from 'lucide-react';
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
  };

  const handleReset = () => {
    setInputValue(2);
  };

  const handleApply = () => {
    onPrecisionChange(inputValue);
    try {
      const prefs = loadPreferences();
      savePreferences({ ...prefs, precision: inputValue });
    } catch {}
  };

  const controlStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '12px',
    padding: '8px',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
    border: '1px solid #e9ecef'
  };

  const topRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  const bottomRowStyle: React.CSSProperties = {
    display: 'flex',
    gap: '6px',
    justifyContent: 'flex-end'
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    color: '#666',
    fontWeight: '500',
    minWidth: '55px'
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
    <div style={controlStyle}>
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
      <div style={bottomRowStyle}>
        <button
          onClick={handleReset}
          style={{
            fontSize: '10px',
            padding: '2px 6px',
            border: '1px solid #ddd',
            borderRadius: '3px',
            background: '#f8f9fa',
            cursor: 'pointer'
          }}
          title="Reset to default (2)"
        >
          Reset
        </button>
        <button
          onClick={handleApply}
          disabled={inputValue === precision}
          style={{
            fontSize: '10px',
            padding: '2px 8px',
            border: '1px solid #2196f3',
            borderRadius: '3px',
            background: inputValue !== precision ? '#2196f3' : '#f8f9fa',
            color: inputValue !== precision ? 'white' : '#666',
            cursor: inputValue !== precision ? 'pointer' : 'not-allowed'
          }}
          title="Apply precision changes"
        >
          Apply
        </button>
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Apply changes on Ctrl+Enter
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      handleApplyChanges();
    }
    // Revert changes on Escape
    if (e.key === 'Escape') {
      e.preventDefault();
      handleRevert();
    }
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

  // Generate SVG string from current paths
  const generateSVGCode = (): string => {
    const { viewBox } = viewport;
    
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

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}">
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
      
      console.log('SVG successfully updated with', newPaths.length, 'paths');
      
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
    
    // Show confirmation for destructive action
    const confirmMessage = `This will permanently delete all ${pathCount} path(s) and leave an empty SVG. This action cannot be undone. Are you sure?`;
    if (!confirm(confirmMessage)) {
      return;
    }
    
    // Clear all paths by replacing with empty array
    replacePaths([]);
    
    // Reset viewport completely to default state (zoom 1, pan 0,0, and default viewBox)
    resetViewportCompletely();
    
    console.log('All paths cleared and viewport reset successfully');
  };

  const currentSVG = generateSVGCode();

  return (
    <DraggablePanel 
      title="SVG"
      initialPosition={{ x: 980, y: 300 }}
      id="svg-editor"
    >
      <PrecisionControl
        precision={precision}
        onPrecisionChange={setPrecision}
      />
      <SVGEditor
        svgCode={currentSVG}
        onSVGChange={handleSVGChange}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
        <PluginButton
          icon={<Trash2 size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />}
          text="Clear All Paths"
          color="#dc3545"
          active={false}
          disabled={false}
          onClick={handleClearAll}
        />
      </div>
    </DraggablePanel>
  );
};

export const SVGPlugin: Plugin = {
  id: 'svg-editor',
  name: 'SVG Editor',
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
