import React, { useState, useEffect } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { SVGTextPath } from '../../types';
import { PluginButton } from '../../components/PluginButton';
import { Type, Plus, Trash2, Link, RotateCcw, Settings, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

export const TextPathControls: React.FC = () => {
  const { 
    textPaths, 
    paths, 
    selection,
    addTextPath, 
    removeTextPath, 
    updateTextPath,
    updateTextPathContent,
    updateTextPathPath,
    updateTextPathStyle,
    updateTextPathOffset,
    updateTextPathMethod,
    updateTextPathSpacing,
    updateTextPathSide,
    updateTextPathLength,
    selectTextPath,
    clearSelection
  } = useEditorStore();

  const [newTextContent, setNewTextContent] = useState('Text on path');
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const selectedTextPaths = textPaths.filter(tp => selection.selectedTextPaths.includes(tp.id));
  const selectedTextPath = selectedTextPaths.length === 1 ? selectedTextPaths[0] : null;

  // Get available paths that can be used for textPath
  const availablePaths = paths.filter(path => path.subPaths.length > 0);

  useEffect(() => {
    if (availablePaths.length > 0 && !selectedPath) {
      setSelectedPath(availablePaths[0].subPaths[0].id);
    }
  }, [availablePaths.length, selectedPath]);

  const handleCreateTextPath = () => {
    if (!selectedPath) {
      alert('Please select a path first');
      return;
    }

    const textPathId = addTextPath(selectedPath, newTextContent, 0);
    selectTextPath(textPathId);
    setShowCreateForm(false);
    setNewTextContent('Text on path');
  };

  const handleDeleteSelected = () => {
    if (selectedTextPaths.length === 0) return;
    
    const confirmMessage = selectedTextPaths.length === 1 
      ? `Delete TextPath "${selectedTextPaths[0].content}"?`
      : `Delete ${selectedTextPaths.length} TextPath elements?`;
    
    if (confirm(confirmMessage)) {
      selectedTextPaths.forEach(tp => removeTextPath(tp.id));
      clearSelection();
    }
  };

  const containerStyle: React.CSSProperties = {
    padding: '16px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e0e0e0'
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid #f0f0f0'
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: '500',
    color: '#333',
    marginBottom: '6px',
    display: 'block'
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '6px 8px',
    fontSize: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    marginBottom: '8px'
  };

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '6px 8px',
    fontSize: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    marginBottom: '8px',
    backgroundColor: '#fff'
  };

  const buttonGroupStyle: React.CSSProperties = {
    display: 'flex',
    gap: '4px',
    marginBottom: '8px'
  };

  const smallButtonStyle: React.CSSProperties = {
    flex: 1,
    padding: '4px 8px',
    fontSize: '10px',
    border: '1px solid #ddd',
    borderRadius: '3px',
    backgroundColor: '#fff',
    cursor: 'pointer'
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{ ...sectionStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Type size={16} style={{ color: '#666' }} />
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
            TextPath ({textPaths.length})
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <PluginButton
            icon={<Plus size={14} />}
            text=""
            color="#28a745"
            active={showCreateForm}
            disabled={availablePaths.length === 0}
            onPointerDown={() => setShowCreateForm(!showCreateForm)}
          />
          <PluginButton
            icon={<Trash2 size={14} />}
            text=""
            color="#dc3545"
            active={false}
            disabled={selectedTextPaths.length === 0}
            onPointerDown={handleDeleteSelected}
          />
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div style={sectionStyle}>
          <label style={labelStyle}>Text Content:</label>
          <input
            type="text"
            value={newTextContent}
            onChange={(e) => setNewTextContent(e.target.value)}
            style={inputStyle}
            placeholder="Enter text content"
          />
          
          <label style={labelStyle}>Path:</label>
          <select
            value={selectedPath}
            onChange={(e) => setSelectedPath(e.target.value)}
            style={selectStyle}
          >
            <option value="">Select a path...</option>
            {availablePaths.map(path => 
              path.subPaths.map(subPath => (
                <option key={subPath.id} value={subPath.id}>
                  Path {path.id.slice(-8)} - SubPath {subPath.id.slice(-8)}
                </option>
              ))
            )}
          </select>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <PluginButton
              icon={<Plus size={14} />}
              text="Create"
              color="#28a745"
              active={false}
              disabled={!selectedPath || !newTextContent.trim()}
              onPointerDown={handleCreateTextPath}
              fullWidth={true}
            />
          </div>
        </div>
      )}

      {/* Selection Info */}
      {selectedTextPaths.length > 0 && (
        <div style={sectionStyle}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
            {selectedTextPaths.length === 1 
              ? `Selected: "${selectedTextPath?.content}"`
              : `${selectedTextPaths.length} TextPaths selected`
            }
          </div>
        </div>
      )}

      {/* Edit Selected TextPath */}
      {selectedTextPath && (
        <div style={sectionStyle}>
          <label style={labelStyle}>Content:</label>
          <input
            type="text"
            value={selectedTextPath.content}
            onChange={(e) => updateTextPathContent(selectedTextPath.id, e.target.value)}
            style={inputStyle}
          />

          <label style={labelStyle}>Path Reference:</label>
          <select
            value={selectedTextPath.pathRef}
            onChange={(e) => updateTextPathPath(selectedTextPath.id, e.target.value)}
            style={selectStyle}
          >
            {availablePaths.map(path => 
              path.subPaths.map(subPath => (
                <option key={subPath.id} value={subPath.id}>
                  Path {path.id.slice(-8)} - SubPath {subPath.id.slice(-8)}
                </option>
              ))
            )}
          </select>

          <label style={labelStyle}>Start Offset:</label>
          <input
            type="number"
            value={selectedTextPath.startOffset || 0}
            onChange={(e) => updateTextPathOffset(selectedTextPath.id, parseFloat(e.target.value) || 0)}
            style={inputStyle}
            min="0"
            step="1"
          />

          <label style={labelStyle}>Method:</label>
          <div style={buttonGroupStyle}>
            <button
              style={{
                ...smallButtonStyle,
                backgroundColor: selectedTextPath.method === 'align' ? '#007bff' : '#fff',
                color: selectedTextPath.method === 'align' ? '#fff' : '#333',
                borderColor: selectedTextPath.method === 'align' ? '#007bff' : '#ddd'
              }}
              onClick={() => updateTextPathMethod(selectedTextPath.id, 'align')}
            >
              Align
            </button>
            <button
              style={{
                ...smallButtonStyle,
                backgroundColor: selectedTextPath.method === 'stretch' ? '#007bff' : '#fff',
                color: selectedTextPath.method === 'stretch' ? '#fff' : '#333',
                borderColor: selectedTextPath.method === 'stretch' ? '#007bff' : '#ddd'
              }}
              onClick={() => updateTextPathMethod(selectedTextPath.id, 'stretch')}
            >
              Stretch
            </button>
          </div>

          <label style={labelStyle}>Spacing:</label>
          <div style={buttonGroupStyle}>
            <button
              style={{
                ...smallButtonStyle,
                backgroundColor: selectedTextPath.spacing === 'auto' ? '#007bff' : '#fff',
                color: selectedTextPath.spacing === 'auto' ? '#fff' : '#333',
                borderColor: selectedTextPath.spacing === 'auto' ? '#007bff' : '#ddd'
              }}
              onClick={() => updateTextPathSpacing(selectedTextPath.id, 'auto')}
            >
              Auto
            </button>
            <button
              style={{
                ...smallButtonStyle,
                backgroundColor: selectedTextPath.spacing === 'exact' ? '#007bff' : '#fff',
                color: selectedTextPath.spacing === 'exact' ? '#fff' : '#333',
                borderColor: selectedTextPath.spacing === 'exact' ? '#007bff' : '#ddd'
              }}
              onClick={() => updateTextPathSpacing(selectedTextPath.id, 'exact')}
            >
              Exact
            </button>
          </div>

          <label style={labelStyle}>Side:</label>
          <div style={buttonGroupStyle}>
            <button
              style={{
                ...smallButtonStyle,
                backgroundColor: selectedTextPath.side === 'left' ? '#007bff' : '#fff',
                color: selectedTextPath.side === 'left' ? '#fff' : '#333',
                borderColor: selectedTextPath.side === 'left' ? '#007bff' : '#ddd'
              }}
              onClick={() => updateTextPathSide(selectedTextPath.id, 'left')}
            >
              Left
            </button>
            <button
              style={{
                ...smallButtonStyle,
                backgroundColor: selectedTextPath.side === 'right' ? '#007bff' : '#fff',
                color: selectedTextPath.side === 'right' ? '#fff' : '#333',
                borderColor: selectedTextPath.side === 'right' ? '#007bff' : '#ddd'
              }}
              onClick={() => updateTextPathSide(selectedTextPath.id, 'right')}
            >
              Right
            </button>
          </div>
        </div>
      )}

      {/* Style Controls for Selected TextPath */}
      {selectedTextPath && (
        <div style={sectionStyle}>
          <label style={labelStyle}>Font Size:</label>
          <input
            type="number"
            value={selectedTextPath.style.fontSize || 16}
            onChange={(e) => updateTextPathStyle(selectedTextPath.id, { fontSize: parseFloat(e.target.value) || 16 })}
            style={inputStyle}
            min="1"
            step="1"
          />

          <label style={labelStyle}>Font Family:</label>
          <select
            value={selectedTextPath.style.fontFamily || 'Arial, sans-serif'}
            onChange={(e) => updateTextPathStyle(selectedTextPath.id, { fontFamily: e.target.value })}
            style={selectStyle}
          >
            <option value="Arial, sans-serif">Arial</option>
            <option value="Helvetica, sans-serif">Helvetica</option>
            <option value="Times, serif">Times</option>
            <option value="Courier, monospace">Courier</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="Verdana, sans-serif">Verdana</option>
          </select>

          <label style={labelStyle}>Fill Color:</label>
          <input
            type="color"
            value={selectedTextPath.style.fill as string || '#000000'}
            onChange={(e) => updateTextPathStyle(selectedTextPath.id, { fill: e.target.value })}
            style={inputStyle}
          />

          <label style={labelStyle}>Text Anchor:</label>
          <div style={buttonGroupStyle}>
            <button
              style={{
                ...smallButtonStyle,
                backgroundColor: selectedTextPath.style.textAnchor === 'start' ? '#007bff' : '#fff',
                color: selectedTextPath.style.textAnchor === 'start' ? '#fff' : '#333',
                borderColor: selectedTextPath.style.textAnchor === 'start' ? '#007bff' : '#ddd'
              }}
              onClick={() => updateTextPathStyle(selectedTextPath.id, { textAnchor: 'start' })}
            >
              <AlignLeft size={12} />
            </button>
            <button
              style={{
                ...smallButtonStyle,
                backgroundColor: selectedTextPath.style.textAnchor === 'middle' ? '#007bff' : '#fff',
                color: selectedTextPath.style.textAnchor === 'middle' ? '#fff' : '#333',
                borderColor: selectedTextPath.style.textAnchor === 'middle' ? '#007bff' : '#ddd'
              }}
              onClick={() => updateTextPathStyle(selectedTextPath.id, { textAnchor: 'middle' })}
            >
              <AlignCenter size={12} />
            </button>
            <button
              style={{
                ...smallButtonStyle,
                backgroundColor: selectedTextPath.style.textAnchor === 'end' ? '#007bff' : '#fff',
                color: selectedTextPath.style.textAnchor === 'end' ? '#fff' : '#333',
                borderColor: selectedTextPath.style.textAnchor === 'end' ? '#007bff' : '#ddd'
              }}
              onClick={() => updateTextPathStyle(selectedTextPath.id, { textAnchor: 'end' })}
            >
              <AlignRight size={12} />
            </button>
          </div>
        </div>
      )}

      {/* TextPath List */}
      {textPaths.length > 0 && (
        <div>
          <label style={labelStyle}>Available TextPaths:</label>
          <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
            {textPaths.map(textPath => {
              const isSelected = selection.selectedTextPaths.includes(textPath.id);
              const referencedPath = paths.find(p => 
                p.subPaths.some(sp => sp.id === textPath.pathRef)
              );
              
              return (
                <div
                  key={textPath.id}
                  style={{
                    padding: '8px',
                    margin: '4px 0',
                    border: '1px solid',
                    borderColor: isSelected ? '#007bff' : '#ddd',
                    borderRadius: '4px',
                    backgroundColor: isSelected ? '#f0f8ff' : '#fff',
                    cursor: 'pointer',
                    fontSize: '11px'
                  }}
                  onClick={() => selectTextPath(textPath.id)}
                >
                  <div style={{ fontWeight: '500', marginBottom: '2px' }}>
                    {textPath.content.length > 20 
                      ? textPath.content.substring(0, 20) + '...' 
                      : textPath.content
                    }
                  </div>
                  <div style={{ color: '#666', fontSize: '10px' }}>
                    Path: {referencedPath ? referencedPath.id.slice(-8) : 'Missing'}
                    {textPath.startOffset ? ` | Offset: ${textPath.startOffset}` : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No paths available message */}
      {availablePaths.length === 0 && (
        <div style={{
          padding: '16px',
          textAlign: 'center',
          color: '#666',
          fontSize: '12px',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          border: '1px solid #e9ecef'
        }}>
          <Link size={24} style={{ marginBottom: '8px', opacity: 0.5 }} />
          <div>No paths available</div>
          <div style={{ fontSize: '10px', marginTop: '4px' }}>
            Create a path first to use TextPath
          </div>
        </div>
      )}
    </div>
  );
};