import React, { useState, useEffect } from 'react';
import { Edit3, Palette, Settings, ChevronDown } from 'lucide-react';
import { ToolbarButton, ToolbarSection } from './ToolbarButton';
import { ToolbarSubmenu, SubmenuItem } from './ToolbarSubmenu';
import { useToolbarStore } from '../store/toolbarStore';
import { useEditorStore } from '../store/editorStore';
import { toolModeManager } from '../managers/ToolModeManager';
import { pencilManager } from '../plugins/pencil/PencilManager';

export const WritingPencilTools: React.FC = () => {
  const [isPencilSubmenuOpen, setIsPencilSubmenuOpen] = useState(false);
  const [strokeStyle, setStrokeStyle] = useState(pencilManager.getStrokeStyle());
  const [toolModeState, setToolModeState] = useState(toolModeManager.getState());

  // Subscribe to tool mode changes
  useEffect(() => {
    const unsubscribe = toolModeManager.addListener(setToolModeState);
    return unsubscribe;
  }, []);

  // Check both ToolModeManager and EditorStore for pencil mode
  const { mode } = useEditorStore();
  const isPencilActive = toolModeState.activeMode === 'pencil' || 
                        (mode.current === 'create' && mode.createMode?.commandType === 'PENCIL');

  const handlePencilToggle = () => {
    if (isPencilActive) {
      pencilManager.exitPencil();
    } else {
      toolModeManager.setMode('pencil');
    }
  };

  const handleStrokeColorChange = (color: string) => {
    pencilManager.setStrokeStyle({ stroke: color });
    setStrokeStyle(pencilManager.getStrokeStyle());
  };

  const handleStrokeWidthChange = (width: number) => {
    pencilManager.setStrokeStyle({ strokeWidth: width });
    setStrokeStyle(pencilManager.getStrokeStyle());
  };

  const colors = ['#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
  const strokeWidths = [1, 2, 3, 5, 8, 12, 16];

  return (
    <ToolbarSection title="Pencil Tools">
      <ToolbarSubmenu
        trigger={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '40px',
            background: isPencilActive ? '#374151' : (isPencilSubmenuOpen ? '#e5e7eb' : 'white'),
            fontSize: '12px',
            fontWeight: 600,
            color: isPencilActive ? 'white' : '#374151',
            border: 'none',
            gap: '4px',
            padding: '0 4px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            position: 'relative'
          }}>
            <Edit3 size={16} />
            <ChevronDown size={12} style={{ 
              marginLeft: '2px',
              transform: isPencilSubmenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }} />
          </div>
        }
        isOpen={isPencilSubmenuOpen}
        onToggle={() => setIsPencilSubmenuOpen(!isPencilSubmenuOpen)}
      >
        <SubmenuItem
          icon={<Edit3 size={16} />}
          label={isPencilActive ? "Exit Pencil Mode" : "Activate Pencil"}
          onClick={() => {
            handlePencilToggle();
            setIsPencilSubmenuOpen(false);
          }}
          active={isPencilActive}
        />
        
        <div style={{ 
          height: '1px', 
          background: '#e5e7eb', 
          margin: '4px 0' 
        }} />
        
        {/* Color Options */}
        <div style={{ padding: '8px 12px', fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>
          Colors
        </div>
        {colors.map(color => (
          <SubmenuItem
            key={color}
            icon={<div style={{ 
              width: '16px', 
              height: '16px', 
              background: color, 
              borderRadius: '50%',
              border: '1px solid #e5e7eb'
            }} />}
            label={color}
            onClick={() => {
              handleStrokeColorChange(color);
              setIsPencilSubmenuOpen(false);
            }}
            active={strokeStyle.stroke === color}
          />
        ))}
        
        <div style={{ 
          height: '1px', 
          background: '#e5e7eb', 
          margin: '4px 0' 
        }} />
        
        {/* Stroke Width Options */}
        <div style={{ padding: '8px 12px', fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>
          Stroke Width
        </div>
        {strokeWidths.map(width => (
          <SubmenuItem
            key={width}
            icon={<div style={{ 
              width: '16px', 
              height: '2px', 
              background: '#374151',
              transform: `scaleY(${width / 2})`
            }} />}
            label={`${width}px`}
            onClick={() => {
              handleStrokeWidthChange(width);
              setIsPencilSubmenuOpen(false);
            }}
            active={strokeStyle.strokeWidth === width}
          />
        ))}
      </ToolbarSubmenu>
    </ToolbarSection>
  );
};