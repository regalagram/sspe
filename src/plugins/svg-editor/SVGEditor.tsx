import React, { useState, useEffect } from 'react';
import { Plugin } from '../../core/PluginSystem';
import { useEditorStore } from '../../store/editorStore';
import { pathToString, subPathToString } from '../../utils/path-utils';
import { parseSVGToSubPaths } from '../../utils/svg-parser';
import { DraggablePanel } from '../../components/DraggablePanel';

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
        <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
          SVG Code:
        </div>
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
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={handleApplyChanges}
            style={{
              flex: 1,
              padding: '6px 12px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
            }}
            title="Apply changes (Ctrl+Enter)"
          >
            Apply
          </button>
          <button
            onClick={handleRevert}
            style={{
              flex: 1,
              padding: '6px 12px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
            }}
            title="Revert changes (Escape)"
          >
            Revert
          </button>
        </div>
      )}

      <div style={{ fontSize: '11px', color: '#999', lineHeight: '1.3' }}>
        <strong>Tips:</strong>
        <br />• Ctrl+Enter to apply changes
        <br />• Escape to revert changes
        <br />• Changes will replace all current paths
        <br />• Only &lt;path&gt; elements are supported
      </div>
    </div>
  );
};

export const SVGComponent: React.FC = () => {
  const { paths, viewport, replacePaths } = useEditorStore();

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

  const currentSVG = generateSVGCode();

  return (
    <DraggablePanel 
      title="SVG"
      initialPosition={{ x: 980, y: 300 }}
      id="svg-editor"
    >
      <SVGEditor
        svgCode={currentSVG}
        onSVGChange={handleSVGChange}
      />
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
