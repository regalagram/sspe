import React, { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { pencilManager } from './PencilManager';
import { DraggablePanel } from '../../components/DraggablePanel';
import { PluginButton } from '../../components/PluginButton';
import { Edit3, LogOut } from 'lucide-react';

export const PencilUI: React.FC = () => {
  const { mode, setCreateMode, exitCreateMode } = useEditorStore();
  const [strokeStyle, setStrokeStyle] = useState(pencilManager.getStrokeStyle());
  
  const isPencilActive = mode.current === 'create' && mode.createMode?.commandType === 'PENCIL';
  
  // Colores consistentes con otros plugins
  const toolColor = '#007acc';

  const handlePencilClick = () => {
    console.log('Pencil button clicked');
    setCreateMode('PENCIL');
  };

  const handleExitPencil = () => {
    exitCreateMode();
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
    <DraggablePanel
      title="Pencil Tool"
      initialPosition={{ x: 980, y: 300 }}
      id="pencil-tools"
    >
      <div style={{
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Pencil Tool Button using PluginButton component */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <PluginButton
            icon={<Edit3 size={14} color={isPencilActive ? 'white' : '#333'} />}
            text="Pencil Tool"
            color={toolColor}
            active={isPencilActive}
            disabled={false}
            onClick={handlePencilClick}
          />
          
          {isPencilActive && (
            <PluginButton
              icon={<LogOut size={16} />}
              text="Exit Pencil Mode"
              color="#dc3545"
              active={false}
              disabled={false}
              onClick={handleExitPencil}
            />
          )}
        </div>

        {/* Pencil Controls */}
        {isPencilActive && (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '12px',
            borderTop: '1px solid #e0e0e0',
            paddingTop: '12px',
            marginTop: '6px'
          }}>
            {/* Color Control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ 
                fontSize: '12px', 
                fontWeight: '500',
                minWidth: '40px'
              }}>
                Color:
              </label>
              <input
                type="color"
                value={strokeStyle.stroke}
                onChange={(e) => handleStrokeColorChange(e.target.value)}
                style={{ 
                  width: '40px', 
                  height: '30px', 
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  padding: '2px'
                }}
              />
              <span style={{ 
                fontSize: '11px', 
                color: '#666',
                fontFamily: 'monospace'
              }}>
                {strokeStyle.stroke}
              </span>
            </div>
            
            {/* Width Control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ 
                fontSize: '12px', 
                fontWeight: '500',
                minWidth: '40px'
              }}>
                Width:
              </label>
              <input
                type="range"
                min="1"
                max="20"
                step="1"
                value={strokeStyle.strokeWidth}
                onChange={(e) => handleStrokeWidthChange(parseInt(e.target.value))}
                style={{ 
                  flex: 1,
                  minWidth: '100px'
                }}
              />
              <span style={{ 
                fontSize: '11px', 
                minWidth: '30px', 
                textAlign: 'center',
                fontWeight: '500'
              }}>
                {strokeStyle.strokeWidth}px
              </span>
            </div>

            {/* Visual Preview */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              padding: '8px',
              backgroundColor: '#f8f8f8',
              borderRadius: '4px',
              border: '1px solid #e0e0e0'
            }}>
              <span style={{ fontSize: '11px', color: '#666' }}>Preview:</span>
              <div 
                style={{
                  width: `${Math.max(strokeStyle.strokeWidth * 2, 12)}px`,
                  height: `${Math.max(strokeStyle.strokeWidth * 2, 12)}px`,
                  borderRadius: '50%',
                  backgroundColor: strokeStyle.stroke,
                  border: '1px solid #ccc',
                  minWidth: '8px',
                  minHeight: '8px'
                }}
              />
              <div style={{
                flex: 1,
                height: `${strokeStyle.strokeWidth}px`,
                backgroundColor: strokeStyle.stroke,
                borderRadius: `${strokeStyle.strokeWidth / 2}px`,
                minHeight: '2px'
              }} />
            </div>
          </div>
        )}
      </div>
    </DraggablePanel>
  );
};