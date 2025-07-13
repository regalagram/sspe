import { Bold, Italic, Underline } from 'lucide-react';
import React from 'react';
import { useEditorStore } from '../store/editorStore';

export const TextPropertiesUI: React.FC = () => {
  const selectedTexts = useEditorStore((state) => state.selection.selectedTexts);
  const texts = useEditorStore((state) => state.texts);
  const updateText = useEditorStore((state) => state.updateText);

  if (selectedTexts.length !== 1) {
    return null;
  }

  const text = texts.find((t) => t.id === selectedTexts[0]);

  if (!text) {
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const isNumber = e.target.type === 'number';
    updateText(text.id, { [name]: isNumber ? Number(value) : value });
  };

  const toggleStyle = (property: 'fontWeight' | 'fontStyle' | 'textDecoration', value: any, defaultValue: any) => {
    const currentValue = text[property];
    const newValue = currentValue === value ? defaultValue : value;
    updateText(text.id, { [property]: newValue });
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    color: '#666',
    fontWeight: 500,
    display: 'block',
    marginBottom: '4px',
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    marginBottom: '8px',
  };

  const inputStyle: React.CSSProperties = {
    padding: '4px 8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '12px',
    width: '60px',
    textAlign: 'center' as const,
  };

  const textareaStyle: React.CSSProperties = {
    width: '100%',
    minHeight: '60px',
    padding: '8px',
    fontSize: '12px',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    resize: 'vertical',
    lineHeight: '1.4',
  };

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '4px 8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '12px',
    background: 'white',
  };

  const buttonGroupStyle: React.CSSProperties = {
    display: 'flex',
    gap: '4px',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '4px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    background: 'white',
    cursor: 'pointer',
  };

  const activeButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: '#e0e0e0',
    borderColor: '#bbb',
  };

  const fonts = [
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat',
    'Oswald',
    'Source Code Pro',
    'Arial',
    'Verdana',
    'Georgia',
    'Times New Roman',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <label style={labelStyle}>Content:</label>
        <textarea
          name="content"
          value={text.content}
          onChange={handleChange}
          style={textareaStyle}
        />
      </div>
      <div style={rowStyle}>
        <label style={labelStyle}>Font Size:</label>
        <input
          name="fontSize"
          type="number"
          value={text.fontSize}
          onChange={handleChange}
          style={inputStyle}
        />
      </div>
      <div>
        <label style={labelStyle}>Font Family:</label>
        <select
          name="fontFamily"
          value={text.fontFamily}
          onChange={handleChange}
          style={selectStyle}
        >
          {fonts.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>
      </div>
      <div style={buttonGroupStyle}>
        <button
          onClick={() => toggleStyle('fontWeight', 'bold', 'normal')}
          style={text.fontWeight === 'bold' ? activeButtonStyle : buttonStyle}
        >
          <Bold size={16} />
        </button>
        <button
          onClick={() => toggleStyle('fontStyle', 'italic', 'normal')}
          style={text.fontStyle === 'italic' ? activeButtonStyle : buttonStyle}
        >
          <Italic size={16} />
        </button>
        <button
          onClick={() => toggleStyle('textDecoration', 'underline', 'none')}
          style={text.textDecoration === 'underline' ? activeButtonStyle : buttonStyle}
        >
          <Underline size={16} />
        </button>
      </div>
      <div>
        <label style={labelStyle}>Fill Color:</label>
        <input
          name="fill"
          type="color"
          value={text.fill}
          onChange={handleChange}
          style={{ width: '100%', height: '30px', padding: '0', border: 'none', background: 'none' }}
        />
      </div>
    </div>
  );
};
