import React, { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { pencilManager } from './PencilManager';

export const PencilUI: React.FC = () => {
  const { mode, setCreateMode } = useEditorStore();
  const [strokeStyle, setStrokeStyle] = useState(pencilManager.getStrokeStyle());
  
  const isPencilActive = mode.current === 'create' && mode.createMode?.commandType === 'PENCIL';

  const handlePencilClick = () => {
    console.log('Pencil button clicked');
    setCreateMode('PENCIL');
  };

  const handleStrokeColorChange = (color: string) => {
    pencilManager.setStrokeStyle({ stroke: color });
    setStrokeStyle(pencilManager.getStrokeStyle());
  };

  const handleStrokeWidthChange = (width: number) => {
    pencilManager.setStrokeStyle({ strokeWidth: width });
    setStrokeStyle(pencilManager.getStrokeStyle());
  };

  // Update stroke style when pencil becomes active
  React.useEffect(() => {
    if (isPencilActive) {
      setStrokeStyle(pencilManager.getStrokeStyle());
    }
  }, [isPencilActive]);

  React.useEffect(() => {
    console.log('PencilUI: Mode changed:', { mode: mode.current, isPencilActive });
  }, [mode.current, isPencilActive]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button
        onClick={handlePencilClick}
        style={{
          padding: '8px 12px',
          backgroundColor: isPencilActive ? '#007acc' : '#f0f0f0',
          color: isPencilActive ? 'white' : 'black',
          border: '1px solid #ccc',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
        title="Pencil Tool (P)"
      >
        ✏️ Pencil
      </button>
      
      {isPencilActive && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 8px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            padding: '4px 8px',
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}>
            <label style={{ fontSize: '12px', fontWeight: '500' }}>
              Color:
            </label>
            <input
              type="color"
              value={strokeStyle.stroke}
              onChange={(e) => handleStrokeColorChange(e.target.value)}
              style={{ 
                width: '32px', 
                height: '24px', 
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            />
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            padding: '4px 8px',
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}>
            <label style={{ fontSize: '12px', fontWeight: '500' }}>
              Width:
            </label>
            <input
              type="range"
              min="1"
              max="20"
              step="1"
              value={strokeStyle.strokeWidth}
              onChange={(e) => handleStrokeWidthChange(parseInt(e.target.value))}
              style={{ width: '80px' }}
            />
            <div 
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: strokeStyle.stroke,
                border: '1px solid #ccc',
                transform: `scale(${strokeStyle.strokeWidth / 10})`,
                minWidth: '4px',
                minHeight: '4px'
              }}
            />
            <span style={{ fontSize: '11px', minWidth: '24px', textAlign: 'center' }}>
              {strokeStyle.strokeWidth}px
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
