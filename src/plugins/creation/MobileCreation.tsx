import React, { useState } from 'react';
import { Plus, Move, Minus, Pen, X, ChevronDown } from 'lucide-react';
import { MobileToolbarButton, MobileToolbarSection } from '../../components/MobileToolbarButton';
import { MobileToolbarSubmenu, MobileSubmenuItem } from '../../components/MobileToolbarSubmenu';
import { useEditorStore } from '../../store/editorStore';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { SVGCommandType, EditorCommandType } from '../../types';
import { toolModeManager } from '../../managers/ToolModeManager';
import { creationManager } from './CreationManager';

export const MobileCreationTools: React.FC = () => {
  const { mode } = useEditorStore();
  const { isMobile } = useMobileDetection();
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);

  if (!isMobile) {
    // Return null for desktop - use original component
    return null;
  }

  const handleSelectTool = (commandType: SVGCommandType | 'NEW_PATH') => {
    if (commandType === 'NEW_PATH') {
      toolModeManager.setMode('creation', { commandType: 'NEW_PATH' as EditorCommandType });
    } else {
      toolModeManager.setMode('creation', { commandType: commandType as EditorCommandType });
    }
  };

  const handleExitCreateMode = () => {
    creationManager.exitCreation();
  };

  const isCreateMode = mode.current === 'create';
  const createMode = mode.createMode;

  const tools = [
    { 
      command: 'M' as const, 
      icon: <Move size={16} />, 
      label: 'M', 
      title: 'Move To (M)',
      description: 'Start new path'
    },
    { 
      command: 'NEW_PATH' as const, 
      icon: <Plus size={16} />, 
      label: 'M+', 
      title: 'New Path (Shift+M)',
      description: 'Create new path'
    },
    { 
      command: 'L' as const, 
      icon: <Minus size={16} />, 
      label: 'L', 
      title: 'Line To (L)',
      description: 'Draw line'
    },
    { 
      command: 'C' as const, 
      icon: <Pen size={16} />, 
      label: 'C', 
      title: 'Cubic Bezier (C)',
      description: 'Draw curve'
    },
    { 
      command: 'Z' as const, 
      icon: <X size={16} />, 
      label: 'Z', 
      title: 'Close Path (Z)',
      description: 'Close path'
    },
  ];

  // Get current active tool
  const getActiveTool = () => {
    if (!isCreateMode) return null;
    return tools.find(tool => 
      tool.command === 'NEW_PATH' 
        ? createMode?.commandType === 'NEW_PATH'
        : createMode?.commandType === tool.command
    );
  };

  const activeTool = getActiveTool();
  const hasActiveTool = activeTool !== null;

  const handleToolAction = (action: () => void) => {
    action();
    setIsSubmenuOpen(false);
  };

  return (
    <MobileToolbarSection title="Creation Tools">
      <MobileToolbarSubmenu
        trigger={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '52px', // Fixed width to prevent jumping
            height: '44px',
            background: hasActiveTool ? '#007acc' : (isSubmenuOpen ? '#e0f2fe' : '#f8f9fa'),
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600,
            color: hasActiveTool ? 'white' : '#007acc',
            border: '1px solid #e5e7eb',
            gap: '4px',
            padding: '0 4px', // Reduced padding since width is fixed
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            position: 'relative'
          }}>
            {hasActiveTool && activeTool ? (
              <span style={{ fontSize: '14px' }}>{activeTool.label}</span>
            ) : (
              <Pen size={16} />
            )}
            <ChevronDown size={12} style={{ 
              marginLeft: '2px',
              transform: isSubmenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }} />
          </div>
        }
        isOpen={isSubmenuOpen}
        onToggle={() => setIsSubmenuOpen(!isSubmenuOpen)}
      >
        {tools.map(tool => (
          <MobileSubmenuItem
            key={tool.command}
            icon={tool.icon}
            label={`${tool.label} - ${tool.description}`}
            onClick={() => handleToolAction(() => handleSelectTool(tool.command))}
            active={isCreateMode && (
              tool.command === 'NEW_PATH' 
                ? createMode?.commandType === 'NEW_PATH' 
                : createMode?.commandType === tool.command
            )}
          />
        ))}
        {isCreateMode && (
          <>
            <div style={{ 
              height: '1px', 
              background: '#e5e7eb', 
              margin: '4px 0' 
            }} />
            <MobileSubmenuItem
              icon={<X size={16} />}
              label="Exit Create Mode"
              onClick={() => handleToolAction(handleExitCreateMode)}
            />
          </>
        )}
      </MobileToolbarSubmenu>
    </MobileToolbarSection>
  );
};