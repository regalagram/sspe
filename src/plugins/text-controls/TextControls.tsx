import React, { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { TextStyle } from '../../types';
import { PluginButton } from '../../components/PluginButton';
import { Type, Copy, Trash2, AlignLeft, AlignCenter, AlignRight, Bold, Italic } from 'lucide-react';
import { isGradientOrPattern } from '../../utils/gradient-utils';
import { convertRgbToHex } from '../../utils/color-utils';
import { textEditManager } from '../../core/TextEditManager';

// Helper function for color input
const colorToHex = (color: string | any): string => {
  if (!color || color === 'none') return '#000000';
  if (isGradientOrPattern(color)) return '#000000';
  const converted = convertRgbToHex(color);
  if (!converted || converted === color && !color.startsWith('#')) {
    return '#000000';
  }
  return converted;
};

export const TextControls: React.FC = () => {
  const { 
    texts, 
    selection, 
    addText, 
    addMultilineText,
    updateTextContent,
    updateTextStyle,
    duplicateText,
    deleteText,
    viewport
  } = useEditorStore();

  const [newTextContent, setNewTextContent] = useState('Text');

  // Get selected texts
  const selectedTexts = texts.filter(text => 
    selection.selectedTexts.includes(text.id)
  );

  // Check if all selected texts have the same style properties
  const getCommonStyleValue = <K extends keyof TextStyle>(property: K): TextStyle[K] | undefined => {
    if (selectedTexts.length === 0) return undefined;
    const firstValue = selectedTexts[0].style[property];
    const allSame = selectedTexts.every(text => text.style[property] === firstValue);
    return allSame ? firstValue : undefined;
  };

  const handleCreateText = () => {
    const centerX = viewport.viewBox.x + viewport.viewBox.width / 2;
    const centerY = viewport.viewBox.y + viewport.viewBox.height / 2;
    
    const textId = addText(centerX, centerY, newTextContent);
    // Select the new text
    const { selectText } = useEditorStore.getState();
    selectText(textId);
    
    // Immediately start text editing after creation
    if (textId) {
      // Check if we're on mobile
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Add a small delay to ensure the text element is fully rendered
      setTimeout(() => {
        if (isMobile) {
          // For mobile, dispatch the mobile text edit event
          window.dispatchEvent(new CustomEvent('openMobileTextEdit', {
            detail: { textId: textId }
          }));
        } else {
          // For desktop, use the text edit manager
          textEditManager.setEditorStore(useEditorStore.getState());
          textEditManager.startTextEdit(textId);
        }
      }, 50); // 50ms delay to allow rendering
    }
  };

  const handleCreateMultilineText = () => {
    const centerX = viewport.viewBox.x + viewport.viewBox.width / 2;
    const centerY = viewport.viewBox.y + viewport.viewBox.height / 2;
    
    const lines = newTextContent.split('\n').filter(line => line.trim());
    const textId = addMultilineText(centerX, centerY, lines.length > 0 ? lines : ['Text']);
    // Select the new text
    const { selectText } = useEditorStore.getState();
    selectText(textId);
    
    // Immediately start text editing after creation
    if (textId) {
      // Check if we're on mobile
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Add a small delay to ensure the text element is fully rendered
      setTimeout(() => {
        if (isMobile) {
          // For mobile, dispatch the mobile text edit event
          window.dispatchEvent(new CustomEvent('openMobileTextEdit', {
            detail: { textId: textId }
          }));
        } else {
          // For desktop, use the text edit manager
          textEditManager.setEditorStore(useEditorStore.getState());
          textEditManager.startTextEdit(textId);
        }
      }, 50); // 50ms delay to allow rendering
    }
  };

  const handleDuplicateSelected = () => {
    if (selectedTexts.length > 0) {
      const newIds: string[] = [];
      selectedTexts.forEach(text => {
        const newId = duplicateText(text.id);
        if (newId) newIds.push(newId);
      });
      
      // Select the duplicated texts
      if (newIds.length > 0) {
        const { selectMultiple } = useEditorStore.getState();
        selectMultiple(newIds, 'texts');
      }
    }
  };

  const handleDeleteSelected = () => {
    selectedTexts.forEach(text => {
      deleteText(text.id);
    });
  };

  const handleContentChange = (textId: string, content: string) => {
    updateTextContent(textId, content);
  };

  const handleStyleChange = (updates: Partial<TextStyle>) => {
    selectedTexts.forEach(text => {
      updateTextStyle(text.id, updates);
    });
  };

  const handleTextAlign = (align: 'start' | 'middle' | 'end') => {
    handleStyleChange({ textAnchor: align });
  };

  const toggleBold = () => {
    const currentWeight = getCommonStyleValue('fontWeight');
    const newWeight = currentWeight === 'bold' ? 'normal' : 'bold';
    handleStyleChange({ fontWeight: newWeight });
  };

  const toggleItalic = () => {
    const currentStyle = getCommonStyleValue('fontStyle');
    const newStyle = currentStyle === 'italic' ? 'normal' : 'italic';
    handleStyleChange({ fontStyle: newStyle });
  };

  const hasSelection = selectedTexts.length > 0;
  const commonFontSize = getCommonStyleValue('fontSize') || 16;
  const commonFontFamily = getCommonStyleValue('fontFamily') || 'Arial, sans-serif';
  const commonFill = getCommonStyleValue('fill');
  const commonStroke = getCommonStyleValue('stroke');
  const commonFontWeight = getCommonStyleValue('fontWeight');
  const commonFontStyle = getCommonStyleValue('fontStyle');
  const commonTextAnchor = getCommonStyleValue('textAnchor');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Text Creation */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
          Create Text:
        </span>
        
        <input
          type="text"
          value={newTextContent}
          onChange={(e) => setNewTextContent(e.target.value)}
          placeholder="Enter text content"
          style={{
            padding: '6px 8px',
            fontSize: '12px',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}
        />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <PluginButton
            icon={<Type size={12} />}
            text="Single Line"
            color="#28a745"
            onPointerDown={handleCreateText}
          />
          <PluginButton
            icon={<Type size={12} />}
            text="Multi Line"
            color="#17a2b8"
            onPointerDown={handleCreateMultilineText}
          />
        </div>
      </div>

      {/* Text Operations */}
      {hasSelection && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
            Operations:
          </span>
          
          <div style={{ display: 'flex', flexDirection: 'column',gap: '6px' }}>
            <PluginButton
              icon={<Copy size={12} />}
              text="Duplicate"
              color="#ffc107"
              onPointerDown={handleDuplicateSelected}
            />
            <PluginButton
              icon={<Trash2 size={12} />}
              text="Delete"
              color="#dc3545"
              onPointerDown={handleDeleteSelected}
            />
          </div>
        </div>
      )}

      {/* Selection Info */}
      {hasSelection && (
        <div style={{ 
          padding: '8px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '4px',
          fontSize: '11px',
          color: '#666'
        }}>
          Editing {selectedTexts.length} text element{selectedTexts.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Text Content Editing */}
      {selectedTexts.length === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
            Content:
          </label>
          <textarea
            value={selectedTexts[0].type === 'text' ? selectedTexts[0].content : 
                   selectedTexts[0].spans.map(span => span.content).join('\n')}
            onChange={(e) => {
              const text = selectedTexts[0];
              if (text.type === 'text') {
                handleContentChange(text.id, e.target.value);
              } else {
                // For multiline text, update spans
                const lines = e.target.value.split('\n');
                const { updateMultilineText } = useEditorStore.getState();
                const newSpans = lines.map((line, index) => ({
                  ...text.spans[index] || { id: `span-${index}`, content: '', dx: 0, dy: 20 },
                  content: line
                }));
                updateMultilineText(text.id, { spans: newSpans });
              }
            }}
            style={{
              width: '100%',
              minHeight: '60px',
              padding: '6px',
              fontSize: '12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              resize: 'vertical'
            }}
          />
        </div>
      )}

      {/* Font Properties */}
      {hasSelection && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
            Font:
          </span>
          
          {/* Font Family */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '10px', color: '#666' }}>Family:</label>
            <select
              value={commonFontFamily}
              onChange={(e) => handleStyleChange({ fontFamily: e.target.value })}
              style={{ padding: '4px', fontSize: '11px', border: '1px solid #ddd', borderRadius: '3px' }}
            >
              <option value="Arial, sans-serif">Arial</option>
              <option value="Helvetica, sans-serif">Helvetica</option>
              <option value="'Times New Roman', serif">Times New Roman</option>
              <option value="Georgia, serif">Georgia</option>
              <option value="'Courier New', monospace">Courier New</option>
              <option value="Verdana, sans-serif">Verdana</option>
              <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
              <option value="Impact, sans-serif">Impact</option>
            </select>
          </div>

          {/* Font Size */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '10px', color: '#666' }}>Size:</label>
            <input
              type="number"
              min="8"
              max="72"
              value={commonFontSize}
              onChange={(e) => handleStyleChange({ fontSize: Number(e.target.value) })}
              style={{ padding: '4px', fontSize: '11px', border: '1px solid #ddd', borderRadius: '3px' }}
            />
          </div>

          {/* Font Style Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <PluginButton
              icon={<Bold size={10} />}
              text="Bold"
              color="#6c757d"
              active={commonFontWeight === 'bold'}
              onPointerDown={toggleBold}
            />
            <PluginButton
              icon={<Italic size={10} />}
              text="Italic"
              color="#6c757d"
              active={commonFontStyle === 'italic'}
              onPointerDown={toggleItalic}
            />
          </div>

          {/* Text Alignment */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '10px', color: '#666' }}>Alignment:</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <PluginButton
                icon={<AlignLeft size={10} />}
                text="Left"
                color="#6c757d"
                active={commonTextAnchor === 'start'}
                onPointerDown={() => handleTextAlign('start')}
              />
              <PluginButton
                icon={<AlignCenter size={10} />}
                text="Center"
                color="#6c757d"
                active={commonTextAnchor === 'middle'}
                onPointerDown={() => handleTextAlign('middle')}
              />
              <PluginButton
                icon={<AlignRight size={10} />}
                text="Right"
                color="#6c757d"
                active={commonTextAnchor === 'end'}
                onPointerDown={() => handleTextAlign('end')}
              />
            </div>
          </div>
        </div>
      )}

      {/* Colors */}
      {hasSelection && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
            Colors:
          </span>
          
          {/* Fill Color */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '10px', color: '#666' }}>Fill:</label>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <input
                type="color"
                value={colorToHex(commonFill)}
                onChange={(e) => handleStyleChange({ fill: e.target.value })}
                disabled={commonFill === 'none' || isGradientOrPattern(commonFill)}
                style={{ width: '30px', height: '24px', padding: '0', border: 'none' }}
              />
              <label style={{ fontSize: '11px' }}>
                <input
                  type="checkbox"
                  checked={commonFill === 'none'}
                  onChange={(e) => handleStyleChange({ 
                    fill: e.target.checked ? 'none' : '#000000'
                  })}
                />
                None
              </label>
            </div>
          </div>

          {/* Stroke Color */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '10px', color: '#666' }}>Stroke:</label>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <input
                type="color"
                value={colorToHex(commonStroke)}
                onChange={(e) => handleStyleChange({ stroke: e.target.value })}
                disabled={commonStroke === 'none' || isGradientOrPattern(commonStroke)}
                style={{ width: '30px', height: '24px', padding: '0', border: 'none' }}
              />
              <label style={{ fontSize: '11px' }}>
                <input
                  type="checkbox"
                  checked={commonStroke === 'none'}
                  onChange={(e) => handleStyleChange({ 
                    stroke: e.target.checked ? 'none' : '#000000'
                  })}
                />
                None
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};